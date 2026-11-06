# The plan's 1080p review list. python3 tools/review.py tracks|menus|race|attract  -> tools/shots/*.png, then look at them.
import sys,os; sys.path.insert(0,'tools/tests')
from blib import *
OUT='tools/shots/'; os.makedirs(OUT,exist_ok=True)
SETUP="""(()=>{const a=window.__GAME__.app;a.__as=a.attract.start;a.attract.start=()=>{};a.newGame();a.ui.clearStack();a.ui.subtitle=null;const P=a.profile;P.credits=900000;for(const [id,paint,parts,dirt] of [['ginga','white',{aero:2,suspension:2,brakes:2},0],['ryu','blue',{},0.9],['heck','mist',{},0]]){P.cars.push({uid:P.nextUid++,id,install:{parts,settings:{},tyre:null,paint,rims:1},km:12345,oilKm:300,dirt,wins:0});P.seen[id]=true}P.current=P.cars[0].uid;P.licences={C:true,B:true,A:true};P.trophies=[{kind:'cup',name:'DAWN PATROL CUP',day:4},{kind:'helmet',name:'GOLD HELMET',day:9}];a.ui.push(a.screens.Map());a.ui.subtitle=null})()"""
with sync_playwright() as p:
    b=p.chromium.launch(args=FL); errs=[]
    def page(q=''):
        ctx=b.new_context(viewport={'width':1920,'height':1080}); pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)[:300])); pg.on('console',lambda m: errs.append(m.text[:200]) if m.type=='error' else None)
        pg.goto('file://'+HTML+('?'+q if q else '')); wait(pg,'window.__GAME__!==undefined',60000); return pg,ctx
    part=sys.argv[1]
    if part=='tracks':
        for tk,car,h in [('kestrel','ginga',''),('cedar','ryu',''),('harbour','libeccio','&hour=21'),('saltline','works',''),('redclay','ryuRally',''),('proving','kite','')]:
            pg,ctx=page(f'scene=race&track={tk}&car={car}&ai=5&laps=2{h}'); wait(pg,"window.__GAME__.state().scene==='race'",40000); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+f'{tk}_start.png')
            pg.evaluate("(()=>{const sc=window.__GAME__.app.scene,sim=sc.sim,me=sim.player;me.ai=true;me.skill=.9;sim.setGreen();sim.teleport(me,sim.tr.cornerS[Math.min(2,sim.tr.cornerS.length-1)]-120);sc.chase.snap();})()")
            pg.wait_for_timeout(5000); pg.screenshot(path=OUT+f'{tk}_corner.png')
            if tk=='cedar': pg.evaluate("(()=>{const sc=window.__GAME__.app.scene,h=sc.hikers[0].p.root.position,c=window.__GAME__.app.ctx.camera.camera;window.__GAME__.app.dev.freeCam=true;sc.freeCam={x:h.x+6,y:h.y+3,z:h.z+6,yaw:Math.atan2(-6,-6),pitch:-0.3}})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'hikers.png')
            ctx.close()
        pg,ctx=page('scene=race&track=redclay&car=ryuRally&ai=1&laps=2'); wait(pg,"window.__GAME__.state().scene==='race'",40000); pg.wait_for_timeout(1000)
        pg.evaluate("""(()=>{const a=window.__GAME__.app,sc=a.scene,sim=sc.sim,m=sim.player;m.ai=true;m.skill=1;sim.setGreen();sim.placeCar(m,250,0,26);m.prevS=m.loc.s;m.lap=1;sc.chase.mode=1;sc.chase.snap();const st=sim.step.bind(sim);let was=0,after=-1;sim.step=(i)=>{st(i);if(m.airborne&&m.airT>0.7&&!window.__a){window.__a=1;window.__h=m.y-sim.tr.y[m.loc.i];sc.frozen=true}if(window.__u&&was>0.3&&!m.airborne&&after<0)after=0;if(after>=0&&++after===4&&!window.__l){window.__l=1;sc.frozen=true}if(m.airborne)was=m.airT}})()""")
        wait(pg,"window.__a===1",60000); pg.wait_for_timeout(600); pg.screenshot(path=OUT+'crest_air.png'); print('height',pg.evaluate("window.__h"))
        pg.evaluate("window.__u=1;window.__GAME__.app.scene.frozen=false;0"); wait(pg,"window.__l===1",40000); pg.wait_for_timeout(350); pg.screenshot(path=OUT+'crest_land.png'); print('thumps',pg.evaluate("window.__GAME__.app.ctx.audio.counts.landThump")); ctx.close()
    if part=='menus':
        pg,ctx=page(); screen_is(pg,'title'); pg.wait_for_timeout(1000); pg.screenshot(path=OUT+'title.png'); pg.evaluate(SETUP); screen_is(pg,'map')
        def shot(n,ms=1300): pg.wait_for_timeout(ms); pg.screenshot(path=OUT+n+'.png')
        shot('map_dusk',1500)
        pg.evaluate("(()=>{const a=window.__GAME__.app;a.profile.licences={};a.ui.pop();a.ui.push(a.screens.Map())})()"); shot('map_day',1500)
        pg.evaluate("(()=>{const a=window.__GAME__.app;a.profile.licences={C:true,B:true,A:true};a.profile.events.h200={won:true,round:0,points:{}};a.ui.pop();a.ui.push(a.screens.Map())})()"); shot('map_night',1500)
        def S(n,e):
            pg.evaluate("(()=>{const a=window.__GAME__.app;a.ui.subtitle=null;a.ui.push(%s)})()"%e); shot(n); pg.evaluate("(()=>{const a=window.__GAME__.app;a.ui.subtitle=null;a.ui.pop()})()"); pg.wait_for_timeout(150)
        for n,e in [('licence','a.screens.LicenceCentre()'),('testcard',"a.screens.TestCard('B-1')"),('eventhall','a.screens.EventHall()'),('eventcard',"a.screens.EventCard('dawn')"),('tuning','a.screens.Tuning()'),('service','a.screens.Service()'),('garage','a.screens.Garage()'),('museum','a.screens.Museum()'),('theatre','a.screens.Theatre()'),('arcade','a.screens.Arcade()'),('settings','a.screens.Settings()'),('handbook','a.screens.Handbook()'),('about','a.screens.About()')]: S(n,e)
        pg.evaluate("(()=>{const a=window.__GAME__.app;a.ui.subtitle=null;a.ui.push(a.screens.Tuning())})()"); pg.wait_for_timeout(600); pg.keyboard.press('KeyE'); shot('setup'); pg.evaluate("window.__GAME__.app.ui.pop()")
        pg.evaluate("(()=>{const a=window.__GAME__.app;a.ui.subtitle=null;a.scene.setSet('showroom',{});a.ui.clearStack();a.scene.spinRate=0})()")
        for id in ['pico','kite','ginga','moth','ryu','longhorn','brandt32','heck','libeccio','kiteCup','ryuRally','works','corsa','type9']:
            pg.evaluate(f"(()=>{{const s=window.__GAME__.app.scene;s.showCarAt('{id}');s.turn=2.5}})()"); pg.wait_for_timeout(900); pg.screenshot(path=OUT+f'car_{id}.png')
        ctx.close()
    if part=='race':
        pg,ctx=page('scene=race&track=kestrel&car=ginga&ai=5&laps=1'); wait(pg,"window.__GAME__.state().scene==='race'",40000); pg.wait_for_timeout(600)
        pg.evaluate("(()=>{const m=window.__GAME__.app.scene.sim.player;m.ai=true;m.skill=.95})()"); pg.wait_for_timeout(11000); pg.screenshot(path=OUT+'hud.png')
        pg.evaluate("window.__GAME__.app.scene.sim.finishNow(2)"); screen_is(pg,'results',30000); pg.wait_for_timeout(2600); pg.screenshot(path=OUT+'results.png')
        pg.evaluate("window.__GAME__.app.watchResult();0"); wait(pg,"window.__GAME__.state().scene==='replay'",40000); wait(pg,"window.__GAME__.app.ui.subtitle!=null",30000); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'replay.png'); ctx.close()
        pg,ctx=page(); screen_is(pg,'title'); pg.evaluate(SETUP); screen_is(pg,'map'); pg.evaluate("window.__GAME__.app.ui.push(window.__GAME__.app.screens.Arcade());0"); pg.wait_for_timeout(500)
        def key(c,ms=350): pg.keyboard.press(c); pg.wait_for_timeout(ms)
        for k in range(6):
            if st(pg)['focus']=='couch': break
            key('ArrowRight')
        key('Enter'); screen_is(pg,'picktrack'); key('Enter'); screen_is(pg,'pickcar'); key('Enter'); key('Enter'); screen_is(pg,'pickoptions')
        for k in range(8):
            if st(pg)['focus']=='go': break
            key('ArrowDown')
        key('Enter'); wait(pg,"window.__GAME__.state().engine2===true",60000); pg.wait_for_timeout(2000); pg.keyboard.down('KeyW'); pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(9000); pg.screenshot(path=OUT+'couch.png'); ctx.close()
    if part=='attract':
        pg,ctx=page(); screen_is(pg,'title'); pg.evaluate(SETUP); screen_is(pg,'map')
        pg.evaluate("(()=>{const a=window.__GAME__.app;a.ui.subtitle=null;a.attract.start=a.__as;Object.defineProperty(a.actions,'touched',{get(){return false}});a.attract.start();0})()")
        for i,ms in [(0,1500),(1,3000),(2,6500),(3,6000),(4,12000),(5,5000),(6,0),(7,3500),(8,4000),(9,1500)]:
            wait(pg,f"window.__GAME__.state().clip==={i}&&!window.__GAME__.app.attract.loading",90000)
            if i==6: wait(pg,"window.__GAME__.app.scene.sim?.cars[1].pit?.state==='stop'",60000); pg.wait_for_timeout(1200)
            else: pg.wait_for_timeout(ms)
            pg.screenshot(path=OUT+f'att{i}.png')
        pg.evaluate("(()=>{const a=window.__GAME__.app;a.attract.active=false;a.ui.clearStack();a.ui.push(a.screens.Map());a.seriesEnd({eventName:'THE HALCYON GRAND PRIX',prizeCar:'type9',ending:true})})()"); screen_is(pg,'podium'); pg.wait_for_timeout(3500); pg.screenshot(path=OUT+'podium.png'); pg.keyboard.press('Enter'); screen_is(pg,'reveal'); pg.wait_for_timeout(5200); pg.screenshot(path=OUT+'prize.png'); pg.keyboard.press('Enter'); screen_is(pg,'ending'); pg.wait_for_timeout(3000); pg.screenshot(path=OUT+'ending.png'); ctx.close()
    print(part,'errors',errs[:6]); b.close()
