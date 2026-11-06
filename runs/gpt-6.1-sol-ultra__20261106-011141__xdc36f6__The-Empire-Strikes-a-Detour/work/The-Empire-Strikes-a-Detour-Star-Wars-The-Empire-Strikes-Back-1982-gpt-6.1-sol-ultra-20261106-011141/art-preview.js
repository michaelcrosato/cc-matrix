import * as THREE from 'three/webgpu';
import {createWorld,createSpeeder,createWalker,createProbe,createTransport,createAce} from './art.js';
window.previewErrors=[];window.addEventListener('error',e=>window.previewErrors.push(e.message));
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9ec7cf);scene.fog=new THREE.Fog(0x9ec7cf,290,700);
const renderer=new THREE.WebGPURenderer({antialias:true,forceWebGL:location.search.includes('fallback')});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.appendChild(renderer.domElement);
await renderer.init();
const camera=new THREE.OrthographicCamera(-160,160,100,-100,.1,1500);camera.position.set(0,150,220);camera.lookAt(0,0,-5);
const world=createWorld(scene),walkers=[];
for(const [x,z] of [[-48,-45],[49,-65]]) {const w=createWalker();w.position.set(x,0,z);w.rotation.y=Math.PI;scene.add(w);walkers.push(w);}
const sp=createSpeeder();sp.position.set(0,7,-5);scene.add(sp);
const tr=createTransport();tr.position.set(45,6,15);tr.scale.setScalar(.75);scene.add(tr);
const ace=createAce();ace.position.set(90,15,-20);scene.add(ace);
for(const x of [-100,100]) {const p=createProbe();p.position.set(x,10,-80);scene.add(p);walkers.push(p);}
window.preview={ready:true,backend:renderer.backend.constructor.name};
let t=0;renderer.setAnimationLoop(()=>{t+=1/60;world.update(1/60,t);for(const w of walkers)w.userData.mixer?.update(1/60);renderer.render(scene,camera);window.preview.frames=(window.preview.frames||0)+1;});
