import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAME = ROOT.name
credits = json.loads((ROOT / "credits.json").read_text())
scripts = ["config.js", "physics.js", "audio.js", "view.js", "network.js", "app.js"]
code = "import * as THREE from 'three';\nimport RAPIER from 'rapier';\n"
code += "const EXIT_INTERVIEW = " + json.dumps(credits, ensure_ascii=False) + ";\n"
code += "\n".join((ROOT / name).read_text() for name in scripts)
html = (ROOT / "template.html").read_text()
html = html.replace("__HUB_SESSION__", (ROOT / "vendor/hub-session.js").read_text())
html = html.replace("__STYLE__", (ROOT / "style.css").read_text())
html = html.replace("__GAME__", code)
(ROOT.parent / f"{NAME}.html").write_text(html)
(ROOT.parent / "exit-interview.json").write_text(
    json.dumps(credits, indent=2, ensure_ascii=False) + "\n"
)
