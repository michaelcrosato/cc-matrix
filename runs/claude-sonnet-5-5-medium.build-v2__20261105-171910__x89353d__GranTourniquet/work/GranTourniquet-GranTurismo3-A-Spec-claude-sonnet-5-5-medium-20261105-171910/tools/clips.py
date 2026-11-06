import sys
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
out = sys.argv[1]
AI = lambda i,c,s,n: "{id:'%s',carId:'%s',name:'%s',player:false,skill:%s,install:{parts:[],settings:{}},colour:'blue'}" % (i,c,n,s)
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[2]); pg.wait_for_timeout(4000); pg.evaluate("()=>{window.__GAME__.A.fastNoAttract=true}")
    def waitg(js, ms=90000):
        for _ in range(ms//500):
            if pg.evaluate(js): return True
            pg.wait_for_timeout(500)
    for name, screen in [('clip_card','attractCard'),('clip_showroom','attractShowroom')]:
        pg.evaluate("(s)=>window.__GAME__.goMenu(s,{attract:true,dur:999})", screen); waitg("(s)=>1"); pg.wait_for_timeout(12000); pg.screenshot(path=f'{out}/{name}.png')
    pg.evaluate("()=>window.__GAME__.goRace({mode:'test',demo:true,attract:true,track:'proving',test:{id:'B-1',attempt:0,runIndex:0,sum:0},title:'B-1',attractDur:999})")
    waitg("()=>window.__ENGINE__.game.name==='race'&&window.__ENGINE__.game.sim&&window.__ENGINE__.game.sim.time>0.1"); pg.evaluate("()=>{const e=window.__ENGINE__;e.step(60*4);e.manual=false}"); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/clip_b1.png')
    pg.evaluate("()=>window.__GAME__.goRace({mode:'attract',attract:true,track:'redclay',title:'RC',attractDur:999,cams:[[0,0]],sim:{laps:1,contact:false,start:'flying',startS:300,startSpeed:22,rally:true,seed:5,field:[%s,%s]}})" % (AI('a0','ryuRally',0.96,'A'),AI('a1','ryu',0.94,'B')))
    waitg("()=>window.__ENGINE__.game.name==='race'&&window.__ENGINE__.game.sim&&window.__ENGINE__.game.sim.time>0.1"); pg.evaluate("()=>{const e=window.__ENGINE__;e.step(60*8);e.manual=false}"); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/clip_clay.png')
    print('errors', errs[:3]); b.close()
