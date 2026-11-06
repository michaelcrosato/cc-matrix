"""Hub harness check: serves the built file beside the harness on a port the OS picks, runs it at N players, and asserts
what the harness can't see: the engine really runs inside each frame. Usage: python3 labs/game/tools/hubcheck.py <html> [players...] [--leave]"""
import hashlib, http.server, json, os, re, shutil, socketserver, subprocess, sys, tempfile, threading, time
from functools import partial
from playwright.sync_api import sync_playwright

ROOT = os.getcwd()
def memory_gb():
    with open('/proc/meminfo') as f:
        for line in f:
            if line.startswith('MemAvailable'):
                return int(line.split()[1]) / 1048576
    return 99


def wait_for_memory(need, patience=420):
    """Other agents share this machine, and earlyoom ends the biggest browser when memory runs out: wait for room."""
    end = time.time() + patience
    while memory_gb() < need and time.time() < end:
        time.sleep(10)


CLIENT_SHA = '6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a'


def client_is_pristine(html):
    """The client must stay byte-identical: the hub rejects an edited copy by SHA-256."""
    text = open(html, encoding='utf8').read()
    want = open(os.path.join(ROOT, 'labs/game/hub/session-client.txt'), encoding='utf8').read()
    if hashlib.sha256(want.encode()).hexdigest() != CLIENT_SHA:
        print('FAIL hub: the kept client is not what was fetched')
        return False
    if want not in text:
        print('FAIL hub: the pasted client differs from the fetched one')
        return False
    return True


def run_one(browser, port, item, n, scenario):
    """One harness run; True when it failed."""
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    logs = []
    page.on('console', lambda m: logs.append(m.text))
    q = f'game=game.html&players={n}&latency=150&jitter=50&loss=5&auto=1&play=8000'
    if scenario: q += f'&scenario={scenario}'
    url = f'http://127.0.0.1:{port}/harness.html?{q}'
    page.goto(url)
    engine_ok = {}
    seen = set()
    ghosts = 0
    deadline = time.time() + 280
    while time.time() < deadline:
        engine_ok = {}  # the frames there now: a player who left before the engine came up has nothing to report
        for fr in page.frames:
            if fr == page.main_frame: continue
            try:
                st = fr.evaluate("() => { const e = window.__engine; if (!e) return null; let g = 0; try { g = typeof e.state === 'function' ? e.state('ghost').entities.length : 0; } catch (x) {} return { ready: e.ready === true, errors: (e.errors || []).length, ghosts: g, first: (e.errors || []).slice(0, 2).map((x) => x.message) }; }")
            except Exception:
                st = None
            if st:
                engine_ok[id(fr)] = st
                seen.add(id(fr))
                ghosts = max(ghosts, st['ghosts'])
        done = page.evaluate("() => document.body.dataset.complete === 'true'")
        if done:
            break
        page.wait_for_timeout(500)
    check = page.evaluate("() => window.__hubCheck || null")
    bad = [l for l in logs if l.startswith('[AIHub]')]
    ok = bool(check and check.get('pass')) and all(v['ready'] and v['errors'] == 0 for v in engine_ok.values()) and len(seen) >= int(n) and (int(n) < 2 or ghosts > 0) and not bad
    if not ok:
        print(f'FAIL hub {item}: pass={check and check.get("pass")} failed={[c for c in (check or {}).get("checks", []) if not c.get("pass")]} engines={engine_ok} ghosts={ghosts} aihub={bad[:5]} log={(check or {}).get("log", [])[-12:]}')
    page.close()
    return not ok


def main():
    args = sys.argv[1:]
    html = args[0]
    plan = [a for a in args[1:]] or ['2', '3', '4', '3:host-leave']
    pristine = client_is_pristine(html)
    work = tempfile.mkdtemp(prefix='hub', dir=os.path.join(ROOT, 'out') if os.path.isdir(os.path.join(ROOT, 'out')) else ROOT)
    for f in ['harness.html', 'bridge.js', 'round.js']:
        shutil.copy(os.path.join(ROOT, 'labs/game/hub/harness', f + '.txt'), os.path.join(work, f))
    shutil.copy(html, os.path.join(work, 'game.html'))
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=work)
    class Quiet(http.server.ThreadingHTTPServer):
        pass
    handler.log_message = lambda *a, **k: None
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a, **k: None
    server = Quiet(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    fails = 0 if pristine else 1
    chromium = os.environ.get('CHROMIUM_PATH')
    with sync_playwright() as p:
        flags = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
        for item in plan:
          n, _, scenario = item.partition(':')
          for attempt in range(4):
            wait_for_memory(2.0 + int(n))
            browser = p.chromium.launch(executable_path=chromium, args=flags)
            try:
              if run_one(browser, port, item, n, scenario):
                  fails += 1
              break
            except Exception as e:
              if attempt == 3:
                  fails += 1
                  print(f'FAIL hub {item}: {str(e)[:300]}')
              time.sleep(30)
            finally:
              try:
                  browser.close()
              except Exception:
                  pass
    server.shutdown()
    shutil.rmtree(work, ignore_errors=True)
    print(f'hub: {len(plan) + (1 if pristine else 0) - (fails if pristine else fails - 1)} checks passed, {fails} failed')
    sys.exit(1 if fails else 0)
main()
