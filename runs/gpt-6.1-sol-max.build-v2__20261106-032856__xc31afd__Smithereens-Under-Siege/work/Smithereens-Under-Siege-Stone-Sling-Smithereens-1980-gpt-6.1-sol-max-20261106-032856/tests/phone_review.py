from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True);ctx=b.new_context(**p.devices['iPhone 13']);pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
 pg.goto((root/'artifacts/game.html').as_uri());pg.wait_for_function('window.__SIEGE?.world');pg.evaluate('__SIEGE.app.prepare("quick",{court:3});__SIEGE.game.input.lastDevice="touch"')
 for i in range(3):
  pg.wait_for_timeout(500)
  print(json.dumps(pg.evaluate('({state:__SIEGE.app.snapshot(),paused:__SIEGE.game.paused,reason:__SIEGE.game.pauseReason,running:__SIEGE.game._running,real:__SIEGE.game.real})')))
 pg.screenshot(path=str(root/'artifacts/phone.png'))
 print(json.dumps(pg.evaluate('([...document.querySelectorAll(".court-clock,.team-plate")].map(e=>({class:e.className,text:e.textContent,rect:e.getBoundingClientRect().toJSON(),display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility})))')));print(errs);b.close()
