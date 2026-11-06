#!/usr/bin/env python3
"""Screenshots of the deliverable or dev page. WebGPU canvases come out blank in page.screenshot here,
so grab engine.renderer.capture() and draw the HUD over it.
  python3 tools/capture.py out.png "?g_area=quay" --steps 120 --js "code run before capture" --size 960x540
"""
import argparse, base64, os, sys, time, subprocess, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DELIVERABLE = ROOT.parent / 'RegrettableEvil4-ResidentEvil4-claude-opus-5-5-xhigh-20261105-162045.html'
ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']

CAPTURE_JS = """
async () => {
  const e = await window.__PIXEL_READY__;
  const f = await e.renderer.capture();
  const c = document.createElement('canvas');
  c.width = f.width; c.height = f.height;
  const g = c.getContext('2d');
  const img = new ImageData(new Uint8ClampedArray(f.pixels), f.width, f.height);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
  g.putImageData(img, 0, 0);
  const h = e.hud.canvas;
  if (h) { g.imageSmoothingEnabled = false; g.drawImage(h, 0, 0, f.width, f.height); }
  return c.toDataURL('image/png');
}
"""

def main():
    p = argparse.ArgumentParser()
    p.add_argument('out')
    p.add_argument('query', nargs='?', default='')
    p.add_argument('--steps', type=int, default=60)
    p.add_argument('--js', action='append', default=[])
    p.add_argument('--size', default='960x540')
    p.add_argument('--frames', default='')  # "120,240": capture at several step counts: out-N.png
    a = p.parse_args()
    w, h = map(int, a.size.split('x'))
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=ARGS)
        page = b.new_context(viewport={'width': w, 'height': h}).new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.goto(DELIVERABLE.as_uri() + a.query)
        page.evaluate('async () => { await window.__PIXEL_READY__; }')
        for js in a.js:
            page.evaluate(js)
        def shot(path):
            data = page.evaluate(CAPTURE_JS)
            pathlib.Path(path).write_bytes(base64.b64decode(data.split(',')[1]))
        if a.frames:
            done = 0
            for n in [int(x) for x in a.frames.split(',')]:
                page.evaluate(f'async () => {{ const e = await window.__PIXEL_READY__; for (let i = 0; i < {n - done}; i += 10) {{ e.step(Math.min(10, {n - done} - i)); await new Promise(r => setTimeout(r)); }} }}')
                done = n
                stem = pathlib.Path(a.out)
                shot(str(stem.with_name(f'{stem.stem}-{n}{stem.suffix}')))
        else:
            page.evaluate(f'async () => {{ const e = await window.__PIXEL_READY__; for (let i = 0; i < {a.steps}; i += 10) {{ e.step(Math.min(10, {a.steps} - i)); await new Promise(r => setTimeout(r)); }} }}')
            shot(a.out)
        state = page.evaluate('async () => { const e = await window.__PIXEL_READY__; return { errors: e.errors, status: e.state().status, gpu: e.state().gpuErrors }; }')
        print(state)
        if errors: print('PAGE ERRORS', errors[:6])
        b.close()

if __name__ == '__main__':
    main()
