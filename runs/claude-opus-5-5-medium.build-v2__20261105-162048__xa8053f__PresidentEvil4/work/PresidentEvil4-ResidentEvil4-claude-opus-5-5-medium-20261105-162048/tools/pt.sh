#!/bin/bash
# playthrough, trimmed output
timeout ${T:-280} node tests/node/playthrough.mjs --v "$@" 2>&1 | grep -v "^file://\|\`);for\|^ *\^$\|pixel-engine.js" | sed 's#file:///home/micha/dev/cc-matrix/runs/claude-opus-5-5-medium.build-v2__20261105-162048__xa8053f/work/PresidentEvil4-ResidentEvil4-claude-opus-5-5-medium-20261105-162048/##' | cut -c1-${C:-260} | tail -${N:-14}
