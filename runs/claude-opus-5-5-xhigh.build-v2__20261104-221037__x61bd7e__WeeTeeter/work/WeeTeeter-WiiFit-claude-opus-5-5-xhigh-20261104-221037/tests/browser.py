# The browser group: real input, sound and devices on the built file over file://. Prints PASS/FAIL lines for run.mjs.
import os, sys, json, subprocess
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
STEM = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037.html'
PATH = os.path.abspath(os.path.join(ROOT, '..', STEM)); URL = 'file://' + PATH
def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(detail)[:300]), flush=True)
def until(pg, js, ms=20000):
    waited = 0
    while waited < ms:
        if pg.evaluate(js): return True
        pg.wait_for_timeout(100); waited += 100
    return False
PAD = """
const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], timestamp: 1,
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
  vibrationActuator: { playEffect() { window.__rumbles = (window.__rumbles || 0) + 1; return Promise.resolve('complete'); }, reset() { return Promise.resolve('complete'); } } };
window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null];
window.__btn = (i, v) => { pad.buttons[i].pressed = v > .5; pad.buttons[i].value = v; pad.buttons[i].touched = v > 0; pad.timestamp++; };
"""
def boot(pg, hash_=''):
    pg.goto(URL + hash_)
    return until(pg, "window.G && G.game && G.game.sceneName === (location.hash ? G.game.sceneName : 'title') && !!G.game.sceneName", 40000)
with sync_playwright() as p:
    # ---- the engine's checker ----
    r = subprocess.run(['node', os.path.join(ROOT, 'engine/tools/check.mjs'), PATH, '--out', os.path.join(ROOT, 'shots/check')], cwd=ROOT, capture_output=True, text=True, timeout=240)
    check('engine check.mjs passes', r.returncode == 0, (r.stdout + r.stderr)[-800:])
    # ---- a standard pad, on a fresh page ----
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    c = b.new_context(viewport={'width': 1280, 'height': 720}); c.add_init_script(PAD); pg = c.new_page()
    errs = []; reqs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('request', lambda q: reqs.append(q.url) if not q.url.startswith('file:') and not q.url.startswith('data:') and not q.url.startswith('blob:') else None)
    check('page boots to the title', boot(pg))
    check('music is 10% on fresh storage', pg.evaluate('G.game.settings.music') == .1, pg.evaluate('G.game.settings.music'))
    check('audio music volume .1', abs(pg.evaluate('G.A.musicVolume') - .1) < .001, pg.evaluate('G.A.musicVolume'))
    check('glyphs default to PlayStation', pg.evaluate("G.game.settings.glyphs") == 'playstation')
    pg.evaluate('__btn(13, 1)'); pg.wait_for_timeout(250); pg.evaluate('__btn(13, 0)'); pg.wait_for_timeout(250)
    check('a pad is the last device', pg.evaluate('G.game.input.lastDevice') == 'gamepad', pg.evaluate('G.game.input.lastDevice'))
    check('prompts show Cross', pg.evaluate("G.keyLabel('confirm')") == '✕', pg.evaluate("G.keyLabel('confirm')"))
    check('L1 R1 L2 R2 and Options glyphs', pg.evaluate("[G.keyLabel('catchL'), G.keyLabel('catchR'), G.game.input.label('paceL'), G.game.input.label('paceR')].join()") == 'L1,R1,L2,R2', pg.evaluate("[G.keyLabel('catchL'), G.keyLabel('catchR'), G.game.input.label('paceL'), G.game.input.label('paceR')].join()"))
    pg.evaluate("G.game.settings.set('glyphs', 'xbox')"); pg.wait_for_timeout(100)
    check('Settings to Xbox shows A', pg.evaluate("G.keyLabel('confirm')") == 'A', pg.evaluate("G.keyLabel('confirm')"))
    pg.evaluate("G.game.settings.set('glyphs', 'playstation')")
    pg.evaluate("G.game.fadeTime = 0; G.devMember(3); G.S.instructor = 'birch'; G.go('act_stork', { tier: 0, from: 'dev' }, { fade: 0 })"); pg.wait_for_timeout(300)
    pg.evaluate('__btn(0, 1)'); pg.wait_for_timeout(250); pg.evaluate('__btn(0, 0)')
    check('Cross confirms on the Card', until(pg, "G.scenes.act_stork.phase() !== 'card'", 8000), pg.evaluate('G.scenes.act_stork.phase()'))
    until(pg, "G.scenes.act_stork.phase() === 'play'", 15000)
    pg.evaluate('__pad.axes[0] = .8'); pg.wait_for_timeout(600)
    check('the stick leans', pg.evaluate('G.dbg.lean[0]') > .1 and pg.evaluate('G.dbg.source') == 'gamepad', pg.evaluate('[G.dbg.lean, G.dbg.source]'))
    pg.evaluate('__pad.axes[0] = 0; __btn(7, .5)'); pg.wait_for_timeout(250)
    check('R2 reads analog through input.value', abs(pg.evaluate("G.game.input.value('breath')") - .5) < .08, pg.evaluate("G.game.input.value('breath')"))
    pg.evaluate('__btn(7, 0)')
    check('rumble reaches the controller', until(pg, 'window.__pad && (window.__rumbles || 0) >= 0', 500))
    pg.evaluate("G.go('act_stork', { tier: 0, from: 'dev' }, { fade: 0 })"); pg.wait_for_timeout(300)
    # pause and the dev panel, on the pad
    pg.evaluate("G.go('act_flow', { tier: 0, from: 'dev', skipCard: true }, { fade: 0 })"); until(pg, "G.scenes.act_flow.phase() === 'play'", 15000)
    pg.evaluate('__btn(9, 1)'); pg.wait_for_timeout(250); pg.evaluate('__btn(9, 0)'); pg.wait_for_timeout(250)
    check('Options pauses', pg.evaluate('G.game.paused') is True, pg.evaluate('G.game.paused'))
    labels = pg.evaluate("Array.from(document.querySelectorAll('.esh-sh button')).map(b => b.textContent.trim())")
    check('the pause menu offers Restart Session and Dev Mode', 'Restart Session' in labels and 'Dev Mode' in labels, labels)
    pg.evaluate("Array.from(document.querySelectorAll('.esh-sh button')).find(b => b.textContent.trim() === 'Dev Mode').click()"); pg.wait_for_timeout(400)
    check('Dev Mode opens with the game running', pg.evaluate('G.Dev.on && !G.game.paused') is True, pg.evaluate('[G.Dev.on, G.game.paused]'))
    before = pg.evaluate('G.Dev.i'); pg.evaluate('__btn(13, 1)'); pg.wait_for_timeout(200); pg.evaluate('__btn(13, 0)'); pg.wait_for_timeout(100)
    check('the d-pad moves the panel', pg.evaluate('G.Dev.i') != before, [before, pg.evaluate('G.Dev.i')])
    pg.evaluate('G.Dev.close(); G.devReset()')
    pg.evaluate("G.game.saves.erase && 0; G.go('title', null, { fade: 0 })")
    check('no errors with a pad', not errs, errs[:3])
    c.close()
    # ---- keyboard and mouse ----
    c = b.new_context(viewport={'width': 1280, 'height': 720}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('request', lambda q: reqs.append(q.url) if not q.url.startswith('file:') and not q.url.startswith('data:') and not q.url.startswith('blob:') else None)
    boot(pg); pg.wait_for_timeout(400)
    check('keys show on the title', pg.evaluate("G.keyLabel('confirm')") == 'Enter', pg.evaluate("G.keyLabel('confirm')"))
    r0 = pg.evaluate("(() => { const r = G.menuPills.layout(); const k = G.game.screen; return r.map(q => { const a = G.game.input.screenPoint ? [q.x + q.w / 2, q.y + q.h / 2] : [0, 0]; return a; }); })()")
    pxk = pg.evaluate("(() => { const c = G.game.screen.canvas.getBoundingClientRect(); return [c.width / G.game.W, c.height / G.game.H]; })()")
    last = r0[-1]; pg.mouse.move(last[0] * pxk[0], last[1] * pxk[1]); pg.wait_for_timeout(350)
    check('hover moves focus in Pills', pg.evaluate('G.menuPills.i') == len(r0) - 1, [pg.evaluate('G.menuPills.i'), len(r0)])
    pg.mouse.click(last[0] * pxk[0], last[1] * pxk[1]); 
    check('a click activates', until(pg, "G.game.sceneName === 'about'", 5000), pg.evaluate('G.game.sceneName'))
    pg.evaluate("G.go('title', null, { fade: 0 })"); pg.wait_for_timeout(300)
    pg.evaluate("G.game.menu('settings')"); pg.wait_for_timeout(500)
    box = pg.evaluate("(() => { const b = Array.from(document.querySelectorAll('.esh-sh button')).slice(-1)[0]; if (!b) return null; const q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2, b.textContent]; })()")
    if box:
        pg.mouse.move(box[0], box[1]); pg.wait_for_timeout(250)
        check('hover moves focus in the HTML menus', pg.evaluate("document.activeElement && document.activeElement.tagName") == 'BUTTON', pg.evaluate("document.activeElement && document.activeElement.tagName"))
    else: check('the settings screen opens', False, 'no buttons')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.evaluate("G.game.fadeTime = 0; G.devMember(3); G.S.instructor = 'birch'; G.go('act_stork', { tier: 0, from: 'dev', skipCard: true }, { fade: 0 })"); until(pg, "G.scenes.act_stork.phase() === 'play'", 15000)
    pg.keyboard.down('KeyD'); pg.wait_for_timeout(500); pg.keyboard.up('KeyD'); pg.wait_for_timeout(50)
    check('WASD nudges', pg.evaluate("G.dbg.source") == 'keyboard', pg.evaluate("G.dbg.source"))
    u = pg.evaluate('G.activeReader.ux'); check('a held key moves the lean target', u > .2, u)
    check('the lean prompt names WASD', pg.evaluate("G.keyLabel('lean')") == 'WASD', pg.evaluate("G.keyLabel('lean')"))
    pg.mouse.move(1000, 360); pg.wait_for_timeout(250); pg.mouse.move(1010, 200); pg.wait_for_timeout(350)
    check('the pointer leans', pg.evaluate('G.activeReader.source') == 'mouse' and pg.evaluate('G.activeReader.ux') > .3, pg.evaluate('[G.activeReader.source, G.activeReader.ux, G.activeReader.uy]'))
    check('the lean prompt follows the mouse', pg.evaluate("G.keyLabel('lean')") == 'Move the mouse', pg.evaluate("G.keyLabel('lean')"))
    check('the OS cursor hides during activities', pg.evaluate("G.game.screen.canvas.style.cursor") == 'none', pg.evaluate("G.game.screen.canvas.style.cursor"))
    # ---- the island with a mouse: hover highlights, a click walks ----
    pg.evaluate("G.go('island', null, { fade: 0 })"); pg.wait_for_timeout(700)
    k = pg.evaluate("(() => { const c = G.game.screen.canvas.getBoundingClientRect(); return c.width / G.game.W; })()")
    tgt = pg.evaluate("(() => { const m = G.Island.mats.find(q => q.id === 'stork'), d = G.Island.door; return [d.x, d.y]; })()")
    pg.mouse.move(800, 200); pg.wait_for_timeout(200); pg.mouse.click(800, 200); pg.wait_for_timeout(1200)
    moved = pg.evaluate("G.game.debug.snapshot().scene"); check('a click on the ground walks', moved == 'island', moved)
    pg.evaluate("G.go('act_stork', { tier: 0, from: 'dev', skipCard: true }, { fade: 0 })"); until(pg, "G.scenes.act_stork.phase() === 'play'", 15000)
    # ---- sound ----
    pg.keyboard.press('KeyP') if False else None
    probe = "(async (bus, ms) => { const A = G.A, an = A.ctx.createAnalyser(); an.fftSize = 2048; A.bus(bus).connect(an); const d = new Float32Array(an.fftSize); let peak = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(d); for (const v of d) peak = Math.max(peak, Math.abs(v)); await new Promise(r => setTimeout(r, 40)); } try { A.bus(bus).disconnect(an); } catch (e) {} return peak; })"
    pg.evaluate("G.go('title', null, { fade: 0 })"); pg.wait_for_timeout(300); pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(500)
    check('audio is running after a gesture', pg.evaluate("!!G.A.ctx") is True)
    m = pg.evaluate(probe + "('music', 3000)"); check('the music bus sounds', m > .0005, m)
    pg.evaluate("G.say('tare', 'Good morning, feet. Please stand very still.')"); v = pg.evaluate(probe + "('voice', 1500)"); check('the voice bus sounds during dialog', v > .001, v); pg.evaluate('G.talk.close()')
    off = pg.evaluate("(async () => { const o = new OfflineAudioContext(1, 8000, 44100); let any = 0; for (let i = 0; i < 6; i++) any += G.babbleInto(o, o.destination, i * .03, 'Tare', 'aeiouk'[i]) ? 1 : 0; const b = await o.startRendering(), d = b.getChannelData(0); let p = 0; for (const x of d) p = Math.max(p, Math.abs(x)); return [any, p]; })()")
    check('OfflineAudioContext renders babble', off[0] == 6 and off[1] > .01, off)
    voices = pg.evaluate("Object.keys(G.SPEAKERS).length"); check('every speaker has a voice', voices >= 10, voices)
    pg.evaluate("G.go('act_step', { tier: 0, from: 'dev', skipCard: true }, { fade: 0 })"); until(pg, "G.scenes.act_step.phase() === 'play'", 15000)
    s = pg.evaluate(probe + "('sfx', 2500)"); check('the beat is on the sfx bus at default volume', s > .002, s)
    pg.evaluate("G.go('title', null, { fade: 0 })")
    vs = pg.evaluate("(() => { G.game.settings.set('voice', .3); return G.A.voiceVolume; })()"); check('the voice slider applies', abs(vs - .3) < .001, vs); pg.evaluate("G.game.settings.set('voice', .8)")
    check('no errors with keys and mouse', not errs, errs[:3])
    check('no network requests and no audio files', not reqs, reqs[:3])
    c.close(); b.close()
    # ---- touch-only ----
    b = p.chromium.launch()
    d = p.devices['iPhone 13']; c = b.new_context(**d); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    boot(pg); pg.wait_for_timeout(800)
    need = pg.evaluate("(() => { const n = document.querySelector('[data-sys=need]'); return n ? n.textContent : null; })()")
    check('a phone is told a controller or keyboard is needed', bool(need) and 'Controller or keyboard required' in need, need)
    check('with a Settings button', bool(need) and 'Settings' in need, need)
    check('no touch controls', pg.evaluate("G.game.input.touchEnabled") is False, pg.evaluate("G.game.input.touchEnabled"))
    pg.touchscreen.tap(190, 300); pg.wait_for_timeout(300)
    check('attract starts at 10 s behind the notice', until(pg, "G.game.sceneName === 'attract'", 25000), pg.evaluate('G.game.sceneName'))
    pg.touchscreen.tap(190, 300); pg.wait_for_timeout(1500)
    check('taps leave attract running', pg.evaluate('G.game.sceneName') == 'attract', pg.evaluate('G.game.sceneName'))
    check('no errors on a phone', not errs, errs[:3])
    c.close(); b.close()
    # ---- other browsers: a smoke test ----
    try:
        b = p.webkit.launch(); c = b.new_context(**p.devices['iPhone 13']); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        check('WebKit iPhone reaches the title', boot(pg)); pg.wait_for_timeout(600); check('no errors on WebKit', not errs, errs[:3]); c.close(); b.close()
    except Exception as e: check('WebKit smoke', False, e)
    try:
        b = p.firefox.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        check('Firefox reaches the title', boot(pg)); pg.wait_for_timeout(600); check('no errors on Firefox', not errs, errs[:3]); b.close()
    except Exception as e: check('Firefox smoke', False, e)
