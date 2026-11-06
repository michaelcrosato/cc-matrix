# python3 tests/lib/devpage.py: the dev page boots from a local server on a port the OS picks. Stops only its own server.
import os, subprocess, sys
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.PIPE, text=True)
try:
    port = srv.stdout.readline().split(' port ')[1].split(' ')[0]
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'])
        page = b.new_page(); errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(f'http://127.0.0.1:{port}/index.html')
        page.wait_for_function('window.__GAME__ && window.__GAME__.ready_', timeout=240000)
        print('title:', page.title(), '| mode:', page.evaluate('window.__GAME__.mode'), '| errors:', errs[:2])
        b.close()
finally:
    srv.kill(); srv.wait()
