#!/usr/bin/env python3
"""Quotes what TASK.md and PLAN.md ask for, and checks each against the folder. Prints every line."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
WORK = ROOT.parent
task = (WORK/"TASK.md").read_text(); plan = (WORK/"PLAN.md").read_text()
n = ROOT.name; html = WORK/f"{n}.html"; page = html.read_text()
d = json.loads((WORK/"exit-interview.json").read_text())
F = ROOT/"engine/crates/pav_core/src/games/fit"
def row(q, ok): print(("PASS" if ok else "FAIL"), "|", q[:110])
for l in task.splitlines():
    if l.startswith(("Package:", "Exit interview:", "CRITICAL:")) or "Create a subfolder" in l: print("TASK says:", l[:210])
row("single html in root, named for the title, source, model, date", html.exists() and n == "WeStand-WiiFit-claude-opus-5-5-medium-20261104-223953")
row("subfolder of the same name", ROOT.is_dir() and (ROOT/"engine").is_dir())
row("exit-interview.json beside the html, parses", True)
m = re.search(r'"sourceInformation": \{(.*?)\}', task, re.S)
keys = re.findall(r'"(\w+)":', m.group(1))
row(f"sourceInformation has all {len(keys)} keys, none empty", all(d["sourceInformation"].get(k) for k in keys))
row('usage is exactly "added on import"', d["sourceInformation"]["usage"] == "added on import")
for sec, key in (("Testing Feedback", "testingFeedback"), ("Engine Feedback", "engineFeedback"), ("Prompt Feedback", "promptFeedback")):
    qs = re.search(rf"\n{sec}\n\n((?:- .*\n)+)", task).group(1).count("- ")
    row(f"{sec}: {qs} questions, {len(d[key])} answers", qs == len(d[key]) and all(d[key]))
a = re.search(r'"aiHub": \{(.*?)\n  \}', task, re.S).group(1)
row("aiHub has every field", all(d["aiHub"].get(k) for k in re.findall(r'"(\w+)":', a)))
row("About data in the page matches the interview", json.loads(re.search(r'id="about-data" type="application/json">(.*?)</script>', page, re.S).group(1).replace("<\\/", "</")) == d)
row("hub client pasted byte for byte, first script", (ROOT/"hub/session.js").read_text() in page and page.index("<script>") < page.index("hub:session"))
print("PLAN sections:", re.findall(r"^## (\d+\. [^\n]+)", plan, re.M)[:18])
props = re.search(r"Make: (palm.*?)\.\n", plan).group(1)
print("PLAN props:", props[:200])
print("props on disk:", len(list((ROOT/"engine/assets/props/lib/core").glob("fit_*.json"))))
clips = re.search(r"\*\*Make:\*\* (Breath.*?)\. Check", plan).group(1).split(", ")
clips = [c.split(" (")[0] for c in clips]
have = json.loads((ROOT/"engine/anim/fit.json").read_text())["clips"]
src = "".join(p.read_text() for p in F.rglob("*.rs"))
row(f"all {len(clips)} planned hand-keyed clips exist", all(c in have for c in clips))
print("  planned clips never played by name:", [c for c in clips if f"FIT/{c}" not in src])
lib = re.findall(r"`((?:MESH2MOTION|CMU|STYLE100|QUATERNIUS)/[^`]+)`", plan.split("Library clips to use")[1].split("Search with")[0])
data = src + "".join(p.read_text() for p in (F/"sets").glob("*.toml"))
print("  planned library clips unused:", [c for c in lib if c not in data])
gen = re.search(r"From the library \(generic only\):\*\* (.*?)\. The library", plan).group(1)
names = re.findall(r"`(?:LIB/core/)?(\w+)`", gen)
print("  planned library props unused:", [c for c in names if c not in data])
rules = (F/"rules.rs").read_text()
tests = (ROOT/"engine/crates/pav_core/tests/fit.rs").read_text()
print("core tests:", len(re.findall(r"#\[test\]", tests)), "| final run:", (ROOT/"notes/final-tests.txt").read_text().strip().splitlines()[-1])
