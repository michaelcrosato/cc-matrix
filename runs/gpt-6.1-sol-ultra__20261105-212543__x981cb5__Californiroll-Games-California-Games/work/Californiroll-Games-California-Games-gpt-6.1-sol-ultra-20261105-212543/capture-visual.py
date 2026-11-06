from pathlib import Path
import base64
import sys
import functools
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
bmx_only = '--bmx-only' in sys.argv
URL = next((arg for arg in sys.argv[1:] if arg.startswith('http')), f'http://127.0.0.1:{server.server_port}/index.html')
try:
 with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        '--enable-unsafe-webgpu', '--enable-features=Vulkan',
        '--use-angle=swiftshader', '--disable-dev-shm-usage',
    ])
    page = browser.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
    page.goto(URL, wait_until='domcontentloaded')
    page.wait_for_function('window.__coast?.ready && typeof window.__coast.captureScene === "function"', timeout=180000)
    page.wait_for_function('__coast.frames > 2', timeout=180000)
    page.keyboard.press('KeyZ')
    page.evaluate('setInterval(() => __coast.keepMenuAwake?.(), 1000)')
    def capture(name):
        page.evaluate('''() => {
            window.__captureLoop = __coast.renderer._animation.getAnimationLoop();
            __coast.renderer.setAnimationLoop(null);
        }''')
        data = page.evaluate('() => __coast.captureScene()')
        if not data.startswith('data:image/'):
            raise RuntimeError('captureScene did not return image data')
        (ROOT / f'visual-{name}-scene.png').write_bytes(base64.b64decode(data.split(',', 1)[1]))
        page.evaluate('''data => {
            document.querySelector('#stage').style.visibility = 'hidden';
            document.body.style.backgroundImage = `url(${data})`;
            document.body.style.backgroundSize = '100% 100%';
            document.body.style.backgroundRepeat = 'no-repeat';
        }''', data)
        page.screenshot(path=str(ROOT / f'visual-{name}.png'))
        page.evaluate('''() => {
            document.querySelector('#stage').style.visibility = '';
            document.body.style.backgroundImage = '';
            __coast.renderer.setAnimationLoop(window.__captureLoop);
        }''')
    if not bmx_only:
        page.evaluate('__coast.activate("quit")')
        capture('title')
        page.evaluate('__coast.startGame(2, false, 1); __coast.activate("begin")')
        page.wait_for_timeout(1200)
        capture('surf')
        page.evaluate('__coast.startGame(0, false, 1); __coast.activate("begin")')
        page.wait_for_timeout(800)
        capture('halfpipe')
    page.evaluate('__coast.startGame(4, false, 1); __coast.activate("begin")')
    page.wait_for_timeout(800)
    capture('bmx')
    browser.close()
finally:
    server.shutdown()
    server.server_close()
print(f'{1 if bmx_only else 4} visual captures saved')
