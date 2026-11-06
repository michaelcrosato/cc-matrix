# The same game on three devices: one player, one device only, from the title through a whole first day to the next morning.
# A stand-in pad, real key events, or real pointer events: nothing else steers menus or the walk. The long stretches of
# exercise run at 4x with the Dev bot, so the device under test does everything a person navigates by.
import os, sys, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
PATH = os.path.abspath(os.path.join(ROOT, '..', 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037.html'))
which = sys.argv[1:] or ['pad', 'keys', 'mouse']
def check(name, ok, detail=''): print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(detail)[:400]), flush=True)
PAD = """
const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], timestamp: 1, buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null];
window.__btn = (i, v) => { pad.buttons[i].pressed = v > .5; pad.buttons[i].value = v; pad.buttons[i].touched = v > 0; pad.timestamp++; };
"""
STATE = """(() => { const g = G.game, t = G.talk, P = G.activePills; let rects = null; if (P) { rects = P.layout(); }
  const sc = g.scene, ph = sc && sc.phase ? sc.phase() : null, k = g.screen.canvas.getBoundingClientRect();
  return { scene: g.sceneName, phase: ph, paused: g.paused, talk: t.open, modal: t.open && t.modal !== false, typing: t.typing, choices: t.open && t.choices ? t.choices.length : 0, sx: k.width / g.W, sy: k.height / g.H, day: G.S.day, session: G.S.session, checked: G.S.checked, step: g.sceneName === 'bodycheck' ? G.__bcStep && G.__bcStep() : null, pi: P ? P.i : -1, pn: P ? P.items.length : 0, labels: P ? P.items.map(i => i.label) : [], rects }; })()"""
class Dev:
    """press(what): the one way this device picks; move toward a screen direction for menus; walk toward a world point"""
    def __init__(s, pg, kind): s.pg, s.kind = pg, kind
    def st(s): return s.pg.evaluate(STATE)
    def wait(s, ms): s.pg.wait_for_timeout(ms)
    def btn(s, i, ms=120): s.pg.evaluate(f'__btn({i}, 1)'); s.wait(ms); s.pg.evaluate(f'__btn({i}, 0)'); s.wait(90)
    def click_at(s, x, y, button='left'):
        st = s.st(); cx, cy = x * st['sx'], y * st['sy']; s.pg.mouse.move(cx, cy); s.wait(90); s.pg.mouse.click(cx, cy, button=button); s.wait(140)
    def confirm(s):
        if s.kind == 'pad': s.btn(0)
        elif s.kind == 'keys': s.pg.keyboard.press('Enter'); s.wait(160)
        else:
            st = s.st()
            if st['talk'] and st['modal']:
                d = s.pg.evaluate("(() => { const d = G.talk._dims(); return [d.x + d.w / 2, d.y + d.h / 2]; })()"); s.click_at(d[0], d[1])
            elif st['rects'] and st['pi'] >= 0: r = st['rects'][st['pi']]; s.click_at(r['x'] + r['w'] / 2, r['y'] + r['h'] / 2)
    def pick(s, label):
        """focus a pill by its label with this device, then pick it"""
        for _ in range(14):
            st = s.st()
            if label not in st['labels']: s.wait(200); continue
            k = st['labels'].index(label)
            if s.kind == 'mouse': r = st['rects'][k]; s.click_at(r['x'] + r['w'] / 2, r['y'] + r['h'] / 2); return True
            if st['pi'] == k: s.confirm(); return True
            horiz = st['rects'][0]['y'] == st['rects'][-1]['y'] and len(st['rects']) > 1; fwd = k > st['pi']
            if s.kind == 'pad': s.btn({True: 15 if horiz else 13, False: 14 if horiz else 12}[fwd], 110)
            else: s.pg.keyboard.press({True: 'ArrowRight' if horiz else 'ArrowDown', False: 'ArrowLeft' if horiz else 'ArrowUp'}[fwd]); s.wait(160)
        return False
    def choose(s, i=0):
        if s.kind == 'mouse':
            xy = s.pg.evaluate(f"G.talk.choiceAt({i})")
            if xy: s.click_at(xy[0], xy[1])
            else: s.confirm()      # an earlier page: a click on the box turns it
        else: s.confirm()
    def lean(s, ux, uy):
        """lean toward (ux, uy), -1..1, forward up"""
        if s.kind == 'pad': s.pg.evaluate(f'__pad.axes[0] = {ux}; __pad.axes[1] = {-uy}; __pad.timestamp++')
        elif s.kind == 'mouse':
            st = s.pg.evaluate("[G.game.W, G.game.H, G.DEV.reach, G.game.screen.canvas.getBoundingClientRect().width / G.game.W, G.game.screen.canvas.getBoundingClientRect().height / G.game.H]")
            s.pg.mouse.move((st[0] / 2 + ux * st[1] * st[2]) * st[3], (st[1] / 2 - uy * st[1] * st[2]) * st[4])
    def walk_to(s, tx, ty, near=14, limit=60):
        """the walk: stick, WASD, or clicks, toward a world point"""
        held = set(); t = 0
        while t < limit:
            d = s.pg.evaluate(f"(() => {{ const b = G.Island.player(); return [{tx} - b.x, {ty} - b.y, b.x, b.y, G.talk.open, G.game.sceneName]; }})()")
            dist = (d[0] ** 2 + d[1] ** 2) ** .5
            if dist < near or d[5] != 'island': break   # (a click on a mat walks there and stands on it)
            if d[4]: s.confirm(); t += .2; continue
            if s.kind == 'pad': s.pg.evaluate(f'__pad.axes[0] = {d[0] / dist}; __pad.axes[1] = {d[1] / dist}; __pad.timestamp++')
            elif s.kind == 'keys':
                want = set(); 
                if d[0] > 5: want.add('KeyD')
                if d[0] < -5: want.add('KeyA')
                if d[1] > 5: want.add('KeyS')
                if d[1] < -5: want.add('KeyW')
                for k in held - want: s.pg.keyboard.up(k)
                for k in want - held: s.pg.keyboard.down(k)
                held = want
            else:
                p = s.pg.evaluate(f"(() => {{ const r = G.game.r, q = r.w({tx}, {ty}, 0), W = G.game.W, H = G.game.H; let x = q[0], y = q[1]; const cx = W / 2, cy = H / 2, m = 46; const kx = x < m ? (cx - m) / (cx - x) : x > W - m ? (cx - m) / (x - cx) : 1, ky = y < m ? (cy - m) / (cy - y) : y > H - m ? (cy - m) / (y - cy) : 1, k = Math.min(kx, ky); return [cx + (x - cx) * k, cy + (y - cy) * k]; }})()")
                s.click_at(p[0], p[1])
            s.wait(200); t += .2
        for k in held: s.pg.keyboard.up(k)
        if s.kind == 'pad': s.pg.evaluate('__pad.axes[0] = 0; __pad.axes[1] = 0; __pad.timestamp++')
        return t < limit
def session(dv, label, want_scene, on_mat):
    """Card, Begin, the play at 4x with the bot, stars, Done"""
    pg = dv.pg
    for _ in range(60):
        if dv.st()['scene'] == want_scene: break
        if on_mat:
            if dv.kind == 'mouse':
                p = pg.evaluate("(() => { const b = G.Island.player(), r = G.game.r, m = G.Island.mats.slice().sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0], q = r.w(m.x, m.y, 0); return [q[0], q[1]]; })()"); dv.click_at(p[0], p[1])
            elif dv.kind == 'pad': dv.btn(0)
            else: pg.keyboard.press('KeyE'); dv.wait(160)
        dv.wait(250)
    check(label + ' opens its Card', dv.st()['scene'] == want_scene and dv.st()['phase'] == 'card', dv.st()['scene'])
    ok = dv.pick('Begin'); check(label + ' Begin', ok)
    pg.evaluate("G.DEV.bot = 'good'; G.DEV.timeScale = 4; G.game.timeScale = 4")
    for _ in range(600):
        if dv.st()['phase'] == 'results': break
        dv.wait(200)
    pg.evaluate("G.DEV.bot = null; G.DEV.timeScale = 1; G.game.timeScale = 1")
    check(label + ' reaches its results', dv.st()['phase'] == 'results', dv.st()['phase'])
    dv.wait(1300); ok = dv.pick('Done'); dv.wait(500); check(label + ' Done leaves the session', dv.st()['scene'] != want_scene, dv.st()['scene'])
def run(p, kind, b):
    c = b.new_context(viewport={'width': 1280, 'height': 720}); 
    if kind == 'pad': c.add_init_script(PAD)
    pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + PATH)
    for _ in range(150):
        pg.wait_for_timeout(200)
        if pg.evaluate("window.G && G.game && G.game.sceneName") == 'title': break
    dv = Dev(pg, kind); L = kind + ':'
    pg.evaluate("G.game.fadeTime = .05; G.__bcStep = null")
    if kind == 'pad': dv.btn(13); dv.btn(12)    # the pad is now the last device used
    if kind == 'pad': check(L + ' prompts show the pad', pg.evaluate("G.keyLabel('confirm')") == '✕', pg.evaluate("G.keyLabel('confirm')"))
    if kind == 'keys': check(L + ' prompts show keys', pg.evaluate("G.keyLabel('confirm')") == 'Enter', pg.evaluate("G.keyLabel('confirm')"))
    check(L + ' title to New Member', dv.pick('New Member')); dv.wait(350)
    check(L + ' a free card', dv.pick('New Member')); dv.wait(350)
    check(L + ' sign the card', dv.pick('Sign the card')); dv.wait(500)
    check(L + ' arrival', dv.st()['scene'] == 'arrival', dv.st()['scene'])
    dv.pick('Open the card'); dv.wait(400)
    for _ in range(12):
        if not dv.st()['talk']: break
        dv.confirm(); dv.wait(300)
    check(L + ' pick an instructor', dv.pick('Birch')); dv.wait(400)
    for _ in range(40):
        st = dv.st()
        if st['scene'] == 'bodycheck': break
        if st['talk']: dv.confirm()
        dv.wait(250)
    check(L + ' Day 1 Body Check', dv.st()['scene'] == 'bodycheck', dv.st()['scene'])
    # the Body Check, by this device: dialogs, the two tests by leaning, the question
    tests = 0; asked = False; t0 = time.time()
    while time.time() - t0 < 150:
        st = dv.st()
        if st['scene'] != 'bodycheck': break
        if st['talk'] and st['choices'] and not st['typing']: dv.choose(0); asked = True; dv.wait(250); continue
        if st['talk'] and st['modal']: dv.confirm(); dv.wait(160); continue
        r = pg.evaluate("(() => { const s = G.BodyCheck.live && G.BodyCheck.live(); return s ? [s.step, s.bal.ringX, s.bal.ringY, s.bal.x, s.bal.y] : null; })()")
        if r and r[0] in ('still', 'lean'):
            tests += 1; e = (r[1] - r[3], r[2] - r[4]); dv.lean(max(-1, min(1, r[1] * .6 + e[0] * 1.2)), max(-1, min(1, r[2] * .6 + e[1] * 1.2)))
            if kind == 'keys':
                for key, on in (('KeyD', e[0] > .05), ('KeyA', e[0] < -.05), ('KeyW', e[1] > .05), ('KeyS', e[1] < -.05)):
                    (pg.keyboard.down if on else pg.keyboard.up)(key)
            dv.wait(60); continue
        if kind == 'keys':
            for key in ('KeyD', 'KeyA', 'KeyW', 'KeyS'): pg.keyboard.up(key)
        if st['rects'] and 'Continue' in st['labels']: dv.pick('Continue')
        dv.wait(200)
    if kind == 'keys':
        for key in ('KeyD', 'KeyA', 'KeyW', 'KeyS'): pg.keyboard.up(key)
    dv.lean(0, 0)
    check(L + ' the tests were played by leaning', tests > 5, tests); check(L + ' the Silly Question answered', asked)
    check(L + ' Day 1 opens the guided Stork', dv.st()['scene'] == 'act_stork', [dv.st()['scene'], pg.evaluate("G.BodyCheck.live() && [G.BodyCheck.live().step, G.BodyCheck.live().t, G.talk.open, G.talk.typing, G.talk.choices]"), dv.st()['labels'], int(time.time() - t0)])
    session(dv, L + ' guided Stork', 'act_stork', False)
    check(L + ' it counts as session 1', dv.st()['session'] == 1, dv.st()['session'])
    # two more sessions: walk to a mat with this device, stand on it, play
    for mat, sc in (('squat', 'act_squat'), ('tray', 'act_tray')):
        t = pg.evaluate(f"(() => {{ const m = G.Island.mats.find(q => q.id === '{mat}'); return [m.x, m.y]; }})()")
        check(L + ' walks to ' + mat, dv.walk_to(t[0], t[1]), pg.evaluate("(() => { const b = G.Island.player(); return [b.x, b.y]; })()"))
        session(dv, L + ' ' + mat, sc, True)
    for _ in range(30):
        if dv.st()['scene'] == 'evening': break
        dv.wait(200)
    check(L + ' three sessions end at the evening', dv.st()['scene'] == 'evening', dv.st()['scene'])
    dv.wait(400); check(L + ' go to bed', dv.pick('Go to bed')); dv.wait(400)
    for _ in range(40):
        st = dv.st()
        if st['scene'] == 'bodycheck': break
        if st['talk']: dv.confirm()
        dv.wait(250)
    check(L + ' the next morning is Day 2', dv.st()['scene'] == 'bodycheck' and dv.st()['day'] == 2, [dv.st()['scene'], dv.st()['day']])
    # back out of a screen with this device's own back
    pg.evaluate("G.go('about', null, { fade: 0 })"); dv.wait(400)
    if kind == 'pad': dv.btn(1)
    elif kind == 'keys': pg.keyboard.press('Escape'); dv.wait(200)
    else: pg.mouse.click(640, 200, button='right'); dv.wait(200)
    dv.wait(300); check(L + ' its back button backs out', dv.st()['scene'] == 'title', dv.st()['scene'])
    check(L + ' no errors', not errs, errs[:3])
    c.close()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for kind in which: run(p, kind, b)
    b.close()
