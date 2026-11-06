"""Integrated file:// UI/input verification. One browser; quiet aggregate output."""
from pathlib import Path
import json
import sys

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT.parent / "build-config.json").read_text())
ARTIFACT = ROOT.parent / (CONFIG["stem"] + ".html")
CHECKS = []
FAILURES = []
CONSOLE = []
PAD_STUB = """(() => {
window.__testPads=[];
window.__makePad=(index=0)=>({id:'DualSense standard test '+index,index,connected:true,mapping:'standard',timestamp:1,buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),axes:[0,0,0,0]});
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__testPads});
})();"""


def check(value, name, detail=None):
    CHECKS.append((bool(value), name))
    if not value:
        FAILURES.append(f"{name}: {json.dumps(detail, ensure_ascii=False)}")


def evaluate(page, expression):
    return page.evaluate(expression)


def step(page, seconds=1 / 60):
    return evaluate(page, f"__pp.game.advance({seconds})")


def key(page, name):
    page.keyboard.press(name)
    step(page)


def pad(page, button, index=0):
    evaluate(page, f"__testPads[{index}].buttons[{button}]={{pressed:true,touched:true,value:1}}")
    step(page)
    evaluate(page, f"__testPads[{index}].buttons[{button}]={{pressed:false,touched:false,value:0}}")
    step(page)


def boot(browser, *, width=1280, height=800, touch=False, pads=False):
    context = browser.new_context(viewport={"width": width, "height": height}, has_touch=touch, is_mobile=touch)
    if pads:
        context.add_init_script(PAD_STUB)
    page = context.new_page()
    page.set_default_timeout(5000)
    page.on("pageerror", lambda error: CONSOLE.append(str(error)))
    page.on("console", lambda message: CONSOLE.append(message.text) if message.type == "error" else None)
    page.goto(ARTIFACT.as_uri())
    page.wait_for_function("window.__pp?.ready === true", timeout=30000)
    evaluate(page, "__pp.game.stop()")
    return context, page


def nav_label(page):
    return page.locator("[data-nav].focused").inner_text().strip()


def keyboard_checks(browser):
    context, page = boot(browser)
    try:
        check(evaluate(page, "__pp.mode==='title' && __pp.screen==='title'"), "fresh file launches title")
        check(page.title() == CONFIG["title"], "artifact branding consistent")
        check(evaluate(page, "__pp.game.errors.length===0"), "native launch has no errors")
        check(evaluate(page, "__pp.settings.music===.1"), "fresh music preference is ten percent")
        check("Enter the mine" in nav_label(page), "title focuses expedition")
        key(page, "Enter")
        check(evaluate(page, "__pp.mode==='play' && __pp.screen===null"), "keyboard Enter starts expedition")
        step(page, 1.8)
        x0 = evaluate(page, "__pp.sim.miners[0].hero.x")
        page.keyboard.down("d")
        step(page, .4)
        page.keyboard.up("d")
        step(page)
        check(evaluate(page, f"__pp.sim.miners[0].hero.x>{x0}+20"), "keyboard movement reaches native actor")
        page.keyboard.down("Space")
        step(page, .08)
        rising = evaluate(page, "__pp.sim.miners[0].hero.vz")
        page.keyboard.up("Space")
        step(page, .04)
        released = evaluate(page, "__pp.sim.miners[0].hero.vz")
        check(rising > 0 and released < rising, "keyboard jump release shortens rise", [rising, released])
        step(page, .7)
        key(page, "Escape")
        check(evaluate(page, "__pp.screen==='pause'"), "Escape opens pause")
        tick = evaluate(page, "__pp.sim.tick")
        step(page, .4)
        check(evaluate(page, f"__pp.sim.tick==={tick}"), "standalone pause freezes authoritative world")
        for _ in range(3):
            key(page, "ArrowDown")
        check("Developer" in nav_label(page), "keyboard reaches Developer from pause")
        key(page, "Enter")
        check(evaluate(page, "__pp.screen==='developer'"), "Developer opens from actual pause navigation")
        key(page, "Enter")
        check(evaluate(page, "__pp.sim.invincible && __pp.sim.developer"), "Developer invulnerability marks record exclusion")
        page.locator('[data-do="dev-next"]').click()
        step(page)
        before = evaluate(page, "__pp.sim.tuning.moveSpeed")
        key(page, "ArrowRight")
        check(evaluate(page, f"__pp.sim.tuning.moveSpeed>{before}"), "live slider changes simulation tuning")
        check(page.locator("#range-moveSpeed").input_value() == str(evaluate(page, "__pp.sim.tuning.moveSpeed")), "live slider displays actual rule")
        for k in ("chopCycle", "redirectWindow", "durability", "rockSpeed", "spawnInterval", "pressure", "keyLifetime", "pickLifetime", "ladderPeriod", "rescueTime", "recoveryWait"):
            evaluate(page, f"__pp.sim.setTuning('{k}',PP.TUNING['{k}'].max)")
        evaluate(page, "__pp.show('developer',0)")
        page.locator('[data-do="dev-15"]').click()
        step(page)
        check(evaluate(page, "JSON.stringify(__pp.sim.tuning)===JSON.stringify(PP.defaults())"), "Developer reset restores complete tuning schema")
        evaluate(page, "__pp.show('developer',4)")
        page.locator('[data-do="dev-chamber-2"]').click()
        step(page)
        check(evaluate(page, "__pp.sim.chamber===2 && __pp.sim.room.tiers===7"), "Developer chamber launcher opens seven-tier finale")
        page.locator('[data-do="dev-route-1"]').click()
        step(page)
        check(evaluate(page, "__pp.sim.route===1"), "Developer route launcher changes authored arrangement")
        evaluate(page, "__pp.show('developer',0)")
        tick = evaluate(page, "__pp.sim.tick")
        page.locator('[data-do="dev-11"]').click()
        step(page)
        check(evaluate(page, f"__pp.sim.tick==={tick}+1"), "Developer single step advances one simulation tick")
        key(page, "Escape")
        check(evaluate(page, "__pp.screen==='pause'"), "Developer back returns pause")
        page.locator('[data-do="controls"]').click()
        step(page)
        page.locator('[data-do="bind-chop"]').click()
        page.keyboard.press("f")
        step(page)
        check(evaluate(page, "__pp.game.input.label('chop','keyboard')==='F'"), "integrated rebinding uses native label")
        page.locator('[data-do="reset-controls"]').click()
        step(page)
        check(evaluate(page, "__pp.game.input.label('chop','keyboard')==='J'"), "integrated restore controls returns defaults")
        key(page, "Escape")
        page.locator('[data-do="settings"]').click()
        step(page)
        check(page.locator("#range-music").input_value() == "10", "Settings agrees with audio default")
        page.locator("#range-music").fill("27")
        page.locator("#range-music").dispatch_event("input")
        step(page)
        check(evaluate(page, "Math.abs(__pp.audio.diagnostics().gains.music-.27*.35)<.00001"), "Settings slider changes paused native music bus")
        page.locator("#check-mute").check()
        step(page)
        check(evaluate(page, "__pp.audio.diagnostics().gains.master===0"), "integrated mute silences output")
        page.locator("#check-mute").uncheck()
        page.locator('[data-do="settings-next"]').click()
        page.locator("#check-reducedMotion").check()
        page.locator("#check-reducedFlashes").check()
        step(page)
        check(evaluate(page, "__pp.settings.reducedMotion && __pp.settings.reducedFlashes"), "comfort settings persist to application")
        check(evaluate(page, "document.body.classList.contains('reduced-motion')"), "reduced motion updates presentation state")
        page.locator('[data-do="settings-next"]').click()
        page.locator('[data-do="glyphs"]').click()
        step(page)
        check(evaluate(page, "__pp.settings.glyphs==='xbox'"), "Xbox glyph choice applied")
        page.locator('[data-do="reset-settings"]').click()
        step(page)
        check(evaluate(page, "__pp.settings.music===.1 && __pp.settings.glyphs==='playstation' && !__pp.settings.reducedMotion"), "player settings reset restores defaults")
        key(page, "Escape")
        page.locator('[data-do="about"]').click()
        step(page)
        headings = []
        for _ in range(10):
            headings.append(page.locator("#screen-panel h2").inner_text())
            page.locator('[data-do="about-next"]').click()
            step(page)
        check(all(name in headings for name in ["Source Information", "Testing Feedback", "Engine Feedback", "Prompt Feedback"]), "About exposes all required feedback categories", headings)
        check("Credits & source notes" in headings, "credits include dependency and verification notes")
        key(page, "Escape")
        page.locator('[data-do="resume"]').click()
        step(page)
        # Defeat through ordinary authoritative damage contacts, then verify the UI's retry.
        evaluate(page, "__pp.sim.invincible=false;__pp.sim.transition=0; const m=__pp.sim.miners[0]; for(let n=0;n<3;n++){m.invuln=0;__pp.sim.hurt(m,{vx:50})}")
        step(page)
        check(evaluate(page, "__pp.screen==='results' && __pp.sim.completed && !__pp.sim.completed.won"), "knockout reaches complete failure screen")
        key(page, "Enter")
        check(evaluate(page, "__pp.mode==='play' && __pp.screen===null && !__pp.sim.completed && __pp.sim.miners[0].health===3"), "failure retry restores native checkpoint")
        check(evaluate(page, "(Number(localStorage.getItem('pickaxe-puddles:best'))||0)===0"), "Developer and failure runs do not write best score")
    finally:
        evaluate(page, "__pp.dispose()")
        context.close()


def attract_checks(browser):
    context, page = boot(browser, pads=True)
    try:
        evaluate(page, "localStorage.setItem('pickaxe-puddles:best','777')")
        idle = evaluate(page, "__pp.diagnostics().idle")
        step(page, max(0, 9.95-idle))
        check(evaluate(page, "__pp.mode==='title'"), "attract does not start before ten idle seconds")
        step(page, .06)
        check(evaluate(page, "__pp.mode==='attract'"), "attract starts at ten-second boundary")
        check(not page.locator("#attract-label").is_hidden(), "attract is visibly labelled")
        key(page, "Enter")
        check(evaluate(page, "__pp.mode==='title' && __pp.screen==='title'"), "keyboard wakes attract to title")
        check(evaluate(page, "__pp.sim.score===0 && __pp.sim.chamber===0 && !__pp.sim.developer"), "attract wake restores clean simulation")
        check(evaluate(page, "localStorage.getItem('pickaxe-puddles:best')==='777'"), "attract never changes completed score record")
        step(page, .2)
        key(page, "Enter")
        check(evaluate(page, "__pp.mode==='play'"), "second deliberate key starts new run")
        evaluate(page, "__pp.action('title')")
        step(page, 10.1)
        evaluate(page, "__testPads=[__makePad(0)]")
        pad(page, 0)
        check(evaluate(page, "__pp.mode==='title'"), "gamepad wake is consumed without starting run")
        evaluate(page, "__testPads=[]")
        step(page, 10.1)
        page.mouse.click(10, 10)
        step(page)
        check(evaluate(page, "__pp.mode==='title'"), "pointer wakes attract without clicking through")
        step(page, 10.1)
        page.mouse.move(70, 70)
        step(page)
        check(evaluate(page, "__pp.mode==='title' && __pp.screen==='title'"), "meaningful pointer motion wakes attract without clicking")
        check(evaluate(page, "__pp.game.errors.length===0"), "attract wake cycles leave native engine clean")
    finally:
        evaluate(page, "__pp.dispose()")
        context.close()


def pad_checks(browser):
    context, page = boot(browser, pads=True)
    try:
        evaluate(page, "__testPads=[__makePad(0)]")
        step(page)
        pad(page, 13)
        pad(page, 0)
        check(evaluate(page, "__pp.screen==='coop'"), "pad reaches local co-op menu")
        pad(page, 1)
        check(evaluate(page, "__pp.screen==='title'"), "pad Circle returns title")
        pad(page, 13)
        pad(page, 13)
        pad(page, 0)
        check(evaluate(page, "__pp.screen==='practice'"), "pad reaches chamber practice")
        pad(page, 13)
        pad(page, 0)
        check(evaluate(page, "__pp.mode==='play' && __pp.sim.chamber===1"), "pad starts selected chamber practice")
        step(page,1.8)
        evaluate(page,"__testPads[0].buttons[1]={pressed:true,value:1}")
        step(page)
        check(evaluate(page,"__pp.input.intent(1).my===1 && __pp.sim.miners[0].hero.crouching && __pp.screen===null"),"Circle ducks through native platformer without opening menu")
        evaluate(page,"__testPads[0].buttons[1]={pressed:false,value:0}")
        step(page)
        pad(page, 9)
        check(evaluate(page, "__pp.screen==='pause'"), "pad Options pauses")
        pad(page, 13)
        pad(page, 0)
        check(evaluate(page, "__pp.screen==='settings'"), "pad opens Settings")
        before = evaluate(page, "__pp.settings.music")
        pad(page, 15)
        check(evaluate(page, f"__pp.settings.music>{before}"), "pad adjusts sound slider")
        pad(page, 1)
        pad(page, 13)
        pad(page, 13)
        pad(page, 0)
        check(evaluate(page, "__pp.screen==='controls'"), "pad opens Controls")
        pad(page, 0)
        check("Gamepad" in nav_label(page), "pad selects gamepad rebinding device")
        pad(page, 1)
        for _ in range(3):
            pad(page, 13)
        pad(page, 0)
        check(evaluate(page, "__pp.screen==='developer'"), "pad opens Developer")
        pad(page, 1)
        for _ in range(4):
            pad(page, 13)
        pad(page, 0)
        check(evaluate(page, "__pp.screen==='about'"), "pad opens About")
        pad(page, 13)
        pad(page, 0)
        check(evaluate(page, "__pp.screen==='about'"), "pad pages About")
        pad(page, 1)
        pad(page, 0)
        check(evaluate(page, "__pp.screen===null"), "pad resumes gameplay")
        evaluate(page, "__testPads[0].buttons[8]={pressed:true,value:1}")
        pad(page, 9)
        check(evaluate(page, "__pp.screen===null"), "Create plus Options remains reserved for Hub")
        evaluate(page, "__testPads[0].buttons[8]={pressed:false,value:0};__testPads=[]")
        step(page)
        check(evaluate(page, "__pp.screen==='pause'"), "controller disconnect enters recoverable pause")
        key(page, "Enter")
        check(evaluate(page, "__pp.screen===null"), "keyboard can resume after controller disconnect")
        evaluate(page, "__testPads=[__makePad(0)];__pp.sim.transition=0;const m=__pp.sim.miners[0];for(let n=0;n<3;n++){m.invuln=0;__pp.sim.hurt(m,{vx:50})}")
        step(page)
        check(evaluate(page, "__pp.screen==='results'"), "pad session reaches results after knockout")
        pad(page,0)
        check(evaluate(page,"__pp.screen===null && !__pp.sim.completed"),"pad accepts retry on results")
    finally:
        evaluate(page, "__pp.dispose()")
        context.close()


def touch_checks(browser, width, height):
    context, page = boot(browser, width=width, height=height, touch=True)
    label = "portrait" if height > width else "landscape"
    try:
        page.locator('[data-do="expedition"]').tap()
        step(page, 1.8)
        check(evaluate(page, "__pp.mode==='play' && __pp.input.device==='touch'"), f"{label} touch starts expedition")
        # Draw once after the phone's layout has settled; state checks handle control.
        evaluate(page, "__pp.game.advance(0,{draw:true})")
        rect = page.locator("#screen").bounding_box()
        x = rect["x"] + rect["width"] * .20
        y = rect["y"] + rect["height"] * .66
        right = rect["x"] + rect["width"] * .82
        page.touchscreen.tap(right, y)
        step(page, .04)
        check(evaluate(page, "__pp.sim.miners[0].hero.z>16"), f"{label} actual touch tap jumps")
        step(page, .8)
        cdp = context.new_cdp_session(page)
        x0 = evaluate(page, "__pp.sim.miners[0].hero.x")
        points = [{"x": x, "y": y, "id": 1}, {"x": right, "y": y, "id": 2}]
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": points})
        points[0]["x"] += 50
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": points})
        step(page, .35)
        check(evaluate(page, f"__pp.sim.miners[0].hero.x>{x0}+15"), f"{label} multitouch moves during jump")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        step(page)
        check(evaluate(page, "__pp.input.intent(1).mx===0 && !__pp.input.intent(1).jumpHeld"), f"{label} touch release clears held actions")
        evaluate(page, """() => {
            const sim=__pp.sim,m=sim.miners[0];
            sim.transition=0;sim.rocks=[];m.hero.x=62;m.hero.z=16;m.hero.vx=m.hero.vz=0;m.hero.facing=m.facing=-1;
            sim.spawnPickup('key',m.hero.x,m.hero.z+14);
        }""")
        step(page)
        check(evaluate(page, "__pp.sim.keyOwner===__pp.sim.miners[0].id"), f"{label} fixture collects key through real pickup rules")
        check(not page.locator("#context-action").is_hidden(), f"{label} faced nearby door offers action bubble")
        page.locator("#context-action").tap()
        step(page)
        check(evaluate(page, "__pp.sim.transition>1 && __pp.sim.keyOwner===null"), f"{label} short contextual touch unlocks gate")
        step(page,2.3)
        check(evaluate(page, "__pp.sim.chamber===1"), f"{label} contextual door transitions chamber")
        step(page,1.8)
        evaluate(page,"""() => {
            const sim=__pp.sim,m=sim.miners[0];sim.rocks=[];sim.transition=0;
            sim.addMiner({id:2,name:'Touch rescue fixture',color:'#7de4d6'});
            const partner=sim.miners.find(n=>n.id===2);partner.hero.x=m.hero.x+16;partner.hero.z=m.hero.z;partner.downed=true;partner.health=0;
        }""")
        step(page)
        check(evaluate(page,"__pp.input.contextTarget?.kind==='rescue'"),f"{label} nearby downed partner takes context priority")
        bubble=page.locator("#context-action").bounding_box()
        cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":bubble['x']+bubble['width']/2,"y":bubble['y']+bubble['height']/2,"id":3}]})
        step(page,2)
        cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
        step(page)
        check(evaluate(page,"!__pp.sim.miners.find(m=>m.id===2).downed && __pp.sim.miners.find(m=>m.id===2).health===2"),f"{label} held contextual touch rescues partner")
        page.locator("#pause-button").tap()
        step(page)
        check(evaluate(page, "__pp.screen==='pause'"), f"{label} persistent menu button pauses")
        page.locator('[data-do="settings"]').tap()
        step(page)
        page.locator("#check-mute").tap()
        step(page)
        check(evaluate(page, "__pp.settings.mute"), f"{label} touch operates Settings")
        check(evaluate(page, "document.documentElement.scrollWidth<=innerWidth+1"), f"{label} menus stay within viewport")
        check(evaluate(page, "__pp.game.errors.length===0"), f"{label} rendering and controls have no native errors")
        evaluate(page,"__pp.action('title')")
        step(page,10.1)
        page.touchscreen.tap(10,10)
        step(page)
        check(evaluate(page,"__pp.mode==='title' && __pp.screen==='title'"),f"{label} touch wakes attract without click through")
    finally:
        evaluate(page, "__pp.dispose()")
        context.close()


def persistence_checks(browser):
    context,page=boot(browser,pads=True)
    try:
        page.locator('[data-do="settings"]').click()
        page.locator('[data-do="settings-next"]').click()
        page.locator('[data-do="settings-next"]').click()
        page.locator('[data-do="controls"]').click()
        page.locator('[data-do="bind-chop"]').click()
        page.keyboard.press("f")
        step(page)
        key(page,"Escape")
        page.locator('[data-do="settings"]').click()
        page.locator('[data-do="settings-next"]').click()
        page.locator('[data-do="settings-next"]').click()
        page.locator('[data-do="glyphs"]').click()
        step(page)
        page.reload()
        page.wait_for_function("window.__pp?.ready===true")
        evaluate(page,"__pp.game.stop()")
        step(page)
        check(evaluate(page,"__pp.game.input.label('chop','keyboard')==='F'"),"fresh reload preserves native player rebind")
        check(evaluate(page,"__pp.settings.glyphs==='xbox' && __pp.game.input.label('jump','gamepad')==='A'"),"fresh reload preserves selected pad glyphs")
        check(evaluate(page,"__pp.mode==='title' && __pp.sim.score===0 && __pp.sim.time===0"),"fresh reload preserves preferences with clean run state")
    finally:
        evaluate(page,"__pp.dispose()")
        context.close()


def coop_checks(browser):
    context,page=boot(browser,pads=True)
    try:
        page.locator('[data-do="coop"]').click()
        page.locator('[data-do="start-coop"]').click()
        step(page)
        evaluate(page,"__testPads=[__makePad(0)]")
        step(page)
        pad(page,9)
        check(evaluate(page,"__pp.sim.miners.length===2 && __pp.game.players.length===2"),"local co-op joins pad to second simultaneous miner")
        check(evaluate(page,"__pp.screen===null"),"pad ownership transfer does not cause disconnect pause")
        step(page,1.8)
        evaluate(page,"__testPads[0].axes[0]=-.8")
        page.keyboard.down('d')
        step(page,.8)
        page.keyboard.up('d')
        evaluate(page,"__testPads[0].axes[0]=0")
        step(page)
        check(evaluate(page,"__pp.sim.miners[0].hero.x>__pp.sim.miners[1].hero.x+25"),"integrated keyboard and partner pad move independently",evaluate(page,"({miners:__pp.sim.miners.map(m=>({id:m.id,x:m.hero.x,z:m.hero.z})),players:__pp.game.players.map(p=>({player:p.player,pad:p.pad,padIndex:p.padIndex})),mode:__pp.mode,screen:__pp.screen})"))
        evaluate(page,"const m=__pp.sim.miners[1];__pp.sim.spawnPickup('key',m.hero.x,m.hero.z+14)")
        step(page)
        check(evaluate(page,"__pp.sim.keyOwner===2"),"co-op partner can carry the shared progression key",evaluate(page,"({key:__pp.sim.keyOwner,miners:__pp.sim.miners.map(m=>({id:m.id,x:m.hero.x,z:m.hero.z})),mode:__pp.mode,screen:__pp.screen})"))
        key(page,'Escape')
        check(evaluate(page,"__pp.screen==='pause'"),"local co-op keyboard pause remains open",evaluate(page,"__pp.diagnostics()"))
        page.locator('[data-do="dropout"]').click()
        step(page)
        check(evaluate(page,"__pp.sim.miners.length===1 && __pp.game.players.length===1"),"partner dropout removes both simulation and input seat")
        check(evaluate(page,"__pp.sim.keyOwner===null && __pp.sim.pickups.some(p=>p.kind==='key')"),"departing partner recovers carried key into mine")
        key(page,'Enter')
        step(page,.2)
        check(evaluate(page,"__pp.mode==='play' && __pp.screen===null && !__pp.sim.completed"),"dropout leaves a viable solo run")
        evaluate(page,"__pp.action('title');__pp.start({coop:true})")
        step(page,8.2)
        evaluate(page,"__testPads=[__makePad(0)]")
        step(page)
        pad(page,9)
        check(evaluate(page,"__pp.sim.miners.length===1 && __pp.game.players.length===1"),"late local join is rejected without changing world roster")
    finally:
        evaluate(page,"__pp.dispose()")
        context.close()


def mouse_world_checks(browser):
    context,page=boot(browser)
    try:
        key(page,'Enter')
        step(page,1.8)
        evaluate(page,"""() => {
            const sim=__pp.sim,m=sim.miners[0];sim.rocks=[];
            sim.addMiner({id:2,name:'Mouse rescue fixture',color:'#7de4d6'});
            const partner=sim.miners.find(n=>n.id===2);partner.hero.x=m.hero.x+18;partner.hero.z=m.hero.z;partner.health=1;partner.invuln=0;sim.hurt(partner,{vx:1});
            __pp.game.advance(0,{draw:true});
        }""")
        def point(x,z):
            return evaluate(page,f"""() => {{
                const r=__pp.game.r, [x,y]=r.w({x},0,{z}), rect=document.getElementById('screen').getBoundingClientRect();
                return {{x:rect.left+x/__pp.game.screen.W*rect.width,y:rect.top+y/__pp.game.screen.H*rect.height}};
            }}""")
        partner=evaluate(page,"({x:__pp.sim.miners[1].hero.x,z:__pp.sim.miners[1].hero.z})")
        marker=point(partner['x'],partner['z']+16)
        page.mouse.move(marker['x'],marker['y'])
        page.mouse.down()
        step(page,2)
        check(evaluate(page,"!__pp.sim.miners[1].downed && __pp.sim.miners[1].health===2"),"holding mouse on nearby marker rescues partner")
        check(evaluate(page,"!__pp.input.intent(1).chop"),"mouse rescue consumes simultaneous chop input")
        page.mouse.up()
        step(page)
        check(evaluate(page,"!__pp.input.intent(1).interactHeld"),"mouse release ends contextual hold")
        evaluate(page,"""() => {
            const sim=__pp.sim,m=sim.miners[0];sim.rocks=[];sim.transition=0;m.hero.x=200;m.hero.z=16;m.hero.vx=m.hero.vz=0;m.hero.facing=m.facing=-1;
            sim.spawnPickup('key',m.hero.x,m.hero.z+14);
        }""")
        step(page)
        evaluate(page,"__pp.game.advance(0,{draw:true})")
        gate=point(48,32)
        page.mouse.click(gate['x'],gate['y'])
        step(page)
        check(evaluate(page,"__pp.sim.transition===0 && __pp.sim.keyOwner===1"),"out-of-range door click cannot spend key")
        evaluate(page,"const m=__pp.sim.miners[0];m.hero.x=62;m.hero.z=16;m.hero.vx=m.hero.vz=0;m.hero.facing=m.facing=-1;__pp.game.advance(0,{draw:true})")
        gate=point(48,32)
        page.mouse.click(gate['x'],gate['y'])
        step(page)
        check(evaluate(page,"__pp.sim.transition>1 && __pp.sim.keyOwner===null"),"in-range mouse door click consumes explicit interaction")
    finally:
        evaluate(page,"__pp.dispose()")
        context.close()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--autoplay-policy=no-user-gesture-required"])
        for name, callback in [
            ("keyboard", lambda: keyboard_checks(browser)),
            ("attract", lambda: attract_checks(browser)),
            ("pad", lambda: pad_checks(browser)),
            ("persistent controls", lambda: persistence_checks(browser)),
            ("local co-op", lambda: coop_checks(browser)),
            ("mouse world actions", lambda: mouse_world_checks(browser)),
            ("touch portrait", lambda: touch_checks(browser, 390, 844)),
            ("touch landscape", lambda: touch_checks(browser, 844, 390)),
        ]:
            try:
                callback()
            except Exception as exc:
                check(False, name + " scenario completed", str(exc))
        browser.close()
    check(not CONSOLE, "packaged browser has no console/page errors", CONSOLE)
    for failure in FAILURES:
        print("FAIL " + failure, file=sys.stderr)
    print(f"{sum(passed for passed, _ in CHECKS)}/{len(CHECKS)} integrated browser checks passed")
    return not FAILURES


if __name__ == "__main__":
    raise SystemExit(0 if run() else 1)
