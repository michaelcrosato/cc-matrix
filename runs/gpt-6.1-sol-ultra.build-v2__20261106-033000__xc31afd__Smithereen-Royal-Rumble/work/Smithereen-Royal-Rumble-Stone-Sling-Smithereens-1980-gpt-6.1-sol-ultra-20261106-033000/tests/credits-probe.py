import pathlib,json,sys
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1]
project=json.loads((base/'project.json').read_text());artifact=base.parent/(project['basename']+'.html')
checks,failures=0,[]
def check(value,message):
 global checks
 checks+=1
 if not value:failures.append(message)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1920,'height':1080});page.goto(artifact.as_uri());page.wait_for_function('window.__rumble&&window.__rumble.ui');page.keyboard.press('Enter');page.wait_for_function('window.__rumble.screen==="play"');page.evaluate('window.__rumble.pause();window.__rumble.ui.open("about")')
 check(page.evaluate('getComputedStyle(document.querySelector(".esh-sh")).opacity')=='1','credits have immediate opacity')
 pages=page.evaluate('window.__rumble.menu[0].choices.length');texts=[];titles=[];bounds=[]
 for _ in range(pages):
  texts.append(page.locator('.rumble-meta').inner_text());titles.append(page.locator('.esh-mod h2').inner_text())
  bounds.append(page.evaluate('''() => {const r=document.querySelector('.esh-mod h2').getBoundingClientRect(),m=document.querySelector('.rumble-meta');return r.y>=0&&r.bottom<=innerHeight&&m.scrollHeight<=m.clientHeight+1}'''))
  page.keyboard.press('Enter')
 check(all(bounds),'all TV credits headings and complete text visible')
 check(set(titles)=={'Source Information','Testing Feedback','Engine Feedback','Prompt Feedback'},'all required sections reachable')
 metadata=page.evaluate('window.__rumble.metadata.sourceInformation');check(all(' '.join(value.split()) in ' '.join('\n\n'.join(texts).replace('(continued)', '').split()) for value in metadata.values()),'all source fields retained')
 page.screenshot(path=str(base/'artifacts/final-credits.png'))
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(80);page.evaluate('window.__rumble.ui.refresh()')
 bounds=[]
 for _ in range(pages):
  bounds.append(page.evaluate('''() => {const r=document.querySelector('.esh-mod h2').getBoundingClientRect(),m=document.querySelector('.rumble-meta');return r.y>=0&&r.bottom<=innerHeight&&m.scrollHeight<=m.clientHeight+1}'''))
  page.keyboard.press('Enter')
 check(all(bounds),'all phone credits headings and complete text visible')
 page.screenshot(path=str(base/'artifacts/credits-phone.png'));b.close()
for failure in failures:print('FAIL:',failure)
print(f'{checks} checks, {len(failures)} failures');sys.exit(bool(failures))
