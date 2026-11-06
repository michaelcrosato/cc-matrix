from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    page=b.new_page(viewport={"width":1920,"height":1080})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(Path('artifacts/visual-test.html').resolve().as_uri())
    page.wait_for_timeout(200)
    page.screenshot(path='artifacts/art-spike.png')
    print(json.dumps({'errors':errors,'game':page.evaluate('game.errors'),'screen':page.evaluate('[game.W,game.H]')}))
    page.evaluate("game.settings.set('music',.1)")
    page.keyboard.press('Space')
    page.evaluate('game.advance(1,{draw:true})')
    page.wait_for_timeout(150)
    print(json.dumps(page.evaluate('aud.stats()')))
    page.evaluate("game.audio.mute(true)")
    page.wait_for_timeout(150)
    print(json.dumps({'muted':page.evaluate('aud.stats()')}))
    page.evaluate("game.audio.mute(false)")
    print(json.dumps(page.evaluate('TallTale.Audio.diagnostic(window.OfflineAudioContext)')))
    b.close()
