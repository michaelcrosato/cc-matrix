#!/usr/bin/env python3
# Screenshots for what a script can't check. usage: tour.py [names]
import sys, os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); out=os.path.join(root,'tests','shots')
SET="""const g=__GAME__,G=g.G,w=G.world;"""
SC={
 'town_day':"G.jumpToYd(2);w.clock.minute=600;g.actions.setPlace('town',24,31,0);",
 'home':"const r=g.actions.ensureRoom('home');g.actions.setPlace('home',r.ox+3,3.5,0);",
 'store':"G.jumpToYd(2);const r=g.actions.ensureRoom('store');g.actions.setPlace('store',r.ox+3,4,0);",
 'pockets':"g.actions.setPlace('town',60,30,0);for(const i of ['carp','pear','c_chair','s_red','cabbagefly','fossil_unk','h_top','bag']){G.world.p.pockets[G.world.p.pockets.indexOf(null)]={id:i};}window.dispatchEvent(new KeyboardEvent('keydown',{code:'Tab',key:'Tab'}));",
 'summer':"G.jumpToYd(5);w.clock.minute=720;g.actions.setPlace('town',50,26,0);",
 'autumn':"G.jumpToYd(9);w.clock.minute=720;g.actions.setPlace('town',24,31,0);",
 'winter':"G.jumpToYd(13);w.clock.minute=720;w.weather={kind:'snow',from:0,to:24};g.actions.setPlace('town',24,31,0);",
 'night':"G.jumpToYd(14);w.clock.minute=1380;w.weather={kind:'clear',from:0,to:24};g.actions.setPlace('town',58,41,0);",
 'city_night':"G.jumpToYd(14);w.clock.minute=1320;g.actions.setPlace('city',515,12,3.14);",
 'home_full':"G.world.p.tier=2;const it=[{id:'mirror',x:5,z:1,rot:0},{id:'tv',x:3,z:1,rot:0},{id:'c_lamp',x:1,z:4,rot:0},{id:'c_sofa',x:2,z:3,rot:0}];const r=g.actions.ensureRoom('home');for(const f of it){G.world.home.rooms.home.furn.push(f);G.placeF(r,f)};g.actions.setPlace('home',r.ox+3,4.5,0);G.tvS('home');",
 'chime':"const r=g.actions.ensureRoom('hall');g.actions.setPlace('hall',r.ox+3,3.5,0);G.talk('clementine');",
 'map':"g.actions.setPlace('town',24,30,0);window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyM',key:'m'}));",
 'seed':"G.jumpToYd(4);g.actions.setPlace('town',24,43,3.14);G.world.flags['fest'+G.world.clock.day]=false;G.startF('seedToss');",
 'city_day':"w.clock.minute=720;g.actions.setPlace('city',520,12,3.14);",
 'beach':"w.clock.minute=720;G.jumpToYd(5);g.actions.setPlace('town',42,52,0);",
 'waterfall':"w.clock.minute=720;G.jumpToYd(5);g.actions.setPlace('town',40,12,0);",
}
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); pg=b.new_page(viewport={'width':1920,'height':1080}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    pg.evaluate("__GAME__.actions.newGame({skipIntro:true,instant:true,seed:'tour',name:'Pat',town:'Puddock'})"); pg.wait_for_timeout(1500)
    pg.evaluate("__GAME__.G.world.day1.done=true;__GAME__.G.world.p.tools=['net','rod','shovel','axe','can','sling'];__GAME__.G.world.p.tool='net';__GAME__.G.player.refreshTool();__GAME__.G.world.clock.frozen=true;")
    pg.evaluate("")
    names=sys.argv[1:] or list(SC)
    for n in names:
        pg.evaluate("(()=>{"+SET+SC[n]+"})()"); pg.wait_for_timeout(2500); pg.screenshot(path=os.path.join(out,n+'.png')); pg.evaluate("__GAME__.UI.clear()")
    print(errs[:5]); print(pg.evaluate('JSON.stringify(window.__PIXEL_ENGINE__.errors)')[:600]); b.close()
