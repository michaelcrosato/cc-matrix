from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':400,'height':300})
 page.route('**/gpu-clear',lambda r:r.fulfill(status=200,content_type='text/html',body='<canvas width="400" height="300"></canvas>'))
 page.goto('http://127.0.0.1:40835/gpu-clear')
 result=page.evaluate('''async()=>{
  const result={supported:!!navigator.gpu};const ad=await navigator.gpu.requestAdapter();result.adapter=!!ad;if(!ad)return result;
  const d=await ad.requestDevice();d.lost.then(i=>window.__lost={reason:i.reason,message:i.message});d.addEventListener('uncapturederror',e=>window.__uncaptured=e.error.message);
  window.__ad=ad;window.__d=d;
  const c=document.querySelector('canvas');const ctx=c.getContext('webgpu');ctx.configure({device:d,format:navigator.gpu.getPreferredCanvasFormat()});
  const enc=d.createCommandEncoder();const pass=enc.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),clearValue:{r:.9,g:.05,b:.1,a:1},loadOp:'clear',storeOp:'store'}]});pass.end();d.queue.submit([enc.finish()]);
  try{await d.queue.onSubmittedWorkDone();result.workDone=true;}catch(e){result.error=e.message;}
  await new Promise(r=>setTimeout(r,1000));result.lost=window.__lost||null;result.uncaptured=window.__uncaptured||null;return result;
 }''')
 print(json.dumps(result));b.close()
