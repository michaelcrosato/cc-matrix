"""Run every release check: python3 test-all.py. Prints only failures and one count."""
import functools
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
PYTHON = os.environ.get('PLAYWRIGHT_PYTHON', '/home/micha/.local/share/pipx/venvs/playwright/bin/python')
checks = 0
failures = []
reports = []

def check(name, condition):
    global checks
    checks += 1
    if not condition:
        failures.append(name)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
env = {**os.environ, 'KERFUFFLE_TEST_URL': f'http://127.0.0.1:{server.server_port}'}
try:
    build = subprocess.run(['node', 'build.mjs'], cwd=ROOT, capture_output=True, text=True)
    check('Single-file build succeeds', build.returncode == 0)
    if build.returncode:
        failures.append(build.stderr.strip())
    html = (ROOT / 'index.html').read_text()
    served = urlopen(env['KERFUFFLE_TEST_URL'] + '/index.html').read().decode()
    check('Server confirms this game', '<title>Air-Sea Kerfuffle — Coastal Arcade</title>' in served)
    check('Single HTML matches development build', (ROOT.parent / (ROOT.name + '.html')).read_text() == html)
    first_script = html.split('<script>', 1)[1].split('</script>', 1)[0].strip()
    check('AI Hub client is unmodified and first', first_script == (ROOT / 'session.js').read_text().strip())
    info = json.loads((ROOT.parent / 'exit-interview.json').read_text())
    check('Exit interview has exact required sections', set(info) == {'sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'})
    check('Exit interview contains every feedback answer', [len(info[x]) for x in ['testingFeedback','engineFeedback','promptFeedback']] == [4,6,4])
    check('Catalogue title and usage are correct', info['aiHub']['name'] == 'Air-Sea Kerfuffle' and info['sourceInformation']['usage'] == 'added on import')
    for label, command in [('gameplay', [PYTHON, 'test-game.py']), ('hub', [PYTHON, 'test-hub.py']), ('audio', ['node', 'audio-test.mjs']), ('file', [PYTHON, 'test-file.py'])]:
        result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, timeout=360)
        output = result.stdout.strip()
        match = re.search(r'(\d+) ' + label + r' checks[^\n]*?(\d+) failures', output)
        if match:
            checks += int(match[1])
        else:
            check(label + ' suite returned a check count', False)
        reports.append({'suite': label, 'exitCode': result.returncode, 'output': output})
        if result.returncode:
            failures.extend(line for line in output.splitlines() if line.startswith('FAIL'))
            if not any(line.startswith('FAIL') for line in output.splitlines()):
                failures.append(label + ': ' + (result.stderr.strip().splitlines()[-1] if result.stderr.strip() else output))
except Exception as error:
    failures.append(str(error))
finally:
    server.shutdown()
    server.server_close()
report = {'checks': checks, 'failures': failures, 'suites': reports, 'releaseSha256': hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest()}
(ROOT / 'test-report.json').write_text(json.dumps(report, indent=2))
for failure in failures:
    print('FAIL ' + failure)
print(f'{checks} release checks; {len(failures)} failures')
raise SystemExit(bool(failures))
