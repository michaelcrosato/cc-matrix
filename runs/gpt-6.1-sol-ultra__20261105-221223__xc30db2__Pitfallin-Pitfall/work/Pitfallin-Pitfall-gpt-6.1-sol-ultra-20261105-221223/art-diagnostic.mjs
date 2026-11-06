import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
const source=`import * as THREE from 'three/webgpu';import {createArt} from './art.js';import {LEVEL} from './game.js';
const q=new URLSearchParams(location.search);const full=q.has('full'),shadows=q.has('shadows');
window.diag={full,shadows,ready:false,lost:false,frames:0,errors:[]};
addEventListener('error',e=>diag.errors.push(e.message));
const scene=new THREE.Scene();scene.background=new THREE.Color('#88b5a2');
const camera=new THREE.OrthographicCamera(-17,17,9.56,-9.56,.1,150);camera.position.set(20,7.8,25);camera.lookAt(20,2.8,0);
const renderer=new THREE.WebGPURenderer({antialias:true});renderer.setSize(1280,720);document.body.append(renderer.domElement);renderer.onDeviceLost=e=>{diag.lost=e;};
await renderer.init();diag.backend=renderer.backend.isWebGPUBackend?'WebGPU':'WebGL2';renderer.backend.device?.addEventListener('uncapturederror',e=>diag.errors.push(e.error.message));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.shadowMap.enabled=shadows;
const hemi=new THREE.HemisphereLight(0xf7e8bc,0x294c43,2.6);scene.add(hemi);const key=new THREE.DirectionalLight(0xffedb3,3);key.position.set(30,16,14);key.castShadow=shadows;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-22;key.shadow.camera.right=22;key.shadow.camera.top=16;key.shadow.camera.bottom=-14;key.target.position.set(20,0,0);scene.add(key,key.target);
const fill=new THREE.DirectionalLight(0x9ae3d8,1.4);fill.position.set(-10,8,-8);scene.add(fill);
let art;if(full){art=createArt(THREE,scene,LEVEL);}else{const box=new THREE.Mesh(new THREE.BoxGeometry(4,4,4),new THREE.MeshStandardMaterial({color:'#e0a030',flatShading:true}));box.position.set(20,2,0);box.castShadow=true;box.receiveShadow=true;scene.add(box);const plane=new THREE.Mesh(new THREE.BoxGeometry(25,.25,12),new THREE.MeshStandardMaterial({color:'#385c43'}));plane.position.set(20,-1,0);plane.receiveShadow=true;scene.add(plane);}
diag.ready=true;const start=performance.now();renderer.setAnimationLoop(now=>{diag.frames++;const t=(now-start)/1000;art?.update({time:t,player:{x:25,y:0,vx:0,grounded:true},collected:new Set(),coins:new Set(),hazards:LEVEL,vines:LEVEL.vines},1/60);renderer.render(scene,camera);diag.calls=renderer.info.render.calls;diag.triangles=renderer.info.render.triangles;});`;
const result=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'js'},bundle:true,format:'esm',target:'es2022',minify:true,write:false,legalComments:'none'});
await writeFile('art-diagnostic.html','<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><script type="module">'+result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
