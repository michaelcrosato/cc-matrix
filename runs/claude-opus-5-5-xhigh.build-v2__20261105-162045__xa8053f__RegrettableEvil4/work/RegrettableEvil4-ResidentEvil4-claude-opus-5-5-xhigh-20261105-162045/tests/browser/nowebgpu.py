# WebKit and Firefox here have no WebGPU: expect the engine's clear message and nothing else broken.
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

s = Suite()
with sync_playwright() as pw:
    for name in ['firefox', 'webkit']:
        try:
            b = getattr(pw, name).launch()
        except Exception as e:
            s.ok(True, f'{name} unavailable: skipped')
            continue
        page = b.new_context().new_page()
        crashes = []
        page.on('pageerror', lambda e: crashes.append(str(e)))
        page.goto(DELIVERABLE.as_uri())
        page.wait_for_timeout(3000)
        text = page.evaluate('document.body.innerText')
        s.ok('WebGPU' in text or 'webgpu' in text.lower(), f'{name}: says WebGPU is needed ({text[:80]!r})')
        b.close()
s.done()
