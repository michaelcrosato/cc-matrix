"""The harness by hand (PLAN.md section 16): two players with no auto: read the card, answer it in one frame, see the ghosts
and the results, press Time up, take one screenshot. Usage: python3 labs/game/tools/hubview.py <html> <out.png>"""
import http.server, os, shutil, sys, tempfile, threading, time
from functools import partial
from playwright.sync_api import sync_playwright

ROOT = os.getcwd()
html, shot = sys.argv[1], sys.argv[2]
work = tempfile.mkdtemp(prefix='hub', dir=os.path.join(ROOT, 'out'))
for f in ['harness.html', 'bridge.js', 'round.js']:
    shutil.copy(os.path.join(ROOT, 'labs/game/hub/harness', f + '.txt'), os.path.join(work, f))
shutil.copy(html, os.path.join(work, 'game.html'))
http.server.SimpleHTTPRequestHandler.log_message = lambda *a, **k: None
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), partial(http.server.SimpleHTTPRequestHandler, directory=work))
threading.Thread(target=server.serve_forever, daemon=True).start()
port = server.server_address[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), args=['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'])
    pg = b.new_page(viewport={'width': 1600, 'height': 900})
    pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&players=2&latency=150&jitter=50&loss=5')
    games = lambda: [f for f in pg.frames if 'aihub=1' in f.url]
    end = time.time() + 120
    while time.time() < end and (len(games()) < 2 or not all(g.evaluate("() => !!document.querySelector('[data-ui=hubcard]')") for g in games())):
        pg.wait_for_timeout(500)
    print('card shows', [g.evaluate("() => { const c = document.querySelector('[data-ui=hubcard]'); return c ? c.innerText.slice(0, 70) : null; }") for g in games()])
    for g in games():
        g.evaluate("() => { const r = document.querySelector('[data-card=ready]'); if (r) r.click(); }")
    end = time.time() + 120
    while time.time() < end and not all(g.evaluate("() => { const e = window.__engine; return !!(e && e.state && e.state('flow').entities[0].flow.mode === 'event'); }") for g in games()):
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(9000)
    print('frames', [g.url[-40:] for g in games()])
    print('in play', [g.evaluate("() => { const e = window.__engine; if (!e || !e.state) return 'no engine'; const a = e.state('activity').entities[0].activity; return [__game.mode, __game.event, a.data.classes, e.state('ghost').entities.length, e.ready, e.errors.length]; }") for g in games()])
    print('ghost lean', [g.evaluate("() => { const e = window.__engine; return e && e.state ? e.state('ghost').entities.map((x) => [x.ghost.id, x.ghost.t, x.ghost.e, x.ghost.active]) : null; }") for g in games()])
    print('labels', games()[0].evaluate("() => [...document.querySelectorAll('[data-ui=label]')].map((e) => e.textContent).slice(0, 4)"))
    pg.screenshot(path=shot)
    harness = lambda: pg.evaluate("() => document.querySelector('#log').innerText.trim().split('\\n').slice(-6)")
    pg.get_by_text('Time up').first.click()
    pg.wait_for_timeout(5000)
    print('after time up', harness())
    pg.click('#restart')
    end = time.time() + 120
    while time.time() < end and not (len(games()) == 2 and all(g.evaluate("() => !!(window.__engine && window.__engine.ready && window.__game)") for g in games())):
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(16000)
    print('after new round', harness(), [g.evaluate("() => [window.__game && __game.mode, window.__engine && __engine.errors.length]") for g in games()])
    pg.click('#remove')
    pg.wait_for_timeout(4000)
    print('after remove player', harness(), len(games()), 'frames left')
    print('errors', [g.evaluate("() => (window.__engine && window.__engine.errors || []).length") for g in games()] if games() else 'frames gone')
    b.close()
server.shutdown()
shutil.rmtree(work, ignore_errors=True)
