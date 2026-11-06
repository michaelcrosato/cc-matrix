# @file Installed viewport matrix plus native WebGPU sizes and 1920x1080 visual evidence.
import subprocess,json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();GAME=ROOT.parent/'Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html'
OUT=ROOT/'out/game';VIEWS=ROOT/'out/viewport-webkit';NATIVE=ROOT/'out/viewport-chromium';NATIVE.mkdir(parents=True,exist_ok=True)
failures=[];passed=0
result=subprocess.run(['viewport-matrix',GAME.as_uri(),'--engines','webkit','--dpr1','--wait','200','-o',str(VIEWS)],capture_output=True,text=True)
(OUT/'viewport-matrix.log').write_text(result.stdout+result.stderr)
if result.returncode:failures.append('WebKit matrix: '+(result.stdout+result.stderr)[-2000:])
else:passed+=len(list(VIEWS.glob('*.png')))
FLAGS=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=FLAGS)
 page=browser.new_page(viewport={'width':1920,'height':1080});page.set_default_timeout(90000);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(GAME.as_uri());page.wait_for_function('__engine.ready && __game.ready',timeout=90000)
 for i,(name,width,height) in enumerate([('phone-se',375,667),('phone-narrow',344,882),('tablet-portrait',768,1024),('tablet-landscape',1024,768),('desktop',1920,1080),('ultrawide',2560,1080)]):
  try:
   page.set_viewport_size({'width':width,'height':height});page.mouse.move(i+2,2)
   page.wait_for_function('!__game.attract')
   page.screenshot(path=str(NATIVE/(name+'.png')))
   bad=page.evaluate('''()=>{const out=[];for(const el of document.querySelectorAll('#shell *')){if(!el.checkVisibility?.())continue;for(const node of el.childNodes){if(node.nodeType!==3||!node.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(node);const box=r.getBoundingClientRect();if(box.right>innerWidth+2||box.left< -2)out.push(node.textContent.trim().slice(0,50));}}return out;}''')
   if bad:raise AssertionError('Clipped text: '+str(bad))
   passed+=1
  except Exception as e:failures.append(name+': '+str(e).split('\n')[0])
 # Full-screen evidence for what assertions cannot judge.
 page.set_viewport_size({'width':1920,'height':1080});page.mouse.move(3,2)
 page.screenshot(path=str(OUT/'title-tv.png'))
 page.keyboard.press('KeyZ')
 for event,ticks,name in [('pose',7200,'pose-tv'),('pond',2150,'pond-tv'),('line',850,'line-tv'),('garden',700,'garden-tv'),('tilt',8700,'tilt-tv')]:
  try:
   page.keyboard.press('KeyZ')
   page.evaluate('([id,ticks])=>{__engine.set("game.auto",true);__engine.actions.run("game.start",{event:id});__engine.pause();__engine.step(ticks);}',[event,ticks])
   page.wait_for_function('([id,tick])=>__game.event===id && __game.tick>=tick && __game.screen==="play"',arg=[event,ticks],timeout=90000)
   page.screenshot(path=str(OUT/(name+'.png')));passed+=1
  except Exception as e:failures.append(name+': '+str(e).split('\n')[0])
 try:
  page.evaluate('__engine.actions.run("game.finish",{score:945})');page.wait_for_function('__game.screen==="results"')
  page.screenshot(path=str(OUT/'results-tv.png'));passed+=1
  page.locator('[data-action=continue]').click();page.wait_for_function('__game.screen==="play"')
  page.evaluate('__engine.set("game.auto",false);__engine.actions.run("game.begin");__engine.pause();__engine.step(2)')
  page.wait_for_function('__game.mode==="roam"');page.screenshot(path=str(OUT/'island-tv.png'));passed+=1
  page.keyboard.press('Escape');page.wait_for_function('__game.screen==="pause"')
  page.screenshot(path=str(OUT/'pause-tv.png'));page.locator('[data-action=tools]').click();page.locator('[data-action=dev]').click()
  page.screenshot(path=str(OUT/'dev-tv.png'));passed+=1
  page.keyboard.press('Escape');page.locator('[data-action=tools]').click();page.locator('[data-action=about]').click()
  page.screenshot(path=str(OUT/'about-tv.png'));passed+=1
 except Exception as e:failures.append('TV menus: '+str(e).split('\n')[0])
 if errors:failures.append('WebGPU page errors: '+str(errors))
 browser.close()
for failure in failures:print('FAIL '+failure)
print(f'{passed} viewport and visual checks passed; {len(failures)} failed')
(OUT/'viewport-report.json').write_text(json.dumps({'passed':passed,'failures':failures},indent=2)+'\n')
sys.exit(bool(failures))
