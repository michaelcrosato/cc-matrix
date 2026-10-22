# Lets attract mode run unattended: checks both stages play through, the carrier boss falls,
# and the loop returns to the title. Logs progress every 10 seconds of wall time.
import sys, time, pathlib
from playwright.sync_api import sync_playwright
HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
LIMIT = float(sys.argv[2]) if len(sys.argv) > 2 else 600
ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,VulkanFromANGLE,WebGPU',
        '--use-vulkan=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
SAMPLE = """() => { const s = window.__starfock; const g = s.game; return { mode: s.mode, stage: g && g.stageIndex,
  phase: g && g.phase, t: g && +g.t.toFixed(1), kills: g && g.kills, score: g && g.score, lives: g && g.lives,
  boss: g && g.bossStatus(), rings: g && g.ringsGot + '/' + g.ringsTotal, shield: g && Math.round(g.ship.shield)}; }"""
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
    pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type == 'error' else None)
    pg.goto(HTML)
    pg.wait_for_function("window.__starfock && window.__starfock.mode === 'title'", timeout=30000)
    t0 = time.time()
    seen = set()
    shots = 0
    while time.time() - t0 < LIMIT:
        time.sleep(10)
        st = pg.evaluate(SAMPLE)
        print(f'{time.time()-t0:6.0f}s', st, flush=True)
        if st['mode'] == 'attract' and st.get('boss') and shots < 2 and st['stage'] == 1:
            pg.screenshot(path=f'/tmp/attract-boss-{shots}.png')
            shots += 1
        if st['mode'] == 'attract' and st['stage'] is not None:
            seen.add(st['stage'])
        if st['mode'] == 'title' and len(seen) >= 2:
            print('LOOP RETURNED TO TITLE after stages', sorted(seen), flush=True)
            break
    pg.screenshot(path='/tmp/attract-end.png')
    print('ERRORS:', errs[:10], flush=True)
    b.close()
