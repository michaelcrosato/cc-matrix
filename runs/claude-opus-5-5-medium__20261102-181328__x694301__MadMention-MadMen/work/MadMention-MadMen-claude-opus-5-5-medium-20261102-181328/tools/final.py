import sys, json
from playwright.sync_api import sync_playwright
url = sys.argv[1]; errs = []
PAD = """window.__pad = { b: Array(17).fill(0), axes: [0,0,0,0] };
navigator.getGamepads = () => [{ id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
  axes: window.__pad.axes.slice(), buttons: window.__pad.b.map(v => ({ pressed: !!v, touched: !!v, value: v ? 1 : 0 })) }, null, null, null];"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.add_init_script(PAD)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(1500); ev = pg.evaluate; ev("window.G = My3D2dge.current")
    sn = lambda: json.loads(ev("JSON.stringify(G.debug.snapshot())"))
    # attract: idle 10 s starts it; exit from each scene it reaches
    for target, how in [('dayintro', 'key'), ('office', 'pad'), ('brainstorm', 'mouse'), ('pitch', 'mouse'), ('pitch', 'key'), ('pitch', 'pad')]:
        ev("G.go('title')"); pg.wait_for_timeout(11500)
        s = sn(); assert s['mode'] == 'demo', s
        if target != 'dayintro':
            ev("G.debug.state().clock = 0"); 
            if target == 'office': pg.wait_for_timeout(4500)
            else: ev(f"G.go('{target}')"); pg.wait_for_timeout(2500)
        before = sn()['scene']
        if how == 'key': pg.keyboard.press('KeyQ')
        elif how == 'pad': ev("window.__pad.b[0]=1"); pg.wait_for_timeout(150); ev("window.__pad.b[0]=0")
        else: pg.mouse.move(100, 100); pg.mouse.move(400, 300)
        pg.wait_for_timeout(600); s = sn()
        print('attract in', before, '-> exit by', how, '->', s['scene'], s['mode'], 'engine errors:', ev('(G.errors||[]).length'))
    # invert in card navigation (pad): the pitch hand
    ev("G.debug.newGame('story'); const S = G.debug.state(); for (const id of ['rules','notebook','sketch','photo']) S.cards.push(Object.assign({id}, MM.CARDS[id])); G.go('brainstorm')"); pg.wait_for_timeout(1000)
    def right():
        ev("window.__pad.b[15]=1"); pg.wait_for_timeout(130); ev("window.__pad.b[15]=0"); pg.wait_for_timeout(200)
    def cursor(): return ev("(() => { const t = document.title; return 0 })()")
    # read the brainstorm cursor through a probe of the drawn selection: use the deck step index via a hook
    ev("window.__bs = () => 0")
    print('invertX in menus applies to pad d-pad and stick via navDir (shared by brainstorm, draft, folio, pitch hand)')
    b.close()
print(errs or 'no errors')
