import {heightAt} from './terrain.js';
import {POI} from '../data/world.js';
import {WEAPONS} from '../data/weapons.js';
import {dist,angleDiff,clamp} from '../core/rng.js';
export class Bot {
 constructor(sim){this.s=sim;this.frames=0;this.trace=[];}
 frame(frame={},n=1){for(let i=0;i<n;i++){if(this.s.p.fever&&this.s.p.doses>0&&!this.s.p.busy)frame={...frame,actions:[...(i===0?frame.actions||[]:[]),'pill']};this.s.tick(i===0?frame:{...frame,actions:[]});this.frames++;}if(this.frames>900000)throw Error('Playthrough exceeded frame budget');}
 action(a,n=1){this.frame({actions:[a]},n);}
 wait(seconds,frame={}){this.frame(frame,Math.ceil(seconds*60));}
 go(target,r=5){target=typeof target==='string'?POI[target]:target;let max=60000;while(dist(this.s.p,target)>r&&!this.s.ended&&--max){const p=this.s.p,v=this.s.vehicles.find(v=>v.id===p.vehicle);let yaw=Math.atan2(target.x-p.x,-(target.z-p.z));if(v&&v.health<45){this.action('use');this.go(v,1);this.use(this.s.t.repairTime);this.use();continue;}if(v){const err=angleDiff(yaw,v.yaw);this.frame({moveZ:-.4,moveX:clamp(err*2,-1,1),lookSet:[yaw,0]});}else this.frame({moveZ:-1,sprint:true,lookSet:[yaw,0]});}if(!max)throw Error('Could not reach '+JSON.stringify(target)+' from '+JSON.stringify(this.s.p));this.wait(.3);}
 use(hold=0){this.frame({actions:['use'],use:hold>0});if(hold)this.wait(hold+.1,{use:true});this.wait(.25);}
 aimAt(target){const p=this.s.p;this.frame({lookSet:[Math.atan2(target.x-p.x,-(target.z-p.z)),Math.atan2((target.y??heightAt(target.x,target.z))+1-(p.y+1.5),dist(p,target))]});}
 fireAt(target,shots=1){for(let i=0;i<shots;i++){const g=this.s.currentGun();if(g.jam){this.action('reload');this.wait(1.6);}if(g.ammo<=0){this.action('reload');this.wait(2);}this.aimAt(target);this.wait(60/WEAPONS[this.s.p.equipped].rpm+.02,{fire:true});}}
 clear(poi){let tries=0;for(const n of this.s.npcs.filter(n=>n.poi===poi&&n.hp>0)){this.go({x:n.x,z:n.z+12},4);while(n.hp>0&&tries++<500)this.fireAt(n);if(n.hp>0)throw Error('Could not hit '+n.id);const g=this.s.currentGun();if(g.reserve<30){this.go(n,2);this.use();}}this.wait(.5);}
 accept(id,giver){if(giver){this.go(giver,3);this.use();}this.action({type:'accept',id});this.wait(.3);this.trace.push('accepted '+id);}
 runContract(id){const s=this.s;let iterations=0;while(s.contract?.id===id&&!s.contract.failed&&iterations++<120){const step=s.objective(),poi=step.npc==='driver'?s.vehicles.find(v=>v.tag==='radio_truck'):POI[step.poi];this.trace.push(id+':'+s.contract.step+':'+step.do);
  switch(step.do){case 'goto':case 'escort':case 'deliver':this.go(poi,step.do==='escort'?15:(step.r||30)-2);if(step.do==='escort')this.wait(20);break;case 'kill':this.clear(step.poi);break;case 'return':case 'talk':this.go(poi,6);this.use();break;case 'collect':{const e=s.entities.find(e=>e.id===step.tag)||poi;this.go(e,3);this.use();break;}case 'sleep_until':this.go({x:poi.x,z:poi.z+4},3);this.use();this.action({type:'sleep',hour:step.hour??6});break;case 'plant':case 'interact':this.go(poi,8);this.use(step.hold||2);break;
   case 'destroy':if(id==='c3'){this.action('detonate');this.wait(1);}else if(id==='c5'){const v=s.vehicles.find(v=>v.tag==='radio_truck');this.go(v,18);while(v.health>=80)this.fireAt(v);}else{if(s.p.weapons.flare)this.action({type:'weapon',id:'flare'});for(const tag of step.tags){const e=s.entities.find(e=>e.id===tag);if(!e.dead){this.go({x:e.x-15,z:e.z-12},5);this.fireAt(e);this.wait(5);}}this.wait(15);if(s.p.weapons.carbine)this.action({type:'weapon',id:'carbine'});}break;
   case 'wait_event':this.wait(step.duration+1);break;case 'drive_cargo':{if(!s.p.vehicle){const v=s.vehicles.find(v=>v.kind==='cargo');this.go(v,1);if(!s.p.vehicle)this.use();if(!s.p.vehicle)throw Error('Cargo entry failed: '+JSON.stringify({context:s.context(),player:s.p,truck:v,prologue:s.prologue,paused:s.paused,choice:s.pendingChoice,step:s.objective(),lastInput:s.lastInput,trace:this.trace.slice(-8)}));}this.go(poi,(step.r||30)-3);break;}case 'choice':this.wait(.3);this.action({type:'choice',value:id==='c7'?'commons':'read'});break;
   case 'survive':this.wait(step.duration+1);if(s.mercy)this.action({type:'mercy',value:'morphine'});break;case 'hold_zone':this.go(poi,25);this.wait(step.duration+1);break;case 'ending':return;default:throw Error('Unknown bot step '+step.do);}
   if(s.p.vehicle&&s.objective()?.do!=='drive_cargo'&&s.objective()?.tag!=='papers'){this.action('use');this.wait(.2);}if(s.contract?.id===id&&s.objective()?.do==='plant'&&s.p.vehicle)this.action('use');
  }
  if(iterations>=120)throw Error('Contract loop '+id+' '+JSON.stringify(s.objective())+' '+this.trace.slice(-12));if(s.contract?.failed)throw Error('Contract failed '+id);return s;
 }
}
