function openPanel(kind,owner=getMain()?.id||0){
  if(SESSION)return;game.resume();PANEL_STATE={kind,owner,focus:0,tab:0,page:0,slot:0,skill:0,itemId:null,buttons:[],text:[],art:null,title:'',sub:'',consecrate:0,group:0,spawnKind:0,count:kind==='vigilDoor'?1:6,elite:0,rarity:4,itemLevel:getMain()?.level||1,zoneIndex:0,bossIndex:0,phase:0,affix:0};
  if(kind==='inventory'){const h=W.heroes.find(h=>h.id===owner);PANEL_STATE.itemId=h.bag[0]?.id||h.gear.find(Boolean)?.id;}
  game.input.consumeAll();buildPanel();titleIdle=0;audio.sound('select');
}
function closePanel(){PANEL_STATE=null;for(const I of game.players){const guard=new Set(['s0','s3'].filter(a=>I.down(a)));for(const a of guard)I.suppress(a);if(guard.size)RESUME_GUARDS.set(I,guard);I.consumeAll();}titleIdle=0;}
function panelHero(p=PANEL_STATE){return W?.heroes.find(h=>h.id===p.owner)||getMain();}
function selectedItem(p=PANEL_STATE){const h=panelHero(p);return [...h.bag,...h.gear.filter(Boolean)].find(i=>i.id===p.itemId)||h.bag[0]||h.gear.find(Boolean);}
function uiButton(p,label,x,y,w,h,fn,o={}){p.buttons.push({label,x,y,w,h,fn,...o});return p.buttons.at(-1);}
function uiText(p,str,x,y,c=IVORY,o={}){p.text.push({str,x,y,c,o});}
function wrapText(p,str,x,y,width,c=IVORY,o={}){const lines=E.font.wrap(str,width,o);for(let i=0;i<lines.length;i++)uiText(p,lines[i],x,y+i*(E.font.lineHeight(o)+3),c,o);return lines.length*10;}
function panelTabs(p,labels){const b=p.box,width=(b.w-28)/labels.length;for(let i=0;i<labels.length;i++)uiButton(p,labels[i],b.x+14+i*width,b.y+33,width-3,18,()=>{p.tab=i;p.page=0;p.focus=i;buildPanel();},{selected:p.tab===i,tab:true});}
function panelPager(p,total,pageSize=6,y=null){const b=p.box,pages=Math.ceil(total/pageSize);p.totalPages=pages;if(pages<2)return;const yy=y??b.y+b.h-39;uiButton(p,'←',b.x+14,yy,25,18,()=>{p.page=(p.page+pages-1)%pages;p.focus=0;buildPanel();});uiText(p,(p.page+1)+' / '+pages,b.x+48,yy+5,MUTED);uiButton(p,'→',b.x+80,yy,25,18,()=>{p.page=(p.page+1)%pages;p.focus=0;buildPanel();});}
function buildPanel(){
  const p=PANEL_STATE;if(!p)return;const width=Math.min(456,game.W-24),height=Math.min(248,game.H-24);p.box={x:(game.W-width)/2,y:(game.H-height)/2,w:width,h:height};p.buttons=[];p.text=[];p.totalPages=1;p.art=null;p.detail=null;p.status='';
  const h=panelHero(p),b=p.box;
  if(p.kind==='inventory')inventoryPanel(p,h);
  else if(p.kind==='skills')skillsPanel(p,h);
  else if(p.kind==='journal')journalPanel(p,h);
  else if(p.kind==='map')mapPanel(p,h);
  else if(p.kind==='dev')devPanel(p,h);
  else if(p.kind==='about')aboutPanel(p);
  else if(p.kind==='join')joinPanel(p,h);
  else servicePanel(p,h);
  uiButton(p,'BACK',b.x+b.w-57,b.y+b.h-23,43,15,()=>closePanel(),{back:true});
  p.focus=clamp(p.focus,0,Math.max(0,p.buttons.length-1));
}
function inventoryPanel(p,h){
  p.title='YOUR RELIQUARY';p.sub=h.pennies+' pennies  •  '+h.mats.scrap+' scrap  •  '+h.mats.salt+' salt  •  '+h.mats.ash+' ash';panelTabs(p,['Bag','Stats']);const b=p.box;
  if(p.tab===1){
    const stats=[['DAMAGE',Math.round(damageBase(h)*TUNE.damage)],['TOUGHNESS',Math.round(h.maxHp*(1+stat(h,'armor')/90))],['HEALING',Math.round(stat(h,'regen')+stat(h,'lifeHit')*2.5)]];
    stats.forEach(([label,value],i)=>{const x=b.x+26+i*(b.w-52)/3;uiText(p,label,x,b.y+67,GOLD);uiText(p,value,x,b.y+83,IVORY,{scale:3});});
    const lines=['Critical chance: '+(6+stat(h,'crit')).toFixed(1)+'%','Attack speed: '+(2.5*TUNE.attackSpeed*(1+stat(h,'haste')*.01)).toFixed(1)+'/s','Armor: '+stat(h,'armor').toFixed(1),'Move speed: '+Math.round(92*TUNE.speed*(1+stat(h,'speed')*.01)), 'Lantern powers: '+h.lantern.filter(Boolean).length+'/3'];
    lines.forEach((s,i)=>uiText(p,s,b.x+26,b.y+122+i*13,MUTED));
    if(h.level>=30){uiText(p,'VERSES: '+(h.versePoints||0)+' unspent',b.x+225,b.y+125,GOLD);for(let i=0;i<4;i++)uiButton(p,['Might','Flesh','Will','Grace'][i]+' '+h.verses[i],b.x+225,b.y+140+i*17,140,15,()=>{if(h.versePoints>0){h.versePoints--;h.verses[i]++;buildPanel();}});}
    return;
  }
  const left=b.x+15,top=b.y+58,bagX=b.x+148;
  p.art=g=>{const rig=ensureRig(h,true);rig.drawPortrait(g,left+33,top+28,58,{zoom:1.2,bg:'#19252b',frame:false});};
  for(let i=0;i<8;i++){
    const spots=[[48,104],[48,0],[48,78],[2,54],[95,54],[2,24],[95,24],[95,88]],x=left+spots[i][0],y=top+spots[i][1],item=h.gear[i];
    uiButton(p,item?SLOTS[i].slice(0,1):'+',x,y,22,22,()=>{if(item)p.itemId=item.id;buildPanel();},{item,slot:i,gear:true,onFocus:()=>{if(item)p.itemId=item.id;}});
  }
  uiText(p,'EQUIPPED',left+23,top+133,MUTED);uiText(p,'BAG  '+h.bag.length+'/30',bagX,top-3,GOLD);
  for(let i=0;i<30;i++){
    const item=h.bag[i],x=bagX+(i%6)*24,y=top+10+Math.floor(i/6)*24;
    uiButton(p,item?'':'',x,y,22,22,()=>{if(item){p.itemId=item.id;if(item.identified)equipItem(W,h,item);else{p.identifying=true;p.consecrate=0;}buildPanel();}},{item,empty:!item,onFocus:()=>{if(item)p.itemId=item.id;}});
  }
  p.detail={x:b.x+301,y:top,w:b.w-316,item:selectedItem(p)};
  const item=selectedItem(p);if(item){
    uiButton(p,item.identified?'Equip':'Consecrate',b.x+303,b.y+b.h-72,b.w-318,18,()=>{if(item.identified)equipItem(W,h,item);else{p.identifying=true;p.consecrate=0;}buildPanel();});
    uiButton(p,'Drop',b.x+303,b.y+b.h-50,49,17,()=>{dropBagItem(h,item);buildPanel();});
    uiButton(p,'Salvage',b.x+356,b.y+b.h-50,65,17,()=>{if(W.zone==='town'){salvage(W,h,item);buildPanel();}else toast('Salvage at Ysolde\'s Forge.');});
  }
  p.status=prompt('confirm')+' Equip   '+prompt('s2')+' Hold: consecrate';
}
function dropBagItem(h,item){const idx=h.bag.indexOf(item);if(idx<0)return;h.bag.splice(idx,1);W.drops.push({id:W.uid++,type:'item',owner:h.id,x:h.x+8,y:h.y,z:2,item});}
function skillsPanel(p,h){
  p.title='SIX NOTES. MANY REQUIEMS.';p.sub='Change a skill or Tone freely outside combat.';panelTabs(p,['Skills and Tones','Vows']);const b=p.box,hero=DB.hero[h.kind];
  if(p.tab===1){const slots=h.level>=24?3:h.level>=16?2:h.level>=8?1:0;uiText(p,slots+' vow slots • unlock at 8, 16, 24',b.x+20,b.y+62,GOLD);
    hero.vows.forEach(([name,desc],i)=>{const y=b.y+80+i*32;uiButton(p,(h.vows.slice(0,slots).includes(i)?'★ ':'')+name,b.x+20,y,166,27,()=>{if(!slots){toast('Vows awaken at level 8.');return;}const active=h.vows.slice(0,slots);if(active.includes(i))active.splice(active.indexOf(i),1);else{if(active.length>=slots)active.shift();active.push(i);}h.vows=active;buildPanel();});wrapText(p,desc,b.x+201,y+3,b.w-218,MUTED);});return;
  }
  for(let i=0;i<6;i++){const x=b.x+16+(i%2)*62,y=b.y+62+Math.floor(i/2)*43;uiButton(p,prompt('s'+i),x,y,56,37,()=>{p.slot=i;p.skill=hero.skills.indexOf(h.slots[i]);buildPanel();},{skillIcon:h.slots[i],selected:p.slot===i});}
  uiText(p,'SLOT '+(p.slot+1),b.x+17,b.y+196,TEAL);
  for(let i=0;i<8;i++){
    const sid=hero.skills[i],s=DB.skill[sid],x=b.x+147+(i%2)*142,y=b.y+61+Math.floor(i/2)*24,unlocked=h.level>=s.unlock||h.unlockedAll;
    uiButton(p,unlocked?s.name:'L'+s.unlock+'  '+s.name,x,y,136,21,()=>{p.skill=i;if(!unlocked){toast('This skill awakens at level '+s.unlock+'.');return;}if(h.combat>0&&W.foes.some(f=>dist(f,h)<170)){toast('Wait until you are out of combat.');return;}h.slots[p.slot]=sid;buildPanel();},{selected:h.slots[p.slot]===sid,dim:!unlocked});
  }
  const sid=hero.skills[p.skill],s=DB.skill[sid];wrapText(p,s.text,b.x+147,b.y+162,b.w-163,MUTED);
  const tuned=tunedSkill(h,sid),resName=h.kind==='lamplighter'&&['trap','vault','smoke'].includes(sid)?'Nerve':hero.resource;uiText(p,(tuned.cost?'Cost '+Math.round(tuned.cost)+' '+resName:'Free')+' • Base CD '+tuned.cd+'s',b.x+147,b.y+173,MUTED);
  for(let i=0;i<3;i++){
    const unlocked=h.level>=s.unlock+[2,4,8][i]||h.unlockedAll,x=b.x+147+i*94;
    uiButton(p,s.tones[i].name,x,b.y+185,90,21,()=>{if(!unlocked){toast('This Tone awakens at level '+(s.unlock+[2,4,8][i])+'.');return;}if(h.combat>0&&W.foes.some(f=>dist(f,h)<170)){toast('Wait until you are out of combat.');return;}h.tones[sid]=i;buildPanel();},{selected:h.tones[sid]===i&&unlocked,dim:!unlocked,tip:s.tones[i].text});
  }
  p.status=DB.skill[hero.skills[p.skill]].tones[h.tones[sid]||0].text;
}
function journalPanel(p,h){
  p.title='THE BOOK THAT FORGOT YOU';p.sub='A record kept by the uncounted.';panelTabs(p,['Quest','Lore','How It Plays']);const b=p.box;
  if(p.tab===0){const q=CAMPAIGN[W.progress];uiText(p,'CHAPTER '+DB.zone[W.zone].chapter+' • '+(q?.title||'The Long Vigil'),b.x+20,b.y+65,GOLD,{scale:2});wrapText(p,q?.objective||'Fill the Reckoning. Slay the Warden.',b.x+20,b.y+94,b.w-40);wrapText(p,q?.line||'Your watch is never ended.',b.x+20,b.y+120,b.w-40,MUTED);uiText(p,'Road cleared: '+W.killsZone+' / '+W.need,b.x+20,b.y+166,TEAL);uiText(p,'Quests completed: '+W.flags.filter(s=>/^quest/.test(s)).length,b.x+20,b.y+183,MUTED);}
  if(p.tab===1){if(!W.lore.length)wrapText(p,'Loose pages lie along the road. Read one and it will remain here.',b.x+20,b.y+70,b.w-40,MUTED);W.lore.slice(p.page*6,p.page*6+6).forEach((id,i)=>uiButton(p,LORE[id][0],b.x+20,b.y+61+i*23,b.w-40,20,()=>{p.loreId=id;buildPanel();}));if(p.loreId!==undefined){p.buttons=p.buttons.filter(k=>k.tab);wrapText(p,LORE[p.loreId][1],b.x+22,b.y+77,b.w-44);uiButton(p,'Read aloud',b.x+22,b.y+163,100,22,()=>audio.speak(LORE[p.loreId][0],LORE[p.loreId][1]));uiButton(p,'All pages',b.x+136,b.y+163,100,22,()=>{delete p.loreId;buildPanel();});}else panelPager(p,W.lore.length);}
  if(p.tab===2){const rows=['Roll through any attack. Two charges return in time.','Swap six skills and their Tones outside combat.','Break the furniture. Read the dead. Take their pennies.','Death takes nothing. Your name is not in the Book.','Your loot is yours. Allies share pennies and experience.','The camera stays fixed. Nothing needs repairing.','Touch is a window. Bring a controller or keyboard.','A second controller joins with Options. Four may walk.'];rows.forEach((s,i)=>wrapText(p,s,b.x+20,b.y+63+i*18,b.w-40,i%2?MUTED:IVORY));}
}
function mapPanel(p,h){
  p.title='THE LYCHGATES';p.sub='The road remembers every place you have rung.';const b=p.box;
  const zones=W.visited.filter(z=>z!=='prologue');zones.slice(p.page*7,p.page*7+7).forEach((id,i)=>uiButton(p,DB.zone[id].name,b.x+20,b.y+45+i*23,205,20,()=>{if(h.combat>0&&W.foes.some(f=>dist(f,h)<170)){toast('The Lychgate cannot hear you in combat.');return;}enterZone(W,id);closePanel();},{selected:W.zone===id}));
  p.art=g=>{const x=b.x+245,y=b.y+50,ww=b.w-265,hh=139;smallBox(g,x,y,ww,hh,'#4c6765');const sx=(ww-10)/W.width,sy=(hh-10)/W.height;for(let cy=0;cy<W.map.h;cy++)for(let cx=0;cx<W.map.w;cx++){if((CHEATS.reveal||W.explored?.has(cx+','+cy))&&!W.map.walkable(cx,cy))px.rect(g,x+5+cx*16*sx,y+5+cy*16*sy,Math.max(1,sx*16),Math.max(1,sy*16),'#5c6a65');}for(const o of W.objects)if(!o.used)px.rect(g,x+5+o.x*sx,y+5+o.y*sy,2,2,GOLD);for(const u of W.heroes)px.rect(g,x+5+u.x*sx,y+5+u.y*sy,3,3,u.color);};
  panelPager(p,zones.length,7);
}
function servicePanel(p,h){
  const b=p.box;const titles={forge:'YSOLDE\'S FORGE',pawn:'OLD PENNY\'S PAWN',agnes:'THE CHANDLERY',stash:'THE SHARED STASH',quillonTown:'MOTHER QUILLON\'S LANTERN',campfire:'YOUR FELLOW PARISHIONERS',vigilDoor:'THE LONG VIGIL'};p.title=titles[p.kind]||p.kind;p.sub=h.pennies+' pennies • '+h.mats.scrap+' scrap • '+h.mats.salt+' salt • '+h.mats.ash+' ash';
  const add=(label,fn,i,o={})=>uiButton(p,label,b.x+22,b.y+48+i*28,237,24,()=>{const result=fn();if(result===false)toast('You lack the offering, or your bag is full.');buildPanel();},o);
  const selectSlot=()=>{p.slot=(p.slot+1)%8;};
  if(p.kind==='forge'){
    add('Craft slot: '+SLOTS[p.slot]+' →',selectSlot,0);
    add('Craft • 6 Scrap',()=>craft(W,h,p.slot),1);
    add('Salvage '+h.bag.filter(i=>i.rarity<4).length+' common items',()=>{for(const i of [...h.bag])if(i.rarity<4)salvage(W,h,i);},2);
    add('Socket equipped '+SLOTS[p.slot],()=>h.gear[p.slot]&&socketGem(W,h,h.gear[p.slot],h.gems[0]),3);
    if(W.recipe.length===3&&!W.flags.includes('shepherdBell'))add('Cast the Shepherd\'s Bell • 20 Scrap',()=>{if(h.mats.scrap<20)return false;h.mats.scrap-=20;W.flags.push('shepherdBell');toast('Ring your new bell at the crater.');},4);
    if(W.flags.includes('shepherdBell'))add('Ring the Shepherd\'s Bell',()=>{enterZone(W,'fields');closePanel();},4);
    wrapText(p,'Iron can be taught to sing. But first it must be broken.',b.x+280,b.y+59,b.w-300,MUTED);wrapText(p,'First gem: '+(h.gems[0]?GEM_NAMES[h.gems[0][0]]+' '+h.gems[0][1]:'none')+'\nEmpty sockets cost 3 Holy Salt.',b.x+280,b.y+112,b.w-300,GOLD);
  }
  if(p.kind==='pawn'){
    add('Offerings: '+SLOTS[p.slot]+' →',selectSlot,0);add('Buy Blessed • '+(80+20*h.level)+' pennies',()=>buy(W,h,p.slot),1);add('Blind Reliquary • 150 pennies',()=>buy(W,h,p.slot,true),2);add('Sell the first bag item',()=>h.bag[0]&&sell(W,h,h.bag[0]),3);wrapText(p,'Every penny was someone\'s last. Spend it well.',b.x+280,b.y+60,b.w-300,MUTED);
  }
  if(p.kind==='agnes'){
    const items=[...h.gear.filter(Boolean),...h.bag],item=items[p.slot%Math.max(1,items.length)];
    add(item?itemName(item)+' →':'No offering',()=>{p.slot++;},0);add('Affix: '+(item?.affixes[p.affix%Math.max(1,item.affixes.length)]?.name||'none')+' →',()=>{p.affix++;},1);
    add('Re-dip • '+(70*((item?.redips||0)+1))+' pennies',()=>item&&redip(W,h,item,p.affix%item.affixes.length),2);wrapText(p,'Wax remembers what it was. I persuade it otherwise.',b.x+280,b.y+58,b.w-300,MUTED);
  }
  if(p.kind==='stash'){
    panelTabs(p,['Chest I','Chest II','Chest III']);const stash=W.stash[p.tab];
    add('Deposit first bag item',()=>{if(!h.bag.length||stash.length>=30)return false;stash.push(h.bag.shift());},.7);
    stash.slice(p.page*5,p.page*5+5).forEach((item,i)=>uiButton(p,'Take '+itemName(item),b.x+22,b.y+95+i*21,b.w-44,18,()=>{if(h.bag.length>=30)return;stash.splice(stash.indexOf(item),1);h.bag.push(item);buildPanel();}));panelPager(p,stash.length,5);
  }
  if(p.kind==='quillonTown'){
    const relics=[...h.bag,...h.gear.filter(Boolean)].filter(i=>i.relic&&i.identified),item=relics[p.slot%Math.max(1,relics.length)];
    add('Consecrate every offering • free',()=>{for(const i of h.bag)consecrate(W,h,i);},0);add('Power: '+(item?.name||'No consecrated Relic')+' →',()=>p.slot++,1);add('Burn selected Relic • 1 Ash',()=>item&&extractRelic(W,h,item),2);
    wrapText(p,'A Relic burns once. Its power need not.',b.x+280,b.y+59,b.w-300,MUTED);h.lantern.forEach((id,i)=>wrapText(p,['Weapon: ','Armor: ','Trinket: '][i]+(id?DB.relic[id].name:'empty'),b.x+22,b.y+145+i*20,b.w-44,id?GOLD:MUTED));
  }
  if(p.kind==='campfire'){
    const hired=W.heroes.filter(u=>u.follower).map(u=>u.kind);Object.values(DB.hero).filter(b=>b.id!==h.kind).forEach((hero,i)=>add((hired.includes(hero.id)?'Dismiss ':'Hire ')+hero.name,()=>{const old=W.heroes.find(u=>u.follower&&u.kind===hero.id);if(old)W.heroes.splice(W.heroes.indexOf(old),1);else{if(W.heroes.length>=4)return false;const f=newHero(hero.id,100+i,h.level,COLORS[(i+1)%4]);f.follower=true;f.bot=true;f.x=h.x+20;f.y=h.y;f.unlockedAll=true;W.heroes.push(f);say(hero.barks[0],hero.name);}return true;},i));wrapText(p,'The parish never travels alone.',b.x+280,b.y+60,b.w-300,MUTED);
  }
  if(p.kind==='vigilDoor'){
    if(!W.flags.includes('tongueTaken')){wrapText(p,'The Vigil Door is sealed. Take the Tongue from Beadle Crake and it will hear you.',b.x+24,b.y+65,b.w-48,IVORY);return;}
    add('Tier '+(p.count||1)+' →',()=>{p.count=(p.count||1)%40+1;},0);add('Greater Vigil: '+(p.greater?'On':'Off'),()=>{if(!Object.values(W.records).some(n=>n>0)){toast('Complete a Vigil first.');return;}p.greater=!p.greater;},1);add('Begin the watch',()=>{const tier=p.count||1;startVigil(W,tier,!!p.greater);closePanel();},2);
    add('Difficulty: '+DIFFICULTIES[W.difficulty].name+' →',()=>{if(!W.flags.includes('tongueTaken')){toast('The Beadle must fall first.');return;}W.difficulty=(W.difficulty+1)%4;},3);wrapText(p,'Fill the Reckoning. Slay its Warden. Ring again.',b.x+280,b.y+60,b.w-300,MUTED);uiText(p,'Best tier: '+(W.records[h.kind]||0),b.x+22,b.y+174,TEAL);
  }
}
function joinPanel(p){p.title='ONE MORE UNCOUNTED';p.sub='Choose your place in the parish.';const b=p.box;Object.values(DB.hero).forEach((hero,i)=>uiButton(p,hero.name+' • '+hero.title,b.x+24,b.y+50+i*34,b.w-48,29,()=>{const h=panelHero(p),level=h.level,id=h.id;const other=Object.assign(newHero(hero.id,id,level,h.color),{x:h.x,y:h.y});W.heroes[W.heroes.indexOf(h)]=other;closePanel();}));}
function devPanel(p,h){
  p.title='THE BELLFOUNDER\'S BENCH';p.sub='Live tools • '+(isTuned()?'TUNED':'Default balance');panelTabs(p,['Cheats','Spawn','Travel','Balance','View','Gallery']);const b=p.box;
  if(p.tab===0){const opts=[['god','Death refuses you'],['oneHit','One-hit kills'],['infinite','Infinite resource'],['noCD','No cooldowns'],['noClip','Walk through walls'],['freezeAI','Freeze the dead'],['reveal','Reveal the map'],['bot','Autopilot'],['stop','Pause simulation']];opts.forEach(([key,label],i)=>uiButton(p,(CHEATS[key]?'★ ':'○ ')+label,b.x+17+(i%2)*211,b.y+60+Math.floor(i/2)*27,205,23,()=>{CHEATS[key]=!CHEATS[key];buildPanel();}));
    uiButton(p,'Restore life',b.x+17,b.y+199,100,20,()=>{h.hp=h.maxHp;h.resource=h.resourceMax;h.evades=2;});uiButton(p,'Step one frame',b.x+124,b.y+199,112,20,()=>{stepWorld(W,1/120);updateVisuals(1/120);});uiButton(p,'Time × '+game.timeScale.toFixed(1),b.x+244,b.y+199,120,20,()=>{game.timeScale=game.timeScale>=3?.1:Math.round((game.timeScale+.1)*10)/10;buildPanel();});
  }
  if(p.tab===1){
    const mode=p.spawnTab||0;['Monsters','Items','Bosses'].forEach((s,i)=>uiButton(p,s,b.x+18+i*140,b.y+59,135,20,()=>{p.spawnTab=i;buildPanel();},{selected:mode===i}));
    const add=(label,fn,i)=>uiButton(p,label,b.x+22,b.y+87+i*25,b.w-44,21,()=>{fn();buildPanel();});
    if(mode===0){const kinds=Object.keys(DB.monster),kind=kinds[p.spawnKind%kinds.length];add('Monster: '+DB.monster[kind].name+' →',()=>p.spawnKind++,0);add('Count: '+p.count+' →',()=>p.count=p.count>=60?1:p.count+1,1);add('Elite: '+['None','Champion','Rare'][p.elite]+' →',()=>p.elite=(p.elite+1)%3,2);add('Affix: '+Object.values(DB.affix)[p.affix%12].name+' →',()=>p.affix++,3);add('Spawn the dead',()=>{for(let i=0;i<p.count;i++){const f=spawnFoe(W,kind,h.x+60+(i%6)*13,h.y-40+Math.floor(i/6)*13,{elite:[null,'champion','rare'][p.elite]});if(p.elite)f.affixes=[Object.keys(DB.affix)[p.affix%12]];}closePanel();},4);}
    if(mode===1){add('Slot: '+SLOTS[p.slot]+' →',()=>p.slot=(p.slot+1)%8,0);add('Rarity: '+RARITY[p.rarity].name+' →',()=>p.rarity=(p.rarity+1)%6,1);add('Level: '+p.itemLevel+' →',()=>p.itemLevel=p.itemLevel%30+1,2);add('Create offering',()=>{dropItem(W,h,h.x+15,h.y,{slot:p.slot,rarity:p.rarity,level:p.itemLevel});closePanel();},3);add('Give 1000 pennies, materials and a level',()=>{h.pennies+=1000;h.mats.scrap+=50;h.mats.salt+=20;h.mats.ash+=5;h.gems.push([0,2],[1,2],[2,2]);gainXP(W,h,xpNext(h));},4);}
    if(mode===2){const bosses=Object.keys(DB.boss),id=bosses[p.bossIndex%bosses.length];add('Boss: '+DB.boss[id].name+' →',()=>p.bossIndex++,0);add('Phase: '+(p.phase+1)+' →',()=>p.phase=(p.phase+1)%DB.boss[id].phases.length,1);add('Summon the Warden',()=>{const f=spawnFoe(W,id,h.x+100,h.y-40,{boss:true});f.hp=f.maxHp*DB.boss[id].phases[p.phase].at;f.phase=p.phase;closePanel();},2);add('Clear every foe',()=>{W.foes=[];W.hazards=[];},3);add('Unlock all skills and Tones',()=>{h.unlockedAll=true;toast('Every note is yours.');},4);}
  }
  if(p.tab===2){const zones=Object.values(DB.zone);zones.slice(p.page*5,p.page*5+5).forEach((z,i)=>uiButton(p,z.name,b.x+18,b.y+60+i*26,242,23,()=>{const index=CAMPAIGN.findIndex(q=>q.zone===z.id);if(index>=0){W.progress=index;W.flags=Array.from(new Set([...W.flags,...Array.from({length:index},(_,n)=>'quest'+n)]));}enterZone(W,z.id);closePanel();}));panelPager(p,zones.length,5);
    uiButton(p,'The ending',b.x+280,b.y+61,145,24,()=>{beginEnding(W);closePanel();});uiButton(p,'Attract tour',b.x+280,b.y+92,145,24,()=>{closePanel();startAttract();});uiButton(p,'Vigil tier '+p.count,b.x+280,b.y+123,145,24,()=>{startVigil(W,p.count);closePanel();});uiButton(p,'Quest step '+W.progress+' →',b.x+280,b.y+154,145,24,()=>{W.progress=(W.progress+1)%CAMPAIGN.length;buildPanel();});
  }
  if(p.tab===3){
    const groups=['Hero','Monsters','Rewards','Feel'];groups.forEach((s,i)=>uiButton(p,s,b.x+17+i*106,b.y+58,101,19,()=>{p.group=i;p.page=0;buildPanel();},{selected:p.group===i}));
    const rows=TUNING.filter(s=>s[0]===groups[p.group]);rows.slice(p.page*5,p.page*5+5).forEach((s,i)=>{
      const yy=b.y+85+i*23,x=b.x+17;uiText(p,s[2],x,yy+5,IVORY);
      uiButton(p,TUNE[s[1]].toFixed(s[6]<1?2:0),b.x+173,yy,208,19,()=>{}, {slider:s,selected:false});uiButton(p,'R',b.x+389,yy,28,19,()=>{TUNE[s[1]]=s[3];saveTune();buildPanel();});
    });
    panelPager(p,rows.length,5,b.y+b.h-25);uiButton(p,'Reset group',b.x+130,b.y+b.h-25,87,18,()=>{resetTune(groups[p.group]);buildPanel();});uiButton(p,'Reset all',b.x+222,b.y+b.h-25,74,18,()=>{resetTune();buildPanel();});uiButton(p,'Copy',b.x+301,b.y+b.h-25,49,18,()=>{const value=JSON.stringify(Object.fromEntries(Object.entries(TUNE).filter(([k,v])=>v!==DEFAULTS[k])),null,2);if(HAS_DOM&&navigator.clipboard)navigator.clipboard.writeText(value).catch(()=>{});if(HAS_DOM)console.info(value);toast('Tuning copied to clipboard and console.');});
  }
  if(p.tab===4){uiButton(p,(CHEATS.overlays?'★ ':'○ ')+'Hitboxes, AI and network state',b.x+22,b.y+65,b.w-44,26,()=>{CHEATS.overlays=!CHEATS.overlays;buildPanel();});uiText(p,'Seed: '+W.seed,b.x+22,b.y+107,MUTED);uiText(p,'Authority: '+W.authority,b.x+22,b.y+124,MUTED);uiText(p,'Simulation never reads a visual rig.',b.x+22,b.y+145,TEAL);}
  if(p.tab===5){wrapText(p,'A living catalogue. Every skill and Tone, every monster and affix, every boss phase. The reel advances by itself.',b.x+25,b.y+67,b.w-50);uiButton(p,'Enter the Gallery',b.x+25,b.y+135,b.w-50,29,()=>{closePanel();startGallery();});}
}
function aboutPanel(p){
  const pages=aboutPages();p.totalPages=pages.length;p.page=((p.page%pages.length)+pages.length)%pages.length;p.title=TITLE.toUpperCase()+' • ABOUT';p.sub=(p.page+1)+' / '+pages.length+'  •  '+pages[p.page].title;
  const b=p.box;let y=b.y+43;for(const row of pages[p.page].rows){const [label,value]=Array.isArray(row)?row:['',row];if(label){uiText(p,label.toUpperCase(),b.x+20,y,TEAL);y+=12;}y+=wrapText(p,value,b.x+20,y,b.w-40,IVORY)+8;}
  uiButton(p,'← Previous',b.x+20,b.y+b.h-25,102,18,()=>{p.page--;buildPanel();});uiButton(p,'Next →',b.x+130,b.y+b.h-25,102,18,()=>{p.page++;buildPanel();});
}
function updatePanel(dt){
  const p=PANEL_STATE;if(!p)return;const I=game.players[Math.max(0,W?.heroes.findIndex(h=>h.id===p.owner)||0)]||game.input;
  buildPanel();let focused=p.buttons[p.focus];const pointer=I.pointer(),click=I.clicked();
  if(pointer&&(I.lastDevice==='mouse'||I.lastDevice==='touch'))for(let i=0;i<p.buttons.length;i++){const b=p.buttons[i];if(pointer[0]>=b.x&&pointer[0]<b.x+b.w&&pointer[1]>=b.y&&pointer[1]<b.y+b.h){p.focus=i;focused=b;b.onFocus?.();break;}}
  for(const [act,dx,dy] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]])if(I.repeat(act)){
    if(focused?.slider&&dx){const s=focused.slider;TUNE[s[1]]=clamp(Math.round((TUNE[s[1]]+dx*s[6])*1000)/1000,s[4],s[5]);saveTune();buildPanel();}
    else{const a=focused||p.buttons[0];let next=-1,score=Infinity;for(let i=0;i<p.buttons.length;i++){const bb=p.buttons[i],vx=bb.x+bb.w/2-a.x-a.w/2,vy=bb.y+bb.h/2-a.y-a.h/2,dot=vx*dx+vy*dy;if(dot<=2)continue;const side=Math.abs(vx*dy-vy*dx),s=dot+side*3;if(s<score){score=s;next=i;}}if(next>=0){p.focus=next;p.buttons[next].onFocus?.();audio.sound('select');}}
  }
  if(I.pressed('prev')||I.pressed('next')){if(p.kind==='about'){p.page+=I.pressed('next')?1:-1;}else{const tabs=p.buttons.filter(b=>b.tab);if(tabs.length){p.tab=(p.tab+(I.pressed('next')?1:tabs.length-1))%tabs.length;p.page=0;p.focus=0;}}buildPanel();}
  if(I.repeat('pagePrev')||I.repeat('pageNext')){p.page=(p.page+(I.repeat('pageNext')?1:(p.totalPages||1)-1))%(p.totalPages||1);buildPanel();}
  if(click){const b=p.buttons.find(b=>click[0]>=b.x&&click[0]<b.x+b.w&&click[1]>=b.y&&click[1]<b.y+b.h);if(b){if(b.slider){const s=b.slider,T=(click[0]-b.x)/b.w;TUNE[s[1]]=clamp(Math.round((s[4]+(s[5]-s[4])*T)/s[6])*s[6],s[4],s[5]);saveTune();}else b.fn();audio.sound('select');}}
  else if(I.pressed('confirm')){focused?.fn();audio.sound('select');}
  if(PANEL_STATE===p&&p.kind==='inventory'){
    const item=selectedItem(p),hold=I.down('s2')||(I.lastDevice==='mouse'&&I.down('s1'));
    if(item&&!item.identified&&(hold||p.identifying)){p.consecrate+=dt;if(p.consecrate>=1){consecrate(W,panelHero(p),item);p.consecrate=0;p.identifying=false;buildPanel();}}else p.consecrate=0;
    if(I.pressed('s1')&&I.lastDevice==='gamepad'&&item){dropBagItem(panelHero(p),item);buildPanel();}
  }
  if(I.pressed('cancel'))closePanel();
}
function drawPanel(g,r){
  const p=PANEL_STATE;if(!p)return;const b=p.box;px.blend(g,.8,'normal',()=>px.rect(g,0,0,r.W,r.H,'#050b11'));ornate(g,b.x,b.y,b.w,b.h,TEAL);text(g,p.title,b.x+15,b.y+11,GOLD);text(g,p.sub,b.x+15,b.y+23,MUTED);
  p.art?.(g);
  for(const t of p.text)text(g,t.str,t.x,t.y,t.c,t.o);
  for(let i=0;i<p.buttons.length;i++){
    const bt=p.buttons[i],focused=i===p.focus,col=focused?IVORY:bt.selected?TEAL:bt.dim?'#3d4d54':'#52686b';
    smallBox(g,bt.x,bt.y,bt.w,bt.h,col,1);if(focused){px.rect(g,bt.x+2,bt.y+2,2,bt.h-4,GOLD);}
    if(bt.item){const c=RARITY[bt.item.rarity].color;icon(g,bt.item.slot===0?DB.hero[bt.item.hero].skills[0]:bt.item.slot<5?'guard':'bell',bt.x+2,bt.y+2,bt.w-4,c);if(!bt.item.identified)text(g,'?',bt.x+bt.w/2,bt.y+7,IVORY,{align:'center'});if(bt.item.rarity>=4){px.dot(g,bt.x+3,bt.y+3,c);px.dot(g,bt.x+bt.w-4,bt.y+bt.h-4,c);}}
    else if(bt.skillIcon){icon(g,bt.skillIcon,bt.x+2,bt.y+3,25,bt.selected?GOLD:IVORY);text(g,bt.label.replace('Left click','LMB').replace('Right click','RMB'),bt.x+bt.w-8,bt.y+bt.h/2-3,MUTED,{align:'right'});}
    else if(bt.slider){const s=bt.slider,fill=(TUNE[s[1]]-s[4])/(s[5]-s[4]);px.rect(g,bt.x+8,bt.y+8,bt.w-52,3,'#34494a');px.rect(g,bt.x+8,bt.y+8,(bt.w-52)*fill,3,TEAL);px.rect(g,bt.x+6+(bt.w-52)*fill,bt.y+5,4,9,GOLD);text(g,TUNE[s[1]].toFixed(s[6]<1?2:0),bt.x+bt.w-5,bt.y+6,IVORY,{align:'right'});}
    else if(bt.label){const lines=E.font.wrap(bt.label,bt.w-12);for(let j=0;j<Math.min(2,lines.length);j++)text(g,lines[j],bt.x+bt.w/2,bt.y+Math.max(4,(bt.h-lines.length*9)/2)+j*9,bt.dim?MUTED:focused?IVORY:bt.selected?TEAL:IVORY,{align:'center'});}
  }
  if(p.detail)drawItemDetail(g,p);
  const tip=p.buttons[p.focus]?.tip||p.status;if(tip)text(g,tip.slice(0,77),b.x+15,b.y+b.h-13,MUTED);
}
function drawItemDetail(g,p){const d=p.detail,item=selectedItem(p);if(!item)return;const h=panelHero(p),c=RARITY[item.rarity].color;let y=d.y;const name=E.font.wrap(itemName(item),d.w);for(const line of name){text(g,line,d.x,y,c);y+=10;}text(g,RARITY[item.rarity].name.toUpperCase()+' • L'+item.level,d.x,y+3,MUTED);y+=17;
  if(!item.identified){for(const line of E.font.wrap('Hold to Consecrate. Let the bell reveal it.',d.w)){text(g,line,d.x,y,IVORY);y+=10;}if(p.consecrate>0)E.ui.bar(g,d.x,y+8,d.w,4,p.consecrate,GOLD);return;}
  const old=h.gear[item.slot],delta=old?Math.round((itemScore(item)/Math.max(1,itemScore(old))-1)*100):100;text(g,(delta>=0?'↑ ':'↓ ')+Math.abs(delta)+'% '+(item.slot===0?'Damage':'Toughness'),d.x,y,delta>=0?TEAL:'#df9b8e');y+=13;
  for(const a of item.affixes.slice(0,4)){text(g,'+'+a.value+' '+a.name.slice(0,14),d.x,y,IVORY);y+=11;}
  if(item.relic){for(const line of E.font.wrap(DB.relic[item.relic].text,d.w)){text(g,line,d.x,y,GOLD);y+=10;}}
  if(item.set){text(g,'Set '+setCount(h)+'/4',d.x,y,TEAL);y+=10;}
  if(item.gem)text(g,GEM_NAMES[item.gem[0]]+' '+item.gem[1],d.x,y,TEAL);
}
