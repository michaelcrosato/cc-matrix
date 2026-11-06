"""Integrated AI Hub conformance/lifecycle checks against the final game HTML."""
import functools
import http.server
import json
import pathlib
import threading
import urllib.parse

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


LIFECYCLE = """(() => {
  window.__lifecycle = { errors: [], beforeStart: true, afterEnd: true, endTime: null };
  setInterval(() => {
    const j = window.__JUNGLE;
    if (!j || !j.online.hubActive) return;
    const tracker = window.__lifecycle;
    if (!j.online.running && !j.online.ended && j.game.elapsed > 0) tracker.beforeStart = false;
    if (j.online.ended) {
      if (tracker.endTime === null) tracker.endTime = j.game.elapsed;
      else if (Math.abs(tracker.endTime - j.game.elapsed) > 1e-8) tracker.afterEnd = false;
    }
  }, 100);
})();"""


def main():
    directory = pathlib.Path(__file__).resolve().parent
    filename = directory.name + ".html"
    root = directory.parent
    failures = []
    reports = []
    passed = 0
    handler = functools.partial(QuietHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    scenarios = [
        ("standard", {}),
        ("server", {"scenario": "server"}),
        ("host-leave", {"scenario": "host-leave"}),
        ("natural-finish", {"latency": "150", "jitter": "50", "loss": "5", "play": "12000"}),
    ]
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=[
                "--enable-unsafe-webgpu", "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader", "--use-angle=swiftshader", "--disable-dev-shm-usage",
                "--autoplay-policy=no-user-gesture-required",
            ])
            for name, parameters in scenarios:
                context = browser.new_context(viewport={"width": 1280, "height": 800})
                context.add_init_script(LIFECYCLE)
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                params = {"game": "../" + filename, "players": "2", "auto": "1", "limit": "20", "play": "4000", **parameters}
                url = origin + "/" + directory.name + "/hub-harness.html?" + urllib.parse.urlencode(params)
                try:
                    page.goto(url, wait_until="domcontentloaded")
                    assert page.title().startswith("AI Hub"), "wrong page served"
                    page.wait_for_function("document.querySelectorAll('iframe').length >= 2", timeout=10000)
                    if name == "natural-finish":
                        page.wait_for_function("Array.from(document.querySelectorAll('iframe')).every(f => f.contentWindow.__JUNGLE?.online.running)", timeout=60000)
                        # Let both network directions flow before completing the real bell/rescue actions.
                        page.wait_for_timeout(1800)
                        result = page.evaluate("""() => {
                          const frame = Array.from(document.querySelectorAll('iframe')).find(f => f.contentWindow.__JUNGLE.online.isHost);
                          const j = frame.contentWindow.__JUNGLE;
                          j.goStage(3); j.game.god = true;
                          const player = j.game.players[0];
                          for (const x of [37, 66, 94]) {
                            j.game.teleport(player, x, 0);
                            j.game.step(1/60, [{ action: true }, {}]);
                            j.game.step(1/60, [{}, {}]);
                          }
                          return { mode: j.game.mode, bells: j.game.bells, score: j.game.score };
                        }""")
                        assert result["mode"] == "won" and all(result["bells"]) and result["score"] >= 2000, f"rescue did not finish: {result}"
                        passed += 1
                    page.wait_for_function("document.body.dataset.complete === 'true'", timeout=60000)
                    report = page.evaluate("window.__hubCheck")
                    reports.append({"scenario": name, "report": report})
                    for check in report["checks"]:
                        if check["pass"]:
                            passed += 1
                        else:
                            failures.append(f"{name}: {check['name']}: {check.get('detail', '')}")
                    if not report["pass"] and not any(not check["pass"] for check in report["checks"]):
                        failures.append(f"{name}: harness did not pass")
                    page.wait_for_timeout(450)
                    for frame in page.frames[1:]:
                        lifecycle = frame.evaluate("({ lifecycle: window.__lifecycle, ready: !!window.__JUNGLE?.ready, ended: window.__JUNGLE?.online.ended, paused: window.__JUNGLE?.audio.diagnostics().paused, index: window.__JUNGLE?.online.playerIndex, server: window.__JUNGLE?.online.server })")
                        if not lifecycle["ready"]:
                            continue  # The removed host frame navigates to about:blank.
                        assert lifecycle["lifecycle"]["beforeStart"], "simulation ran before synchronized start"
                        passed += 1
                        assert lifecycle["ended"] and lifecycle["lifecycle"]["afterEnd"], "simulation ran after hub end"
                        passed += 1
                        assert lifecycle["paused"], "audio not paused after hub end"
                        passed += 1
                        if lifecycle["server"]:
                            assert lifecycle["index"] == -1, "dedicated host has a player index"
                            passed += 1
                    assert not errors, "page errors: " + "; ".join(errors)
                    passed += 1
                except Exception as error:
                    failures.append(f"{name}: {error}")
                    try:
                        reports.append({"scenario": name, "partial": page.evaluate("window.__hubCheck || null"), "errors": errors})
                    except Exception:
                        pass
                finally:
                    context.close()
            browser.close()
    except Exception as error:
        failures.append(str(error))
    finally:
        server.shutdown()
        server.server_close()
    (directory / "hub-test-results.json").write_text(json.dumps({"passed": passed, "failures": failures, "reports": reports}, indent=2))
    for failure in failures:
        print("FAIL AI Hub: " + failure)
    print(f"AI Hub: {passed} passed, {len(failures)} failed")
    raise SystemExit(bool(failures))


if __name__ == "__main__":
    main()
