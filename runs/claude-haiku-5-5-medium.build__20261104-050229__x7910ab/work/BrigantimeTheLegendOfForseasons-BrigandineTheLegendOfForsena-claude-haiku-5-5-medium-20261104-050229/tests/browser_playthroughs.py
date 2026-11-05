# The browser playthroughs (the plan's five): five campaigns played through the real scenes in a real browser, each to its
# ending. An automated player (the planner) musters, marches and delegates every battle through the game's own screens.
# Usage: python3 tests/browser_playthroughs.py <game.html>. Exit code 1 if a playthrough fails to end or the page errors.
import sys, os, json
from playwright.sync_api import sync_playwright

html = os.path.abspath(sys.argv[1])
RUNS = [
    {'name': 'Verdance, one player', 'humans': ['verdance'], 'seed': 11},
    {'name': 'Solmark, one player', 'humans': ['solmark'], 'seed': 12},
    {'name': 'Amberlyn, one player', 'humans': ['amberlyn'], 'seed': 13},
    {'name': 'Hoarfast, one player', 'humans': ['hoarfast'], 'seed': 14},
    {'name': 'Verdance and Solmark, hot-seat', 'humans': ['verdance', 'solmark'], 'seed': 15},
]
failed = 0
with sync_playwright() as p:
    browser = p.chromium.launch()
    for run in RUNS:
        pg = browser.new_page(viewport={'width': 1280, 'height': 720})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        pg.goto('file://' + html)
        pg.wait_for_timeout(1200)
        pg.evaluate("(() => { const g = My3D2dge.current; g.debug.newCampaign({humans: %s, seed: %d}); g.go('campaign', {}); })()" % (json.dumps(run['humans']), run['seed']))
        steps, outcome, last = 0, None, None
        while steps < 4000:
            steps += 1
            status = pg.evaluate("My3D2dge.Brigantime && My3D2dge.current.debug.autopilotStep()")
            if status == 'ending' or status == 'ended':
                snap = pg.evaluate("(() => { const cs = My3D2dge.current.debug.campaign(); return { outcome: cs.outcome(), seasons: cs.s.seasonsPlayed, year: cs.s.year }; })()")
                outcome = snap
                break
            pg.wait_for_timeout(40)
        errs = pg.evaluate("My3D2dge.current.errors.length")
        ok = outcome is not None and errs == 0 and not errors
        if not ok: failed += 1
        print(('PASS ' if ok else 'FAIL ') + run['name'] + ': ' + (json.dumps(outcome) if outcome else 'did not end in %d steps' % steps) +
              ('' if not errors and errs == 0 else ' | errors: ' + str(errs) + ' ' + ' / '.join(errors[:2])))
        pg.close()
    browser.close()
print('%d playthroughs, %d failed' % (len(RUNS), failed))
sys.exit(1 if failed else 0)
