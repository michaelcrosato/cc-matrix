import sys
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
out = sys.argv[1]; base = sys.argv[2]
RACE = "(a)=>window.__GAME__.goRace({mode:'race',track:a[0],title:'T',sim:{laps:2,contact:true,start:'rolling',seed:3,field:[{id:'player',carId:a[1],name:'YOU',player:true,skill:1,install:{parts:[],settings:{}}},{id:'a',carId:'kite',name:'A',skill:0.8,install:{parts:[],settings:{}}}]},returnTo:{screen:'map',args:{}}})"
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(base + '/game.html'); pg.wait_for_timeout(4000); pg.evaluate("()=>{window.__GAME__.A.fastNoAttract=true}")
    def waitg(js, ms=90000):
        for _ in range(ms//500):
            if pg.evaluate(js): return True
            pg.wait_for_timeout(500)
    for name, track, car, corner in [('c_kestrel','kestrel','ginga',1),('c_cedar','cedar','brandt32',2),('c_kestrel2','kestrel','kite',5)]:
        pg.evaluate(RACE, [track, car]); waitg("()=>window.__ENGINE__.game.name==='race'&&window.__ENGINE__.game.sim&&window.__ENGINE__.game.sim.time>0.1")
        pg.evaluate("(ci)=>{const e=window.__ENGINE__,g=e.game,s=g.sim;s.state='racing';s.greenAt=0;const f=g.focus;f.ai=true;f.skill=0.95;s.teleport(f,s.tr.cornerS[ci]-170);const yaw=f.c.yaw;f.c.vx=Math.sin(yaw)*30;f.c.vz=Math.cos(yaw)*30;f.crossings=1;e.step(60*7);e.manual=false}", corner); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/{name}.png')
    pg.evaluate("()=>{const g=window.__GAME__;g.A.profile.ending=true;g.A.profile.started=true;g.goMenu('map',{})}"); waitg("()=>window.__ENGINE__.game.nav&&window.__ENGINE__.game.nav.top&&window.__ENGINE__.game.nav.top.type==='map'"); pg.evaluate("()=>{const g=window.__ENGINE__.game;g.skyNow=22;g.setHour(22)}"); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/map_night2.png')
    print('errors', errs[:3]); b.close()
