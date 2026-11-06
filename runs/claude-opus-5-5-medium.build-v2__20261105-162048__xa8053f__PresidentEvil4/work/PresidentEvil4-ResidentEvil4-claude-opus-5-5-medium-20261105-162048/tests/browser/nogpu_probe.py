#!/usr/bin/env python3
# Which Firefox and WebKit settings can run the game here? Reports what it finds: not part of the main suite. Run under xvfb-run.
# Found: Firefox runs it with WebGPU forced on and a display (see firefox.sh). WebKit, GTK and WPE builds run directly: --features=WebGPU exposes the GPU interfaces ('GPU' in window is true) but navigator.gpu stays null, with or without its GPU process, so there is no WebGPU instance to use.
# Tries default settings, WebGPU forced on, SwiftShader and lavapipe Vulkan drivers, headless and headed (run under xvfb-run), and WebKit's feature flag.
import glob, os, sys
from playwright.sync_api import sync_playwright
dev = os.path.abspath(os.path.dirname(__file__) + '/../..'); html = 'file://' + glob.glob(dev + '/../PresidentEvil4-*.html')[0]
PROBE = "async()=>{ if(!navigator.gpu) return 'navigator.gpu missing'; try { const a = await navigator.gpu.requestAdapter() || await navigator.gpu.requestAdapter({forceFallbackAdapter:true}); return a ? 'ADAPTER' : 'no adapter'; } catch (e) { return 'threw ' + e; } }"
PREFS = {'dom.webgpu.enabled': True, 'gfx.webgpu.ignore-blocklist': True, 'dom.webgpu.workers.enabled': True, 'gfx.webgpu.force-enabled': True, 'security.sandbox.gpu.level': 0, 'security.sandbox.content.level': 0}
with sync_playwright() as p:
    sw = os.path.dirname(p.chromium.executable_path) + '/vk_swiftshader_icd.json'; lvp = '/usr/share/vulkan/icd.d/lvp_icd.json'
    icd = lambda f: {**os.environ, 'VK_ICD_FILENAMES': f, 'VK_DRIVER_FILES': f, 'MOZ_DISABLE_CONTENT_SANDBOX': '1', 'MOZ_DISABLE_RDD_SANDBOX': '1'}
    runs = [('firefox default', 'firefox', {}), ('firefox forced', 'firefox', {'firefox_user_prefs': PREFS})]
    for head in ([True, False] if os.environ.get('DISPLAY') else [True]):
        for name, f in (('swiftshader', sw), ('lavapipe', lvp)): runs.append((f'firefox forced {name} {"headless" if head else "headed"}', 'firefox', {'firefox_user_prefs': PREFS, 'env': icd(f), 'headless': head}))
        runs.append((f'webkit {"headless" if head else "headed"}', 'webkit', {'headless': head}))
        for fl in ('--features=+WebGPU', '--enable-webgpu'): runs.append((f'webkit {fl} {"headless" if head else "headed"}', 'webkit', {'headless': head, 'args': [fl], 'env': icd(lvp)}))
    for label, kind, opts in runs:
        try:
            b = getattr(p, kind).launch(**opts); pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:120])); pg.goto(html); r = pg.evaluate(PROBE); pg.wait_for_timeout(4000); run = pg.evaluate('!!window.__APP__ && !!window.__PIXEL_ENGINE__'); msg = 'WebGPU unavailable' in pg.evaluate('document.body.innerText')
            print(f'{label}: adapter={r!r} gameRunning={run} clearMessage={msg} errors={errs[:1]}'); b.close()
        except Exception as e: print(f'{label}: launch failed: {str(e).splitlines()[0][:110]}')
