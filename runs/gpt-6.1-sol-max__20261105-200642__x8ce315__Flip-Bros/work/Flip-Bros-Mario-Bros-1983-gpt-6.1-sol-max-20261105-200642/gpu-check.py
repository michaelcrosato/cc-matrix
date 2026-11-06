import json
from pathlib import Path
from playwright.sync_api import sync_playwright
port=json.loads(Path('server.json').read_text())['port']; results=[]
with sync_playwright() as p:
 for flags in [ ['--enable-unsafe-webgpu','--use-angle=swiftshader','--disable-gpu-watchdog'],['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-gpu-watchdog'] ]:
  browser=p.chromium.launch(headless=True,args=flags)
  page=browser.new_page(viewport={'width':1280,'height':720});logs=[]
  page.add_init_script("GPUDevice.prototype.destroy = new Proxy(GPUDevice.prototype.destroy,{apply(fn,that,args){console.error('DESTROY STACK '+new Error().stack);return Reflect.apply(fn,that,args)}});")
  page.on('console',lambda m:logs.append([m.type,m.text[:700]]))
  page.on('pageerror',lambda e:logs.append(['pageerror',str(e)]))
  page.goto(f'http://127.0.0.1:{port}/index.html?test=1');page.wait_for_selector('body[data-ready=true]',timeout=90000)
  state=page.evaluate('''async()=>({backend:FlipBros.backend,device:await Promise.race([__test.renderer.backend.device?.lost.then(x=>({reason:x.reason,message:x.message})),new Promise(r=>setTimeout(()=>r('alive'),500))]),info:__test.renderer.info.render})''')
  results.append({'flags':flags,'state':state,'logs':logs})
  browser.close()
Path('gpu-report.json').write_text(json.dumps(results,indent=2))
fail=sum(r['state']['device']!='alive' for r in results)
for r in results:
 if r['state']['device']!='alive':print('FAIL GPU:',r['state'],r['logs'][:8])
print(f'{len(results)-fail}/{len(results)} GPU checks passed')
