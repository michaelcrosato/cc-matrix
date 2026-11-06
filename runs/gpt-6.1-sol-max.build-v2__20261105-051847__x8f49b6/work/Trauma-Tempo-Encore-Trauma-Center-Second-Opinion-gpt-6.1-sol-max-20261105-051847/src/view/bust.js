import * as T from 'three/webgpu';
import {cast} from '../data/cast.js';
import {mesh,ball,tube,box,ring,toon} from './materials.js';
export function createBust(id='ren',overrides={}){
 const spec={...(cast[id]||cast.ren),...overrides};const root=new T.Group(),body=new T.Group(),head=new T.Group();body.name='Body';head.name='Head';root.add(body);root.add(head);
 const skin=spec.skin||'#d8a589',hair=spec.hair||'#293640',clothes=spec.coat||'#17707a';
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 let mood='neutral',mouth=0;
 function draw(){ctx.fillStyle=skin;ctx.fillRect(0,0,1024,512);const eyeY=mood==='wide'?225:232;for(const side of [-1,1]){const x=256+side*62;ctx.fillStyle='#aa665a';ctx.globalAlpha=.24;ctx.beginPath();ctx.ellipse(x,284,27,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 const ry=mood==='closed'?3:mood==='narrow'?13:25;
 ctx.fillStyle='#fffaf2';ctx.strokeStyle='#21162a';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(x,eyeY,30,ry,-side*.1,0,Math.PI*2);ctx.fill();ctx.stroke();
 if(mood!=='closed'){const grad=ctx.createLinearGradient(0,eyeY-20,0,eyeY+20);grad.addColorStop(0,'#11142b');grad.addColorStop(.5,spec.eyes||'#3b7578');grad.addColorStop(1,'#b0e8db');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(x,eyeY,15,Math.max(9,ry-3),0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#10111e';ctx.beginPath();ctx.ellipse(x,eyeY-2,7,Math.max(8,ry-5),0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-5,eyeY-9,6,5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+5,eyeY+7,2.5,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle=hair;ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-27,eyeY-40+(mood==='sad'?side*5:0));ctx.lineTo(x+27,eyeY-42+(mood==='narrow'?side*10:0));ctx.stroke();}
 ctx.strokeStyle='#92554e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(253,270);ctx.lineTo(246,292);ctx.lineTo(258,296);ctx.stroke();
 ctx.fillStyle='#6b3342';ctx.strokeStyle='#623444';ctx.lineWidth=3;ctx.beginPath();if(mouth){ctx.ellipse(256,334,14+mouth*3,6+mouth*5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#efb0a7';ctx.beginPath();ctx.ellipse(256,340+mouth*2,11,3,0,0,Math.PI*2);ctx.fill();}else{ctx.moveTo(235,329);ctx.quadraticCurveTo(255,mood==='sad'?320:340,277,328);ctx.stroke();}
 if(id==='ines'){ctx.strokeStyle='#9f6766';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(172,166);ctx.lineTo(194,223);ctx.stroke();}
 if(['bell','voss'].includes(id)||overrides.age>55){ctx.strokeStyle='rgba(80,40,35,.35)';ctx.lineWidth=2;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(256+side*95,237);ctx.lineTo(256+side*112,247);ctx.stroke();}}
 if(mood==='wide'&&id==='ren'){ctx.fillStyle='#a6e4ef';ctx.beginPath();ctx.ellipse(125,215,6,18,.3,0,Math.PI*2);ctx.fill();}
 tex.needsUpdate=true;}
 const geo=new T.SphereGeometry(1,64,48),p=geo.attributes.position;for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<0){let t=-y,jaw=t>.25?((t-.25)/.75)**1.4:0;x*=1-.1*t-.42*jaw;z*=1-.12*t;z+=.05*t*t;y*=1+.16*t;}p.setXYZ(i,x,y,z*.94);}geo.computeVertexNormals();mesh(geo,toon('#ffffff',{map:tex}),head);
 mesh(new T.CylinderGeometry(.36,.44,.7,20),skin,body,0,-1.18,0);
 const points=[[.34,.9],[.55,.82],[1.5,.52],[1.95,.05],[2.08,-.8],[2.1,-2.2]].reverse().map(([r,y])=>new T.Vector2(r,y));const torso=mesh(new T.LatheGeometry(points,40),clothes,body,0,-2.08,0);torso.scale.z=.62;
 const collarMat=toon(id==='ines'?'#414350':'#d8efe4');for(const side of [-1,1]){const collar=box(body,collarMat,side*.37,-1.61,.58,.22,.72,.06);collar.rotation.z=side*.55;}
 if(id==='ren'||id==='bell'){for(const side of [-1,1]){const lapel=box(body,'#fbf4df',side*.63,-1.9,.73,.44,1.25,.08);lapel.rotation.z=side*.23;}tube(body,'#20333c',[[-.47,-1.25,.59],[-.65,-1.8,.9],[-.43,-2.3,.97],[.32,-2.33,.98],[.55,-1.6,.8],[.42,-1.25,.55]],.05);ball(body,'#97b3b0',.35,-2.3,1.03,.12,.12,.035);}
 if(id==='bell'){for(const side of [-1,1]){const bow=mesh(new T.ConeGeometry(.23,.4,3),'#91344a',body,side*.18,-1.5,.71);bow.rotation.z=side*Math.PI/2;const m=ball(head,'#f5ecd8',side*.29,-.44,.86,.38,.13,.12);m.rotation.z=-side*.15;}ball(head,'#f2e3cc',0,-.42,.92,.11,.11,.08);}
 if(spec.style!=='bald'){
 const cap=mesh(new T.SphereGeometry(1.06,40,24,0,Math.PI*2,0,Math.PI*.33),hair,head,0,.035,0);
 if(['bob','long','slick'].includes(spec.style)){const back=ball(head,hair,0,-.05,-.31,1.05,spec.style==='long'?1.5:1.08,.78);if(spec.style==='long')back.position.y=-.5;}
 if(spec.style!=='wrap')for(let i=0;i<19;i++){const a=i/18*Math.PI,x=Math.cos(a)*.91,y=.58+Math.sin(a)*.15,z=.52+Math.sin(a)*.24;const len=spec.style==='spiky'?.36+(i%3)*.12:spec.style==='bob'?.58:.32;const lock=mesh(new T.ConeGeometry(.19,len,5),hair,head,x,y,z);lock.rotation.z=Math.PI+(i-9)*.055;lock.rotation.x=.23;}
 if(spec.style==='bob'){box(head,'#e4e6df',.48,.48,.75,.12,.61,.08).rotation.z=-.14;for(const side of [-1,1])ball(head,hair,side*.9,-.3,.1,.21,.63,.35);}
 if(spec.style==='buns')for(const side of [-1,1]){ball(head,hair,side*.83,.83,-.13,.38,.37,.35);ring(head,'#eac157',side*.82,.74,.1,.27,.035);}
 }
 if(spec.style==='wrap'){for(let i=0;i<5;i++)ball(head,i%2?'#edaa29':'#f9c24a',0,.63+i*.08,-.02,1.08-i*.09,.35,.88-i*.04);ball(head,'#bfc3b9',0,.48,-.75,.57,.55,.4);const knot=ball(head,'#f2b134',-.65,.85,.25,.31,.45,.3);knot.rotation.z=.55;}
 if(['bea','sorrento'].includes(id)||spec.style==='wrap'){for(const side of [-1,1])ring(head,'#17252b',side*.36,.04,.91,.27,.033);tube(head,'#17252b',[[-.09,.04,.95],[0,.07,.98],[.09,.04,.95]],.023);}
 // Pens, pocket and hospital badge make the silhouette read as a clinician.
 box(body,'#e7e5ce',-.8,-2.2,.91,.36,.36,.055);box(body,'#e6ac3a',-.8,-2.14,.95,.25,.08,.025);for(let i=0;i<2;i++)box(body,i?'#e6b954':'#7ce3d2',.8+i*.09,-1.9,.93,.045,.38,.04);
 const mixer=new T.AnimationMixer(root),clips={};
 const add=(name,times,values,path,loop=false)=>{const clip=new T.AnimationClip(name,times.at(-1),[new T.NumberKeyframeTrack(path,times,values)]);const a=mixer.clipAction(clip);a.setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);a.clampWhenFinished=!loop;clips[name]=a;};
 add('idle',[0,1.6,3.2],[0,.018,0],'Body.rotation[z]',true);clips.idle.play();
 for(const [name,values] of Object.entries({nod:[0,.16,-.08,0],shake:[0,.17,-.17,0],shock:[0,-.25,-.1,0],lean:[0,.16,.16,0],sigh:[0,.1,.12,0],bow:[0,.3,.3,0],slump:[0,.3,.3,.3],collapse:[0,.3,1.1,1.7]}))add(name,[0,.16,.45,.8],values,`Head.rotation[${name==='shake'?'y':'x'}]`);
 draw();return{root,spec,mixer,clips,expression(m){if(m!==mood){mood=m;draw();}},talk(n){n=Math.floor(n)%4;if(n!==mouth){mouth=n;draw();}},animate(name){clips[name]?.reset().play();},update(dt){mixer.update(dt);},dispose(){tex.dispose();}};
}
