from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL=(ROOT.parent/(ROOT.name+'.html')).as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-vulkan=swiftshader','--use-angle=swiftshader'])
 page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1);page.goto(URL);page.wait_for_function('window.__game',timeout=90000)
 page.evaluate('__game.do({action:"new"});__game.do({action:"difficulty:0"});__game.do({action:"advance"})');page.wait_for_timeout(200)
 page.screenshot(path=str(ROOT/'tests/out/story.png'))
 page.evaluate('__game.do({load:3});__game.step(30000,true)');page.wait_for_timeout(100)
 page.screenshot(path=str(ROOT/'tests/out/results.png'))
 page.evaluate('__game.do({load:6});__game.do({screen:"pause"});__game.do({action:"dev"})');page.wait_for_timeout(100)
 page.screenshot(path=str(ROOT/'tests/out/dev.png'))
 page.evaluate('__game.do({action:"about"})');page.wait_for_timeout(100)
 page.screenshot(path=str(ROOT/'tests/out/about.png'))
 browser.close()
print('Visual captures written.')
