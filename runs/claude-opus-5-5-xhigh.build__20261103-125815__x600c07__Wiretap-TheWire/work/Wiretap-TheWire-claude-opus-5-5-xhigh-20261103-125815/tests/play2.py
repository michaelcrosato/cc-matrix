# WIRETAP real-input sessions on the later episodes (Playwright for Python, Chromium). Each session opens the bundle at
# a story beat's deep link (#e2.chase etc., the episode's start state) and plays it with real keyboard and mouse events
# only; the page is read (positions, the open screen, the focused item) to decide which key to press next, the way a
# player looks at the screen. Sessions: the chase (WASD + Shift, E to tackle, hold E to cuff), the box (keys 1-4),
# both wires (T minimize, Enter log, I voice ID, a click on a page, Q/E on the cipher wheel), the paperwork (the code
# card at the evidence cage, the affidavit at the desk with the arrow keys and Enter), the Board (walk to it,
# arrow keys + Enter to pick up and pin, Q/E for tiers), Tee's night (hold Q + a direction for orders, Tab for the
# pager), and a bots versus round (WASD, right mouse + left click).
# Usage: python3 tests/play2.py <bundle url> [session,session]
import sys, time, json, os
from typing import Any
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
SAVES = os.environ.get('WIRETAP_SAVES')   # saves written by tests/complete.mjs: a session loads the chain's state at its beat when one exists
SESSIONS = ['chase', 'box', 'wire', 'wire2', 'paper', 'board', 'tee', 'versus']
if ONLY is None:   # run each session in its own browser process; retry a session once only if Chromium itself crashed the page
    import subprocess
    bad = 0
    for name in SESSIONS:
        for attempt in (1, 2):
            r = subprocess.run([sys.executable, __file__, URL, name], capture_output=True, text=True, env=os.environ)
            out = r.stdout + r.stderr
            if 'Page crashed' in out and attempt == 1: print('  (' + name + ': the browser page crashed, a Chromium fault, not a game error; running the session again)'); continue
            print('\n'.join(l for l in r.stdout.splitlines() if not l.startswith('all real-input') and 'check(s) failed' not in l)); sys.stdout.flush()
            if r.returncode: bad += 1; print(out[-600:] if 'Traceback' in out else '', end='')
            break
    print('all real-input sessions passed' if not bad else str(bad) + ' session(s) failed'); sys.exit(1 if bad else 0)
fails = 0
def check(name, ok, detail: object = ''):
    global fails
    print(('ok   ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(detail)[:300])); sys.stdout.flush()
    if not ok: fails += 1
p: Any = None; errs: list = []; held: set = set()
def J(s, arg=None): return p.evaluate(s, arg) if arg is not None else p.evaluate(s)
def open_link(pw_ctx, link):
    global p, errs, held
    if p: p.close()
    held = set(); errs = []
    p = pw_ctx.new_page(); p.on('pageerror', lambda e: errs.append(str(e)))
    save = SAVES and os.path.join(SAVES, link + '.json')
    if save and os.path.exists(save):   # load it the way the Load menu does (game.saves.read), from the title
        p.goto(URL); p.wait_for_timeout(5500); J("(d) => __wiretap.game.saves.read({ data: d })", json.load(open(save))); p.wait_for_timeout(3000)
        print('  (loaded the gameplay chain\'s save at ' + link + ')')
    else: p.goto(URL + '#' + link); p.wait_for_timeout(6500)
def talking(): return J("() => __wiretap.Talk.open")
def advance_talk(max_s=40):
    t0 = time.time()
    while time.time() - t0 < max_s:
        if not talking(): p.wait_for_timeout(250)
        if not talking(): return True
        p.keyboard.press('Enter'); p.wait_for_timeout(230)
    return not talking()
def hold(keys):
    for k in list(held):
        if k not in keys: p.keyboard.up(k); held.discard(k)
    for k in keys:
        if k not in held: p.keyboard.down(k); held.add(k)
def dir_keys(dx, dy, dead=1.5):
    return [k for k, c in [('KeyD', dx > dead), ('KeyA', dx < -dead), ('KeyS', dy > dead), ('KeyW', dy < -dead)] if c]
def walk_to(x, y, r=14, max_s=40):
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
        elif time.time() - best_t > 1.2:   # stuck on furniture: sidestep the way a player would
            side ^= 1; perp = (['KeyW', 'KeyD'] if side else ['KeyS', 'KeyA']) if abs(info['dx']) > abs(info['dy']) else (['KeyD'] if side else ['KeyA'])
            hold(perp); p.wait_for_timeout(450); hold([]); best_t = time.time(); best = info['d']; continue
        hold(dir_keys(info['dx'], info['dy'])); p.wait_for_timeout(90)
    hold([]); return False
def walk_direct(x, y, r=10, max_s=12):
    t0 = time.time()
    while time.time() - t0 < max_s:
        info = J("() => { const g = __wiretap.game, P = g.sceneName === 'field' ? __wiretap.Mission.M.P : g.scene.P, a = g.r.w(P.x, P.y, 0), b = g.r.w(%f, %f, 0); return { d: Math.hypot(P.x - %f, P.y - %f), dx: b[0] - a[0], dy: b[1] - a[1] }; }" % (x, y, x, y))
        if info['d'] < r: hold([]); return True
        hold(dir_keys(info['dx'], info['dy'])); p.wait_for_timeout(80)
    hold([]); return False
def walk_path(points, r=16):   # aisle waypoints in cells, the way a player threads an office
    ok = True
    for i, (cx, cy) in enumerate(points): ok = walk_direct(cx * 16, cy * 16, r if i == len(points) - 1 else 8) and ok
    return ok
def top_id(): return J("() => { const t = __wiretap.UI.top(); return t ? t.id : null; }")
def focus_to(fid, max_n=40):
    """move the focus to an item with the arrow keys (the screen's spatial navigation), like a d-pad: up or down to the
    target's row, then along it; the other direction when a press goes nowhere"""
    visited = set()
    for _ in range(max_n):
        info = J("""(fid) => { const t = __wiretap.UI.top(); if (!t || !t.el) return null; const n = [...t.el.querySelectorAll('[data-f]')].find(x => x.dataset.f === fid);
          if (!n || n.offsetParent === null) return { missing: true }; const f = t.focus; if (f === n) return { at: true };
          const a = f ? f.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 }, b = n.getBoundingClientRect(); return { dx: (b.x + b.width / 2) - (a.x + a.width / 2), dy: (b.y + b.height / 2) - (a.y + a.height / 2), f: f && f.dataset.f }; }""", fid)
        if not info or info.get('missing'):
            if os.environ.get('WT_DEBUG'): print('  [focus_to', fid, 'missing: top', top_id(), 'tier', J("() => __wiretap.Board.tier"), 'items', J("() => { const t = __wiretap.UI.top(); return t && t.el ? [...t.el.querySelectorAll('[data-f]')].map(n => n.dataset.f).join(' ') : null; }"), ']')
            return False
        if info.get('at'): return True
        h = 'ArrowRight' if info['dx'] > 0 else 'ArrowLeft'; v = 'ArrowDown' if info['dy'] > 0 else 'ArrowUp'
        keys = [v, h] if abs(info['dy']) > 40 else [h, v]   # the target's row first, then along it (screens are grids)
        visited.add(info.get('f'))
        moved = False
        for k in keys:
            p.keyboard.press(k); p.wait_for_timeout(110)
            now = J("() => { const t = __wiretap.UI.top(); return t && t.focus ? t.focus.dataset.f : null; }")
            if now == fid: return True
            if now != info.get('f'): moved = True; break
        if os.environ.get('WT_DEBUG'): print('  [focus_to', fid, 'from', info.get('f'), 'dx', round(info['dx']), 'dy', round(info['dy']), '->', now, 'moved', moved, ']')
        if not moved: return False
    return False
def choose(fid): return focus_to(fid) and (p.keyboard.press('Enter') or True)
def no_errors(name):
    eng = J("() => __wiretap.game.errors.map(e => e.where + ': ' + e.message)")
    check(name + ': no page or engine errors', not errs and not eng, (errs + eng)[:3])
def want(name): return ONLY is None or name in ONLY

with sync_playwright() as pw:
    b = getattr(pw, os.environ.get('WT_BROWSER', 'chromium')).launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 720})   # WT_BROWSER=firefox|webkit
    # ---------------- the chase: run Corey down with WASD + Shift, E to tackle, hold E to cuff ----------------
    if want('chase'):
        open_link(ctx, 'e2.chase'); advance_talk()
        t0 = time.time(); tackles = 0
        while time.time() - t0 < 90:
            if talking(): hold([]); advance_talk(); continue
            if top_id(): p.keyboard.press('Enter'); p.wait_for_timeout(300); continue   # a retry card
            s = J("""() => { const M = __wiretap.Mission.M, ch = M.chase; if (!ch) return null; const P = M.P, r = M.ppl.corey, g = __wiretap.game; if (!r) return { state: ch.state };
              const d = Math.hypot(r.x - P.x, r.y - P.y), tgt = d > 70 && r.goal ? r.goal : r; const dir = d < 60 ? [(tgt.x - P.x) / d, (tgt.y - P.y) / d] : __wiretap.Flow.dir(P, tgt.x, tgt.y);
              const a = g.r.w(P.x, P.y, 0), b = g.r.w(P.x + dir[0] * 20, P.y + dir[1] * 20, 0); return { state: ch.state, d, dx: b[0] - a[0], dy: b[1] - a[1], tackle: ch.canTackle(), stamina: P.stamina }; }""")
            if not s: p.wait_for_timeout(200); continue
            if s['state'] == 'run':
                keys = dir_keys(s['dx'], s['dy'], .8) + ['ShiftLeft']
                if s['tackle']: hold(keys); p.keyboard.press('KeyE'); tackles += 1
                hold(keys); p.wait_for_timeout(70)
            elif s['state'] == 'down': hold(['KeyE']); p.wait_for_timeout(1500); hold([])
            elif s['state'] == 'lost': hold([]); p.wait_for_timeout(600)   # he got away: the retry card comes up, Enter tries again
            else: break
        hold([]); st = J("() => __wiretap.Mission.M && __wiretap.Mission.M.chase && __wiretap.Mission.M.chase.state")
        check('chase: ran Corey down on WASD + Shift and cuffed him with E (' + str(round(time.time() - t0)) + ' s real time, ' + str(tackles) + ' tackle presses, state ' + str(st) + ')', st == 'cuffed', st)
        no_errors('chase')
    # ---------------- the box: Corey in the interview room, keys 1-4 ----------------
    if want('box'):
        open_link(ctx, 'e2.box'); t0 = time.time(); picks = 0
        while time.time() - t0 < 150:
            if talking(): advance_talk(); continue
            tid = top_id()
            if tid and tid != 'box':
                ids = J("() => [...__wiretap.UI.top().el.querySelectorAll('[data-f]')].map(n => n.dataset.f)")
                w = next((k for k in ['pager', 'package', 'vacant', 'tee'] if k in ids), ids[0] if ids else None)
                if w: choose(w)
                p.wait_for_timeout(400); continue
            s = J("() => { const B = __wiretap.Box; if (!B.s) return null; const s = B.st; return { over: s.over, busy: B.busy(), flip: B.canFlip(), pager: !!s.used.pager, lean: !!s.lastLean, fear: s.fear }; }")
            if not s:
                if J("() => __wiretap.STATE().beat") != 'e2.box': break
                p.wait_for_timeout(300); continue
            if s['over']: p.keyboard.press('Enter'); p.wait_for_timeout(700); continue
            if s['busy']: p.wait_for_timeout(300); continue
            picks += 1
            key = 'Digit4' if s['flip'] else 'Digit1' if not s['pager'] else 'Digit4' if s['lean'] else 'Digit2' if picks == 3 else 'Digit3' if s['fear'] < 55 else 'Digit4'
            p.keyboard.press(key); p.wait_for_timeout(500)
        facts = J("() => ['tee-lieutenant', 'code', 'stash'].filter(f => __wiretap.STATE().facts.includes('stmt:corey:' + f))")
        check('box: interviewed Corey with keys 1-4 (' + str(picks) + ' picks, statements ' + ','.join(facts) + ', CI ' + str(J("() => !!__wiretap.STATE().flags.coreyCI")) + ')', len(facts) >= 1 and J("() => __wiretap.STATE().beat") != 'e2.box', J("() => __wiretap.STATE().beat"))
        no_errors('box')
    # ---------------- the wire room: T minimize, Enter log, I voice ID, a page clicked and decoded on Q/E ----------------
    for wname, link, need_pages in [('wire', 'e3.wire1', 0), ('wire2', 'e3.wire2', 1)]:
        if not want(wname): continue
        open_link(ctx, link); t0 = time.time(); logged0 = J("() => __wiretap.STATE().stats.logged"); decoded_ids = set(); last_pg = None
        while time.time() - t0 < 300:
            if talking(): hold([]); advance_talk(); continue
            tid = top_id()
            if tid == 'notebook': choose('place:gas'); p.wait_for_timeout(300); continue
            if tid == 'cipher':
                for _ in range(4):
                    if J("() => __wiretap.Cipher_solved()"): break
                    p.keyboard.press('KeyE'); p.wait_for_timeout(350)
                if os.environ.get('WT_DEBUG'): print('  [cipher sel', J("() => __wiretap.Cipher.sel"), 'ids', J("() => __wiretap.Cipher.ids"), 'r', J("() => __wiretap.Cipher.r"), 'solved', J("(id) => __wiretap.Cipher.solved(id)", last_pg), 'numbers', J("() => Object.keys(__wiretap.STATE().numbers).filter(k => __wiretap.STATE().numbers[k].known).join(',')"), ']')
                if last_pg and J("(id) => __wiretap.Cipher.solved(id)", last_pg): decoded_ids.add(last_pg)
                p.keyboard.press('Escape'); p.wait_for_timeout(400); continue
            if tid and tid != 'wire':   # the voice ID picker: the speaker on the line
                sp = J("() => __wiretap.Wire.cur && __wiretap.Wire.cur.speaker"); ids = J("() => [...__wiretap.UI.top().el.querySelectorAll('[data-f]')].map(n => n.dataset.f)")
                choose(sp if sp in ids else ids[0]); p.wait_for_timeout(300); continue
            s = J("""() => { const Wr = __wiretap.Wire, S = __wiretap.STATE(); if (!Wr.s) return null; if (Wr.over) return { over: true }; const c = Wr.cur, pg0 = Wr.pages.find(q => !__wiretap.Cipher.solved(q)) || null; if (!c) return { idle: true, pg: pg0, panel: Wr.panel };
              const pg = pg0;
              const needId = c.typer && c.speaker && !Object.values(S.wire.ids).includes(c.speaker) && (S.wire.voiceprints || []).includes(c.speaker) && c.typer.i > 6 && !c.idTried;
              return { pg, panel: Wr.panel, type: c.type, min: !!c.min, li: c.li, turnAt: c.turnAt, t: c.t, spot: c.spot > 0, minCd: c.minCd, key: !!(c.typer && c.keys && c.keys.includes(c.li) && !(c.logged || []).includes(c.li) && c.typer.i > 3 && !(c.min && !(c.spot > 0))), needId }; }""")
            if not s:
                if J("() => __wiretap.STATE().beat") != link: break
                p.wait_for_timeout(300); continue
            if s.get('over'): hold([]); p.keyboard.press('Enter'); p.wait_for_timeout(800); continue
            if s.get('idle') and not s.get('pg'):
                if s.get('panel'): hold([]); p.keyboard.press('KeyQ'); p.wait_for_timeout(200); continue   # back to LIVE
                hold(['ShiftLeft']); p.wait_for_timeout(150); continue   # fast-forward the dead air
            hold([])
            if s.get('idle'):   # between calls, a page waiting: E to the PAGER panel, arrows to it, Enter opens the code card
                for _ in range(3):
                    if J("() => __wiretap.Wire.panel") == 2: break
                    p.keyboard.press('KeyE'); p.wait_for_timeout(250)
                last_pg = s['pg']
                p.keyboard.press('Enter'); p.wait_for_timeout(600)   # ✕ / Enter on the PAGER panel decodes the waiting page
                if os.environ.get('WT_DEBUG'): print('  [pg', s['pg'], 'panel', J("() => __wiretap.Wire.panel"), 'top', top_id(), 'focus', J("() => { const t = __wiretap.UI.top(); return t && t.focus && t.focus.dataset.f; }"), 'items', J("() => [...__wiretap.UI.top().el.querySelectorAll('[data-f]')].map(n => n.dataset.f).join(' ')"), ']')
                if top_id() != 'cipher': p.keyboard.press('KeyQ'); p.wait_for_timeout(200)
                continue
            if s['panel'] != 0 and top_id() == 'wire': p.keyboard.press('KeyQ'); p.wait_for_timeout(200)   # back to LIVE
            if s['type'] == 'N' and not s['min'] and s['t'] > .5: p.keyboard.press('KeyT')
            elif s['type'] == 'T' and not s['min'] and s['li'] < s['turnAt'] and s['t'] > .5: p.keyboard.press('KeyT')
            elif s['type'] == 'T' and s['min'] and s['minCd'] <= 0 and not s['spot']: p.keyboard.press('KeyT')   # spot-check
            elif s['key']: p.keyboard.press('Enter')
            elif s['needId']: J("() => { __wiretap.Wire.cur.idTried = true; }"); p.keyboard.press('KeyI')   # a voice we have a print of
            p.wait_for_timeout(160)
        hold([])
        decoded = len(decoded_ids); logged = J("() => __wiretap.STATE().stats.logged") - logged0; legal = J("() => __wiretap.STATE().meters.legal")
        check('wire room (' + link + '): worked the wire with T / Enter / I, pages opened from the PAGER panel with E then Enter and decoded on the Q/E wheel (' + str(logged) + ' lines logged, ' + str(decoded) + ' pages, Legal ' + str(legal) + ', ' + str(round(time.time() - t0)) + ' s)', logged >= 3 and decoded >= need_pages and J("() => __wiretap.STATE().beat") != link, J("() => __wiretap.STATE().beat"))
        no_errors(wname)
    # ---------------- the paperwork: the cipher wheel at the evidence cage, the affidavit at the desk ----------------
    if want('paper'):
        open_link(ctx, 'e2.paper'); p.wait_for_timeout(800); advance_talk(60)
        spots = J("() => { const s = {}; for (const i of __wiretap.game.scene.ints || []) s[i.id] = [i.x, i.y]; return s; }")
        ok = walk_to(*spots['evidence'], r=16); p.keyboard.press('KeyE'); p.wait_for_timeout(900); advance_talk()
        check('paper: walked to the evidence cage and opened the code card (E)', top_id() == 'cipher', top_id())
        pages = J("() => [...__wiretap.UI.top().el.querySelectorAll('[data-f^=\"pg:\"]')].map(n => n.dataset.f)"); solved = 0
        for pg in pages:
            choose(pg); p.wait_for_timeout(300)
            for _ in range(4):
                if J("() => __wiretap.Cipher_solved()"): break
                p.keyboard.press('KeyE'); p.wait_for_timeout(400)
            solved += 1 if J("(id) => __wiretap.Cipher.solved(id)", pg[3:]) else 0
        check('paper: decoded ' + str(solved) + '/' + str(len(pages)) + ' of Corey\'s pager pages on the wheel (Enter picks a page, E turns; the task needs 4)', pages and solved >= 4, pages)
        p.keyboard.press('Escape'); p.wait_for_timeout(600); advance_talk()
        while top_id(): p.keyboard.press('Escape'); p.wait_for_timeout(400)
        ok = walk_path([(9.1, 7.4), (9.1, 4.3), (spots['desk'][0] / 16, spots['desk'][1] / 16 + .3)]); near = J("() => __wiretap.game.scene.near && __wiretap.game.scene.near.id"); p.keyboard.press('KeyE'); p.wait_for_timeout(900); advance_talk()
        if top_id() != 'affidavit': print('  (desk: walk', ok, 'near', near, 'pos', J("() => [Math.round(__wiretap.game.scene.P.x), Math.round(__wiretap.game.scene.P.y)]"), 'desk at', spots['desk'], 'tasks', J("() => __wiretap.Annex.tasks().map(t => t.at + ':' + __wiretap.Annex.ready(t))"), ')')
        check('paper: walked to the desk and opened the affidavit (E)', top_id() == 'affidavit', top_id())
        for k in ['P1', 'P2', 'PG']:
            for _ in range(3):
                if not choose('add:' + k): break
                p.wait_for_timeout(500)
                cards = J("() => [...__wiretap.UI.top().el.querySelectorAll('[data-f]')].map(n => [n.dataset.f, n.textContent])")
                if not cards or cards[0][0] == 'none': choose('none') if cards else None; p.wait_for_timeout(300); break
                best = next((c for c in cards if 'DIRECT' in c[1]), None) or cards[0]
                choose(best[0]); p.wait_for_timeout(400)
        choose('nec:surveil'); p.wait_for_timeout(300); choose('submit'); p.wait_for_timeout(900)
        A = J("() => { const A = __wiretap.STATE().affidavit; return A ? { submitted: A.submitted, lines: Object.fromEntries(Object.entries(A.lines).map(([k, v]) => [k, __wiretap.Paper.score(k, v)])) } : null; }")
        check('paper: built the affidavit with the arrow keys and Enter and submitted it (' + json.dumps(A and {k: [v.get('pts'), v.get('ok')] for k, v in A['lines'].items()}) + ')', A and A['submitted'] and any(v.get('ok') for v in A['lines'].values()), A)
        no_errors('paper')
    # ---------------- the Board: walk to it in the Annex, pin with the arrow keys and Enter ----------------
    if want('board'):
        open_link(ctx, 'e4.numbers'); p.wait_for_timeout(800); advance_talk(60)
        spots = J("() => { const s = {}; for (const i of __wiretap.game.scene.ints || []) s[i.id] = [i.x, i.y]; return s; }")
        ok = walk_to(*spots['ren'], r=16); p.keyboard.press('KeyE'); p.wait_for_timeout(600); advance_talk()
        while top_id(): p.keyboard.press('Enter'); p.wait_for_timeout(500); advance_talk()
        ok = walk_to(*spots['board'], r=16) and ok; p.keyboard.press('KeyE'); p.wait_for_timeout(900); advance_talk()
        check('Board: walked to the Board in the Annex and opened it with E', top_id() == 'board', top_id())
        pairs = J("() => { const out = [], cards = __wiretap.Board.cards(); __wiretap.BOARD.forEach((tier, ti) => { for (const sl of tier.slots) { const c = cards.find(c => __wiretap.Board.check(sl, c) === true && !out.some(o => o[1] === c)); if (c && !__wiretap.STATE().board.pins[sl.id]) out.push([sl.id, c, ti]); } }); return out; }")
        pinned = 0
        for slot, card, ti in pairs:
            for _ in range(4):   # Q/E: the slot's tier
                if J("() => __wiretap.Board.tier") == ti: break
                p.keyboard.press('KeyE'); p.wait_for_timeout(300)
            if not choose('card:' + card): print('  (card', card, 'not reachable on tier', J("() => __wiretap.Board.tier"), ')'); continue
            p.wait_for_timeout(300)
            if not choose('slot:' + slot):
                print('  (slot', slot, 'not reachable)')
                if os.environ.get('WT_DEBUG'):
                    print('   ', J("() => [...__wiretap.UI.top().el.querySelectorAll('[data-f]')].map(n => { const r = n.getBoundingClientRect(); return n.dataset.f + '@' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); }).join(' | ')"))
                    for k in ['ArrowUp', 'ArrowRight', 'ArrowUp', 'ArrowRight']:
                        p.keyboard.press(k); p.wait_for_timeout(200); print('    after', k, J("() => __wiretap.UI.top().focus.dataset.f"), 'paused', J("() => __wiretap.game.paused"), 'talk', talking(), 'shell', J("() => !!(__wiretap.game.shell && __wiretap.game.shell.screen)"), 'top', top_id())
                continue
            p.wait_for_timeout(500); advance_talk(10)
            if J("(s) => __wiretap.STATE().board.pins[s]", slot) == card: pinned += 1
            else: print('  (pin', card, '->', slot, 'did not land: tier', J("() => __wiretap.Board.tier"), 'sel', J("() => __wiretap.Board.sel"), 'focus', J("() => { const t = __wiretap.UI.top(); return t && t.focus && t.focus.dataset.f; }"), 'top', top_id(), ')')
        check('Board: pinned ' + str(pinned) + '/' + str(len(pairs)) + ' cards with the arrow keys and Enter (' + ', '.join(c + '->' + s for s, c, _ in pairs) + ')', len(pairs) >= 2 and pinned == len(pairs), pairs)
        for _ in range(3):   # the first Escape puts down a held card, the next closes the Board
            if top_id() != 'board': break
            p.keyboard.press('Escape'); p.wait_for_timeout(500)
        check('Board: Escape closes it back to the Annex', top_id() is None and J("() => __wiretap.game.sceneName") == 'annex', top_id())
        no_errors('board')
    # ---------------- Tee's night: orders on the Q wheel, the pager on Tab ----------------
    if want('tee'):
        open_link(ctx, 'e1.i1'); advance_talk(60); p.wait_for_timeout(500); advance_talk()
        taken0 = J("() => __wiretap.Mission.M.sim.L.taken")
        def order(dir_key):
            p.keyboard.down('KeyQ'); p.wait_for_timeout(450); p.keyboard.down(dir_key); p.wait_for_timeout(350); p.keyboard.up('KeyQ'); p.wait_for_timeout(120); p.keyboard.up(dir_key); p.wait_for_timeout(500); advance_talk(8)
        order('KeyW'); shut = J("() => !__wiretap.Mission.M.sim.open")
        check('Tee: hold Q and push up orders "Shut it down"', shut, J("() => __wiretap.Mission.M.sim.open"))
        p.wait_for_timeout(1500); order('KeyS'); opened = J("() => __wiretap.Mission.M.sim.open")
        check('Tee: hold Q and push down orders "Open up"', opened)
        p.keyboard.press('Tab'); p.wait_for_timeout(700)
        check('Tee: Tab opens the pager', top_id() == 'pager', top_id())
        sent0 = J("() => __wiretap.TeeShift.sent.length"); choose('send'); p.wait_for_timeout(800)
        while top_id(): p.keyboard.press('Escape'); p.wait_for_timeout(400)
        check('Tee: the pager sends the re-up page from the keyboard', J("() => __wiretap.TeeShift.sent.length") > sent0, J("() => __wiretap.TeeShift.sent"))
        p.wait_for_timeout(20000)
        taken = J("() => __wiretap.Mission.M.sim.L.taken")
        check('Tee: the corner keeps selling while Tee runs it ($' + str(taken0) + ' -> $' + str(taken) + ' in 20 s)', taken > taken0, taken)
        no_errors('tee')
    # ---------------- versus: a bots round, WASD and the camera ----------------
    if want('versus'):
        open_link(ctx, 'versus.bots'); p.wait_for_timeout(2500); advance_talk(10)
        me = J("() => { const S = __wiretap.Versus && __wiretap.Versus.sim; if (!S) return null; const h = S.players.find(x => x.human && x.local); return h ? { side: h.side, role: h.role, x: h.agent.x, y: h.agent.y } : null; }")
        check('versus: a bots round starts with a local human player (' + json.dumps(me) + ')', bool(me), me)
        if me:
            hold(['KeyD']); p.wait_for_timeout(1200); hold(['KeyS']); p.wait_for_timeout(800); hold([])
            me2 = J("() => { const h = __wiretap.Versus.sim.players.find(x => x.human && x.local); return { x: h.agent.x, y: h.agent.y, photos: h.stats.photos }; }")
            check('versus: WASD moves the player (' + str(round(abs(me2['x'] - me['x']) + abs(me2['y'] - me['y']))) + ' units)', abs(me2['x'] - me['x']) + abs(me2['y'] - me['y']) > 20)
            if me['side'] == 'detail':
                p.mouse.move(700, 330); p.mouse.down(button='right'); p.wait_for_timeout(900); p.mouse.click(700, 330, button='left'); p.wait_for_timeout(300); p.mouse.up(button='right')
                ph = J("() => __wiretap.Versus.sim.players.find(x => x.human && x.local).stats.photos")
                check('versus: as the detail, right mouse + left click takes a photo', ph > me2['photos'], ph)
            t1 = J("() => __wiretap.Versus.sim.t"); p.wait_for_timeout(3000); t2 = J("() => __wiretap.Versus.sim.t")
            check('versus: the round clock runs', t2 > t1, [t1, t2])
        no_errors('versus')
    b.close()
print(('all real-input sessions passed' if not fails else str(fails) + ' check(s) failed')); sys.exit(1 if fails else 0)
