const ELEMENT = {physical:'#eed6ad',fire:'#ffad61',frost:'#9bdff0',lightning:'#bbb0ff',poison:'#b8d17e',void:'#a1a1ca'};
function fx(w,verb,p={}) { const f={id:w.uid++,verb,t:0,life:p.life||.5,...p};w.fx.push(f);event(w,'fx',{verb,p});return f; }
function addHazard(w,a){w.hazards.push(a);const p={...a,src:a.src?.id};event(w,'hazard',{p});return a;}
function addNumber(w,u,n,color=IVORY){
  const old=w.numbers.find(f=>f.owner===u.id&&f.t<.12&&f.color===color);
  if(old){old.n+=n;old.t=0;return;}w.numbers.push({owner:u.id,x:u.x,y:u.y,z:u.z+32,n,t:0,color});
}
function heal(w,h,amount){if(!h.alive)return;h.hp=Math.min(h.maxHp,h.hp+amount);event(w,'heal',{id:h.id,amount});}
function dealDamage(w,u,hit) {
  if(!w.authority||!u.alive||u.spawn>.1)return 0;
  const src=hit.src, isHero=u.team==='hero';
  if(isHero&&(u.inv>0||u.dodge>.06||w.cheats.god||CHEATS.god&&w===W||attract&&w===W))return 0;
  let amount=hit.amount||0,crit=false;
  if(src?.team==='hero') {
    crit=w.rng()<(.06+stat(src,'crit')*.01+(src.kind==='cantor'&&hasVow(src,2)&&src.still>.5?.25:0)+(src.kind==='lamplighter'&&hasVow(src,0)&&src.nerve>=29?.15:0));
    if(crit)amount*=1.5+stat(src,'critDamage')*.01;
    const p=powers(src);src.hits++;
    if(p.has('ninthHit')&&src.hits%9===0){amount*=5;fx(w,'ring',{x:u.x,y:u.y,r:50,color:GOLD,life:.7});}
    if(u.lit>0||w.heroes.some(h=>h.kind==='lamplighter'&&h.alive&&dist(h,u)<lanternRadius(h)))amount*=1.15;
    if(hit.toll&&u.ringing){amount*=1+.4*u.ringing;u.ringing=0;fx(w,'ring',{x:u.x,y:u.y,r:38,color:GOLD});}
    if(w.cheats.oneHit||CHEATS.oneHit&&w===W)amount=u.maxHp*2;
    if(src.buffs.power>0||src.greatPeal>0)amount*=src.buffs.power>0?2:1.3;
    if(src.ambush){amount*=src.ambush;src.ambush=0;}
    if(u.reflect>0&&!hit.reflected)dealDamage(w,src,{amount:amount*.1,src:u,reflected:true});
    src.stats.damage+=Math.min(amount,u.hp);if(u.boss&&DB.boss[u.kind].warden)src.stats.warden+=Math.min(amount,u.hp);
    if(stat(src,'lifeHit'))heal(w,src,stat(src,'lifeHit'));
  }
  if(isHero) {
    amount*=1/(1+stat(u,'armor')/90+stat(u,'resist')/140+(u.kind==='sexton'&&hasVow(u,0)?w.allies.filter(a=>a.owner===u.id).length*.05:0));
    if(hit.stun&&!(u.guard>0&&u.guardImmune))u.stun=Math.max(u.stun,hit.stun*(u.kind==='ringer'&&hasVow(u,1)?.6:1));
    if(u.guard>0)amount*=.5;if(u.buffs.shield>0)amount=0;
    if(u.shield>0){const take=Math.min(u.shield,amount);u.shield-=take;amount-=take;}
    if(u.guard>0&&u.guardReflect&&src?.alive&&!hit.reflected)dealDamage(w,src,{src:u,amount:amount*.5,reflected:true});
    if(u.guard>0&&u.guardRing&&src)src.ringing=Math.min(3,(src.ringing||0)+1);
    u.combat=5;
  }
  if(u.shieldT>0)amount*=.4;
  amount=Math.max(0,Math.round(amount));u.hp-=amount;u.flash=.16;u.hurt=.2;
  if(isHero){u.inv=.12;u.resource=Math.min(u.resourceMax,u.resource+(u.kind==='ringer'?3:0));}
  else {
    if(hit.ring)u.ringing=Math.min((src&&powers(src).has('ringMax')||src&&setCount(src)>=4)?6:3,u.ringing+hit.ring);
    if(hit.slow)u.slow=Math.max(u.slow,2.5);
    if(hit.burn){u.burn=3;u.burnPower=amount*.16;u.burnSrc=src;}
    if(hit.lit)u.lit=5;
    if(hit.stun)u.stun=Math.max(u.stun,hit.stun*(u.boss?.17:1));
    const force=(hit.kb??45)*TUNE.launch/(u.boss?6:u.elite?2:1),a=hit.ang??(src?angle(src,u):0);
    u.vx+=Math.cos(a)*force;u.vy+=Math.sin(a)*force;u.knock=.16;
  }
  if(amount)addNumber(w,u,amount,isHero?'#ff9c91':crit?'#ffe2a1':IVORY);
  event(w,'hit',{id:u.id,x:u.x,y:u.y,z:u.z,amount,crit,hero:isHero,angle:hit.ang||0,element:hit.element||'physical',source:src?.id});
  if(u.boss&&u.kind==='angelus'&&w.zone==='chamber'&&u.hp<=1&&!w.finishStrike){u.hp=1;u.stun=999;w.angelusKneeling=true;const o=w.objects.find(o=>o.type==='tongue');if(o){o.x=u.x;o.y=u.y+20;}event(w,'notice',{text:'HOLD INTERACT • STRIKE WITH THE TONGUE'});return amount;}
  if(amount>0&&src?.team==='hero'&&!hit.noProc&&stat(src,'area')>0&&w.rng()<.2)radialHit(w,src,u.x,u.y,30,amount*stat(src,'area')*.01,{noProc:true,skipId:u.id,kb:0,element:hit.element});
  if(u.hp<=0) {
    if(isHero){
      const p=powers(u),save=p.has('resurrect')&&u.pennies>=1000;
      const vow=u.level>=8&&hasVow(u,3)&&u.dieSave<=0;
      if(save||vow){if(save)u.pennies-=1000;u.hp=1;u.inv=3;u.dieSave=120;event(w,'refuseDeath',{id:u.id});return amount;}
      u.hp=0;u.alive=false;u.stats.deaths++;u.deathTimer=w.session?6:3+Math.min(15,u.stats.deaths*3);u.attack=null;
      if(w.greater)w.vigilClock=Math.max(0,w.vigilClock-10);event(w,'heroDeath',{id:u.id});
    } else if(u.team==='ally'){u.alive=false;u.life=0;}else killFoe(w,u,hit);
  }
  return amount;
}
function killFoe(w,u,hit={}) {
  if(!u.alive)return;u.alive=false;u.hp=0;w.kills++;w.killsZone++;w.requiem=w.requiemT>0?w.requiem+1:1;w.requiemT=TUNE.requiem;w.bestRequiem=Math.max(w.bestRequiem,w.requiem);
  const src=hit.src||w.heroes[0];if(src?.stats){src.stats.kills++;src.stats.reckoning+=u.elite?5:1;}
  const body=new E.Body({x:u.x,y:u.y,z:3,r:u.r,friction:2.3,bounce:.4});const a=hit.ang??(src?angle(src,u):0),force=(u.boss?110:100+Math.min(120,(hit.amount||15)*2))*TUNE.launch;
  Object.assign(body,{id:u.id,kind:u.kind,boss:u.boss,team:'foe',facing:u.facing,death:DB.monster[u.kind]?.death||'fling',age:0,roll:0,used:false,color:u.color});body.push(Math.cos(a)*force,Math.sin(a)*force,140*TUNE.launch);w.corpses.push(body);
  w.decals.push({x:u.x,y:u.y,r:5+w.rng()*7,kind:'blood',seed:u.id});
  if(u.elite||u.boss||w.lootRng()<TUNE.votiveChance)w.drops.push({id:w.uid++,type:'votive',x:u.x+6,y:u.y,z:6,owner:null});
  w.drops.push({id:w.uid++,type:'penny',x:u.x,y:u.y,z:2,amount:Math.round((3+w.lootRng()*8)*(u.elite?8:1)*TUNE.pennies*(1+(src?stat(src,'pennies'):0)*.01)),owner:null});
  const xp=6*Math.pow(1.18,u.level-1)*(u.boss?32:u.elite==='rare'?8:u.elite?4:1)*DIFFICULTIES[w.difficulty].reward;
  for(const h of w.heroes){gainXP(w,h,xp);if(u.boss||u.elite||w.lootRng()<.07*TUNE.drops)dropItem(w,h,u.x+(h.id%4)*5,u.y,{rarity:u.boss?4:u.elite?2:undefined});}
  if(w.zone==='prologue'&&w.killsZone===2)for(const h of w.heroes)dropItem(w,h,u.x,u.y,{rarity:2,slot:0});
  if(w.zone==='acre'&&w.killsZone===15)for(const h of w.heroes)dropItem(w,h,u.x,u.y,{rarity:3,slot:1});
  if(u.kind==='crab'){for(let i=0;i<12;i++)w.drops.push({id:w.uid++,type:'penny',x:u.x+(w.lootRng()-.5)*60,y:u.y+(w.lootRng()-.5)*60,amount:40,owner:null});for(const h of w.heroes)dropItem(w,h,u.x,u.y,{rarity:4});}
  if(hit.explode)radialHit(w,src,u.x,u.y,35,(hit.amount||10)*.6,{element:'fire',noProc:true});
  if(w.zone==='vigil'&&!u.boss){w.reckoning=Math.min(100,w.reckoning+(u.elite==='rare'?8:u.elite?5:1)*TUNE.vigilFill);if(w.reckoning>=100&&!w.bossId){const main=getMain(w);const b=spawnFoe(w,choose(w.rng,['pall','coldverger','tithe']),main.x+90,main.y-45,{boss:true});w.bossId=b.id;event(w,'warden',{id:b.id});}}
  if(u.boss) {
    w.bossDefeated=true;for(const h of w.heroes)if(!h.follower)h.gems.push([Math.floor(w.lootRng()*3),Math.min(3,1+Math.floor(h.level/10))]);
    if(DB.boss[u.kind].warden){w.ended=true;w.results={time:w.zoneTime,kills:w.killsZone,deaths:w.heroes.reduce((s,h)=>s+h.stats.deaths,0),tier:w.tier,won:!w.greater||w.vigilClock>0};for(const h of w.heroes){w.records[h.kind]=Math.max(w.records[h.kind]||0,w.results.won?w.tier:0);}}
    if(u.kind==='beadle')w.flags.push('tongueTaken');if(u.kind==='regent')w.flags.push('quillonConfessed');
    event(w,'bossDeath',{id:u.id,kind:u.kind});
  }
  event(w,'kill',{id:u.id,source:src?.id,x:u.x,y:u.y,angle:a,force,kind:u.kind,elite:u.elite,boss:u.boss});
}
function radialHit(w,h,x,y,r,amount,extra={}) {let n=0;for(const u of [...w.foes])if(u.alive&&(!extra.skipBoss||!u.boss)&&u.id!==extra.skipId&&Math.hypot(u.x-x,u.y-y)<r+u.r){n++;dealDamage(w,u,{src:h,amount,ang:Math.atan2(u.y-y,u.x-x),...extra});}for(const p of w.props)if(p.breakable&&!p.broken&&Math.hypot(p.x-x,p.y-y)<r)breakProp(w,p,h);return n;}
function breakProp(w,p,h) {if(p.broken)return;p.broken=true;w.broken++;if(h?.stats)h.stats.broken++;w.sacrilege=w.sacrilegeT>0?w.sacrilege+1:1;w.sacrilegeT=3;w.drops.push({id:w.uid++,type:'penny',x:p.x,y:p.y,amount:Math.round(2*TUNE.pennies*(1+(h?stat(h,'pennies'):0)*.01)),owner:null});event(w,'break',{x:p.x,y:p.y,type:p.type});}
function lanternRadius(h){return 60*(powers(h).has('lanternRadius')?2:1)*(h.level>=8&&hasVow(h,2)?1.3:1);}
function tunedSkill(h,id) {
  const base=DB.skill[id];if(!base)return null;
  const tone=(h.level>=base.unlock+2||h.unlockedAll)?base.tones[h.tones[id]||0]:{};
  const s={...base,...tone,toneName:tone.name||'Untoned',name:base.name};
  s.dmg=base.dmg*(tone.mul||1);s.range=base.range*(tone.rangeMul||1);s.radius=base.radius*(tone.radiusMul||1);s.cost=base.cost*(tone.costMul||1)*(1-Math.min(.6,stat(h,'economy')*.01));s.cd=base.cd*(tone.cdMul||1);s.speed=tone.speed||1;
  const p=powers(h);
  if(id==='knell'&&p.has('knellWave'))s.wave=1;
  if(id==='rope'&&p.has('ropeRing'))s.ring=1;
  if(id==='leap'&&p.has('leapBell'))s.extraBell=1;
  if(id==='hide'&&p.has('hideThorns'))s.reflect=1;
  if(id==='psalm'&&p.has('chordBolts')&&h.chord)s.triple=1;
  if(id==='candle'&&p.has('candleTriple'))s.triple=1;
  if(id==='note'&&p.has('noteWide'))s.radius*=2;
  if(s.element==='frost'&&p.has('frostEcho'))s.mulEcho=1;
  if(id==='bolt'&&p.has('boltSplit'))s.triple=1;
  if(id==='dawn'&&p.has('dawnShort'))s.cd*=.5;
  if(id==='grave'&&p.has('gravePull'))s.radius*=2;
  if(id==='rites'&&p.has('ritesParty'))s.party=1;
  return s;
}
function castSkill(w,h,slot,aim,force=false) {
  if(!h.alive||h.stun>0||h.dodge>0)return false;
  const sid=typeof slot==='string'?slot:h.slots[slot],s=tunedSkill(h,sid);if(!s)return false;
  if(!force&&s.unlock>h.level&&!h.unlockedAll)return false;
  const returning=s.return&&h.returnNote&&h.returnNote.until>w.time;
  if(!force&&((h.cooldowns[sid]>0&&!returning)||h.attack)) {if(h.attack&&h.attack.elapsed>.04)h.queued={slot,aim};return false;}
  if(h.silenced&&sid!==h.slots[0])return false;
  const corpses=w.corpses.filter(c=>!c.used&&dist(c,h)<80);
  if(s.verb==='corpse'&&!corpses.length&&!force)return false;
  let cost=s.cost;if(s.verb==='summon'&&corpses.length&&(sid==='raise'||powers(h).has('freeRaise')))cost=0;
  if(h.chord)cost=0;
  const nerve=h.kind==='lamplighter'&&['trap','vault','smoke'].includes(sid);
  if(!force&&(nerve?h.nerve:h.resource)<cost&&!w.cheats.infinite&&!(CHEATS.infinite&&w===W)&&!attract)return false;
  if(!w.cheats.infinite&&!(CHEATS.infinite&&w===W)){if(nerve)h.nerve=Math.max(0,h.nerve-cost);else h.resource=Math.max(0,h.resource-cost);}
  if(h.level>=8&&hasVow(h,0)&&h.kind==='ringer')heal(w,h,cost*.12);
  const point=aim||{x:h.x+Math.cos(h.facing)*s.range*.7,y:h.y+Math.sin(h.facing)*s.range*.7};
  const a=angle(h,point);h.facing=a;h.combat=5;
  const attackRate=TUNE.attackSpeed*s.speed*(1+stat(h,'haste')*.01)*(h.buffs.haste>0?1.5:1);
  h.cooldowns[sid]=(w.cheats.noCD||CHEATS.noCD&&w===W||attract)?0:s.cd*TUNE.cooldowns*(1-Math.min(.6,stat(h,'cooldown')*.01))/(sid===DB.hero[h.kind].skills[0]?attackRate:1);
  if(sid==='clap')h.combo=(h.combo+1)%3;
  const wind=s.wind/attackRate;
  h.attack={sid,s,aim:{x:point.x,y:point.y},a,elapsed:0,wind,total:wind+(s.verb==='beam'?s.duration:Math.max(.16,(sid===h.slots[0]?.28:.4)/attackRate)),struck:false,tick:0,combo:(h.combo+2)%3};
  if(h.kind==='cantor'){
    const note=s.element||(['psalm','frost','ward'].includes(sid)?'frost':'lightning');
    if(h.chord){h.attack.s={...s,dmg:s.dmg*(hasVow(h,0)&&h.level>=8?2:1.6)};h.chord=false;h.notes=[];}
    if(!h.notes.includes(note))h.notes.push(note);else h.notes=[note];
    if(h.notes.length>=(powers(h).has('twoNotes')||setCount(h)>=4?2:3)){h.chord=true;event(w,'chord',{id:h.id});}
  }
  event(w,'cast',{id:h.id,sid,x:h.x,y:h.y,aim:point,element:s.element});return true;
}
function executeSkill(w,h,a) {
  const s=a.s,point=a.aim,ang=a.a,color=ELEMENT[s.element||'physical'],damage=damageBase(h)*s.dmg*TUNE.damage*(h.combo===0&&s.combo?1.45:1);
  const extra={chain:s.chain,ring:s.ring||(h.kind==='ringer'&&s.id!=='clap'&&s.verb!=='guard'?1:0),burn:s.burn,slow:s.slow,stun:s.stun,lit:s.lit,toll:s.toll,explode:s.explode,element:s.element||'physical',kb:s.verb==='bell'?180:70};
  h.resource=Math.min(h.resourceMax,h.resource+(s.gain||0)*TUNE.resource);
  if(s.pull)for(const f of w.foes)if(f.alive&&Math.hypot(f.x-point.x,f.y-point.y)<s.pull){const an=angle(f,s.verb==='spin'?h:point);f.vx=Math.cos(an)*140;f.vy=Math.sin(an)*140;f.knock=.25;}
  let n=0;
  if(s.verb==='cone'&&!s.bolt){
    for(const u of [...w.foes])if(u.alive&&dist(h,u)<s.range+u.r&&Math.abs(adiff(angle(h,u),ang))<1.1*(s.radius/28)){n++;dealDamage(w,u,{src:h,amount:damage,ang,...extra});}
    for(const o of w.objects)if(o.type==='trap'&&!o.used&&dist(h,o)<s.range+8&&Math.abs(adiff(angle(h,o),ang))<1.3)interactNearest(w,h,o);
    for(const p of w.props)if(p.breakable&&!p.broken&&dist(h,p)<s.range+7&&Math.abs(adiff(angle(h,p),ang))<1.3)breakProp(w,p,h);
    fx(w,'cone',{x:h.x,y:h.y,a:ang,r:s.range,color,life:.25});
    if(s.wave&&(!s.combo||h.combo===0))makeShot(w,h,ang,damage*.65,{range:100,r:16,color,...extra,pierce:30});
  }else if(s.verb==='bolt'||s.bolt||s.verb==='wave') {
    if(s.nova)n=radialHit(w,h,h.x,h.y,s.range,damage,extra);
    else for(let i=0;i<(s.triple?3:1);i++)makeShot(w,h,ang+(s.triple?(i-1)*.19:0),damage,{range:s.range,r:s.verb==='wave'?s.radius:5,color,pierce:s.verb==='wave'?99:s.pierce||0,chain:s.chain,...extra});
    fx(w,'cast',{x:h.x,y:h.y,z:18,color,life:.3});
  }else if(['nova','spin'].includes(s.verb)) {
    n=radialHit(w,h,h.x,h.y,s.radius,damage,extra);fx(w,'ring',{x:h.x,y:h.y,r:s.radius,color,life:.55});
  }else if(['leap','charge','blink'].includes(s.verb)) {
    let d=Math.min(s.range,dist(h,point)),x=h.x+Math.cos(ang)*d,y=h.y+Math.sin(ang)*d;
    if(!w.map.standable(x,y,0,6)){for(;d>0;d-=8){x=h.x+Math.cos(ang)*d;y=h.y+Math.sin(ang)*d;if(w.map.standable(x,y,0,6))break;}}
    const old={x:h.x,y:h.y};h.inv=Math.max(.6,typeof s.immune==='number'?s.immune:0);h.travelAnim=.4;h.travelFrom=old;
    if(s.return&&h.returnNote&&h.returnNote.until>w.time){[x,y]=[h.returnNote.x,h.returnNote.y];h.returnNote=null;}else if(s.return)h.returnNote={...old,until:w.time+3};
    if(s.verb==='charge'){for(let i=1;i<=5;i++)n+=radialHit(w,h,lerp(old.x,x,i/5),lerp(old.y,y,i/5),s.radius,damage*.4,extra);}
    h.x=x;h.y=y;if(damage||s.stun)n+=radialHit(w,h,x,y,s.radius,damage,extra);
    fx(w,s.verb==='blink'?'blink':'leap',{x,y,from:old,r:s.radius,color,life:.6});
    if(s.extraBell)radialHit(w,h,x,y,55,damage*.7,extra);
    if(sidIs(s,'vault')&&powers(h).has('vaultFire'))makePool(w,h,x,y,45,damage*.2,60,{...extra,lit:1,color:'#e9af59'});
  }else if(s.verb==='chain') {
    let from=h,used=new Set();for(let i=0;i<(s.chain||5);i++){const t=closest(w.foes,from,i===0?s.range:90,u=>u.alive&&!used.has(u.id));if(!t)break;used.add(t.id);fx(w,'chain',{x:from.x,y:from.y,z:20,to:{x:t.x,y:t.y,z:17},color,life:.25});dealDamage(w,t,{src:h,amount:damage,...extra});from=t;n++;}
  }else if(['bell','lob','area'].includes(s.verb)) {
    const d=Math.min(s.range||s.radius,dist(h,point)),p={x:h.x+Math.cos(ang)*d,y:h.y+Math.sin(ang)*d};
    const count=s.triple?3:1;for(let i=0;i<count;i++){
      const tx=p.x+(i-((count-1)/2))*s.radius*.9,ty=p.y;
      addHazard(w,{id:w.uid++,shape:s.verb==='bell'?'bell':s.verb==='lob'?'candle':'disc',x:tx,y:ty,r:s.radius,delay:s.delay||.4,t:0,life:s.delay||.4,team:'hero',src:h,damage,extra,color,pool:s.pool||0,lit:s.lit,follow:s.follow});
    }
  }else if(s.verb==='buff'){
    for(const u of w.heroes){u.greatPeal=s.duration;u.buffRegen=s.regen?3:0;u.buffHaste=!!s.haste;}
    if(s.fear)for(const f of w.foes)if(dist(h,f)<110)f.fear=s.fear;
    fx(w,'ring',{x:h.x,y:h.y,r:100,color:GOLD,life:1});
  }else if(s.verb==='guard') {
    h.guard=s.duration;h.guardReflect=s.reflect;h.guardRing=s.ring;h.guardImmune=s.immune;h.guardRegen=s.regen;h.shield=h.maxHp*(s.shield||0);h.ambush=s.ambush||0;h.stealth=s.stealth?s.duration:0;
    if(s.stun)for(const f of w.foes)if(dist(h,f)<s.radius)f.stun=s.stun;
    if(s.fear)for(const f of w.foes)if(dist(h,f)<90)f.fear=s.fear;
    fx(w,'guard',{x:h.x,y:h.y,r:25,color,life:s.duration,owner:h.id});
  }else if(s.verb==='summon') {
    const nearby=w.corpses.filter(c=>!c.used&&dist(h,c)<s.range+30),count=s.count||1;
    const max=s.count?10:s.giant?1:(hasVow(h,2)&&h.level>=8?5:4);
    for(let i=0;i<count;i++){
      const mine=w.allies.filter(a=>a.owner===h.id);if(mine.length>=max)w.allies.splice(w.allies.indexOf(mine[0]),1);
      const c=nearby[i];if(c)c.used=true;const p=c||{x:point.x+(w.rng()-.5)*35,y:point.y+(w.rng()-.5)*35};
      addAlly(w,{id:w.uid++,owner:h.id,x:p.x,y:p.y,z:0,facing:0,vx:0,vy:0,r:5,life:s.duration||30,atk:0,alive:true,giant:!!s.giant,ranged:!!s.ranged,taunt:!!s.taunt,explode:s.explode,haste:s.haste,damage:damage*(s.giant?3:1)*(powers(h).has('bigBuried')?2:1)});
      fx(w,'rise',{x:p.x,y:p.y,r:15,color:'#a2b982',life:1});
    }
  }else if(s.verb==='corpse') {
    const bodies=w.corpses.filter(c=>!c.used&&Math.hypot(c.x-point.x,c.y-point.y)<80).slice(0,5);
    for(const c of bodies){if(!powers(h).has('keepCorpse')||w.rng()>.5)c.used=true;n+=radialHit(w,h,c.x,c.y,s.radius,damage,extra);fx(w,'nova',{x:c.x,y:c.y,r:s.radius,color:'#becd92'});if(s.chain)radialHit(w,h,c.x,c.y,s.radius+45,damage*.4,extra);if(s.pool)makePool(w,h,c.x,c.y,s.radius,damage,s.pool,{...extra,color});}
  }else if(s.verb==='heal') {
    const bodies=w.corpses.filter(c=>!c.used&&dist(c,h)<s.radius);for(const c of bodies)c.used=true;
    for(const u of s.party?w.heroes:[h]){heal(w,u,u.maxHp*Math.max(.12,bodies.length*.06));u.shield+=u.maxHp*(s.shield||0);u.guard=3;}
    if(s.resource)h.resource=Math.min(h.resourceMax,h.resource+s.resource);
    fx(w,'ring',{x:h.x,y:h.y,r:s.radius,color:'#afd79f',life:1});
  }
  if(s.pool&&!['bell','lob','area','corpse'].includes(s.verb))makePool(w,h,s.verb==='spin'?h.x:point.x,s.verb==='spin'?h.y:point.y,s.radius||30,damage*.3,s.pool,{...extra,color});
  if(s.leech&&n)heal(w,h,h.maxHp*s.leech*n);
  if(s.refund&&n>=5){h.cooldowns[s.id]*=.5;h.resource=Math.min(h.resourceMax,h.resource+s.refund);}
  if(s.summon)addAlly(w,{id:w.uid++,owner:h.id,x:point.x,y:point.y,z:0,facing:0,r:5,life:12,atk:0,alive:true,damage:damage*.4});
  if(s.mulEcho)radialHit(w,h,point.x,point.y,s.radius||25,damage*.5,extra);
  if(n>=5)event(w,'rung',{count:n,x:h.x,y:h.y});
  return n;
}
function addAlly(w,spec){const h=w.heroes.find(h=>h.id===spec.owner);const a={team:'ally',hp:(h?.maxHp||200)*.4,maxHp:(h?.maxHp||200)*.4,stun:0,ringing:0,slow:0,...spec};w.allies.push(a);const {id,owner,x,y,z,r,life,giant,ranged,taunt}=a;event(w,'allySpawn',{p:{id,owner,x,y,z,r,life,giant,ranged,taunt}});return a;}
function sidIs(s,id){return s.id===id;}
function makePool(w,h,x,y,r,damage,duration,extra={}){const perm=h&&h.kind==='lamplighter'&&powers(h).has('lastingLight')&&extra.lit;addHazard(w,{id:w.uid++,shape:'pool',x,y,r,delay:0,t:0,life:perm?600:duration,tick:0,team:h?.team||'foe',src:h,damage:damage/Math.max(1,duration*2),extra,color:extra.color||ELEMENT[extra.element||'fire'],lit:extra.lit,follow:extra.follow});}
function makeShot(w,h,a,damage,o={}){w.shots.push({id:w.uid++,x:h.x,y:h.y,z:17,vx:Math.cos(a)*(o.speed||300),vy:Math.sin(a)*(o.speed||300),a,team:h.team,src:h.source||h,damage,life:(o.range||140)/(o.speed||300),r:o.r||4,pierce:o.pierce||0,hit:[],color:o.color||GOLD,extra:o});}
function evade(w,h,dir){if(h.evades<1||h.dodge>0||!h.alive)return false;const n=dir&&Math.hypot(...dir)>.1?norm(...dir):[Math.cos(h.facing),Math.sin(h.facing)];h.evades--;h.dodge=.28;h.inv=.22;h.dodgeDir=n;h.attack=null;event(w,'evade',{id:h.id,x:h.x,y:h.y});if(powers(h).has('echoNova'))radialHit(w,h,h.x,h.y,55,damageBase(h)*2,{element:'physical'});return true;}
function usePotion(w,h){if(h.potion>0||!h.alive)return false;h.potion=TUNE.potionCD;h.healOver=.5;h.healRate=h.maxHp*1.2;if(h.kind==='lamplighter'&&hasVow(h,1)&&h.level>=8)h.resource=h.resourceMax;event(w,'potion',{id:h.id});return true;}
