function newHero(kind = 'ringer', id = 0, level = 1, color = COLORS[id % 4]) {
  const spec = DB.hero[kind], h = new E.Body({x:0,y:0,r:6,friction:0,bounce:.1});
  Object.assign(h,{id,kind,name:spec.name,team:'hero',color,level,xp:0,hp:80+12*level,maxHp:80+12*level,resource:kind==='ringer'?30:100,resourceMax:100,nerve:30,alive:true,
    facing:-Math.PI/4,slots:spec.skills.slice(0,6),tones:{},vows:[0,1,3],cooldowns:{},potion:0,evades:2,evadeRegen:0,dodge:0,inv:0,stun:0,guard:0,shield:0,
    hits:0,combo:0,attack:null,queued:null,combat:0,notes:[],chord:false,gear:Array(8).fill(null),bag:[],pennies:0,mats:{scrap:0,salt:0,ash:0},gems:[],lantern:[null,null,null],
    buffs:{},stats:{kills:0,damage:0,deaths:0,revives:0,broken:0,reckoning:0,warden:0},deathTimer:0,revive:0,walkTarget:null,bot:false,local:true,dieSave:0,verses:[0,0,0,0],verseXP:0});
  for(const sid of spec.skills) h.tones[sid] = 0;
  return h;
}
function newWorld(seed=1711, options={}) {
  const w = {seed,authority:options.authority!==false,session:!!options.session,me:options.me??0,heroes:[],foes:[],allies:[],corpses:[],drops:[],props:[],objects:[],hazards:[],shots:[],fx:[],numbers:[],decals:[],events:[],toasts:[],
    rng:E.rng(hash(seed+':ai')),lootRng:E.rng(hash(seed+':loot')),time:0,zoneTime:0,uid:10,zone:'prologue',progress:0,flags:[],visited:[],lore:[],recipe:[],stash:[[],[],[]],
    kills:0,killsZone:0,broken:0,requiem:0,requiemT:0,bestRequiem:0,sacrilege:0,sacrilegeT:0,reckoning:0,tier:1,greater:false,vigilClock:300,records:{},difficulty:0,
    ended:false,results:null,dialogue:null,zoneCard:0,chapterCard:0,respawn:{x:0,y:0},returnTo:null,returnPos:null,endingPage:0,endingT:0,cheats:{},screen:'play',stats:{elapsed:0},need:0};
  return w;
}
function heroMax(h) { return (80+12*h.level+stat(h,'vigor')+10*h.verses[1])*TUNE.life; }
function stat(h,key){let n=0;for(const item of h.gear)if(item){for(const a of item.affixes)if(a.key===key)n+=a.value;if(item.gem){const [g,grade]=item.gem,keys=item.slot===0?['weaponGem','critDamage','lifeHit']:item.slot<5?['vigor','armor','resist']:['pennies','fortune','speed'],values=item.slot===0?[2,12,2]:item.slot<5?[12,8,6]:[20,15,3];if(key===keys[g])n+=values[g]*grade;}}return n;}
function hasVow(h,n){return h.vows.slice(0,h.level>=24?3:h.level>=16?2:h.level>=8?1:0).includes(n);}
function powers(h) { const p=h.gear.filter(i=>i&&i.identified&&i.relic).map(i=>DB.relic[i.relic].power);for(const id of h.lantern)if(id)p.push(DB.relic[id].power);return new Set(p); }
function setCount(h) { const n={};for(const i of h.gear)if(i?.set)n[i.set]=(n[i.set]||0)+1;return Math.max(0,...Object.values(n)); }
function damageBase(h) { const weapon=h.gear[0], base=(weapon?weapon.damage:8*Math.pow(1.15,h.level-1))+stat(h,'weaponGem');return base*(1+stat(h,'devotion')*.01+stat(h,'element')*.01+stat(h,'skill')*.01+.012*h.verses[0]+(setCount(h)>=2?.12:0)+(h.zoneDevotion||0)); }
function xpNext(h) { return 60*Math.pow(1.35,h.level-1); }
function gainXP(w,h,amount) {
  if(h.level>=30){h.verseXP+=amount;while(h.verseXP>4000){h.verseXP-=4000;h.versePoints=(h.versePoints||0)+1;}return;}
  h.xp+=amount*TUNE.xp;
  while(h.level<30 && h.xp>=xpNext(h)){h.xp-=xpNext(h);h.level++;h.maxHp=heroMax(h);h.hp=h.maxHp;event(w,'level',{id:h.id,level:h.level,x:h.x,y:h.y});}
}
function makeRows(w,z) {
  const layoutRng=E.rng(hash(w.seed+':'+z.id+':layout'));
  const layout=z.id==='vigil'?choose(layoutRng,['halls','yard','islands']):z.layout;
  const [width,height]=z.size, rows=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>x===0||y===0||x===width-1||y===height-1?'#':'.'));
  if(layout==='halls'||layout==='hall') {
    const offset=5+Math.floor(layoutRng()*4),stride=11+Math.floor(layoutRng()*4);
    for(let y=offset;y<height-6;y+=stride)for(let x=offset;x<width-6;x+=stride)if(Math.abs(x+y-width)>14&&layoutRng()>.15){for(let v=0;v<3;v++)for(let u=0;u<3;u++)rows[y+v][x+u]='#';}
    for(let y=3;y<height-3;y++)if(y%12>3&&y%12<9){rows[y][3]='#';rows[y][width-4]='#';}
  }
  if(layout==='islands') {
    for(let y=3;y<height-3;y++)for(let x=3;x<width-3;x++)if((x%20>14&&y%20>8)||(y%20>14&&x%20>8))rows[y][x]='~';
    // A broad diagonal causeway always connects the landings.
    for(let y=3;y<height-3;y++)for(let x=3;x<width-3;x++)if(Math.abs(x+y-width)<13)rows[y][x]='.';
  }
  if(z.layout==='town') {
    for(const [x0,y0,bw,bh] of [[7,5,10,7],[33,7,11,8],[5,30,9,10],[34,33,11,9]])for(let y=y0;y<y0+bh;y++)for(let x=x0;x<x0+bw;x++)rows[y][x]='H';
  }
  return rows.map(r=>r.join(''));
}
function enterZone(w,id,options={}) {
  const z=DB.zone[id], theme=THEMES[z.theme]; w.zone=id;w.explored=new Set();w.screen='play';w.zoneTime=0;w.killsZone=0;w.need=z.need||0;w.foes=[];w.corpses=[];w.drops=[];w.objects=[];w.props=[];w.fx=[];w.hazards=[];w.shots=[];w.numbers=[];w.decals=[];w.allies=[];w.bossId=null;w.bossDefeated=false;w.zoneCard=4.2;w.results=null;w.ended=false;w.angelusKneeling=false;w.finishStrike=false;w.activeEvent=null;w._vigilSpawn=0;
  if(!w.visited.includes(id))w.visited.push(id);
  const rows=makeRows(w,z), C=E.tones(theme.floor);
  const stoneOpts={stones:[E.hex(theme.floor),E.hex(E.shade(theme.floor,.025))],mortar:E.hex(E.shade(theme.floor,-.12)),hi:E.hex(E.shade(theme.floor,.08)),lo:E.hex(E.shade(theme.floor,-.05)),speck:E.hex(E.shade(theme.floor,-.07))};
  w.map=new E.TileMap({rows,legend:{'#':1,'H':2,'.':{floor:'stone'},'~':{floor:'pit',block:true}},types:{
    1:{h:z.layout==='yard'?16:52,top:E.shade(theme.wall,.15),side:theme.wall,face:'stone',roof:'slab',cut:true,cutH:12},
    2:{h:68,top:'#725052',side:'#a99e83',face:'timber',roof:'tiles',beam:'#3e3533',cut:true}},
    floorTex:(x,y,tag)=>tag==='pit'?E.hex('#171e2c'):z.theme==='fields'?E.tex.grass(x,y,{base:'#71865a',dark:'#5b744d',light:'#82955f',flower:'#e0ce97'}):z.theme==='salt'?E.tex.dirt(x,y,{base:theme.floor,dark:C.sh,light:C.lt}):E.tex.flagstone(x,y,stoneOpts),outside:E.shade(theme.floor,-.12),ao:5});
  w.flow=new E.FlowField(w.map);w.botFlow=new E.FlowField(w.map);w.width=z.size[0]*16;w.height=z.size[1]*16;
  w.spawn={x:w.width*.22,y:w.height*.75};w.exit={x:w.width*.75,y:w.height*(z.layout==='town'?.32:.22)};w.respawn={...w.spawn};
  if(z.layout==='boss'){w.spawn={x:w.width*.36,y:w.height*.67};w.exit={x:w.width*.64,y:w.height*.26};w.respawn={...w.spawn};}
  for(let i=0;i<w.heroes.length;i++){const h=w.heroes[i];Object.assign(h,{x:w.spawn.x+i*12,y:w.spawn.y,z:0,vx:0,vy:0,vz:0,alive:true,deathTimer:0,walkTarget:null,attack:null,combat:0,zoneDevotion:0});if(h.follower){h.gear[0]=rollItem(w,h,{slot:0,rarity:2});h.gear[2]=rollItem(w,h,{slot:2,rarity:2});}h.maxHp=heroMax(h);h.hp=h.maxHp;h.shield=0;h.inv=2;}
  const r=E.rng(hash(w.seed+':'+id+':dress'));
  // Set dressing follows the same stream on every copy, independent of combat and loot.
  for(let i=0;i<(z.layout==='boss'?40:140);i++){
    let x=(3+r()*(z.size[0]-6))*16,y=(3+r()*(z.size[1]-6))*16;
    if(!w.map.walkable(Math.floor(x/16),Math.floor(y/16)))continue;
    const route=Math.abs(x+y-w.width), props=z.theme==='grave'?['headstone','headstone','deadTree','candle','urn']:z.theme==='town'?['lamp','crate','barrel','candle','headstone']:z.theme==='salt'?['bones','rock','headstone','banner']:z.theme==='works'?['anvil','chain','urn','brazier']:z.theme==='heaven'||z.theme==='chamber'?['pillar','hangingBell','chain','candle']:z.theme==='fields'?['flowers','bush','headstone']:['pew','pew','candelabra','urn','pillar','bones'];
    const type=choose(r,props),breakable=['pew','urn','crate','barrel','headstone','candelabra'].includes(type);
    w.props.push({id:w.uid++,type,x,y,z:0,facing:Math.floor(r()*4)*Math.PI/2,hp:breakable?12:Infinity,broken:false,seed:i,breakable});
  }
  const objects=z.objects||[];
  for(let i=0;i<objects.length;i++) {
    const type=objects[i],t=(i+1)/(objects.length+1),x=lerp(w.spawn.x,w.exit.x,t),y=lerp(w.spawn.y,w.exit.y,t);
    let ox=x+(i%2?-45:45),oy=y+(i%2?-45:45);
    if(z.layout==='town'){const spots=[[.38,.43],[.60,.35],[.65,.55],[.42,.65],[.52,.50],[.3,.57],[.46,.55],[.69,.67]];[ox,oy]=spots[i].map((v,j)=>v*(j?w.height:w.width));}
    if(z.layout==='boss'){const a=i/objects.length*Math.PI*2;ox=w.width*.53+Math.cos(a)*120;oy=w.height*.48+Math.sin(a)*120;}
    if(!w.map.standable(ox,oy,0,6)){for(let radius=16;radius<120;radius+=16){let found=false;for(let a=0;a<8;a++){const xx=ox+Math.cos(a*Math.PI/4)*radius,yy=oy+Math.sin(a*Math.PI/4)*radius;if(w.map.standable(xx,yy,0,6)){ox=xx;oy=yy;found=true;break;}}if(found)break;}}
    w.objects.push({id:w.uid++,type,x:ox,y:oy,z:0,used:false,active:true,progress:0,label:objectLabel(type),index:i,...(type==='lore'?{loreId:(ZONE_LORE[id]||[0])[objects.slice(0,i).filter(t=>t==='lore').length%(ZONE_LORE[id]||[0]).length]}:{})});
  }
  w.objects.push({id:w.uid++,type:'exit',x:w.exit.x,y:w.exit.y,z:0,used:false,label:'Lychgate'});
  if(id==='town')w.objects.push({id:w.uid++,type:'returnPortal',x:w.spawn.x+35,y:w.spawn.y-30,z:0,label:'Return through the Passing Bell',used:!w.returnTo});
  for(const o of w.objects)if(o.type==='crab'){spawnFoe(w,'crab',o.x,o.y);o.used=true;}
  const population=Math.floor((z.count||0)*TUNE.density);
  for(let i=0;i<population;i++){
    const pack=Math.floor(i/9),packs=Math.ceil(population/9),t=.1+.8*(pack+.5)/packs;
    const x=lerp(w.spawn.x,w.exit.x,t)+(r()-.5)*100,y=lerp(w.spawn.y,w.exit.y,t)+(r()-.5)*100;
    const elite=i>16&&i%35===0&&r()<TUNE.elites;
    spawnFoe(w,choose(r,z.pool),x,y,{elite:elite?(i%2?'champion':'rare'):null});
  }
  if(id==='sidecrypt')spawnFoe(w,'verger',w.width*.6,w.height*.4,{elite:'rare'});
  if(z.boss){const f=spawnFoe(w,z.boss,w.width*.55,w.height*.45,{boss:true});w.bossId=f.id;}
  if(id==='vigil'){w.reckoning=0;w.vigilClock=300;for(let i=0;i<42;i++){const a=r()*Math.PI*2,dd=80+r()*180;spawnFoe(w,choose(r,z.pool),w.spawn.x+Math.cos(a)*dd,w.spawn.y+Math.sin(a)*dd,{elite:i===15?'champion':null});}}
  event(w,'zone',{id});return w;
}
function objectLabel(t){return ({forge:'Ysolde • Forge',pawn:'Old Penny • Pawn',agnes:'Sister Agnes • Chandlery',stash:'Shared stash',quillonTown:'Mother Quillon',campfire:'Hire a parishioner',dog:'Pet the dog',vigilDoor:'The Vigil Door',quillon:'Pick up the lantern',lychgate:'Light the Lychgate',unquiet:'The Unquiet Row',lore:'Read a loose page',epitaph:'Read the headstone',chest:'Open the reliquary',chapel:'Light the side chapel',trap:'Cut the chandelier rope',cursed:'The Cursed Reliquary',shrine:'Receive a blessing',oldBell:'Old Patience',regentTalk:'Speak to Regent Sallow',caravan:'Escort the pilgrims',sluice:'Open the bronze sluice',brazier:'Relight the brazier',hangingBell:'Shelter beneath the bell',tongue:'Strike with the Tongue',pylon:'Claim a Vigil blessing',bigEwe:'The Big Ewe',sideCrypt:'Enter the buried chapel',sermon:'Interrupt the Sermon'})[t]||t;}
function spawnFoe(w,kind,x,y,options={}) {
  const b=options.boss?DB.boss[kind]:DB.monster[kind];if(!b)throw Error('Unknown foe '+kind);
  const level=Math.max(DB.zone[w.zone].level,...w.heroes.map(h=>h.level)),diff=DIFFICULTIES[w.difficulty],extra=w.heroes.filter(h=>!h.follower).length-1;
  const hp=18*Math.pow(1.16,level-1)*(b.life||1)*(options.elite==='rare'?7:options.elite?4:1)*(1+Math.max(0,extra)*TUNE.coopLife)*diff.life*TUNE.foeLife*(w.zone==='vigil'?Math.pow(1.17,w.tier-1):1);
  const f=new E.Body({x,y,r:options.boss?14:b.body==='bulky'?8:5,friction:0,bounce:.35});
  Object.assign(f,{id:w.uid++,kind,team:'foe',level,hp,maxHp:hp,lifeTune:TUNE.foeLife,alive:true,boss:!!options.boss,elite:options.elite||null,affixes:options.elite?[choose(w.rng,Object.keys(DB.affix)),...(options.elite==='rare'?[choose(w.rng,Object.keys(DB.affix))]:[])]:[],
    name:options.elite==='rare'?choose(w.rng,['Brother Ash','Tam the Unburied','Sallow Penitent']):b.name,facing:Math.PI/2,atk:1+w.rng(),affixT:3+w.rng()*3,stun:0,slow:0,burn:0,burnTick:0,ringing:0,lit:0,flash:0,think:0,phase:0,pattern:0,spawn:options.boss?0:.5,anim:0,attack:null,reflect:0,shieldT:0});
  const cx=clamp(Math.floor(x/16),2,DB.zone[w.zone].size[0]-3),cy=clamp(Math.floor(y/16),2,DB.zone[w.zone].size[1]-3);
  if(!w.map.walkable(cx,cy)){f.x=clamp(x,50,w.width-50);f.y=w.width-f.x;}
  w.foes.push(f);event(w,'spawn',{id:f.id,kind,x:f.x,y:f.y,boss:f.boss,elite:f.elite,hp:f.hp});return f;
}
function closest(list,from,range=Infinity,predicate=()=>true){let out=null,best=range;for(const u of list)if(predicate(u)){const d=dist(u,from);if(d<best){out=u;best=d;}}return out;}
function objectiveReady(w) {
  if(w.zone==='vigil')return w.bossDefeated;
  const z=DB.zone[w.zone];if(z.boss)return w.bossDefeated;
  if(w.killsZone<w.need)return false;
  const mandatory={prologue:['quillon'],nave:['chapel'],audience:['regentTalk'],march:['caravan'],works:['sluice']};
  return !(mandatory[w.zone]||[]).some(t=>w.objects.some(o=>o.type===t&&!o.used));
}
function questTarget(w,h) {
  const required={prologue:['quillon'],nave:['chapel'],audience:['regentTalk'],march:['caravan'],works:['sluice']};
  const object=w.objects.find(o=>(required[w.zone]||[]).includes(o.type)&&!o.used);
  if(object)return object;
  if(w.zone==='chamber'&&w.angelusKneeling)return w.objects.find(o=>o.type==='tongue');
  if(w.zone==='vigil'){const f=closest(w.foes,h,Infinity,u=>u.alive);return f||w.spawn;}
  if(w.killsZone<w.need){const f=closest(w.foes,h,Infinity,u=>u.alive);if(f)return f;}
  if(DB.zone[w.zone].boss&&!w.bossDefeated)return w.foes.find(f=>f.boss&&f.alive)||w.objects.find(o=>o.type==='tongue');
  return w.objects.find(o=>o.type==='exit');
}
