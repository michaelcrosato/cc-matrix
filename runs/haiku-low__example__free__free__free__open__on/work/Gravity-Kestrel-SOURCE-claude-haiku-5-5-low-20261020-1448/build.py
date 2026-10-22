"""Bundle template.html + game.js into the single deliverable HTML in the work root."""
import os

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
name = os.path.basename(here)
with open(os.path.join(here, "template.html"), encoding="utf-8") as f:
    template = f.read()
with open(os.path.join(here, "game.js"), encoding="utf-8") as f:
    game = f.read()
if "/*__GAME__*/" not in template:
    raise SystemExit("placeholder missing")
out = os.path.join(root, f"{name}.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(template.replace("/*__GAME__*/", game))
print(out)
