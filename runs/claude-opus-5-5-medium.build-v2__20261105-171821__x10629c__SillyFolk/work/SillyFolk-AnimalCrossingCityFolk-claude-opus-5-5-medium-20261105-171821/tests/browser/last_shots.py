#!/usr/bin/env python3
# Door lights, attract summer beat, credits, stargazing glide: frames to review by eye.
import os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); out=os.path.join(root,'tests','shots')
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); pg=b.new_page(viewport={'width':1280,'height':720}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    def E(s): return pg.evaluate("(()=>{const g=__GAME__,G=g.G,w=G.world;"+s+"})()")
    def shot(n,t=1200): pg.wait_for_timeout(t); pg.screenshot(path=os.path.join(out,n+'.png'))
    def drain(n=30):
        for i in range(n):
            if E("return g.UI.top?.id")!='dialogue': return
            pg.keyboard.press('KeyE'); pg.wait_for_timeout(220)
    E("g.game.idle=9.9"); pg.wait_for_function("__GAME__.G.mode==='attract'",timeout=30000)
    pg.wait_for_function("__GAME__.G.attractBeat().startsWith('Summer')",timeout=240000); shot('l_att_lanterns',3000); pg.wait_for_function("__GAME__.G.world.clock.minute>=1260",timeout=30000); shot('l_att_fireworks',3200)
    pg.keyboard.press('KeyK'); pg.wait_for_function("__GAME__.G.mode==='title'",timeout=20000)
    E("g.actions.newGame({skipIntro:true,instant:true,seed:'last',name:'Pat',town:'Puddock'})"); pg.wait_for_timeout(800); E("w.day1.done=true;w.flags.roofOn=true;G.view.setHomeModel(1);")
    E("G.jumpToYd(3);w.clock.minute=22*60;w.weather={kind:'clear',from:0,to:24};g.UI.clear();g.actions.setPlace('town',70,6.6,3.14);"); pg.wait_for_timeout(600); pg.keyboard.press('KeyE'); shot('l_glide',900); pg.wait_for_function("__GAME__.ui.model().screen==='stars'",timeout=30000); shot('l_stars',800); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    E("G.jumpToYd(16);g.UI.clear();w.weather={kind:'clear',from:0,to:24};g.actions.setPlace('town',24,43,3.14);w.flags['fest'+w.clock.day]=false;G.startF('longNight');"); pg.wait_for_timeout(500); drain()
    E("const d=G.fest.doors[0];g.actions.teleport(d.x,d.z+0.3);w.p.facing=3.14;"); pg.wait_for_timeout(500); pg.keyboard.press('KeyE'); pg.wait_for_timeout(500); drain(); E("G.toasts=0;"); shot('l_door',1500)
    E("for(const d of G.fest.doors)d.done=true;G.fest.stage='pear';g.actions.teleport(24,41.5);w.p.facing=3.14;"); pg.wait_for_timeout(500); pg.keyboard.press('KeyE')
    for i in range(40):
        if E("return g.UI.top?.id")=='credits': break
        drain(5); pg.wait_for_timeout(600)
        if E("return !!w.flags.pearLit")and i%3==0: shot('l_pear',100)
    shot('l_credits',4000); print('top',E("return g.UI.top?.id")); print(errs[:3],pg.evaluate('JSON.stringify(window.__PIXEL_ENGINE__.errors)')[:300]); b.close()
