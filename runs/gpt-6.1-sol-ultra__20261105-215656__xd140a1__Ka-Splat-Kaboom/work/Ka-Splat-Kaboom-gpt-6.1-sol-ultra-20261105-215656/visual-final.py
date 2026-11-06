import json
from pathlib import Path
from playwright.sync_api import sync_playwright
folder=Path(__file__).resolve().parent
url=(folder.parent/'Ka-Splat-Kaboom-gpt-6.1-sol-ultra-20261105-215656.html').as_uri()
readback='''async()=>{
 const s=__game.scene,r=s.renderer,d=r.backend.device;r.render(s.scene,s.camera);
 const texture=r.backend.context.getCurrentTexture(),width=texture.width,height=texture.height,bpr=Math.ceil(width*4/256)*256;
 const buffer=d.createBuffer({size:bpr*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
 const enc=d.createCommandEncoder();enc.copyTextureToBuffer({texture},{buffer,bytesPerRow:bpr},{width,height,depthOrArrayLayers:1});d.queue.submit([enc.finish()]);await buffer.mapAsync(GPUMapMode.READ);
 const raw=new Uint8Array(buffer.getMappedRange()),pixels=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)pixels.set(raw.subarray(y*bpr,y*bpr+width*4),y*width*4);if(texture.format.startsWith('bgra'))for(let i=0;i<pixels.length;i+=4){let t=pixels[i];pixels[i]=pixels[i+2];pixels[i+2]=t;}
 const c=document.createElement('canvas');c.id='gpu-inspection';c.width=width;c.height=height;c.style.cssText='width:100%;height:100%;position:fixed;inset:0;pointer-events:none';c.getContext('2d').putImageData(new ImageData(pixels,width,height),0,0);s.canvas.insertAdjacentElement('afterend',c);s.canvas.style.visibility='hidden';buffer.unmap();buffer.destroy();return {width,height,backend:s.backend,draws:r.info.render.drawCalls};
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=swiftshader','--disable-vulkan-surface'])
 for name,w,h,touch in [('tv',1920,1080,False),('phone',390,844,True)]:
  context=browser.new_context(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch,device_scale_factor=1)
  page=context.new_page()
  page.goto(url);page.wait_for_function('!!window.__game',timeout=60000);page.evaluate('()=>{window.__captureActivity=setInterval(()=>__game.activity(),100)}');page.wait_for_timeout(1500)
  print(name,'title',json.dumps(page.evaluate(readback)),flush=True)
  page.screenshot(path=str(folder/f'final-{name}-title.png'))
  page.evaluate("()=>{document.getElementById('gpu-inspection').remove();__game.scene.canvas.style.visibility='';__game.activity();}")
  if touch:
   rect=page.locator('[data-action="play"]').bounding_box()
   page.touchscreen.tap(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
   page.touchscreen.tap(w*.55,h*.67)
  else: page.locator('[data-action="play"]').click()
  page.evaluate("()=>{clearInterval(window.__captureActivity);__game.model.setConfig({autoplay:true,invincible:true});__game.advance(7,true);__game.scene.modeBlend=0;}")
  page.wait_for_timeout(1500)
  print(name,'game',json.dumps(page.evaluate(readback)),flush=True)
  page.screenshot(path=str(folder/f'final-{name}-game.png'))
  context.close()
 browser.close()
