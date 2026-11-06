"""Browser check: the Frog hops (its height changes between samples), the Gull wanders, and Plumb sways in the storm so the plait swings. Usage: python3 critters.py <html>"""
import os,sys,time
from playwright.sync_api import sync_playwright
html=os.path.abspath(sys.argv[1])
ARGS=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
Q="JSON.stringify(window.__engine.state('actor').entities.filter(e=>e.cast&&['gull','frog','plumb'].includes(e.cast.who)).map(e=>[e.cast.who,+e.actor.x.toFixed(2),+e.actor.y.toFixed(2)]))"
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS); pg=b.new_page(viewport={'width':640,'height':360}); pg.goto('file://'+html)
    t0=time.time()
    while time.time()-t0<150 and not pg.evaluate('!!(window.__engine && window.__engine.ready && window.__game && window.__ww)'): time.sleep(1)
    ev=pg.evaluate; ev("window.__ww.ctx.pick('title','begin')"); time.sleep(6)
    ys=set(); xs=set()
    for i in range(24):
        r=eval(ev(Q)); d={a[0]:a for a in r}; ys.add(d['frog'][2]); xs.add(d['gull'][1]); time.sleep(0.7)
    print('frog heights seen', sorted(ys)[:6], 'gull x seen', len(xs), flush=True)
    ev("window.__engine.actions.run('game.start',{event:'tilt'})"); px=set()
    for i in range(30):
        r=eval(ev(Q)); d={a[0]:a for a in r}; px.add(d['plumb'][1]); time.sleep(1)
    print('plumb x positions in the storm', len(px), min(px), max(px), flush=True)
    print('errors', ev("window.__engine.errors.length")); b.close()
