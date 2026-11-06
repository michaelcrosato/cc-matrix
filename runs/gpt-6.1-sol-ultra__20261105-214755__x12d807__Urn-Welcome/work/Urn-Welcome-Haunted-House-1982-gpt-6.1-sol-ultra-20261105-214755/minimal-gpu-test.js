import * as THREE from 'three/webgpu';
import {normalWorld,vec3,color} from 'three/tsl';
import {Visuals} from './visuals.js';
const q=new URLSearchParams(location.search);window.GPU_TEST={ready:false,errors:[],lost:null,content:q.get('content')||'simple',features:q.get('features')||'default'};
if (q.get('features')==='none') {const original=GPUAdapter.prototype.requestDevice;GPUAdapter.prototype.requestDevice=function(descriptor){return original.call(this,{...descriptor,requiredFeatures:[]});};}
try{
const renderer=new THREE.WebGPURenderer({antialias:q.get('antialias')!=='false'});renderer.setSize(800,600);document.body.append(renderer.domElement);await renderer.init();
renderer.backend.device.addEventListener('uncapturederror',e=>GPU_TEST.errors.push(e.error.message));renderer.backend.device.lost.then(info=>GPU_TEST.lost={reason:info.reason,message:info.message});
let scene,camera,visuals;
if(q.get('content')==='visuals'){visuals=new Visuals();visuals.mode(true);visuals.resize(800,600,'title');scene=visuals.scene;camera=visuals.camera;}
else {scene=new THREE.Scene();scene.background=new THREE.Color('#223344');camera=new THREE.PerspectiveCamera(50,800/600,.1,100);camera.position.set(4,3,6);camera.lookAt(0,0,0);const mat=new THREE.MeshBasicNodeMaterial({color:'#c79169'});if(q.get('content')==='tsl')mat.colorNode=color('#c79169').mul(normalWorld.dot(vec3(.35,.85,.4)).max(0).mul(3).floor().div(3).mul(.42).add(.58));scene.add(new THREE.Mesh(new THREE.BoxGeometry(2,2,2),mat));}
window.GPU_TEST.renderer=renderer;GPU_TEST.ready=true;let previous=performance.now();function frame(now){visuals?.update(Math.min(.05,(now-previous)/1000),now/1000);previous=now;renderer.render(scene,camera);GPU_TEST.stats={lost:renderer._isDeviceLost,calls:renderer.info.calls,render:{...renderer.info.render},deviceFeatures:[...renderer.backend.device.features]};requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(e){GPU_TEST.errors.push(e.stack);GPU_TEST.ready=true;}
