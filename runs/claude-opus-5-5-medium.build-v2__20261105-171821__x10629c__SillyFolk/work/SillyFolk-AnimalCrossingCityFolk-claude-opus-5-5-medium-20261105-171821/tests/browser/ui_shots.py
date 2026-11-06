#!/usr/bin/env python3
# Screens reached by real keys: opening, map, almanac, chime, pattern, emote wheel, about, dev balance, attract, festival.
import sys, os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); out=os.path.join(root,'tests','shots')
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); pg=b.new_page(viewport={'width':1920,'height':1080}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    def shot(n): pg.wait_for_timeout(900); pg.screenshot(path=os.path.join(out,n+'.png'))
    def E(s): return pg.evaluate("(()=>{const g=__GAME__,G=g.G,w=G.world;"+s+"})()")
    pg.wait_for_timeout(1000); pg.keyboard.press('Enter'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(2500); pg.keyboard.press('KeyE'); pg.wait_for_timeout(600); shot('u_opening')
    E("g.Script.clear();g.UI.clear();G.opening=null;");
    E("g.actions.newGame({skipIntro:true,instant:true,seed:'ui',name:'Pat',town:'Puddock'})"); pg.wait_for_timeout(1200); E("w.day1;G.world.day1.done=true;G.world.p.emotes=['laugh','cry','dance'];G.world.clock.frozen=true;")
    pg.keyboard.press('KeyJ'); shot('u_almanac'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.keyboard.press('KeyM'); shot('u_map'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.keyboard.press('KeyG'); shot('u_emotes'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    E("const S=G.chimeS;g.UI.push(S());"); shot('u_chime'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    E("g.UI.push(G.patS());"); shot('u_pattern'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    E("g.UI.clear();G.jumpToYd(4);g.actions.setPlace('town',24,43,3.14);G.world.flags['fest'+G.world.clock.day]=false;G.startF('seedToss');"); pg.wait_for_timeout(600); pg.keyboard.press('KeyE'); pg.wait_for_timeout(300); pg.keyboard.press('KeyE'); pg.wait_for_timeout(400); pg.keyboard.press('KeyE'); pg.wait_for_timeout(1800); pg.keyboard.press('Space'); shot('u_seed'); E("g.Script.clear();g.UI.clear();G.fest=null;")
    E("G.jumpToYd(16);g.actions.setPlace('town',24,43,3.14);G.world.clock.minute=23*60+20;G.world.weather={kind:'snow',from:0,to:24};"); shot('u_longnight')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500); shot('u_pause'); E("g.UI.push(G.aboutS());"); shot('u_about'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300); E("g.UI.clear()")
    E("G.saveAndQuit()"); pg.wait_for_timeout(800); E("g.game.idle=9.5"); pg.wait_for_timeout(5000); shot('u_attract'); print(E("return G.mode"))
    print(errs[:5]); print(pg.evaluate('JSON.stringify(window.__PIXEL_ENGINE__.errors)')[:800]); b.close()
