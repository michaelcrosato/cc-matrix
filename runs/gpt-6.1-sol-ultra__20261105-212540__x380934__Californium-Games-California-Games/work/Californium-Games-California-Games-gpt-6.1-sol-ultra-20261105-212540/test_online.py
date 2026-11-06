"""Optional real public PeerJS check; external signaling is required.
Run: ~/.local/share/pipx/venvs/playwright/bin/python test_online.py [served-game-url]
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:35981/Californium-Games-California-Games-gpt-6.1-sol-ultra-20261105-212540.html'
RESULT = Path(__file__).with_name('test_online_result.json')
result = {'date': datetime.now(timezone.utc).isoformat(), 'url': URL, 'externalService': 'PeerJS public signaling + browser WebRTC', 'checks': [], 'errors': []}

def check(name, passed, detail=None):
    result['checks'].append({'name': name, 'passed': bool(passed), 'detail': detail})
    if not passed:
        print(f'FAIL online: {name}: {detail or "assertion failed"}')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--autoplay-policy=no-user-gesture-required'])
        try:
            context = browser.new_context(viewport={'width': 1280, 'height': 720})
            host = context.new_page()
            guest = context.new_page()
            for label, page in [('host', host), ('guest', guest)]:
                page.on('pageerror', lambda error, label=label: result['errors'].append(f'{label}: {error}'))
                page.goto(URL, wait_until='domcontentloaded', timeout=90000)
                page.wait_for_function('window.__game?.state.ready === true', timeout=90000)
                check(f'{label} loaded correct game', page.title().startswith('Californium Games'), page.title())
                # Any interaction cancels a possible attract replay before opening the room.
                page.keyboard.press('Escape')
                page.evaluate('window.__game.title()')
                page.locator('#online').click()
            host.locator('#online-create').click()
            host.wait_for_function('window.__game.network()?.connected === true', timeout=30000)
            code = host.evaluate('window.__game.network().room')
            check('public signaling created room', isinstance(code, str) and len(code) == 6, code)
            guest.locator('#room-code').fill(code)
            guest.locator('#online-join').click()
            guest.wait_for_function('window.__game.network()?.connected === true', timeout=30000)
            host.wait_for_function('window.__game.network()?.players.length === 2', timeout=15000)
            check('two independent pages joined', guest.evaluate('window.__game.network().me') == 1)
            check('roster synchronized', guest.evaluate('window.__game.network().players.length') == 2)
            host.locator('#online-start').click()
            for label, page in [('host', host), ('guest', guest)]:
                page.wait_for_function('window.__game.state.screen === "playing"', timeout=15000)
                check(f'{label} started gameplay', page.evaluate('window.__game.state.event') == 'skate')
            host.evaluate('window.__game.setBot(true)')
            host.wait_for_function('window.__game.state.score > 0', timeout=20000)
            host.wait_for_function('window.__game.network().players.find(p => p.id === 0)?.total > 0', timeout=10000)
            guest.wait_for_function('window.__game.network().players.find(p => p.id === 0)?.total > 0', timeout=10000)
            check('gameplay score sent across WebRTC', True, guest.evaluate('window.__game.network().players'))
            guest.evaluate('window.__game.network().sendScore({event:"skate",score:765,total:765})')
            host.wait_for_function('window.__game.network().players.find(p => p.id === 1)?.total === 765', timeout=10000)
            check('guest standings returned to host', True)
            for event in ['skate', 'surf', 'bmx']:
                for label, page in [('host', host), ('guest', guest)]:
                    check(f'{label} reached {event}', page.evaluate('window.__game.state.event') == event)
                    page.evaluate('window.__game.finish(); window.__game.advance()')
            for label, page in [('host', host), ('guest', guest)]:
                page.wait_for_function('window.__game.state.screen === "festival-result"', timeout=10000)
                page.wait_for_function('document.querySelectorAll("#podium-list .standing").length === 2', timeout=10000)
                check(f'{label} completed online festival', page.evaluate('window.__game.state.screen') == 'festival-result')
                check(f'{label} podium includes both riders', page.locator('#podium-list .standing').count() == 2)
                page.wait_for_function('window.__game.network().players.every(p => p.finished)', timeout=10000)
                check(f'{label} received both final results', True)
            result['firstFestivalHost'] = host.evaluate('window.__game.network().snapshot')
            result['firstFestivalGuest'] = guest.evaluate('window.__game.network().snapshot')
            guest.locator('#festival-again').click()
            guest.wait_for_timeout(200)
            check('guest rematch waits for host', guest.evaluate('window.__game.state.screen === "festival-result" && window.__game.network().round === 1'))
            host.locator('#festival-again').click()
            for label, page in [('host', host), ('guest', guest)]:
                page.wait_for_function('window.__game.state.screen === "playing" && window.__game.state.event === "skate" && window.__game.network().round === 2', timeout=15000)
                check(f'{label} synchronized rematch starts skate', True)
            result['hostState'] = host.evaluate('window.__game.state')
            result['guestState'] = guest.evaluate('window.__game.state')
            result['hostNetwork'] = host.evaluate('window.__game.network().snapshot')
            result['guestNetwork'] = guest.evaluate('window.__game.network().snapshot')
            check('no browser runtime errors', len(result['errors']) == 0, result['errors'])
            guest.evaluate('window.__game.network().disconnect()')
            host.wait_for_function('window.__game.network().players.find(p => p.id === 1)?.connected === false', timeout=10000)
            check('real disconnect delivered', True)
            host.evaluate('window.__game.network().disconnect()')
        finally:
            browser.close()
except Exception as error:
    check('real online flow completed', False, str(error))

passed = sum(item['passed'] for item in result['checks'])
failed = len(result['checks']) - passed
result['passed'] = passed
result['failed'] = failed
result['success'] = failed == 0
RESULT.write_text(json.dumps(result, indent=2))
print(f'{passed} online checks passed; {failed} failed')
sys.exit(1 if failed else 0)
