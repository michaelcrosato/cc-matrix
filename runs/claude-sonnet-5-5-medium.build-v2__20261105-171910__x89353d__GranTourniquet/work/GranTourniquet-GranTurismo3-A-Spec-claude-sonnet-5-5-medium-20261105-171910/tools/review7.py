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
    pg.evaluate("()=>window.__GAME__.goMenu('garage',{})"); waitg("()=>window.__ENGINE__.game.nav&&window.__ENGINE__.game.nav.top&&window.__ENGINE__.game.nav.top.type==='garage'")
    pg.wait_for_timeout(3000)
    for id in ['moth','libeccio']:
        pg.evaluate("(id)=>{const g=window.__ENGINE__.game;g.showroom.show(id,{parts:[],settings:{}});g.show.a=Math.PI*0.9;g.show.drift=0;g.show.shift=0}", id); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/rear_{id}.png')
    print('errors', errs[:3]); b.close()
