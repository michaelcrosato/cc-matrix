from pathlib import Path
import functools
import http.server
import json
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
failures=[]
checks=0

def check(condition, name):
    global checks
    checks+=1
    if not condition:
        failures.append(name)

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        contexts=[browser.new_context(), browser.new_context()]
        pages=[context.new_page() for context in contexts]
        errors=[]
        for page in pages:
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/src/net/probe.html')
            page.wait_for_function('window.probeReady === true')
            check('Advanced Dungeons and Danger' in page.title(), 'served document identity')
        host,guest=pages
        offer=host.evaluate('net.host()')
        answer=guest.evaluate('(code)=>net.join(code)', offer)
        host.evaluate('(code)=>net.accept(code)', answer)
        host.wait_for_function('net.running && net.state && Object.keys(net.state.players).length === 2', timeout=15000)
        guest.wait_for_function('net.running && net.state && Object.keys(net.state.players).length === 2', timeout=15000)
        check(host.evaluate('net.channel.readyState === "open" && net.diagnostics().connection === "connected"'), 'host real DataChannel open')
        check(guest.evaluate('net.channel.readyState === "open" && net.diagnostics().connection === "connected"'), 'guest real DataChannel open')
        check(host.evaluate('net.state.runId') == guest.evaluate('net.state.runId'), 'same authoritative expedition')
        for page in pages:
            page.evaluate('net.send({type:"turn",delta:1})')
        guest.wait_for_function('net.state.players["0"].dir === 1 && net.state.players["1"].dir === 1', timeout=5000)
        check(host.evaluate('net.state.players["0"].dir === 1 && net.state.players["1"].dir === 1'), 'transport inputs reach authority')
        check(guest.evaluate('net.state.players["0"].dir === 1 && net.state.players["1"].dir === 1'), 'authority snapshot reaches guest')
        guest.evaluate('net.close()')
        host.wait_for_function('net.mode === "solo" && net.running', timeout=10000)
        check(host.evaluate('net.state.players["1"].connected === false'), 'guest departure leaves playable host')
        check(host.evaluate('Object.values(net.state.entities).some(e=>e.id.startsWith("departed:"))'), 'departing guest supplies recoverable')
        # Retry genuinely creates a fresh connection after cancellation.
        old_run=host.evaluate('net.state.runId')
        offer=host.evaluate('net.host()')
        check(host.evaluate('net.state === null && !net.running'), 'new invitation isolated from former run')
        host.evaluate('net.cancel()')
        check(host.evaluate('net.pc === null && net.channel === null && net._interval === null && net.mode === "solo"'), 'cancel clears peer/channel/timer')
        offer=host.evaluate('net.host()')
        answer=guest.evaluate('(code)=>net.join(code)', offer)
        host.evaluate('(code)=>net.accept(code)', answer)
        guest.wait_for_function('net.running && net.state', timeout=15000)
        check(host.evaluate('net.state.runId') != old_run, 'retry run ID prevents stale old expedition packets')
        host.evaluate('net.close()')
        guest.wait_for_function('net.ended', timeout=10000)
        check(guest.evaluate('!net.running && net._interval === null && net.status.includes("host")'), 'host loss clearly ends guest')
        check(not errors, 'no browser exceptions: '+repr(errors))
        for context in contexts:
            context.close()
        browser.close()
except Exception as exc:
    failures.append(f'RTC probe ran: {exc}')
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)

report={'checks':checks,'failures':failures}
(ROOT/'evidence'/'rtc-probe.json').write_text(json.dumps(report,indent=2))
for failure in failures:
    print('FAIL '+failure)
print(f'{checks-len(failures)}/{checks} real RTC probe checks passed')
raise SystemExit(1 if failures else 0)
