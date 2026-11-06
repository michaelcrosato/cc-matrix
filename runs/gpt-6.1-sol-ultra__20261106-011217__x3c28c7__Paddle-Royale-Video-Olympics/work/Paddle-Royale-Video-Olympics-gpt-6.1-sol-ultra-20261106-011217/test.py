#!/usr/bin/env python3
"""Run every check; print failures and one total count."""

import json
import re
import subprocess
import sys
from pathlib import Path

folder = Path(__file__).resolve().parent
root = folder.parent
checks = 0
failures = 0


def check(name, condition):
    global checks, failures
    checks += 1
    if not condition:
        failures += 1
        print(f"FAIL {name}")


html = (root / (folder.name + ".html")).read_text()
try:
    interview = json.loads((root / "exit-interview.json").read_text())
    check(
        "exit interview exact top-level schema",
        set(interview)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
    )
    check(
        "feedback answers and import usage",
        len(interview["testingFeedback"]) == 4
        and len(interview["engineFeedback"]) == 6
        and len(interview["promptFeedback"]) == 4
        and interview["sourceInformation"]["usage"] == "added on import",
    )
    check(
        "credits match exit interview",
        "const CREDITS = " + json.dumps(interview, ensure_ascii=False) + ";" in html,
    )
except (OSError, json.JSONDecodeError, KeyError) as exc:
    check("exit interview parses: " + str(exc), False)
check(
    "unmodified Hub session is first script",
    html.split("<script>\n", 1)[1].startswith(
        (folder / "vendor/session.js").read_text()
    ),
)
check(
    "AI Hub session metadata",
    all(
        f'name="{tag}"' in html
        for tag in [
            "hub:session",
            "hub:session-players",
            "hub:session-mode",
            "hub:session-goal",
            "hub:session-howto",
        ]
    ),
)
for name in ["audio.js", "network.js", "arena.js", "game.js"]:
    result = subprocess.run(
        ["node", "--check", str(folder / name)],
        capture_output=True,
        text=True,
        check=False,
    )
    check("JavaScript syntax " + name, result.returncode == 0)
    if result.returncode:
        print(result.stderr)
python = str(Path.home() / ".local/share/pipx/venvs/playwright/bin/python")
for command in [
    ["node", str(folder / "test-network.mjs")],
    [python, str(folder / "test-game.py")],
    [python, str(folder / "test-online.py")],
]:
    result = subprocess.run(
        command, capture_output=True, text=True, timeout=540, check=False
    )
    counted = False
    for line in (result.stdout + "\n" + result.stderr).splitlines():
        match = re.fullmatch(r"(\d+) checks, (\d+) failures", line)
        passed = re.fullmatch(r"(\d+)/(\d+) (?:network|online) checks passed", line)
        if match:
            checks += int(match[1])
            failures += int(match[2])
            counted = True
        elif passed:
            checks += int(passed[2])
            failures += int(passed[2]) - int(passed[1])
            counted = True
        elif line.strip():
            print(line)
    if not counted:
        check("suite returned count: " + Path(command[-1]).name, False)
    elif result.returncode and not any(
        "FAIL" in line for line in result.stdout.splitlines()
    ):
        check("suite exit code: " + Path(command[-1]).name, False)
print(f"{checks} checks, {failures} failures")
sys.exit(bool(failures))
