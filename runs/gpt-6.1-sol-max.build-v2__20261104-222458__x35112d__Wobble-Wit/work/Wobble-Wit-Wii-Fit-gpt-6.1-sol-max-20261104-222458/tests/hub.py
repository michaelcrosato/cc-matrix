from pathlib import Path
import subprocess,re,shutil,json
from playwright.sync_api import sync_playwright
DEV=Path(__file__).resolve().parents[1];PAGE=DEV.parent/'Wobble-Wit-Wii-Fit-gpt-6.1-sol-max-20261104-222458.html';stage=DEV/'hub-test';stage.mkdir(exist_ok=True)
for f in ['harness.html','bridge.js','round.js']:shutil.copy2(DEV/'hub'/f,stage/f)
shutil.copy2(PAGE,stage/'game.html');page_text=PAGE.read_text();client=(DEV/'hub/session.js').read_text();passed=0;failed=0
if '<script>'+client+'</script>' in page_text:passed+=1
else:print('FAIL Hub client byte comparison');failed+=1
server=subprocess.Popen(['python3','-u','-m','http.server','0','--bind','127.0.0.1','--directory',str(stage)],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
try:
 line=server.stdout.readline();port=int(re.search(r'port (\d+)',line)[1]);base=f'http://127.0.0.1:{port}'
 with sync_playwright()as pw:
  b=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader'])
  try:
   for n,extra in [(2,''),(3,'&latency=150&jitter=50&loss=5'),(4,'&latency=150&jitter=50&loss=5'),(3,'&scenario=host-leave')]:
    p=b.new_page(viewport={'width':640,'height':420},device_scale_factor=1);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(base+f'/harness.html?game=game.html&players={n}&auto=1'+extra);p.wait_for_function('document.body.dataset.complete==="true"',timeout=240000);result=p.evaluate('window.__hubCheck');(DEV/'notes'/f'hub-{n}{"-leave" if extra.endswith("host-leave") else ""}.json').write_text(json.dumps(result,indent=2));
    if result.get('pass')and not errors:passed+=1
    else:failed+=1;print(f'FAIL Hub {n} players {extra}: {json.dumps(result)} errors {errors}')
    p.close()
   p=b.new_page(viewport={'width':320,'height':180});p.goto(base+'/game.html');p.wait_for_function('window.__gameStatus',timeout=120000);p.keyboard.press('Enter');p.keyboard.press('Space');p.wait_for_timeout(300)
   if p.evaluate('AIHub.active===false&&AIHub.seeded===false'):passed+=1
   else:failed+=1;print('FAIL solo Hub isolation')
   p.close()
  finally:b.close()
finally:server.terminate();server.wait(timeout=15)
print(f'{passed} passed, {failed} failed');raise SystemExit(bool(failed))
