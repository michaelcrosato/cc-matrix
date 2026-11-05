# WIRETAP real-input playthrough (Playwright for Python, Chromium). Every action is a real keyboard or mouse event;
# the page is only read (positions, the current scene, open dialogs) to decide which key to press next.
# Plays: the title by mouse and keys, Settings (symbols and stick inversion present), attract after 10 s idle and its
# exit on a key, About's five pages with Q/E, New Case, the whole cold open, the episode card, the Annex briefing's
# three stations, the car ride, and a photo of the crew taken with right mouse held and a left click.
# Usage: python3 tests/play.py <bundle url>
import sys, time, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
fails = 0
def check(name, ok, detail: object = ''):
    global fails
    print(('ok   ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(detail)[:300])); sys.stdout.flush()
    if not ok: fails += 1
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 720}); p = ctx.new_page()
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    J = lambda s: p.evaluate(s)
    p.goto(URL); p.wait_for_timeout(5000)
    def click_item(fid):
        r = J("() => { const n = document.querySelector('[data-f=\"%s\"]'); if (!n) return null; const b = n.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }" % fid)
        if r: p.mouse.move(r[0] - 20, r[1], steps=3); p.mouse.click(r[0], r[1])
        return r
    # ---- Settings by mouse: the game's own settings sit beside the engine's ----
    click_item('settings'); p.wait_for_timeout(900)
    txt = J("() => document.body.innerText")
    for _ in range(6):
        if 'Invert stick left/right' in txt: break
        game_tab = J("() => { const b = [...document.querySelectorAll('button')].find(x => /^Game$/i.test(x.textContent.trim())); if (!b) return null; const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }")
        if game_tab: p.mouse.click(*game_tab); p.wait_for_timeout(500)
        txt = J("() => document.body.innerText")
    check('Settings (opened by mouse) lists Button symbols PlayStation/Xbox and both stick inversion toggles', all(k in txt for k in ['Button symbols', 'Invert stick left/right', 'Invert stick up/down']), txt[:400])
    p.keyboard.press('Escape'); p.wait_for_timeout(400); p.keyboard.press('Escape'); p.wait_for_timeout(600)
    # ---- attract after 10 s idle; a real key press exits ----
    p.mouse.move(5, 5); p.wait_for_timeout(11500)
    check('10 s without input on the title starts the attract demo', J("() => __wiretap.Globals.attract"))
    p.screenshot(path='/tmp/wt-x600c07/play-attract.png')
    p.keyboard.press('KeyK'); p.wait_for_timeout(1200)
    check('a key press exits attract back to the title', not J("() => __wiretap.Globals.attract") and J("() => __wiretap.game.sceneName") == 'title')
    # ---- About & Credits by mouse, pages by keys ----
    p.wait_for_timeout(600); click_item('about'); p.wait_for_timeout(700); pages = []
    for _ in range(5):
        pages.append(J("() => (document.querySelector('.about h1') || {}).textContent")); p.keyboard.press('KeyE'); p.wait_for_timeout(350)
    check('About & Credits shows Credits, Source Information, Testing, Engine and Prompt Feedback (E pages)', [x.upper() for x in pages] == ['CREDITS', 'SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'], pages)
    p.keyboard.press('Escape'); p.wait_for_timeout(500)
    # ---- New Case with the keyboard (focus moves with arrows, Enter selects) ----
    J("() => { const n = document.querySelector('[data-f=\"new\"]'); n && n.scrollIntoView(); }")
    for _ in range(6): p.keyboard.press('ArrowUp'); p.wait_for_timeout(80)
    focused = J("() => (document.querySelector('.is-f') || {}).dataset?.f")
    if focused != 'new':
        for _ in range(6):
            p.keyboard.press('ArrowDown'); p.wait_for_timeout(80)
            if J("() => (document.querySelector('.is-f') || {}).dataset?.f") == 'new': break
    p.keyboard.press('Enter'); p.wait_for_timeout(2500)
    check('New Case (arrows + Enter) starts the cold open', J("() => __wiretap.STATE().beat") == 'e1.cold' and J("() => __wiretap.game.sceneName") == 'field')
    # ---- helpers: walk with WASD toward a world point, advance dialogue with Enter ----
    def talking(): return J("() => __wiretap.Talk.open")
    def advance_talk(max_s=40, pick=None):
        t0 = time.time()
        while time.time() - t0 < max_s:
            if not talking(): p.wait_for_timeout(250)
            if not talking(): return True
            ch = J("() => { const d = __wiretap.Talk.d; return d.choices && !d.typing && d.i === d.pages.length - 1 ? d.choices.length : 0; }")
            if ch and pick is not None:
                for _ in range(pick): p.keyboard.press('ArrowDown'); p.wait_for_timeout(90)
            p.keyboard.press('Enter'); p.wait_for_timeout(230)
        return not talking()
    held = set()
    def hold(keys):
        for k in list(held):
            if k not in keys: p.keyboard.up(k); held.discard(k)
        for k in keys:
            if k not in held: p.keyboard.down(k); held.add(k)
    def walk_to(x, y, r=14, max_s=40, room=False):
        t0 = time.time(); best = 1e9; best_t = time.time(); side = 0
        while time.time() - t0 < max_s:
            if talking(): hold([]); advance_talk()
            info = J("""() => { const g = __wiretap.game, sc = g.scene, P = g.sceneName === 'field' ? __wiretap.Mission.M.P : sc.P; if (!P) return null;
              const m = __wiretap.World.cur; window.__ff = window.__ff || {}; const key = (m === __wiretap.World.map ? 'w' : 'r') + %d + ',' + %d;
              let f = window.__ff[key]; if (!f) { f = new My3D2dge.FlowField(m); f.update(%f, %f); window.__ff[key] = f; }
              const n = Math.hypot(P.x - %f, P.y - %f) < 28 ? null : f.next(P.x, P.y), tx = n ? n.x : %f, ty = n ? n.y : %f;
              const a = g.r.w(P.x, P.y, 0), bb = g.r.w(tx, ty, 0); return { d: Math.hypot(P.x - %f, P.y - %f), dx: bb[0] - a[0], dy: bb[1] - a[1] }; }""" % (int(x), int(y), x, y, x, y, x, y, x, y))
            if not info: return False
            if info['d'] < r: hold([]); return True
            if info['d'] < best - 3: best = info['d']; best_t = time.time()
            elif time.time() - best_t > 1.2:   # stuck on furniture: sidestep the way a player would, then carry on
                side ^= 1; perp = (['KeyW', 'KeyD'] if side else ['KeyS', 'KeyA']) if abs(info['dx']) > abs(info['dy']) else (['KeyD'] if side else ['KeyA'])
                hold(perp); p.wait_for_timeout(450); hold([]); best_t = time.time(); best = info['d']; continue
            keys = []
            if info['dx'] > 1.5: keys.append('KeyD')
            if info['dx'] < -1.5: keys.append('KeyA')
            if info['dy'] > 1.5: keys.append('KeyS')
            if info['dy'] < -1.5: keys.append('KeyW')
            hold(keys); p.wait_for_timeout(90)
        hold([]); return False
    def walk_direct(x, y, r=10, max_s=12):
        t0 = time.time()
        while time.time() - t0 < max_s:
            info = J("() => { const g = __wiretap.game, P = g.sceneName === 'field' ? __wiretap.Mission.M.P : g.scene.P, a = g.r.w(P.x, P.y, 0), b = g.r.w(%f, %f, 0); return { d: Math.hypot(P.x - %f, P.y - %f), dx: b[0] - a[0], dy: b[1] - a[1] }; }" % (x, y, x, y))
            if info['d'] < r: hold([]); return True
            hold([k for k, c in [('KeyD', info['dx'] > 1.5), ('KeyA', info['dx'] < -1.5), ('KeyS', info['dy'] > 1.5), ('KeyW', info['dy'] < -1.5)] if c]); p.wait_for_timeout(80)
        hold([]); return False
    def walk_path(points, r=16):   # corridor waypoints in cells, the way a player threads an office
        ok = True
        for i, (cx, cy) in enumerate(points): ok = walk_direct(cx * 16, cy * 16, r if i == len(points) - 1 else 8) and ok
        return ok
    def agent_pos(id): return J("() => { const a = __wiretap.Mission.M.ppl['%s']; return [a.x, a.y]; }" % id)
    # ---- the cold open: Dukes, Lou, Miss Odessa (the respectful answer), with real keys ----
    advance_talk()
    for who, pick in [('dukes', None), ('lou', None), ('odessa', 1)]:
        ok = False
        for _try in range(4):   # the nearest interactable answers E: Felton's memorial cards may come first
            ax, ay = agent_pos(who); ok = walk_to(ax, ay, r=16)
            p.keyboard.press('KeyE'); p.wait_for_timeout(500); advance_talk(pick=pick)
            if J("() => !!__wiretap.Mission.M.flags.talked['%s']" % who): break
        check('cold open: walked to ' + who + ' with WASD and talked (E, Enter)', ok and J("() => !!__wiretap.Mission.M.flags.talked['%s']" % who))
    check('the respectful choice with Miss Odessa (Down + Enter) sets odessaRespect', J("() => __wiretap.STATE().flags.odessaRespect"))
    p.wait_for_timeout(3500); advance_talk(); p.wait_for_timeout(1500)
    check('the cold open finishes into the Episode 1 card', J("() => __wiretap.STATE().beat") == 'e1.card', J("() => __wiretap.STATE().beat"))
    p.wait_for_timeout(2500); p.keyboard.press('Enter'); p.wait_for_timeout(2500)
    check('Enter on the card goes to the Annex briefing', J("() => __wiretap.game.sceneName") == 'annex', J("() => __wiretap.game.sceneName"))
    # ---- the Annex: the briefing, then evidence cage, Navarre (ops choice), the stairs ----
    p.wait_for_timeout(800); advance_talk(60)
    spots = J("() => { const s = {}, ints = __wiretap.game.scene.ints || []; for (const k of ['evidence', 'navarre', 'stairs']) { const i = ints.find(x => x.id === k); if (i) s[k] = [i.x, i.y]; } return s; }")
    for st in ['evidence', 'navarre']:
        ok = walk_to(*spots[st], r=16)
        p.keyboard.press('KeyE'); p.wait_for_timeout(600); advance_talk()
        if J("() => __wiretap.UI.top() && __wiretap.UI.top().id") is not None: p.keyboard.press('Enter'); p.wait_for_timeout(600)
        check('Annex: ' + st + ' station reached on foot and done', ok and J("() => Object.keys(__wiretap.Annex.done).some(k => k.startsWith('%s'))" % st))
    check('Navarre\'s ops choice was made with the keyboard', J("() => __wiretap.STATE().flags.ops1") in ('van', 'ot'))
    ws = walk_path([(16.6, 3.5), (15.4, 3.6), (15.4, 7.6), (11.2, 8.2), (10.5, 8.5)])
    print('  (stairs walk', ws, J("() => { const sc = __wiretap.game.scene; return [Math.round(sc.P.x), Math.round(sc.P.y), sc.near && sc.near.id, __wiretap.Annex.tasks().map(t => t.at + ':' + t.ok + ':' + __wiretap.Annex.ready(t))]; }"), ')')
    p.keyboard.press('KeyE'); p.wait_for_timeout(2500)
    check('the stairs lead to the car ride', J("() => __wiretap.game.sceneName") == 'car', J("() => __wiretap.game.sceneName"))
    advance_talk(60); p.wait_for_timeout(3000); advance_talk(30); p.wait_for_timeout(2500)
    check('the car ride ends in the Eyes On mission', J("() => __wiretap.STATE().beat") == 'e1.photos' and J("() => __wiretap.game.sceneName") == 'field', J("() => __wiretap.STATE().beat"))
    advance_talk(); p.wait_for_timeout(500)
    # ---- a photo with the real mouse: hold right button to watch, left click to shoot ----
    tee = agent_pos('tee') if J("() => __wiretap.game.sceneName === 'field' && !!__wiretap.Mission.M.ppl.tee") else None
    if tee: walk_to(tee[0], tee[1] + 70, r=30, max_s=50)
    before = J("() => __wiretap.STATE().photos.length")
    p.mouse.move(640, 360); p.mouse.down(button='right'); p.wait_for_timeout(500)
    for _ in range(12 if tee else 0):
        sp = J("() => { const a = __wiretap.Mission.M.ppl.tee, s = __wiretap.game.screen, w = __wiretap.game.r.w(a.x, a.y, a.z + 22), c = document.getElementById('screen').getBoundingClientRect(); return [c.x + w[0] * c.width / __wiretap.game.W, c.y + w[1] * c.height / __wiretap.game.H]; }")
        p.mouse.move(sp[0], sp[1]); p.wait_for_timeout(120)
    sp = sp if 'sp' in dir() else [640, 360]
    p.wait_for_timeout(600); p.mouse.click(sp[0], sp[1], button='left'); p.wait_for_timeout(400); p.mouse.up(button='right'); p.wait_for_timeout(500)
    ph = J("() => __wiretap.STATE().photos.slice(-1)[0]")
    check('right mouse raises the camera and a left click takes a photo of Tee (' + json.dumps({k: ph.get(k) for k in ['subject', 'stars', 'face', 'focus', 'act']} if ph else None) + ')', J("() => __wiretap.STATE().photos.length") == before + 1 and ph and ph.get('subject') == 'tee', ph)
    p.screenshot(path='/tmp/wt-x600c07/play-photo.png')
    check('no page errors during the playthrough', not errs, errs[:3])
    check('no engine errors during the playthrough', J("() => __wiretap.game.errors.length") == 0, J("() => __wiretap.game.errors.map(e => e.where + ': ' + e.message).slice(0, 3)"))
    b.close()
print('play: ' + ('all checks passed' if not fails else str(fails) + ' failed'))
