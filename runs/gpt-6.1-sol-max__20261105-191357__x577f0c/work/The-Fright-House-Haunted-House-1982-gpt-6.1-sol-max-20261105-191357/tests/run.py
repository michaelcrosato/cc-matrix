"""One-command browser verification. Only failures and a final count go to stdout."""

import argparse
import functools
import http.server
import json
import os
import pathlib
import subprocess
import threading
import traceback

from browser_checks import exercise, internet_race, multiplayer, visuals
from playwright.sync_api import sync_playwright

PROJECT = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS = PROJECT / "tests" / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument("--smoke", action="store_true")
parser.add_argument("--gl", action="store_true")
parser.add_argument("--model", action="store_true")
parser.add_argument("--internet", action="store_true")
parser.add_argument("--visual", action="store_true")
args = parser.parse_args()
if args.visual:
    args.gl = True
    args.smoke = True
checks = []
issues = []
logs = []


def check(name, condition, detail=""):
    checks.append({"name": name, "pass": bool(condition), "detail": str(detail)})
    if not condition:
        print(f"FAIL {name}: {detail}", flush=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(PROJECT))
)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f"http://127.0.0.1:{server.server_port}"
try:
    if not args.smoke and not args.internet:
        release = PROJECT.parent / (PROJECT.name + ".html")
        metadata = json.loads((PROJECT.parent / "exit-interview.json").read_text())
        check(
            "exit interview is valid JSON with the exact requested top-level shape",
            set(metadata)
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            },
        )
        check(
            "feedback arrays answer every question",
            len(metadata["testingFeedback"]) == 4
            and len(metadata["engineFeedback"]) == 6
            and len(metadata["promptFeedback"]) == 4
            and all(
                isinstance(v, str) and v
                for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
                for v in metadata[k]
            ),
        )
        check(
            "catalogue metadata and usage are complete",
            metadata["sourceInformation"]["usage"] == "added on import"
            and metadata["aiHub"]["name"] == "The Fright House"
            and 3 <= len(metadata["aiHub"]["tags"]) <= 6,
        )
        html = release.read_text()
        check(
            "release is a single self-contained HTML with the unmodified Hub client",
            html == (PROJECT / "game.html").read_text()
            and (PROJECT / "hub/session.js").read_text() in html
            and "%%BUNDLE%%" not in html
            and "%%METADATA%%" not in html,
        )
        model_run = subprocess.run(
            ["node", "tests/model.mjs"],
            cwd=PROJECT,
            capture_output=True,
            text=True,
            timeout=90,
            check=False,
        )
        model = json.loads(model_run.stdout)
        for c in model["checks"]:
            check(c["name"], c["pass"], c.get("detail", ""))
        (ARTIFACTS / "playthrough.json").write_text(json.dumps(model, indent=2))
    if args.model:
        raise SystemExit(0)
    with sync_playwright() as p:
        flags = (
            [
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
                "--use-angle=swiftshader",
                "--disable-vulkan-surface",
            ]
            if not args.gl
            else [
                "--disable-webgpu",
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
            ]
        )
        browser = p.chromium.launch(
            channel="chromium",
            headless=True,
            args=flags,
            env={**os.environ, "TMPDIR": "."},
        )
        if args.internet:
            internet_race(browser, origin, check, ARTIFACTS)
            browser.close()
            raise SystemExit(0)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080}, device_scale_factor=1
        )
        context.set_offline(True)
        page = context.new_page()
        page.on("pageerror", lambda e: issues.append(str(e)))
        page.on(
            "console", lambda m: issues.append(m.text) if m.type == "error" else None
        )
        page.on("console", lambda m: logs.append({"type": m.type, "text": m.text}))
        page.goto(
            (PROJECT / "game.html").as_uri() + "?test=1&localonly=1", wait_until="load"
        )
        try:
            page.wait_for_function(
                "window.__fright?.getState().ready === true", timeout=90000
            )
            state = page.evaluate("window.__fright.getState()")
            check(
                "file:// opens the actual game",
                page.title().startswith("The Fright House")
                and state["mode"] == "title",
            )
            check(
                "requested renderer backend",
                state["backend"] == ("WebGL 2" if args.gl else "WebGPU"),
                state["backend"],
            )
            check("music defaults to ten percent", state["settings"]["music"] == 0.1)
            page.evaluate("__fright.app.lastActivity=performance.now()+1000000")
            page.wait_for_timeout(500)
            logs.append(
                page.evaluate(
                    '({phase:"title",lost:__fright.app.view.renderer._isDeviceLost,errors:__fright.app.view.gpuErrors,draws:__fright.app.view.renderer.info.render.calls,frames:__fright.getState().frames})'
                )
            )
            page.screenshot(path=str(ARTIFACTS / "title.png"))
            page.get_by_role("button", name="Enter the house", exact=False).click()
            page.wait_for_function('window.__fright.getState().mode === "play"')
            page.wait_for_timeout(1000)
            page.screenshot(path=str(ARTIFACTS / "gameplay.png"))
            logs.append(
                page.evaluate(
                    '({phase:"play",lost:__fright.app.view.renderer._isDeviceLost,draws:__fright.app.view.renderer.info.render.calls,frames:__fright.getState().frames})'
                )
            )
            check(
                "solo enters play",
                page.evaluate("window.__fright.getState().screen === null"),
            )
            if not args.smoke:
                exercise(page, context, browser, origin, check, ARTIFACTS, logs)
            if args.visual:
                visuals(page, context, browser, origin, check, ARTIFACTS)
        except Exception as e:  # noqa: BLE001 - Aggregate browser failures.
            check("startup", False, str(e))
            page.screenshot(path=str(ARTIFACTS / "startup-failure.png"))
        check("no browser errors", len(issues) == 0, "\n".join(issues[:12]))
        context.close()
        if not args.smoke:
            try:
                multiplayer(browser, origin, check, ARTIFACTS)
                internet_race(browser, origin, check, ARTIFACTS)
            except Exception as e:  # noqa: BLE001 - Aggregate browser failures.
                check("multiplayer suite", False, str(e))
        browser.close()
except KeyboardInterrupt:
    check("test suite completed", False, "interrupted")
except Exception:  # noqa: BLE001 - Report any runner failure as a failed check.
    check("test runner", False, traceback.format_exc())
finally:
    server.shutdown()
    server.server_close()
    (ARTIFACTS / "results.json").write_text(
        json.dumps({"checks": checks, "browserIssues": issues, "logs": logs}, indent=2)
    )
    failed = sum(not c["pass"] for c in checks)
    print(
        f"{len(checks)} checks · {len(checks) - failed} passed · {failed} failed",
        flush=True,
    )
    raise SystemExit(bool(failed))
