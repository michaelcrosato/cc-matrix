"""Assemble the shareable game. No build dependencies."""

import json
from pathlib import Path

dev = Path(__file__).resolve().parent
root = dev.parent
info = json.loads((dev / "title-selection.json").read_text())
report_path = root / "exit-interview.json"
report = json.loads(report_path.read_text())
html = (dev / "template.html").read_text()
code = "\n\n".join(
    (dev / file).read_text()
    for file in ["scene.js", "audio.js", "game.js", "interface.js"]
)
html = html.replace("__SESSION__", (dev / "session.js").read_text())
html = html.replace(
    "__REPORT__", json.dumps(report, ensure_ascii=False).replace("</", "<\\/")
)
html = html.replace("__GAME__", code.replace("</script", "<\\/script"))
(root / (info["base"] + ".html")).write_text(html)
