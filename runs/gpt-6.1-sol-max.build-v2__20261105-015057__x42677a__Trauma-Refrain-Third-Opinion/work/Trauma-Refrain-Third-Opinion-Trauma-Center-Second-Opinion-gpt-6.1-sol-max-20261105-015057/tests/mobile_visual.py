from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.webkit.launch();c=b.new_context(**p.devices['iPhone SE']);page=c.new_page();page.goto((root.parent/(root.name+'.html')).as_uri());page.wait_for_function('window.__game');page.locator('#touch-settings').tap();page.screenshot(path=str(root/'tests/out/mobile-settings.png'));page.evaluate('__game.do({action:"settingstab:1"})');page.screenshot(path=str(root/'tests/out/mobile-controls.png'));b.close()
print('Small-phone settings captured in WebKit.')
