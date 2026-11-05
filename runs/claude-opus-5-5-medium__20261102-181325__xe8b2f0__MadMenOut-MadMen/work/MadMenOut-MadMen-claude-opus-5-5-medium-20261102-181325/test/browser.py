#!/usr/bin/env python3
"""Browser checks of the bundled game: Chromium, Firefox and WebKit play the title, the office in three views, the
deck, the brainstorm, a pitch, an evening and the About pages, with real key presses and mouse clicks.
Screenshots go to /tmp/mmo-shots/<engine>-<step>.png; console errors fail the run.
python3 test/browser.py [http://127.0.0.1:18731/MadMenOut-...html] [chromium,firefox,webkit]"""
import sys, os, json, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else 'http://127.0.0.1:18731/MadMenOut-MadMen-claude-opus-5-5-medium-20261102-181325.html'
ENGINES = (sys.argv[2] if len(sys.argv) > 2 else 'chromium,firefox,webkit').split(',')
OUT = '/tmp/mmo-shots'; os.makedirs(OUT, exist_ok=True)
fails = []

def run(pw, name):
    b = getattr(pw, name).launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function('window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === "title"', timeout=30000)
    time.sleep(1.2)
    snap = lambda: pg.evaluate('My3D2dge.current.debug.snapshot()')
    shot = lambda step: pg.screenshot(path=f'{OUT}/{name}-{step}.png')
    def ok(what, cond, detail=''):
        print(('ok   ' if cond else 'FAIL ') + name + ': ' + what + ('' if cond else ' ' + str(detail)))
        if not cond: fails.append(name + ': ' + what)
    def talk_through(n=80):
        for _ in range(n):
            if not pg.evaluate('My3D2dge.current.debug.talk.open'):
                time.sleep(.2)
                if not pg.evaluate('My3D2dge.current.debug.talk.open'): return
            pg.keyboard.press('Enter'); time.sleep(.12)
    shot('01-title')
    # the mouse on the title: hover then click NEW CAMPAIGN
    box = pg.evaluate('(() => { const g = My3D2dge.current; return [g.screen.canvas.getBoundingClientRect().width, g.W]; })()')
    pg.keyboard.press('Enter'); time.sleep(2)
    ok('Enter starts a campaign', snap()['scene'] == 'office', snap()['scene'])
    shot('02-office-morning')
    talk_through()
    shot('03-office')
    pg.keyboard.down('KeyW'); time.sleep(.9); pg.keyboard.up('KeyW'); time.sleep(.3)
    shot('04-office-walked')
    pg.keyboard.press('KeyV'); time.sleep(.6); shot('05-view-iso')
    pg.keyboard.press('KeyV'); time.sleep(.6); shot('06-view-topdown')
    pg.keyboard.press('KeyV'); time.sleep(.4)
    ok('V cycles back to threequarter', snap()['view'] == 'threequarter', snap()['view'])
    # Ruth, with E
    pg.evaluate('My3D2dge.current.debug.near("ruth")'); time.sleep(.3)
    shot('07-near-ruth')
    pg.keyboard.press('KeyE'); time.sleep(1.2); shot('08-talk-ruth')
    talk_through()
    ok('Ruth gave a card', 'signature' in snap()['insights'], snap()['insights'])
    for who in ['eddie', 'monty', 'dolores']:
        pg.evaluate(f'My3D2dge.current.debug.near("{who}")'); time.sleep(.2); pg.keyboard.press('KeyE'); time.sleep(.5); talk_through()
    time.sleep(.5); shot('09-toasts')
    pg.keyboard.press('Tab'); time.sleep(.5); shot('10-deck'); pg.keyboard.press('Tab'); time.sleep(.3)
    # click-to-walk: the mouse clicks the floor
    c = pg.locator('#screen').bounding_box()
    pg.mouse.move(c['x'] + c['width'] * .6, c['y'] + c['height'] * .55); time.sleep(.2)
    pg.mouse.click(c['x'] + c['width'] * .6, c['y'] + c['height'] * .55); time.sleep(1.2)
    shot('11-clicked-walk')
    # the typewriter
    pg.evaluate('My3D2dge.current.debug.near("typewriter")'); time.sleep(.3); pg.keyboard.press('KeyE'); time.sleep(1.2)
    ok('the typewriter opens the brainstorm', snap()['scene'] == 'brainstorm', snap()['scene'])
    shot('12-brainstorm')
    for _ in range(3):
        pg.keyboard.press('Enter'); time.sleep(.25); pg.keyboard.press('ArrowRight'); time.sleep(.2)
    time.sleep(1); shot('13-brainstorm-chosen')
    pg.evaluate('(() => { const B = My3D2dge.current.debug.BR; B.focus = B.cards.length; })()'); pg.keyboard.press('Enter'); time.sleep(1.5)
    ok('the campaign is written', len(snap()['deck']) >= 1, snap()['deck'])
    pg.evaluate('My3D2dge.current.debug.near("conf")'); time.sleep(.3); pg.keyboard.press('KeyE'); time.sleep(1.5)
    ok('the pitch begins', snap()['scene'] == 'pitch', snap()['scene'])
    time.sleep(1); shot('14-pitch-hello'); talk_through()
    shot('15-pitch-choose')
    pg.keyboard.press('Enter'); time.sleep(.7); shot('16-pitch-deliver')
    # deliver with the mouse: click when the needle is in the gold
    for _ in range(400):
        st = pg.evaluate('(() => { const P = My3D2dge.current.debug.PT; return [P.phase, P.needle, P.zone[0], P.zone[1]]; })()')
        if st[0] != 'deliver': break
        if abs(st[1] - (st[2] + st[3]) / 2) < (st[3] - st[2]) * .2: pg.mouse.click(c['x'] + 50, c['y'] + 50); time.sleep(.1); break
        time.sleep(.01)
    time.sleep(.4); shot('17-pitch-react')
    # play the rest quickly through the debug handle's state, pressing keys
    for _ in range(2000):
        s = pg.evaluate('(() => { const P = My3D2dge.current.debug.PT, t = My3D2dge.current.debug.talk; return [My3D2dge.current.sceneName, P.phase, P.needle, P.zone[0], P.zone[1], P.beatT || 0, P.beatDur || 1, P.beats[P.beat] || "", t.open, P.t]; })()')
        if s[0] != 'pitch': break
        if s[8]: pg.keyboard.press('Enter'); time.sleep(.15); continue
        ph = s[1]
        if ph == 'choose': pg.keyboard.press('Enter')
        elif ph == 'deliver' and abs(s[2] - (s[3] + s[4]) / 2) < (s[4] - s[3]) * .25: pg.keyboard.press('Space')
        elif ph == 'pivot': pg.keyboard.press('KeyR')
        elif ph == 'close':
            if s[5] > s[6] - .09: pg.keyboard.press({'up': 'ArrowUp', 'down': 'ArrowDown', 'left': 'ArrowLeft', 'right': 'ArrowRight'}[s[7]]); time.sleep(.3)
            if s[5] < .5 and not os.path.exists(f'{OUT}/{name}-18-close.png'): shot('18-close')
        elif ph == 'verdict' and s[9] > 1.7:
            shot('19-verdict'); pg.keyboard.press('Enter'); time.sleep(.5)
        time.sleep(.01)
    time.sleep(2.5); shot('20-evening'); talk_through(); time.sleep(.5)
    ok('the evening follows the pitch', snap()['scene'] in ('vignette', 'office'), snap()['scene'])
    # About pages
    pg.evaluate('My3D2dge.current.go("about", { from: "title" })'); time.sleep(1)
    for i in range(7):
        shot(f'21-about-{i}'); pg.keyboard.press('ArrowRight'); time.sleep(.3)
    pg.keyboard.press('Escape'); time.sleep(1)
    ok('About goes back to the title', snap()['scene'] == 'title', snap()['scene'])
    # attract after 10 s idle, any key ends it
    time.sleep(11.5)
    ok('attract mode after 10 s idle', snap()['attract'], snap())
    time.sleep(6); shot('22-attract')
    pg.keyboard.press('KeyX'); time.sleep(1.2)
    ok('a key ends the attract mode', not snap()['attract'] and snap()['scene'] == 'title', snap())
    # the pause menu and settings exist
    pg.keyboard.press('Enter'); time.sleep(1.5); talk_through(); pg.keyboard.press('Escape'); time.sleep(.8); shot('23-pause')
    ok('Escape pauses the office', pg.evaluate('My3D2dge.current.paused'), '')
    pg.keyboard.press('Escape'); time.sleep(.5)
    ok('no console errors', not errs, errs[:5])
    ok('no game errors', snap()['errors'] == 0, pg.evaluate('My3D2dge.current.errors.map(e => String(e.message || e))'))
    b.close()

with sync_playwright() as pw:
    for e in ENGINES: run(pw, e)
print('\n' + ('ALL OK' if not fails else str(len(fails)) + ' FAILED: ' + '; '.join(fails)))
sys.exit(1 if fails else 0)
