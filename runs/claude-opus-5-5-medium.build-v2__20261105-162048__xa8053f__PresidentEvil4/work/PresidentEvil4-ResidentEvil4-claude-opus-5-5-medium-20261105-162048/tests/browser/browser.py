#!/usr/bin/env python3
# Deliverable from file://. Prints failures only and "N passed, M failed".
import os, glob, json, sys, time
from playwright.sync_api import sync_playwright
dev = os.path.abspath(os.path.dirname(__file__) + '/../..'); root = os.path.abspath(dev + '/..'); html = 'file://' + glob.glob(root + '/PresidentEvil4-*.html')[0]
GPU = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
P = F = 0; only = sys.argv[1:] 
def ok(c, name, detail=''):
    global P, F
    if c: P += 1
    else: F += 1; print('FAIL', name, str(detail)[:300])
PAD = '''(() => { const mk = () => ({ id: 'stub', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: 0 }); window.__pad = mk(); window.__padOn = false; navigator.getGamepads = () => (window.__padOn ? [window.__pad] : []); window.__press = (b, on) => { window.__pad.buttons[b].pressed = on; window.__pad.buttons[b].value = on ? 1 : 0; }; window.__frames = async (n) => { const e = window.__e, f = e.frame + n; while (e.frame < f) await new Promise((r) => setTimeout(r, 15)); }; window.__tap = async (b) => { window.__press(b, true); await window.__frames(2); window.__press(b, false); await window.__frames(2); }; })()'''
TAP = '''(() => { const orig = AudioNode.prototype.connect; AudioNode.prototype.connect = function (d, ...r) { if (d instanceof AudioDestinationNode) { const c = d.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 2048; orig.call(c.__an, d); window.__ctx = c; } orig.call(this, c.__an); return d; } return orig.call(this, d, ...r); }; window.__peak = () => { const a = window.__ctx?.__an; if (!a) return -1; const b = new Float32Array(a.fftSize); a.getFloatTimeDomainData(b); let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); return m; }; })()'''
def page(b, url=html, init=None, **kw):
    ctx = b.new_context(viewport={'width': 960, 'height': 540}, **kw); pg = ctx.new_page(); pg.errs = []
    pg.on('console', lambda m: pg.errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    if init: pg.add_init_script(init)
    pg.goto(url); pg.wait_for_function('window.__APP__ && window.__PIXEL_ENGINE__', timeout=120000); pg.evaluate('async()=>{window.__e=await window.__PIXEL_READY__;}'); return pg, ctx
def wait_title(pg): pg.wait_for_function('window.__e.game?.name === "title" && !window.__APP__.loading', timeout=60000)
def hud_has(pg): return pg.evaluate('window.__e.hud.canvas ? true : false')
def until(pg, js, t=12000):
    try: pg.wait_for_function(js, timeout=t); return True
    except Exception: return False
def want(name): return not only or name in only
with sync_playwright() as p:
    FF = os.environ.get('PE_BROWSER') == 'firefox'  # needs a display: xvfb-run. WebGPU is off by default in Firefox on Linux.
    FF_PREFS = {'media.cubeb.force_mock_context': True, 'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0, 'dom.webgpu.enabled': True, 'gfx.webgpu.ignore-blocklist': True, 'dom.webgpu.workers.enabled': True, 'gfx.webgpu.force-enabled': True, 'security.sandbox.gpu.level': 0, 'security.sandbox.content.level': 0}
    b = p.firefox.launch(headless=False, firefox_user_prefs=FF_PREFS) if FF else p.chromium.launch(args=GPU)
    if want('boot'):
        pg, ctx = page(b, init=TAP); wait_title(pg); pg.wait_for_timeout(800)
        ok(not pg.errs, 'boots with no console errors', pg.errs); ok(pg.evaluate('window.__e.errors.length') == 0, 'engine.errors empty'); ok(pg.evaluate('window.__e.state().gpuErrors?.length ?? 0') == 0, 'gpuErrors empty'); ok(pg.evaluate('window.__e.state().backend') != 'headless', 'a real backend')
        # Audio
        ok(pg.evaluate('window.__e.audio.volume.music') == 0.1, 'first boot music is 10 percent', pg.evaluate('window.__e.audio.volume.music'))
        pg.keyboard.press('ArrowDown'); pg.evaluate('window.__APP__.mix.play("title",0.1); window.__e.audio.playMusic(null); window.__APP__.mix.current=null; window.__APP__.mix.play("title",0.1)'); peak = 0
        for _ in range(40):
            pg.wait_for_timeout(150); peak = max(peak, pg.evaluate('window.__peak()'))
        ok(peak > 0.002, 'music is audible at 10 percent on the bus', peak); ok(peak < 0.5, 'and not loud', peak)
        st = pg.evaluate('''()=>{const a=window.__APP__;a.settings.music=0.5;a.applySettings();const v=window.__e.audio.volume.music;return v;}'''); ok(abs(st-0.5)<0.01, 'music setting applies', st); r = pg.evaluate('''(async()=>{const a=window.__APP__;Object.assign(a.settings,{music:0.1});a.applySettings();return window.__e.audio.volume.music})()'''); ok(abs(r-0.1)<0.01, 'reset returns to 10 percent', r)
        ctx.close()
    if want('pad'):
        pg, ctx = page(b, init=PAD); wait_title(pg); pg.evaluate('window.__alive = setInterval(() => window.__APP__.test.device.moved++, 500)')
        pg.evaluate('window.__padOn = true'); pg.evaluate('window.__tap(13)')
        T = 'window.__APP__.test'; ok(pg.evaluate(f'{T}.device.last') == 'pad', 'the pad becomes the last device'); ok(pg.evaluate(f'{T}.codeFor("action")') == 'PadCross', 'prompts follow the pad'); ok(pg.evaluate(f'{T}.glyphLabel("PadCross")') == 'x', 'PlayStation glyphs by default'); pg.evaluate('window.__APP__.settings.glyphs="xbox"'); ok(pg.evaluate(f'{T}.glyphLabel("PadCross")') == 'A' and pg.evaluate(f'{T}.glyphLabel("PadL2")') == 'LT', 'the setting switches to Xbox'); pg.evaluate('window.__APP__.settings.glyphs="ps"'); pg.keyboard.press('KeyZ'); ok(until(pg, f'{T}.device.last == "keyboard"'), 'a key switches prompts at once'); ok(pg.evaluate(f'{T}.codeFor("action")') == 'KeyE', 'to keys'); pg.evaluate('window.__tap(14)'); ok(pg.evaluate(f'{T}.device.last') == 'pad', 'and back'); ok(pg.evaluate('window.__e.game.s.focus') == 1, 'D-pad moves menu focus', pg.evaluate('window.__e.game.s.focus'))
        pg.evaluate('window.__tap(12)'); pg.evaluate('window.__tap(0)')
        ok(pg.evaluate('!!window.__e.game.pick'), 'Cross confirms: New Claim', pg.evaluate('window.__e.game.s.focus'))
        pg.evaluate('window.__tap(0)')
        pg.wait_for_function('window.__e.game.id === "quay" && !window.__APP__.loading', timeout=90000)
        pg.evaluate('(()=>{const A=window.__e.game;A.cutscene?.skip();A.dialog.active&&A.dialog.skip();A.player.locked=false;})()'); pg.wait_for_timeout(600)
        pg.evaluate('(()=>{window.__e.game.cutscene?.skip();})()'); pg.wait_for_timeout(300)
        pg.evaluate('window.__press(6, true); window.__frames(6)'); pg.wait_for_timeout(300); ok(pg.evaluate('window.__e.game.player.aiming'), 'L2 aims', pg.evaluate('JSON.stringify([window.__e.game.player.locked, window.__e.game.cutscene?1:0])'))
        ammo0 = pg.evaluate('window.__APP__.run.weapons.pistol.ammo'); pg.evaluate('(async()=>{window.__press(7, true); await window.__frames(4); window.__press(7, false); window.__press(6, false); await window.__frames(2);})()'); ok(pg.evaluate('window.__APP__.run.weapons.pistol.ammo') < ammo0, 'R2 fires')
        pg.evaluate('window.__tap(3)'); ok(pg.evaluate('window.__e.game.menu?.constructor.name') is not None, 'Triangle opens the Case', pg.evaluate('window.__e.game.menu?.constructor.name'))
        ok(pg.evaluate('window.__e.timeScale') == 0, 'the Case freezes time')
        pg.evaluate('window.__tap(1)'); ok(pg.evaluate('!window.__e.game.menu'), 'Circle closes it')
        pg.evaluate('window.__tap(9)'); ok(pg.evaluate('window.__e.game.menu?.constructor.name') == 'PauseMenu', 'Options pauses')
        for _ in range(3): pg.evaluate('window.__tap(13)')
        pg.evaluate('window.__tap(0)')
        ok(pg.evaluate('window.__e.game.menu?.sub?.constructor.name') == 'DevScreen', 'Dev mode reachable from pause', pg.evaluate('window.__e.game.menu?.sub?.constructor.name'))
        pg.keyboard.press('KeyQ'); pg.wait_for_timeout(200); ok(pg.evaluate('window.__e.game.menu.sub.s.tab') == 3, 'dev tabs', pg.evaluate('window.__e.game.menu.sub.s.tab'))
        W = 'window.__APP__.test.TUNING.walkSpeed'; w0 = pg.evaluate(W); pg.keyboard.press('ArrowRight'); ok(until(pg, f'{W} != {w0}'), 'a slider changes TUNING live', w0); pg.keyboard.press('KeyT'); ok(until(pg, f'{W} == {w0}'), 'Triangle resets one slider'); pg.keyboard.press('ArrowRight'); until(pg, f'{W} != {w0}'); pg.evaluate('window.__e.game.menu.sub.s.focus=8'); pg.keyboard.press('Enter'); ok(until(pg, f'{W} == {w0}'), 'RESET ALL restores')
        ok(not pg.errs, 'no errors on the pad path', pg.errs[:3]); ctx.close()
    if want('keys'):
        pg, ctx = page(b, html + '?g_area=quay&g_jump=aftermath'); pg.wait_for_function('window.__e.game?.id === "quay" && !window.__APP__.loading', timeout=120000); pg.wait_for_timeout(500)
        z0 = pg.evaluate('window.__e.game.player.pos.z'); pg.keyboard.down('KeyW'); ok(until(pg, f'Math.abs(window.__e.game.player.pos.z - ({z0})) > 0.2'), 'WASD moves', z0); pg.keyboard.up('KeyW')
        yaw0 = pg.evaluate('window.__e.game.player.camYaw'); pg.evaluate('window.__e.input.addPointer(50,0)'); ok(until(pg, f'Math.abs(window.__e.game.player.camYaw - ({yaw0})) > 0.01'), 'the mouse looks', yaw0)
        pg.mouse.move(400, 300); pg.mouse.down(button='right'); ok(until(pg, 'window.__e.game.player.aiming'), 'right mouse aims'); pg.mouse.up(button='right'); until(pg, '!window.__e.game.player.aiming')
        pg.keyboard.press('KeyI'); ok(until(pg, 'window.__e.game.menu?.constructor.name == "CaseScreen"'), 'I opens the Case', pg.evaluate('window.__e.game.menu?.constructor.name')); pg.mouse.move(100, 200); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); ok(until(pg, '!window.__e.game.menu'), 'Esc closes it'); ok(not pg.errs, 'no errors with keys and mouse', pg.errs[:3]); ctx.close()
    if want('menu'):
        pg, ctx = page(b); wait_title(pg); pg.evaluate('window.__alive = setInterval(() => window.__APP__.test.device.moved++, 500)')  # a loaded machine must not idle into attract mid-test
        pg.mouse.move(480, 300); pg.wait_for_timeout(120); pg.mouse.move(480, 262); pg.wait_for_timeout(200); f0 = pg.evaluate('window.__e.game.s.focus'); pg.mouse.move(480, 302); pg.wait_for_timeout(250); f1 = pg.evaluate('window.__e.game.s.focus'); ok(f0 != f1, 'hover moves the focus', [f0, f1])
        # Click selects. Art pixels to page pixels through the HUD canvas.
        pos = pg.evaluate('(()=>{const h=window.__e.hud,c=h.canvas.getBoundingClientRect();return [c.left+c.width/2, c.top+c.height*((112+19*1+6)/h.height)]})()'); pg.mouse.move(pos[0], pos[1]); pg.wait_for_timeout(300); pg.mouse.click(pos[0], pos[1]); ok(until(pg, 'window.__e.game.sub?.constructor.name == "LobbyScreen"'), 'a click selects a menu item', pg.evaluate('window.__e.game.s.focus')); pg.keyboard.press('Escape'); until(pg, '!window.__e.game.sub')
        # Settings: glyph option and Reset, through the screen.
        pg.evaluate('(()=>{const g=window.__e.game;g.s.focus=g.items().findIndex(i=>i.id==="settings")})()'); pg.keyboard.press('Enter'); until(pg, 'window.__e.game.sub?.constructor.name == "SettingsScreen"'); pg.keyboard.press('KeyE'); until(pg, 'window.__e.game.sub.s.tab == 1'); pg.evaluate('window.__e.game.sub.s.focus=4'); pg.keyboard.press('Enter'); ok(until(pg, 'window.__APP__.settings.glyphs == "xbox"'), 'CONTROLLER GLYPHS option works'); pg.keyboard.press('KeyQ'); until(pg, 'window.__e.game.sub.s.tab == 0'); pg.evaluate('window.__APP__.settings.music=0.5; window.__APP__.applySettings(); window.__e.game.sub.s.focus=4'); pg.keyboard.press('Enter'); ok(until(pg, 'window.__APP__.settings.music == 0.1 && Math.abs(window.__e.audio.volume.music - 0.1) < 0.01 && window.__APP__.settings.glyphs == "ps"'), 'Settings Reset returns music to 10 percent'); pg.keyboard.press('Escape'); until(pg, '!window.__e.game.sub')
        # Open About by keyboard
        for _ in range(4): pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(120)
        focus = pg.evaluate('window.__e.game.s.focus'); pg.evaluate('(()=>{const g=window.__e.game;g.s.focus=g.items().findIndex(i=>i.id==="about")})()'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300); ok(pg.evaluate('window.__e.game.sub?.constructor.name') == 'AboutScreen', 'About opens', focus)
        ok(pg.evaluate('window.__e.game.sub.s.tab') == 0, 'About starts on Source'); labels = 0
        for _ in range(4): pg.keyboard.press('KeyE'); pg.wait_for_timeout(120); labels += 1
        ok(pg.evaluate('window.__e.game.sub.s.tab') == 4, 'About has five pages', pg.evaluate('window.__e.game.sub.s.tab')); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        pg.evaluate('clearInterval(window.__alive)')
        # Attract: 10 s idle then any key exits. Use idle poke to avoid a long wait.
        pg.evaluate('window.__e.game.idle = 9.6'); pg.wait_for_function('!!window.__APP__.attract', timeout=30000); ok(True, 'attract starts on idle'); pg.wait_for_function('window.__e.game?.attract === true && !window.__APP__.loading', timeout=120000); pg.wait_for_timeout(600); pg.keyboard.press('KeyX'); pg.wait_for_function('!window.__APP__.attract', timeout=30000); ok(True, 'any key exits attract'); pg.wait_for_function('window.__e.game?.name === "title"', timeout=60000); ok(not pg.errs, 'no errors in attract', pg.errs[:3]); ctx.close()
        pg, ctx = page(b, init=PAD); wait_title(pg); pg.evaluate('window.__padOn = true; window.__e.game.idle = 9.6'); ok(until(pg, '!!window.__APP__.attract', 30000), 'attract starts with a pad connected and idle'); pg.wait_for_function('window.__e.game?.attract === true && !window.__APP__.loading', timeout=120000); pg.evaluate('window.__tap(0)'); ok(until(pg, '!window.__APP__.attract', 30000), 'a pad press exits attract'); ctx.close()
    if want('solo'):
        pg, ctx = page(b); wait_title(pg); pg.evaluate('window.__alive = setInterval(() => window.__APP__.test.device.moved++, 500)'); pg.evaluate('(()=>{const g=window.__e.game;g.s.focus=g.items().findIndex(i=>i.id==="shift")})()'); pg.keyboard.press('Enter'); until(pg, 'window.__e.game.sub?.constructor.name == "LobbyScreen"'); pg.keyboard.press('Enter'); ok(until(pg, 'window.__e.game.name === "area-shift" && !window.__APP__.loading', 90000), 'solo Night Shift loads'); ok(until(pg, 'window.__e.game.session.time() > 500', 30000), 'the clock runs'); ok(until(pg, 'window.__e.game.enemies.filter(e=>!e.dead).length > 0', 30000), 'waves come'); pg.keyboard.press('Escape'); ok(until(pg, 'window.__e.game.overlay?.constructor.name == "SettingsScreen"'), 'Esc opens Settings without pausing'); ok(pg.evaluate('window.__e.timeScale') == 1, 'the world keeps running'); pg.keyboard.press('Escape'); ok(until(pg, '!window.__e.game.overlay'), 'Settings closes'); pg.evaluate('window.__e.game.finishRound(true, "dawn")'); ok(until(pg, '!!window.__e.game.results'), 'results screen'); pg.keyboard.press('Enter'); ok(until(pg, 'window.__e.game.name === "title"', 60000), 'back to the title'); ok(pg.evaluate('window.__APP__.ui !== null'), 'ui'); ok(not pg.errs, 'no errors solo', pg.errs[:3]); ctx.close()
    if want('phone'):
        ctx0 = p.devices['iPhone 13']; keep = ('has_touch', 'device_scale_factor') if FF else ('user_agent', 'has_touch', 'is_mobile', 'device_scale_factor'); TOUCH = "Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }); const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (q.includes('any-pointer: fine') ? { matches: false, media: q, addEventListener() {}, removeEventListener() {} } : mm(q));"  # Playwright's Firefox does not emulate a touch-only device
        pg, ctx = page(b, init=TOUCH if FF else None, **{k: v for k, v in ctx0.items() if k in keep})
        pg.wait_for_function('!!window.__APP__.attract || window.__e.game?.attract === true', timeout=120000); pg.wait_for_function('window.__e.game?.attract === true && !window.__APP__.loading', timeout=120000); pg.wait_for_timeout(600); ok(pg.evaluate('!!window.__APP__.attract.touch'), 'touch-only runs attract with the panel', pg.evaluate('navigator.maxTouchPoints'))
        ok(pg.evaluate('!window.__e.touch'), 'no touch controls'); pg.touchscreen.tap(100, 100); pg.wait_for_timeout(400); ok(pg.evaluate('!!window.__APP__.attract'), 'a tap does not exit attract')
        # Settings button: centre of the panel
        pos = pg.evaluate('(()=>{const h=window.__e.hud,c=h.canvas.getBoundingClientRect();return [c.left+c.width/2, c.top+c.height*((92+28+9)/h.height)]})()'); opened = False
        for _ in range(4):  # a tap during a clip's load is lost: a person taps again
            until(pg, '!window.__APP__.loading', 60000); pg.touchscreen.tap(pos[0], pos[1]); opened = until(pg, '!!window.__APP__.attract.settings', 6000)
            if opened: break
        ok(opened, 'the settings button opens Settings', pos); ok(not pg.errs, 'no errors on phone', pg.errs[:3]); ctx.close()
    if want('party'):
        ctx = b.new_context(viewport={'width': 800, 'height': 450}); a = ctx.new_page(); c = ctx.new_page(); errs = []
        for pg in (a, c):
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(html); pg.wait_for_function('window.__APP__ && window.__PIXEL_ENGINE__', timeout=120000); pg.evaluate('async()=>{window.__e=await window.__PIXEL_READY__;}'); pg.wait_for_function('window.__e.game?.name === "title"', timeout=60000); pg.evaluate('window.__alive = setInterval(() => window.__APP__.test.device.moved++, 500)')
        def lobby(pg): pg.evaluate('(()=>{const g=window.__e.game;g.s.focus=g.items().findIndex(i=>i.id==="shift")})()'); pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
        a.bring_to_front(); lobby(a); ok(until(a, 'window.__e.game.sub?.constructor.name == "LobbyScreen"'), 'Night Shift opens the lobby'); a.keyboard.press('ArrowDown'); until(a, 'window.__e.game.sub.s.focus == 1'); a.keyboard.press('Enter'); ok(until(a, 'window.__e.game.sub?.mode == "host"'), 'host party')
        c.bring_to_front(); lobby(c); until(c, 'window.__e.game.sub?.constructor.name == "LobbyScreen"'); c.keyboard.press('ArrowDown'); until(c, 'window.__e.game.sub.s.focus == 1'); c.keyboard.press('ArrowDown'); until(c, 'window.__e.game.sub.s.focus == 2'); c.keyboard.press('Enter'); ok(until(c, 'window.__e.game.sub?.S?.hosts?.size >= 1', 30000), 'the guest lists the host by itself')
        c.evaluate('window.__e.game.sub.s.focus=0'); c.keyboard.press('Enter'); a.bring_to_front(); ok(until(a, 'window.__e.game.sub.S.lobby.length === 2', 30000), 'the seat fills')
        a.evaluate('window.__e.game.sub.s.focus=0'); a.keyboard.press('Enter'); a.wait_for_function('window.__e.game.name === "area-shift" && !window.__APP__.loading', timeout=120000); c.bring_to_front(); c.wait_for_function('window.__e.game.name === "area-shift" && !window.__APP__.loading', timeout=120000); ok(True, 'both load the quay')
        a.bring_to_front(); a.wait_for_function('window.__e.game.session.time() > 1000', timeout=30000); ok(until(a, 'window.__e.game.enemies.length > 0', 30000), 'the host has enemies'); a.wait_for_timeout(1500); c.bring_to_front(); ok(until(c, 'window.__e.game.ghosts?.size > 0', 30000), 'the client sees ghosts')
        a.evaluate('window.__e.game.finishRound(true, "dawn")'); ok(until(c, '!!window.__e.game.results', 20000), 'results reach the guest'); ok(a.evaluate('!!window.__e.game.results'), 'results on the host'); ok(not errs, 'no errors in the party', errs[:3]); ctx.close()
    if want('rtc'):
        ctx = b.new_context(viewport={'width': 800, 'height': 450}); a = ctx.new_page(); c = ctx.new_page(); errs = []; u = html + '?g_nostun=1'
        for pg in (a, c):
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(u); pg.wait_for_function('window.__APP__ && window.__PIXEL_ENGINE__', timeout=120000); pg.evaluate('async()=>{window.__e=await window.__PIXEL_READY__;}'); pg.wait_for_function('window.__e.game?.name === "title"', timeout=60000); pg.evaluate('window.__alive = setInterval(() => window.__APP__.test.device.moved++, 500)')
        def lob(pg, n):
            pg.bring_to_front(); pg.evaluate('(()=>{const g=window.__e.game;g.s.focus=g.items().findIndex(i=>i.id==="shift")})()'); pg.keyboard.press('Enter'); until(pg, 'window.__e.game.sub?.constructor.name == "LobbyScreen"')
            for k in range(n): pg.keyboard.press('ArrowDown'); until(pg, f'window.__e.game.sub.s.focus == {k+1}')
            pg.keyboard.press('Enter'); until(pg, 'window.__e.game.sub?.S')
        lob(a, 1); offer = a.evaluate('window.__e.game.sub.S.makeOffer()'); lob(c, 2)
        ok(len(offer) < 8000, 'an invite code is a sane size', len(offer)); c.evaluate('window.__e.game.sub.S.bc?.close(); window.__e.game.sub.S.bc=null'); a.evaluate('window.__e.game.sub.S.bc?.close(); window.__e.game.sub.S.bc=null')
        ans = c.evaluate('(code)=>window.__e.game.sub.S.answerOffer(code)', offer); ok(len(ans) > 50, 'the guest answers'); a.bring_to_front(); a.evaluate('(code)=>window.__e.game.sub.S.acceptAnswer(code)', ans); ok(until(a, 'window.__e.game.sub.S.lobby.length === 2', 20000), 'WebRTC seat fills'); a.evaluate('window.__e.game.sub.s.focus=0'); a.keyboard.press('Enter'); ok(until(a, 'window.__e.game.name === "area-shift" && !window.__APP__.loading', 120000), 'the host starts'); c.bring_to_front(); ok(until(c, 'window.__e.game.name === "area-shift"', 120000), 'the guest starts over WebRTC'); a.bring_to_front(); ok(until(a, 'window.__e.game.enemies?.length > 0', 40000), 'the host has enemies over WebRTC'); a.wait_for_timeout(1500); c.bring_to_front(); ok(until(c, 'window.__e.game.ghosts?.size > 0', 40000), 'snapshots arrive over WebRTC'); a.bring_to_front(); a.evaluate('window.__e.game.finishRound(true, "dawn")'); ok(until(a, '!!window.__e.game.results', 20000), 'WebRTC: results on the host'); c.bring_to_front(); ok(until(c, '!!window.__e.game.results', 20000), 'WebRTC: results reach the guest'); ok(not errs, 'no errors over WebRTC', errs[:3]); ctx.close()
    b.close()
    if want('nogpu'):
        # WebKit and Firefox here have no WebGPU: expect the clear message, and that nothing else breaks.
        for kind, prof in (('firefox', None), ('webkit', None), ('webkit', 'iPhone 13')):
            br = getattr(p, kind).launch(); ctx = br.new_context(**(p.devices[prof] if prof else {})); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); name = f'{kind} {prof or "desktop"}'
            pg.goto(html); pg.wait_for_function('document.body.innerText.toLowerCase().includes("webgpu")', timeout=30000); t = pg.evaluate('document.body.innerText'); ok('needs WebGPU' in t, f'{name} shows the clear message', t[:200]); ok(pg.evaluate('navigator.gpu ? "gpu" : "none"') in ('gpu', 'none'), f'{name} page alive'); ok(not errs, f'{name}: no uncaught page errors', errs[:3]); ok(pg.evaluate('!window.__APP__?.attract'), f'{name}: nothing else started'); print('INFO', name, repr(t[:150])); br.close()
# exit interview
try: j = json.load(open(root + '/exit-interview.json')); ok('sourceInformation' in j and 'aiHub' in j, 'exit interview parses')
except Exception as e: ok(False, 'exit interview parses', e)
print(f'{P} passed, {F} failed')
sys.exit(1 if F else 0)
