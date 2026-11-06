"""AI Hub conformance: sequential scenarios, one browser, only failures and total."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

SLUG = 'Short-Order-Fever-Pressure-Cooker-gpt-6.1-sol-ultra-20261105-221659'

def run(base_url):
    reports = []
    failures = []
    count = 0
    scenarios = [
        ('two-player', {'players': 2}),
        ('four-player-loss', {'players': 4, 'latency': 150, 'jitter': 50, 'loss': 5}),
        ('host-leave', {'players': 4, 'latency': 150, 'jitter': 50, 'loss': 5, 'scenario': 'host-leave'}),
        ('server', {'players': 2, 'scenario': 'server'}),
    ]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader'])
        for name, options in scenarios:
            context = browser.new_context(ignore_https_errors=True, viewport={'width': 1280, 'height': 720})
            page = context.new_page()
            try:
                query = {'game': '../'+SLUG+'.html?webgl', 'auto': 1, **options}
                url = base_url.rstrip('/')+'/'+SLUG+'/harness.html?'+urlencode(query)
                page.goto(url, wait_until='domcontentloaded', timeout=60000)
                page.wait_for_function('document.body.dataset.complete === "true"', timeout=120000)
                report = page.evaluate('window.__hubCheck')
                reports.append({'scenario': name, **report})
                for check in report['checks']:
                    count += 1
                    if not check['pass']:
                        failures.append(name+': '+check['name']+' — '+check.get('detail',''))
                # The protocol harness checks delivery of end. Also prove the full
                # game stays frozen when controls arrive after that final event.
                frozen_frames = []
                for frame in page.frames:
                    if frame == page.main_frame or not frame.evaluate('!!window.__gameReady'):
                        continue
                    before = frame.evaluate('''(()=>{const s=__game.getState();return JSON.stringify({time:s.time,score:s.score,pressure:s.pressure,served:s.served,players:s.players.map(p=>({id:p.id,x:p.x,z:p.z,stack:p.stack}))})})()''')
                    frame.evaluate('''(()=>{
                        const buttons=Array.from({length:17},(_,i)=>({pressed:i===0,touched:i===0,value:i===0?1:0}));
                        window.__hubEndPad={id:'Test standard controller',index:0,connected:true,mapping:'standard',axes:[1,0,0,0],buttons,timestamp:performance.now()};
                        navigator.getGamepads=()=>[window.__hubEndPad];
                        document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));
                    })()''')
                    frozen_frames.append((frame, before))
                page.wait_for_timeout(150)
                frozen_details = []
                for frame, before in frozen_frames:
                    after = frame.evaluate('''(()=>{const s=__game.getState();return JSON.stringify({time:s.time,score:s.score,pressure:s.pressure,served:s.served,players:s.players.map(p=>({id:p.id,x:p.x,z:p.z,stack:p.stack}))})})()''')
                    stopped = frame.evaluate('__game.getAudio().stopped === true')
                    frozen_details.append({'url':frame.url,'stateFrozen':before==after,'audioStopped':stopped})
                    frame.evaluate('''(()=>{window.__hubEndPad.buttons[0]={pressed:false,touched:false,value:0};window.__hubEndPad.axes=[0,0,0,0];document.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));})()''')
                count += 1
                post_end_pass = bool(frozen_details) and all(item['stateFrozen'] and item['audioStopped'] for item in frozen_details)
                reports[-1]['postEnd'] = {'pass':post_end_pass,'frames':frozen_details}
                if not post_end_pass:
                    failures.append(name+': game state/input/audio stay frozen after hub end — '+json.dumps(frozen_details))
            except Exception as exc:
                count += 1
                failures.append(name+': '+str(exc).splitlines()[0])
                try: reports.append({'scenario': name, 'error': str(exc), 'body': page.locator('body').inner_text()[-6000:]})
                except Exception: pass
            finally:
                context.close()
        browser.close()
    Path(__file__).with_name('hub-report.json').write_text(json.dumps(reports, indent=2))
    return count, failures

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('base_url', nargs='?', default='http://127.0.0.1:34895')
    args = parser.parse_args()
    total, errors = run(args.base_url)
    for error in errors: print('FAIL '+error)
    print(f'{total-len(errors)}/{total} AI Hub checks passed')
    raise SystemExit(bool(errors))
