import sys
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
out = sys.argv[1]
RACE = "(a)=>window.__GAME__.goRace({mode:'race',track:a[0],hour:a[2],title:'T',sim:{laps:2,contact:true,start:'rolling',seed:3,field:[{id:'player',carId:a[1],name:'YOU',player:true,skill:1,install:{parts:[],settings:{}}},{id:'a',carId:'kite',name:'A',skill:0.8,install:{parts:[],settings:{}}}]},returnTo:{screen:'map',args:{}}})"
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[2]); pg.wait_for_timeout(4000); pg.evaluate("()=>{window.__GAME__.A.fastNoAttract=true}")
    def waitg(js, ms=90000):
        for _ in range(ms//500):
            if pg.evaluate(js): return True
            pg.wait_for_timeout(500)
    for name, track, car, hour, s in [('r_proving_start','proving','kite',None,0),('r_kestrel_corner','kestrel','ginga',None,640),('r_cedar_corner','cedar','brandt32',None,200),('r_saltline','saltline','heck',None,300),('r_clay_crest','redclay','ryuRally',None,330),('r_harbour_corner','harbour','libeccio',None,560)]:
        pg.evaluate(RACE, [track, car, hour]); waitg("()=>window.__ENGINE__.game.name==='race'&&window.__ENGINE__.game.sim&&window.__ENGINE__.game.sim.time>0.1")
        pg.evaluate("(s)=>{const e=window.__ENGINE__,g=e.game;g.sim.state='racing';g.sim.greenAt=0;if(s>0){g.sim.teleport(g.focus,s);g.focus.c.vx=Math.sin(g.focus.c.yaw)*25;g.focus.c.vz=Math.cos(g.focus.c.yaw)*25;g.focus.crossings=1;}e.input.setKey('KeyW',true);e.step(s>0?180:60);e.input.setKey('KeyW',false);e.manual=false}", s); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/{name}.png')
    for name, ending in [('map_day',False),('map_night',True)]:
        pg.evaluate("(en)=>{const g=window.__GAME__;g.A.profile.ending=en;g.A.profile.started=true;g.goMenu('map',{})}", ending); waitg("()=>window.__ENGINE__.game.nav&&window.__ENGINE__.game.nav.top&&window.__ENGINE__.game.nav.top.type==='map'"); pg.evaluate("(en)=>{const g=window.__ENGINE__.game;g.skyNow=en?22:8.5;g.setHour(g.skyNow)}", ending); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/{name}.png')
    pg.evaluate("()=>window.__GAME__.goMenu('garage',{})"); waitg("()=>window.__ENGINE__.game.nav&&window.__ENGINE__.game.nav.top&&window.__ENGINE__.game.nav.top.type==='garage'")
    for id in ['kite','heck','type9','longhorn','moth','libeccio']:
        pg.evaluate("(id)=>{const g=window.__ENGINE__.game;g.showroom.show(id,{parts:[],settings:{}});g.show.a=Math.PI;g.show.drift=0}", id); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/car_{id}.png')
    print('errors', errs[:4]); b.close()
