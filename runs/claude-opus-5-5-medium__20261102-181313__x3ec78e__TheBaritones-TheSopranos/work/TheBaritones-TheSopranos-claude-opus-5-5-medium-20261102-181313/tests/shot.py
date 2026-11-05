# Opens the game in a browser, runs a few steps of JS / keys, saves screenshots and prints console errors.
# usage: python3 shot.py URL OUTDIR [engine] [w h] then steps on stdin: "wait 1000", "key Enter", "js <code>", "shot name"
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    url, out = sys.argv[1], sys.argv[2]
    eng = sys.argv[3] if len(sys.argv) > 3 else 'chromium'
    w, h = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (1280, 720)
    async with async_playwright() as p:
        b = await getattr(p, eng).launch()
        pg = await b.new_page(viewport={'width': w, 'height': h})
        errs = []
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        await pg.goto(url)
        for line in sys.stdin.read().splitlines():
            line = line.strip()
            if not line or line.startswith('#'): continue
            cmd, _, arg = line.partition(' ')
            if cmd == 'wait': await pg.wait_for_timeout(int(arg))
            elif cmd == 'key': await pg.keyboard.press(arg)
            elif cmd == 'down': await pg.keyboard.down(arg)
            elif cmd == 'up': await pg.keyboard.up(arg)
            elif cmd == 'click':
                x, y = map(int, arg.split()); await pg.mouse.click(x, y)
            elif cmd == 'move':
                x, y = map(int, arg.split()); await pg.mouse.move(x, y)
            elif cmd == 'js': print('js>', await pg.evaluate(arg))
            elif cmd == 'shot': await pg.screenshot(path=f'{out}/{arg}.png')
        for e in errs[:30]: print(e)
        await b.close()
asyncio.run(main())
