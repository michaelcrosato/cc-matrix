# The game's own card inside the real hub harness: both players ask for more time so the countdown holds while software rendering catches up.
import os, re, shutil, subprocess, time
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
site = os.path.join(root, 'tests', '.site'); os.makedirs(site, exist_ok=True)
shutil.copy(os.path.join(root, '..', os.path.basename(root) + '.html'), os.path.join(site, 'game.html'))
for f in ['harness.html', 'bridge.js', 'round.js']: shutil.copy(os.path.join(root, 'vendor', 'hub', f), os.path.join(site, f))
srv = subprocess.Popen(['python3', '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
port = int(re.search(r'port (\d+)', srv.stdout.readline()).group(1))
FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=FLAGS)
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&players=2&limit=900')
        asked = set(); t0 = time.time(); fr = None; info = None
        while time.time() - t0 < 420:
            for f in pg.frames:
                if 'game.html' not in f.url: continue
                try:
                    if id(f) not in asked and f.evaluate('window.AIHub && AIHub.players && AIHub.players.length > 0'):
                        f.evaluate("AIHub.answer('more')"); asked.add(id(f)); print('asked more')
                    if f.evaluate('!!(window.__GAME__ && window.__PIXEL_ENGINE__ && window.__PIXEL_ENGINE__.frame > 4 && !__GAME__.net.started)'): fr = f
                except Exception: pass
            if fr and len(asked) >= 2: break
            time.sleep(2)
        print('elapsed', int(time.time() - t0), 'found', bool(fr))
        if fr:
            f0 = fr.evaluate('__PIXEL_ENGINE__.frame')
            while time.time() - t0 < 520 and fr.evaluate('__PIXEL_ENGINE__.frame') - f0 < 4: time.sleep(2)
            print('state', fr.evaluate('JSON.stringify({m:__GAME__.mode,hub:AIHub.active,started:__GAME__.net.started,card:__GAME__.net.card,prompts:__GAME__.state().prompts})')[:500], fr.evaluate('__PIXEL_ENGINE__.errors.slice(0,2)'))
            fr.frame_element().screenshot(path=os.path.join(root, 'tests', 'shots', 'card-harness.png'))
        b.close()
finally:
    srv.terminate(); srv.wait()
