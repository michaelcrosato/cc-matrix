"""Single entry point: meaningful mechanics, browser, audio and network checks."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import subprocess,re,json,sys
from playwright.sync_api import sync_playwright
DEV=Path(__file__).resolve().parent
failures=[]
passed=0
for name in ['simulation-tests.mjs','hub-tests.mjs']:
 result=subprocess.run(['node',str(DEV/name)],cwd=DEV,capture_output=True,text=True)
 output=result.stdout+result.stderr
 for line in output.splitlines():
  if line.startswith('FAIL'):failures.append(line)
 match=re.search(r'(\d+) (?:simulation|network|hub) checks, (\d+) failures',output)
 if match:passed+=int(match[1])-int(match[2])
 elif result.returncode:failures.append(f'{name}: {output.strip()}')
 else:
  # Hub suite exports a standard summary, retain its count if wording varies.
  match=re.search(r'(\d+) network checks passed; (\d+) failed',output)
  if match:passed+=int(match[1])-int(match[2])
  else:failures.append(f'{name}: missing result count: {output.strip()}')
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(DEV.parent)))
Thread(target=server.serve_forever,daemon=True).start()
reports={}
try:
 from browser_checks import run_checks
 from network_app_checks import run_checks as run_network_app
 from hub_harness_test import run_harness
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--disable-vulkan-surface'])
  base=f'http://127.0.0.1:{server.server_port}'
  url=f'{base}/{DEV.name}.html'
  for name,fn in [('browser',run_checks),('network-app',run_network_app),('official-hub',run_harness)]:
   try:
    report=fn(browser,base,url);reports[name]=report;passed+=report['passed'];failures.extend(report['failures'])
   except Exception as exc:failures.append(f'{name}: {exc}')
  browser.close()
except Exception as exc:failures.append(str(exc))
finally:server.shutdown();server.server_close()
(DEV/'test-results.json').write_text(json.dumps({'passed':passed,'failed':len(failures),'failures':failures,'reports':reports},indent=2))
for failure in failures:print('FAIL '+failure)
print(f'{passed+len(failures)} checks, {len(failures)} failures')
sys.exit(bool(failures))
