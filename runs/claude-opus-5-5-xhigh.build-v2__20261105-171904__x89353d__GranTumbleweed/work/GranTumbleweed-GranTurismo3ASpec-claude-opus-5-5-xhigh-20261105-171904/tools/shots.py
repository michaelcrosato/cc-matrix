# python3 tools/shots.py [name...]: the 1080p views the plan asks you to look at, from the built HTML, into shots/. No script can judge these.
import os, sys
from playwright.sync_api import sync_playwright
html = os.path.abspath(os.path.join('..', os.path.basename(os.path.abspath('.')) + '.html'))
SETUP = "const a=window.__APP__, C=a.career; if(!a.profile.cars.length){const c=C.addCar(a.profile,'kite'); a.profile.credits=64000; a.profile.licences={C:true,B:true,A:true}; c.lastWear=.62; for(const k of ['moth','ginga','libeccio']) a.profile.seen[k]=true;} a.driverOverride=(en,d,sm)=>{const i=a.aiDriveFn(en.c,sm.tr,sm.line,en.speeds,{skill:0.95,tcs:.7,asm:.6},null);return {steer:i.steer,throttle:i.throttle,brake:i.brake}};"
def race(track, car, s=None, ai=3, hour='undefined', steps=200):
    jump = f"const q=a.scene.sim; q.teleport(q.cars.length-1,{s}); e.step(120);" if s else ''
    return f"(async()=>{{{SETUP} a.ui.clear(); await a.startQuick({{track:'{track}',carId:'{car}',laps:3,field:{ai+1},difficulty:'normal',hour:{hour}}}); const e=window.__PIXEL_ENGINE__; e.step({steps}); {jump} e.manual=false; }})()"
def menu(place, extra=''):
    return f"(async()=>{{{SETUP} a.driverOverride=null; a.ui.clear(); await a.jumpMenu('{place}'); await new Promise(r=>setTimeout(r,600)); {extra} }})()"
SHOTS = {
  'kestrel': race('kestrel', 'ginga'), 'kestrel2': race('kestrel', 'ginga', 'q.tr.cornerS[9]-60'), 'cedar': race('cedar', 'libeccio'), 'cedar2': race('cedar', 'libeccio', 'q.tr.cornerS[1]+40'),
  'harbour': race('harbour', 'works', None, 3, '21'), 'harbour2': race('harbour', 'works', 'q.tr.cornerS[3]-40', 3, '21'), 'saltline': race('saltline', 'corsa'), 'saltline2': race('saltline', 'corsa', 'q.tr.cornerS[1]-100'),
  'redclay': race('redclay', 'ryuRally', None, 1), 'redclay2': race('redclay', 'ryuRally', 'q.tr.cornerS[4]-60', 1), 'proving': race('proving', 'kite', None, 0), 'proving2': race('proving', 'kite', 'q.tr.cornerS[4]-30', 0),
  'dealer': menu('dealer', 'a.ui.top.room=3; a.ui.top.show(true);'), 'mapNight': menu('map'), 'title': "(async()=>{const a=window.__APP__; a.ui.clear(); await a.toTitle(); })()",
}
names = sys.argv[1:] or list(SHOTS)
os.makedirs('shots', exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}); pg.set_default_timeout(70000); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + html); pg.wait_for_function('window.__GAME__!==undefined'); pg.wait_for_timeout(1500)
    for n in names:
        pg.evaluate(SHOTS[n]); pg.wait_for_timeout(2200); pg.screenshot(path=f'shots/{n}.png')
    print('shots', len(names), 'errors', errs[:4])
    b.close()
