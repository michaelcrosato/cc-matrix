#!/usr/bin/env python3
"""AI Hub harness checks, then a solo boot. One browser, one scenario at a time."""

import os
import shutil
import signal
import subprocess
import sys
from pathlib import Path

os.environ.setdefault("PLAYWRIGHT_HOST_PLATFORM_OVERRIDE", "ubuntu24.04-x64")

DEV = Path(__file__).resolve().parents[1]
WORK = DEV.parent
HTML_NAME = "Wobble Minutes-Wii Fit-grok-4.7-xhigh-20261104-222132.html"
HTML = WORK / HTML_NAME
SCRATCH = Path("/home/micha/dev/cc-matrix/runs/grok-xhigh.build-v2__20261104-222132__x35112d/tmp/grok-goal-b3947fd4d9d9/implementer")
SERVE = SCRATCH / "hub-serve"
FLAGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-vulkan=swiftshader",
    "--use-angle=swiftshader",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-dev-shm-usage",
]


def fail(msg):
    print(msg)
    return False


def byte_match():
    page = HTML.read_text(encoding="utf-8")
    start = page.index("/*! aihub-session")
    end = page.index("</script>", start)
    pasted = page[start:end].encode("utf-8")
    disk = (DEV / "hub" / "session.js").read_bytes()
    if pasted != disk:
        return fail(f"session.js mismatch page {len(pasted)} disk {len(disk)}")
    return True


def start_server():
    if SERVE.exists():
        shutil.rmtree(SERVE)
    SERVE.mkdir(parents=True)
    shutil.copy(HTML, SERVE / HTML_NAME)
    for name in ("harness.html", "bridge.js", "round.js", "session.js"):
        shutil.copy(DEV / "hub" / name, SERVE / name)
    proc = subprocess.Popen(
        ["python3", "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "--directory", str(SERVE)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    line = ""
    assert proc.stdout is not None
    for _ in range(50):
        line = proc.stdout.readline()
        if "port" in line:
            break
    if "port" not in line:
        proc.send_signal(signal.SIGTERM)
        return None, fail(f"server did not print a port: {line!r}")
    port = line.split("port", 1)[1].split()[0]
    return proc, port


def scenario(page, query):
    # Four software-WebGPU copies can stall the next navigation past the 30s default.
    page.set_default_navigation_timeout(120_000)
    url = f"http://127.0.0.1:{query[0]}/harness.html?{query[1]}"
    page.goto(url, wait_until="domcontentloaded", timeout=120_000)
    page.wait_for_function("() => document.body.dataset.complete === 'true'", timeout=180000)
    report = page.evaluate("() => window.__hubCheck")
    if not report or not report.get("pass"):
        checks = (report or {}).get("checks") or []
        bad = [c for c in checks if not c.get("pass")]
        return fail(f"{query[1]} failed: {bad[:4]}")
    return True


def solo(page):
    page.goto((SERVE / HTML_NAME).as_uri().replace("file://", f"http://127.0.0.1"), wait_until="domcontentloaded")
    return True


def main():
    SCRATCH.mkdir(parents=True, exist_ok=True)
    log_lines = []
    passed = 0
    failed = 0

    def check(ok, label):
        nonlocal passed, failed
        log_lines.append(f"{'ok' if ok else 'FAIL'} {label}")
        if ok:
            passed += 1
        else:
            failed += 1

    if not HTML.is_file():
        (SCRATCH / "hub-unverifiable.log").write_text(f"missing {HTML}\n", encoding="utf-8")
        print(f"missing {HTML}")
        return 1
    check(byte_match(), "session.js byte-match")
    server, port = start_server()
    if server is None:
        print(f"{passed} passed, {failed + 1} failed")
        return 1
    from playwright.sync_api import sync_playwright

    queries = [
        (port, "game=" + HTML_NAME.replace(" ", "%20") + "&players=2&auto=1"),
        (port, "game=" + HTML_NAME.replace(" ", "%20") + "&players=3&auto=1&latency=150&jitter=50&loss=5"),
        (port, "game=" + HTML_NAME.replace(" ", "%20") + "&players=4&auto=1&latency=150&jitter=50&loss=5"),
        (port, "game=" + HTML_NAME.replace(" ", "%20") + "&players=2&auto=1&scenario=host-leave"),
    ]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=FLAGS)
            context = browser.new_context(viewport={"width": 320, "height": 180}, device_scale_factor=1)
            for q in queries:
                page = context.new_page()
                try:
                    check(scenario(page, q), q[1])
                except Exception as e:
                    log_lines.append(f"FAIL {q[1]} {e}")
                    print(f"{q[1]}: {e}")
                    failed += 1
                finally:
                    try:
                        page.close()
                    except Exception as e:
                        print(f"close {q[1]}: {e}")
            context.close()
            solo_page = browser.new_context(viewport={"width": 320, "height": 180}, device_scale_factor=1).new_page()
            errors = []
            solo_page.on("pageerror", lambda e: errors.append(str(e)))
            solo_page.set_default_navigation_timeout(120_000)
            solo_page.goto(
                f"http://127.0.0.1:{port}/{HTML_NAME.replace(' ', '%20')}",
                wait_until="domcontentloaded",
                timeout=120_000,
            )
            solo_page.wait_for_function("() => window.__gameStatus", timeout=90000)
            solo_page.keyboard.press("Enter")
            solo_page.wait_for_timeout(200)
            solo_page.keyboard.press("Space")
            solo_page.wait_for_timeout(400)
            info = solo_page.evaluate(
                """() => ({
                  active: window.AIHub ? AIHub.active : null,
                  seeded: window.AIHub ? AIHub.seeded : null,
                  tick: Number(window.__gameStatus && window.__gameStatus.tick),
                })"""
            )
            ok = info.get("active") is False and info.get("seeded") is False and not errors and info.get("tick", 0) > 0
            if not ok:
                print(f"solo {info} errors {errors[:4]}")
            check(ok, "solo")
            browser.close()
    finally:
        server.send_signal(signal.SIGTERM)
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
    (SCRATCH / "tests-hub.log").write_text("\n".join(log_lines) + f"\n{passed} passed, {failed} failed\n", encoding="utf-8")
    print(f"{passed} passed, {failed} failed")
    return 0 if failed == 0 and passed else 1


if __name__ == "__main__":
    sys.exit(main())
