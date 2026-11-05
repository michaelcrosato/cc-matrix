#!/usr/bin/env python3
# A run's game, loaded once in headless Chromium (software WebGL and WebGPU, as on a computer without a GPU) and left
# alone for a few seconds, the way someone opening it would: what it throws, what it logs as an error, the requests that
# fail and how long the page takes to load, with a screenshot at the end. The runner calls it for each run that leaves a
# game (gameCheck in the config; see checkGame in run-matrix.mjs) and reads the one JSON object it prints.
#
#   python3 check-game.py GAME.html SHOT.png [SECONDS]
#
# Prints {"skipped": why} when Playwright for Python or its Chromium isn't installed, so a computer without them
# runs batches as before.
import json, os, sys, time
from pathlib import Path

# WebGPU in software (SwiftShader), which WebGPU engines need here: --enable-unsafe-webgpu alone finds an adapter
# but the device is lost as a game starts, and --use-vulkan=swiftshader on top slows every screenshot (WebGL games' too)
# past Playwright's 30 s. A game loaded from file:// is a secure page, which WebGPU also needs. Checked Nov 4 2026 with
# Chromium 153 on shardfall's, riftlight's and my-3dge's games, and on WebGL games, whose results didn't change. A
# WebGPU canvas drawing about a frame a second can still come out blank in the screenshot; its errors are what count.
WEBGPU = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader']
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', *WEBGPU, '--autoplay-policy=no-user-gesture-required']

def firsts(items, n=5):
    seen, out = set(), []
    for x in items:
        if x not in seen: seen.add(x); out.append(x)
    return out[:n]

def main():
    html, shot = sys.argv[1], sys.argv[2]
    secs = float(sys.argv[3]) if len(sys.argv) > 3 else 60
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return {'skipped': 'Playwright for Python is not installed'}
    out: dict = {'seconds': secs}
    errs, cons, failed = [], [], []
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(args=ARGS)
        except Exception as e:
            return {'skipped': 'Chromium for Playwright did not start: ' + str(e).strip().splitlines()[0][:200]}
        try:
            page = browser.new_page(viewport={'width': 1280, 'height': 720})
            page.on('pageerror', lambda e: errs.append(str(e).strip().splitlines()[0][:300]))
            page.on('console', lambda m: cons.append(m.text.strip().splitlines()[0][:300]) if m.type == 'error' else None)
            page.on('requestfailed', lambda r: failed.append(f'{r.url[:200]} ({r.failure})'))
            t = time.time()
            page.goto(Path(html).resolve().as_uri(), wait_until='load', timeout=45000)
            out['loadMs'] = round((time.time() - t) * 1000)
            page.wait_for_timeout(secs * 1000)
            page.screenshot(path=shot)
            out['shot'] = os.path.basename(shot)
        except Exception as e:
            out['error'] = str(e).strip().splitlines()[0][:300]
        finally:
            browser.close()
    for k, v in (('pageErrors', errs), ('consoleErrors', cons), ('failedRequests', failed)):
        out[k] = len(v)
        if v: out[k + 'First'] = firsts(v)
    return out

if __name__ == '__main__':
    print(json.dumps(main()))
