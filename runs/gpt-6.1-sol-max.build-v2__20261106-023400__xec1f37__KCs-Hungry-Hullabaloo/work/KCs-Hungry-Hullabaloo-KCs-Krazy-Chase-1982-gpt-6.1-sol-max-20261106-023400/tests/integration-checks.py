"""Meaningful final-artifact checks beyond the device and protocol suites."""

import argparse
import functools
import http.server
import json
import os
import pathlib
import re
import threading
import time

from playwright.sync_api import sync_playwright

DEV = pathlib.Path(__file__).resolve().parents[1]
ROOT = DEV.parent
META = json.loads((DEV / "delivery.json").read_text())
URL = (ROOT / META["html"]).as_uri()
(DEV / ".cache/browser-tmp").mkdir(parents=True, exist_ok=True)
os.environ["TMPDIR"] = str(DEV / ".cache/browser-tmp")
PAD = """window.__pads=[{index:0,id:'Emulated DualSense',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}];Object.defineProperty(navigator,'getGamepads',{value:()=>__pads});"""
passed = 0
failures = []
evidence = {}


def check(condition, label):
    global passed
    if not condition:
        raise AssertionError(label)
    passed += 1


def group(label, fn):
    try:
        fn()
    except Exception as e:  # noqa: BLE001 - record each independent browser group
        message = f"FAIL {label}: {str(e).splitlines()[0]}"
        failures.append(message)
        print(message, flush=True)


def load(browser, pad=False, engine="chromium"):
    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    if pad:
        ctx.add_init_script(PAD)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e, target=errors: target.append(str(e)))
    page.goto(URL)
    page.wait_for_function('window.__game?.snapshot().scene === "title"')
    page.evaluate("__game.game.stop();__game.game.advance(.2,{draw:false})")
    return ctx, page, errors


def step(page, s=0.04):
    page.evaluate("s=>__game.game.advance(s,{draw:false})", s)


def keypress(page, k, s=0.04):
    page.keyboard.down(k)
    step(page, s)
    page.keyboard.up(k)
    step(page, 0.22)


def menu_pick(page, label):
    step(page, 0.22)
    page.evaluate(
        "label=>{const g=__game;g.state.menu.i=g.state.menu.items.findIndex(x=>(typeof x==='string'?x:x.label).startsWith(label));}",
        label,
    )
    keypress(page, "Enter")


def advanced(browser):
    ctx, p, errors = load(browser)
    try:
        # The idle clock keeps running under native title settings.
        p.evaluate(
            "__game.game.menu('settings');__game.arcade.wake();__game.game._acc=0"
        )
        step(p, 10.1)
        check(
            p.evaluate("__game.state.attract"),
            "A title settings panel disabled the attract clock",
        )
        keypress(p, "Enter")
        # Inspect all attract beats on the real demo simulation, without changing it.
        p.evaluate(
            "__game.arcade.wake();__game.game._acc=0;__game.audio.stop();__game.game.advance(9.99,{draw:false})"
        )
        check(
            not p.evaluate("__game.state.attract"),
            "Attract started before ten idle seconds",
        )
        step(p, 0.022)
        check(
            p.evaluate("__game.state.attract"),
            "Attract did not start after ten seconds",
        )
        step(p, 44)
        demo = p.evaluate("__game.snapshot()")
        evidence["attract"] = demo.get("demoEvidence")
        for event in ["bite", "catch", "wrap", "plant"]:
            check(
                demo["demoEvidence"].get(event, 0) > 0,
                "Attract never demonstrated " + event,
            )
        check(
            demo["attractBeat"] in range(6), "Attract did not loop through six scenes"
        )
        check(
            not p.evaluate("!!__game.store.loadCheckpoint()"),
            "Attract changed campaign storage",
        )
        keypress(p, "Enter")
        check(
            p.evaluate("__game.game.sceneName") == "title",
            "Wake input did not return to title",
        )
        check(p.evaluate("__game.state.world===null"), "Wake input also started a run")
        # Test the actual developer sliders, controller adjustment and reset route.
        keypress(p, "Enter")
        step(p, 0.25)
        keypress(p, "Escape")
        step(p, 0.04)
        p.get_by_role("button", name="Developer Tools", exact=True).click()
        step(p, 0.06)
        menu_pick(p, "Live balance")
        for i in range(9):
            p.evaluate("i=>__game.state.menu.i=i", i)
            old = p.evaluate(
                "i=>__game.world().tuning[Object.keys(__game.world().tuning)[i]]", i
            )
            keypress(p, "ArrowRight")
            val = p.evaluate(
                "i=>__game.world().tuning[Object.keys(__game.world().tuning)[i]]", i
            )
            check(val > old, "Developer slider " + str(i) + " ignored Right")

        # The actual bar handles both a click and a continuous mouse drag.
        def slider_point(fraction):
            return p.evaluate(
                "u=>{const m=__game.state.menu;m.i=0;const l=m._layout(),row=m.rowAt(0),s=__game.game.screen,c=s.canvas.getBoundingClientRect(),x=l.x+l.w*(.66+.27*u),y=row[1]+5;return [c.left+(s.OX+x*s.S)/s.dpr,c.top+(s.OY+y*s.S)/s.dpr]}",
                fraction,
            )

        p.mouse.click(*slider_point(0.4))
        step(p, 0.03)
        check(
            abs(p.evaluate("__game.world().tuning.playerSpeed") - 5) < 0.11,
            "Mouse slider click also triggered a second adjustment",
        )
        p.mouse.move(*slider_point(0.4))
        p.mouse.down()
        step(p, 0.02)
        p.mouse.move(*slider_point(0.8))
        step(p, 0.04)
        p.mouse.up()
        step(p, 0.03)
        check(
            abs(p.evaluate("__game.world().tuning.playerSpeed") - 7) < 0.11,
            "Dragging the native slider bar failed",
        )
        menu_pick(p, "Reset defaults")
        check(
            p.evaluate("JSON.stringify(__game.world().tuning)")
            == '{"playerSpeed":5.2,"crawlerSpeed":1,"sentrySpeed":1,"aggression":0.65,"fright":5,"recovery":2.5,"chew":0.9,"biteCooldown":0.45,"lives":3}',
            "Reset did not restore the complete tuning preset",
        )
        check(
            p.evaluate("__game.world().s.modified"),
            "Developer changes did not separate records",
        )
        # Shape/storage failure behavior is also exercised against the packaged code.
        p.evaluate(
            '__game.store.storage={getItem(){throw Error("denied")},setItem(){throw Error("denied")},removeItem(){throw Error("denied")}}'
        )
        check(
            p.evaluate(
                "__game.store.loadCheckpoint()===null || __game.store.loadCheckpoint().version===1"
            ),
            "Denied storage crashed checkpoint handling",
        )
        # File import/export uses real standalone browser flows.
        p.evaluate("__game.workshop()")
        step(p, 0.3)
        keypress(p, "Tab")
        menu_pick(p, "More tools")
        with p.expect_download() as transfer:
            menu_pick(p, "Export JSON")
        downloaded = transfer.value
        destination = DEV / "artifacts/exported.garden.json"
        downloaded.save_as(destination)
        data = json.loads(destination.read_text())
        check(
            data["format"] == "hullabaloo-garden" and data["version"] == 1,
            "Workshop JSON export was malformed",
        )
        data["name"] = "IMPORTED FEAST"
        source = DEV / "artifacts/import.garden.json"
        source.write_text(json.dumps(data))
        keypress(p, "Tab")
        menu_pick(p, "More tools")
        with p.expect_file_chooser() as chooser:
            menu_pick(p, "Import JSON")
        chooser.value.set_files(str(source))
        p.wait_for_timeout(60)
        step(p, 0.3)
        check(
            p.evaluate("__game.state.editor.name") == "IMPORTED FEAST",
            "Standalone JSON import did not restore creation",
        )
        # One mouse brush stroke can paint multiple cells and undo as a unit.
        p.evaluate("__game.state.editor.brush=0")

        def workshop_point(x, y):
            return p.evaluate(
                "([x,y])=>{const v=__game.view,s=__game.game.screen,c=s.canvas.getBoundingClientRect();return [c.left+(s.OX+(v.bounds.x+(x+.5)*16*v.zoom)*s.S)/s.dpr,c.top+(s.OY+(v.bounds.y+(y+.5)*16*v.zoom)*s.S)/s.dpr]}",
                [x, y],
            )

        p.mouse.move(*workshop_point(2, 2))
        p.mouse.down()
        step(p, 0.03)
        p.mouse.move(*workshop_point(3, 2))
        step(p, 0.03)
        p.mouse.up()
        step(p, 0.03)
        check(
            p.evaluate("__game.state.editor.level.rows[2].slice(2,4)") == "..",
            "Mouse stroke did not paint both cells",
        )
        keypress(p, "z")
        check(
            p.evaluate("__game.state.editor.level.rows[2].slice(2,4)") == "##",
            "Undo did not restore the complete mouse stroke",
        )
        # Focused initials fixture: typing WASD letters must not also turn the wheel.
        p.evaluate(
            "__game.state.world=new __game.World();__game.state.world.s.phase='defeat';__game.state.world.s.score=123;__game.state.endingRecorded=false;__game.game.go('ending',null,{fade:0})"
        )
        step(p, 0.3)
        for letter in ["d", "a", "d"]:
            keypress(p, letter)
        keypress(p, "Enter")
        check(
            p.evaluate("__game.arcade.table('solo')[0].name") == "DAD",
            "Keyboard initials were also interpreted as movement",
        )
        check(not errors, "Browser/native errors: " + str(errors))
    finally:
        ctx.close()


def pilot_source():
    source = (DEV / "tests/bot.mjs").read_text()
    source = re.sub(
        r'import\s+(?:\{[\s\S]*?\}\s+from\s+)?[\'"][^\'"]+[\'"];?', "", source
    )
    source = re.sub(r"export\s+(?=(?:function|const|class)\b)", "", source)
    return (
        "(()=>{const World=__game.World,STEP=1/120;const cell=m=>[m.cx,m.cy],key=c=>c.join(','),reverse=d=>[-d[0],-d[1]],same=(a,b)=>!!a&&!!b&&a[0]===b[0]&&a[1]===b[1];"
        + source
        + ";globalThis.__pilot=botCommands;})();"
    )


def campaign(browser):
    ctx, p, errors = load(browser, True)
    try:
        p.evaluate(pilot_source())
        # Only the standard pad stub is changed; simulation and developer API are untouched.
        p.evaluate(
            "__pads[0].buttons[0].pressed=true;__pads[0].buttons[0].value=1;__game.game.advance(.03,{draw:false});__pads[0].buttons[0].pressed=false;__pads[0].buttons[0].value=0;__game.game.advance(.22,{draw:false});__game.audio.stop()"
        )
        check(
            p.evaluate("__game.game.sceneName") == "play",
            "Controller confirm could not start campaign",
        )
        start = time.monotonic()
        result = p.evaluate("""()=>{
   const g=__game.game,api=__game,step=1/120;
   let ticks=0,reports=0,entries=0,lastReport=-999;
   const pad=__pads[0];const reset=()=>{for(const b of pad.buttons){b.pressed=false;b.value=0;}};
   const cross=()=>{reset();pad.buttons[0].pressed=true;pad.buttons[0].value=1;g.advance(.03,{draw:false});reset();g.advance(.23,{draw:false});};
   while(ticks<180000){
    if(g.sceneName==='play'){
     const w=api.world(),cmd=__pilot(w)[w.players[0].id]||{},dir=cmd.dir||[0,0];
     reset();const b=dir[0]>0?15:dir[0]<0?14:dir[1]>0?13:dir[1]<0?12:-1;if(b>=0){pad.buttons[b].pressed=true;pad.buttons[b].value=1;}
     g.advance(step,{draw:false});ticks++;
    }else if(g.sceneName==='report'){
     reports++;reset();g.advance(.4,{draw:false});cross();
    }else if(g.sceneName==='ending'){
     if(api.world().s.phase==='victory'){
      while(api.arcade.entry&&entries<4){cross();entries++;}break;
     }else break;
    }else{g.advance(step,{draw:false});ticks++;}
   }
   reset();g.advance(.02,{draw:true});
   return {scene:g.sceneName,phase:api.world()?.s.phase,stats:api.world()?.s.stats,score:api.world()?.s.score,lives:api.world()?.s.lives,modified:api.world()?.s.modified,seconds:api.world()?.s.totalTime,reports,entries,errors:g.errors,records:api.arcade.table('solo'),input:api.snapshot().input};
  }""")
        evidence["controllerCampaign"] = {
            **result,
            "wallSeconds": round(time.monotonic() - start, 2),
        }
        check(
            result["phase"] == "victory",
            "Normal controller campaign did not reach ending: " + json.dumps(result),
        )
        check(result["reports"] == 15, "Controller campaign skipped an authored course")
        check(
            result["stats"]["bites"] >= 150,
            "Controller campaign did not clear every required tail",
        )
        check(not result["modified"], "Normal controller campaign was marked modified")
        check(
            result["input"]["device"] == "gamepad",
            "Prompts did not remain controller prompts",
        )
        check(
            len(result["records"]) == 1
            and result["records"][0]["score"] == result["score"],
            "Controller name picker did not save the real campaign record",
        )
        check(
            not errors and not result["errors"], "Native/browser errors during campaign"
        )
        p.screenshot(path=str(DEV / "artifacts/captures/controller-victory.png"))
    finally:
        ctx.close()


def audio_check(browser):
    ctx, p, errors = load(browser)
    try:
        check(
            abs(p.evaluate("__game.game.settings.music") - 0.1) < 1e-6,
            "Fresh music does not start at10 percent",
        )
        keypress(p, "Enter")
        step(p, 0.3)
        proof = p.evaluate("__game.audioProof()")
        evidence["audio"] = proof
        check(
            proof["finite"] and proof["nonzero"] > 0 and proof["bounded"],
            "Offline synthesized audio is silent/nonfinite/unbounded",
        )
        check(abs(proof["musicGain"] - 0.1) < 1e-6, "Offline music bus default not0.1")
        for setting, bus in [
            ("music", "musicVolume"),
            ("sfx", "sfxVolume"),
            ("voices", "voiceVolume"),
        ]:
            exists = p.evaluate("key=>!!__game.game.settings.spec(key)", setting)
            if not exists and setting == "sfx":
                setting = "effects"
            p.evaluate("key=>__game.game.settings.set(key,.25)", setting)
            check(
                abs(p.evaluate("key=>__game.game.audio[key]", bus) - 0.25) < 1e-6,
                "Separate audio bus " + bus + " did not respond",
            )
        before = p.evaluate("__game.audio.diagnostics().starts")
        keypress(p, "Escape")
        step(p, 0.04)
        check(
            p.evaluate("__game.audio.diagnostics().stopped"),
            "Pause did not stop procedural buses",
        )
        keypress(p, "Escape")
        step(p, 0.04)
        check(
            not p.evaluate("__game.audio.diagnostics().stopped"),
            "Resume did not restore audio",
        )
        check(
            p.evaluate("__game.audio.diagnostics().starts") == before + 1,
            "Pause/resume duplicated music loops",
        )
        p.evaluate("__game.audio.stop();__game.audio.stop()")
        d = p.evaluate("__game.audio.diagnostics()")
        check(
            d["liveEffects"] == 0 and d["liveSyllables"] == 0 and not d["playing"],
            "Stop left synthesis running",
        )
        check(not errors, "Audio page errors: " + str(errors))
    finally:
        ctx.close()


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def hub_check(browser):
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    (DEV / "artifacts/hub-loopback.json").write_text(
        json.dumps(
            {
                "pid": os.getpid(),
                "port": server.server_port,
                "game": base + "/" + META["html"],
            }
        )
    )
    ctx = browser.new_context(viewport={"width": 1280, "height": 860})
    try:
        page = ctx.new_page()
        page.goto(base + "/" + META["html"])
        check(
            page.title() == META["title"],
            "OS-selected loopback port served another game",
        )
        runs = []
        harness = base + "/" + META["base"] + "/vendor/hub/harness.html"
        for players in [1, 2]:
            page.goto(
                harness
                + f"?game=/{META['html']}&players={players}&latency=0&jitter=0&loss=0&auto=1&play=3000"
            )
            page.wait_for_selector('body[data-complete="true"]', timeout=60000)
            report = page.evaluate("window.__hubCheck")
            runs.append(report)
            check(
                report["pass"],
                "Normal/single-seat harness failed: "
                + json.dumps([c for c in report["checks"] if not c["pass"]]),
            )
        evidence["normalHub"] = runs
        # Impaired live shared state. These focused transition setups are separate from the normal campaign test.
        page.goto(
            harness
            + f"?game=/{META['html']}&players=2&latency=150&jitter=50&loss=5&seed=297728"
        )
        page.wait_for_function('document.querySelectorAll("iframe").length===2')
        page.click("#release")
        page.wait_for_function(
            'Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.__game?.net.started && f.contentWindow.AIHub.time()>=0)',
            timeout=30000,
        )
        frames = [f for f in page.frames if "?aihub=" in f.url]
        check(len(frames) == 2, "Live harness did not supply two game copies")
        host = next(f for f in frames if f.evaluate("AIHub.isHost"))
        client = next(f for f in frames if not f.evaluate("AIHub.isHost"))
        check(
            host.evaluate("__game.world().players.length") == 2,
            "Authority created wrong seat count",
        )
        start = host.evaluate("__game.world().s.totalTime")
        host.evaluate('dispatchEvent(new Event("blur"))')
        page.wait_for_timeout(350)
        check(
            host.evaluate("__game.world().s.totalTime") > start,
            "Blur paused the session authority",
        )
        client.evaluate("__game.command(AIHub.me,{dir:[1,0],plant:true})")
        page.wait_for_timeout(900)
        check(
            host.evaluate("__game.world().s.stats.plants") == 1,
            "Reliable client plant was lost or spent more than once",
        )
        # Repeat the exact action ID over the actual reliable transport.
        client.evaluate(
            'AIHub.send({t:"p",g:__game.net.remote.level*8+__game.net.remote.wave,id:"1"},{to:AIHub.host,reliable:true})'
        )
        page.wait_for_timeout(500)
        check(
            host.evaluate("__game.world().s.stats.plants") == 1,
            "A repeated reliable plant spent again",
        )
        host.evaluate(pilot_source())
        deadline = time.monotonic() + 12
        while (
            host.evaluate("__game.world().s.stats.bites") == 0
            and time.monotonic() < deadline
        ):
            commands = host.evaluate("__pilot(__game.world())")
            for frame in frames:
                identity = str(frame.evaluate("AIHub.me"))
                frame.evaluate(
                    "cmd=>__game.command(AIHub.me,cmd)", commands.get(identity, {})
                )
            page.wait_for_timeout(75)
        check(
            host.evaluate("__game.world().s.stats.bites") > 0,
            "Normal authoritative movement never depleted a tail",
        )

        def core(f):
            return f.evaluate(
                "(()=>{const v=__game.net.diagnostics().authoritative;return [v.level,v.wave,v.score,v.lives,v.seeds,v.remaining,v.bait.length,v.phase]})()"
            )

        deadline = time.monotonic() + 3
        while core(host) != core(client) and time.monotonic() < deadline:
            page.wait_for_timeout(100)
        check(core(host) == core(client), "Shared tails/lives/score/bait disagreed")
        # One focused legal clear-to-next-garden transition.
        host.evaluate(
            "__game.world().s.wave=2;for(const c of __game.world().crawlers)c.segments=0"
        )
        host.wait_for_function("__game.world().s.level===1", timeout=7000)
        client.wait_for_function("__game.net.remote.level===1", timeout=3000)
        check(
            core(host) == core(client),
            "Garden transition did not reconcile all shared values",
        )
        denied = client.evaluate(
            '(()=>{try{__game.dev("refill");return false}catch{return true}})()'
        )
        check(denied, "Hub developer command was allowed")
        page.select_option("#who", "p1")
        page.click("#remove")
        page.wait_for_timeout(450)
        check(
            host.evaluate(
                "__game.world().players.length===1 && !__game.net.heard.has(1)"
            ),
            "Departure retained an actor or stale input",
        )
        page.click("#timeup")
        page.wait_for_timeout(900)
        t = host.evaluate("__game.world().s.totalTime")
        page.wait_for_timeout(300)
        check(
            host.evaluate("__game.net.ended && __game.net.finished"),
            "Time-up/end did not finish the authority",
        )
        check(
            host.evaluate("__game.world().s.totalTime") == t,
            "Simulation continued after end",
        )
        check(
            host.evaluate("__game.audio.diagnostics().stopped"),
            "Audio continued after Hub end",
        )
        check(
            "Ended played" in page.locator("#round").inner_text(),
            "Focused session did not report a valid result",
        )
        evidence["liveHub"] = {
            "sameState": True,
            "plantsExactlyOnce": True,
            "transition": True,
            "leave": True,
            "endStopped": True,
        }
    finally:
        ctx.close()
        server.shutdown()
        server.server_close()


def cross_checks(playwright):
    for engine in ["firefox", "webkit"]:
        browser = getattr(playwright, engine).launch(headless=True)
        try:
            options = {"viewport": {"width": 1280, "height": 720}}
            if engine == "webkit":
                options = playwright.devices["iPhone 13"]
            context = browser.new_context(**options)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e, target=errors: target.append(str(e)))
            page.goto(URL)
            page.wait_for_function("window.__game?.snapshot().scene==='title'")
            page.evaluate("__game.game.stop()")
            if engine == "webkit":
                point = page.evaluate(
                    "(()=>{const r=__game.state.menu.rowAt(0),s=__game.game.screen,c=s.canvas.getBoundingClientRect();return [c.left+(s.OX+(r[0]+r[2]/2)*s.S)/s.dpr,c.top+(s.OY+(r[1]+r[3]/2)*s.S)/s.dpr]})()"
                )
                page.touchscreen.tap(*point)
                step(page, 0.3)
            else:
                keypress(page, "Enter")
            check(
                page.evaluate("__game.game.sceneName") == "play",
                engine + " could not start the single file",
            )
            before = page.evaluate("__game.world().players[0].m.x")
            keypress(page, "ArrowRight", 0.4)
            check(
                page.evaluate("__game.world().players[0].m.x") > before + 0.8,
                engine + " movement failed",
            )
            keypress(page, " ")
            check(
                page.evaluate("__game.world().s.stats.plants") == 1,
                engine + " synthesis/plant action failed",
            )
            keypress(page, "Escape")
            check(page.evaluate("__game.game.paused"), engine + " native pause failed")
            check(
                not errors and not page.evaluate("__game.game.errors"),
                engine + " page/native errors: " + str(errors),
            )
            context.close()
        finally:
            browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--groups", default="advanced,campaign,audio,hub,cross")
    args = parser.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            downloads_path=str(DEV / "artifacts/downloads"),
            args=["--autoplay-policy=no-user-gesture-required"],
        )
        cases = {
            "advanced": lambda: advanced(browser),
            "campaign": lambda: campaign(browser),
            "audio": lambda: audio_check(browser),
            "hub": lambda: hub_check(browser),
            "cross": lambda: cross_checks(p),
        }
        for name in args.groups.split(","):
            group(name, cases[name])
        browser.close()
    old = {}
    path = DEV / "artifacts/integration-results.json"
    if path.exists():
        old = json.loads(path.read_text())
    old.update(evidence)
    old.update({"latestGroups": args.groups, "passed": passed, "failures": failures})
    path.write_text(json.dumps(old, indent=2))
    print(f"Integration checks: {passed} passed, {len(failures)} failed")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
