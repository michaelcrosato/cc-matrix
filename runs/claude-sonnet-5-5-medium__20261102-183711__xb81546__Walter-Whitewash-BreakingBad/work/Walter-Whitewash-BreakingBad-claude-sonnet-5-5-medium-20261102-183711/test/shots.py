# Drives the bundled game into each screen and photographs it.
import sys, json, os
from playwright.sync_api import sync_playwright
FILE = os.path.abspath(sys.argv[1]); OUT = sys.argv[2]; W = int(sys.argv[3]) if len(sys.argv) > 3 else 1280; H = int(sys.argv[4]) if len(sys.argv) > 4 else 720
os.makedirs(OUT, exist_ok=True); errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    p = br.new_context(viewport={'width': W, 'height': H}).new_page()
    p.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); p.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    p.goto('file://' + FILE); p.wait_for_timeout(2500)
    ev = lambda js: p.evaluate(js)
    def shot(n, wait=400): p.wait_for_timeout(wait); p.screenshot(path=f'{OUT}/{n}.png')
    ev("WW.debug.game.go('play', {fresh: true})"); p.wait_for_timeout(1500)
    ev("WW.debug.talk.close(); WW.debug.setMode('walk'); WW.debug.S().flags={jimmyMet:1,solMet:1}")
    ev("var S=WW.debug.S(); S.dirty=4000; S.clean=2500; S.ingredients=1; S.bricks=[88,92,95]")
    shot('10-walk')
    # go to the cook station
    ev("var s=WW.debug.stations().find(s=>s.id==='cook'); WW.debug.game.debug.teleport(s.x, s.y+4)"); shot('11-cook-prompt')
    ev("WW.debug.fn.beginCook()"); shot('12-cook-measure')
    ev("var k=WW.debug.cook(); k.mScores=[1,1,1]; k.phase='heat'; k.hT=3; k.temp=.6"); shot('13-cook-heat', 200)
    ev("var k=WW.debug.cook(); k.phase='filter'; k.seqI=2"); shot('14-cook-filter', 200)
    ev("var k=WW.debug.cook(); k.mScores=[1,1,.9]; k.inBand=8; k.total=9; k.fHits=8; WW.debug.fn.cookFinish()"); shot('15-cook-result', 300)
    ev("WW.debug.setMode('walk')"); 
    ev("WW.debug.fn.openShop()"); shot('16-shop')
    ev("WW.debug.ui.hide(); WW.debug.fn.openLaunder()"); shot('17-launder')
    ev("WW.debug.ui.hide(); WW.debug.fn.showAbout()"); shot('18-about')
    ev("WW.debug.ui.hide(); WW.debug.fn.openMap()"); shot('19-map')
    ev("WW.debug.ui.hide(); WW.debug.S().day=2; WW.debug.fn.finishDay('sleep')"); shot('20-report')
    ev("WW.debug.ui.hide(); WW.debug.S().day=5; WW.debug.fn.newMorning(false); WW.debug.fn.hatchAct()"); p.wait_for_timeout(500)
    for i in range(12): p.keyboard.press('Enter'); p.wait_for_timeout(150)
    shot('21-lab-intro')
    for i in range(30): p.keyboard.press('Enter'); p.wait_for_timeout(150)
    shot('22-lab', 1500)
    ev("WW.debug.fn.goEnding('win')"); p.wait_for_timeout(500); shot('23-end', 800)
    print('errors:', errs if errs else 'none')
    br.close()
