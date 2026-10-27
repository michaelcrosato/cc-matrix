# Headless smoke test: boots the bundle in Chromium (SwiftShader WebGPU) and drives game states.
import asyncio, sys, subprocess, os, time
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
NAME = 'StarLocks64-Starfox64-claude-opus-5-5-medium-20261026-1350.html'
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8771', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(channel='chromium', args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--autoplay-policy=no-user-gesture-required'])
            pg = await b.new_page(viewport={'width': 1280, 'height': 720})
            pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
            await pg.goto(f'http://localhost:8771/{NAME}')
            await pg.wait_for_function('window.__game', timeout=90000)
            print('booted')
            if os.environ.get('TRAP'):
                await pg.evaluate('const P=Object.getPrototypeOf(__game.W.ships[0]); Object.defineProperty(P,"godMode",{configurable:true,get(){return this._gm},set(v){ if(v && __game.W.players.length>1) console.error("GODMODE SET", __game.Game.state, new Error().stack.split("\\n").slice(1,6).join(" | ")); this._gm=v; }}); 1')
            steps = sys.argv[1:] or ['all']
            async def ev(js, wait=0):
                r = await pg.evaluate(js)
                if wait: await pg.wait_for_timeout(wait)
                return r
            fps = await ev("""new Promise(r=>{let n=0;const t=performance.now();function f(){n++; if(performance.now()-t<2000) requestAnimationFrame(f); else r(n/2)} f();})""")
            print('menu fps', fps)
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(600)
            print('state after key', await ev('__game.Game.state'), await ev("document.querySelector('#ui .screen') && document.querySelector('#ui .screen').innerText.slice(0,80)"))
            # mission solo
            await ev('__game.Game.showLobby("mission"); __game.Game.lobbyStart()', 3000)
            print('play', await ev('[__game.Game.state, __game.W.ships.length, !!__game.Game.cutscene]'))
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
            for s in [700, 1500, 2100, 2500, 3300, 4200, 4460, 5200, 6000, 6960]:
                await ev(f'__game.Rail.s = {s}', 1500)
                print('s', s, await ev('[__game.W.enemies.length, __game.W.items.length, __game.W.props.length, __game.W.players[0].hp|0, __game.Stage1.route, !!__game.W.boss, !!__game.W.midboss]'))
            # kill midboss & boss
            await ev('__game.W.midboss && __game.W.midboss.core.kill(__game.W.players[0])', 500)
            await ev('__game.W.boss && __game.W.boss.arms.forEach(a=>a.kill(__game.W.players[0]))', 800)
            await ev('__game.W.boss && (__game.W.boss.core.armored=false, __game.W.boss.core.kill(__game.W.players[0]))', 12000)
            print('after boss', await ev('[__game.Game.state, document.querySelector("#ui").innerText.slice(0,120)]'))
            # next mission (all-range)
            await ev('__game.UI.items[0] && __game.UI.items[0]._fn()', 3000)
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1000)
            print('stage2', await ev('[__game.Game.state, __game.W.mode, __game.W.ships.length]'))
            await ev('__game.Stage2.jackals()', 3000)
            await ev('__game.Stage2.rivals.forEach(r=>r.die(__game.W.players[0]))', 6500)
            print('dread', await ev('[!!__game.W.boss, __game.W.boss && __game.W.boss.arriving]'))
            await ev('__game.W.boss.pos.z = 10', 2500)
            await ev('__game.W.boss.gens.forEach(g=>g.kill(__game.W.players[0]))', 800)
            await ev('__game.W.boss.reactor.kill(__game.W.players[0])', 14000)
            print('after dread', await ev('[__game.Game.state, document.querySelector("#ui").innerText.slice(0,100)]'))
            await ev('__game.UI.items[0] && __game.UI.items[0]._fn()', 2500)
            print('ending', await ev('__game.Game.state'))
            await ev('__game.Game.showCredits()', 800)
            # versus 4p (1 human + 3 cpu) and a 4-human split
            await ev('__game.Game.startVersus({pads:[__game.Input.keyboard], cpus:3, target:3})', 4000)
            print('versus', await ev('[__game.Game.state, __game.W.ships.length, __game.Game.viewports.length]'))
            await ev('__game.Game.startVersus({pads:[__game.Input.keyboard,__game.Input.keyboard,__game.Input.keyboard,__game.Input.keyboard], cpus:0, target:3})', 3000)
            print('versus4', await ev('[__game.Game.viewports.length, document.querySelectorAll(".hud").length]'))
            await ev("const s=__game.W.ships; s[0].kills=2; s[1].die(s[0])", 4000)
            print('versus over', await ev('[__game.Game.state, document.querySelector("#ui").innerText.slice(0,60)]'))
            # coop 3 players
            await ev('__game.Game.newSession([__game.Input.keyboard,__game.Input.keyboard,__game.Input.keyboard],0)', 2500)
            print('coop', await ev('[__game.W.players.length, __game.W.ships.length, __game.Game.viewports.length]'))
            print("dmg", await ev("__game.W.players.map(p=>{__game.W.lives=0; return [p.damage(999), p.invuln, p.godMode, p.dead, p.hp]})", 15000))
            print('gameover', await ev('[__game.Game.state, __game.W.timers.length, __game.W.lives, __game.W.players.map(p=>p.dead), document.querySelector("#ui").innerText.slice(0,40)]'))
            await ev('__game.UI.items[0] && __game.UI.items[0]._fn()', 2000)
            print('continue', await ev('[__game.Game.state, __game.Rail.s|0]'))
            # pause / settings
            await ev('__game.Game.pause()', 300); await ev('__game.UI.items[2]._fn()', 300); await ev('__game.UI.activate(1)', 200)
            await ev('__game.Game.toTitle()', 500)
            # attract
            await ev('__game.Input.lastInputTime = performance.now() - 11000', 3000)
            print('attract', await ev('[__game.W.attract, __game.Game.state, __game.W.mode]'))
            for i in range(4):
                await ev('__game.Game.nextAttract()', 3000)
                print(' seg', await ev('[__game.Game.attractSeg, __game.W.mode, __game.W.attract]'))
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(800)
            print('after exit', await ev('[__game.W.attract, __game.Game.state]'))
            await b.close()
    finally:
        srv.terminate()
    uniq = []
    for e in errs:
        if e not in uniq: uniq.append(e)
    print('--- errors/warnings:', len(uniq))
    for e in uniq[:40]: print(e[:400])
asyncio.run(main())
