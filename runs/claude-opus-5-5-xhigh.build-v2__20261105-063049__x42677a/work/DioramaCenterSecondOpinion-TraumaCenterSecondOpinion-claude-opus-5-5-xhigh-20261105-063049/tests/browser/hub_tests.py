"""The AI Hub harness, next to the built game, on a port the OS picks. Prints only failures."""
import json
import pathlib
import shutil
import subprocess
import sys
import time

from common import ARGS, CRASHED, GAME, ROOT, sync_playwright, wait_for_memory

HUB = ROOT / "hub"
QUERIES = [
    "players=4&latency=150&jitter=50&loss=5&auto=1&limit=20",
    "players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1&limit=20",
    "players=2&scenario=server&auto=1&limit=20",
    "players=1&auto=1&limit=20",
]


def serve():
    proc = subprocess.Popen([sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "-d", str(HUB)], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    line = proc.stdout.readline()
    port = int(line.split("port ")[1].split(" ")[0])
    return proc, port


def copies(b, base, players):
    """A real round: a real mouse over each client's frame, read from every copy's own state."""
    wait_for_memory(3.0 if players == 2 else 4.0)
    ctx = b.new_context(viewport={"width": 1100, "height": 700})
    page = ctx.new_page()
    page.goto(f"{base}/harness.html?game=game.html&players={players}&auto=1&limit=150&play=120000")
    deadline = time.time() + (400 if players == 2 else 560)
    moved, first, seen = set(), None, []
    same = drawn = seated = False
    host, clients, turn, spread = None, [], 0, None
    want = set(range(1, players))
    while time.time() < deadline and not (moved == want and same and drawn and seated):
        frames = [f for f in page.frames if "/game.html" in f.url]
        st = []
        for f in frames:
            try:
                st.append(f.evaluate("window.__game ? window.__game.status() : null"))
            except Exception:
                st.append(None)
        seen = [(s and s["screen"], s and s["scene"], s and s["stage"]) for s in st]
        pairs = [(f, s) for f, s in zip(frames, st) if s]
        host = next((x for x in pairs if "codeblue" in x[1]["scene"]), None)
        clients = [x for x in pairs if "mirror" in x[1]["scene"]]
        if host and len(clients) == players - 1 and host[1]["stage"] == "Op" and all(c[1]["stage"] == "Op" for c in clients):
            turn += 1
            target = clients[turn % len(clients)]
            box = target[0].frame_element().bounding_box()
            tick = time.time() % 10
            page.mouse.move(box["x"] + box["width"] * (0.3 + tick * 0.03), box["y"] + box["height"] * 0.45)
            cur = host[1]["sim"]["cursors"]
            first = first or cur
            for slot in want:
                if abs(cur[slot][0] - first[slot][0]) + abs(cur[slot][1] - first[slot][1]) > 0.01:
                    moved.add(slot)
            spread = max(abs(host[1]["vitals"] - c[1]["vitals"]) for c in clients)
            same = spread < 8.0
            drawn = all(s["frames"] > 0 for _, s in pairs)
            seated = sum(1 for x in host[1]["sim"]["present"] if x) == players
        if page.evaluate("document.body.dataset.complete === 'true'"):
            break
        time.sleep(0.4)
    assert host and len(clients) == players - 1, f"never reached play: {seen}"
    assert moved == want, f"hands reached the host from slots {sorted(moved)} of {sorted(want)}: {host[1]['sim']['cursors']}"
    assert same, f"vitals apart by {spread}"
    assert drawn, "a copy never drew a frame"
    assert seated, f"seats on the host: {host[1]['sim']['present']}"
    ctx.close()


def main():
    passed = failed = 0
    shutil.copy(GAME, HUB / "game.html")
    proc, port = serve()
    base = f"http://127.0.0.1:{port}"
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=ARGS)
            for q in ([] if "two" in sys.argv else QUERIES):
                for attempt in range(3):
                    wait_for_memory(4.0)
                    try:
                        ctx = b.new_context(viewport={"width": 1100, "height": 700})
                        page = ctx.new_page()
                        page.goto(f"{base}/harness.html?game=game.html&{q}")
                        page.wait_for_function("document.body.dataset.complete === 'true'", timeout=480000)
                        check = page.evaluate("window.__hubCheck")
                        if check and check.get("pass"):
                            passed += 1
                        else:
                            failed += 1
                            bad = [c for c in (check or {}).get("checks", []) if not c.get("ok", c.get("pass", True))]
                            print(f"FAIL harness {q}: {json.dumps(bad or check)[:1500]}")
                        ctx.close()
                        break
                    except Exception as e:
                        if any(c in str(e) for c in CRASHED) and attempt < 2:
                            try:
                                b.close()
                            except Exception:
                                pass
                            time.sleep(20)
                            b = p.chromium.launch(args=ARGS)
                            continue
                        failed += 1
                        try:
                            check = page.evaluate("window.__hubCheck || null")
                        except Exception:
                            check = None
                        print(f"FAIL harness {q}: {e} {json.dumps(check)[:1500]}")
                        break
            # Two copies, then four: every client's input moves its cursor on the host, and all of
            # them see the same vitals, each drawing frames of its own.
            for players in (2, 4):
                try:
                    copies(b, base, players)
                    passed += 1
                except Exception as e:
                    failed += 1
                    print(f"FAIL {players} copies: {e}")
            # Outside a session: the title appears, the game is unaffected.
            try:
                ctx = b.new_context(viewport={"width": 960, "height": 540})
                page = ctx.new_page()
                page.goto(f"{base}/game.html")
                page.wait_for_function("window.__game && window.__game.status() && window.__game.status().screen === 'Title'", timeout=150000)
                assert page.evaluate("window.__game.status().hub") is False
                passed += 1
                ctx.close()
            except Exception as e:
                failed += 1
                print(f"FAIL outside a session: {e}")
            b.close()
    finally:
        proc.terminate()
        proc.wait(timeout=5)
    return passed, failed


if __name__ == "__main__":
    print("%d passed, %d failed" % main())
