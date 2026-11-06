# Dev mode from pause; sliders change TUNING live and reset; the About screen has all its pages.
import sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

s = Suite()
with sync_playwright() as pw:
    b = launch(pw)
    page, errs = open_game(b, '?g_area=quay&g_nosave=1&g_start=28,42&g_skip=arrival,tannoyHint,cottage,quayFront,shedHint,siege')
    step(page, 10)
    page.keyboard.press('Escape'); step(page, 3)
    s.ok(page.evaluate('window.__APP__.top?.name') == 'pause', 'Esc pauses')
    rects = page.evaluate('window.__APP__.ui.rects.map(r => r.id)')
    s.ok(rects == ['resume', 'settings', 'restart', 'dev', 'quit'], f'pause menu items ({rects})')
    # Move down to DEV MODE and select it.
    for _ in range(3): page.keyboard.press('ArrowDown'); step(page, 2)
    s.ok(page.evaluate('window.__APP__.ui.focus') == 'dev', 'focus reaches DEV MODE')
    page.keyboard.press('Enter'); step(page, 3)
    s.ok(page.evaluate('window.__APP__.top?.name') == 'dev', 'Pause > DEV MODE opens it')
    tools = page.evaluate('window.__APP__.ui.rects.map(r => r.id)')
    for k in ['tgod', 'tnoclip', 'tinfiniteAmmo', 'toneHit', 'tfreezeAi', 'tshowZones', 'tshowNav', 'tshowTriggers', 'speed']:
        s.ok(k in tools, f'tool {k}')
    page.keyboard.press('Enter'); step(page, 2)
    s.ok(page.evaluate('window.__APP__.dev.god') is True, 'god mode toggles')
    page.keyboard.press('KeyE'); step(page, 2)
    page.keyboard.press('KeyE'); step(page, 2)
    page.keyboard.press('KeyE'); step(page, 2)
    s.ok(page.evaluate('window.__APP__.top.tab()') == 3, 'BALANCE tab')
    sliders = page.evaluate('window.__APP__.ui.rects.map(r => r.id)')
    s.ok(len(sliders) == 8, f'8 sliders a page ({len(sliders)})')
    first = sliders[0][1:]
    v0 = page.evaluate(f"window.__GAME__.constructor && (await_tuning = null, 0)") if False else None
    # Change with the keyboard: the TUNING object moves live; the player reads it next step.
    get = "() => window.__TUNING__"
    page.evaluate("() => { window.__APP__.ui.focus = 'bwalkSpeed'; }")
    step(page, 2)
    t0 = page.evaluate("() => window.__GAME__.tuningProbe?.()") if False else None
    page.keyboard.press('ArrowRight'); step(page, 2)
    page.keyboard.press('ArrowRight'); step(page, 2)
    # Read the value through a fresh frame: sliders draw value (default).
    # The test reads TUNING via the debug handle.
    tv = page.evaluate('window.__TUNING__.walkSpeed')
    s.ok(abs(tv - 3.2) < 0.001, f'a slider changes TUNING live ({tv})')
    page.keyboard.press('KeyX'); step(page, 2)
    s.ok(abs(page.evaluate('window.__TUNING__.walkSpeed') - 3.0) < 0.001, 'Triangle/X resets one')
    page.keyboard.press('ArrowRight'); step(page, 2)
    page.evaluate("() => { window.__TUNING__.runSpeed = 9; }")
    page.keyboard.press('Enter'); step(page, 2)
    s.ok(page.evaluate('window.__APP__.ui.rects[0].id') != sliders[0], 'Enter pages the sliders')
    page.keyboard.press('Escape'); step(page, 3)
    page.keyboard.press('Escape'); step(page, 3)
    s.ok(page.evaluate('window.__APP__.top?.name') is None, 'back to the game')
    page.evaluate("() => { window.__TUNING__.runSpeed = 4.8; window.__TUNING__.walkSpeed = 3; window.__APP__.dev.god = false; }")
    # About: all pages.
    page.evaluate("window.__SCREENS__.openAbout()"); step(page, 3)
    for i in range(5):
        s.ok(page.evaluate('window.__APP__.top.page()') == i, f'About page {i}')
        page.keyboard.press('KeyE'); step(page, 2)
    page.keyboard.press('Escape'); step(page, 2)
    s.ok(errs == [], f'no console errors: {errs[:3]}')
    page.close()
    b.close()
data = json.loads((ROOT.parent / 'exit-interview.json').read_text())
s.ok(set(data.keys()) == {'sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'}, 'exit interview shape')
s.ok(data['sourceInformation']['usage'] == 'added on import', 'exit interview usage')
s.ok(data['aiHub']['players'] == '1–4', 'exit interview players')
s.done()
