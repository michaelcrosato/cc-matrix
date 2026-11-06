"""Final-file input, presentation, lifecycle, audio and persistence checks."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
IDENTITY = json.loads((DEV / "identity.json").read_text())
URL = (DEV.parent / (IDENTITY["slug"] + ".html")).as_uri()
failures, count, evidence = [], 0, {}


def check(name, fn):
    global count
    count += 1
    try:
        value = fn()
        if value is False:
            raise AssertionError("condition was false")
    except Exception as error:  # noqa: BLE001 - report each independent test failure
        failures.append(f"{name}: {error}")


def require(condition, message="condition was false"):
    if not condition:
        raise AssertionError(message)


PAD_STUB = """window.__pads=[];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__pads});window.makePad=(index=0)=>({id:'DualSense Wireless Controller',index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),timestamp:1});"""
DRIVER = """window.driveCampaign=(untilFloor=6)=>{
  const a=__TSS,g=__game,I=g.input;g.stop();a.testBot ||= new TSS.Bot(a.sim);
  const dirs=['up','right','down','left'];let n=0;
  for(;n<120*1200&&!a.sim.state.terminal;n++){
    if(a.sim.state.floor>=untilFloor&&a.sim.state.phase==='play'&&a.sim.state.players.some(p=>p.carry))break;
    const intent=a.testBot.intents()[1]||{dir:-1};
    for(let d=0;d<4;d++)I.hold(dirs[d],intent.dir===d);
    I.hold('bomb',!!intent.bomb);I.hold('confirm',!!intent.confirm);
    g.advance(1/120,{draw:false});
  }
  for(const action of [...dirs,'bomb','confirm'])I.hold(action,false);
  g.advance(1/120,{draw:true});return {steps:n,state:a.sim.snapshot(),errors:g.errors};
};"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    context.add_init_script(PAD_STUB)
    page = context.new_page()
    errors, requests = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: requests.append(request.url))
    page.goto(URL)
    page.wait_for_selector('body[data-ready="true"]')
    page.evaluate("__game.stop()")
    check(
        "file export identity and successful native draw",
        lambda: require(
            page.evaluate("document.title") == IDENTITY["title"]
            and not page.evaluate("__game.errors")
        ),
    )
    check(
        "persistent default music is exactly 10 percent and glyphs PlayStation",
        lambda: require(
            page.evaluate(
                '__game.settings.music===.1 && __game.audio.musicVolume===.1 && __game.settings.glyphs==="playstation"'
            )
        ),
    )
    page.wait_for_timeout(350)
    page.screenshot(path=str(DEV / "build/title-final.png"))

    def key(code):
        page.keyboard.down(code)
        page.evaluate("__game.advance(.03,{draw:false})")
        page.keyboard.up(code)
        page.evaluate("__game.advance(.03,{draw:false})")

    key("ArrowDown")
    check(
        "native keyboard menu focus advances",
        lambda: require(
            "TOGETHER" in page.evaluate("document.activeElement.textContent").upper()
        ),
    )
    key("ArrowUp")
    key("Enter")
    check(
        "title confirm starts a clean ordinary run",
        lambda: require(
            page.evaluate(
                '__game.sceneName==="play" && !__TSS.sim.state.practice && !__TSS.sim.state.demo'
            )
        ),
    )
    key("Enter")
    page.evaluate(DRIVER)
    partial = page.evaluate("driveCampaign(4)")
    check(
        "native input-driven full-file campaign reaches intense roof with passenger",
        lambda: require(
            partial["state"]["floor"] == 4
            and any(p["carry"] for p in partial["state"]["players"]),
            json.dumps(partial["state"]["metrics"]),
        ),
    )
    page.screenshot(path=str(DEV / "build/roof-carry-final.png"))
    result = page.evaluate("driveCampaign()")
    evidence["ordinaryCampaign"] = {
        k: result["state"][k]
        for k in [
            "phase",
            "floor",
            "score",
            "lives",
            "totalRescued",
            "time",
            "metrics",
            "practice",
            "assisted",
            "demo",
        ]
    }
    check(
        "ordinary complete final export campaign wins all 26 rescues",
        lambda: require(
            result["state"]["phase"] == "won" and result["state"]["totalRescued"] == 26,
            json.dumps(evidence["ordinaryCampaign"]),
        ),
    )
    check(
        "campaign exercises bombs refill escalation detection recovery and hits",
        lambda: require(
            all(
                result["state"]["metrics"][k] > 0
                for k in [
                    "bombs",
                    "stuns",
                    "supplies",
                    "detects",
                    "escalations",
                    "hits",
                    "decoys",
                    "redTicks",
                ]
            )
        ),
    )
    check(
        "campaign stays ranked with finite production lives",
        lambda: require(
            result["state"]["lives"] > 0
            and not result["state"]["practice"]
            and not result["state"]["demo"]
        ),
    )
    check(
        "complete native result screen and persistent solo best",
        lambda: require(
            page.evaluate(
                '__TSS.ui.shell.screen==="results" && My3D2dge.store.get("tss:best:solo",0)===__TSS.sim.state.score'
            )
        ),
    )
    page.wait_for_timeout(350)
    page.screenshot(path=str(DEV / "build/results-final.png"))
    page.get_by_role("button", name="Close", exact=True).click()
    page.evaluate("__game.advance(.05,{draw:false})")
    check(
        "closing results returns to a usable title rather than a terminal playfield",
        lambda: require(
            page.evaluate('__game.sceneName==="title"&&__TSS.ui.shell.screen==="title"')
        ),
    )
    page.evaluate("__TSS.ui.result()")
    page.get_by_role("button", name="Another shift", exact=True).click()
    page.evaluate("__game.advance(.05,{draw:false})")
    check(
        "retry resets objectives lives stock score and transient overrides",
        lambda: require(
            page.evaluate(
                "__TSS.sim.state.totalRescued===0&&__TSS.sim.state.lives===3&&__TSS.sim.state.stock===3&&__TSS.sim.state.score===0&&!__TSS.sim.state.practice"
            )
        ),
    )
    key("Enter")
    key("Escape")
    page.evaluate("__game.advance(.03,{draw:true})")
    check(
        "pause opens native screen and freezes standalone simulation",
        lambda: require(
            page.evaluate(
                '(()=>{let t=__TSS.sim.state.tick;__game.advance(.5,{draw:false});return __game.paused&&__TSS.ui.shell.screen==="pause"&&__TSS.sim.state.tick===t})()'
            )
        ),
    )
    page.get_by_role("button", name="Developer tools", exact=True).click()
    check(
        "developer sliders are absent from ordinary settings catalogue",
        lambda: require(
            page.evaluate(
                '(()=>{__TSS.ui.shell.show("settings");let absent=!__TSS.ui.shell.root.textContent.includes("Player Speed");__TSS.ui.shell.back();return absent})()'
            )
        ),
    )
    page.get_by_role("button", name="Next page", exact=True).click()
    page.get_by_role("slider", name="Player Speed", exact=True).evaluate(
        "e=>{e.value='5';e.dispatchEvent(new Event('input',{bubbles:true}))}"
    )
    check(
        "live developer slider updates actual balance and practice status",
        lambda: require(
            page.evaluate(
                "__TSS.sim.state.balance.playerSpeed===5&&__TSS.sim.state.practice"
            )
        ),
    )
    page.get_by_role("button", name="Reset balance defaults", exact=True).click()
    check(
        "developer reset restores production defaults without music/glyph changes",
        lambda: require(
            page.evaluate(
                '__TSS.sim.state.balance.playerSpeed===3.5&&__game.settings.music===.1&&__game.settings.glyphs==="playstation"'
            )
        ),
    )
    page.get_by_role("button", name="Next page", exact=True).click()
    page.get_by_role("button", name="Reveal room data: OFF", exact=True).click()
    page.get_by_role(
        "button", name="Graph / sight / collision: OFF", exact=True
    ).click()
    check(
        "developer reveal and graph tools change real inspector state",
        lambda: require(
            page.evaluate("__TSS.sim.state.dev.reveal&&__TSS.sim.state.dev.overlays")
        ),
    )
    page.get_by_role("button", name="Back", exact=True).last.click()
    page.get_by_role("button", name="About this hotel", exact=True).click()
    check(
        "source information is in native About",
        lambda: require(
            "Source Information" in page.get_by_role("dialog").inner_text()
        ),
    )
    about = []
    for _ in range(15):
        about.append(page.get_by_role("dialog").inner_text())
        nxt = page.get_by_role("button", name="Next page", exact=True)
        if not nxt.count():
            break
        nxt.click()
    check(
        "all feedback and source fields accessible through About pages",
        lambda: require(
            all(
                v.lower() in "\n".join(about).lower()
                for v in [
                    "Testing Feedback",
                    "Engine Feedback",
                    "Prompt Feedback",
                    "Usage",
                    "added on import",
                    "Model",
                    "Plan",
                ]
            )
        ),
    )
    page.evaluate(
        "__TSS.ui.shell.hide();__TSS.toTitle();__game.advance(.05,{draw:false})"
    )

    def pad(index):
        page.evaluate(
            "(i)=>{__pads[0] ||= makePad();__pads[0].buttons[i]={pressed:true,value:1};__pads[0].timestamp++}",
            index,
        )
        page.evaluate("__game.advance(.03,{draw:false})")
        page.evaluate(
            "(i)=>{__pads[0].buttons[i]={pressed:false,value:0};__pads[0].timestamp++}",
            index,
        )
        page.evaluate("__game.advance(.03,{draw:false})")

    pad(13)
    check(
        "emulated standard gamepad navigates native menus with PS prompts",
        lambda: require(
            page.evaluate(
                '__game.input.lastDevice==="gamepad"&&__game.input.label("bomb")==="✕"'
            )
            and "TOGETHER"
            in page.evaluate("document.activeElement.textContent").upper()
        ),
    )
    pad(13)
    pad(13)
    pad(0)
    check(
        "gamepad reaches native settings",
        lambda: require(page.evaluate('__TSS.ui.shell.screen==="settings"')),
    )
    # Native control settings remain editable with left/right, not mouse-only.
    page.evaluate('__TSS.ui.shell.show("controls")')
    page.get_by_role("button", name="Button symbols: PlayStation", exact=True).focus()
    pad(14)
    check(
        "controller glyph setting changes through left/right navigation",
        lambda: require(
            page.evaluate(
                '__game.settings.glyphs==="xbox" && __game.input.label("bomb")==="A"'
            )
        ),
    )
    page.evaluate(
        '__game.settings.set("glyphs","playstation");__TSS.ui.shell.hide();__TSS.start("pads");__game.advance(.05,{draw:false});__TSS.sim.step(1/120,{1:{confirm:true}})'
    )
    page.evaluate(
        "__pads[0]=makePad(0);__pads[1]=makePad(1);__pads[0].axes[0]=-1;__pads[1].axes[1]=-1;__game.advance(.2,{draw:false})"
    )
    check(
        "two independently assigned pads move both seats simultaneously",
        lambda: require(
            page.evaluate(
                "__TSS.sim.state.players[0].vx!==0&&__TSS.sim.state.players[1].vy!==0"
            )
        ),
    )
    page.evaluate("__pads[1].connected=false;__game.advance(.03,{draw:false})")
    check(
        "controller unplug creates usable recovery pause",
        lambda: require(page.evaluate("__game.paused")),
    )
    page.evaluate(
        '__pads=[];__TSS.ui.shell.hide();__TSS.start("shared");__game.advance(.05,{draw:false})'
    )
    key("Enter")
    page.keyboard.down("a")
    page.keyboard.down("ArrowUp")
    page.evaluate("__game.advance(.2,{draw:false})")
    page.keyboard.up("a")
    page.keyboard.up("ArrowUp")
    check(
        "shared keyboard drives separate seats without accidental mirroring",
        lambda: require(
            page.evaluate(
                "__TSS.sim.state.players[0].vx!==0&&__TSS.sim.state.players[1].vy!==0"
            )
        ),
    )
    page.evaluate('__TSS.start("solo");__game.advance(.05,{draw:false})')
    key("Enter")
    # Mouse routing uses actual projected tile click; the route remains graph-bound.
    route = page.evaluate(
        "(()=>{const a=__TSS,p=a.sim.state.players[0],r=a.sim.state.rooms[0],v=__game.r.w(r.x,r.y,0),rect=__game.screen.canvas.getBoundingClientRect();return [rect.left+v[0]/__game.W*rect.width,rect.top+v[1]/__game.H*rect.height]})()"
    )
    page.mouse.click(*route)
    page.evaluate("__game.advance(1.6,{draw:false})")
    check(
        "mouse click routing picks up instructional passenger through corridors",
        lambda: require(page.evaluate("!!__TSS.sim.state.players[0].carry")),
    )
    page.keyboard.down("d")
    page.evaluate("__game.advance(.04,{draw:false})")
    page.keyboard.up("d")
    check(
        "manual movement cancels mouse route",
        lambda: require(page.evaluate("!__TSS.controls.routes[1]")),
    )

    # Actual generated audio: route native music/SFX/voice buses into OfflineAudioContext.
    audio = page.evaluate("""async()=>{
      const c=new OfflineAudioContext(1,48000,48000),a=__game.audio;
      a.stopMusic();const old=a.ctx;a.ctx=c;const master=c.createGain(),sfx=c.createGain(),mus=c.createGain(),voice=c.createGain();
      master.connect(c.destination);for(const b of [sfx,mus,voice])b.connect(master);
      a._master=master;a._sfxBus=sfx;a._musBus=mus;a._voiceBus=voice;a.applyVolume();
      TSS.audioSpec.vocal(c,voice,.01,600,.22,.2);
      a._voice(TSS.audioSpec.cues.bomb,sfx,.3,1,false);a._voice({wave:'triangle',freq:523,dur:.3,vol:.2},mus,.55,1,false);
      const b=await c.startRendering(),samples=b.getChannelData(0);let max=0,energy=0,finite=true;
      for(const v of samples){finite&&=Number.isFinite(v);max=Math.max(max,Math.abs(v));energy+=v*v;}
      const levels={music:mus.gain.value,sfx:sfx.gain.value,voice:voice.gain.value,master:master.gain.value};
      a.mute(true);const muted=master.gain.value===0;a.mute(false);a.ctx=old;if(old){a._master=old.createGain();a._master.connect(old.destination);a._sfxBus=old.createGain();a._musBus=old.createGain();a._voiceBus=old.createGain();for(const bus of [a._sfxBus,a._musBus,a._voiceBus])bus.connect(a._master);a.applyVolume();}
      return {finite,max,rms:Math.sqrt(energy/samples.length),levels,muted};
    }""")
    evidence["audio"] = audio
    check(
        "real procedural voice SFX music yield finite useful audio signal",
        lambda: require(
            audio["finite"] and 0.001 < audio["rms"] < 0.4 and audio["max"] < 1
        ),
    )
    check(
        "separate native buses and actual master mute",
        lambda: require(
            abs(audio["levels"]["music"] - 0.1) < 1e-5
            and audio["levels"]["sfx"] == 1
            and abs(audio["levels"]["voice"] - 0.7) < 1e-5
            and audio["muted"]
        ),
    )
    check(
        "gesture unlock created a running browser audio context",
        lambda: require(page.evaluate('__game.audio.ctx?.state==="running"')),
    )
    check(
        "round-end cleanup cancels tracked sound sources and mutes immediately",
        lambda: require(
            page.evaluate(
                '(()=>{const s=__TSS.sound;s.events([{kind:"pickup",id:"audio-test"}]);s.stop();const stopped=!s.handles.length&&!s.voices.length&&__game.audio.muted&&!__game.audio.song;__game.audio.mute(false);return stopped})()'
            )
        ),
    )

    page.evaluate(
        "__TSS.toTitle();__game.advance(.05,{draw:false});__TSS.arcade.wake()"
    )
    page.evaluate("__game.advance(9.8,{draw:false})")
    check(
        "attract waits the full ten seconds",
        lambda: require(page.evaluate("!__TSS.demo")),
    )
    page.evaluate("__game.advance(.3,{draw:false})")
    check(
        "native attract starts after ten idle seconds",
        lambda: require(page.evaluate("__TSS.demo&&__TSS.sim.state.demo")),
    )
    demo = page.evaluate(
        """()=>{const a=__TSS,g=__game,run=a.sim.state.runId,floors=new Set(),events=new Set(),best=My3D2dge.store.get('tss:best:solo',0);let ending=false,loop=false;for(let i=0;i<120*700;i++){g.advance(1/120,{draw:false});floors.add(a.sim.state.floor);for(const e of a.sim.events)events.add(e.kind);ending ||= a.sim.state.phase==='celebrate'||a.sim.state.phase==='won';if(a.sim.state.runId!==run){loop=true;break;}}return {floors:[...floors],events:[...events],ending,loop,clean:My3D2dge.store.get('tss:best:solo',0)===best,demo:a.demo};}"""
    )
    evidence["attract"] = demo
    check(
        "attract demonstrates complete rescue campaign and ending then loops",
        lambda: require(
            len(demo["floors"]) == 5
            and demo["ending"]
            and demo["loop"]
            and all(
                k in demo["events"]
                for k in [
                    "pickup",
                    "deliver",
                    "bomb",
                    "trigger",
                    "supply",
                    "escalate",
                    "win",
                ]
            )
        ),
    )
    check(
        "attract never contaminates ordinary records",
        lambda: require(demo["clean"] and demo["demo"]),
    )
    page.keyboard.press("q")
    page.evaluate("__game.advance(.04,{draw:false})")
    check(
        "unmapped key exits attract and is consumed",
        lambda: require(
            page.evaluate(
                '!__TSS.demo&&__game.sceneName==="title"&&__TSS.ui.shell.screen==="title"'
            )
        ),
    )
    page.evaluate("__game.advance(10.2,{draw:false})")
    page.mouse.click(150, 200)
    page.evaluate("__game.advance(.04,{draw:false})")
    check(
        "mouse exits attract without starting a run",
        lambda: require(page.evaluate('!__TSS.demo&&__game.sceneName==="title"')),
    )
    page.evaluate("__game.advance(10.2,{draw:false})")
    pad(0)
    check(
        "gamepad exits attract and consumes its confirm press",
        lambda: require(page.evaluate('!__TSS.demo&&__game.sceneName==="title"')),
    )
    page.evaluate(
        "__pads[0].axes[0]=.09;__TSS.arcade.wake();__game.advance(10.2,{draw:false})"
    )
    check(
        "controller axis noise does not reset attract idle threshold",
        lambda: require(page.evaluate("__TSS.demo")),
    )
    page.evaluate(
        '__TSS.toTitle();__game.advance(.03,{draw:false});__game.settings.set("voice",.35)'
    )
    check(
        "final file makes no runtime dependency fetches",
        lambda: require(
            all(url.startswith(("file:", "data:")) for url in requests), str(requests)
        ),
    )
    check(
        "no browser or native update/draw errors",
        lambda: require(not errors and not page.evaluate("__game.errors"), str(errors)),
    )
    page.close()
    persisted = context.new_page()
    persisted.goto(URL)
    persisted.wait_for_selector('body[data-ready="true"]')
    check(
        "settings and ordinary local best survive page reload",
        lambda: require(
            persisted.evaluate(
                '__game.settings.voice===.35&&My3D2dge.store.get("tss:best:solo",0)>0'
            )
        ),
    )
    context.close()

    # Touch-only portrait and WebKit stand-in; two browser processes never overlap.
    phone = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    p = phone.new_page()
    p.goto(URL)
    p.wait_for_selector('body[data-ready="true"]')
    p.wait_for_timeout(350)
    p.screenshot(path=str(DEV / "build/phone-title-final.png"))
    p.get_by_role("button", name="Check in · Solo", exact=True).tap()
    p.wait_for_timeout(100)
    p.evaluate("__game.stop();__game.advance(2.5,{draw:false})")
    # Native invisible stick with actual multitouch feed; POP is a separate native action pointer.
    cdp = phone.new_cdp_session(p)
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchStart", "touchPoints": [{"x": 260, "y": 570, "id": 1}]},
    )
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchMove", "touchPoints": [{"x": 195, "y": 570, "id": 1}]},
    )
    p.evaluate("__game.advance(1.2,{draw:false})")
    moving = p.evaluate("__TSS.sim.state.players[0].vx<0")
    carried = p.evaluate("!!__TSS.sim.state.players[0].carry")
    # Native multitouch: the second action finger must not interrupt the drag finger.
    p.evaluate('__game.input.touchSet("bomb","POP",true)')
    pop = p.locator('[data-act="bomb"]').bounding_box()
    cdp.send(
        "Input.dispatchTouchEvent",
        {
            "type": "touchStart",
            "touchPoints": [
                {"x": 195, "y": 570, "id": 1},
                {
                    "x": pop["x"] + pop["width"] / 2,
                    "y": pop["y"] + pop["height"] / 2,
                    "id": 2,
                },
            ],
        },
    )
    p.evaluate("__game.advance(.02,{draw:false})")
    second = p.evaluate("__game.input.stickOn")
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchEnd", "touchPoints": [{"x": 195, "y": 570, "id": 1}]},
    )
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    p.evaluate("__game.advance(.02,{draw:true})")
    touch = p.evaluate(
        '({assisted:__TSS.sim.state.assisted,bombs:__TSS.sim.state.metrics.bombs,errors:__game.errors,hidden:!__game.input._stickEl||__game.input._stickEl.style.display==="none"})'
    )
    touch.update(moving=moving, carried=carried, second=second)
    check(
        "touch drag moves with invisible four-way native stick",
        lambda: require(touch["moving"] and touch["hidden"]),
    )
    check(
        "touch contextual action and assisted status use actual simulation",
        lambda: require(
            touch["carried"]
            and touch["second"]
            and touch["bombs"] > 0
            and touch["assisted"]
            and not touch["errors"]
        ),
    )
    p.screenshot(path=str(DEV / "build/phone-play-final.png"))
    contextual = p.evaluate("""()=>{
      const a=__TSS,g=__game,I=g.input,bot=new TSS.Bot(a.sim),dirs=['up','right','down','left'];
      let found=false;
      for(let n=0;n<120*180&&!a.sim.state.terminal;n++){
        const s=a.sim.state,p=s.players[0];
        if(s.phase==='play'&&!s.bomb&&s.stock>0&&s.enemies.some(e=>e.stun<=0&&e.emerge<=0&&Math.hypot(e.x-p.x,e.y-p.y)<35)){found=true;break;}
        const intent=bot.intents()[1]||{dir:-1};
        for(let d=0;d<4;d++)I.hold(dirs[d],intent.dir===d);
        I.hold('bomb',!!intent.bomb);I.hold('confirm',!!intent.confirm);g.advance(1/120,{draw:false});
      }
      for(const action of [...dirs,'bomb','confirm'])I.hold(action,false);
      I.lastDevice='touch';g.advance(1/120,{draw:true});
      return {found,visible:!!I._touchBtns?.bomb&&I._touchBtns.bomb.style.display!=='none',errors:g.errors};
    }""")
    check(
        "touch POP appears naturally during a legal approach to danger",
        lambda: require(
            contextual["found"] and contextual["visible"] and not contextual["errors"]
        ),
    )
    p.screenshot(path=str(DEV / "build/phone-pop-final.png"))
    p.evaluate(
        "__TSS.toTitle();__game.advance(.03,{draw:false});__TSS.arcade.wake();__game.advance(10.2,{draw:false})"
    )
    p.touchscreen.tap(90, 380)
    p.evaluate("__game.advance(.03,{draw:false})")
    check(
        "touch exits attract without activating a title choice",
        lambda: require(p.evaluate('!__TSS.demo&&__game.sceneName==="title"')),
    )
    phone.close()
    tablet = browser.new_context(
        viewport={"width": 1024, "height": 768}, has_touch=True, is_mobile=True
    )
    tp = tablet.new_page()
    tp.goto(URL)
    tp.wait_for_selector('body[data-ready="true"]')
    tp.get_by_role("button", name="Check in · Solo", exact=True).tap()
    tp.evaluate(
        '__game.stop();__game.advance(2.5,{draw:false});__game.input.hold("left");__game.advance(1.2,{draw:false});__game.input.hold("left",false);__game.advance(.01,{draw:true})'
    )
    tp.screenshot(path=str(DEV / "build/tablet-carry-final.png"))
    check(
        "tablet composition shows full floor and visible passenger without draw errors",
        lambda: require(
            tp.evaluate("!!__TSS.sim.state.players[0].carry&&!__game.errors.length")
        ),
    )
    tablet.close()
    browser.close()
    webkit = pw.webkit.launch(headless=True)
    wc = webkit.new_context(
        viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True
    )
    wp = wc.new_page()
    wp.goto(URL)
    wp.wait_for_selector('body[data-ready="true"]')
    wp.get_by_role("button", name="Check in · Solo", exact=True).tap()
    wp.wait_for_timeout(150)
    check(
        "WebKit phone stand-in loads and starts exact export",
        lambda: require(
            wp.evaluate('__game.sceneName==="play"&&!__game.errors.length')
        ),
    )
    wc.close()
    webkit.close()

    denied = pw.chromium.launch(headless=True)
    dc = denied.new_context()
    dc.add_init_script(
        "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage denied','SecurityError')}})"
    )
    dp = dc.new_page()
    dp.goto(URL)
    dp.wait_for_selector('body[data-ready="true"]')
    dp.get_by_role("button", name="Check in · Solo", exact=True).click()
    dp.wait_for_timeout(100)
    check(
        "denied storage degrades safely to a playable game",
        lambda: require(
            dp.evaluate('__game.sceneName==="play"&&!__game.errors.length')
        ),
    )
    dc.close()
    denied.close()

(DEV / "build/browser-evidence.json").write_text(json.dumps(evidence, indent=2))
for failure in failures:
    print(failure)
print(f"{count - len(failures)}/{count} browser checks passed")
raise SystemExit(bool(failures))
