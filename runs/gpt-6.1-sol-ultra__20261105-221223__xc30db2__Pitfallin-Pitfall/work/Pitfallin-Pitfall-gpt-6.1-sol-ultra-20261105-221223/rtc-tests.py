#!/usr/bin/env python3
"""Exercise manual WebRTC pairing; WebGL2 isolates transport from headless Vulkan stalls."""

import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
os.environ["TMPDIR"] = str(ROOT / ".rtc-temp")
Path(os.environ["TMPDIR"]).mkdir(exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run_checks():
    failures = []
    checks = 0
    snapshots = {}

    def check(name, condition):
        nonlocal checks
        checks += 1
        if not condition:
            failures.append(name)

    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-vulkan=swiftshader",
                    "--disable-dev-shm-usage",
                ],
            )
            try:
                context = browser.new_context(viewport={"width": 1280, "height": 720})
                host, guest = context.new_page(), context.new_page()
                page_errors = []
                for page in [host, guest]:
                    page.on("pageerror", lambda error: page_errors.append(str(error)))
                    page.goto(
                        origin + "/index.html?renderer=webgl",
                        wait_until="domcontentloaded",
                        timeout=30000,
                    )
                    page.wait_for_function(
                        "window.__gameReady && window.__pitfallin", timeout=60000
                    )
                    check("loaded page is Pitfallin", "Pitfallin" in page.title())
                    page.evaluate("""() => {
                      window.__rtcEvents = [];
                      const network = window.__pitfallin.getNetwork();
                      const previousStart = network.callbacks.onStart;
                      network.callbacks.onStart = info => {
                        previousStart?.(info);
                        window.__rtcStart = {mode:window.__pitfallin.state.mode,deadline:info.startAt};
                      };
                      const previous = network.callbacks.onGhost;
                      network.callbacks.onGhost = (data, from) => {
                        window.__rtcEvents.push({data, from});
                        if (window.__rtcEvents.length > 100) window.__rtcEvents.shift();
                        previous?.(data, from);
                      };
                    }""")
                offer = host.evaluate("window.__pitfallin.getNetwork().createOffer()")
                check(
                    "leader produces invitation",
                    isinstance(offer, str) and len(offer) > 100,
                )
                answer = guest.evaluate(
                    "(code) => window.__pitfallin.getNetwork().acceptOffer(code)", offer
                )
                check(
                    "guest produces reply",
                    isinstance(answer, str) and len(answer) > 100,
                )
                host.evaluate(
                    "(code) => window.__pitfallin.getNetwork().acceptAnswer(code)",
                    answer,
                )
                for page in [host, guest]:
                    page.wait_for_function(
                        "window.__pitfallin.state.network.players.length === 2 && [...window.__pitfallin.getNetwork()._peers.values()].some(p => p.channel?.readyState === 'open')",
                        timeout=30000,
                    )
                check(
                    "two-way datachannel has both explorers",
                    all(
                        page.evaluate("window.__pitfallin.state.network.players.length")
                        == 2
                        for page in [host, guest]
                    ),
                )
                check(
                    "peer rosters agree",
                    host.evaluate("window.__pitfallin.state.network.players")
                    == guest.evaluate("window.__pitfallin.state.network.players"),
                )
                host.evaluate("window.__pitfallin.getNetwork().startRace()")
                for page in [host, guest]:
                    page.wait_for_function(
                        "window.__rtcStart?.mode === 'waiting'", timeout=10000
                    )
                check(
                    "race opens countdown on both copies",
                    all(
                        page.evaluate("window.__rtcStart.mode") == "waiting"
                        for page in [host, guest]
                    ),
                )
                check(
                    "countdown uses shared deadline",
                    host.evaluate("window.__pitfallin.getNetwork().startAt")
                    == guest.evaluate("window.__pitfallin.getNetwork().startAt"),
                )
                for page in [host, guest]:
                    page.bring_to_front()
                    page.wait_for_function(
                        "window.__pitfallin.state.mode === 'playing'", timeout=10000
                    )
                    page.evaluate(
                        "window.__pitfallin.setDev({noclip:true,invincible:true,freezeTime:true})"
                    )
                check(
                    "both explorers enter gameplay",
                    all(
                        page.evaluate("window.__pitfallin.state.mode") == "playing"
                        for page in [host, guest]
                    ),
                )
                host.evaluate("window.__pitfallin.teleport(18,2)")
                guest.evaluate("window.__pitfallin.teleport(29,2.5)")
                host.wait_for_function(
                    "window.__rtcEvents.some(e => Math.abs(e.data.x - 29) < .01 && Math.abs(e.data.y - 2.5) < .01)",
                    timeout=10000,
                )
                guest.wait_for_function(
                    "window.__rtcEvents.some(e => Math.abs(e.data.x - 18) < .01 && Math.abs(e.data.y - 2) < .01)",
                    timeout=10000,
                )
                check("both copies receive exact ghost coordinates", True)
                check(
                    "ghost names appear in game HUD",
                    all(
                        page.locator(".ghost-tag").count() > 0 for page in [host, guest]
                    ),
                )
                guest.evaluate(
                    "() => {const game=window.__pitfallin.getGame();game.score=1750;game.complete(false,'An expedition for the record.');}"
                )
                host.wait_for_function(
                    "window.__rtcEvents.some(e => e.data.result === true && e.data.finished === true && e.data.score === 1750)",
                    timeout=10000,
                )
                guest.wait_for_function(
                    "window.__pitfallin.state.mode === 'results'", timeout=5000
                )
                check("completed expedition sends result to the other explorer", True)
                check(
                    "finished explorer keeps broadcasting its last coordinates",
                    host.evaluate(
                        "window.__rtcEvents.some(e => e.data.finished === true && Math.abs(e.data.x - 29) < .01 && Math.abs(e.data.y - 2.5) < .01)"
                    ),
                )
                snapshots["renderers"] = [
                    page.evaluate("window.__pitfallin.state.renderer")
                    for page in [host, guest]
                ]
                snapshots["host"] = host.evaluate("window.__pitfallin.state.network")
                snapshots["guest"] = guest.evaluate("window.__pitfallin.state.network")
                guest.evaluate("window.__pitfallin.getNetwork().leave()")
                host.wait_for_function(
                    "window.__pitfallin.state.network.players.length === 1",
                    timeout=5000,
                )
                check(
                    "leader removes departing peer",
                    host.evaluate("window.__pitfallin.state.network.players.length")
                    == 1,
                )
                check(
                    "departing peer returns to solo transport",
                    guest.evaluate(
                        "window.__pitfallin.state.network.mode === 'solo' && !window.__pitfallin.state.network.active"
                    ),
                )
                host.evaluate("window.__pitfallin.getNetwork().leave()")
                check("no JavaScript errors in paired play", len(page_errors) == 0)
                if page_errors:
                    failures.extend(f"JavaScript: {error}" for error in page_errors)
                context.close()
            except Exception as error:  # noqa: BLE001 - preserve diagnostics for every test failure
                checks += 1
                failures.append(f"WebRTC playthrough completed: {error}")
                snapshots["failure"] = {}
                for name, page in [("host", host), ("guest", guest)]:
                    try:
                        snapshots["failure"][name] = page.evaluate(
                            "({state:window.__pitfallin?.state,now:Date.now(),startAt:window.__pitfallin?.getNetwork().startAt,visibility:document.visibilityState,countdown:document.querySelector('#countdown')?.textContent})"
                        )
                    except Exception as diagnostic_error:  # noqa: BLE001 - diagnostics must not mask failure
                        snapshots["failure"][name] = str(diagnostic_error)
                snapshots["pageErrors"] = page_errors
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    (ROOT / "rtc-test-results.json").write_text(
        json.dumps(
            {"checks": checks, "failures": failures, "snapshots": snapshots}, indent=2
        ),
        encoding="utf-8",
    )
    for failure in failures:
        print(f"FAIL {failure}")
    print(
        f"{checks - len(failures)}/{checks} WebRTC checks passed"
        + (f"; {len(failures)} failed" if failures else "")
    )
    return not failures


if __name__ == "__main__":
    raise SystemExit(0 if run_checks() else 1)
