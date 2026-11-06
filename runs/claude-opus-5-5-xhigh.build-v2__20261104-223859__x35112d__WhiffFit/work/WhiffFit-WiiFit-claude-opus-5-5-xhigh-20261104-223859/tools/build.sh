#!/usr/bin/env bash
# Puts the exit interview and credits in the page's about-data block, then builds the one-file
# game beside the dev folder. Usage: tools/build.sh
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
name=$(basename "$here")
python3 - "$here" <<'PY'
import json, pathlib, re, sys
here = pathlib.Path(sys.argv[1])
about = {}
ex = here.parent / "exit-interview.json"
if ex.exists():
    about = json.loads(ex.read_text(encoding="utf-8"))
about["credits"] = (here / "notes/credits.txt").read_text(encoding="utf-8").strip()
block = json.dumps(about, ensure_ascii=False).replace("</", "<\\/")
page = here / "engine/web/index.html"
text = page.read_text(encoding="utf-8")
text, n = re.subn(r'<script id="about-data" type="application/json">.*?</script>',
                  lambda m: f'<script id="about-data" type="application/json">{block}</script>', text, flags=re.S)
assert n == 1, "about-data block"
page.write_text(text, encoding="utf-8")
PY
cd "$here/engine"
CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-8} scripts/build-web.sh --single-file --scene fit \
  --title "Whiff Fit — A balance comedy at Tippy Cay" \
  --description "Five days at a resort staffed by talking gym equipment. Lean, breathe, squat, dive and stand very still until your Balance Age lets you leave." \
  --theme-color "#46bec8" --out "$here/../$name.html"
