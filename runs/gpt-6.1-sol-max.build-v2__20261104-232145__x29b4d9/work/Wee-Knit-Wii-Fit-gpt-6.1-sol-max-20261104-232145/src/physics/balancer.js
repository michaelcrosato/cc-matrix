import {R,DOLL} from './world.js';
import {tuning} from '../data/tuning.js';
import {rad,DIFFICULTY} from '../data/config.js';
import {Ragdoll} from './ragdoll.js';
export class Balancer{
 constructor(w,lane,doll,scene,settings,opts={}){this.w=w;this.lane=lane;this.doll=doll;this.settings=settings;this.opts=opts;this.x=opts.x||0;this.y=opts.y||0;this.z=opts.z||0;this.foot=w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.x,this.y,this.z));this.body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(this.x,this.y+.75,this.z).setCanSleep(false).setAdditionalSolverIterations(4));w.createCollider(R.ColliderDesc.capsule(.5,.25).setMass(1).setCollisionGroups(DOLL(lane)),this.body);this.joint=w.createImpulseJoint(R.JointData.spherical({x:0,y:0,z:0},{x:0,y:-.75,z:0}),this.foot,this.body,true);this.joint.setContactsEnabled(false);this.wx=this.wz=this.leanX=this.leanZ=0;this.cob={x:0,z:0};this.flail=0;this.cooldown=0;this.fallen=0;this.falls=0;this.t=0;this.breathGood=0;this.breathTotal=0;this.breathBonus=false;this.ragdoll=new Ragdoll(w,scene,doll.root.userData.colour||'#e76b57');}
 setFoot(x,y,z){this.x=x;this.y=y;this.z=z;this.foot.setNextKinematicTranslation({x,y,z});}
 fixed(dt,input,dist={}){this.t+=dt;this.flail=Math.max(0,this.flail-dt);this.cooldown=Math.max(0,this.cooldown-dt);
 if(this.fallen>0){this.fallen-=dt;if(this.fallen<=0)this.recover();return;}
 if(input.flailPress&&this.cooldown<=0){this.flail=.35;this.cooldown=tuning.flailCooldown;this.onFlail?.();}
 const still=dist.still;const inhale=this.t%8<4;const breathe=this.settings.autoBreathe||input.breathe;if(still){this.breathTotal+=dt;if(breathe===inhale)this.breathGood+=dt;if(this.breathTotal>=8){this.breathBonus=this.breathGood/this.breathTotal>=.7;this.breathTotal=this.breathGood=0;}}
 const o=this.opts,diff=DIFFICULTY[this.settings.difficulty]||DIFFICULTY.Standard;
 const maxLean=rad((o.maxLean||18)*tuning.maxLean/18);this.maxLean=maxLean;
 let margin=(o.margin??.45)*tuning.margin/.45*(dist.oneFoot?.5:1),G=tuning.gravity*.75,I=.75*.75+.06,K=G*(1+margin),wn=Math.sqrt((K-G)/I),D=2*tuning.zeta*wn*I;
 const r=1-Math.exp(-(o.reflex||10)*tuning.reflex/10*dt);const mag=Math.max(1,Math.hypot(input.x||0,input.z||0)),ix=(input.x||0)/mag,iz=(input.z||0)/mag;this.wx+=(ix-this.wx)*r;this.wz+=(iz-this.wz)*r;
 let tx=this.wx*maxLean,tz=this.wz*maxLean,q=this.body.rotation(),ux=2*(q.x*q.y-q.w*q.z),uy=1-2*(q.x*q.x+q.z*q.z),uz=2*(q.y*q.z+q.w*q.x);
 this.leanX=Math.atan2(ux,uy);this.leanZ=Math.atan2(uz,uy);this.cob.x=this.leanX/maxLean;this.cob.z=this.leanZ/maxLean;
 let ang=this.body.angvel(),Tx=-(G*Math.sin(tx)+K*(this.leanX-tx))+D*ang.z,Tz=-(G*Math.sin(tz)+K*(this.leanZ-tz))-D*ang.x;
 let limit=(o.ankleMax||4.6)*tuning.ankleMax/4.6*diff.ankle*(this.flail>0?tuning.flailBoost:1),m=Math.hypot(Tx,Tz);if(m>limit){Tx*=limit/m;Tz*=limit/m;}
 let sway=(dist.sway??.1)*tuning.swayScale,tremor=(dist.tremor??.06)*tuning.tremorScale,t=this.t,ph=this.lane*1.77+1.26;let bonus=this.breathBonus&&still?.6:1;
 let nx=(sway*(Math.sin(t*.9+ph)*.6+Math.sin(t*1.73+ph*2.1)*.4)+tremor*(Math.sin(t*8.2+1.1)*.6+Math.sin(t*18.3)*.4))*diff.disturbance*bonus+(dist.nx||0);
 let nz=(sway*(Math.sin(t*.77+ph*1.7)*.6+Math.sin(t*1.51+ph*.6)*.4)+tremor*(Math.sin(t*7.1+2.3)*.6+Math.sin(t*15.7+.7)*.4))*diff.disturbance*bonus+(dist.nz||0);
 this.body.resetTorques(true);this.body.addTorque({x:Tz+nz,y:-ang.y*.6,z:-(Tx+nx)},true);
 if(this.settings.rumble&&Math.hypot(this.leanX,this.leanZ)>rad(30)&&this.t-(this.lastTipRumble||0)>.5){this.lastTipRumble=this.t;this.onNearTip?.();}if(!this.god&&!dist.noFalls&&Math.hypot(this.leanX,this.leanZ)>rad(tuning.fallAngle))this.fall();
 }
 fall(){if(this.fallen>0)return;this.falls++;this.fallen=tuning.recoverTime;this.body.setEnabled(false);this.doll.root.visible=false;this.ragdoll.spawn(this.x,this.y,this.z,this.body.rotation());this.onFall?.();}
 recover(){this.fallen=0;this.ragdoll.hide();this.doll.root.visible=true;this.body.setEnabled(true);this.body.setTranslation({x:this.x,y:this.y+.75,z:this.z},true);this.body.setRotation({x:0,y:0,z:0,w:1},true);this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);this.body.resetTorques(true);this.leanX=this.leanZ=this.wx=this.wz=this.cob.x=this.cob.z=0;this.onRecover?.();}
 frame(dt){this.doll.anim.update(dt);if(this.fallen>0){this.ragdoll.frame();return;}this.doll.root.position.set(this.x,this.y,this.z);this.doll.root.quaternion.copy(this.body.rotation());if(this.flail>0)this.doll.anim.play('flail');this.doll.joints.head.rotation.z+=Math.sin(this.t*4)*.015;}
}
