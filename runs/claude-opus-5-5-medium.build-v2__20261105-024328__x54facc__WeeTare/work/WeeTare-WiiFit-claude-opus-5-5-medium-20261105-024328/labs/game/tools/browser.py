"""Plays the built file in headless Chromium through its devices: boot, pad, keys, mouse, 10-foot, attract, pause, dev, settings,
About, touch-only and the no-WebGPU page. Prints FAIL lines and a RESULT line. One or two browsers at once."""
import json, sys, time
from playwright.sync_api import sync_playwright

built = sys.argv[1]
URL = 'file://' + built + '?quality=low&post.look=look:session&gfx.governor=false'  # software rendering is slow; the picture isn't under test here
ARGS = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader']
PAD = """
window.__pad = null;
const real = navigator.getGamepads.bind(navigator);
navigator.getGamepads = () => {
  if (!window.__pad) return [null, null, null, null];
  return [window.__pad, null, null, null];
};
window.__press = (i, down) => {
  const buttons = Array.from({length: 17}, (_, k) => ({pressed: k === i && down, touched: k === i && down, value: k === i && down ? 1 : 0}));
  window.__pad = {id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: [0, 0, 0, 0], buttons};
};
"""
ok = fail = 0
def check(name, cond, detail=''):
    global ok, fail
    if cond: ok += 1
    else:
        fail += 1
        print('FAIL', name, str(detail)[:700])

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

def until(pg, js, secs=20):
    t = time.time()
    while time.time() - t < secs:
        try:
            if pg.evaluate(js): return True
        except Exception:
            pass
        time.sleep(0.2)
    return False

def tap_key(pg, key):
    pg.keyboard.press(key, delay=120)
    time.sleep(0.5)

def tap_pad(pg, i):
    pg.evaluate("(i)=>__press(i,true)", i)
    time.sleep(0.9)
    pg.evaluate("(i)=>__press(i,false)", i)
    time.sleep(0.5)

SMALL = """()=>{const out=[];const w=document.createTreeWalker(document.getElementById('wt'),NodeFilter.SHOW_TEXT);
 while(w.nextNode()){const n=w.currentNode;if(!n.textContent.trim())continue;const e=n.parentElement;if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none')continue;
 const r=e.getBoundingClientRect();if(!r.width)continue;if(parseFloat(cs.fontSize)<27.9)out.push(n.textContent.slice(0,30)+' '+cs.fontSize);}return out}"""
ROWS = "()=>Math.max(0,...[...document.querySelectorAll('#wt .wt-menu')].map(m=>m.children.length))"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=ARGS)
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080})
    ctx.add_init_script(PAD)
    pg = ctx.new_page()
    logs = []
    pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: logs.append(str(e)))
    requests = []
    pg.on('request', lambda r: requests.append(r.url) if not r.url.startswith(('file:', 'data:', 'blob:')) else None)
    pg.goto(URL)
    check('boot', boot(pg))
    check('no engine errors at boot', pg.evaluate("()=>__engine.errors.length===0"), pg.evaluate("()=>JSON.stringify(__engine.errors).slice(0,500)"))
    check('no WebGPU downgrade errors', pg.evaluate("()=>__engine.info().adapter!==null"))
    g = game(pg)
    check('title first', g['screen'] == 'title', g)
    check('music at 10% on a fresh save', abs(g['music'] - 0.1) < 1e-6, g)
    check('session client present and inactive', pg.evaluate("()=>window.AIHub&&window.AIHub.active===false"))
    check('Math.random untouched outside a session', pg.evaluate("()=>/native code/.test(String(Math.random))"))
    check('title text at 10 feet', not pg.evaluate(SMALL), pg.evaluate(SMALL))
    check('title menu at most six rows', pg.evaluate(ROWS) <= 6)
    check('title names the game', 'Wee Tare' in pg.inner_text('[data-ui=title]'))
    # sound, by numbers: a song and a voice through the real runtime, the music at its default 10%
    levels = pg.evaluate("()=>__game.probeAudio()")
    check('a song makes sound', levels['song'] > 0.01, levels)
    check('music at 10% is a whisper of itself', levels['quiet'] < levels['song'] * 0.2 and levels['quiet'] > 0, levels)
    check('a voice makes sound', levels['voice'] > 0.01, levels)
    # the hub's own standalone test: Enter, Space, Enter, Space, and nothing goes wrong
    for key in ['Enter', 'Space', 'Enter', 'Space']:
        tap_key(pg, key)
    check('standalone presses raise no errors', pg.evaluate("()=>__engine.errors.length===0"))
    check('the screen is drawn', pg.evaluate("()=>document.getElementById('view').width>0"))
    for _ in range(3):
        if game(pg)['screen'] == 'title': break
        if pg.locator('[data-ui=pier]').count():
            pg.reload()
            boot(pg)
        else:
            tap_key(pg, 'Escape')
    # keyboard and mouse on menus
    tap_key(pg, 'ArrowDown')
    check('keys move the focus', game(pg)['focus'] != 'begin', game(pg))
    check('prompts follow keys', game(pg)['device'] == 'keys')
    pg.hover('[data-id=settings]')
    time.sleep(0.5)
    check('hover moves the focus', game(pg)['focus'] == 'settings', game(pg))
    pg.click('[data-id=settings]')
    check('click picks', until(pg, "()=>__game.screen==='settings'"), game(pg))
    check('prompts follow the mouse', until(pg, "()=>__game.device==='mouse'", 5), game(pg))
    check('settings shows music at 10%', '10%' in pg.inner_text('[data-id=music]'))
    check('settings text at 10 feet', not pg.evaluate(SMALL), pg.evaluate(SMALL))
    check('settings at most six rows', pg.evaluate(ROWS) <= 6)
    # music persists
    pg.hover('[data-id=music]')
    time.sleep(0.4)
    tap_key(pg, 'ArrowRight')
    check('music slider moves', until(pg, "()=>Math.abs(__game.music-0.2)<1e-6", 5), game(pg))
    check('volumes kept', '0.2' in pg.evaluate("()=>localStorage.getItem('weetare:settings')||JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"))
    tap_key(pg, 'ArrowLeft')
    tap_key(pg, 'Escape')
    check('Esc goes back', until(pg, "()=>__game.screen==='title'"), game(pg))
    # the pad on menus, glyphs
    pg.evaluate("()=>__press(-1,false)")
    tap_pad(pg, 13)
    check('prompts follow the pad', game(pg)['device'] == 'pad', game(pg))
    check('D-pad moves the focus', until(pg, "()=>__game.focus!==''", 3))
    check('PlayStation glyphs by default', pg.evaluate("()=>getComputedStyle(document.getElementById('wt')).getPropertyValue('--ink')!==''&&document.getElementById('wt').dataset.pad==='ps'"))
    # the stick moves menus too, and Xbox letters show when asked
    focus0 = game(pg)['focus']
    pg.evaluate("()=>{const buttons=Array.from({length:17},()=>({pressed:false,touched:false,value:0}));window.__pad={id:'x (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0.9,0,0],buttons}}")
    moved = until(pg, "(()=>{const f=%r;return ()=>__game.focus!==f})()" % focus0, 4)
    pg.evaluate("()=>__press(-1,false)")
    check('the stick moves the focus', moved, game(pg))
    pg.keyboard.press('ArrowUp', delay=120)
    time.sleep(0.3)
    check('prompts change to keys at a key', game(pg)['device'] == 'keys', game(pg))
    # About
    for _ in range(6):
        if game(pg)['focus'] == 'about': break
        tap_key(pg, 'ArrowDown')
    tap_key(pg, 'Enter')
    check('About opens', until(pg, "()=>__game.screen==='about'"), game(pg))
    # the prompts on this screen: PlayStation glyphs for the pad, Xbox letters when set
    tap_pad(pg, 2)
    GLYPH = "()=>[...document.querySelectorAll('#wt [data-glyph]')].filter(g=>g.offsetParent!==null).map(g=>g.dataset.glyph)"
    check('PlayStation glyphs show', pg.evaluate(GLYPH) and set(pg.evaluate(GLYPH)) == {'ps'}, pg.evaluate(GLYPH))
    pg.evaluate("()=>{document.getElementById('wt').dataset.pad='xbox'}")
    check('Xbox letters show when set', set(pg.evaluate(GLYPH)) == {'xbox'}, pg.evaluate(GLYPH))
    pg.evaluate("()=>{document.getElementById('wt').dataset.pad='ps';window.__pad=null}")
    seen = ''
    for _ in range(7):
        seen += pg.evaluate("()=>(document.querySelector('[data-ui=about]')||{innerText:'MISSING '+__game.screen}).innerText") + '\n'
        check('About text fits a TV', pg.evaluate("()=>{const a=document.querySelector('.wt-about');return a.scrollHeight<=a.clientHeight+2}"), seen[-200:])
        tap_key(pg, 'ArrowRight')
    for word in ['Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'Credits', 'Wii Fit', 'PLAN.md', 'added on import', 'Date', 'Genre', 'Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage', 'How many issues', 'What did you like most', 'What would you change', 'my-3dge', '100STYLE']:
        check('About says ' + word, word in seen)
    check('no pending answers', 'pending' not in seen)
    tap_key(pg, 'Escape')
    until(pg, "()=>__game.screen==='title'")
    # attract: starts by itself, loops, leaves on input, never saves
    save0 = pg.evaluate("()=>localStorage.getItem('weetare:game')")
    t0 = time.time()
    pg.keyboard.press('Shift', delay=50)
    started = until(pg, "()=>__game.attract===true", 16)
    dt = time.time() - t0
    check('attract starts near 10 s', started and 9 <= dt <= 14.5, dt)
    ids = set()
    for _ in range(4):
        ids.add(game(pg)['event'])
        pg.evaluate("()=>__engine.step(1500)")
        time.sleep(0.4)
    check('attract shows several activities', len(ids) >= 3, ids)
    check('attract says DEMO', 'DEMO' in pg.inner_text('[data-ui=attract]'))
    pg.keyboard.press('KeyA', delay=60)
    check('a key leaves attract', until(pg, "()=>__game.attract===false&&__game.screen==='title'"), game(pg))
    until(pg, "()=>__game.attract===true", 16)
    pg.mouse.click(30, 30)
    check('a click leaves attract', until(pg, "()=>__game.attract===false"), game(pg))
    until(pg, "()=>__game.attract===true", 16)
    tap_pad(pg, 0)
    check('a pad press leaves attract', until(pg, "()=>__game.attract===false"), game(pg))
    pg.evaluate("()=>{window.__pad=null}")
    check('attract never touches the save', pg.evaluate("()=>localStorage.getItem('weetare:game')") == save0)
    # begin: the standalone hub test's presses, then the pier, the island
    pg.keyboard.press('Shift', delay=60)
    until(pg, "()=>__game.attract===false&&__game.screen==='title'")
    time.sleep(0.5)
    pg.click('[data-id=begin]')
    check('Begin opens the pier', until(pg, "()=>__game.screen==='pier'"), game(pg))
    pg.hover('[data-id=go]')
    until(pg, "()=>__game.focus==='go'", 5)
    tap_pad(pg, 0)
    check('Cross steps ashore', until(pg, "()=>__game.screen!=='pier'", 6), game(pg))
    pg.evaluate("()=>{window.__pad=null}")
    check('onto the island', until(pg, "()=>__game.mode==='roam'&&__game.screen==='roam'", 15), game(pg))
    pg.keyboard.press('Tab', delay=120)
    check('Tab opens the Programme', until(pg, "()=>__game.screen==='programme'", 6), game(pg))
    check('Programme at 10 feet', not pg.evaluate(SMALL), pg.evaluate(SMALL))
    tap_key(pg, 'Escape')
    until(pg, "()=>__game.screen==='roam'", 6)
    tap_pad(pg, 3)
    check('Triangle opens the Programme', until(pg, "()=>__game.screen==='programme'", 6), game(pg))
    tap_pad(pg, 1)
    check('Circle closes it', until(pg, "()=>__game.screen==='roam'", 6), game(pg))
    pg.evaluate("()=>{window.__pad=null}")
    # an activity, pause, dev mode
    act(pg, 'game.start', {'id': 'poseA'})
    check('an activity runs', until(pg, "()=>__game.event==='poseA'"), game(pg))
    pg.evaluate("()=>__engine.step(400)")
    time.sleep(1)
    check('Pose HUD at 10 feet', not pg.evaluate(SMALL), pg.evaluate(SMALL))
    before = pg.evaluate("()=>__engine.state('seat').entities[0].wobble.ty")
    pg.keyboard.down('KeyW')
    time.sleep(1.2)
    after = pg.evaluate("()=>__engine.state('seat').entities[0].wobble.ty")
    pg.keyboard.up('KeyW')
    check('W leans', after > before + 0.05, [before, after])
    pg.mouse.click(960, 300)
    time.sleep(0.6)
    locked = pg.evaluate("()=>!!document.pointerLockElement")
    mx0 = pg.evaluate("()=>__engine.state('seat').entities[0].wobble.mx")
    pg.evaluate("()=>{for(let k=0;k<5;k++)window.dispatchEvent(new PointerEvent('pointermove',{movementX:60,movementY:0,bubbles:true,pointerType:'mouse'}))}")
    time.sleep(0.6)
    mx1 = pg.evaluate("()=>__engine.state('seat').entities[0].wobble.mx")
    check('pointer-lock lean moves the CoB', not locked or mx1 != mx0, [locked, mx0, mx1])
    pg.keyboard.press('Escape', delay=120)
    pg.evaluate("()=>document.exitPointerLock&&document.exitPointerLock()")  # what a browser does with Esc under lock
    check('Esc pauses', until(pg, "()=>__game.screen==='pause'", 8), game(pg))
    tick = pg.evaluate("()=>__engine.info().tick")
    time.sleep(1)
    check('pause stops the sim', pg.evaluate("()=>__engine.info().tick") == tick)
    check('pause at most six rows', pg.evaluate(ROWS) <= 6)
    check('pause at 10 feet', not pg.evaluate(SMALL), pg.evaluate(SMALL))
    pg.click('[data-id=more]')
    time.sleep(0.4)
    pg.click('[data-id=controls]')
    check('Controls open', until(pg, "()=>__game.screen==='controls'"), game(pg))
    check('Controls at 10 feet', not pg.evaluate(SMALL), pg.evaluate(SMALL))
    pg.click('[data-id=footl]')
    time.sleep(0.4)
    pg.keyboard.press('KeyZ', delay=80)
    check('a key can be rebound', until(pg, "()=>document.querySelector('[data-id=footl]').innerText.includes('Z')", 6), pg.inner_text('[data-id=footl]'))
    tap_key(pg, 'Escape')
    until(pg, "()=>__game.screen==='pause'")
    pg.click('[data-id=less]')
    time.sleep(0.4)
    pg.click('[data-id=more]')
    time.sleep(0.4)
    pg.click('[data-id=dev]')
    check('pause reaches Dev Mode', until(pg, "()=>__game.screen==='dev'"), game(pg))
    PATH = 'game.wobble.noise'
    pg.evaluate("""(path)=>{const r=document.querySelector(`input[data-path="${path}"]`)||null;if(!r)return;r.value='7';r.dispatchEvent(new Event('input'))}""", PATH)
    if pg.evaluate("(p)=>!document.querySelector(`input[data-path=\"${p}\"]`)", PATH):
        for _ in range(8):
            tap_key(pg, 'ArrowDown')
            if pg.evaluate("(p)=>!!document.querySelector(`input[data-path=\"${p}\"]`)", PATH): break
        pg.evaluate("""(path)=>{const r=document.querySelector(`input[data-path="${path}"]`);r.value='7';r.dispatchEvent(new Event('input'))}""", PATH)
    time.sleep(0.4)
    check('a slider changes the setting', abs(pg.evaluate("(p)=>__game.setting(p)", PATH) - 7) < 0.1, pg.evaluate("(p)=>__game.setting(p)", PATH))
    pg.click('.drow >> nth=0')
    time.sleep(0.4)
    check('Reset restores the default', abs(pg.evaluate("(p)=>__game.setting(p)", PATH) - 3.5) < 1e-6, pg.evaluate("(p)=>__game.setting(p)", PATH))
    # every cheat and tool answers
    for tab, names in [(2, ['Bot plays for me', 'Bot plays for me', 'No topple', 'No topple', 'Give 10 pebbles']), (3, ['Time scale', 'Time scale', 'Time scale', 'Frame step', 'State overlay'])]:
        pg.click(f'.tab >> nth={tab}')
        time.sleep(0.3)
        for name in names:
            pg.click(f'.drow:has-text("{name}")')
            time.sleep(0.3)
    check('the state overlay shows', pg.locator('[data-ui=dev-overlay]').count() == 1)
    check('dev tools raise no errors', pg.evaluate("()=>__engine.errors.length===0"), pg.evaluate("()=>JSON.stringify(__engine.errors).slice(0,300)"))
    pg.click('.tab >> nth=1')
    time.sleep(0.3)
    pg.click('.drow >> nth=2')
    check('Jump to Day 3 works', until(pg, "()=>__game.day===3&&__game.mode==='roam'"), game(pg))
    # results at 10 feet, and the Noticeboard's pages by L1, R1 or Q, E
    act(pg, 'game.bot', {'skill': ''})
    act(pg, 'game.flags', {'noTopple': False, 'free': True})
    act(pg, 'game.start', {'id': 'reps'})
    until(pg, "()=>__game.event==='reps'")
    time.sleep(0.5)
    act(pg, 'game.finishAt', {'score': 800})
    check('results come', until(pg, "()=>__game.screen==='results'", 10), game(pg))
    check('results at 10 feet', not pg.evaluate(SMALL), pg.evaluate(SMALL))
    pg.click('[data-id=carry]')
    until(pg, "()=>__game.screen==='roam'", 8)
    pg.keyboard.press('Tab', delay=100)
    until(pg, "()=>__game.screen==='programme'", 6)
    pg.click('[data-id=board]')
    check('the Noticeboard opens', until(pg, "()=>__game.screen==='board'", 6), game(pg))
    check('Noticeboard at 10 feet', not pg.evaluate(SMALL), pg.evaluate(SMALL))
    first = pg.inner_text('.wt-grid')
    tap_key(pg, 'KeyE')
    check('E turns its page', pg.inner_text('.wt-grid') != first)
    tap_pad(pg, 4)
    pg.evaluate("()=>{window.__pad=null}")
    check('L1 turns it back', pg.inner_text('.wt-grid') == first)
    tap_key(pg, 'Escape')
    until(pg, "()=>__game.screen==='roam'", 6)
    # the way to the credits, by keys alone from here
    act(pg, 'game.day', {'day': 5})
    act(pg, 'game.flags', {'done': ['check', 'group', 'poseC']})
    act(pg, 'game.start', {'id': 'tilt'})
    check('the Great Tilt starts', until(pg, "()=>__game.event==='tilt'"), game(pg))
    pg.evaluate("()=>__engine.step(200)")
    time.sleep(1)
    act(pg, 'game.finishAt', {'score': 800})
    check('the last Morning Check follows', until(pg, "()=>__game.event==='check'", 10), game(pg))
    act(pg, 'game.finishAt', {'score': 900})
    check('then the credits', until(pg, "()=>__game.screen==='credits'", 10), game(pg))
    tap_key(pg, 'Enter')
    check('then Free Play', until(pg, "()=>__game.mode==='roam'&&__game.day===6", 10), game(pg))
    check('fetches nothing', not requests, requests[:3])
    check('no console errors', not logs, logs[:3])
    ctx.close()

    # Erase asks in-game, and volumes survive a reload: a fresh page in a fresh context, keeping storage in it
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080})
    ctx.add_init_script(PAD)
    pg = ctx.new_page()
    dialogs = []
    pg.on('dialog', lambda d: (dialogs.append(d.type), d.dismiss()))
    pg.goto(URL)
    boot(pg)
    pg.click('[data-id=settings]')
    until(pg, "()=>__game.screen==='settings'")
    pg.hover('[data-id=music]')
    time.sleep(0.4)
    tap_key(pg, 'ArrowRight')
    until(pg, "()=>Math.abs(__game.music-0.2)<1e-6", 5)
    time.sleep(0.5)
    pg.reload()
    boot(pg)
    check('volumes persist across a reload', abs(game(pg)['music'] - 0.2) < 1e-6, game(pg))
    pg.click('[data-id=settings]')
    time.sleep(0.5)
    for _ in range(2):
        pg.click('[data-id^=next]')
        time.sleep(0.3)
    pg.click('[data-id=erase]')
    check('Erase asks in-game', until(pg, "()=>document.querySelector('[data-id=yes]')!==null", 5) and not dialogs, dialogs)
    pg.click('[data-id=yes]')
    time.sleep(0.5)
    check('Erase resets music', abs(game(pg)['music'] - 0.1) < 1e-6, game(pg))
    # Group Class on one screen: keyboard takes a seat, a pad takes the next, CPU guests fill the rest
    for _ in range(3):
        if pg.locator('[data-id=back]').count():
            pg.click('[data-id=back]')
            time.sleep(0.5)
    until(pg, "()=>__game.screen==='title'", 8)
    pg.click('[data-id=group]')
    check('Group Class opens', until(pg, "()=>__game.screen==='join'", 8), game(pg))
    time.sleep(0.6)
    tap_key(pg, 'Space')
    tap_pad(pg, 0)
    check('two seats joined', pg.evaluate("()=>[...document.querySelectorAll('.wt-seat')].filter(s=>/Keyboard|Pad/.test(s.textContent)).length") == 2)
    tap_key(pg, 'Space')
    check('the class starts', until(pg, "()=>__game.event==='ring'", 15), game(pg))
    kinds = "()=>__engine.state('seat').entities.map(e=>e.seat.kind).join()"
    check('seats are human, human, CPU, CPU', pg.evaluate(kinds) == 'human,human,cpu,cpu', pg.evaluate(kinds))
    pg.evaluate("()=>{const buttons=Array.from({length:17},()=>({pressed:false,touched:false,value:0}));window.__pad={id:'x (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0.9,0,0,0],buttons}}")
    time.sleep(2)
    check('the pad drives its own seat', pg.evaluate("()=>__engine.state('seat').entities[1].seat.input.x") > 0.5)
    pg.evaluate("()=>{window.__pad=null}")
    act(pg, 'game.finishAt', {'score': 700})
    check('the podium comes', until(pg, "()=>__game.screen==='results'", 15), game(pg))
    check('the sash says Least Wobbly', 'Least Wobbly' in pg.inner_text('[data-ui=podium]'))
    ctx.close()

    # touch-only
    tablet = dict(p.devices['iPad Pro 11'])
    tablet.pop('default_browser_type', None)
    ctx = b.new_context(**tablet)
    pg = ctx.new_page()
    pg.goto(URL)
    check('tablet boot', boot(pg))
    check('tablet says controller required', until(pg, "()=>document.body.innerText.includes('Controller or keyboard required')", 10))
    ctx.close()
    phone = dict(p.devices['iPhone 13'])
    phone.pop('default_browser_type', None)
    ctx = b.new_context(**phone)
    pg = ctx.new_page()
    pg.goto(URL)
    check('touch boot', boot(pg))
    check('touch says controller required', until(pg, "()=>document.body.innerText.includes('Controller or keyboard required')", 10))
    touchy = "()=>[...document.querySelectorAll('[data-ui^=touch],[class*=touch i],[id*=touch i]')].filter(e=>!e.className.includes('wt-note-touch')).filter(e=>getComputedStyle(e).display!=='none').map(e=>e.tagName+'.'+e.className+'#'+e.id)"
    check('no touch controls', not pg.evaluate(touchy), pg.evaluate(touchy))
    check('touch shows only Settings', pg.evaluate("()=>[...document.querySelectorAll('#wt .wt-row')].map(r=>r.dataset.id).join()") == 'settings')
    check('attract runs behind it', until(pg, "()=>__game.attract===true", 16), game(pg))
    box = pg.locator('[data-id=settings]').bounding_box()
    pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    check('a tap opens Settings', until(pg, "()=>__game.screen==='settings'", 8), game(pg))
    ctx.close()
    b.close()

    # no WebGPU here
    wk = p.webkit.launch()
    pg = wk.new_page()
    pg.goto(URL)
    time.sleep(3)
    check('no-WebGPU page is friendly', 'WebGPU' in pg.inner_text('body'), pg.inner_text('body')[:200])
    wk.close()
print(f'RESULT ok {ok} fail {fail}')
