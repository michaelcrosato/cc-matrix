#!/bin/bash
timeout ${2:-120} node ${1:-tests/play/smoke.mjs} 2>&1 | sed -E 's#file:///home/micha/dev/cc-matrix/runs/[^ ]*/HonkIfYouOwe[^/]*/##g' | cut -c1-240 | tail -${3:-16}
