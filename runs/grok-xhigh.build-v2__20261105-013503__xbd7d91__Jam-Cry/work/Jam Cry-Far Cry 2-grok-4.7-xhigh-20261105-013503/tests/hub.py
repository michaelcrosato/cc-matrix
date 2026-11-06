#!/usr/bin/env python3
"""Serve the packed page and run the four hub harness cases. Stop only this server."""
import os
import re
import select
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent.parent
WORK = DEV.parent
NAME = "Jam Cry-Far Cry 2-grok-4.7-xhigh-20261105-013503.html"
HTML = WORK / NAME
CASES = [
    "players=2&auto=1",
    "players=4&latency=150&jitter=50&loss=5&auto=1",
    "players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1",
    "players=2&scenario=server&auto=1",
]
FAILS = []
CHECKS = 0


def check(ok, detail):
    global CHECKS
    CHECKS += 1
    if not ok:
        FAILS.append(detail)
        print(f"FAIL: {detail}", flush=True)


def main():
    if not HTML.is_file():
        print("FAIL: packed html missing")
        print("CHECKS 1")
        return 1
    proc = subprocess.Popen(
        ["python3", "-m", "http.server", "0", "--bind", "127.0.0.1"],
        cwd=str(WORK),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    try:
        line = ""
        deadline = time.time() + 10
        while time.time() < deadline:
            ready, _, _ = select.select([proc.stdout], [], [], 0.5)
            if not ready:
                continue
            line = proc.stdout.readline()
            if "Serving HTTP" in line:
                break
        found = re.search(r"port (\d+)", line)
        port = found.group(1) if found else ""
        if not port.isdigit():
            print(f"FAIL: server did not say its port ({line!r})")
            print("CHECKS 1")
            return 1
        url = f"http://127.0.0.1:{port}/{urllib.parse.quote(NAME)}"
        with urllib.request.urlopen(url, timeout=10) as res:
            body = res.read().decode("utf-8", "replace")
        check("<title>Jam Cry</title>" in body, "fetched title is not Jam Cry")
        game = urllib.parse.quote("../../" + NAME)
        harness = f"http://127.0.0.1:{port}/{urllib.parse.quote(DEV.name)}/hub/harness.html"
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                for case in CASES:
                    print(f"CASE {case}", flush=True)
                    page = browser.new_page()
                    page.goto(f"{harness}?game={game}&{case}", wait_until="domcontentloaded")
                    page.wait_for_function("() => window.__hubCheck && window.__hubCheck.done", timeout=90000)
                    report = page.evaluate("() => window.__hubCheck")
                    bad = [c for c in report.get("checks", []) if not c.get("pass")]
                    detail = "; ".join(f"{c.get('name')}: {c.get('detail')}" for c in bad) or report.get("log", "")
                    check(bool(report.get("pass")), f"{case} {detail[:500]}")
                    page.close()
            finally:
                browser.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)
    print(f"CHECKS {CHECKS}")
    return 1 if FAILS else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"FAIL: {type(e).__name__}: {e}")
        print(f"CHECKS {CHECKS + 1}")
        sys.exit(1)
