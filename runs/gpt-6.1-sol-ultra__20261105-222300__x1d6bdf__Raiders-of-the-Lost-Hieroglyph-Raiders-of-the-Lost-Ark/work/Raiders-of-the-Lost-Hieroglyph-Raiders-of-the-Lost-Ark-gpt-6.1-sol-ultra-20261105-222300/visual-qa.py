import functools
import http.server
import pathlib
import threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
GAME = ROOT.name + '.html'
OUT = ROOT / 'visual-qa'
OUT.mkdir(exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
handler = functools.partial(QuietHandler, directory=str(ROOT.parent))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'])
        page = browser.new_page(viewport={'width':1600,'height':1000}, device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/{GAME}?renderer=webgl', wait_until='domcontentloaded')
        page.wait_for_function('window.__game?.state.ready', timeout=120000)
        assert page.title() == 'Raiders of the Lost Hieroglyph'
        page.evaluate('window.__game.exitAttract(); window.__game.advance(.2)')
        for stage in [1]:
            page.evaluate('stage=>{window.__game.start();window.__game.warp(stage);window.__game.advance(2);document.querySelectorAll(".chapter-banner").forEach(e=>e.remove());document.querySelector("#dialogue").classList.add("hidden");document.querySelector("#toast").classList.add("hidden");}',stage)
            page.wait_for_timeout(200)
            page.screenshot(path=str(OUT/f'stage-{stage}.png'))
        browser.close()
        print({'screenshots':1,'pageErrors':errors})
finally:
    server.shutdown()
    server.server_close()
