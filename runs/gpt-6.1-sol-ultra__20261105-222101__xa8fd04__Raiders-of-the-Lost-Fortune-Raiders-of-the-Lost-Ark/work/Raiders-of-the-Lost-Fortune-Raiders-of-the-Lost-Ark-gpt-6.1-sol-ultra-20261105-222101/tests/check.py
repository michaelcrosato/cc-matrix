"""One quiet command for the complete verified game package."""

import json
import pathlib
import re
import subprocess

from gameplay import run_checks as gameplay_checks
from hub import run_checks as hub_checks
from multiplayer import run_checks as multiplayer_checks

DEV = pathlib.Path(__file__).resolve().parents[1]
ROOT = DEV.parent


def main():
    total = 0
    failures = []

    def check(ok, label):
        nonlocal total
        total += 1
        if not ok:
            failures.append(label)

    for filename in ("main.js", "scene.js", "audio.js", "online.js", "build.mjs"):
        result = subprocess.run(
            ["node", "--check", str(DEV / filename)],
            capture_output=True,
            text=True,
            check=False,
        )
        check(result.returncode == 0, f"{filename} syntax: {result.stderr.strip()}")
    try:
        record = json.loads((ROOT / "exit-interview.json").read_text())
        check(
            set(record)
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
            len(record["testingFeedback"]) == 4
            and len(record["engineFeedback"]) == 6
            and len(record["promptFeedback"]) == 4,
            "All exit interview questions answered in order",
        )
        check(
            record["sourceInformation"]["usage"] == "added on import",
            "Usage is delegated to importer",
        )
        check(
            all(record["sourceInformation"].values()) and all(record["aiHub"].values()),
            "Source and catalogue fields filled",
        )
    except Exception as error:  # noqa: BLE001 - report failures and close owned resources
        check(False, f"Exit interview JSON: {error}")
    html = (ROOT / (DEV.name + ".html")).read_text()
    check(
        not re.search(r"from ['\"]\./(?:scene|audio|online)\.js", html),
        "Single HTML contains all game modules",
    )
    check(
        all(
            f'name="hub:session-{key}"' in html
            for key in ("players", "mode", "minutes", "goal", "howto")
        ),
        "AI Hub session metadata included",
    )
    check(
        all(answer in html for answer in record["engineFeedback"]),
        "In-game credits include actual exit feedback",
    )
    result = subprocess.run(
        ["node", str(DEV / "test-online.mjs")],
        capture_output=True,
        text=True,
        check=False,
    )
    match = re.search(r"(\d+)/(\d+) online checks passed", result.stdout)
    if result.returncode == 0 and match:
        total += int(match[2])
    else:
        check(False, "Network protocol unit checks: " + result.stdout + result.stderr)
    for suite in (gameplay_checks, multiplayer_checks, hub_checks):
        try:
            count, problems = suite()
            total += count
            failures.extend(problems)
        except Exception as error:  # noqa: BLE001 - report failures and close owned resources
            check(False, f"{suite.__module__} runner: {error}")
    for problem in failures:
        print("FAIL: " + problem)
    print(f"{total - len(failures)}/{total} checks passed")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
