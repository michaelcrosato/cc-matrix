import hashlib
import json
import sys
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "build-config.json").read_text())
release = root.parent / (config["slug"] + ".html")
route = json.loads((root / "evidence/solo-route.json").read_text())
count = 0
failures = []
evidence = {}


def check(name, ok, detail=None):
    global count
    count += 1
    if not ok:
        failures.append(name + (": " + str(detail) if detail else ""))


def capture(page, path):
    # Freeze only native rendering around a screenshot; authority and DOM stay unchanged.
    running = page.evaluate("!!globalThis.game?._running")
    if running:
        page.evaluate("game.stop()")
    try:
        page.screenshot(path=path, timeout=60000, animations="disabled")
    finally:
        if running:
            page.evaluate("game.start()")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        try:
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            context.add_init_script(
                """window.__pad={connected:false,index:0,id:'DualSense Wireless Controller',mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pad.connected?[window.__pad]:[]});"""
            )
            page = context.new_page()
            page.set_default_timeout(12000)
            errors = []
            requests = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("request", lambda r: requests.append(r.url))
            page.goto(release.as_uri() + "?test=1&backend=webgl")
            page.wait_for_function(
                "document.body.dataset.ready==='true'", timeout=60000
            )
            check(
                "Exact final HTML file boots",
                page.evaluate(
                    "__gameTest.screen==='title' && My3D2dge.World3D.backend==='WebGL 2'"
                ),
            )
            check(
                "No neighboring source or remote asset requests",
                all(
                    u.startswith((release.as_uri(), "data:", "blob:")) for u in requests
                ),
                requests,
            )
            check(
                "Fresh music defaults to ten percent",
                page.evaluate("__gameTest.game.settings.music===.1"),
            )
            page.evaluate("__gameTest.idle(-60000)")
            capture(page, str(root / "evidence/title.png"))
            page.locator("[data-ui=new]").click()
            page.wait_for_function("__gameTest.screen==='play'")
            page.wait_for_function(
                "game.sceneName==='play' && !game._fade", timeout=10000
            )
            check(
                "New Expedition supplies real native world",
                page.evaluate(
                    "__gameTest.view.diagnostics().nativeWorld && __gameTest.state.players.solo.pack.length===6"
                ),
            )
            page.keyboard.press("w")
            page.wait_for_timeout(400)
            check(
                "W steps east and triggers announced combat",
                page.evaluate(
                    "__gameTest.state.players.solo.x===2 && __gameTest.state.encounter?.id==='marrow-first'"
                ),
            )
            capture(page, str(root / "evidence/war-encounter.png"))
            before = page.evaluate("__gameTest.state.stats.rounds")
            page.locator("[data-select=guard]").click()
            page.wait_for_timeout(100)
            check(
                "Choosing action does not commit",
                page.evaluate("__gameTest.state.stats.rounds") == before,
            )
            page.locator("[data-hud=commit]").click()
            page.wait_for_timeout(100)
            check(
                "Commit resolves exactly one solo round",
                page.evaluate("__gameTest.state.stats.rounds") == before + 1,
            )
            page.keyboard.press("f")
            page.wait_for_function("__gameTest.screen==='inspect'")
            check(
                "Inspection includes exact damage arithmetic",
                "defense =" in page.locator("#ui").inner_text(),
            )
            page.locator("[data-ui=back]").last.click()
            page.wait_for_timeout(300)
            page.keyboard.press("Tab")
            page.wait_for_function("__gameTest.screen==='pack'")
            check("Pack shows exactly six slots", page.locator(".slot").count() == 6)
            capture(page, str(root / "evidence/pack.png"))
            page.locator("[data-ui=back]").last.click()
            page.wait_for_timeout(300)
            page.keyboard.press("m")
            page.wait_for_function("__gameTest.screen==='map'")
            check(
                "Automap displays authored cells",
                page.locator(".map-cell").count() == 99,
            )
            page.locator("[data-ui=back]").last.click()
            page.wait_for_timeout(300)
            page.keyboard.press("Escape")
            page.wait_for_function("game.shell.screen==='pause'", timeout=10000)
            check(
                "Native pause menu is reachable",
                page.evaluate("__gameTest.game.shell.screen==='pause'"),
            )
            page.get_by_role("button", name="Developer tools", exact=True).click()
            page.wait_for_function("__gameTest.screen==='dev'")
            check(
                "Developer tuning has consequential sliders",
                page.locator("[data-tune]").count() == 8,
            )
            page.locator("[data-tune=playerDamage]").focus()
            page.evaluate(
                "window.__pad.connected=true;window.__pad.axes[0]=.8;window.__pad.timestamp=performance.now()"
            )
            page.wait_for_function(
                "__gameTest.state.tuning.playerDamage>1", timeout=5000
            )
            check(
                "Gamepad adjusts focused developer sliders",
                page.evaluate("__gameTest.state.tuning.playerDamage>1"),
            )
            page.evaluate("window.__pad.axes[0]=0;window.__pad.connected=false")
            page.locator("[data-tune=playerDamage]").fill("2")
            page.locator("[data-tune=playerDamage]").dispatch_event("input")
            check(
                "Live tuning changes actual model",
                page.evaluate(
                    "__gameTest.state.tuning.playerDamage===2 && __gameTest.state.modified"
                ),
            )
            page.locator("[data-ui=reset-tuning]").click()
            check(
                "Reset restores canonical tuning",
                page.evaluate(
                    "__gameTest.state.tuning.playerDamage===1 && __gameTest.state.tuning.enemyDamage===1"
                ),
            )
            capture(page, str(root / "evidence/developer.png"))
            page.locator("[data-ui=back]").last.click()
            page.wait_for_timeout(300)
            # Real standard mapping, meaningful prompts, reconnect and stick movement.
            page.evaluate(
                "__gameTest.start();window.__pad.connected=true;window.__pad.buttons[3]={pressed:true,touched:true,value:1};window.__pad.timestamp=performance.now()"
            )
            page.wait_for_function("__gameTest.screen==='pack'", timeout=10000)
            page.evaluate(
                "window.__pad.buttons[3]={pressed:false,touched:false,value:0};window.__pad.timestamp=performance.now()"
            )
            check(
                "Standard-mapping Triangle opens pack",
                page.evaluate("__gameTest.game.input.lastDevice==='gamepad'"),
            )
            check(
                "PlayStation prompts follow meaningful pad input",
                page.evaluate("__gameTest.game.input.label('pack').includes('△')"),
                page.evaluate("__gameTest.game.input.label('pack')"),
            )
            page.evaluate("__gameTest.game.settings.set('glyphs','xbox')")
            check(
                "Xbox glyph preference changes prompts",
                page.evaluate("__gameTest.game.input.label('pack')==='Y'"),
            )
            page.evaluate("window.__pad.connected=false")
            page.wait_for_timeout(100)
            check(
                "Controller unplug preserves expedition",
                page.evaluate("__gameTest.state.players.solo.war>0"),
            )
            page.evaluate("window.__pad.connected=true")
            page.wait_for_timeout(100)
            check(
                "Controller reconnect retains pack",
                page.evaluate("__gameTest.state.players.solo.pack.length===6"),
            )
            page.evaluate(
                "window.__pad.connected=false;__gameTest.game.resume();__gameTest.game.shell.hide();__gameTest.start()"
            )
            page.wait_for_function(
                "game.sceneName==='play' && !game._fade", timeout=10000
            )
            # Seed only the session-mode flag to exercise the production reserved-chord input policy.
            page.evaluate(
                "__gameTest.controller.mode='hub';game.live=true;window.__pad.connected=true;window.__pad.buttons[8]={pressed:true,touched:true,value:1};window.__pad.buttons[9]={pressed:true,touched:true,value:1}"
            )
            page.wait_for_function(
                "game.input.padValues[8]>.5 && game.input.padValues[9]>.5",
                timeout=10000,
            )
            check(
                "Hub Create plus Options chord does not open game pause or map",
                page.evaluate(
                    "!game.paused && !game.shell.screen && __gameTest.screen==='play'"
                ),
            )
            page.evaluate(
                "window.__pad.buttons[8]={pressed:false,touched:false,value:0};window.__pad.buttons[9]={pressed:false,touched:false,value:0};__gameTest.controller.mode='solo';game.live=false"
            )
            # A complete original-rule campaign through production command handlers.
            page.evaluate("__gameTest.start()")
            bad = []
            chunk = []
            phase_inputs = 0

            def apply_chunk(actions):
                if not actions:
                    return []
                return page.evaluate(
                    "actions=>{const bad=[];for(let i=0;i<actions.length;i++){const r=__gameTest.command(actions[i].action);if(!r.ok&&r.needs!=='swap')bad.push({i,a:actions[i].action,r});}return bad;}",
                    actions,
                )

            for entry in route:
                if entry["action"]["type"] == "continueBoss":
                    bad.extend(apply_chunk(chunk))
                    chunk = []
                    page.wait_for_function(
                        "__gameTest.state.encounter?.preparation===true", timeout=10000
                    )
                    if phase_inputs == 0:
                        page.keyboard.press("Enter")
                    else:
                        page.evaluate(
                            "window.__pad.connected=true;window.__pad.buttons[7]={pressed:true,touched:true,value:1};window.__pad.timestamp=performance.now()"
                        )
                    page.wait_for_function(
                        "__gameTest.state.encounter?.preparation===false", timeout=10000
                    )
                    if phase_inputs:
                        page.evaluate(
                            "window.__pad.buttons[7]={pressed:false,touched:false,value:0};window.__pad.timestamp=performance.now()"
                        )
                    check(
                        ("Keyboard Enter" if phase_inputs == 0 else "Controller R2")
                        + " continues a real boss preparation beat",
                        page.evaluate(
                            "!__gameTest.state.encounter.preparation && game.errors.length===0"
                        ),
                    )
                    phase_inputs += 1
                else:
                    chunk.append(entry)
            bad.extend(apply_chunk(chunk))
            result = page.evaluate(
                "(()=>{const s=__gameTest.state;return{status:s.status,boss:s.bossDefeated,treasure:s.treasureClaimed,stats:s.stats,modified:s.modified,phases:s.floors[2].enemies.find(e=>e.id==='warden').phase};})()"
            )
            result["bad"] = bad
            evidence["fullRun"] = result
            check(
                "Final HTML full normal-rules route accepts every command",
                not result["bad"],
                result["bad"],
            )
            check(
                "Full route defeats boss then claims treasure",
                result["status"] == "victory"
                and result["boss"]
                and result["treasure"]
                and result["phases"] == 3,
            )
            check(
                "Full route exercises rest gate secret and all enemy roles",
                result["stats"]["rests"] > 0
                and result["stats"]["gates"] == 1
                and result["stats"]["secrets"] == 1
                and result["stats"]["kills"] >= 7
                and not result["modified"],
            )
            page.wait_for_timeout(500)
            capture(page, str(root / "evidence/victory.png"))
            check(
                "Proper victory tableau is shown",
                page.evaluate("__gameTest.screen==='victory'"),
            )
            page.locator("[data-ui=continue-victory]").click()
            page.wait_for_timeout(300)
            check(
                "Continue after victory permits exploration",
                page.evaluate(
                    "__gameTest.state.status==='playing' && __gameTest.state.treasureClaimed"
                ),
            )
            # Save export/import validates roundtrip without touching rendering internals.
            data = page.evaluate("__gameTest.saveExport()")
            restored = page.evaluate("text=>__gameTest.saveImport(text)", data)
            check(
                "Explicit save export/import roundtrips",
                restored["treasureClaimed"]
                and restored["players"]["solo"]["pack"] is not None,
            )
            check(
                "Corrupt explicit saves reject gracefully",
                page.evaluate(
                    "(()=>{try{__gameTest.saveImport('{bad');return false}catch{return true}})()"
                ),
            )
            # Genuine gesture unlock + finite nonzero synthesized sound.
            page.mouse.click(1500, 700)
            page.wait_for_timeout(300)
            probe = page.evaluate(
                "async()=>await __gameTest.audio.constructor.renderProbe()"
            )
            evidence["audio"] = probe
            check(
                "Offline synthesized audio is finite and nonzero",
                probe.get("finite")
                and probe.get("rms", 0) > 0
                and probe.get("peak", 99) < 1,
                probe,
            )
            check(
                "Gesture unlock starts actual Web Audio",
                page.evaluate("__gameTest.audio.diagnostics().unlocked"),
            )
            live = page.evaluate(
                """async()=>{let peak=0;__gameTest.audio.sfx('spirit');for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,40));peak=Math.max(peak,__gameTest.audio.diagnostics().rms||0);}game.settings.set('sound',false);await new Promise(r=>setTimeout(r,100));const muted=game.audio.muted;game.settings.set('sound',true);return{peak,muted};}"""
            )
            evidence["liveAudio"] = live
            check(
                "Production Web Audio produces measurable output",
                live["peak"] > 0,
                live,
            )
            check(
                "Native mute applies to the production mixer",
                live.get("muted") is True,
                live,
            )
            terminal = page.evaluate(
                """async()=>{__gameTest.audio.stop();await __gameTest.audio.unlock();return __gameTest.audio.diagnostics();}"""
            )
            check(
                "Terminal audio stop cannot be revived by input unlock",
                terminal["stopped"] and terminal["contextState"] != "running",
                terminal,
            )
            page.evaluate("__gameTest.audio.reset()")
            # Selected visual evidence: real dev actions use the same authoritative model.
            for floor, enemy, name in [
                (0, "sigil-first", "scorpion"),
                (1, "shield-lesson", "spirit-chamber"),
                (2, "warden", "warden"),
            ]:
                page.evaluate("__gameTest.start();__gameTest.showDev()")
                page.locator(f'[data-ui=jump-floor][data-floor="{floor}"]').click()
                page.locator(f'[data-ui=jump-encounter][data-target="{enemy}"]').click()
                page.wait_for_function(
                    "f=>__gameTest.view.floor===f", arg=floor, timeout=10000
                )
                page.wait_for_function(
                    """()=>{const v=__gameTest.view,p=__gameTest.state.players.solo;return v.cameraPos&&Math.hypot(v.cameraPos[0]-(p.x*32+16),v.cameraPos[1]-(p.y*32+16))<.5}""",
                    timeout=10000,
                )
                page.wait_for_function(
                    """()=>{const v=__gameTest.view,p=__gameTest.state.players.solo,a=-Math.PI/2+p.dir*Math.PI/2;return Math.abs(Math.atan2(Math.sin(v.cameraPos[2]-a),Math.cos(v.cameraPos[2]-a)))<.025}""",
                    timeout=10000,
                )
                capture(page, str(root / f"evidence/{name}.png"))
            check(
                "Authored species and boss render after developer encounter jumps",
                page.evaluate("__gameTest.view.diagnostics().nativePuppets>0"),
            )
            page.evaluate(
                "__gameTest.showCredits();window.__pad.connected=true;window.__pad.axes[3]=.9"
            )
            page.wait_for_function(
                "document.querySelector('.panel').scrollTop>10", timeout=5000
            )
            check(
                "Right stick scrolls long credits",
                page.evaluate("document.querySelector('.panel').scrollTop>10"),
            )
            page.evaluate("window.__pad.axes[3]=0;window.__pad.connected=false")
            page.locator("[data-ui=back]").last.click()
            # Attract boundary and consumed exit keep real save untouched.
            page.evaluate(
                "__gameTest.controller.close();__gameTest.game.shell.hide();__gameTest.game.resume()"
            )
            page.evaluate("document.querySelector('[data-hud=pause]').click()")
            page.wait_for_timeout(200)
            # Return via real native pause action.
            page.get_by_role("button", name="Return to title", exact=True).click()
            page.wait_for_timeout(300)
            before_storage = page.evaluate("JSON.stringify(localStorage)")
            page.evaluate("__gameTest.idle(9900)")
            page.wait_for_timeout(30)
            check(
                "Attract waits until ten seconds",
                not page.evaluate("__gameTest.attract"),
            )
            page.evaluate("__gameTest.idle(10001)")
            page.wait_for_function("__gameTest.attract", timeout=3000)
            check(
                "Attract begins at ten-second inactivity boundary",
                page.evaluate("__gameTest.screen==='attract'"),
            )
            page.keyboard.press("Enter")
            page.wait_for_timeout(300)
            check(
                "Attract input exits and is consumed",
                page.evaluate("__gameTest.screen==='title' && !__gameTest.attract"),
            )
            check(
                "Attract leaves durable save unchanged",
                page.evaluate("JSON.stringify(localStorage)") == before_storage,
            )
            check(
                "No page or engine exceptions",
                not errors and not page.evaluate("__gameTest.game.errors"),
                errors,
            )
            context.close()
            # Same screens on a touch-only phone, with no permanent button dashboard.
            phone = browser.new_context(**p.devices["iPhone 13"])
            mobile = phone.new_page()
            mobile_errors = []
            mobile.on("pageerror", lambda e: mobile_errors.append(str(e)))
            mobile.goto(release.as_uri() + "?test=1&backend=webgl")
            mobile.wait_for_function(
                "document.body.dataset.ready==='true'", timeout=60000
            )
            mobile.locator("[data-ui=new]").tap()
            mobile.wait_for_function("__gameTest.screen==='touch-help'")
            mobile.locator("[data-ui=touch-ready]").tap()
            mobile.wait_for_function(
                "game.sceneName==='play' && !game._fade", timeout=10000
            )
            check(
                "Phone uses same game with a gesture tutorial",
                mobile.evaluate(
                    "__gameTest.screen==='play' && __gameTest.state.players.solo.war===36"
                ),
            )
            check(
                "Phone normal play has one menu control",
                mobile.locator("#hud button").count() == 1,
            )
            capture(mobile, str(root / "evidence/phone.png"))
            touch = phone.new_cdp_session(mobile)
            touch.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 75, "y": 480, "id": 1},
                        {"x": 285, "y": 450, "id": 2},
                    ],
                },
            )
            touch.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"x": 75, "y": 370, "id": 1},
                        {"x": 305, "y": 420, "id": 2},
                    ],
                },
            )
            mobile.wait_for_timeout(600)
            touch.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            check(
                "Simultaneous touch movement and look regions work",
                mobile.evaluate(
                    "__gameTest.state.players.solo.x>1 && Math.abs(__gameTest.view.look[1])>.001"
                ),
            )
            mobile.locator("[data-hud=pause]").tap()
            mobile.wait_for_function("game.shell.screen==='pause'", timeout=10000)
            check(
                "Touch menu reaches native pause",
                mobile.evaluate("__gameTest.game.shell.screen==='pause'"),
            )
            check(
                "Phone UI has no horizontal overflow",
                mobile.evaluate("document.documentElement.scrollWidth===innerWidth"),
            )
            check("Phone WebGL has no exceptions", not mobile_errors, mobile_errors)
            phone.close()
        except Exception as e:  # noqa: BLE001 - report all browser failures
            check("Browser integration completed", False, str(e))
            evidence["exception"] = traceback.format_exc()
            try:
                capture(page, str(root / "evidence/browser-failure.png"))
                evidence["dom"] = page.locator("body").inner_text()[:15000]
                evidence["errors"] = errors
            except Exception as capture_error:  # noqa: BLE001 - best-effort diagnostics
                evidence["captureError"] = str(capture_error)
        finally:
            browser.close()


run()
evidence.update(
    {
        "count": count,
        "failures": failures,
        "artifact": release.name,
        "sha256": hashlib.sha256(release.read_bytes()).hexdigest(),
    }
)
(root / "evidence/browser-report.json").write_text(json.dumps(evidence, indent=2))
for failure in failures:
    print("FAIL Browser:", failure)
print(f"{count - len(failures)}/{count} browser checks passed")
sys.exit(1 if failures else 0)
