import asyncio, sys, subprocess, os, time, json
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
NAME = 'StarLocks64-Starfox64-claude-opus-5-5-medium-20261026-1350.html'
# usage: dbg.py "js1" wait_ms "js2" wait_ms ...
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8772', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(channel='chromium', args=['--enable-unsafe-webgpu', '--enable-features=Vulkan'])
            pg = await b.new_page(viewport={'width': 1280, 'height': 720})
            pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
            await pg.goto(f'http://localhost:8772/{NAME}')
            await pg.wait_for_function('window.__game', timeout=90000)
            a = sys.argv[1:]
            for i in range(0, len(a), 2):
                try: r = await pg.evaluate(a[i])
                except Exception as e: r = 'EXC ' + str(e)[:300]
                print('>', a[i][:60], '=>', json.dumps(r)[:600] if not isinstance(r, str) else r[:600])
                await pg.wait_for_timeout(int(a[i+1]) if i+1 < len(a) else 0)
            await b.close()
    finally: srv.terminate()
    u = []
    [u.append(e) for e in errs if e not in u]
    print('--- errors/warnings:', len(u)); [print(e[:400]) for e in u[:30]]
asyncio.run(main())
