#!/usr/bin/env bash
# Prints the balance table compactly: bal.sh <seeds> [skills] [cases]
./target/debug/pav balance seeds=${1:-4} skills=${2:-1.0,0.7,0.4} ${3:+cases=$3} 2>&1 | python3 -c "
import json,sys
d=json.load(sys.stdin)
t=[0]*9
for c in d:
    print(c['case'],c['suggested_par'],' | '.join(f\"{r['skill']}:{r['wins']} {r['secs']}s v{r['vitals']} {r['score']}\" for r in c['rows']), [r['loss'][:46] for r in c['rows'] if r['loss']])
"
