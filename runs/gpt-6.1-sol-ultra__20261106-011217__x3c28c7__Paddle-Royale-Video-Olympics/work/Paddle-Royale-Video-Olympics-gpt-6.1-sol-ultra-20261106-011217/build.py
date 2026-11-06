import json
import re
from pathlib import Path

folder = Path(__file__).resolve().parent
root = folder.parent
base = folder.name
metadata = json.loads((root / "exit-interview.json").read_text())
parts = []
parts.append("const CREDITS = " + json.dumps(metadata, ensure_ascii=False) + ";")
for module in ("audio.js", "network.js", "arena.js", "game.js"):
    source = (folder / module).read_text()
    source = re.sub(r"^export ", "", source, flags=re.MULTILINE)
    parts.append(source)
html = (folder / "index.template.html").read_text()
hub = (folder / "vendor" / "session.js").read_text()
html = html.replace("<!--HUB_SCRIPT-->", "<script>\n" + hub + "\n</script>")
html = html.replace("//APP_JS", "\n".join(parts).replace("</script", "<\\/script"))
(root / (base + ".html")).write_text(html)
print(f"Built {base}.html ({len(html):,} characters)")
