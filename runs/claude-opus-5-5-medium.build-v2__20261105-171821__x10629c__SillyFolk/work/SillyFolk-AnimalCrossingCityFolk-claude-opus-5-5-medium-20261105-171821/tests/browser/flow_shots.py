#!/usr/bin/env python3
# Seasons and festivals in real flow, by keys, for review by eye. Keeps one frame each in tests/shots.
import sys, os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); out=os.path.join(root,'tests','shots'); os.makedirs(out,exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); pg=b.new_page(viewport={'width':1280,'height':720}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    def E(s): return pg.evaluate("(()=>{const g=__GAME__,G=g.G,w=G.world;"+s+"})()")
    def shot(n,t=1500): pg.wait_for_timeout(t); pg.screenshot(path=os.path.join(out,n+'.png'))
    def drain(n=40):
        for i in range(n):
            if E("return g.UI.top?.id")!='dialogue': return
            pg.keyboard.press('KeyE'); pg.wait_for_timeout(250)
    pg.keyboard.press('KeyK'); E("g.actions.newGame({skipIntro:true,instant:true,seed:'flow',name:'Pat',town:'Puddock'})"); pg.wait_for_timeout(800)
    E("w.day1.done=true;w.flags.roofOn=true;G.view.setHomeModel(1);w.p.beans=99999;w.p.tools=['net','rod','shovel','axe','can','sling'];w.p.tool='can';G.player.refreshTool();G.toastsOff=1;")
    def season(yd,n): E(f"G.jumpToYd({yd});w.clock.minute=660;w.weather={{kind:'sun',from:0,to:24}};g.actions.setPlace('town',24,31,0);g.UI.clear();"); shot(n)
    season(6,'f_summer'); season(10,'f_autumn')
    E("G.jumpToYd(4);g.UI.clear();w.clock.minute=660;w.weather={kind:'sun',from:0,to:24};g.actions.setPlace('town',24,43,3.14);w.flags['fest'+w.clock.day]=false;G.startF('seedToss');"); pg.wait_for_timeout(500); drain(); pg.wait_for_timeout(900)
    for i in range(10):
        E("const f=G.fest;const r=f.rings[Math.floor(Math.random()*f.rings.length)];G.player.actor.play('Cast',{then:'Idle',restart:true});G.festT(r.x,r.z);"); pg.wait_for_timeout(450)
    shot('f_seed',300); E("G.fest.t=0.01"); pg.wait_for_timeout(700); shot('f_mayor',600); drain(30); pg.wait_for_timeout(800)
    E("G.jumpToYd(8);g.UI.clear();w.p.patterns[0]=Array.from({length:16},(_,y)=>Array.from({length:16},(_,x)=>Math.hypot(x-7.5,y-7.5)<6?2:0));w.clock.minute=1090;w.weather={kind:'sun',from:0,to:24};g.actions.setPlace('town',37.4,22.6,1.57);w.flags['fest'+w.clock.day]=false;G.startF('lantern');"); pg.wait_for_timeout(600); drain(); pg.wait_for_timeout(300); pg.keyboard.press('KeyE'); pg.wait_for_timeout(500); pg.keyboard.type('A roof'); pg.keyboard.press('Enter'); shot('f_lantern',7000); drain(8); pg.wait_for_timeout(600); E("w.clock.minute=1261"); shot('f_fireworks',3200); shot('f_fireworks2',1500); 
    for i in range(40):
        if E("return !G.fest"): break
        drain(6); pg.wait_for_timeout(700)
    print('lantern finished',E("return [!G.fest,w.stats.lanternDone,G.view.setFocus]"))
    E("for(const i of ['mushroom','perch','pear'])w.p.pockets[w.p.pockets.indexOf(null)]={id:i};G.jumpToYd(12);g.UI.clear();w.clock.minute=720;w.weather={kind:'sun',from:0,to:24};g.actions.setPlace('town',24,44.4,3.14);w.flags['fest'+w.clock.day]=false;G.startF('soup');"); pg.wait_for_timeout(500); drain(); shot('f_soupP',600)
    for it in ['mushroom','perch','pear']:
        E(f"g.UI.top.focus=w.p.pockets.findIndex(p=>p&&p.id==='{it}')"); pg.keyboard.press('KeyE'); pg.wait_for_timeout(1000)
    shot('f_soup',1200)
    for i in range(40):
        if E("return !G.fest"): break
        drain(6); pg.wait_for_timeout(600)
    print('soup finished',E("return [!G.fest,JSON.stringify(w.stats.soup)]"))
    E("G.jumpToYd(16);g.UI.clear();w.weather={kind:'snow',from:0,to:24};g.actions.setPlace('town',24,43,3.14);w.flags['fest'+w.clock.day]=false;G.startF('longNight');"); pg.wait_for_timeout(500); drain(); shot('f_doors',500)
    E("for(const d of G.fest.doors){const t=G.lastTargets;}")
    E("const d=G.fest.doors[0];g.actions.teleport(d.x,d.z+0.3);w.p.facing=3.14;"); pg.wait_for_timeout(500); pg.keyboard.press('KeyE'); pg.wait_for_timeout(400); drain(); shot('f_door1',500)
    E("for(const d of G.fest.doors.slice(1))d.done=true;G.fest.stage='pear';g.actions.teleport(24,41.5);w.p.facing=3.14;for(let i=0;i<40;i++){w.ents['x'+i]=w.ents['x'+i]||{id:'x'+i,t:'flower',sp:'tulip',c:'red',x:3.5+i,z:30.5,dry:0,wet:1};}w.dirty=true;"); pg.wait_for_timeout(500); pg.keyboard.press('KeyE'); pg.wait_for_timeout(500); drain(12); shot('f_pear',1000)
    for i in range(30):
        top=E("return g.UI.top?.id")
        if top=='credits': break
        drain(6); pg.wait_for_timeout(700)
    shot('f_credits',800); print('finale reached',E("return g.UI.top?.id"))
    print('errors',errs[:4],pg.evaluate('JSON.stringify(window.__PIXEL_ENGINE__.errors)')[:500]); print(E("return [w.flags.pearLit,w.flags.goldBell,G.mode,w.stats.seedToss,JSON.stringify(w.stats.soup)]")); b.close()
