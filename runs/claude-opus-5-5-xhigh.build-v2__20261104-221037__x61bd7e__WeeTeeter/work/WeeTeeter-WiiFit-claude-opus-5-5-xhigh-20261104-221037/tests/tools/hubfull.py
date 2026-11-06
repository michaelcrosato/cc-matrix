# A full real-time round in the harness with two copies: answers ready, shoots each event, prints the result.
import sys, os, re, subprocess, time, json
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hub'))
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
port = re.search(r'port (\d+)', srv.stdout.readline()).group(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(viewport={'width': 1600, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&players=2')
        pg.wait_for_timeout(6000)
        frames = [f for f in pg.frames if f != pg.main_frame]
        print('frames', len(frames), [f.evaluate("window.G && G.game && G.game.sceneName") for f in frames], flush=True)
        pg.screenshot(path=f'{out}/card.png')
        for f in frames: f.evaluate("AIHub.answer('ready')")
        t0 = time.time(); shots = {12: 'e1', 25: 'e1b', 40: 'e1c', 62: 'e2', 80: 'e2b', 112: 'e3', 130: 'e3b'}
        taken = set()
        while time.time() - t0 < 175:
            pg.wait_for_timeout(1000); t = time.time() - t0
            for f in frames:
                try: f.evaluate("G.DEV.bot = 'good'")
                except Exception: pass
            for k, v in shots.items():
                if t >= k and v not in taken:
                    taken.add(v); pg.screenshot(path=f'{out}/{v}.png')
                    print(v, int(t), [f.evaluate("[AIHub.time()|0, G.Hub.e, G.Hub.total, G.Hub.deal.join(), Object.keys(G.Hub.ghosts).length, G.game.errors.length]") for f in frames], flush=True)
            if frames[0].evaluate("G.Hub.reported") and frames[1].evaluate("G.Hub.reported"): print('both reported', int(t)); break
        pg.wait_for_timeout(2500)
        print('end', [f.evaluate("[G.Hub.total, G.Hub.reported, G.Hub.over, G.game.errors.map(e => e.message).slice(0, 3)]") for f in frames], errs[:3], flush=True)
        pg.screenshot(path=f'{out}/end.png')
        b.close()
finally:
    srv.terminate(); srv.wait()
