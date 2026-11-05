#!/bin/bash
# bundle: the hub client, the engine and the game into one html file in the work root
set -e
cd "$(dirname "$0")"
NAME="BrewingBad-BreakingBad-claude-sonnet-5-5-medium-20261102-184349"
OUT="../$NAME.html"
{
cat <<'H'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
H
cat src/hub-session.js | sed '1i <script>' ; echo '</script>'
cat <<'H'
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Cook the blue, sell it, launder it, and earn the biggest fortune: cash, purity and rivals beaten all score.">
<meta name="hub:session-howto" content="Move: WASD or left stick. Aim: mouse or right stick. Wrench: click, J or Square. Flask: right click, K or R2. Use: E or Cross. Sprint: Shift or L1.">
<meta name="hub:session-minutes" content="8">
<title>Brewing Bad</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>
H
cat src/engine.js
echo '</script>'
echo '<script>'
echo '(() => {'
echo "'use strict';"
python3 -c "import json;print('const CREDITS = '+json.dumps(json.load(open('../exit-interview.json')),ensure_ascii=False)+';')" > src/05-credits.js
for f in src/00-boot.js src/05-credits.js src/10-world.js src/20-ent.js src/30-play.js src/40-minigames.js src/50-title.js src/60-start.js; do cat $f; echo; done
echo '})();'
echo '</script>'
echo '</body></html>'
} > "$OUT"
ls -la "$OUT"
