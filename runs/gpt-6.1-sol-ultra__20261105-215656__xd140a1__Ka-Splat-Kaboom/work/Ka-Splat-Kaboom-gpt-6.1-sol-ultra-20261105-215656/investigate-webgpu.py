import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=root/'Ka-Splat-Kaboom-gpt-6.1-sol-ultra-20261105-215656.html'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=swiftshader','--disable-vulkan-surface'])
    page=browser.new_page(viewport={'width':1280,'height':720})
    messages=[]
    page.on('console',lambda m: messages.append({'type':m.type,'text':m.text[:1000]}))
    page.on('pageerror',lambda m:messages.append({'type':'pageerror','text':str(m)}))
    page.goto(html.as_uri())
    page.wait_for_function('!!window.__game',timeout=60000)
    page.wait_for_timeout(4000)
    info=page.evaluate('''async()=>{
      const g=__game,s=g.scene,r=s.renderer;
      r.backend.device.addEventListener('uncapturederror',e=>console.error('GPU uncaptured',e.error.message));
      const counts={};s.scene.traverse(o=>{counts[o.type]=(counts[o.type]||0)+1});
      let cull=0,visible=0;const mesh=[];
      s.scene.traverse(o=>{if(o.isMesh){if(o.visible)visible++;if(mesh.length<2)mesh.push({name:o.name,position:o.position.toArray(),matrix:o.matrixWorld.toArray(),count:o.geometry.index?.count,material:o.material.type,color:o.material.color?.getHexString()});}});
      return {info:r.info,backend:s.backend,adapter:r.backend.adapterInfo,device:r.backend.device?.limits?.maxBindGroups,counts,visible,mesh,camera:{pos:s.camera.position.toArray(),proj:s.camera.projectionMatrix.toArray(),worldInverse:s.camera.matrixWorldInverse.toArray()},state:g.state};
    }''')
    pixels = page.evaluate('''async()=>{const s=__game.scene,r=s.renderer,d=r.backend.device;r.render(s.scene,s.camera);const texture=r.backend.context.getCurrentTexture();const width=texture.width,height=texture.height,bpr=Math.ceil(width*4/256)*256;const buffer=d.createBuffer({size:bpr*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});const enc=d.createCommandEncoder();enc.copyTextureToBuffer({texture},{buffer,bytesPerRow:bpr},{width,height,depthOrArrayLayers:1});d.queue.submit([enc.finish()]);await buffer.mapAsync(GPUMapMode.READ);const data=new Uint8Array(buffer.getMappedRange());let colors=new Set(),nonWhite=0,sum=0;for(let y=0;y<height;y+=3)for(let x=0;x<width;x+=3){let i=y*bpr+x*4;let c=data.slice(i,i+4);colors.add(Array.from(c).join(','));if(c[0]<240||c[1]<240||c[2]<240)nonWhite++;sum+=c[0]+c[1]+c[2]};const result={width,height,colors:colors.size,nonWhite,sum,samples:[...colors].slice(0,30)};buffer.unmap();buffer.destroy();return result}''')
    page.screenshot(path=str(Path(__file__).with_name('webgpu-investigate.png')))
    print(json.dumps({'pixels':pixels}))
    page.wait_for_timeout(1000)
    print(json.dumps({'info':info,'messages':messages},indent=2))
    browser.close()
