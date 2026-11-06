import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../vendor/engine/my-3d2dge.js';
import '../src/content/content.js';
import '../src/sim/sim.js';
import { ordinaryExpedition } from './playthrough.mjs';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const S=globalThis.RingSim,C=globalThis.RingContent,E=globalThis.My3D2dge;
const DT=1/120, near=(a,b,n=1)=>Math.hypot(a.x-b.x,a.y-b.y)<n;
const ordinaryResults=[];
function assert(ok,message){if(!ok)throw Error(message);}
// These explicit fixture setups isolate a rule. They are not recorded as normal playthroughs.
function fixture(room='courtyard',classes=['warrior','wizard']){
  const w=S.create({seed:'rule-fixture-'+room,classes,humans:[0,1]});
  if(room!=='courtyard'){const site=C.sites.find(s=>s.rooms.includes(room));w.site=site.id;w.roomIndex=site.rooms.indexOf(room);S.enterRoom(w,room);}
  w.transition=0;w.heroes.forEach(h=>h.hurt=0);return w;
}
function place(h,p){h.x=p.x;h.y=p.y;h.safe={...p};}
function advance(w,seconds,commands=[]){for(let i=0;i<Math.ceil(seconds/DT);i++)S.step(w,DT,commands);}
function foe(kind,p,id='fixture-foe') {return {id,kind,...p,z:0,vx:0,vy:0,facing:0,hp:['fighter','fire'].includes(kind)?2:999,stun:0,resist:0,wind:0,attack:0,cooldown:100,state:'idle',target:null,life:9999};}
function ordinaryToBoard(w){for(let i=0;i<20000&&w.mode!=='board';i++){const cmd=S.companion(w,w.heroes[0],DT,true);cmd.ping=w.tick%600===0;S.step(w,DT,[cmd]);}assert(w.mode==='board','Normal input did not reach board');}
function runRoom(w,limit=120){const epoch=w.epoch;for(let i=0;i<120*limit&&w.epoch===epoch&&w.mode!=='failed';i++){const cmd=S.companion(w,w.heroes[0],DT,true);cmd.ping=w.tick%600===0;S.step(w,DT,[cmd]);}assert(w.epoch!==epoch,'Room did not complete with ordinary actions: '+w.roomId);}

export function runSimulationTests(options={}){
  const results=[];
  const test=(name,fn)=>{try{const value=fn();results.push({name,pass:true,errors:[],value});}catch(e){results.push({name,pass:false,errors:[e.stack||e.message]});}};

  test('content schema: 8 core rooms, 2 caches, courtyard and finale',()=>{
    assert(Object.keys(C.rooms).length===12,'Expected 12 authored spaces');
    for(const s of C.sites.filter(s=>!s.cache&&!s.final))assert(s.rooms.length===2,'Castle lacks two rooms: '+s.id);
    assert(C.sites.filter(s=>s.cache).length===2,'Expected two cache nodes');
    assert(C.sites.filter(s=>s.final).length===1,'Expected one finale');
  });
  for(const [id,r] of Object.entries(C.rooms))for(const shift of [0,1])test('reachable authored geometry '+id+' partition '+shift,()=>{
    assert(r.rows.length>=12&&r.rows.every(row=>row.length===r.rows[0].length),'Malformed rectangle');
    assert(r.rows[0].split('').every(c=>c==='#')&&r.rows.at(-1).split('').every(c=>c==='#')&&r.rows.every(row=>row[0]==='#'&&row.at(-1)==='#'),'Boundary not sealed');
    const w=fixture(id);w.shift=shift;
    assert(S.walkable(w,r.entry.x,r.entry.y),'Entry blocked');
    assert(S.walkable(w,r.fallback.x,r.fallback.y),'Fallback blocked');
    for(const p of [r.exit,r.ring,...(r.stations||[])].filter(Boolean)){
      assert(S.walkable(w,p.x,p.y),'Objective blocked');
      assert(near(r.entry,p,9)||S.path(w,r.entry,p,{ignoreDanger:true}).length>0,'Objective requires a hero power or has no path');
    }
    for(const e of r.enemies)assert(S.walkable(w,e.x,e.y)||e.kind==='nightmare','Enemy spawn invalid: '+e.kind);
    assert(Number.isFinite(r.enemyBudget)&&r.enemyBudget>=r.enemies.length,'Enemy budget invalid');
    for(const h of r.hazards)assert(h.period>h.duration&&h.w>0&&h.h>0,'Hazard timeline invalid');
    assert(r.camera&&r.navigation&&r.reveal&&r.directorEvents,'Room metadata missing');
  });
  test('Dread never advances in tutorial or idle board',()=>{
    const w=S.create();advance(w,2);assert(w.dread===0,'Tutorial charged Dread');S.intent(w,0,{type:'courtyardContinue'});advance(w,3);assert(w.dread===0,'Board idle charged Dread');
  });
  test('route authority, mandatory opening, and hero own-seat changes',()=>{
    const w=S.create();S.intent(w,0,{type:'courtyardContinue'});
    assert(!S.intent(w,1,{type:'route',value:'dungeon'},0),'Nonchooser selected route');
    assert(!S.intent(w,0,{type:'route',value:'crystal'}),'Skipped mandatory Dungeon');
    assert(!S.intent(w,0,{type:'route',value:'final'}),'Final unlocked without rings');
    assert(S.intent(w,1,{type:'hero',value:'phantom'},0)&&w.heroes[1].classId==='phantom','Own hero change rejected');
    assert(S.intent(w,0,{type:'route',value:'dungeon'},0)&&w.dread===1,'Entry not charged exactly once');
    assert(!S.intent(w,0,{type:'route',value:'inferno'}),'Route changed during active room');
  });
  test('native Attack shares wind-up/active/recovery and hits once per swing',()=>{
    const a=new E.Attack('slash',{wind:.15,active:.18,recover:.65});const e={};let n=0;
    assert(a.start(),'Native swing did not start');a.update(.1);a.hits([e],()=>true,()=>n++);assert(n===0&&a.phase==='wind','Wind-up hit');
    a.update(.12);for(let i=0;i<5;i++)a.hits([e],()=>true,()=>n++);assert(n===1&&a.phase==='active','Repeated swing hit or no active hit');
    assert(!a.start(),'Recovery cancel unexpectedly accepted');a.update(1);assert(!a.busy,'Recovery never ended');
    assert(a.start(),'Next swing failed');a.update(.23);a.hits([e],()=>true,()=>n++);assert(n===2,'Hit tracking not reset for next swing');
  });
  for(const [classId,move] of Object.entries({warrior:'slash',wizard:'cast',phantom:'rising',changeling:'throw'}))test('native class timeline '+classId+' uses '+move+' and commits only during active',()=>{
    assert(!!E.MOVES[move],'Native move does not exist');const w=fixture('courtyard',[classId,'warrior']);w.enemies=[];
    advance(w,.1,[{primary:true,ax:1},S.ZERO()]);const h=w.heroes[0];
    assert(h.attack?.spec.name===move&&h.attack.phase==='wind','Class did not use its native wind-up');
    assert(h.attack.spec.wind===.15&&h.attack.spec.active===.18&&h.attack.spec.recover===w.tuning.recovery,'Timeline drifted from shared tuning');
    assert(!w.events.some(e=>e.type==='attack')&&!w.projectiles.length&&!w.lures.length&&w.reveal===0,'Primary effect/sound escaped during wind-up');
    advance(w,.16,[S.ZERO(),S.ZERO()]);
    assert(h.attack?.phase==='active'&&w.events.filter(e=>e.type==='attack').length===1,'Active phase failed to release exactly one action');
    if(classId==='wizard')assert(w.projectiles.length===1,'Rune not released');
    if(classId==='phantom')assert(w.reveal>4,'Reveal not released');
    if(classId==='changeling')assert(w.lures.length===1,'Lure not released');
    const copy=S.applySnapshot(null,S.snapshot(w));assert(copy.heroes[0].attack.spec.name===move,'Client reconstructed wrong native move');
  });
  test('partial aim input preserves finite authoritative facing',()=>{
    const w=fixture('courtyard',['wizard','warrior']);w.enemies=[];advance(w,.3,[{primary:true,ax:1},S.ZERO()]);
    assert(Number.isFinite(w.heroes[0].facing)&&w.projectiles.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'Missing aim axis poisoned facing/projectiles');
  });
  test('Warrior kills lesser enemies but only repels Nightmare',()=>{
    const w=fixture();w.enemies=[];const h=w.heroes[0];place(h,C.at(10,9));h.facing=0;
    const f=foe('fighter',{x:h.x+23,y:h.y},'fighter'),n=foe('nightmare',{x:h.x+25,y:h.y+2},'nightmare');w.enemies=[f,n];
    advance(w,.6,[{primary:true,ax:1,ay:0},S.ZERO()]);
    assert(f.dead||!w.enemies.includes(f),'Sword did not kill lesser fighter');assert(!n.dead&&n.hp===999&&n.stun>0,'Sword killed/failed to repel impervious Nightmare');
  });
  test('Wizard rune stuns without universal damage',()=>{
    const w=fixture('courtyard',['wizard','wizard']);const h=w.heroes[0];place(h,C.at(10,9));h.facing=0;
    const f=foe('fighter',{x:h.x+42,y:h.y});w.enemies=[f];advance(w,.7,[{primary:true,ax:1,ay:0},S.ZERO()]);
    assert(f.hp===2&&f.stun>0,'Wizard dealt damage or failed to stun');
  });
  test('large threats visibly resist repeated stun; dragon deflects',()=>{
    const w=fixture(),n=foe('nightmare',C.at(10,9)),d=foe('dragon',C.at(12,3));
    S.stun(w,n,2.5,1);const first=n.stun;n.stun=0;S.stun(w,n,2.5,1);assert(n.stun<first&&n.resist===5,'No stun-chain resistance');
    S.stun(w,d,5,1);assert(d.stun===0&&w.events.at(-1).type==='deflect','Dragon was damaged/stunned without feedback');
  });
  test('Phantom reveals crystal, phases interior stone and safely re-enters',()=>{
    const w=fixture('crystal1',['phantom','wizard']);w.enemies=[];const h=w.heroes[0];place(h,C.at(5,9));
    advance(w,.26,[{primary:true},S.ZERO()]);assert(w.reveal>4,'Phantom reveal missing');
    advance(w,.1,[{power:true,mx:1},S.ZERO()]);advance(w,.45,[{mx:1},S.ZERO()]);
    assert(h.x>6*16,'Phase did not cross tagged interior boundary');advance(w,3,[S.ZERO(),S.ZERO()]);assert(!h.phase&&S.walkable(w,h.x,h.y),'Unsafe phase expiry');
    assert(!S.walkable(w,8,8,4,true),'Phase crossed outer boundary');
  });
  test('phase expiry inside wall returns to valid nearby floor',()=>{
    const w=fixture('crystal1',['phantom','wizard']);w.enemies=[];const h=w.heroes[0];place(h,C.at(5,9));
    S.power(w,h);h.phase=.01;h.x=C.at(6,9).x;h.y=C.at(6,9).y;advance(w,.03,[S.ZERO(),S.ZERO()]);
    assert(h.phase===0&&S.walkable(w,h.x,h.y),'Phase ended inside solid geometry');assert(w.events.some(e=>e.type==='phase-return'),'Safe return had no event');
  });
  test('Phantom and Changeling cannot cross lava with their powers',()=>{
    for(const cls of ['phantom','changeling']){
      const w=fixture('inferno1',[cls,'wizard']);w.enemies=[];w.hazards=[];const h=w.heroes[0];place(h,C.at(5,8));
      advance(w,2,[{power:true,mx:1},S.ZERO()]);assert(h.x<6*16-3,'Class crossed lava: '+cls);assert(h.hp===5,'Blocked crossing silently hurt hero');
    }
  });
  test('Changeling lure redirects pursuit; cloak does not prevent contact damage',()=>{
    const w=fixture('courtyard',['changeling','wizard']);const h=w.heroes[0];place(h,C.at(10,9));place(w.heroes[1],C.at(20,9));h.facing=0;
    const n=foe('nightmare',{x:h.x+12,y:h.y});w.enemies=[n];
    advance(w,.26,[{primary:true,ax:1,power:true},S.ZERO()]);
    assert(w.lures.length===1&&w.lures[0].owner===1&&h.cloak>0,'Lure/cloak missing');
    const hp=h.hp;h.hurt=0;n.x=h.x;n.y=h.y;advance(w,.05,[S.ZERO(),S.ZERO()]);assert(h.hp<hp,'Cloak incorrectly grants contact immunity');
    assert(w.lures.length===1,'Lure unexpectedly vanished');
  });
  test('cloak touching any enemy family hurts even with no visible target',()=>{
    for(const kind of ['fighter','fire','spider','nightmare','dragon']){
      const w=fixture('courtyard',['changeling','changeling']);const [h,o]=w.heroes;place(h,C.at(10,9));place(o,C.at(20,9));h.cloak=2;o.cloak=2;
      w.enemies=[foe(kind,{x:h.x,y:h.y})];advance(w,.02,[S.ZERO(),S.ZERO()]);
      assert(h.hp===4&&w.events.some(e=>e.type==='hurt'),'Cloak granted contact immunity to '+kind+' when both heroes hidden');
    }
  });
  test('Wizard possession copies a warned aimed rune without stealing input',()=>{
    const w=fixture();const h=w.heroes[0];place(h,C.at(10,9));place(w.heroes[1],C.at(3,3));const e=foe('echo',{x:h.x+80,y:h.y});e.classId='wizard';e.cooldown=0;e.life=12;w.enemies=[e];
    advance(w,.7,[S.ZERO(),S.ZERO()]);assert(e.state==='wind'&&e.attackMove==='cast'&&e.windDuration===1.15&&!w.projectiles.length,'Wizard projection omitted warned cast');
    const target={...e.target};advance(w,.6,[{my:1},S.ZERO()]);
    const p=w.projectiles.find(p=>p.kind==='echo-rune');assert(p&&p.team==='enemy'&&p.r===3&&p.life<=3,'Projection did not release a bounded hostile rune');
    assert(Math.abs(Math.atan2(p.vy,p.vx)-Math.atan2(target.y-e.y,target.x-e.x))<.001,'Projection secretly retargeted after warning');
    assert(!h.ai&&h.owner==='seat0','Possession stole controller ownership');assert(w.events.filter(e=>e.type==='possession-rune').length===1,'Projection repeated one active release');
    const copy=S.applySnapshot(null,S.snapshot(w));assert(copy.enemies[0].classId==='wizard'&&copy.enemies[0].attackMove==='cast','Copied kit missing remotely');
  });
  test('Phantom possession warns then pulses once with safe repulsion',()=>{
    const w=fixture();const h=w.heroes[0];place(h,C.at(10,9));place(w.heroes[1],C.at(3,3));const e=foe('echo',{x:h.x+35,y:h.y});e.classId='phantom';e.cooldown=0;e.life=12;w.enemies=[e];const x=h.x;
    advance(w,.7,[S.ZERO(),S.ZERO()]);assert(h.hp===5&&e.wind>0&&e.attackMove==='rising','Phantom projection harmed during warning');
    advance(w,.55,[S.ZERO(),S.ZERO()]);assert(h.hp===4&&h.x<x&&S.walkable(w,h.x,h.y),'Phantom pulse failed safe damaging repulsion');
    assert(w.events.filter(e=>e.type==='possession-pulse').length===1&&w.reveal>0,'Pulse duplicated or did not reveal geometry');
  });
  test('Changeling possession casts one finite decoy without budget-free reinforcements',()=>{
    const w=fixture();const h=w.heroes[0];place(h,C.at(10,9));place(w.heroes[1],C.at(3,3));const e=foe('echo',{x:h.x+80,y:h.y},'mirror-decoy');e.classId='changeling';e.cooldown=0;e.life=12;w.enemies=[e];
    advance(w,.6,[S.ZERO(),S.ZERO()]);assert(!w.lures.length&&e.attackMove==='throw','Projection decoy escaped its warning');
    advance(w,.55,[S.ZERO(),S.ZERO()]);const l=w.lures.find(l=>l.owner===e.id);assert(l&&l.team==='enemy'&&l.life>0&&l.life<=4.5,'Finite mirrored decoy missing');
    const copy=S.applySnapshot(null,S.snapshot(w));assert(copy.lures[0].team==='enemy'&&copy.lures[0].owner===e.id,'Remote decoy lost ownership/team');
    for(let i=0;i<50;i++){advance(w,.1,[S.ZERO(),S.ZERO()]);assert(w.lures.filter(l=>l.owner===e.id).length<=1&&w.enemies.length===1,'Projection recursively spawned reinforcement/decoys');}
  });
  test('possession body remains dangerous to visible heroes',()=>{
    const w=fixture();const h=w.heroes[0];place(h,C.at(10,9));const e=foe('echo',{x:h.x,y:h.y});e.classId='changeling';e.life=12;w.enemies=[e];advance(w,.02,[S.ZERO(),S.ZERO()]);
    assert(h.hp===4&&!h.cloak&&w.events.some(e=>e.type==='hurt'),'Non-damaging copied kit made hostile body harmless');
  });
  test('Wizard ward interrupts active flame with ordinary power',()=>{
    const w=fixture('inferno1',['wizard','warrior']);w.enemies=[];const h=w.heroes[0];place(h,{x:160,y:195});
    w.roomTime=2;w.heroes.forEach(p=>p.hurt=0);S.power(w,h);advance(w,.3,[S.ZERO(),S.ZERO()]);assert(h.hp===5&&h.wardTime>0,'Ward did not shelter flame crossing');
    advance(w,3.1,[S.ZERO(),S.ZERO()]);w.roomTime=11;h.hurt=0;advance(w,.05,[S.ZERO(),S.ZERO()]);assert(h.hp<5,'Expired ward still protected flame');
  });
  test('dodge protects active window; facing guard deflects only frontal attacks',()=>{
    const w=fixture();w.enemies=[];const h=w.heroes[0];h.facing=0;
    h.dodge=.3;assert(!S.hurt(w,h,1,{x:h.x+10,y:h.y})&&h.hp===5,'Dodge ignored');h.dodge=0;h.guard=1;
    assert(!S.hurt(w,h,1,{x:h.x+10,y:h.y})&&h.hp===5,'Frontal guard ignored');h.hurt=0;
    assert(S.hurt(w,h,1,{x:h.x-10,y:h.y})&&h.hp===4,'Guard grants all-direction immunity');
  });
  test('downed carrier drops one recoverable ring at valid safe location',()=>{
    const w=fixture('dungeon2');w.enemies=[];const h=w.heroes[0];place(h,C.at(21,3));w.ring.carrier=1;h.carry=true;h.hp=1;
    assert(S.hurt(w,h,1),'Fatal hit rejected');assert(h.down&&!h.carry&&w.ring.carrier===0&&S.walkable(w,w.ring.x,w.ring.y),'Carrier drop invalid');
    const n=w.events.filter(e=>e.type==='ring-drop').length;S.hurt(w,h,1);assert(w.events.filter(e=>e.type==='ring-drop').length===n,'Repeated down duplicated drop');
  });
  test('unreachable ring returns with event to last safe floor',()=>{
    const w=fixture('dungeon2');w.enemies=[];const p={...w.ring.lastSafe};w.ring.x=8;w.ring.y=8;
    advance(w,.02,[S.ZERO(),S.ZERO()]);assert(S.walkable(w,w.ring.x,w.ring.y)&&near(w.ring,p,1),'Ring failed to recover');assert(w.events.some(e=>e.type==='ring-return'),'Recovery lacks visible event');
  });
  test('context priority revives without dropping a carried ring',()=>{
    const w=fixture('dungeon2');w.enemies=[];const [h,o]=w.heroes;place(h,C.at(12,3));place(o,{x:h.x+15,y:h.y});o.down=true;o.hp=0;w.ring.carrier=1;h.carry=true;
    assert(S.context(w,h).type==='revive','Revive did not take priority');advance(w,1.6,[{interact:true},S.ZERO()]);
    assert(!o.down&&o.hp===3&&w.ring.carrier===1&&h.carry,'Revival failed or dropped/passed treasure');assert(w.stats.revives===1,'Revive was not single-use');
  });
  test('revive hold resets when released or interrupted by damage',()=>{
    const w=fixture('dungeon2');w.enemies=[];const [h,o]=w.heroes;place(h,C.at(12,3));place(o,{x:h.x+16,y:h.y});o.down=true;o.hp=0;
    advance(w,.7,[{interact:true},S.ZERO()]);assert(h.revive>.5,'Revive did not accrue');advance(w,.02,[S.ZERO(),S.ZERO()]);assert(h.revive===0,'Released revive retained hold');
    advance(w,.7,[{interact:true},S.ZERO()]);h.hurt=0;S.hurt(w,h,1);assert(h.revive===0,'Damage failed to interrupt revive');
  });
  test('ring pass requires nearby willing human; one idempotent ownership',()=>{
    const w=fixture('dungeon2');w.enemies=[];const [h,o]=w.heroes;place(h,C.at(12,3));place(o,{x:h.x+16,y:h.y});w.ring.carrier=1;h.carry=true;
    advance(w,.1,[{interact:true},S.ZERO()]);assert(w.ring.carrier===1,'Ring passed to unwilling human');
    advance(w,.1,[{interact:true},{interact:true}]);assert(w.ring.carrier===2&&!h.carry&&o.carry,'Willing pass failed');assert(w.stats.passes===1,'Same-tick pass bounced or duplicated');
  });
  test('carrier can use class power and extraction rescues downed partner',()=>{
    const w=fixture('dungeon2',['wizard','phantom']);w.site='dungeon';w.roomIndex=1;w.enemies=[];
    const [h,o]=w.heroes;place(h,C.rooms.dungeon2.exit);o.down=true;o.hp=0;place(o,C.at(21,15));w.ring.carrier=1;h.carry=true;
    advance(w,.05,[{power:true,interact:true},S.ZERO()]);
    assert(w.mode==='board'&&w.rings[0]&&!o.down,'Extraction requires incapacitated partner');assert(w.events.some(e=>e.type==='ward'),'Carrier lost its power');
    const n=w.history.filter(e=>e.type==='ring-secured').length;assert(!S.complete(w)&&w.history.filter(e=>e.type==='ring-secured').length===n,'Delivery was not idempotent');
  });
  test('noncarrier at gate cannot extract a distant carried ring',()=>{
    const w=fixture('dungeon2');w.enemies=[];w.hazards=[];const [waiting,carrier]=w.heroes;
    place(waiting,C.rooms.dungeon2.exit);place(carrier,C.rooms.dungeon2.ring);carrier.carry=true;w.ring.carrier=2;
    assert(S.context(w,waiting)?.type!=='exit','Noncarrier was offered extraction');
    advance(w,.2,[{interact:true},S.ZERO()]);
    assert(w.mode==='room'&&!w.rings[0]&&w.ring.carrier===2,'Distant ring extracted through waiting partner');
    assert(!S.complete(w),'Direct completion failed to verify actual carrier distance');
    assert(!w.history.some(e=>e.type==='ring-secured'),'Rejected distant delivery awarded ring');
  });
  test('actual living carrier can extract at the gate with a distant living partner',()=>{
    const w=fixture('dungeon2');w.enemies=[];w.hazards=[];const [partner,carrier]=w.heroes;
    place(partner,C.at(21,15));place(carrier,C.rooms.dungeon2.exit);carrier.carry=true;w.ring.carrier=2;
    assert(S.context(w,carrier)?.type==='exit','Actual carrier not offered extraction');
    advance(w,.05,[S.ZERO(),{interact:true}]);assert(w.mode==='board'&&w.rings[0],'Actual carrier could not deliver');
    assert(w.history.filter(e=>e.type==='ring-secured').length===1,'Delivery duplicated');
  });
  test('final shared escape waits for both living heroes to regroup',()=>{
    const w=fixture('final');w.enemies=[];w.hazards=[];w.rings=[true,true,true,true];w.bound=4;w.finalBeat='escape';w.stations.forEach(s=>s.active=true);
    const [h,o]=w.heroes;place(h,C.rooms.final.exit);place(o,C.at(3,3));
    assert(S.context(w,h)?.type!=='exit'&&!S.complete(w),'Final escape abandoned a living partner');
    advance(w,.1,[{interact:true},S.ZERO()]);assert(w.mode==='room','Ungrouped final input won');
    place(o,{x:C.rooms.final.exit.x+30,y:C.rooms.final.exit.y});
    assert(S.context(w,h)?.type==='exit','Regrouped final party not offered escape');
    advance(w,.03,[{interact:true},S.ZERO()]);assert(w.mode==='victory','Regrouped party could not escape');
  });
  test('final survivor can carry a downed partner to shared safety',()=>{
    const w=fixture('final');w.enemies=[];w.hazards=[];w.rings=[true,true,true,true];w.bound=4;w.finalBeat='escape';w.stations.forEach(s=>s.active=true);
    const [h,o]=w.heroes;place(h,C.rooms.final.exit);place(o,C.at(3,3));o.down=true;o.hp=0;
    assert(S.context(w,h)?.type==='exit','Incapacitated partner blocked survivor escape');
    advance(w,.03,[{interact:true},S.ZERO()]);assert(w.mode==='victory'&&!o.down,'Final escape did not recover downed partner');
  });
  test('same-tick dual pickup chooses one carrier and one event',()=>{
    const w=fixture('dungeon2');w.enemies=[];const [h,o]=w.heroes;place(h,C.at(21,3));place(o,{x:h.x+12,y:h.y});
    advance(w,.02,[{interact:true},{interact:true}]);assert([1,2].includes(w.ring.carrier),'No pickup');assert(w.heroes.filter(p=>p.carry).length===1,'Multiple carriers');assert(w.history.filter(e=>e.type==='ring-pickup').length===1,'Duplicate pickup event');
  });
  test('shifting walls preserve valid heroes, ring and objective path',()=>{
    const w=fixture('shifting1');w.enemies=[];place(w.heroes[0],C.at(6,15));w.roomTime=9.99;
    advance(w,.03,[S.ZERO(),S.ZERO()]);assert(w.shift===1&&w.heroes.every(h=>S.walkable(w,h.x,h.y)),'Partition trapped hero');
    assert(S.path(w,w.heroes[0],C.rooms.shifting1.exit,{ignoreDanger:true}).length>0,'Shift sealed objective');assert(w.events.some(e=>e.type==='shift'),'Shift lacks event');
  });
  for(const room of ['dungeon2','crystal2','inferno2','shifting2'])test('companion safely rescues in '+room,()=>{
    const w=fixture(room);w.enemies=[];w.hazards=[];const [h,o]=w.heroes;place(h,C.at(3,15));place(o,{x:h.x+16,y:h.y});
    o.ai=true;o.owner=null;h.down=true;h.hp=0;advance(w,1.8,[S.ZERO()]);
    assert(!h.down&&h.hp===3&&w.stats.revives===1,'Companion failed safe rescue');
  });
  test('companion stuck recovery is safe and never awards objective progress',()=>{
    const w=fixture('crystal1');w.enemies=[];const [h,o]=w.heroes;place(h,C.at(3,15));place(o,C.at(6,9));o.ai=true;o.owner=null;o.stuck=4.1;
    const count=w.history.length;advance(w,.04,[S.ZERO()]);
    assert(S.walkable(w,o.x,o.y)&&Math.hypot(h.x-o.x,h.y-o.y)<38,'Companion recovered to an invalid/distant point');
    assert(w.events.some(e=>e.type==='companion-return')&&w.history.length===count,'Recovery was invisible or granted progress');
  });
  test('Continue preserves room-two checkpoint and never charges entry again',()=>{
    const w=S.create({seed:'continue-ordinary'});ordinaryToBoard(w);S.intent(w,0,{type:'route',value:'dungeon'});runRoom(w);assert(w.roomId==='dungeon2','First room did not checkpoint second');
    const save=S.checkpoint(w),copy=S.restore(JSON.parse(JSON.stringify(save)));
    assert(copy&&copy.roomId==='dungeon2'&&copy.roomIndex===1&&copy.dread===1,'Continue reset room or recharged Dread');assert(copy.ring&&copy.ring.carrier===0,'Continue retained temporary pickup');
  });
  test('wipe/retry charges one Dread and restores current room ring without secured-ring loss',()=>{
    const w=S.create();S.intent(w,0,{type:'courtyardContinue'});S.intent(w,0,{type:'route',value:'dungeon'});runRoom(w);
    w.transition=0;for(const h of w.heroes){h.hurt=0;S.hurt(w,h,5);}advance(w,.02,[S.ZERO(),S.ZERO()]);assert(w.mode==='failed','Wipe did not fail');
    assert(S.intent(w,0,{type:'retry'})&&w.mode==='room'&&w.roomId==='dungeon2'&&w.dread===2,'Retry charged wrong or reset castle');assert(w.heroes.every(h=>!h.down&&h.hp===5)&&w.ring.carrier===0,'Retry did not restore party/ring');
    w.dread=6;w.transition=0;for(const h of w.heroes){h.hurt=0;S.hurt(w,h,5);}advance(w,.02,[S.ZERO(),S.ZERO()]);assert(S.retry(w)&&w.dread===6,'Max-Dread retry rejected or exceeded cap');
  });
  test('Continue keeps event identities monotonic after checkpoint',()=>{
    const w=S.create({seed:'event-identity'});ordinaryToBoard(w);S.intent(w,0,{type:'route',value:'dungeon'});runRoom(w);
    const max=Math.max(...w.history.map(e=>e.id));const copy=S.restore(S.checkpoint(w));
    S.emit(copy,'ring-pickup',{room:copy.roomId});assert(copy.events.at(-1).id>max,'Continue reused stable event ID from before checkpoint');
  });
  test('malformed/versioned saves are rejected gracefully',()=>{
    const save=S.checkpoint(S.create());for(const value of [null,{},[],{...save,version:2},{...save,roomId:'void'},{...save,dread:7},{...save,rings:[true]},{...save,classes:['wizard','missing']},{...save,mode:'room',site:'inferno',roomId:'dungeon1'}])assert(S.restore(value)===null,'Malformed save accepted');
    assert(S.restore(JSON.parse(JSON.stringify(save)))!==null,'Valid save rejected');
  });
  test('Continue preserves assisted label and live tuning registry values',()=>{
    const w=S.create({seed:'assisted-checkpoint'});S.intent(w,0,{type:'courtyardContinue'});
    S.setTuning(w,'heroSpeed',90);S.setTuning(w,'recovery',1.2);const save=S.checkpoint(w),copy=S.restore(JSON.parse(JSON.stringify(save)));
    assert(copy&&copy.assisted===true,'Continue disguised an assisted run');
    assert(copy.tuning.heroSpeed===90&&copy.tuning.recovery===1.2&&copy.tuning.damage===C.tuning.damage.value,'Continue lost tuning changes or defaults');
  });
  test('malformed checkpoint statistics are rejected',()=>{
    const save=S.checkpoint(S.create());
    for(const stats of [null,[],{hits:'many'},{hits:-1},{rooms:Infinity},{unregistered:1}])assert(S.restore({...save,stats})===null,'Malformed statistics accepted');
    const copy={...save};delete copy.stats;assert(S.restore(copy)!==null,'Older save without optional statistics rejected');
  });
  test('malformed checkpoint tuning is rejected',()=>{
    const save=S.checkpoint(S.create());
    for(const tuning of [null,[],{heroSpeed:'fast'},{heroSpeed:1},{heroSpeed:10000},{damage:NaN},{unregistered:1}])assert(S.restore({...save,tuning})===null,'Malformed tuning accepted');
    const copy={...save};delete copy.tuning;delete copy.assisted;assert(S.restore(copy)!==null,'Older save without optional tuning rejected');
  });
  test('safe board preserves survivors and recovers an extracted downed partner at three pips',()=>{
    const w=fixture('dungeon2');w.heroes[0].hp=2.5;w.heroes[1].hp=0;w.heroes[1].down=true;
    S.board(w);assert(w.heroes[0].hp===2.5&&!w.heroes[0].down,'Board freely healed surviving hero');
    assert(w.heroes[1].hp===3&&!w.heroes[1].down,'Extracted partner did not recover at three pips');
  });
  test('castle entry preserves wounds above its minimum safety floor',()=>{
    const w=S.create();S.board(w);w.heroes[0].hp=4;w.heroes[1].hp=3.5;S.enterSite(w,'dungeon');
    assert(w.heroes[0].hp===4&&w.heroes[1].hp===3.5,'Castle entry granted an undocumented full heal');
  });
  test('room entry retains the authored three-pip safety minimum',()=>{
    const w=S.create();S.board(w);w.heroes[0].hp=1;w.heroes[1].hp=2.5;S.enterSite(w,'dungeon');
    assert(w.heroes.every(h=>h.hp===3),'Minimum safety floor changed while fixing free full heal');
  });
  test('mercy cache heals wounded party once and its benefit persists',()=>{
    const w=fixture('cacheCrystal');w.enemies=[];w.hazards=[];w.rings[0]=true;const [h,o]=w.heroes;
    place(h,C.rooms.cacheCrystal.exit);place(o,C.at(21,15));h.hp=3;o.hp=4;h.carry=true;w.ring.carrier=1;
    assert(S.complete(w)&&w.caches.cacheCrystal&&w.heroes.every(h=>h.hp===5),'Mercy did not restore actual missing health');
    assert(!S.enterSite(w,'cacheCrystal'),'Heal cache was repeatable');const copy=S.restore(S.checkpoint(w));
    assert(copy.heroes.every(h=>h.hp===5)&&copy.caches.cacheCrystal&&!S.enterSite(copy,'cacheCrystal'),'Cache health/reward state lost on Continue');
  });
  test('mercy cache full-team healing also raises a downed partner',()=>{
    const w=fixture('cacheCrystal');w.enemies=[];w.hazards=[];w.rings[0]=true;const [h,o]=w.heroes;
    place(h,C.rooms.cacheCrystal.exit);h.hp=3;h.carry=true;w.ring.carrier=1;o.hp=0;o.down=true;
    assert(S.complete(w)&&w.heroes.every(h=>h.hp===5&&!h.down),'Full-team cache heal was overwritten by ordinary downed recovery');
  });
  test('Continue preserves wounded board and chamber checkpoint health',()=>{
    const w=S.create();S.board(w);w.heroes[0].hp=2.5;w.heroes[1].hp=4;
    const board=S.restore(JSON.parse(JSON.stringify(S.checkpoint(w))));assert(board.heroes[0].hp===2.5&&board.heroes[1].hp===4,'Continue freely healed a board checkpoint');
    S.enterSite(w,'dungeon');w.heroes[0].hp=3.5;const chamber=S.restore(JSON.parse(JSON.stringify(S.checkpoint(w))));
    assert(chamber.heroes[0].hp===3.5&&chamber.heroes[1].hp===4,'Continue freely healed an active chamber checkpoint');
  });
  test('malformed checkpoint health is rejected with older-save compatibility',()=>{
    const save=S.checkpoint(S.create());for(const health of [null,[],[5],[0,5],[-1,5],[6,5],[NaN,5],['4',5]])assert(S.restore({...save,health})===null,'Malformed health accepted');
    const older={...save};delete older.health;assert(S.restore(older)?.heroes.every(h=>h.hp===5),'Older checkpoint without optional health rejected');
  });
  test('optional cache reward is immediate, single-use and persistent',()=>{
    const w=S.create();ordinaryToBoard(w);S.intent(w,0,{type:'route',value:'dungeon'});runRoom(w);runRoom(w);
    assert(S.intent(w,0,{type:'route',value:'cacheShift'}),'Cache unavailable after first ring');runRoom(w);
    assert(w.caches.cacheShift&&w.heroes.every(h=>h.ward===1),'Cache ward not awarded');assert(!S.enterSite(w,'cacheShift'),'Consumed cache was repeatable');
    const restored=S.restore(S.checkpoint(w));assert(restored.caches.cacheShift&&!S.enterSite(restored,'cacheShift'),'Continue duplicated reward');
  });
  test('final wipe atomically resets stations without consuming recovered rings',()=>{
    const run=ordinaryExpedition({record:false});assert(run.issues.length===0,'Fixture source run failed');const save=S.checkpoint(run.world);save.mode='room';save.roomId='final';save.site='final';save.roomIndex=0;
    const w=S.restore(save);assert(w&&w.rings.every(Boolean),'Final restore lost rings');w.transition=0;w.stations[0].active=true;w.stations[0].progress=1.1;w.bound=1;w.finalBeat='bind';
    for(const h of w.heroes){h.hurt=0;S.hurt(w,h,5);}advance(w,.02,[S.ZERO(),S.ZERO()]);assert(w.mode==='failed','Final wipe did not fail');S.retry(w);
    assert(w.rings.every(Boolean)&&w.stations.every(s=>!s.active&&s.progress===0)&&w.bound===0&&w.finalBeat==='watch','Final retry consumed rings or retained stations');
  });
  test('deterministic labeled streams isolate cosmetic randomness',()=>{
    const c=S.create({seed:'labeled'}),d=S.create({seed:'labeled'});const seq=[];for(let i=0;i<10;i++){seq.push(S.random(c,'director'));S.random(c,'cosmetic');}assert(seq.every(v=>v===S.random(d,'director')),'Cosmetics changed director RNG');
  });
  test('render snapshot round-trip preserves authoritative gameplay data',()=>{
    const w=S.create({seed:'snapshot'});S.intent(w,0,{type:'courtyardContinue'});S.intent(w,0,{type:'route',value:'dungeon'});advance(w,1);
    const s=S.snapshot(w),copy=S.applySnapshot(null,JSON.parse(JSON.stringify(s)));
    assert(copy.roomId===w.roomId&&copy.dread===w.dread&&copy.epoch===w.epoch&&copy.heroes[0].hp===w.heroes[0].hp,'Round-trip lost authoritative state');
    const old={...s,e:s.e-1,k:s.k-1};assert(S.applySnapshot(copy,old)===copy&&copy.epoch===s.e,'Stale room snapshot applied');
  });
  test('snapshot sends tuning deviations and applies defaults on reset',()=>{
    const w=fixture();assert(Object.keys(S.snapshot(w).u).length===0,'Default tuning needlessly fills each snapshot');
    S.setTuning(w,'heroSpeed',90);const changed=S.snapshot(w);assert(changed.u.heroSpeed===90&&Object.keys(changed.u).length===1,'Snapshot lost tuning deviation');
    let copy=S.applySnapshot(null,changed);assert(copy.tuning.heroSpeed===90&&copy.tuning.reviveTime===C.tuning.reviveTime.value,'Client defaults or change missing');
    S.debug(w,'reset');copy=S.applySnapshot(copy,S.snapshot(w));assert(copy.tuning.heroSpeed===C.tuning.heroSpeed.value,'Remote reset retained stale override');
  });
  test('host-created hazard geometry and state replicate to clients',()=>{
    const w=fixture('dungeon2');S.debug(w,'hazard');advance(w,.05,[S.ZERO(),S.ZERO()]);const extra=w.hazards.at(-1),packet=S.snapshot(w);
    assert(packet.hx.length===1&&w.assisted,'Dynamic hazard definition not serialized');
    const copy=S.applySnapshot(null,JSON.parse(JSON.stringify(packet))),remote=copy.hazards.at(-1);
    assert(copy.hazards.length===w.hazards.length&&['id','x','y','w','h','period','offset','duration','phase'].every(k=>remote[k]===extra[k]),'Client hazard differs from damaging host geometry/state');
    assert(Math.abs(remote.progress-extra.progress)<=.051,'Remote hazard lost active telegraph progress');
  });
  test('director respects finite budget and logs choice reason',()=>{
    const w=fixture('dungeon2');w.heroes.forEach(h=>place(h,C.at(3,15)));w.enemies=[];advance(w,110,[S.ZERO(),S.ZERO()]);
    assert(w.director.budget>=0&&w.director.count<=2,'Unbounded director budget');const events=w.events.filter(e=>e.type==='director');assert(events.length===0||events.every(e=>e.event&&e.reason),'Director choice/reason missing');
  });
  test('Ringmaster shift event telegraphs then moves an authored partition',()=>{
    const w=fixture('shifting1');w.enemies=[];advance(w,14.02,[S.ZERO(),S.ZERO()]);
    const chosen=w.events.find(e=>e.type==='director'&&e.event==='shift');assert(chosen,'Fixture seed failed to choose shift event');
    const previous=w.shift;assert(w.shiftWarning,'Ringmaster shift warning disappeared before its telegraph elapsed');
    advance(w,w.tuning.telegraph+.2,[S.ZERO(),S.ZERO()]);assert(w.shift!==previous,'Ringmaster spent budget without moving a partition');
  });
  if(options.pairs!==false){
    const ids=Object.keys(C.heroes);for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++)test('ordinary full expedition viable '+ids[i]+' + '+ids[j],()=>{
      const run=ordinaryExpedition({classes:[ids[i],ids[j]],seed:'pair-'+ids[i]+'-'+ids[j],record:false});
      const result={classes:[ids[i],ids[j]],status:run.evidence.status,seconds:run.evidence.simulationSeconds,stats:run.evidence.stats,issues:run.issues};ordinaryResults.push(result);
      assert(!run.issues.length,run.issues.join('; '));
    });
  }
  const report={count:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results,ordinaryClassPairs:ordinaryResults,fixtureNotice:'Rule fixtures intentionally set positions/status to isolate mechanics; only ordinaryClassPairs and playthrough.json count as ordinary action evidence.'};
  fs.writeFileSync(path.join(ROOT,'evidence/simulation.json'),JSON.stringify(report,null,2));
  return results;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const results=runSimulationTests();for(const r of results)if(!r.pass)console.error('FAIL '+r.name+'\n'+r.errors.join('\n'));
  console.log(`${results.filter(r=>r.pass).length} passed, ${results.filter(r=>!r.pass).length} failed`);process.exitCode=results.some(r=>!r.pass)?1:0;
}
