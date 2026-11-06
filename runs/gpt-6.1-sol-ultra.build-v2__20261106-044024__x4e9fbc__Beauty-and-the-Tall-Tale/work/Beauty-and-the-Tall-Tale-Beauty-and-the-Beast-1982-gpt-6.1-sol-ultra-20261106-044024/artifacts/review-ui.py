from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT=Path.cwd();ID=json.loads((ROOT/'build-identity.json').read_text());URL=(ROOT.parent/(ID['basename']+'.html')).as_uri()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 ctx=b.new_context(viewport={'width':1920,'height':1080})
 pg=ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(URL);pg.wait_for_function('window.TallTaleApp?.state.ready');pg.evaluate('TallTaleApp.game.stop()')
 pg.get_by_role('button',name='Climb solo',exact=False).click();pg.get_by_role('button',name='Let’s climb',exact=False).click();pg.evaluate('TallTaleApp.game.advance(.4,{draw:true})');pg.wait_for_timeout(400)
 print(json.dumps({'firstPlayAudio':pg.evaluate('TallTaleApp.sound.stats()'),'errors':errors}))
 ctx.close()
 ctx=b.new_context(**p.devices['iPhone 13']);pg=ctx.new_page();pg.goto(URL);pg.wait_for_function('window.TallTaleApp?.state.ready');pg.evaluate('TallTaleApp.game.stop();TallTaleApp.game.advance(.02,{draw:true})');pg.screenshot(path=str(ROOT/'artifacts/review-phone-title.png'))
 pg.get_by_role('button',name='Climb solo',exact=False).tap();pg.get_by_role('button',name='Let’s climb',exact=False).tap();pg.evaluate('TallTaleApp.game.advance(.5,{draw:true})');pg.screenshot(path=str(ROOT/'artifacts/review-phone-game.png'))
 print(json.dumps({'phone':pg.evaluate('({res:[TallTaleApp.game.W,TallTaleApp.game.H],x:TallTaleApp.state.sim.actors[0].body.x,device:TallTaleApp.game.input.lastDevice,hud:document.querySelector("#game-hud").getBoundingClientRect().toJSON(),prompt:document.querySelector("#game-prompt").getBoundingClientRect().toJSON()})')}))
 ctx.close();b.close()
