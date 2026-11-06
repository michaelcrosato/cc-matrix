from pathlib import Path
from playwright.sync_api import sync_playwright
import json
D=Path(__file__).resolve().parent
FILE=D.parent/(D.name+'.html')
checks=[];errors=[];logs=[];samples=[]
def check(name,passed,detail=''):
 checks.append({'name':name,'pass':bool(passed),'detail':detail})
try:
 with sync_playwright() as p:
  b=p.chromium.launch(args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--disable-vulkan-surface'])
  c=b.new_context(ignore_https_errors=True,viewport={'width':1280,'height':800})
  page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:logs.append({'type':m.type,'message':m.text}))
  page.goto(FILE.as_uri(),wait_until='domcontentloaded')
  page.wait_for_function('!!window.__game',timeout=90000)
  check('single HTML initializes directly over file://',page.url.startswith('file://') and page.evaluate('!!window.__game'))
  page.mouse.move(300,240)
  page.wait_for_function('__game.renderer.frames > 3',timeout=90000)
  samples.append(page.evaluate('({renderer:__game.renderer,screen:__game.screen,mode:__game.mode})'))
  renderer=samples[-1]['renderer']
  check('native WebGPU backend active',renderer['type']=='WebGPU',json.dumps(renderer))
  check('pinned engines correct',renderer['three']=='180' and renderer['rapier']=='0.19.3')
  check('geometry submitted after several frames',renderer['drawCalls']>0 and renderer['triangles']>0)
  check('device remains live',not renderer['deviceLost'])
  check('title screen present',samples[-1]['screen']=='title',samples[-1]['screen'])
  page.evaluate("__game.action('solo')")
  page.wait_for_function("__game.mode === 'playing' && __game.screen === ''",timeout=30000)
  initial=page.evaluate('__game.renderer.frames')
  page.wait_for_function('n => __game.renderer.frames > n + 3',arg=initial,timeout=90000)
  samples.append(page.evaluate('({renderer:__game.renderer,screen:__game.screen,mode:__game.mode,state:{caseIndex:__game.state.caseIndex,players:__game.state.players.length}})'))
  check('start action enters playable shift',samples[-1]['mode']=='playing' and samples[-1]['screen']=='')
  check('gameplay WebGPU remains live',not samples[-1]['renderer']['deviceLost'] and samples[-1]['renderer']['drawCalls']>0)
  check('no uncaught page errors',not errors,json.dumps(errors))
  c.close();b.close()
except Exception as exc:
 check('deployment flow completes',False,str(exc))
report={'file':FILE.name,'method':'Direct file://, real pinned CDN requests, no route substitutions','browser':'Chromium 153 / Playwright 1.63','flags':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--disable-vulkan-surface'],'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'checks':checks,'samples':samples,'pageErrors':errors,'console':logs}
(D/'file-deployment.json').write_text(json.dumps(report,indent=2))
for entry in checks:
 if not entry['pass']:print('FAIL '+entry['name']+': '+entry['detail'])
print(str(report['passed'])+' passed, '+str(report['failed'])+' failed')
