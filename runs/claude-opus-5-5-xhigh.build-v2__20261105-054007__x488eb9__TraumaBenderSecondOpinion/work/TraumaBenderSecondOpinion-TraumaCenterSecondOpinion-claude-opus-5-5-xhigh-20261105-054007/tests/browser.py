# The browser part of the tests: the built page from file://, one or two browsers at a time. Prints failures and a one-line count.
import json, os, sys, glob
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
page_path = glob.glob(os.path.join(root, '..', 'TraumaBender*.html'))[0]
url = 'file://' + os.path.abspath(page_path)
PAD = """(() => { const axes = [0, 0, 0, 0], buttons = Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes, buttons,
    vibrationActuator: { playEffect() { return Promise.resolve('complete'); }, reset() { return Promise.resolve('complete'); } } };
  window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; })();"""
checks = 0; fails = []
def check(name, ok, detail: object = ''):
    global checks
    checks += 1
    if not ok: fails.append(name + (': ' + str(detail)[:500] if detail != '' else ''))
AUTOPLAY = ['--autoplay-policy=no-user-gesture-required']
def plays(p, name, b):
    br = b.launch(args=AUTOPLAY) if name == 'chromium' else b.launch()
    ctx = br.new_context(viewport={'width': 1280, 'height': 720}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto(url); pg.wait_for_timeout(2500)
    check(name + ': boots to the title', pg.evaluate("() => GAME.game.sceneName") == 'title')
    pg.evaluate("() => GAME.game.go('op', { caseId: 'crane9', seed: 3, attract: true, dev: { noTut: true, lock: true, freeze: true }, botSkill: { iv: 0 } })")
    pg.wait_for_timeout(27000)
    st = pg.evaluate("() => ({ scene: GAME.game.sceneName, errs: GAME.game.errors.length, t: GAME.game.scene.S && GAME.game.scene.S.rt })")
    check(name + ': a case plays with no errors', st['scene'] == 'op' and st['errs'] == 0 and st['t'] > .5 and not errs, str(st) + str(errs[:2]))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    br.close()
with sync_playwright() as p:
    for name in ['chromium', 'firefox', 'webkit']:
        try: plays(p, name, getattr(p, name))
        except Exception as e: check(name + ' ran', False, e)
    b = p.chromium.launch(args=AUTOPLAY)
    # ---- settings, pad, prompts
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080}); ctx.add_init_script(PAD); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto(url); pg.wait_for_timeout(2200)
    s = pg.evaluate("() => { const g = GAME.game; return { music: g.settings.music, mv: g.audio.musicVolume, glyphs: g.settings.glyphs, W: g.W, H: g.H }; }")
    check('settings: music defaults to 10%', s['music'] == .1 and s['mv'] == .1, s); check('settings: PlayStation glyphs by default', s['glyphs'] == 'playstation', s); check('1080p buffer is 480x270', s['W'] == 480 and s['H'] == 270, s)
    pg.evaluate("() => GAME.game.go('op', { caseId: 'glasshouse', seed: 3, dev: { noTut: true }, difficulty: 'resident' })"); pg.wait_for_timeout(900)
    pg.evaluate("() => { __pad.axes[2] = 1; __pad.timestamp++; }"); pg.wait_for_timeout(600); pg.evaluate("() => { __pad.axes[2] = 0; __pad.timestamp++; }"); pg.wait_for_timeout(120)
    r = pg.evaluate("() => { const sc = GAME.game.scene, I = GAME.game.input; return { x: sc.locals[0].c.x, device: I.lastDevice, R2: I.label('useTool'), tri: I.label('gift'), style: I.padStyle && I.padStyle() }; }")
    check('pad: the right stick moves the cursor', r['x'] > 240, r); check('pad: prompts are R2 and triangle', r['R2'] == 'R2' and r['tri'] == '△' and r['device'] == 'gamepad', r)
    pg.evaluate("() => { __pad.axes[0] = .95; __pad.timestamp++; }"); pg.wait_for_timeout(250); tool = pg.evaluate("() => GAME.game.scene.locals[0].c.tool"); pg.evaluate("() => { __pad.axes[0] = 0; __pad.timestamp++; }"); check('pad: a left stick flick picks a tool', tool == 'suture', tool)
    pg.evaluate("() => { __pad.buttons[7].value = .5; __pad.buttons[7].pressed = true; __pad.timestamp++; }"); pg.wait_for_timeout(120); v = pg.evaluate("() => GAME.game.input.value('useTool')"); pg.evaluate("() => { __pad.buttons[7].value = 0; __pad.buttons[7].pressed = false; __pad.timestamp++; }"); check('pad: the trigger is analog', abs(v - .5) < .05, v)
    pg.evaluate("() => GAME.game.settings.set('glyphs', 'xbox')"); pg.wait_for_timeout(80); l = pg.evaluate("() => [GAME.game.input.label('useTool'), GAME.game.input.label('gift')]"); check('the Xbox option switches labels', l[0] == 'RT' and l[1] == 'Y', l); pg.evaluate("() => GAME.game.settings.set('glyphs', 'playstation')")
    pg.mouse.move(500, 500); pg.wait_for_timeout(100); pg.mouse.move(700, 540); pg.wait_for_timeout(150); m = pg.evaluate("() => { const L = GAME.game.scene.locals[0], I = GAME.game.input; return { dev: I.lastDevice, label: I.label('useTool'), x: L.c.x, y: L.c.y, ox: GAME.game.scene.V.OX, oy: GAME.game.scene.V.OY }; }")
    check('mouse: prompts follow it, the cursor is the pointer', m['label'] == 'Left click' and abs(m['x'] + m['ox'] - 700 / 4) < 2, m)
    pg.keyboard.down('ShiftLeft'); pg.wait_for_timeout(350); pg.keyboard.up('ShiftLeft'); check('fine mode shows the loupe with no errors', pg.evaluate("() => GAME.game.errors.length") == 0)
    pg.keyboard.press('Digit4'); pg.wait_for_timeout(80); k = pg.evaluate("() => [GAME.game.input.label('useTool'), GAME.game.scene.locals[0].c.tool]"); check('keys: prompts follow them, 1 to 8 pick', k[0] == 'Space' and k[1] == 'salve', k)
    # pause menu at TV scale: every row reachable, Dev Mode is in it
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250); menu = pg.evaluate("() => { const rows = [...document.querySelectorAll('[data-sys] button, .esh-row, .esh button')].map(b => b.textContent.trim()).filter(Boolean); return { paused: GAME.game.paused, rows }; }")
    check('pause opens', menu['paused'], menu); check('pause menu lists Dev Mode and Quit', any('Dev Mode' in t for t in menu['rows']) and any('Quit' in t for t in menu['rows']), menu)
    pg.get_by_text('Dev Mode', exact=False).first.click(); pg.wait_for_timeout(300); d = pg.evaluate("() => ({ open: GAME.Dev.panelOpen, paused: GAME.game.paused })"); check('Dev Mode opens from the pause menu, the game runs behind it', d['open'] and not d['paused'], d)
    pg.evaluate("() => GAME.Dev.close()"); check('no errors with a pad', not errs, errs[:2]); ctx.close()
    # ---- a person's hands, through real events: the mouse plays Case 1 start to finish
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.goto(url); pg.wait_for_timeout(1500)
    pg.evaluate("() => { GAME.Flow.origin = 'files'; GAME.game.go('op', { caseId: 'glasshouse', seed: 3, difficulty: 'resident' }); }"); pg.wait_for_timeout(600)
    info = lambda: pg.evaluate("() => { const g = GAME.game, S = g.scene.S, V = g.scene.V, k = g.screen.canvas.getBoundingClientRect().width / g.W; return S ? { ph: S.ph, status: S.status, tut: !!S.tut, slips: S.stats.slips, k, ox: V.OX, oy: V.OY, objs: S.objs.filter(o => !o.done).map(o => ({ id: o.id, type: o.type, x: o.x, y: o.y, ax: o.pull ? o.pull.ax : 0, ay: o.pull ? o.pull.ay : 0, depth: o.pull ? o.pull.depth : 0, st: o.stitches ? o.stitches[o.sewn] : null, r: o.r })) } : null; }")
    def cl(s, x, y): return ((x + s['ox']) * s['k'], (y + s['oy']) * s['k'])
    def glide(s, x0, y0, x1, y1, n=14, ms=28):
        for i in range(1, n + 1):
            p_ = cl(s, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); pg.mouse.move(p_[0], p_[1]); pg.wait_for_timeout(ms)
    def wait_phase(ph, t=60):
        for i in range(t):
            s = info()
            if s and s['ph'] >= ph and s['status'] == 'play': return s
            pg.wait_for_timeout(100)
        return info()
    s = info(); pg.mouse.move(*cl(s, 100, 200)); pg.wait_for_timeout(100)
    for o in [q for q in s['objs'] if q['type'] == 'shard']:
        pg.mouse.move(*cl(s, o['x'], o['y'])); pg.wait_for_timeout(90); pg.mouse.down(); pg.wait_for_timeout(50); glide(s, o['x'], o['y'], o['x'] + o['ax'] * (o['depth'] + 6), o['y'] + o['ay'] * (o['depth'] + 6), 16, 34); pg.wait_for_timeout(50); pg.mouse.up(); pg.wait_for_timeout(120)
    s = wait_phase(1); check('mouse: the glass comes out, phase 2', s['ph'] == 1, s['ph'])
    pg.keyboard.press('Digit4'); pg.wait_for_timeout(250)
    for o in [q for q in s['objs'] if q['type'] == 'laceration']:
        pg.mouse.move(*cl(s, o['x'] - 6, o['y'] - 6)); pg.wait_for_timeout(60); pg.mouse.down(); glide(s, o['x'] - 6, o['y'] - 6, o['x'] + 6, o['y'] + 6, 8, 30); glide(s, o['x'] + 6, o['y'] + 6, o['x'] - 6, o['y'] + 6, 6, 30); glide(s, o['x'] - 6, o['y'] + 6, o['x'] + 6, o['y'] - 6, 8, 30); pg.mouse.up(); pg.wait_for_timeout(80)
    s = wait_phase(2); check('mouse: the cuts heal, phase 3', s['ph'] == 2, s['ph'])
    pg.keyboard.press('Digit3'); pg.wait_for_timeout(250)
    for i in range(6):
        s2 = info(); w = next((q for q in s2['objs'] if q['type'] == 'wound'), None)
        if not w: break
        a, b2 = w['st']['a'], w['st']['b']; pg.mouse.move(*cl(s2, a[0], a[1])); pg.wait_for_timeout(70); pg.mouse.down(); pg.wait_for_timeout(30); glide(s2, a[0], a[1], b2[0], b2[1], 8, 24); pg.mouse.up(); pg.wait_for_timeout(90)
    s = wait_phase(3); check('mouse: the wound closes, phase 4', s['ph'] == 3, s['ph'])
    pg.keyboard.press('Digit5'); pg.wait_for_timeout(250)
    for i in range(5):
        st = pg.evaluate("() => GAME.game.scene.S.status")
        if st != 'play' or pg.evaluate("() => GAME.game.scene.S.close != null"): break
        pg.mouse.down(); pg.wait_for_timeout(720); pg.mouse.up(); pg.wait_for_timeout(520)
    ok = False
    for i in range(120):
        c = pg.evaluate("() => { const S = GAME.game.scene.S; return S && S.close ? [S.close.r, S.close.done] : null; }")
        if c and not c[1] and abs(c[0] - 12) < 3.5: pg.mouse.click(*cl(s, 213, 118)); ok = True; break
        pg.wait_for_timeout(16)
    pg.wait_for_timeout(3200); r = pg.evaluate("() => ({ scene: GAME.game.sceneName, rank: GAME.game.scene.S && GAME.game.scene.S.rank, score: GAME.game.scene.S && GAME.game.scene.S.score, slips: GAME.game.scene.S && GAME.game.scene.S.stats.slips })")
    check('mouse: a person can finish Case 1 and reach Results', r['scene'] == 'results' and r['rank'] in ('S', 'A', 'B'), r); check('mouse: a careful run has no slips', r['slips'] == 0, r); check('mouse: no errors in Case 1', not errs and pg.evaluate("() => GAME.game.errors.length") == 0, errs[:2]); ctx.close()
    # ---- the pad, closed loop on the real input path: a shard and a stitch
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}); ctx.add_init_script(PAD); pg = ctx.new_page(); pg.goto(url); pg.wait_for_timeout(1500)
    res = pg.evaluate("""async () => {
      const G = GAME, g = G.game; G.Flow.origin = 'files'; g.go('op', { caseId: 'glasshouse', seed: 3, difficulty: 'resident', dev: { noTut: true } }); await new Promise(r => setTimeout(r, 700)); const sc = g.scene, L = sc.locals[0], S = sc.S, wait = ms => new Promise(r => setTimeout(r, ms));
      const stick = (x, y) => { __pad.axes[2] = x; __pad.axes[3] = y; __pad.timestamp++; };
      const go = async (x, y, spd = 1) => { for (let i = 0; i < 300; i++) { const dx = x - L.c.x, dy = y - L.c.y, d = Math.hypot(dx, dy); if (d < 2) break; const m = Math.max(.3, Math.min(1, d / 50)) * spd; stick(dx / d * m, dy / d * m); await wait(16); } stick(0, 0); await wait(40); };
      const trig = v => { __pad.buttons[7].value = v; __pad.buttons[7].pressed = v > .1; __pad.timestamp++; };
      for (const o of S.objs.filter(q => q.type === 'shard').slice(0)) { await go(o.x, o.y); trig(.9); await wait(60); const p = o.pull, n = p.depth + 6, T0 = performance.now(); while (!o.free && performance.now() - T0 < 2500) { const dx = o.ox + p.ax * (p.prog + 8) - L.c.x, dy = o.oy + p.ay * (p.prog + 8) - L.c.y, d = Math.hypot(dx, dy) || 1, m = .45; stick(dx / d * m, dy / d * m); await wait(16); } stick(0, 0); await wait(40); trig(0); await wait(100); }
      await wait(1300); const ph1 = S.ph; __pad.axes[0] = .95; __pad.timestamp++; await wait(200); __pad.axes[0] = 0; __pad.timestamp++; await wait(300); const tool = L.c.tool;
      return { ph1, tool, slips: S.stats.slips, tb: S.stats.tb, cl: S.stats.cl, errors: g.errors.length };
    }""")
    check('pad: a stick and a trigger pull all the glass', res['ph1'] >= 1 and res['errors'] == 0, res); check('pad: then a flick reaches for the needle', res['tool'] == 'suture', res); ctx.close()
    # ---- the ward: hover moves the focus to a person, clicking walks there and talks
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.goto(url); pg.wait_for_timeout(1500)
    pg.evaluate("() => { GAME.Flow.prog.patients = ['glasshouse']; GAME.Flow.prog.chapter = 2; GAME.game.go('ward', { ward: 'ward3', chapter: 2 }); }"); pg.wait_for_timeout(900)
    q = pg.evaluate("() => { const sc = GAME.game.scene, p = sc.people.find(x => x.id === 'agnes'), w = GAME.game.r.w(p.x, p.y, 12), k = GAME.game.screen.canvas.getBoundingClientRect().width / GAME.game.W; return { x: w[0] * k, y: w[1] * k }; }")
    pg.mouse.move(q['x'] + 8, q['y'] + 8); pg.wait_for_timeout(60); pg.mouse.move(q['x'], q['y']); pg.wait_for_timeout(200); f = pg.evaluate("() => { const s = GAME.game.scene; return s.focus && s.focus.id; }"); check('ward: hover moves the focus to a person', f == 'agnes', f)
    pg.mouse.click(q['x'], q['y']); pg.wait_for_timeout(1600); t = pg.evaluate("() => GAME.game.scene.talk.open"); check('ward: a click walks there and talks', t, t); check('ward: no errors', not errs and pg.evaluate("() => GAME.game.errors.length") == 0, errs[:2]); ctx.close()
    # ---- audio: effects, each voice and the choir are not silent; at defaults music is well below effects
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}); pg = ctx.new_page(); pg.goto(url); pg.wait_for_timeout(1800); pg.mouse.click(300, 300); pg.wait_for_timeout(200)
    res = pg.evaluate("""async () => {
      const G = GAME, a = G.game.audio; a.bus('sfx'); const ctx = a.ctx; await ctx.resume();
      const meter = name => { const an = ctx.createAnalyser(); an.fftSize = 2048; a.bus(name).connect(an); return an; };
      const peak = async (an, ms) => { const d = new Float32Array(an.fftSize); let p = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(d); for (const v of d) p = Math.max(p, Math.abs(v)); await new Promise(r => setTimeout(r, 15)); } return p; };
      const fx = meter('sfx'), vo = meter('voice'), mu = meter('music'); const out = {};
      G.Music.stop(); await new Promise(r => setTimeout(r, 700));
      G.Sfx.ready(); G.Sfx.chime(); out.sfx = await peak(fx, 350); G.Sfx.thud(); out.thud = await peak(fx, 350);
      for (const k of ['vale', 'quill', 'oyelaran', 'sokolova', 'percy', 'odalys', 'hale', 'clementine', 'agnes']) { G.Babble.say(k, 'Doctor, it hums. Is that normal?'); out['voice_' + k] = await peak(vo, 300); await new Promise(r => setTimeout(r, 300)); }
      G.Choir.note(220, .5, { vol: .14 }); out.choir = await peak(fx, 400); await new Promise(r => setTimeout(r, 500));
      G.Music.play('op', { restart: true }); out.music = await peak(mu, 1500); G.Sfx.thud(); out.fxLoud = await peak(fx, 300);
      return out;
    }""")
    check('audio: effects sound', res['sfx'] > .02 and res['thud'] > .05, res)
    for k in res:
        if k.startswith('voice_'): check('audio: voice ' + k[6:] + ' sounds', res[k] > .005, res[k])
    check('audio: the choir sounds', res['choir'] > .01, res['choir']); check('audio: music plays quiet', 0 < res['music'] < res['fxLoud'] * .6, res); ctx.close()
    # ---- phones: the notice, Settings, no touch buttons, and the reel behind them
    for label, dev, brt in [('chromium', 'iPhone 13', b), ('webkit', 'iPhone 13', None)]:
        br = brt or p.webkit.launch(); ctx = br.new_context(**p.devices[dev]); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.goto(url); pg.wait_for_timeout(2500)
        n = pg.evaluate("() => { const d = document.querySelector('[data-sys=need]'); return { shown: !!d && d.style.display !== 'none', text: d ? d.textContent : '', btn: d ? d.querySelector('button').getBoundingClientRect().toJSON() : null, touchBtns: document.querySelectorAll('[data-act]').length, scene: GAME.game.sceneName, H: innerHeight }; }")
        check(label + ' phone: Controller or keyboard required, with Settings', n['shown'] and 'Controller or keyboard required' in n['text'] and n['btn'], n); check(label + ' phone: no touch controls', n['touchBtns'] == 0, n)
        pg.wait_for_timeout(11000); st = pg.evaluate("() => ({ a: GAME.Attract.active, s: GAME.game.sceneName, e: GAME.game.errors.length })"); check(label + ' phone: the reel runs behind the notice', st['a'] and st['e'] == 0, st)
        pg.touchscreen.tap(n['btn']['x'] + n['btn']['width'] / 2, n['btn']['y'] + n['btn']['height'] / 2); pg.wait_for_timeout(500); o = pg.evaluate("() => ({ open: !!(GAME.game.shell && GAME.game.shell.screen), a: GAME.Attract.active })"); check(label + ' phone: a tap on Settings opens it', o['open'], o); check(label + ' phone: no errors', not errs, errs[:2])
        ctx.close();
        if not brt: br.close()
    # ---- sizes: the HUD inside the screen, the cavity centered
    for w, h in [(1280, 720), (1920, 1080), (2560, 1440), (3440, 1440)]:
        ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page(); pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate("() => GAME.game.go('op', { caseId: 'glasshouse', seed: 3, dev: { noTut: true } })"); pg.wait_for_timeout(900)
        s = pg.evaluate("() => { const g = GAME.game, V = g.scene.V; return { W: g.W, H: g.H, ox: V.OX, oy: V.OY, e: g.errors.length }; }")
        check(f'size {w}x{h}: the design space fits', s['W'] >= 426 and s['H'] >= 240 and s['ox'] == (s['W'] - 426) >> 1 and s['e'] == 0, s); ctx.close()
    b.close()
for f in fails: print('FAIL', f)
print(f'{checks} browser checks, {len(fails)} failed')
sys.exit(1 if fails else 0)
