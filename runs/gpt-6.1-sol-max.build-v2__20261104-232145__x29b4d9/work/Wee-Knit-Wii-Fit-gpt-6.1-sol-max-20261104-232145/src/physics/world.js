import R from '@dimforge/rapier3d-compat';
export {R};
export const GROUND=1,RAG=0x1000;
export const groups=(member,filter)=>(member<<16)|filter;
export const DOLL=i=>groups(0x100<<i,0x10<<i);
export const PROP=i=>groups(0x10<<i,1|(0x10<<i)|(0x100<<i));
export function makeWorld(gravity=9.81){const w=new R.World({x:0,y:-gravity,z:0});w.timestep=1/120;w.integrationParameters.numSolverIterations=10;w.createCollider(R.ColliderDesc.cuboid(200,.15,200).setTranslation(0,-.15,0).setCollisionGroups(groups(1,0xffff)).setFriction(.9));return w;}
export function rigid(w,shape,xyz,mass=.02,lane=0){let desc=R.RigidBodyDesc.dynamic().setTranslation(...xyz).setCanSleep(false).setLinearDamping(.1).setAngularDamping(.6).setCcdEnabled(true);let b=w.createRigidBody(desc);w.createCollider(shape.setMass(mass).setCollisionGroups(PROP(lane)).setFriction(.9).setRestitution(0),b);return b;}
