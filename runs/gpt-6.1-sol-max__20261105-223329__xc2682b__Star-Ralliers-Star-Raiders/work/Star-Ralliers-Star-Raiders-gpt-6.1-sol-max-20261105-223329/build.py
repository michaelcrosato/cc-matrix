import base64
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STEM = ROOT.name


def font(name, url):
    p = ROOT / name
    if not p.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        p.write_bytes(urllib.request.urlopen(request).read())
    return "data:font/woff2;base64," + base64.b64encode(p.read_bytes()).decode()


style = (ROOT / "style.css").read_text()
for key, name, url in [
    (
        "FONT_DISPLAY",
        "display.woff2",
        "https://fonts.gstatic.com/s/barlowcondensed/v13/HTxyL3I-JCGChYJ8VI-L6OO_au7B6xTrf3fmu4kG.woff2",
    ),
    (
        "FONT_BODY",
        "body.woff2",
        "https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2",
    ),
]:
    style = style.replace(key, font(name, url))
code = "\n".join(
    (ROOT / f).read_text() for f in ["audio.js", "online.js", "metadata.js", "game.js"]
)
html = (
    (ROOT / "index.template.html")
    .read_text()
    .replace("/*HUB_CLIENT*/", (ROOT / "hub-session.js").read_text())
    .replace("/*STYLES*/", style)
    .replace("/*GAME_CODE*/", code)
)
html = html.replace(
    "</head>",
    "<!-- Embedded font licenses\n"
    + (ROOT / "barlowcondensed-OFL.txt").read_text()
    + "\n"
    + (ROOT / "spacegrotesk-OFL.txt").read_text()
    + "\n-->\n</head>",
)
(ROOT.parent / (STEM + ".html")).write_text(html)
(ROOT / "index.html").write_text(html)
