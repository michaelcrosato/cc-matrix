from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL=(ROOT.parent/(ROOT.name+'.html')).as_uri()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-vulkan=swiftshader','--use-angle=swiftshader'])
 c=b.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1);page=c.new_page();page.goto(URL);page.wait_for_function('window.__game',timeout=90000)
 page.evaluate('__game.do({load:3});__game.step(30000,true)');page.wait_for_timeout(100);page.screenshot(path=str(ROOT/'tests/out/results.png'))
 page.evaluate('__game.do({load:3});__game.do({screen:"chart"})');page.wait_for_timeout(100);page.screenshot(path=str(ROOT/'tests/out/chart.png'))
 page.evaluate('__game.do({action:"about"});__game.do({action:"aboutsection:2"})');page.wait_for_timeout(100);page.screenshot(path=str(ROOT/'tests/out/about.png'));c.close()
 c=b.new_context(**p.devices['iPhone SE']);c.add_init_script('window.__surgeryTestNoGPU=true;');page=c.new_page();page.goto(URL);page.wait_for_function('window.__game');page.locator('#touch-settings').tap();page.screenshot(path=str(ROOT/'tests/out/mobile-settings.png'));c.close();b.close()
print('Final chart, results, About and mobile settings captures written.')
