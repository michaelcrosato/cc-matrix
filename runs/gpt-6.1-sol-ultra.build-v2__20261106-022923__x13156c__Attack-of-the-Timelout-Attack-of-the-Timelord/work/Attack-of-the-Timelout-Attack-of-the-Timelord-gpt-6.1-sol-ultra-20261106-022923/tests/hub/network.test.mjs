import assert from 'node:assert/strict';
import {test,afterEach} from 'node:test';
import fs from 'node:fs';
import {createNetworkClock} from '../../src/network/clock.js';
import {NetworkSession} from '../../src/network/session.js';
import {decodeWorld,encodeWorld,splitWorld,packetBytes,validInput,roomCode,makeRoomCode,validRoomCode} from '../../src/network/protocol.js';

const world=()=>({tick:10,time:1,hostileTime:1,phase:'playing',phaseTime:1,wave:0,bossPhase:0,score:25,charge:50,brake:0,cooldown:0,seed:3,outcome:null,modified:false,demo:false,
 players:[{id:0,name:'Pilot 1',x:0,hp:3,invuln:0,vx:0,recoil:0,connected:true,colorIndex:0},{id:1,name:'Pilot 2',x:130,hp:2,invuln:1,vx:0,recoil:0,connected:true,colorIndex:1}],
 enemies:[{id:4,kind:2,x:34,y:-100,hp:1,angle:0,arrival:1,delay:0}],
 threats:[{id:5,type:'roller',x:20,y:240,vx:80,vy:0,r:11,warning:0,age:3,targetId:0,targetX:0,targetY:240,grounded:true,left:-80,right:150,safeX:-150,life:2,committed:true,angle:2}],
 shots:[{id:6,owner:1,x:130,y:50}],boss:null,stats:{intercepts:3},subtitle:'Your minutes are numbered.'});
const input=(q=0,b=0)=>({t:'a',g:0,q,m:1,x:null,f:true,b});
function host(){const session=new NetworkSession({now:()=>session._clock});session.isHost=true;session.started=true;session.host=0;session.me=0;session.roster=world().players;return session;}
afterEach(()=>{delete globalThis.AIHub;});

test('validates sender action shape, finite ranges and monotonic sequence',()=>{
 assert(validInput(input()));assert(!validInput(input(1),1));assert(!validInput({...input(),id:1}));assert(!validInput({...input(),m:Infinity}));assert(!validInput({...input(),x:451}));assert(!validInput({...input(),f:1}));assert(!validInput({...input(),b:-1}));
});
test('sender identity owns exactly one cannon; spoofed authority is rejected',()=>{
 const s=host();s._receive(input(1),1);assert.equal(s.actions()[1].move,1);assert.equal(s.actions()[0].move,0);
 s._receive(input(2),99);s._receive({t:'k',w:encodeWorld(world())},1);s._receive({...input(2),id:0},1);
 assert.equal(s.debug.rejected,3);assert.equal(s.debug.acceptedInputs,1);
});
test('stale movement and fire expire and brake edges are consumed once',()=>{
 const s=host();s._receive(input(1,3),1);assert.equal(s.actions()[1].brake,true);assert.equal(s.actions()[1].brake,false);
 s._receive(input(2,3),1);assert.equal(s.actions()[1].brake,false);
 s.update(.25);s.update(.2);assert.deepEqual(s.actions()[1],{move:0,targetX:null,fire:false,brake:false});assert.equal(s.debug.staleInputs,1);
});
test('compact snapshot retains shared collision and terminal presentation state',()=>{
 const w=world();w.assisted=true;w.assists={autoFire:false,reducedSpeed:false,emergencyBrake:false};w.boss={x:0,y:-180,hp:40,maxHp:90,vulnerable:true,cycle:1,phase:2,hit:.2};
 const copy=decodeWorld(encodeWorld(w));assert.equal(copy.tick,w.tick);assert.equal(copy.assisted,true);assert.equal(copy.assists.autoFire,false);assert.deepEqual(copy.stats,w.stats);assert.equal(copy.threats[0].grounded,true);assert.equal(copy.threats[0].safeX,-150);assert.equal(copy.shots[0].owner,1);assert.equal(copy.players[1].hp,2);assert.equal(copy.boss.vulnerable,true);
});
test('chunk packets remain below1200 encoded bytes including Unicode names',()=>{
 const w=world();w.players[0].name='時界の勇者🌌'.repeat(6);for(let i=0;i<60;i++)w.enemies.push({...w.enemies[0],id:20+i,x:i*3.125});
 const packets=splitWorld(w,100);assert(packets.length>1);assert(packets.every((packet)=>packetBytes(packet)<=1150));
 const guest=new NetworkSession({onWorld:copy=>{guest.copy=copy;}});guest.host=0;guest.seed=3;guest._receive(packets[1],0);assert.equal(guest.copy,undefined);for(const packet of packets)guest._receive(packet,0);assert.equal(guest.copy.enemies.length,61);assert.equal(guest.copy.players[0].name,w.players[0].name);
});
test('loss/reordering never applies an incomplete or stale snapshot; keyframe corrects',()=>{
 const guest=new NetworkSession({onWorld:copy=>{guest.copy=copy;}});guest.host=0;guest.seed=3;
 const w=world(),packets=splitWorld(w,2);guest._receive(packets[0],0);for(const packet of packets)guest._receive(packet,0);assert.equal(guest.copy.tick,10);
 w.tick=20;w.score=999;guest._receive({t:'k',w:encodeWorld(w)},0);for(const packet of packets)guest._receive(packet,0);assert.equal(guest.copy.tick,20);assert.equal(guest.copy.score,999);
 guest._receive({t:'k',w:encodeWorld({...w,tick:99})},1);assert.equal(guest.copy.tick,20);
});
test('host send cadence stays below Hub limits at four-player stress load',()=>{
 const s=host();s.hosted=true;globalThis.AIHub={send:()=>true,time:()=>1};const w=world();
 for(let i=0;i<40;i++)w.enemies.push({...w.enemies[0],id:i+20});for(let i=0;i<25;i++)w.threats.push({...w.threats[0],id:i+100});
 for(let i=0;i<1200;i++){s.update(1/120);w.tick++;w.time+=1/120;s.publish(w);}
 assert(s.debug.sent>50);assert(s.debug.maxPerSecond<=18);assert(s.debug.maxPacketBytes<=16384);assert(s.debug.maxUnreliableBytes<=1200);assert.equal(s.debug.oversizeDrops,0);
});
test('replay rejects previous-run inputs and snapshots and clears queued actors',()=>{
 const s=host();s.seed=77;s.roomState='results';s.roster.forEach(p=>p.ready=true);s._packets=[{packet:{t:'s',r:1,i:0,n:1,d:'old'},reliable:false}];
 assert(s.startRoom());assert.equal(s._packets.length,0);s._receive({...input(3,10),g:77},1);assert.equal(s.debug.acceptedInputs,0);
 const guest=new NetworkSession({onWorld:copy=>{guest.copy=copy;}});guest.host=0;guest.seed=s.seed;guest._receive({t:'k',w:encodeWorld(world())},0);assert.equal(guest.copy,undefined);
 const current={...world(),seed:s.seed,tick:1};guest._receive({t:'k',w:encodeWorld(current)},0);assert.equal(guest.copy.tick,1);
});
test('remote feedback survives host event clearing between snapshot slots',()=>{
 const packets=[];const s=host();s.hosted=true;globalThis.AIHub={send:packet=>{packets.push(packet);return true;},time:()=>1};const w=world();
 w.events=[{id:1,type:'hit',owner:1,hp:2}];s.publish(w);w.events=[];
 for(let i=0;i<140;i++){w.time+=1/120;w.tick++;s.update(1/120);s.publish(w);}
 const corrections=packets.filter(p=>p.t==='k');assert(corrections.length >= 2);assert(decodeWorld(corrections.at(-1).w).events.some(e=>e.type==='hit'));
 assert.equal(s._eventBuffer.filter(e=>e.event.id===1).length,1);
});
test('Hub null connect keeps standalone available without opening PeerJS',async()=>{
 globalThis.AIHub={connect:async(opts)=>{assert.deepEqual(opts,{mode:'shared-world',seats:[1,4]});return null;}};
 const s=new NetworkSession();assert.equal(await s.connectHub(),null);assert.equal(s.debug.peerInitialized,false);
});
test('server host has no local player and finishes each remaining participant once',async()=>{
 const handlers={},sent=[],finishes=[];globalThis.AIHub={isHost:true,server:true,me:-1,host:-1,connect:async()=>({players:world().players,seed:9}),on:(name,fn)=>{handlers[name]=fn;return()=>{};},ready:()=>{},time:()=>1,send:packet=>{sent.push(packet);return true;},finish:result=>finishes.push(result)};
 const s=new NetworkSession();await s.connectHub();assert.equal(s.me,null);s.update(.1,input());assert.equal(s._inputs.size,0);handlers.leave({id:1});s.publish(world());handlers['time-up']({graceMs:1000});s.finish(world());assert.equal(finishes.length,1);assert.deepEqual(finishes[0].standings,[[0]]);assert.deepEqual(Object.keys(finishes[0].scores),['0']);
 handlers.end({reason:'finished'});const count=sent.length;s.update(.2,input());s.publish(world());assert.equal(sent.length,count);assert.equal(s.ended,true);
});
test('readable eight-character room codes and invitation paste',()=>{
 for(let i=0;i<100;i++)assert(validRoomCode(makeRoomCode()));assert.equal(roomCode('https://example.org/game.html?room=ABCDEFGH'),'ABCDEFGH');assert.equal(roomCode('ABCD EFGH'),'ABCDEFGH');assert(!validRoomCode('ABCDEFGI'));
});
test('vendored session client is exact and head ordering can be checked by build',()=>{
 const a=fs.readFileSync(new URL('../../vendor/session.js',import.meta.url));const b=fs.readFileSync(new URL('../../vendor/hub/session.js',import.meta.url));assert(a.equals(b));assert(a.includes(Buffer.from('aihub-session 1.4.0')));
});


test('network clock catches up exact fixed steps without any draw callback',()=>{
 let time=0,ticks=0;const clock=createNetworkClock({now:()=>time,tick:dt=>{assert.equal(dt,1/120);ticks++;}});clock.reset();time=1;assert.equal(clock.pulse(),120);assert.equal(ticks,120);assert(clock.remainder<1e-10);
 time=1.075;assert.equal(clock.pulse(),9);time=.5;assert.equal(clock.pulse(),0);time=1.1;assert.equal(clock.pulse(),3);assert.equal(ticks,132);
});
test('network clock inactive time is not banked and terminal state stops catchup',()=>{
 let time=0,ticks=0,active=false;const clock=createNetworkClock({now:()=>time,active:()=>active,tick:()=>{ticks++;if(ticks===5)active=false;}});clock.reset();time=10;clock.pulse();active=true;time+=1;assert.equal(clock.pulse(),5);assert.equal(ticks,5);assert.equal(clock.remainder,0);
 active=true;clock.reset();assert.equal(clock.advance(1/60),2);assert.equal(ticks,7);
});
test('network clock owns and tears down only its own interval',()=>{
 let callback,scheduled=0,cancelled=0,time=0;const clock=createNetworkClock({now:()=>time,tick:()=>{},schedule:fn=>{callback=fn;scheduled++;return 44;},cancel:handle=>{assert.equal(handle,44);cancelled++;}});
 clock.start().start();assert.equal(scheduled,1);assert.equal(clock.running,true);time=.1;callback();assert.equal(clock.debug.ticks,12);clock.dispose();assert.equal(cancelled,1);assert.equal(clock.running,false);clock.start();assert.equal(scheduled,1);
});
test('remote input expires by monotonic real time even if no renderer updates',()=>{
 let time=10;const s=host();s._now=()=>time;s._receive(input(1),1);time+=.36;assert.deepEqual(s.actions()[1],{move:0,targetX:null,fire:false,brake:false});
});

test('explicit network test advance bypasses inactive automatic gate without a timer',()=>{
 let ticks=0;const clock=createNetworkClock({active:()=>false,tick:()=>ticks++});assert.equal(clock.advance(1/60),2);assert.equal(ticks,2);assert.equal(clock.advance(1/60,{force:false}),0);
});
