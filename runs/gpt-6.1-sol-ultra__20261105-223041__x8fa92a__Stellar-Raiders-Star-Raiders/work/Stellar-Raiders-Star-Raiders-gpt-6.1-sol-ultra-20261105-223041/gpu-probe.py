from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
 page=b.new_page(ignore_https_errors=True)
 page.on('console',lambda m:print(m.type,m.text))
 page.on('pageerror',lambda m:print('ERROR',m))
 page.goto('http://127.0.0.1:38449/')
 page.set_content('''<canvas id="c"></canvas><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js"}}</script><script type="module">import * as T from 'three';const r=new T.WebGPURenderer({canvas:document.getElementById('c'),antialias:true});await r.init();r.setSize(800,600);const s=new T.Scene;s.background=new T.Color('red');const c=new T.PerspectiveCamera(60,1.3,.1,100);c.position.z=4;s.add(new T.Mesh(new T.BoxGeometry(),new T.MeshBasicNodeMaterial({color:'green'})));function f(){r.render(s,c);requestAnimationFrame(f)}f();window.r=r;</script>''')
 page.wait_for_timeout(5000)
 print(page.evaluate('({gpu:!!r.backend.isWebGPUBackend,info:r.info.render})'))
 b.close()
