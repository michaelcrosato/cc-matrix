"""The whole road to the credits in the built file, from the title to Free Play, every menu pick by one device family alone: a stubbed
pad, or keyboard and mouse. Nobody can play by hand here, so the dev bot plays each activity, with the sim stepped fast."""
import sys, time
from playwright.sync_api import sync_playwright

exec(open('labs/game/tools/browser.py').read().split("with sync_playwright() as p:")[0].split("ok = fail = 0")[0])
built, family = sys.argv[1], sys.argv[2]
ok = fail = 0
def check(name, cond, detail=''):
    global ok, fail
    if cond: ok += 1
    else:
        fail += 1
        print('FAIL', family, name, str(detail)[:600])
def boot(pg):
    t = time.time()
    while time.time() - t < 180:
        try:
            if pg.evaluate("()=>window.__engine&&window.__engine.ready===true&&!!window.__game"): return True
        except Exception:
            pass
        time.sleep(1)
    return False
game = lambda pg: pg.evaluate("()=>{const g={...window.__game};delete g.setting;delete g.probeAudio;return g}")
act = lambda pg, name, args=None: pg.evaluate("([n,a])=>a?__engine.actions.run(n,a):__engine.actions.run(n)", [name, args])

def tap(pg, i):
    pg.evaluate("(i)=>__press(i,true)", i)
    time.sleep(0.5)
    pg.evaluate("(i)=>__press(i,false)", i)
    time.sleep(0.4)

def pick(pg, row):
    """Picks a row: a pad walks to it and presses Cross; keys and mouse click it."""
    if family == 'keys':
        pg.click(f'[data-id={row}]')
        time.sleep(0.4)
        return
    for _ in range(8):
        if game(pg)['focus'] == row: break
        tap(pg, 13)
        time.sleep(0.5)
    tap(pg, 0)

def first_open(pg):
    return pg.evaluate("()=>{const r=[...document.querySelectorAll('[data-ui=programme] .wt-row')].find(r=>r.dataset.off!=='1');return r?r.dataset.id:''}")

seen, leaned = set(), False
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=ARGS)
    ctx = b.new_context(viewport={'width': 1280, 'height': 720})
    ctx.add_init_script(PAD)
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)[:300]))
    pg.goto(URL)
    check('boot', boot(pg))
    t0, last, stuck = time.time(), '', time.time()
    while time.time() - t0 < 1500:
        g = game(pg)
        key = f"{g['screen']}|{g['mode']}|{g['event']}|{g['day']}|{g['phase']}"
        if key != last:
            last, stuck = key, time.time()
        if time.time() - stuck > 120:
            check('never stuck', False, key)
            break
        if g['mode'] == 'roam' and g['day'] == 6 and g['screen'] == 'roam':
            break
        s = g['screen']
        if '--trace' in sys.argv: print(round(time.time()-t0), key, flush=True)
        if s == 'title': pick(pg, 'begin')
        elif s == 'pier': pick(pg, 'go')
        elif s == 'roam':
            if family == 'keys':
                pg.keyboard.press('Tab', delay=80)
            else:
                tap(pg, 3)
            time.sleep(0.8)
        elif s == 'programme':
            row = first_open(pg)
            seen.add(row)
            pick(pg, row)
            time.sleep(0.8)
        elif s == 'results' or s == 'evening':
            pick(pg, 'carry' if s == 'results' else 'sleep')
            time.sleep(0.8)
        elif s == 'board':
            if family == 'keys': pg.keyboard.press('Escape', delay=80)
            else: tap(pg, 1)
            time.sleep(0.6)
        elif s == 'credits':
            if family == 'keys': pg.keyboard.press('Enter', delay=80)
            else: tap(pg, 0)
            time.sleep(1)
        elif g['mode'] == 'event':
            if not leaned and family == 'pad':
                # the stick itself leans the guest through the engine's own pad device
                leaned = True
                pg.evaluate("()=>{const buttons=Array.from({length:17},()=>({pressed:false,touched:false,value:0}));window.__pad={id:'DualSense (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,-0.9,0,0],buttons}}")
                time.sleep(2)
                check('the left stick leans', pg.evaluate("()=>__engine.state('seat').entities[0].seat.input.y") > 0.5)
                pg.evaluate("()=>__press(-1,false)")
            if pg.evaluate("()=>__engine.state('flow').entities[0].flow.bot") != 'perfect':
                act(pg, 'game.bot', {'skill': 'perfect'})
            pg.evaluate("()=>__engine.step(900)")
            time.sleep(0.3)
        else:
            time.sleep(0.5)
    g = game(pg)
    check('reached Free Play after the credits', g['mode'] == 'roam' and g['day'] == 6, g)
    for row in ['check', 'poseA', 'pond', 'walk', 'reps', 'garden', 'poseB', 'paddle', 'line', 'step', 'hoop', 'plunge', 'jog', 'group', 'poseC', 'tilt', 'sleep']:
        check('the Programme offered ' + row, row in seen, sorted(seen))
    check('no page errors', not errors, errors[:2])
    check('no engine errors', pg.evaluate("()=>__engine.errors.length===0"), pg.evaluate("()=>JSON.stringify(__engine.errors).slice(0,400)"))
    b.close()
print(f'RESULT ok {ok} fail {fail}')
