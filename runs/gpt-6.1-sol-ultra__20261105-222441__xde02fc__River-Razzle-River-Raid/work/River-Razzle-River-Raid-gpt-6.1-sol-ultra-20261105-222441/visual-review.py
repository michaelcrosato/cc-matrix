from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
URL='http://127.0.0.1:38191/River-Razzle-River-Raid-gpt-6.1-sol-ultra-20261105-222441.html'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1600,'height':1000})
 page.goto(URL);page.wait_for_function('window.__RAZZLE__?.state.ready',timeout=90000)
 page.evaluate('__RAZZLE__.start(1);__RAZZLE__.game.warp(650);__RAZZLE__.game.god=true;')
 page.wait_for_timeout(1000);page.screenshot(path=str(ROOT/'island-review.png'))
 page.set_viewport_size({'width':844,'height':390});page.evaluate('__RAZZLE__.resetTitle()');page.screenshot(path=str(ROOT/'touch-menu-review.png'))
 print('Visual review: island composition and short landscape menu captured')
 b.close()
