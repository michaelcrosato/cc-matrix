#!/usr/bin/env python3
# Dev helper: open the built page on file://, run JS steps, screenshot. python3 tools/shot.py out.png "js..." [wait_s]
import sys, os, glob, time, json
from playwright.sync_api import sync_playwright
ARGS = ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = os.path.join(root, '..', os.path.basename(root) + '.html')
steps = sys.argv[1:]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    ctx = b.new_context(viewport={'width':int(os.environ.get('W','960')),'height':int(os.environ.get('H','540'))})
    page = ctx.new_page()
    logs=[]
    page.on('console', lambda m: logs.append(f'{m.type}: {m.text[:300]}') if m.type in ('error','warning') else None)
    page.on('pageerror', lambda e: logs.append('PAGEERROR: '+str(e)[:600]))
    t0=time.time()
    page.goto('file://'+os.path.abspath(html))
    page.wait_for_function('window.__GAME__ !== undefined', timeout=60000)
    print('ready in', round(time.time()-t0,1), 's')
    i=0
    while i < len(steps):
        s=steps[i]
        if s.endswith('.png'):
            page.wait_for_timeout(600)
            page.screenshot(path=os.path.join(root,'shots',s))
            print('shot',s)
        elif s.startswith('wait:'):
            page.wait_for_timeout(int(float(s[5:])*1000))
        else:
            r=page.evaluate(s)
            if r is not None: print(json.dumps(r)[:1500])
        i+=1
    print('state', page.evaluate('(()=>{const e=window.__PIXEL_ENGINE__;return {fps:e.fps,errors:e.errors.slice(0,5),gpu:e.renderer.gpuErrors?.slice(0,3),rec:e.renderer.recoveries,status:e.game.status()}})()'))
    for l in logs[:25]: print(l)
    b.close()
