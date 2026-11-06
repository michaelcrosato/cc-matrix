"""Exercise standalone co-op using the actual single-file release."""

import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
NAME = ROOT.name


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT.parent))
    )
    server.daemon_threads = True
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    failures = []
    checks = 0

    def check(condition, label):
        nonlocal checks
        checks += 1
        if not condition:
            failures.append(label)
            print("FAIL:", label)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-angle=swiftshader", "--disable-vulkan-surface",
                ],
            )
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            a, b = context.new_page(), context.new_page()
            errors = []
            a.on("pageerror", lambda error: errors.append(str(error)))
            b.on("pageerror", lambda error: errors.append(str(error)))
            for page in (a, b):
                page.goto(origin + f"/{NAME}.html")
                page.wait_for_function("window.__game", timeout=60000)
            check(a.title().startswith("Ka-Splat"), "actual standalone game loaded")
            offer = a.evaluate("async()=>await __game.online.createOffer()")
            answer = b.evaluate(
                "async(code)=>await __game.online.acceptOffer(code)", offer
            )
            a.evaluate("async(code)=>await __game.online.acceptAnswer(code)", answer)
            for page in (a, b):
                page.wait_for_function("__game.online.connected", timeout=15000)
            a.evaluate("__game.online.start()")
            for page in (a, b):
                page.wait_for_function("__game.state.screen==='playing'")
            a.evaluate("__game.model.setConfig({invincible:true});__game.advance(2.5,false)")
            check(
                a.evaluate("__game.snapshot().players.length===2"),
                "two authoritative player buckets",
            )
            b.wait_for_function("__game.snapshot().time>0")
            check(
                b.evaluate("__game.model.time===0"),
                "guest renders without independent simulation",
            )
            b.keyboard.down("d")
            a.wait_for_function("__game.snapshot().players[1].x>3",timeout=30000)
            b.keyboard.up("d")
            a.wait_for_function("__game.snapshot().players[1].x>3", timeout=5000)
            check(True, "guest keyboard moves orange bucket on host")
            a.keyboard.down("a")
            a.wait_for_function("__game.snapshot().players[0].x<0",timeout=30000)
            a.keyboard.up("a")
            a.wait_for_function("__game.snapshot().players[0].x<0")
            check(
                a.evaluate("__game.snapshot().players[1].x>3"),
                "host keyboard leaves guest bucket independent",
            )
            a.wait_for_function(
                "__game.model.phase==='playing' && __game.model.charge>=.999",
                timeout=10000,
            )
            b.keyboard.press("Space")
            a.wait_for_function("__game.model.stats.splashes>0", timeout=5000)
            check(True, "guest Splash reaches authoritative simulation")
            a.evaluate(
                "(()=>{__game.model.setConfig({autoplay:true,invincible:true});const cb=__game.model.onEvent;__game.model.onEvent=e=>{if(e.type===\"win\")cb(e)};__game.advance(450,true);__game.model.onEvent=cb;})()"
            )
            a.wait_for_function("__game.state.screen==='results'", timeout=10000)
            b.wait_for_function("__game.state.screen==='results'", timeout=10000)
            host_result = a.evaluate(
                "({score:__game.snapshot().score,phase:__game.snapshot().phase,waves:__game.snapshot().stats.waves})"
            )
            guest_result = b.evaluate(
                "({score:__game.snapshot().score,phase:__game.snapshot().phase,waves:__game.snapshot().stats.waves})"
            )
            check(
                host_result["phase"] == "won" and host_result["waves"] == 8,
                "authoritative full eight-wave win",
            )
            check(
                host_result == guest_result,
                "host and guest receive matching final result",
            )
            a.evaluate("__game.action('restart')")
            for page in (a, b):
                page.wait_for_function(
                    "__game.state.screen==='playing' && __game.snapshot().score===0 && __game.snapshot().phase==='intermission' && __game.snapshot().time>0"
                )
            check(True, "host restart resets both copies together")
            a.evaluate("__game.action('quit')")
            b.wait_for_function(
                "__game.state.screen==='together' && !__game.online.connected"
            )
            check(
                a.evaluate("__game.state.screen==='title'"),
                "leaving returns host to title and guest to brigade menu",
            )
            check(not errors, "standalone browser errors: " + "; ".join(errors))
            a.close()
            b.close()
            page = context.new_page()
            page.goto(
                origin
                + f"/{NAME}/hub/harness.html?game=../../{NAME}.html&players=1&auto=1&play=2500"
            )
            page.wait_for_function(
                "document.body.dataset.complete==='true'", timeout=60000
            )
            report = page.evaluate("window.__hubCheck")
            check(report["pass"], "one-seat Hub official conformance")
            seats = page.evaluate(
                "document.querySelector('iframe').contentWindow.__game.snapshot().players.length"
            )
            check(seats == 1, "one-seat Hub round has one bucket stack")
            page.close()
            context.close()
            browser.close()
    except Exception as error:  # noqa: BLE001 — Report every test setup failure in the summary.
        check(False, f"test execution: {error}")
    finally:
        server.shutdown()
        server.server_close()
    (ROOT / "actual-peer-results.json").write_text(
        json.dumps({"checks": checks, "failures": failures}, indent=2)
    )
    print(
        f"{checks - len(failures)}/{checks} actual-game peer checks passed; {len(failures)} failures"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
