# The AI Hub harness, exactly as the hub runs it. Each scenario until body[data-complete], needs __hubCheck.pass.
import os, shutil, sys, time, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

s = Suite()

def settle(limit=50, wait=120):
    """Every scenario runs once, as the hub would run it. The harness gives each copy 20 s to report ready, the engine
    compiles its shaders first, and other agents share this machine: so hold on for a quieter moment, within reason,
    rather than start four software-GPU copies at the worst time. A failure reports the load it ran under."""
    start = time.time()
    while os.getloadavg()[0] > limit and time.time() - start < wait:
        time.sleep(5)

folder = ROOT / '.scratch' / 'hubtest'
folder.mkdir(parents=True, exist_ok=True)
shutil.copy(DELIVERABLE, folder / 'game.html')
for f in ['harness.html', 'bridge.js', 'round.js']:
    shutil.copy(ROOT / 'vendor' / 'hub' / f, folder / f)
srv = Server(folder)
SCENARIOS = [
    ('2 players', 'players=2&auto=1'),
    ('4 players, bad network', 'players=4&latency=150&jitter=50&loss=5&auto=1'),
    ('host leaves', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1'),
    ('server host', 'players=2&scenario=server&auto=1'),
]
only = sys.argv[1] if len(sys.argv) > 1 else None
try:
    with sync_playwright() as pw:
        b = launch(pw)
        for name, q in SCENARIOS:
            if only and only not in name: continue
            settle()
            ctx = b.new_context(viewport={'width': 1280, 'height': 800})
            page = ctx.new_page()
            page.goto(f'{srv.url}/harness.html?game=game.html&{q}')
            s.ok(page.title() != '', f'{name}: harness page loaded')
            done = True
            try:
                page.wait_for_function("document.body.dataset.complete === 'true'", timeout=240000)
            except Exception as e:
                done = False
                s.ok(False, f'{name}: did not complete: {str(e)[:120]}')
            if done:
                rep = page.evaluate('window.__hubCheck')
                bad = [c for c in (rep or {}).get('checks', []) if not c.get('ok', c.get('pass', True))]
                load = os.getloadavg()[0]
                s.ok(bool(rep and rep.get('pass')), name if rep and rep.get('pass') else f'{name} (load {load:.0f}): {json.dumps(bad)[:900]}')
            ctx.close()
        b.close()
finally:
    srv.stop()
s.done()
