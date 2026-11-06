import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createSessionController, connectSession,packWorld,unpackWorld} from '../src/session.js';
import {createWorld as createCombatWorld,startEncounter} from '../src/sim.js';

export function runSessionTests() {
const failures=[];
const results=[];
let count=0;
function test(name,fn){count++;try{fn();results.push({name,ok:true,detail:''});}catch(error){failures.push(name+': '+error.message);results.push({name,ok:false,detail:error.message});}}
const copy=(value)=>JSON.parse(JSON.stringify(value));
function room({server=false,players=2}={}){
  let mono=0,time=-Infinity;
  const roster=Array.from({length:players},(_,id)=>({id,name:'Seat '+id,color:'#fff'}));
  const hubs=[],controllers=[],worlds=[],callbacks=[],timers=[];
  function createWorld({seed,players:count,ids}){
    return {tick:0,time:0,seed,rng:seed,epoch:0,encounter:0,status:'playing',reason:'',score:0,reserve:count*2,eventSeq:1,
      players:ids.map((id,seat)=>({id,seat,x:100+seat*100,y:246,score:0,charges:3,repairs:0,kills:0,alive:true,active:true,respawn:0})),
      enemies:[{id:10,x:10,y:40,hp:1,type:'ordinary'}],bullets:[],pickups:[],
      bunkers:[{id:0,x:60,y:202,mask:Array.from({length:128},(_,i)=>i%2),original:Array(128).fill(1)}],
      events:[{id:1,tick:0,type:'stage',x:240,y:100}]};
  }
  function stepWorld(world,commands,dt){
    world.tick++;world.time+=dt;world.events=[];
    world.players.forEach((player,seat)=>{
      const c=commands[seat]||{};
      if(!player.active)return;
      player.x+= (c.move||0)*120*dt;
      if(c.repair&&player.charges>0){
        player.charges--;player.repairs++;
        world.events.push({id:++world.eventSeq,tick:world.tick,type:'repair',seat,x:player.x,y:202});
      }
      if(c.fire)world.score++;
    });
    world.lastCommands=copy(commands);
  }
  const ids=server?[...roster.map(p=>p.id),99]:roster.map(p=>p.id);
  const hostId=server?99:0;
  for(const me of ids){
    const listeners=new Map();
    const info={me,host:hostId,isHost:me===hostId,server:me===99,players:copy(roster)};
    const h={
      info,readyCalls:0,rngCalls:0,finishes:[],sent:[],failures:[],dropInput:false,
      connect:async()=>info,
      rng(){this.rngCalls++;return()=>0.4;},
      ready(){this.readyCalls++;},
      time:()=>time,
      on(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);return()=>listeners.get(type).delete(fn);},
      emit(type,...args){for(const fn of [...listeners.get(type)||[]])fn(...args);},
      send(packet,opts={}){
        this.sent.push({packet:copy(packet),opts:copy(opts)});
        if(this.dropInput&&opts.reliable===false)return false;
        for(const target of hubs)if(target!==this&&(opts.to===undefined||target.info.me===opts.to)){
          target.emit('message',copy(packet),me);
        }
        return true;
      },
      finish(value){this.finishes.push(copy(value));},
      fail(value){this.failures.push(value);},
    };
    hubs.push(h);
  }
  for(let i=0;i<hubs.length;i++){
    const h=hubs[i];
    controllers[i]=createSessionController(h.info,{hub:h,createWorld,stepWorld,
      leaveSeat:(world,seat)=>{Object.assign(world.players[seat],{alive:false,active:false,gone:true,respawn:0});},
      onWorld:w=>worlds[i]=w,
      onEvents:events=>(callbacks[i]??=[]).push(...copy(events)),
      now:()=>mono,schedule:fn=>{timers[i]=fn;return i;},cancel:()=>{timers[i]=null;}});
  }
  const pump=()=>{for(const c of controllers)c.pump();};
  return {hubs,controllers,worlds,callbacks,timers,get time(){return time;},get mono(){return mono;},
    start(){for(const h of hubs)h.emit('start',{in:3000});},
    advance(ms){mono+=ms;time=finite(time)?time+ms:ms;pump();},
    setTime(ms){time=ms;mono=ms+5000;pump();},
    pump};
}
const finite=Number.isFinite;

test('packing keeps all fields and losslessly packs binary masks',()=>{
 const state={tick:200,players:[{id:0,x:83.2473,charges:3}],bunkers:[{mask:Array(128).fill(1),original:Array(128).fill(0)}],
   '~1':{'future-field':[0,1,2]},reason:'TIME EXPIRED',events:[],rng:4294967295};
 assert.deepEqual(unpackWorld(packWorld(state)),state);
 assert.ok(JSON.stringify(packWorld(state)).length<JSON.stringify(state).length);
});
test('all seven real authored encounters round-trip complete snapshots within envelope',()=>{
 const world=createCombatWorld({players:2,seed:137,ids:[0,1]});let maximum=0;
 for(let encounter=0;encounter<7;encounter++){startEncounter(world,encounter);const packed=packWorld(world);
 assert.deepEqual(unpackWorld(packed),world);maximum=Math.max(maximum,new TextEncoder().encode(JSON.stringify({t:'s',n:100,at:1000,w:packed,a:[10,10],i:[10,10],e:[],over:0})).length);}
 assert.ok(maximum<16000,'maximum packet '+maximum+' exceeds budget');
});
test('readies exactly once without gesture and captures RNG once per copy',()=>{
 const r=room();for(const h of r.hubs){assert.equal(h.readyCalls,1);assert.equal(h.rngCalls,1);}assert.equal(r.worlds[0].tick,0);
});
test('clock countdown does not step; host derives ticks from Hub time',()=>{
 const r=room();r.start();r.setTime(-1000);assert.equal(r.worlds[0].tick,0);r.setTime(1000);
 assert.equal(r.worlds[0].tick,120);assert.equal(r.worlds[1].tick,120);
 assert.equal(r.controllers[0].phase,'playing');assert.equal(r.controllers[1].phase,'playing');
});
test('host locally applies own command without self-delivery',()=>{
 const r=room();r.start();r.controllers[0].update({move:1,fire:true});r.setTime(500);
 assert.equal(r.worlds[0].players[0].x,160);assert.equal(r.worlds[0].score,60);
});
test('guest heartbeat carries held actions and one repair edge only once',()=>{
 const r=room();r.start();r.setTime(0);const guest=r.controllers[1];guest.update({move:-1,fire:true,repair:true});
 r.advance(110);r.advance(110);r.advance(110);r.advance(110);
 assert.equal(r.worlds[0].players[1].repairs,1);assert.equal(r.worlds[0].players[1].charges,2);
 assert.ok(r.worlds[0].players[1].x<200);
 assert.equal(r.worlds[1].players[1].repairs,1);assert.equal(guest.diagnostics.repairAcks[1],1);
 assert.equal(r.callbacks[1].filter(e=>e.type==='repair').length,1);
 guest.update({move:0,repair:false});guest.update({move:0,repair:true});
 r.advance(110);r.advance(110);assert.equal(r.worlds[0].players[1].repairs,2);
});
test('sender identity validation rejects foreign seat and nonfinite bounded input',()=>{
 const r=room();r.start();r.setTime(0);const host=r.hubs[0],d=r.controllers[0].diagnostics;
 const base={t:'i',n:100,at:0,m:1,f:1,r:0};
 host.emit('message',{...base,seat:0},1);
 host.emit('message',{...base,m:Infinity},1);
 host.emit('message',base,500);
 assert.equal(d.rejectedInputs,3);r.advance(10);assert.equal(r.worlds[0].players[1].x,200);
});
test('out of order packets are ignored, stale input neutralizes, fresh heartbeat recovers',()=>{
 const r=room();r.start();r.setTime(0);const h=r.hubs[0],d=r.controllers[0].diagnostics;
 h.emit('message',{t:'i',n:100,at:0,m:1,f:0,r:0},1);
 h.emit('message',{t:'i',n:99,at:0,m:-1,f:0,r:0},1);
 r.advance(200);const moved=r.worlds[0].players[1].x;assert.ok(moved>200);assert.ok(d.staleInputs>=1);
 r.hubs[1].dropInput=true;r.advance(700);const stopped=r.worlds[0].players[1].x;r.advance(100);assert.equal(r.worlds[0].players[1].x,stopped);
 h.emit('message',{t:'i',n:101,at:r.time,m:-1,f:0,r:0},1);r.advance(20);
 assert.ok(r.worlds[0].players[1].x<stopped);assert.ok(d.inputTimeouts>=1);
});
test('a large repair-sequence gap after disconnect still recovers bounded ordinary input',()=>{
 const r=room();r.start();r.setTime(0);r.hubs[0].emit('message',{t:'i',n:100,at:0,m:1,f:0,r:100},1);
 r.advance(20);assert.ok(r.worlds[0].players[1].x>200);assert.equal(r.worlds[0].players[1].repairs,1);
});
test('local overlay neutralizes only that seat while host simulation continues',()=>{
 const r=room();r.start();r.setTime(0);r.controllers[0].update({move:1,fire:true},true);
 r.controllers[1].update({move:-1,fire:true});r.advance(110);r.advance(110);
 assert.equal(r.worlds[0].players[0].x,100);assert.ok(r.worlds[0].players[1].x<200);assert.equal(r.worlds[0].tick,26);
});
test('guest overlay consumes pending repair without firing or spending it',()=>{
 const r=room();r.start();r.setTime(0);r.hubs[0].emit('message',{t:'i',n:100,at:0,m:0,f:0,r:1,o:1},1);
 r.advance(50);assert.equal(r.worlds[0].players[1].repairs,0);assert.equal(r.worlds[0].players[1].charges,3);
 assert.equal(r.controllers[0].diagnostics.repairAcks[1],1);
});
test('server authority has no local seat yet simulates both roster participants',()=>{
 const r=room({server:true});r.start();r.setTime(0);const server=r.controllers[2];
 assert.equal(server.seat,-1);server.update({move:1,fire:true});r.controllers[0].update({move:1});
 r.advance(110);r.advance(110);assert.ok(r.worlds[2].tick>0);assert.ok(r.worlds[2].players[0].x>100);
 assert.equal(r.worlds[2].players.length,2);assert.equal(r.hubs[2].failures.length,0);
});
test('departed seat remains stable and gets no reserves or score',()=>{
 const r=room();r.start();r.setTime(0);const reserve=r.worlds[0].reserve;
 r.hubs[0].emit('leave',{id:1,reason:'left'});r.advance(50);
 assert.equal(r.worlds[0].players[1].active,false);assert.equal(r.worlds[0].players[1].respawn,0);
 assert.equal(r.worlds[0].reserve,reserve);assert.equal(r.worlds[0].score,0);assert.equal(r.worlds[1].players[1].id,1);
});
test('time-up publishes terminal state then finishes once with tied active roster scores',()=>{
 const r=room();r.start();r.setTime(1000);r.hubs[0].emit('time-up',{graceMs:5000});r.pump();
 assert.equal(r.hubs[0].finishes.length,1);assert.deepEqual(r.hubs[0].finishes[0].standings,[[0,1]]);
 assert.equal(r.hubs[0].finishes[0].won,false);assert.deepEqual(Object.keys(r.hubs[0].finishes[0].scores),['0','1']);
 assert.equal(r.worlds[1].status,'defeat');assert.equal(r.worlds[1].reason,'time-expired');
 r.hubs[0].emit('time-up',{graceMs:5000});r.advance(2000);assert.equal(r.hubs[0].finishes.length,1);
 const tail=r.hubs[0].sent.at(-1);assert.equal(tail.packet.over,1);assert.equal(tail.opts.reliable,true);
});
test('end cancels timers and prevents further sends, simulation, and input',()=>{
 const r=room();r.start();r.setTime(500);const h=r.hubs[0],c=r.controllers[0],tick=c.world.tick,sent=h.sent.length;
 h.emit('end',{reason:'host-left'});c.update({move:1,fire:true});r.advance(2000);
 assert.equal(c.ended,true);assert.equal(c.world.tick,tick);assert.equal(h.sent.length,sent);assert.equal(r.timers[0],null);
});
test('guest predicts only its movement and receives packet acknowledgments',()=>{
 const r=room();r.start();r.setTime(0);const guest=r.controllers[1];guest.update({move:1,fire:true});
 r.advance(110);r.advance(50);const authority=copy(guest.world),view=guest.interpolatedWorld(r.mono);
 assert.ok(view.players[1].x>authority.players[1].x);assert.equal(view.score,authority.score);
 assert.deepEqual(view.bunkers,authority.bunkers);r.advance(110);assert.ok(guest.diagnostics.inputAcks[1]>=1);
});
test('full snapshots remain below protocol envelope, interpolation does not mutate authority',()=>{
 const r=room();r.start();r.setTime(0);r.controllers[0].update({move:1});r.advance(200);
 const guest=r.controllers[1],before=JSON.stringify(guest.world);const render=guest.interpolatedWorld(r.mono+50);
 assert.ok(render.players[0].x<=guest.world.players[0].x);assert.equal(JSON.stringify(guest.world),before);
 assert.ok(guest.diagnostics.maxSnapshotBytes<16000);
});

return {passed:count-failures.length,failed:failures.length,results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=runSessionTests();for(const result of report.results)if(!result.ok)console.error('FAIL session: '+result.name+': '+result.detail);
 console.log((report.passed+report.failed)+' session checks, '+report.failed+' failures');
 if(report.failed)process.exitCode=1;
}
