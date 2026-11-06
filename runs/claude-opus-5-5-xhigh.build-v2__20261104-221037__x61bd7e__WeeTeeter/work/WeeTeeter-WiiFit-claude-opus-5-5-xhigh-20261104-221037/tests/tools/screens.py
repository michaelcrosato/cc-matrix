# Screens tour at 1080p. python3 tests/tools/screens.py outdir [names]
import sys, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; want = sys.argv[2:]
stem = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037.html'
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', stem))
os.makedirs(out, exist_ok=True)
SETUP = "G.devMember(3); G.S.instructor='alder'; G.S.minutes=24; G.S.best={stork:[3],squat:[2],step:[1],flow:[2],hoop:[2],tray:[3]}; G.S.history=[71,62,51]; G.S.shown=51; G.S.wear.towel=true; G.S.wear.headband=true;"
TOUR = {
 'title': ["G.go('title',null,{fade:0})", 1500],
 'member': ["G.Save.create(0,'Sir Slouch',{hair:'spiky',skin:2,top:1,bottom:0}); G.go('member',null,{fade:0})", 1000],
 'membernew': ["G.go('member',null,{fade:0})", 500, "key:ArrowRight", 200, "key:Enter", 800],
 'arrival': ["G.S.arrived=false; G.go('arrival',null,{fade:0})", 1000],
 'arrival2': ["G.S.arrived=false; G.go('arrival',null,{fade:0})", 800, "key:Enter", 1500, "key:Enter", 300, "key:Enter", 800],
 'island': ["G.go('island',null,{fade:0})", 1500],
 'islandwalk': ["G.go('island',null,{fade:0})", 500, "down:KeyD", 1600, "up:KeyD", 300],
 'check1': ["G.S.checked=false; G.go('bodycheck',{day:3},{fade:0})", 1200],
 'check2': ["G.S.checked=false; G.go('bodycheck',{day:3},{fade:0})", 800, "key:Enter", 300, "key:Enter", 3000],
 'evening': ["G.S.session=3; G.go('evening',null,{fade:0})", 1500],
 'tareday': ["G.S.day=4; G.go('tareday',null,{fade:0})", 1500],
 'games': ["G.S.day=5; G.go('games',null,{fade:0})", 1500],
 'duel': ["G.S.day=5; G.go('duel',null,{fade:0})", 1500, "key:Enter", 200, "key:Enter", 300, "key:Enter", 300, "key:Enter", 4200, "js:G.DEV.bot='good'", 9000],
 'ending': ["G.S.day=5; G.go('ending',null,{fade:0})", 2500],
 'about': ["G.go('about',null,{fade:0})", 800],
 'class': ["G.go('class',null,{fade:0})", 900],
 'attract': ["G.go('attract',null,{fade:0})", 1800],
 'free': ["G.go('freeplay',null,{fade:0})", 800],
}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + path)
    pg.wait_for_function('window.G && G.game && G.game.sceneName === "title"', timeout=30000)
    pg.evaluate('G.game.fadeTime = 0')
    for name, steps in TOUR.items():
        if want and name not in want: continue
        pg.evaluate(SETUP + 'G.DEV.bot=null;' + steps[0])
        for s in steps[1:]:
            if isinstance(s, int): pg.wait_for_timeout(s)
            elif s.startswith('key:'): pg.keyboard.press(s[4:])
            elif s.startswith('down:'): pg.keyboard.down(s[5:])
            elif s.startswith('up:'): pg.keyboard.up(s[3:])
            elif s.startswith('js:'): pg.evaluate(s[3:])
        pg.screenshot(path=f'{out}/{name}.png')
        print(name, pg.evaluate('G.game.sceneName'), errs[:2])
    b.close()
