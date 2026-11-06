"""Standalone campaign, attract-loop, and rendered-field regression checks.
Run with ~/.local/share/pipx/venvs/playwright/bin/python browser-campaign-tests.py.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = (ROOT.parent / 'Super-Breakbeat-Super-Breakout-gpt-6.1-sol-ultra-20261106-011159.html').as_uri() + '?renderer=webgl'
FAILURES = []
COUNT = 0
EVIDENCE = {}


def check(name, result):
    global COUNT
    COUNT += 1
    if not result:
        FAILURES.append(name)
        print(f'FAIL: {name}')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=[
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        '--autoplay-policy=no-user-gesture-required',
    ])
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.clock.install()
        page.goto(GAME, wait_until='load')
        page.wait_for_function('Boolean(window.__game)', timeout=120000)
        check('root standalone HTML boots from file URL', page.evaluate('__game.screen === "title"'))
        check('explicit WebGL screenshot backend selected', page.evaluate('__game.scene.backend.includes("WebGL")'))

        page.clock.fast_forward(9000)
        check('attract does not start before ten seconds', page.evaluate('!__game.attract'))
        page.clock.fast_forward(1200)
        page.wait_for_function('__game.attract', timeout=2000)
        check('ten second title idle starts infinite AI demo', page.evaluate('__game.attract && __game.core.autoplay && __game.core.infinite'))
        stages = [page.evaluate('__game.core.stage')]
        for _ in range(4):
            page.clock.fast_forward(16200)
            stages.append(page.evaluate('__game.core.stage'))
        EVIDENCE['attractStages'] = stages
        check('attract loops across all four mechanics then repeats', stages == [0, 1, 2, 3, 0])
        page.keyboard.press('ArrowLeft')
        check('any input exits attract to a clean title', page.evaluate('!__game.attract && __game.screen === "title" && !__game.core.autoplay && !__game.core.infinite && __game.core.state === "serve"'))

        page.locator('#title [data-action=start]').click()
        check('real start button begins first sector', page.evaluate('__game.screen === "game" && __game.core.stage === 0 && __game.core.state === "serve"'))
        page.keyboard.press('Escape')
        page.locator('#panel [data-action=dev]').click()
        page.locator('#autoplay').check()
        page.locator('#infinite').check()
        page.locator('#panel [data-action=resume]').click()
        check('pause developer tools enable actual AI and infinite lives', page.evaluate('__game.core.autoplay && __game.core.infinite && !__game.paused'))
        page.keyboard.press('Space')
        page.clock.run_for(100)

        # Read back an actual rendered WebGL frame immediately after render.
        # drawImage happens in the same JS task before the browser clears its buffer.
        visual = page.evaluate('''() => {
          __game.scene.render(1/120);
          const src=__game.scene.renderer.domElement;
          const sample=document.createElement('canvas');sample.width=64;sample.height=64;
          const ctx=sample.getContext('2d');ctx.drawImage(src,0,0,64,64);
          const pixels=ctx.getImageData(0,0,64,64).data;
          const colors=new Set();let lit=0;
          for(let i=0;i<pixels.length;i+=4){colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);if(pixels[i]+pixels[i+1]+pixels[i+2]>20)lit++;}
          return {colors:colors.size,lit,drawCalls:__game.scene.diagnostics().drawCalls,bricks:__game.scene.brickMeshes.size};
        }''')
        EVIDENCE['fieldPixels'] = visual
        check('rendered playfield contains real colored geometry', visual['colors'] > 12 and visual['lit'] > 1000 and visual['drawCalls'] > 20 and visual['bricks'] > 40)
        page.screenshot(path=str(ROOT / 'campaign-field.png'))

        cleared = []
        natural_ticks = 0
        for _ in range(70):
            state = page.evaluate('''() => {
              const g=__game.core;let ticks=0;
              for(;ticks<1200 && !['cleared','won','lost'].includes(g.state);ticks++){
                g.update(1/120,{});
                if(g.charge>=1)g.pulse();
              }
              return {state:g.state,stage:g.stage,ticks,alive:g.bricks.filter(b=>b.alive).length,stats:{...g.stats}};
            }''')
            natural_ticks += state['ticks']
            # Let the actual main loop consume physics events, animate the scene,
            # display FIELD CLEAR, and own all sector transitions.
            page.clock.run_for(20)
            if state['state'] == 'cleared':
                cleared.append(state['stage'])
                page.clock.fast_forward(2400)
                page.clock.run_for(40)
            if page.evaluate('__game.core.state === "won"'):
                break
            if state['state'] == 'lost':
                break
        result = page.evaluate('''() => ({core:__game.core.snapshot(),view:__game.snapshot,paused:__game.paused,screen:__game.screen,modalVisible:!document.querySelector('#modal').hidden,panel:document.querySelector('#panel').innerText,scene:__game.scene.diagnostics()})''')
        EVIDENCE['campaign'] = {'cleared': cleared, 'simulatedSeconds': natural_ticks / 120, 'core': result['core'], 'viewState': result['view']['state']}
        check('natural campaign reaches victory through main-loop transitions', result['core']['state'] == 'won' and cleared == [0, 1, 2, 3])
        check('victory records four completed sectors and all 272 bricks', result['core']['stats']['completed'] == 4 and result['core']['stats']['bricks'] == 272)
        check('campaign exercises rescues returns roof and emergency beat', result['core']['stats']['rescues'] == 2 and result['core']['stats']['returns'] > 40 and result['core']['stats']['roof'] > 0 and result['core']['stats']['pulses'] > 0)
        check('victory has a scored result screen and replay controls', result['modalVisible'] and 'WHAT A FREQUENCY.' in result['panel'] and 'Endless encore' in result['panel'] and result['core']['score'] > 10000)
        check('published final snapshot reflects victory and all completions', result['view']['state'] == 'won' and result['view']['stats']['completed'] == 4)
        check('victory leaves no live bricks in rendered scene', result['scene']['bricks'] == 0)
        page.screenshot(path=str(ROOT / 'campaign-victory.png'))
        EVIDENCE['errors'] = errors
        check('no browser exceptions throughout campaign and attract loop', not errors)
    except Exception as error:
        check(f'campaign browser execution: {error}', False)
    finally:
        context.close()
        browser.close()

(ROOT / 'browser-campaign-results.json').write_text(json.dumps({'checks': COUNT, 'failures': FAILURES, 'evidence': EVIDENCE}, indent=2))
print(f'{COUNT-len(FAILURES)}/{COUNT} browser campaign checks passed; {len(FAILURES)} failures')
raise SystemExit(bool(FAILURES))
