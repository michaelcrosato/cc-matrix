# Appendix D's harness runner, all four runs and the client-stroke check. Prints only failures and a count line as JSON for run.mjs.
import json, os, re, shutil, subprocess, sys, time
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.dirname(__file__) + '/..'); folder = root + '/tests/hubdir'
os.makedirs(folder, exist_ok=True)
shutil.copy(root + '/game.html', folder + '/game.html')
for f in ['harness.html', 'bridge.js', 'round.js']: shutil.copy(root + '/vendor/hub/' + f, folder + '/' + f)
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=folder, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
fails = []; n = 0
try:
    line = srv.stdout.readline(); port = int(re.search(r'port (\d+)', line).group(1)); base = f'http://127.0.0.1:{port}/'
    RUNS = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for q in RUNS:
            pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.goto(base + 'harness.html?game=game.html&' + q); n += 1
            try: pg.wait_for_function("() => document.body.dataset.complete === 'true'", timeout=170000)
            except Exception as e: fails.append('TIMEOUT ' + q)
            r = pg.evaluate("() => { const h = window.__hubCheck; return h ? { pass: h.pass, failed: h.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail), n: h.checks.length } : null }")
            title = pg.evaluate("() => { const f = document.querySelector('iframe'); try { return f && f.contentDocument && f.contentDocument.title } catch (e) { return 'x' } }")
            if title != 'Second Scalpel': fails.append('wrong page: ' + str(title))
            if not r or not r['pass']: fails.append(q + ' ' + json.dumps(r)[:900])
            pg.close()
        if '--stroke' in sys.argv or True:
            pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.goto(base + 'harness.html?game=game.html&players=2&limit=120'); n += 1
            pg.wait_for_timeout(3000)
            frames = [f for f in pg.frames if f != pg.main_frame and 'game.html' in f.url]
            for f in frames: f.evaluate("() => { try { AIHub.answer('ready'); } catch (e) {} }")
            pg.wait_for_timeout(7000)
            info = [f.evaluate("() => ({ host: AIHub.isHost, me: AIHub.me, phase: GAME.Hub.phase })") for f in frames]
            host = frames[[i['host'] for i in info].index(True)]; client = frames[[i['host'] for i in info].index(False)]
            r = client.evaluate("""async () => { const h = GAME.Hub, v = h.view, seat = v.seats[0], me = seat.pid; const sleep = ms => new Promise(s => setTimeout(s, ms)); const d = seat.dev; const orig = GAME.readDevice; const st = { trig: 0, tool: 'forceps' };
                GAME.readDevice = (s, g, S) => { const q = GAME.Cursor.emptyDevice(); q.mouse = [st.x, st.y]; q.trig = st.trig; q.wheelPick = st.tool; return q; };
                st.tool = 'cautery'; st.x = 100; st.y = 100; await sleep(500); st.trig = 1; for (let i = 0; i < 40; i++) { st.x = 100 + i * 6; st.y = 100 + Math.sin(i * .3) * 30; await sleep(30); } st.trig = 0; await sleep(300); return { x: st.x, phase: h.phase, tool: seat.tool }; }""")
            s = host.evaluate("(me) => { const S = GAME.Hub.S; const p = S.players.find(q => q.id !== GAME.Hub.info.me); return { x: p.x, y: p.y, tool: p.toolNext, charred: S.marks.filter(m => m[0] === 'char').length, phase: GAME.Hub.phase, heat: p.heat } }", None)
            if not (abs(s['x'] - r['x']) < 30 and s['tool'] == 'cautery' and s['charred'] + s['heat'] > 0): fails.append('client stroke did not land on the host: ' + json.dumps([r, s]))
            m = host.evaluate("() => { const g = GAME.game; return { items: g.o.menu.items(), quit: g.o.menu.quit, live: g.live !== undefined ? g.live : g.o.live, corner: g.o.corner, saves: g.o.menu.saves } }"); n += 1
            if (m['items'] != [] or m['quit'] is not False or m['corner'] is not False or m['saves'] is not False): fails.append('session menu has only the plan\'s rows: ' + json.dumps(m))
            pg.close()
        pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(base + 'game.html'); pg.wait_for_timeout(2000); n += 1
        st = pg.evaluate("() => ({ active: AIHub.active, probe: window.__hubProbe(), scene: GAME.game.debug.snapshot().scene })")
        if st['active'] or st['scene'] != 'title' or errs: fails.append('standalone ' + json.dumps(st) + str(errs[:3]))
        pg.close(); b.close()
finally:
    srv.terminate(); srv.wait(timeout=5)
print(json.dumps({'n': n, 'fails': fails}))
