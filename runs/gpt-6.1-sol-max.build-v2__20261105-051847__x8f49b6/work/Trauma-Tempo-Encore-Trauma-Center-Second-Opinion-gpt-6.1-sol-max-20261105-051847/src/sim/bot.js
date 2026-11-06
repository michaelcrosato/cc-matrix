import {dist,pointAt,clamp} from './math.js';
// Uses observable state and the same InputFrames as a person. No objective writes.
function decideInput(sim,id=0,{noise=0,reactionDelay=0,cheat=false,pace:givenPace}={}){
 const s=sim.state,seat=s.seats.find(x=>x.id===id)||s.seats[0],t=sim.tuning,dt=1/60;
 const danger=s.entities.some(e=>!e.done&&['adagio','crescendo','nest','coda','tremolo','legato'].includes(e.kind));
 const pace=givenPace??(danger||s.arrest?(s.op===4?.68:1):[.55,.4,.4,.45,.78,.28,.18,1,1][s.op]);
 const base={x:seat.x,y:seat.y,tool:seat.tool,use:0,site:seat.site};
 const go=(x,y,tool,use=0,speed=s.entities.some(e=>e.kind==='crescendo'&&!e.done)?1.1:.55,extra={})=>{const n=noise*Math.sin(s.tick*.017+id),ny=noise*Math.cos(s.tick*.019+id);let dx=x+n-seat.x,dy=y+ny-seat.y,d=Math.hypot(dx,dy),step=(tool===0&&use?Math.max(.55,speed*pace):speed*pace)*dt;if(d>step){dx*=step/d;dy*=step/d;}return{...base,x:seat.x+dx,y:seat.y+dy,tool,use:d<Math.max(.04,step*2)?use:0,...extra};};
 const wait=(frames=1)=>s.tick%Math.max(1,Math.round(reactionDelay*60)+frames)===0;
 if(s.arrest){const eye=s.entities.find(e=>e.kind==='fermata'&&!e.done&&e.hp>0);if(eye)return go(eye.x,eye.y,5,1);if(seat.charge>=1.2)return{...base,charge:0,steady:false,use:0};return{...base,charge:1,steady:true,use:1};}
 if((s.vitals<58||sim.phase.done?.vitalsAbove)&&seat.cooldown<=0)return{...base,syringe:true,use:seat.held?1:0};
 if(s.composure>=100&&(s.vitals<65||s.entities.some(e=>e.kind==='crescendo'&&!e.done)||sim.phase.tools.some(x=>x==='hush'||x==='sforzando')))return{...base,special:true};
 if(seat.held){const e=s.entities.find(e=>e.id===seat.held);if(!e)return base;if(!e.embedded&&e.embed>0){const a=(e.axis??90)*Math.PI/180;return go(e.ox+Math.cos(a)*(e.embed+.025),e.oy+Math.sin(a)*(e.embed+.025),1,1,Math.min(1.1,t.pullTol*.7),{use:1});}if(seat.x>1.43&&seat.y>-.1&&seat.y<.5)return{...base,tool:1,use:0};return go(1.62,.2,1,1,.85,{use:1});}
 const all=s.entities.filter(e=>!e.done);const removal=sim.phase.done?.allClampsOff;
 const clamp=removal?s.entities.find(e=>e.kind==='bleeder'&&e.clamped):all.find(e=>e.kind==='bleeder'&&!e.clamped&&!e.removed);
 if(clamp){if(clamp.site!==seat.site)return{...base,site:clamp.site};if(removal)return go(clamp.x,clamp.y,7,0,.6,{alt:dist(seat,clamp)<.1&&!seat.prevAlt});if(dist(seat,clamp)<.1&&seat.prevUse)return base;return go(clamp.x,clamp.y,7,1);}
 const boss=all.some(e=>['coda','adagio','nest','crescendo'].includes(e.kind));
 const mess=!boss&&all.find(e=>['scratch','spore'].includes(e.kind));if(mess){if(mess.site!==seat.site)return{...base,site:mess.site};return go(mess.x,mess.y,3,1);}
 const pool=all.find(e=>e.kind==='pool');if(pool){if(pool.site!==seat.site)return{...base,site:pool.site};return go(pool.x,pool.y,2,1);}
 // Each seat claims a different target where possible.
 let req=all.filter(e=>e.required&&e.kind!=='bleeder'&&!s.seats.some(p=>p.id!==seat.id&&p.held===e.id));{const urgent=req.find(e=>e.kind==='nest')||req.find(e=>e.kind==='crescendo');if(urgent)req=[urgent,...req.filter(e=>e!==urgent)];}if(sim.phase.ordered&&req.length)req=req.filter(e=>e.kind===req[0].kind);
 let e=req[(Math.max(0,s.seats.indexOf(seat)))%Math.max(1,req.length)];
 if(!e){const inj=all.find(e=>e.kind==='injection');if(inj)e=inj;else return base;}
 if(e.site!==seat.site)return{...base,site:e.site};
 if(e.hidden&&!e.marked)return go(e.x,e.y,6,1,.5);
 if(e.kind==='gelZone'){const cell=e.cells.find(c=>!c[2]);return cell?go(cell[0],cell[1],3,1,.42):base;}
 if(['scratch','spore','nest'].includes(e.kind))return go(e.x,e.y,3,1);
 if(e.kind==='scanMark')return go(e.x,e.y,6,1);
 if(e.kind==='injection')return go(e.x,e.y,3,0,.6,{syringe:dist(seat,e)<.1});
 if(e.kind==='wound'){if(e.gate>=e.gates.length)return{...base,alt:!seat.prevAlt};const gate=e.gates[e.gate];return go(gate[0],gate[1],4,1,.6);}
 if(e.kind==='tremolo'){if(!(e.pinned>0))return go(e.x,e.y,6,1,.31,{steady:true});return go(e.x,e.y,5,1,.31,{steady:true});}
 if(e.kind==='incision'||(e.kind==='crescendo'&&e.exposed&&!e.cutDone)){
 const p=pointAt(e.points,e.started?Math.min(1,e.progress+.008):0);const d=dist(seat,p);return go(p.x,p.y,0,d<.045?1:0,.55);}
 if(e.kind==='tether'){const p=pointAt(e.points,.5);if(dist(seat,p)>.15)return go(p.x-.1,p.y-.1,0,0);return go(p.x+.12,p.y+.12,0,1,1.2,{use:1});}
 if(e.kind==='tumor'&&e.tethers){const tether=all.find(q=>q.kind==='tether');if(tether){const p=pointAt(tether.points,.5);if(dist(seat,p)>.15)return go(p.x-.1,p.y-.1,0,0);return go(p.x+.12,p.y+.12,0,1,1.2,{use:1});}}
 if(e.kind==='legato'){const piece=all.find(q=>q.chain===e.id);if(piece)return go(piece.x,piece.y,1,1);const n=e.nodes[e.remaining];if(!n)return base;if(n.cut)return base;const p={x:n.x-.09,y:n.y};if(dist(seat,n)>.15)return go(p.x,p.y,0,0);return go(n.x+(seat.x>n.x?-.09:.09),n.y,0,1,.9,{use:1});}
 if(e.kind==='crescendo'&&!e.exposed){const f=all.find(q=>q.parent===e.id);if(f)return go(f.x,f.y,5,1);return base;}
 if(e.kind==='coda'&&e.arms>0){const x=e.x+(e.arms===2?-.5:.5),y=e.y+.15;if(Math.hypot(seat.x-x,seat.y-y)>.15)return go(x-.1,y,0,0);return go(x+.1,y,0,1,1,{use:1});}
 if(e.hp>0){if(seat.laserTime>5.75)return base;return go(e.x,e.y,5,1);}
 if(['shard','tumor','piece','adagio','crescendo','fermata','coda'].includes(e.kind))return go(e.x,e.y,1,1);
 if(e.kind==='note')return go(e.x,e.y,1,1);
 return base;
}

const reactions=new WeakMap();
export function botInput(sim,id=0,opts={}){const frame=decideInput(sim,id,opts);if(!(opts.reactionDelay>0))return frame;let map=reactions.get(sim);if(!map){map=new Map();reactions.set(sim,map);}let memory=map.get(id);if(!memory){memory={tool:frame.tool,until:0};map.set(id,memory);}if(frame.tool!==memory.tool){memory.tool=frame.tool;memory.until=sim.state.elapsed+opts.reactionDelay;}if(sim.state.elapsed<memory.until&&!sim.state.arrest)return{...frame,x:sim.state.seats.find(s=>s.id===id).x,y:sim.state.seats.find(s=>s.id===id).y,use:0};return frame;}
