"""Packaged-file UI and input checks. Called by tools/verify.mjs.
Uses the installed Playwright browsers; no server, downloads or physical devices.
"""
from __future__ import annotations
import hashlib
import json
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'game.html'
PAD="""globalThis.testPad={id:'DualSense Wireless Controller (STANDARD GAMEPAD)',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),timestamp:1};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>testPad.connected?[testPad]:[]});"""

def run():
    reports=[]; failures=[]; passed=0; page_errors={}
    only=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--only=')),None)
    def check(name,fn):
        nonlocal passed
        if only and not any(part.lower() in name.lower() for part in only.split(',')):return
        try:
            detail=fn() or {}
            reports.append({'name':name,'pass':True,**detail});passed+=1
        except Exception as error:
            message=str(error).split('Call log:')[0].strip()
            failures.append(f'{name}: {message}')
            reports.append({'name':name,'pass':False,'detail':message})
    def require(value,message):
        assert value,message
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--disable-dev-shm-usage'])
        version=browser.version
        contexts=[]
        def fresh(init=None,phone=False):
            context=browser.new_context(**(pw.devices['iPhone 13'] if phone else {'viewport':{'width':1920,'height':1080}}))
            contexts.append(context)
            page=context.new_page();page.set_default_timeout(5000)
            page_errors[id(page)]=[]
            page.on('pageerror',lambda e:page_errors[id(page)].append(str(e)))
            if init:page.add_init_script(init)
            page.goto(GAME.resolve().as_uri(),wait_until='load')
            page.wait_for_function('globalThis.__wizard && __wizard.game.sceneName === "title"')
            page.evaluate('__wizard.game.stop(); __wizard.game.advance(.03,{draw:false});')
            return context,page
        def advance(page,seconds=.03,draw=False):
            return page.evaluate('([seconds,draw])=>__wizard.game.advance(seconds,{draw})',[seconds,draw])
        def capture(page,name):
            advance(page,.01,True)
            page.screenshot(path=str(ROOT/'evidence'/name))
        def start(page,difficulty='Normal'):
            page.get_by_text('Play',exact=True).click()
            page.get_by_text(re.compile('^'+difficulty+' ·')).click()
            advance(page,1.1)
            require(page.evaluate('__wizard.game.sceneName==="play" && !__wizard.ui.screen'),'Play did not own the input after difficulty selection')
        def errors(page):
            require(not page_errors.get(id(page)),str(page_errors.get(id(page))))
            require(page.evaluate('__wizard.game.errors.length===0'),page.evaluate('JSON.stringify(__wizard.game.errors)'))
        def pad(page,button):
            page.evaluate('(n)=>{testPad.buttons[n]={pressed:true,touched:true,value:1};testPad.timestamp++;}',button)
            advance(page,.025)
            page.evaluate('(n)=>{testPad.buttons[n]={pressed:false,touched:false,value:0};testPad.timestamp++;}',button)
            advance(page,.025)
        try:
            def mouse_keyboard():
                context,page=fresh()
                try:
                    require(page.evaluate('__wizard.game.settings.music===.1'),'Fresh music setting is not exactly 10%')
                    page.get_by_text('Co-op',exact=True).hover()
                    require(page.evaluate('document.activeElement.textContent==="Co-op"'),'Mouse hover did not move native menu focus')
                    capture(page,'final-title.png')
                    start(page)
                    p0=page.evaluate('({...__wizard.sim.s.players[0]})')
                    page.keyboard.down('ArrowRight');advance(page,.25);page.keyboard.up('ArrowRight');advance(page,.02)
                    p1=page.evaluate('({...__wizard.sim.s.players[0]})')
                    require(abs(p0['x']-p1['x'])<.001 and abs(p0['y']-p1['y'])<.001,'Arrow-key aiming moved the warden')
                    require(p1['face']==0,'Standing keyboard aim did not select east')
                    page.keyboard.down('d');advance(page,.45);page.keyboard.up('d');advance(page,.2)
                    p2=page.evaluate('({...__wizard.sim.s.players[0]})')
                    require(p2['x']>p1['x']+.8,'WASD did not move through a legal lane')
                    page.keyboard.down('Space')
                    maximum=0
                    for _ in range(24):
                        advance(page,.025)
                        count=page.evaluate('__wizard.sim.s.bolts.filter(b=>b.owner==="p0").length')
                        maximum=max(maximum,count)
                        require(count<=1,'Hold-to-fire bypassed one-bolt ownership')
                    page.keyboard.up('Space');advance(page,.03)
                    require(page.evaluate('__wizard.sim.s.stats.shots>0'),'Space never discharged the rifle')
                    page.keyboard.press('Escape');advance(page,.03)
                    require(page.evaluate('__wizard.game.paused && __wizard.ui.screen==="pause"'),'Escape did not open native pause')
                    before=page.evaluate('__wizard.sim.s.tick');advance(page,.35)
                    require(page.evaluate('__wizard.sim.s.tick')==before,'Standalone simulation advanced during pause')
                    page.get_by_text('Resume',exact=True).click();advance(page,.1)
                    require(page.evaluate('__wizard.sim.s.tick')>before,'Native Resume did not restore play')
                    capture(page,'final-fight.png');errors(page)
                    return {'maxOwnedBolts':maximum,'movementCells':p2['x']-p1['x'],'music':.1}
                finally:context.close()
            check('mouse, keyboard aiming, one bolt and native pause',mouse_keyboard)

            def keyboard_menus():
                context,page=fresh()
                try:
                    page.keyboard.press('Enter');advance(page,.025)
                    require(page.evaluate('__wizard.ui.screen==="setup"'),'Keyboard Enter did not enter difficulty selection')
                    page.keyboard.press('ArrowDown');advance(page,.03)
                    page.keyboard.press('Enter');advance(page,1.1)
                    require(page.evaluate('__wizard.sim.s.difficulty==="normal"'),'Keyboard-only difficulty selection failed')
                    page.keyboard.press('Escape');advance(page,.02)
                    page.get_by_text('Controls',exact=True).click()
                    page.get_by_role('button',name=re.compile('^Lantern rifle, keyboard:')).click()
                    page.keyboard.press('f');advance(page,.03)
                    require(page.evaluate('__wizard.game.input.map.fire.includes("KeyF")'),'Native fire rebinding did not save a real key')
                    page.get_by_text('Restore defaults',exact=True).click();advance(page,.02)
                    require(page.evaluate('__wizard.game.input.map.fire.includes("Space")'),'Restore defaults did not restore firing')
                    errors(page)
                    return {'rebound':'KeyF','restored':'Space'}
                finally:context.close()
            check('keyboard-only menus and native rebinding',keyboard_menus)

            def pad_menus():
                context,page=fresh(PAD)
                try:
                    # D-pad and Cross drive the actual native screen hierarchy.
                    pad(page,0)
                    require(page.evaluate('__wizard.ui.screen==="setup"'),'Controller confirm did not enter setup')
                    pad(page,13);pad(page,0);advance(page,1.1)
                    require(page.evaluate('__wizard.sim.s.difficulty==="normal"'),'Controller selected the wrong difficulty')
                    before=page.evaluate('({...__wizard.sim.s.players[0]})')
                    page.evaluate('testPad.axes=[.9,0,0,-.9]');advance(page,.3)
                    after=page.evaluate('({...__wizard.sim.s.players[0]})')
                    require(after['x']>before['x']+.6 and after['face']==3,'Independent left/right sticks did not move east and aim north')
                    page.evaluate('testPad.axes=[0,0,0,0]');advance(page,.2)
                    pad(page,9)
                    require(page.evaluate('__wizard.ui.screen==="pause"'),'Options did not open native pause')
                    page.get_by_text('Controls',exact=True).click()
                    for _ in range(6):
                        if page.evaluate('__wizard.game.settings.glyphs==="xbox"'):break
                        page.get_by_role('button',name=re.compile('^Button symbols:')).click()
                    pad(page,12)
                    require(page.evaluate('__wizard.game.settings.glyphs==="xbox" && __wizard.game.input.label("confirm")==="A"'),'Xbox symbol setting did not change live pad prompts')
                    page.evaluate('__wizard.ui.hide(); __wizard.game.resume();');advance(page,.03)
                    page.evaluate('testPad.connected=false');advance(page,.03)
                    require(page.evaluate('__wizard.game.paused && __wizard.game.pauseReason==="controller"'),'Unplugging the active controller did not recoverably pause')
                    errors(page)
                    return {'controller':'standard-mapped DualSense stub','glyphs':'xbox','disconnect':'paused'}
                finally:context.close()
            check('controller menus, twin sticks, symbols and unplug',pad_menus)

            def couch():
                context,page=fresh()
                try:
                    page.get_by_text('Co-op',exact=True).click()
                    page.get_by_text('Two keyboard seats',exact=True).click()
                    page.get_by_text(re.compile('^Normal ·')).click();advance(page,1.1)
                    require(page.evaluate('__wizard.sim.s.players.length===2'),'Couch setup did not create simultaneous actors')
                    before=page.evaluate('__wizard.sim.s.players.map(p=>({...p}))')
                    page.keyboard.down('d');page.keyboard.down('ArrowLeft');advance(page,.3)
                    page.keyboard.up('d');page.keyboard.up('ArrowLeft');advance(page,.15)
                    after=page.evaluate('__wizard.sim.s.players.map(p=>({...p}))')
                    require(after[0]['x']>before[0]['x']+.6 and after[1]['x']<before[1]['x']-.6,'Two keyboard seats did not move independently')
                    require(after[0]['y']==before[0]['y'] and after[1]['y']==before[1]['y'],'Seat assignment crossed input axes')
                    errors(page)
                    return {'actors':2,'mode':'simultaneous two-keyboard couch'}
                finally:context.close()
            check('simultaneous couch seats and input ownership',couch)

            def attract():
                context,page=fresh()
                try:
                    before=page.evaluate('JSON.stringify(Object.entries(localStorage).sort())')
                    advance(page,9.7)
                    require(page.evaluate('document.body.dataset.mode==="title"'),'Attract began before 10 seconds')
                    advance(page,.4)
                    require(page.evaluate('document.body.dataset.mode==="attract" && __wizard.sim.s.invulnerable'),'Attract did not start after 10 seconds')
                    advance(page,85)
                    require(page.evaluate('document.body.dataset.mode==="attract"'),'Attract showcase failed to loop')
                    require(page.evaluate('JSON.stringify(Object.entries(localStorage).sort())')==before,'Attract changed real saves or settings')
                    page.keyboard.press('Enter');advance(page,.08)
                    require(page.evaluate('document.body.dataset.mode==="title" && __wizard.ui.screen==="title"'),'Keyboard wake leaked into setup')
                    advance(page,10.1)
                    page.mouse.click(1700,500);advance(page,.08)
                    require(page.evaluate('document.body.dataset.mode==="title" && __wizard.ui.screen==="title"'),'Mouse wake leaked into a title action')
                    errors(page)
                    return {'thresholdSeconds':10,'showcaseSeconds':85,'wakes':['keyboard','mouse'],'storageUnchanged':True}
                finally:context.close()
            check('10-second attract, loop, save isolation and consumed wake',attract)

            def attract_pad():
                context,page=fresh(PAD)
                try:
                    advance(page,10.1)
                    require(page.evaluate('document.body.dataset.mode==="attract"'),'Pad idle caused unintended activity')
                    pad(page,0)
                    require(page.evaluate('document.body.dataset.mode==="title" && __wizard.ui.screen==="title"'),'Pad wake also confirmed Play')
                    # Drift below the configured dead zone must remain idle.
                    page.evaluate('testPad.axes=[.04,-.03,.02,0]');advance(page,10.1)
                    require(page.evaluate('document.body.dataset.mode==="attract"'),'Sub-dead-zone drift prevented attract')
                    errors(page)
                    return {'wakes':['controller'],'deadZoneDriftIgnored':True}
                finally:context.close()
            check('controller attract wake and drift policy',attract_pad)

            def developer():
                context,page=fresh()
                try:
                    start(page)
                    page.keyboard.press('Escape');advance(page,.03)
                    page.get_by_text('Developer',exact=True).click()
                    require(page.evaluate('__wizard.ui.screen==="developer"'),'Developer is not reachable from pause')
                    capture(page,'final-developer.png')
                    before=page.evaluate('__wizard.sim.s.tick')
                    page.get_by_text('Single step',exact=True).click()
                    require(page.evaluate('__wizard.sim.s.tick')==before+1,'Single-step did not advance exactly one simulation tick')
                    require(page.evaluate('__wizard.sim.s.practice'),'Single-step did not mark the run Practice')
                    page.get_by_text('MOVEMENT & WEAPON',exact=True).click()
                    slider=page.get_by_role('slider',name='Warden speed',exact=True)
                    slider.focus();page.keyboard.press('ArrowRight');advance(page,.025)
                    require(page.evaluate('__wizard.sim.s.tuning.playerSpeed!==WizardSim.DEFAULTS.playerSpeed'),'Live speed slider did not affect current tuning')
                    page.get_by_text('Back',exact=True).last.click()
                    page.get_by_text(re.compile('^Invulnerability ·')).click()
                    require(page.evaluate('__wizard.sim.s.invulnerable'),'Developer invulnerability did not apply')
                    page.get_by_text('Reset to defaults',exact=True).click()
                    require(page.evaluate('!__wizard.sim.s.invulnerable && __wizard.game.timeScale===1 && Object.keys(WizardSim.DEFAULTS).every(k=>__wizard.sim.s.tuning[k]===WizardSim.DEFAULTS[k])'),'Developer reset left a live override behind')
                    page.get_by_text('Force finale',exact=True).click();advance(page,1.5)
                    require(page.evaluate('__wizard.sim.s.roomIndex===5 && __wizard.sim.s.phase==="intrusion" && __wizard.sim.s.wizard'),'Force finale did not create the real authored Wizard')
                    capture(page,'final-wizard.png');errors(page)
                    return {'singleStepTicks':1,'resetAllTuning':True,'finaleRoom':6}
                finally:context.close()
            check('developer single-step, live slider, reset and finale',developer)

            def storage():
                for label,init in [('corrupt',"localStorage.setItem('inconspicuous:v1:campaign','{broken');localStorage.setItem('inconspicuous:v1:records','{\"v\":1,\"data\":[]}');"),('blocked',"Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('storage blocked')}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('storage blocked')}});")]:
                    context,page=fresh(init)
                    try:
                        require(page.evaluate('__wizard.game.settings.music===.1'),'Bad storage changed the fresh music default')
                        start(page,'Gentle')
                        require(page.evaluate('__wizard.sim.s.players[0].lives===5'),f'{label} storage blocked a playable new run')
                        if label=='blocked':require(page.evaluate('__wizard.writeStorage("probe",{})===false'),'Blocked storage write was not safely reported')
                        errors(page)
                    finally:context.close()
                return {'storage':['corrupt JSON','blocked read/write'],'playable':True}
            check('corrupt and blocked persistence keep the game playable',storage)

            def campaign():
                context,page=fresh(PAD)
                try:
                    # Select Normal using the controller, then replace only the new-run seed
                    # with a deterministic normal checkpoint. All wins use movement/aim/fire.
                    pad(page,0);pad(page,13);pad(page,0);advance(page,1.1)
                    page.evaluate('__wizard.test.load(new WizardSim.Sim({difficulty:"normal",seats:1,seed:539103}).save());')
                    for _ in range(30):
                        page.evaluate('__wizard.test.botTick(60)')
                        phase=page.evaluate('__wizard.sim.s.phase')
                        if phase in ['victory','defeat']:break
                    final=page.evaluate('({phase:__wizard.sim.s.phase,practice:__wizard.sim.s.practice,stats:__wizard.sim.s.stats,room:__wizard.sim.s.roomIndex,time:__wizard.sim.s.time,score:__wizard.sim.s.score})')
                    require(final['phase']=='victory',f'Ordinary-command campaign did not win: {final}')
                    require(not final['practice'] and final['room']==5,'Campaign required cheats or skipped the last chamber')
                    advance(page,.03)
                    require(page.evaluate('__wizard.ui.screen==="results"'),'Victory did not produce complete results')
                    capture(page,'final-results.png')
                    pad(page,13);pad(page,0)
                    require(page.evaluate('__wizard.ui.screen==="credits"'),'Controller could not reach Credits from results')
                    capture(page,'final-credits.png')
                    # Return through actual native menu buttons, then start another descent.
                    page.get_by_text('Return',exact=True).click()
                    page.get_by_text('New run',exact=True).click()
                    page.get_by_text(re.compile('^Gentle ·')).click();advance(page,.4)
                    require(page.evaluate('__wizard.sim.s.roomIndex===0 && __wizard.sim.s.score===0 && __wizard.sim.s.phase==="entry"'),'Replay did not start a clean new run')
                    errors(page)
                    return final
                finally:context.close()
            check('full normal campaign through commands, results, credits and replay',campaign)

            def touch():
                context,page=fresh(phone=True)
                try:
                    start(page,'Gentle')
                    require(page.evaluate('__wizard.game.W<500 && __wizard.renderer.layout.portrait'),'Phone did not receive its readable portrait resolution')
                    session=context.new_cdp_session(page)
                    touches=lambda ax,ay,bx,by:[{'x':ax,'y':ay,'id':1},{'x':bx,'y':by,'id':2}]
                    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':touches(80,620,310,620)})
                    session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':touches(128,620,310,572)})
                    before=page.evaluate('({...__wizard.sim.s.players[0]})');advance(page,.35)
                    after=page.evaluate('({...__wizard.sim.s.players[0]})')
                    require(after['x']>before['x']+.6 and after['face']==3,'Invisible multitouch sticks did not independently move and aim')
                    require(page.evaluate('__wizard.sim.s.bolts.filter(b=>b.owner==="p0").length<=1'),'Touch firing bypassed one-bolt invariant')
                    session.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});advance(page,.25)
                    command=page.evaluate('__wizard.test.command(0)')
                    require(command['move']==-1 and command['aim']==-1 and not command['fire'],'Touch cancellation left movement, aim, or fire stuck')
                    require(page.evaluate('__wizard.game.input.touchEnabled===false'),'Native visible touch sticks remain enabled')
                    capture(page,'final-phone.png');errors(page)
                    page.evaluate('__wizard.title();__wizard.game.go("title");');advance(page,.3)
                    advance(page,10.1)
                    require(page.evaluate('document.body.dataset.mode==="attract"'),'Touch wake precondition did not enter attract')
                    page.touchscreen.tap(200,400);advance(page,.06)
                    require(page.evaluate('document.body.dataset.mode==="title" && __wizard.ui.screen==="title"'),'Touch waking attract also activated Play')
                    advance(page,10.1)
                    require(page.evaluate('document.body.dataset.mode==="attract"'),'Held touch wake did not begin from attract')
                    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':200,'y':400,'id':9}]})
                    page.evaluate('globalThis.wakeProbe=performance.now()')
                    page.wait_for_function('performance.now()>wakeProbe+750')
                    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});advance(page,.06)
                    require(page.evaluate('document.body.dataset.mode==="title" && __wizard.ui.screen==="title"'),'Held waking touch released into a fresh title action')
                    return {'device':'Chromium iPhone13 profile','multitouch':True,'cancel':True,'assistance':True,'wake':'touch','heldWakeMilliseconds':750}
                finally:context.close()
            check('touch multitouch, cancellation, assistance and wake',touch)
        finally:
            for context in contexts:
                try:context.close()
                except Exception:pass
            browser.close()
        # Closest available approximation to iOS Safari; real hardware unavailable.
        def webkit():
            browser=pw.webkit.launch(headless=True)
            context=browser.new_context(**pw.devices['iPhone 13'])
            page=context.new_page();page.set_default_timeout(7000)
            page_errors[id(page)]=[]
            page.on('pageerror',lambda e:page_errors[id(page)].append(str(e)))
            try:
                page.goto(GAME.resolve().as_uri());page.wait_for_function('globalThis.__wizard')
                page.evaluate('__wizard.game.stop();__wizard.game.advance(.03,{draw:false})')
                page.get_by_text('Play',exact=True).tap()
                page.get_by_text(re.compile('^Gentle ·')).tap();advance(page,1.1)
                require(page.evaluate('__wizard.game.sceneName==="play" && __wizard.sim.s.players[0].alive'),'WebKit phone could not start through touch menus')
                page.touchscreen.tap(300,570);advance(page,.08)
                require(page.evaluate('__wizard.game.input.lastDevice==="touch"'),'WebKit tap did not select touch prompts')
                capture(page,'final-webkit-phone.png');errors(page)
                return {'browser':browser.version,'device':'iPhone13 profile','limitations':'Emulation, not a physical iOS Safari device'}
            finally:context.close();browser.close()
        check('WebKit phone touch menus and gameplay',webkit)
        def firefox():
            browser=pw.firefox.launch(headless=True)
            context=browser.new_context(viewport={'width':1280,'height':720})
            page=context.new_page();page.set_default_timeout(7000)
            page_errors[id(page)]=[]
            page.on('pageerror',lambda e:page_errors[id(page)].append(str(e)))
            try:
                page.goto(GAME.resolve().as_uri());page.wait_for_function('globalThis.__wizard')
                page.evaluate('__wizard.game.stop();__wizard.game.advance(.03,{draw:false})')
                start(page,'Gentle')
                page.keyboard.down('Space');advance(page,.25);page.keyboard.up('Space');advance(page,.03,True)
                require(page.evaluate('__wizard.sim.s.stats.shots>0'),'Firefox did not fire through real keyboard input')
                errors(page)
                return {'browser':browser.version,'renderer':'Native Canvas 2D; no WebGL required'}
            finally:context.close();browser.close()
        check('Firefox packaged-file keyboard gameplay',firefox)
    evidence={'gameSHA256':hashlib.sha256(GAME.read_bytes()).hexdigest(),'chromium':version,'passed':passed,'failures':failures,'checks':reports,'hardware':'No physical controller, phone, second player or human listening; stubs and browser profiles used.'}
    (ROOT/'evidence'/('ui-browser-targeted.json' if only else 'ui-browser.json')).write_text(json.dumps(evidence,indent=2)+'\n')
    return {'passed':passed,'failures':failures}

if __name__=='__main__':
    result=run()
    for failure in result['failures']:print('FAIL '+failure,file=sys.stderr)
    print(f"{result['passed']} UI browser checks passed; {len(result['failures'])} failed")
    raise SystemExit(1 if result['failures'] else 0)
