import * as T from 'three/webgpu';
const q=(x=0,y=0,z=0)=>new T.Quaternion().setFromEuler(new T.Euler(x*Math.PI/180,y*Math.PI/180,z*Math.PI/180)).toArray();
export function poseClip(name,duration,frames){const joints=new Set(frames.flatMap(f=>Object.keys(f.pose)));let tracks=[];for(const joint of joints){let times=[],values=[];for(const f of frames){times.push(f.t);values.push(...q(...(f.pose[joint]||[0,0,0])));}tracks.push(new T.QuaternionKeyframeTrack(joint+'.quaternion',times,values));}return new T.AnimationClip(name,duration,tracks);}
const f=(t,pose)=>({t,pose});
export function dollClips(){const idle={shoulderL:[0,0,10],shoulderR:[0,0,-10],hipL:[0,0,0],hipR:[0,0,0],spine:[0,0,0],head:[0,0,0]};const clips=[
 poseClip('idle',3,[f(0,idle),f(1.5,{...idle,head:[0,4,2],spine:[-2,0,0]}),f(3,idle)]),
 poseClip('walk',.7,[f(0,{...idle,hipL:[28,0,0],hipR:[-28,0,0],shoulderL:[-22,0,8],shoulderR:[22,0,-8]}),f(.35,{...idle,hipL:[-28,0,0],hipR:[28,0,0],shoulderL:[22,0,8],shoulderR:[-22,0,-8]}),f(.7,{...idle,hipL:[28,0,0],hipR:[-28,0,0],shoulderL:[-22,0,8],shoulderR:[22,0,-8]})]),
 poseClip('cheer',.8,[f(0,{...idle,shoulderL:[0,0,140],shoulderR:[0,0,-140]}),f(.4,{...idle,shoulderL:[0,0,165],shoulderR:[0,0,-165],head:[0,0,5]}),f(.8,{...idle,shoulderL:[0,0,140],shoulderR:[0,0,-140]})]),
 poseClip('flail',.3,[f(0,{...idle,shoulderL:[0,0,90],shoulderR:[0,0,-90]}),f(.15,{...idle,shoulderL:[170,0,90],shoulderR:[-170,0,-90]}),f(.3,{...idle,shoulderL:[0,0,90],shoulderR:[0,0,-90]})]),
 poseClip('slab',2,[f(0,{...idle,shoulderL:[0,0,160],shoulderR:[0,0,-160],elbowL:[0,0,-20],elbowR:[0,0,20]}),f(2,{...idle,shoulderL:[0,0,160],shoulderR:[0,0,-160]})]),
 poseClip('tray',2,[f(0,{...idle,shoulderL:[-65,0,15],shoulderR:[-65,0,-15],elbowL:[-30,0,0],elbowR:[-30,0,0]}),f(2,{...idle,shoulderL:[-65,0,15],shoulderR:[-65,0,-15]})]),
 poseClip('squat',1,[f(0,idle),f(1,{...idle,hipL:[-65,0,0],hipR:[-65,0,0],kneeL:[115,0,0],kneeR:[115,0,0],spine:[18,0,0],shoulderL:[0,0,80],shoulderR:[0,0,-80]})]),
 poseClip('plank',2,[f(0,{...idle,spine:[75,0,0],hipL:[0,0,0],hipR:[0,0,0],shoulderL:[-70,0,0],shoulderR:[-70,0,0]}),f(2,{...idle,spine:[75,0,0],shoulderL:[-70,0,0],shoulderR:[-70,0,0]})]),
 poseClip('sit',2,[f(0,{...idle,hipL:[-80,0,-45],hipR:[-80,0,45],kneeL:[90,0,0],kneeR:[90,0,0]}),f(2,{...idle,hipL:[-80,0,-45],hipR:[-80,0,45],kneeL:[90,0,0],kneeR:[90,0,0]})]),
 poseClip('tug',2,[f(0,{...idle,spine:[-12,0,0],shoulderL:[-75,0,15],shoulderR:[-75,0,-15],kneeL:[22,0,0],kneeR:[22,0,0]}),f(2,{...idle,spine:[-12,0,0],shoulderL:[-75,0,15],shoulderR:[-75,0,-15]})]),
 poseClip('tuck',2,[f(0,{...idle,hipL:[-105,0,0],hipR:[-105,0,0],kneeL:[130,0,0],kneeR:[130,0,0],shoulderL:[-60,0,0],shoulderR:[-60,0,0]}),f(2,{...idle,hipL:[-105,0,0],hipR:[-105,0,0],kneeL:[130,0,0],kneeR:[130,0,0]})])
 ];
 for(let i=0;i<8;i++){const pose={...idle,shoulderL:[0,0,65+i*8],shoulderR:[0,0,-65-i*8],hipL:[i%2?0:-20,0,i%2?0:15],kneeL:[i%2?0:70,0,0],head:[0,0,i%2?8:-8]};clips.push(poseClip('pose'+i,4,[f(0,pose),f(4,pose)]));}
 for(const name of ['hop','land','bow','shrug','sleep','step-L','step-R','pike','dive-ready','clap','breathe','hip-circle']){let pose={...idle};if(name==='bow')pose.spine=[25,0,0];if(name==='sleep')pose.head=[0,0,60];if(name==='step-L')pose.hipL=[-35,0,0];if(name==='step-R')pose.hipR=[-35,0,0];if(name==='clap') {pose.shoulderL=[-60,0,30];pose.shoulderR=[-60,0,-30];}clips.push(poseClip(name,1,[f(0,idle),f(.5,pose),f(1,idle)]));}
 return clips;
}
export class Animator{
 constructor(root){this.mixer=new T.AnimationMixer(root);this.actions=Object.fromEntries(dollClips().map(c=>[c.name,this.mixer.clipAction(c)]));this.play('idle');}
 play(name){if(this.current===name)return;const action=this.actions[name]||this.actions.idle;action.reset().play();if(this.current)this.actions[this.current]?.crossFadeTo(action,.2,false);this.current=name;}
 update(dt){this.mixer.update(dt);}
}
