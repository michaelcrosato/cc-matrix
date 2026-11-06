import {DEFAULTS,SLIDERS} from '../content/tuning-defaults.js';
import {WEAPONS,makeWeapon} from '../content/weapons.js';
import {SITE_BY_ID} from '../content/sites.js';
import {clamp} from '../core/math.js';
export class DevTools {
 constructor(g){this.g=g;this.running=false;}
 teleport(id,z){const g=this.g;if(typeof id==='number'){g.teleport(id,z);return;}const s=SITE_BY_ID[id],o=g.world.object(id);if(s)g.teleport(s.at[0],s.at[1]+6);else if(o)g.teleport(o.x,o.z+2);}
 setBalance(id,value){const s=SLIDERS.find(s=>s[0]===id);if(!s)return false;this.g.tuning[id]=clamp(value,s[3],s[4]);return true;}
 reset(){Object.assign(this.g.tuning,DEFAULTS);}
 giveAll(){const g=this.g;for(const id of Object.keys(WEAPONS).filter(i=>i!=='mg'))g.unlock(id);g.stones+=100;g.tablets=12;g.syrettes=5;g.bottles=9;g.charges=9;}
 spawn(kind){const g=this.g,x=g.pos.x+Math.sin(g.ctx.camera.yaw)*-10,z=g.pos.z+Math.cos(g.ctx.camera.yaw)*-10;if(['concord','harvest'].includes(kind)){for(let i=0;i<4;i++)g.actors.spawn({kind:'soldier',model:kind==='harvest'?'harvest':'soldier',faction:kind,x:x+i*2,z,hp:100*g.tuning.enemyHealth,site:'dev'});}else if(kind==='case')g.world.item('dev-case-'+g.clock,'case','TAKE THE STONES',x,z,'stone-case',3,{value:4});else g.vehicles.create(kind,x,z);}
 ignite(){const p=this.g.aimPoint(65);this.g.world.fire.ignite(p.x,p.z,9);}
 forceFever(){this.g.body.attackFever();}
 forceJam(){this.g.weapon.jammed=true;this.g.weapon.racks=3;}
 downBuddy(id){this.g.downBuddy(id);}
}
