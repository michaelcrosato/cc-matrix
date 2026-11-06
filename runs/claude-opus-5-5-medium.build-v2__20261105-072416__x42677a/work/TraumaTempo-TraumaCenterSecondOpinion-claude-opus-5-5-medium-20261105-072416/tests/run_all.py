#!/usr/bin/env python3
"""The one test command. Prints only failures and a one-line count.
usage: python3 tests/run_all.py [--handin|--rust|--web|--full|--hub|--native]"""
import os, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
ENGINE = ROOT.parent / "engine"
which = sys.argv[1] if len(sys.argv) > 1 else "--all"
passed = failed = 0

def report(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
    else:
        failed += 1
        print(f"FAIL {name}\n{detail[-3000:]}")

def rust():
    global passed, failed
    for pkg, extra in [("pav_core", ["--test", "surgery"]), ("pav_core", ["--lib", "surgery"]), ("pav_audio", []), ("pav_ui", ["--lib"])]:
        cmd = [str(ROOT.parent / "tools" / "cb.sh"), "test", "-p", pkg, *extra]
        r = subprocess.run(cmd, cwd=ENGINE, capture_output=True, text=True)
        out = r.stdout + r.stderr
        ok_tests = re.findall(r"^test .* \.\.\. ok$", out, re.M)
        bad = re.findall(r"^test (.*) \.\.\. FAILED$", out, re.M)
        passed += len(ok_tests)
        for b in bad:
            failed += 1
            m = re.search(r"---- " + re.escape(b) + r" stdout ----(.*?)(?=\n---- |\nfailures:)", out, re.S)
            print(f"FAIL rust {pkg}::{b}\n{(m.group(1) if m else '').strip()[:1500]}")
        if r.returncode != 0 and not bad:
            report(f"rust build {pkg} {extra}", False, out)

def native():
    r = subprocess.run([str(ROOT.parent / "tools" / "cb.sh"), "build", "-p", "pav_app"], cwd=ENGINE, capture_output=True, text=True)
    if r.returncode != 0:
        return report("native build", False, r.stdout + r.stderr)
    save = ENGINE / "target" / "debug" / "trauma_tempo_save.json"
    save.unlink(missing_ok=True)
    r = subprocess.run(["xvfb-run", "-a", "-s", "-screen 0 1920x1080x24", "uv", "run", "--with", "python-xlib", "python", str(ROOT.parent / "tools" / "native_check.py"), str(ROOT / "out")],
                       cwd=ENGINE, capture_output=True, text=True)
    report("native window", "PASS native" in r.stdout and "panic" not in (ROOT / "out" / "native.log").read_text(errors="replace").lower(), r.stdout + r.stderr)

def web(suite, full=False):
    path = ROOT / suite if suite == "check_handin.py" else ROOT / "browser" / suite
    env = {**os.environ, "FULL_PICTURE": "1"} if full else None
    r = subprocess.run([sys.executable, str(path)], capture_output=True, text=True, cwd=ROOT, env=env)
    global passed, failed
    for line in r.stdout.splitlines():
        if line.startswith("PASS "):
            passed += 1
        elif line.startswith("FAIL "):
            failed += 1
            print(line)
        elif line.startswith("  "):
            print(line)
    if r.returncode != 0:
        report(f"{suite} crashed", False, r.stderr)

if which in ("--all", "--handin"):
    web("check_handin.py")
if which in ("--all", "--rust"):
    rust()
if which in ("--all", "--web"):
    web("web_tests.py")
if which in ("--all", "--full"):
    web("full_tests.py")
    web("web_tests.py", full=True)
    web("hub_tests.py", full=True)
if which in ("--all", "--native"):
    native()
if which in ("--all", "--web", "--hub"):
    web("hub_tests.py")
print(f"{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
