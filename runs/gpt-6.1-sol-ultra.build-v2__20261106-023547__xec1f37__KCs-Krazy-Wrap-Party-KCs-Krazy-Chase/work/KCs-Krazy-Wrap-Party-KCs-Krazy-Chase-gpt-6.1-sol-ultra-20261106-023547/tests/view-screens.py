"""Purposeful final-artifact visual captures; debug scene setup is used only for art inspection."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]
project=json.loads((p/'project.json').read_text())
url=(p.parent/(project['slug']+'.html')).as_uri()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1920,'height':1080})
    page.goto(url)
    page.wait_for_function('window.__garden && window.__garden.game')
    page.wait_for_timeout(150)
    page.screenshot(path=str(p/'artifacts/final-title-tv.png'))
    for i in range(5):
        page.evaluate('(i)=>window.__garden.game.debug.restore(GardenSim.create({garden:i,players:2}))',i)
        page.wait_for_timeout(100)
        page.screenshot(path=str(p/f'artifacts/final-garden-{i+1}.png'))
    errors=page.evaluate('window.__garden.game.errors')
    page.close()
    ctx=browser.new_context(**pw.devices['iPhone 13'])
    page=ctx.new_page()
    page.goto(url)
    page.wait_for_function('window.__garden && window.__garden.game')
    page.wait_for_timeout(150)
    page.screenshot(path=str(p/'artifacts/final-title-phone.png'))
    page.evaluate('window.__garden.game.debug.restore(GardenSim.create({garden:4,players:1}))')
    page.wait_for_timeout(100)
    page.screenshot(path=str(p/'artifacts/final-garden-phone.png'))
    errors+=page.evaluate('window.__garden.game.errors')
    (p/'artifacts/visual-check.json').write_text(json.dumps({'errors':errors,'scope':'Native Chromium rendered final assembled artifact. Debug restore only stages garden compositions; no gameplay completion claim.'},indent=2))
    ctx.close()
    browser.close()
    if errors: raise SystemExit(str(errors))
