# Full playthrough in Chromium: title -> lab (cook) -> street (sell x3) -> yard (boss) -> results.
# Menus, dialogue, cooking and attacks use real key presses. Walking between stops is teleported.
import sys, time, pathlib, json
from playwright.sync_api import sync_playwright

HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/hb-shots'); OUT.mkdir(parents=True, exist_ok=True)
log = []
def check(name, ok, detail=''):
    log.append({'check': name, 'ok': bool(ok), 'detail': str(detail)})
    print(('PASS ' if ok else 'FAIL ') + name + (' ' + str(detail) if detail else ''))

def hb(page, expr):
    return page.evaluate('() => window.HALF_BAKED.' + expr)

def wait_for(page, expr, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate('() => ' + expr):
            return True
        time.sleep(0.1)
    return False

def clear_dialog(page, limit=60):
    n = 0
    while n < limit and page.evaluate('() => window.HALF_BAKED.talk.open'):
        page.keyboard.press('Enter'); time.sleep(0.25); n += 1
    return n

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.on('console', lambda m: errors.append('CONSOLE ' + m.type + ' ' + m.text) if m.type == 'error' else None)
    page.goto(HTML)
    time.sleep(2.5)

    # Title -> NEW SHIFT (first item, selected by default)
    page.keyboard.press('Enter')
    check('title to lab', wait_for(page, "window.HALF_BAKED.scene() === 'lab'"), page.evaluate('() => window.HALF_BAKED.scene()'))
    page.screenshot(path=str(OUT / 'lab-intro.png'))
    clear_dialog(page)
    check('lab intro dialogue closes', wait_for(page, '!window.HALF_BAKED.talk.open', 5))

    # Real movement: hold right for half a second and the hero moves.
    x0 = hb(page, 'heroPos()')['x']
    page.keyboard.down('ArrowRight'); time.sleep(0.5); page.keyboard.up('ArrowRight')
    x1 = hb(page, 'heroPos()')['x']
    check('keyboard moves the hero', x1 > x0 + 3, f'{x0:.1f} -> {x1:.1f}')

    # Cook: walk (teleport) to the station, confirm to start, then stop each stage on its target.
    st = hb(page, 'stationPos()')
    hb(page, f"teleport({st['x']}, {st['y'] + 6})")
    time.sleep(0.4)
    page.keyboard.press('Enter'); time.sleep(0.3)
    check('cook begins at the station', hb(page, 'cook()') is not None)
    page.screenshot(path=str(OUT / 'cook-stage1.png'))
    stages = [(0.5, 1.5), (0.35, 1.25), (0.7, 1.1)]
    for i, (target, period) in enumerate(stages):
        # Wait until the marker is on its target (triangle wave), then press.
        def near():
            c = hb(page, 'cook()')
            if not c: return False
            p_ = (c['t'] / period) % 1
            m = p_ * 2 if p_ < 0.5 else 2 - p_ * 2
            return abs(m - target) < 0.012 and c['stage'] == i
        end = time.time() + 8
        while time.time() < end and not near():
            time.sleep(0.005)
        page.keyboard.press('Enter'); time.sleep(0.25)
        if i == 1: page.screenshot(path=str(OUT / 'cook-stage2.png'))
    time.sleep(0.5)
    check('cook finishes with a batch', hb(page, 'state().product') is not None, json.dumps(hb(page, 'state().product')))
    page.screenshot(path=str(OUT / 'cook-done.png'))
    clear_dialog(page)
    purity = (hb(page, 'state().product') or {}).get('purity', 0)
    check('cook purity is in range', 10 <= purity <= 100, purity)

    # Exit door -> street
    ex = hb(page, 'exitPos()')
    hb(page, f"teleport({ex['x'] - 8}, {ex['y']})")
    time.sleep(0.4)
    page.keyboard.press('Enter')
    check('exit leads to the desert', wait_for(page, "window.HALF_BAKED.scene() === 'street'"))
    time.sleep(0.6)
    clear_dialog(page)
    page.screenshot(path=str(OUT / 'street-start.png'))

    # Three sales: teleport next to each buyer, talk, sell (first choice).
    cash_before = hb(page, 'state().cash')
    for i in range(3):
        bp = hb(page, f'buyerPos({i})')
        hb(page, f"teleport({bp['x'] - 10}, {bp['y']})")
        time.sleep(0.3)
        page.keyboard.press('Enter')
        ok_open = wait_for(page, 'window.HALF_BAKED.talk.open', 3)
        if i == 0:
            time.sleep(0.8)
            page.screenshot(path=str(OUT / 'street-deal.png'))
        n = 0
        while n < 60 and hb(page, 'talk.open') and not (hb(page, 'talk.choices') if False else False):
            page.keyboard.press('Enter'); time.sleep(0.3); n += 1
        # On the choice page, Enter picks the highlighted choice (SELL).
        time.sleep(0.4)
        clear_dialog(page, 40)
        check(f'buyer {i + 1} opens a deal', ok_open)
    check('three buyers sold to', all(hb(page, 'state().sold')), hb(page, 'state().sold'))
    check('sales add to cash', hb(page, 'state().cash') > cash_before, f'{cash_before} -> {hb(page, "state().cash")}')
    check('street hands over to the yard', wait_for(page, "window.HALF_BAKED.scene() === 'yard'", 10))

    # Boss: fight with real strikes (J). Vance may win a bout; the bout restarts, the boss keeps its hits.
    time.sleep(0.5); clear_dialog(page)
    page.screenshot(path=str(OUT / 'yard-start.png'))
    end = time.time() + 150
    shots = 0
    while time.time() < end and hb(page, 'scene()') == 'yard':
        if hb(page, 'talk.open'):
            page.keyboard.press('Enter'); time.sleep(0.3); continue
        bp = hb(page, 'W().H.boss.body') if False else None
        page.keyboard.press('KeyJ'); time.sleep(0.18)
        if shots < 1 and hb(page, 'bossHP()') is not None and hb(page, 'bossHP()') < 100:
            page.screenshot(path=str(OUT / 'yard-hit.png')); shots += 1
        hp = hb(page, 'bossHP()')
        if hp is not None and hp <= 0:
            break
        # Stay near Vance so the strikes reach him.
        hb(page, "teleportBoss(hbBossX, hbBossY)") if False else None
    hp_end = hb(page, 'bossHP()')
    check('boss takes damage from strikes', hp_end is not None and hp_end < 100, hp_end)
    # The boss's defeat line and the results: press through the dialogue as a player would.
    end = time.time() + 30
    while time.time() < end and hb(page, 'scene()') != 'results':
        if hb(page, 'talk.open'): page.keyboard.press('Enter')
        time.sleep(0.3)
    check('boss falls and the results screen shows', hb(page, 'scene()') == 'results', hb(page, 'scene()'))
    time.sleep(1.0)
    page.screenshot(path=str(OUT / 'results.png'))
    page.keyboard.press('Enter')
    check('results return to the title', wait_for(page, "window.HALF_BAKED.scene() === 'title'", 8))

    check('no page errors', not [e for e in errors if e.startswith('PAGEERROR')], errors[:5])
    print('errors logged:', len(errors))
    for e in errors[:10]: print(' ', e)
    browser.close()

passed = sum(1 for c in log if c['ok'])
print(f'{passed}/{len(log)} checks passed')
(OUT / 'playthrough.json').write_text(json.dumps(log, indent=1))
