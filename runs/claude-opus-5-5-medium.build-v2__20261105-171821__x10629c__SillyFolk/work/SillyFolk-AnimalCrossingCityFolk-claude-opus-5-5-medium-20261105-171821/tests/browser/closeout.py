#!/usr/bin/env python3
# Attract fireworks at a burst, and a credits frame, on the delivered build.
import os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); out=os.path.join(root,'tests','shots')
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); pg=b.new_page(viewport={'width':1280,'height':720}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    pg.evaluate("__GAME__.game.idle=9.9"); pg.wait_for_function("__GAME__.G.mode==='attract'",timeout=30000)
    pg.wait_for_function("__GAME__.G.attractBeat().startsWith('Summer') && __GAME__.G.view.fireworks.some(f=>f.burst&&f.t>0.2&&f.t<1)",timeout=280000,polling=50); pg.screenshot(path=os.path.join(out,'c_att_fw.png')); print('attract burst captured',pg.evaluate("__GAME__.G.attractBeat()"))
    pg.keyboard.press('KeyK'); pg.wait_for_function("__GAME__.G.mode==='title'",timeout=20000)
    pg.evaluate("__GAME__.actions.newGame({skipIntro:true,instant:true,seed:'c',name:'Pat',town:'Puddock'})"); pg.wait_for_timeout(800)
    pg.evaluate("(()=>{const G=__GAME__.G;G.world.day1.done=true;G.openCredits();})()"); pg.wait_for_timeout(9000); pg.screenshot(path=os.path.join(out,'c_credits.png')); print('credits lines',pg.evaluate("__GAME__.UI.top.itemsModel().length"))
    print(errs[:3],pg.evaluate('JSON.stringify(window.__PIXEL_ENGINE__.errors)')[:200]); b.close()
