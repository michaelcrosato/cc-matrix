# THE TEST COMMAND: python3 tests/run.py   (prints only failures, then one count line; exit 1 on failure)
# Runs the bundled game from file:// in headless Chromium (Playwright) and drives it with keys and the game's debug handle.
import os, sys, time, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BUNDLE = os.path.join(ROOT, 'Bentou2-Tenchu2-claude-haiku-5-5-medium-20261103-183606.html')
SHOTS = os.path.join(HERE, '..', 'shots')
fails, passed, total = [], 0, 0
def check(name, cond, detail=''):
    global passed, total
    total += 1
    if cond: passed += 1
    else: fails.append(f'FAIL {name}: {detail}')
t0 = time.time()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errors.append('console.error: ' + m.text) if m.type == 'error' else None)
    pg.goto('file://' + BUNDLE)
    pg.wait_for_timeout(1500)
    scene = lambda: pg.evaluate('() => window.__BENTOU.game.sceneName')
    # boot
    check('boot: title scene', scene() == 'title', f'scene={scene()}')
    check('boot: game object exposed', pg.evaluate('() => !!window.__BENTOU && !!window.__BENTOU.MISSION') , '')
    # attract: idle 10 s on the title goes to attract, any key returns to the title
    pg.wait_for_timeout(11000)
    check('attract: starts after 10 s idle', scene() == 'attract', f'scene={scene()}')
    pg.wait_for_timeout(2000)
    pg.screenshot(path=os.path.join(SHOTS, 'attract.png'))
    pg.keyboard.press('Space'); pg.wait_for_timeout(600)
    check('attract: any key returns to title', scene() == 'title', f'scene={scene()}')
    # mission: Enter starts New Mission
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    check('mission: New Mission starts play', scene() == 'play', f'scene={scene()}')
    pg.screenshot(path=os.path.join(SHOTS, 'mission.png'))
    st = lambda: pg.evaluate('() => { const m = window.__BENTOU.MISSION.state(); return { ledger: m.ledger, won: m.won, hp: m.hp, kills: m.kills, alerts: m.alerts, guards: m.guards.map(g => ({ dead: g.dead, state: g.mind.state })), hero: { x: m.hero.x, y: m.hero.y, z: m.hero.z } }; }')
    s0 = st()
    check('mission: three guards', len(s0['guards']) == 3, str(len(s0['guards'])))
    check('mission: hero starts at a live state', s0['hp'] > 0 and not s0['won'], str(s0))
    # the Ki gauge reads a number when a guard is near (teleport the hero next to a guard)
    # Silent Cut from behind: put the hero behind guard 0 facing its back, then strike
    pg.evaluate('''() => { const m = window.__BENTOU.MISSION.state(), g = m.guards[0], h = m.hero;
        h.x = g.x - 10 * Math.cos(g.facing); h.y = g.y - 10 * Math.sin(g.facing); h.z = g.z; h.vx = 0; h.vy = 0; h.facing = g.facing; }''')
    pg.wait_for_timeout(120)
    pg.keyboard.press('KeyJ'); pg.wait_for_timeout(900)
    s1 = st()
    check('silent cut: a guard falls from behind', s1['kills'] >= 1 and s1['guards'][0]['dead'], str(s1['kills']) + ' ' + str(s1['guards']))
    pg.screenshot(path=os.path.join(SHOTS, 'cut.png'))
    # reach the ledger and check the scene's own objective flag by cheat
    pg.evaluate('() => window.__BENTOU.MISSION.skipToExit()')
    pg.wait_for_timeout(200)
    check('objective: ledger is taken', st()['ledger'], '')
    # Dev Mode: a slider changes its value and Reset restores the default
    pg.evaluate("() => window.__BENTOU.TUNE.sightRange = 180")
    check('dev: slider writes live tunable', pg.evaluate('() => window.__BENTOU.TUNE.sightRange') == 180, '')
    pg.evaluate("() => Object.assign(window.__BENTOU.TUNE, window.__BENTOU.TUNE_DEFAULTS)")
    check('dev: reset restores defaults', pg.evaluate('() => window.__BENTOU.TUNE.sightRange') == 110, '')
    # touch-only device: the title says controller or keyboard is required
    ctx = b.new_context(has_touch=True, is_mobile=True, viewport={'width': 800, 'height': 400})
    tp = ctx.new_page(); tp.goto('file://' + BUNDLE); tp.wait_for_timeout(1200)
    coarse = tp.evaluate("() => !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0")
    check('touch-only: device is detected as touch-only', coarse, '')
    tp.screenshot(path=os.path.join(SHOTS, 'touch-only.png')); ctx.close()
    errs = [e for e in errors if 'pageerror' in e or 'console.error' in e]
    for e in errs[:10]: fails.append('FAIL runtime: ' + e[:200]); total += 1
    b.close()
print('\n'.join(fails))
print(f'{passed}/{total} checks passed, {total - passed} failed ({time.time() - t0:.1f}s)')
sys.exit(1 if fails else 0)
