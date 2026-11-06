import time
from common import *
def run(r):
    with sync_playwright() as p:
        b = launch(p); ctx = b.new_context(viewport={'width': 800, 'height': 450}); ctx.set_default_timeout(40000)
        A = ctx.new_page(); B = ctx.new_page()
        for pg in (A, B):
            pg.goto('file://' + GAME); pg.wait_for_function('window.__PIXEL_READY__ !== undefined', timeout=60000)
            pg.evaluate("window.__PIXEL_READY__.then(e => { e.manual = false; })")
        A.evaluate("window.__APP__.openLobby('host')"); B.evaluate("window.__APP__.openLobby('join')")
        B.wait_for_function("window.__APP__.top() && window.__APP__.top().hosts && window.__APP__.top().hosts.length > 0", timeout=20000)
        r.check('lobby lists the host automatically', True)
        B.evaluate("(() => { const l = window.__APP__.top(); l.session.join(l.hosts[0].id); })()")
        A.wait_for_function("window.__APP__.top().session.players.length === 2", timeout=20000)
        r.check('host sees the guest seat fill', True)
        A.evaluate("window.__APP__.top().session.start(0)")
        for pg in (A, B): pg.wait_for_function("window.__GAME__ && window.__GAME__.role && window.__GAME__.role !== 'solo'", timeout=40000)
        time.sleep(8)
        ra = A.evaluate("({role: window.__GAME__.role, ghosts: window.__GAME__.ghosts.length, t: window.__GAME__.session.time()})")
        rb = B.evaluate("({role: window.__GAME__.role, enemies: window.__GAME__.enemies.length, clock: window.__GAME__.clock, errs: window.__PIXEL_READY__ && 0})")
        r.check('host and client roles', ra['role'] == 'host' and rb['role'] == 'client', (ra, rb))
        r.check('clock runs for both after countdown', ra['t'] > 0 and rb['clock'] > 0, (ra, rb))
        errs = [x.evaluate("window.__PIXEL_READY__.then(e => e.errors.length)") for x in (A, B)]
        r.check('no engine errors in a party', errs == [0, 0], errs)
        b.close()
if __name__ == '__main__':
    r = R(); run(r); print(f'{r.passed} passed, {r.failed} failed')
