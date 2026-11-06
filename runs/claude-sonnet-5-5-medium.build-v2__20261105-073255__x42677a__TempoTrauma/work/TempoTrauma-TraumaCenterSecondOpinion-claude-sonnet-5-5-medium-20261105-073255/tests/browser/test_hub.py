"""AI Hub harness checks on the built game (served from 127.0.0.1 on a port the OS picks), then the
game outside a session. Prints failures and a count."""
import json, re, shutil, subprocess, sys
from playwright.sync_api import sync_playwright
from common import ARGS, GAME, ROOT

HUB = ROOT / "tests" / "hub"
RESULTS = []


def serve():
    shutil.copy(GAME, HUB / "game.html")
    proc = subprocess.Popen([sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "-d", str(HUB)], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    line = proc.stdout.readline()
    port = int(re.search(r"port (\d+)", line).group(1))
    return proc, port


def run_harness(p, port, query, timeout=300):
    b = p.chromium.launch(args=ARGS, headless=True)
    page = b.new_page(viewport={"width": 1280, "height": 800})
    page.goto(f"http://127.0.0.1:{port}/harness.html?game=game.html&{query}")
    page.wait_for_function("document.body.dataset.complete === 'true'", timeout=timeout * 1000)
    res = page.evaluate("JSON.stringify(window.__hubCheck)")
    b.close()
    return json.loads(res)


def main():
    proc, port = serve()
    try:
        with sync_playwright() as p:
            # The page served is our game: check before trusting a result.
            b = p.chromium.launch(args=ARGS, headless=True)
            page = b.new_page()
            page.goto(f"http://127.0.0.1:{port}/game.html")
            page.wait_for_function("window.__game && window.__game.status() !== ''", timeout=120000)
            st = json.loads(page.evaluate("__game.status()"))
            title = page.title()
            b.close()
            if title != "Tempo Trauma" or st["shell"]["screen"] != "title":
                RESULTS.append(("outside a session: title appears", f"title {title!r} screen {st['shell']['screen']!r}"))
            else:
                RESULTS.append(("outside a session: title appears", None))
            for q in (
                "players=4&latency=150&jitter=50&loss=5&auto=1&limit=20",
                "players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave&limit=20",
                "players=2&scenario=server&auto=1&limit=20",
                "players=1&auto=1&limit=20",
            ):
                try:
                    r = run_harness(p, port, q)
                    RESULTS.append((q, None if r.get("pass") else json.dumps(r)[:1500]))
                except Exception as e:  # noqa: BLE001
                    RESULTS.append((q, str(e)[:500]))
    finally:
        proc.terminate()
    ok, why = two_copies()
    RESULTS.append(("two copies: input crosses, vitals agree", None if ok else why))
    failed = [(n, e) for n, e in RESULTS if e]
    for n, e in failed:
        print("FAIL", n, e)
    print(f"{len(RESULTS) - len(failed)} passed, {len(failed)} failed")
    return len(failed)


def two_copies():
    """Two copies in the harness: both reach Code Blue, the client's frames arrive, the host sees the
    client's seat, and both show about the same vitals."""
    proc, port = serve()
    ok, why = False, ""
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=ARGS, headless=True)
            page = b.new_page(viewport={"width": 1280, "height": 800})
            page.goto(f"http://127.0.0.1:{port}/harness.html?game=game.html&players=2&auto=1&limit=90")
            import time
            t0 = time.time()
            while time.time() - t0 < 240:
                st = []
                for fr in page.frames:
                    try:
                        s = fr.evaluate("window.__game ? __game.status() : ''")
                        if s:
                            st.append(json.loads(s))
                    except Exception:
                        pass
                playing = [s for s in st if s["hub"]["phase"] == "Play"]
                if len(playing) >= 2:
                    host = [s for s in playing if s["hub"]["host"]]
                    cli = [s for s in playing if not s["hub"]["host"]]
                    if host and cli and cli[0]["hub"]["seen"] > 0 and host[0]["hub"]["remote_active"][1 - host[0]["hub"]["me"] if host[0]["hub"]["me"] in (0, 1) else 1]:
                        hv, cv = host[0]["sim"]["vitals"], cli[0]["hub"]["mirror_vitals"]
                        ok = host[0]["sim"]["case"] == 8 and cli[0]["hub"]["mirror_case"] == 8 and abs(hv - cv) < 25
                        why = f"host vitals {hv}, client sees {cv}, case {host[0]['sim']['case']}/{cli[0]['hub']['mirror_case']}"
                        break
                time.sleep(1.0)
            else:
                why = "never reached play with both copies talking"
            b.close()
    finally:
        proc.terminate()
    return ok, why


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
