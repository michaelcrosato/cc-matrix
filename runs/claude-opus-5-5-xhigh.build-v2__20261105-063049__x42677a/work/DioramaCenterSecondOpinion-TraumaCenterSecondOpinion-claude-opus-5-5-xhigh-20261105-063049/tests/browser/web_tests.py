"""The built single file, from file://, in Chromium with software WebGPU. Prints only failures."""
import json
import sys
import time
import traceback

from common import ARGS, CRASHED, OUT, frames, wait_for_memory, hit, key, open_game, press_until, status, sync_playwright, wait

results = []


def test(fn):
    results.append(fn)
    return fn


def to_title(page):
    return wait(page, lambda s: s.get("screen") == "Title", 300, "title")


@test
def boots_clean_with_the_right_title(b):
    ctx, page, errs = open_game(b)
    s = to_title(page)
    assert "Diorama Center" in page.title(), page.title()
    assert s["device"] in ("mouse", "pad")
    # None of the engine's overlays: the stage is ours and the status comes from our shell.
    assert s["scene"] == "surgery/title"
    time.sleep(1.5)
    assert not errs, errs[:3]
    assert page.evaluate("!!document.querySelector('meta[name=\"hub:session\"]')"), "hub tags"
    assert page.evaluate("document.head.querySelector('script').textContent.includes('aihub-session')"), "the client is the first script"
    assert page.evaluate("!!document.getElementById('about-data')"), "about block"
    ctx.close()


@test
def music_defaults_to_ten_percent_and_the_analyser_hears_it(b):
    ctx, page, errs = open_game(b, tap=True)
    s = to_title(page)
    assert abs(s["music"] - 0.10) < 1e-3, s["music"]
    assert abs(s["bus_gains"][0] - 0.10) < 1e-3, s["bus_gains"]
    page.mouse.click(300, 300)  # sound is allowed after a click
    peak = meter = 0.0
    for _ in range(300):
        time.sleep(0.1)
        peak = max(peak, page.evaluate("window.__peak ? window.__peak() : 0"))
        meter = max(meter, max(status(page)["bus_peaks"]))
        if peak > 0.002 and meter > 0.002:
            break
    assert peak > 0.002, f"the analyser hears nothing: {peak}"
    assert meter > 0.002, f"the mixer's meters read nothing: {meter}"
    ctx.close()


@test
def a_dualsense_walks_menus_flicks_tools_and_r2_is_analog(b):
    ctx, page, errs = open_game(b, pad=True)
    to_title(page)

    hit(page, 0)
    s = wait(page, lambda s: s["screen"] == "Menu", 20, "menu")
    assert s["device"] == "pad"
    assert "Cross" in s["prompts"], s["prompts"]
    hit(page, 13)  # D-pad down
    s = status(page)
    assert s["focus"] >= 1, (s["focus"], s["pads"], s["device"])
    # Into a case, by the hook, and play it with the pad.
    page.evaluate("__game.do(JSON.stringify({load:'surgery/case/0'}));__game.do(JSON.stringify({screen:'Playing'}))")
    wait(page, lambda s: s.get("sim") and s["sim"].get("case") == 0 and s["sim"]["stage"] == "Chart", 30, "the chart")
    hit(page, 0)
    wait(page, lambda s: s["sim"]["stage"] == "Op", 40, "the operation")
    # A flick of the left stick up-right picks the second instrument, with no menu.
    page.evaluate("__padAxis(0,0.8);__padAxis(1,-0.8)")
    time.sleep(0.5)
    page.evaluate("__padAxis(0,0);__padAxis(1,0)")
    s = wait(page, lambda s: s["tool"] == "Forceps", 15, "flick")
    # Down-left: gel.
    page.evaluate("__padAxis(0,-0.8);__padAxis(1,0.8)")
    s = wait(page, lambda s: s["tool"] == "Gel", 15, "flick to gel")
    page.evaluate("__padAxis(0,0);__padAxis(1,0)")
    # Analog R2 reaches the sim.
    page.evaluate("__padHit(7,0.5)")
    s = wait(page, lambda s: s["using"] and 0.3 < s["pressure"] < 0.7, 15, "analog R2")
    page.evaluate("__padHit(7,0)")
    # The right stick moves the cursor.
    before = status(page)["cursor"]
    page.evaluate("__padAxis(2,1)")
    wait(page, lambda s: s["cursor"][0] > before[0] + 0.5, 15, "the stick moves the cursor")
    page.evaluate("__padAxis(2,0)")
    # Options pauses.
    hit(page, 9)
    wait(page, lambda s: s["screen"] == "Pause", 10, "Options pauses")
    # Options while Create is held: the hub's, ignored.
    hit(page, 9)
    wait(page, lambda s: s["screen"] == "Playing", 10, "Options resumes")
    page.evaluate("__padHit(8,1)")
    frames(page, 2)
    hit(page, 9)
    page.evaluate("__padHit(8,0)")
    assert status(page)["screen"] == "Playing", "Create + Options is the hub's"
    assert not errs, errs[:3]
    ctx.close()


@test
def keyboard_and_mouse_tools_wheel_hover_click_and_prompts_flip(b):
    ctx, page, errs = open_game(b, 1280, 720, pad=True)
    to_title(page)
    key(page, "Enter")
    s = wait(page, lambda s: s["screen"] == "Menu", 20, "menu by Enter")
    assert s["device"] == "mouse" and "Enter" in s["prompts"], s["prompts"]
    # Hover moves the focus: the fourth row of the list (canvas y 240 + 104*k at 1080p).
    y = int((240 + 104 * 2 + 40) * 720 / 1080)
    page.mouse.move(300, y)
    wait(page, lambda s: s["focus"] == 2, 15, "hover focus")
    # The pad takes over at once, and back.
    page.evaluate("__padHit(12,1)")
    wait(page, lambda s: s["device"] == "pad" and "Cross" in s["prompts"], 15, "prompts flip to pad")
    page.evaluate("__padHit(12,0)")
    frames(page, 2)
    key(page, "ArrowDown")
    wait(page, lambda s: s["device"] == "mouse" and "Enter" in s["prompts"], 15, "prompts flip back")
    page.evaluate("__game.do(JSON.stringify({load:'surgery/case/0'}));__game.do(JSON.stringify({screen:'Playing'}))")
    wait(page, lambda s: s.get("sim") and s["sim"].get("case") == 0 and s["sim"]["stage"] == "Chart", 30, "the case")
    press_until(page, "Enter", lambda s: s["sim"]["stage"] in ("OpStart", "Op"), "the operation")
    wait(page, lambda s: s["sim"]["stage"] == "Op", 40, "the operation")
    # Digit picks a tool.
    key(page, "6")
    wait(page, lambda s: s["tool"] == "Gel", 15, "digit")
    # Wheel cycles.
    page.mouse.wheel(0, 120)
    wait(page, lambda s: s["tool"] != "Gel", 15, "wheel")
    # The mouse aims: a move lands in field coordinates near the middle.
    page.mouse.move(640, 380)
    s = wait(page, lambda s: abs(s["cursor"][0]) < 1.0, 15, "mouse aim")
    page.mouse.down()
    wait(page, lambda s: s["using"], 15, "left button uses")
    page.mouse.up()
    # Esc pauses.
    key(page, "Escape")
    wait(page, lambda s: s["screen"] == "Pause", 10, "Esc pauses")
    assert not errs, errs[:3]
    ctx.close()


@test
def a_second_pad_joins_with_cross_and_gets_its_own_surgeon(b):
    ctx, page, errs = open_game(b, pad=True)
    page.evaluate("""() => { const buttons = Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}));
        const pad2 = {id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 1, connected: true, mapping: 'standard', timestamp: 0, axes: [0,0,0,0], buttons};
        const first = window.__pad; navigator.getGamepads = () => [first, pad2, null, null]; window.__pad2 = pad2; }""")
    to_title(page)
    page.evaluate("__game.do(JSON.stringify({load:'surgery/codeblue'}));__game.do(JSON.stringify({screen:'Playing'}))")
    wait(page, lambda s: s.get("sim") and s["sim"].get("case") == 255 and s["sim"]["stage"] == "Chart", 60, "code blue")
    wait(page, lambda s: s["pads"] == 2, 30, "two pads")
    page.evaluate("__pad2.buttons[0].pressed = true; __pad2.buttons[0].value = 1; __pad2.timestamp++")
    frames(page, 3)
    page.evaluate("__pad2.buttons[0].pressed = false; __pad2.buttons[0].value = 0; __pad2.timestamp++")
    s = wait(page, lambda s: s["sim"]["present"][1], 30, "the second surgeon")
    page.evaluate("__game.do(JSON.stringify({sim:'Advance'}))")
    wait(page, lambda s: s["sim"]["stage"] == "Op", 90, "the operation")
    page.evaluate("__pad2.axes[2] = 1; __pad2.timestamp++")
    wait(page, lambda s: abs(s["sim"]["cursors"][1][0]) > 0.5, 60, "pad two moves surgeon two")
    assert abs(status(page)["sim"]["cursors"][0][0]) < 0.01, "and not surgeon one"
    assert not errs, errs[:3]
    ctx.close()


@test
def attract_at_ten_seconds_and_exit_on_key_pad_and_mouse(b):
    ctx, page, errs = open_game(b, pad=True)
    s = to_title(page)
    for how in ("key", "pad", "mouse"):
        s = wait(page, lambda s: s["screen"] == "Attract", 60, "attract")
        wait(page, lambda s: "attract" in s["scene"], 10, "attract scene")
        if how == "key":
            key(page, "x")
        elif how == "pad":
            hit(page, 0)
        else:
            page.mouse.move(100 + time.time() % 50, 120)
            page.mouse.move(200, 220)
        wait(page, lambda s: s["screen"] == "Title", 15, f"exit on {how}")
    assert not errs, errs[:3]
    ctx.close()


@test
def phone_profile_shows_the_message_and_no_touch_controls(b):
    device = sync_pw.devices["Pixel 7"]
    ctx, page, errs = open_game(b, **{k: v for k, v in device.items() if k not in ("viewport", "default_browser_type")}, width=device["viewport"]["width"], height=device["viewport"]["height"])
    s = wait(page, lambda s: s.get("screen") == "Title", 240, "title")
    assert s["touch_only"] is True, s
    assert s["device"] == "touch", s["device"]
    # The Settings button answers a tap. On a portrait phone the canvas is 1920 points wide, and
    # the button sits 260 k points below the middle, with k the extra height clamped at 2.4.
    w, h = device["viewport"]["width"], device["viewport"]["height"]
    zoom = min(w / 1920, h / 1080)
    k = min(max(h / zoom / 1080, 1.0), 2.4)
    page.touchscreen.tap(w / 2, h / 2 + 260 * k * zoom)
    wait(page, lambda s: s["screen"] == "Settings", 60, "settings by tap")
    page.evaluate("__game.do(JSON.stringify({screen:'Title'}))")
    s = wait(page, lambda s: s["screen"] == "Attract", 60, "attract on a phone")
    assert not errs, errs[:3]
    ctx.close()


@test
def settings_persist_across_a_reload(b):
    ctx, page, errs = open_game(b, width=1280, height=720)
    to_title(page)
    key(page, "Enter")
    wait(page, lambda s: s["screen"] == "Menu", 20, "menu")
    page.evaluate("__game.do(JSON.stringify({screen:'Settings'}))")
    wait(page, lambda s: s["screen"] == "Settings", 10, "settings")
    for _ in range(2):
        key(page, "ArrowRight")
    s = wait(page, lambda s: s["music"] > 0.11, 10, "music up")
    level = s["music"]
    page.reload()
    s = wait(page, lambda s: s.get("screen") == "Title", 150, "title again")
    assert abs(s["music"] - level) < 1e-3, (s["music"], level)
    assert abs(s["bus_gains"][0] - level) < 1e-3, s["bus_gains"]
    ctx.close()


@test
def dev_mode_from_the_pause_menu_and_sliders_reach_the_sim(b):
    ctx, page, errs = open_game(b, width=1280, height=720)
    to_title(page)
    page.evaluate("__game.do(JSON.stringify({load:'surgery/case/1'}));__game.do(JSON.stringify({screen:'Playing'}))")
    wait(page, lambda s: s.get("sim") and s["sim"].get("case") == 1 and s["sim"]["stage"] == "Chart", 30, "case")
    press_until(page, "Enter", lambda s: s["sim"]["stage"] in ("OpStart", "Op"), "the operation")
    wait(page, lambda s: s["sim"]["stage"] == "Op", 40, "op")
    key(page, "Escape")
    wait(page, lambda s: s["screen"] == "Pause", 10, "pause")
    for _ in range(4):
        key(page, "ArrowDown")
    wait(page, lambda s: s["focus"] == 4, 10, "dev mode's row")
    key(page, "Enter")
    wait(page, lambda s: s["screen"] == "Dev", 15, "dev")
    # A slider: the first page's third row is the vitals drain.
    for _ in range(2):
        key(page, "ArrowDown")
    key(page, "ArrowRight")
    wait(page, lambda s: s.get("drain_tune", 1.0) > 1.0, 15, "the slider reaches the sim")
    assert not errs, errs[:3]
    ctx.close()


@test
def the_whole_campaign_steps_to_won_in_the_browser(b):
    ctx, page, errs = open_game(b)
    to_title(page)
    page.evaluate("__game.do(JSON.stringify({load:'surgery/campaign/0'}));__game.do(JSON.stringify({screen:'Playing'}))")
    wait(page, lambda s: s.get("sim") and s["sim"].get("mode") == "Campaign", 30, "campaign")
    end = time.time() + 280
    s = None
    while time.time() < end:
        page.evaluate("__game.step(2000, true)")
        time.sleep(0.8)
        s = status(page)
        if s["sim"]["outcome"] == "won":
            break
    assert s["sim"]["outcome"] == "won", s["sim"]
    assert s["sim"]["cases_won"] == 8, s["sim"]
    assert not errs, errs[:3]
    ctx.close()


@test
def webkit_iphone_goes_as_far_as_it_goes(b0):
    if sync_pw is None:
        return
    device = sync_pw.devices["iPhone 14"]
    wk = sync_pw.webkit.launch()
    try:
        ctx = wk.new_context(**{k: v for k, v in device.items() if k != "default_browser_type"})
        page = ctx.new_page()
        from common import GAME
        page.goto(GAME.as_uri())
        time.sleep(3)
        text = page.evaluate("document.body.innerText")
        ok = "WebGPU" in text or page.evaluate("!!document.querySelector('canvas')")
        assert ok, text[:200]
    finally:
        wk.close()


# The line of case1_before where the camera cuts to the wide shot.
WIDE_LINE = 8


def shot(page, name):
    """Software rendering at 1080p: a screenshot has to wait its turn."""
    page.screenshot(path=str(OUT / name), timeout=240000)


@test
def screenshots_at_1080p(b):
    ctx, page, errs = open_game(b, 1920, 1080)
    to_title(page)
    time.sleep(1)
    shot(page, "p_title.png")
    key(page, "Enter")
    time.sleep(1)
    shot(page, "p_menu.png")
    page.evaluate("__game.do(JSON.stringify({load:'surgery/campaign/3'}));__game.do(JSON.stringify({screen:'Playing'}))")
    wait(page, lambda s: s.get("sim") and s["sim"].get("story"), 30, "story")
    # No keys here: on slow frames a press lasts long enough to count as the hold that skips the scene.
    page.evaluate("__game.step(240)")
    frames(page, 3, 60)
    assert status(page)["sim"].get("story"), "still in the story"
    shot(page, "p_story.png")
    # The wide shot of the operating room: Case 1's story cuts to it for Voss's line.
    page.evaluate("__game.do(JSON.stringify({load:'surgery/campaign/1'}));__game.do(JSON.stringify({screen:'Playing'}))")
    wait(page, lambda s: s.get("sim") and s["sim"].get("story") == "case1_before", 60, "Case 1's story")
    for _ in range(40):
        if status(page)["sim"]["line"] >= WIDE_LINE:
            break
        page.evaluate("__game.do(JSON.stringify({sim:'Advance'}))")
        page.evaluate("__game.step(30)")
        frames(page, 2, 60)
    assert status(page)["sim"]["line"] >= WIDE_LINE, status(page)["sim"]
    page.evaluate("__game.step(120)")
    frames(page, 3, 60)
    shot(page, "p_wide.png")
    page.evaluate("__game.do(JSON.stringify({load:'surgery/case/4'}))")
    wait(page, lambda s: s["sim"].get("case") == 4 and s["sim"]["stage"] == "Chart", 90, "the chart")
    press_until(page, "Enter", lambda s: s["sim"]["stage"] in ("OpStart", "Op"), "the operation")
    wait(page, lambda s: s["sim"]["stage"] == "Op", 90, "op")
    page.evaluate("__game.step(1200, true)")
    frames(page, 3, 60)
    shot(page, "p_op.png")
    key(page, "Escape")
    wait(page, lambda s: s["screen"] == "Pause", 15, "pause")
    time.sleep(0.5)
    shot(page, "p_pause.png")
    page.evaluate("__game.do(JSON.stringify({screen:'Dev'}))")
    time.sleep(1)
    shot(page, "p_dev.png")
    # Back out through the pause menu, so time runs again, and win the case from the dev tools.
    page.evaluate("__game.do(JSON.stringify({screen:'Pause'}))")
    frames(page, 2, 60)
    key(page, "Escape")
    wait(page, lambda s: s["screen"] == "Playing", 60, "back in the operation")
    page.evaluate("__game.do(JSON.stringify({sim:{Cheat:{id:6,value:1}}}))")
    wait(page, lambda s: s["stage"] == "Results", 120, "results")
    # The score lines and the stamp come out on sim time: run it past the end of the reveal.
    page.evaluate("__game.step(600)")
    frames(page, 3, 60)
    shot(page, "p_results.png")
    page.evaluate("__game.do(JSON.stringify({screen:'About'}))")
    time.sleep(1)
    shot(page, "p_about.png")
    ctx.close()


sync_pw = None


def main():
    global sync_pw
    passed = failed = 0
    with sync_playwright() as p:
        sync_pw = p
        b = p.chromium.launch(args=ARGS)
        only = [a for a in sys.argv[1:] if not a.startswith("--")]
        for fn in results:
            if only and not any(o in fn.__name__ for o in only):
                continue
            for attempt in range(4):
                wait_for_memory()
                try:
                    fn(b)
                    passed += 1
                    break
                except Exception as e:
                    text = str(e)
                    # Out of memory ends the browser: that's the machine, not the game. Try again.
                    if any(c in text for c in CRASHED) and attempt < 3:
                        try:
                            b.close()
                        except Exception:
                            pass
                        time.sleep(20)
                        b = p.chromium.launch(args=ARGS)
                        continue
                    failed += 1
                    print(f"FAIL {fn.__name__}: {e}")
                    tb = traceback.format_exc().splitlines()
                    print("  " + "\n  ".join(tb[-6:-1]))
                    break
                finally:
                    # A page left running starves the next one of the software renderer.
                    try:
                        for c in list(b.contexts):
                            c.close()
                    except Exception:
                        pass
        b.close()
    return passed, failed


if __name__ == "__main__":
    print("%d passed, %d failed" % main())
