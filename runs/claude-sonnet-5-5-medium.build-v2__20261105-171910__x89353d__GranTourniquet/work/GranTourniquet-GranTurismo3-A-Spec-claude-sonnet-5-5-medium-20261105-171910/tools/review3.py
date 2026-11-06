import sys
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[2]); pg.wait_for_timeout(4000); pg.evaluate("()=>{window.__GAME__.A.fastNoAttract=true}")
    def waitg(js, ms=90000):
        for _ in range(ms//500):
            if pg.evaluate(js): return True
            pg.wait_for_timeout(500)
    pg.evaluate("()=>{const g=window.__GAME__;g.A.hubActive=true;g.goRace({mode:'hub',hub:true,hubRound:true,track:'kestrel',title:'R',sim:{laps:2,contact:false,start:'standing',hubHold:true,seed:3,field:[{id:'player',carId:'kite',name:'YOU',player:true,skill:1,install:{parts:[],settings:{}}}]}})}")
    waitg("()=>window.__ENGINE__.game.name==='race'&&window.__ENGINE__.game.sim")
    ok = waitg("()=>window.__ENGINE__.game.marshals&&window.__ENGINE__.game.marshals.length>=5&&!!window.__ENGINE__.game.world.gantry", 120000)
    print('hub marshals+props present:', ok, pg.evaluate("()=>window.__ENGINE__.game.marshals.length"))
    pg.evaluate("()=>{const e=window.__ENGINE__,g=e.game;const m=g.marshals[1].root.position;g.cam.init=true;const cam=e.camera.camera;g.updateCamera=()=>{cam.position.set(m.x+4,m.y+2.2,m.z+6);cam.lookAt(m.x,m.y+1,m.z)}}"); pg.wait_for_timeout(3000); pg.screenshot(path=sys.argv[1]+'/hub_marshal.png')
    pg.evaluate("()=>{const g=window.__GAME__;g.A.hubActive=false;g.A.profile.ending=true;g.A.profile.started=true;g.goMenu('map',{})}"); waitg("()=>window.__ENGINE__.game.nav&&window.__ENGINE__.game.nav.top&&window.__ENGINE__.game.nav.top.type==='map'"); pg.evaluate("()=>{const g=window.__ENGINE__.game;g.skyNow=22;g.setHour(22)}"); pg.wait_for_timeout(2500); pg.screenshot(path=sys.argv[1]+'/map_night3.png')
    print('errors', errs[:3]); b.close()
