"""AI Hub conformance checks. Run with the workspace Playwright Python."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('KERFUFFLE_TEST_URL', 'http://127.0.0.1:33591')
CASES = [
    ('standard', 'players=2'),
    ('latency', 'players=2&latency=150&jitter=50&loss=5'),
    ('host-leave', 'players=2&scenario=host-leave'),
    ('server', 'players=2&scenario=server'),
]
reports = []
failures = []


def standalone_coop(context, host):
    checks = []
    report = {'scenario': 'standalone', 'checks': checks}
    reports.append(report)
    guest = context.new_page()

    def check(name, condition=True):
        checks.append({'name': name, 'pass': bool(condition)})
        if not condition:
            raise AssertionError(name)

    try:
        for page in [host, guest]:
            page.goto(BASE + '/index.html', wait_until='domcontentloaded')
            page.wait_for_function('window.__game', timeout=90000)
            page.locator('#online-button').click()
        host.locator('#host-room').click()
        host.wait_for_function("__game.network.room.length===6 && __game.network.kind==='room'", timeout=25000)
        check('standalone room opens', host.evaluate('__game.network.active'))
        host.evaluate('__game.setIdle(12)')
        host.wait_for_timeout(500)
        check('online lobby never enters attract', host.evaluate("__game.state.mode==='title' && __game.state.screen==='online' && __game.network.active"))
        room = host.evaluate('__game.network.room')
        guest.locator('#join-code').fill(room)
        guest.locator('#join-room').click()
        host.wait_for_function('__game.network.players.length===2', timeout=25000)
        guest.wait_for_function('__game.network.connections.get(0)?.open', timeout=25000)
        check('two gunners join the room')
        host.locator('#start-online').click()
        for page in [host, guest]:
            page.wait_for_function("__game.state.mode==='play' && __game.network.canPlay", timeout=10000)
        check('room starts on both copies')
        host.wait_for_function('__game.state.elapsed>.1', timeout=15000)
        guest.wait_for_function('__game.state.elapsed>.1', timeout=15000)
        check('authority state reaches guest')
        guest.evaluate('document.activeElement?.blur()')
        guest.keyboard.press('q')
        host.wait_for_function("__game.state.players[1].weapon==='torpedo'", timeout=5000)
        host.wait_for_timeout(450)
        check('guest switch applies exactly once', host.evaluate("__game.state.players[1].weapon==='torpedo'"))
        guest.keyboard.press('q')
        host.wait_for_function("__game.state.players[1].weapon==='flak'", timeout=5000)
        check('second guest switch returns to flak')
        angle = host.evaluate('__game.state.players[1].angle')
        guest.keyboard.down('d')
        guest.wait_for_timeout(400)
        guest.keyboard.up('d')
        host.wait_for_timeout(120)
        check('guest aim reaches authority', abs(host.evaluate('__game.state.players[1].angle') - angle) > .1)
        shots = host.evaluate('__game.state.stats.weapons.flak')
        guest.keyboard.down('Space')
        guest.wait_for_timeout(600)
        guest.keyboard.up('Space')
        host.wait_for_function(f'__game.state.stats.weapons.flak>{shots}', timeout=5000)
        check('guest firing creates authority projectiles')
        salvos = host.evaluate('__game.state.stats.salvos')
        host.evaluate('__game.setPlayer(1,{charge:1})')
        guest.wait_for_function('__game.state.players[1].charge>=.995', timeout=5000)
        guest.keyboard.press('e')
        host.wait_for_function(f'__game.state.stats.salvos>{salvos}', timeout=5000)
        host.wait_for_timeout(400)
        check('guest broadside action applies once', host.evaluate('__game.state.stats.salvos') == salvos + 1)
        host.evaluate('__game.setDev({invincible:true}); __game.setBalance({duration:64}); __game.step(80,true)')
        host.wait_for_function('__game.state.result!==null', timeout=15000)
        check('authority completes a full patrol', host.evaluate('__game.state.stage===3'))
        guest.wait_for_function('__game.state.result!==null && __game.network.ended', timeout=10000)
        check('terminal snapshot and result reach guest')
        check('final scores match', host.evaluate('__game.state.score') == guest.evaluate('__game.state.score'))
        check('victory state matches', host.evaluate('__game.state.result.won') == guest.evaluate('__game.state.result.won'))
        check('network is stopped at result', host.evaluate('!__game.network.canPlay') and guest.evaluate('!__game.network.canPlay'))
        report['pass'] = all(c['pass'] for c in checks)
    except Exception as error:
        report['pass'] = False
        report['detail'] = str(error).splitlines()[0]
        failures.append('standalone: ' + report['detail'])
        for label, page in [('host', host), ('guest', guest)]:
            try:
                report[label] = page.evaluate('window.__game?.state')
            except Exception:
                pass
    finally:
        for page in [host, guest]:
            try:
                page.evaluate('window.__game?.network.leave()')
            except Exception:
                pass
        guest.close()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        '--enable-unsafe-webgpu', '--enable-features=Vulkan',
        '--use-webgpu-adapter=swiftshader',
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
    ])
    context = browser.new_context(ignore_https_errors=True, viewport={'width': 1280, 'height': 800})
    page = context.new_page()
    try:
        page.goto(BASE + '/index.html', wait_until='domcontentloaded')
        page.wait_for_function('window.__game', timeout=90000)
        assert page.title() == 'Air-Sea Kerfuffle — Coastal Arcade', 'Server did not return this game'
        for name, params in CASES:
            page.goto(BASE + '/harness.html?game=index.html&auto=1&' + params, wait_until='domcontentloaded')
            page.wait_for_function("document.body.dataset.complete === 'true'", timeout=120000)
            report = page.evaluate('window.__hubCheck')
            reports.append(report)
            if not report['pass']:
                bad = [c for c in report['checks'] if not c['pass']]
                for check in bad:
                    failures.append(name + ': ' + check['name'] + (' — ' + check.get('detail', '') if check.get('detail') else ''))
        standalone_coop(context, page)
    except Exception as e:
        failures.append('harness execution: ' + str(e).splitlines()[0])
    finally:
        context.close()
        browser.close()
Path('hub-test-results.json').write_text(json.dumps(reports, indent=2))
for failure in failures:
    print('FAIL ' + failure)
checks = sum(len(r['checks']) for r in reports)
print(f'{checks} hub checks; {len(failures)} failures')
raise SystemExit(bool(failures))
