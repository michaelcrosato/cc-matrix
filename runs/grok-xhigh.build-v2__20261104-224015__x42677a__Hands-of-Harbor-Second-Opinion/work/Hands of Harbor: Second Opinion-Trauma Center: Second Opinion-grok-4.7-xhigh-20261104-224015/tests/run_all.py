#!/usr/bin/env python3
"""Hands of Harbor suites. Prints failing tests and one summary line.

Cargo runs from the engine symlink so the colon in this folder never lands in
the compiler's library path. The target directory stays beside the work root.
"""
import os
import re
import subprocess
import sys
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]
WORK = DEV.parent
ENGINE = WORK / "engine-link"
TARGET = WORK / ".harbor-target"

SUITES = [
    ["cargo", "test", "-p", "pav_core", "--test", "surgery", "--", "--test-threads=1"],
    ["cargo", "test", "-p", "pav_ui", "--lib", "surgery::tests", "--", "--test-threads=1"],
    ["cargo", "test", "-p", "pav_audio", "--lib", "music_bus_defaults_quiet_and_every_cue_speaks", "--", "--test-threads=1"],
    ["cargo", "test", "-p", "pav_view", "--lib", "surgery::tests::quiet_hub_draws_plate_instruments_hazards_and_cursors", "--", "--test-threads=1"],
]


def main() -> int:
    env = os.environ.copy()
    env["CARGO_TARGET_DIR"] = str(TARGET)
    env["CARGO_BUILD_JOBS"] = env.get("CARGO_BUILD_JOBS", "6")
    passed = 0
    failed = 0
    for cmd in SUITES:
        proc = subprocess.run(cmd, cwd=ENGINE, env=env, text=True, capture_output=True)
        text = proc.stdout + "\n" + proc.stderr
        rows = re.findall(r"^test (\S+) \.\.\. (\w+)", text, re.M)
        if not rows and proc.returncode != 0:
            sys.stdout.write(text)
            failed += 1
            continue
        for name, status in rows:
            if status == "ok":
                passed += 1
            elif status == "ignored":
                continue
            else:
                failed += 1
                sys.stdout.write(f"FAILED {name}\n")
        if proc.returncode != 0 and failed == 0:
            sys.stdout.write(text)
            failed += 1
        elif proc.returncode != 0:
            fail_at = text.find("failures:")
            if fail_at >= 0:
                sys.stdout.write(text[fail_at:])
                if not text.endswith("\n"):
                    sys.stdout.write("\n")
    sys.stdout.write(f"{passed} passed, {failed} failed\n")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
