#!/usr/bin/env python3
"""How long the page takes to boot, in stages, n copies at once: tests/boot_time.py [copies]"""
import sys, time
from common import *
MARK = """
window.__t = {};
const iv = setInterval(() => {
  const n = performance.now();
  if (!__t.wasmBlockGone && !document.getElementById('game-wasm') && document.readyState !== 'loading') __t.wasmBlockGone = n;
  if (!__t.canvas && document.querySelector('canvas')) __t.canvas = n;
  if (!__t.status && window.__gameStatus) { __t.status = n; clearInterval(iv); }
}, 15);
"""
n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
with sync_playwright() as pw:
    b = pw.chromium.launch(args=FLAGS)
    pages = []
    for i in range(n):
        c = b.new_context(viewport={"width": 320, "height": 180})
        c.add_init_script(MARK)
        pages.append(c.new_page())
    for p in pages:
        p.goto(PAGE.as_uri() + "?scene=fit/medley", wait_until="commit")
    for p in pages:
        wait(p, lambda: p.evaluate("window.__t && window.__t.status"), 200)
        print({k: round(v) for k, v in p.evaluate("__t").items()})
    b.close()
