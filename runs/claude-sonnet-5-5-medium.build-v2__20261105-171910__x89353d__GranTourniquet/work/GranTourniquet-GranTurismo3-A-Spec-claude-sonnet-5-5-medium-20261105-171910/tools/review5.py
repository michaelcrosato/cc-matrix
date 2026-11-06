import sys
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
out = sys.argv[1]
RACE = "(a)=>window.__GAME__.goRace({mode:'race',track:a[0],title:'T',sim:{laps:2,contact:true,start:'rolling',seed:3,field:[{id:'player',carId:'kite',name:'YOU',player:true,skill:1,install:{parts:[],settings:{}}},{id:'a',carId:'pico',name:'A',skill:0.8,install:{parts:[],settings:{}}}]},returnTo:{screen:'map',args:{}}})"
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[2]); pg.wait_for_timeout(4000); pg.evaluate("()=>{window.__GAME__.A.fastNoAttract=true}")
    def waitg(js, ms=90000):
        for _ in range(ms//500):
            if pg.evaluate(js): return True
            pg.wait_for_timeout(500)
    for tr in ['saltline']:
        pg.evaluate(RACE, [tr]); waitg("()=>window.__ENGINE__.game.name==='race'&&window.__ENGINE__.game.sim&&window.__ENGINE__.game.sim.time>0.1")
        pg.evaluate("()=>{const e=window.__ENGINE__,g=e.game,s=g.sim;s.state='racing';s.greenAt=0;const f=g.focus;f.ai=true;f.skill=0.9;s.teleport(f,s.tr.length-60);const y=f.c.yaw;f.c.vx=Math.sin(y)*20;f.c.vz=Math.cos(y)*20;e.step(60*2);e.manual=false}"); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/s_{tr}.png')
    pg.evaluate("()=>window.__GAME__.goMenu('map',{})"); waitg("()=>window.__ENGINE__.game.nav&&window.__ENGINE__.game.nav.top&&window.__ENGINE__.game.nav.top.type==='map'"); pg.evaluate("()=>{const n=window.__ENGINE__.game.nav;n.push('handbook');n.top.s.page=4}"); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/handbook.png')
    print('errors', errs[:3]); b.close()
