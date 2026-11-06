# Shared by the browser suites.
import json, pathlib, subprocess, sys, time, shutil, os, re
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
NAME = 'RegrettableEvil4-ResidentEvil4-claude-opus-5-5-xhigh-20261105-162045'
DELIVERABLE = ROOT.parent / f'{NAME}.html'
GPU_ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']

# tools/coverage.mjs sets G_COV_DIR: every page then records which of the game's functions ran.
COV_DIR = os.environ.get('G_COV_DIR')
if COV_DIR:
    import playwright.sync_api as _api
    _live = {}
    _cov_start = int(os.environ.get('G_COV_START', '0'))
    def _cov_save(page):
        session = _live.pop(id(page), None)
        if not session: return
        try:
            out = []
            for script in session.send('Profiler.takePreciseCoverage')['result']:
                if not script['url'].endswith('.html') and '.html?' not in script['url']: continue
                for fn in script['functions']:
                    r = fn['ranges'][0]
                    if r['startOffset'] >= _cov_start: out.append([r['startOffset'], r['endOffset'], r['count'], fn['functionName']])
            path = pathlib.Path(COV_DIR) / f'{os.getpid()}-{id(page)}-{time.time_ns()}.json'
            path.write_text(json.dumps(out))
        except Exception: pass
    _orig_new_page = _api.BrowserContext.new_page
    def _new_page(self, *a, **k):
        page = _orig_new_page(self, *a, **k)
        try:
            session = self.new_cdp_session(page)
            session.send('Profiler.enable')
            session.send('Profiler.startPreciseCoverage', {'callCount': True, 'detailed': False})
            _live[id(page)] = session
        except Exception: pass # Firefox and WebKit have no CDP
        return page
    _api.BrowserContext.new_page = _new_page
    _orig_page_close = _api.Page.close
    def _page_close(self, *a, **k):
        _cov_save(self)
        return _orig_page_close(self, *a, **k)
    _api.Page.close = _page_close
    _orig_ctx_close = _api.BrowserContext.close
    def _ctx_close(self, *a, **k):
        for page in list(self.pages): _cov_save(page)
        return _orig_ctx_close(self, *a, **k)
    _api.BrowserContext.close = _ctx_close
    _orig_browser_close = _api.Browser.close
    def _browser_close(self, *a, **k):
        for ctx in list(self.contexts):
            for page in list(ctx.pages): _cov_save(page)
        return _orig_browser_close(self, *a, **k)
    _api.Browser.close = _browser_close

class Suite:
    def __init__(self): self.passed = 0; self.failed = 0
    def ok(self, cond, msg):
        if cond: self.passed += 1
        else:
            self.failed += 1
            print(f'@@FAIL {msg}', flush=True)
        return cond
    def done(self): print(f'@@COUNT {self.passed} {self.failed}', flush=True)

class Server:
    """A static server on a port the OS picks, stopped by its own PID."""
    def __init__(self, folder):
        self.proc = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=str(folder), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        line = self.proc.stdout.readline()
        m = re.search(r'port (\d+)', line)
        self.port = int(m.group(1))
        self.url = f'http://127.0.0.1:{self.port}'
    def stop(self):
        self.proc.terminate()
        try: self.proc.wait(5)
        except Exception: self.proc.kill()

STEP = """async (n) => { const e = await window.__PIXEL_READY__; for (let i = 0; i < n; i += 10) { e.step(Math.min(10, n - i)); await new Promise(r => setTimeout(r)); } }"""

def launch(pw, **kw):
    return pw.chromium.launch(args=GPU_ARGS, **kw)

def open_game(browser, query='', viewport=None, init_script=None, **ctx):
    context = browser.new_context(viewport=viewport or {'width': 960, 'height': 540}, **ctx)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    if init_script: page.add_init_script(init_script)
    page.goto(DELIVERABLE.as_uri() + query)
    page.evaluate('async () => { await window.__PIXEL_READY__; }')
    return page, errors

def step(page, n): page.evaluate(STEP, n)
