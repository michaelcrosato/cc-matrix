#!/usr/bin/env python3
"""The AI Hub harness's own check, per query, then a two-copy test and a look outside a session."""
import json, os, pathlib, re, shutil, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import *
from playwright.sync_api import sync_playwright

HUB = ROOT / "tests" / "hub"
# Software rendering takes seconds a frame on this machine: the harness runs a copy that draws only UI.
page_text = pathlib.Path(GAME).read_text(encoding="utf-8")
lite = "" if FULL else "<script>window.__lite = true;</script>\n"
(HUB / "game.html").write_text(page_text.replace("</head>", lite + "</head>", 1), encoding="utf-8")
srv = subprocess.Popen([sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "-d", str(HUB)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
line = srv.stdout.readline()
port = int(re.search(r"port (\d+)", line).group(1))
base = f"http://127.0.0.1:{port}"
R = Results()

def harness(b, q, timeout=1200 if FULL else 240):
    ctx = b.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()
    page.goto(f"{base}/harness.html?game=game.html&{q}&limit=20")
    page.wait_for_function("document.body.dataset.complete === 'true'", timeout=timeout * 1000)
    res = page.evaluate("JSON.stringify(window.__hubCheck)")
    chk = json.loads(res)
    ctx.close()
    assert chk.get("pass") is True, res[:1400]

def two_copies(b):
    # Bring the harness up by hand for two players, and read each frame's status.
    ctx = b.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()
    # The harness's automatic round, held open long enough to look inside it.
    page.goto(f"{base}/harness.html?game=game.html&players=2&auto=1&play=300000&limit=400")
    def statuses():
        out = []
        for fr in page.frames:
            if fr != page.main_frame and "game.html" in fr.url:
                t = fr.evaluate("window.__game ? __game.status() : ''")
                out.append((fr, json.loads(t) if t else {}))
        return out
    end = time.time() + (600 if FULL else 180)
    while time.time() < end:
        st = statuses()
        if len(st) == 2 and all(s.get("hub", {}).get("playing") for _, s in st):
            break
        page.wait_for_timeout(300)
    st = statuses()
    assert len(st) == 2 and all(s["hub"]["playing"] for _, s in st), (len(page.frames), [f.url[:60] for f in page.frames], json.dumps([s.get("hub") for _, s in st]))
    host = next(x for x in st if x[1]["hub"]["host"])
    # Nobody is treating this patient; keep him alive long enough to look around.
    host[0].evaluate("__game.do(JSON.stringify({immortal: true}))")
    client = next(x for x in st if not x[1]["hub"]["host"])
    # A client's input moves its cursor on the host.
    me = client[1]["hub"]["me"]
    before = host[1]["sim"]["cursors"][me][1:]
    end2 = time.time() + (300 if FULL else 60)
    moved = False
    # The harness gives the client's frame the keyboard when it's clicked; hold a key there.
    client[0].frame_element().click()
    page.keyboard.down("d")
    while time.time() < end2 and not moved:
        h = dict(statuses())
        for fr, s in statuses():
            if s["hub"]["host"]:
                now = s["sim"]["cursors"][me][1:]
                moved = abs(now[0] - before[0]) + abs(now[1] - before[1]) > 0.3
        page.wait_for_timeout(500)
    page.keyboard.up("d")
    assert moved, "client input didn't reach the host"
    # Both see the same vitals.
    st = statuses()
    a, b2 = st[0][1]["sim"]["vitals"], st[1][1]["sim"]["vitals"]
    assert abs(a - b2) < 8, (a, b2)
    assert st[0][1]["hub"]["snapshot"] < 6000 or st[1][1]["hub"]["snapshot"] < 6000
    ctx.close()

def outside_session(b):
    p = Page(b, url=f"{base}/game.html")
    st = p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 3, what="title outside a session")
    assert st["hub"]["active"] is False
    p.close()

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=ARGS)
        for name, q in [] if FULL else [
            ("hub: 4 players over a bad network", "players=4&latency=150&jitter=50&loss=5&auto=1"),
            ("hub: the host leaves", "players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave"),
            ("hub: a server with no player", "players=2&scenario=server&auto=1"),
            ("hub: one player", "players=1&auto=1"),
        ]:
            R.run(name, lambda: harness(browser, q))
        R.run("hub: two copies, input and vitals", lambda: two_copies(browser))
        R.run("hub: outside a session, unaffected", lambda: outside_session(browser))
        browser.close()
finally:
    srv.terminate()
