from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 page=b.new_page(viewport={"width":1920,"height":1080})
 errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.goto((base/'preview.html').as_uri())
 page.wait_for_timeout(1500)
 assert not errors, errors
 assert not page.evaluate('preview.game.errors'), page.evaluate('preview.game.errors')
 page.screenshot(path=str(base/'preview.png'))
 b.close()
 print("1 native asset preview check passed")
