# Plays the deliverable in headless Chromium with real key presses: title -> difficulty -> lobby, then a room: WASD moves the
# contestant, the arrows fire, Escape opens the pause menu and the arrows move its focus. Prints what changed and any errors.
import sys, os, json
from playwright.sync_api import sync_playwright
html = os.path.abspath(sys.argv[1]); out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots')
os.makedirs(out, exist_ok=True)
res = {'errors': []}
def snap(pg): return pg.evaluate("() => window.MT.G.debug.snapshot()")
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: res['errors'].append('pageerror: ' + str(e)))
    pg.on('console', lambda m: res['errors'].append('console.error: ' + m.text) if m.type == 'error' else None)
    pg.goto('file://' + html + '#title'); pg.wait_for_timeout(1500)
    res['title_scene'] = pg.evaluate("() => window.MT.G.sceneName")
    pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    res['after_enter'] = pg.evaluate("() => window.MT.G.sceneName")
    pg.keyboard.press('Enter'); pg.wait_for_timeout(700)   # difficulty: CONTESTANT
    res['after_difficulty'] = pg.evaluate("() => window.MT.G.sceneName")
    pg.keyboard.press('Enter'); pg.wait_for_timeout(700)   # lobby: ready
    res['lobby_scene'] = pg.evaluate("() => window.MT.G.sceneName")
    pg.screenshot(path=os.path.join(out, 'browser-lobby.png'))
    # a room, started by the deep link, with the keys
    pg = b.new_page(viewport={'width': 1280, 'height': 720})   # a fresh page: the hash alone does not reload the game
    pg.on('pageerror', lambda e: res['errors'].append('pageerror: ' + str(e)))
    pg.goto('file://' + html + '#room=1-1'); pg.wait_for_timeout(1200)
    for i in range(400):
        if pg.evaluate("() => !!window.MT.PLAY.W"): break
        pg.wait_for_timeout(50)
    pg.wait_for_timeout(2600)   # the walk-in and the first wave
    x0 = snap(pg)['players'][0]['x']
    pg.keyboard.down('KeyD'); pg.wait_for_timeout(600); pg.keyboard.up('KeyD'); pg.wait_for_timeout(100)
    s1 = snap(pg); res['moved_right_by'] = round(s1['players'][0]['x'] - x0, 1)
    pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(500)
    s2 = snap(pg); res['bullets_while_arrow_up'] = s2['bullets']
    pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(out, 'browser-room-fire.png')); pg.keyboard.up('ArrowUp')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    res['paused_after_escape'] = pg.evaluate("() => !!window.MT.G.paused")
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200); pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(out, 'browser-pause.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    res['errors'] = res['errors'][:8]
    res['final_snapshot'] = {k: snap(pg).get(k) for k in ['scene', 'room', 'phase']}
    b.close()
print(json.dumps(res, indent=1))
