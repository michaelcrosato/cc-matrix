"""Deterministic game checks plus real keyboard, standard gamepad and touch input."""

from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent.parent
ROOT = DEV.parent
GAME = ROOT / (DEV.name + ".html")


def run_checks():
    failures = []
    count = 0

    def check(label, passed, detail=""):
        nonlocal count
        count += 1
        if not passed:
            failures.append(label + (": " + str(detail) if detail else ""))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--ignore-certificate-errors",
                "--disable-dev-shm-usage",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            page.goto(GAME.as_uri(), wait_until="domcontentloaded", timeout=60000)
            page.wait_for_function(
                "window.__game?.ready || window.__game?.error", timeout=120000
            )
            check(
                "Single-file game boots",
                page.evaluate("window.__game.ready"),
                page.evaluate("window.__game.error"),
            )
            if not page.evaluate("window.__game.ready"):
                return count, failures
            check(
                "Required engine versions and actual WebGPU",
                page.evaluate(
                    "__game.engine.three === '180' && __game.engine.physics === '0.19.3' && __game.engine.backend === 'WebGPU'"
                ),
                page.evaluate("__game.engine"),
            )
            check(
                "Title screen is the expected game",
                "RAIDERS" in page.locator("h1").inner_text()
                and "LOST FORTUNE" in page.locator("h1").inner_text(),
            )
            page.locator("#begin").click()
            initial_z = page.evaluate("__game.getState().actors[0].z")
            page.keyboard.down("w")
            page.wait_for_timeout(650)
            page.keyboard.up("w")
            check(
                "Real keyboard W moves north",
                page.evaluate("__game.getState().actors[0].z") < initial_z - 0.1,
            )
            page.keyboard.press("Escape")
            check(
                "Escape pauses simulation",
                page.evaluate(
                    "__game.getState().screen==='pause' && !__game.getState().running"
                ),
            )
            paused_time = page.evaluate("__game.getState().time")
            page.wait_for_timeout(150)
            check(
                "Paused world clock is frozen",
                abs(page.evaluate("__game.getState().time") - paused_time) < 0.001,
            )
            page.locator("#dev").click()
            page.locator('input[data-key="speed"]').evaluate(
                "e=>{e.value='8.4';e.dispatchEvent(new Event('input'))}"
            )
            check(
                "Developer slider applies live",
                abs(page.evaluate("__game.getState().tuning.speed") - 8.4) < 0.001,
            )
            page.locator("#god").click()
            page.locator("#defaults").click()
            check(
                "Developer reset restores defaults",
                abs(page.evaluate("__game.getState().tuning.speed") - 5.2) < 0.001,
            )
            page.keyboard.press("Escape")
            page.locator("#pause-settings").click()
            page.locator('input[data-key="music"]').evaluate(
                "e=>{e.value='.23';e.dispatchEvent(new Event('input'))}"
            )
            check(
                "Music setting reaches audio graph",
                abs(page.evaluate("__game.getState().audio.music") - 0.23) < 0.001,
            )
            page.locator('input[data-key="music"]').evaluate(
                "e=>{e.value='.10';e.dispatchEvent(new Event('input'))}"
            )
            page.locator("#back").click()
            page.locator("#resume").click()

            page.evaluate(
                """()=>{window.__testPad={id:'Emulated standard DualSense',index:0,connected:true,mapping:'standard',axes:[0,-1,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__testPad]});} """
            )
            pad_start = page.evaluate("__game.getState().actors[0].z")
            page.wait_for_timeout(550)
            check(
                "Standard-mapped gamepad moves explorer",
                page.evaluate("__game.getState().actors[0].z") < pad_start - 0.1,
            )
            check(
                "Controller input displays PlayStation glyphs",
                "□" in page.locator("#controls-hint").inner_text(),
            )
            page.evaluate(
                "()=>{__testPad.axes=[0,0,0,0];__testPad.buttons[9].pressed=true}"
            )
            page.wait_for_function("__game.getState().screen==='pause'", timeout=5000)
            check("Controller Options opens pause menu", True)
            page.evaluate("()=>{__testPad.buttons[9].pressed=false}")
            page.locator("#pause-settings").click()
            page.locator("#glyph-select").select_option("xbox")
            page.locator("#back").click()
            page.locator("#resume").click()
            page.evaluate("()=>{__testPad.axes[0]=.5}")
            page.wait_for_timeout(150)
            check(
                "Xbox glyph preference follows gamepad input",
                ">X<" in page.locator("#controls-hint").inner_html(),
            )
            page.evaluate("window.__testPad=null")

            checks = page.evaluate("""()=>{
              const out=[], c=(n,v)=>__game.command(n,v), s=()=>__game.getState(), test=(label,ok,detail)=>out.push({label,ok:!!ok,detail});
              const advance=n=>c('advance',n), input=(x=0,z=0)=>c('input',{x,z,aimX:0,aimZ:0,sprint:false,worldSpace:true});
              const start=()=>{c('start');c('god',false);input();c('set-tuning',{enemySpeed:0,trapTempo:1,damage:1,speed:5.2,boulderSpeed:4.8});};
              start();c('teleport',{x:0,z:-12});advance(1);test('Active spike trap damages unprotected explorer',s().trapHits>=1&&s().actors[0].hp<5,s());
              start();c('teleport',{x:0,z:-12});c('roll');c('damage',{amount:1});advance(.4);test('Dodge roll grants immunity through trap',s().rolls===1&&s().actors[0].hp===5,s());
              start();c('jump');advance(.18);test('Leap has a real airborne arc',s().jumps===1&&s().actors[0].y>.5,s().actors[0]);advance(.65);test('Leap lands back on the floor',Math.abs(s().actors[0].y)<.001);
              start();c('teleport',{x:0,z:-17});c('use');advance(1);test('Contextual whip grapple crosses sinkhole',s().swings===1&&s().actors[0].z<-20&&s().actors[0].hp===5,s());
              c('teleport',{x:0,z:-25.5});input(0,-1);advance(1);input();test('Unsolved gate blocks vault entry',s().actors[0].z>=-26.101&&s().actors[0].z<-25.9,s().actors[0]);
              start();c('god',true);
              let guardPass=true,loops=0;
              while(s().enemies.some(e=>e.hp>0)&&loops++<18){const target=s().enemies.find(e=>e.hp>0);c('teleport',{x:target.x,z:target.z+2});c('aim',{x:0,z:-1});c('whip');advance(.46);}
              test('Whip defeats every guard and snake',s().kills===5&&s().enemies.every(e=>e.hp===0),s());
              test('Combat awards fortune and registers authored actions',s().score>=750&&s().whips>=5,s());
              for(const [x,z] of [[-7,3],[6,-5],[-6,-17]]){c('teleport',{x,z});advance(.04);}test('All three optional relic caches collect',s().treasures===3&&s().score>=1650,s());
              c('teleport',{x:0,z:-17});c('jump');advance(1);test('Expedition reaches Hall of Signs checkpoint',s().phase==='hall'&&s().checkpoint==='hall'&&s().swings===1,s());
              for(const x of [-5,0,5]){c('teleport',{x,z:-20});c('use');advance(.05);}test('Three sign interactions solve Sun Eye Serpent puzzle',s().solved&&s().puzzle.join(',')==='0,1,2',s());
              advance(1);test('Solved puzzle raises gate and unlocks vault checkpoint',s().gate>.9&&s().checkpoint==='vault',s());
              c('teleport',{x:0,z:-25.5});input(0,-1);advance(1);input();test('Open gate allows entry to vault',s().actors[0].z<-28,s().actors[0]);
              c('teleport',{x:0,z:-35});c('use');test('Recovering idol starts boulder escape',s().relic&&s().phase==='escape',s());const boulder=s().boulderZ;advance(.5);test('Boulder actively pursues explorers',s().boulderZ>boulder,s());
              c('teleport',{x:0,z:-25});input(0,1);advance(1.0);c('jump');advance(.65);test('Return leap clears sinkhole',s().actors[0].z>-19&&s().jumps>0,s());
              c('teleport',{x:4,z:-17});input(0,1);advance(5.1);input();test('Full expedition reaches victory by escaping to camp',s().won&&s().screen==='victory'&&s().score>=3350,s());
              c('god',false);c('menu');return out;
            }""")
            for item in checks:
                check(item["label"], item["ok"], item.get("detail", ""))

            page.evaluate("__game.command('idle')")
            page.wait_for_function("__game.getState().attract", timeout=10000)
            check("Title idle timer starts attract mode", True)
            page.keyboard.press("Escape")
            check(
                "Any key exits attract mode to title",
                page.evaluate(
                    "!__game.getState().attract && __game.getState().screen==='menu'"
                ),
            )
            page.evaluate("__game.command('attract')")
            page.mouse.move(911, 620)
            check(
                "Mouse movement exits attract mode",
                page.evaluate(
                    "!__game.getState().attract && __game.getState().screen==='menu'"
                ),
            )
            page.evaluate("__game.command('attract')")
            page.mouse.wheel(0, 80)
            page.wait_for_timeout(80)
            check(
                "Mouse wheel exits attract mode",
                page.evaluate(
                    "!__game.getState().attract && __game.getState().screen==='menu'"
                ),
            )
            demo = page.evaluate("__game.playDemo(70)")
            check(
                "Attract replay demonstrates combat, grapple, puzzle and relic",
                demo["kills"] > 0
                and demo["swings"] > 0
                and demo["solved"]
                and demo["relic"],
                demo,
            )
            check("Attract replay demonstrates successful escape", demo["won"], demo)
            loop = page.evaluate("__game.playDemo(9)")
            check(
                "Attract replay loops into a new expedition",
                loop["attract"] and loop["time"] < 15 and not loop["relic"],
                loop,
            )
            page.keyboard.press("Enter")
            audio = page.evaluate("__game.audioTest()")
            check(
                "Offline synthesized music effects and voices are finite and nonzero",
                audio.get("supported")
                and audio.get("finite")
                and audio.get("rms", 0) > 0.001
                and 0 < audio.get("peak", 0) < 1,
                audio,
            )
            check(
                "Default music remains 10 percent",
                abs(page.evaluate("__game.getState().prefs.music") - 0.1) < 0.0001,
            )
            check("No uncaught browser exceptions", not errors, errors)
            page.close()
            context.close()
            context = browser.new_context(**playwright.devices["iPhone 13"])
            page = context.new_page()
            page.goto(GAME.as_uri(), wait_until="domcontentloaded", timeout=60000)
            page.wait_for_function(
                "window.__game?.ready || window.__game?.error", timeout=120000
            )
            page.locator("#begin").tap()
            page.wait_for_timeout(150)
            check(
                "Touch presentation uses a contextual action",
                page.locator("body").evaluate("e=>e.classList.contains('touch')")
                and page.locator("#touch-action").is_visible(),
            )
            touch_z = page.evaluate("__game.getState().actors[0].z")
            cdp = context.new_cdp_session(page)
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 80, "y": 600, "id": 1}]},
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 80, "y": 500, "id": 1}]},
            )
            page.wait_for_timeout(550)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            check(
                "Invisible touch thumbstick moves explorer",
                page.evaluate("__game.getState().actors[0].z") < touch_z - 0.1,
            )
            rolls = page.evaluate("__game.getState().rolls")
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 80, "y": 600, "id": 1},
                        {"x": 290, "y": 600, "id": 2},
                    ],
                },
            )
            page.wait_for_timeout(150)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            check(
                "Two-finger touch gesture triggers dodge roll",
                page.evaluate("__game.getState().rolls") > rolls,
            )
            page.evaluate(
                "()=>{__game.command('start');__game.command('god',true);__game.command('teleport',{x:0,z:-17});}"
            )
            page.wait_for_timeout(200)
            page.locator("#touch-action").tap()
            page.wait_for_function("__game.getState().swings>0", timeout=5000)
            check("Touch contextual action performs whip grapple", True)
        except Exception as error:  # noqa: BLE001 - report unexpected test failures
            check("Gameplay test execution", False, str(error))
        finally:
            page.close()
            context.close()
            browser.close()
    return count, failures


if __name__ == "__main__":
    checks, issues = run_checks()
    for issue in issues:
        print("FAIL " + issue)
    print(f"{checks - len(issues)}/{checks} gameplay checks passed")
    raise SystemExit(1 if issues else 0)
