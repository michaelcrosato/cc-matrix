"""Deterministic browser checks. Caller supplies and closes the one browser instance."""
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qsl, urlencode, urlunparse
import math

HERE = Path(__file__).resolve().parent
PAD_SCRIPT = """
window.__testPad = {id:'DualSense Wireless Controller', index:0, connected:true,
 mapping:'standard', timestamp:0, axes:[0,0,0,0],
 buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
Object.defineProperty(navigator,'getGamepads',{configurable:true,
 value:()=>[window.__testPad,null,null,null]});
"""


def run_checks(browser, base_url, game_url, groups=None):
    """Return {passed, failed, failures}; emit no output and launch no browsers."""
    result = {"passed": 0, "failed": 0, "failures": []}
    selected_groups = set(groups or ("desktop", "pad", "touch"))
    current_group = "desktop"
    runtime_errors = []
    assets = {}
    url = urljoin(base_url.rstrip("/") + "/", game_url)

    def check(name, fn):
        if current_group != "all" and current_group not in selected_groups:
            return False
        try:
            fn()
            result["passed"] += 1
            return True
        except Exception as exc:
            result["failed"] += 1
            result["failures"].append(f"{name}: {str(exc)[:900]}")
            return False

    def require(condition, message):
        if not condition:
            raise AssertionError(message)

    def make_context(**options):
        context = browser.new_context(ignore_https_errors=True, **options)
        # These are the exact pinned production packages, supplied locally to make
        # verification independent of the CDN. The HTML still uses the real CDN.
        def asset_route(route):
            path = urlparse(route.request.url).path
            target = None
            prefix = "/npm/three@0.180.0/build/"
            if path.startswith(prefix):
                target = HERE / "node_modules/three/build" / Path(path[len(prefix):]).name
            elif path == "/npm/@dimforge/rapier3d-compat@0.19.3/+esm":
                target = HERE / "node_modules/@dimforge/rapier3d-compat/rapier.mjs"
            if target and target.is_file():
                key = str(target)
                if key not in assets:
                    assets[key] = target.read_bytes()
                route.fulfill(status=200, body=assets[key], content_type="text/javascript",
                              headers={"Access-Control-Allow-Origin": "*"})
            else:
                route.continue_()
        context.route("https://cdn.jsdelivr.net/npm/**", asset_route)
        return context

    def open_game(context, address=url):
        page = context.new_page()
        page.on("pageerror", lambda error: runtime_errors.append(str(error)))
        page.goto(address, wait_until="domcontentloaded", timeout=90000)
        try:
            page.wait_for_function("window.__game && __game.renderer.frames > 3", timeout=120000)
        except Exception as exc:
            loading = page.locator("#loading-text").inner_text(timeout=2000)
            raise AssertionError(f"Game did not initialize: {loading}. {str(exc)[:200]}") from exc
        return page

    def await_screen(page, name):
        try:
            page.wait_for_function("name => __game.screen === name", arg=name, timeout=15000)
        except Exception as exc:
            state = page.evaluate("({screen:__game.screen,mode:__game.mode,focused:document.activeElement?.outerHTML?.slice(0,250)})")
            raise AssertionError(f"Expected screen {name}; actual UI {state}") from exc

    def act(page, name):
        page.evaluate("name => __game.action(name)", name)

    def click_action(page, name, screen=None):
        selector = f"#{screen} [data-action='{name}']" if screen else f"[data-action='{name}']:visible"
        page.locator(selector).click(timeout=15000)

    def set_range(page, selector, value):
        page.locator(selector).evaluate("(el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}", value)

    desktop = make_context(viewport={"width": 1600, "height": 1000}, device_scale_factor=1)
    page = None
    try:
        holder = {}
        def startup():
            holder["page"] = open_game(desktop)
            pg = holder["page"]
            require(pg.title() == "Keystone Bumbling Beat", "Unexpected document title")
            pg.wait_for_function("__game.renderer.drawCalls > 0", timeout=30000)
            renderer = pg.evaluate("__game.renderer")
            require(renderer["type"] == "WebGPU", f"Expected WebGPU; got {renderer}")
            require(renderer["three"] == "180", f"Wrong Three.js revision: {renderer}")
            require(renderer["rapier"] == "0.19.3", f"Wrong Rapier version: {renderer}")
            require(renderer["drawCalls"] > 0 and renderer.get("triangles", 0) > 0,
                    f"No rendered geometry: {renderer}")
            # Shader warmup may outlast the genuine ten-second idle timer.
            # Any physical input must wake the title before checking its menu.
            pg.keyboard.press("Escape")
            await_screen(pg, "title")
            require(pg.locator("#title").is_visible(), "Title screen is hidden")
        started = check("WebGPU renders pinned engines and title", startup)
        page = holder.get("page")
        if started:
            def keyboard_gameplay():
                page.keyboard.press("Enter")
                page.wait_for_function("__game.mode === 'playing' && __game.screen === ''")
                old_x = page.evaluate("__game.state.players[0].x")
                page.keyboard.down("KeyD")
                try:
                    page.wait_for_function("x => __game.state.players[0].x > x + 1", arg=old_x, timeout=12000)
                finally:
                    page.keyboard.up("KeyD")
                old_jumps = page.evaluate("__game.state.metrics.jumps")
                page.keyboard.press("Space")
                try:
                    page.wait_for_function("n => __game.state.metrics.jumps > n", arg=old_jumps, timeout=12000)
                except Exception as exc:
                    state=page.evaluate("({screen:__game.screen,mode:__game.mode,player:__game.state.players[0],metrics:__game.state.metrics})")
                    raise AssertionError(f"Space tap did not register a jump: {state}") from exc
                require("SPACE" in page.locator("#legend").inner_text(), "Keyboard prompts are missing")
            check("keyboard starts, walks and jumps", keyboard_gameplay)

            def pause_resume():
                page.keyboard.press("Escape")
                await_screen(page, "pause")
                page.wait_for_function("__game.mode === 'paused'")
                timer = page.evaluate("__game.state.time")
                page.wait_for_timeout(250)
                require(page.evaluate("__game.state.time") == timer, "Time advanced while paused")
                page.keyboard.press("Escape")
                page.wait_for_function("__game.mode === 'playing' && __game.screen === ''")
            check("pause freezes the chase and Escape resumes", pause_resume)

            def settings():
                page.keyboard.press("Escape")
                await_screen(page, "pause")
                click_action(page, "settings", "pause")
                await_screen(page, "settings")
                require(page.locator("#music").input_value() == "10", "Music does not default to 10%")
                set_range(page, "#music", 17)
                require(abs(page.evaluate("__game.audio.inspect().musicVolume") - .17) < .0001,
                        "Music slider did not update live audio")
                require(page.locator("#music + output").inner_text() == "17%", "Music label did not update")
                set_range(page, "#music", 10)
                page.locator("#xbox").check()
                require(page.locator("#xbox").is_checked(), "Xbox preference did not toggle")
                page.locator("#xbox").uncheck()
                require(page.locator("#assist").is_checked(), "Touch assist is not enabled by default")
                click_action(page, "back", "settings")
                await_screen(page, "pause")
            check("settings expose 10% music and working live preferences", settings)

            def developer_tools():
                click_action(page, "dev", "pause")
                await_screen(page, "dev")
                require(page.locator("#dev-sliders input[type=range]").count() >= 8, "Balance controls are incomplete")
                set_range(page, '[data-config="speed"]', 8.5)
                require(page.evaluate("__game.game.config.speed") == 8.5, "Live speed slider had no effect")
                page.locator("#invincible").check()
                require(page.evaluate("__game.game.invincible"), "Invulnerability toggle had no effect")
                timer = page.evaluate("__game.state.time")
                click_action(page, "addtime", "dev")
                page.wait_for_function("t => __game.state.time >= t + 29.9", arg=timer)
                click_action(page, "floor2", "dev")
                page.wait_for_function("__game.state.players[0].floor === 2")
                click_action(page, "resetdev", "dev")
                require(page.evaluate("__game.game.config.speed") == 6.1, "Reset did not restore officer speed")
                require(not page.evaluate("__game.game.invincible"), "Reset did not clear invulnerability")
                require(page.locator('[data-config="speed"]').input_value() == "6.1", "Reset slider value is stale")
                click_action(page, "back", "dev")
                await_screen(page, "pause")
            check("pause toolbox provides live balance, quick tools and reset", developer_tools)

            def credits():
                click_action(page, "settings", "pause")
                click_action(page, "about", "settings")
                await_screen(page, "about")
                headings = page.locator("#about-content h3").all_text_contents()
                for expected in ["Source Information", "Testing Feedback", "Engine Feedback", "Prompt Feedback"]:
                    require(expected in headings, f"Missing credits section: {expected}")
                source = page.evaluate("__game.credits.sourceInformation")
                require("Keystone Kapers" in source["source"], "Credits source is missing")
                require(source["usage"] == "added on import", "Credits must defer usage to import")
                require(len(page.evaluate("__game.credits.testingFeedback")) == 4, "Testing interview is incomplete")
                require(len(page.evaluate("__game.credits.engineFeedback")) == 6, "Engine interview is incomplete")
                require(len(page.evaluate("__game.credits.promptFeedback")) == 4, "Prompt interview is incomplete")
                click_action(page, "back", "about")
                click_action(page, "back", "settings")
                click_action(page, "resume", "pause")
            check("About contains source information and every feedback answer", credits)

            def audio():
                rendered = page.evaluate("__game.audioTest()")
                require(rendered.get("supported"), "Offline audio rendering is unavailable")
                require(rendered["nonfinite"] == 0, f"Nonfinite audio samples: {rendered}")
                require(math.isfinite(rendered["rms"]) and rendered["rms"] > .001,
                        f"Procedural audio is silent: {rendered}")
                require(0 < rendered["peak"] < 1 and not rendered["clipped"], f"Audio clips: {rendered}")
                live = page.evaluate("__game.audio.inspect()")
                require(live["state"] == "running" and live["scheduledNotes"] > 0,
                        f"Gesture-unlocked music is inactive: {live}")
                require(live["musicVolume"] == .1, "Default music volume was not restored")
            check("procedural music, effects and voice render finite nonzero audio", audio)

            def attract():
                act(page, "title")
                await_screen(page, "title")
                page.wait_for_function("__game.state.attract === true && __game.mode === 'playing'", timeout=14000)
                require(page.locator("#attract-label").is_visible(), "Attract label did not appear")
                page.wait_for_function("__game.state.elapsed > .3", timeout=12000)
                page.keyboard.press("Space")
                await_screen(page, "title")
                require(not page.evaluate("__game.state.attract"), "Input did not exit attract mode")
            check("ten idle seconds start an AI chase and input returns to title", attract)

            def couch_coop():
                act(page, "title")
                click_action(page, "partners", "title")
                click_action(page, "local", "partners")
                page.wait_for_function("__game.state.coop && __game.state.players.length === 2")
                positions = page.evaluate("__game.state.players.map(p=>p.x)")
                page.keyboard.down("ArrowRight")
                try:
                    page.wait_for_function("x => __game.state.players[1].x > x + 1", arg=positions[1], timeout=12000)
                finally:
                    page.keyboard.up("ArrowRight")
                require(abs(page.evaluate("__game.state.players[0].x") - positions[0]) < .15,
                        "Second officer's keys moved the first officer")
                act(page, "title")
            check("couch co-op creates a separately controlled second officer", couch_coop)
    finally:
        desktop.close()

    current_group = "pad"
    pad_context = make_context(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
    pad_context.add_init_script(PAD_SCRIPT)
    try:
        pad_holder = {}
        def pad_boot():
            pad_holder["page"] = open_game(pad_context)
        pad_ready = check("standard gamepad context opens", pad_boot)
        pad_page = pad_holder.get("page")
        if pad_ready:
            def set_button(index, pressed):
                pad_page.evaluate("([i,p])=>{__testPad.buttons[i].pressed=p;__testPad.buttons[i].touched=p;__testPad.buttons[i].value=p?1:0;}", [index, pressed])
            def pad_press(index):
                frame = pad_page.evaluate("__game.renderer.frames")
                set_button(index, True)
                pad_page.wait_for_function("f=>__game.renderer.frames>f", arg=frame, timeout=20000)
                frame = pad_page.evaluate("__game.renderer.frames")
                set_button(index, False)
                pad_page.wait_for_function("f=>__game.renderer.frames>f", arg=frame, timeout=20000)

            def pad_menus():
                act(pad_page, "title")
                pad_press(13)
                require(pad_page.locator('#title [data-action="partners"]').evaluate("el=>el.classList.contains('focused')"),
                        "D-pad did not focus the next title item")
                pad_press(0)
                await_screen(pad_page, "partners")
                pad_press(1)
                await_screen(pad_page, "title")
                pad_press(0)
                pad_page.wait_for_function("__game.mode === 'playing' && __game.screen === ''")
                glyphs = pad_page.locator("#legend .glyph").all_text_contents()
                require(all(glyph in glyphs for glyph in ["✕", "◯", "□", "△"]),
                        f"Cross-start changed input prompts before stick movement: {glyphs}")
            check("D-pad, Cross and Circle navigate and start through real menus", pad_menus)

            def pad_motion():
                x = pad_page.evaluate("__game.state.players[0].x")
                pad_page.evaluate("__testPad.axes[0]=1")
                try:
                    pad_page.wait_for_function("x=>__game.state.players[0].x>x+1", arg=x, timeout=12000)
                finally:
                    pad_page.evaluate("__testPad.axes[0]=0")
                legend = pad_page.locator("#legend").inner_text()
                require(all(glyph in legend for glyph in ["✕", "◯", "□", "△"]), f"PlayStation prompts are absent: {legend}")
                pad_press(9)
                await_screen(pad_page, "pause")
                require(pad_page.evaluate("__game.mode") == "paused", "Options did not pause the chase")
            check("standard analog stick moves and DualSense glyphs follow input", pad_motion)

            def xbox_glyphs():
                pad_press(13)
                pad_press(13)
                pad_press(0)
                await_screen(pad_page, "settings")
                # Focus traverses the two volume sliders, then the Xbox toggle.
                pad_press(13)
                pad_press(13)
                pad_press(0)
                require(pad_page.locator("#xbox").is_checked(), "Controller could not toggle Xbox glyph preference")
                pad_press(1)
                await_screen(pad_page, "pause")
                pad_press(9)
                pad_page.wait_for_function("__game.screen === ''")
                pad_page.evaluate("__testPad.axes[0]=.8")
                try:
                    pad_page.wait_for_function("""()=>{
                      const glyphs=Array.from(document.querySelectorAll('#legend .glyph'),el=>el.textContent.trim());
                      return ['A','B','X','Y'].every(glyph=>glyphs.includes(glyph));
                    }""", timeout=12000)
                except Exception as exc:
                    state=pad_page.evaluate("({screen:__game.screen,mode:__game.mode,xbox:document.querySelector('#xbox').checked,legend:document.querySelector('#legend').innerText,glyphs:Array.from(document.querySelectorAll('#legend .glyph'),el=>el.textContent),axes:__testPad.axes})")
                    raise AssertionError(f"Xbox prompt state after controller movement: {state}") from exc
                finally:
                    pad_page.evaluate("__testPad.axes[0]=0")
                glyphs = pad_page.locator("#legend .glyph").all_text_contents()
                require(all(x in glyphs for x in ["A", "B", "X", "Y"]), f"Xbox glyphs missing: {glyphs}")
            check("controller changes the Xbox option and receives A/B/X/Y prompts", xbox_glyphs)
    finally:
        pad_context.close()

    # The default WebGPU path was tested twice above. The mobile input tests use
    # the app's WebGL diagnostic switch to avoid a third software GPU compilation.
    parts = urlparse(url)
    query = dict(parse_qsl(parts.query)); query["webgl"] = "1"
    touch_url = urlunparse(parts._replace(query=urlencode(query)))
    current_group = "touch"
    touch_context = make_context(viewport={"width": 844, "height": 390}, screen={"width": 844, "height": 390},
                                 device_scale_factor=1, is_mobile=True, has_touch=True)
    try:
        touch_holder = {}
        def touch_boot():
            touch_holder["page"] = open_game(touch_context, touch_url)
        touch_ready = check("landscape touch context opens", touch_boot)
        touch_page = touch_holder.get("page")
        if touch_ready:
            def touch_play():
                act(touch_page, "title")
                touch_page.locator('#title [data-action="solo"]').tap()
                touch_page.wait_for_function("__game.mode === 'playing' && __game.screen === ''")
                cdp = touch_context.new_cdp_session(touch_page)
                left = {"x": 150, "y": 250, "id": 1}
                moved = {"x": 235, "y": 250, "id": 1}
                right = {"x": 650, "y": 250, "id": 2}
                x = touch_page.evaluate("__game.state.players[0].x")
                jumps = touch_page.evaluate("__game.state.metrics.jumps")
                active = False
                touch_stage = "start left thumb"
                try:
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [left]})
                    active = True
                    touch_stage = "drag left thumb"
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [moved]})
                    touch_page.wait_for_function("x=>__game.state.players[0].x>x+1", arg=x, timeout=12000)
                    touch_stage = "add right-thumb hop while moving"
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [moved, right]})
                    touch_page.wait_for_function("n=>__game.state.metrics.jumps>n", arg=jumps, timeout=12000)
                    touch_stage = "release both thumbs"
                    # CDP requires an empty point list for touchEnd/touchCancel.
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
                    active = False
                except Exception as exc:
                    raise AssertionError(f"Touch stage {touch_stage}: {exc}") from exc
                finally:
                    if active:
                        try:
                            cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
                        except Exception:
                            pass  # Cleanup must not hide the failed gesture.
                    cdp.detach()
                require(touch_page.locator("body").evaluate("el=>el.classList.contains('touch')"), "Touch layout did not activate")
                require(not touch_page.locator("#legend").is_visible(), "Desktop control legend clutters touch play")
                require(touch_page.locator("#menu-button").is_visible(), "Touch menu button is missing")
            check("invisible left stick and simultaneous right tap move and jump", touch_play)

            def touch_assist():
                touch_page.evaluate("""()=>{
                  const g=__game.game;g.freezeCrook=true;
                  for(const h of g.hazards)g.world.removeRigidBody(h.body);
                  g.hazards=[];g.teleport(0,0,4);g.players[0].dir=1;
                  g.addHazard('plane',0,5.2,0);
                }""")
                touch_page.wait_for_function("__game.state.players[0].duck === true", timeout=12000)
                require(touch_page.evaluate("__game.state.metrics.ducks") > 0, "Touch assist did not duck for a nearby plane")
                hits = touch_page.evaluate("__game.state.metrics.hits")
                touch_page.evaluate("__game.game.hazards[0].dir=-1")
                touch_page.wait_for_function("__game.state.hazards[0].x < __game.state.players[0].x - 2.5", timeout=45000)
                after = touch_page.evaluate("({hits:__game.state.metrics.hits,player:__game.state.players[0],plane:__game.state.hazards[0]})")
                require(after["hits"] == hits, f"Touch assist stood up before the whole plane passed: {after}")
            check("touch assistance ducks safely through a complete toy-plane pass", touch_assist)

            def touch_shortcut():
                touch_page.evaluate("__game.teleport(0,-20)")
                touch_page.wait_for_function("document.querySelector('#touch-action').classList.contains('available')", timeout=12000)
                touch_page.locator("#touch-action").tap()
                touch_page.wait_for_function("__game.state.players[0].transition?.kind === 'escalator'", timeout=12000)
                touch_page.wait_for_function("__game.state.players[0].floor === 1 && !__game.state.players[0].transition", timeout=15000)
                touch_page.locator("#menu-button").tap()
                await_screen(touch_page, "pause")
                touch_page.keyboard.press("Escape")
                touch_page.wait_for_function("__game.screen === '' && __game.mode === 'playing'", timeout=15000)
                require(not touch_page.locator("body").evaluate("el=>el.classList.contains('touch')"),
                        "Keyboard input did not leave the touch layout")
                old_x = touch_page.evaluate("__game.state.players[0].x")
                touch_page.keyboard.down("KeyD")
                try:
                    touch_page.wait_for_function("x=>__game.state.players[0].x>x+1", arg=old_x, timeout=20000)
                finally:
                    touch_page.keyboard.up("KeyD")
                require(touch_page.locator("#legend").is_visible(), "Keyboard control legend stayed hidden after touch play")
                touch_page.locator("#menu-button").tap()
                await_screen(touch_page, "pause")
                require(touch_page.locator("body").evaluate("el=>el.classList.contains('touch')"),
                        "A new touch did not restore the touch layout")
            check("touch shortcut, pause and keyboard/touch handoff remain playable", touch_shortcut)
    finally:
        touch_context.close()

    current_group = "all"
    check("all browser paths remain free of uncaught JavaScript errors",
          lambda: require(not runtime_errors, "; ".join(runtime_errors[:4])))
    return result
