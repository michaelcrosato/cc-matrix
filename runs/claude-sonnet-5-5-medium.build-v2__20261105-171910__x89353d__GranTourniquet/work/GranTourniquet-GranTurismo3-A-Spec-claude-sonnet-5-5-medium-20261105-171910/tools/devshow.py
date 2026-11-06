import sys
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[1]); pg.wait_for_timeout(4000)
    pg.evaluate("()=>{const g=window.__GAME__;g.A.fastNoAttract=true;g.goRace({mode:'race',track:'kestrel',title:'T',sim:{laps:2,contact:true,start:'rolling',seed:3,field:[{id:'player',carId:'kite',name:'YOU',player:true,skill:1,install:{parts:[],settings:{}}},{id:'a',carId:'pico',name:'A',skill:0.85,install:{parts:[],settings:{}}}]},returnTo:{screen:'map',args:{}}})}")
    for _ in range(240):
        if pg.evaluate("()=>window.__ENGINE__.game.name==='race'&&!!window.__ENGINE__.game.sim&&window.__ENGINE__.game.sim.time>0.1"): break
        pg.wait_for_timeout(500)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(1500)
    print('pause menu open:', pg.evaluate("()=>window.__GAME__.state().ov"))
    pg.evaluate("()=>{window.__ENGINE__.game.nav.push('dev')}"); pg.wait_for_timeout(1500)
    print('dev screen:', pg.evaluate("()=>window.__ENGINE__.game.nav.top.type"))
    for _ in range(4): pg.evaluate("()=>window.__GAME__.A.actions.inject('left')"); pg.wait_for_timeout(700)
    print('env after pressing LEFT on the focused Grip slider 4 times (real widget):', pg.evaluate("()=>{const e=window.__ENGINE__.game.sim.env;return {focus:window.__GAME__.A.ui.focus,gripScale:e.gripScale,slider:window.__GAME__.A.dev.sliders.grip,changed:window.__GAME__.A.dev.changed}}"))
    pg.keyboard.press('KeyC'); pg.wait_for_timeout(2500)
    print('after reset all:', pg.evaluate("()=>{const e=window.__ENGINE__.game.sim.env;return {gripScale:e.gripScale,powerScale:e.powerScale,sliders:Object.keys(window.__GAME__.A.dev.sliders).length,changed:window.__GAME__.A.dev.changed}}"))
    print('page errors:', errs); b.close()
