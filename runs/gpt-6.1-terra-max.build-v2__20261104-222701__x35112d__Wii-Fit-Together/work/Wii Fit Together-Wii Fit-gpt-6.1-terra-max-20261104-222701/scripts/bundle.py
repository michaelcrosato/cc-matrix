from pathlib import Path
import json


dev = Path(__file__).resolve().parent.parent
root = dev.parent
html = (dev / "game.raw.html").read_text(encoding="utf-8")
css = (dev / "web/game.css").read_text(encoding="utf-8")
hub = (dev / "hub/session.js").read_text(encoding="utf-8")
game = (dev / "web/game.js").read_text(encoding="utf-8")
about = json.loads((root / "exit-interview.json").read_text(encoding="utf-8"))
licenses = {
    "Hack": (dev / "web/licenses/Hack-Regular.txt").read_text(encoding="utf-8"),
    "Noto Emoji": (dev / "web/licenses/OFL.txt").read_text(encoding="utf-8"),
    "Ubuntu Light": (dev / "web/licenses/UFL.txt").read_text(encoding="utf-8"),
    "Emoji Icon Font": (dev / "web/licenses/emoji-icon-font-mit-license.txt").read_text(encoding="utf-8"),
}

for script in (hub, game):
    if "</script" in script.lower():
        raise ValueError("Inline script contains an HTML closing script tag")

about_json = json.dumps(about, ensure_ascii=True).replace("</", "<\\/")
licenses_json = json.dumps(licenses, ensure_ascii=True).replace("</", "<\\/")
metadata = '''<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Highest total across three balance events wins">
<meta name="hub:session-howto" content="Lean: stick, WASD or mouse. Act: Cross, Space or click">
<meta name="hub:webgpu" content="required">'''
html = html.replace("</head>", f'<script>{hub}</script>{metadata}<script id="about-data" type="application/json">{about_json}</script><style>{css}\n#msg,#turn{{display:none!important}}</style></head>', 1)
body_tag = "\n<body>\n"
if html.count(body_tag) != 1:
    raise ValueError("Could not locate the engine page body")
html = html.replace(body_tag, '\n<body><canvas id="world" aria-hidden="true"></canvas><main id="app"></main>\n', 1)
html = html.replace("if (!navigator.gpu) {", "if (!navigator.gpu || !(await navigator.gpu.requestAdapter().catch(() => null))) {", 1)
html = html.replace("document.querySelector('canvas')", "document.querySelector('canvas:not(#world)')")
html = html.replace("c.focus();", "")
html = html.replace("if (matchMedia('(pointer: coarse)').matches)", "if (false)")
html = html.replace("</body>", f"<script>window.__aboutData={about_json};window.__licenseData={licenses_json};</script><script>{game}</script></body>", 1)
(root / f"{dev.name}.html").write_text(html, encoding="utf-8")
