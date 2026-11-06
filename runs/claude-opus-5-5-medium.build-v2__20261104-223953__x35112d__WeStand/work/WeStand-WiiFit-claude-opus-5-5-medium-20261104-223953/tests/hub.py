#!/usr/bin/env python3
"""The AI Hub's automatic check, on a real build, served on a port the OS picks. Prints failures."""
import json, os, pathlib, shutil, signal, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
NAME = ROOT.name
PAGE = ROOT.parent / f"{NAME}.html"
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
results = []
def check(name, ok, detail=""):
    results.append(bool(ok))
    if not ok:
        print(f"FAIL {name} {detail}", flush=True)
serve = ROOT / "tests/.serve"
shutil.rmtree(serve, ignore_errors=True)
serve.mkdir(parents=True)
shutil.copy(PAGE, serve / "game.html")
for f in ["harness.html", "bridge.js", "round.js"]:
    shutil.copy(ROOT / "hub" / f, serve / f)
srv = subprocess.Popen([sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "--directory", str(serve)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
def stop(*_):
    srv.terminate()
signal.signal(signal.SIGTERM, lambda *_: (stop(), sys.exit(1)))
try:
    line = srv.stdout.readline()
    port = int(line.split("port ")[1].split(" ")[0])
    base = f"http://127.0.0.1:{port}"
    # The client must be byte for byte.
    html = PAGE.read_text()
    check("the client is pasted byte for byte", (ROOT / "hub/session.js").read_text() in html)
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        runs = [("2 players", "players=2"), ("3 players, bad network", "players=3&latency=150&jitter=50&loss=5"), ("4 players, bad network", "players=4&latency=150&jitter=50&loss=5"), ("host leaves", "players=2&scenario=host-leave")]
        for name, q in runs:
            ctx = b.new_context(viewport={"width": 640, "height": 360})
            page = ctx.new_page()
            page.goto(f"{base}/harness.html?game=game.html&{q}&auto=1")
            t0 = time.time()
            done = False
            ghosts = 0
            while time.time() - t0 < 240:
                if page.evaluate("document.body.dataset.complete === 'true'"):
                    done = True
                    break
                for fr in page.frames:
                    try:
                        ghosts = max(ghosts, fr.evaluate("window.__hub ? Object.keys(window.__hub.ghosts).length : 0"))
                    except Exception:
                        pass
                page.wait_for_timeout(500)
            check(f"{name}: other players' ghosts arrive", ghosts >= 1, ghosts)
            res = page.evaluate("window.__hubCheck || null")
            check(f"{name}: the harness completes", done, f"{time.time()-t0:.0f}s")
            check(f"{name}: the harness passes", res and res.get("pass"), json.dumps(res)[:600] if res else None)
            ctx.close()
        # The hub's solo check: outside a session.
        ctx = b.new_context(viewport={"width": 320, "height": 180})
        errors = []
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"{base}/game.html")
        t0 = time.time()
        while time.time() - t0 < 90 and not page.evaluate("!!window.__gameStatus"):
            page.wait_for_timeout(200)
        page.keyboard.press("Enter"); page.keyboard.press("Space")
        page.wait_for_timeout(1000)
        check("solo: a status appears", page.evaluate("!!window.__gameStatus"))
        check("solo: AIHub is not active", page.evaluate("!(window.AIHub && AIHub.active)"))
        check("solo: Math.random is the browser's", page.evaluate("Math.random.toString().includes('native code')"))
        check("solo: no errors", not errors, errors[:3])
        ctx.close()
        b.close()
finally:
    stop()
    srv.wait(timeout=5)
    shutil.rmtree(serve, ignore_errors=True)
print(f"{sum(results)} passed, {len(results) - sum(results)} failed")
sys.exit(0 if all(results) else 1)
