from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,sys,math
p=Path(__file__).resolve().parent
html=p.parent/(p.name+'.html')
checks=0;fails=[]
def check(ok,name):
 global checks
 checks+=1
 if not ok:fails.append(name);print('FAIL:',name)
credits=json.loads((p.parent/'exit-interview.json').read_text())
source=html.read_text()
check((p/'session.js').read_text() in source,'unmodified Hub client embedded')
check(not re.search(r'import\s+.*?from\s+[\'"]\./',source),'single HTML has no local module dependencies')
check(all(s in source for s in ['0.180.0','0.19.3','GAME_CREDITS']),'pinned dependencies and credits bundled')
check(set(credits)=={'sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub'},'exit interview schema')
check([len(credits[k]) for k in ['testingFeedback','engineFeedback','promptFeedback']]==[4,6,4],'all feedback answers present')
selection=json.loads((p/'title-selection.json').read_text())
check(len(selection['candidates'])==50 and selection['candidates'][selection['randomIndex']]==selection['title']=='Californium Games','random title selection audit')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':800})
 try:
  page.goto(html.as_uri(),wait_until='domcontentloaded');page.wait_for_function('__game.state.ready',timeout=45000)
  check(page.evaluate('__game.state.screen')=='title' and page.locator('canvas').count()==1,'file URL boots packaged game')
  page.click('#about');text=page.inner_text('#about-content')
  check(all(x in text for x in ['SOURCE INFORMATION','TESTING FEEDBACK','ENGINE FEEDBACK','PROMPT FEEDBACK','added on import']),'in-game About has required information and feedback')
  page.keyboard.press('Escape');page.click('#start');page.click('#brief-go');page.wait_for_timeout(250)
  pos=page.evaluate('__game.state.position');check(page.evaluate('__game.state.screen')=='playing' and all(math.isfinite(x) for x in pos.values()),'packaged file starts real physics gameplay')
  check(not page.evaluate('__game.state.stats.errors'),'packaged file has no runtime errors')
 except Exception as e:check(False,str(e))
 finally:b.close()
(p/'test-package-results.json').write_text(json.dumps({'checks':checks,'failures':fails},indent=2))
print(f'{checks} package checks; {len(fails)} failures')
sys.exit(bool(fails))
