from playwright.sync_api import sync_playwright
import json
base=['--enable-unsafe-webgpu','--no-sandbox']
variants=[['--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-vulkan-surface'],['--use-angle=swiftshader','--enable-unsafe-swiftshader'],['--enable-features=Vulkan','--use-angle=vulkan','--use-webgpu-adapter=swiftshader'],['--use-angle=swiftshader','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader']]
with sync_playwright() as p:
 for flags in variants:
  b=p.chromium.launch(headless=True,args=base+flags)
  page=b.new_page(ignore_https_errors=True)
  errors=[];page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto('http://127.0.0.1:38449/')
  page.set_content('''<canvas id="c"></canvas><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js"}}</script><script type="module">import * as T from 'three';const r=new T.WebGPURenderer({canvas:document.getElementById('c'),antialias:true});await r.init();r.setSize(800,600);const s=new T.Scene;s.background=new T.Color('red');const c=new T.PerspectiveCamera(60,1.3,.1,100);c.position.z=4;s.add(new T.Mesh(new T.BoxGeometry(),new T.MeshBasicNodeMaterial({color:'green'})));function f(){r.render(s,c);requestAnimationFrame(f)}f();window.r=r;</script>''')
  page.wait_for_timeout(4000)
  print(json.dumps({'flags':flags,'errors':errors,'frame':page.evaluate('window.r?.info.render.frameCalls')}),flush=True)
  b.close()
