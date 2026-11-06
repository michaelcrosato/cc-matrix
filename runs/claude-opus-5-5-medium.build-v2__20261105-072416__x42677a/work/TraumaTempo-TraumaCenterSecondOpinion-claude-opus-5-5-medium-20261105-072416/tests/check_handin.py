#!/usr/bin/env python3
"""TASK.md's hand-in list and PLAN.md's finish line, checked against the files."""
import glob, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = ROOT.parent
NAME = "TraumaTempo-TraumaCenterSecondOpinion-claude-opus-5-5-medium-20261105-072416"
def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {detail}"))
html = WORK / f"{NAME}.html"
check("game file named as TASK.md says, in root", html.is_file())
check("dev subfolder named as TASK.md says", (WORK / NAME).is_dir() and ROOT.name == NAME)
check("exactly one html in root", len(glob.glob(str(WORK / "*.html"))) == 1)
page = html.read_text(encoding="utf-8")
check("title constant on the page", "<title>Trauma Tempo</title>" in page)
check("self-contained: no external scripts, styles or fonts", not re.search(r"""(?:src|href)=["']https?://""", page))
client = (ROOT / "tests/hub/session.js").read_text(encoding="utf-8")
check("hub client unmodified, first script after charset", page.split('<meta charset="utf-8">\n', 1)[1].startswith("<script>\n" + client))
for tag, want in [("session", "1"), ("session-players", "1-4"), ("session-mode", "shared-world"), ("session-minutes", "4"), ("webgpu", "required")]:
    check(f"hub tag {tag}", f'<meta name="hub:{tag}" content="{want}">' in page)
for tag in ["session-goal", "session-howto"]:
    m = re.search(rf'<meta name="hub:{tag}" content="([^"]*)">', page)
    limit = 60 if tag == "session-goal" else 80
    check(f"hub tag {tag} under {limit} characters", m and len(m[1]) < limit, m and len(m[1]))
ex = json.loads((WORK / "exit-interview.json").read_text(encoding="utf-8"))
check("exit interview top level", list(ex) == ["sourceInformation", "testingFeedback", "engineFeedback", "promptFeedback", "aiHub"], list(ex))
keys = ["date", "source", "plan", "genre", "perspective", "tech", "artDirection", "animation", "audio", "online", "testing", "research", "environment", "model", "usage"]
si = ex["sourceInformation"]
check("source information keys, all filled", list(si) == keys and all(isinstance(si[k], str) and si[k] for k in keys), list(si))
check("date, environment, model, usage as TASK.md gives them", si["date"] == "2026-11-05 07:24:16" and si["environment"] == "Claude Code CLI (headless); Linux" and si["model"] == "Anthropic, claude-opus-5-5, reasoning effort medium" and si["usage"] == "added on import")
check("answers per question: 4, 6, 4", [len(ex[k]) for k in ("testingFeedback", "engineFeedback", "promptFeedback")] == [4, 6, 4])
hub = ex["aiHub"]
check("catalogue keys", list(hub) == ["name", "tagline", "description", "type", "genre", "source", "series", "players", "controls", "tags"], list(hub))
check("catalogue values allowed", hub["name"] == "Trauma Tempo" and hub["type"] in ("Game", "Tech demo", "Tool") and hub["genre"] == "Simulation" and hub["players"] == "1–4" and 3 <= len(hub["tags"]) <= 6 and all(t == t.lower() for t in hub["tags"]))
about = json.loads(re.search(r'id="about-data">(.*?)</script>', page, re.S)[1])
check("About block carries the interview", all(about[k] == ex[k] for k in list(ex)[:4]))
check("About credits engine, font and clip packs", all(any(w in c for c in about["credits"]) for w in ("Pavilion", "Barlow", "CC0")))
src = list((ROOT / "engine/crates").glob("*/src/**/*surgery*/**/*.rs")) + [ROOT / "engine/crates/pav_app/src/product.rs", ROOT / "engine/crates/pav_app/src/hub.rs"]
stubs = [str(p) for p in src if re.search(r"\b(todo!|unimplemented!|FIXME)\b", p.read_text(encoding="utf-8"))]
check("no stubs in the game's code", not stubs, stubs)
audio = [p for p in (ROOT / "engine/crates/pav_core/src/games/surgery").rglob("*") if p.suffix in (".wav", ".mp3", ".ogg", ".png", ".jpg", ".glb")]
check("no audio, image or model files in the game", not audio, audio)
