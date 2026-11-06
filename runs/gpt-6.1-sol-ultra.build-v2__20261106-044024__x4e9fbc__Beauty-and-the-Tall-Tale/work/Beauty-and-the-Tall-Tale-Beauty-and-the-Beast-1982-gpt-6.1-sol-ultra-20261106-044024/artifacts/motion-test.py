from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    page=b.new_page(viewport={"width":1280,"height":960})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(Path('artifacts/motion-test.html').resolve().as_uri())
    print(json.dumps(page.evaluate('nextWindow()')))
    for i in range(7):
        page.evaluate('game.advance(.12,{draw:true})')
        page.screenshot(path=f'artifacts/climb-{i}.png',clip={'x':330,'y':530,'width':180,'height':370})
    print(json.dumps(page.evaluate('seekThrow()')))
    for i in range(6):
        page.evaluate('game.advance(.15,{draw:true})')
        page.screenshot(path=f'artifacts/throw-{i}.png',clip={'x':800,'y':60,'width':210,'height':280})
    print(json.dumps({'pageErrors':errors,'gameErrors':page.evaluate('game.errors')}))
    b.close()
