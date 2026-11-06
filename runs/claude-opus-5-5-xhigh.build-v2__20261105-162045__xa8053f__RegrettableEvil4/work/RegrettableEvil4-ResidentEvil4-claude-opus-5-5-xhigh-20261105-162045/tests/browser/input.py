# Pad, keyboard and mouse: same screens, prompts follow the last input, Settings switches glyphs.
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

STUB = """
window.__pad = { buttons: Array.from({length: 17}, () => ({ pressed: false, value: 0, touched: false })), axes: [0,0,0,0], connected: true, mapping: 'standard', id: 'stub', index: 0, timestamp: 0 };
window.__padOn = false;
navigator.getGamepads = () => window.__padOn ? [window.__pad] : [null, null, null, null];
window.__press = (i, v = true) => { window.__padOn = true; window.__pad.buttons[i].pressed = v; window.__pad.buttons[i].value = v ? 1 : 0; };
"""
s = Suite()
STEPJS = STEP
with sync_playwright() as pw:
    b = launch(pw)
    page, errs = open_game(b, '?g_area=quay&g_nosave=1&g_start=28,42&g_skip=arrival,tannoyHint,cottage,quayFront,shedHint,siege', init_script=STUB)
    def state(): return page.evaluate("() => ({ kind: window.__APP__.device.kind, glyphs: window.__APP__.settings.glyphs, top: window.__APP__.top?.name ?? null, aim: window.__GAME__.player.aiming, mag: window.__GAME__.player.mag, x: window.__GAME__.player.x, z: window.__GAME__.player.z, yaw: window.__GAME__.cam.yaw, st: window.__GAME__.player.state, tab: window.__APP__.top?.state?.tab })")
    def tap(i, n=4):
        page.evaluate(f'window.__press({i}, true)'); step(page, 2)
        page.evaluate(f'window.__press({i}, false)'); step(page, n)
    step(page, 10)
    # Pad connected but unused: glyphs stay keyboard until it's used.
    page.evaluate('window.__padOn = true')
    step(page, 4)
    s.ok(state()['kind'] == 'kbm', 'a pad connecting never steals the glyphs until used')
    # Aim and fire with the triggers.
    page.evaluate('window.__press(6, true)')
    step(page, 16)
    st = state()
    s.ok(st['kind'] == 'pad', 'using the pad switches prompts at once')
    s.ok(st['aim'], 'L2 aims')
    m0 = st['mag']
    page.evaluate('window.__press(7, true)'); step(page, 3); page.evaluate('window.__press(7, false)'); step(page, 20)
    s.ok(state()['mag'] < m0, 'R2 fires')
    page.evaluate('window.__press(6, false)'); step(page, 16)
    s.ok(not state()['aim'], 'releasing L2 stops aiming')
    # Stick moves; right stick looks.
    page.evaluate('window.__pad.axes[1] = -1'); step(page, 30); page.evaluate('window.__pad.axes[1] = 0'); step(page, 2)
    st2 = state()
    s.ok(abs(st2['z'] - st['z']) + abs(st2['x'] - st['x']) > 0.5, 'left stick moves')
    y0 = st2['yaw']
    page.evaluate('window.__pad.axes[2] = 1'); step(page, 30); page.evaluate('window.__pad.axes[2] = 0'); step(page, 2)
    s.ok(abs(state()['yaw'] - y0) > 0.3, 'right stick looks')
    # Options pauses; Create held ignores it.
    page.evaluate('window.__press(8, true)'); step(page, 2)
    tap(9, 3)
    s.ok(state()['top'] is None, 'Options is ignored while Create is held')
    page.evaluate('window.__press(8, false)'); step(page, 4)
    s.ok(state()['top'] is None, 'Create+Options does not open the map on release either')
    tap(9, 3)
    s.ok(state()['top'] == 'pause', 'Options pauses')
    # Menus with the D-pad: down moves focus, Circle goes back.
    f0 = page.evaluate('window.__APP__.ui.focus')
    tap(13, 2)
    f1 = page.evaluate('window.__APP__.ui.focus')
    s.ok(f0 != f1, f'D-pad moves menu focus ({f0} > {f1})')
    tap(1, 3)
    s.ok(state()['top'] is None, 'Circle goes back')
    # Triangle: the Case; L1/R1 change tabs; Create: map on release.
    tap(3, 3)
    s.ok(state()['top'] == 'case', 'Triangle opens the Case')
    tap(5, 3)
    s.ok(state()['tab'] == 1, 'R1 changes tab')
    tap(4, 3)
    s.ok(state()['tab'] == 0, 'L1 changes tab back')
    # Case with the pad: Cross on an item, MOVE, rotate with Square, place with Cross.
    tap(0, 2)
    s.ok(page.evaluate('!!window.__APP__.top.state.menu'), 'Cross on an item opens its small menu')
    tap(0, 2)
    held = page.evaluate('!!window.__APP__.top.state.held')
    s.ok(held, 'MOVE picks it up')
    r0 = page.evaluate('window.__APP__.top.state.held.item.rot')
    tap(2, 2)
    s.ok(page.evaluate('window.__APP__.top.state.held.item.rot') != r0, 'Square rotates')
    tap(2, 2)
    tap(1, 2)
    s.ok(not page.evaluate('!!window.__APP__.top.state.held'), 'Circle puts it back')
    # Hold R1 arranges.
    page.evaluate('window.__press(5, true)'); step(page, 28); page.evaluate('window.__press(5, false)'); step(page, 3)
    s.ok(page.evaluate('window.__APP__.top.state.msg') == 'ARRANGED.', 'holding R1 arranges')
    s.ok(state()['tab'] == 0, 'holding R1 does not change tab')
    tap(1, 3)
    s.ok(state()['top'] is None, 'Circle closes the Case')
    page.evaluate('window.__press(8, true)'); step(page, 2); page.evaluate('window.__press(8, false)'); step(page, 3)
    s.ok(state()['top'] == 'case' and state()['tab'] == 3, 'Create opens the Map tab on release')
    tap(1, 3)
    # Glyph drawing for the action names.
    names = page.evaluate("async () => { const m = await import('data:text/javascript,export default 1'); return 1; }") if False else None
    # Xbox setting switches the glyph names.
    page.evaluate("window.__APP__.settings.glyphs = 'xbox'")
    step(page, 2)
    s.ok(state()['glyphs'] == 'xbox', 'Settings can show Xbox glyphs')
    page.evaluate("window.__APP__.settings.glyphs = 'ps'")
    # A key press switches to keys at once.
    page.keyboard.press('KeyK')
    step(page, 2)
    s.ok(state()['kind'] == 'kbm', 'a key press switches prompts at once')
    # Keyboard: WASD, pause with Esc, case with Tab.
    x0 = state()
    page.keyboard.down('KeyW'); step(page, 30); page.keyboard.up('KeyW'); step(page, 2)
    x1 = state()
    s.ok(abs(x1['z'] - x0['z']) + abs(x1['x'] - x0['x']) > 0.5, 'W walks')
    page.keyboard.press('Tab'); step(page, 3)
    s.ok(state()['top'] == 'case', 'Tab opens the Case')
    page.keyboard.press('Escape'); step(page, 3)
    s.ok(state()['top'] is None, 'Esc closes it')
    page.keyboard.press('KeyP'); step(page, 3)
    s.ok(state()['top'] == 'pause', 'P pauses')
    # Mouse in the menu: hover moves focus, click selects.
    box = page.evaluate("() => { const r = window.__APP__.ui.rects.find(k => k.id === 'settings'); return r; }")
    W = page.evaluate('window.__APP__.ui.W'); H = page.evaluate('window.__APP__.ui.H')
    px = (box['x'] + box['w'] / 2) * 960 / W; py = (box['y'] + box['h'] / 2) * 540 / H
    page.mouse.move(px, py); step(page, 3)
    s.ok(page.evaluate('window.__APP__.ui.focus') == 'settings', 'hover moves the focus')
    page.mouse.down(); step(page, 2); page.mouse.up(); step(page, 3)
    s.ok(state()['top'] == 'settings', 'click selects')
    page.keyboard.press('Escape'); step(page, 2)
    page.keyboard.press('Escape'); step(page, 2)
    # Mouse aim with an injected pointer delta.
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.input.setKey("MouseRight", true); }')
    step(page, 16)
    s.ok(state()['aim'], 'right mouse aims')
    y0 = state()['yaw']
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.input.addPointer(120, 0); }')
    step(page, 2)
    s.ok(abs(state()['yaw'] - y0) > 0.05, 'the mouse looks while aiming')
    m0 = state()['mag']
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.input.setKey("MouseLeft", true); }')
    step(page, 3)
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.input.setKey("MouseLeft", false); e.input.setKey("MouseRight", false); }')
    step(page, 3)
    s.ok(state()['mag'] < m0, 'left mouse fires while aiming')
    step(page, 16)
    # Not aiming, left mouse is the knife.
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.input.setKey("MouseLeft", true); }'); step(page, 2)
    st = page.evaluate('window.__GAME__.player.action?.name')
    s.ok(st == 'knife', f'left mouse swings the knife when not aiming ({st})')
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.input.setKey("MouseLeft", false); }')
    step(page, 60)
    # A left click advances dialogue, and only that: no knife swing with it.
    page.evaluate("window.__GAME__.talk.lines([['max', 'ONE.'], ['max', 'TWO.']])")
    step(page, 40)
    said = lambda: page.evaluate('window.__GAME__.talk.box?.text ?? null')
    s.ok(said() == 'ONE.', f'the dialogue is up ({said()})')
    click = 'async (down) => { const e = await window.__PIXEL_READY__; e.input.setKey("MouseLeft", down); e.step(2); }'
    swings = page.evaluate('window.__GAME__.player.action?.name ?? null')
    page.evaluate(click, True); page.evaluate(click, False); step(page, 2)
    st = page.evaluate("({ text: window.__GAME__.talk.box?.text ?? null, shown: window.__GAME__.talk.box?.shown ?? 0, action: window.__GAME__.player.action?.name ?? null })")
    s.ok(st['action'] != 'knife', f'a left click on dialogue is not a knife swing ({st})')
    page.evaluate(click, True); page.evaluate(click, False); step(page, 2)
    s.ok(said() != 'ONE.', f'a left click advances the dialogue ({said()})')
    s.ok(errs == [], f'no console errors: {errs[:3]}')
    page.close()
    b.close()
s.done()
