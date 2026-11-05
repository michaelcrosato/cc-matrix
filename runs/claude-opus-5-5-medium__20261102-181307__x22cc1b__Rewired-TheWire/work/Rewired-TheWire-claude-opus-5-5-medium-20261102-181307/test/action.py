# Staged screenshots of the game in action, in a real browser: the viewfinder, the board, a call on the wire, a page,
# the chase, gamepad prompts with PlayStation and Xbox symbols, the touch-only notice.
import sys, asyncio
from playwright.async_api import async_playwright
URL = 'http://127.0.0.1:18931/Rewired-TheWire-claude-opus-5-5-medium-20261102-181307.html'
OUT = '/tmp/x22cc1b-shots'
ENGINE = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1280, 720)
G = 'const g = My3D2dge.current, D = g.debug, I = g.input;'
SCEN = [
  ('viewfinder', '#corner/1', 5000, G + "D.ST.players[0].mover.x = 9*16+8; D.ST.players[0].mover.y = 8*16+14; I.lastDevice='gamepad';", ['hold:KeyQ:1500']),
  ('board', '#office', 2500, G + "D.OF.stage = 1; D.OF.me.x = 8*16; D.OF.me.y = 2*16+8;", ['press:KeyE', 'wait:400', 'press:Enter', 'wait:300', 'press:ArrowRight', 'wait:600']),
  ('wire', '#wire', 2500, G + "D.talk.close(); D.WR.state='idle'; D.WR.gap=0; D.WR.i=1;", ['wait:5200']),
  ('page', '#wire', 2500, G + "D.talk.close(); D.WR.state='idle'; D.WR.gap=0; D.WR.i=3;", ['wait:1500', 'press:Digit2', 'press:Digit3']),
  ('chase', '#chase', 2500, '', ['wait:1500']),
  ('reup-car', '#reup', 3000, G + "D.talk.close(); const c = D.STREET.car2; D.teleport(c.x, c.y + 16);", ['press:KeyE', 'wait:9000', 'hold:Mouse2:900']),
  ('xbox', '#corner/1', 4000, G + "g.settings.set('glyphs','xbox'); I.lastDevice='gamepad';", ['wait:300']),
  ('touchonly', '?touchonly=1', 3000, '', ['wait:300']),
  ('coldopen', '#coldopen', 4000, '', ['hold:KeyD:1200']),
  ('ending-board', '#ending', 3000, '', ['wait:300']),
]
async def main():
    async with async_playwright() as p:
        b = await getattr(p, ENGINE).launch()
        for name, link, wait, js, steps in SCEN:
            pg = await b.new_page(viewport={'width': W, 'height': H})
            errs = []
            pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)))
            pg.on('console', lambda m, errs=errs: errs.append(m.text) if m.type == 'error' else None)
            await pg.goto(URL + link)
            await pg.wait_for_timeout(wait)
            await pg.mouse.move(W/2, H/2)
            if js: await pg.evaluate(js)
            for s in steps:
                k = s.split(':')
                if k[0] == 'press': await pg.keyboard.press(k[1])
                elif k[0] == 'wait': await pg.wait_for_timeout(int(k[1]))
                elif k[0] == 'hold':
                    if k[1].startswith('Mouse'):
                        await pg.mouse.down(button='right'); await pg.wait_for_timeout(int(k[2])); 
                    else:
                        await pg.keyboard.down(k[1]); await pg.wait_for_timeout(int(k[2]))
            await pg.screenshot(path=f'{OUT}/act-{ENGINE}-{name}.png')
            print(name, errs[:3])
            await pg.close()
        await b.close()
asyncio.run(main())
