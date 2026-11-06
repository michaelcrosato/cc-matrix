from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--disable-vulkan-surface','--disable-gpu-sandbox','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1280,'height':800});page.on('pageerror',lambda e: print('ERROR',str(e),flush=True));page.on('console',lambda e:print(e.type,e.text[:500],flush=True) if e.type in ['error','warning'] else None)
 page.goto((Path.cwd()/'visual-debug.html').as_uri());page.wait_for_function('window.__gameReady',timeout=45000);page.wait_for_timeout(1500)
 print('BEFORE',json.dumps(page.evaluate('''()=>{const{renderer,scene,camera}=__visual;let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});return {meshes,children:scene.children.length,camera:camera.position.toArray(),target:camera.matrixWorld.elements,proj:camera.projectionMatrix.elements,zoom:camera.zoom,info:renderer.info,canvas:[renderer.domElement.width,renderer.domElement.height],style:getComputedStyle(renderer.domElement).display}}''')),flush=True)
 page.screenshot(path='debug-before.png')
 page.evaluate('''()=>{const{renderer,scene}=__visual;renderer.shadowMap.enabled=false;scene.traverse(o=>{if(o.isLight)o.castShadow=false;});}''')
 page.wait_for_timeout(1500);page.screenshot(path='debug-noshadows.png')
 print('AFTER',json.dumps(page.evaluate('''()=>({info:__visual.renderer.info})''')),flush=True)
 b.close()
