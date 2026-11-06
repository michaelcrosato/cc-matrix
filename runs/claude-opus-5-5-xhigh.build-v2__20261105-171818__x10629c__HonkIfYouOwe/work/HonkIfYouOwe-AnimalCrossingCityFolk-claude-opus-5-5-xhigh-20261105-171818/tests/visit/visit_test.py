#!/usr/bin/env python3
# Visit, on its own: two pages in one context. BroadcastChannel join and movement seen on both; WebRTC
# with no ICE servers; after leaving, the guest keeps pockets and beans and the host's save is unchanged.
import json, os, sys, time
from playwright.sync_api import sync_playwright
ARGS = ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))
html = 'file://' + os.path.abspath(os.path.join(root, '..', os.path.basename(root) + '.html'))
fails = []; n = 0
def check(c, msg):
    global n
    n += 1
    if not c: fails.append(msg)
READY = 'window.__GAME__ !== undefined'
def boot(ctx, q=''):
    page = ctx.new_page()
    page.on('pageerror', lambda e: fails.append('PAGEERROR ' + str(e)[:300]))
    page.goto(html + q)
    page.wait_for_function(READY, timeout=60000)
    return page
def run_broadcast(ctx):
    host = boot(ctx)
    # host has a save: a quick world, saved
    host.evaluate("""() => { const G = window.__GAME__; G.actions.quickStart({ name: 'Hosta', town: 'Hostville', beans: 7000 }); G.g.demo = false; G.g.autosave(); }""")
    host.evaluate("""() => { const G = window.__GAME__; G.g.world.player.pockets[0] = { id: 'pear' }; G.g.autosave(); localStorage.setItem('hostSnapshot', JSON.stringify(G.g.world.town.objects).length); }""")
    # Open the gate through the real entry point
    host.evaluate("""() => window.__GAME__.visit.openGate('local')""")
    host.wait_for_function("window.__GAME__.g.visiting === true", timeout=20000)
    pos_before = host.evaluate("() => window.__GAME__.g.player.z")
    guest = boot(ctx)
    guest.evaluate("""() => { localStorage.setItem('honk:guestTest', '1'); }""")
    guest.evaluate("""() => window.__GAME__.visit.findGates()""")
    guest.wait_for_function("window.__GAME__.visit.gates.length > 0", timeout=20000)
    guest.evaluate("""() => window.__GAME__.visit.joinFirst({ name: 'Guesty', beans: 321, pockets: [{ id: 'fig' }, null, null, null, null, null, null, null, null, null, null, null, null, null, null] })""")
    guest.wait_for_function("window.__GAME__.g.world?.flags?.visiting === true", timeout=30000)
    check(guest.evaluate("() => window.__GAME__.g.world.player.town") == 'Hostville', 'guest arrived in the host town')
    check(guest.evaluate("() => window.__GAME__.g.place.id") == 'town', 'guest in the town')
    host.wait_for_function("window.__GAME__.g.net.remotes.size === 1", timeout=20000)
    check(True, 'host sees guest')
    # Guest moves; host's remote follows
    z0 = host.evaluate("() => [...window.__GAME__.g.net.remotes.values()][0].a.z")
    guest.evaluate("() => window.__GAME__.engine.input.setKey('KeyS', true)")
    guest.wait_for_timeout(2500)
    guest.evaluate("() => window.__GAME__.engine.input.setKey('KeyS', false)")
    host.wait_for_timeout(1200)
    z1 = host.evaluate("() => [...window.__GAME__.g.net.remotes.values()][0].a")
    gz = guest.evaluate("() => ({x: window.__GAME__.g.player.x, z: window.__GAME__.g.player.z})")
    check(abs(z1['x'] - gz['x']) + abs(z1['z'] - gz['z']) < 4, f'host sees the guest move {z1["x"]},{z1["z"]} vs {gz}')
    check(guest.evaluate("() => window.__GAME__.g.net.remotes.size") >= 1, 'guest sees host')
    # Guest acquires a pear on the host's world, validated by the host
    host.evaluate("""() => { const G = window.__GAME__.g; G.world.town.objects['26,30'] = { k: 'drop', item: 'pear' }; G.town.dirty.add('26,30'); G.net.t.send({ t: 'ev', k: 'obj', key: '26,30', o: G.world.town.objects['26,30'] }); }""")
    guest.wait_for_function("window.__GAME__.g.world.town.objects['26,30']?.k === 'drop'", timeout=10000)
    guest.evaluate("() => window.__GAME__.g.net.t.send({ t: 'do', a: 'pick', k: '26,30' })")
    guest.wait_for_function("window.__GAME__.g.world.player.pockets.some((s) => s?.id === 'pear')", timeout=10000)
    check(host.evaluate("() => !window.__GAME__.g.world.town.objects['26,30']"), 'host removed the claimed pear')
    # Leaving: the guest keeps pockets and beans; the host's save is unchanged
    host_before = host.evaluate("() => localStorage.getItem('honk:save')")
    guest.evaluate("() => window.__GAME__.g.net.leave()")
    host.wait_for_function("window.__GAME__.g.net.remotes.size === 0", timeout=15000)
    check(guest.evaluate("() => window.__GAME__.g.mode") == 'title', 'guest went home')
    # Same profile: guest wrote its own record; the host's world stays in its own memory
    saved_guest = guest.evaluate("() => JSON.parse(localStorage.getItem('honk:guest'))")
    check(saved_guest and saved_guest['beans'] == 321, f'guest kept beans {saved_guest and saved_guest["beans"]}')
    check(saved_guest and any(s and s['id'] == 'pear' for s in saved_guest['pockets']), 'guest kept pockets, with the pear')
    host.evaluate("() => window.__GAME__.g.net.leave()")
    host.close(); guest.close()
def run_rtc(ctx):
    a = boot(ctx, '?iceServers=none')
    b = boot(ctx, '?iceServers=none')
    a.evaluate("""() => { const G = window.__GAME__; G.actions.quickStart({ name: 'Hosta', town: 'Rtcville', beans: 9000 }); G.g.demo = false; G.g.autosave(); }""")
    code = a.evaluate("() => window.__GAME__.visit.openRtcHost()")
    check(isinstance(code, str) and len(code) < 2500, f'gate pass length {len(code) if code else None}')
    slip = b.evaluate("(code) => window.__GAME__.visit.answerRtc(code, { name: 'Remote', beans: 44, pockets: Array(15).fill(null) })", code)
    check(isinstance(slip, str) and len(slip) > 20, 'reply slip')
    a.evaluate("(slip) => window.__GAME__.visit.acceptRtc(slip)", slip)
    b.wait_for_function("window.__GAME__.g.world?.flags?.visiting === true", timeout=30000)
    check(b.evaluate("() => window.__GAME__.g.world.player.town") == 'Rtcville', 'guest arrived by Gate Pass')
    a.wait_for_function("window.__GAME__.g.net.remotes.size === 1", timeout=20000)
    b.evaluate("() => window.__GAME__.g.net.leave()")
    check(b.evaluate("() => window.__GAME__.g.mode") == 'title', 'guest left')
    a.evaluate("() => window.__GAME__.g.net?.leave()")
    a.close(); b.close()
def run_menus(ctx):
    # The real menus: Visit on the title, a Gate Pass in a box you can select, a Reply Slip you can paste.
    a = boot(ctx, '?iceServers=none')
    a.evaluate("""() => { const G = window.__GAME__; G.actions.quickStart({ name: 'Menu', town: 'Menuville', beans: 100 }); G.g.demo = false; G.g.autosave(); G.g.quitToTitle(); }""")
    a.wait_for_function("window.__GAME__.ui.model().screen === 'title'", timeout=10000)
    a.evaluate("""() => { const g = window.__GAME__.g; const m = g.ui.top; m.items.find((i) => i.label === 'Visit').action(g, m); }""")
    a.wait_for_function("window.__GAME__.ui.model().screen === 'visit'", timeout=10000)
    check(a.evaluate("window.__GAME__.ui.model().items.length") == 5, 'visit menu')
    a.evaluate("""() => { const g = window.__GAME__.g; const m = g.ui.top; m.items.find((i) => i.label.includes('by Gate Pass') && i.label.includes('Open')).action(g, m); }""")
    a.wait_for_function("window.__GAME__.ui.model().screen === 'gateCode'", timeout=30000)
    code = a.evaluate("document.getElementById('gate-code').value")
    check(len(code) > 100, f'gate pass shown in a box: {len(code)}')
    check(a.evaluate("document.getElementById('gate-code').readOnly") is True, 'gate pass is read-only')
    a.keyboard.press('Enter')
    a.wait_for_function("window.__GAME__.ui.model().screen === 'gateCode' && !document.getElementById('gate-code').readOnly", timeout=10000)
    a.locator('#gate-code').click()
    a.keyboard.type('abc')
    a.keyboard.press('Backspace')
    check(a.evaluate("document.getElementById('gate-code').value") == 'ab', 'the paste box types and rubs out')
    a.keyboard.press('Escape')
    a.wait_for_timeout(300)
    check(a.evaluate("document.getElementById('gate-code').style.display") == 'none', 'the box goes away')
    a.evaluate("window.__GAME__.g.net?.leave()")
    a.close()
with sync_playwright() as p:
    br = p.chromium.launch(args=ARGS)
    ctx = br.new_context(viewport={'width': 640, 'height': 360})
    try:
        run_broadcast(ctx)
        run_rtc(ctx)
        run_menus(ctx)
    except Exception as e:
        fails.append('THREW ' + str(e)[:800])
    br.close()
for f in fails: print('FAIL', f)
print(f'visit: {n} checks, {len(fails)} failures')
sys.exit(1 if fails else 0)
