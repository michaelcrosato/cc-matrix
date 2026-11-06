import json
from pathlib import Path

base = Path(__file__).resolve().parent
name = json.loads((base / "title-selection.json").read_text())["base"]
html = (base / "src/template.html").read_text()
licenses = (base / "vendor/THIRD-PARTY-LICENSES.txt").read_text().replace("--", "—")
html = html.replace("</head>", "<!--\n" + licenses + "\n-->\n</head>")
html = html.replace(
    "<!--HUB_CLIENT-->",
    "<script>" + (base / "vendor/hub-session.js").read_text() + "</script>",
)
html = html.replace("/*STYLES*/", (base / "src/style.css").read_text())
html = html.replace(
    "/*GAME_CODE*/",
    (base / "build/game.js").read_text().replace("</script", "<\\/script"),
)
dest = base.parent / (name + ".html")
dest.write_text(html)
(base / (name + ".html")).write_text(html)
print(f"Built {dest.name} ({dest.stat().st_size:,} bytes)")
