import json
from pathlib import Path
from playwright.sync_api import sync_playwright
port=json.loads(Path('server.json').read_text())['port']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-gpu-watchdog'])
 page=browser.new_page();logs=[];page.on('console',lambda m:logs.append([m.type,m.text]));page.goto(f'http://127.0.0.1:{port}/gpu-probe.html');page.wait_for_selector('body[data-ready=true]');page.wait_for_timeout(1000)
 r=page.evaluate("async()=>await Promise.race([renderer.backend.device.lost.then(x=>({reason:x.reason,message:x.message})),new Promise(r=>setTimeout(()=>r('alive'),200))])")
 Path('gpu-probe.json').write_text(json.dumps({'result':r,'logs':logs},indent=2));page.screenshot(path='gpu-probe.png');browser.close()
 if r!='alive':print('FAIL GPU minimal scene:',r)
 print(f'{int(r=="alive")}/1 probe passed')
