# Outside a hub: two pages in one context run a Night Shift party over BroadcastChannel, then over
# WebRTC invite codes with no STUN. Both reach a results screen.
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

s = Suite()
LIVE = 'async () => { const e = await window.__PIXEL_READY__; e.manual = false; }'

def finish_round(host, guest, label):
    # Shorten the shift so the round ends quickly: jump the host's clock near dawn.
    host.wait_for_function('() => window.__GAME__?.name === "area:shift"', timeout=90000)
    guest.wait_for_function('() => window.__GAME__?.name === "area:shift"', timeout=90000)
    host.wait_for_function('() => window.__GAME__.session.time() > 500', timeout=60000)
    guest.wait_for_function('() => window.__GAME__.session.time() > 0', timeout=60000)
    host.wait_for_timeout(2500)
    g = guest.evaluate("() => ({ ghosts: window.__GAME__.ghosts.size, enemies: window.__GAME__.enemies.length, players: window.__GAME__.session.players.length, me: window.__GAME__.session.me })")
    s.ok(g['players'] == 2 and g['me'] == 1, f'{label}: guest is seat 1 of 2 ({g})')
    s.ok(g['ghosts'] > 0, f'{label}: snapshots reach the guest ({g})')
    # Guest fires: the host hears.
    guest.evaluate("() => window.__GAME__.resolveShot(window.__GAME__.player, window.__GAME__.player.weapon, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 })")
    host.wait_for_function("() => { const st = window.__GAME__.stats[1]; return st && st.shots >= 1; }", timeout=20000)
    s.ok(True, f'{label}: a guest shot reaches the host')
    host.evaluate("() => { window.__GAME__.dawn(); }")
    host.wait_for_function("() => window.__APP__.top?.name === 'results'", timeout=40000)
    guest.wait_for_function("() => window.__APP__.top?.name === 'results'", timeout=40000)
    r = guest.evaluate("() => window.__APP__.top.res")
    s.ok(r and r['won'] is True, f'{label}: the guest sees the same result ({str(r)[:160]})')

with sync_playwright() as pw:
    b = launch(pw)
    ctx = b.new_context(viewport={'width': 640, 'height': 360})
    for label, q in [('BroadcastChannel', '?g_noattract=1'), ('WebRTC', '?g_noattract=1&g_nostun=1')]:
        host = ctx.new_page(); guest = ctx.new_page()
        errs = []
        for p in (host, guest):
            p.on('pageerror', lambda e: errs.append(str(e)))
            p.goto(DELIVERABLE.as_uri() + q)
            p.evaluate('async () => { await window.__PIXEL_READY__; }')
            p.evaluate(LIVE)
        host.wait_for_timeout(800)
        host.evaluate("window.__SCREENS__.openHostLobby()")
        guest.evaluate("window.__SCREENS__.openJoinLobby()")
        if label == 'BroadcastChannel':
            host.wait_for_timeout(1500)
            pid = guest.wait_for_function("() => { const r = window.__APP__.ui.rects.find(k => k.id.startsWith('hp')); return r ? r.id.slice(1) : null; }", timeout=30000).json_value()
            s.ok(bool(pid), 'the guest lists the host automatically')
            guest.evaluate("(pid) => window.__APP__.top.joinHost(pid)", pid)
        else:
            offer = host.evaluate("() => window.__APP__.top.session.createInvite([])")
            s.ok(len(offer) > 100, f'an invite code of {len(offer)} characters')
            answer = guest.evaluate("(code) => window.__APP__.top.joinWithCode(code)", offer)
            host.evaluate("(code) => window.__APP__.top.session.acceptAnswer(code)", answer)
        host.wait_for_function("() => window.__APP__.top.session.players.length === 2", timeout=30000)
        s.ok(True, f'{label}: the host sees the seat fill')
        host.evaluate("() => window.__APP__.top.start()")
        finish_round(host, guest, label)
        s.ok(errs == [], f'{label}: no page errors {errs[:3]}')
        host.close(); guest.close()
    # Solo.
    page = ctx.new_page()
    page.goto(DELIVERABLE.as_uri() + '?g_noattract=1')
    page.evaluate('async () => { await window.__PIXEL_READY__; }')
    page.evaluate(LIVE)
    page.wait_for_timeout(500)
    page.evaluate('() => window.__SCREENS__.startSolo()')
    page.wait_for_function('() => window.__GAME__?.name === "area:shift" && window.__GAME__.session.time() > 200', timeout=60000)
    page.evaluate("() => { window.__GAME__.player.hurt(9999, { x: 0, z: 0 }, {}); }")
    page.evaluate("() => { window.__GAME__.bleedOut(0); }")
    page.wait_for_function("() => window.__APP__.top?.name === 'results'", timeout=30000)
    r = page.evaluate("() => window.__APP__.top.res")
    s.ok(r['won'] is False, 'solo: bleed-out ends the shift')
    board = page.evaluate("() => JSON.parse(localStorage.getItem('regrettable-evil-4:board') ?? '[]')")
    s.ok(len(board) >= 1, 'solo score goes on the local board')
    page.close()
    ctx.close()
    b.close()
s.done()
