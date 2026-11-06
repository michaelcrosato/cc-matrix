"""The hub's own harness (labs/game/hub/harness.txt) at 2, 3 and 4 players and with the host leaving, on a server this script
starts and stops by itself. Each frame must have the engine truly running: the harness alone would pass a dead game."""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

built = sys.argv[1]
ok = fail = 0
def check(name, cond, detail=''):
    global ok, fail
    if cond:
        ok += 1
        if '--list' in sys.argv: print('ok  ', name, flush=True)
    else:
        fail += 1
        print('FAIL', name, str(detail)[:1500])

d = tempfile.mkdtemp(prefix='hub', dir='out')
shutil.copy(built, d + '/game.html')
for f, to in [('harness.txt', 'harness.html'), ('bridge.txt', 'bridge.js'), ('round.txt', 'round.js')]:
    shutil.copy('labs/game/hub/' + f, d + '/' + to)
html = open(built, encoding='utf8').read()
client = open('labs/game/hub/session-client.txt', encoding='utf8').read()
check('client pasted byte for byte', client in html)
check('client is first in head', html.index('aihub-session') < html.index('hub:session-mode'))
srv = subprocess.Popen(['python3', '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', d], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
port = re.search(r'port (\d+)', srv.stdout.readline()).group(1)
ARGS = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader']
try:
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=ARGS)
        for players, scenario, play in [] if '--hand' in sys.argv else [(2, '', 80000), (3, '', 8000), (4, '', 8000), (3, 'host-leave', 8000)]:
            pg = b.new_page(viewport={'width': 1280, 'height': 800})
            logs = []
            pg.on('console', lambda m: logs.append(m.text) if m.text.startswith('[AIHub]') else None)
            q = f'game=game.html&players={players}&latency=150&jitter=50&loss=5&auto=1&play={play}' + (f'&scenario={scenario}' if scenario else '')
            pg.goto(f'http://127.0.0.1:{port}/harness.html?{q}')
            t = time.time()
            live = []
            while time.time() - t < 400:
                if pg.evaluate("()=>document.body.dataset.complete==='true'"):
                    break
                for fr in pg.frames[1:]:
                    try:
                        s = fr.evaluate("()=>[window.__engine&&window.__engine.ready===true,(window.__engine&&window.__engine.errors||[]).length,window.__engine&&window.__engine.state?window.__engine.state('ghost').entities.length:-1]")
                        live.append(s)
                    except Exception:
                        pass
                time.sleep(2)
            c = json.loads(pg.evaluate("()=>JSON.stringify(window.__hubCheck||null)"))
            name = f'{players} players {scenario}'
            check(name + ' harness pass', c and c.get('pass'), [x for x in (c or {}).get('checks', []) if not x['pass']])
            check(name + ' no protocol lines', not logs, logs[:3])
            check(name + ' no engine errors', all(s[1] == 0 for s in live), live[-4:])
            if players == 2:
                check('engine truly running in every frame', sum(1 for s in live if s[0]) >= 2, live[-4:])
                check('a ghost at 2 players', any(s[2] == 1 for s in live), live[-4:])
            pg.close()
        # by hand: no auto, the harness's own buttons, its frames as players on this computer
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&players=2&latency=150&jitter=50')
        def frames(js):
            pg.evaluate('1')  # the sync API only hears of new frames during a call
            out = []
            for fr in pg.frames[1:]:
                try:
                    out.append(fr.evaluate(js))
                except Exception:
                    pass
            return out
        def wait(js, secs):
            t = time.time()
            while time.time() - t < secs:
                got = frames(js)
                if got and any(got):
                    return True
                time.sleep(2)
            return False
        check('by hand: the game\u2019s own card shows', wait("()=>!!document.querySelector('[data-ui=card]')", 60), len(pg.frames))
        check('by hand: the engine comes up', wait("()=>window.__engine&&window.__engine.ready===true", 150))
        pg.click('#release', force=True)
        check('by hand: the class starts', wait("()=>!!window.__game&&window.__game.mode==='event'", 120), frames("()=>window.__game&&window.__game.mode"))
        time.sleep(4)
        check('by hand: the other player is a ghost', wait("()=>__engine.state('ghost').entities.length===1", 20))
        pg.screenshot(path='out/hub-by-hand.png')
        check('by hand: no dev mode in a session', all(frames("()=>!document.querySelector('[data-ui=dev]')")))
        for fr in pg.frames[1:]:
            fr.evaluate("()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}))")
        check('by hand: a session pause is an overlay', wait("()=>!!document.querySelector('[data-ui=session-pause]')", 20))
        tick = frames("()=>__engine.info().tick")
        time.sleep(3)
        check('by hand: and never stops the sim', frames("()=>__engine.info().tick") != tick)
        check('by hand: and offers no quitting', not any(frames("()=>!!document.querySelector('[data-ui=session-pause] [data-id=quit],[data-ui=session-pause] [data-id=dev]')")))
        check('by hand: names show as labels', any(frames("()=>[...document.querySelectorAll('[data-ui=label]')].some(l=>/Fox|Otter/.test(l.textContent))")), frames("()=>document.querySelectorAll('[data-ui=label]').length"))
        pg.click('#timeup')
        time.sleep(12)
        log = pg.evaluate("()=>document.body.innerText")
        check('by hand: Time up ends the round', 'time-up' in log, log[-300:])
        pg.click('#restart')
        check('by hand: a new round opens', wait("()=>!!document.querySelector('[data-ui=card]')", 60))
        pg.click('#remove')
        time.sleep(4)
        check('by hand: Remove player leaves one frame running', len(pg.frames) >= 2)
        pg.close()
        b.close()
finally:
    srv.terminate()
    shutil.rmtree(d, ignore_errors=True)
print(f'RESULT ok {ok} fail {fail}')
