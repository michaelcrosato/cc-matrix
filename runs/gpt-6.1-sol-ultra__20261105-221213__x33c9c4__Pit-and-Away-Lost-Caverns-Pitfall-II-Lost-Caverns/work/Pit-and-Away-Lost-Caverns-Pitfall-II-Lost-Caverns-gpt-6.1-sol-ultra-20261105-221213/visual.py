from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':1920,'height':1080})
 page.goto('http://127.0.0.1:46221/game.html?compat=1');page.wait_for_function('window.__game?.ready',timeout=90000)
 page.wait_for_function('__game.state.renderFrames>1',timeout=90000);page.evaluate('__game.title()');page.screenshot(path='title-tv.png')
 page.evaluate('__game.start()');page.evaluate('__game.setManual(true);__game.advance(30)')
 start=page.evaluate('__game.state.renderFrames');page.wait_for_function(f'__game.state.renderFrames>{start+2}',timeout=90000);page.screenshot(path='landing-tv.png')
 page.evaluate('__game.warp(2);Object.assign(__game.getActor(0),{x:61,y:-25});__game.advance(1)')
 start=page.evaluate('__game.state.renderFrames');page.wait_for_function(f'__game.state.renderFrames>{start+2}',timeout=90000);page.screenshot(path='archive-tv.png')
 page.evaluate('__game.pause()');page.locator('[data-action=dev]').click();page.screenshot(path='developer-tv.png')
 b.close()
