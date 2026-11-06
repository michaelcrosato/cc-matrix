#!/usr/bin/env python3
"""Sets each phase's stagger and repeat in the case files (a designer's pacing table, in one place).
usage: pace.py   (run from engine/)"""
import re
D = "crates/pav_core/src/games/surgery/content/cases/"
PACE = {
 0: {"gel": (0, 2), "hooks": (5.0, 2), "pool": (4.0, 2), "splinters": (5.0, 2), "suture": (6.0, 2), "last_bleed": (5.0, 1)},
 1: {"polyps": (4.0, 2), "more_polyps": (4.5, 2), "iv": (4.0, 2), "appendix": (7.0, 1), "inflamed": (6.0, 2), "artery": (4.0, 2)},
 2: {"scan": (6.0, 2), "scan2": (6.0, 2), "wounds": (5.0, 2), "after_stop": (5.0, 3)},
 3: {"open": (6.0, 2), "wounds": (0, 3), "wash": (5.0, 3)},
 4: {"flood": (4.0, 3), "flood2": (4.0, 3)},
 5: {"bones": (9.0, 2), "bones2": (9.0, 2), "cysts": (1.5, 5), "wash": (2.4, 5)},
 6: {"burns": (2.4, 6), "scars": (2.4, 6)},
 7: {},
}
for case, table in PACE.items():
    p = f"{D}case{case}.toml"
    s = open(p).read()
    s = re.sub(r"^(stagger|repeat) = .*\n", "", s, flags=re.M)
    for name, (stagger, repeat) in table.items():
        key = f'name = "{name}"\n'
        assert key in s, (case, name)
        s = s.replace(key, key + (f"stagger = {stagger}\n" if stagger else "") + (f"repeat = {repeat}\n" if repeat else ""), 1)
    open(p, "w").write(s)
