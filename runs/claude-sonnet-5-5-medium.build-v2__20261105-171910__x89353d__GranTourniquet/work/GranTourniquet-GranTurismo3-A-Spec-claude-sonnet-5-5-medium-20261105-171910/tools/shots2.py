import sys
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
RACE = "(extra)=>window.__GAME__.goRace({mode:'race',track:'kestrel',title:'KESTREL',sim:{laps:1,contact:true,start:'rolling',seed:3,field:[{id:'player',carId:'kite',name:'YOU',player:true,skill:1,install:{parts:[],settings:{}}},{id:'a',carId:'pico',name:'ARAKI',skill:0.8,install:{parts:[],settings:{}}},{id:'b',carId:'moth',name:'BELL',skill:0.85,install:{parts:[],settings:{}}}]},returnTo:{screen:'map',args:{}}})"
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[2]); pg.wait_for_timeout(4000); pg.evaluate("()=>{window.__GAME__.A.fastNoAttract=true}")
    def waitg(js, ms=90000):
        for _ in range(ms//500):
            if pg.evaluate(js): return True
            pg.wait_for_timeout(500)
        return False
    pg.evaluate(RACE, 0); waitg("()=>window.__ENGINE__.game.name==='race'&&window.__ENGINE__.game.sim&&window.__ENGINE__.game.sim.time>0.2")
    pg.evaluate("()=>{const e=window.__ENGINE__,s=e.game;s.focus.ai=true;s.focus.skill=1;s.sim.player.ai=true;e.step(60*190);e.manual=false}"); waitg("()=>window.__ENGINE__.game.ov&&window.__ENGINE__.game.ov.kind==='results'", 120000); pg.wait_for_timeout(1500); pg.screenshot(path=sys.argv[1]+'/results.png')
    print('rec', pg.evaluate("()=>[!!window.__GAME__.A.lastRace, window.__GAME__.A.lastRace&&window.__GAME__.A.lastRace.record.length, window.__ENGINE__.game.ov&&window.__ENGINE__.game.ov.kind]")); pg.evaluate("()=>window.__GAME__.go(new window.__GAME__.A.scenes.replay({source:'last'}))"); waitg("()=>window.__ENGINE__.game.name==='replay'"); pg.wait_for_timeout(5000); pg.screenshot(path=sys.argv[1]+'/replay.png')
    pg.evaluate("()=>{const g=window.__GAME__,F=(id,n)=>({id,carId:'kite',name:n,player:true,skill:1,install:{parts:[],settings:{}},colour:'red'});g.A.startDuel({track:'proving',hour:11,rain:false,laps:1,contact:true,field:[F('player','P1'),F('player2','P2')],returnTo:{screen:'arcade',args:{}}})}"); waitg("()=>!!window.__GAME__.A.couch"); pg.wait_for_timeout(8000); pg.screenshot(path=sys.argv[1]+'/couch.png')
    print('errors', errs[:4]); b.close()
