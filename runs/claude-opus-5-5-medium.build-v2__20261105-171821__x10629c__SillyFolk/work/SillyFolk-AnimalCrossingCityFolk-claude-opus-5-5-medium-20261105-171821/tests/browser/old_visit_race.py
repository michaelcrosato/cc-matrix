#!/usr/bin/env python3
# Replays the OLD test sequence: a guest left idle until attract starts, then the menu call and key presses. Shows whether it gives the old error.
import os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0])
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); g=b.new_page(viewport={'width':480,'height':270}); g.goto('file://'+html); g.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    g.evaluate('__GAME__.game.idle=9.9'); g.wait_for_function("__GAME__.G.mode==='attract'",timeout=30000); print('guest idled into', g.evaluate('__GAME__.G.mode'))
    g.evaluate('__GAME__.G.visitMenu()'); g.wait_for_timeout(500); g.keyboard.press('ArrowDown'); g.wait_for_timeout(500); print('after first key: mode', g.evaluate('__GAME__.G.mode'), 'screen', g.evaluate('__GAME__.ui.model().screen')); g.keyboard.press('Enter'); g.wait_for_timeout(800)
    print('G.visit is', g.evaluate('__GAME__.G.visit===null?"null":typeof __GAME__.G.visit'))
    try: g.evaluate("__GAME__.G.visit.session.send({t:'x'})")
    except Exception as e: print('ERROR:', str(e).split('\n')[0][:120])
    b.close()
