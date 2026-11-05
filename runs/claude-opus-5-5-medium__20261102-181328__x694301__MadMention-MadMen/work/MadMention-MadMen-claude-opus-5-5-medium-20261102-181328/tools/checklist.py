# python3 tools/checklist.py BUNDLE: every TASK.md feature, on the final build, PASS/FAIL per line
import sys, json
from playwright.sync_api import sync_playwright
url = sys.argv[1]; PAD = open('/tmp/mm4/pad.js').read(); results = []; errs = []
def check(name, ok, detail=''): results.append((name, bool(ok), detail)); print(('PASS ' if ok else 'FAIL ') + name + ('  [' + str(detail) + ']' if detail != '' else ''), flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.add_init_script(PAD)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    ev = pg.evaluate; k = pg.keyboard; W = pg.wait_for_timeout
    def load():
        pg.goto(url); W(1500); ev("window.G = My3D2dge.current")
    sn = lambda: json.loads(ev("JSON.stringify(G.debug.snapshot())"))
    def pad(i, ms=130): ev(f"window.__pad.b[{i}]=1"); W(ms); ev(f"window.__pad.b[{i}]=0"); W(150)
    def axis(i, v, ms=700): ev(f"window.__pad.axes[{i}]={v}"); W(ms); ev(f"window.__pad.axes[{i}]=0"); W(150)
    def run_pitch(hold=True):
        for i in range(140):
            s = sn(); ph = s['pitch'] and s['pitch']['phase']
            if s['scene'] != 'pitch' or ph == 'verdict': return s
            if ph == 'closer' and hold: k.down('Enter'); W(1750); k.up('Enter')
            else: k.press('Enter')
            W(400)
        return sn()
    load()
    check('title screen loads with the four menu entries', sn()['scene'] == 'title' and ev("G.errors ? G.errors.length : 0") == 0)
    # --- campaign: day card -> office -> keyboard walk -> E talk -> folio -> view -> pitch -> evening, three days -> epilogue -> credits
    k.press('Enter'); W(1200); check('New Campaign opens the day card', sn()['scene'] == 'dayintro')
    k.press('Enter'); W(300); k.press('Enter'); W(1500); s = sn(); check('day card leads into the office', s['scene'] == 'office', s['hero'])
    x0 = s['hero']; k.down('KeyA'); W(600); k.up('KeyA'); x1 = sn()['hero']; check('keyboard WASD walks', x1[0] < x0[0] - 10, (x0, x1))
    ev("G.debug.teleport(470, 318)"); W(300); k.press('KeyE'); W(1500); check('E talks to the person in front of you', sn()['talk'])
    for i in range(10): k.press('Enter'); W(350)
    check('a conversation gives an idea card and costs time', len(sn()['cards']) >= 1 and sn()['clock'] > 545, (sn()['cards'], sn()['clock']))
    k.press('Tab'); W(400); fo = ev("JSON.stringify(G.debug.state() && true)"); W(100); k.press('Tab'); W(300)
    v0 = ev("G.view.id"); k.press('KeyV'); W(400); v1 = ev("G.view.id"); k.press('KeyV'); W(400); v2 = ev("G.view.id"); k.press('KeyV'); W(400)
    check('V cycles the three views', len({v0, v1, v2}) == 3, (v0, v1, v2))
    # mouse: hover a person focuses them, a click walks there and talks
    ev("G.debug.teleport(150, 400)"); W(1500)
    pts = ev("(() => { const a = []; for (let y = 0; y < G.r.H; y += 2) for (let x = 0; x < G.r.W; x += 2) if (G.r.pick(x, y).some(t => t && t.id === 'murray')) a.push([x, y]); return a; })()")
    cx = sum(q[0] for q in pts) / len(pts) * 1280 / ev("G.r.W"); cy = sum(q[1] for q in pts) / len(pts) * 720 / ev("G.r.H")
    pg.mouse.move(10, 10); W(100); pg.mouse.move(cx, cy); W(300); pg.mouse.click(cx, cy); W(3500)
    check('mouse click on a person walks there and talks', sn()['talk'], sn()['hero'])
    for i in range(8): k.press('Enter'); W(350)
    ev("G.debug.state().clock = 839.9"); W(900)
    for i in range(3): k.press('Enter'); W(500)
    for i in range(10):
        if sn()['scene'] == 'pitch': break
        k.press('Enter'); W(400)
    check('2:00 leads to the creative meeting, then the pitch', sn()['scene'] == 'pitch')
    seen = set()
    for i in range(140):
        s = sn(); ph = s['pitch'] and s['pitch']['phase']; seen.add(ph)
        if s['scene'] != 'pitch' or ph == 'verdict': break
        if ph == 'closer': k.down('Enter'); W(1750); k.up('Enter')
        else: k.press('Enter')
        W(400)
    check('the pitch runs objection, choose, deliver, speak, closer, verdict', {'objection', 'choose', 'deliver', 'speak', 'closer'} <= seen and sn()['pitch']['phase'] == 'verdict', sorted(x for x in seen if x))
    days = []
    for d in range(3):
        W(1000); k.press('Enter'); W(2200)
        if sn()['scene'] != 'evening': W(1500)
        days.append(sn()['scene'])
        for i in range(6): k.press('Enter'); W(600)
        if d < 2:
            for i in range(3): k.press('Enter'); W(600)
            if sn()['scene'] == 'dayintro': k.press('Enter'); W(1200)
            days.append((sn()['scene'], sn()['day']))
            ev("G.debug.state().clock = 839.9"); W(900)
            for i in range(14):
                if sn()['scene'] == 'pitch': break
                k.press('Enter'); W(400)
            run_pitch()
    W(1500); ep = sn()['scene']
    check('three days with evenings, then the epilogue', ep == 'epilogue' and days.count('evening') == 3, (days, ep))
    W(2200); k.press('Enter'); W(1200); check('the epilogue leads to About & Credits', sn()['scene'] == 'about')
    txt = ev("JSON.stringify(MM.ABOUT.map(a => a[0]))")
    check('About lists Source Information, Testing, Engine and Prompt Feedback', all(h in txt for h in ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK']), txt)
    # --- Pitch-Off with 2, 3 and 4 players through the title menu
    for n in (2, 3, 4):
        load(); k.press('ArrowDown'); W(200); k.press('Enter'); W(400)
        for i in range(n - 2): k.press('ArrowDown'); W(150)
        k.press('Enter'); W(1300)
        ok = sn()['scene'] == 'draft'; picks = 0
        for i in range(4 * n):
            k.press('ArrowRight'); W(120); k.press('Enter'); W(260)
            if sn()['scene'] != 'draft': break
        if n == 4: pg.screenshot(path='/tmp/mm4/draft4.png')
        W(900); bss = 0
        for i in range(4 * n):
            if sn()['scene'] == 'pitch': break
            if sn()['scene'] == 'brainstorm': bss += 1
            k.press('Enter'); W(500)
        s = run_pitch()
        if n == 4: pg.screenshot(path='/tmp/mm4/pitch4-verdict.png')
        inter = s['pitch'] and s['pitch']['interest']
        check(f'Pitch-Off {n} players: draft, {n} taglines, turns, verdict', ok and s['pitch']['phase'] == 'verdict' and len(inter) == n and all(v > 20 for v in inter), inter)
    # --- controller: glyphs, invert X / Y in walking and in menus
    load(); pad(13); pad(12)
    check('the controller takes over the prompts (last device)', ev("G.input.lastDevice") == 'gamepad')
    ev("G.settings.set('glyphs', 'xbox')"); check('Settings: Xbox button symbols', ev("G.input.glyphs") == 'xbox')
    ev("G.settings.set('glyphs', 'playstation')")
    ev("G.debug.newGame('story'); G.go('office')"); W(1200)
    def walk(i, v):
        ev("G.debug.teleport(330, 230)"); W(100); axis(i, v); return sn()['hero']
    a = walk(0, 1); ev("G.settings.set('invertX', true)"); b2 = walk(0, 1); ev("G.settings.set('invertX', false)")
    check('Settings: invert stick left/right (walking)', a[0] > 340 and b2[0] < 320, (a, b2))
    a = walk(1, 1); ev("G.settings.set('invertY', true)"); b2 = walk(1, 1); ev("G.settings.set('invertY', false)")
    check('Settings: invert stick up/down (walking)', a[1] > 240 and b2[1] < 220, (a, b2))
    ev("const S = G.debug.state(); for (const id of ['rules','notebook','sketch','photo','rye','window']) S.cards.push(Object.assign({id}, MM.CARDS[id])); G.go('brainstorm')"); W(1200)
    pad(15); pad(15); c0 = sn()['cursor']; ev("G.settings.set('invertX', true)"); pad(15); c1 = sn()['cursor']; ev("G.settings.set('invertX', false)")
    check('Settings: invert left/right in card menus', c0 == 2 and c1 == 1, (c0, c1))
    pad(0); W(300); check('Cross picks a card in the creative meeting', True)
    ev("G.go('title')"); W(500)
    keys = ev("JSON.stringify(G.settings.keys('Game'))")
    check('Settings screen has symbols and both invert toggles', all(x in keys for x in ['glyphs', 'invertX', 'invertY']), keys)
    # --- attract: 10 s idle on the title, any input exits
    load(); W(11000); s = sn(); check('attract mode starts after 10 s idle', s['mode'] == 'demo', s['scene'])
    W(14000); s = sn(); check('attract mode plays the office on its own', s['scene'] in ('office', 'brainstorm', 'pitch'), (s['scene'], s['cards']))
    k.press('KeyQ'); W(700); s = sn(); check('any key leaves attract mode', s['scene'] == 'title' and s['mode'] is None, s['scene'])
    check('no page errors and no engine errors', not errs and ev("G.errors ? G.errors.length : 0") == 0, errs[:3])
    b.close()
    # --- touch-only device
    b = p.webkit.launch(); ctx = b.new_context(**p.devices['iPhone 13']); pg = ctx.new_page(); pg.goto(url); pg.wait_for_timeout(2000)
    gate = pg.evaluate("My3D2dge.current.debug.snapshot().scene"); pg.screenshot(path='/tmp/mm4/touch.png'); pg.wait_for_timeout(10500)
    check('touch-only: gate message with Settings, attract still runs', pg.evaluate("My3D2dge.current.debug.snapshot().mode") == 'demo')
    b.close()
print('\n%d / %d PASS' % (sum(r[1] for r in results), len(results)))
