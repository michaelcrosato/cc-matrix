import json
from pathlib import Path

p = Path(__file__).resolve().parent
root = p.parent
html = (p / "index.template.html").read_text()
html = html.replace("/*HUB_CLIENT*/", (p / "vendor/session.js").read_text())
html = html.replace("/*STYLES*/", (p / "style.css").read_text())
credits = json.loads((root / "exit-interview.json").read_text())
html = html.replace(
    "/*CREDITS*/", json.dumps(credits, ensure_ascii=False).replace("</", "<\\/")
)
code = "\n".join(
    (p / name).read_text() for name in ["sound.js", "network.js", "game.js"]
)
html = html.replace("/*GAME*/", code.replace("</script", "<\\/script"))
(root / (p.name + ".html")).write_text(html)
