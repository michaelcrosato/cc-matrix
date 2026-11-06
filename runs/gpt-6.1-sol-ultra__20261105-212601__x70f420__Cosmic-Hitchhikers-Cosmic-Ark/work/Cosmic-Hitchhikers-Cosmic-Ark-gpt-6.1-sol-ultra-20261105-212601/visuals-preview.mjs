import * as THREE from 'three/webgpu';
import {Visuals} from './visuals.js';
const renderer=new THREE.WebGPURenderer({antialias:true,forceWebGL:location.hash==='#webgl'});
renderer.setSize(1600,900);renderer.setPixelRatio(1);await renderer.init();document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x071725);
const camera=new THREE.OrthographicCamera(-18,18,10.125,-10.125,.1,120);camera.position.set(0,2,42);camera.lookAt(0,0,0);
const visuals=new Visuals(THREE,scene);
const state={phase:'rescue',time:1,planet:0,ark:{x:0,y:5},ship:{x:-7.5,y:-3,vx:0},beam:true,creatures:[{id:1,x:-8,y:-7.4},{id:2,x:7.5,y:-7.4}],hazards:[{id:1,x:9,y:-5.5}],bolts:[],meteors:[]};
let prev=performance.now();renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min(.1,(now-prev)/1000);prev=now;state.time+=dt;visuals.update(dt,state);renderer.render(scene,camera);window.previewReady=true;});
