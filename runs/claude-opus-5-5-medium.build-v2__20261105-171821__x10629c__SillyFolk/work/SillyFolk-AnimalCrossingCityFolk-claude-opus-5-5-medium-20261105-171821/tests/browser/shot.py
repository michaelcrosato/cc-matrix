#!/usr/bin/env python3
# Dev helper: open the built page, run JS steps, screenshot. usage: shot.py out.png "js expression" [more js...]; a number N means wait N ms.
import sys, glob, os, json, time
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
page_path=glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS)
    pg=b.new_page(viewport={'width':1920,'height':1080})
    errs=[]
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)[:400]))
    pg.on('console',lambda m:errs.append('CONSOLE '+m.text[:300]) if m.type=='error' else None)
    pg.goto('file://'+os.path.abspath(page_path))
    pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=60000)
    pg.evaluate('window.__PIXEL_READY__.then(()=>1)')
    out=sys.argv[1]
    n=0
    for a in sys.argv[2:]:
        if a.isdigit(): pg.wait_for_timeout(int(a))
        elif a.startswith('shot:'):
            pg.screenshot(path=a[5:])
        else:
            r=pg.evaluate(a)
            if r is not None: print('=>',json.dumps(r)[:600])
    pg.wait_for_timeout(600)
    pg.screenshot(path=out)
    print(pg.evaluate('window.__GAME__.status()'))
    print(pg.evaluate('JSON.stringify(window.__PIXEL_ENGINE__.errors)')[:800])
    print('\n'.join(errs[:12]))
    b.close()
