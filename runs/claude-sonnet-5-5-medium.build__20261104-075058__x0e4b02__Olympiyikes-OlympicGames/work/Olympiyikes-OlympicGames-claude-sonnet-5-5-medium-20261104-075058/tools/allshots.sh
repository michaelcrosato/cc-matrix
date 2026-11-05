#!/bin/bash
# screenshot every event mid-play with the bot driving (visual QA)
cd "$(dirname "$0")/.."; export TMPDIR=$PWD/.tmp
for ev in "$@"; do node tools/shots.mjs "index.html#ev/$ev" .tmp/ev-$ev "eval:OLY.cheat.perfect=true,wait:8000,shot:a,wait:5000,shot:b" ; done
