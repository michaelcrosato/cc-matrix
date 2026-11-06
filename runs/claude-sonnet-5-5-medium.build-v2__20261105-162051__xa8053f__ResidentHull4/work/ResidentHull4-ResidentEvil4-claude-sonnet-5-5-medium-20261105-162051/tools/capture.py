# Open a built page in WebGPU Chromium, run a JS snippet, capture the 3D frame + HUD to a PNG (alpha forced to 255).
import sys, json, base64, asyncio
from playwright.sync_api import sync_playwright
FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist']
def main():
    url, out = sys.argv[1], sys.argv[2]
    script = sys.argv[3] if len(sys.argv) > 3 else ''
    steps = int(sys.argv[4]) if len(sys.argv) > 4 else 30
    w = int(sys.argv[5]) if len(sys.argv) > 5 else 1920
    h = int(sys.argv[6]) if len(sys.argv) > 6 else 1080
    with sync_playwright() as p:
        b = p.chromium.launch(args=FLAGS)
        pg = b.new_page(viewport={'width': w, 'height': h})
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)))
        pg.goto(url)
        pg.wait_for_function('window.__PIXEL_READY__ !== undefined', timeout=60000)
        pg.evaluate('window.__PIXEL_READY__')
        if script:
            pg.evaluate('async () => {' + script + '}')
        data = pg.evaluate('''async (steps) => {
          const e = await window.__PIXEL_READY__;
          e.step(steps);
          const f = await e.renderer.capture();
          const hud = e.hud.canvas;
          const c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
          const g = c.getContext('2d');
          const id = new ImageData(new Uint8ClampedArray(f.pixels), f.width, f.height);
          for (let i = 3; i < id.data.length; i += 4) id.data[i] = 255;
          g.putImageData(id, 0, 0);
          if (hud) { g.imageSmoothingEnabled = false; g.drawImage(hud, 0, 0, f.width, f.height); }
          return {url: c.toDataURL('image/png'), errors: e.errors, state: e.state().status};
        }''', steps)
        open(out, 'wb').write(base64.b64decode(data['url'].split(',')[1]))
        print('errors', data['errors'], 'status', data['state'])
        for l in logs[:10]: print(l[:300])
        b.close()
main()
