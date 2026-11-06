import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAME = ROOT.name
html = (ROOT / "shell.html").read_text()
html = html.replace(
    "<!--SESSION-->",
    "<script>\n" + (ROOT / "vendor/session.js").read_text() + "\n</script>",
)
html = html.replace("/*STYLES*/", (ROOT / "style.css").read_text())
libs = {
    key: base64.b64encode((ROOT / ("vendor/" + file)).read_bytes()).decode()
    for key, file in [
        ("core", "three.core.js"),
        ("three", "three.webgpu.js"),
        ("rapier", "rapier.mjs"),
    ]
}
boot = (
    "const embedded="
    + repr(libs)
    + ";\n"
    + r"""
const moduleURL = (source) => URL.createObjectURL(new Blob([source], {type:'text/javascript'}));
const decodeModule = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
const coreURL = moduleURL(decodeModule(embedded.core));
const threeURL = moduleURL(decodeModule(embedded.three).replaceAll("'./three.core.js'", JSON.stringify(coreURL)));
const [THREE, rapierModule] = await Promise.all([import(threeURL), import(moduleURL(decodeModule(embedded.rapier)))]);
const RAPIER = rapierModule.default;
await RAPIER.init();
"""
)
import json

interview = json.loads((ROOT.parent / "exit-interview.json").read_text())
js = (
    boot
    + "\n"
    + (ROOT / "audio.js").read_text()
    + "\n"
    + (ROOT / "world.js").read_text()
    + "\n"
    + (ROOT / "game.js").read_text()
)
js, count = re.subn(
    r"/\*INTERVIEW\*/\s*null", lambda _: json.dumps(interview, ensure_ascii=True), js
)
assert count == 1, "The exit interview must be embedded exactly once"
html = html.replace("/*GAME*/", js)
licenses = (
    "Third-party notices\n\nThree.js (MIT):\n"
    + (ROOT / "vendor/LICENSE-three.txt").read_text()
    + "\n\nRapier 0.19.3 (Apache 2.0):\n"
    + (ROOT / "vendor/LICENSE-rapier-Apache-2.0.txt").read_text()
)
assert "-->" not in licenses
html = html.replace("</body>", "<!--\n" + licenses + "\n-->\n</body>")
(ROOT.parent / (NAME + ".html")).write_text(html)
print("Built " + NAME + ".html")
