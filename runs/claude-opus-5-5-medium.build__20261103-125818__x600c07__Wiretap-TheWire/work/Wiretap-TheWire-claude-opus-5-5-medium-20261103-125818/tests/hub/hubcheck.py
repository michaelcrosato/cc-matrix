import asyncio, sys, json
from playwright.async_api import async_playwright
RUNS = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&scenario=server&auto=1']
if len(sys.argv) > 1: RUNS = [RUNS[int(i)] for i in sys.argv[1].split(',')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for q in RUNS:
            pg = await b.new_page(viewport={'width': 1400, 'height': 900})
            await pg.goto('http://localhost:8766/harness.html?game=game.html&limit=40&' + q)
            try: await pg.wait_for_function("document.body.dataset.complete === 'true'", timeout=240000)
            except Exception as e: print('timeout', q)
            r = await pg.evaluate("JSON.stringify(window.__hubCheck || null)")
            d = json.loads(r) if r != 'null' else {}
            bad = [c for c in (d.get('checks') or d.get('items') or []) if not (c.get('ok') or c.get('pass'))] if isinstance(d, dict) else []
            print(('PASS ' if d.get('pass') else 'FAIL ') + q, json.dumps(bad)[:900] if not d.get('pass') else '')
            if not d.get('pass'): print(r[:1500])
            await pg.close()
        await b.close()
asyncio.run(main())
