# Nothing the game writes on the HUD goes off the screen: the longest strings on purpose at 1920x1080 and 4:3, then every
# area played by the bot at 4:3, the narrowest screen a player can play on. Read off the calls that draw the text.
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

s = Suite()
HOOK = """() => {
  const ui = window.__APP__.ui; const h = ui.hud; window.__off = []; window.__drawn = 0;
  if (h.__orig) return;
  h.__orig = h.text;
  h.text = function (x, y, t, o = {}) {
    const k = String(t); const m = h.measure(k, o.scale ?? 1); window.__drawn++;
    if (x < 0 || y < 0 || x + m.width > ui.W || y + m.height > ui.H) window.__off.push(k);
    return h.__orig.call(this, x, y, t, o);
  };
}"""
TAKE = "() => ({ off: [...new Set(window.__off)], drawn: window.__drawn })"
QUAY = '?g_area=quay&g_nosave=1&g_noattract=1&g_start=28,42&g_skip=arrival'
AREAS = {
    'quay': '?g_area=quay&g_nosave=1&g_noattract=1&g_bot=1',
    'road': '?g_area=road&g_nosave=1&g_noattract=1&g_bot=1',
    'cannery': '?g_area=cannery&g_nosave=1&g_noattract=1&g_bot=1&g_dame=1',
    'yard': '?g_area=yard&g_nosave=1&g_noattract=1&g_bot=1&g_dame=1',
    'causeway': '?g_area=causeway&g_nosave=1&g_noattract=1&g_bot=1&g_dame=1',
    'abbey': '?g_area=abbey&g_nosave=1&g_noattract=1&g_bot=1&g_dame=1',
    'crypt': '?g_area=abbey&g_nosave=1&g_noattract=1&g_bot=1&g_dame=1&g_flags=lensSolved&g_skip=cloister,lens&g_start=11,20',
    'nave': '?g_area=nave&g_nosave=1&g_noattract=1&g_bot=1&g_dame=1',
    'launch': '?g_area=launch&g_nosave=1&g_noattract=1&g_bot=1',
    'ending': '?g_area=launch&g_entry=ending&g_nosave=1&g_noattract=1',
}
LONG_HINT = 'KICK STUNNED ENEMIES. DOORS, WINDOWS AND THE LOFT LADDER ARE YOUR FRIENDS.'
LONG_RADIO = 'My great-grandfather signed the first Tithe. Every Vane ship that came home safe, the island kept a crew from it. That is your premium, Miss Ransom. That is what you insure.'
with sync_playwright() as pw:
    b = launch(pw)
    for tag, vp in (('1920x1080', {'width': 1920, 'height': 1080}), ('4:3', {'width': 1024, 'height': 768})):
        page, errs = open_game(b, QUAY, viewport=vp)
        step(page, 20)
        page.evaluate(HOOK)
        page.evaluate(f"""() => {{ const g = window.__GAME__;
          g.showHint({LONG_HINT!r}, 'action', 20);
          g.hud.flashText('A PARCEL FROM THE CLAIMS DESK', 20);
          g.chapterCard('CLAIM 3: ACT OF COMMODORE');
          g.talk.bark('commodore', 'I AM TOLD YOU WEAR SUNGLASSES AT NIGHT. HOW BRAVE. HOW STUPID.', {{ prio: 9 }});
        }}""")
        step(page, 240)
        r = page.evaluate(TAKE)
        s.ok(r['drawn'] > 0 and r['off'] == [], f'{tag}: long hint, flash, card and bark fit: {r["off"][:3]}')
        page.evaluate(f"""() => {{ window.__off = []; const g = window.__GAME__; g.radioCall([['pym', {LONG_RADIO!r}]], false); }}""")
        step(page, 400)
        r = page.evaluate(TAKE)
        s.ok(r['off'] == [], f'{tag}: the longest radio line fits: {r["off"][:3]}')
        s.ok(errs == [], f'{tag}: no console errors: {errs[:2]}')
        page.close()
    SCREENS = ['case0', 'case1', 'case2', 'case3', 'case4', 'case5', 'shop0', 'shop1', 'shop2', 'dev0', 'dev1', 'dev2', 'dev3', 'telegraph', 'form', 'denied', 'hostlobby', 'joinlobby', 'nsmenu']
    for tag, vp in (('1920x1080', {'width': 1920, 'height': 1080}), ('4:3', {'width': 1024, 'height': 768})):
        page, errs = open_game(b, '?g_area=quay&g_nosave=1&g_noattract=1&g_start=45,8&g_skip=arrival,tannoyHint,cottage,quayFront,shedHint', viewport=vp)
        step(page, 30)
        page.evaluate(HOOK)
        page.evaluate("""() => { const g = window.__GAME__; const r = g.run; r.money = 2300; r.addWeapon('scatter'); r.giveItem('scatter'); r.giveItem('samphire'); r.giveItem('dulse'); r.giveTreasure('pearl'); r.giveKey('coldKey'); r.notes = ['tide', 'hymn']; }""")
        for sc in SCREENS:
            page.evaluate("""(sc) => { const A = window.__APP__; const S = window.__SCREENS__; const g = window.__GAME__; A.closeAll();
              if (sc.startsWith('case')) { S.openCase(g, { tab: +sc[4] }); }
              else if (sc.startsWith('shop')) { const x = S.openShop(g); x?.setTab?.(+sc[4]); }
              else if (sc.startsWith('dev')) { const x = S.openDev(g); x?.setTab?.(+sc[3]); }
              else if (sc === 'telegraph') S.openTelegraph?.(g);
              else if (sc === 'form') S.openForm(g, { next: null, title: 'CLAIM FORM' });
              else if (sc === 'denied') S.openDenied(g);
              else if (sc === 'hostlobby') S.openHostLobby();
              else if (sc === 'joinlobby') S.openJoinLobby();
              else if (sc === 'nsmenu') S.openNightShiftMenu();
            }""", sc)
            step(page, 40)
            r = page.evaluate(TAKE)
            page.evaluate('() => { window.__off = []; }')
            s.ok(r['off'] == [], f'{tag} {sc}: everything fits: {r["off"][:3]}')
        # Selling a gun, including the last one, leaves a working game.
        page.evaluate("""() => { const A = window.__APP__; A.closeAll(); const x = window.__SCREENS__.openShop(window.__GAME__); x.setTab(1); }""")
        step(page, 6)
        for k in range(8):
            page.keyboard.press('Enter'); step(page, 4)
        step(page, 6)
        st = page.evaluate("""() => { const g = window.__GAME__; const r = g.run; return { owned: r.ownedWeapons(), equipped: r.equipped, valid: !!r.weapons[r.equipped], top: window.__APP__.top?.name }; }""")
        s.ok(st['valid'] and len(st['owned']) >= 1, f'{tag}: selling never leaves Max without a gun: {st}')
        page.evaluate("() => window.__APP__.closeAll()"); step(page, 30)
        s.ok(page.evaluate('!!window.__GAME__.player.weapon'), f'{tag}: and she still has a working weapon')
        # The dev overlays draw over the world without error.
        page.evaluate("() => { const A = window.__APP__; A.closeAll(); A.dev.showZones = true; A.dev.showNav = true; A.dev.showTriggers = true; }")
        step(page, 20)
        page.evaluate("() => { const A = window.__APP__; A.dev.showZones = false; A.dev.showNav = false; A.dev.showTriggers = false; }")
        s.ok(errs == [], f'{tag} screens: no console errors: {errs[:2]}')
        page.close()
    for name, q in AREAS.items():
        page, errs = open_game(b, q, viewport={'width': 1024, 'height': 768})
        step(page, 5)
        page.evaluate(HOOK)
        step(page, 500)
        r = page.evaluate(TAKE)
        s.ok(r['drawn'] > 0, f'4:3 {name}: the HUD drew something')
        s.ok(r['off'] == [], f'4:3 {name}: everything stays on screen: {r["off"][:4]}')
        s.ok(errs == [], f'4:3 {name}: no console errors: {errs[:2]}')
        page.close()
    b.close()
s.done()
