#!/usr/bin/env python3
# capture.py OUT.png [area] [jump] [--js CODE] [--frames N] [--w W --h H] [--url QUERY]: one frame with the HUD, alpha forced to 255. Uses the deliverable on file://.
import sys, base64, argparse, os, glob
from playwright.sync_api import sync_playwright
ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('area', nargs='?'); ap.add_argument('jump', nargs='?'); ap.add_argument('--js', default=''); ap.add_argument('--frames', type=int, default=60); ap.add_argument('--w', type=int, default=960); ap.add_argument('--h', type=int, default=540); ap.add_argument('--steps', default='')
a = ap.parse_args()
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); html = glob.glob(root + '/PresidentEvil4-*.html')[0]
q = ''
if a.area: q = '?g_area=' + a.area + ('&g_jump=' + a.jump if a.jump else '')
with sync_playwright() as p:
    b = p.firefox.launch(headless=False, firefox_user_prefs={'dom.webgpu.enabled': True, 'gfx.webgpu.ignore-blocklist': True, 'dom.webgpu.workers.enabled': True, 'gfx.webgpu.force-enabled': True, 'security.sandbox.gpu.level': 0, 'security.sandbox.content.level': 0}) if os.environ.get('PE_BROWSER') == 'firefox' else p.chromium.launch(args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'])
    pg = b.new_page(viewport={'width': a.w, 'height': a.h})
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + html + q); pg.wait_for_function('window.__APP__', timeout=120000)
    pg.evaluate('async()=>{const e=await window.__PIXEL_READY__;window.__e=e;}')
    pg.wait_for_function('!window.__APP__.loading && window.__e.game && (window.__e.game.name||"")', timeout=120000)
    if a.area: pg.wait_for_function('window.__e.game.name.startsWith("area")', timeout=120000)
    pg.wait_for_timeout(1500)
    if a.js: pg.evaluate('async()=>{const e=window.__e,app=window.__APP__,g=e.game,A=g;' + a.js + '}')
    pg.evaluate('(n)=>window.__e.step(n)', a.frames)
    data = pg.evaluate('''async()=>{const e=window.__e;const f=await e.renderer.capture();const c=document.createElement('canvas');c.width=f.width;c.height=f.height;const x=c.getContext('2d');const im=new ImageData(new Uint8ClampedArray(f.pixels),f.width,f.height);for(let i=3;i<im.data.length;i+=4)im.data[i]=255;x.putImageData(im,0,0);if(e.hud.canvas){x.imageSmoothingEnabled=false;x.drawImage(e.hud.canvas,0,0,f.width,f.height);}return c.toDataURL('image/png');}''')
    open(a.out, 'wb').write(base64.b64decode(data.split(',')[1]))
    print('errors', errs[:6]); print(pg.evaluate('window.__e.state().status'))
    b.close()
