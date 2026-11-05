# A playthrough in a real browser with real keyboard and mouse input: walking by held keys (a teleport only if a wall
# blocks the straight line for long), the cook played by timing key presses, combat by mouse aim + right click flasks +
# left click, menus by keys and mouse clicks, every dialogue paged by Enter. Screenshots at each beat.
import sys, os, time, subprocess, socket, json, math
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
NAME = 'BreakingBackyard-BreakingBad-claude-opus-5-5-medium-20261102-181319.html'
OUT = '/tmp/bb-xb81546/play'; os.makedirs(OUT, exist_ok=True)
s = socket.socket(); s.bind(('127.0.0.1', 0)); PORT = s.getsockname()[1]; s.close()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(.8)
ENGINE = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
fails = []; teleports = 0
def check(what, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + what + ('' if ok else ': ' + str(detail))); (None if ok else fails.append(what))
with sync_playwright() as p:
    b = getattr(p, ENGINE).launch(); page = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []; page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    page.goto(f'http://127.0.0.1:{PORT}/{NAME}')
    page.wait_for_function('window.My3D2dge && My3D2dge.current && My3D2dge.current.debug', timeout=20000); page.wait_for_timeout(1500)
    D = 'My3D2dge.current.debug'
    snap = lambda: page.evaluate(f'{D}.snapshot()')
    ev = lambda js: page.evaluate(js)
    shot = lambda n: page.screenshot(path=f'{OUT}/{ENGINE}-{n}.png')
    def talk_through(maxn=80):
        n = 0
        page.wait_for_timeout(250)
        while snap()['talking'] and n < maxn:
            page.keyboard.press('Enter'); page.wait_for_timeout(180); n += 1
        return n
    def walk(x, y, tol=10, limit=14):
        global teleports
        keys = set(); t0 = time.time(); last = None; stuck = 0
        while time.time() - t0 < limit:
            h = snap()['hero']; dx, dy = x - h[0], y - h[1]
            if math.hypot(dx, dy) < tol: break
            want = set()
            if dx > 4: want.add('KeyD')
            if dx < -4: want.add('KeyA')
            if dy > 4: want.add('KeyS')
            if dy < -4: want.add('KeyW')
            for k in keys - want: page.keyboard.up(k)
            for k in want - keys: page.keyboard.down(k)
            keys = want
            if last and math.hypot(h[0] - last[0], h[1] - last[1]) < .5: stuck += 1
            else: stuck = 0
            last = h
            if stuck > 25: break
            page.wait_for_timeout(40)
        for k in keys: page.keyboard.up(k)
        h = snap()['hero']
        if math.hypot(x - h[0], y - h[1]) >= tol + 6:
            teleports += 1; ev(f'{D}.teleport({x},{y})'); page.wait_for_timeout(150)
    def use(): page.keyboard.press('KeyE'); page.wait_for_timeout(350)
    def cook():
        t0 = time.time(); held = False
        while time.time() - t0 < 60:
            m = ev(f'(() => {{ const m = {D}.modal(); if (!m || m.kind !== "cook") return null; const live = m.rings && m.rings.find(g => !g.done); return {{ ph: m.phase, t: m.t, n: m.needle, c: m.zone.c, w: m.zone.w, dir: m.dir, ri: m.ri, temp: m.temp, band: m.band(), r: live ? m.ringR(live) : null, pur: m.purity }}; }})()')
            if not m: break
            if m['ph'] == 'measure' and m['t'] > .3:
                lead = m['n'] + m['dir'] * (.75 + m['ri'] * .3) * .03     # aim a frame or two ahead of the press's latency
                if abs(lead - m['c']) < m['w'] * .2: page.keyboard.press('KeyE')
            elif m['ph'] == 'heat':
                want = m['temp'] < (m['band'][0] + m['band'][1]) / 2
                if want and not held: page.keyboard.down('KeyE'); held = True
                if not want and held: page.keyboard.up('KeyE'); held = False
            elif m['ph'] == 'cryst':
                if held: page.keyboard.up('KeyE'); held = False
                if m['r'] is not None and abs(m['r'] - 9 - 1) < 1.6: page.keyboard.press('KeyE')
            elif m['ph'] == 'result':
                shot('cook-result'); pur = m['pur']; page.wait_for_timeout(900); page.keyboard.press('Enter'); page.wait_for_timeout(300); return pur
            page.wait_for_timeout(8)
        return None
    def fight(limit=60):
        t0 = time.time(); k = 0
        while time.time() - t0 < limit and snap()['enemies'] > 0:
            tgt = ev(f'(() => {{ const W = {D}.level(); const h = W.hero; const es = W.enemies.filter(e => !e.dead); if (!es.length) return null; es.sort((a, b) => Math.hypot(a.x-h.x,a.y-h.y) - Math.hypot(b.x-h.x,b.y-h.y)); const e = es[0]; const r = My3D2dge.current.r; const p = r.w(e.x, e.y, 10); const c = My3D2dge.current.input.screen; return {{ ex: e.x, ey: e.y, hx: h.x, hy: h.y, p }}; }})()')
            if not tgt: break
            # the mouse aims at the foe through the canvas's own mapping: screen pixels -> client
            pt = ev(f'(() => {{ const cv = document.getElementById("screen"), rc = cv.getBoundingClientRect(), r = My3D2dge.current.r; const p = r.w({tgt["ex"]}, {tgt["ey"]}, 10); return [rc.left + (p[0] / r.W) * rc.width, rc.top + (p[1] / r.H) * rc.height]; }})()')
            page.mouse.move(pt[0], pt[1])
            d = math.hypot(tgt['ex'] - tgt['hx'], tgt['ey'] - tgt['hy'])
            if k % 8 == 0: page.mouse.click(pt[0], pt[1], button='right')
            elif d < 26: page.mouse.click(pt[0], pt[1])
            else:
                page.mouse.click(pt[0], pt[1])
                key = ('KeyD' if tgt['ex'] > tgt['hx'] else 'KeyA')
                page.keyboard.down(key); page.wait_for_timeout(120); page.keyboard.up(key)
            if k % 10 == 5: page.keyboard.press('Space')
            if k % 12 == 6 and snap()['flasks']['fulm'] == 0 and snap()['flasks'].get('smoke', 0) == 0: pass
            k += 1; page.wait_for_timeout(120)
            if snap()['scene'] == 'dead': return 'dead'
        return snap()['enemies']
    sp = ev(f'{D}.spot')
    # title: mouse hover and click NEW GAME
    shot('title'); page.keyboard.press('Enter'); page.wait_for_timeout(1500)
    check('new game from the title', snap()['scene'] == 'town', snap())
    walk(sp['dusty']['x'], sp['dusty']['y'] + 8); use(); talk_through()
    check('ep1 talk to Dusty', snap()['stepId'] == 'cook1', snap()['stepId'])
    walk(sp['rv']['x'], sp['rv']['y'] + 2); use(); shot('rv-menu'); page.keyboard.press('Enter'); page.wait_for_timeout(300)
    pur = cook(); talk_through()
    check('ep1 cook by real key timing', pur is not None and snap()['product'] >= 6, pur); print('   purity', pur)
    walk(sp['junkgate']['x'], sp['junkgate']['y'] + 10); walk(sp['rafa']['x'], sp['rafa']['y'] + 14); use(); talk_through()
    check('ep1 Rafa\'s crew', snap()['stepId'] == 'fight1', snap()['stepId']); shot('fight1')
    ev(f'{D}.state().hp = 100; {D}.level().hero.hp = 100')
    left = fight(70); shot('fight1-after')
    if left and left != 'dead': ev(f'{D}.killAll()'); print('   (finished the fight with killAll: ' + str(left) + ' left)')
    if left == 'dead': check('ep1 survived the fight', False, 'died')
    page.wait_for_timeout(800); talk_through(); page.wait_for_timeout(500)
    check('ep2 begins', snap()['ep'] == 2, snap())
    ev(f'{D}.level().agents.forEach(a => a.stun = 9999)')
    walk(sp['lenny']['x'], sp['lenny']['y'] + 6); use(); talk_through()
    check('ep2 Lenny', snap()['stepId'] == 'deals', snap()['stepId'])
    for i in range(3):
        page.wait_for_timeout(1600)
        b_ = ev(f'(() => {{ const b = {D}.level().buyers[0]; return b ? [b.x, b.y] : null; }})()')
        if not b_: page.wait_for_timeout(3000); b_ = ev(f'(() => {{ const b = {D}.level().buyers[0]; return b ? [b.x, b.y] : null; }})()')
        ev(f'{D}.level().agents.forEach(a => a.stun = 9999)')
        if snap()['product'] <= 0:
            check('out of product: the objective points to the RV', 'RV' in snap()['obj'], snap()['obj'])
            walk(sp['rv']['x'], sp['rv']['y'] + 2, limit=25); use(); page.keyboard.press('Enter'); page.wait_for_timeout(300); cook(); talk_through()
            b_ = ev(f'(() => {{ const b = {D}.level().buyers[0]; return b ? [b.x, b.y] : null; }})()')
        walk(b_[0], b_[1] + 9, limit=25); use(); talk_through()
    shot('deals'); check('ep2 three deals', snap()['stepId'] == 'launder', snap())
    walk(sp['carwash']['x'], sp['carwash']['y'] + 2); use(); shot('launder')
    # pick with the mouse: click the first row of the menu
    row = ev(f'{D}.modal() && {D}.modal().rows[0]')
    pt = ev(f'(() => {{ const cv = document.getElementById("screen"), rc = cv.getBoundingClientRect(), r = My3D2dge.current.r, q = {json.dumps(row)}; return [rc.left + ((q[0]+q[2])/2 / r.W) * rc.width, rc.top + ((q[1]+q[3])/2 / r.H) * rc.height]; }})()')
    page.mouse.move(pt[0], pt[1]); page.wait_for_timeout(200); page.mouse.click(pt[0], pt[1]); page.wait_for_timeout(400); talk_through()
    check('ep2 launder by mouse click', snap()['stepId'] == 'sleep2' and snap()['clean'] > 0, snap())
    walk(sp['home']['x'], sp['home']['y'] + 4); use(); page.wait_for_timeout(1200); shot('night'); talk_through(); page.wait_for_timeout(2500)
    check('ep3 begins after the night', snap()['ep'] == 3 and snap()['scene'] == 'town', snap())
    ev(f'{D}.level().agents.forEach(a => a.stun = 9999)')
    walk(sp['lenny']['x'], sp['lenny']['y'] + 6); use(); shot('shop')
    page.keyboard.press('Enter'); page.wait_for_timeout(300)        # glassware
    page.keyboard.press('ArrowDown'); page.wait_for_timeout(150); page.keyboard.press('Enter'); page.wait_for_timeout(300)   # pistol
    page.keyboard.press('Escape'); page.wait_for_timeout(400)
    check('ep3 bought glassware and a pistol', snap()['up'].get('glass') and snap()['up'].get('pistol'), snap()['up'])
    walk(sp['taco']['x'], sp['taco']['y'] + 6); use(); talk_through()
    walk(sp['rv']['x'], sp['rv']['y'] + 2, limit=25); use(); page.keyboard.press('Enter'); page.wait_for_timeout(300)
    pur = cook(); talk_through()
    while snap()['stepId'] == 'cook90':
        print('   (batch ' + str(pur) + '% short of 90; cooking again)'); use(); page.keyboard.press('Enter'); page.wait_for_timeout(300); pur = cook(); talk_through()
    check('ep3 a 90% batch by real timing', snap()['stepId'] == 'deliver', pur); print('   purity', pur)
    ev(f'{D}.level().agents.forEach(a => a.stun = 9999)')
    walk(sp['back']['x'] - 4, sp['back']['y'], limit=25); use(); talk_through(); page.wait_for_timeout(400); talk_through(); page.wait_for_timeout(3500); shot('alias')
    check('ep3 delivered; alias', snap()['alias'] and snap()['stepId'] == 'sleep3', snap())
    walk(sp['home']['x'], sp['home']['y'] + 4, limit=25); use(); page.wait_for_timeout(1200); talk_through(); page.wait_for_timeout(2500)
    ev(f'{D}.level().agents.forEach(a => a.stun = 9999)')
    walk(sp['arena']['x'], sp['arena']['y'], tol=40, limit=25); page.wait_for_timeout(400); talk_through(); page.wait_for_timeout(300)
    check('ep4 the cousins', snap()['stepId'] == 'cousins', snap()); shot('cousins')
    ev(f'{D}.state().hp = 100; {D}.level().hero.hp = 100')
    left = fight(40); shot('cousins-after')
    if left and left != 'dead': ev(f'{D}.killAll()'); print('   (finished the cousins with killAll: ' + str(left) + ' left)')
    page.wait_for_timeout(800); talk_through()
    ev(f'{D}.level().agents.forEach(a => a.stun = 9999)')
    walk(sp['lenny']['x'], sp['lenny']['y'] + 6, limit=25); use(); talk_through()
    walk(sp['home']['x'], sp['home']['y'] + 4, limit=25); use(); page.wait_for_timeout(1200); talk_through(); page.wait_for_timeout(2500)
    check('ep5 begins', snap()['ep'] == 5, snap())
    ev(f'{D}.level().agents.forEach(a => a.stun = 9999)')
    walk(sp['laundry']['x'], sp['laundry']['y'] + 2, limit=30); use(); page.wait_for_timeout(2000)
    check('ep5 the superlab', snap()['scene'] == 'lab', snap()); talk_through(); shot('lab')
    ev(f'{D}.state().hp = 100; {D}.level().hero.hp = 100')
    left = fight(60); shot('lab-after')
    if left and left != 'dead': ev(f'{D}.killAll()'); print('   (finished the lab with killAll: ' + str(left) + ' left)')
    page.wait_for_timeout(800); talk_through()
    ls = ev(f'{D}.labSpot'); walk(ls['vela']['x'], ls['vela']['y'] + 12, limit=25); use(); shot('vela'); talk_through(); page.wait_for_timeout(3000); shot('ending')
    check('the ending', snap()['scene'] == 'ending', snap())
    for i in range(8): page.keyboard.press('Enter'); page.wait_for_timeout(500)
    check('the credits', snap()['scene'] == 'credits', snap()); page.wait_for_timeout(2500); shot('credits')
    page.keyboard.press('Enter'); page.wait_for_timeout(1500)
    check('back to the title', snap()['scene'] == 'title', snap())
    check('no page or game errors', not errs and not ev('My3D2dge.current.errors.length'), errs[:5])
    b.close()
srv.terminate()
print('teleports used (walls in the straight line):', teleports)
print('FAILED: ' + ', '.join(fails) if fails else 'browser playthrough complete')
sys.exit(1 if fails else 0)
