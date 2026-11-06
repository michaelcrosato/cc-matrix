"""Actual AI Hub conformance checks; starts and closes only its own server/browser.
Run with /home/micha/.local/share/pipx/venvs/playwright/bin/python hub-tests.py
"""
import argparse
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SCENARIOS = [
    ("two-player", {"players": 2}),
    ("four-player-loss", {"players": 4, "latency": 150, "jitter": 50, "loss": 5}),
    ("host-leave", {"players": 4, "latency": 150, "jitter": 50, "loss": 5, "scenario": "host-leave"}),
    ("server-host", {"players": 2, "scenario": "server"}),
]


def run_hub_tests(only=None):
    reports = []
    failures = []
    checks = 0
    server = subprocess.Popen(
        [sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1"],
        cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
    )
    try:
        line = server.stdout.readline()
        match = re.search(r"port (\d+)", line)
        if not match:
            raise RuntimeError("Own HTTP server did not report its ephemeral port")
        origin = f"http://127.0.0.1:{match.group(1)}"
        with urllib.request.urlopen(origin + "/game.html") as response:
            source = response.read().decode()
        checks += 1
        if "<title>The Great Space Escape</title>" not in source:
            raise RuntimeError("Server is not this game's page")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=[
                "--enable-unsafe-webgpu", "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader", "--disable-dev-shm-usage",
            ])
            try:
                context = browser.new_context(viewport={"width": 1920, "height": 1080})
                page = context.new_page()
                runtime_messages = []
                page.on("pageerror", lambda error: runtime_messages.append({"type": "error", "text": str(error)}))
                page.on("console", lambda msg: runtime_messages.append({"type": msg.type, "text": msg.text[:800]}) if msg.type in ("error", "warning") else None)
                page.on("requestfailed", lambda request: runtime_messages.append({"type": "requestfailed", "url": request.url, "failure": request.failure}))
                for name, parameters in SCENARIOS:
                    if only and name not in only:
                        continue
                    runtime_messages.clear()
                    params = {"game": "game.html", "auto": 1, "play": 6000, "seed": 843627, **parameters}
                    page.goto(origin + "/harness.html?" + urllib.parse.urlencode(params), wait_until="domcontentloaded", timeout=60000)
                    try:
                        page.wait_for_function("document.body.dataset.complete === 'true'", timeout=150000)
                        report = page.evaluate("window.__hubCheck")
                    except Exception as error:
                        report = {"pass": False, "checks": [{"name": "harness completed", "pass": False, "detail": str(error)}]}
                        report["frames"] = []
                        for frame in page.frames[1:]:
                            try:
                                report["frames"].append(frame.evaluate("({url:location.href,ready:!!window.__gameReady,error:window.__gameError,loading:document.getElementById('loading')?.innerText,net:window.__game?.net?.diagnostics()})"))
                            except Exception as frame_error:
                                report["frames"].append({"error": str(frame_error)})
                    report["runtimeMessages"] = runtime_messages.copy()
                    report["frameDiagnostics"] = []
                    for frame in page.frames[1:]:
                        try:
                            report["frameDiagnostics"].append(frame.evaluate("({url:location.href,title:document.title,ready:!!window.__gameReady,error:window.__gameError,loading:document.getElementById('loading')?.innerText,net:window.__game?.net?.diagnostics()})"))
                        except Exception as frame_error:
                            report["frameDiagnostics"].append({"error": str(frame_error)})
                    report["scenarioName"] = name
                    reports.append(report)
                    for check in report.get("checks", []):
                        checks += 1
                        if not check.get("pass"):
                            failures.append(f"{name}: {check.get('name')}: {check.get('detail', '')}")
                context.close()
            finally:
                browser.close()
    except Exception as error:
        checks += 1
        failures.append(f"harness runner: {error}")
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)
        server.stdout.close()
    result = {"count": checks, "failures": failures, "reports": reports}
    (ROOT / "hub-test-results.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", action="append", choices=[name for name, _ in SCENARIOS])
    args = parser.parse_args()
    result = run_hub_tests(args.scenario)
    for failure in result["failures"]:
        print("FAIL hub: " + failure)
    print(f"{result['count'] - len(result['failures'])}/{result['count']} AI Hub checks passed")
    sys.exit(bool(result["failures"]))
