"""One command for deterministic game, input, audio, physics and network checks.

All servers bind 127.0.0.1 with an OS-selected port. No screenshots or saved
browser profiles are needed; the browser and every server are closed on exit.
"""

from __future__ import annotations

import functools
import http.server
import importlib.util
import json
import re
import subprocess
import sys
import threading
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent
GAME_FILE = ROOT / f"{DEV.name}.html"
TITLE = "E.T. the Extra-Small Visitor"
BROWSER_ARGS = [
    "--no-sandbox",
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
]
PAD_STUB = """
window.testPads=[];
window.makeTestPad=(index=0)=>({
  id:'Emulated DualSense standard controller', index, mapping:'standard',
  connected:true, timestamp:performance.now(), axes:[0,0,0,0],
  buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))
});
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.testPads});
"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class Checks:
    def __init__(self):
        self.failures = []
        self.count = 0

    def check(self, label, function):
        self.count += 1
        try:
            result = function()
            if result is False:
                raise AssertionError("condition was false")
            return True
        except Exception as error:  # noqa: BLE001 - collect every independent check failure.
            self.failures.append(f"{label}: {str(error)[:1600]}")
            return False

    def js(self, page, label, body):
        prefix = """() => {
          const a=window.__game, g=a.game;
          const require=(ok,message)=>{if(!ok)throw new Error(message)};
        """
        return self.check(label, lambda: page.evaluate(prefix + body + "\n}"))

    def add(self, label, function):
        try:
            failures, count = function()
            self.count += count
            self.failures.extend(f"{label}: {f}" for f in failures)
        except Exception as error:  # noqa: BLE001 - close resources and report tool failures.
            self.count += 1
            self.failures.append(f"{label}: {str(error)[:1600]}")


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_physics():
    result = subprocess.run(
        ["node", str(DEV / "test_physics.mjs")],
        cwd=DEV,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    failures = [line for line in result.stdout.splitlines() if line.startswith("FAIL:")]
    match = re.search(r"(\d+)/(\d+) physics checks passed", result.stdout)
    count = int(match[2]) if match else 1
    stderr = result.stderr.replace(
        "using deprecated parameters for the initialization function; pass a single object instead",
        "",
    ).strip()
    if stderr:
        failures.append(stderr)
    if result.returncode and not failures:
        failures.append(result.stdout or "Node physics process failed")
    if not match and not failures:
        failures.append("Missing physics check count")
    return failures, count


def prepare_game_page(browser, url, *, touch=False, viewport=None):
    context = browser.new_context(
        viewport=viewport or {"width": 1600, "height": 900},
        device_scale_factor=1,
        has_touch=touch,
        is_mobile=touch,
    )
    context.add_init_script(PAD_STUB)
    page = context.new_page()
    page.set_default_timeout(15000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url, wait_until="domcontentloaded", timeout=120000)
    if page.title() != TITLE:
        context.close()
        raise AssertionError(f"Wrong served page: expected {TITLE}")
    page.wait_for_function("window.__game?.ready", timeout=120000)
    page.evaluate("__game.game.renderer.setAnimationLoop(null)")
    return context, page, errors


def run_story_checks(browser, url, checks):
    context, page, errors = prepare_game_page(browser, url)
    try:
        checks.js(
            page,
            "Primary renderer is WebGPU",
            "require(a.state().backend==='webgpu','WebGPU was not selected');",
        )
        checks.js(
            page,
            "Music starts at 10%",
            "require(g.settings.music===10&&a.audio().musicVolume===.1,'Music default is not 10%');",
        )
        checks.js(
            page,
            "Title has actionable controller-sized buttons",
            "require(g.mode==='title'&&document.querySelector('#begin').getBoundingClientRect().height>=38,'Title/start button unavailable');",
        )
        page.locator("#begin").click()
        checks.js(
            page,
            "Beginning starts the first chapter",
            "require(g.mode==='playing'&&g.stage==='meet','Story did not begin');g.cheats.agents=false;",
        )
        checks.js(
            page,
            "Walking and sneaking use distinct speeds",
            """
          a.teleport(0,25);a.advance(.5,{x:1});const walk=g.players[0].x;
          a.teleport(0,25);a.advance(.5,{x:1,hide:true});const sneak=g.players[0].x;
          require(walk>2.5&&sneak>1&&sneak<walk*.6,`Walking ${walk}, sneaking ${sneak}`);
        """,
        )
        checks.js(
            page,
            "A hello creates the friendship",
            "a.teleport(2,20);require(a.interact(),'Hello interaction failed');require(g.stage==='collect','Friendship did not open exploration');",
        )
        checks.js(
            page,
            "Borrowing a part changes inventory and scene",
            """
          a.teleport(-22,10);a.interact();
          require(g.collected.includes('toy')&&!g.parts[0].model.visible,'Toy part was not collected/hidden');
          a.interact();require(g.collected.length===1,'A part could be collected twice');
        """,
        )
        checks.js(
            page,
            "Candy launches and attracts searching agents",
            """
          a.teleport(-12,14);g.players[0].angle=Math.PI;g.guards[0].x=-12;g.guards[0].z=9;
          g.throwCandy(0);a.advance(.8,{});
          require(g.candy===7&&g.stats.distractions===1&&g.candies.length===1,'Candy did not leave the pocket');
          require(g.guards[0].investigate&&g.guards[0].search>0,'Candy did not lure a nearby agent');
          const v=g.candies[0].physics.body.translation();require(Number.isFinite(v.x)&&v.y>0,'Thrown candy physics invalid');
        """,
        )
        checks.js(
            page,
            "Home replenishes the candy supply",
            "a.teleport(0,22);a.interact();require(g.candy===8,'Home did not refill candy');",
        )
        checks.js(
            page,
            "Heartlight heals and respects its cooldown",
            """
          a.teleport(-8,3);g.heart=75;a.pulse();
          require(g.healed.includes(0)&&!g.flowers[0].halo.visible,'First garden did not bloom');
          const pulses=g.stats.pulses;a.pulse();require(g.stats.pulses===pulses,'Heartlight ignored cooldown');
        """,
        )
        checks.js(
            page,
            "All three gardens can bloom",
            """
          for(const [x,z]of [[14,-9],[-7,-24]]){a.advance(2.2,{});a.teleport(x,z);a.pulse();}
          require(g.healed.length===3,'Not all gardens could bloom');
        """,
        )
        checks.js(
            page,
            "Heartlight needs a nearby friend",
            """
          a.advance(2.2,{});a.teleport(0,22);g.alien.root.position.set(25,0,22);
          const before=g.stats.pulses;a.pulse();require(g.stats.pulses===before,'Heartlight worked without the visitor');
          a.teleport(0,22);
        """,
        )
        checks.js(
            page,
            "Searchlights detect standing kids and miss sneaking kids at range",
            """
          g.cheats.agents=true;g.invulnerable=0;g.alert=0;a.teleport(0,7);
          for(const guard of g.guards)guard.stun=50;
          const guard=g.guards[0];guard.stun=0;guard.x=0;guard.z=0;guard.angle=0;guard.search=0;guard.investigate=null;
          g.players[0].hide=false;g.updateGuards(.1,false);require(g.alert>0,'Standing child was not detected');
          guard.x=0;guard.z=0;guard.angle=0;guard.search=0;guard.investigate=null;g.alert=0;
          g.players[0].hide=true;g.updateGuards(.1,false);require(g.alert===0,'Sneaking did not reduce detection reach');
          g.cheats.agents=false;
        """,
        )
        checks.js(
            page,
            "Houses block searching sight lines",
            """
          const o=g.world.obstacles.find(o=>o.h>3&&o.w>5&&o.d>5);
          require(!!o,'No house collision volume exists');
          require(g.lineBlocked({x:o.x-o.w/2-2,z:o.z},{x:o.x+o.w/2+2,z:o.z}),'House failed sight-line occlusion');
        """,
        )
        checks.js(
            page,
            "Capture reaches a retry state",
            """
          g.heart=20;g.invulnerable=0;g.cheats.god=false;g.captured();a.advance(1/60,{});
          require(g.mode==='caught'&&g.stats.catches===1,'Capture did not reach failure/retry');
        """,
        )
        page.locator("#retry").click()
        checks.js(
            page,
            "Retry preserves the chapter and found items",
            "require(g.mode==='playing'&&g.stage==='collect'&&g.collected.includes('toy')&&g.heart===100,'Retry lost progress');",
        )
        checks.js(
            page,
            "Chapter progress survives title and Continue",
            """
          g.save();g.returnTitle();require(!document.querySelector('#continue').classList.contains('hidden'),'Continue is not offered');
          g.start(true);require(g.stage==='collect'&&g.collected.includes('toy')&&g.healed.length===3,'Save/Continue lost progress');
        """,
        )
        page.locator("#pauseBtn").click()
        checks.js(
            page,
            "Pause freezes simulation",
            """
          const ticks=g.simTicks, elapsed=g.playTime;const now=performance.now();g.lastFrame=now-50;g.frame(now);
          require(g.mode==='pause'&&g.simTicks===ticks&&g.playTime===elapsed,'Paused game continued simulating');
        """,
        )
        page.locator("#devBtn").click()
        checks.js(
            page,
            "Developer workbench exposes live gameplay values",
            """
          const slider=document.querySelector('[data-var="moveSpeed"]');slider.value='8.2';slider.dispatchEvent(new Event('input'));
          require(g.mode==='dev'&&g.tuningVars.moveSpeed===8.2&&document.querySelectorAll('[data-var]').length>=8,'Live tuning did not apply');
        """,
        )
        page.locator("#devReset").click()
        checks.js(
            page,
            "Developer Reset restores defaults",
            "require(g.tuningVars.moveSpeed===5.4&&g.tuningVars.flightSpeed===8.5,'Developer defaults did not reset');",
        )
        checks.js(
            page,
            "Physics debug view exposes real colliders",
            "g.cheats.physics=true;g.drawPhysics();require(g.physicsLines.visible&&g.physicsLines.geometry.attributes.position.count>0,'Physics visualization missing');g.cheats.physics=false;",
        )
        page.locator("#devPhoto").click()
        checks.js(
            page,
            "Photo mode hides the menus",
            "require(g.mode==='photo'&&!document.querySelector('#photoNotice').classList.contains('hidden'),'Photo mode unavailable');g.menuAction('back');g.resume();",
        )
        checks.js(
            page,
            "Notebook maps the player and remaining pieces",
            "g.openMenu('notebook');require(document.querySelectorAll('#mapMarks circle').length===3&&document.querySelector('#mapPlayer').getAttribute('cx'),'Notebook map incomplete');g.resume();",
        )
        checks.js(
            page,
            "Remaining parts unlock the forest signal",
            """
          for(const [x,z]of [[22,4],[-16,-12]]){a.teleport(x,z);require(a.interact(),'Part interaction unavailable');}
          require(g.collected.length===3&&g.stage==='signal','Three parts did not unlock the signal');
        """,
        )
        checks.js(
            page,
            "The signal plays before accepting an answer",
            """
          a.teleport(0,-32);a.interact();require(g.mode==='tuning'&&g.tuning.playing,'Signal puzzle did not open');
          a.note(0);require(g.tuning.progress===0,'Signal accepted notes while demonstrating');g.updateTuning(5);
          require(!g.tuning.playing,'Signal demonstration never ended');
        """,
        )
        checks.js(
            page,
            "An incorrect signal can be retried",
            "a.note(0);a.note(1);require(g.tuning.progress===0&&g.mode==='tuning','Incorrect answer did not reset kindly');",
        )
        checks.js(
            page,
            "The four-note response brings the ship",
            "for(const note of [0,2,1,2])a.note(note);require(g.signalSolved&&g.stage==='ride'&&g.mode==='playing','Correct response did not unlock the bicycle');",
        )
        checks.js(
            page,
            "Continue restores the answered signal and arriving ship",
            "g.save();g.returnTitle();g.start(true);require(g.stage==='ride'&&g.signalSolved&&g.world.ship.visible,'Continue lost the ship or solved signal');",
        )
        checks.js(
            page,
            "The bicycle starts the flying chapter",
            "a.teleport(5,-27);a.interact();require(g.stage==='flight'&&g.flightRoot.visible&&!g.alien.root.visible,'Bicycle did not launch');",
        )
        checks.js(
            page,
            "Pedaling increases flight speed",
            """
          const before=g.flightDistance;a.advance(.25,{});const normal=g.flightDistance-before;
          const middle=g.flightDistance;a.advance(.25,{boost:true});const faster=g.flightDistance-middle;
          require(faster>normal*1.2,'Pedaling did not accelerate the bicycle');
        """,
        )
        page.keyboard.down("d")
        checks.js(
            page,
            "Horizontal flight steering does not alter altitude",
            """
          const yaw=g.cameraYaw;g.cameraYaw=.9;g.bike.root.position.y=5;
          const now=performance.now();g.lastFrame=now-50;g.frame(now);
          require(Math.abs(g.bike.root.position.y-5)<.02,'Ground camera rotation leaked into flight altitude controls');
          g.cameraYaw=yaw;
        """,
        )
        page.keyboard.up("d")
        checks.js(
            page,
            "A full flight collects all twelve stars",
            """
          for(let tick=0;tick<1800&&g.stage==='flight';tick++){
            const ring=g.flightRings.find(r=>!r.passed)||{x:0,y:5};
            const b=g.bike.root.position;
            a.advance(1/60,{x:Math.max(-1,Math.min(1,(ring.x-b.x)*.85)),z:Math.max(-1,Math.min(1,(5-ring.y)/4)),pulse:tick%180===0});
          }
          require(g.stage==='goodbye',`Flight did not reach the landing: ${g.stage}`);
          require(g.stats.rings===12,`Steered through ${g.stats.rings}/12 rings`);
        """,
        )
        checks.js(
            page,
            "The complete story reaches its ending and clears Continue",
            """
          a.advance(6.2,{});require(g.mode==='ending'&&g.stage==='goodbye','The full story did not finish');
          require(!localStorage.getItem('small-visitor-save'),'Finished story still has a Continue checkpoint');
          require(document.querySelector('#endStats').textContent.includes('12/12'),'Ending did not report collected stars');
          require(g.camera.matrixWorld.elements.every(Number.isFinite)&&[g.world.ship.position.x,g.world.ship.position.y,g.world.ship.position.z].every(Number.isFinite),'Farewell camera or ship transform is invalid');
        """,
        )
        checks.js(
            page,
            "Credits contain the required source and exit feedback",
            """
          g.openMenu('about');const info=document.querySelector('#sourceInfo').textContent,feedback=document.querySelector('#feedbackInfo').textContent;
          require(info.includes('added on import')&&info.includes('gpt-6.1-sol')&&feedback.includes('Testing Feedback')&&feedback.includes('Engine Feedback')&&feedback.includes('Prompt Feedback'),'Credits metadata missing');
          g.start(false);g.cheats.agents=false;
        """,
        )
        run_input_checks(page, checks)
        run_attract_checks(page, checks)
        checks.check(
            "Game raised no runtime exceptions",
            lambda: (
                not errors or (_ for _ in ()).throw(AssertionError("; ".join(errors)))
            ),
        )
    finally:
        context.close()


def run_input_checks(page, checks):
    page.keyboard.down("w")
    checks.js(
        page,
        "Native keyboard movement is read",
        "require(g.input.get(0).z===-1,'W did not move forward');",
    )
    page.keyboard.up("w")
    checks.js(
        page,
        "Releasing a movement key stops it",
        "require(g.input.get(0).z===0,'Released W stayed held');g.input.finish();",
    )
    checks.js(
        page,
        "Standard gamepad sticks and face buttons work",
        """
      const pad=makeTestPad();pad.axes[0]=.8;pad.buttons[0]={pressed:true,touched:true,value:1};testPads=[pad];
      g.input.poll(1/60,false);const input=g.input.get(0);
      require(input.x===.8&&input.interact&&g.input.mode==='pad','Standard gamepad mapping failed');
      require(g.glyph('interact')==='×'&&document.querySelector('#controls').textContent.includes('△'),'PlayStation prompts missing');
      testPads[0].buttons[0].pressed=false;testPads[0].axes[0]=0;g.input.finish();g.input.poll(1/60,false);
    """,
    )
    checks.js(
        page,
        "Settings can switch to Xbox glyphs",
        "g.settings.glyphs='xbox';g.applySettings();require(g.glyph('interact')==='A'&&g.glyph('candy')==='X','Xbox symbols missing');g.settings.glyphs='ps';g.applySettings();",
    )
    checks.js(
        page,
        "Keyboard and a controller independently control two kids",
        """
      g.localCoop=true;g.updateNetwork();a.teleport(0,25,0);a.teleport(3,25,1);testPads[0].axes[0]=.75;
      const start=g.players[1].x;for(let i=0;i<30;i++){g.input.poll(1/60,false);g.step(1/60,g.input.get(0,true),g.input.get(1,true));g.input.finish();}
      require(g.players[1].x>start+1&&Math.abs(g.players[0].x)<.1&&g.players[1].model.root.visible,'Co-op controller routing failed');
      testPads=[];g.localCoop=false;g.updateNetwork();g.input.clear();
    """,
    )
    # Isolate keyboard navigation from the intentionally supported hover focus.
    # The preceding Photo button occupies the later Quit button's screen area.
    page.mouse.move(5, 5)
    checks.js(
        page,
        "Keyboard menu navigation starts at the first action",
        "g.setMode('pause');g.input.finish();require(g.focus===0&&g.buttons()[0].id==='resume','Pause did not focus its first action');",
    )
    page.keyboard.press("ArrowDown")
    checks.js(
        page,
        "Directional menu navigation changes focus",
        "g.input.poll(1/60,true);g.input.finish();require(g.focus===1,'Down did not change menu focus');",
    )
    page.keyboard.press("Enter")
    checks.js(
        page,
        "Menu confirmation opens the selected screen",
        "g.input.poll(1/60,true);g.input.finish();require(g.mode==='notebook','Enter did not activate the focused notebook');g.resume();",
    )
    run_menu_scroll_checks(page, checks)
    checks.js(
        page,
        "Returning to keyboard updates on-screen prompts",
        "g.input.activity('keyboard');require(g.glyph('interact')==='E'&&document.querySelector('#controls').textContent.includes('WASD'),'Keyboard prompts did not return');",
    )


def run_menu_scroll_checks(page, checks):
    checks.js(
        page,
        "Controller sticks can read the full About screen",
        """
      g.openMenu('about');const card=document.querySelector('#about .menu-card');card.scrollTop=0;
      require(card.scrollHeight>card.clientHeight,'Credits do not overflow in the TV viewport');
      const pad=makeTestPad();pad.axes[3]=1;testPads=[pad];g.input.poll(.5,true);g.input.finish();
      require(card.scrollTop>200,'Right stick did not scroll the credits');
      const previous=card.scrollTop;pad.axes[3]=0;pad.axes[1]=1;g.input.menuRepeat=0;g.input.poll(1/60,true);g.input.finish();
      require(card.scrollTop>previous,'Left stick returned to Back instead of scrolling the reading screen');
      testPads=[];g.input.poll(1/60,true);g.input.finish();
    """,
    )

    def keyboard_paging():
        def press_and_read(key):
            page.keyboard.press(key)
            return page.evaluate("""()=>{
              const g=__game.game;g.input.poll(1/60,true);g.input.finish();
              const card=document.querySelector('#about .menu-card');
              return {top:card.scrollTop,max:card.scrollHeight-card.clientHeight};
            }""")

        assert press_and_read("Home")["top"] == 0, "Home did not return to the top"
        down = press_and_read("PageDown")["top"]
        assert down > 200, "PageDown did not move through the credits"
        assert press_and_read("PageUp")["top"] < down, "PageUp did not move upward"
        end = press_and_read("End")
        assert abs(end["top"] - end["max"]) < 2, "End did not reach the final feedback"
        assert press_and_read("Home")["top"] == 0, "Home did not return after End"
        page.evaluate("__game.game.resume()")

    checks.check("Native keyboard paging reads the full About screen", keyboard_paging)


def run_attract_checks(page, checks):
    checks.js(
        page,
        "Ten seconds of title inactivity starts attract mode",
        """
      g.start(false);a.teleport(2,20);a.interact();g.save();g.returnTitle();
      window.testSavedBeforeAttract=localStorage.getItem('small-visitor-save');
      const now=performance.now();g.lastActivity=now-10050;g.lastFrame=now-16;g.frame(now);
      require(g.attract&&g.mode==='playing','Attract mode did not start after ten idle seconds');
    """,
    )
    checks.js(
        page,
        "Attract mode demonstrates the whole story and loops",
        """
      const stages=new Set([g.stage]);let looped=false;
      for(let i=0;i<9000;i++){
        g.attractTime+=1/60;g.driveAttract(1/60);g.step(1/60,g.rotateInput(g.attractInput),{x:0,z:0});
        stages.add(g.stage);if(stages.has('goodbye')&&g.stage==='meet'){looped=true;break;}
      }
      require(['meet','collect','signal','ride','flight','goodbye'].every(s=>stages.has(s)),`Attract omitted chapters: ${[...stages]}`);
      require(looped&&g.attract,'Attract replay did not loop');
    """,
    )
    page.keyboard.press("x")
    checks.js(
        page,
        "Any input exits attract and preserves the player's save",
        """
      require(!g.attract&&g.mode==='title','Input did not exit attract');
      require(localStorage.getItem('small-visitor-save')===window.testSavedBeforeAttract,'Attract mode modified the save');
    """,
    )


def run_touch_checks(browser, url, checks):
    for device, viewport in [
        ("phone", {"width": 844, "height": 390}),
        ("tablet", {"width": 1024, "height": 768}),
    ]:
        context, page, errors = prepare_game_page(
            browser, url, touch=True, viewport=viewport
        )
        try:
            page.locator("#begin").tap()
            checks.js(
                page,
                f"{device}: touch starts the same game",
                "require(g.input.mode==='touch'&&g.mode==='playing','Touch did not start the story');g.cheats.agents=false;",
            )
            checks.js(
                page,
                f"{device}: contextual assistance offers friendship",
                "a.teleport(2,20);a.advance(1.4,{});require(g.stage==='collect','Touch did not assist the nearby friendship interaction');",
            )
            checks.js(
                page,
                f"{device}: touch menu and contextual button are available",
                """
              require(!document.querySelector('#touchUI').classList.contains('hidden'),'Touch overlay is hidden');
              require(document.querySelector('#touchMenu').getBoundingClientRect().width>=44,'Touch menu target too small');
            """,
            )
            session = context.new_cdp_session(page)
            x, y = 150, viewport["height"] - 70
            session.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 1}]},
            )
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [{"x": x + 50, "y": y - 15, "id": 1}],
                },
            )
            checks.js(
                page,
                f"{device}: invisible touch stick provides analog movement",
                "const i=g.input.get(0);require(i.x>.5&&i.z<-.1,'Touch drag did not control the invisible stick');",
            )
            session.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            checks.js(
                page,
                f"{device}: releasing touch stops movement",
                "require(g.input.get(0).x===0&&g.input.get(0).z===0,'Touch movement stayed held after release');",
            )
            page.locator("#touchMenu").tap()
            checks.js(
                page,
                f"{device}: touch can pause",
                "require(g.mode==='pause','Touch menu failed to pause');",
            )
            checks.check(
                f"{device}: no runtime exceptions",
                lambda errors=errors: (
                    not errors
                    or (_ for _ in ()).throw(AssertionError("; ".join(errors)))
                ),
            )
        finally:
            context.close()


def run_file_checks(browser, checks):
    context, page, errors = prepare_game_page(browser, GAME_FILE.as_uri())
    try:
        checks.js(
            page,
            "file:// runs the complete single-file game with WebGPU",
            "require(location.protocol==='file:'&&a.ready&&a.state().backend==='webgpu','Local file did not initialize with WebGPU');",
        )
        page.locator("#begin").click()
        checks.js(
            page,
            "file:// Begin opens the first chapter",
            "require(g.mode==='playing'&&g.stage==='meet','Local file did not start');a.teleport(2,20);",
        )
        page.keyboard.press("e")
        checks.js(
            page,
            "file:// native E offers friendship without a server",
            "const now=performance.now();g.lastFrame=now-16;g.frame(now);require(g.stage==='collect','Native E did not offer friendship in the local file');",
        )
        if errors:
            raise AssertionError("; ".join(errors))
    finally:
        context.close()


def validate_exit_interview():
    data = json.loads((ROOT / "exit-interview.json").read_text())
    required = {
        "sourceInformation",
        "testingFeedback",
        "engineFeedback",
        "promptFeedback",
        "aiHub",
    }
    assert set(data) == required, "Exit interview has incorrect top-level fields"
    assert (
        len(data["testingFeedback"]) == 4
        and len(data["engineFeedback"]) == 6
        and len(data["promptFeedback"]) == 4
    )
    assert data["sourceInformation"]["usage"] == "added on import"
    assert data["aiHub"]["name"] == TITLE
    assert all(isinstance(x, str) and x for x in data["sourceInformation"].values())


def main():
    checks = Checks()
    checks.check("Single HTML deliverable exists", lambda: GAME_FILE.is_file())
    checks.check("Exit interview is complete JSON", validate_exit_interview)
    checks.add("Physics", run_physics)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}"
    game_path = quote(GAME_FILE.name)
    url = f"{base_url}/{game_path}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=BROWSER_ARGS)
            try:
                audio = load_module("audio_test", DEV / "test_audio.py")
                checks.add("Audio", lambda: audio.run_audio_checks(browser))
                checks.check(
                    "Complete playable story and input setup",
                    lambda: run_story_checks(browser, url, checks),
                )
                checks.check(
                    "Touch device setup", lambda: run_touch_checks(browser, url, checks)
                )
                checks.check(
                    "file:// game initialization",
                    lambda: run_file_checks(browser, checks),
                )
                network = load_module("network_test", DEV / "test_network.py")
                checks.add("Network", lambda: network.run_network_tests(browser))
                integration_path = DEV / "tests" / "integration_network.py"
                if integration_path.is_file():
                    integration = load_module("game_network_test", integration_path)
                    checks.add(
                        "Online game",
                        lambda: integration.run_game_network_tests(
                            browser, base_url, game_path
                        ),
                    )
                else:
                    checks.check("Actual online game test module exists", lambda: False)
            finally:
                browser.close()
    except Exception as error:  # noqa: BLE001 - close resources and report tool failures.
        checks.count += 1
        checks.failures.append(f"Browser suite: {str(error)[:1600]}")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    for failure in checks.failures:
        print(f"FAIL: {failure}")
    print(f"{checks.count - len(checks.failures)}/{checks.count} checks passed")
    return bool(checks.failures)


if __name__ == "__main__":
    sys.exit(main())
