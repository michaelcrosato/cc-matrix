#!/usr/bin/env python3
# Screens for what a script can't judge: mirror, fossil hall, rain life, tail, bus arrival, shack, and one frame per attract beat.
import sys, os, glob
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); out=os.path.join(root,'tests','shots')
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); pg=b.new_page(viewport={'width':1440,'height':810}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000)
    def E(s): return pg.evaluate("(()=>{const g=__GAME__,G=g.G,w=G.world;"+s+"})()")
    def shot(n,t=1800): pg.wait_for_timeout(t); pg.screenshot(path=os.path.join(out,n+'.png'))
    mode=sys.argv[1] if len(sys.argv)>1 else 'all'
    if mode in('all','scenes'):
        E("g.actions.newGame({skipIntro:true,instant:true,seed:'ver',name:'Pat',town:'Puddock'})"); pg.wait_for_timeout(1000)
        shot('v_shack',200) if False else None
        E("g.actions.setPlace('town',74.5,38.6,3.14);w;"); shot('v_shack')
        E("G.world.day1.done=true;G.world.flags.roofOn=true;G.view.setHomeModel(2);G.world.p.tier=2;const it=[{id:'mirror',x:3,z:1,rot:0}];const r=g.actions.ensureRoom('home');for(const f of it){G.world.home.rooms.home.furn.push(f);G.placeF(r,f)};g.actions.setPlace('home',r.ox+3,2.6,3.14);G.tvS('home');G.view.zoomTarget=2.4;"); shot('v_mirror'); print('mirror renders',E("const r=G.rooms.home;const m=[...r.furn.values()].find(x=>x.mirror);return [m.mirror.enabled,m.mirror.renders]"))
        E("G.view.zoomTarget=1.6;for(const k of ['moat_tail','moat_torso','moat_skull','regret_torso','regret_neck','regret_skull','trilobite','ammonite','amberfly','tooth'])G.world.museum.fossil[k]='Pat';const r=g.actions.ensureRoom('m_fossil');g.actions.setPlace('m_fossil',r.ox+5,4.9,3.14);"); shot('v_fossil')
        E("G.world.clock.frozen=true;G.jumpToYd(6);G.world.clock.minute=720;G.world.weather={kind:'rain',from:0,to:24};g.actions.setPlace('town',30,30,0);const N=g.G.npcSpots;for(const [i,n] of ['nib','tavi','dorrit'].entries()){const rt=G.nav.rt[n];G.world.npcs[n].place='town';rt.indoorLocal=false;rt.x=30+i*1.6-1;rt.z=28.6;rt.path=null;rt.wait=1e4;rt.moving=false;rt.pause=1e4}"); shot('v_rain',9000); print('puddles',E("return G.world.stats.puddles"))
        E("G.world.weather={kind:'sun',from:0,to:24};const rt=G.nav.rt.bartleby;G.world.npcs.bartleby.place='town';rt.indoorLocal=false;rt.x=37;rt.z=30;rt.path=[[37,0,30]];rt.pause=0;rt.moving=true;G.world.clock.frozen=false;g.actions.setPlace('town',35,31.5,0);"); shot('v_fish',2500)
        E("G.world.flags.x=1;g.actions.setPlace('town',6.5,25,3.14);G.bus.call('town');"); shot('v_bus',3500); E("g.UI.clear();g.Script.clear();")
        E("G.world.clock.minute=1200;g.actions.setPlace('city',527,16.5,0);"); shot('v_musician'); print('busked',E("return G.world.stats.busked"))
        E("G.jumpToYd(14);G.world.clock.minute=720;g.actions.setPlace('town',58,41,0);G.world.weather={kind:'clear',from:0,to:24};"); shot('v_frost')
    if mode in('all','attract'):
        pg.goto('file://'+html); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000); E("g.game.idle=9.9"); pg.wait_for_timeout(1500); print(E("return G.mode"))
        seen=[]; 
        for i in range(600):
            beat=pg.evaluate("__GAME__.G.demo? (__GAME__.G.attractBeat?.()||'') : ''")
            if beat and beat not in seen:
                pg.wait_for_timeout(2300); pg.screenshot(path=os.path.join(out,f'att{len(seen):02d}.png')); seen.append(beat); print(len(seen),beat)
                if len(seen)>=17: break
            pg.wait_for_timeout(600)
    print(errs[:5]); print(pg.evaluate('JSON.stringify(window.__PIXEL_ENGINE__.errors)')[:600]); b.close()
