import * as THREE from 'three/webgpu';
import './main.js';
const retained=[];window.__gpuKeepAlive=retained;
if(navigator.gpu){const request=navigator.gpu.requestAdapter.bind(navigator.gpu);navigator.gpu.requestAdapter=async function(options){const adapter=await request(options);if(adapter)retained.push(adapter);return adapter;};}
const render=THREE.WebGPURenderer.prototype.render;
let box;
THREE.WebGPURenderer.prototype.render=function(scene,camera){
 this.shadowMap.enabled=false;scene.traverse(o=>{if(o.isLight)o.castShadow=false;});
 if(location.hash.includes('small')){if(!box){box=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial({color:0xdb6552}));box.position.set(0,10,0);scene.add(box);}for(const o of scene.children)o.visible=o===box;}
 window.__visual={renderer:this,scene,camera};
 return render.call(this,scene,camera);
};
