from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1536,'height':864})
 page.goto((p/'artifacts/view-preview.html').as_uri())
 page.wait_for_timeout(600)
 print(page.evaluate('game.errors'))
 page.screenshot(path=str(p/'artifacts/view-preview.png'))
 browser.close()
