# Verifies the items not yet covered: flight invert, results/game-over screens, touch-only gate, stage 2 play.
import sys, time, pathlib, json
from playwright.sync_api import sync_playwright
HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,VulkanFromANGLE,WebGPU',
        '--use-vulkan=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
MOCK = """window.__pad = { id: 'mock', mapping: 'standard', connected: true, axes: [0,0,0,0],
  buttons: Array.from({length:17}, () => ({pressed:false, value:0})) };
navigator.getGamepads = () => [window.__pad];"""
S = "() => { const s = window.__starfock; return { mode: s.mode, menu: document.getElementById('menu').innerText.slice(0,160), x: s.game ? +s.game.ship.x.toFixed(2) : null }; }"
out = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    # 1. Invert X in flight: keyboard right should move ship left.
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.add_init_script(MOCK)
    pg.goto(HTML)
    pg.wait_for_function("window.__starfock && window.__starfock.mode === 'title'", timeout=30000)
    pg.evaluate("window.__starfock.settings.invertX = false")
    pg.evaluate("window.__starfock.startMission(0)"); time.sleep(2.5)
    pg.keyboard.down('ArrowRight'); time.sleep(0.8); pg.keyboard.up('ArrowRight'); time.sleep(0.3)
    out['noInvert_right_x'] = pg.evaluate(S)['x']
    pg.evaluate("window.__starfock.game.ship.x = 0; window.__starfock.game.ship.vx = 0")
    pg.evaluate("window.__starfock.settings.invertX = true")
    time.sleep(0.3)
    pg.keyboard.down('ArrowRight'); time.sleep(0.8); pg.keyboard.up('ArrowRight'); time.sleep(0.3)
    out['invert_right_x'] = pg.evaluate(S)['x']
    # 2. Results screen via a clear, then game-over via failure.
    pg.evaluate("window.__starfock.game.finish('clear')"); time.sleep(0.6)
    out['results'] = pg.evaluate(S)
    pg.screenshot(path='/tmp/v-results.png')
    pg.evaluate("window.__starfock.startMission(0)"); time.sleep(2.5)
    pg.evaluate("window.__starfock.game.finish('fail')"); time.sleep(0.6)
    out['gameover'] = pg.evaluate(S)
    pg.screenshot(path='/tmp/v-gameover.png')
    # 3. Stage 2 launched directly, after a few seconds of play.
    pg.evaluate("window.__starfock.startMission(1)"); time.sleep(8)
    out['stage2'] = pg.evaluate("() => { const g = window.__starfock.game; return { stage: g.stageIndex, t: +g.t.toFixed(1), phase: g.phase, asteroids: g.physics.entries.filter(e=>e.kind==='asteroid').length }; }")
    pg.screenshot(path='/tmp/v-stage2.png')
    pg.close()
    # 4. Touch-only device: no gamepad, touch emulation, coarse pointer only.
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    tp = ctx.new_page()
    tp.add_init_script("navigator.getGamepads = () => [];")
    tp.goto(HTML)
    tp.wait_for_function("window.__starfock && (window.__starfock.mode === 'touch' || window.__starfock.mode === 'title')", timeout=30000)
    time.sleep(1)
    out['touch_mode'] = tp.evaluate("window.__starfock.mode")
    out['touch_text'] = tp.evaluate("document.getElementById('menu').innerText.slice(0,160)")
    tp.screenshot(path='/tmp/v-touch.png')
    print(json.dumps(out, indent=1))
    b.close()
