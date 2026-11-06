"""Screenshots at the end, by eye (PLAN.md section 16). Usage: shots.py <html> <outdir>"""
import os, sys, json
from playwright.sync_api import sync_playwright
html = os.path.abspath(sys.argv[1]); out = sys.argv[2]
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), args=['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:500]))
    pg.goto('file://' + html + '?gfx.warmUp=asked&gfx.governor=false&quality=medium')
    pg.wait_for_function('() => window.__game && window.__engine && window.__engine.ready', timeout=180000)
    pg.wait_for_timeout(2000)
    shot = lambda name: pg.screenshot(path=f'{out}/{name}.png')
    shot('title')
    k = lambda code, w=300: (pg.keyboard.press(code), pg.wait_for_timeout(w))
    k('Enter', 500); shot('pier'); k('ArrowDown'); k('ArrowDown'); k('Enter', 3500); shot('island')
    k('Tab', 500); shot('programme'); k('Escape')
    def pick(row, wait=500):
        # Clicks a menu row, turning the pause menu's pages until it shows: menus are paged at six rows.
        for _ in range(4):
            box = pg.evaluate("(id) => { const e = document.querySelector(`[data-ui=item][data-id=\"${id}\"]`); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }", row)
            if box:
                pg.mouse.click(box[0], box[1]); pg.wait_for_timeout(wait)
                return
            if row == '__more':
                break
            pick('__more', 300)
        raise RuntimeError(f'no menu row {row}')
    k('Escape', 500); shot('pause'); pick('dev'); shot('dev'); pick('sliders'); shot('sliders'); k('Escape'); k('Escape'); k('Escape', 500)
    act = lambda n, a=None: pg.evaluate('([n, a]) => __engine.actions.run(n, a)', [n, a or {}])
    def play(ev, wait, name=None, end=True):
        act('game.start', {'event': ev})
        pg.evaluate("() => __engine.set('game.botSeat', true)")
        pg.wait_for_timeout(wait)
        shot(name or ev)
        pg.evaluate("() => __engine.set('game.botSeat', false)")
        if end:
            act('game.leave'); pg.wait_for_timeout(300)
    play('poseA', 15000, 'pose')
    act('game.start', {'event': 'pond'}); pg.wait_for_timeout(9500); shot('pond-lure'); act('game.leave')
    play('line', 16000)
    play('plunge', 9000)
    play('reps', 10000)
    play('hoop', 12000)
    play('step', 12000)
    act('game.group', {'seats': [{'kind': 'local'}, {'kind': 'pad'}, {'kind': 'cpu', 'skill': 'human', 'sway': 1.0}, {'kind': 'cpu', 'skill': 'human', 'sway': 1.2}]}); pg.wait_for_timeout(14000); shot('group'); act('game.leave'); pg.wait_for_timeout(300)
    act('game.start', {'event': 'tilt'}); pg.wait_for_timeout(800); act('game.tiltStep', {'phase': 'stone'}); pg.evaluate("() => __engine.set('game.botSeat', true)"); pg.wait_for_timeout(9000); shot('tilt-wide'); pg.evaluate("() => __engine.set('game.botSeat', false)"); act('game.leave'); pg.wait_for_timeout(300)
    act('game.start', {'event': 'morning'}); pg.wait_for_timeout(600); act('game.finish', {'score': 760}); pg.wait_for_timeout(3600); shot('results-age')
    pg.wait_for_timeout(500); k('Enter', 800)
    act('game.start', {'event': 'garden'}); pg.wait_for_timeout(600); act('game.finish', {'score': 760}); pg.wait_for_timeout(2600); shot('results')
    pg.wait_for_timeout(300); k('Enter', 800)
    k('Escape', 500); pick('about'); shot('about')
    for _ in range(3): k('ArrowRight', 200)
    shot('about-feedback')
    for _ in range(8): k('ArrowRight', 200)
    shot('about-credits'); k('Escape'); k('Escape')
    print(json.dumps(pg.evaluate('() => __engine.errors.length')))
    b.close()
