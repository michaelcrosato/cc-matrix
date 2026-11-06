"""Consolidate static, gameplay, audio, transport and Hub tests into one result."""

import json
import re
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
checks = 0
failures = []


def verify(ok, label):
    global checks
    checks += 1
    if not ok:
        failures.append(label)


syntax = subprocess.run(
    ["node", "--check", "bundle.mjs"],
    cwd=root,
    capture_output=True,
    text=True,
    check=False,
)
verify(syntax.returncode == 0, "Bundled JavaScript syntax: " + syntax.stderr.strip())
try:
    interview = json.loads((root.parent / "exit-interview.json").read_text())
    verify(
        set(interview)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
        "Exit interview shape",
    )
    verify(
        [
            len(interview[k])
            for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
        ]
        == [4, 6, 4],
        "All interview questions answered",
    )
    verify(
        interview["sourceInformation"]["usage"] == "added on import",
        "Usage remains added on import",
    )
except (OSError, ValueError, KeyError, TypeError) as error:
    verify(False, "Exit interview JSON: " + str(error))

html = (root / "game.html").read_text()
verify(
    html
    == (
        root.parent
        / "Son-of-a-Sun-Superman-1979-gpt-6.1-sol-ultra-20261106-011205.html"
    ).read_text(),
    "Release and test HTML match",
)
verify(
    not re.search(r'<script[^>]+src=["\']\./', html),
    "No local script dependencies in release",
)
verify("window.GAME_CREDITS=" in html, "Credits embedded")

scripts = [
    "tests-game.py",
    "test-transport.py",
    "test-adapter-hub.py",
    "tests-full-hub.py",
    "tests-full-network.py",
]
if "--game" in sys.argv:
    scripts = ["tests-game.py"]
for script in scripts:
    result = subprocess.run(
        [sys.executable, script], cwd=root, capture_output=True, text=True, check=False
    )
    output = result.stdout + result.stderr
    counts = re.findall(
        r"(\d+) [^\n\d]*checks?,\s*(\d+) failures?", output, re.IGNORECASE
    )
    if counts:
        checks += int(counts[-1][0])
    if result.returncode:
        lines = [line for line in output.splitlines() if line.startswith("FAIL")]
        failures.extend(lines or [f"{script}: {output.strip()[-2000:]}"])
    elif not counts:
        failures.append(f"{script}: missing check count: {output.strip()[-500:]}")

for failure in failures:
    print(failure if failure.startswith("FAIL") else "FAIL " + failure)
print(f"{checks} checks, {len(failures)} failures")
raise SystemExit(bool(failures))
