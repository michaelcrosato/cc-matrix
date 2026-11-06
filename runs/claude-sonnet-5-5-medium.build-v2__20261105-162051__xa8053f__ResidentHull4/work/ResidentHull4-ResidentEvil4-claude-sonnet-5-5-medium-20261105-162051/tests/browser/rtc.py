import time
from common import *
def run(r):
    with sync_playwright() as p:
        b = launch(p); ctx = b.new_context(viewport={'width': 800, 'height': 450}); ctx.set_default_timeout(40000)
        A = ctx.new_page(); B = ctx.new_page()
        for pg in (A, B):
            pg.goto('file://' + GAME + '?g_nostun=1'); pg.wait_for_function('window.__PIXEL_READY__ !== undefined', timeout=60000)
            pg.evaluate("window.__PIXEL_READY__.then(e => { e.manual = false; })")
        A.evaluate("window.__APP__.openLobby('host'); window.__APP__.top().open(true)"); B.evaluate("window.__APP__.openLobby('join'); window.__APP__.top().open(true)")
        offer = A.evaluate("window.__APP__.top().bus.hostOffer(0)")
        r.check('invite code made', len(offer) > 200, len(offer))
        answer = B.evaluate("(c) => { const l = window.__APP__.top(); l.bus.onopen = () => l.session.join('*'); return l.bus.guestAnswer(c); }", offer)
        A.evaluate("(a) => { const l = window.__APP__.top(); l.bus.onopen = () => l.bus.send({ t: 'roster', players: l.session.players, to: 'all' }); return l.bus.hostAccept(0, a); }", answer)
        A.wait_for_function("window.__APP__.top().session.players.length === 2", timeout=30000)
        r.check('guest connects over WebRTC and takes a seat', True)
        A.evaluate("window.__APP__.top().session.start(0)")
        for pg in (A, B): pg.wait_for_function("window.__GAME__ && window.__GAME__.role && window.__GAME__.role !== 'solo'", timeout=40000)
        time.sleep(8)
        ca = A.evaluate("window.__GAME__.clock"); cb = B.evaluate("window.__GAME__.clock")
        r.check('both copies run the shift over WebRTC', ca > 1 and cb > 1, (ca, cb))
        r.check('client sees host enemies', B.evaluate("window.__GAME__.enemies.length") > 0)
        b.close()
if __name__ == '__main__':
    r = R(); run(r); print(f'{r.passed} passed, {r.failed} failed')
