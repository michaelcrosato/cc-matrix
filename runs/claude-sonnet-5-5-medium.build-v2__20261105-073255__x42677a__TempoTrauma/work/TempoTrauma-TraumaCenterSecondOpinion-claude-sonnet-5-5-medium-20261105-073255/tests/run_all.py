#!/usr/bin/env python3
"""One command: runs the Rust tests (sim, shell, audio), the browser tests and the AI Hub tests; prints
only failures and a one-line count. `--rust`, `--web` or `--hub` for a part. Use the system python3 (no -I:
it hides Playwright). Rerun only after changing the code a part covers."""
import os, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENGINE = ROOT / "engine"
sys.path.insert(0, str(ROOT / "tests" / "browser"))
passed = failed = 0
fails = []


def rust():
    global passed, failed
    env = dict(os.environ, CARGO_BUILD_JOBS="3")
    for pkg, extra in (("pav_core", ["--test", "surgery"]), ("pav_ui", ["--test", "surgery_shell"]), ("pav_audio", ["--lib"])):
        r = subprocess.run(["cargo", "test", "--locked", "-p", pkg, *extra], cwd=ENGINE, capture_output=True, text=True, env=env)
        out = r.stdout + r.stderr
        for m in re.finditer(r"test result: (\w+)\. (\d+) passed; (\d+) failed", out):
            passed += int(m.group(2))
            failed += int(m.group(3))
        for m in re.finditer(r"^test (\S+) \.\.\. FAILED", out, re.M):
            fails.append(f"{pkg}: {m.group(1)}")
        if r.returncode != 0 and not re.search(r"test result", out):
            failed += 1
            fails.append(f"{pkg}: build failed: " + "\n".join(out.splitlines()[-8:]))


def web():
    global passed, failed
    import test_web
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        for t in (test_web.t_boot_and_keyboard, test_web.t_music_default_and_audio, test_web.t_pad_flow_and_prompts, test_web.t_operation_pad_and_mouse, test_web.t_phone, test_web.t_campaign_by_bot, test_web.t_coop_second_pad, test_web.t_attract_and_exit):
            test_web.check(t.__name__, lambda t=t: t(p))
    bad = [(n, e) for n, e in test_web.RESULTS if e]
    passed += len(test_web.RESULTS) - len(bad)
    failed += len(bad)
    fails.extend(f"web {n}: {str(e)[:400]}" for n, e in bad)


def hub():
    global passed, failed
    import test_hub
    test_hub.main_quiet = True
    n = test_hub.main()
    bad = [(a, b) for a, b in test_hub.RESULTS if b]
    passed += len(test_hub.RESULTS) - len(bad)
    failed += len(bad)
    fails.extend(f"hub {a}: {str(b)[:400]}" for a, b in bad)


if __name__ == "__main__":
    args = sys.argv[1:]
    every = not any(a in args for a in ("--rust", "--web", "--hub"))
    if every or "--rust" in args:
        rust()
    if every or "--web" in args:
        web()
    if every or "--hub" in args:
        # the hub module prints its own count; silence it so only this script's line shows
        import io, contextlib
        with contextlib.redirect_stdout(io.StringIO()):
            hub()
    for f in fails:
        print("FAIL", f)
    print(f"{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
