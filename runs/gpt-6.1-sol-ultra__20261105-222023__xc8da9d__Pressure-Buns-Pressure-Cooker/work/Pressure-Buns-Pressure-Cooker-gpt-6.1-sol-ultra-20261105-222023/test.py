# ruff: noqa: BLE001
# Test boundaries collect browser exceptions as failures.
"""One entry point: print failures and a single combined test count."""

import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys

FOLDER = pathlib.Path(__file__).resolve().parent
PYTHON = "/home/micha/.local/share/pipx/venvs/playwright/bin/python"
failures = []
count = 0
only = None
if "--only" in sys.argv:
    only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
commands = [
    ["node", "test-core.mjs"],
    [PYTHON, "test-network.py"],
    [PYTHON, "test-internet.py"],
    [PYTHON, "test-ui.py"],
    [PYTHON, "test-coop-game.py"],
    [PYTHON, "test-compat.py"],
    [PYTHON, "test-hub.py"],
]
for command in commands:
    suite = {
        "test-core.mjs": "core",
        "test-network.py": "network",
        "test-internet.py": "internet",
        "test-ui.py": "ui",
        "test-coop-game.py": "coop",
        "test-compat.py": "compat",
        "test-hub.py": "hub",
    }[command[-1]]
    if only is not None and suite not in only:
        continue
    try:
        result = subprocess.run(
            command,
            cwd=FOLDER,
            check=False,
            capture_output=True,
            text=True,
            timeout=240,
        )
        output = result.stdout + result.stderr
        numbers = re.findall(
            r"^(\d+) (?:core|network|Internet|UI|co-op(?: game)?|WebKit|hub) checks",
            output,
            re.MULTILINE,
        )
        count += sum(map(int, numbers))
        problems = [line for line in output.splitlines() if line.startswith("FAIL")]
        failures.extend(problems)
        if result.returncode and not problems:
            failures.append("FAIL: " + command[-1] + ": " + output.strip()[-1200:])
        if not numbers and not problems:
            failures.append("FAIL: " + command[-1] + ": missing test report")
    except Exception as error:
        failures.append("FAIL: " + command[-1] + ": " + str(error))

try:
    doc = json.loads((FOLDER.parent / "exit-interview.json").read_text())
    count += 1
    assert set(doc) == {
        "sourceInformation",
        "testingFeedback",
        "engineFeedback",
        "promptFeedback",
        "aiHub",
    }
    assert [
        len(doc[k]) for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
    ] == [4, 6, 4]
    assert doc["sourceInformation"]["usage"] == "added on import"
except Exception as error:
    failures.append("FAIL: exit-interview JSON schema: " + str(error))
try:
    html = (FOLDER.parent / (FOLDER.name + ".html")).read_text()
    count += 1
    session = (FOLDER / "hub-session.js").read_text()
    assert '<head><meta charset="utf-8">\n<script>' + session + "</script>" in html
    assert "hub:session-mode" in html and "shared-world" in html
    module = re.search(r'<script type="module">([\s\S]*?)</script>', html).group(1)
    digest = json.loads((FOLDER / "bundle-digest.json").read_text())
    assert hashlib.sha256(module.encode()).hexdigest() == digest["sha256"], (
        "Inlined compiled code differs from the bundle"
    )
    assert len(module.encode()) == digest["bytes"]
    assert "/*GAME*/" not in html
    assert "<!--HUB-->" not in html
    assert 'from "./' not in html and "from './" not in html
except Exception as error:
    failures.append(
        "FAIL: single-file packaging / unmodified Hub client: " + str(error)
    )

if "--screenshots" in sys.argv or (only is not None and "visual" in only):
    try:
        result = subprocess.run(
            [PYTHON, "visual-check.py"],
            cwd=FOLDER,
            check=False,
            capture_output=True,
            text=True,
            timeout=150,
            env={**os.environ, "PW_TEST_SCREENSHOT_NO_FONTS_READY": "1"},
        )
        count += 1
        if result.returncode:
            failures.append(
                "FAIL: optional screenshots: " + result.stderr.strip()[-900:]
            )
    except Exception as error:
        failures.append("FAIL: optional screenshots: " + str(error))

for failure in failures:
    print(failure)
print(f"{count} checks, {len(failures)} failures")
raise SystemExit(bool(failures))
