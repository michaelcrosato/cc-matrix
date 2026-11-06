import {makeIsland} from '../art/island.js';
import {TrainingEvent} from './training.js';
import {R,PROP,rigid} from '../physics/world.js';
import {box,ball,torus,group,cyl} from '../art/materials.js';
import {stone,lighthouse} from '../art/props.js';
import {doll,gull} from '../art/cast.js';
import {clamp,lerp,rad} from '../data/config.js';
export class GrandHold extends TrainingEvent{
 buildSet(){super.buildSet();this.game.view.sea.position.y=-18;this.below=makeIsland();this.below.root.scale.setScalar(.65);this.below.root.position.set(-1.3,-7.6,5.85);this.group.add(this.below.root);cyl(this.group,0xd9a18c,0,-1.8,0,1.2,3.6);this.duration=95;this.cast=[];for(let i=0;i<9;i++){let d=doll(['#e6ad6b','#95b5a0','#ac8caf'][i%3],i%6);d.root.position.set(Math.sin(i*.7)*4,-.4,-3-Math.cos(i*.7));d.root.scale.setScalar(.7);d.anim.play('cheer');this.group.add(d.root);this.cast.push(d);}lighthouse(this.group,9,-15);}
 buildLane(l){l.data={phase:-1,inside:0,total:0,stones:0};l.stones=[];l.target={x:.3,z:.1,r:.25};l.doll.anim.play('pose0');}
 tickLane(l,dt){const d=l.data,b=l.balancer,t=this.t,phase=t<80?Math.floor(t/20):4;d.total+=dt;if(d.phase!==phase){d.phase=phase;this.game.audio.sfx('bell');if(phase===1){l.slab=box(l.doll.root,0x9caeaa,0,1.7,0,1,.06,1);l.slabCollider=this.world.createCollider(R.ColliderDesc.cuboid(.5,.03,.5).setTranslation(0,.95,0).setMass(.04).setFriction(1).setCollisionGroups(PROP(l.id)),b.body);}if(phase===2){for(let p of l.stones)this.disable(p);d.removeSupportAt=t+1/120;}l.doll.anim.play(phase===1?'slab':phase===3?'cheer':'pose0');}
 if(d.removeSupportAt&&t>d.removeSupportAt){l.slabCollider?.setEnabled(false);if(l.slab)l.slab.visible=false;d.removeSupportAt=0;}
 l.dist={sway:phase===1?.12:.1,tremor:.04,still:true};l.target={x:phase===0?.3:0,z:phase===0?.1:0,r:phase===4?lerp(.3,.08,(t-80)/15):.25};
 if(phase===1&&d.stones<4&&t>22+d.stones*4){let i=d.stones,pos=l.stones.at(-1)?.body.translation()||{x:l.x,y:1.73,z:0};let b=rigid(this.world,R.ColliderDesc.cuboid(.2,.08,.2),[pos.x,pos.y+(i? .18:.1),pos.z],.015,l.id);l.stones.push(this.addProp(b,stone(null,.25,.08),l));d.stones++;}
 if(phase===2){let local=t-40,p=local%7;if(p>3&&p<3.5)l.dist.nx=3;if(p>2&&p<3.5)l.target.x=-.6;this.message=p>2&&p<3?'Wind coming. A little early lean.':'Gary believes in you. In his way.';}
 else this.message=['One pose. We remember this.','Four small expectations.','', 'Feet together. The class is with you.','Find the middle. We will wait.'][phase];
 if(phase===3){let beat=Math.floor((t-60)*1.8);if(d.lastBeat!==beat){d.lastBeat=beat;this.game.audio.sfx('foot');}l.target.x=Math.sin((t-60)*.65)*.4;}
 if(phase===4){l.dist.sway=lerp(.2,0,(t-80)/15);this.game.finaleTilt=9*(1-clamp((t-80)/15));}
 if(Math.hypot(b.cob.x-l.target.x,b.cob.z-l.target.z)<l.target.r&&!b.fallen)d.inside+=dt;l.score=100*d.inside/d.total;
 }
 onFall(l){super.onFall(l);this.game.fx('WE HAVE YOU',l.x,2,0);this.t=Math.max(0,Math.floor(this.t/20)*20);}
 frame(dt){super.frame(dt);for(let d of this.cast){d.anim.update(dt);}let a=this.t*.018,notch=9*(1-(this.game.profile?.steps||0)/19);this.below.root.rotation.z=-rad(notch*(1-clamp((this.t-80)/15)))-(this.t<80?(this.lanes[0].balancer?.leanX||0)*.35:0);this.below.trudy.userData.bubble.position.x=this.below.root.rotation.z;this.game.view.setCamera([Math.sin(a)*13,7.6,Math.cos(a)*13],[0,-1.6,0]);}
 botGoal(l){return l.target;}
 computeForm(){return 90;}
 resultDetail(){return 'One island, finally level.';}
 widget(){return ['Pose & breath','Four stones','Storm & Gary','Step together','The final hold'][this.lanes[0].data.phase]||'Together';}
}
