import json
from pathlib import Path

folder = Path(__file__).resolve().parent
stem = folder.name
credits = json.loads((folder / "credits.json").read_text())
parts = [
    "core.js",
    "stages.js",
    "systems.js",
    "ui.js",
    "network.js",
    "input.js",
    "boot.js",
]
code = "const CREDITS = " + json.dumps(credits, ensure_ascii=False) + ";\n"
code += "\n".join((folder / name).read_text() for name in parts)
(folder / "game.mjs").write_text(code)
shell = (folder / "shell.html").read_text()
client = (folder / "vendor/session.js").read_text()
html = shell.replace("<!--HUB_CLIENT-->", "<script>\n" + client + "\n</script>")
html = html.replace("/*GAME_CODE*/", code)
output = folder.parent / (stem + ".html")
output.write_text(html)
(folder.parent / "exit-interview.json").write_text(
    json.dumps(credits, ensure_ascii=False, indent=2) + "\n"
)
print("Built " + output.name)
