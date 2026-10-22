# Drives the real UI with the keyboard: title -> briefing -> play, then fires, locks, bombs, rolls.
# Prints game state after each step and saves screenshots to /tmp.
import sys, time, pathlib, json
from playwright.sync_api import sync_playwright

HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
TAG = sys.argv[2] if len(sys.argv) > 2 else 'flow'
ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,VulkanFromANGLE,WebGPU',
        '--use-vulkan=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
STATE = """() => { const s = window.__starfock; const g = s.game; return { mode: s.mode,
  phase: g && g.phase, t: g && +g.t.toFixed(2), enemies: g && g.enemies.filter(e=>!e.dead).length,
  kills: g && g.kills, score: g && g.score, shield: g && +g.ship.shield.toFixed(1), lives: g && g.lives,
  bombs: g && g.bombs, locks: g && g.locks.length, shots: g && g.shots, rings: g && g.ringsGot, shipX: g && +g.ship.x.toFixed(2)}; }"""
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'deprecated parameters' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
    pg.goto(HTML)
    pg.wait_for_function("window.__starfock && window.__starfock.mode === 'title'", timeout=30000)
    time.sleep(0.5)
    pg.keyboard.press('Enter'); time.sleep(0.6)
    print('after Start:', pg.evaluate(STATE))
    pg.keyboard.press('Enter'); time.sleep(0.5)
    print('after Launch:', pg.evaluate(STATE))
    time.sleep(3)
    print('intro+3s:', pg.evaluate(STATE))
    pg.screenshot(path=f'/tmp/{TAG}-1-play.png')
    pg.keyboard.down('Space'); pg.keyboard.down('ArrowLeft'); time.sleep(1.2)
    pg.keyboard.up('ArrowLeft'); time.sleep(0.4)
    print('fire+move:', pg.evaluate(STATE))
    pg.screenshot(path=f'/tmp/{TAG}-2-fire.png')
    pg.keyboard.up('Space')
    pg.keyboard.down('KeyK'); time.sleep(1.6)
    pg.screenshot(path=f'/tmp/{TAG}-3-lock.png')
    pg.keyboard.up('KeyK'); time.sleep(0.3)
    print('missile release:', pg.evaluate(STATE))
    pg.keyboard.press('KeyQ'); time.sleep(0.2)
    pg.screenshot(path=f'/tmp/{TAG}-4-roll.png')
    pg.keyboard.press('KeyB'); time.sleep(0.4)
    print('after bomb:', pg.evaluate(STATE))
    pg.screenshot(path=f'/tmp/{TAG}-5-bomb.png')
    time.sleep(20)
    print('t+20s:', pg.evaluate(STATE))
    pg.screenshot(path=f'/tmp/{TAG}-6-later.png')
    print('ERRORS:', json.dumps(errs[:20], indent=1))
    b.close()
