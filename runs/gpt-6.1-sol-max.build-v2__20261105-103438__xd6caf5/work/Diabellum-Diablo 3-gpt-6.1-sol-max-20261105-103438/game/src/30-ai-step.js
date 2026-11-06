function enemyDamage(w,f){return 4*Math.pow(1.13,f.level-1)*(DB.monster[f.kind]?.dmg||2)*TUNE.foeDamage*DIFFICULTIES[w.difficulty].damage*(1+.15*Math.max(0,w.heroes.filter(h=>!h.follower).length-1))*(w.zone==='vigil'?Math.pow(1.17,w.tier-1):1);}
function hazard(w,f,shape,x,y,r,delay,extra={}) {
  const a={id:w.uid++,shape,x,y,r,delay:delay*TUNE.telegraph,t:0,life:delay*TUNE.telegraph,team:'foe',src:f,damage:enemyDamage(w,f),color:'#e77c65',extra:{},...extra};addHazard(w,a);return a;
}
function bossPattern(w,f,target) {
  const b=DB.boss[f.kind],phase=b.phases[f.phase],pat=phase.patterns[f.pattern++%phase.patterns.length],a=angle(f,target),d=enemyDamage(w,f);
  event(w,'pattern',{id:f.id,pattern:pat,phase:f.phase});
  if(pat==='ring'){hazard(w,f,'ring',f.x,f.y,240,1.1,{damage:d*1.4,life:3,expand:true,hit:[]});}
  else if(pat==='slam'||pat==='blink'){
    if(pat==='blink'){f.x=target.x+35;f.y=target.y-20;}
    hazard(w,f,'disc',target.x,target.y,55,.9,{damage:d*1.7});
  }else if(pat==='hook'||pat==='chains'){
    hazard(w,f,'line',f.x,f.y,210,.95,{a,width:pat==='hook'?13:25,pull:true,damage:d*1.1});
    if(pat==='chains')for(let i=0;i<3;i++)hazard(w,f,'disc',target.x+(w.rng()-.5)*100,target.y+(w.rng()-.5)*100,27,1.4);
  }else if(pat==='charge'){
    hazard(w,f,'line',f.x,f.y,190,.9,{a,width:24,damage:d*1.5,charge:true});
  }else if(pat==='cone'||pat==='dust'){
    hazard(w,f,'cone',f.x,f.y,165,1,{a,half:pat==='dust'?.7:1.4,damage:d*1.2});
  }else if(pat==='rain'){
    for(let i=0;i<7;i++)hazard(w,f,'candle',target.x+(w.rng()-.5)*160,target.y+(w.rng()-.5)*160,25,.9+i*.15,{damage:d*.8,pool:3});
  }else if(pat==='summon'||pat==='copies'){
    const pool=f.kind==='beadle'?['wight','digger']:f.kind==='regent'?['moths','priest']:['campanar','hushling'];
    for(let i=0;i<(pat==='copies'?2:4);i++)if(w.foes.filter(u=>u.alive).length<70)spawnFoe(w,choose(w.rng,pool),f.x+(w.rng()-.5)*120,f.y+(w.rng()-.5)*120);
  }else if(pat==='dark'){
    for(const o of w.objects)if(o.type==='brazier')o.active=false;
    w.darkness=8;hazard(w,f,'disc',target.x,target.y,70,1.2,{damage:d});
  }else if(pat==='hush'){
    w.hush=5;for(let i=0;i<3;i++)makePool(w,f,f.x+(w.rng()-.5)*200,f.y+(w.rng()-.5)*200,48,d,5,{element:'void',color:'#787997'});
  }
  f.attack={move:f.kind==='angelus'?'twohand':pat==='charge'?'bash':'cast',elapsed:0,wind:.9,total:1.4};
  if(f.pattern%3===1)event(w,'taunt',{speaker:b.name,text:b.taunts[Math.floor(w.rng()*b.taunts.length)]});
}
function updateFoe(w,f,dt) {
  if(!f.alive)return;const b=f.boss?DB.boss[f.kind]:DB.monster[f.kind];
  if(f.lifeTune!==TUNE.foeLife){const ratio=TUNE.foeLife/(f.lifeTune||TUNE.foeLife);f.hp*=ratio;f.maxHp*=ratio;f.lifeTune=TUNE.foeLife;}
  f.spawn=Math.max(0,f.spawn-dt);f.flash=Math.max(0,f.flash-dt);f.hurt=Math.max(0,(f.hurt||0)-dt);f.stun=Math.max(0,f.stun-dt);f.slow=Math.max(0,f.slow-dt);f.lit=Math.max(0,f.lit-dt);if(w.heroes.some(h=>h.kind==='lamplighter'&&setCount(h)>=4&&dist(h,f)<lanternRadius(h)))f.slow=.2;f.reflect=Math.max(0,f.reflect-dt);f.shieldT=Math.max(0,f.shieldT-dt);
  if(f.burn>0){f.burn-=dt;f.burnTick-=dt;if(f.burnTick<=0){f.burnTick=.5;dealDamage(w,f,{src:f.burnSrc,amount:f.burnPower,element:'fire',kb:0});}}
  if(f.attack){f.attack.elapsed+=dt;if(f.attack.elapsed>f.attack.total)f.attack=null;}
  if(!f.alive||f.spawn>.1)return;
  if(w.cheats.freezeAI||CHEATS.freezeAI&&w===W||f.stun>0){f.vx*=.92;f.vy*=.92;f.update(dt,w.map);return;}
  const target=closest([...w.heroes,...w.allies.filter(a=>a.taunt)],f,Infinity,h=>h.alive&&!(h.stealth>0));if(!target)return;
  const dd=dist(f,target);f.facing=angle(f,target);
  if(f.boss){
    const ph=b.phases.reduce((p,s,i)=>f.hp/f.maxHp<=s.at?i:p,0);
    if(ph!==f.phase){f.phase=ph;f.atk=1.1;event(w,'phase',{id:f.id,phase:ph});if(f.kind==='regent'&&ph===2){w.darkness=20;for(const o of w.objects)if(o.type==='brazier')o.active=false;}if(f.kind==='angelus'&&ph===2)w.hush=40;}
    if(w.angelusKneeling&&f.kind==='angelus'){f.vx=f.vy=0;return;}
    f.atk-=dt;if(f.atk<=0){bossPattern(w,f,target);f.atk=Math.max(1.6,3.6-f.phase*.55);}
    const speed=f.kind==='angelus'?5:18;
    if(dd>110&&!f.attack){f.vx=Math.cos(f.facing)*speed;f.vy=Math.sin(f.facing)*speed;}else f.vx=f.vy=0;
    f.update(dt,w.map);return;
  }
  if(dd>260){f.vx=f.vy=0;return;}
  f.atk-=dt;f.affixT-=dt;
  if(f.affixes.includes('hushed')||f.kind==='mute')for(const h of w.heroes)if(dist(f,h)<60)h.silenced=true;
  if(f.affixes.includes('chained')){const other=closest(w.foes,f,80,u=>u.alive&&u!==f);if(other)for(const h of w.heroes)if(dist(h,f)<30&&f.affixT<1)dealDamage(w,h,{src:f,amount:enemyDamage(w,f)*dt});}
  if(f.affixT<=0){f.affixT=6;for(const aff of f.affixes)applyAffix(w,f,aff,target);}
  let dir=w.flow.dir(f.x,f.y,target.x,target.y);if(!dir||!Number.isFinite(dir[0]))dir=norm(target.x-f.x,target.y-f.y);
  const speed=b.speed*TUNE.foeSpeed*(f.slow>0?.45:1);
  if(b.ai==='thief'){
    dir=norm(f.x-target.x,f.y-target.y);f.escape=(f.escape||0)+dt;
    if(f.escape>15){f.alive=false;event(w,'escape',{id:f.id});return;}
    if(f.atk<0){f.atk=.7;w.drops.push({id:w.uid++,type:'penny',x:f.x,y:f.y,amount:7,owner:null});}
  }else if(f.fear>0){f.fear-=dt;dir=norm(f.x-target.x,f.y-target.y);}
  else if(b.ai==='kiter'||b.ai==='support'||b.ai==='summoner'){
    if(dd<75)dir=norm(f.x-target.x,f.y-target.y);else if(dd<125)dir=[0,0];
    if(f.atk<=0){
      f.atk=b.ai==='summoner'?5:2.3;
      if(b.ai==='summoner'&&w.foes.filter(u=>u.alive).length<100)for(let i=0;i<2;i++)spawnFoe(w,'wight',f.x+12*i,f.y+10);
      else if(b.ai==='support'){for(const u of w.foes)if(u.alive&&dist(f,u)<100)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.04);hazard(w,f,'cone',f.x,f.y,100,.7,{a:f.facing,half:.55});}
      else hazard(w,f,'line',f.x,f.y,dd+20,.7,{a:f.facing,width:9,shot:true});
      f.attack={move:'cast',elapsed:0,wind:.7,total:1};
    }
  }else if(b.ai==='burrower'&&f.atk<=0&&dd<180){
    f.atk=4;f.x=target.x+(w.rng()-.5)*50;f.y=target.y+(w.rng()-.5)*50;hazard(w,f,'disc',f.x,f.y,32,.9);f.attack={move:'rising',elapsed:0,wind:.9,total:1.3};
  }else if(b.ai==='charger'&&f.atk<=0&&dd<150){f.atk=3.5;hazard(w,f,'line',f.x,f.y,150,.75,{a:f.facing,width:16,charge:true});f.attack={move:b.move,elapsed:0,wind:.75,total:1};}
  else if(b.ai==='exploder'&&dd<36&&f.atk<=0){f.atk=10;hazard(w,f,'disc',f.x,f.y,48,1.1,{selfDestruct:true,damage:enemyDamage(w,f)*1.8,pool:3,color:'#d0ba89',extra:{slow:true}});f.attack={move:'twohand',elapsed:0,wind:1.1,total:1.5};}
  else if(dd<23&&f.atk<=0){f.atk=1.3;hazard(w,f,'cone',f.x,f.y,27,b.wind,{a:f.facing,half:1});f.attack={move:b.move,elapsed:0,wind:b.wind,total:b.wind+.25};}
  if(f.knock>0){f.knock-=dt;f.vx*=.97;f.vy*=.97;}else if(f.attack){f.vx=f.vy=0;}else{f.vx=dir[0]*speed;f.vy=dir[1]*speed;}
  // A small separation impulse keeps bodies readable without preventing a crowded slam.
  f.update(dt,w.map);f.x=clamp(f.x,24,w.width-24);f.y=clamp(f.y,24,w.height-24);
}
function applyAffix(w,f,id,target){
  const p=DB.affix[id]?.pattern;event(w,'affix',{id:f.id,affix:id});
  if(p==='ring')hazard(w,f,'ring',f.x,f.y,110,.65,{life:2,expand:true,hit:[]});
  if(p==='wax'||p==='fire'||p==='frost')hazard(w,f,'disc',target.x,target.y,31,1.1,{pool:4,color:p==='frost'?'#9bc8df':'#d7a47c',extra:{slow:true}});
  if(p==='silence')makePool(w,f,f.x,f.y,65,0,5,{color:'#9290a9',element:'void'});
  if(p==='ghost')hazard(w,f,'disc',target.x,target.y,25,1.3,{damage:enemyDamage(w,f)*1.6});
  if(p==='stones')for(let i=0;i<8;i++){const a=i*Math.PI/4;w.props.push({id:w.uid++,type:'headstone',x:target.x+Math.cos(a)*36,y:target.y+Math.sin(a)*36,z:0,hp:12,breakable:true,broken:false,seed:i});}
  if(p==='shield')for(const u of w.foes)if(dist(f,u)<80)u.shieldT=3;
  if(p==='reflect')f.reflect=2;
  if(p==='blink'){fx(w,'blink',{x:f.x,y:f.y,r:25,color:'#c0acd5'});f.x=target.x+40;f.y=target.y;}
  if(p==='pull')hazard(w,f,'disc',f.x,f.y,100,1.2,{pull:true,damage:0});
  if(p==='tether')hazard(w,f,'line',f.x,f.y,120,.8,{a:angle(f,target),width:9});
}
function inHazard(h,u,rad){
  const d=dist(h,u),a=Math.abs(adiff(angle(h,u),h.a||0));
  if(h.shape==='line')return d<(h.r||120)&&a<Math.atan2((h.width||15)+u.r,Math.max(5,d));
  if(h.shape==='cone')return d<h.r+u.r&&a<(h.half||1);
  if(h.shape==='ring'&&h.expand)return Math.abs(d-rad)<12+u.r;
  return d<h.r+u.r;
}
function stepHazards(w,dt) {
  for(const a of [...w.hazards]){
    a.t+=dt;const targets=a.team==='hero'?w.foes:[...w.heroes,...w.allies];
    if(a.shape==='pool'){
      a.life-=dt;a.tick-=dt;if(a.follow&&a.src){a.x=a.src.x;a.y=a.src.y;}
      if(a.tick<=0){a.tick=.5;for(const u of targets)if(u.alive&&inHazard(a,u,0)){
        if(a.damage)dealDamage(w,u,{src:a.src,amount:a.damage,kb:0,...a.extra});if(a.lit)u.lit=1;
        if(a.extra.slow)u.slow=1;
        if(a.extra.element==='void'&&u.team==='hero')u.resource=Math.max(0,u.resource-8);
      }}
    }else if(a.expand&&a.t>=a.delay){
      const rad=(a.t-a.delay)/(a.life-a.delay)*a.r;
      for(const u of targets)if(u.alive&&!a.hit.includes(u.id)&&inHazard(a,u,rad)){a.hit.push(u.id);dealDamage(w,u,{src:a.src,amount:a.damage,kb:100,stun:.5});}
    }else if(a.t>=a.delay&&!a.done){
      a.done=true;let hits=0;
      for(const u of [...targets])if(u.alive&&inHazard(a,u,0)){
        hits++;dealDamage(w,u,{src:a.src,amount:a.damage,ang:angle(a,u),...a.extra});
        if(a.pull){u.x=lerp(u.x,a.x,.6);u.y=lerp(u.y,a.y,.6);}
      }
      if(a.extra.chain&&a.src){let from=a,used=new Set();for(let i=0;i<a.extra.chain;i++){const u=closest(w.foes,from,80,f=>f.alive&&!used.has(f.id));if(!u)break;used.add(u.id);fx(w,'chain',{x:from.x,y:from.y,z:18,to:{x:u.x,y:u.y,z:18},color:a.color,life:.3});dealDamage(w,u,{src:a.src,amount:a.damage*.5,...a.extra});from=u;}}
      if(a.team==='hero')for(const p of w.props)if(p.breakable&&!p.broken&&dist(a,p)<a.r)breakProp(w,p,a.src);
      fx(w,a.shape==='bell'?'bell':'nova',{x:a.x,y:a.y,r:a.r,color:a.color,life:a.shape==='bell'?1:.6});
      if(hits>=5&&a.team==='hero')event(w,'rung',{count:hits,x:a.x,y:a.y});
      if(a.pool)makePool(w,a.src,a.x,a.y,a.r,a.damage,a.pool,{...a.extra,color:a.color,lit:a.lit,follow:a.follow});
      if(a.charge&&a.src?.alive){a.src.x+=Math.cos(a.a)*a.r*.7;a.src.y+=Math.sin(a.a)*a.r*.7;a.src.inv=.15;}
      if(a.selfDestruct&&a.src?.alive)killFoe(w,a.src,{src:w.heroes[0],amount:0});
    }
    if(a.shape==='pool'?a.life<=0:a.t>=(a.expand?a.life:a.delay+.15))w.hazards.splice(w.hazards.indexOf(a),1);
  }
}
function stepShots(w,dt) {
  for(const b of [...w.shots]){
    b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.team==='hero')for(const p of w.props)if(p.breakable&&!p.broken&&Math.hypot(p.x-b.x,p.y-b.y)<(b.r||4)+8){breakProp(w,p,b.src);if(b.pierce--<=0){b.life=0;break;}}
    const targets=b.team==='hero'?w.foes:w.heroes;
    for(const u of targets)if(u.alive&&!b.hit.includes(u.id)&&Math.hypot(u.x-b.x,u.y-b.y)<u.r+b.r){
      dealDamage(w,u,{src:b.src,amount:b.damage,ang:b.a,...b.extra});b.hit.push(u.id);
      if(b.extra.chain){let p=u;for(let i=1;i<b.extra.chain;i++){const t=closest(targets,p,65,f=>f.alive&&!b.hit.includes(f.id));if(!t)break;fx(w,'chain',{x:p.x,y:p.y,z:18,to:{x:t.x,y:t.y,z:18},color:b.color,life:.25});dealDamage(w,t,{src:b.src,amount:b.damage*.7,...b.extra});b.hit.push(t.id);p=t;}}
      if(b.pierce--<=0){b.life=0;break;}
    }
    const cell=w.map.toCell(b.x,b.y);if(!w.map.walkable(cell[0]??cell.cx,cell[1]??cell.cy))b.life=0;
    if(b.life<=0)w.shots.splice(w.shots.indexOf(b),1);
  }
}
function updateHero(w,h,dt,input={}) {
  h.maxHp=heroMax(h);h.hp=Math.min(h.hp,h.maxHp);h.silenced=w.foes.some(f=>f.alive&&(f.kind==='mute'||f.affixes.includes('hushed'))&&dist(h,f)<60);
  h.resourceMax=100+(h.level>=8&&hasVow(h,1)&&h.kind==='cantor'?30:0)+(h.level>=8&&hasVow(h,1)&&h.kind==='lamplighter'?20:0)+2*h.verses[2];
  for(const k of ['potion','inv','hurt','flash','stun','slow','guard','combat','dieSave','stealth','greatPeal','travelAnim'])h[k]=Math.max(0,(h[k]||0)-dt);
  for(const k of Object.keys(h.cooldowns))h.cooldowns[k]=Math.max(0,h.cooldowns[k]-dt);
  for(const k of Object.keys(h.buffs))h.buffs[k]=Math.max(0,h.buffs[k]-dt);
  if(h.evades>=2)h.evadeRegen=0;else h.evadeRegen+=dt;if(h.evades<2&&h.evadeRegen>=TUNE.evadeRecharge){h.evades++;h.evadeRegen=0;}
  if(!h.alive){h.deathTimer-=dt;if(h.deathTimer<=0&&(w.session||input.rise||input.riseAtGate)){if(input.riseAtGate){h.x=w.respawn.x;h.y=w.respawn.y;}reviveHero(w,h);}return;}
  if(h.healOver>0){heal(w,h,h.healRate*dt);h.healOver-=dt;}
  const spec=DB.hero[h.kind],regen=spec.regen+(h.guard>0&&h.guardRegen?12:0)+(h.greatPeal>0?5:0);
  h.resource=Math.min(h.resourceMax,h.resource+regen*dt*TUNE.resource);h.nerve=Math.min(30,h.nerve+dt);
  if(h.kind==='ringer'&&h.combat===0)h.resource=Math.max(0,h.resource-4*dt);
  if(h.kind==='sexton')h.resource=Math.min(h.resourceMax,h.resource+w.corpses.filter(c=>!c.used&&dist(h,c)<70).length*dt*(hasVow(h,1)?2:1));
  if(stat(h,'regen')||h.buffRegen&&h.greatPeal>0)heal(w,h,(stat(h,'regen')+(h.greatPeal>0?h.buffRegen||0:0))*dt);
  const move=input.moveDir||[0,0];if(Math.hypot(...move)>.1)h.still=0;else h.still=(h.still||0)+dt;
  if(input.potion)usePotion(w,h);if(input.evade)evade(w,h,input.evadeDir||move);
  if(input.interact)interactNearest(w,h,input.target,dt);
  if(input.portal&&!w.session)passingBell(w,h);
  if(h.attack){
    const a=h.attack;a.elapsed+=dt;
    if(!a.struck&&a.elapsed>=a.wind){a.struck=true;executeSkill(w,h,a);}
    if(a.s.verb==='beam'&&a.struck){a.tick-=dt;if(input.aim){a.aim=input.aim;a.a=angle(h,input.aim);h.facing=a.a;}if(a.tick<=0){a.tick=.25;for(const u of w.foes)if(u.alive&&dist(h,u)<a.s.range&&Math.abs(adiff(angle(h,u),a.a))<Math.atan2(a.s.radius,Math.max(8,dist(h,u))))dealDamage(w,u,{src:h,amount:damageBase(h)*a.s.dmg*.25*TUNE.damage,...a.s,kb:15});fx(w,'beam',{x:h.x,y:h.y,z:18,a:a.a,r:a.s.range,color:ELEMENT[a.s.element||'lightning'],life:.27});}}
    if(a.elapsed>=a.total||(a.struck&&Math.hypot(...move)>.1&&a.s.verb!=='beam'&&a.elapsed>a.wind+.1)){h.attack=null;if(h.queued){const q=h.queued;h.queued=null;castSkill(w,h,q.slot,q.aim);}}
  }
  if(input.slots)for(const i of [5,4,3,2,1,0])if(input.slots[i]){const sid=h.slots[i],s=tunedSkill(h,sid),nerve=h.kind==='lamplighter'&&['trap','vault','smoke'].includes(sid);if(!s||h.cooldowns[sid]>0||s.unlock>h.level&&!h.unlockedAll||!h.chord&&(nerve?h.nerve:h.resource)<s.cost&&!w.cheats.infinite&&!(CHEATS.infinite&&w===W))continue;if(castSkill(w,h,i,input.aim)||h.queued)break;}
  if(h.dodge>0){h.dodge-=dt;h.vx=h.dodgeDir[0]*250;h.vy=h.dodgeDir[1]*250;}
  else if(h.stun>0){h.vx=h.vy=0;}
  else {
    const speed=92*TUNE.speed*(h.slow>0&&!(h.guard>0&&h.guardImmune)?h.kind==='ringer'&&hasVow(h,1)?.7:.5:1)*(h.stealth>0?1.4:1)*(1+stat(h,'speed')*.01+.007*h.verses[3])*(h.buffHaste&&h.greatPeal>0?1.25:1)*(h.buffs.haste>0?1.5:1)*(h.attack&&!h.attack.struck?.35:1);
    h.vx=E.approach(h.vx,move[0]*speed,1000*dt);h.vy=E.approach(h.vy,move[1]*speed,1000*dt);
    if(Math.hypot(...move)>.1&&!h.attack)h.facing=Math.atan2(move[1],move[0]);
  }
  if(h.remote&&!input.moveDir){h.vx=h.vy=0;return;}
  if(w.heroes.filter(u=>!u.follower).length>1&&!h.follower){const peers=w.heroes.filter(u=>!u.follower&&u.id!==h.id);const mid={x:peers.reduce((n,u)=>n+u.x,0)/peers.length,y:peers.reduce((n,u)=>n+u.y,0)/peers.length};if(dist(h,mid)>340&&(h.x-mid.x)*h.vx+(h.y-mid.y)*h.vy>0){h.vx=h.vy=0;}}
  h.update(dt,w.cheats.noClip||CHEATS.noClip&&w===W?null:w.map);
  h.x=clamp(h.x,24,w.width-24);h.y=clamp(h.y,24,w.height-24);
}
function reviveHero(w,h,by){h.alive=true;h.hp=h.maxHp*.65;h.inv=3;h.deathTimer=0;h.revive=0;if(by){by.stats.revives++;event(w,'revive',{id:h.id,by:by.id});}else event(w,'rise',{id:h.id});}
function botInput(w,h,follow=null) {
  const nearest=closest(w.foes,h,190,u=>u.alive&&u.spawn<.2&&!(u.kind==='angelus'&&w.angelusKneeling)),aim=nearest||questTarget(w,h)||h;
  let goal=aim,range=nearest?(h.kind==='ringer'||h.kind==='sexton'?25:80):23;
  if(follow&&dist(h,follow)>150){goal=follow;range=60;}
  const d=dist(h,goal);let move=d>range?norm(goal.x-h.x,goal.y-h.y):[0,0];
  if(d>range&&!w.map.los(h.x,h.y,goal.x,goal.y)){
    if(!h.navFlow||h.navMap!==w.map){h.navFlow=new E.FlowField(w.map);h.navMap=w.map;h.navAt=-1;}
    if(w.time>(h.navAt||0)||!h.navGoal||dist(h.navGoal,goal)>20){h.navFlow.update(goal.x,goal.y);h.navGoal={x:goal.x,y:goal.y};h.navAt=w.time+.25;}
    const dir=h.navFlow.dir(h.x,h.y,goal.x,goal.y);if(dir&&Math.hypot(...dir)>.1)move=dir;
  }
  const danger=w.hazards.find(a=>a.team==='foe'&&a.shape!=='pool'&&a.t>a.delay*.45&&inHazard(a,h,(a.t-a.delay)/(a.life-a.delay)*a.r));
  const out={moveDir:move,aim,slots:Array(6).fill(false),potion:h.hp<h.maxHp*.55,evade:!!danger&&h.evades>0,evadeDir:danger?norm(h.x-danger.x,h.y-danger.y):move};
  if(nearest){
    const order=[5,2,3,1,4,0];for(const i of order){const s=tunedSkill(h,h.slots[i]);if(!s||s.unlock>h.level&&!h.unlockedAll||h.cooldowns[s.id]>0||(h.kind==='lamplighter'&&['trap','vault','smoke'].includes(s.id)?h.nerve:h.resource)<s.cost)continue;
      if(s.verb==='heal'&&h.hp>h.maxHp*.8)continue;if(s.verb==='guard'&&h.guard>0)continue;
      if(s.verb==='buff'&&h.greatPeal>1)continue;
      if(s.verb==='blink'&&!danger&&h.hp>h.maxHp*.45)continue;
      if(s.verb==='corpse'&&!w.corpses.some(c=>!c.used&&dist(c,nearest)<80))continue;
      if(s.verb==='summon'&&w.allies.filter(a=>a.owner===h.id).length>3)continue;
      if((s.verb==='cone'&&!s.bolt||s.verb==='spin'||s.verb==='nova')&&dist(h,nearest)>(s.range||s.radius)+8)continue;
      out.slots[i]=true;break;
    }
  }
  if(!nearest&&!follow){
    const drop=closest(w.drops,h,70,d=>d.type==='item'&&d.owner===h.id);if(drop&&h.bag.length<30){out.moveDir=dist(h,drop)>23?norm(drop.x-h.x,drop.y-h.y):[0,0];if(dist(h,drop)<26){out.interact=true;out.target=drop;}}
    else if(goal&&goal.type&&dist(h,goal)<32){out.interact=true;out.target=goal;}
  }
  if(!nearest&&follow&&dist(h,follow)>70)out.moveDir=norm(follow.x-h.x,follow.y-h.y);
  if(!h.alive&&h.deathTimer<=0)reviveHero(w,h);
  return out;
}
function stepWorld(w,dt,inputs={}) {
  if(w.ended||w.screen==='ending')return;
  w.time+=dt;w.zoneTime+=dt;w.stats.elapsed+=dt;w.zoneCard=Math.max(0,w.zoneCard-dt);w.hush=Math.max(0,(w.hush||0)-dt);w.darkness=Math.max(0,(w.darkness||0)-dt);
  if(w.dialogue){w.dialogue.t-=dt;if(w.dialogue.t<=0)w.dialogue=null;}
  for(const o of w.objects)if(o.falling>0)o.falling=Math.max(0,o.falling-dt);
  for(const t of w.toasts)t.t-=dt;w.toasts=w.toasts.filter(t=>t.t>0);
  for(const f of w.fx)f.t+=dt;w.fx=w.fx.filter(f=>f.t<f.life);
  for(const n of w.numbers)n.t+=dt;w.numbers=w.numbers.filter(n=>n.t<.85);
  w.requiemT-=dt;w.sacrilegeT-=dt;
  if(w.requiemT<=0&&w.requiem>0){if(w.requiem>=10){for(const h of w.heroes){gainXP(w,h,w.requiem*1.8);if(powers(h).has('streakPower'))h.zoneDevotion=(h.zoneDevotion||0)+.02;}event(w,'requiem',{count:w.requiem});}w.requiem=0;}
  if(w.sacrilegeT<=0)w.sacrilege=0;
  if(Math.floor(w.time*5)!==Math.floor((w.time-dt)*5)){
    w.explored||=new Set();for(const h of w.heroes)for(let iy=-8;iy<=8;iy++)for(let ix=-8;ix<=8;ix++)if(ix*ix+iy*iy<65)w.explored.add(Math.floor(h.x/16)+ix+','+(Math.floor(h.y/16)+iy));
    w.flow.update(w.heroes.filter(h=>h.alive).map(h=>[h.x,h.y]));const main=getMain(w),g=main&&questTarget(w,main);if(g)w.botFlow.update(g.x,g.y);
  }
  w.spatial ||= new E.SpatialHash(32);w.spatial.build(w.foes.filter(f=>f.alive));
  for(const h of [...w.heroes]){
    if(h.remote&&!w.authority)continue;
    const input=h.bot||h.follower||w.cheats.bot?botInput(w,h,h.follower?getMain(w):null):(inputs[h.id]||{});
    updateHero(w,h,dt,input);
  }
  if(w.authority){
    for(const o of w.objects)if(o.type==='sermon'&&!o.used){
      if(!o.started&&w.heroes.some(h=>h.alive&&dist(h,o)<130))o.started=true;
      if(o.started){
        if(!o.priestId){const f=spawnFoe(w,'priest',o.x,o.y,{elite:'champion'});o.priestId=f.id;o.convert=5;o.converted=0;event(w,'notice',{text:'THE SERMON • Silence the Moth-Priest before the pilgrims turn.'});}
        const priest=w.foes.find(f=>f.id===o.priestId&&f.alive);o.convert-=dt;
        if(!priest){o.used=true;for(const h of w.heroes)dropItem(w,h,o.x,o.y,{rarity:3});event(w,'notice',{text:'THE SERMON IS OVER. '+Math.max(0,6-o.converted)+' pilgrims spared.'});}
        else if(o.convert<=0&&o.converted<6){o.convert=5;o.converted+=2;for(let i=0;i<2;i++)spawnFoe(w,'husk',o.x+20+(i%2)*12,o.y+20);}
      }
    }
    for(const f of [...w.foes])updateFoe(w,f,dt);
    stepShots(w,dt);stepHazards(w,dt);
    for(const a of [...w.allies]){
      a.life-=dt;a.atk-=dt;const owner=w.heroes.find(h=>h.id===a.owner),target=closest(w.foes,a,220,u=>u.alive);
      let goal=target||owner;if(goal){const d=dist(a,goal);a.facing=angle(a,goal);a.vx=a.vy=0;if(d>(target?(a.ranged?95:22):40)){const speed=a.haste?95:62;a.vx=Math.cos(a.facing)*speed;a.vy=Math.sin(a.facing)*speed;a.x+=a.vx*dt;a.y+=a.vy*dt;}
        if(target&&a.atk<=0&&d<(a.ranged?140:30)){a.atk=.7;if(a.ranged)makeShot(w,{...a,team:'hero',source:owner},a.facing,a.damage,{range:160,color:'#a6cf89'});else dealDamage(w,target,{src:owner,amount:a.damage,ang:a.facing});a.anim=.4;}}
      a.anim=Math.max(0,(a.anim||0)-dt);
      if(a.life<=0){if(a.explode)radialHit(w,owner,a.x,a.y,40,a.damage*3,{element:'poison'});if(owner&&setCount(owner)>=4){const c=new E.Body({x:a.x,y:a.y,r:4});Object.assign(c,{id:a.id,kind:'digger',age:0,used:false,death:'bones'});w.corpses.push(c);}event(w,'allyEnd',{id:a.id});w.allies.splice(w.allies.indexOf(a),1);}
    }
    const allDown=w.heroes.every(h=>!h.alive);if(allDown&&!w.partyWiped){for(const f of w.foes)if(f.boss){f.hp=f.maxHp;f.phase=0;f.atk=3;}w.hazards=[];w.partyWiped=true;}if(!allDown)w.partyWiped=false;
    collectDrops(w,dt);
    for(const o of w.objects){if(o.type==='caravan'&&o.started&&!o.used){const near=w.heroes.some(h=>h.alive&&dist(h,o)<100),enemies=w.foes.some(f=>f.alive&&dist(f,o)<100);if(near&&!enemies){o.progress+=dt;o.x+=dt*6;o.y-=dt*6;if(o.progress>=24){o.used=true;event(w,'objective',{type:'caravan'});}}}}
    if(w.zone==='vigil'&&w.reckoning<100){w._vigilSpawn-=dt;if(w._vigilSpawn<=0&&w.foes.filter(f=>f.alive).length<65){w._vigilSpawn=4;const h=getMain(w);for(let i=0;i<Math.max(1,Math.floor(12*TUNE.density));i++){const a=w.rng()*Math.PI*2,d=110+w.rng()*70;spawnFoe(w,choose(w.rng,DB.zone.vigil.pool),clamp(h.x+Math.cos(a)*d,50,w.width-50),clamp(h.y+Math.sin(a)*d,50,w.height-50),{elite:i===0&&w.rng()<.4*TUNE.elites?'champion':null});}}}
    if(w.zone==='scaffold'&&Math.floor(w.zoneTime/25)>Math.floor((w.zoneTime-dt)/25)){const h=getMain(w);hazard(w,{team:'foe',level:h.level},'ring',w.width/2,w.height/2,800,1,{life:5,expand:true,hit:[],damage:h.maxHp*.35});event(w,'greatToll');}
    if(w.zone==='mothcourt'&&w.darkness>0){w.darkTick=(w.darkTick||0)-dt;if(w.darkTick<=0){w.darkTick=.5;for(const h of w.heroes)if(h.alive&&!w.objects.some(o=>o.type==='brazier'&&o.active&&dist(o,h)<85))dealDamage(w,h,{amount:h.maxHp*.0075,src:null});}}
    if(w.greater&&w.zone==='vigil'){w.vigilClock-=dt;if(w.vigilClock<=0){w.ended=true;w.results={time:w.zoneTime,kills:w.killsZone,deaths:w.heroes.reduce((s,h)=>s+h.stats.deaths,0),tier:w.tier,won:false};}}
  }
  if(!w.authority){stepShots(w,dt);for(const a of w.hazards){a.t+=dt;if(a.shape==='pool')a.life-=dt;}w.hazards=w.hazards.filter(a=>a.shape==='pool'?a.life>0:a.t<(a.expand?a.life:a.delay+.15));}
  for(const c of w.corpses){c.age+=dt;if(c.age<7){c.update(dt,w.map);c.roll=(c.roll||0)+Math.hypot(c.vx,c.vy)*dt*.025;}}
  w.corpses=w.corpses.filter(c=>c.age<45);w.foes=w.foes.filter(f=>f.alive);
  if(w.events.length>300)w.events.splice(0,w.events.length-300);
}
