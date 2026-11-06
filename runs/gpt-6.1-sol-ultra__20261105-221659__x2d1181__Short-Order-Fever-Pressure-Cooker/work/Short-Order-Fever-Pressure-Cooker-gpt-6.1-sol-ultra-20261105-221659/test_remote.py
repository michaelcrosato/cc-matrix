"""Real standalone WebRTC co-op against two complete game pages.

Import run(base_url) from the unified test command. No output on success;
the CLI prints only failures and one count. No physical controller needed.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

SLUG = 'Short-Order-Fever-Pressure-Cooker-gpt-6.1-sol-ultra-20261105-221659'


def run(base_url):
    count = 0
    failures = []
    report = {}
    errors = []

    def check(name, fn):
        nonlocal count
        count += 1
        try:
            result = fn()
            if result is False:
                raise AssertionError('condition was false')
        except Exception as exc:
            failures.append(name+': '+str(exc).splitlines()[0])

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=[
            '--enable-unsafe-webgpu', '--enable-features=Vulkan',
            '--use-webgpu-adapter=swiftshader',
            '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
            '--autoplay-policy=no-user-gesture-required',
        ])
        context = browser.new_context(ignore_https_errors=True, viewport={'width': 1280, 'height': 800})
        host = context.new_page()
        guest = context.new_page()
        try:
            url = base_url.rstrip('/')+'/'+SLUG+'.html?webgl'
            for role, page in [('host', host), ('guest', guest)]:
                page.on('pageerror', lambda error, label=role: errors.append(label+': '+str(error)))
                page.goto(url, wait_until='domcontentloaded', timeout=60000)
                page.wait_for_function('window.__gameReady || window.__gameError', timeout=90000)
            check('WebRTC full game pages initialize', lambda:
                  host.title().startswith('Short Order Fever') and guest.title().startswith('Short Order Fever') and
                  host.evaluate('!!window.__gameReady && !window.__gameError') and
                  guest.evaluate('!!window.__gameReady && !window.__gameError'))
            host.mouse.move(1,1)
            host.locator('#title-panel [data-action=online]').click()
            host.locator('[data-action=invite]').click()
            host.wait_for_function('document.getElementById("network-code").value.length>50', timeout=20000)
            check('WebRTC generated invite stays visible in lobby',lambda:host.locator('#network-code').is_visible() and host.evaluate('__game.getScreen()')=='online')
            offer = host.locator('#network-code').input_value()
            guest.mouse.move(1,1)
            guest.locator('#title-panel [data-action=online]').click()
            answer = guest.evaluate('(offer) => __game.network.acceptInvite(offer)', offer)
            host.evaluate('(answer) => __game.network.acceptAnswer(answer)', answer)
            host.wait_for_function('__game.getNetwork().players.length===2', timeout=20000)
            guest.wait_for_function('__game.getNetwork().me===1 && __game.getNetwork().players.length===2', timeout=10000)
            check('WebRTC lobby waits for host start',lambda:host.evaluate('__game.getScreen()')=='online' and guest.evaluate('__game.getScreen()')=='online')
            check('WebRTC connects and assigns two chef seats', lambda:
                  host.evaluate('__game.getNetwork().mode === "local-host" && __game.getNetwork().authority') and
                  guest.evaluate('__game.getNetwork().mode === "rtc-guest" && !__game.getNetwork().authority'))
            host.locator('[data-action=coop-start]').click()
            host.wait_for_function('__game.getState().players.length===2 && __game.getScreen()==="playing"')
            guest.wait_for_function('__game.getState().players.length===2 && __game.getScreen()==="playing"')
            check('WebRTC full game world and roster replicate', lambda:
                  host.evaluate('__game.getState().players.map(p=>p.id).join()') ==
                  guest.evaluate('__game.getState().players.map(p=>p.id).join()') == '0,1')
            guest.keyboard.press('Escape')
            guest.wait_for_timeout(450)
            check('WebRTC guest pause survives incoming snapshots',lambda:guest.evaluate('__game.getScreen()')=='pause')
            guest.locator('#pause-panel [data-action=resume]').click()
            start_x = host.evaluate('__game.getState().players.find(p=>p.id===1).x')
            guest.keyboard.down('d')
            host.wait_for_function('(x)=>__game.getState().players.find(p=>p.id===1).x>x+.8', arg=start_x, timeout=6000)
            guest.keyboard.up('d')
            guest.evaluate('__game.network.sendInput({x:0,z:0})')
            check('WebRTC guest movement reaches authoritative kitchen', lambda:
                  host.evaluate('__game.getState().players.find(p=>p.id===1).x') > start_x+.8)
            guest.evaluate('__game.network.sendInput({x:0,z:0,select:-1})')
            host.wait_for_function('__game.getState().players.find(p=>p.id===1).order===0', timeout=5000)
            check('WebRTC signed ticket selection survives input coalescing', lambda:
                  host.evaluate('__game.getState().players.find(p=>p.id===1).order') == 0)
            guest.evaluate('__game.network.sendInput({x:0,z:0,bell:true})')
            host.wait_for_function('__game.getState().stats.bells===1', timeout=5000)
            guest.wait_for_function('__game.getState().stats.bells===1', timeout=5000)
            check('WebRTC remote action changes replicated game state', lambda:
                  host.evaluate('__game.getState().freeze>0') and guest.evaluate('__game.getState().freeze>0'))
            host.evaluate('__game.setState({score:321,served:2}); __game.finish(true)')
            guest.wait_for_function('__game.getState().mode==="victory" && __game.getState().score===321', timeout=5000)
            check('WebRTC completed round reaches remote result screen', lambda:
                  guest.evaluate('__game.getScreen()') == 'result')
            host.evaluate('__game.start()')
            guest.wait_for_function('__game.getScreen()==="playing" && __game.getState().score===0 && __game.getState().served===0', timeout=5000)
            check('WebRTC round restart preserves the connected kitchen', lambda:
                  guest.evaluate('__game.getNetwork().players.length===2 && __game.getNetwork().started && !__game.getNetwork().ended') and
                  host.evaluate('__game.getState().players.length===2'))
            report['host'] = host.evaluate('__game.getNetwork()')
            report['guest'] = guest.evaluate('__game.getNetwork()')
            report['gameState'] = host.evaluate('__game.getState()')
            host.evaluate('__game.network.close()')
            guest.wait_for_function('__game.getNetwork().ended', timeout=5000)
            check('WebRTC host departure closes remote kitchen', lambda:
                  guest.evaluate('__game.getNetwork().ended'))
            check('WebRTC full game emits no browser errors', lambda: not errors)
        except Exception as exc:
            count += 1
            failures.append('WebRTC full game sequence: '+str(exc).splitlines()[0])
        finally:
            report['browserErrors'] = errors
            report['failures'] = failures
            report['checks'] = count
            for page in (host, guest):
                try:
                    page.evaluate('__game?.network?.close()')
                except Exception:
                    pass
            context.close()
            browser.close()
    Path(__file__).with_name('remote-report.json').write_text(json.dumps(report, indent=2))
    return count, failures


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('base_url', nargs='?', default='http://127.0.0.1:34895')
    total, failures = run(parser.parse_args().base_url)
    for failure in failures:
        print('FAIL '+failure)
    print(f'{total-len(failures)}/{total} WebRTC game checks passed')
    raise SystemExit(bool(failures))
