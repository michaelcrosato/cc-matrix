# One browser, several screenshots at 1920x1080: python3 tools/shots.py <outdir>
import sys, json
from playwright.sync_api import sync_playwright
out = sys.argv[1]
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
JS = {
 'dealer': "()=>{const g=window.__GAME__;g.A.profile.started=true;g.goMenu('dealer',{})}",
 'tuning': "()=>{const g=window.__GAME__;const A=g.A;if(!A.profile.cars.length){g.A.profile.credits=90000;}const p=A.profile;if(!p.cars.length){p.cars.push({uid:1,carId:'ginga',install:{parts:['eng1','wt1'],settings:{},tyre:'sport'},km:40,oilKm:20,dirt:0.4,price:14800});p.current=1;p.nextUid=2}g.goMenu('tuning',{})}",
 'service': "()=>window.__GAME__.goMenu('service',{})",
 'licence': "()=>window.__GAME__.goMenu('licence',{})",
 'events': "()=>window.__GAME__.goMenu('events',{})",
 'settings': "()=>{window.__GAME__.goMenu('map',{});setTimeout(()=>window.__ENGINE__.game.nav.push('settings'),1500)}",
 'handbook': "()=>{window.__GAME__.goMenu('map',{});setTimeout(()=>window.__ENGINE__.game.nav.push('handbook'),1500)}",
 'race_night': "()=>window.__GAME__.goRace({mode:'race',track:'harbour',hour:21,title:'T',sim:{laps:2,contact:true,start:'rolling',seed:3,field:[{id:'player',carId:'libeccio',name:'YOU',player:true,skill:1,install:{parts:[],settings:{}}},{id:'a',carId:'heck',name:'A',skill:0.92,install:{parts:[],settings:{}}},{id:'b',carId:'ryu',name:'B',skill:0.9,install:{parts:[],settings:{}}}]},returnTo:{screen:'map',args:{}}})",
}
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(sys.argv[2]); pg.wait_for_timeout(4000)
    for name in sys.argv[3:]:
        pg.evaluate(JS[name]); pg.wait_for_timeout(5500 if 'race' in name else 3500)
        if name == 'race_night': pg.evaluate("()=>window.__ENGINE__.input.setKey('KeyW',true)"); pg.wait_for_timeout(5000)
        pg.screenshot(path=f'{out}/{name}.png')
    print('errors', errs[:4]); b.close()
