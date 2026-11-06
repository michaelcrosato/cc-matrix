#!/usr/bin/env python3
"""The AI Hub's own checks: the harness at 2, 3 and 4 players, on a bad network and when the host
leaves, then a solo check, and the pasted client byte for byte. Prints failures and a count."""
import json, pathlib, re, shutil, subprocess, sys, signal, time
from common import *

t = Count()
served = HERE / "_served"
shutil.rmtree(served, ignore_errors=True)
served.mkdir()
shutil.copy(PAGE, served / "game.html")
for f in ("harness.html", "bridge.js", "round.js", "session.js"):
    shutil.copy(DEV / "hub" / f, served / f)

client = (DEV / "hub" / "session.js").read_text(encoding="utf-8")
page_text = PAGE.read_text(encoding="utf-8")
t.check("the client is pasted byte for byte", f"<script>{client}</script>" in page_text, "differs from hub/session.js")
order = [page_text.find(x) for x in ['<meta charset="utf-8">', "AI Hub", 'name="hub:session"', 'id="about-data"', "__gameBoot"]]
t.check("head order: charset, client, tags, about, JS", all(a >= 0 for a in order) and order == sorted(order), str(order))

srv = subprocess.Popen([sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "--directory", str(served)],
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
def stop(*_):
    srv.terminate()
signal.signal(signal.SIGTERM, lambda *a: (stop(), sys.exit(1)))
try:
    line = srv.stdout.readline()
    port = int(re.search(r"port (\d+)", line).group(1))
    base = f"http://127.0.0.1:{port}"
    runs = [
        ("2 players", "players=2"),
        ("3 players, bad network", "players=3&latency=150&jitter=50&loss=5"),
        ("4 players, bad network", "players=4&latency=150&jitter=50&loss=5"),
        ("host leaves", "players=4&latency=150&jitter=50&loss=5&scenario=host-leave"),
    ]
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=FLAGS)
        for name, q in runs:
            c = b.new_context(viewport={"width": 960, "height": 540})
            p = c.new_page()
            p.goto(f"{base}/harness.html?game=game.html&{q}&auto=1")
            ok = wait(p, lambda: p.evaluate("document.body.dataset.complete") == "true", 220, 0.5)
            res = json.loads(p.evaluate("JSON.stringify(window.__hubCheck || null)")) or {}
            bad = [f"{c.get('name')}: {str(c.get('detail'))[:200]}" for c in res.get("checks", []) if not c.get("pass")]
            t.check(f"harness: {name}", ok and res.get("pass"), f"complete={ok} " + " || ".join(bad))
            c.close()
        # Solo, like the hub's check.
        errors = []
        c = b.new_context(viewport={"width": 320, "height": 180})
        p = c.new_page()
        p.on("pageerror", lambda e: errors.append(str(e)))
        p.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        p.goto(f"{base}/game.html")
        s = wait(p, lambda: status(p), 90)
        t.check("solo: it boots", s is not None, "no status")
        t.check("the served page is this game", "Whiff Fit" in p.title() and p.evaluate("!!window.__gameBoot"), p.title())
        p.keyboard.press("Enter")
        p.wait_for_timeout(500)
        p.keyboard.press("Space")
        p.wait_for_timeout(1500)
        t.check("solo: no session", p.evaluate("!window.AIHub || !AIHub.active"), "AIHub.active")
        native = p.evaluate("Math.random.toString().includes('native code')")
        a, bb = p.evaluate("[Math.random(), Math.random()]")
        t.check("solo: Math.random is the browser's own", native and a != bb, f"{native}")
        t.check("solo: no errors", not errors, str(errors[:3]))
        t.check("solo: drew a screen", p.evaluate("!!document.querySelector('canvas')"), "no canvas")
        c.close()
        b.close()
finally:
    stop()
    srv.wait(timeout=10)
    shutil.rmtree(served, ignore_errors=True)

print(f"{t.passed} passed, {t.failed} failed")
sys.exit(1 if t.failed else 0)
