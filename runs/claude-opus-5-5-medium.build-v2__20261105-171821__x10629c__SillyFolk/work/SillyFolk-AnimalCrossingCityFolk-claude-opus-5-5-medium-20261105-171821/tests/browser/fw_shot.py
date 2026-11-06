import os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0])
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); pg=b.new_page(viewport={'width':960,'height':540}); pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    pg.keyboard.press('KeyK')
    pg.evaluate("(()=>{const g=__GAME__,G=g.G;g.actions.newGame({skipIntro:true,instant:true,seed:'fw',name:'P',town:'T'});})()"); pg.wait_for_timeout(800)
    pg.evaluate("(()=>{const g=__GAME__,G=g.G,w=G.world;w.day1.done=true;G.jumpToYd(8);g.UI.clear();w.weather={kind:'clear',from:0,to:24};w.clock.minute=1261;w.clock.frozen=true;w.p.patterns[0]=Array.from({length:16},(_,y)=>Array.from({length:16},(_,x)=>Math.hypot(x-7.5,y-7.5)<6?2:0));g.actions.setPlace('town',33,50,0);G.ctx.input.send({t:'noop'});G.view.setFocus=[33,50,1];G.view.zoomTarget=1.2;G.fwShow();})()")
    n=0
    for i in range(400):
        st=pg.evaluate("(()=>{const f=__GAME__.G.view.fireworks;const v=f.filter(x=>x.burst&&x.t<0.9&&x.t>0.2);return [v.length,v.some(x=>x.rows),__GAME__.G.view.fireworks.length]})()")
        if st[0]>0:
            pg.screenshot(path=os.path.join(root,'tests','shots',f'fw{n}.png')); print(st); n+=1; pg.wait_for_timeout(1300)
            if n==3: break
        pg.wait_for_timeout(40)
    b.close()
