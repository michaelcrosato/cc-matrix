import * as T from 'three/webgpu';
import {mesh,ball,box,tube,ring,toon} from './materials.js';
export function createInstrument(tool){const root=new T.Group(),pivot=new T.Group();root.add(pivot);pivot.name='Tool';pivot.rotation.z=-.65;pivot.rotation.x=.4;
 const steel=toon('#b7d9d2'),dark=toon('#183c49'),grip=toon(tool===5?'#653747':tool===3?'#46bdab':'#358799');
 const rod=(x,z,l=.4,r=.018)=>mesh(new T.CylinderGeometry(r,r*.8,l,10),steel,pivot,x,l/2+.03,z);
 const jaws=[];
 if(tool===0){rod(0,0,.35,.025);const blade=mesh(new T.ConeGeometry(.038,.18,3),'#edf6e3',pivot,0,.015,0);blade.rotation.z=Math.PI;box(pivot,dark,0,.34,0,.055,.18,.04);}
 else if(tool===1||tool===7||tool===4){for(const side of [-1,1]){const jaw=new T.Group();jaw.name=side===1?'JawR':'JawL';jaw.position.x=side*.012;pivot.add(jaw);tube(jaw,steel,[[side*.004,.0,0],[side*.035,.15,0],[side*.045,.38,0]],tool===7?.018:.012);ring(jaw,grip,side*.045,.4,0,.045,.009);jaws.push(jaw);}if(tool===4)tube(pivot,'#edf1e1',[[0,0,0],[.06,-.03,0],[.08,-.1,0],[.02,-.12,0]],.009);}
 else if(tool===6){rod(0,0,.32,.023);const disc=mesh(new T.CylinderGeometry(.08,.065,.035,32),dark,pivot,0,.02,0);ring(pivot,'#53eeee',0,0,.022,.062,.007).rotation.x=Math.PI/2;box(pivot,'#b8e9df',0,.28,0,.07,.16,.055);}
 else {rod(0,0,.35,.022);box(pivot,grip,0,.28,0,.065,.24,.06);if(tool===2)tube(pivot,'#1b414f',[[0,.4,0],[.08,.5,.03],[.17,.48,.14],[.26,.51,.26]],.018);if(tool===3)ball(pivot,'#a9ffe0',0,.15,0,.06,.12,.05);if(tool===5)ball(pivot,'#f36998',0,0,0,.025);}
 const mixer=new T.AnimationMixer(root);const clip=new T.AnimationClip('use',.3,[new T.NumberKeyframeTrack('Tool.position[y]',[0,.12,.3],[0,-.025,0])]);const action=mixer.clipAction(clip);action.play();action.paused=true;
 return{root,update(dt,use){action.paused=!use;mixer.update(dt);for(let i=0;i<jaws.length;i++)jaws[i].rotation.z=(i?1:-1)*(use?.02:.09);}};
}
export function makePaddles(){const root=new T.Group();for(const side of [-1,1]){const p=new T.Group();p.name=side===1?'RightPaddle':'LeftPaddle';p.position.set(side*.65,.3,0);box(p,'#ced8ce',0,0,0,.36,.06,.3);box(p,'#d9b43e',0,.09,0,.22,.13,.12);tube(p,'#21333b',[[0,.1,0],[side*.2,.15,.2],[side*.4,.12,.3]],.025);root.add(p);}return root;}
