import json
import re
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parent
name = here.name
html = (here / "template.html").read_text()
core = (
    (here / "core.mjs")
    .read_text()
    .replace("export const ", "const ")
    .replace("export class ", "class ")
    .replace("export function ", "function ")
)
main = (here / "main.mjs").read_text()
main = re.sub(
    r"""import\s*\{[^}]*\}\s*from\s*['"]\./core\.mjs['"];?""", "", main, count=1
)
metadata = json.loads((here / "metadata.json").read_text())
main = main.replace("/* CREDITS */ null", json.dumps(metadata, ensure_ascii=False))
script = core + "\n" + main
if "</script" in script.lower():
    raise ValueError("Unsafe script terminator")
html = html.replace(
    "<!-- HUB_CLIENT -->",
    "<script>\n" + (here / "vendor/session.js").read_text() + "\n</script>",
)
html = html.replace("/* GAME_CSS */", (here / "style.css").read_text())
html = html.replace("/* GAME_SCRIPT */", script)
(root / (name + ".html")).write_text(html)
(root / "exit-interview.json").write_text(
    json.dumps(metadata, ensure_ascii=False, indent=2) + "\n"
)
print("Built " + name + ".html")
