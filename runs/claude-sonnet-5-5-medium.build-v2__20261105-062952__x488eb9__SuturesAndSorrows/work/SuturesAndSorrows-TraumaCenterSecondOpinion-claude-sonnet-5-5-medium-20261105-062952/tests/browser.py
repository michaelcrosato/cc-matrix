# Browser checks (Chromium; Firefox and WebKit just load and play 30 s). Prints failures and a one-line count.
import json, os, sys, glob
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
html = glob.glob(os.path.join(root, '..', '*.html'))[0]; url = 'file://' + html
PAD = open(os.path.join(root, 'tests', 'padstub.js')).read()
fails = []; n = 0
def check(name, ok, detail=''):
    global n; n += 1
    if not ok: fails.append('FAIL ' + name + ((': ' + str(detail)[:300]) if detail != '' else ''))
def run(pw, kind, fn, **ctxopts):
    b = getattr(pw, kind).launch(**({'args': ['--autoplay-policy=no-user-gesture-required']} if kind == 'chromium' else {}))
    try:
        ctx = b.new_context(**ctxopts); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: errs.append(m.text[:200]) if m.type == 'error' else None)
        fn(pg, ctx, errs)
    finally: b.close()
only = sys.argv[1] if len(sys.argv) > 1 else ''
with sync_playwright() as pw:
    if not only or only == 'engines':
        for kind in ['chromium', 'firefox', 'webkit']:
            def f(pg, ctx, errs):
                pg.goto(url); pg.wait_for_timeout(1500); pg.evaluate("() => GAME.game.go('op', { id: 'c1', bots: [true] })"); pg.wait_for_timeout(12000)
                st = pg.evaluate("() => ({ s: GAME.game.debug.snapshot(), e: GAME.game.errors.length })"); check(kind + ' plays 12 s with no errors', st['e'] == 0 and not errs and st['s']['scene'] == 'op', json.dumps(st) + str(errs[:2]))
            run(pw, kind, f, viewport={'width': 1280, 'height': 720})
    if not only or only == 'chromium':
        def f(pg, ctx, errs):
            ctx.add_init_script(PAD); pg.goto(url); pg.wait_for_timeout(1200)
            check('settings defaults: music .1, glyphs PlayStation', pg.evaluate("() => GAME.game.settings.music === .1 && GAME.game.settings.glyphs === 'playstation'"))
            pg.evaluate("() => { window.__pad.buttons[0].pressed = true; window.__pad.buttons[0].value = 1; window.__pad.timestamp++ }"); pg.wait_for_timeout(200); pg.evaluate("() => { window.__pad.buttons[0].pressed = false; window.__pad.buttons[0].value = 0; window.__pad.timestamp++ }"); pg.wait_for_timeout(300)
            lab = pg.evaluate("() => GAME.game.input.label('useTool') + '|' + GAME.game.input.label('gift') + '|' + GAME.game.input.lastDevice + '|' + GAME.game.input.padStyle()"); check('pad: R2 and triangle prompts', lab.startswith('R2|') and '△' in lab.split('|')[1], lab)
            pg.evaluate("() => GAME.game.settings.set('glyphs', 'xbox')"); lab2 = pg.evaluate("() => GAME.game.input.label('useTool') + '|' + GAME.game.input.label('gift')"); check('Xbox option switches labels', lab2.startswith('RT|') and 'Y' in lab2, lab2); pg.evaluate("() => GAME.game.settings.set('glyphs', 'playstation')")
            pg.evaluate("() => { GAME.run = { bonus: { clock: 0, steady: 0 }, caseId: 'c1', fails: 0, easy: false }; GAME.game.go('op', { id: 'c1' }) }"); pg.wait_for_timeout(2500)
            # right stick moves the cursor, trigger presses, wheel picks
            pg.evaluate("() => { window.__pad.axes[2] = 1; window.__pad.timestamp++ }"); pg.wait_for_timeout(700); x1 = pg.evaluate("() => GAME.game.scene.view.ctl[0].cur.x"); pg.evaluate("() => { window.__pad.axes[2] = 0; window.__pad.timestamp++ }")
            check('pad right stick moves the cursor', x1 > 260, x1)
            pg.evaluate("() => { window.__pad.axes[0] = 1; window.__pad.axes[1] = 0; window.__pad.timestamp++ }"); pg.wait_for_timeout(500); t = pg.evaluate("() => GAME.game.scene.view.ctl[0].tool"); pg.evaluate("() => { window.__pad.axes[0] = 0; window.__pad.timestamp++ }")
            check('pad left stick east picks Suture', t == 'suture', t)
            pg.evaluate("() => { window.__pad.buttons[7].value = .5; window.__pad.buttons[7].pressed = true; window.__pad.timestamp++ }"); pg.wait_for_timeout(300); tr = pg.evaluate("() => GAME.game.scene.S.pl[0].trig"); pg.evaluate("() => { window.__pad.buttons[7].value = 0; window.__pad.buttons[7].pressed = false; window.__pad.timestamp++ }")
            check('analog trigger reaches the sim', 0.4 < tr < 0.6, tr)
            pg.keyboard.press('KeyW'); pg.wait_for_timeout(300); lab3 = pg.evaluate("() => GAME.game.input.label('useTool')"); check('keyboard switches prompts to Space', lab3 == 'Space', lab3)
            pg.mouse.move(600, 400); pg.wait_for_timeout(100); pg.mouse.move(640, 430, steps=5); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(300); lab4 = pg.evaluate("() => GAME.game.input.label('useTool')"); check('mouse switches prompts to Left click', 'click' in lab4.lower(), lab4)
            # audio: effects are not silent, voices are not silent, music is below effects at defaults
            lv = pg.evaluate("""async () => { const au = GAME.game.audio; au._init(); await au.ctx.resume(); const an = au.ctx.createAnalyser(); an.fftSize = 1024; au.bus('sfx').connect(an); au.bus('voice').connect(an); const buf = new Float32Array(1024); const peak = () => { an.getFloatTimeDomainData(buf); return Math.max(...buf.map(Math.abs)); }; const wait = ms => new Promise(r => setTimeout(r, ms));
                let best = 0; GAME.Audio.sfx('chime'); for (let i = 0; i < 6; i++) { await wait(30); best = Math.max(best, peak()); } const sfx = best; best = 0; GAME.Audio.speak('Nurse Quill', 'Forceps, Doctor.', {}); for (let i = 0; i < 12; i++) { await wait(40); best = Math.max(best, peak()); } const voice = best; best = 0; GAME.Audio.choirStart().set(1, { freq: 220 }); for (let i = 0; i < 10; i++) { await wait(60); best = Math.max(best, peak()); } const choir = best; GAME.Audio.choir.set(0);
                return { sfx, voice, choir, mus: au.musicVolume, sfxv: au.sfxVolume }; }"""); check('effects, voices and choir are not silent', lv['sfx'] > .01 and lv['voice'] > .005 and lv['choir'] > .005, lv); check('music well below effects at defaults', lv['mus'] <= lv['sfxv'] / 5, lv)
            check('no page errors', not errs, errs[:3])
        run(pw, 'chromium', f, viewport={'width': 1280, 'height': 720})
        # sizes: HUD inside the screen, the cavity centred
        for w, h in [(1280, 720), (1920, 1080), (2560, 1440), (3440, 1440)]:
            def f(pg, ctx, errs, w=w, h=h):
                pg.goto(url); pg.wait_for_timeout(1200); pg.evaluate("() => { GAME.run = { bonus: { clock: 0, steady: 0 }, caseId: 'c1', fails: 0, easy: false }; GAME.game.go('op', { id: 'c1' }) }"); pg.wait_for_timeout(2500)
                d = pg.evaluate("() => ({ W: GAME.game.W, H: GAME.game.H, ox: GAME.game.scene.view.OX, oy: GAME.game.scene.view.OY })"); check(f'{w}x{h}: field centred, at least 426x240 visible', d['W'] >= 426 and d['H'] >= 240 and abs(d['ox'] * 2 + 426 - d['W']) <= 1 and abs(d['oy'] * 2 + 240 - d['H']) <= 1, d)
                if (w, h) in [(1920, 1080), (3440, 1440)]: pg.screenshot(path=os.path.join(root, 'shots', f'size{w}.png'))
            run(pw, 'chromium', f, viewport={'width': w, 'height': h})
    if not only or only == 'phone':
        for kind, dev in [('chromium', 'Pixel 7'), ('webkit', 'iPhone 13')]:
            def f(pg, ctx, errs):
                pg.goto(url); pg.wait_for_timeout(2500); txt = pg.evaluate("() => { const d = document.querySelector('[data-sys=need]'); return d ? d.innerText + '|' + getComputedStyle(d).display : '' }")
                check(kind + ' phone: notice shows', 'Controller or keyboard required' in txt, txt)
                check(kind + ' phone: no touch buttons', pg.evaluate("() => !document.querySelector('[data-touch], .e3-touch, [data-act]')"))
                pg.evaluate("() => GAME.game.go('attract')"); pg.wait_for_timeout(3000); check(kind + ' phone: attract runs behind', pg.evaluate("() => GAME.game.debug.snapshot().scene") == 'attract')
                pg.locator('[data-sys=need] button').tap(); pg.wait_for_timeout(800); check(kind + ' phone: tapping Settings opens it', pg.evaluate("() => !!(GAME.game.shell && GAME.game.shell.screen) || !!document.querySelector('.esh-row, [class*=esh]')"))
                check(kind + ' phone: no errors', not errs, errs[:2])
            run(pw, kind, f, **pw.devices[dev])
for f in fails: print(f)
print(f'{n} browser checks, {len(fails)} failed')
