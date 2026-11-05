#!/bin/bash
# bundles the engine, the AI Hub client and src/*.js into one html file in the folder above
set -e
cd "$(dirname "$0")"
OUT=../DickWhitmansWildRide-MadMen-claude-sonnet-5-5-medium-20261102-185709.html
REF=../ref
python3 - "$OUT" <<'PY'
import sys,glob,json,re
out=sys.argv[1]
ref='../ref'
session=open(ref+'/session.js').read()
engine=open(ref+'/my-3d2dge.js').read()
about=open('about.json').read()
src=''
for f in sorted(glob.glob('src/*.js')):
    s=open(f).read()
    if '45-about' in f: s=s.replace('ABOUT_JSON_PLACEHOLDER',about)
    src+='\n/* ===== '+f+' ===== */\n'+s
title="Dick Whitman's Wild Ride"
html='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
'''+session.replace('</script','<\\/script')+'''
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Get through one Thursday on Madison Avenue with the highest score: win both pitches, keep your composure, and keep your secrets.">
<meta name="hub:session-howto" content="Move: left stick or WASD. Talk or use: Cross or Space/E. Smoke: Square or F. Notebook: Triangle or Tab. Camera: R3 or V. Mouse: click people and things.">
<meta name="hub:session-minutes" content="9">
<title>'''+title+'''</title>
<style>html, body { margin: 0; height: 100%; background: #07060c; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>
'''+engine.replace('</script','<\\/script')+'''
</script>
<script>
'''+src.replace('</script','<\\/script')+'''
</script>
</body>
</html>
'''
open(out,'w').write(html)
print('wrote',out,len(html)//1024,'KB')
PY
