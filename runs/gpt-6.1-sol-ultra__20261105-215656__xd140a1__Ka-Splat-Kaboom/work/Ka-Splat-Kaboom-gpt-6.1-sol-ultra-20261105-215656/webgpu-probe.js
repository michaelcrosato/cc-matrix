import * as THREE from 'three/webgpu';
window.logs=[];const q=new URLSearchParams(location.search);
if(q.has('noFeatures')){const original=GPUAdapter.prototype.requestDevice;GPUAdapter.prototype.requestDevice=function(o){o.requiredFeatures=[];return original.call(this,o)}}
const orig=GPUDevice.prototype.destroy;GPUDevice.prototype.destroy=function(){console.error('explicit destroy',new Error().stack);return orig.call(this)};
const renderer=new THREE.WebGPURenderer({antialias:!q.has('noAA')});renderer.setSize(640,480);document.body.appendChild(renderer.domElement);await renderer.init();
renderer.backend.device.lost.then(info=>console.error('LOST',info.message,info.reason));renderer.backend.device.addEventListener('uncapturederror',e=>console.error('VALIDATION',e.error.message));
const scene=new THREE.Scene();scene.background=new THREE.Color(0x663388);const camera=new THREE.PerspectiveCamera(45,640/480,.1,100);camera.position.z=5;
scene.add(new THREE.AmbientLight(0xffffff,2));
let mesh=new THREE.Mesh(new THREE.BoxGeometry(),q.has('toon')?new THREE.MeshToonMaterial({color:0x22ff55}):new THREE.MeshBasicMaterial({color:0x22ff55}));scene.add(mesh);
let frames=0;function frame(){frames++;mesh.rotation.x+=.01;renderer.render(scene,camera);requestAnimationFrame(frame)};requestAnimationFrame(frame);
window.__probe={renderer,scene,camera,get frames(){return frames}};
