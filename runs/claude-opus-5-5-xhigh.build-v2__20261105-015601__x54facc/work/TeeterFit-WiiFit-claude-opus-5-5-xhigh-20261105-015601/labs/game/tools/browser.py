"""Teeter Fit's browser checks, on the built file over file://. Prints only failures and one count line.
Usage: python3 labs/game/tools/browser.py <html> [stage ...]   Stages: boot keys pad attract pause tenfoot touch about standalone webkit credits sound mouse"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

HTML = os.path.abspath(sys.argv[1])
ONLY = sys.argv[2:]
FLAGS = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
QUERY = '?gfx.warmUp=asked&gfx.governor=false&quality=low'
PAD = """
window.__padState = { id: 'Test DualSense (STANDARD GAMEPAD Vendor: 054c)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
window.__padOn = false;
navigator.getGamepads = () => (window.__padOn ? [window.__padState, null, null, null] : [null, null, null, null]);
window.__padDown = (i) => { window.__padOn = true; const b = window.__padState.buttons[i]; b.pressed = true; b.touched = true; b.value = 1; window.__padState.timestamp += 1; };
window.__padUp = (i) => { const b = window.__padState.buttons[i]; b.pressed = false; b.touched = false; b.value = 0; window.__padState.timestamp += 1; };
"""
results = {'pass': 0, 'fail': 0}
seen_errors = set()


def check(name, ok, detail=''):
    if ok:
        results['pass'] += 1
    else:
        results['fail'] += 1
        print(f'FAIL {name}: {detail}'[:600])


def game(pg):
    errors = pg.evaluate('() => (window.__engine && window.__engine.errors || []).map((e) => e.code + " " + e.message)')
    if errors and errors[0] not in seen_errors:
        seen_errors.add(errors[0])
        check('the engine logged an error', False, errors[0])
    return pg.evaluate('() => window.__game')


def open_page(browser, query=QUERY, fresh=True, init=PAD, **ctx):
    context = browser.new_context(viewport={'width': 1920, 'height': 1080}, **ctx)
    pg = context.new_page()
    pg.errors = []
    pg.on('pageerror', lambda e: pg.errors.append(str(e)[:300]))
    pg.on('console', lambda m: pg.errors.append(m.text[:300]) if m.type == 'error' else None)
    if init:
        pg.add_init_script(init)
    pg.goto('file://' + HTML + query)
    pg.wait_for_function('() => window.__game && window.__engine && window.__engine.ready', timeout=180000)
    pg.wait_for_timeout(300)
    return pg


def wait_for(pg, js, ms=20000, step=100):
    end = time.time() + ms / 1000
    while time.time() < end:
        if pg.evaluate(js):
            return True
        pg.wait_for_timeout(step)
    return False


def key(pg, code, wait=220):
    # Held across a frame or two: on a software renderer a frame can take longer than a tap.
    pg.keyboard.down(code)
    pg.wait_for_timeout(70)
    pg.keyboard.up(code)
    pg.wait_for_timeout(wait)


def pad(pg, i, wait=340):
    pg.evaluate('(i) => __padDown(i)', i)
    pg.wait_for_timeout(wait)
    pg.evaluate('(i) => __padUp(i)', i)
    pg.wait_for_timeout(wait)


def wake(pg):
    """A browser shows a pad only after a first press: this is that moment."""
    pg.evaluate('() => { __padOn = true; }')
    pg.wait_for_timeout(300)


def focus(pg):
    return pg.evaluate("() => { const list = [...document.querySelectorAll('[data-ui=item][data-focus=true]')].filter((e) => e.offsetParent); const e = list[list.length - 1]; return e ? e.dataset.id : null; }")


def act(pg, name, args=None):
    pg.evaluate('([n, a]) => __engine.actions.run(n, a)', [name, args or {}])


def small_text(pg, limit=27.5):
    return pg.evaluate("""(limit) => {
      const out = [];
      const root = document.querySelector('.tf-root');
      if (!root) return out;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;
        const el = node.parentElement;
        const s = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        if (s.display === 'none' || s.visibility === 'hidden' || box.width === 0 || box.height === 0) continue;
        let hidden = false;
        for (let p = el; p; p = p.parentElement) if (getComputedStyle(p).display === 'none') hidden = true;
        if (hidden) continue;
        const size = parseFloat(s.fontSize);
        if (size < limit) out.push(`${size.toFixed(1)}px: ${node.textContent.trim().slice(0, 50)}`);
      }
      return out;
    }""", limit)


def rows_over_six(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('.tf-rows')].filter((r) => r.offsetParent && r.children.length > 6).map((r) => r.children.length)""")


def stage_boot(browser):
    pg = open_page(browser)
    state = pg.evaluate('() => ({ ready: __engine.ready, errors: __engine.errors.length, downgrades: (__engine.info && __engine.info().downgrades) || [] })')
    check('boot: engine ready', state['ready'] is True, state)
    check('boot: zero errors', state['errors'] == 0, pg.evaluate('() => JSON.stringify(__engine.errors).slice(0, 400)'))
    check('boot: title first', game(pg)['screen'] == 'title', game(pg))
    check('boot: music at 10% on a fresh save', abs(game(pg)['volumes']['music'] - 0.1) < 1e-6, game(pg)['volumes'])
    check('boot: no page errors', not pg.errors, pg.errors[:3])
    pg.context.close()


def stage_keys(browser):
    pg = open_page(browser)
    # Keys: the same flows.
    check('keys: Begin has focus', focus(pg) == 'begin', focus(pg))
    key(pg, 'ArrowDown')
    # Free Play is disabled on a fresh save, so it skips to Group Class.
    check('keys: down skips the disabled row', focus(pg) == 'group', focus(pg))
    key(pg, 'ArrowDown')
    check('keys: down again', focus(pg) == 'settings', focus(pg))
    key(pg, 'Enter')
    check('keys: Enter opens Settings', game(pg)['screen'] == 'settings', game(pg)['screen'])
    # Music slider by keys, persisted across a reload.
    key(pg, 'ArrowRight')
    check('keys: right raises the music', abs(game(pg)['volumes']['music'] - 0.15) < 1e-6, game(pg)['volumes'])
    key(pg, 'Escape')
    check('keys: Esc closes it', game(pg)['screen'] == 'title', game(pg)['screen'])
    # Hover moves focus, click picks.
    box = pg.evaluate("() => { const e = document.querySelector('[data-ui=item][data-id=about]'); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }")
    pg.mouse.move(box[0], box[1])
    pg.mouse.move(box[0] + 5, box[1] + 2)
    pg.wait_for_timeout(250)
    check('mouse: hover moves focus', focus(pg) == 'about', focus(pg))
    pg.mouse.click(box[0] + 5, box[1] + 2)
    pg.wait_for_timeout(300)
    check('prompts: mouse on a click', game(pg)['device'] == 'mouse', game(pg)['device'])
    check('mouse: click picks', game(pg)['screen'] == 'about', game(pg)['screen'])
    key(pg, 'Escape')
    check('prompts: keys the frame a key is pressed', game(pg)['device'] == 'keyboard', game(pg)['device'])
    # Persisted across reload.
    pg.reload()
    pg.wait_for_function('() => window.__game && window.__engine && window.__engine.ready', timeout=180000)
    pg.wait_for_timeout(300)
    check('settings: volumes persist across reload', abs(game(pg)['volumes']['music'] - 0.15) < 1e-6, game(pg)['volumes'])
    # Erase asks in-game: never confirm().
    pg.on('dialog', lambda d: (check('settings: no native dialogs', False, d.message), d.dismiss()))
    key(pg, 'ArrowDown'); key(pg, 'ArrowDown')
    key(pg, 'Enter')
    for _ in range(26):
        if focus(pg) == 'erase':
            break
        key(pg, 'ArrowDown', 120)
        if focus(pg) == '__more':
            key(pg, 'Enter', 160)
    check('settings: Erase is reachable', focus(pg) == 'erase', focus(pg))
    key(pg, 'Enter')
    check('settings: Erase asks in-game', pg.evaluate("() => !!document.querySelector('[data-panel=erase]')"), '')
    key(pg, 'Escape')
    check('settings: backing out keeps it', not pg.evaluate("() => !!document.querySelector('[data-panel=erase]')"), '')
    key(pg, 'Escape')
    pg.context.close()


def stage_pad(browser):
    pg = open_page(browser)
    wake(pg)
    pad(pg, 13)  # D-pad down
    check('pad: D-pad moves focus', focus(pg) == 'group', focus(pg))
    check('pad: device follows', game(pg)['device'] == 'gamepad', game(pg)['device'])
    html = pg.evaluate("() => document.querySelector('[data-ui=title-prompts]').innerHTML")
    check('pad: PlayStation glyph by default', '<svg' in html and 'data-kind="pad"' in html, html[:200])
    # Stick moves focus too.
    pg.evaluate('() => { __padOn = true; __padState.axes[1] = 1; }')
    pg.wait_for_timeout(180)
    pg.evaluate('() => { __padState.axes[1] = 0; }')
    pg.wait_for_timeout(220)
    check('pad: the stick moves focus', focus(pg) == 'settings', focus(pg))
    pad(pg, 0)  # Cross
    check('pad: Cross picks', game(pg)['screen'] == 'settings', game(pg)['screen'])
    # Xbox icons.
    pad(pg, 13); pad(pg, 13); pad(pg, 13)
    check('pad: reach Button icons', focus(pg) == 'glyphs', focus(pg))
    pad(pg, 15)  # right
    check('pad: Settings switch to Xbox', game(pg)['glyphs'] == 'xbox', game(pg)['glyphs'])
    pad(pg, 1)  # Circle
    check('pad: Circle cancels', game(pg)['screen'] == 'title', game(pg)['screen'])
    html = pg.evaluate("() => document.querySelector('[data-ui=title-prompts]').innerHTML")
    check('pad: Xbox shows A', '>A<' in html, html[:200])
    # A key press changes prompts the same frame.
    key(pg, 'KeyZ')
    pg.wait_for_timeout(100)
    html = pg.evaluate("() => document.querySelector('[data-ui=title-prompts]').innerHTML")
    check('pad: prompts change to keys', 'data-kind="key"' in html, html[:200])
    # Back to PlayStation, for later stages' sake.
    pg.context.close()


def stage_attract(browser):
    pg = open_page(browser)
    t = time.time()
    ok = wait_for(pg, '() => window.__game.attract === true', 16000)
    took = time.time() - t
    check('attract: starts on idle', ok, f'{took:.1f}s')
    check('attract: not before about 10 s', took > 8.5, f'{took:.1f}s')
    seen = set()
    end = time.time() + 70
    while time.time() < end:
        g = game(pg)
        if g['event']:
            seen.add(g['event'])
        pg.wait_for_timeout(500)
    check('attract: shows several activities', len(seen) >= 3, seen)
    check('attract: no errors', pg.evaluate('() => __engine.errors.length') == 0 and not pg.errors, pg.errors[:2])
    key(pg, 'KeyZ', 400)
    check('attract: a key exits', game(pg)['attract'] is False and game(pg)['screen'] == 'title', game(pg))
    save = pg.evaluate("() => Object.keys(localStorage).filter((k) => k.includes('save')).length")
    check('attract: the save is untouched', save == 0, save)
    ok = wait_for(pg, '() => window.__game.attract === true', 16000)
    check('attract: comes back', ok)
    pg.mouse.click(600, 600)
    pg.wait_for_timeout(500)
    check('attract: a click exits', game(pg)['attract'] is False, game(pg)['attract'])
    ok = wait_for(pg, '() => window.__game.attract === true', 16000)
    pg.evaluate('() => { __padOn = true; }')
    pad(pg, 0)
    pg.wait_for_timeout(300)
    check('attract: a pad press exits', game(pg)['attract'] is False, game(pg)['attract'])
    pg.context.close()


def begin(pg):
    """Keyboard: Begin, the pier's Step off."""
    key(pg, 'Enter', 400)
    if game(pg)['screen'] == 'pier':
        key(pg, 'ArrowDown'); key(pg, 'ArrowDown')
        key(pg, 'Enter', 800)


def stage_pause(browser):
    pg = open_page(browser)
    begin(pg)
    check('pause: roaming after Begin', game(pg)['mode'] == 'roam', game(pg))
    key(pg, 'Escape', 400)
    check('pause: Esc opens it', game(pg)['screen'] == 'pause', game(pg)['screen'])
    rows = pg.evaluate("() => [...document.querySelectorAll('[data-panel=pause] [data-ui=item]')].map((e) => e.dataset.id)")
    check('pause: first page', rows[:3] == ['resume', 'restart', 'island'], rows)
    for _ in range(6):
        if focus(pg) == '__more':
            break
        key(pg, 'ArrowDown', 120)
    key(pg, 'Enter', 200)
    check('pause: more rows', focus(pg) == 'dev', focus(pg))
    key(pg, 'Enter', 300)
    check('dev: opens from pause', game(pg)['screen'] == 'dev', game(pg)['screen'])
    key(pg, 'Enter', 250)  # Live sliders
    key(pg, 'Enter', 250)  # Wobble group
    before = pg.evaluate("() => document.querySelector('[data-panel=dev] [data-ui=item][data-focus=true] [data-value]').textContent")
    key(pg, 'ArrowRight', 200)
    after = pg.evaluate("() => document.querySelector('[data-panel=dev] [data-ui=item][data-focus=true] [data-value]').textContent")
    check('dev: a slider changes the setting', before != after, f'{before} {after}')
    # Reset restores.
    for _ in range(8):
        if pg.evaluate("() => { const f = document.querySelector('[data-panel=dev] [data-ui=item][data-focus=true]'); return f && f.dataset.id.startsWith('reset'); }"):
            break
        key(pg, 'ArrowDown', 120)
        if focus(pg) == '__more':
            key(pg, 'Enter', 160)
    key(pg, 'Enter', 200)
    gain = pg.evaluate("() => __engine.describe('setting', 'game.wobble.gain').fields.find((f) => f.key === 'default').value")
    # A jump works.
    key(pg, 'Escape', 150); key(pg, 'Escape', 150)
    for _ in range(6):
        if focus(pg) == 'jumps':
            break
        key(pg, 'ArrowDown', 120)
    check('dev: Jumps row', focus(pg) == 'jumps', focus(pg))
    key(pg, 'Enter', 250)
    for _ in range(6):
        if focus(pg) == 'day3':
            break
        key(pg, 'ArrowDown', 120)
    key(pg, 'Enter', 800)  # To Day 3
    check('dev: a jump works', game(pg)['day'] == 3 and game(pg)['stack'] == [], game(pg))
    check('dev: the default is readable', gain == 14, gain)
    check('pause: no errors', not pg.errors, pg.errors[:2])
    # Slider changes behaviour: instability up, a still body wanders further.
    pg.context.close()


def scan(pg, name):
    small = small_text(pg)
    check(f'10-foot: {name}: text 28 px or more', not small, small[:6])
    over = rows_over_six(pg)
    check(f'10-foot: {name}: six rows at most', not over, over)


def stage_tenfoot(browser):
    pg = open_page(browser)
    scan(pg, 'title')
    key(pg, 'ArrowDown'); key(pg, 'ArrowDown'); key(pg, 'Enter', 300)
    scan(pg, 'settings')
    key(pg, 'Escape')
    key(pg, 'ArrowDown'); key(pg, 'Enter', 300)
    scan(pg, 'about')
    key(pg, 'Escape')
    key(pg, 'ArrowUp'); key(pg, 'ArrowUp'); key(pg, 'ArrowUp')
    check('10-foot: back at Begin', focus(pg) == 'begin', focus(pg))
    begin(pg)
    pg.wait_for_timeout(600)
    scan(pg, 'island')
    key(pg, 'Tab', 400)
    check('programme opens with Tab', game(pg)['screen'] == 'programme', game(pg)['screen'])
    scan(pg, 'programme')
    key(pg, 'Escape')
    key(pg, 'Escape', 300)
    scan(pg, 'pause')
    key(pg, 'Enter', 300)
    for event in ['morning', 'poseA', 'pond', 'reps', 'step', 'line', 'paddle', 'garden', 'plunge', 'hoop', 'jog', 'group', 'tilt']:
        act(pg, 'game.start', {'event': event})
        pg.wait_for_timeout(1200)
        scan(pg, event)
        act(pg, 'game.finish', {'score': 800})
        pg.wait_for_timeout(1400)
        if game(pg)['screen'] == 'results':
            scan(pg, f'{event} results')
            pg.wait_for_timeout(800)
            key(pg, 'Enter', 700)
        if game(pg)['mode'] == 'event':  # the finale leads to the last check
            act(pg, 'game.finish', {'score': 800})
            pg.wait_for_timeout(1900)
            key(pg, 'Enter', 700)
    check('10-foot: no errors', not pg.errors, pg.errors[:3])
    pg.context.close()


def stage_touch(browser, playwright):
    for profile in ['iPhone 14', 'iPad Pro 11']:
        spec = dict(playwright.devices[profile])
        spec.pop('default_browser_type', None)
        context = browser.new_context(**spec)
        pg = context.new_page()
        pg.goto('file://' + HTML + QUERY)
        pg.wait_for_function('() => window.__game && window.__engine && window.__engine.ready', timeout=180000)
        pg.wait_for_timeout(500)
        text = pg.evaluate("() => { const e = document.querySelector('[data-ui=touchonly]'); return e && getComputedStyle(e).display !== 'none' ? e.textContent : ''; }")
        check(f'touch {profile}: the message', 'Controller or keyboard required' in text, text)
        check(f'touch {profile}: no touch controls', pg.evaluate("() => ![...document.querySelectorAll('[data-ui=stick], .touch-stick, .touch-button, [data-touch]')].some((e) => e.getBoundingClientRect().width > 0)"), '')
        ok = wait_for(pg, '() => window.__game.attract === true', 16000)
        check(f'touch {profile}: attract runs', ok, game(pg))
        box = pg.evaluate("() => { const e = document.querySelector('[data-id=touch-settings]'); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2, b.width]; }")
        pg.evaluate("() => window.__game")
        # A tap never starts play.
        pg.touchscreen.tap(100, 300)
        pg.wait_for_timeout(300)
        check(f'touch {profile}: a tap does not start play', game(pg)['stack'].count('pier') == 0 and game(pg)['mode'] in ('front', 'event', 'results', ''), game(pg))
        context.close()
        # Settings by tap, before attract.
        context = browser.new_context(**spec)
        pg = context.new_page()
        pg.goto('file://' + HTML + QUERY)
        pg.wait_for_function('() => window.__game && window.__engine && window.__engine.ready', timeout=180000)
        pg.wait_for_timeout(300)
        box = pg.evaluate("() => { const e = document.querySelector('[data-id=touch-settings]'); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }")
        pg.touchscreen.tap(box[0], box[1])
        pg.wait_for_timeout(400)
        check(f'touch {profile}: Settings opens by tap', game(pg)['screen'] == 'settings', game(pg)['screen'])
        context.close()


def stage_about(browser):
    sys.path.insert(0, os.getcwd())
    pg = open_page(browser)
    key(pg, 'ArrowDown'); key(pg, 'ArrowDown'); key(pg, 'ArrowDown'); key(pg, 'Enter', 300)
    check('about: opens', game(pg)['screen'] == 'about', game(pg)['screen'])
    texts = []
    seen = set()
    for _ in range(30):
        t = pg.evaluate("() => document.querySelector('[data-ui=about]').innerText")
        if t in seen:
            break
        seen.add(t)
        texts.append(t)
        # The panel and what is in it: a page's foot once fell off the panel, and the screen, unseen.
        over = pg.evaluate("() => { const e = document.querySelector('[data-panel=about]'); const b = e.getBoundingClientRect(); const f = e.lastElementChild.getBoundingClientRect(); return b.bottom > innerHeight || b.top < 0 || f.bottom > b.bottom || f.bottom > innerHeight; }")
        check(f'about: page {len(texts)} fits', not over, t[:60])
        key(pg, 'ArrowRight', 160)
    whole = '\n'.join(texts)
    # Every value and answer itself, not only its label: the hand-in's text must be what the screen shows.
    flat = ' '.join(whole.split())
    told = json.load(open('../exit-interview.json'))
    answers = list(told['sourceInformation'].values()) + told['testingFeedback'] + told['engineFeedback'] + told['promptFeedback']
    check('about: the interview has all its answers', len(answers) == 15 + 4 + 6 + 4, str(len(answers)))
    for answer in answers:
        check(f'about: says "{answer[:40]}"', ' '.join(answer.split()) in flat, answer[:90])
    dump = os.environ.get('TEETER_ABOUT_DUMP')
    if dump:
        with open(dump, 'w') as out:
            out.write('\n\n=== page ===\n'.join(texts))
    for label in ['Date', 'Source', 'Plan', 'Genre', 'Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage']:
        check(f'about: {label}', f'{label}:' in whole, '')
    for q in ['How many issues did testing catch?', 'How many would be considered critical', 'most helpful test', 'least helpful test', 'like most about the engine', 'get stuck or guess wrong', 'most important thing you had to build', 'hardest part about using the engine', 'What did you change in the engine', 'change one thing about the engine', 'like most about this prompt', 'What was confusing', 'hardest thing to do', 'change in this prompt']:
        check(f'about: {q}', q in whole, '')
    check('about: credits', 'my-3dge (MIT)' in whole and 'AI Hub' in whole and 'Mesh2Motion' in whole, '')
    check('about: usage line', 'added on import' in whole, '')
    pg.context.close()


def stage_standalone(browser):
    pg = open_page(browser, init=None)
    state = pg.evaluate("() => ({ client: !!window.AIHub, active: window.AIHub && window.AIHub.active, nativeRandom: /native code/.test(Math.random.toString()), seeded: window.AIHub && window.AIHub.seeded })")
    check('standalone: client is there', state['client'], state)
    check('standalone: client inactive', state['active'] is False, state)
    check('standalone: Math.random untouched', state['nativeRandom'], state)
    for code in ['Enter', 'Space', 'Enter', 'Space']:
        key(pg, code, 250)
    drawn = pg.evaluate("() => __engine.ready === true && !!document.querySelector('canvas')")
    check('standalone: drawn', drawn, '')
    check('standalone: no errors', pg.evaluate('() => __engine.errors.length') == 0 and not pg.errors, pg.errors[:3])
    pg.context.close()


def stage_calm(pg):
    # Section 3: calm softens the sound and warms the picture, and leaving puts them back.
    begin(pg)
    pg.evaluate("() => { __engine.actions.run('game.start', { event: 'pond' }); __engine.set('game.botSeat', true); }")
    check('calm: good breathing raises it', wait_for(pg, '() => window.__game.calm > 0', 90000), game(pg).get('calm'))
    check('calm: softens the effects', pg.evaluate("() => __tfAudio.volume('effects')") < 1, '')
    pg.evaluate("() => { __engine.set('game.botSeat', false); __engine.actions.run('game.leave', {}); }")
    check('calm: leaving puts it back', wait_for(pg, '() => window.__game.calm === 0', 20000), game(pg).get('calm'))
    check('calm: the effects come back', pg.evaluate("() => __tfAudio.volume('effects')") == 1, '')


def stage_sound(browser):
    pg = open_page(browser)
    key(pg, 'KeyZ', 400)  # the first gesture starts the audio
    stage_calm(pg)
    state = pg.evaluate("() => { const a = window.__tfAudio; return a ? { music: a.volume('music'), state: a.state, info: a.info() } : null; }")
    check('sound: bus at 10%', state is not None and abs(state['music'] - 0.1) < 1e-6, state)
    check('sound: running after a gesture', state is not None and state['state'] == 'running', state and state['state'])
    level = pg.evaluate("""async () => {
      const a = window.__tfAudio; const ctx = a.context;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      a.play('sfx:vo.tare.3', { vol: 1 });
      return ctx.state;
    }""")
    check('sound: a voice plays', level == 'running', level)
    html = open(HTML, encoding='utf8', errors='ignore').read()
    for bad in ['data:audio', '.mp3"', '.wav"', '.ogg"']:
        check(f'sound: no audio files: {bad}', bad not in html, '')
    pg.context.close()


def stage_mouse(browser):
    pg = open_page(browser)
    begin(pg)
    act(pg, 'game.start', {'event': 'ring'})
    pg.wait_for_timeout(600)
    pg.mouse.click(960, 300)
    pg.wait_for_timeout(400)
    locked = pg.evaluate('() => !!document.pointerLockElement')
    check('mouse: a click takes the pointer in an activity', locked, locked)
    if locked:
        wait_for(pg, "() => __game.phase === 'play'", 9000)
        # Headless Chromium reports no movement under pointer lock: the page's own listener gets a stand-in.
        for k in range(16):
            pg.evaluate("() => dispatchEvent(new PointerEvent('pointermove', { movementX: 40, movementY: 0, pointerType: 'mouse' }))")
            pg.wait_for_timeout(30)
        x = pg.evaluate("() => __engine.state('wobble').entities[0].wobble.mx")
        check('mouse: pointer-locked movement leans', abs(x) > 0.02, x)
    pg.context.close()


def to_results(pg, leave):
    act(pg, 'game.finish', {'score': 800})
    wait_for(pg, "() => __game.screen === 'results'", 6000)
    leave()
    pg.wait_for_timeout(600)


def play_to_credits(pg, confirm, plan, label):
    """Every Programme, through the page's own menus, with one kind of input. Activities finish at once by the dev action."""
    for _ in range(420):
        g = game(pg)
        if pg.evaluate("() => !!document.querySelector('[data-ui=credits]')"):
            break
        if g['screen'] == 'results' or g['screen'] == 'evening':
            pg.wait_for_timeout(800)
            confirm(); pg.wait_for_timeout(700)
            continue
        if g['mode'] == 'event':
            act(pg, 'game.finish', {'score': 800})
            pg.wait_for_timeout(1000)
            continue
        if g['screen'] == 'board':
            key(pg, 'Escape', 300)
            continue
        if g['screen'] == 'programme':
            confirm(); pg.wait_for_timeout(900)
            continue
        plan(); pg.wait_for_timeout(500)
    check(f'{label}: reaches the credits', pg.evaluate("() => !!document.querySelector('[data-ui=credits]')"), game(pg))
    check(f'{label}: no errors', not pg.errors, pg.errors[:3])


def stage_credits(browser):
    pg = open_page(browser)
    wake(pg)
    pad(pg, 0, 500)
    if game(pg)['screen'] == 'pier':
        pad(pg, 13); pad(pg, 13); pad(pg, 0, 900)
    check('credits (pad): roaming', game(pg)['mode'] == 'roam', game(pg))
    play_to_credits(pg, lambda: pad(pg, 0), lambda: pad(pg, 3), 'credits (pad)')
    pg.context.close()
    pg = open_page(browser)
    begin(pg)
    play_to_credits(pg, lambda: key(pg, 'Enter'), lambda: key(pg, 'Tab'), 'credits (keyboard)')
    pg.context.close()


def stage_webkit(playwright):
    try:
        browser = playwright.webkit.launch()
    except Exception as e:
        check('webkit: launches', False, str(e)[:200])
        return
    context = browser.new_context()
    pg = context.new_page()
    pg.goto('file://' + HTML)
    ok = wait_for(pg, "() => document.getElementById('msg') && /needs a browser with WebGPU/.test(document.getElementById('msg').textContent)", 30000)
    check('webkit: the friendly no-WebGPU page', ok, pg.evaluate("() => document.body.innerText.slice(0, 200)"))
    browser.close()


def stage_roam(browser):
    pg = open_page(browser)
    begin(pg)
    act(pg, 'game.go', {'station': 'plaza'})
    pg.wait_for_timeout(500)
    where = lambda: pg.evaluate("() => { const e = __engine.state('cast').entities.find((x) => x.cast.who === 'guest'); return [e.actor.x, e.actor.z]; }")
    a = where()
    pg.keyboard.down('KeyW')
    pg.wait_for_timeout(1500)
    pg.keyboard.up('KeyW')
    pg.wait_for_timeout(200)
    b = where()
    check('roam: W walks', abs(a[0] - b[0]) + abs(a[1] - b[1]) > 1, f'{a} {b}')
    check('roam: the chase camera', game(pg)['camera'].startswith('cam3=chase'), game(pg)['camera'])
    # The thing in view: walk up to the board by the dev's go, face it, and use it.
    act(pg, 'game.go', {'station': 'plaza'})
    pg.wait_for_timeout(400)
    found = pg.evaluate("() => __game.focus")
    for _ in range(14):
        if pg.evaluate("() => __game.focus") >= 0:
            break
        pg.keyboard.down('KeyD'); pg.wait_for_timeout(300); pg.keyboard.up('KeyD')
    check('roam: something comes into view', pg.evaluate("() => __game.focus") >= 0, found)
    check('roam: its prompt shows', pg.evaluate("() => { const e = document.querySelector('[data-ui=prompt]'); return !!e && getComputedStyle(e).display !== 'none' && e.innerText.length > 0; }"), '')
    key(pg, 'KeyE', 500)
    check('roam: using it answers', pg.evaluate("() => __game.speech.length > 0 || __game.mode === 'event' || __game.stack.length > 0"), game(pg))
    check('roam: no errors', not pg.errors, pg.errors[:3])
    pg.context.close()


def stage_group(browser):
    pg = open_page(browser)
    wake(pg)
    key(pg, 'ArrowDown'); key(pg, 'Enter', 400)
    check('group: the join screen', game(pg)['screen'] == 'join', game(pg)['screen'])
    key(pg, 'Space', 300)
    pad(pg, 0)
    lit = pg.evaluate("() => [...document.querySelectorAll('[data-mat]')].map((m) => m.dataset.on)")
    check('group: mats light as people join', lit[:2] == ['true', 'true'], lit)
    key(pg, 'Space', 900)
    check('group: starts on a joined press', game(pg)['event'] == 'group' and game(pg)['mode'] == 'event', game(pg))
    pg.evaluate('() => { __padState.axes[0] = 1; }')
    pg.wait_for_timeout(900)
    seats = pg.evaluate("() => __engine.state('seat').entities.map((e) => [e.seat.index, e.seat.kind, e.seat.lx])")
    check('group: the second seat reads its pad', seats[1][1] == 'pad' and seats[1][2] > 0.5, seats)
    check('group: empty seats go to CPU guests', seats[3][1] == 'cpu', seats)
    shown = "() => [...document.querySelectorAll('[data-ui=seatdisc]')].filter((d) => d.parentElement.style.display !== 'none' && d.style.display !== 'none').length"
    check('group: every seat gets a small disc', wait_for(pg, f'({shown})() === 4', 45000), pg.evaluate(shown))
    check('group: the big disc steps aside', pg.evaluate("() => document.querySelector('[data-ui=disc]').style.display") == 'none', '')
    moved = "() => Math.abs(Number(document.querySelector('[data-seat=\"1\"] .dot').getAttribute('cx'))) > 5"
    check("group: the second player's disc follows their pad", wait_for(pg, f'({moved})()', 30000), '')
    check('group: no errors', not pg.errors, pg.errors[:3])
    pg.context.close()


STAGES = ['boot', 'keys', 'pad', 'attract', 'pause', 'roam', 'group', 'tenfoot', 'touch', 'about', 'standalone', 'sound', 'mouse', 'credits', 'webkit']


def memory_gb():
    with open('/proc/meminfo') as f:
        for line in f:
            if line.startswith('MemAvailable'):
                return int(line.split()[1]) / 1048576
    return 99


def wait_for_memory(need=4.0, patience=420):
    """Other agents share this machine, and earlyoom ends the biggest browser when memory runs out: wait for room."""
    end = time.time() + patience
    while memory_gb() < need and time.time() < end:
        time.sleep(10)


with sync_playwright() as p:
    for stage in STAGES:
        if ONLY and stage not in ONLY:
            continue
        for attempt in range(4):
            wait_for_memory()
            browser = None
            before = dict(results)
            try:
                if stage == 'webkit':
                    stage_webkit(p)
                else:
                    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), args=FLAGS)
                    if stage == 'touch':
                        stage_touch(browser, p)
                    else:
                        globals()[f'stage_{stage}'](browser)
                break
            except Exception as e:
                text = str(e)
                if ('closed' in text or 'crashed' in text) and attempt < 3:
                    # Memory ran out, not a bug in the game: this stage again, when there is room.
                    results.update(before)
                    time.sleep(30)
                    continue
                check(f'{stage}: stage crashed', False, text[:400])
                break
            finally:
                try:
                    if browser:
                        browser.close()
                except Exception:
                    pass
print(f"browser: {results['pass']} passed, {results['fail']} failed")
sys.exit(1 if results['fail'] else 0)
