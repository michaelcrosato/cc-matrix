"""Combaton checks. One command, failure-only output and a final count."""

import argparse
import functools
import http.server
import json
import os
import re
import subprocess
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent
GAME = ROOT.name + ".html"
RESULTS = []
DETAILS = {}
REPORT_SCOPE = "all"


def check(name, fn):
    try:
        value = fn()
        if value is False:
            raise AssertionError("returned false")
        RESULTS.append({"name": name, "pass": True})
        return value
    except Exception as exc:  # noqa: BLE001 — collect failures across independent browser checks.
        message = str(exc)
        RESULTS.append({"name": name, "pass": False, "detail": message})
        print(f"FAIL {name}: {message}", flush=True)
        return None


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    global REPORT_SCOPE
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scope",
        default="all",
        choices=["all", "game", "network", "visual", "metadata"],
    )
    args = parser.parse_args()
    REPORT_SCOPE = args.scope
    for file in ["audio.js", "engine.js", "app.js"]:
        check(
            "syntax / " + file,
            lambda file=file: subprocess.run(
                ["node", "--check", str(ROOT / "src" / file)],
                capture_output=True,
                text=True,
                check=True,
            ),
        )
    check("exit interview JSON and embedded credits", validate_interview)
    check(
        "single HTML includes pinned stack and unmodified Hub client",
        lambda: all(
            s in (WORK / GAME).read_text()
            for s in [
                "three@0.180.0",
                "rapier3d-compat@0.19.3",
                (ROOT / "vendor/session.js").read_text(),
            ]
        ),
    )
    if args.scope == "metadata":
        return
    runtime_dir = ROOT / "tests" / ".browser-tmp"
    runtime_dir.mkdir(exist_ok=True)
    os.environ["TMPDIR"] = str(runtime_dir)
    handler = functools.partial(QuietHandler, directory=str(WORK))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1600, "height": 1000}, ignore_https_errors=True
        )
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"{base}/{GAME}", wait_until="domcontentloaded")
        check(
            "boot WebGPU",
            lambda: page.wait_for_function(
                "window.Combaton?.ready && Combaton.versions.backend==='WebGPU'",
                timeout=90000,
            ),
        )
        check(
            "correct page and title screen",
            lambda: (
                page.title().startswith("Combaton")
                and page.locator("button[data-action=solo]").is_visible()
            ),
        )
        if page.evaluate("!window.Combaton"):
            browser.close()
            server.shutdown()
            return
        page.evaluate("Combaton.app.manual=true")
        if args.scope in ["all", "game"]:
            game_checks(page, p, browser, base, errors)
        if args.scope in ["all", "network"]:
            network_checks(page, context, base)
        if args.scope in ["all", "visual"]:
            visual_checks(page, p, browser, base)
        check(
            "no uncaught browser errors",
            lambda: (
                not errors or (_ for _ in ()).throw(AssertionError(json.dumps(errors)))
            ),
        )
        context.close()
        browser.close()
    server.shutdown()


def validate_interview():
    record = json.loads((WORK / "exit-interview.json").read_text())
    expected = {
        "date",
        "source",
        "plan",
        "genre",
        "perspective",
        "tech",
        "artDirection",
        "animation",
        "audio",
        "online",
        "testing",
        "research",
        "environment",
        "model",
        "usage",
    }
    assert set(record["sourceInformation"]) == expected
    assert all(isinstance(v, str) and v for v in record["sourceInformation"].values())
    assert [
        len(record[k]) for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
    ] == [4, 6, 4]
    assert record["sourceInformation"]["usage"] == "added on import"
    match = re.search(r"const EXIT_RECORD = (\{.*\});", (WORK / GAME).read_text())
    assert match and json.loads(match.group(1)) == record
    return True


def game_checks(page, p, browser, base, errors):
    check(
        "WebGPU scene submits geometry to the renderer", lambda: gpu_render_state(page)
    )
    check(
        "default music is ten percent",
        lambda: page.evaluate("Combaton.sound.musicVolume===.1"),
    )
    check("keyboard menu and exercise briefing", lambda: keyboard_menu(page))
    check(
        "controller navigation and adaptive PlayStation/Xbox prompts",
        lambda: controller(page),
    )
    check(
        "Rapier tank / maze collision",
        lambda: page.evaluate("""() => {
      const {game:g,app:a,view:v}=Combaton; a.start('solo');a.state='playing';a.render();
      g.teleport(0,-8,-3); g.teleport(1,18,8);g.entities.forEach(e=>e.invuln=0);
      for(let i=0;i<150;i++)g.tick(1/60,{0:{mx:1,mz:0,fire:false},1:{mx:0,mz:0,fire:false}});
      return g.entities[0].x < -6.7 && g.entities[0].x > -8;
    }"""),
    )
    check(
        "direct shell scores and respawns",
        lambda: page.evaluate("""() => {
      const {game:g}=Combaton;g.initStage(0);g.teleport(0,-17,0);g.teleport(1,-10,0);g.entities.forEach(e=>e.invuln=0);
      for(let i=0;i<60;i++)g.tick(1/60,{0:{mx:0,mz:0,aim:0,fire:i===0},1:{mx:0,mz:0,fire:false}});
      return g.entities[0].score===1 && g.metrics.hits>=1 && g.entities[1].invuln>0;
    }"""),
    )
    check(
        "guided shell bends while firing",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(0);g.teleport(0,-17,0);g.teleport(1,17,8);g.entities[0].aim=0;g.shoot(g.entities[0]);
      for(let i=0;i<20;i++)g.tick(1/60,{0:{mx:0,mz:0,aim:1,fire:true},1:{mx:0,mz:0,fire:false}});
      return g.shots.some(s=>s.owner===0&&s.angle>.15);
    }"""),
    )
    check(
        "bank-only rejects direct hit",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(1);g.teleport(0,-18,0);g.teleport(1,-12,0);g.entities.forEach(e=>e.invuln=0);const before=g.metrics.bankDenied;
      for(let i=0;i<30;i++)g.tick(1/60,{0:{mx:0,mz:0,aim:0,fire:i===0},1:{mx:0,mz:0,fire:false}});
      return g.entities[0].score===0&&g.metrics.bankDenied>before;
    }"""),
    )
    check(
        "bank planner / real ricochet scores",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(1);g.teleport(0,-18,0);g.teleport(1,-12,0);g.entities.forEach(e=>e.invuln=0);g.world.step();
      const bank=g.bankAim(g.entities[0],g.entities[1]);if(!bank)throw Error('no bank route');
      for(let i=0;i<130;i++)g.tick(1/60,{0:{mx:0,mz:0,aim:bank.aim,fire:i===0},1:{mx:0,mz:0,fire:false}});
      return g.entities[0].score===1&&g.entities[0].stats.banks===1;
    }"""),
    )
    check(
        "cloak, firing reveal and scanner",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(2);for(let i=0;i<130;i++)g.tick(1/60,{0:{mx:0,mz:0},1:{mx:0,mz:0}});
      const hidden=g.isHidden(g.entities[1]);g.trick(g.entities[0]);const scanned=!g.isHidden(g.entities[1]);g.entities[1].scan=0;g.shoot(g.entities[1]);return hidden&&scanned&&!g.isHidden(g.entities[1]);
    }"""),
    )
    check(
        "smoke cooldown and native recoil animation",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(0);const e=g.entities[0];g.trick(e);const denied=!g.trick(e);g.shoot(e);e.visual.mixer.update(.045);
      return e.smoke>0&&e.trickCooldown>0&&denied&&e.visual.barrel.position.x<.6;
    }"""),
    )
    check(
        "biplane wrap, clouds and native roll",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(3);g.teleport(0,22.5,0);const e=g.entities[0];e.theta=0;e.aim=0;const before=g.metrics.wraps;
      for(let i=0;i<15;i++)g.tick(1/60,{0:{mx:1,mz:0},1:{mx:0,mz:0}});
      const wrap=g.metrics.wraps>before&&e.x<0;g.teleport(0,-8,-3);const cloud=g.isHidden(e);g.trick(e);e.visual.mixer.update(.3);
      return wrap&&cloud&&e.roll>0&&Math.abs(e.visual.rig.rotation.x)>1;
    }"""),
    )
    check(
        "jet formation has two physical hulls and two missiles",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(4);g.entities[0].aim=0;g.shoot(g.entities[0]);let hulls=0;for(const t of g.colliderTags.values())if(t.kind==='entity'&&t.id===0)hulls++;return hulls===2&&g.shots.filter(s=>s.owner===0).length===2;
    }"""),
    )
    check(
        "hit on wingmate scores",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(4);g.teleport(0,-15,0);g.teleport(1,-7,0);g.entities[1].theta=0;g.entities[1].rb.setRotation({x:0,y:0,z:0,w:1},true);g.entities.forEach(e=>e.invuln=0);g.world.step();
      const hit=g.cast(-12,2.35,1,0,10,c=>g.colliderTags.get(c.handle)?.id===1);return !!hit&&g.colliderTags.get(hit.collider.handle).wing===true;
    }"""),
    )
    check(
        "remote round winner and hit statistics match host",
        lambda: page.evaluate("""() => {
      const g=Combaton.game;g.initStage(0);g.entities[0].score=5;g.entities[0].stats.hits=5;g.entities[0].stats.banks=2;g.finish();const snap=g.snapshot('roundEnd');g.initStage(0);g.applySnapshot(snap);return g.winner===0&&g.entities[0].stats.hits===5&&g.entities[0].stats.banks===2&&g.phase==='done';
    }"""),
    )
    check(
        "live tuning reset and developer tools from pause",
        lambda: page.evaluate("""() => {
      const a=Combaton.app,g=a.game;a.state='playing';a.back();const pause=a.overlay==='pause';a.action('dev');const panel=!!document.querySelector('[data-tuning=speed]');g.tune('speed',11);g.tune('target',9);g.tune('roundSeconds',45);const live=g.tuning.speed===11&&g.timeLeft===45;g.resetTuning();return pause&&panel&&live&&g.tuning.target===5&&g.tuning.speed===7;
    }"""),
    )
    check(
        "pause freezes standalone simulation",
        lambda: page.evaluate("""() => {
      const a=Combaton.app;a.start('solo');a.state='playing';a.overlay='pause';const t=a.game.timeLeft;a.frame(.1);return a.game.timeLeft===t;
    }"""),
    )
    check("complete five-round AI playthrough", lambda: full_exercise(page))
    check(
        "attract begins after ten seconds, cycles all fields and exits on input",
        lambda: page.evaluate("""() => {
      const a=Combaton.app;a.toTitle();a.idleSince=performance.now()-10001;a.frame(.016);if(a.state!=='attract')return false;const stages=[a.game.stageIndex];for(let i=0;i<4;i++){a.attractAt=performance.now()-14001;a.frame(.016);stages.push(a.game.stageIndex);}a.input.note('keyboard');return stages.join(',')==='0,1,2,3,4'&&a.state==='title';
    }"""),
    )
    check(
        "procedural music, effects and gibberish voice render non-silent unclipped audio",
        lambda: audio_check(page),
    )
    check(
        "same-screen independent keyboard players",
        lambda: page.evaluate("""() => {
      const a=Combaton.app;a.start('local');a.input.pads=[];a.input.keys=new Set(['KeyD','ArrowUp','Enter']);const p=a.input.command(0),q=a.input.command(1);a.input.keys.clear();return p.mx===1&&q.mz===-1&&q.fire;
    }"""),
    )
    check(
        "phone touch movement, right-side fire and compact interface",
        lambda: touch_check(p, browser, base, errors),
    )
    check("WebKit touch-profile boot and gameplay", lambda: webkit_check(p, base))
    check("file URL deployment", lambda: file_check(context=page.context))


def keyboard_menu(page):
    page.evaluate("Combaton.app.toTitle()")
    page.keyboard.press("Enter")
    return page.evaluate(
        "Combaton.app.state==='briefing'&&document.body.textContent.includes('Tread lightly')"
    )


def controller(page):
    page.evaluate("""() => {
      window.testPad={id:'DualSense virtual',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});Combaton.app.toTitle();
      testPad.buttons[0]={pressed:true,value:1};Combaton.app.input.poll();testPad.buttons[0]={pressed:false,value:0};Combaton.app.input.poll();
    }""")
    good = page.evaluate(
        "Combaton.app.state==='briefing'&&Combaton.app.input.last==='pad'&&Combaton.app.glyph('confirm').includes('×')"
    )
    page.evaluate("Combaton.app.settings.glyphs='xbox'")
    xbox = page.evaluate("Combaton.app.glyph('confirm').includes('A')")
    page.evaluate(
        "Combaton.app.settings.glyphs='ps';Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]});Combaton.app.input.pads=[];Combaton.app.input.note('keyboard')"
    )
    return good and xbox


def full_exercise(page):
    details = page.evaluate("""() => {
      const a=Combaton.app,g=a.game,v=a.view;a.start('solo');g.autoPilot=true;const report=[];
      for(let stage=0;stage<5;stage++){
        a.state='playing';a.overlay=null;let frames=0;while(g.phase==='playing'&&frames<4500){g.tick(1/60,{});if(frames%5===0)v.update(5/60,g);frames++;}
        report.push({stage:g.stageIndex,frames,phase:g.phase,score:g.entities.map(e=>e.score),shots:g.entities.map(e=>e.stats.shots),banks:g.entities.map(e=>e.stats.banks)});
        if(g.phase!=='done')throw Error('stage '+stage+' did not finish');a.next();
      }
      return {report,state:a.state,rounds:g.rounds.length,totals:g.totals,metrics:{...g.metrics}};
    }""")
    DETAILS["playthrough"] = details
    assert details["state"] == "results" and details["rounds"] == 5, details
    for result in details["report"]:
        assert sum(result["score"]) > 0, (
            f"No actual hits in field {result['stage']}: {result}"
        )
    return True


def audio_check(page):
    result = page.evaluate("Combaton.offlineAudio()")
    DETAILS["audio"] = result
    return result["rms"] > 0.005 and result["peak"] < 1 and result["notes"] > 10


def gpu_render_state(page):
    result = page.evaluate("""() => {
      const a=Combaton.app,v=Combaton.view;a.frame(.016);const info=v.renderer.info;return {backend:v.backend,calls:info.render.drawCalls,triangles:info.render.triangles,geometries:info.memory.geometries};
    }""")
    DETAILS["webgpu"] = result
    return (
        result["backend"] == "WebGPU"
        and result["calls"] > 50
        and result["triangles"] > 1000
    )


def touch_check(p, browser, base, errors):
    ctx = browser.new_context(**p.devices["iPhone 13"], ignore_https_errors=True)
    mobile = ctx.new_page()
    mobile.on("pageerror", lambda e: errors.append(str(e)))
    mobile.goto(f"{base}/{GAME}", wait_until="domcontentloaded")
    mobile.wait_for_function("window.Combaton?.ready", timeout=60000)
    mobile.evaluate(
        "Combaton.app.manual=true;Combaton.app.start('solo');Combaton.app.state='playing';Combaton.app.render()"
    )
    mobile.touchscreen.tap(180, 400)
    mobile.dispatch_event(
        "#world canvas",
        "pointerdown",
        {"pointerId": 7, "pointerType": "touch", "clientX": 55, "clientY": 500},
    )
    mobile.dispatch_event(
        "#world canvas",
        "pointermove",
        {"pointerId": 7, "pointerType": "touch", "clientX": 105, "clientY": 500},
    )
    mobile.dispatch_event(
        "#world canvas",
        "pointerdown",
        {"pointerId": 8, "pointerType": "touch", "clientX": 330, "clientY": 400},
    )
    result = mobile.evaluate(
        "Combaton.app.input.command(0).mx>.7&&Combaton.app.input.command(0).fire&&document.body.classList.contains('touch-only')"
    )
    bounds = mobile.evaluate(
        "Array.from(document.querySelector('.hud-top').children).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})"
    )
    ctx.close()
    return result and bounds


def webkit_check(p, base):
    browser = p.webkit.launch(headless=True)
    context = browser.new_context(**p.devices["iPhone 13"], ignore_https_errors=True)
    page = context.new_page()
    try:
        page.goto(f"{base}/{GAME}", wait_until="domcontentloaded")
        page.wait_for_function("window.Combaton?.ready", timeout=60000)
        return page.evaluate(
            "(()=>{const a=Combaton.app;a.manual=true;a.start('solo');a.state='playing';a.frame(.02);return a.game.phase==='playing'&&a.game.entities.length===2})()"
        )
    finally:
        context.close()
        browser.close()


def file_check(context):
    page = context.new_page()
    page.goto((WORK / GAME).as_uri(), wait_until="domcontentloaded")
    page.wait_for_function("window.Combaton?.ready", timeout=60000)
    ok = page.title().startswith("Combaton")
    page.close()
    return ok


def network_checks(page, context, base):
    check(
        "standalone WebRTC invite/reply and shared movement",
        lambda: rtc_check(page, context, base),
    )
    for scenario in ["standard", "server", "host-leave"]:
        check(
            "AI Hub harness / " + scenario,
            lambda scenario=scenario: hub_check(page, base, scenario),
        )


def rtc_check(page, context, base):
    page.evaluate("Combaton.app.toTitle()")
    guest = context.new_page()
    guest.goto(f"{base}/{GAME}", wait_until="domcontentloaded")
    guest.wait_for_function("window.Combaton?.ready", timeout=60000)
    guest.evaluate("Combaton.app.manual=true")
    offer = page.evaluate("Combaton.net.createOffer()")
    answer = guest.evaluate("(code)=>Combaton.net.acceptOffer(code)", offer)
    page.evaluate("(code)=>Combaton.net.acceptAnswer(code)", answer)
    page.wait_for_function("Combaton.net.ready", timeout=20000)
    guest.wait_for_function("Combaton.net.ready", timeout=20000)
    page.evaluate(
        "Combaton.app.manual=false;Combaton.app.countdownEnd=performance.now()-1;Combaton.app.overlay=null"
    )
    guest.evaluate("Combaton.app.manual=false")
    guest.keyboard.down("KeyA")
    guest.wait_for_timeout(900)
    guest.keyboard.up("KeyA")
    host = page.evaluate(
        "({x:Combaton.game.entities[1].x,z:Combaton.game.entities[1].z,stage:Combaton.game.stageIndex})"
    )
    peer = guest.evaluate(
        "({x:Combaton.game.entities[1].x,z:Combaton.game.entities[1].z,stage:Combaton.game.stageIndex})"
    )
    page.evaluate(
        "Combaton.game.tuning.target=1;Combaton.game.entities[1].invuln=0;Combaton.game.hurt(Combaton.game.entities[1],0,{bank:1})"
    )
    guest.wait_for_function('Combaton.app.state==="roundEnd"', timeout=5000)
    remote = guest.evaluate(
        "({winner:Combaton.game.winner,hits:Combaton.game.entities[0].stats.hits})"
    )
    DETAILS["rtc"] = {"host": host, "guest": peer, "result": remote}
    guest.close()
    page.evaluate(
        "Combaton.app.manual=true;Combaton.net.close();Combaton.game.resetTuning();Combaton.app.toTitle()"
    )
    return (
        host["x"] < 15
        and abs(host["x"] - peer["x"]) < 2
        and host["stage"] == peer["stage"]
        and remote["winner"] == 0
        and remote["hits"] >= 1
    )


def hub_check(page, base, scenario):
    prefix = ROOT.name + "/tests/harness.html"
    page.goto(
        f"{base}/{prefix}?game=../../{GAME}&players=2&latency=150&jitter=50&loss=5&scenario={scenario}&auto=1",
        wait_until="domcontentloaded",
    )
    page.wait_for_function('document.body.dataset.complete === "true"', timeout=110000)
    result = page.evaluate("window.__hubCheck")
    DETAILS["hub-" + scenario] = result
    assert result["pass"], json.dumps(
        [c for c in result["checks"] if not c.get("pass", False)]
    )
    return True


def visual_checks(page, p, browser, base):
    page.goto(f"{base}/{GAME}?renderer=webgl", wait_until="domcontentloaded")
    page.wait_for_function("window.Combaton?.ready", timeout=60000)
    page.evaluate(
        "Combaton.app.manual=true;Combaton.app.toTitle();Combaton.app.frame(.016)"
    )
    check(
        "WebGL compatibility renderer visual readback",
        lambda: page.evaluate("Combaton.versions.backend.includes('WebGL')"),
    )
    page.screenshot(path=str(ROOT / "tests/title.png"))
    for stage in [0, 1, 2, 3, 4]:
        page.evaluate(
            '(stage)=>{Combaton.app.start("practice",stage);Combaton.app.state="playing";Combaton.app.render();Combaton.app.frame(.016)}',
            stage,
        )
        page.screenshot(path=str(ROOT / f"tests/field-{stage + 1}.png"))
    context = browser.new_context(**p.devices["iPhone 13"], ignore_https_errors=True)
    mobile = context.new_page()
    mobile.goto(f"{base}/{GAME}?renderer=webgl", wait_until="domcontentloaded")
    mobile.wait_for_function("window.Combaton?.ready", timeout=60000)
    mobile.evaluate(
        'Combaton.app.manual=true;Combaton.app.input.note("touch");Combaton.app.frame(.016)'
    )
    mobile.screenshot(path=str(ROOT / "tests/touch-title.png"))
    mobile.set_viewport_size({"width": 844, "height": 390})
    mobile.evaluate(
        'Combaton.app.start("practice");Combaton.app.state="playing";Combaton.app.render();Combaton.app.frame(.016)'
    )
    mobile.screenshot(path=str(ROOT / "tests/touch.png"))
    context.close()


try:
    main()
except Exception as exc:  # noqa: BLE001 — report runner failure with the same compact format.
    RESULTS.append({"name": "test runner", "pass": False, "detail": str(exc)})
    print(f"FAIL test runner: {exc}", flush=True)
finally:
    failures = sum(not r["pass"] for r in RESULTS)
    report_name = (
        "results.json" if REPORT_SCOPE == "all" else f"results-{REPORT_SCOPE}.json"
    )
    (ROOT / "tests" / report_name).write_text(
        json.dumps({"checks": RESULTS, "details": DETAILS}, indent=2)
    )
    print(
        f"{len(RESULTS) - failures}/{len(RESULTS)} checks passed; {failures} failures.",
        flush=True,
    )
    raise SystemExit(1 if failures else 0)
