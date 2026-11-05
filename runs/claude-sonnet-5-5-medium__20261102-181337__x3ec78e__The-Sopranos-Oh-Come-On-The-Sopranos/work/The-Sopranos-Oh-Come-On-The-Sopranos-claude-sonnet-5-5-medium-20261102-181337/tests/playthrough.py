# A full playthrough in a real browser with real key events (no cheats, no teleports): title -> intro -> street -> kitchen -> therapy -> yard -> ending -> credits.
import sys, os, time, json, math
from playwright.sync_api import sync_playwright
HTML = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'The-Sopranos-Oh-Come-On-The-Sopranos-claude-sonnet-5-5-medium-20261102-181337.html'))
OUT = '/tmp/shots/play'; os.makedirs(OUT, exist_ok=True)
Q = """() => { try { const g = __game, sc = g.game.sceneName; const o = { scene: sc, step: g.S().step };
  if (sc === 'play') { const s = g.PLAY.state(), h = s.hero; Object.assign(o, { lv: s.lv.id, x: h.x, y: h.y, hp: h.hp, facing: h.facing, stress: h.stress, lives: h.lives, rage: h.rage, bat: h.bat, won: s.won, talk: s.talk.open, ask: !!s.talk.choices && !s.talk.typing, lockX: s.lockX, wave: s.wave,
    foes: s.foes.filter(f => !f.dead).map(f => [f.x, f.y, f.k.boss ? 1 : 0, f.knocked ? 1 : 0]), npcs: s.npcs.map(n => [n.x, n.y, n.done ? 1 : 0, n.n.talk ? 1 : 0]), pickups: s.pickups.map(p => [p.kind, p.x, p.y]), pond: s.lv.pond || null, ducks: s.st.ducks, st: s.st }); }
  if (sc === 'cut') o.talk = g.SCENE.talk.open; return o; } catch (e) { return { err: String(e) }; } }"""
t0 = time.time(); log = lambda *a: print('[%5.0fs]' % (time.time() - t0), *a, flush=True)
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.set_default_timeout(20000)
    pg.goto('file://' + HTML); pg.wait_for_timeout(1500)
    held = set()
    def hold(keys):
        for k in list(held):
            if k not in keys: pg.keyboard.up(k); held.discard(k)
        for k in keys:
            if k not in held: pg.keyboard.down(k); held.add(k)
    def tap(k, wait=60): pg.keyboard.press(k); pg.wait_for_timeout(wait)
    shots = set()
    def shot(n):
        if n not in shots: shots.add(n); pg.screenshot(path=f'{OUT}-{n}.png'); log('shot', n)
    def steer(s, tx, ty, pre=5):
        dx, dy = tx - s['x'], ty - s['y']; k = []
        if abs(dx) > pre: k.append('KeyD' if dx > 0 else 'KeyA')
        if abs(dy) > 3: k.append('KeyS' if dy > 0 else 'KeyW')
        hold(k); return math.hypot(dx, dy)
    shot('title'); tap('Enter', 300); n = 0
    last_scene = None; stuck = 0; fight_t = 0; kills_seen = 0
    while time.time() - t0 < 1500:
        s = pg.evaluate(Q)
        if 'err' in s: log('state err', s['err']); break
        sc = s['scene']
        if time.time() - globals().get('_lt', 0) > 10:
            globals()['_lt'] = time.time(); log('tick', 'rawstress', s.get('stress'), 'rage', s.get('rage'), json.dumps({k: (round(v) if isinstance(v, float) else v) for k, v in s.items() if k in ('scene', 'lv', 'x', 'y', 'hp', 'lives', 'wave', 'lockX', 'won', 'talk', 'stress')}), 'foes', len(s.get('foes', [])), 'pk', s.get('pickups'), 'npcs', s.get('npcs'))
        if sc != last_scene: log('scene', sc, s.get('lv', ''), 'step', s['step']); last_scene = sc; hold([])
        if sc == 'cut':
            shot('cut-' + str(s['step'])) if s.get('talk') else None
            hold([]); tap('Enter', 220); continue
        if sc == 'kitchen':
            shot('kitchen'); hold([])
            if 'kitchen-shop' not in shots:
                tap('ArrowDown', 150); tap('Enter', 300); shot('kitchen-shop'); tap('Enter', 250); tap('Escape', 250)
                shots.add('kitchen-shop')
            tap('Enter', 400); continue
        if sc == 'credits':
            shot('credits'); hold([]); tap('Enter', 400); continue
        if sc == 'title':
            if s['step'] >= 4 or 'credits' in shots: log('back at the title: playthrough complete'); break
            tap('Enter', 400); continue
        if sc == 'over':
            shot('over'); log('GAME OVER, retrying'); tap('Enter', 800); continue
        if sc != 'play': pg.wait_for_timeout(200); continue
        lv = s['lv']
        if os.environ.get('BOSS') and not globals().get('_jumped'):
            globals()['_jumped'] = 1; pg.evaluate('__game.PLAY.jumpToWave(3)'); continue
        if s['won'] > 0:
            hold([]); shot('results-' + lv)
            if s['won'] > 2.6: tap('Enter', 500)
            else: pg.wait_for_timeout(200)
            continue
        if s['talk']:
            hold([]); shot('talk-' + lv); tap('Enter', 160); continue
        foes = s['foes']
        # priority: fight
        if foes:
            fight_t += 1
            f = min(foes, key=lambda f: abs(f[0] - s['x']) + abs(f[1] - s['y']) * 2)
            side = -1 if s['x'] < f[0] else 1
            if s['stress'] >= 100 and (len(foes) >= 2 or any(f[2] for f in foes)): log('RAGE TAP', s['stress'], s['rage']); tap('KeyL', 80); shot('rage-' + lv); continue
            d = steer(s, f[0] + side * 22, f[1], 4)
            near = abs(f[0] - s['x']) < 36 and abs(f[1] - s['y']) < 9
            faced = (math.cos(s['facing']) > 0) == (side < 0)
            if near and faced:
                hold([]); tap('KeyJ', 70); tap('KeyJ', 70); tap('KeyJ', 70) if fight_t % 3 else tap('KeyK', 70)
                shot('fight-' + lv)
            elif near and not faced:
                hold(['KeyD' if side > 0 else 'KeyA']) if False else hold(['KeyA' if side > 0 else 'KeyD'] )
            pg.wait_for_timeout(60)
            continue
        # no foes: use the sit-downs, the ducks, pickups; then move on
        use = None
        for n in s['npcs']:
            if not n[2] and abs(n[0] - s['x']) < 320 and not (n[3] and 'sal' in shots): use = n
        bat = [p for p in s['pickups'] if p[0] in ('bat', 'cash') and abs(p[1] - s['x']) < 140]
        heal = [p for p in s['pickups'] if p[0] == 'sandwich' and s['hp'] < 50 and abs(p[1] - s['x']) < 140]
        if bat or heal:
            p = (bat or heal)[0]; steer(s, p[1], p[2]); pg.wait_for_timeout(60); continue
        if s['pond'] and s['ducks'] < 2 and s['x'] < s['pond']['x'] + 200:
            P = s['pond']; d = steer(s, P['x'] - P['rx'] - 12, P['y'] + 14, 3)
            if d < 12: hold([]); shot('ducks'); tap('KeyE', 300)
            else: pg.wait_for_timeout(60)
            continue
        if use:
            d = steer(s, use[0] - 16, use[1] + 4, 3)
            if abs(s['x'] - globals().get('_px2', -99)) < 1.5 and d > 30: globals()['_st2'] = globals().get('_st2', 0) + 1
            else: globals()['_st2'] = 0
            globals()['_px2'] = s['x']
            if globals()['_st2'] > 10: hold([]); tap('KeyJ', 120); tap('KeyJ', 120); hold(['KeyS']); pg.wait_for_timeout(600); globals()['_st2'] = 0
            if d < 9:
                hold([]); tap('KeyE', 300); shot('sitdown-' + lv)
                if use[3]: shots.add('sal')
            else: pg.wait_for_timeout(60)
            continue
        hold(['KeyD']); pg.wait_for_timeout(100)
        if s.get('x') is not None:
            if abs(s['x'] - globals().get('_px', -99)) < 2: globals()['_stuck'] = globals().get('_stuck', 0) + 1
            else: globals()['_stuck'] = 0
            globals()['_px'] = s['x']
            if globals()['_stuck'] > 12: hold([]); tap('KeyJ', 120); tap('KeyJ', 120); hold(['KeyD', 'KeyS']); pg.wait_for_timeout(500); globals()['_stuck'] = 0
        if s['hp'] < 1 and s['lives'] == 0: log('dead')
    hold([]); shot('final'); log('final state', json.dumps({k: v for k, v in pg.evaluate(Q).items() if k in ('scene', 'step', 'lv', 'hp', 'lives')}), 'page errors:', errs[:3], 'game errors:', pg.evaluate("__game.game.errors.map(e=>e.message)"))
    b.close()
