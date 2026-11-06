"""Real packaged-artifact checks; stdout is a JSON test report consumed by verify.mjs."""

import functools
import http.server
import json
import sys
import threading
import traceback
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ARTIFACT = ROOT.parent / (ROOT.name + ".html")
RESULTS = []
PAD_SCRIPT = """window.testPads=[{id:'DualSense standard test pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0}];navigator.getGamepads=()=>window.testPads;"""


def check(name, fn):
    try:
        detail = fn()
        RESULTS.append({"name": name, "pass": True, "detail": detail or ""})
    except Exception:  # noqa: BLE001 - report every test/tool failure with its traceback
        RESULTS.append({"name": name, "pass": False, "error": traceback.format_exc()})


def need(value, message):
    if not value:
        raise AssertionError(message)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def boot(page):
    page.goto(ARTIFACT.as_uri())
    page.wait_for_function(
        'window.__fortnight && window.__game && __fortnight.ui.shell.screen === "title"'
    )


def solo(page):
    page.evaluate("__fortnight.title()")
    page.wait_for_timeout(40)
    page.wait_for_function("performance.now()>(__fortnight.blockInputUntil||0)")
    page.locator(".esh-ttl button").first.click()
    page.wait_for_function('__fortnight.world && __game.sceneName === "play"')
    page.evaluate("__game.debug.advance(4,{draw:false})")


def press_pad(page, index, pad=0, milliseconds=110):
    page.evaluate(
        "([p,b])=>{testPads[p].buttons[b]={pressed:true,touched:true,value:1};}",
        [pad, index],
    )
    page.wait_for_function(
        "([p,b])=>__game.players.some(i=>i.padIndex===p && i.padPrev[b]===true)",
        arg=[pad, index],
        timeout=4000,
    )
    page.wait_for_timeout(25)
    page.evaluate(
        "([p,b])=>{testPads[p].buttons[b]={pressed:false,touched:false,value:0};}",
        [pad, index],
    )
    page.wait_for_function(
        "([p,b])=>__game.players.some(i=>i.padIndex===p && i.padPrev[b]===false)",
        arg=[pad, index],
        timeout=4000,
    )
    page.wait_for_timeout(20)


def focus_pad(page, label, pad=0):
    for _ in range(45):
        current = page.evaluate(
            'document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || ""'
        )
        if label.lower() in current.lower():
            return
        press_pad(page, 13, pad)
    raise AssertionError("Pad could not reach " + label)


def browser_suite(pw):
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()
    page.set_default_timeout(4500)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    boot(page)

    def packaging():
        html = ARTIFACT.read_text()
        client = (ROOT / "vendor/hub/lib/hub/session.js").read_text()
        need(
            '<meta charset="utf-8">\n<script>' + client + "</script>" in html,
            "Client is not exact and first after charset",
        )
        need(
            "<script src=" not in html and 'type="module"' not in html,
            "Local/external script dependency",
        )
        info = json.loads((ROOT.parent / "exit-interview.json").read_text())
        need(
            info == page.evaluate("Fortnight.ABOUT"),
            "Credits and exit interview differ",
        )
        need(page.evaluate("My3D2dge.version") == "0.89.1", "Wrong engine version")
        need(page.evaluate("AIHub.active") is False, "Standalone entered Hub")
        need(
            page.evaluate(
                "__game.W===960 && __game.H===540 && __game.o.expand===false"
            ),
            "Expanding arena",
        )
        need(not errors and not page.evaluate("__game.errors"), "Boot errors")
        box = page.locator(".esh-ttl .esh-btns").bounding_box()
        need(
            box["x"] < 300 and box["y"] > 560 and box["y"] + box["height"] < 1040,
            "Title focus/menu is outside intended safe area",
        )
        page.screenshot(path=str(ROOT / "evidence/title.png"))

    check(
        "single HTML, exact released Hub client, native engine, metadata and title framing",
        packaging,
    )

    def keyboard_mouse():
        solo(page)
        before = page.evaluate("__fortnight.world.s.players[0].y")
        page.keyboard.down("w")
        page.wait_for_timeout(170)
        page.keyboard.up("w")
        need(
            page.evaluate("__fortnight.world.s.players[0].y") < before - 2,
            "W did not thrust",
        )
        page.mouse.move(1660, 440)
        page.keyboard.down("d")
        page.mouse.down()
        page.wait_for_timeout(220)
        state = page.evaluate(
            '({p:__fortnight.world.s.players[0],shots:__fortnight.world.s.events.filter(e=>e.type==="shot").length})'
        )
        page.mouse.up()
        page.keyboard.up("d")
        need(
            state["shots"] > 0 and abs(state["p"]["a"]) < 1.2,
            "Mouse did not aim and fire while keys moved",
        )
        page.mouse.click(900, 600, button="right")
        page.wait_for_timeout(70)
        need(
            page.evaluate("__fortnight.world.s.players[0].pulse") > 0,
            "Right click did not pulse",
        )
        page.set_viewport_size({"width": 1280, "height": 720})
        page.mouse.move(960, 330)
        page.wait_for_timeout(60)
        need(
            page.evaluate("__game.W===960&&__game.H===540"),
            "Resize changed gameplay bounds",
        )
        page.set_viewport_size({"width": 1920, "height": 1080})

    check(
        "real keyboard thrust, simultaneous mouse aim/fire, pulse and resize mapping",
        keyboard_mouse,
    )

    def pause_dev():
        page.keyboard.press("Escape")
        page.wait_for_function('__fortnight.ui.shell.screen==="pause"')
        tick = page.evaluate("__fortnight.world.s.tick")
        page.wait_for_timeout(120)
        need(
            tick == page.evaluate("__fortnight.world.s.tick"),
            "Standalone pause did not freeze",
        )
        page.get_by_role("button", name="Dev mode", exact=True).click()
        page.get_by_role("button", name="Tune Viper systems", exact=True).click()
        slider = page.get_by_role("slider", name="Thrust", exact=True)
        slider.fill("800")
        slider.dispatch_event("input")
        need(
            page.evaluate("__fortnight.world.s.balance.thrust") == 800,
            "Live slider did not apply",
        )
        page.get_by_role("button", name="Reset to defaults", exact=True).click()
        need(
            page.evaluate("__fortnight.world.s.balance.thrust") == 620,
            "Tuning reset failed",
        )
        page.screenshot(path=str(ROOT / "evidence/dev.png"))
        page.locator(".esh-btns").get_by_role("button", name="Back", exact=True).click()
        page.get_by_role("button", name="Single simulation step", exact=True).click()
        need(
            page.evaluate("__fortnight.world.s.tick") == tick + 1,
            "Single step advanced wrong number of ticks",
        )
        page.get_by_role("button", name="Encounter preview", exact=True).click()
        page.get_by_role("button", name="Jump to boss phase", exact=True).click()
        need(
            page.evaluate(
                "__fortnight.world.s.act===2&&__fortnight.world.s.boss.phase===0&&!__game.paused"
            ),
            "Boss preview failed",
        )
        need(
            page.evaluate("__fortnight.world.s.modified"), "Dev run not marked modified"
        )

    check(
        "pause freeze, live tuning/reset, single step and encounter preview", pause_dev
    )

    def settings_rebind():
        solo(page)
        page.keyboard.press("Escape")
        page.wait_for_function('__fortnight.ui.shell.screen==="pause"')
        page.get_by_role("button", name="Settings", exact=True).click()
        need(
            page.evaluate("__game.settings.music") == 0.1,
            "New music default is not 10%",
        )
        slider = page.get_by_role("slider", name="Radio voice", exact=True)
        slider.fill("0.4")
        slider.dispatch_event("input")
        page.locator(".esh-btns").get_by_role("button", name="Back", exact=True).click()
        page.get_by_role("button", name="Controls", exact=True).click()
        bind = page.locator('button[aria-label^="Laser, keyboard:"]')
        need(bind.count() == 1, "Native Laser rebinding row missing")
        bind.click()
        page.keyboard.press("r")
        page.wait_for_timeout(60)
        need(
            page.evaluate('__game.input.map.fire.includes("KeyR")'),
            "Rebinding did not update action",
        )
        need(
            page.evaluate('__game.input.label("fire","keyboard")') == "R",
            "Rebinding label stale",
        )
        page.reload()
        page.wait_for_function("window.__fortnight")
        need(page.evaluate("__game.settings.voice") == 0.4, "Settings did not persist")
        need(
            page.evaluate('__game.input.map.fire.includes("KeyR")'),
            "Bindings did not persist",
        )
        page.evaluate("__game.input.resetBindings()")

    check(
        "default audio, separate voice setting, native rebinding and local persistence",
        settings_rebind,
    )

    def credits_and_hover():
        page.evaluate("__fortnight.title()")
        page.wait_for_timeout(60)
        page.get_by_role("button", name="About / Credits", exact=True).hover()
        need(
            "About" in page.locator(":focus").text_content(),
            "Hover did not transfer focus",
        )
        page.keyboard.press("Enter")
        page.wait_for_function('__fortnight.ui.shell.screen==="about"')
        for label in [
            "Source Information",
            "Testing Feedback",
            "Engine Feedback",
            "Prompt Feedback",
        ]:
            page.get_by_role("button", name=label, exact=True).click()
            need(
                page.locator(".esh-mod h2").inner_text().lower() == label.lower(),
                "Credits section title wrong",
            )
            need(
                len(page.locator(".esh-mod").inner_text()) > 90, "Credits section empty"
            )
            if label == "Source Information":
                page.wait_for_timeout(280)
                page.screenshot(path=str(ROOT / "evidence/credits.png"))
            page.get_by_role("button", name="Credits index", exact=True).click()
        page.keyboard.press("Escape")
        page.wait_for_function('__fortnight.ui.shell.screen==="title"')
        need(
            page.evaluate("__fortnight.ui.shell.screen") == "title",
            "Credits cannot return",
        )

    check(
        "hover focus, keyboard activation and all factual credits pages",
        credits_and_hover,
    )

    def results_retry():
        solo(page)
        page.evaluate("__game.debug.advance(750,{bot:true,draw:false})")
        page.wait_for_function(
            '__fortnight.world.s.result && __fortnight.ui.shell.screen==="results"'
        )
        need(
            page.evaluate("__fortnight.world.s.result.won"),
            "Packaged no-cheat run did not win",
        )
        need(
            page.evaluate("__fortnight.world.s.seen.length") == 8,
            "Packaged run missed a threat",
        )
        page.screenshot(path=str(ROOT / "evidence/victory.png"))
        old = page.evaluate("__fortnight.world.s.epoch")
        page.get_by_role("button", name="Fly again", exact=True).click()
        need(
            page.evaluate("__fortnight.world.s.epoch") > old,
            "Retry epoch did not change",
        )
        need(
            page.evaluate(
                "__fortnight.world.s.score===0&&__fortnight.world.s.enemies.length===0&&__fortnight.world.s.shots.length===0"
            ),
            "Retry leaked old gameplay",
        )
        page.evaluate("__fortnight.title()")

    check(
        "packaged no-cheat full win, rank, clean retry and title return", results_retry
    )

    def attract():
        page.evaluate(
            "__fortnight.input.lastActivity=performance.now()-9990;__fortnight.checkIdle()"
        )
        need(page.evaluate("__fortnight.attract") is False, "Attract started early")
        page.evaluate(
            "__fortnight.input.lastActivity=performance.now()-10000;__fortnight.checkIdle()"
        )
        need(page.evaluate("__fortnight.attract"), "Attract did not start at threshold")
        best = page.evaluate("__fortnight.best")
        states = page.evaluate(
            """()=>{const seen=[];for(const dt of [20,20,20,20,25,25,30]){__fortnight.update(dt);seen.push([__fortnight.world.s.act,__fortnight.world.s.boss?.phase??-1,__fortnight.attractAge]);}return seen;}"""
        )
        need({s[0] for s in states} == {0, 1, 2}, "Attract did not tour all acts")
        need(any(s[1] == 2 for s in states), "Attract did not show exposed core")
        need(states[-1][2] < 5, "Attract did not loop cleanly")
        page.keyboard.press("Enter")
        page.wait_for_timeout(100)
        need(
            page.evaluate(
                '__fortnight.mode==="title"&&!__fortnight.world&&!__fortnight.attract'
            ),
            "Attract exit leaked Enter into start",
        )
        need(page.evaluate("__fortnight.best") == best, "Attract polluted best score")
        page.evaluate(
            "__fortnight.blockInputUntil=0;__fortnight.input.lastActivity=performance.now()-10000;__fortnight.checkIdle()"
        )
        page.mouse.move(180, 220)
        page.wait_for_timeout(80)
        need(
            page.evaluate('__fortnight.mode==="title"&&!__fortnight.world'),
            "Pointer did not exit attract cleanly",
        )

    check(
        "10-second attract threshold, all-act tour, loop, exit consumption and score isolation",
        attract,
    )

    def defeat_retry():
        solo(page)
        page.evaluate("__game.debug.advance(800,{draw:false})")
        page.wait_for_function('__fortnight.ui.shell.screen==="results"')
        need(
            page.evaluate("__fortnight.world.s.result.won") is False,
            "Idle run did not lose",
        )
        page.screenshot(path=str(ROOT / "evidence/defeat.png"))
        page.get_by_role("button", name="Fly again", exact=True).click()
        page.wait_for_function('__fortnight.world.s.phase==="briefing"')
        need(
            page.evaluate("__fortnight.world.s.act===0&&__fortnight.world.s.score===0"),
            "Defeat retry was dirty",
        )

    check("packaged defeat and retry after both forced retreats", defeat_retry)

    def art_states():
        solo(page)
        for name, act, wave, phase in [
            ("gravity", 0, 2, None),
            ("fortress", 1, 1, None),
            ("ground", 2, 1, None),
            ("boss", 2, 2, 1),
        ]:
            page.evaluate(
                "([a,w,p])=>__game.debug.jump(a,w,p===null?undefined:p)",
                [act, wave, phase],
            )
            page.evaluate("__game.debug.advance(7,{bot:false})")
            page.screenshot(path=str(ROOT / f"evidence/{name}.png"))
            need(not page.evaluate("__game.errors"), "Native art draw error")

    check(
        "native custom art draws each act, gravity threat and boss without engine errors",
        art_states,
    )

    def audio_signals():
        report = page.evaluate("""async()=>{
          const channels={};
          for(const kind of ['music','effects','voice']){
            const off=new OfflineAudioContext(1,48000,48000),a=new __game.audio.constructor({headless:false,real:0,time:0},new AbortController().signal);
            a.ctx=off;a._master=off.createGain();a._master.gain.value=.7;a._master.connect(off.destination);
            a._sfxBus=off.createGain();a._musBus=off.createGain();a._voiceBus=off.createGain();for(const b of [a._sfxBus,a._musBus,a._voiceBus])b.connect(a._master);
            a._noise=off.createBuffer(1,48000,48000);const noise=a._noise.getChannelData(0);for(let i=0;i<noise.length;i++)noise[i]=Math.sin(i*12.12)*.8;
            a.musicVolume=.1;a.applyVolume();
            if(kind==='music'){let i=0;for(const note of Fortnight.SONGS.title.tracks[0].notes.split(/\\s+/).filter(n=>/^[A-G]/.test(n)).slice(0,8)){a._voice({wave:'triangle',freq:note,dur:.11,vol:.2},a._musBus,i++*.11);}}
            if(kind==='effects')a._voice(Fortnight.FX.laser,a._sfxBus,.1);
            if(kind==='voice')Fortnight.gibberish(off,a._voiceBus,.1,73);
            const rendered=await off.startRendering(),data=rendered.getChannelData(0);let sum=0,max=0,bad=0;for(const value of data){sum+=value*value;max=Math.max(max,Math.abs(value));if(!Number.isFinite(value))bad++;}
            channels[kind]={rms:Math.sqrt(sum/data.length),max,bad};
          }
          return channels;
        }""")
        for name, v in report.items():
            need(
                v["rms"] > 0.00001 and 0 < v["max"] < 0.9 and v["bad"] == 0,
                name + " is silent, unbounded or non-finite",
            )
        muted = page.evaluate(
            """()=>{const a=__game.audio;__game.settings.set('sound',false);const master=a._master.gain.value;__game.settings.set('music',0);const music=a._musBus.gain.value,effects=a._sfxBus.gain.value;__game.settings.set('music',.1);__game.settings.set('sound',true);return {master,music,effects};}"""
        )
        need(
            muted["master"] == 0 and muted["music"] == 0 and muted["effects"] > 0,
            "Bus mute/independence failed",
        )
        page.keyboard.press("Escape")
        page.wait_for_timeout(120)
        need(page.evaluate("__game.audio.song===null"), "Pause left music scheduling")
        need(
            page.evaluate("__fortnight.sound.nodes.length===0"),
            "Pause left voice nodes",
        )
        (ROOT / "evidence/audio-signals.json").write_text(json.dumps(report, indent=2))
        return report

    check(
        "offline music/SFX/gibberish signals are finite, bounded and non-silent; pause cleanup",
        audio_signals,
    )
    check(
        "no uncaught browser or native engine errors",
        lambda: need(
            not errors and not page.evaluate("__game.errors"),
            str(errors) + str(page.evaluate("__game.errors")),
        ),
    )
    context.close()

    # Native controller navigation with a standard mapping, injected before loading.
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
    ctx.add_init_script(PAD_SCRIPT)
    padpage = ctx.new_page()
    padpage.set_default_timeout(4500)
    boot(padpage)

    def controller():
        press_pad(padpage, 13)
        press_pad(padpage, 0)
        need(
            padpage.evaluate("__fortnight.ui.shell.screen") == "join",
            "Pad did not open join screen",
        )
        padpage.evaluate(
            """()=>{for(let i=1;i<4;i++)testPads.push({id:'Standard wing '+i,index:i,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});}"""
        )
        for i in [1, 2, 3]:
            press_pad(padpage, 9, i)
        need(
            padpage.evaluate("__game.players.length") == 4,
            "Four pad join failed: "
            + str(
                padpage.evaluate(
                    "({n:__game.players.length,screen:__fortnight.ui.shell.screen,mode:__fortnight.mode,paused:__game.paused,join:!!__game._join,players:__game.players.map(p=>p.pad)})"
                )
            ),
        )
        focus_pad(padpage, "Launch wing")
        press_pad(padpage, 0)
        padpage.wait_for_function(
            "__fortnight.world && __fortnight.world.s.players.length===4"
        )
        padpage.evaluate(
            "__game.debug.advance(4,{draw:false});testPads[0].axes[0]=.8;testPads[1].axes[0]=-.8"
        )
        before = padpage.evaluate("__fortnight.world.s.players.map(p=>p.x)")
        padpage.wait_for_timeout(220)
        after = padpage.evaluate("__fortnight.world.s.players.map(p=>p.x)")
        need(
            after[0] > before[0] and after[1] < before[1],
            "Independent pad pilots did not move",
        )
        padpage.evaluate("testPads[0].axes=[0,0,0,0];testPads[1].axes=[0,0,0,0]")
        padpage.evaluate(
            '__fortnight.world.retreat(true,"CONTROLLER CHOICE TEST");__game.debug.advance(4.6,{draw:false})'
        )
        padpage.wait_for_function('__fortnight.ui.shell.screen==="upgrade"')
        for pilot, label in [
            (0, "DEEP RESERVE"),
            (1, "QUICK DISCHARGE"),
            (2, "LANCE ARRAY"),
            (3, "DEEP RESERVE"),
        ]:
            focus_pad(padpage, label, pilot)
            press_pad(padpage, 0, pilot)
            need(
                padpage.evaluate(
                    "(id)=>__fortnight.world.s.players[id].choice!==null", pilot
                ),
                f"Pilot {pilot + 1} could not choose independently",
            )
        choices = padpage.evaluate("__fortnight.world.s.players.map(p=>p.upgrades)")
        need(
            choices[0]["boost"] == 1
            and choices[1]["pulse"] == 1
            and choices[2]["laser"] == 1
            and choices[3]["boost"] == 1,
            "Independent upgrades were assigned to wrong pilots",
        )
        padpage.evaluate("__game.debug.advance(4,{draw:false})")
        press_pad(padpage, 9)
        padpage.wait_for_function('__fortnight.ui.shell.screen==="pause"')
        focus_pad(padpage, "Dev mode")
        press_pad(padpage, 0)
        focus_pad(padpage, "Tune Viper")
        press_pad(padpage, 0)
        focus_pad(padpage, "Thrust")
        press_pad(padpage, 15)
        need(
            padpage.evaluate("__fortnight.world.s.balance.thrust") > 620,
            "Pad could not adjust live slider",
        )
        focus_pad(padpage, "Reset to defaults")
        press_pad(padpage, 0)
        need(
            padpage.evaluate("__fortnight.world.s.balance.thrust") == 620,
            "Pad reset failed",
        )
        padpage.screenshot(path=str(ROOT / "evidence/controller-tuning.png"))
        press_pad(padpage, 1)
        press_pad(padpage, 1)
        focus_pad(padpage, "Settings")
        press_pad(padpage, 0)
        focus_pad(padpage, "Button symbols")
        press_pad(padpage, 15)
        need(
            padpage.evaluate("__game.settings.glyphs") == "xbox",
            "Pad glyph choice failed",
        )
        need(
            padpage.evaluate('__game.input.label("pulse","gamepad")') == "X",
            "Xbox label did not update",
        )
        press_pad(padpage, 1)
        focus_pad(padpage, "Resume")
        press_pad(padpage, 0)
        padpage.evaluate(
            "testPads[0].buttons[8]={pressed:true,value:1};testPads[0].buttons[9]={pressed:true,value:1}"
        )
        padpage.wait_for_timeout(100)
        need(
            padpage.evaluate("__game.paused") is False,
            "Reserved Create+Options chord paused game",
        )
        padpage.evaluate(
            "testPads[0].buttons[8]={pressed:false,value:0};testPads[0].buttons[9]={pressed:false,value:0};testPads[0].axes=[.1,.1,.1,.1]"
        )
        padpage.wait_for_timeout(70)
        need(
            padpage.evaluate("__game.input.move().every(v=>v===0)"),
            "Deadzone did not suppress stick drift",
        )
        # Repeating the same meaningful button after a neutral interval still exits attract.
        press_pad(padpage, 0)
        padpage.evaluate(
            "__fortnight.title();__fortnight.input.lastActivity=performance.now()-10000;__fortnight.checkIdle()"
        )
        padpage.wait_for_timeout(80)
        need(padpage.evaluate("__fortnight.attract"), "Stick drift cancelled attract")
        press_pad(padpage, 0)
        need(
            padpage.evaluate('__fortnight.mode==="title"&&!__fortnight.world'),
            "Pad attract exit leaked confirm",
        )
        padpage.evaluate(
            "__fortnight.blockInputUntil=0;__fortnight.startSolo();__game.advance(.01);__game.debug.advance(4,{draw:false})"
        )
        press_pad(padpage, 7)
        padpage.evaluate("testPads=[]")
        padpage.wait_for_timeout(100)
        need(
            padpage.evaluate("__game.paused"),
            "Controller unplug did not pause standalone",
        )

    check(
        "four-pad join, independent pilots, pad-only pause/dev/sliders/reset/glyphs, reserved chord, drift and unplug",
        controller,
    )
    ctx.close()

    ctx = browser.new_context(**pw.devices["iPhone 13"])
    phone = ctx.new_page()
    phone.set_default_timeout(4500)
    boot(phone)

    def touch():
        phone.locator(".esh-ttl button").first.tap()
        phone.wait_for_function("__fortnight.world")
        phone.evaluate("__game.debug.advance(4,{draw:false})")
        need(phone.evaluate("__game.W===960&&__game.H===540"), "Portrait arena changed")
        before = phone.evaluate("__fortnight.world.s.players[0].x")
        cdp = ctx.new_cdp_session(phone)
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"id": 1, "x": 80, "y": 470},
                    {"id": 2, "x": 310, "y": 410},
                ],
            },
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchMove",
                "touchPoints": [
                    {"id": 1, "x": 120, "y": 470},
                    {"id": 2, "x": 310, "y": 390},
                ],
            },
        )
        phone.wait_for_timeout(180)
        need(
            phone.evaluate("__fortnight.input.touch.size") == 2,
            "Two contacts were not retained",
        )
        need(
            phone.evaluate("__fortnight.world.s.players[0].x") > before,
            "Invisible left thumb did not thrust",
        )
        need(
            phone.evaluate('__fortnight.world.s.events.some(e=>e.type==="shot")'),
            "Right drag / assisted fire did not shoot",
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
        phone.wait_for_timeout(70)
        need(
            phone.evaluate("__fortnight.input.touch.size") == 0,
            "Touch cancel leaked contact",
        )
        phone.evaluate(
            """()=>{const w=__fortnight.world,p=w.s.players[0];p.pulse=0;w.shot(p.x+40,p.y,0,0,true);w.spawn('anchor',p.x+60,p.y,{tele:0,charge:0});__fortnight.ui.tick();}"""
        )
        need(
            phone.locator("#touch-pulse").is_visible(), "Useful ready pulse was hidden"
        )
        phone.locator("#touch-pulse").tap()
        phone.wait_for_timeout(70)
        need(
            phone.evaluate("__fortnight.world.s.players[0].pulse") > 0,
            "Touch pulse did not activate",
        )
        phone.screenshot(path=str(ROOT / "evidence/touch-portrait.png"))
        phone.locator("#menu-toggle").tap()
        phone.wait_for_function('__fortnight.ui.shell.screen==="pause"')
        need(phone.evaluate("__game.paused"), "Touch menu did not pause")
        phone.set_viewport_size({"width": 844, "height": 390})
        phone.wait_for_timeout(70)
        need(
            phone.evaluate("__game.W===960&&__game.H===540"), "Landscape arena changed"
        )
        phone.evaluate(
            "__fortnight.title();__fortnight.input.lastActivity=performance.now()-10000;__fortnight.checkIdle()"
        )
        phone.touchscreen.tap(60, 250)
        phone.wait_for_timeout(80)
        need(
            phone.evaluate('__fortnight.mode==="title"&&!__fortnight.world'),
            "Touch did not exit attract cleanly",
        )

    check(
        "phone portrait/landscape fixed arena, two-finger invisible controls, cancellation and contextual pulse/menu",
        touch,
    )
    ctx.close()
    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    keys_page = ctx.new_page()
    keys_page.set_default_timeout(4500)

    def keyboard_couch():
        boot(keys_page)
        keys_page.get_by_role("button", name="Couch co-op", exact=True).click()
        keys_page.keyboard.press("2")
        keys_page.wait_for_function("__game.players.length===2")
        keys_page.get_by_role("button", name="Launch wing", exact=True).click()
        keys_page.wait_for_function("__fortnight.world?.s.players.length===2")
        keys_page.evaluate("__game.debug.advance(4,{draw:false})")
        before = keys_page.evaluate("__fortnight.world.s.players.map(p=>p.x)")
        keys_page.keyboard.down("a")
        keys_page.keyboard.down("ArrowRight")
        keys_page.keyboard.down("f")
        keys_page.keyboard.down(".")
        keys_page.wait_for_timeout(220)
        keys_page.keyboard.up("a")
        keys_page.keyboard.up("ArrowRight")
        keys_page.keyboard.up("f")
        keys_page.keyboard.up(".")
        state = keys_page.evaluate(
            '({x:__fortnight.world.s.players.map(p=>p.x),shots:__fortnight.world.s.events.filter(e=>e.type==="shot").map(e=>e.owner)})'
        )
        need(
            state["x"][0] < before[0] and state["x"][1] > before[1],
            "Keyboard halves shared movement",
        )
        need(
            0 in state["shots"] and 1 in state["shots"],
            "Both keyboard fire controls did not work",
        )

    check("two native keyboard halves join and move/fire independently", keyboard_couch)
    ctx.close()
    ctx = browser.new_context(**pw.devices["iPad Pro 11"])
    tablet = ctx.new_page()

    def tablet_touch():
        boot(tablet)
        tablet.locator(".esh-ttl button").first.tap()
        tablet.wait_for_function("__fortnight.world")
        tablet.evaluate("__game.debug.advance(4,{draw:false})")
        before = tablet.evaluate("__fortnight.world.s.players[0].x")
        session = ctx.new_cdp_session(tablet)
        session.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"id": 1, "x": 160, "y": 900},
                    {"id": 2, "x": 670, "y": 900},
                ],
            },
        )
        session.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchMove",
                "touchPoints": [
                    {"id": 1, "x": 240, "y": 900},
                    {"id": 2, "x": 670, "y": 840},
                ],
            },
        )
        tablet.wait_for_timeout(180)
        need(
            tablet.evaluate("__fortnight.world.s.players[0].x") > before,
            "Tablet left thumb did not move",
        )
        need(
            tablet.evaluate("__fortnight.input.touch.size") == 2,
            "Tablet multi-touch lost a contact",
        )
        session.send(
            "Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []}
        )
        tablet.set_viewport_size({"width": 1194, "height": 834})
        tablet.wait_for_timeout(80)
        need(
            tablet.evaluate("__game.W===960&&__game.H===540"),
            "Tablet rotation altered arena",
        )
        tablet.screenshot(path=str(ROOT / "evidence/touch-tablet.png"))

    check("tablet multi-touch and rotation keep the fixed arena visible", tablet_touch)
    ctx.close()
    # Storage denial must leave a playable standalone game.
    ctx = browser.new_context()
    ctx.add_init_script(
        "Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}})"
    )
    fallback = ctx.new_page()

    def storage():
        boot(fallback)
        solo(fallback)
        need(
            fallback.evaluate("__fortnight.world.s.phase") == "play",
            "Blocked storage prevented play",
        )

    check("denied local storage has a playable safe fallback", storage)
    ctx.close()
    browser.close()
    # WebKit desktop/mobile emulation: explicitly not a claim of physical iOS testing.
    webkit = pw.webkit.launch(headless=True)
    wk = webkit.new_context(**pw.devices["iPhone 13"])
    wp = wk.new_page()

    def webkit_smoke():
        boot(wp)
        wp.locator(".esh-ttl button").first.tap()
        wp.wait_for_function("__fortnight.world")
        wp.evaluate("__game.debug.advance(8,{bot:true})")
        need(not wp.evaluate("__game.errors"), "WebKit native draw errors")
        need(wp.evaluate("__fortnight.world.s.tick") > 900, "WebKit world did not tick")

    check("WebKit with iPhone profile boots and runs native combat", webkit_smoke)
    wk.close()
    webkit.close()
    fox = pw.firefox.launch(headless=True)
    fc = fox.new_context(viewport={"width": 1280, "height": 720})
    fp = fc.new_page()

    def firefox_smoke():
        boot(fp)
        fp.locator(".esh-ttl button").first.click()
        fp.wait_for_function("__fortnight.world")
        fp.evaluate("__game.debug.advance(8,{bot:true})")
        need(not fp.evaluate("__game.errors"), "Firefox Canvas 2D errors")
        need(
            fp.evaluate("__fortnight.world.s.tick") > 900, "Firefox world did not tick"
        )

    check("Firefox Canvas 2D standalone combat without WebGL", firefox_smoke)
    fc.close()
    fox.close()


def hub_suite(pw):
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = "http://127.0.0.1:" + str(server.server_address[1])
    need(
        "Space Fortnight"
        in urllib.request.urlopen(base + "/game.html").read().decode(),
        "Wrong isolated server",
    )
    browser = pw.chromium.launch(headless=True)
    try:
        for count, scenario in (
            []
            if sys.argv[1] == "hub-gameplay"
            else [
                (1, "standard"),
                (2, "standard"),
                (3, "standard"),
                (4, "standard"),
                (2, "server"),
                (3, "host-leave"),
            ]
        ):
            ctx = browser.new_context(viewport={"width": 1400, "height": 960})
            page = ctx.new_page()
            page.set_default_timeout(6000)
            name = f"official Hub harness {count} players / {scenario} / 150 ms ±50 ms / 5% loss"

            def run_harness(count=count, scenario=scenario, page=page):
                url = (
                    base
                    + "/tests/hub/harness.html?"
                    + urllib.parse.urlencode(
                        {
                            "game": "/game.html",
                            "players": count,
                            "scenario": scenario,
                            "latency": 150,
                            "jitter": 50,
                            "loss": 5,
                            "auto": 1,
                            "play": 10000,
                        }
                    )
                )
                page.goto(url)
                page.wait_for_function('document.querySelectorAll("iframe").length>0')
                page.wait_for_function(
                    '[...document.querySelectorAll("iframe")].every(f=>f.contentWindow.__fortnight?.online)'
                )
                frames = [f for f in page.frames if f != page.main_frame]
                for frame in frames:
                    need(
                        frame.evaluate("__fortnight.mode") == "hub",
                        "Hub showed standalone menu",
                    )
                    need(
                        frame.evaluate("__fortnight.world.s.tick") == 0,
                        "Countdown changed authoritative state",
                    )
                if count >= 2 and scenario == "standard":
                    remote = frames[1]
                    remote.evaluate(
                        '__game.input.hold("right");__game.input.hold("fire")'
                    )
                page.wait_for_function(
                    'document.body.dataset.complete==="true"', timeout=60000
                )
                report = page.evaluate("window.__hubCheck")
                (ROOT / f"evidence/hub-{count}-{scenario}.json").write_text(
                    json.dumps(report, indent=2)
                )
                need(
                    report["pass"],
                    "; ".join(
                        c["name"] + ": " + c.get("detail", "")
                        for c in report["checks"]
                        if not c["pass"]
                    ),
                )
                frames = [f for f in frames if not f.is_detached()]
                stats = []
                for frame in frames:
                    value = frame.evaluate(
                        "({network:__fortnight.online.stats(),errors:__game.errors,phase:__fortnight.world.s.phase,score:__fortnight.world.s.score,players:__fortnight.world.s.players.map(p=>({id:p.id,x:p.x,seq:p.seq})),audio:__game.audio.song,voices:__fortnight.sound.nodes.length})"
                    )
                    need(
                        not value["errors"], "Hub engine error: " + str(value["errors"])
                    )
                    need(
                        value["network"]["maxBytes"] <= 16384
                        and value["network"]["maxRoutineBytes"] <= 1200,
                        "Packet limit exceeded",
                    )
                    need(
                        value["audio"] is None and value["voices"] == 0,
                        "Hub end left audio running",
                    )
                    stats.append(value)
                if scenario == "standard" and count >= 2:
                    host = stats[0]
                    need(
                        any(p["id"] == 1 and p["seq"] > 0 for p in host["players"]),
                        "Host never accepted remote intent",
                    )
                    need(
                        abs(host["players"][1]["x"] - 432) > 30,
                        "Remote controls did not move host pilot",
                    )
                before = [v["network"]["sent"] for v in stats]
                page.wait_for_timeout(250)
                after = [f.evaluate("__fortnight.online.sent") for f in frames]
                need(before == after, "Input or snapshots continued after Hub end")
                return stats

            check(name, run_harness)
            ctx.close()
        # Stateful gameplay checks use the same official bridge/round in manual mode.
        ctx = browser.new_context(viewport={"width": 1400, "height": 960})
        page = ctx.new_page()
        page.set_default_timeout(6000)

        def remote_gameplay():
            page.goto(
                base
                + "/tests/hub/harness.html?game=/game.html&players=2&latency=150&jitter=50&loss=5&auto=0"
            )
            page.wait_for_function(
                '[...document.querySelectorAll("iframe")].length===2 && [...document.querySelectorAll("iframe")].every(f=>f.contentWindow.__fortnight?.online)'
            )
            frames = [f for f in page.frames if f != page.main_frame]
            host, remote = frames
            remote.evaluate('__game.input.hold("right");__game.input.hold("fire")')
            page.wait_for_timeout(150)
            need(
                host.evaluate("__fortnight.world.s.tick") == 0, "Unreleased Hub mutated"
            )
            page.locator("#release").click()
            page.wait_for_timeout(250)
            need(host.evaluate("__fortnight.world.s.tick") == 0, "Countdown mutated")
            host.wait_for_function('__fortnight.world.s.phase==="play"', timeout=12000)
            remote.evaluate('__game.input.hold("right");__game.input.hold("fire")')
            before = host.evaluate("__fortnight.world.s.players.find(p=>p.id===1).x")
            page.wait_for_timeout(900)
            moved = host.evaluate("__fortnight.world.s.players.find(p=>p.id===1).x")
            need(
                moved > before + 35,
                "Real remote intent did not move host ship: " + str([before, moved]),
            )
            need(
                host.evaluate(
                    '__fortnight.world.s.events.some(e=>e.type==="shot"&&e.owner===1)'
                ),
                "Remote fire never became an authoritative shot",
            )
            remote.evaluate(
                '__game.input.hold("right",false);__game.input.hold("fire",false)'
            )
            invalid = host.evaluate("""()=>{const o=__fortnight.online,w=__fortnight.world,p=w.s.players[1],seq=p.seq,e=w.s.epoch;
              o.receive({t:'i',e,v:{...Fortnight.neutral(seq+1),mx:NaN}},1);
              o.receive({t:'i',e,v:{...Fortnight.neutral(seq+1),mx:1,my:1}},1);
              o.receive({t:'i',e,v:Fortnight.neutral(seq)},1);
              o.receive({t:'i',e,v:Fortnight.neutral(seq+99)},99);
              return p.seq===seq;}""")
            need(invalid, "Invalid identity/vector/sequence was accepted")
            host.evaluate("__game.menu()")
            tick = host.evaluate("__fortnight.world.s.tick")
            page.wait_for_timeout(150)
            need(
                host.evaluate("__game.paused")
                and host.evaluate("__fortnight.world.s.tick") > tick + 8,
                "Host local menu froze shared world",
            )
            need(
                host.locator(".esh-btns")
                .get_by_text("Return to command", exact=True)
                .count()
                == 0,
                "Hub offered invalid navigation",
            )
            host.evaluate("__fortnight.ui.shell.hide()")
            host.evaluate("clearInterval(__fortnight.timer)")
            tick = host.evaluate("__fortnight.world.s.tick")
            page.wait_for_timeout(500)
            need(
                host.evaluate("__fortnight.world.s.tick") == tick,
                "RAF also advanced the authority",
            )
            host.evaluate(
                "__fortnight.timer=setInterval(()=>__game.advance(.016,{draw:false}),16)"
            )
            page.wait_for_timeout(150)
            lag = host.evaluate(
                "Math.floor(AIHub.time()/1000/Fortnight.DT)-__fortnight.world.s.tick"
            )
            need(
                abs(lag) < 8,
                "Authority did not catch up after timer delay: " + str(lag),
            )
            host.evaluate(
                """()=>{const w=__fortnight.world;w.jump(1,2);w.s.base=77;w.s.heat=50;for(const p of w.s.players){p.inv=0;w.damagePlayer(p);}__fortnight.online.lastFull=-10;}"""
            )
            page.wait_for_timeout(2300)
            remote.wait_for_function(
                "__fortnight.world.s.act===1 && __fortnight.online.lastKeyTick>0"
            )
            h = host.evaluate(
                "({phase:__fortnight.world.s.phase,act:__fortnight.world.s.act,score:__fortnight.world.s.score,base:__fortnight.world.s.base,hp:__fortnight.world.s.players.map(p=>p.hp)})"
            )
            r = remote.evaluate(
                "({phase:__fortnight.world.s.phase,act:__fortnight.world.s.act,score:__fortnight.world.s.score,base:__fortnight.world.s.base,hp:__fortnight.world.s.players.map(p=>p.hp)})"
            )
            need(h == r, "Recoverable full state did not converge: " + str([h, r]))
            need(
                remote.evaluate(
                    "()=>{const s=JSON.stringify(__fortnight.world.s);__fortnight.online.renderState();return JSON.stringify(__fortnight.world.s)===s}"
                ),
                "Client rendering mutated authoritative state",
            )
            host.evaluate(
                "()=>{window.finishCalls=0;window.realFinish=AIHub.finish;AIHub.finish=(r)=>{finishCalls++;window.finishPayload=r;return realFinish(r)};}"
            )
            page.locator("#timeup").click()
            page.locator("#timeup").click()
            host.wait_for_function("__fortnight.online.ended")
            need(
                host.evaluate("finishCalls") == 1,
                "Time-up finish count: "
                + str(
                    host.evaluate(
                        "({calls:finishCalls,state:__fortnight.online.stats(),result:__fortnight.world.s.result})"
                    )
                )
                + " LOG "
                + page.locator("#log").inner_text(),
            )
            need(
                host.evaluate(
                    "finishPayload.standings.length===1&&finishPayload.standings[0].length===2&&Number.isFinite(finishPayload.scores[0])"
                ),
                "Invalid co-op result",
            )
            return {"host": h, "remote": r, "clockLagTicks": lag}

        check(
            "Hub remote fire/control, inert countdown, malicious/stale input, local overlay, timer catch-up and complete snapshot convergence",
            remote_gameplay,
        )
        ctx.close()
        ctx = browser.new_context(viewport={"width": 1400, "height": 960})
        page = ctx.new_page()
        page.set_default_timeout(6000)

        def dedicated_victory():
            page.goto(
                base
                + "/tests/hub/harness.html?game=/game.html&players=2&scenario=server&latency=150&jitter=50&loss=5&auto=0"
            )
            page.wait_for_function(
                'document.querySelectorAll("iframe").length===3 && [...document.querySelectorAll("iframe")].every(f=>f.contentWindow.__fortnight?.online)'
            )
            frames = [f for f in page.frames if f != page.main_frame]
            host = next(
                f for f in frames if f.evaluate("__fortnight.online.info.server")
            )
            need(
                host.evaluate(
                    "__game.headless && !__fortnight.painter && __game.audio.ctx===null"
                ),
                "Dedicated host created local rendering/audio",
            )
            page.locator("#release").click()
            host.wait_for_function("AIHub.time()>=0", timeout=10000)
            value = host.evaluate("""()=>{window.finishCalls=0;window.realFinish=AIHub.finish;AIHub.finish=r=>{finishCalls++;window.finishPayload=r;return realFinish(r)};
              const w=__fortnight.world;let peak=0;
              for(let i=0;i<100000&&!w.s.result;i++){for(const p of w.s.players){w.setIntent(p.id,Fortnight.botIntent(w,p.id,p.seq+1));if(w.s.phase==='upgrade')w.upgrade(p.id,p.id%3);}w.step();
                if(i%120===0)peak=Math.max(peak,Fortnight.encodeWorld(w.s).length);}
              return {result:w.s.result,seen:w.s.seen,phases:w.s.bossPhases,active:w.s.activeTime,limit:AIHub.limitMs/1000,peak};} """)
            need(
                value["result"]["won"]
                and len(value["seen"]) == 8
                and value["phases"] == [0, 1, 2],
                "Dedicated full siege did not naturally win",
            )
            need(
                590 < value["active"] < value["limit"] and value["peak"] <= 48000,
                "Siege exceeds round or snapshot capacity",
            )
            host.wait_for_function("__fortnight.online.ended", timeout=10000)
            page.wait_for_timeout(250)
            need(
                host.evaluate("finishCalls") == 1,
                "Natural victory finished more than once",
            )
            need(
                host.evaluate(
                    "finishPayload.won===true&&finishPayload.standings[0].length===2"
                ),
                "Natural result invalid",
            )
            for f in frames:
                need(
                    f.evaluate("__fortnight.world.s.result?.won===true"),
                    "Final victory was not delivered to a client",
                )
                need(
                    f.evaluate("__fortnight.world.s.score") == value["result"]["score"],
                    "Final score differs across copies",
                )
                need(
                    not f.evaluate("__game.errors"),
                    "Natural full run raised engine error",
                )
            (ROOT / "evidence/hub-dedicated-victory.json").write_text(
                json.dumps(value, indent=2)
            )
            return value

        check(
            "dedicated host full no-cheat siege, every mechanic, bounded snapshots, real victory and exactly one tied finish",
            dedicated_victory,
        )
        ctx.close()
    finally:
        browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


try:
    with sync_playwright() as pw:
        if len(sys.argv) > 1 and sys.argv[1].startswith("hub"):
            hub_suite(pw)
        else:
            browser_suite(pw)
except Exception:  # noqa: BLE001 - report every test/tool failure with its traceback
    RESULTS.append(
        {"name": "suite setup", "pass": False, "error": traceback.format_exc()}
    )
print(json.dumps(RESULTS))
sys.exit(1 if any(not t["pass"] for t in RESULTS) else 0)
