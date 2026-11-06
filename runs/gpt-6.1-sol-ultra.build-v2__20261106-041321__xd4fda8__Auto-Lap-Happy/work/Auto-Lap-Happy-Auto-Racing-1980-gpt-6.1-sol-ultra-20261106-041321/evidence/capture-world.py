from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).parent
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 page=browser.new_page(viewport={"width":1920,"height":1080},device_scale_factor=1)
 page.goto((p/'world-preview.html').as_uri());page.wait_for_timeout(500)
 for c,d in [(0,0),(0,2300),(1,800),(2,2000),(3,3600),(4,9500)]:
  page.evaluate('([c,d])=>preview.set(c,d)',[c,d]);page.wait_for_timeout(120)
  page.screenshot(path=str(p/f'world-{c}-{d}.png'))
 print(page.evaluate('preview.g.errors'))
 browser.close()
