# The Hub harness, all four runs (Appendix D's runner), plus a real stroke fed through a client onto the host's state.
# It uses an OS-picked port, confirms the frame is this game, and stops only its own server, by handle. Prints failures and a one-line count.
import json, os, re, subprocess, sys
from playwright.sync_api import sync_playwright
folder = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'notes', 'harness'))
TITLE = 'Trauma Bender: Second Opinion'
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=folder, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
checks = 0; fails = []
def check(name, ok, detail: object = ''):
    global checks
    checks += 1
    if not ok: fails.append(name + (': ' + str(detail)[:900] if detail else ''))
try:
    line = srv.stdout.readline() if srv.stdout else ''; found = re.search(r'port (\d+)', line); assert found; port = int(found.group(1))
    base = f'http://127.0.0.1:{port}/'
    RUNS = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']
    only = sys.argv[2] if len(sys.argv) > 2 else None
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for q in RUNS:
            if only and only not in q: continue
            pg = b.new_page(viewport={'width': 1280, 'height': 720}); perr = []; pg.on('pageerror', lambda e: perr.append(str(e)[:300]))
            pg.goto(base + 'harness.html?game=game.html&' + q)
            try: pg.wait_for_function("() => document.body.dataset.complete === 'true'", timeout=180000)
            except Exception as e: check('harness finished: ' + q, False, 'timeout')
            r = pg.evaluate("() => { const h = window.__hubCheck; return h ? { pass: h.pass, failed: h.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail), n: h.checks.length } : null }")
            title = pg.evaluate("() => { const f = document.querySelector('iframe'); try { return f && f.contentDocument && f.contentDocument.title } catch (e) { return 'x' } }")
            check('frame is this game: ' + q, title == TITLE or title is None, title)
            check('harness pass: ' + q, bool(r and r['pass']), json.dumps(r)[:900] + ' ' + ' | '.join(perr[:2]))
            pg.close()
        # a client's stroke lands on the host's state, at latency
        if not only or only == 'stroke':
            pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.goto(base + 'harness.html?game=game.html&players=2&latency=150&jitter=30&limit=60')
            pg.wait_for_timeout(1500)
            frames = lambda: pg.evaluate("() => [...document.querySelectorAll('iframe')].length")
            ok = False; st = None
            for i in range(60):
                st = pg.evaluate("() => { const fr = [...document.querySelectorAll('iframe')].map(f => f.contentWindow); return fr.map(w => { try { const sc = w.GAME.game.scene; return { name: w.GAME.game.sceneName, phase: sc.phase, host: sc.info && sc.info.isHost }; } catch (e) { return null; } }); }")
                if st and len(st) == 2 and all(s and s.get('phase') in ('card', 'count', 'play') for s in st): ok = True; break
                pg.wait_for_timeout(500)
            check('two copies on the harness', ok, st)
            if ok:
                # answer the card in both frames, then wait for play
                pg.evaluate("() => { for (const f of document.querySelectorAll('iframe')) { const w = f.contentWindow; w.AIHub.answer('ready'); } }")
                for i in range(80):
                    st = pg.evaluate("() => [...document.querySelectorAll('iframe')].map(f => f.contentWindow.GAME.game.scene.phase)")
                    if all(s == 'play' for s in st): break
                    pg.wait_for_timeout(250)
                check('both copies reach play', all(s == 'play' for s in st), st)
                # the client (not host) sweeps Suction over a pool: the host's stats count the volume, and its cursor shows on the host
                res = pg.evaluate("""async () => {
                  const fr = [...document.querySelectorAll('iframe')].map(f => f.contentWindow), host = fr.find(w => w.GAME.game.scene.info.isHost), cli = fr.find(w => !w.GAME.game.scene.info.isHost);
                  const hs = host.GAME.game.scene, cs = cli.GAME.game.scene, L = cs.locals[0];
                  const pool = hs.S.objs.find(o => o.type === 'pool'); if (!pool) return { err: 'no pool' };
                  const I = cli.GAME.game.input; L.c.tool = 'suction'; L.c.x = pool.x; L.c.y = pool.y;
                  const before = hs.S.hands[1].sucked, hold = I.value; I.value = a => a === 'useTool' ? 1 : hold.call(I, a);
                  const t0 = performance.now(); while (performance.now() - t0 < 3000) { L.c.x = pool.x; L.c.y = pool.y; await new Promise(r => setTimeout(r, 50)); }
                  I.value = hold;
                  return { before, after: hs.S.hands[1].sucked, hostSeesTool: hs.S.hands[1].tool, x: hs.S.hands[1].x, y: hs.S.hands[1].y, px: pool.x, py: pool.y, mirrorObjs: cs.S.objs.length, hostObjs: hs.S.objs.length, clientVitals: cs.S.vitals, hostVitals: hs.S.vitals };
                }""")
                check('a client stroke lands on the host', res.get('after', 0) > res.get('before', 0) and res.get('hostSeesTool') == 'suction', res)
                check('the mirror holds the objects', res.get('mirrorObjs', 0) > 0, res)
                check('the mirror follows vitals', abs(res.get('clientVitals', 0) - res.get('hostVitals', 99)) < 6, res)
            pg.close()
        # outside a session it still runs
        if not only:
            pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.goto(base + 'game.html'); pg.wait_for_timeout(1800)
            st = pg.evaluate("() => ({ active: AIHub.active, scene: GAME.game.sceneName, title: document.title })")
            check('standalone runs outside a session', not st['active'] and st['scene'] == 'title' and st['title'] == TITLE and not errs, str(st) + str(errs[:2]))
            pg.close()
        b.close()
finally:
    srv.terminate(); srv.wait(timeout=5)
for f in fails: print('FAIL', f)
print(f'{checks} hub checks, {len(fails)} failed')
sys.exit(1 if fails else 0)
