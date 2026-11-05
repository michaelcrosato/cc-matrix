# Runs the AI Hub harness against the bundled game: the same automatic checks the hub runs when a game joins.
import sys, json, asyncio
from playwright.async_api import async_playwright
BASE = 'http://127.0.0.1:18931/Rewired-TheWire-claude-opus-5-5-medium-20261102-181307/hubtest/harness.html?game=game.html'
CASES = sys.argv[1:] or ['&players=2&auto=1', '&players=4&latency=150&jitter=50&loss=5&auto=1', '&players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', '&players=1&auto=1']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for c in CASES:
            pg = await b.new_page(viewport={'width': 1400, 'height': 900})
            await pg.goto(BASE + c)
            try:
                await pg.wait_for_function('document.body.dataset.complete === "true"', timeout=240000)
            except Exception as e:
                print('TIMEOUT', c)
            res = await pg.evaluate('JSON.stringify(window.__hubCheck || null)')
            r = json.loads(res) if res else None
            print(c, 'PASS' if r and r.get('pass') else 'FAIL')
            if r and not r.get('pass'):
                print(json.dumps(r)[:3000])
            await pg.screenshot(path='/tmp/x22cc1b-shots/hub' + str(CASES.index(c)) + '.png')
            await pg.close()
        await b.close()
asyncio.run(main())
