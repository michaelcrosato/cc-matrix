function rollItem(w,h,options={}) {
  const r=w.lootRng,slot=options.slot??Math.floor(r()*8),level=options.level||h.level;
  let rarity=options.rarity;
  if(rarity===undefined){const n=r();rarity=n<.004*TUNE.relicChance*(1+stat(h,'fortune')*.01+(h.buffs.fortune>0?1:0))?4:n<.012?5:n<.11?3:n<.45?2:n<.8?1:0;}
  const pool=Object.values(DB.relic).filter(x=>(x.hero===h.kind||x.hero==='any')&&(options.relic?x.id===options.relic:true));
  const relic=rarity===4?(options.relic?DB.relic[options.relic]:choose(r,pool)):null;
  const set=rarity===5?Object.values(DB.set).find(s=>s.hero===h.kind):null;
  const item={id:w.uid++,slot:relic?relic.slot:set?choose(r,set.slots):slot,level,rarity,identified:rarity<3,relic:relic?.id||null,set:set?.id||null,
    name:relic?relic.name:set?set.name+' '+SLOTS[slot]:choose(r,['Ashen','Rainworn','Candlebound','Graven','Tollkeeper\'s','Parish'])+' '+(slot===0?({ringer:'Clapper',cantor:'Psalter',lamplighter:'Crossbow',sexton:'Spade'})[h.kind]:SLOTS[slot]),
    damage:8*Math.pow(1.15,level-1)*(1+rarity*.15)*(.95+r()*.1),affixes:[],gem:null,socket:false,redips:0,hero:h.kind,flavor:relic?.flavor||'The parish has seen worse.'};
  const used=new Set();for(let i=0;i<RARITY[rarity].affixes;i++){
    const af=choose(r,AFFIX_POOL.filter(a=>!used.has(a[0])));used.add(af[0]);
    if(af[0]==='socket'){item.socket=true;continue;}
    item.affixes.push({key:af[0],name:af[1],value:Math.round((1+level*.5)*af[2]*(.7+r()*.6)*10)/10});
  }
  return item;
}
function itemName(i){return i.identified?(i.rarity===4?i.name.toUpperCase():i.name):'Unconsecrated '+SLOTS[i.slot];}
function dropItem(w,h,x,y,o={}){if(h.follower)return null;const item=rollItem(w,h,o);const d={id:w.uid++,type:'item',x,y,z:3,owner:h.id,item};w.drops.push(d);event(w,'drop',{id:d.id,x,y,owner:h.id,item});return item;}
function consecrate(w,h,item){if(item.identified)return false;item.identified=true;event(w,'consecrate',{id:h.id,item:item.id,rarity:item.rarity});return true;}
function equipItem(w,h,item) {
  if(!item.identified){event(w,'notice',{text:'Consecrate this item first.'});return false;}
  const bi=h.bag.indexOf(item);if(bi>=0)h.bag.splice(bi,1);const old=h.gear[item.slot];h.gear[item.slot]=item;if(old)h.bag.push(old);h.maxHp=heroMax(h);event(w,'equip',{id:h.id,item:item.id});return true;
}
function itemScore(i){if(!i)return 0;return (i.slot===0?i.damage*6:10+i.level*3)+i.rarity*7+i.affixes.reduce((n,a)=>n+a.value*.25,0)+(i.relic?25:0);}
function collectDrops(w,dt) {
  for(const d of [...w.drops]){
    const h=closest(w.heroes,d,Infinity,u=>u.alive&&dist(u,d)<45+stat(u,'pickup')+2*u.verses[3]&&(d.owner===null||d.owner===undefined||d.owner===u.id));if(!h)continue;
    if(d.type==='penny'||d.type==='votive'){
      if(dist(d,h)>14){const n=norm(h.x-d.x,h.y-d.y);d.x+=n[0]*150*dt;d.y+=n[1]*150*dt;continue;}
      if(d.type==='penny'){for(const p of w.heroes)p.pennies+=d.amount;}else for(const p of w.heroes)if(p.alive&&dist(p,h)<130)heal(w,p,p.maxHp*.2*(1+stat(p,'votive')*.01));
      event(w,'pickup',{type:d.type,id:h.id,amount:d.amount||0});w.drops.splice(w.drops.indexOf(d),1);
    }else if(w.session&&d.type==='item'&&dist(d,h)<40){d.item.identified=true;if(itemScore(d.item)>itemScore(h.gear[d.item.slot])){equipItem(w,h,d.item);event(w,'notice',{text:h.name+': '+d.item.name});}else if(h.bag.length<30)h.bag.push(d.item);w.drops.splice(w.drops.indexOf(d),1);}
  }
}
function takeDrop(w,h,d){if(d.owner!==h.id||d.type!=='item')return false;if(h.bag.length>=30){event(w,'notice',{text:'Your bag is full. The Forge can lighten it.'});return false;}h.bag.push(d.item);w.drops.splice(w.drops.indexOf(d),1);event(w,'pickup',{type:'item',id:h.id,item:d.item});if(h.bot||w.cheats.bot){consecrate(w,h,d.item);if(itemScore(d.item)>itemScore(h.gear[d.item.slot]))equipItem(w,h,d.item);}return true;}
function salvage(w,h,item){const i=h.bag.indexOf(item);if(i<0)return false;h.bag.splice(i,1);h.mats.scrap+=1+item.rarity;if(item.rarity>=2)h.mats.salt+=1;if(item.rarity>=4)h.mats.ash+=1;event(w,'service',{type:'salvage',id:h.id});return true;}
function craft(w,h,slot){const cost=6;if(h.mats.scrap<cost||h.bag.length>=30)return false;h.mats.scrap-=cost;const item=rollItem(w,h,{slot,rarity:w.lootRng()<.3?3:2});h.bag.push(item);event(w,'service',{type:'craft',id:h.id});return item;}
function buy(w,h,slot=0,gamble=false){const cost=gamble?150:80+20*h.level;if(h.pennies<cost||h.bag.length>=30)return false;h.pennies-=cost;const item=rollItem(w,h,{slot,rarity:gamble?(w.lootRng()<.12?4:w.lootRng()<.5?3:2):2});if(gamble)item.identified=false;h.bag.push(item);event(w,'service',{type:gamble?'gamble':'buy',id:h.id});return item;}
function sell(w,h,item){const index=h.bag.indexOf(item);if(index<0)return false;h.bag.splice(index,1);h.pennies+=Math.round((item.level*5+10)*(item.rarity+1));event(w,'service',{type:'sell',id:h.id});return true;}
function redip(w,h,item,index){const cost=70*(item.redips+1);if(h.pennies<cost||!item.affixes[index])return false;h.pennies-=cost;const af=choose(w.lootRng,AFFIX_POOL.filter(a=>a[0]!=='socket'));item.affixes[index]={key:af[0],name:af[1],value:Math.round((1+item.level*.5)*af[2]*(.9+w.lootRng()*.5)*10)/10};item.redips++;event(w,'service',{type:'redip',id:h.id});return true;}
function socketGem(w,h,item,gem){if(!item.socket){if(h.mats.salt<3)return false;h.mats.salt-=3;item.socket=true;}if(!gem||!h.gems.includes(gem))return false;if(item.gem)h.gems.push(item.gem);h.gems.splice(h.gems.indexOf(gem),1);item.gem=gem;event(w,'service',{type:'socket',id:h.id});return true;}
function extractRelic(w,h,item){if(!item.relic||!item.identified||h.mats.ash<1)return false;h.mats.ash--;const cat=item.slot===0?0:item.slot<5?1:2;h.lantern[cat]=item.relic;const idx=h.bag.indexOf(item);if(idx>=0)h.bag.splice(idx,1);else if(h.gear[item.slot]===item)h.gear[item.slot]=null;event(w,'service',{type:'extract',id:h.id});return true;}
function nearestUsable(w,h) {
  const list=[...w.objects.filter(o=>!o.used||['forge','pawn','agnes','stash','quillonTown','campfire','dog','vigilDoor','brazier','lychgate','exit','hangingBell'].includes(o.type)),...w.drops.filter(d=>d.type==='item'&&d.owner===h.id),...w.heroes.filter(u=>!u.alive&&u.id!==h.id)];
  return closest(list,h,44);
}
function interactNearest(w,h,target=null,dt=1/120) {
  const o=target||nearestUsable(w,h);if(!o||dist(h,o)>48)return false;
  if(o.team==='hero'&&!o.alive){o.revive+=dt;if(o.revive>=2)reviveHero(w,o,h);return true;}
  if(o.type==='item')return takeDrop(w,h,o);
  if(o.type==='exit'){
    if(w.attract)return false;
    if(w.zone==='sidecrypt'&&w.sideReturn){const back=w.sideReturn;w.sideReturn=null;enterZone(w,back);return true;}
    if(!objectiveReady(w)){event(w,'notice',{text:w.killsZone<w.need?'The road is not yet clear. '+(w.need-w.killsZone)+' dead remain.':'Finish your errand before you go.'});return false;}
    if(w.zone==='fields'){enterZone(w,'town');return true;}
    if(w.zone!==CAMPAIGN[w.progress]?.zone){if(w.zone==='town'&&w.returnTo)returnFromTown(w,h);else enterZone(w,CAMPAIGN[w.progress].zone);return true;}
    if(w.progress>=CAMPAIGN.length-1){if(!w.angelusKneeling&&!w.bossDefeated)return false;beginEnding(w);return true;}
    const last=w.progress;w.flags.push('quest'+last);w.progress++;enterZone(w,CAMPAIGN[w.progress].zone);event(w,'quest',{step:last});return true;
  }
  if(['forge','pawn','agnes','stash','quillonTown','campfire','vigilDoor'].includes(o.type)){
    if(w===W&&!w.session)openPanel(o.type,h.id);event(w,'serviceOpen',{type:o.type,id:h.id});return true;
  }
  if(o.type==='returnPortal')return returnFromTown(w,h);
  if(o.type==='brazier'){o.active=true;event(w,'light',{id:o.id});return true;}
  if(o.type==='trap'){
    if(o.used)return false;o.used=true;o.falling=.55;const boss=closest(w.foes,o,110,f=>f.alive&&f.boss);if(boss){dealDamage(w,boss,{src:null,amount:boss.maxHp*.12,kb:30});boss.stun=3;}
    const n=radialHit(w,h,o.x,o.y,65,10000,{element:'physical',stun:3,skipBoss:true});for(const u of w.heroes)if(u.alive&&dist(u,o)<50)dealDamage(w,u,{src:null,amount:u.maxHp*.35});fx(w,'chandelier',{x:o.x,y:o.y,r:65,color:GOLD,life:1.2});event(w,'notice',{text:n?'THE PARISH THANKS YOU.':'The chandelier falls. Mind your head.'});return true;
  }
  if(o.used&&o.type!=='dog'&&o.type!=='lychgate'&&o.type!=='hangingBell')return false;
  if(o.type==='sideCrypt'){w.sideReturn=w.zone;enterZone(w,'sidecrypt');return true;}
  if(o.type==='sermon'){o.started=true;return true;}
  if(o.type==='quillon'){if(w.killsZone<6){event(w,'notice',{text:'Clear the dead from the rubble first.'});return false;}o.used=true;w.flags.push('quillonRescued');event(w,'dialogue',{speaker:'Mother Quillon',text:'By the handle. I am not a turnip.'});}
  if(o.type==='chapel'||o.type==='sluice'){
    o.used=true;const count=w.objects.filter(t=>t.type===o.type&&t.used).length;
    event(w,'objective',{type:o.type,count});fx(w,'ring',{x:o.x,y:o.y,r:55,color:'#f1b86a',life:1.4});
    if(o.type==='sluice'&&count===3){w.flags.push('bellRecast');event(w,'pour');}
    else for(let i=0;i<6;i++)spawnFoe(w,choose(w.rng,DB.zone[w.zone].pool),o.x+(w.rng()-.5)*110,o.y+(w.rng()-.5)*110);
  }
  if(o.type==='lychgate'){w.respawn={x:o.x,y:o.y};o.used=true;event(w,'notice',{text:'The Lychgate remembers you. Open the map to travel.'});}
  if(o.type==='lore'){o.used=true;const idx=o.loreId??0;if(!w.lore.includes(idx))w.lore.push(idx);event(w,'dialogue',{speaker:LORE[idx][0],text:LORE[idx][1]});}
  if(o.type==='epitaph'){event(w,'dialogue',{speaker:'An old headstone',text:EPITAPHS[Math.floor(w.rng()*EPITAPHS.length)]});o.used=true;}
  if(o.type==='oldBell'){o.used=true;event(w,'dialogue',{speaker:'Mother Quillon',text:'Old Patience. Her tongue is gone. The Beadle has it.'});}
  if(o.type==='regentTalk'){o.used=true;event(w,'dialogue',{speaker:'Regent Sallow',text:'You have walked so far, little lamps. The foundry is yours.'});}
  if(o.type==='caravan'){o.started=true;event(w,'notice',{text:'Stay with the wagon. Clear the ambushes.'});if(!o.ambush){o.ambush=true;for(let i=0;i<18;i++)spawnFoe(w,choose(w.rng,DB.zone.march.pool),o.x+(w.rng()-.5)*140,o.y+(w.rng()-.5)*140);}}
  if(o.type==='chest'){o.used=true;for(const p of w.heroes)dropItem(w,p,o.x+(p.id%4)*8,o.y,{rarity:w.lootRng()<.08?4:3});h.gems.push([Math.floor(w.lootRng()*3),Math.min(3,1+Math.floor(h.level/10))]);event(w,'chest',{x:o.x,y:o.y});if(['acre','nave','march'].includes(w.zone)&&!w.recipe.includes(w.zone)){w.recipe.push(w.zone);event(w,'notice',{text:'A page of the Shepherd\'s Bell recipe.'});}}
  if(o.type==='unquiet'||o.type==='cursed'){
    o.used=true;o.eventLeft=o.type==='unquiet'?40:30;o.eventKills=w.kills;w.activeEvent=o;
    for(let i=0;i<25;i++)spawnFoe(w,choose(w.rng,DB.zone[w.zone].pool),o.x+(w.rng()-.5)*160,o.y+(w.rng()-.5)*160);
    event(w,'notice',{text:o.type==='unquiet'?'THE UNQUIET ROW • Survive forty seconds.':'CURSED RELIQUARY • Twenty dead in thirty seconds.'});
  }
  if(o.type==='shrine'||o.type==='pylon'){o.used=true;const buff=o.type==='pylon'?choose(w.rng,['power','haste','shield','conduit','channel']):choose(w.rng,['power','haste','shield','fortune']);for(const p of w.heroes)p.buffs[buff]=o.type==='pylon'?20:120;event(w,'notice',{text:buff.toUpperCase()+' • The parish is blessed.'});event(w,'blessing',{x:o.x,y:o.y});}
  if(o.type==='dog'){event(w,'dialogue',{speaker:'Mother Quillon',text:'A creature of impeccable judgment. It has not tried to eat me.'});fx(w,'heart',{x:o.x,y:o.y,z:18,color:GOLD,life:1.5});}
  if(o.type==='hangingBell'){h.inv=1;event(w,'notice',{text:'The bell\'s shadow shelters you from the Toll.'});}
  if(o.type==='tongue'&&w.angelusKneeling){o.progress+=dt;if(o.progress>=1.5){const boss=w.foes.find(f=>f.kind==='angelus');if(boss){w.finishStrike=true;killFoe(w,boss,{src:h,amount:1});}beginEnding(w);}return true;}
  if(o.type==='bigEwe'){o.used=true;const b=spawnFoe(w,'tithe',o.x,o.y,{boss:true});b.name='The Big Ewe';w.bossId=b.id;}
  return true;
}
const ZONE_CACHE_KEYS=['zone','zoneTime','killsZone','need','foes','allies','corpses','drops','props','objects','hazards','shots','fx','numbers','decals','bossId','bossDefeated','angelusKneeling','finishStrike','activeEvent','map','flow','botFlow','width','height','spawn','exit','respawn','explored','_vigilSpawn','reckoning','vigilClock','darkness','hush'];
function passingBell(w,h){if(w.zone==='town'){returnFromTown(w,h);return;}w.returnTo=w.zone;w.returnPos={x:h.x,y:h.y};w.passageCache=Object.fromEntries(ZONE_CACHE_KEYS.map(k=>[k,w[k]]));enterZone(w,'town');event(w,'portal');}
function returnFromTown(w,h){if(!w.returnTo)return false;const back=w.returnTo,pos=w.returnPos,cache=w.passageCache;w.returnTo=null;w.passageCache=null;if(cache&&cache.zone===back){Object.assign(w,cache);w.screen='play';w.ended=false;w.zoneCard=1;event(w,'zone',{id:back});}else enterZone(w,back);for(let i=0;i<w.heroes.length;i++){const u=w.heroes[i];u.x=(pos?.x||w.spawn.x)+i*10;u.y=pos?.y||w.spawn.y;u.vx=u.vy=u.vz=0;u.attack=null;u.inv=1.5;}event(w,'portal');return true;}
function beginEnding(w){if(w.attract)return;w.screen='ending';w.endingPage=0;w.endingT=0;w.flags.push('bookBurned');event(w,'ending');}
function startVigil(w,tier=1,greater=false){w.tier=tier;w.greater=greater;w.returnTo=null;enterZone(w,'vigil');event(w,'vigilStart',{tier});}
function serializeWorld(w){return {version:2,uid:w.uid,seed:w.seed,progress:w.progress,zone:w.zone,heroes:[...w.heroes.filter(h=>!h.follower),...(w.couchReserve||[])].map(h=>{
  const keys=['id','kind','name','color','level','xp','resource','gear','bag','pennies','mats','gems','slots','tones','vows','lantern','stats','verses','verseXP','versePoints','unlockedAll'];return Object.fromEntries(keys.map(k=>[k,h[k]]));}),flags:w.flags,visited:w.visited,lore:w.lore,recipe:w.recipe,stash:w.stash,records:w.records,difficulty:w.difficulty,tier:w.tier};}
function loadWorld(data){const w=newWorld(data.seed);for(const k of ['progress','flags','visited','lore','recipe','stash','records','difficulty','tier'])if(data[k]!==undefined)w[k]=clone(data[k]);const heroes=data.heroes.map(d=>Object.assign(newHero(d.kind,d.id,d.level,d.color),d));w.uid=Math.max(data.uid||10,...heroes.flatMap(h=>[...h.bag,...h.gear.filter(Boolean)].map(i=>i.id)),...w.stash.flat().map(i=>i.id))+1;w.heroes=heroes.slice(0,1);w.couchReserve=heroes.slice(1);enterZone(w,DB.zone[data.zone]?data.zone:CAMPAIGN[w.progress].zone);return w;}
function migrateSave(d,version){if(version<2){for(const h of d.heroes||[]){h.verses||=[0,0,0,0];h.lantern||=[null,null,null];h.gems||=[];}d.version=2;}return d;}
