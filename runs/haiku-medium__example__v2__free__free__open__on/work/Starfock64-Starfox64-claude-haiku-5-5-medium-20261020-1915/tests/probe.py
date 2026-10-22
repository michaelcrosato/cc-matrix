# Smoke test: load the bundled HTML, check for a WebGPU adapter, capture errors and a screenshot.
import sys, time, pathlib
from playwright.sync_api import sync_playwright

HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/starfock-title.png'
ARGS = [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan,VulkanFromANGLE,WebGPU',
    '--use-vulkan=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--use-angle=swiftshader',
]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(HTML)
    time.sleep(1)
    adapter = pg.evaluate("""async () => {
        if (!navigator.gpu) return 'no navigator.gpu';
        const a = await navigator.gpu.requestAdapter().catch(e => 'err ' + e);
        if (!a) return 'null adapter';
        if (typeof a === 'string') return a;
        return 'adapter ok: ' + (a.info ? (a.info.vendor + ' / ' + a.info.architecture + ' / ' + a.info.description) : 'no info');
    }""")
    print('ADAPTER:', adapter)
    time.sleep(6)
    pg.screenshot(path=OUT)
    print('MENU:', pg.evaluate("document.getElementById('menu').innerText.slice(0,200)"))
    for l in logs[:40]:
        print(l)
    b.close()
