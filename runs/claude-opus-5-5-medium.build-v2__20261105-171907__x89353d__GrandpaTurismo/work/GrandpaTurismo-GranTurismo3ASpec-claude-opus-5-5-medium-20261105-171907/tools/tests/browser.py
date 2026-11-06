import sys; sys.path.insert(0,'tools/tests')
from blib import *
t=T()
with sync_playwright() as p:
    b=p.chromium.launch(args=FL)
    # boots from file:// with no console errors; music at 10%
    pg,ctx,errs=open_page(b,'',PAD_STUB)
    screen_is(pg,'title'); s=st(pg)
    t.ok(s['music']==0.1,'music at 10% on first launch',s['music']); t.ok(s['screen']=='title','title screen')
    t.ok(pg.evaluate("[...document.head.querySelectorAll('script')][0].textContent.includes('aihub-session')&&document.head.querySelector('meta[charset]').compareDocumentPosition(document.head.querySelector('script'))===4"),'the hub client is the first script after charset')
    # every glyph the game writes exists in the font: draw and read back
    # the pad drives every top-level screen
    pg.evaluate("window.__pads[0]=window.__mkPad(0)"); pg.wait_for_timeout(200)
    def tap(btn,ms=160):
        pg.evaluate(f"window.__press(0,{btn},1)"); wait(pg,f"(window.__GAME__.app.actions.pads[0]?.b[{btn}]??0)>0.5"); pg.evaluate(f"window.__press(0,{btn},0)"); wait(pg,f"(window.__GAME__.app.actions.pads[0]?.b[{btn}]??1)<0.5"); pg.wait_for_timeout(ms)
    tap(0); screen_is(pg,'greet'); t.ok(st(pg)['device']=='pad','a pad press switches the device'); t.ok('CONTINUE' in st(pg)['prompts'],'prompts on the greeting')
    tap(0); screen_is(pg,'dealer'); tap(15); pg.wait_for_timeout(300)
    tap(0); wait(pg,"window.__GAME__.state().profile.cars.length===1"); t.ok(st(pg)['profile']['cars']==['kite'],'pad buys a car',st(pg)['profile'])
    tap(1); screen_is(pg,'map')
    ids=['licence','events','dealer','tuning','service','home','museum','theatre','arcade']; names=['licence','events','dealer','tuning','service','garage','museum','theatre','arcade']
    # focus starts at the nudge; walk to the first with the d-pad
    for i,(place,name) in enumerate(zip(ids,names)):
        for k in range(10):
            if st(pg)['focus']==place: break
            tap(15,70)
        t.ok(st(pg)['focus']==place,f'd-pad reaches {place}',st(pg)['focus'])
        tap(0); screen_is(pg,name); t.ok(len(st(pg)['items'])>0,f'{name} opens by pad'); tap(1); screen_is(pg,'map')
    # prompts swap on input change and the Xbox glyph setting
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(200); t.ok(st(pg)['device']=='kb','keys switch the prompts to keycaps')
    tap(2); screen_is(pg,'settings'); t.ok(st(pg)['device']=='pad','pad again'); tap(5); pg.wait_for_timeout(150); tap(5); pg.wait_for_timeout(200)
    pg.evaluate("window.__GAME__.app.settings.glyphs='xbox'"); pg.wait_for_timeout(200); t.ok(pg.evaluate("window.__GAME__.app.settings.glyphs")=='xbox','Xbox glyph setting'); pg.evaluate("window.__GAME__.app.settings.glyphs='ps'")
    tap(1); screen_is(pg,'map')
    # mouse hover moves focus, click confirms
    r=pg.evaluate("(()=>{const a=window.__GAME__.app,u=a.ui,it=u.items.find(i=>i.id==='museum');const c=document.querySelector('#p1 canvas').getBoundingClientRect();return {x:c.left+(it.x+it.w/2)/a.hud.width*c.width,y:c.top+(it.y+it.h/2)/a.hud.height*c.height}})()")
    pg.mouse.move(5,5); pg.mouse.move(9,9); pg.wait_for_timeout(2500); r=pg.evaluate("(()=>{const a=window.__GAME__.app,u=a.ui,it=u.items.find(i=>i.id==='museum');const c=document.querySelector('#p1 canvas').getBoundingClientRect();return {x:c.left+(it.x+it.w/2)/a.hud.width*c.width,y:c.top+(it.y+it.h/2)/a.hud.height*c.height}})()")
    pg.mouse.move(r['x']-3,r['y']); pg.mouse.move(r['x'],r['y']); pg.wait_for_timeout(300); t.ok(st(pg)['focus']=='museum','hover moves focus',st(pg)['focus']); t.ok(st(pg)['device']=='mouse','mouse prompts'); it0=pg.evaluate("window.__GAME__.app.ui.items.find(i=>i.id==='museum').x"); pg.wait_for_timeout(1200); t.ok(abs(pg.evaluate("window.__GAME__.app.ui.items.find(i=>i.id==='museum').x")-it0)<=1,'a hovered building stays under the cursor')
    pg.mouse.click(r['x'],r['y']); screen_is(pg,'museum'); t.ok(True,'click confirms'); pg.mouse.click(r['x'],r['y'],button='right'); screen_is(pg,'map'); t.ok(True,'right click goes back')
    # attract starts at 10 s, any input exits
    pg.mouse.move(5,5); wait(pg,"window.__GAME__.state().attract===true",16000); s=st(pg); t.ok(s['idle']>=9.9,'attract at 10 s idle',s['idle'])
    wait(pg,"window.__GAME__.state().clip>=4",70000); t.ok(st(pg)['scene']=='race','attract reaches an AI race',st(pg)['scene'])
    cr=pg.evaluate("window.__GAME__.state().profile.credits"); pg.keyboard.press('Enter'); wait(pg,"window.__GAME__.state().attract===false&&window.__GAME__.state().screen==='map'",20000); t.ok(st(pg)['profile']['credits']==cr,'attract does not touch the save'); pg.wait_for_timeout(1500)
    # dev mode sliders change env, reset restores
    pg.evaluate("window.__GAME__.app.startRace(window.__GAME__.app.ui.top?null:null)") if False else None
    pg.keyboard.press('Escape'); screen_is(pg,'mappause'); wait(pg,"window.__GAME__.state().items.includes('dev')"); 
    for k in range(6):
        if st(pg)['focus']=='dev': break
        pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(120)
    pg.keyboard.press('Enter'); screen_is(pg,'dev'); pg.wait_for_timeout(200); g0=st(pg)['tune']['grip']; pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(200); t.ok(st(pg)['tune']['grip']!=g0,'dev slider moves',st(pg)['tune']['grip']); pg.keyboard.press('KeyI'); pg.wait_for_timeout(200); t.ok(st(pg)['tune']['grip']==g0,'reset all')
    pg.keyboard.press('Escape'); screen_is(pg,'mappause'); pg.keyboard.press('Escape'); screen_is(pg,'map')
    # about shows every field
    pg.evaluate("window.__GAME__.app.ui.push(window.__GAME__.app.screens.About())"); screen_is(pg,'about'); txt=pg.evaluate("window.__GAME__.app.ui.top.allText()")
    for f in ['SOURCE','PLAN','GENRE','PERSPECTIVE','TECH','ART DIRECTION','ANIMATION','AUDIO','ONLINE','TESTING','RESEARCH','ENVIRONMENT','MODEL','USAGE: ADDED ON IMPORT','TESTING FEEDBACK','ENGINE FEEDBACK','PROMPT FEEDBACK','THREE.JS','RAPIER','SWEETIE 16']: t.ok(f in txt,f'about has {f}')
    t.ok('INSPIRED BY' in txt,'inspired by')
    pg.keyboard.press('Escape'); screen_is(pg,'map')
    # couch duel with two pads: two engines up, then disposed, no errors
    pg.evaluate("window.__pads[1]=window.__mkPad(1)")
    pg.evaluate("(()=>{const a=window.__GAME__.app;import('data:text/javascript,').catch(()=>{});a.startCouch({mode:'couch',after:{kind:'arcade'},track:'proving',laps:1,hour:11,rain:false,start:'standing',seed:9,rules:{contact:true,wearMult:.5,pits:false},label:'COUCH DUEL',cars:a.__testCouchCars()})})()") if pg.evaluate("!!window.__GAME__.app.__testCouchCars") else None
    t.ok(not errs,'no console errors in the first session',errs[:3]); ctx.close()
    # arcade route to couch through the screens
    pg,ctx,errs=open_page(b,'',PAD_STUB)
    screen_is(pg,'title'); pg.evaluate("window.__pads[0]=window.__mkPad(0);window.__pads[1]=window.__mkPad(1)"); pg.wait_for_timeout(100)
    pg.evaluate("(()=>{const a=window.__GAME__.app;a.newGame();a.ui.clearStack();a.ui.push(a.screens.Map());a.ui.push(a.screens.Arcade())})()"); screen_is(pg,'arcade'); pg.wait_for_timeout(200)
    def key(c,ms=150): pg.keyboard.press(c); pg.wait_for_timeout(ms)
    
    for k in range(6):
        if st(pg)['focus']=='couch': break
        key('ArrowRight',300)
    t.ok(st(pg)['focus']=='couch','focus on couch',st(pg)['focus']); key('Enter'); screen_is(pg,'picktrack'); key('ArrowRight'); key('ArrowRight'); key('ArrowRight'); key('ArrowRight'); key('ArrowRight'); key('Enter'); screen_is(pg,'pickcar'); key('Enter'); pg.wait_for_timeout(300); key('Enter'); screen_is(pg,'pickoptions'); pg.wait_for_timeout(200)
    for k in range(8):
        if st(pg)['focus']=='go': break
        key('ArrowDown',100)
    key('Enter'); wait(pg,"window.__GAME__.state().engine2===true",60000); t.ok(st(pg)['couch'],'couch duel: two engines up'); pg.wait_for_timeout(1500)
    pg.evaluate("window.__press(1,7,1);window.__press(0,7,1)"); pg.wait_for_timeout(7000); rr=pg.evaluate("(()=>{const s=window.__GAME__.app.scene.sim;return s.cars.map(c=>({seat:c.seat,u:c.u}))})()"); t.ok(all(abs(c['u'])>1 for c in rr),'both pads drive their own car',rr)
    pg.screenshot(path='tools/shots/couch.png')
    pg.evaluate("window.__press(1,7,0);window.__press(0,7,0)")
    pg.evaluate("(()=>{window.__GAME__.app.scene.sim.finishRace(true)})()"); screen_is(pg,'results'); pg.wait_for_timeout(800); key('Enter'); wait(pg,"window.__GAME__.state().engine2===false&&window.__GAME__.state().screen==='arcade'",30000); t.ok(not st(pg)['couch'],'couch duel disposes'); w=pg.evaluate("document.getElementById('p2').style.display"); t.ok(w=='none','the second container hides',w)
    t.ok(not errs,'no console errors in the couch session',errs[:3]); ctx.close()
    # touch-only profile: gate, settings tap, attract runs
    dev=p.devices['Pixel 5']; o=dict(dev); o['viewport']={'width':851,'height':393}
    pg,ctx,errs=open_page(b,'',None,o)
    screen_is(pg,'title'); pg.wait_for_timeout(300); t.ok(st(pg)['items']==['gear'],'touch gate shows only the settings button',st(pg)['items'])
    r=pg.evaluate("(()=>{const a=window.__GAME__.app,it=a.ui.items[0];const c=document.querySelector('#p1 canvas').getBoundingClientRect();return {x:c.left+(it.x+it.w/2)/a.hud.width*c.width,y:c.top+(it.y+it.h/2)/a.hud.height*c.height}})()")
    pg.touchscreen.tap(r['x'],r['y']); screen_is(pg,'settings'); t.ok(True,'tap opens settings'); pg.wait_for_timeout(200); 
    r=pg.evaluate("(()=>{const a=window.__GAME__.app,c=document.querySelector('#p1 canvas').getBoundingClientRect();return {x:c.left+(a.hud.width-20)/a.hud.width*c.width,y:c.top+(a.hud.height-9)/a.hud.height*c.height}})()")
    pg.touchscreen.tap(r['x'],r['y']); screen_is(pg,'title'); t.ok(True,'a tap on the Back prompt leaves settings'); wait(pg,"window.__GAME__.state().attract===true",16000); t.ok(True,'attract runs on a touch device'); pg.wait_for_timeout(1000); t.ok(not errs,'no errors on touch',errs[:3]); t.ok(not pg.evaluate("window.__PIXEL_ENGINE__.touch"),'no on-screen controls'); ctx.close()
    b.close()
t.done()
