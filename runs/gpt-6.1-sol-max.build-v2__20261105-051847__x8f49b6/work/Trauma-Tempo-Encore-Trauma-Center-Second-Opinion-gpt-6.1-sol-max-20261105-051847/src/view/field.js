import * as T from 'three/webgpu';
import {positionLocal,normalLocal,uniform,smoothstep,dot,normalView,normalize,vec3,max,positionWorld,mix,step,length,vec2} from 'three/tsl';
import {toon,mesh,box,tube,ball,ring} from './materials.js';
export function heightAt(kind,x,y){let h=.04;const g=(a,b,sx,sy,n)=>n*Math.exp(-1*((x-a)/sx)**2-((y-b)/sy)**2);
 if(kind==='forearm')h+=g(0,0,2,.55,.25);
 else if(kind==='heart')h+=g(-.28,.1,.6,.65,.37)+g(.35,-.1,.65,.65,.3);
 else if(kind==='liver')h+=g(-.5,0,.85,.65,.25)+g(.55,.1,.7,.5,.18)-g(.15,0,.1,.7,.05);
 else if(kind==='bowel')h+=.12+Math.sin(y*21+Math.sin(x*4)*2)*.055;
 else if(kind==='brain')h+=g(0,0,1.2,.8,.2)+Math.sin(x*23+Math.sin(y*14))*Math.sin(y*20)*.037;
 else if(kind==='lung')h+=g(-.55,0,.46,.7,.28)+g(.55,0,.46,.7,.28);
 else if(kind==='aorta')h+=g(0,.08,2,.24,.3);
 else h+=g(0,0,1.3,.75,.2);
 return h+.001*Math.sin(x*49+Math.sin(y*29))+.0008*Math.sin(y*63+x*21);
}
const siteColors={forearm:'#e2ae8a',abdomen:'#e4ac89',liver:'#b44356',bowel:'#ec8d9e',brain:'#edb7c7',heart:'#d44e65',lung:'#e994a2',aorta:'#d65368',stomach:'#e9a185'};
export function makeField(){const root=new T.Group(),surfaceGroup=new T.Group();root.add(surfaceGroup);
 const beat=uniform(0),scanner=uniform(new T.Vector3(10,0,10)),scanOn=uniform(0),scanRadius=uniform(.3);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 let kind='forearm',surface,stavePainted=false;
 const body=box(root,'#d3aa8c',0,-.08,0,3.45,.25,2.2);body.receiveShadow=true;
 const outer=new T.Shape();outer.moveTo(-3,-2);outer.lineTo(3,-2);outer.lineTo(3,2);outer.lineTo(-3,2);outer.closePath();const hole=new T.Path();for(let i=0;i<=100;i++){const a=-i/100*Math.PI*2,r=1+.025*Math.sin(a*7);const x=Math.cos(a)*1.43*r,y=Math.sin(a)*.87*r;if(!i)hole.moveTo(x,y);else hole.lineTo(x,y);}outer.holes.push(hole);
 const drape=mesh(new T.ExtrudeGeometry(outer,{depth:.08,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1,curveSegments:80}),toon('#17707a'),root,0,.33,0);drape.rotation.x=-Math.PI/2;drape.receiveShadow=true;
 // Stitched binding around the fenestration, and fabric seams.
 const edge=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,r=1+.025*Math.sin(a*7);edge.push([Math.cos(a)*1.46*r,.39,-Math.sin(a)*.9*r]);}tube(root,'#103f49',edge,.025);
 for(let i=0;i<12;i++){const x=-2.8+i*.51;tube(root,i%2?'#1a6670':'#217781',[[x,.34,1.6],[x+.08,.36,1.3],[x+.14,.37,.95]],.006);}
 const tray=new T.Group();root.add(tray);box(tray,'#264953',1.69,.32,-.2,.64,.12,.94);box(tray,'#b8d5cf',1.69,.4,-.2,.6,.04,.9);for(const z of [-.68,.28])box(tray,'#7a9e9c',1.69,.46,z,.65,.08,.025);for(const x of [1.36,2.02])box(tray,'#87aaa5',x,.46,-.2,.025,.08,.95);
 const mat=toon('#ffffff',{map:texture});mat.positionNode=positionLocal.add(normalLocal.mul(beat.mul(.025)));
 const g1=smoothstep(.997,.998,dot(normalView,normalize(vec3(.22,.62,.75)))),g2=smoothstep(.999,.9994,dot(normalView,normalize(vec3(-.35,.5,.8))));mat.emissiveNode=vec3(1,.93,.9).mul(max(g1.mul(.85),g2.mul(.6)));
 const scanDisc=mesh(new T.CircleGeometry(1,64),new T.MeshBasicNodeMaterial({color:'#22e8e5',transparent:true,opacity:.18,depthWrite:false}),root);scanDisc.rotation.x=-Math.PI/2;scanDisc.visible=false;
 function reset(next){stavePainted=false;kind=next;ctx.fillStyle=siteColors[kind]||siteColors.forearm;ctx.fillRect(0,0,1024,1024);const grad=ctx.createRadialGradient(512,500,80,512,500,550);grad.addColorStop(0,'rgba(255,224,218,.12)');grad.addColorStop(1,'rgba(50,0,30,.22)');ctx.fillStyle=grad;ctx.fillRect(0,0,1024,1024);
 const rnd=(n)=>{const v=Math.sin(n*17.432)*4132.23;return v-Math.floor(v);};
 function branch(x,y,a,len,w,depth,index){if(depth<=0)return;const ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len;ctx.strokeStyle=kind==='forearm'?'rgba(120,65,74,.2)':'rgba(84,35,86,.38)';ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(a+.3)*len*.6,y+Math.sin(a+.3)*len*.6,ex,ey);ctx.stroke();branch(ex,ey,a-.45+rnd(index)*.3,len*.64,w*.57,depth-1,index+1);branch(ex,ey,a+.5,len*.6,w*.55,depth-1,index+11);}
 for(let i=0;i<8;i++)branch(rnd(i+1)*1024,rnd(i+32)*1024,rnd(i+72)*6.28,110,6,4,i+1);
 if(kind==='bowel'||kind==='brain'){ctx.strokeStyle='rgba(111,27,68,.25)';ctx.lineWidth=5;for(let y=120;y<1000;y+=kind==='brain'?56:97){ctx.beginPath();for(let x=0;x<1024;x+=5){const yy=y+Math.sin(x*(kind==='brain'?.04:.015)+y*.02)*24;if(!x)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();}}
 texture.needsUpdate=true;
 if(surface){surfaceGroup.remove(surface);surface.geometry.dispose();}
 const geo=new T.PlaneGeometry(3.6,2.5,180,130);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,heightAt(kind,p.getX(i),-p.getZ(i)));geo.computeVertexNormals();surface=mesh(geo,mat,surfaceGroup);surface.castShadow=false;surface.receiveShadow=true;
 }
 function paint(type,x,y){const cx=(x+1.8)/3.6*1024,cy=(1.25-y)/2.5*1024;ctx.fillStyle=type==='scorch'?'rgba(73,25,56,.12)':type==='gel'?'rgba(124,242,201,.18)':'rgba(180,10,43,.45)';ctx.beginPath();ctx.ellipse(cx,cy,type==='gel'?26:9,type==='gel'?26:3,0,0,Math.PI*2);ctx.fill();texture.needsUpdate=true;}
 reset(kind);
 return{root,reset,paint,height:(x,y)=>x>1.36&&y>-.2&&y<.6?.46:heightAt(kind,x,y),update(s){if(!stavePainted&&s.entities.some(e=>!e.done&&['adagio','tremolo','legato','crescendo','fermata','coda','nest','note'].includes(e.kind))){stavePainted=true;ctx.strokeStyle='rgba(42,13,53,.3)';ctx.lineWidth=2.5;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(140,440+i*24);ctx.bezierCurveTo(380,423+i*24,700,465+i*24,890,448+i*24);ctx.stroke();}texture.needsUpdate=true;}beat.value=s.pulse||0;const seat=s.seats[0];scanDisc.visible=seat?.tool===6&&seat.use>0;if(scanDisc.visible){scanDisc.position.set(seat.x,heightAt(kind,seat.x,seat.y)+.05,-seat.y);scanDisc.scale.setScalar(.3);}}};
}
