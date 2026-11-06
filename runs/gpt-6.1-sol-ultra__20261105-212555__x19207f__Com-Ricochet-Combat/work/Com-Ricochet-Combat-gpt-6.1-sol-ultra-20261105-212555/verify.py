"""One entry point for deliverable, gameplay, audio, transport and official Hub checks."""

import functools
import http.server
import importlib.util
import json
import re
import subprocess
import threading
from pathlib import Path

from test_game import Quiet, run_game

D = Path(__file__).resolve().parent
ROOT = D.parent


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, D / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    failures = []
    count = 0
    reports = {}

    def check(value, label):
        nonlocal count
        count += 1
        if not value:
            failures.append(label)

    try:
        data = json.loads((ROOT / "exit-interview.json").read_text())
        html = (ROOT / (D.name + ".html")).read_text()
        check(
            set(data)
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            },
            "Exit interview exact top-level schema",
        )
        check(
            len(data["testingFeedback"]) == 4
            and len(data["engineFeedback"]) == 6
            and len(data["promptFeedback"]) == 4,
            "Feedback answer counts",
        )
        check(
            all(isinstance(v, str) and v for v in data["sourceInformation"].values()),
            "All source information values filled",
        )
        check(
            data["sourceInformation"]["usage"] == "added on import",
            "Usage remains added on import",
        )
        check(
            (D / "vendor/session.js").read_text() in html,
            "Unmodified official Hub client embedded",
        )
        check(
            not re.search(r"from [\'\"]\./(?:audio|network)\.js", html),
            "Single HTML contains game modules",
        )
        check(
            "const CREDIT_DATA" in html
            and "Testing Feedback" in html
            and "Prompt Feedback" in html,
            "About embeds complete feedback",
        )
        check(
            "three@0.180.0" in html and "rapier3d-compat@0.19.3" in html,
            "Exact required engine and physics versions",
        )
        result = subprocess.run(
            ["node", str(D / "network-test.mjs")],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        match = re.search(r"(\d+)/(\d+) checks passed", result.stdout)
        if not match:
            match = re.search(r"(\d+)/(\d+)", result.stdout)
        if match:
            count += int(match.group(2))
        else:
            count += 1
        if result.returncode:
            failures.append("Transport unit checks: " + result.stdout + result.stderr)
        reports["transport"] = result.stdout.strip()
        server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT))
        )
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}/"
        game_url = base + D.name + ".html"
        try:
            gf, gc = run_game(game_url)
            failures.extend(gf)
            count += gc
            reports["game"] = {"checks": gc, "failures": gf}
            online = load_module("online_runner", "test-online.py")
            of, oc, obs = online.run(game_url + "?test=1")
            failures.extend(of)
            count += oc
            reports["standalone"] = {"checks": oc, "failures": of}
            (D / "test-online-report.json").write_text(
                json.dumps(
                    {"checks": oc, "failures": of, "observations": obs}, indent=2
                )
            )
            hub = load_module("official_hub", "test-hub.py")
            hf, hc, scenarios = hub.run_hub(
                base + D.name + "/", "../" + D.name + ".html"
            )
            failures.extend(hf)
            count += hc
            reports["hub"] = {
                "checks": hc,
                "failures": hf,
                "strictPass": [s.get("pass") for s in scenarios],
            }
            (D / "test-hub-report.json").write_text(
                json.dumps(
                    {"checks": hc, "failures": hf, "scenarios": scenarios}, indent=2
                )
            )
        finally:
            server.shutdown()
            server.server_close()
    except Exception as exc:  # noqa: BLE001 - report failures and close test resources
        failures.append("Verification exception: " + str(exc))
    reports.update(
        {"checks": count, "passed": count - len(failures), "failures": failures}
    )
    (D / "verification-report.json").write_text(json.dumps(reports, indent=2) + "\n")
    for failure in failures:
        print("FAIL:", failure)
    print(f"{count - len(failures)}/{count} checks passed")
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
