# Samples the live game once a second: timeline progress, enemy count and ship state.
import sys, time, pathlib
from playwright.sync_api import sync_playwright
HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,VulkanFromANGLE,WebGPU',
        '--use-vulkan=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto(HTML)
    pg.wait_for_function("window.__starfock && window.__starfock.mode === 'title'", timeout=30000)
    time.sleep(0.5)
    pg.keyboard.press('Enter'); time.sleep(0.5)
    pg.keyboard.press('Enter')
    for i in range(14):
        time.sleep(1)
        print(pg.evaluate("""() => { const g = window.__starfock.game; if (!g) return 'nogame';
          return { mode: window.__starfock.mode, phase: g.phase, t: +g.t.toFixed(1), next: g.nextEvent, evs: g.stage.events.length,
            enemies: g.enemies.length, alive: g.enemies.filter(e=>!e.dead).length, kinds: g.enemies.slice(0,3).map(e=>[e.kind, +e.z.toFixed(1), +e.x.toFixed(1)]),
            shield: +g.ship.shield.toFixed(1), lives: g.lives, bullets: g.bulletsLive.filter(b=>b.active).length, scroll: +g.scroll.toFixed(1) } }"""))
    b.close()
