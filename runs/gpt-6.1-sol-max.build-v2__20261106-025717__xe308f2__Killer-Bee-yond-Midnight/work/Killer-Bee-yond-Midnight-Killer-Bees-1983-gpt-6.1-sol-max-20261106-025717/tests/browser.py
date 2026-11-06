import functools
import json
import re
import sys
import threading
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import TypedDict
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ID = json.loads((ROOT / "identity.json").read_text())
ARTIFACT = ROOT.parent / ID["artifact"]
GROUP = sys.argv[sys.argv.index("--group") + 1] if "--group" in sys.argv else "all"


class Failure(TypedDict):
    name: str
    detail: str


class SuiteReport(TypedDict):
    passed: int
    failed: int
    failures: list[Failure]


REPORT: SuiteReport = {"passed": 0, "failed": 0, "failures": []}


def check(name, ok, detail=""):
    if ok:
        REPORT["passed"] += 1
    else:
        REPORT["failed"] += 1
        REPORT["failures"].append({"name": name, "detail": str(detail)[:3000]})


def section(name, fn):
    try:
        fn()
    except Exception:  # noqa: BLE001 - report any failed browser section without losing later evidence
        check(name, False, traceback.format_exc())


def tick(page, seconds=0.1, draw=True):
    page.evaluate("([s,d])=>__midnight.game.advance(s,{draw:d})", [seconds, draw])


def load(page, url=None, stopped=True):
    page.goto(url or ARTIFACT.as_uri())
    page.wait_for_function("window.__midnight !== undefined", timeout=20000)
    if stopped:
        page.evaluate("__midnight.game.stop()")
        tick(page, 0.2)


def start(page, players=1):
    page.evaluate("(n)=>__midnight.start(n)", players)
    tick(page, 0.3)


def press(page, key, seconds=0.05):
    page.keyboard.press(key)
    tick(page, seconds)


def point(page, index):
    return page.evaluate(
        """i=>{const m=__midnight.app.titleMenu,b=m.rowAt(i),s=__midnight.game.screen,r=s.canvas.getBoundingClientRect();return [r.left+(s.OX+(b[0]+b[2]/2)*s.S)/s.dpr,r.top+(s.OY+(b[1]+b[3]/2)*s.S)/s.dpr];}""",
        index,
    )


PAD_INIT = """window.__pads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});window.__pad=(index=0)=>({id:'DualSense Wireless Controller',index,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))});"""


def package_checks():
    html = ARTIFACT.read_text()
    match = re.search(r"<script>([\s\S]*?)</script>", html)
    assert match is not None
    first = match.group(1)
    check(
        "artifact has the exact prescribed root filename",
        ARTIFACT.exists() and ARTIFACT.stem == ROOT.name,
    )
    check(
        "first script is byte-identical pristine Hub client",
        first.encode() == (ROOT / "vendor/hub/session.js").read_bytes(),
    )
    check(
        "single HTML contains all runtime code",
        "<script src=" not in html
        and 'type="module"' not in html
        and "<link " not in html,
    )
    check(
        "artifact has no workstation paths or sample slices",
        "/home/micha/" not in html and "const SLICES =" not in html,
    )
    check(
        "served and file artifacts are identical",
        ARTIFACT.read_bytes() == (ROOT / "build/index.html").read_bytes(),
    )
    interview = (
        json.loads((ROOT.parent / "exit-interview.json").read_text())
        if (ROOT.parent / "exit-interview.json").exists()
        else json.loads((ROOT / "interview.json").read_text())
    )
    check(
        "delivery interview parses with exact top-level schema",
        set(interview)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
    )
    check(
        "catalogue identity matches title and source",
        interview["aiHub"]["name"] == ID["title"]
        and interview["sourceInformation"]["plan"] == "PLAN.md",
    )
    check(
        "delivery feedback has every required answer",
        [
            len(interview[k])
            for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
        ]
        == [4, 6, 4]
        and all(
            isinstance(a, str) and a
            for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
            for a in interview[k]
        ),
    )


def browser_checks(p):
    for engine in ["chromium", "webkit", "firefox"]:
        browser = getattr(p, engine).launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        errors = []
        requests = []
        page.on("pageerror", lambda e, caught=errors: caught.append(str(e)))
        page.on("request", lambda r, seen=requests: seen.append(r.url))
        load(page)
        check(
            f"{engine}: file title boots",
            page.evaluate('__midnight.game.sceneName === "title"'),
        )
        check(
            f"{engine}: music default is persisted setting 10%",
            page.evaluate(
                "__midnight.game.settings.music === .1 && __midnight.game.audio.musicVolume === .1"
            ),
        )
        check(
            f"{engine}: PlayStation symbols are the default",
            page.evaluate('__midnight.game.settings.glyphs === "playstation"'),
        )
        # Pointer hover and click use native menu hit regions.
        xy = point(page, 1)
        page.mouse.move(*xy)
        tick(page)
        check(
            f"{engine}: hover changes native menu focus",
            page.evaluate("__midnight.app.titleMenu.i === 1"),
        )
        page.mouse.click(*point(page, 0))
        tick(page, 0.3)
        check(
            f"{engine}: pointer starts campaign",
            page.evaluate(
                '__midnight.game.sceneName === "run" && __midnight.app.world.players[0].bees === 12'
            ),
        )
        x = page.evaluate("__midnight.app.world.players[0].x")
        page.keyboard.down("d")
        tick(page, 0.4)
        page.keyboard.up("d")
        tick(page)
        check(
            f"{engine}: keyboard steers responsive swarm",
            page.evaluate("__midnight.app.world.players[0].x") > x + 25,
        )
        press(page, "Space")
        check(
            f"{engine}: one press spends exactly one ray",
            page.evaluate(
                "__midnight.app.world.stats.rays === 1 && __midnight.app.world.players[0].charge === 0"
            ),
        )
        page.keyboard.down("Shift")
        tick(page)
        check(
            f"{engine}: held Focus uses authoritative formation",
            page.evaluate("__midnight.app.world.players[0].focus"),
        )
        page.keyboard.up("Shift")
        tick(page)
        press(page, "Escape")
        before = page.evaluate("__midnight.app.world.tick")
        tick(page, 1)
        check(
            f"{engine}: native pause freezes solo and opens menu",
            page.evaluate(
                '__midnight.game.paused && __midnight.app.ui.screen === "pause"'
            )
            and before == page.evaluate("__midnight.app.world.tick"),
        )
        page.get_by_role("button", name="Controls", exact=True).click()
        check(
            f"{engine}: native controls expose ray and Focus rebinding",
            page.get_by_role("dialog").get_by_text("Horizontal ray", exact=True).count()
            > 0
            and page.get_by_role("dialog").get_by_text("Hold Focus", exact=True).count()
            > 0,
        )
        page.evaluate(
            '__midnight.app.ui.hide();__midnight.game.resume();__midnight.game.input.rebind("ray","keys","KeyR")'
        )
        tick(page)
        check(
            f"{engine}: native rebinding updates key labels",
            page.evaluate('__midnight.game.input.label("ray") === "R"'),
        )
        page.evaluate(
            '__midnight.game.settings.set("music",.17);__midnight.game.settings.set("glyphs","xbox")'
        )
        page.reload()
        page.wait_for_function("window.__midnight")
        page.evaluate("__midnight.game.stop()")
        tick(page)
        check(
            f"{engine}: sound and glyph settings survive reload",
            page.evaluate(
                '__midnight.game.settings.music === .17 && __midnight.game.settings.glyphs === "xbox"'
            ),
        )
        check(
            f"{engine}: no external audio or asset requests",
            all(u.startswith("file:") for u in requests),
        )
        check(
            f"{engine}: no page or native collected errors",
            not errors and page.evaluate("__midnight.game.errors.length === 0"),
            errors,
        )
        context.close()
        browser.close()


def access_checks(p):
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    context.add_init_script(PAD_INIT)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    load(page)
    page.evaluate("window.__pads=[__pad(0),__pad(1)];__pads[0].axes=[.1,.1,0,0]")
    tick(page)
    check(
        "standard pad dead zone ignores drift",
        page.evaluate("Math.hypot(...__midnight.game.input.move()) === 0"),
    )
    page.evaluate("__pads[0].buttons[0]={pressed:true,value:1,touched:true}")
    tick(page, 0.3)
    check(
        "Cross starts a campaign through native input",
        page.evaluate('__midnight.game.sceneName === "run"'),
    )
    tick(page, 0.3)
    check(
        "held menu confirm does not fire opening ray",
        page.evaluate("__midnight.app.world.stats.rays === 0"),
    )
    page.evaluate(
        "__pads[0].buttons[0]={pressed:false,value:0};__pads[0].axes=[.7,0,0,0]"
    )
    before = page.evaluate("__midnight.app.world.players[0].x")
    tick(page, 0.4)
    check(
        "analogue pad movement reaches simulation",
        page.evaluate("__midnight.app.world.players[0].x") > before + 15,
    )
    page.evaluate(
        "__pads[0].axes=[0,0,0,0];__pads[0].buttons[7]={pressed:true,value:1};"
    )
    tick(page)
    check(
        "R2 compresses the swarm with PlayStation prompt",
        page.evaluate(
            '__midnight.app.world.players[0].focus && __midnight.game.input.label("focus") === "R2"'
        ),
    )
    page.evaluate('__midnight.game.settings.set("glyphs","xbox")')
    check(
        "Xbox glyph option uses A and RT",
        page.evaluate(
            '__midnight.game.input.label("ray") === "A" && __midnight.game.input.label("focus") === "RT"'
        ),
    )
    page.evaluate("__pads[0].buttons[7]={pressed:false,value:0};__midnight.title()")
    tick(page, 0.3)
    page.evaluate("__midnight.coOp()")
    tick(page, 0.3)
    page.evaluate('__midnight.app.titleMenu.i=0;__midnight.game.input.tap("confirm")')
    tick(page, 0.3)
    check(
        "couch setup claims two standard pads",
        page.evaluate(
            '__midnight.app.mode === "couch" && __midnight.game.players.length === 2 && __midnight.game.players[1].pad === 1'
        ),
    )
    before = page.evaluate("__midnight.app.world.players.map(p=>[p.x,p.y])")
    page.evaluate("__pads[0].axes=[-.8,0,0,0];__pads[1].axes=[0,.8,0,0]")
    tick(page, 0.5)
    after = page.evaluate("__midnight.app.world.players.map(p=>[p.x,p.y])")
    check(
        "two pads independently steer shared couch world",
        after[0][0] < before[0][0] - 15 and after[1][1] > before[1][1] + 15,
    )
    page.evaluate(
        "__pads[0].axes=[0,0,0,0];__pads[1].axes=[0,0,0,0];__pads[1].connected=false"
    )
    tick(page)
    check(
        "couch controller disconnect pauses safely",
        page.evaluate("__midnight.game.paused"),
    )
    page.evaluate(
        "__pads[1].connected=true;__midnight.app.ui.hide();__midnight.game.resume()"
    )
    tick(page)
    check(
        "couch reconnect returns coherent controls",
        page.evaluate(
            "__midnight.game.players.length === 2 && __midnight.app.world.players.length === 2"
        ),
    )
    page.evaluate("__pads=[];__midnight.title()")
    tick(page, 0.3)
    page.evaluate("__midnight.coOp()")
    tick(page, 0.3)
    page.evaluate('__midnight.app.titleMenu.i=0;__midnight.game.input.tap("confirm")')
    tick(page, 0.3)
    check(
        "shared keyboard uses native left and right layouts",
        page.evaluate(
            '__midnight.game.players[0].half === "left" && __midnight.game.players[1].half === "right"'
        ),
    )
    before = page.evaluate("__midnight.app.world.players.map(p=>[p.x,p.y])")
    page.keyboard.down("a")
    page.keyboard.down("ArrowDown")
    tick(page, 0.4)
    page.keyboard.up("a")
    page.keyboard.up("ArrowDown")
    tick(page)
    after = page.evaluate("__midnight.app.world.players.map(p=>[p.x,p.y])")
    check(
        "shared keyboard independently steers both swarms",
        after[0][0] < before[0][0] - 20 and after[1][1] > before[1][1] + 20,
    )
    # Reset to standalone title to check the idle threshold exactly.
    page.evaluate("__pads=[];__midnight.title()")
    tick(page, 0.3)
    page.evaluate("__midnight.app.idle=0")
    tick(page, 9.9, False)
    check(
        "attract does not start before ten seconds",
        page.evaluate('__midnight.game.sceneName === "title"'),
    )
    tick(page, 0.2)
    check(
        "attract starts after ten idle seconds",
        page.evaluate(
            '__midnight.game.sceneName === "attract" && __midnight.app.attract'
        ),
    )
    saved = page.evaluate('My3D2dge.store.get("best:clean",0)')
    tick(page, 90, False)
    coverage = page.evaluate(
        "({stats:__midnight.app.world.stats,stage:__midnight.app.world.stage,part:__midnight.app.demoPart})"
    )
    check(
        "attract exercises real sting, Focus, shells and rays",
        coverage["stats"]["kills"] > 0
        and coverage["stats"]["focusTicks"] > 0
        and coverage["stats"]["zaps"] > 0,
        coverage,
    )
    check(
        "attract covers maturation and finale exposure",
        coverage["stats"]["maturations"] > 0 and coverage["stats"]["bossExposures"] > 0,
        coverage,
    )
    check(
        "attract isolates local best scores",
        saved == page.evaluate('My3D2dge.store.get("best:clean",0)'),
    )
    page.mouse.move(500, 400)
    tick(page)
    check(
        "mouse movement cancels attract and consumes input",
        page.evaluate(
            '__midnight.game.sceneName === "title" && !__midnight.app.attract && __midnight.app.world === null'
        ),
    )
    for family in ["keyboard", "pad", "touch"]:
        page.evaluate("__midnight.app.idle=10")
        tick(page, 0.1)
        if family == "keyboard":
            page.keyboard.press("Space")
        elif family == "pad":
            page.evaluate("__pads=[__pad(0)];__pads[0].axes=[.8,0,0,0]")
        else:
            page.evaluate(
                "window.dispatchEvent(new PointerEvent('pointerdown',{pointerId:44,pointerType:'touch',clientX:100,clientY:100,button:0,bubbles:true}))"
            )
        tick(page, 0.1)
        check(
            f"{family} cancels attract without entering play",
            page.evaluate(
                '__midnight.game.sceneName === "title" && !__midnight.app.attract'
            ),
        )
        page.evaluate("__pads=[]")
        tick(page, 0.25)
    # Native dev controls and About use the engine's existing Shell.
    start(page)
    press(page, "Escape")
    page.get_by_role("button", name="Developer tools", exact=True).click()
    check(
        "developer tools are reachable from pause",
        page.evaluate('__midnight.app.ui.screen === "dev"'),
    )
    page.get_by_role("button", name="Flight & sting", exact=True).click()
    page.evaluate('__midnight.game.settings.set("dev_speed",100)')
    tick(page)
    check(
        "live slider changes authoritative tuning and marks assisted",
        page.evaluate(
            "__midnight.app.world.tuning.speed === 100 && __midnight.app.world.assisted"
        ),
    )
    page.get_by_role("button", name="Reset tuning to defaults", exact=True).click()
    tick(page)
    check(
        "reset sliders restores defaults without erasing assistance",
        page.evaluate(
            "__midnight.app.world.tuning.speed === 86 && __midnight.app.world.assisted"
        ),
    )
    page.evaluate(
        '__midnight.game.settings.set("devTime",.25);__midnight.app.ui.hide()'
    )
    tick(page)
    check(
        "closing developer tools restores speed and clears held actions",
        page.evaluate("__midnight.game.timeScale === 1 && !__midnight.app.devOpen"),
    )
    # Fast fixtures isolate save routing, not the principal campaign completion proof.
    start(page)
    page.evaluate(
        "__midnight.app.world.score=900;__midnight.app.world.players[0].bees=0"
    )
    tick(page, 0.2)
    check(
        "failure offers retry, restart and title through native menu",
        page.evaluate(
            '__midnight.app.runMenu.items.join("|") === "Retry encounter|Restart campaign|Title"'
        ),
    )
    page.evaluate('__midnight.app.runMenu.i=0;__midnight.game.input.tap("confirm")')
    tick(page, 0.3)
    check(
        "retry returns twelve bees and marks assisted run",
        page.evaluate(
            '__midnight.app.world.players[0].bees===12 && __midnight.app.world.assisted && __midnight.app.world.phase === "play"'
        ),
    )
    page.evaluate('__midnight.app.world.phase="ending";__midnight.app.world.score=1500')
    tick(page, 0.2)
    check(
        "assisted ending saves separately from clean best",
        page.evaluate(
            'My3D2dge.store.get("best:clean",0)===900 && My3D2dge.store.get("best:assisted",0)===1500'
        ),
    )
    page.evaluate("__midnight.title()")
    tick(page, 0.3)
    page.evaluate('__midnight.app.titleMenu.i=3;__midnight.game.input.tap("confirm")')
    tick(page)
    check(
        "About exposes all four required information groups",
        all(
            page.get_by_role("button", name=label, exact=True).count()
            for label in [
                "Source Information 1/3",
                "Source Information 2/3",
                "Source Information 3/3",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
            ]
        ),
    )
    page.get_by_role("button", name="Source Information 3/3", exact=True).click()
    check(
        "credits include model, environment and usage provenance",
        "added on import" in page.get_by_role("dialog").inner_text()
        and "gpt-6.1-sol" in page.get_by_role("dialog").inner_text(),
    )
    page.wait_for_timeout(300)
    page.screenshot(path=str(ROOT / "evidence/credits.png"))
    check(
        "access flows have no uncaught browser or native errors",
        not errors and page.evaluate("__midnight.game.errors.length === 0"),
        errors,
    )
    context.close()
    # Storage can be unavailable on file origins; the native memory fallback must keep playing.
    blocked_context = browser.new_context()
    blocked_context.add_init_script(
        "Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked for storage test')}})"
    )
    blocked_page = blocked_context.new_page()
    load(blocked_page)
    start(blocked_page)
    blocked_page.evaluate('__midnight.game.settings.set("music",.22)')
    tick(blocked_page)
    check(
        "blocked storage retains playable visit-local settings",
        blocked_page.evaluate(
            '__midnight.game.sceneName === "run" && __midnight.game.settings.music === .22 && __midnight.game.errors.length === 0'
        ),
    )
    blocked_context.close()
    browser.close()


def touch_and_visual_checks(p):
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(**p.devices["iPhone 13"])
    page = context.new_page()
    load(page)
    page.screenshot(path=str(ROOT / "evidence/portrait-title.png"))
    page.touchscreen.tap(*point(page, 0))
    tick(page, 0.3)
    check(
        "touch menu starts the same campaign",
        page.evaluate('__midnight.game.sceneName === "run"'),
    )
    client = context.new_cdp_session(page)

    def touches(kind, items):
        client.send(
            "Input.dispatchTouchEvent",
            {
                "type": kind,
                "touchPoints": [{"id": i, "x": x, "y": y} for i, x, y in items],
            },
        )
        tick(page, 0.1)

    touches("touchStart", [(1, 80, 590)])
    touches("touchMove", [(1, 125, 570)])
    touches("touchStart", [(1, 125, 570), (2, 320, 440)])
    before = page.evaluate("__midnight.app.world.players[0].x")
    tick(page, 0.3)
    check(
        "touch supports simultaneous steering and Focus hold",
        page.evaluate("__midnight.app.world.players[0].focus")
        and page.evaluate("__midnight.app.world.players[0].x") > before,
    )
    ray = page.locator('button[data-act="ray"]').bounding_box()
    if ray:
        touches(
            "touchStart",
            [
                (1, 125, 570),
                (2, 320, 440),
                (3, ray["x"] + ray["width"] / 2, ray["y"] + ray["height"] / 2),
            ],
        )
        check(
            "third touch fires ray while steering and focusing",
            page.evaluate("__midnight.app.world.stats.rays === 1"),
        )
    else:
        check("contextual touch ray button is present when charged", False)
    touches("touchEnd", [])
    tick(page, 0.2)
    check(
        "releasing Focus does not emit a second ray",
        page.evaluate(
            "__midnight.app.world.stats.rays === 1 && !__midnight.app.world.players[0].focus"
        ),
    )
    touches("touchStart", [(7, 70, 600)])
    touches("touchMove", [(7, 130, 590)])
    touches("touchCancel", [])
    check(
        "touch cancellation clears stick and actions",
        page.evaluate(
            "!__midnight.game.input.stickOn && !__midnight.app.world.players[0].focus"
        ),
    )
    page.screenshot(path=str(ROOT / "evidence/portrait-gameplay.png"))
    context.close()
    # Exact arena containment after every resize, independent of device orientation.
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()
    load(page)
    start(page, 2)
    for w, h in [
        (1920, 1080),
        (1280, 720),
        (390, 844),
        (844, 390),
        (768, 1024),
        (320, 568),
    ]:
        page.set_viewport_size({"width": w, "height": h})
        tick(page, 0.1)
        result = page.evaluate(
            """()=>{const g=__midnight.game,q=[[0,0],[384,0],[384,240],[0,240]].map(([x,y])=>{const p=g.view.p(x,y,0);return[p[0]-g.cam.x,p[1]-g.cam.y]});return{corners:q,W:g.W,H:g.H,fit:__midnight.app.garden.rect};}"""
        )
        ok = all(
            0 <= x <= result["W"]
            and (74 if result["fit"]["portrait"] else 43)
            <= y
            <= result["H"] - (75 if result["fit"]["portrait"] else 25)
            for x, y in result["corners"]
        )
        check(f"fixed arena fits viewport {w}x{h} outside HUD/touch", ok, result)
    page.set_viewport_size({"width": 1920, "height": 1080})
    tick(page)
    page.evaluate("__midnight.loadStage(5)")
    tick(page, 1.6)
    page.screenshot(path=str(ROOT / "evidence/finale.png"))
    page.evaluate(
        '__midnight.game.settings.set("motion",true);__midnight.game.settings.set("flashes",0)'
    )
    tick(page)
    check(
        "motion and flash comfort controls apply",
        page.evaluate(
            "__midnight.game.reduceMotion && __midnight.game.settings.flashes === 0"
        ),
    )
    # Inspect contact, recovery, formation size and ray readability together.
    page.evaluate(
        """()=>{const a=__midnight;a.game.settings.set('motion',false);a.game.settings.set('flashes',.6);a.app.ui.hide();a.game.resume();a.loadStage(2);a.game.advance(.01,{draw:false});const s=a.app.world;s.targets=[];s.rivals=[];s.husks=[];s.queue=[{at:1e9,type:'left',entrance:0}];s.nextRival=1e9;s.time=120;s.stageTime=45;const base={r:7,hp:.7,maxHp:1.65,dir:0,turn:-1,lastContact:40,warning:0,contrib:[0,0],stuck:0,think:99,recovering:false,bossPhase:'move',bossT:0,circuit:0};s.targets=[{...base,id:900,type:'left',x:170,y:120},{...base,id:901,type:'right',x:284,y:160,recovering:true}];const rival={r:8,dir:0,warning:0,turn:20,want:0,matureAt:110};s.rivals=[{...rival,id:910,x:65,y:120,age:1,state:0},{...rival,id:911,x:250,y:60,age:15,state:1},{...rival,id:912,x:310,y:100,age:30,state:2}];s.husks=[{id:920,x:205,y:85,r:10.5,type:'right',born:100}];Object.assign(s.players[0],{x:168,y:120,bees:12,charge:1,inv:0});Object.assign(s.players[1],{x:220,y:120,bees:12,charge:1,inv:0});a.app.garden.reset(s);a.command(0,{x:0,y:0,focus:false,ray:s.players[0].lastRay+1});a.command(1,{x:0,y:0,focus:true,ray:s.players[1].lastRay});a.game.advance(1/120,{draw:true});}"""
    )
    page.screenshot(path=str(ROOT / "evidence/combat-cues.png"))
    checkpoint = json.loads((ROOT / "evidence/final-checkpoint.json").read_text())
    page.evaluate(
        """fixture=>{const a=__midnight;a.release();a.app.ui.hide();a.game.resume();a.app.world=fixture.world;a.app.display=null;a.app.lastPhase=null;a.app.bestSaved=false;a.app.inputGate=0;a.app.garden.reset(a.app.world);fixture.commands.forEach((c,i)=>a.command(i,c));}""",
        checkpoint,
    )
    tick(page, 4.5)
    check(
        "packaged normal replay checkpoint reaches complete ending",
        page.evaluate(
            '__midnight.app.world.phase === "ending" && __midnight.app.runMenu.items.join("|") === "Play again|Title"'
        ),
    )
    page.screenshot(path=str(ROOT / "evidence/ending.png"))
    page.evaluate('__midnight.app.runMenu.i=0;__midnight.game.input.tap("confirm")')
    tick(page, 0.3)
    check(
        "couch Play again preserves both swarms and shared mode",
        page.evaluate(
            '__midnight.app.mode === "couch" && __midnight.app.world.players.length === 2 && __midnight.app.world.phase === "play"'
        ),
    )
    # Native anatomy/material sheets for future asset authoring.
    page.evaluate(
        """()=>{const a=__midnight,g=a.game,E=My3D2dge,{px,font}=E;g.setZoom(1);g.cam.offset=null;g.cam.smooth=0;const left=new a.app.garden.rigs.GardenerRig('left'),right=new a.app.garden.rigs.GardenerRig('right'),bell=new a.app.garden.rigs.GardenerRig('bell'),base={hp:1,maxHp:1,warning:0,bossPhase:'open',bossT:1};for(const rig of [left,right,bell])rig.update(.1,base);g.start({update(){g.focus(g.W/2,g.H/2,0);},draw(r){r.sky(['#10222b','#10222b']);r.actor(70,82,0,(ctx,x,y)=>a.app.garden.rigs.bee(ctx,x,y,-.4,3.4,1));r.actor(175,82,0,(ctx,x,y)=>a.app.garden.rigs.bee(ctx,x,y,-.4,3.4,1,{body:'#b9decf',light:'#effff0',dark:'#3a6460'}));r.actor(280,82,0,(ctx,x,y)=>left.draw(ctx,x,y,{...r.view,zoom:2}));r.actor(375,82,0,(ctx,x,y)=>right.draw(ctx,x,y,{...r.view,zoom:2}));r.actor(485,82,0,(ctx,x,y)=>bell.draw(ctx,x,y,{...r.view,zoom:1.5}));r.shape('garden-bed',110,182,0,{params:{w:54,d:24}});r.shape('garden-dial',285,182,0);r.shape('garden-jewel',455,182,0,{scale:2});r.overlay(ctx=>{font.title(ctx,'MIDNIGHT / NATIVE ASSETS',r.W/2,14,{scale:2,align:'center',colors:['#fff1c8','#bc9d69']});for(const[label,x]of [['GOLD',70],['MINT',175],['LEFTENANT',280],['RIGHTO',375],['BELLWETHER',485]])font.text(ctx,label,x,125,'#c8d7bf',{align:'center',outline:false});for(const[label,x]of [['GLAZED BED',110],['NIGHT DIAL',285],['DEW TUNNEL',455]])font.text(ctx,label,x,220,'#c8d7bf',{align:'center',outline:false});font.text(ctx,'Segmented bodies / paired wings / native shaded volumes',r.W/2,278,'#b7c7b3',{align:'center',outline:false});});}});g.advance(.1,{draw:true});}"""
    )
    page.screenshot(path=str(ROOT / "evidence/asset-sheet.png"))
    page.evaluate(
        """()=>{const g=__midnight.game,E=My3D2dge,{px,font}=E;const palettes=[['MOONFLOWER',['#101f25','#3c6760','#355952','#efc28b','#edcf86']],['GLASSHOUSE',['#171c2b','#53607b','#395e60','#bc9bd5','#b7d9dd']],['MIDNIGHT ORCHARD',['#181f29','#5c6465','#466154','#e3a5a3','#f3c47c']]];g.start({update(){g.focus(g.W/2,g.H/2,0);},draw(r){r.sky(['#0c1922','#0c1922']);r.overlay(ctx=>{font.title(ctx,'THE GARDEN PALETTES',r.W/2,15,{scale:2,align:'center',colors:['#fff0c5','#c3a470']});palettes.forEach(([name,colors],row)=>{const y=65+row*76;font.text(ctx,name,25,y,'#e5d7b2',{outline:false});colors.forEach((c,i)=>{const x=25+i*105;px.rect(ctx,x,y+16,86,28,c);font.text(ctx,c,x,y+49,'#bdcebd',{outline:false});});});});}});g.advance(.1,{draw:true});}"""
    )
    page.screenshot(path=str(ROOT / "evidence/palette-sheet.png"))
    check(
        "visual fixtures have no collected drawing errors",
        page.evaluate("__midnight.game.errors.length === 0"),
        page.evaluate("__midnight.game.errors"),
    )
    context.close()
    browser.close()


def audio_checks(p):
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    load(page)
    start(page)
    page.keyboard.press("Control")
    tick(page)
    voice = page.evaluate("__midnight.offlineVoice()")
    check(
        "actual procedural chatter has finite nonzero offline output",
        voice["finite"] and voice["peak"] > 0.001 and voice["rms"] > 0.0001,
        voice,
    )
    check("procedural chatter envelope decays to silence", voice["tail"] < 1e-9, voice)
    levels = page.evaluate(
        """async()=>{const A=__midnight.game.audio,c=A.ctx;await c.resume();const analyser=c.createAnalyser();analyser.fftSize=512;A.bus('sfx').connect(analyser);const data=new Float32Array(512);A.sfx({wave:'triangle',freq:440,to:800,dur:.2,vol:.5});let peak=0;for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,15));analyser.getFloatTimeDomainData(data);for(const v of data)peak=Math.max(peak,Math.abs(v));}return{peak,finite:Number.isFinite(peak),music:A.musicVolume,master:A._master.gain.value};}"""
    )
    check(
        "native SFX bus produces nonzero finite synthesis",
        levels["finite"] and levels["peak"] > 0.001,
        levels,
    )
    page.evaluate('__midnight.game.settings.set("sound",false)')
    check(
        "native mute reaches actual master gain",
        page.evaluate("__midnight.game.audio._master.gain.value === 0"),
    )
    page.evaluate(
        '__midnight.game.settings.set("sound",true);__midnight.game.settings.set("voice",.23);__midnight.game.settings.set("effects",.35);__midnight.app.audio.stop()'
    )
    check(
        "voice and SFX controls reach their buses",
        page.evaluate(
            "Math.abs(__midnight.game.audio._voiceBus.gain.value-.23)<.00001 && Math.abs(__midnight.game.audio._sfxBus.gain.value-.35)<.00001"
        ),
    )
    check(
        "ending audio stop cancels the original score",
        page.evaluate("!__midnight.game.audio.pos.playing"),
    )
    context.close()
    browser.close()


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def hub_checks(p, base):
    browser = p.chromium.launch(headless=True)
    reports = []
    cases = [
        ("solo", 1, "standard", 0, 0, 0),
        ("duo", 2, "standard", 0, 0, 0),
        ("lag", 2, "standard", 150, 50, 5),
        ("host-leave", 2, "host-leave", 0, 0, 0),
        ("dedicated", 2, "server", 0, 0, 0),
    ]
    for label, players, scenario, latency, jitter, loss in cases:
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        args = {
            "game": "../../build/index.html",
            "players": players,
            "auto": 1,
            "play": 4500,
            "scenario": scenario,
            "latency": latency,
            "jitter": jitter,
            "loss": loss,
        }
        page.goto(base + "/vendor/hub/harness.html?" + urlencode(args))
        page.wait_for_function(
            'Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.__midnight)',
            timeout=20000,
        )
        # Start clock cannot be bypassed by normal actions or explicit engine stepping.
        gated = page.evaluate(
            """()=>Array.from(document.querySelectorAll('iframe')).every(f=>{const a=f.contentWindow.__midnight;return a.app.world.tick===0&&!a.app.attract&&a.game.sceneName==='run';})"""
        )
        check(f"Hub {label}: auto-ready bypasses title and gates pre-start play", gated)
        page.wait_for_function(
            'Array.from(document.querySelectorAll("iframe")).some(f=>f.contentWindow.AIHub.time()>=0)',
            timeout=15000,
        )
        if players == 2 and scenario != "host-leave":
            # The actual remote page submits intention through the actual bridge.
            initial = page.evaluate(
                """()=>{const frames=Array.from(document.querySelectorAll('iframe')),host=frames.find(f=>f.contentWindow.__midnight.app.host).contentWindow.__midnight;const guest=frames.find(f=>!f.contentWindow.__midnight.app.host).contentWindow.__midnight;guest.command(guest.app.local,{x:1,y:0,focus:false,ray:1});return{guest:guest.app.local,x:host.app.world.players[guest.app.local].x};}"""
            )
            page.wait_for_timeout(800 if not latency else 1100)
            actual = page.evaluate(
                """()=>{const a=Array.from(document.querySelectorAll('iframe')).find(f=>f.contentWindow.__midnight.app.host).contentWindow.__midnight;return{players:a.app.world.players,rays:a.app.world.stats.rays};}"""
            )
            check(
                f"Hub {label}: remote steering changes host-owned position",
                actual["players"][initial["guest"]]["x"] > initial["x"] + 15,
                actual,
            )
            check(
                f"Hub {label}: remote ray is delivered exactly once",
                actual["rays"] == 1,
                actual,
            )
            if scenario == "server":
                check(
                    "Hub dedicated: authority has no canvas, local seat or audio context",
                    page.evaluate(
                        """()=>{const a=Array.from(document.querySelectorAll('iframe')).find(f=>f.contentWindow.__midnight.app.host).contentWindow.__midnight;return a.game.headless&&a.game.r===null&&a.app.local===-1&&a.game.audio.ctx===null;}"""
                    ),
                )
            elif label == "duo":
                before = page.evaluate(
                    """()=>{const a=document.querySelector('iframe').contentWindow.__midnight;a.game.menu('settings');return a.app.world.tick;}"""
                )
                page.wait_for_timeout(300)
                check(
                    "Hub host settings overlay keeps authority moving",
                    page.evaluate(
                        "document.querySelector('iframe').contentWindow.__midnight.app.world.tick"
                    )
                    > before,
                )
        page.wait_for_function(
            'document.body.dataset.complete === "true"', timeout=30000
        )
        report = page.evaluate("window.__hubCheck")
        reports.append({"case": label, "report": report})
        check(
            f"official Hub harness {label} completes and passes",
            report.get("pass") is True,
            [c for c in report.get("checks", []) if not c["pass"]],
        )
        if scenario != "host-leave":
            metrics = page.evaluate(
                """()=>Array.from(document.querySelectorAll('iframe')).map(f=>{const a=f.contentWindow.__midnight;return{metrics:a.app.net.metrics,ended:a.app.ended,attract:a.app.attract,errors:a.game.errors};})"""
            )
            check(
                f"Hub {label}: end stops transport/input/audio ownership",
                all(
                    a["ended"] and not a["attract"] and not a["errors"] for a in metrics
                ),
                metrics,
            )
            check(
                f"Hub {label}: measured traffic obeys limits",
                all(
                    a["metrics"]["maxRate"] <= 18
                    and a["metrics"]["maxBytes"] <= 16384
                    and a["metrics"]["unreliableMax"] <= 1200
                    for a in metrics
                ),
                metrics,
            )
        context.close()
    # Guest departure is independent of a host departure and keeps the remaining swarm playable.
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    page.goto(
        base
        + "/vendor/hub/harness.html?"
        + urlencode(
            {
                "game": "../../build/index.html",
                "players": 2,
                "auto": 1,
                "play": 6500,
                "latency": 0,
                "jitter": 0,
                "loss": 0,
            }
        )
    )
    page.wait_for_function(
        "document.querySelector('iframe')?.contentWindow.__midnight?.app.world.tick>30",
        timeout=20000,
    )
    page.select_option("#who", "p1")
    page.click("#remove")
    page.wait_for_timeout(250)
    check(
        "Hub guest departure neutralizes removed seat and continues",
        page.evaluate(
            "()=>{const a=document.querySelector('iframe').contentWindow.__midnight;return !a.app.world.players[1].joined&&a.app.world.players[1].bees===0&&a.app.world.phase==='play';}"
        ),
    )
    page.wait_for_function('document.body.dataset.complete === "true"', timeout=25000)
    check(
        "Hub remaining player receives valid tied team result",
        page.evaluate("window.__hubCheck.pass === true"),
        page.evaluate("window.__hubCheck.checks.filter(c=>!c.pass)"),
    )
    context.close()
    checkpoint_path = ROOT / "evidence/final-checkpoint.json"
    if checkpoint_path.exists():
        checkpoint = json.loads(checkpoint_path.read_text())
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        page.goto(
            base
            + "/vendor/hub/harness.html?"
            + urlencode(
                {
                    "game": "../../build/index.html",
                    "players": 2,
                    "auto": 1,
                    "play": 14000,
                    "latency": 0,
                    "jitter": 0,
                    "loss": 0,
                }
            )
        )
        page.wait_for_function(
            "document.querySelector('iframe')?.contentWindow.__midnight?.app.world.tick>2",
            timeout=20000,
        )
        page.evaluate(
            """fixture=>{const a=Array.from(document.querySelectorAll('iframe')).find(f=>f.contentWindow.__midnight.app.host).contentWindow.__midnight;a.app.world=fixture.world;a.app.lastPhase=null;a.app.net.records.clear();a.app.rayCounters=a.app.world.players.map(p=>p.lastRay);const c=fixture.commands[0];a.command(0,c);window.__naturalHost=a;window.__finishCalls=0;const hub=a.app.info;const win=Array.from(document.querySelectorAll('iframe')).find(f=>f.contentWindow.__midnight===a).contentWindow;const finish=win.AIHub.finish;win.AIHub.finish=(data)=>{window.__finishCalls++;window.__naturalResult=data;return finish(data);};}""",
            checkpoint,
        )
        page.wait_for_function("window.__naturalResult !== undefined", timeout=10000)
        check(
            "Hub normal ending checkpoint finishes won exactly once",
            page.evaluate(
                "__naturalResult.won === true && __finishCalls === 1 && __naturalResult.standings.length === 1"
            ),
            page.evaluate("__naturalResult"),
        )
        page.wait_for_function(
            'document.body.dataset.complete === "true"', timeout=18000
        )
        check(
            "official harness accepts normal ending independent of time-up",
            page.evaluate("window.__hubCheck.pass === true"),
            page.evaluate("window.__hubCheck.checks.filter(c=>!c.pass)"),
        )
        context.close()
    else:
        check(
            "normal ending replay checkpoint is available",
            False,
            "Run simulation group before Hub group to generate the principal replay checkpoint.",
        )
    (ROOT / "evidence/hub-results.json").write_text(json.dumps(reports, indent=2))
    browser.close()


def peer_checks(p):
    browser = p.chromium.launch(headless=True)
    ca = browser.new_context()
    cg = browser.new_context()
    host = ca.new_page()
    guest = cg.new_page()
    for page in [host, guest]:
        load(page, stopped=False)
        page.evaluate("__midnight.peerMenu()")
    invalid = guest.evaluate(
        """async()=>{try{await __midnight.getPeer().answer('not-a-code');return false;}catch(e){return e.message.includes('garden code');}}"""
    )
    check("direct setup recovers from malformed codes", invalid)
    offer = host.evaluate("async()=>await __midnight.getPeer().offer()")
    answer = guest.evaluate(
        "async code=>await __midnight.getPeer().answer(code)", offer
    )
    host.evaluate("async code=>await __midnight.getPeer().accept(code)", answer)
    for page in [host, guest]:
        page.wait_for_function(
            '__midnight.app.mode === "peer" && __midnight.game.sceneName === "run"',
            timeout=15000,
        )
    check(
        "real serverless WebRTC offer/answer opens ordered data channel",
        host.evaluate(
            '__midnight.getPeer().channel.readyState === "open" && __midnight.getPeer().channel.ordered'
        )
        and guest.evaluate('__midnight.getPeer().channel.readyState === "open"'),
    )
    initial = host.evaluate("__midnight.app.world.players[1].x")
    guest.evaluate("__midnight.command(1,{x:1,y:0,focus:true,ray:1})")
    host.wait_for_timeout(900)
    state = host.evaluate(
        "({player:__midnight.app.world.players[1],rays:__midnight.app.world.stats.rays})"
    )
    check(
        "real WebRTC guest steers and focuses host-authoritative swarm",
        state["player"]["x"] > initial + 20 and state["player"]["focus"],
        state,
    )
    check(
        "real WebRTC repeats do not duplicate guest ray",
        state["rays"] == 1 and state["player"]["charge"] == 0,
        state,
    )
    guest.evaluate("__midnight.release()")
    host.wait_for_timeout(600)
    check(
        "direct peer release clears host movement and Focus",
        host.evaluate(
            "__midnight.app.world.players[1].vx === 0 && !__midnight.app.world.players[1].focus"
        ),
    )
    before = host.evaluate("__midnight.app.world.tick")
    host.evaluate('__midnight.game.menu("settings")')
    host.wait_for_timeout(300)
    check(
        "direct host settings overlay keeps world moving",
        host.evaluate("__midnight.app.world.tick") > before,
    )
    host.evaluate("__midnight.app.ui.hide()")
    host.evaluate("__midnight.app.world.players.forEach(p=>p.bees=0)")
    host.wait_for_function('__midnight.app.world.phase === "failed"', timeout=3000)
    host.wait_for_timeout(250)
    host.evaluate('__midnight.app.runMenu.i=1;__midnight.game.input.tap("confirm")')
    host.wait_for_function('__midnight.app.world.phase === "play"', timeout=3000)
    check(
        "direct host can restart a clean campaign on the same channel",
        host.evaluate(
            "__midnight.app.world.stage===0 && __midnight.app.world.score===0 && !__midnight.app.world.assisted && __midnight.app.world.players.every(p=>p.bees===12)"
        ),
    )
    guest.evaluate("__midnight.command(1,{x:0,y:0,focus:false,ray:2})")
    host.wait_for_timeout(600)
    check(
        "direct restart preserves counter acknowledgement and later ray input",
        host.evaluate(
            "__midnight.app.world.stats.rays===1 && __midnight.app.world.players[1].lastRay===2"
        ),
    )
    result = host.evaluate(
        """async()=>{await __midnight.getPeer().finish({t:'end',won:true,score:3210});return __midnight.getPeer().pc===null;}"""
    )
    check(
        "direct final result is acknowledged before channel closes",
        result
        and guest.evaluate(
            '__midnight.app.world.score===3210 && __midnight.app.world.phase === "ending"'
        ),
    )
    for page in [host, guest]:
        page.evaluate("__midnight.title();__midnight.peerMenu()")
    # Retry creates a new peer connection, with no stale channel or input.
    offer = host.evaluate("async()=>await __midnight.getPeer().offer()")
    answer = guest.evaluate(
        "async code=>await __midnight.getPeer().answer(code)", offer
    )
    host.evaluate("async code=>await __midnight.getPeer().accept(code)", answer)
    for page in [host, guest]:
        page.wait_for_function(
            '__midnight.app.mode === "peer" && __midnight.game.sceneName === "run"',
            timeout=15000,
        )
    check(
        "direct setup retries after prior session teardown",
        host.evaluate(
            "__midnight.app.world.score === 0 && __midnight.app.world.players[1].lastRay === 0"
        ),
    )
    guest.evaluate("__midnight.getPeer().close(false)")
    host.wait_for_function('__midnight.app.ui.screen === "disconnected"', timeout=10000)
    check(
        "direct connection loss offers reconnect and title",
        host.get_by_role("button", name="Reconnect", exact=True).count() > 0
        and host.get_by_role("button", name="Title", exact=True).count() > 0,
    )
    check(
        "direct peers have no native collected errors",
        host.evaluate("__midnight.game.errors.length === 0")
        and guest.evaluate("__midnight.game.errors.length === 0"),
        {
            "host": host.evaluate("__midnight.game.errors"),
            "guest": guest.evaluate("__midnight.game.errors"),
        },
    )
    ca.close()
    cg.close()
    browser.close()


def main():
    section("package checks", package_checks)
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as p:
            if GROUP in ["all", "browser"]:
                section("three-browser controls and storage", lambda: browser_checks(p))
                section("pad, attract, developer and credits", lambda: access_checks(p))
                section(
                    "touch, resize and visual inspection fixtures",
                    lambda: touch_and_visual_checks(p),
                )
            if GROUP in ["all", "audio"]:
                section("synthetic audio", lambda: audio_checks(p))
            if GROUP in ["all", "hub"]:
                section("real official Hub harness", lambda: hub_checks(p, base))
            if GROUP in ["all", "peer"]:
                section("real two-context WebRTC", lambda: peer_checks(p))
    finally:
        server.shutdown()
        server.server_close()
    (ROOT / "evidence/browser-results.json").write_text(json.dumps(REPORT, indent=2))
    print(json.dumps(REPORT))
    return 1 if REPORT["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
