"""Code-only audio/input checks; invoked by the aggregate verification runner.

One browser, file:// origin, no recorded media. Prints only failures plus count.
"""
from pathlib import Path
import json
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CHECKS = []


def check(condition, name, detail=None):
    CHECKS.append((bool(condition), name, detail))


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--autoplay-policy=no-user-gesture-required"])
        page = browser.new_page(viewport={"width": 960, "height": 720})
        page.goto((ROOT / "tests/audio-fixture.html").as_uri())
        page.add_script_tag(path=str(ROOT / "vendor/engine/my-3d2dge.js"))
        page.add_script_tag(path=str(ROOT / "src/input/input.js"))
        page.add_script_tag(path=str(ROOT / "src/audio/audio.js"))
        probe = page.evaluate("async () => await PP.Audio.offlineProbe()")
        check(probe["supported"], "offline audio supported")
        check(probe["gain"]["music"] == 0.1, "default music gain is 10%")
        for bus in ("music", "sfx", "voice"):
            check(probe[bus]["energy"] > 1e-9, f"{bus} produces samples", probe[bus])
        check(0 < probe["total"]["peak"] < 1, "audio bounded below clipping", probe["total"])
        muted = page.evaluate("async () => await PP.Audio.offlineProbe({mute:true})")
        check(muted["total"]["peak"] == 0, "mute silences all buses")
        voiceless = page.evaluate("async () => await PP.Audio.offlineProbe({voice:0})")
        check(voiceless["voice"]["energy"] == 0, "voice volume isolates voice bus")
        check(voiceless["music"]["energy"] > 0, "voice mute preserves music")
        state = page.evaluate("""async () => {
            window.testGame = new My3D2dge.Game({canvas:'screen',res:[960,720],loop:false,autoPause:false,menu:false,fullscreen:false,corner:false,view:'side'});
            window.inputEvents = [];
            window.testInput = new PP.Input(testGame, {onMenu:e=>inputEvents.push(e.action)});
            window.testAudio = new PP.Audio({}, testGame);
            await testAudio.unlock();
            testAudio.update(.016, {time:0,room:{index:0},events:[],miners:[]});
            testAudio.event({id:'voice-key',type:'keyCollect'});
            testAudio.event({id:'voice-key',type:'keyCollect'});
            const hero=new My3D2dge.Platformer({x:100,z:16});hero.onGround=true;hero.vx=40;
            testAudio.update(.2,{time:.2,room:{index:0},events:[],miners:[{hero}]});
            const footstep=testAudio.diagnostics().counts.sfx;
            hero.onGround=false;hero.climbing=true;hero.vz=20;
            testAudio.update(.3,{time:.5,room:{index:0},events:[],miners:[{hero}]});
            const rung=testAudio.diagnostics().counts.sfx;
            const before=testAudio.diagnostics();
            testAudio.set({music:.2,sfx:.3,voice:.4,mute:true});
            const muted=testAudio.diagnostics();
            testAudio.set({mute:false}); testAudio.pause(true);
            const paused=testAudio.diagnostics();
            testAudio.pause(false);
            testAudio.dispose();
            testAudio.event('collision'); testAudio.update(1,null);
            const disposed=testAudio.diagnostics();
            return {before,muted,paused,disposed,footstep,rung};
        }""")
        check(state["before"]["native"], "native engine buses used")
        check(state["footstep"] >= 2, "native platformer ground state produces footsteps")
        check(state["rung"] > state["footstep"], "native platformer climbing produces rung sounds")
        check(abs(state["before"]["gains"]["music"] - 0.1) < 1e-6, "native music default synchronized")
        check(state["before"]["counts"]["voice"] == 4, "event ID deduplicates voice")
        check(state["muted"]["gains"]["master"] == 0, "native mute applied")
        check(abs(state["paused"]["gains"]["music"] - .07) < 1e-6, "pause ducks native music")
        check(state["disposed"]["nodes"] == 0 and state["disposed"]["gains"]["master"] == 0, "dispose stops nodes and output")
        check(state["disposed"]["counts"] == state["paused"]["counts"], "no scheduling after dispose")
        inputs = page.evaluate("""() => {
            const i=testGame.input; testInput.menu=false;
            const advance=()=>{i.tick(1/120);testInput.update(1/120);return testInput.intent(1)};
            i.press('KeyD');i.press('Space');i.press('KeyJ');i.press('KeyQ');i.press('KeyE');
            const first=advance(), second=advance(); i.release('Space'); const released=advance();
            testInput.clear();
            i.rebind('chop','keys','KeyF');i.press('KeyF');const rebound=advance();
            testInput.clear();testInput.menu=true;i.press('Enter');advance();
            i.release('Enter');advance();i.press('ArrowDown');advance();
            const labels={keyboard:testInput.label('chop')};
            testInput.device='pad';i.glyphs='playstation';labels.ps=testInput.label('jump');i.glyphs='xbox';labels.xbox=testInput.label('jump');
            return {first,second,released,rebound,labels,menu:inputEvents};
        }""")
        check(inputs["first"]["mx"] > 0 and inputs["first"]["jump"], "native movement and jump edge")
        check(inputs["first"]["chop"] and inputs["first"]["redirect"] and inputs["first"]["interact"], "canonical action edges")
        check(not inputs["second"]["jump"] and inputs["second"]["jumpHeld"], "jump edge versus held")
        check(not inputs["released"]["jumpHeld"], "variable jump release")
        check(inputs["rebound"]["chop"], "native rebinding drives canonical input")
        check(inputs["labels"]["keyboard"] == "F", "prompts honor bindings", inputs["labels"])
        check(inputs["labels"]["ps"] != inputs["labels"]["xbox"], "controller glyph selection")
        check(inputs["menu"] == ["accept", "down"], "menus route native actions once", inputs["menu"])
        join = page.evaluate("""() => {
            const pad={id:'DualSense local join',index:0,connected:true,mapping:'standard',timestamp:1,buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),axes:[0,0,0,0]};
            window.testPads=[pad];
            Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>testPads});
            testInput.clear();testInput.menu=false;testGame.input.lastDevice='keyboard';
            window.joined=[];testGame.allowJoin({max:2,keys:false,onJoin:(q,n)=>joined.push({n,pad:q.pad})});
            testGame.start({update:dt=>testInput.update(dt),draw:()=>{}});
            testGame.advance(1/120);
            pad.buttons[9]={pressed:true,value:1};
            testGame.advance(1/120);
            pad.buttons[9]={pressed:false,value:0};pad.axes[0]=-.8;
            testGame.input.press('KeyD');testGame.advance(1/120);
            const result={joined,p1:testInput.intent(1),p2:testInput.intent(2),claimed:[...testGame.input._claimed]};
            testGame.removePlayer(2);testGame.allowJoin(false);testInput.clear();
            return result;
        }""")
        check(join["joined"]==[{"n":2,"pad":0}],"keyboard plus single pad joins native seat two",join)
        check(join["p1"]["mx"]>0 and join["p2"]["mx"]<0 and join["claimed"]==[0],"joining preserves keyboard movement and pad ownership",join)
        pads = page.evaluate("""() => {
            const pad=(index)=>({id:'DualSense test '+index,index,connected:true,mapping:'standard',timestamp:1,buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),axes:[0,0,0,0]});
            window.testPads=[pad(0),pad(1)];
            Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>testPads});
            testInput.clear();testInput.menu=false;
            const q2=testGame.addPlayer({pad:1});
            testInput.update(1/120);
            testPads[0].axes[0]=.8;testPads[1].axes[0]=-.8;testPads[1].buttons[2]={pressed:true,value:1};
            testGame.input.tick(1/120);q2.tick(1/120);testInput.update(1/120);
            const one=testInput.intent(1),two=testInput.intent(2);
            return {one,two,p1:testGame.input.padIndex,p2:q2.padIndex};
        }""")
        check(pads["one"]["mx"] > 0 and pads["two"]["mx"] < 0, "pads own separate movement", pads)
        check(not pads["one"]["chop"] and pads["two"]["chop"], "partner action does not steal seat one", pads)
        page.evaluate("testInput.dispose();testGame.dispose()")
        page.close()
        touch_context=browser.new_context(viewport={"width":390,"height":844},has_touch=True,is_mobile=True)
        touch_page=touch_context.new_page()
        touch_page.goto((ROOT / "tests/audio-fixture.html").as_uri())
        touch_page.add_script_tag(path=str(ROOT / "vendor/engine/my-3d2dge.js"))
        touch_page.add_script_tag(path=str(ROOT / "src/input/input.js"))
        touch_page.evaluate("""() => {
            window.testGame=new My3D2dge.Game({canvas:'screen',res:[600,800],loop:false,autoPause:false,menu:false,fullscreen:false,corner:false,view:'side'});
            window.testInput=new PP.Input(testGame);testInput.menu=false;
        }""")
        rect=touch_page.locator("#screen").bounding_box()
        touch_page.touchscreen.tap(rect["x"]+rect["width"]*.8,rect["y"]+rect["height"]*.65)
        tapped=touch_page.evaluate("() => {testGame.input.tick(1/120);testInput.update(1/120);return testInput.intent(1)}")
        check(tapped["jump"],"actual touch tap jumps",tapped)
        cdp=touch_context.new_cdp_session(touch_page)
        x=rect["x"]+rect["width"]*.22
        y=rect["y"]+rect["height"]*.7
        right=rect["x"]+rect["width"]*.8
        points=[{"x":x,"y":y,"id":1},{"x":right,"y":y,"id":2}]
        cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":points})
        points[0]["x"]+=45;points[0]["y"]-=25
        cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":points})
        multitouch=touch_page.evaluate("() => {testGame.input.tick(1/120);testInput.update(1/120);return testInput.intent(1)}")
        check(multitouch["mx"]>.3 and multitouch["my"]<-.2 and multitouch["jumpHeld"],"multitouch move plus jump",multitouch)
        cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
        released=touch_page.evaluate("() => {testGame.input.tick(1/120);testInput.update(1/120);return testInput.intent(1)}")
        check(released["mx"]==0 and not released["jumpHeld"],"touch lift clears ownership",released)
        priorities=touch_page.evaluate("""() => {
            const sim={miners:[{id:1,hero:{x:100,z:16},tool:6,facing:1},{id:2,hero:{x:110,z:16},downed:true}],room:{doors:[{id:'gate',x:110,z:16,name:'LANTERN'}]},rocks:[{id:'ore',x:125,z:28}],keyOwner:1};
            testInput.setContext(sim);testInput.update(1/120);
            const rescue=testInput.contextTarget.kind;
            sim.miners[1].downed=false;testInput.update(1/120);
            const door=testInput.contextTarget.kind;
            sim.room.doors=[];testInput.update(1/120);
            const redirect=testInput.contextTarget.kind;
            return {rescue,door,redirect};
        }""")
        check(priorities=={"rescue":"rescue","door":"door","redirect":"redirect"},"touch context rescue-door-redirect order",priorities)
        touch_page.evaluate("testInput.dispose();testGame.dispose()")
        touch_context.close()
        browser.close()
    for passed, name, detail in CHECKS:
        if not passed:
            print(f"FAIL {name}: {json.dumps(detail)}", file=sys.stderr)
    print(f"{sum(x[0] for x in CHECKS)}/{len(CHECKS)} audio/input checks passed")
    return all(x[0] for x in CHECKS)


if __name__ == "__main__":
    raise SystemExit(0 if run() else 1)
