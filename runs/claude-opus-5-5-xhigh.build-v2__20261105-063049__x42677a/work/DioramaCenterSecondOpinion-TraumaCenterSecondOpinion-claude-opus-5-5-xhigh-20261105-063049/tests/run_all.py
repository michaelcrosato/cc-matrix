#!/usr/bin/env python3
"""Everything, behind one command: prints only failures and a one-line count.

usage: python3 tests/run_all.py [--rust] [--web] [--hub] [--play]    (no flags: all but --play)
--play plays the whole campaign in the browser through the real pad and the real mouse: about an hour.
Run with the system python3, without -I: -I hides Playwright.
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
ENGINE = ROOT.parent / "engine"
passed = failed = 0


def run_cargo(args):
    global passed, failed
    r = subprocess.run(["cargo", "test", "--offline", *args], cwd=ENGINE, capture_output=True, text=True, env={**__import__("os").environ, "CARGO_BUILD_JOBS": "10"})
    out = r.stdout + r.stderr
    for m in re.finditer(r"test result: \w+\. (\d+) passed; (\d+) failed", out):
        passed += int(m[1])
        failed += int(m[2])
    if r.returncode != 0:
        lines = [l for l in out.splitlines() if re.search(r"FAILED|panicked|error(\[|:)|assertion|left:|right:", l)]
        print(f"cargo test {' '.join(args)} failed:")
        print("\n".join(lines[:40]))
        if "test result" not in out:
            failed += 1


def rust():
    for args in (
        ["-p", "pav_core", "--test", "surgery"],
        ["-p", "pav_core", "--lib", "surgery"],
        ["-p", "pav_ui", "--lib", "surgery"],
        ["-p", "pav_audio", "--lib"],
    ):
        run_cargo(args)


def module(name):
    global passed, failed
    sys.path.insert(0, str(ROOT / "browser"))
    mod = __import__(name)
    p, f = mod.main()
    passed += p
    failed += f


args = set(sys.argv[1:])
if not args or "--rust" in args:
    rust()
if not args or "--web" in args:
    module("web_tests")
if not args or "--hub" in args:
    module("hub_tests")
if "--play" in args:
    module("play_tests")
print(f"{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
