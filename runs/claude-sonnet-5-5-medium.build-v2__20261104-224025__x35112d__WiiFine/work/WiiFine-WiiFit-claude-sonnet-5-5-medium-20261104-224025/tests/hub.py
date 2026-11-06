#!/usr/bin/env python3
"""AI Hub tests: the hub's harness at 2 players, 3 and 4 with a bad network, host-leave, then a solo check.
Prints FAIL lines and `RESULT n passed, m failed`. usage: python3 tests/hub.py [path-to-game.html]"""
import sys, os, re, json, time, glob, shutil, subprocess, signal
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
cands = sys.argv[1:] or sorted(glob.glob(os.path.join(os.path.dirname(ROOT), "WiiFine-*.html")) + glob.glob(os.path.join(ROOT, "out", "test.html")))
GAME = os.path.abspath(cands[0]) if cands else None
FLAGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"]
passed = failed = 0

def check(name, ok, info=""):
    global passed, failed
    if ok: passed += 1
    else:
        failed += 1
        print(f"FAIL {name} {info}")

def main():
    if not GAME or not os.path.exists(GAME):
        print("FAIL no game page found"); print("RESULT 0 passed, 1 failed"); return
    work = os.path.join(ROOT, "out", "hubtest")
    shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
    shutil.copy(GAME, os.path.join(work, "game.html"))
    for f in ("harness.html", "bridge.js", "round.js"):
        shutil.copy(os.path.join(ROOT, "hub", f), os.path.join(work, f))
    # the pasted client must be the hub's, byte for byte
    page = open(GAME, encoding="utf-8").read()
    check("session.js is pasted unmodified", open(os.path.join(ROOT, "hub", "session.js"), encoding="utf-8").read() in page)
    srv = subprocess.Popen([sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "--directory", work], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        port = None
        t0 = time.time()
        while time.time() - t0 < 15:
            line = srv.stdout.readline()
            m = re.search(r"port (\d+)", line)
            if m: port = int(m.group(1)); break
        check("server started", port is not None)
        if port is None: return
        base = f"http://127.0.0.1:{port}"
        with sync_playwright() as pw:
            # make sure the server really serves our game
            b = pw.chromium.launch(headless=True, args=FLAGS)
            try:
                for name, q in [("2 players", "players=2"), ("4 players on a bad network", "players=4&latency=150&jitter=50&loss=5"),
                                ("3 players on a bad network", "players=3&latency=150&jitter=50&loss=5"), ("host leaves", "players=2&scenario=host-leave")]:
                    ctx = b.new_context(viewport={"width": 1000, "height": 700})
                    p = ctx.new_page(); errs = []
                    p.on("pageerror", lambda e: errs.append(str(e)))
                    p.goto(f"{base}/harness.html?game=game.html&{q}&auto=1")
                    ok = False
                    try:
                        p.wait_for_function("document.body.dataset.complete === 'true'", timeout=420000)
                        ok = True
                    except Exception as e:
                        pass
                    rep = p.evaluate("window.__hubCheck || null")
                    if rep:
                        bad = [c for c in rep.get("checks", []) if not c.get("pass")]
                        check(f"harness {name}", ok and rep.get("pass"), "; ".join(f"{c['name']}: {c.get('detail','')}" for c in bad)[:400])
                    else:
                        check(f"harness {name}", False, "no report")
                    ctx.close()
                # solo: outside a session
                ctx = b.new_context(viewport={"width": 320, "height": 180})
                p = ctx.new_page(); errs = []
                p.on("pageerror", lambda e: errs.append(str(e)))
                p.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
                p.goto(f"{base}/game.html")
                t0 = time.time(); st = {}
                while time.time() - t0 < 120:
                    try: st = json.loads(p.evaluate("window.__gameStatus || 'null'")) or {}
                    except Exception: st = {}
                    if st.get("screen"): break
                    time.sleep(0.3)
                p.keyboard.press("Enter"); time.sleep(0.4); p.keyboard.press("Space"); time.sleep(0.6)
                check("solo: runs and draws", bool(st.get("screen")), "no status")
                check("solo: AIHub is not active", p.evaluate("!(window.AIHub && window.AIHub.active)"))
                r1 = p.evaluate("[Math.random(), Math.random()]")
                check("solo: Math.random is the browser's own", r1[0] != r1[1])
                p2 = ctx.new_page(); p2.goto(f"{base}/game.html"); time.sleep(1.0)
                r2 = p2.evaluate("Math.random()")
                check("solo: Math.random is not seeded", r2 != r1[0])
                check("solo: no errors", not errs, "; ".join(errs[:2]))
                ctx.close()
            finally:
                b.close()
    finally:
        srv.terminate()
        try: srv.wait(timeout=5)
        except Exception: pass
    print(f"RESULT {passed} passed, {failed} failed")

main()
