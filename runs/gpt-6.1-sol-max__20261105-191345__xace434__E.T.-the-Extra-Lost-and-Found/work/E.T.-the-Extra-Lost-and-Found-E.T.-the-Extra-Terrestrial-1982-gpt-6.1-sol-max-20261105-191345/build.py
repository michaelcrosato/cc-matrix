import json
from pathlib import Path

project = Path(__file__).resolve().parent
root = project.parent
credits = json.loads((root / "exit-interview.json").read_text())
html = (project / "shell.html").read_text()
html = html.replace("/*__HUB__*/", (project / "hub/session.js").read_text())
html = html.replace("/*__AUDIO__*/", (project / "audio.js").read_text())
html = html.replace(
    "/*__CREDITS__*/", json.dumps(credits, ensure_ascii=False).replace("<", "\\u003c")
)
game = "\n\n".join(
    (project / name).read_text()
    for name in ["game.js", "ui.js", "network.js", "boot.js"]
)
html = html.replace("/*__GAME__*/", game)
out = root / (project.name + ".html")
out.write_text(html)
(project / "combined.mjs").write_text(game)
print(out.name)
