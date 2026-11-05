# Opens the bundled game in a real browser at deep links, collects console errors, takes screenshots.
import sys, json, asyncio
from playwright.async_api import async_playwright
URL = 'http://127.0.0.1:18931/Rewired-TheWire-claude-opus-5-5-medium-20261102-181307.html'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/x22cc1b-shots'
ENGINE = sys.argv[2] if len(sys.argv) > 2 else 'chromium'
LINKS = sys.argv[3].split(',') if len(sys.argv) > 3 else ['', 'coldopen', 'corner', 'shift', 'reup', 'office', 'wire', 'stash', 'ending', 'montage', 'about', 'demo', 'chase']
async def main():
    async with async_playwright() as p:
        b = await getattr(p, ENGINE).launch()
        errors = {}
        for link in LINKS:
            pg = await b.new_page(viewport={'width': 1280, 'height': 720})
            errs = []
            pg.on('console', lambda m, errs=errs: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e, errs=errs: errs.append('PAGEERROR ' + str(e)))
            await pg.goto(URL + ('#' + link if link else ''))
            await pg.wait_for_timeout(3500)
            await pg.keyboard.press('KeyW')
            await pg.wait_for_timeout(600)
            snap = await pg.evaluate('JSON.stringify(My3D2dge.current.debug.snapshot()) + " ERR " + JSON.stringify((My3D2dge.current.errors||[]).map(e => String(e.message||e)).slice(0,3))')
            await pg.screenshot(path=f'{OUT}/{ENGINE}-{link or "title"}.png')
            errors[link or 'title'] = errs[:4]
            print(link or 'title', '|', snap[:300], '|', errs[:3])
            await pg.close()
        await b.close()
asyncio.run(main())
