import os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0])
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); pg=b.new_page(viewport={'width':1280,'height':720}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200])); pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    pg.keyboard.press('KeyK'); pg.evaluate("__GAME__.actions.newGame({skipIntro:true,instant:true,seed:'s',name:'P',town:'T'})"); pg.wait_for_timeout(800)
    pg.evaluate("(()=>{const g=__GAME__,G=g.G,w=G.world;w.day1.done=true;w.clock.frozen=true;w.clock.minute=720;w.weather={kind:'sun',from:0,to:24};g.actions.setPlace('town',23,44.2,3.14);G.view.zoomTarget=2.4;[['bartleby',21.2,43.2],['yolanda',22.8,42.6],['nib',24.4,43.2],['ottoline',25.6,44.4]].forEach(([n,x,z])=>{const r=G.nav.rt[n];w.npcs[n].place='town';r.indoorLocal=false;r.x=x;r.z=z;r.path=null;r.wait=1e4;r.pause=1e4;r.moving=false;r.face=2.4;});})()"); pg.wait_for_timeout(3000); pg.screenshot(path=os.path.join(root,'tests/shots/spring.png')); print(errs); b.close()
