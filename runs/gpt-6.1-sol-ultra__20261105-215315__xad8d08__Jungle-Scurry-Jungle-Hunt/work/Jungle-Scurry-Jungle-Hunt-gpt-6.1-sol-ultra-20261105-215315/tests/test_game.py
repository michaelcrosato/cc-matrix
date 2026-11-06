"""Single-command verification: build, simulation, input/audio, and Hub conformance."""

from __future__ import annotations

import functools
import importlib.util
import json
import os
import re
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parent
STEM = PROJECT.name
FLAGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
]
failures = []
count = 0


def command(args, label, env=None):
    global count
    result = subprocess.run(args, cwd=PROJECT, env=env, text=True, capture_output=True)
    output = result.stdout + "\n" + result.stderr
    matches = re.findall(r"(\d+)/(\d+) .*checks passed", output)
    simulation = re.search(r"Simulation: (\d+) checks, (\d+) failures", output)
    count += int(matches[-1][1]) if matches else int(simulation[1]) if simulation else 1
    if result.returncode:
        lines = [s for s in output.splitlines() if s.startswith("FAIL")]
        failures.extend(lines or [f"FAIL {label}: {output.strip()[-1600:]}"])


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, PROJECT / "tests" / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    global count
    command(["node", "build.mjs"], "bundle")
    command(["node", "tests/simulation.mjs"], "physics")
    command(["node", "tests/check-world.mjs"], "world")
    command(["node", "tests/network-test.mjs"], "network input")
    try:
        meta = json.loads((ROOT / "exit-interview.json").read_text())
        assert set(meta) == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        }
        assert (
            len(meta["testingFeedback"]) == 4
            and len(meta["engineFeedback"]) == 6
            and len(meta["promptFeedback"]) == 4
        )
        assert meta["sourceInformation"]["usage"] == "added on import"
        assert all(str(v).strip() for v in meta["sourceInformation"].values())
        assert meta["aiHub"]["name"] == "Jungle Scurry" and len(
            meta["aiHub"]["tags"]
        ) in range(3, 7)
        html = (ROOT / (STEM + ".html")).read_text()
        assert '<meta name="hub:session" content="1">' in html
        assert "aihub-session" in html
        assert "<script src=" not in html and 'type="importmap"' not in html
        count += 1
    except Exception as error:
        count += 1
        failures.append("FAIL deliverable metadata: " + str(error))
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_port}"
    try:
        command(
            [sys.executable, "network-smoke.py"],
            "direct transport",
            env={**os.environ, "GAME_TEST_ORIGIN": origin + "/" + STEM},
        )
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=FLAGS)
            try:
                f, n = module(
                    "jungle_browser_checks", "browser-checks.py"
                ).run_browser_checks(browser, origin, STEM + ".html")
                failures.extend("FAIL " + x for x in f)
                count += n
            except Exception as error:
                count += 1
                failures.append("FAIL browser suite: " + str(error).split("\n")[0])
            finally:
                browser.close()
            f, n = module("jungle_hub_checks", "hub-test.py").test_hub(
                lambda: p.chromium.launch(headless=True, args=FLAGS),
                origin,
                STEM + ".html",
            )
            failures.extend("FAIL " + x for x in f)
            count += n
    except Exception as error:
        count += 1
        failures.append("FAIL test runner: " + str(error).split("\n")[0])
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    report = {
        "checks": count,
        "failures": failures,
        "passed": count - len(failures),
        "parameters": {
            "renderer": "Chromium SwiftShader WebGPU; device-loss WebGL2 fallback",
            "gamepad": "standard mapping stub",
            "touch": "phone profile",
            "multiplayer": "real local BroadcastChannel, WebRTC data channel, official Hub standard/adverse/server/host-leave",
            "audio": "OfflineAudioContext plus live analyser",
            "simulation": "real Rapier WASM complete expedition",
        },
    }
    (PROJECT / "tests" / "results.json").write_text(json.dumps(report, indent=2) + "\n")
    for failure in failures:
        print(failure)
    print(f"{count - len(failures)}/{count} checks passed; {len(failures)} failures.")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
