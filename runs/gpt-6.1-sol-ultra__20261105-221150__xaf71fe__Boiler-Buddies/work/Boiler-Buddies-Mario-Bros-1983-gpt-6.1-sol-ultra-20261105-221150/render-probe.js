import * as THREE from 'three/webgpu';

const query = new URLSearchParams(location.search);
const mode = query.get('mode') || 'basic';
window.probe = { mode, ready: false, frames: 0, lost: false, errors: [], revision: THREE.REVISION };
window.addEventListener('error', (event) => probe.errors.push(event.message));
window.addEventListener('unhandledrejection', (event) => probe.errors.push(String(event.reason)));
const canvas = document.querySelector('canvas');
async function webglProbe() {
  const fresh=document.createElement('canvas');
  fresh.width=800;fresh.height=600;canvas.replaceWith(fresh);
  let recovered;
  if(query.get('recovery')==='three'){
    try{
      recovered=new THREE.WebGPURenderer({canvas:fresh,forceWebGL:true,antialias:query.get('aa')==='1',alpha:false});
      recovered.setSize(800,600);await recovered.init();
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,4/3,.1,100);
      camera.position.z=5;
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicNodeMaterial({color:0xe8a657})));
      for(let n=0;n<4;n++)await recovered.renderAsync(scene,camera);
      probe.recoveredCalls=recovered.info.render.drawCalls;
    }catch(error){probe.errors.push(String(error));probe.webgl={available:false};probe.done=true;return;}
  }
  const gl=recovered?.backend.gl||fresh.getContext('webgl2',{antialias:query.get('aa')==='1'});
  probe.webgl={available:!!gl};
  if(gl){
    gl.clearColor(.2,.8,.3,1);gl.clear(gl.COLOR_BUFFER_BIT);
    const pixels=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    probe.webgl.pixels=Array.from(pixels);
    probe.webgl.error=gl.getError();
    probe.webgl.lost=gl.isContextLost();
    probe.webgl.renderer=gl.getParameter(gl.RENDERER);
    probe.webgl.extensions=gl.getSupportedExtensions().length;
  }
  probe.done=true;
}
if(mode==='gl-only') {
  webglProbe();
} else if (mode.startsWith('raw')) {
  const gpu = navigator.gpu;
  const adapter = await gpu.requestAdapter();
  const device = await adapter.requestDevice();
  window.rawRefs = {gpu,adapter,device};
  probe.backend = 'raw WebGPU';
  device.lost.then(info => {
    probe.lost=true;probe.loss={reason:info.reason,message:info.message};
    if(mode==='raw-fallback') setTimeout(webglProbe,+(query.get('delay')||0));
  });
  device.addEventListener('uncapturederror', event => probe.errors.push(event.error.message));
  const context=canvas.getContext('webgpu');
  context.configure({device,format:gpu.getPreferredCanvasFormat(),alphaMode:'opaque'});
  probe.ready=true;
  const draw=async()=>{
    if(probe.lost||probe.frames>=12){probe.done=true;return;}
    try {
      const encoder=device.createCommandEncoder();
      const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:1,g:.25,b:.1,a:1},loadOp:'clear',storeOp:'store'}]});
      pass.end();device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone();
      probe.frames++;
    }catch(error){probe.errors.push(String(error));if(mode!=='raw-fallback')probe.done=true;return;}
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
} else {
const renderer = new THREE.WebGPURenderer({canvas, antialias: query.get('aa') === '1', alpha: false});
window.renderer = renderer;
renderer.setPixelRatio(1);
renderer.setSize(800, 600);
renderer.shadowMap.enabled = mode === 'shadow' || mode === 'many-shadow';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
await renderer.init();
probe.backend = renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL';
const device = renderer.backend.device;
if (device) {
  probe.adapter = device.adapterInfo ? JSON.stringify(device.adapterInfo) : 'unknown';
  device.lost.then(info => { probe.lost=true; probe.loss={reason:info.reason,message:info.message}; });
  device.addEventListener('uncapturederror', event => probe.errors.push(event.error.message));
}
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x173338);
const camera = new THREE.PerspectiveCamera(45, 4/3, .1, 100);
camera.position.set(4, 3, 7);
camera.lookAt(0, 0, 0);
const geometry = new THREE.BoxGeometry(1, 1, 1);
const type = mode === 'basic' ? THREE.MeshBasicNodeMaterial : THREE.MeshToonNodeMaterial;
const materials = [0xe8a657,0x358f8c,0xef694d,0xb6a7eb].map(color=>new type({color}));
scene.add(new THREE.HemisphereLight(0xb3e8e1,0x55412c,2.1));
const light = new THREE.DirectionalLight(0xffdfaa,3.3);
light.position.set(-10,23,15);
light.castShadow = renderer.shadowMap.enabled;
light.shadow.mapSize.set(2048,2048);
Object.assign(light.shadow.camera,{left:-20,right:20,top:22,bottom:-14,near:.5,far:75});
scene.add(light);
const mesh = new THREE.Mesh(geometry, materials[0]);
mesh.castShadow = mesh.receiveShadow = true;
scene.add(mesh);
if (mode.includes('shadow')) {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8,.2,8),materials[1]);
  floor.position.y=-1.1;
  floor.receiveShadow=true;
  scene.add(floor);
}
if (mode.includes('many')) {
  camera.position.set(11,9,17);
  camera.lookAt(0,0,0);
  for(let index=0;index<400;index++){
    const item = new THREE.Mesh(geometry,materials[index%4]);
    item.position.set((index%20-9.5)*.55,Math.floor(index/20)*.23-2.4,(index%3)*.6-1);
    item.scale.setScalar(.33);
    item.castShadow=item.receiveShadow=true;
    scene.add(item);
  }
}
window.probeScene = scene;
probe.ready=true;
const frameLimit = +(query.get('frames') || 120);
async function frame(){
  if(probe.lost||probe.frames>=frameLimit) {probe.done=true;return;}
  try {
    mesh.rotation.y+=.01;
    if(query.get('sync')==='1') renderer.render(scene,camera);
    else await renderer.renderAsync(scene,camera);
    probe.frames++;
    probe.calls=renderer.info.render.calls;
    if(device&&query.get('wait')==='1') await device.queue.onSubmittedWorkDone();
  } catch(error) {probe.errors.push(String(error));probe.done=true;return;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
}
