"""One command for the complete game and network checks; only failures and count."""

import importlib.util
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
PYTHON = (
    sys.executable
    if importlib.util.find_spec("playwright")
    else str(pathlib.Path.home() / ".local/share/pipx/venvs/playwright/bin/python")
)
SUITES = [
    ("tests.py", "test-results.json"),
    ("game-network-tests.py", "network-results.json"),
    ("network-tests.py", "adapter-test-results.json"),
    ("physics-playthrough.cjs", "physics-test-results.json"),
    ("layout-tests.py", "layout-results.json"),
]
passed = failed = 0
reports = []
for script, output in SUITES:
    report_path = ROOT / output
    if report_path.exists():
        report_path.unlink()
    result = subprocess.run(
        (
            ["node", str(ROOT / script), "1"]
            if script.endswith(".cjs")
            else [PYTHON, str(ROOT / script)]
        ),
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    for line in result.stdout.splitlines():
        if not re.fullmatch(
            r"\d+ passed, \d+ failed|\d+ physics playthroughs passed; \d+ simulation steps; \d+ collision events",
            line.strip(),
        ):
            print(line)
    if not report_path.exists() and script == "network-tests.py":
        matches = re.findall(r"(\d+) passed, (\d+) failed", result.stdout)
        if matches:
            count_passed, count_failed = map(int, matches[-1])
            report_path.write_text(
                json.dumps(
                    {
                        "passed": count_passed,
                        "failed": count_failed,
                        "suite": "AI Hub adapter and public PeerJS transport",
                    },
                    indent=2,
                )
            )
    if not report_path.exists() and script.endswith(".cjs"):
        matches = re.findall(
            r"(\d+) physics playthroughs passed; (\d+) simulation steps; (\d+) collision events",
            result.stdout,
        )
        if matches:
            patrols, steps, collisions = map(int, matches[-1])
            report_path.write_text(
                json.dumps(
                    {
                        "passed": patrols,
                        "failed": 0,
                        "simulationSteps": steps,
                        "collisionEvents": collisions,
                    },
                    indent=2,
                )
            )
    if report_path.exists():
        report = json.loads(report_path.read_text())
        passed += report.get("passed", 0)
        failed += report.get("failed", 0)
        reports.append({"suite": script, **report})
    else:
        failed += 1
        print(f"FAIL {script}: suite did not produce its results report")
    if result.returncode and result.stderr.strip():
        print(f"FAIL {script} process: {result.stderr.strip()}")
    if result.returncode and reports and reports[-1].get("failed", 0) == 0:
        failed += 1
        print(f"FAIL {script}: process exited {result.returncode}")
combined = {"passed": passed, "failed": failed, "suites": reports}
(ROOT / "all-test-results.json").write_text(json.dumps(combined, indent=2))
print(f"{passed} passed, {failed} failed")
raise SystemExit(1 if failed else 0)
