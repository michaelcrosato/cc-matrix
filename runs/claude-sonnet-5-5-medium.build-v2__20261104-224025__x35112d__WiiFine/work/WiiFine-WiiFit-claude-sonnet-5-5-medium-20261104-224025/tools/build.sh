#!/usr/bin/env bash
# Builds the single-file game. Copies exit-interview.json into the page's about-data block,
# then runs the engine's single-file build and writes the page beside this folder.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
name="WiiFine-WiiFit-claude-sonnet-5-5-medium-20261104-224025"
out="${1:-$here/../$name.html}"
cd "$here"
if [ -f exit-interview.json ]; then
  python3 - <<'PY'
import json, re
iv = json.load(open("exit-interview.json"))
about = {k: iv[k] for k in ("sourceInformation", "testingFeedback", "engineFeedback", "promptFeedback")}
p = "engine/web/index.html"
s = open(p, encoding="utf-8").read()
block = '<script id="about-data" type="application/json">' + json.dumps(about, indent=1, ensure_ascii=False).replace("</", "<\\/") + "</script>"
s2, n = re.subn(r'<script id="about-data" type="application/json">.*?</script>', lambda m: block, s, count=1, flags=re.S)
assert n == 1, "about-data block not found"
open(p, "w", encoding="utf-8").write(s2)
PY
fi
cd engine
CARGO_BUILD_JOBS=8 scripts/build-web.sh --single-file --scene fit \
  --title "Wii Fine - A stay at Tippy Cay" \
  --description "Wii Fine: a balance-and-wellness comedy. Five days at Tippy Cay, where the gym equipment talks and the only verb is leaning." \
  --theme-color "#8fdde0" --out "$out"
echo "wrote $out"
