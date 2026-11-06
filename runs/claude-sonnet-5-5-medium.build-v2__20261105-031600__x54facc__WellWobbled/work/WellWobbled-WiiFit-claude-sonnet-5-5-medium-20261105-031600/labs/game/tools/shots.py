"""Final screenshots at 1920x1080 of the main moments, by driving the page. Usage: python3 labs/game/tools/shots.py <html> <outdir>"""
import sys, os, time
from playwright.sync_api import sync_playwright
html = os.path.abspath(sys.argv[1]); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
ARGS = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); pg.goto('file://' + html)
    t0 = time.time()
    while time.time() - t0 < 150 and not pg.evaluate('!!(window.__engine && window.__engine.ready && window.__game && window.__ww)'): time.sleep(1)
    def settle(s=12): time.sleep(s)
    def shot(n): pg.screenshot(path=f'{out}/{n}.png')
    def act(name, args='{}'): pg.evaluate(f"window.__engine.actions.run('{name}', {args})")
    def play(ev, cam):
        act('game.go', "{station:'%s'}" % ev[1]); act('game.start', "{event:'%s'}" % ev[0]); pg.evaluate(f"window.__ww.setCamera('{cam}'); window.__ww.setMap('actionMap:balance')")
    settle(8); shot('title')
    pg.keyboard.press('Enter'); settle(14); shot('island')
    play(('poseA', 'pavilion'), 'cam3=stage,mat'); settle(10); act('dev.phase', "{phase:'hold'}"); settle(14); shot('pose')
    play(('pond', 'pond'), 'cam3=stage,portrait'); settle(30); shot('pond')
    play(('line', 'lagoon'), 'cam3=stage,line'); settle(14); shot('line')
    play(('tilt', 'plaza'), 'cam3=stage,tilt'); settle(8); act('dev.phase', "{phase:'stone'}"); settle(16); shot('tilt')
    act('dev.finish', '{score: 800}'); settle(14); shot('results')
    pg.evaluate("window.__ww.openPause()"); settle(6); shot('pause')
    pg.evaluate("window.__ww.titleScreen()"); settle(3)
    b.close()
