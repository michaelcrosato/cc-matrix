import {DEFAULTS} from '../core/config.js';
import {CONSULT,TOOLS} from '../content/ops.js';
import {createOp,step,drainEvents,results} from '../sim/op.js';
import {packSnapshot,applySnapshot} from '../sim/codec.js';
import {clamp} from '../core/rng.js';

export async function startSession(){
 const info=await AIHub.connect({mode:'shared-world',seats:[1,4],card:true});if(!info)return null;
 return new HubSession(info);
}
class HubSession{
 constructor(info){
  this.info=info;this.card={left:10000,ready:[],asked:false};this.started=false;this.ended=false;this.finished=false;this.app=null;
  this.localSeat=info.players.findIndex(p=>p.id===info.me);this.inputs=info.players.map(()=>({}));this.seq={};this.visualEvents=[];this.netEvents=[];this.localInput={};
  this.present=new Set(info.players.map(p=>p.id));this.sim=createOp(CONSULT,{seats:info.players.length,seed:Math.floor(AIHub.rng('deal')()*4294967296),config:{...DEFAULTS}});
  this.lastInput=-Infinity;this.lastSnapshot=-Infinity;this.lastKeyframe=-Infinity;this.lastEvents=-Infinity;this.tokens=30;this.lastClock=0;this.clockTick=0;this.finished=false;this.targets=null;
  AIHub.on('card',card=>{this.card=card;});AIHub.on('start',()=>{this.started=true;});AIHub.on('message',(d,from)=>this.receive(d,from));
  AIHub.on('leave',({id})=>{this.present.delete(id);const idx=info.players.findIndex(p=>p.id===id);if(this.sim.seats[idx])this.sim.seats[idx].active=false;});
  AIHub.on('time-up',()=>{if(AIHub.isHost)this.finish(false);});AIHub.on('end',()=>{this.ended=true;clearInterval(this.timer);this.app?.audio.stop();});
  this.timer=setInterval(()=>this.pump(),16);
  if(info.server)AIHub.ready();
 }
 attach(app){this.app=app;app.sim=this.sim;app.localSeat=Math.max(0,this.localSeat);app.sources=this.info.players.map((p,i)=>i===this.localSeat?'auto':'remote');app.field.setArena('chest');app.fromOperation=false;app.show('card');AIHub.ready();}
 send(data,options){if(this.ended||this.tokens<1)return false;this.tokens--;return AIHub.send(data,options);}
 pump(){
  if(this.ended)return;const ms=AIHub.time();if(!this.started||ms<0||!Number.isFinite(ms))return;
  const delta=Math.max(0,ms-this.lastClock);this.lastClock=ms;this.tokens=Math.min(35,this.tokens+delta*.019);
  if(AIHub.isHost){
   if(this.localSeat>=0)this.inputs[this.localSeat]=this.localInput;
   const target=Math.floor(ms*60/1000);let count=0;while(this.clockTick<target&&this.sim.status==='operating'&&count++<240){this.clockTick++;step(this.sim,this.inputs);const events=drainEvents(this.sim);this.visualEvents.push(...events);this.netEvents.push(...events);}
   if(ms-this.lastSnapshot>=84){this.lastSnapshot=ms;const p=packSnapshot(this.sim);p.g=p.n;p.n=this.clockTick;this.send(p,{reliable:false});}
   if(ms-this.lastKeyframe>=1000){this.lastKeyframe=ms;const p=packSnapshot(this.sim,true);p.g=p.n;p.n=this.clockTick;this.send(p,{reliable:true});}
   if(this.netEvents.length&&ms-this.lastEvents>=260){this.lastEvents=ms;const events=this.netEvents.splice(0,35);this.send({t:'e',e:events},{reliable:true});}
   if(this.sim.status!=='operating'&&!this.finished)this.finish(this.sim.status==='saved');
  }else if(this.localSeat>=0&&ms-this.lastInput>=67){this.lastInput=ms;this.send({t:'i',n:(this.inputSeq=(this.inputSeq||0)+1),...this.localInput},{to:AIHub.host,reliable:false});}
 }
 receive(d,from){
  if(this.ended||!d||typeof d!=='object')return;
  if(AIHub.isHost&&d.t==='i'){
   const i=this.info.players.findIndex(p=>p.id===from);if(i<0||!this.present.has(from)||d.n<=(this.seq[from]||0))return;this.seq[from]=d.n;
   this.inputs[i]={x:clamp(Number(d.x)||0,-6.4,6.4),z:clamp(Number(d.z)||0,-3.5,3),tool:TOOLS.includes(d.tool)?d.tool:'drain',use:!!d.use,gift:!!d.gift,steady:!!d.steady,drop:!!d.drop,left:!!d.left,right:!!d.right,rotate:clamp(Number(d.rotate)||0,-1,1)};
  }else if(!AIHub.isHost&&from===AIHub.host){
   if(d.t==='s'||d.t==='k'){
    if(d.n<(this.sim.networkTick??0))return;
    const previous=new Map(this.sim.entities.map(e=>[e.id,{x:e.x,z:e.z}])),seats=this.sim.seats.map(v=>({x:v.x,z:v.z})),stage=this.sim.stage;
    applySnapshot(this.sim,d,this.localSeat);this.targets={entities:new Map(this.sim.entities.map(e=>[e.id,{x:e.x,z:e.z}])),seats:this.sim.seats.map(v=>({x:v.x,z:v.z}))};
    if(stage===this.sim.stage){for(const e of this.sim.entities){const old=previous.get(e.id);if(old){e.x=old.x;e.z=old.z;}}this.sim.seats.forEach((seat,i)=>{if(i!==this.localSeat){seat.x=seats[i].x;seat.z=seats[i].z;}});}
   }if(d.t==='e')this.visualEvents.push(...(d.e||[]));
  }
 }
 updateClient(dt){if(!AIHub.isHost){const t=1-Math.exp(-Math.max(0,dt)/.12);if(this.targets){for(const e of this.sim.entities){const p=this.targets.entities.get(e.id);if(p){e.x+=(p.x-e.x)*t;e.z+=(p.z-e.z)*t;}}this.sim.seats.forEach((seat,i)=>{const p=this.targets.seats[i];if(i!==this.localSeat&&p){seat.x+=(p.x-seat.x)*t;seat.z+=(p.z-seat.z)*t;}});}if(this.localSeat>=0){const seat=this.sim.seats[this.localSeat];if(this.localInput.x!=null){seat.x=this.localInput.x;seat.z=this.localInput.z;seat.tool=this.localInput.tool;seat.using=!!this.localInput.use;}}}}
 takeEvents(){const events=this.visualEvents;this.visualEvents=[];return events;}
 finish(won){
  if(this.finished||this.ended||!AIHub.isHost)return;this.finished=true;
  const players=this.info.players.filter(p=>this.present.has(p.id)),points=p=>this.sim.seats[this.info.players.indexOf(p)]?.score||0;
  const sorted=players.slice().sort((a,b)=>points(b)-points(a)),standings=[];
  for(const p of sorted){const last=standings.at(-1);if(last&&points(this.info.players.find(x=>x.id===last[0]))===points(p))last.push(p.id);else standings.push([p.id]);}
  const scores={},stats={};for(const p of players){scores[p.id]=points(p);const seat=this.sim.seats[this.info.players.indexOf(p)];stats[p.id]={TECHNIQUE:points(p),STITCHES:seat.stitches,VITALS:Math.max(0,Math.round(Math.min(...this.sim.vitals)))};}
  AIHub.finish({standings,scores,won,stats,awards:sorted.length?[{id:sorted[0].id,title:'STEADIEST HAND',detail:'Kept showing up at the table.'}]:[]});
 }
}
