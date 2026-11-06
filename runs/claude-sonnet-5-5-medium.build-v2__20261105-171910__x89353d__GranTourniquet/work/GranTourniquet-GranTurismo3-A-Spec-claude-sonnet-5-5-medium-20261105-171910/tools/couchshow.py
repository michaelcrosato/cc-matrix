import sys
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[1]); pg.wait_for_timeout(4000); pg.evaluate("()=>{window.__GAME__.A.fastNoAttract=true}")
    pg.evaluate("()=>{const g=window.__GAME__,F=(id,n)=>({id,carId:'kite',name:n,player:true,skill:1,install:{parts:[],settings:{}},colour:'red'});g.A.startDuel({track:'proving',hour:11,rain:false,laps:1,contact:true,field:[F('player','P1'),F('player2','P2')],returnTo:{screen:'arcade',args:{}}})}")
    for _ in range(240):
        if pg.evaluate("()=>!!window.__GAME__.A.couch"): break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(4000)
    print('couch up:', pg.evaluate("()=>({couch:!!window.__GAME__.A.couch,p2display:document.getElementById('p2').style.display,p1width:document.getElementById('p1').style.width,p2width:document.getElementById('p2').style.width,canvases:document.querySelectorAll('canvas').length,engine2Status:window.__GAME__.A.couch.e2.state().status,engine1Status:window.__ENGINE__.state().status})"))
    pg.evaluate("()=>window.__GAME__.A.endDuel()"); pg.wait_for_timeout(1500)
    print('after dispose:', pg.evaluate("()=>({couch:!!window.__GAME__.A.couch,p2display:document.getElementById('p2').style.display,p1width:document.getElementById('p1').style.width})"))
    print('page errors:', errs); b.close()
