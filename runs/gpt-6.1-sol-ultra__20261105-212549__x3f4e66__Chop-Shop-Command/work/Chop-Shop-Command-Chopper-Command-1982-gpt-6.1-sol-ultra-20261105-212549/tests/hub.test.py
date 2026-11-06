import os
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

DIR = Path(__file__).resolve().parents[1]
BASE = os.environ.get("CSC_BASE_URL", "http://127.0.0.1:36269").rstrip("/")
GAME = DIR.name + ".html"
HARNESS = BASE + "/" + DIR.name + "/tests/hub/harness.html"
checks = 0
failures = []


def check(name, fn):
    global checks
    checks += 1
    try:
        fn()
    except (AssertionError, PlaywrightError) as error:
        failures.append(name + ": " + str(error).split("\n")[0])


def require(value, detail="assertion failed"):
    if not value:
        raise AssertionError(detail)


def run_case(browser, label, players, **network):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script("Object.defineProperty(navigator,'gpu',{value:undefined});")
    context.route("**/favicon.ico", lambda route: route.fulfill(status=204))
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "console",
        lambda message: (
            errors.append(message.text) if message.type == "error" else None
        ),
    )
    params = {
        "game": "../../../" + GAME,
        "players": players,
        "auto": 1,
        "seed": 1982,
        **network,
    }
    report = None
    saw_title = False
    try:
        page.goto(
            HARNESS + "?" + urlencode(params),
            wait_until="domcontentloaded",
            timeout=30000,
        )
        require(page.title() == "AI Hub Session Harness", "wrong page served")
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            done = page.evaluate("document.body.dataset.complete === 'true'")
            if done:
                report = page.evaluate("window.__hubCheck")
                break
            states = page.evaluate(
                "Array.from(document.querySelectorAll('iframe'), f => f.contentWindow.__game?.state.screen).filter(Boolean)"
            )
            saw_title = saw_title or any(s in ("title", "attract") for s in states)
            page.wait_for_timeout(250)
        check(
            label + " official harness conformance",
            lambda: require(
                report and report.get("pass"),
                "; ".join(
                    c["name"] + ": " + c.get("detail", "")
                    for c in (report or {}).get("checks", [])
                    if not c["pass"]
                )
                or "harness timed out",
            ),
        )
        check(
            label + " no title or attract before synchronized play",
            lambda: require(not saw_title),
        )
        check(
            label + " no browser or console errors",
            lambda: require(not errors, "; ".join(errors[:4])),
        )
        final = page.evaluate("""Array.from(document.querySelectorAll('.cell:not(.is-out) iframe'), f => {
            const g = f.contentWindow.__game;
            return g ? {title:f.contentDocument.title, screen:g.state.screen,
                time:g.state.time, mode:g.state.mode, audio:g.state.audio} : null;
        })""")

        def stopped():
            require(
                len(final) >= 1 and all(s for s in final), "missing final game states"
            )
            for state in final:
                require(state["title"] == "Chop Shop Command", "wrong game served")
                require(
                    state["screen"] == "hub-end" and state["mode"] == "ended",
                    str(state),
                )
                require(
                    not state["audio"]["active"] and not state["audio"]["rotorRunning"],
                    "audio remains active",
                )
                require(state["audio"]["rms"] == 0, "audio level remains nonzero")

        check(label + " every remaining copy stops gameplay and sound at end", stopped)
        page.evaluate("""for(const f of document.querySelectorAll('.cell:not(.is-out) iframe')) {
            const w=f.contentWindow;
            w.document.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Enter',key:'Enter',bubbles:true}));
            w.document.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true}));
            w.document.querySelector('.pause-btn')?.click();
        }""")
        page.wait_for_timeout(400)
        after = page.evaluate(
            "Array.from(document.querySelectorAll('.cell:not(.is-out) iframe'), f => f.contentWindow.__game?.state).filter(Boolean)"
        )
        check(
            label + " end ignores further input and freezes simulation",
            lambda: require(
                len(after) == len(final)
                and all(
                    a["screen"] == "hub-end"
                    and a["time"] == b["time"]
                    and a["audio"]["state"] in ("locked", "suspended")
                    for a, b in zip(after, final)
                )
            ),
        )
    except (AssertionError, PlaywrightError) as error:
        message = str(error).split("\n")[0]
        check(label + " harness execution", lambda: require(False, message))
    finally:
        context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
    )
    try:
        run_case(browser, "2-player standard", 2, latency=60, jitter=20, loss=0)
        run_case(browser, "4-player lossy network", 4, latency=150, jitter=50, loss=5)
        run_case(
            browser,
            "host departure",
            2,
            scenario="host-leave",
            latency=150,
            jitter=50,
            loss=5,
        )
    finally:
        browser.close()

for failure in failures:
    print("FAIL " + failure)
print(f"{checks} hub harness checks, {len(failures)} failures")
if failures:
    sys.exit(1)
