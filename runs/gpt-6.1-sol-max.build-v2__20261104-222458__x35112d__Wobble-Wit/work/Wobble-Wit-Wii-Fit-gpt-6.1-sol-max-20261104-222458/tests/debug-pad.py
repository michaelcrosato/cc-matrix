from playwright.sync_api import sync_playwright
from pathlib import Path
exec(Path('tests/browser.py').read_text().split('with sync_playwright()as pw:')[0])
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader']);p=b.new_page(viewport={'width':320,'height':180});p.add_init_script(PAD);p.on('console',lambda m:print(m.type,m.text[:220],flush=True)if m.type in['error','warning']else None);p.on('pageerror',lambda e:print('ERROR',str(e),flush=True));p.goto(PAGE.as_uri());p.wait_for_function('window.__gameStatus',timeout=120000)
 for label,btn in [('neutral',[]),('down',[13]),('release',[]),('cross',[0])]:
  p.evaluate('__setPad([0,0,0,0],'+str(btn)+')');p.wait_for_timeout(1000);print(label,p.evaluate('({pad:__fitPad,last:__fitLastDevice,state:JSON.parse(__gameStatus).device,focus:JSON.parse(__gameStatus).focus,screen:JSON.parse(__gameStatus).screen,tick:JSON.parse(__gameStatus).tick})'),flush=True)
 b.close()
