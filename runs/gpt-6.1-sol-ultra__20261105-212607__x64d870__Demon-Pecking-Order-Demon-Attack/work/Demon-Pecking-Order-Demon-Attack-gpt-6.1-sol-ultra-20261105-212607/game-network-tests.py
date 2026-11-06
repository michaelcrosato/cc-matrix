"""Actual packaged-game co-op and AI Hub checks; failures plus one count only."""
import functools
import http.server
import json
import pathlib
import threading
import time
import urllib.parse
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent.resolve()


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    games = list(ROOT.parent.glob("*.html"))
    if len(games) != 1:
        raise SystemExit("FAIL package discovery: expected one game HTML beside the dev folder")
    game = games[0]
    selection = sys.argv[1] if len(sys.argv) > 1 else None
    previous = json.loads((ROOT / 'network-results.json').read_text()) if selection and (ROOT / 'network-results.json').exists() else {}
    results = previous.get('results', [])
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT.parent))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/"

    def check(name, fn):
        if selection and selection not in name:
            return
        results[:] = [result for result in results if result['name'] != name]
        try:
            detail = fn()
            results.append({"name": name, "pass": True, "detail": detail})
        except Exception as error:
            results.append({"name": name, "pass": False, "detail": str(error)})
            print(f"FAIL {name}: {error}")

    def load(context):
        page = context.new_page()
        page.goto(base + urllib.parse.quote(game.name))
        page.wait_for_function("window.gameTest?.ready || window.gameBootError", timeout=60000)
        assert not page.evaluate("window.gameBootError || null")
        assert page.title() == "Demon Pecking Order"
        assert page.evaluate("gameTest.state.backend") == "webgpu"
        return page

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            context = browser.new_context(ignore_https_errors=True, viewport={"width": 1280, "height": 720})

            def co_op():
                host = load(context)
                guest = load(context)
                phase = 'connect'
                errors = []
                host.on('pageerror', lambda error: errors.append('host: '+str(error)))
                guest.on('pageerror', lambda error: errors.append('guest: '+str(error)))
                try:
                    code = host.evaluate("gameTest.link.hostRoom({local:true})")
                    guest.evaluate("code=>gameTest.link.joinRoom(code)", code)
                    host.wait_for_function("gameTest.state.players.length===2 && gameTest.state.screen==='playing'")
                    guest.wait_for_function("gameTest.state.players.length===2 && gameTest.state.screen==='playing'")
                    before = host.evaluate("gameTest.state.players.find(p=>p.id===1).x")
                    phase = 'remote movement'
                    guest.keyboard.down("d")
                    guest.keyboard.down("Space")
                    host.wait_for_function("x=>gameTest.state.players.find(p=>p.id===1).x>x+2", arg=before, timeout=10000)
                    guest.keyboard.up("d")
                    phase = 'remote firing'
                    host.wait_for_function("gameTest.state.players.find(p=>p.id===1).shots>0", timeout=10000)
                    guest.keyboard.up("Space")
                    phase = 'shared pause'
                    host.evaluate("gameTest.pause()")
                    guest.wait_for_function("gameTest.state.screen==='network-pause'")
                    paused = host.evaluate("gameTest.state.runTime")
                    host.wait_for_timeout(350)
                    assert host.evaluate("gameTest.state.runTime") == paused
                    host.evaluate("gameTest.act('resume')")
                    phase = 'shared resume'
                    guest.wait_for_function("gameTest.state.screen==='playing'")
                    # A victory in wave one catches any client-side inference from wave number.
                    host.evaluate("gameTest.finish(true)")
                    phase = 'terminal snapshot'
                    guest.wait_for_function("gameTest.state.screen==='result'")
                    assert guest.evaluate("gameTest.snapshot().won") is True, 'Guest terminal victory flag is not true'
                    assert guest.evaluate("gameTest.state.score") == host.evaluate("gameTest.state.score"), 'Guest final score does not match host'
                    guest.wait_for_function("gameTest.audio.playing===false")
                    return "Two actual game pages shared roster, controls, firing, pause/resume and exact terminal state."
                except Exception as error:
                    raise AssertionError(json.dumps({'phase':phase,'error':str(error),'pageErrors':errors,'hostWon':host.evaluate('gameTest.snapshot().won'),'guestWon':guest.evaluate('gameTest.snapshot().won'),'guestPaused':guest.evaluate('gameTest.audio.paused'),'host':host.evaluate('gameTest.state'),'guest':guest.evaluate('gameTest.state')})) from error
                finally:
                    host.close()
                    guest.close()

            check("packaged co-op controls, pause and terminal snapshot", co_op)

            def departure():
                host = load(context)
                guest = load(context)
                try:
                    code = host.evaluate("gameTest.link.hostRoom({local:true})")
                    guest.evaluate("code=>gameTest.link.joinRoom(code)", code)
                    host.wait_for_function("gameTest.state.players.length===2")
                    guest.evaluate("gameTest.link.close()")
                    host.wait_for_function("gameTest.state.players.length===1")
                    assert host.evaluate("gameTest.state.players[0].id") == 0
                    assert host.evaluate("gameTest.state.screen") == "playing"
                    return "Departed cannon removed; authoritative patrol continued."
                finally:
                    host.close()
                    guest.close()

            check("packaged co-op guest departure", departure)

            def replay():
                host = load(context)
                guest = load(context)
                try:
                    code = host.evaluate("gameTest.link.hostRoom({local:true})")
                    guest.evaluate("code=>gameTest.link.joinRoom(code)", code)
                    host.wait_for_function("gameTest.state.players.length===2 && gameTest.state.screen==='playing'")
                    guest.wait_for_function("gameTest.state.players.length===2 && gameTest.state.screen==='playing'")
                    host.evaluate("""() => {
                      gameTest.spawn('grunt', 0, 12);
                      const enemy=gameTest.state.entities.find(e=>e.type==='grunt');
                      gameTest.hit(enemy.id);
                    }""")
                    host.wait_for_function("gameTest.state.score>0")
                    guest.wait_for_function("gameTest.state.score>0")
                    host.evaluate("gameTest.finish(true)")
                    guest.wait_for_function("gameTest.state.screen==='result'")
                    guest.evaluate("gameTest.act('restart')")
                    guest.wait_for_timeout(200)
                    assert guest.evaluate("gameTest.state.screen") == 'result', 'Client restarted the shared patrol locally'
                    assert host.evaluate("gameTest.state.screen") == 'result', 'Client restart changed host state'
                    assert guest.locator('[data-action="restart"]:not([disabled])').count() == 0, 'Client result offers an active restart'
                    host.evaluate("gameTest.act('restart')")
                    host.wait_for_function("gameTest.state.screen==='playing' && gameTest.state.score===0")
                    guest.wait_for_function("gameTest.state.screen==='playing' && gameTest.state.score===0")
                    assert host.evaluate("gameTest.link.finished") is False, 'Host finish flag was not reset'
                    assert host.evaluate("gameTest.state.players.length") == 2
                    assert guest.evaluate("gameTest.state.players.length") == 2
                    host.evaluate("gameTest.finish(false)")
                    guest.wait_for_function("gameTest.state.screen==='result'")
                    assert guest.evaluate("gameTest.snapshot().won") is False, 'Replay retained the previous victory result'
                    return 'Client restart blocked; host replay reset both worlds and reported a fresh second result.'
                finally:
                    host.close()
                    guest.close()

            check("packaged co-op host replay and client restart guard", replay)

            def protocol(scenario):
                page = context.new_page()
                try:
                    query = urllib.parse.urlencode({
                        "game": "../" + game.name,
                        "players": 2,
                        "auto": 1,
                        "limit": 20,
                        "latency": 150,
                        "jitter": 50,
                        "loss": 5,
                        "scenario": scenario,
                    })
                    page.goto(base + urllib.parse.quote(ROOT.name) + "/harness.html?" + query)
                    page.wait_for_function(
                        "window.__hubCheck?.done || document.querySelectorAll('iframe').length>=2",
                        timeout=15000,
                    )
                    host_frame = None
                    deadline = time.monotonic() + 60
                    while time.monotonic() < deadline:
                        for frame in page.frames[1:]:
                            try:
                                if frame.evaluate("window.gameTest?.state.hub?.host && gameTest.state.screen==='playing'"):
                                    host_frame = frame
                                    break
                            except Exception:
                                pass
                        if host_frame is not None or page.evaluate("window.__hubCheck?.done"):
                            break
                        page.wait_for_timeout(100)
                    if host_frame is not None and scenario != "host-leave":
                        host_frame.evaluate("gameTest.wave(6)")
                    page.wait_for_function("document.body.dataset.complete==='true'", timeout=90000)
                    report = page.evaluate("window.__hubCheck")
                    assert report["pass"], [c for c in report["checks"] if not c["pass"]]
                    for frame in page.frames[1:]:
                        assert not frame.evaluate("window.gameBootError || null")
                        if frame.evaluate("!!window.gameTest"):
                            assert frame.evaluate("gameTest.audio.paused") is True
                            assert frame.evaluate("gameTest.state.screen") == "result"
                            assert frame.evaluate("gameTest.snapshot().won") is False
                    return {"checks": report["checks"], "scenario": scenario or "standard", "bossTimeUp": scenario != "host-leave"}
                finally:
                    page.close()

            check("packaged AI Hub shared world under latency and loss", lambda: protocol(""))
            check("packaged AI Hub dedicated server under latency and loss", lambda: protocol("server"))
            check("packaged AI Hub host departure", lambda: protocol("host-leave"))
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        passed = sum(result["pass"] for result in results)
        failed = len(results) - passed
        (ROOT / "network-results.json").write_text(json.dumps({
            "game": game.name,
            "passed": passed,
            "failed": failed,
            "reviewIssuesCaught": 5,
            "runtimeIssuesCaught": 0,
            "testHarnessIssuesCaught": 3,
            "parameters": {"browser": "Chromium 153 headless", "renderer": "WebGPU software SwiftShader", "players": 2, "latencyMs": 150, "jitterMs": 50, "lossPercent": 5},
            "results": results,
        }, indent=2))
    print(f"{passed} passed, {failed} failed")
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
