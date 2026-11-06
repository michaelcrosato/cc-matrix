import RAPIER from '@dimforge/rapier3d-compat';
let promise;
export const initPhysics=()=>promise??=(RAPIER.init());
export class Physics {
 constructor(seats){this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=1/60;this.bodies=new Map();this.joints=new Map();this.tips=new Map();this.chains=new Map();
 const ground=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(1.62,-.09,-.2));this.world.createCollider(RAPIER.ColliderDesc.cuboid(.26,.025,.41),ground);
 for(const s of seats){const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(s.x,.35,-s.y));this.tips.set(s.id,body);}}
 add(e){if(e.kind==='legato'||e.kind==='coda'){const parts=[],count=e.kind==='legato'?(e.nodes?.length||8):7;let prev=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(e.x,.12,-e.y));for(let i=0;i<count;i++){const node=e.nodes?.[i],b=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(node?.x??e.x+i*.1,.12,-(node?.y??e.y)).setGravityScale(0).setLinearDamping(5));this.world.createCollider(RAPIER.ColliderDesc.ball(.035),b);const joint=this.rope(prev,b,.17);parts.push({b,joint});prev=b;}this.chains.set(e.id,parts);if(e.kind==='legato')return;}if(!['shard','tumor','piece','adagio','fermata','coda','crescendo'].includes(e.kind))return;const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(e.x,.14,-e.y).setLinearDamping(4).setAngularDamping(3).setGravityScale(0));this.world.createCollider(RAPIER.ColliderDesc.ball(e.kind==='shard'?.04:.065).setDensity(2).setRestitution(.25),body);this.bodies.set(e.id,body);}
 grip(seat,e){this.release(seat);let b=this.bodies.get(e.id);if(!b){this.add(e);b=this.bodies.get(e.id);}if(!b)return;const tip=this.tips.get(seat.id);b.setTranslation({x:e.x,y:.2,z:-e.y},true);b.setGravityScale(0,true);const j=this.world.createImpulseJoint(RAPIER.JointData.spring(0,60,6,{x:0,y:0,z:0},{x:0,y:0,z:0}),tip,b,true);this.joints.set(seat.id,j);}
 sever(entity,index){const joint=this.chains.get(entity.id)?.[index]?.joint;if(joint){this.world.removeImpulseJoint(joint,true);this.chains.get(entity.id)[index].joint=null;}}
 release(seat,e,deposit=false){const j=this.joints.get(seat.id);if(j){this.world.removeImpulseJoint(j,true);this.joints.delete(seat.id);}const b=e&&this.bodies.get(e.id);if(b){if(deposit){b.setTranslation({x:1.48+(e.id%5)*.065,y:.42,z:-.3+(e.id%3)*.09},true);b.setGravityScale(1,true);b.setLinvel({x:.06,y:.2,z:.03},true);b.setAngvel({x:.4,y:.25,z:.3},true);}else b.setGravityScale(0,true);}}
 rope(a,b,length=.16){return this.world.createImpulseJoint(RAPIER.JointData.rope(length,{x:0,y:0,z:0},{x:0,y:0,z:0}),a,b,true);}
 step(seats){for(const s of seats)this.tips.get(s.id)?.setNextKinematicTranslation({x:s.x,y:s.held?.42:.28,z:-s.y});this.world.step();}
 positions(){return [...this.bodies].map(([id,b])=>({id,...b.translation()}));}
 free(){this.world.free();}
}
