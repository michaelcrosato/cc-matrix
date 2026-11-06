import json
import os
import sys
import threading
import traceback
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright


DEV = Path(__file__).resolve().parent.parent
ROOT = DEV.parent
HTML = ROOT / f"{DEV.name}.html"
ARTIFACTS = DEV / "tests" / "artifacts"
failures = []
checks = 0


def test(name, function):
    global checks
    checks += 1
    try:
        function()
    except Exception:
        failures.append(f"{name}:\n{traceback.format_exc()}")


def status(page):
    return json.loads(page.evaluate("window.__gameStatus()"))


def click(page, action):
    page.locator(f'[data-action="{action}"]').first.click(timeout=5000)


def advance(page):
    page.evaluate("window.__testAdvance(200)")
    assert status(page)["scene"] == "result", status(page)


def load(browser, **kwargs):
    context = browser.new_context(**kwargs)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(HTML.as_uri() + "?test=1", wait_until="domcontentloaded")
    page.wait_for_function("window.__gameBoot?.ready === true")
    return context, page, errors


def new_guest(page):
    click(page, "slots-new")
    click(page, "slot:0")
    page.locator("#guest-name").select_option(label="Ari")
    click(page, "skin:2")
    click(page, "outfit:3")
    click(page, "create-guest")
    click(page, "island")
    assert status(page)["guest"] == "Ari"


def browser_tests(playwright):
    for engine in ("chromium", "firefox", "webkit"):
        browser = getattr(playwright, engine).launch(headless=True)

        def smoke():
            context, page, errors = load(browser, viewport={"width": 1280, "height": 800})
            assert "Wii Fit" in page.title()
            click(page, "about")
            assert "Source Information" in page.locator("#app").inner_text()
            assert "Library credits" in page.locator("#app").inner_text()
            page.locator(".licenses summary").click()
            assert "SIL OPEN FONT LICENSE" in page.locator(".licenses").inner_text()
            click(page, "title")
            new_guest(page)
            click(page, "check")
            click(page, "begin-check")
            page.keyboard.press("Escape")
            assert status(page)["paused"]
            page.keyboard.press("Escape")
            advance(page)
            click(page, "result-next")
            assert status(page)["checked"]
            click(page, "intro:breath")
            click(page, "begin-event")
            page.keyboard.press("Space")
            advance(page)
            assert status(page)["minutes"] == 1 + status(page)["resultStars"]
            click(page, "result-next")
            page.screenshot(path=str(ARTIFACTS / f"{engine}-island.png"))
            assert not errors, errors
            context.close()

        test(f"{engine} guest, check and activity", smoke)
        browser.close()

    browser = playwright.chromium.launch(headless=True)

    def stay():
        context, page, errors = load(browser, viewport={"width": 1280, "height": 800})
        new_guest(page)
        for day, goal in enumerate((3, 5, 7, 9, 0), 1):
            assert status(page)["day"] == day
            click(page, "check")
            click(page, "begin-check")
            advance(page)
            click(page, "result-next")
            for _ in range(goal if day < 5 else 1):
                if day < 5 and status(page)["minutes"] >= goal:
                    break
                click(page, "intro:finale" if day == 5 else "intro:breath")
                click(page, "begin-event")
                advance(page)
                click(page, "result-next")
            click(page, "end-day")
            click(page, "sleep")
        assert status(page)["scene"] == "ending"
        click(page, "free-play")
        assert status(page)["scene"] == "island"
        page.reload(wait_until="domcontentloaded")
        page.wait_for_function("window.__gameBoot?.ready === true")
        click(page, "slots-continue")
        click(page, "slot:0")
        assert status(page)["guest"] == "Ari" and status(page)["day"] == 5
        assert not errors, errors
        context.close()

    test("five-day stay, ending and save persistence", stay)

    def minute_rewards():
        context, page, errors = load(browser)
        new_guest(page)
        click(page, "check")
        click(page, "begin-check")
        advance(page)
        click(page, "result-next")
        for attempt in range(2):
            before = status(page)["minutes"]
            click(page, "intro:breath")
            click(page, "begin-event")
            advance(page)
            earned = status(page)["minutes"] - before
            assert earned == (1 + status(page)["resultStars"] if attempt == 0 else 1)
            click(page, "result-next")
        while status(page)["minutes"] < 3:
            click(page, "intro:breath")
            click(page, "begin-event")
            advance(page)
            click(page, "result-next")
        click(page, "end-day")
        click(page, "sleep")
        click(page, "check")
        click(page, "begin-check")
        advance(page)
        click(page, "result-next")
        click(page, "intro:breath")
        click(page, "begin-event")
        advance(page)
        assert status(page)["minutes"] == 1 + status(page)["resultStars"]
        assert not errors, errors
        context.close()

    test("first-clear and repeat minute rewards", minute_rewards)

    def medley():
        context, page, errors = load(browser)
        click(page, "together")
        click(page, "hotseat:2")
        for player in range(2):
            for event in range(3):
                current = status(page)["together"]
                assert current["player"] == player and current["event"] == event, current
                click(page, "hotseat-next")
                click(page, "begin-event")
                advance(page)
                click(page, "result-next")
        assert status(page)["scene"] == "podium"
        assert not errors, errors
        context.close()

    test("two-player local medley", medley)

    def tuning():
        context, page, errors = load(browser, viewport={"width": 1280, "height": 800})
        new_guest(page)
        click(page, "check")
        click(page, "begin-check")
        click(page, "pause")
        before = status(page)["elapsed"]
        page.wait_for_timeout(250)
        assert status(page)["elapsed"] == before
        page.locator("summary").click()
        page.screenshot(path=str(ARTIFACTS / "pause-tuning.png"))
        for kind, value in (("stiffness", 55), ("damping", 10), ("wobble", .2), ("timeScale", 2)):
            page.locator(f"#dev-{kind}").evaluate("(element, value) => { element.value = value; element.dispatchEvent(new Event('input', {bubbles:true})); }", str(value))
        click(page, "reset-tuning")
        page.locator("summary").click()
        for kind, value in (("stiffness", 40), ("damping", 8.5), ("wobble", .12), ("timeScale", 1)):
            assert float(page.locator(f"#dev-{kind}").input_value()) == value
        click(page, "give-minutes")
        assert status(page)["minutes"] == 5
        page.locator("summary").click()
        click(page, "finish-now")
        assert status(page)["scene"] == "result" and status(page)["checked"]
        assert not errors, errors
        context.close()

    test("offline pause and developer controls", tuning)

    def online_pause():
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        context.add_init_script("""window.AIHub={active:true,handlers:{},on(name,fn){this.handlers[name]=fn},connect(){return Promise.resolve({players:[{},{}],splash:true})},ready(){this.handlers.start({in:0})},progress(){},send(){},result(){},probe(){}};""")
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(HTML.as_uri() + "?test=1", wait_until="domcontentloaded")
        page.wait_for_function("window.__gameStatus && JSON.parse(window.__gameStatus()).scene === 'event'")
        click(page, "pause")
        assert page.locator("summary").count() == 0
        assert page.locator('[data-action="leave-event"]').count() == 0
        before = status(page)["elapsed"]
        page.wait_for_timeout(350)
        assert status(page)["elapsed"] > before + .15
        click(page, "settings")
        before = status(page)["elapsed"]
        page.wait_for_timeout(350)
        assert status(page)["elapsed"] > before + .15
        click(page, "settings-back")
        assert status(page)["paused"]
        click(page, "resume")
        advance(page)
        page.wait_for_function("JSON.parse(window.__gameStatus()).together.event === 1", timeout=5000)
        assert status(page)["scene"] == "event"
        assert not errors, errors
        context.close()

    test("online pause and automatic medley progression", online_pause)
    browser.close()

    browser = playwright.webkit.launch(headless=True)

    def touch_guard():
        context, page, errors = load(browser, **playwright.devices["iPhone SE (3rd gen)"])
        assert "Controller or keyboard required" in page.locator("#app").inner_text()
        page.screenshot(path=str(ARTIFACTS / "iphone-touch.png"))
        page.locator('.touch-guard [data-action="settings"]').tap(timeout=5000)
        assert status(page)["scene"] == "settings"
        page.keyboard.press("ArrowDown")
        click(page, "settings-back")
        click(page, "about")
        page.locator(".licenses summary").click()
        page.locator(".licenses").scroll_into_view_if_needed()
        page.screenshot(path=str(ARTIFACTS / "iphone-about.png"))
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        click(page, "title")
        new_guest(page)
        click(page, "check")
        click(page, "begin-check")
        heading = page.locator("#round-name").bounding_box()
        controls = page.locator(".hud-right").bounding_box()
        phase = page.locator("#phase-card").bounding_box()
        meter = page.locator(".meter").bounding_box()
        puck = page.locator(".puck").bounding_box()
        assert heading["x"] + heading["width"] <= controls["x"]
        assert phase["y"] >= max(heading["y"] + heading["height"], controls["y"] + controls["height"])
        assert meter["x"] + meter["width"] <= puck["x"]
        assert meter["y"] + meter["height"] <= 667
        page.screenshot(path=str(ARTIFACTS / "iphone-check.png"))
        click(page, "pause")
        assert status(page)["paused"]
        page.screenshot(path=str(ARTIFACTS / "iphone-pause.png"))
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        assert not errors, errors
        context.close()

    test("touch-only guard and settings", touch_guard)
    browser.close()


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def hub_tests(playwright):
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    browser = playwright.chromium.launch(headless=True)
    try:
        for name, settings in [
            ("two players", {"players": 2}),
            ("three players", {"players": 3}),
            ("four players with network jitter", {"players": 4, "latency": 150, "jitter": 50, "loss": 5}),
            ("host leaves", {"players": 3, "scenario": "host-leave"}),
        ]:
            def conformance():
                page = browser.new_page()
                query = urlencode({"auto": 1, "game": "../../" + HTML.name, **settings})
                url = f"http://127.0.0.1:{server.server_port}/{DEV.name}/hub/harness.html?{query}"
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_function("document.body.dataset.complete === 'true'", timeout=60000)
                result = page.evaluate("window.__hubCheck")
                bad = [f'{item["name"]}: {item.get("detail", "")}' for item in result["checks"] if not item["pass"]]
                assert result["pass"], "\n".join(bad)
                page.close()

            test("AI Hub " + name, conformance)
    finally:
        browser.close()
        server.shutdown()
        server.server_close()
        thread.join()


def main():
    os.environ.setdefault("PLAYWRIGHT_HOST_PLATFORM_OVERRIDE", "ubuntu24.04-x64")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        if len(sys.argv) == 1 or sys.argv[1] in ("browser", "all"):
            browser_tests(playwright)
        if len(sys.argv) == 1 or sys.argv[1] in ("hub", "all"):
            hub_tests(playwright)
    for failure in failures:
        print(f"FAIL {failure}")
    print(f"{checks - len(failures)}/{checks} checks passed")
    sys.exit(bool(failures))


if __name__ == "__main__":
    main()
