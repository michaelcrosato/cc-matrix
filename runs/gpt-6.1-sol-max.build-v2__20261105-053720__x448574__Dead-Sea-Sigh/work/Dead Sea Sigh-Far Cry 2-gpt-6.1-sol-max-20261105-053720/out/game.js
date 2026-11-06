const E=My3D2dge,W3=E.World3D,{clamp,lerp,approach,TAU}=E;
const GAME_TITLE='Dead Sea Sigh',M=16,HM=2048,SIZE=HM*M;
const GRAV=314,JUMP=95,WALK=68,RUN=118,CROUCH=40,EYE=26,FOV=70;
const KEYS={up:['KeyW','ArrowUp','Pad12'],down:['KeyS','ArrowDown','Pad13'],left:['KeyA','ArrowLeft','Pad14'],right:['KeyD','ArrowRight','Pad15'],jump:['Space','Pad0'],crouch:['KeyC','ControlLeft','Pad1'],sprint:['ShiftLeft','ShiftRight','Pad10'],fire:['Mouse0','Pad7'],aim:['Mouse2','Pad6'],use:['KeyE','Pad2'],reload:['KeyR','Pad2'],swap:['KeyQ','Pad3'],melee:['KeyV','Pad11'],bottle:['KeyF','Pad4'],grenade:['KeyG','Pad5'],map:['KeyM','Pad12'],locator:['KeyN','Pad15'],monocular:['KeyB','Pad14'],heal:['KeyH','Pad13'],radio:['KeyL'],seat:['Tab'],zoomIn:['WheelUp'],zoomOut:['WheelDown'],one:['Digit1'],two:['Digit2'],three:['Digit3'],start:E.Input.DEFAULT.start,pause:E.Input.DEFAULT.pause,confirm:E.Input.DEFAULT.confirm,cancel:E.Input.DEFAULT.cancel};
const TUNE_DEFAULTS={fireSpread:1,wind:.65,wear:1,jam:1,enemyAccuracy:1,enemyDamage:1,enemySight:1,playerDamage:1,lung:1,rescueChance:.8,postRespawn:.4,carTop:1,dayLength:90};
const TUNE={...TUNE_DEFAULTS},CHEATS={god:false,ammo:false,noclip:false,noFits:false,noJams:false,freezeAI:false,reveal:false};
const inSession=!!window.__hub,NO_RENDER=/[?&]norender/.test(location.search);
const SETTINGS=[...W3.SETTINGS.filter(s=>s.key!=='look3d').map(s=>s.key==='picture3d'?{...s,value:'balanced'}:s),{key:'music',value:.1},{key:'glyphs',value:'playstation',options:[['playstation','PlayStation'],['xbox','Xbox']]},{key:'difficulty',label:'Difficulty',group:'Game',options:['Contractor','Veteran','Dead Man'],value:'Veteran'}];
const game=new E.Game({canvas:'screen',res:'ps1',expand:true,bg:null,input:KEYS,touch:'never',autoPause:!inSession,live:inSession,menu:{settings:SETTINGS,controls:{fire:'Fire',aim:'Aim',jump:'Jump / vault',crouch:'Crouch',sprint:'Sprint',use:'Use / enter / exit',reload:'Reload / clear jam',swap:'Next weapon',melee:'Machete / kick',bottle:'Fire bottle',grenade:'Grenade',map:'Held map',locator:'Locator',monocular:'Monocular',heal:'Syrette / hold for ampoule',radio:'Vehicle radio',seat:'Technical gun seat'},items:inSession?[]:[['Dev mode',()=>openDev()],['About / Credits',()=>showAbout()]],saves:inSession?false:{version:1},quit:inSession?false:'title'}});
const A=game.audio,P=game.particles,scenes={},BOOT=[];
const prompt=(action,text)=>game.input.label(action)+'  '+text;
let world=null,hero=null,pb=null,S=null,rnd=E.rng(1),drawT=0,active=null;
const raiders=[],loot=[],nades=[],vehicles=[],people=[];
const N2=E.noise2,sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const fbm=(x,y,o)=>{let v=0,a=1,t=0;for(let k=0;k<o;k++){v+=a*N2(x,y);t+=a;a*=.5;x=x*2.03+17.1;y=y*2.03+3.7;}return v/t;};
const veil=(g,r,y0=0,a=.5)=>{g.save();g.fillStyle='#100f0c';g.globalAlpha=a;g.fillRect(0,y0,r.bw,r.bh-y0);g.restore();g._c=null;};

const SITES=[
 ['strip','Vasco Strip',1500,1640,50,'neutral'],['mission',"Saint Odile's",420,1520,46,'clinic'],['salt','The Salt Shed',1000,1130,30,'safe'],['fleet','The Fleet',1180,1290,90,'smuggler'],['remnant','The Remnant',1120,1400,130,'neutral'],['reedcamp','Reed Camp',760,1400,40,'front'],['port','Port Clement',1640,1010,80,'neutral'],['k9','Kilometre Nine',1530,600,50,'authority'],['red','Red Steps',430,850,50,'front'],['st4','Station Four',900,720,44,'front'],['lamp','The Lamp',1060,660,26,'safe'],['tannery','The Tannery',440,1180,28,'safe'],['watertower','The Water Tower',1380,1600,22,'safe'],['sill','The Sill',1000,190,60,'authority']
].map(([id,name,m,n,r,faction])=>({id,name,at:[m,n],m,n,r,faction}));
const OUTPOSTS=SITES,OP=Object.fromEntries(SITES.map(o=>[o.id,o]));
const ROADS=[['port','k9'],['k9','lamp'],['lamp','st4'],['st4','red'],['red','tannery'],['tannery','mission'],['mission','watertower'],['watertower','strip'],['strip','port'],['tannery','salt'],['salt','fleet'],['salt','port'],['lamp','sill']];
const POSTS=[['G1','port','k9','authority'],['G2','k9','lamp','authority'],['G3','tannery','mission','front'],['G4','st4','red','front'],['G5','salt','port','authority'],['G6','watertower','strip','front']].map(([id,a,b,faction])=>({id,a,b,faction,clear:false,angry:false}));
const WEAPONS=Object.fromEntries([
 ['verger','Verger revolver','side',34,3,6,36,false,.004,.5,60,0],['acolyte','Acolyte flare pistol','side',12,.8,1,8,false,.01,.3,80,4],['deacon','Deacon SMG','primary',16,13,32,224,true,.0025,1.2,45,5],['parson','Parson rifle','primary',24,9.5,30,180,true,.002,1,140,8],['sexton','Sexton pump','primary',11,1.25,6,30,false,.006,.8,24,6],['curate','Curate bolt rifle','primary',80,.8,5,30,false,.006,.5,400,10],['choir','Choir LMG','heavy',26,11,80,160,true,.0012,1.4,140,12],['bishop','Bishop RPG','heavy',200,.3,1,5,false,.03,.6,300,14],['gardener','Gardener flamethrower','heavy',2,20,100,200,true,.0008,.4,12,16]
].map(([id,name,slot,dmg,rate,mag,reserve,auto,wear,jam,range,cost])=>[id,{id,name,slot,dmg,rate,mag,reserve,auto,wear,jam,range,cost,pellets:id==='sexton'?9:1,fore:slot==='side'?2.6:6.2,adsFov:id==='curate'?18:50,reload:id==='verger'?2.4:1.9,hip:id==='sexton'?.075:.026}]));
WEAPONS.machete={id:'machete',name:'Machete',slot:'melee',dmg:60,rate:1.6,mag:0,reserve:0,auto:false,wear:0,jam:0,range:3,cost:0,pellets:1,fore:4,adsFov:70};
WEAPONS.rifle=WEAPONS.parson;WEAPONS.shotgun=WEAPONS.sexton;
const MERCS=[{name:'Teodor Lisk',from:'BULGARIA',role:'Sapper',perk:'Fire bottles reach two metres farther.',color:'#8d7654'},{name:'Nkechi Lund',from:'LAGOS / MALMO',role:'Field medic',perk:'Faster surgery. Seven syrettes.',color:'#765d4a'},{name:'Ruy Almeida',from:'LISBON',role:'River pilot',perk:'Repairs take half the time.',color:'#b58d63'},{name:'Hollis Tran',from:'GULF COAST',role:'Courier',perk:'Shotguns wear half as quickly.',color:'#bf9977'}];
const V_TYPES={jeep:{kind:'car',top:420,accel:300,turn:2.1,hp:120,r:7,mass:1.2},technical:{kind:'car',top:360,accel:240,turn:1.9,hp:180,r:8.5,mass:2},truck:{kind:'car',top:300,accel:180,turn:1.6,hp:260,r:10,mass:3},airboat:{kind:'hover',top:380,accel:240,turn:2.3,hp:100,r:8,float:7}};
const BIOME_COL={salt:[217,210,189],mud:[169,150,122],reeds:[185,178,119],grass:[198,170,100],scrub:[142,138,85],rock:[161,101,73],road:[166,143,112],pad:[181,163,133],brine:[89,116,104]};
const FUEL={grass:1,scrub:.7,reeds:2.5,mud:.25,salt:0,rock:0,road:0,pad:0,brine:0};
const STAKES=[[1400,1620],[480,1480],[430,890],[1580,1035],[1183,1284],[890,1455],[1055,650],[1000,310]].map(([m,n],i)=>({id:'stake'+i,m,n,index:i,found:false}));
const CASES=[[1160,1278],[1215,1310],[1185,1250],[770,1424],[845,1360],[990,1170],[1440,1640],[1035,670],[470,1180],[1580,1040],[560,920],[1310,1500]].map(([m,n],i)=>({id:'case'+i,m,n,value:2+i%4,taken:false}));

const LETTER='Terms of engagement. You will locate and remove the engineer I. Tarn. Fee on completion: two hundred stones. Meridian Water Consortium regrets it cannot be reached. A. Cray.';
const SOUNDINGS=[
'1958, Station A. Forty-one metres. We came in on the spring tide with the Minister\'s wife on deck, and she asked me if it had a bottom. I said, madam, everything does.',
'1963. Thirty-eight metres. The cotton scheme took the river this year. They gave me a medal. Water doesn\'t read the citation.',
'1971. Twenty-six. The fishermen have started tying their boats longer. Nobody has told them why. I was asked not to.',
'1979. Eleven. Port Clement\'s quay now ends in mud at low water. The Harbourmaster asked whether I could do something. I told him I already had.',
'1986. Four. The fleet sat down on the bottom this winter, one hull at a time. It was very quiet. You could hear the radios still playing the fish prices.',
'1991. Zero. I walked to Station A with the lead line anyway. I stood on the place I\'d measured and dropped the lead on my foot. That\'s a joke. Write it down.',
'1998. The dust. They call it the rasp. My own lungs are at eleven metres and falling.',
'Last sounding. I have sold rifles to both sides for nine years so neither will have men left to hold the Sill. When it is unguarded someone will open it. If you are reading this, it\'s you. I\'m sorry. No. I\'m not. Bring your own pencil.'
];
const RADIO=[
'Fish prices, Port Clement, this morning. Perch: none. Carp: none. Sturgeon: there is a man who remembers one.',
'Weather: dry. The Authority reminds you the weather is temporary. The Front reminds you the Authority is.',
'To the gentleman who keeps setting fire to the Tannery road. Your mother has asked me to say something and I told her I would not.',
'The ceasefire enters its ninth month. It has killed more people than the war. We wish it well.',
'This is the shipping forecast. There is no shipping. Good night.',
'The water board has moved upstairs. A sensible precaution, forty years late.',
'Lost property: one left boot, size nine. Still occupied. Ask at the clinic.',
'The Front has opened a school. The first lesson is subtraction. There is no second lesson.',
'A correction. Yesterday we said the bridge was safe. We meant the gentleman named Bridge. He is no longer safe.',
'Authority papers now come in blue. The checkpoint has only red ink. Plan accordingly.',
'This evening: a minute of silence for our sponsors. They have not paid.',
'The customs office asks you to declare anything dangerous. Bring a chair. This may take some time.',
'A farmer reports rain on the north shore. He was asleep. We let him finish.',
'The fish market will reopen when the fish do. Negotiations continue.',
'The road to the Sill is closed for repairs. Nobody has seen the repairmen. Nobody is looking.',
'An advertisement. Mr. Sunday. For all your pastoral needs. Terms very much apply.',
'Today is a public holiday. Private funerals proceed as scheduled.',
'Wanted: a battery for this station. If you can hear me, not quite yet.',
'The old lighthouse is working again. We have asked the sea for comment.',
'The water treaty has been signed in duplicate. The water has not been consulted.',
'Missing: a country. Last seen underneath a flag. Answers to almost anything.',
'Clinic hours are sunrise to exhaustion. Sister asks you to be punctual.',
'The salt buyers have arrived. They are disappointed in the salt. Imagine how the salt feels.',
'Fuel prices rise again. This is good news for anyone walking. You now have a reason.',
'I used to do birthday requests. Now they are proof of life. Keep calling.'
];
const ENDINGS={contract:{title:'THE CONTRACT',text:'Cray pays in full. From the air the grass is still burning in the shape of your route.',last:'Fish prices, Port Clement. None. None. None.'},arithmetic:{title:'THE ARITHMETIC',text:'The water goes through the Causeway at eleven minutes past. The Authority\'s column goes under, and the Front\'s, and the other one. Sister Perpetua\'s count stops at four hundred and six. You stay on the wheel. Somebody should have done the sum.',last:'The account is closed.'},sounding:{title:'THE SOUNDING',text:'Six minutes. Then the wheel. The column clears the east shore with nineteen seconds left. Nobody ever finds out who held it.',last:'Station A. Forty-one metres.'}};
const PATTER={verger:'Six arguments. Usually enough.',acolyte:'For lighting the way. Or the neighbours.',deacon:'A congregation in a hurry.',parson:'Honest. In the mechanical sense.',sexton:'For burying things at conversational distance.',curate:'A very long arm of the church.',choir:'Everybody sings at once.',bishop:'A letter of demolition.',gardener:'For the country you wish to leave behind.'};
const CONTRACTS=[
{id:'P0',title:'Terms of Engagement',giver:'Meridian',site:'strip',brief:[LETTER],papers:'clinic',pay:0,steps:[{kind:'read',site:'strip',text:'Read your terms of engagement.'},{kind:'script',site:'strip',script:'ambush',seconds:12,text:'Keep your head down. Look around.'},{kind:'goto',site:'strip',offset:[-35,-12],radius:7,text:'Run into the black.'},{kind:'kill',site:'strip',target:'ambushers',text:'Two soldiers. One ruined revolver.'},{kind:'script',site:'mission',script:'firstfit',seconds:9,text:'The seabed does not leave your lungs.'},{kind:'talk',npc:'sister',site:'mission',text:'Listen to Sister Perpetua.'}]},
{id:'P1',title:'Transit Papers',giver:'Sister Perpetua',site:'mission',brief:['I don\'t pray for you. I count you. It\'s more accurate.','Take the jeep to the Salt Shed. Give the satchel to the woman with one shoe. Bring back the jeep, if it\'s still a jeep.'],papers:'clinic',pay:0,ampoules:2,steps:[{kind:'talk',npc:'sister',site:'mission',text:'Collect the satchel and clinic pass.'},{kind:'drive',site:'mission',text:'Take the white clinic jeep. Drive fifty metres.',distance:50},{kind:'goto',post:'G3',site:'tannery',radius:35,text:'Show the clinic pass at G3. Lower your gun.'},{kind:'deliver',npc:'woman',site:'salt',text:'Deliver the satchel to the woman with one shoe.'},{kind:'talk',buddy:0,site:'salt',text:'Meet your best buddy at the Salt Shed.'},{kind:'sleep',site:'salt',text:'Claim the Salt Shed. Sleep. Save what is left.'}]},
{id:'C1',title:'Arrears',giver:'Captain Dray',site:'k9',brief:['A man at Station Four collects a water levy on water that isn\'t there. Close his account. Bring me his ledger.','You\'ll be paid on completion, less handling.'],papers:'authority',pay:6,alt:{buddy:0,pay:6,brief:'Take the cashbox under the pump too. Nothing will go wrong. I said that out loud, didn\'t I.',twist:'alarm'},steps:[{kind:'talk',npc:'dray',site:'k9',text:'Take the Authority contract at Kilometre Nine.'},{kind:'kill',site:'st4',target:'paymaster',text:'Kill the paymaster at Station Four. Tag him through the monocular.'},{kind:'take',site:'st4',item:'ledger',offset:[0,8],text:'Take the ledger from the pump.'},{kind:'deliver',npc:'dray',site:'k9',text:'Bring the ledger to Captain Dray.'},{kind:'talk',npc:'sunday',site:'fleet',text:'Meet Mr. Sunday in the Fleet. Fresh guns, unclean money.'}]},
{id:'C2',title:'Long Division',giver:'Comrade Teacher Sell',site:'red',brief:['Sit. We\'ll do this the way I did it with the eight-year-olds.','Three water trucks come over the Causeway at dusk. Three minus three.','Show your work.'],papers:'front',pay:8,alt:{buddy:1,pay:4,brief:'Keep one truck. We can use the water. It will be water. Surely.',twist:'rifles'},steps:[{kind:'talk',npc:'sell',site:'red',text:'Hear Sell\'s arithmetic at Red Steps.'},{kind:'destroy',site:'salt',target:'convoy',text:'Stop the three-truck convoy on the Causeway.'},{kind:'deliver',npc:'sell',site:'red',text:'Show your work to Sell.'}]},
{id:'C3',title:'Exit Visas',giver:'Sister Perpetua',site:'mission',brief:['There\'s a man in the hull of the Saint Brendan who forges exit visas. I don\'t ask how he eats.','Go at night. Come back across the Reeds. The posts can\'t see through reeds, and neither can God.'],papers:'clinic',pay:0,ampoules:4,steps:[{kind:'talk',npc:'sister',site:'mission',text:'Visit the clinic. The medicine never comes free.'},{kind:'take',site:'fleet',item:'visas',offset:[-28,27],text:'Collect the forged visas in the Saint Brendan.'},{kind:'drive',site:'remnant',boat:true,text:'Cross the Remnant by airboat. Drive fifty metres.',distance:50},{kind:'goto',site:'reedcamp',offset:[45,20],radius:25,text:'Make your way through the burning reeds.'},{kind:'deliver',npc:'sister',site:'mission',text:'Give Sister Perpetua the exit visas.'}]},
{id:'C4',title:'Fire Season',giver:'Colonel Renn',site:'k9',brief:['The Front keeps a camp in the Reeds. The wind is out of the west until noon. I have it in writing.','There are some tents downwind. They\'ve been notified.'],papers:'authority',pay:10,steps:[{kind:'talk',npc:'dray',site:'k9',text:'Collect Renn\'s orders and the worn Gardener.'},{kind:'ignite',site:'reedcamp',offset:[-46,0],text:'Burn Reed Camp from upwind.'},{kind:'hold',site:'salt',offset:[0,120],seconds:90,text:'The camp is downwind. Back-burn a strip, or leave it.'},{kind:'deliver',npc:'dray',site:'k9',text:'Report what the wind did.'}]},
{id:'C5',title:'Remainder',giver:'Comrade Teacher Sell',site:'red',brief:['Colonel Renn signs the water treaty on the Customs House steps on Thursday. She has a very good pen.','Take away the pen. Take away the hand.','The remainder is yours to keep.'],papers:'authority',pay:14,alt:{buddy:2,pay:6,brief:'I will plant the case. Cover the steps. I know the blast radius.',twist:'blast'},steps:[{kind:'talk',npc:'sell',site:'red',text:'Take Sell\'s contract and the worn Curate.'},{kind:'kill',site:'port',target:'renn',text:'Kill Colonel Renn on the Customs House steps.'},{kind:'goto',site:'port',offset:[0,105],radius:22,text:'Port Clement is burning. Get out.'}]},
{id:'C6',title:'Soundings',giver:'Ilse Tarn',site:'lamp',brief:['This is the woman you came to kill. I\'ve had your passport for a week. You have a bad photograph and one lung.','I left my readings in the basin, stake by stake. Read three. Then come up to the Sill and tell me I\'m wrong.'],papers:'clinic',pay:0,steps:[{kind:'read',site:'lamp',count:3,text:'Read any three of eight survey stakes. The map marks them.'}]},
{id:'C7',title:'The Last Reconciliation',giver:'Your best buddy',site:'salt',brief:['Drink at the Shed. All of us. We\'ve been talking.','Meridian doubled it. You\'d do the same. You have done the same.'],papers:null,pay:12,steps:[{kind:'goto',site:'salt',radius:20,text:'Your surviving buddies want a drink at the Shed.'},{kind:'kill',site:'salt',target:'betrayers',text:'Settle the account. Your friends know how you fight.'}]},
{id:'F',title:'The Sill',giver:'Ilse Tarn',site:'sill',brief:['Forty-one metres. That\'s what it was. There\'s a wheel behind me. It wants two hands, and I have a bad heart and a worse character.','The Sister\'s column is on the Causeway. It needs six minutes. Both armies are coming up the road. You might manage one of those.','Or there\'s Mr. Cray\'s helicopter. He\'s very punctual.'],papers:null,pay:0,steps:[{kind:'goto',site:'sill',offset:[-9,16],radius:40,text:'Climb the canyon road to the Sill.'},{kind:'talk',npc:'tarn',site:'sill',text:'Find Tarn in the control house atop the dam.'},{kind:'choice',site:'sill',text:'Choose who gets to drown.'}]}
];

const RS=4,RN=HM/RS+1,RIVER=new Float32Array(RN*RN),ROADW=new Float32Array(RN*RN),ROADH=new Float32Array(RN*RN),ROADC=new Float32Array(RN*RN),PADW=new Float32Array(RN*RN),PADH=new Float32Array(RN*RN);
const rs=(a,m,n)=>{const gx=clamp(m/RS,0,RN-1.001),gy=clamp(n/RS,0,RN-1.001),i=gx|0,j=gy|0,u=gx-i,v=gy-j,k=j*RN+i;return (a[k]*(1-u)+a[k+1]*u)*(1-v)+(a[k+RN]*(1-u)+a[k+RN+1]*u)*v;};
function seaAt(m,n){return 1-sstep(.92,1.08,Math.hypot((m-1050)/600,(n-1180)/430)+(fbm(m/300,n/300,3)-.5)*.35);}
function baseH(m,n){const sea=seaAt(m,n);let h=(fbm(m/420,n/420,4)-.5)*55;const f=fbm(m/290+31.7,n/290+11.3,3);h+=(sstep(.575,.6,f)*32+sstep(.67,.69,f)*18)*sstep(1050,400,m);h+=(N2(m/33,n/33)-.5)*2;h=h*(1-sea)-14*sea;const edge=Math.min(m,n,HM-m,HM-n),notch=1-sstep(90,150,Math.abs(m-1000))*(n<270?1:0);h+=sstep(190,30,edge)*120*(n<250?1-notch:1);if(Math.hypot(m-1120,n-1400)<135)h=-14;return h;}
function height(x,y){const m=x/M,n=y/M;let h=baseH(m,n),rw=rs(ROADW,m,n),pw=rs(PADW,m,n);h=lerp(h,rs(ROADH,m,n),rw);h=lerp(h,rs(PADH,m,n),pw);return h*M;}
function biomeAt(m,n){if(Math.hypot(m-1120,n-1400)<125)return 'brine';if(rs(ROADC,m,n)>.4)return 'road';if(rs(PADW,m,n)>.85)return 'pad';const sea=seaAt(m,n);if(m>660&&m<1010&&n>1250&&n<1570&&sea>.3)return 'reeds';if(sea>.8)return n<1220?'salt':'mud';if(baseH(m,n)>40)return 'rock';return N2(m/73,n/73)>.65?'scrub':'grass';}
function color(x,y,z,nz,out){const m=x/M,n=y/M,c=BIOME_COL[biomeAt(m,n)],f=.91+N2(m/3.3,n/3.3)*.16;for(let k=0;k<3;k++)out[k]=c[k]*f;return out;}
const roads=[];
function planLand(){for(const o of SITES){Object.assign(o,{x:o.m*M,y:o.n*M,h:baseH(o.m,o.n)});o.z=o.h*M;o.P={x:o.x,y:o.y,z:o.z,yaw:0,c:1,s:0};}
 for(const [a,b] of ROADS){const A=OP[a],B=OP[b],L=Math.hypot(A.m-B.m,A.n-B.n),road=[];for(let i=0;i<=Math.ceil(L/6);i++){const u=i/Math.ceil(L/6),m=lerp(A.m,B.m,u),n=lerp(A.n,B.n,u);let h=baseH(m,n);if((a==='salt'||b==='salt')&&seaAt(m,n)>.7)h=Math.max(h,-12);road.push([m,n,h]);}roads.push(road);for(let i=0;i<road.length-1;i++){const [x,y,h]=road[i];for(let j=Math.max(0,Math.floor((y-13)/4));j<=Math.min(RN-1,Math.ceil((y+13)/4));j++)for(let k=Math.max(0,Math.floor((x-13)/4));k<=Math.min(RN-1,Math.ceil((x+13)/4));k++){const d=Math.hypot(k*4-x,j*4-y),v=j*RN+k,w=sstep(12,4,d);if(w>ROADW[v]){ROADW[v]=w;ROADH[v]=h;}ROADC[v]=Math.max(ROADC[v],sstep(5.5,2.5,d));}}}
 for(const o of SITES)for(let j=Math.max(0,Math.floor((o.n-o.r-30)/4));j<=Math.min(RN-1,Math.ceil((o.n+o.r+30)/4));j++)for(let i=Math.max(0,Math.floor((o.m-o.r-30)/4));i<=Math.min(RN-1,Math.ceil((o.m+o.r+30)/4));i++){const w=sstep(o.r+30,o.r,Math.hypot(i*4-o.m,j*4-o.n)),k=j*RN+i;if(w>PADW[k]){PADW[k]=w;PADH[k]=o.h;}}
 for(const p of POSTS){const a=OP[p.a],b=OP[p.b];p.m=(a.m+b.m)/2;p.n=(a.n+b.n)/2;p.x=p.m*M;p.y=p.n*M;p.z=height(p.x,p.y);p.P={x:p.x,y:p.y,z:p.z,yaw:Math.atan2(b.n-a.n,b.m-a.m),c:1,s:0};p.P.c=Math.cos(p.P.yaw);p.P.s=Math.sin(p.P.yaw);}
}

  /* =====================================================================
   * STRUCTURES: one merged mesh for every outpost (buildings, containers, towers, barriers, ladders, cables), each
   * piece a box (or a cylinder) with a kind for its pattern; the fixed blocks under them; and the working parts drawn
   * every frame (doors, supply bins), ladders and ziplines to ride. Laid out in metres round each outpost's centre
   * ===================================================================== */
  const GEO = { P: [], N: [], C: [], K: [], I: [] }, solids = [], doors = [], bins = [], ladders = [], zips = [], spawns = [], dummies = [];
  const K_CONCRETE = 0, K_METAL = 1, K_RIBS = 2, K_PLANKS = 3, K_BAGS = 4, K_PLAIN = 5;
  const linC = new Map(), srgb = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
  const linOf = h => { let v = linC.get(h); if (!v) { v = E.hex(h).map(c => srgb(c / 255)); linC.set(h, v); } return v; };
  let zLo = 0, zHi = 1;   // the box being built (its corners shade darker toward its foot)
  /** a quad: centre c, half-sides u and v, outward normal n (engine units), into the merged mesh (three's metres) */
  function quad(c, u, v, n, color, kind) {
    const base = GEO.P.length / 3, col = linOf(color), top = n[2] > .5, bot = n[2] < -.5;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = c[0] + u[0] * a + v[0] * b, y = c[1] + u[1] * a + v[1] * b, z = c[2] + u[2] * a + v[2] * b, k = top ? 1.06 : bot ? .7 : lerp(.72, 1, clamp((z - zLo) / Math.max(1, Math.min(48, zHi - zLo)), 0, 1));
      GEO.P.push(x / M, z / M, y / M); GEO.N.push(n[0], n[2], n[1]); GEO.C.push(col[0] * k, col[1] * k, col[2] * k); GEO.K.push(kind);
    }
    const p = GEO.P, i = base * 3, e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
    const dn = (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[2] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[1];
    if (dn > 0) GEO.I.push(base, base + 1, base + 2, base, base + 2, base + 3); else GEO.I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  /** a box: its centre and three half-axes (vectors, engine units): any way it turns or tilts */
  function boxAx(c, a, b, h, color, kind) {
    const ez = Math.abs(a[2]) + Math.abs(b[2]) + Math.abs(h[2]); zLo = c[2] - ez; zHi = c[2] + ez;
    for (const [X, Y, Z] of [[a, b, h], [b, h, a], [h, a, b]]) {
      const l = Math.hypot(X[0], X[1], X[2]) || 1;
      for (const s of [1, -1]) quad([c[0] + X[0] * s, c[1] + X[1] * s, c[2] + X[2] * s], Y, Z, [X[0] / l * s, X[1] / l * s, X[2] / l * s], color, kind);
    }
  }
  /** a cylinder from c0 to c1 (engine units), radius r, seg sides, capped */
  function cylAx(c0, c1, r, seg, color, kind) {
    const d = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]], L = Math.hypot(...d), f = d.map(v => v / L);
    const p = Math.abs(f[2]) < .9 ? [-f[1], f[0], 0] : [1, 0, 0], pl = Math.hypot(...p), u = p.map(v => v / pl), w = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]];
    zLo = Math.min(c0[2], c1[2]) - r; zHi = Math.max(c0[2], c1[2]) + r;
    const at = (k, e) => { const a = k / seg * TAU, cs = Math.cos(a) * r, sn = Math.sin(a) * r, o = e ? c1 : c0; return [o[0] + u[0] * cs + w[0] * sn, o[1] + u[1] * cs + w[1] * sn, o[2] + u[2] * cs + w[2] * sn]; };
    for (let k = 0; k < seg; k++) {
      const a = (k + .5) / seg * TAU, n = [u[0] * Math.cos(a) + w[0] * Math.sin(a), u[1] * Math.cos(a) + w[1] * Math.sin(a), u[2] * Math.cos(a) + w[2] * Math.sin(a)];
      const p0 = at(k, 0), p1 = at(k + 1, 0), p2 = at(k + 1, 1), c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, (p0[2] + p2[2]) / 2];
      quad(c, [(p1[0] - p0[0]) / 2, (p1[1] - p0[1]) / 2, (p1[2] - p0[2]) / 2], [d[0] / 2, d[1] / 2, d[2] / 2], n, color, kind);
    }
    for (const e of [0, 1]) for (let k = 0; k < seg; k += 2) {   // the caps, as quads round the middle (seg even)
      const o = e ? c1 : c0, a = at(k, e), b = at(k + 1, e), c = at(k + 2, e);
      quadPts(o, a, b, c, e ? f : f.map(v => -v), color, kind);
    }
  }
  /** a quad from four corners in order (a fan's slice) */
  function quadPts(p0, p1, p2, p3, n, color, kind) {
    const base = GEO.P.length / 3, col = linOf(color);
    for (const q of [p0, p1, p2, p3]) { GEO.P.push(q[0] / M, q[2] / M, q[1] / M); GEO.N.push(n[0], n[2], n[1]); GEO.C.push(col[0], col[1], col[2]); GEO.K.push(kind); }
    const p = GEO.P, i = base * 3, e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
    const dn = (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[2] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[1];
    if (dn > 0) GEO.I.push(base, base + 1, base + 2, base, base + 2, base + 3); else GEO.I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  /* ---- the outposts' frame: P = { x, y, z (units), c, s (its turn) }; local metres (east, south, up) to world units ---- */
  const frameOf = (o, yaw) => ({ x: o.x, y: o.y, z: o.z, yaw, c: Math.cos(yaw), s: Math.sin(yaw) });
  const atP = (P, lx, ly) => [P.x + (lx * P.c - ly * P.s) * M, P.y + (lx * P.s + ly * P.c) * M];
  /** a box in an outpost: centre (lx, ly) metres, its foot lz metres above the pad, w x d x h metres, turned lyaw; solid:
   *  a fixed block too (true, or a height in metres for a lower one) */
  function B(P, lx, ly, lz, w, d, h, lyaw, color, kind, solid = true) {
    const [x, y] = atP(P, lx, ly), a = P.yaw + lyaw, c = Math.cos(a), s = Math.sin(a), z0 = P.z + lz * M;
    boxAx([x, y, z0 + h * M / 2], [c * w * M / 2, s * w * M / 2, 0], [-s * d * M / 2, c * d * M / 2, 0], [0, 0, h * M / 2], color, kind);
    if (solid) solids.push({ x, y, z: z0, w: w * M, d: d * M, h: (solid === true ? h : solid) * M, yaw: a });
  }
  /** a box between two points of the outpost (metres, lz up): a brace, a rafter, a sloped roof; across: its width's way */
  function beam(P, a, b, w, t, color, kind, up = [0, 0, 1]) {
    const pa = [...atP(P, a[0], a[1]), P.z + a[2] * M], pb = [...atP(P, b[0], b[1]), P.z + b[2] * M], c = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
    const d = [(pb[0] - pa[0]) / 2, (pb[1] - pa[1]) / 2, (pb[2] - pa[2]) / 2], L = Math.hypot(...d), f = d.map(v => v / L);
    const u0 = [up[0] * P.c - up[1] * P.s, up[0] * P.s + up[1] * P.c, up[2]], dot = u0[0] * f[0] + u0[1] * f[1] + u0[2] * f[2];
    let u = [u0[0] - f[0] * dot, u0[1] - f[1] * dot, u0[2] - f[2] * dot]; const ul = Math.hypot(...u) || 1; u = u.map(v => v / ul);
    const s = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]];
    boxAx(c, d, s.map(v => v * w * M / 2), u.map(v => v * t * M / 2), color, kind);
  }
  const CYL = (P, lx, ly, lz, r, h, color, kind, seg = 12, solid = true) => {
    const [x, y] = atP(P, lx, ly); cylAx([x, y, P.z + lz * M], [x, y, P.z + (lz + h) * M], r * M, seg, color, kind);
    if (solid) solids.push({ x, y, z: P.z + lz * M, r: r * M, h: h * M });
  };
  /* ---- the pieces ---- */
  const CON = '#bdb4a2', CON2 = '#9a9284', TRIM = '#5a5650', STEEL = '#3a3e44', GALV = '#9aa09a', WOOD = '#9a7448', BAG = '#b8a478', TARP = '#5f6e4c';
  const OPEN = { door: [1.2, 2.2, 0], window: [1.3, 1.05, 1.0], gap: [1.5, 2.35, 0], bay: [4, 4.2, 0] };   // an opening's width, height and sill (metres)
  /** a wall from (ax, ay) to (bx, by) (local metres), h tall, t thick, with openings [{ at (metres from a), kind }] */
  function wall(P, ax, ay, bx, by, h, t, color, kind, openings = [], lz = 0) {
    const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L, yaw = Math.atan2(dy, dx), at = s => [ax + dx * s, ay + dy * s];
    let s0 = 0; const ops = openings.slice().sort((p, q) => p.at - q.at);
    const piece = (s1, s2, z1, z2) => { if (s2 - s1 < .02 || z2 - z1 < .02) return; const [cx, cy] = at((s1 + s2) / 2); B(P, cx, cy, lz + z1, s2 - s1, t, z2 - z1, yaw, color, kind); };
    for (const op of ops) {
      const [w, oh, sill] = OPEN[op.kind], a = op.at - w / 2, b = op.at + w / 2;
      piece(s0, a, 0, h); piece(a, b, sill + oh, h); if (sill) piece(a, b, 0, sill);
      const [cx, cy] = at(op.at), [x, y] = atP(P, cx, cy);
      if (op.kind === 'door') { const [hx, hy] = atP(P, ...at(a)); doors.push({ x, y, z: P.z + lz * M, hx, hy, yaw: P.yaw + yaw, w: w * M, h: oh * M, t: .09 * M, color: op.color || '#6a5a48', state: 'shut', ang: 0, vel: 0, want: 0, block: null, deb: null }); }
      s0 = b;
    }
    piece(s0, L, 0, h);
  }
  /** a single-room building: w x d metres, h tall, flat roof with a low parapet; walls: { n, s, e, w: [openings] } */
  function shack(P, lx, ly, w, d, h, walls, color = CON, roof = CON2, parapet = true) {
    const x0 = lx - w / 2, x1 = lx + w / 2, y0 = ly - d / 2, y1 = ly + d / 2, t = .22;
    B(P, lx, ly, -.3, w + .3, d + .3, .32, 0, CON2, K_CONCRETE, false);   // the slab it stands on
    wall(P, x0, y0, x1, y0, h, t, color, K_CONCRETE, walls.n); wall(P, x1, y1, x0, y1, h, t, color, K_CONCRETE, walls.s);
    wall(P, x1, y0 + t / 2, x1, y1 - t / 2, h, t, color, K_CONCRETE, walls.e); wall(P, x0, y1 - t / 2, x0, y0 + t / 2, h, t, color, K_CONCRETE, walls.w);
    B(P, lx, ly, h, w + .2, d + .2, .24, 0, roof, K_CONCRETE);
    if (parapet) { for (const yy of [y0, y1]) B(P, lx, yy, h + .24, w + .2, .2, .38, 0, roof, K_CONCRETE); for (const xx of [x0, x1]) B(P, xx, ly, h + .24, .2, d - .2, .38, 0, roof, K_CONCRETE); }
    B(P, lx, y1 + .1, h - .55, w + .2, .14, .14, 0, TRIM, K_PLAIN, false);   // a trim band and a rain pipe
    beam(P, [x1 + .12, y1 + .12, 0], [x1 + .12, y1 + .12, h], .12, .12, TRIM, K_PLAIN);
  }
  /** a shipping container, 6.1 x 2.45 x 2.6 m, its foot lz up; open: both ends open to walk through */
  function container(P, lx, ly, lz, lyaw, color, open = false) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), L = 6.1, Wd = 2.45, Hh = 2.6, t = .1, at = (u, v) => [lx + u * c - v * s, ly + u * s + v * c];
    if (!open) B(P, lx, ly, lz, L, Wd, Hh, lyaw, color, K_RIBS);
    else {
      for (const v of [-1, 1]) { const [x, y] = at(0, v * (Wd / 2 - t / 2)); B(P, x, y, lz, L, t, Hh, lyaw, color, K_RIBS); }
      B(P, lx, ly, lz + Hh - t, L, Wd, t, lyaw, color, K_RIBS); B(P, lx, ly, lz, L, Wd, .12, lyaw, '#4a3a2a', K_PLANKS, .12);
      for (const v of [-1, 1]) { const [x, y] = at(L / 2 + .55, v * (Wd / 2 + .05)), a = lyaw + v * 1.2; B(P, x + Math.cos(a) * .05, y, lz + .04, 1.2, .08, Hh - .08, a, E.shade(color, -.08), K_RIBS, false); }
    }
    for (const u of [-1, 1]) { const [x, y] = at(u * (L / 2 - .06), 0); B(P, x, y, lz, .14, Wd + .04, Hh + .02, lyaw, E.shade(color, -.25), K_PLAIN, false); }   // the frame's ends
  }
  /** a ladder up to z1 metres (its rails at the foot (lx, ly), climbed facing lyaw), with its record for climbing */
  function ladder(P, lx, ly, z0, z1, lyaw) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw);
    for (const v of [-1, 1]) beam(P, [lx - s * v * .24, ly + c * v * .24, z0], [lx - s * v * .24, ly + c * v * .24, z1 + .9], .06, .06, STEEL, K_PLAIN);
    for (let z = z0 + .3; z < z1 + .1; z += .3) beam(P, [lx - s * .24, ly + c * .24, z], [lx + s * .24, ly - c * .24, z], .045, .045, GALV, K_PLAIN);
    const [x, y] = atP(P, lx, ly), a = P.yaw + lyaw;
    ladders.push({ x, y, z0: P.z + z0 * M, z1: P.z + z1 * M, yaw: a, top: [x + Math.cos(a) * 1.1 * M, y + Math.sin(a) * 1.1 * M, P.z + z1 * M] });
  }
  /** a watch tower: four legs, braces, a platform h metres up with railings (a gap where the ladder comes up), a roof;
   *  returns its zipline anchor (world units) */
  function tower(P, lx, ly, lyaw, h = 8) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), at = (u, v) => [lx + u * c - v * s, ly + u * s + v * c], R = 1.45;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [x, y] = at(u * R, v * R); B(P, x, y, 0, .26, .26, h + 3.2, lyaw, WOOD, K_PLANKS); }
    for (let k = 0; k < 4; k++) for (const z of [0, h / 2]) {   // the braces: an X on each side
      const [u0, v0] = [[-1, -1], [1, -1], [1, 1], [-1, 1]][k], [u1, v1] = [[1, -1], [1, 1], [-1, 1], [-1, -1]][k], a = at(u0 * R, v0 * R), b = at(u1 * R, v1 * R);
      beam(P, [a[0], a[1], z + .3], [b[0], b[1], z + h / 2 - .2], .14, .1, WOOD, K_PLANKS); beam(P, [b[0], b[1], z + .3], [a[0], a[1], z + h / 2 - .2], .14, .1, WOOD, K_PLANKS);
    }
    B(P, lx, ly, h - .2, 3.3, 3.3, .22, lyaw, WOOD, K_PLANKS);
    const rail = (u0, v0, u1, v1) => { const a = at(u0, v0), b = at(u1, v1), L = Math.hypot(b[0] - a[0], b[1] - a[1]); B(P, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, h, L, .12, 1.0, Math.atan2(b[1] - a[1], b[0] - a[0]), WOOD, K_PLANKS); };
    rail(-1.6, -1.6, 1.6, -1.6); rail(-1.6, 1.6, 1.6, 1.6); rail(-1.6, -1.6, -1.6, -.6); rail(-1.6, .6, -1.6, 1.6); rail(1.6, -1.6, 1.6, -.5);   // (the ladder comes up at +u, +v; the zipline leaves from the gap at -u)
    B(P, lx, ly, h + 3.0, 3.8, 3.8, .16, lyaw, GALV, K_METAL);
    const [lx2, ly2] = at(1.95, .9); ladder(P, lx2, ly2, 0, h, lyaw + Math.PI);
    const [ax, ay] = atP(P, ...at(-2.05, 0)); beam(P, [...at(-1.45, 0), h + 2.95], [...at(-2.15, 0), h + 2.95], .12, .12, STEEL, K_PLAIN); return [ax, ay, P.z + (h + 2.85) * M];
  }
  /** concrete barrier (jersey), 3 m long, 0.82 m tall: vault over it */
  const barrier = (P, lx, ly, lyaw) => { B(P, lx, ly, 0, 3, .62, .3, lyaw, CON, K_CONCRETE, .82); B(P, lx, ly, .3, 3, .3, .52, lyaw, CON, K_CONCRETE, false); };
  const sandbags = (P, lx, ly, lyaw, len = 4, h = 1.05) => B(P, lx, ly, 0, len, .7, h, lyaw, BAG, K_BAGS);
  const crate = (P, lx, ly, lz, lyaw, k = 1.2) => B(P, lx, ly, lz, k, k, k, lyaw, WOOD, K_PLANKS);
  const bin = (P, lx, ly, lz, lyaw) => { const [x, y] = atP(P, lx, ly); bins.push({ x, y, z: P.z + lz * M, yaw: P.yaw + lyaw, open: 0, used: false }); solids.push({ x, y, z: P.z + lz * M, w: 1.1 * M, d: .62 * M, h: .66 * M, yaw: P.yaw + lyaw }); };
  const spawn = (o, P, lx, ly, lz = 0, o2 = {}) => { const [x, y] = atP(P, lx, ly); spawns.push(Object.assign({ op: o.id, x, y, z: P.z + lz * M }, o2)); };
  /** a fuel tank on its side, on two saddles */
  function tank(P, lx, ly, lyaw, L = 5, r = 1.2) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), a = [...atP(P, lx - c * L / 2, ly - s * L / 2)], b = [...atP(P, lx + c * L / 2, ly + s * L / 2)];
    cylAx([a[0], a[1], P.z + (r + .35) * M], [b[0], b[1], P.z + (r + .35) * M], r * M, 14, '#d8d4c8', K_PLAIN);
    for (const u of [-.32, .32]) B(P, lx + c * u * L, ly + s * u * L, 0, .4, r * 1.6, .6, lyaw, STEEL, K_PLAIN, false);
    solids.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: P.z, w: L * M, d: r * 2 * M, h: (r * 2 + .35) * M, yaw: P.yaw + lyaw });
  }


const PROPS=[];
function prop(id,P,x,y,z=0,o={}){PROPS.push({id,x:atP(P,x,y)[0],y:atP(P,x,y)[1],z:P.z+z*M,o});}
function tentRow(P,count,x,y){for(let k=0;k<count;k++){const xx=x+(k%6)*7,yy=y+Math.floor(k/6)*8;for(const s of [-1,1])beam(P,[xx,yy,2.4],[xx,yy+s*2,0],5,.08,'#a59b75',K_PLAIN);beam(P,[xx-2.6,yy,2.4],[xx+2.6,yy,2.4],.08,.08,WOOD,K_PLANKS);B(P,xx,yy,0,4.8,3.5,.15,0,'#554934',K_PLANKS,false);}}
function hull(P,x,y,yaw=0,index=0){const q={...P,x:atP(P,x,y)[0],y:atP(P,x,y)[1],yaw,c:Math.cos(yaw),s:Math.sin(yaw)};const C=index%2?'#4f5c50':'#7a3a1e';
 B(q,0,0,.2,22,5.7,.3,0,'#38362b',K_METAL);for(const side of [-1,1]){B(q,0,side*3,.3,22,.18,4.6,0,C,K_METAL);beam(q,[-11,side*3,.3],[-15,0,2],.15,3,C,K_METAL);beam(q,[11,side*3,.3],[14,0,2],.15,3,C,K_METAL);for(let i=-9;i<10;i+=3)B(q,i,side*3.12,.5,.16,.16,4.6,0,'#9a6346',K_PLAIN,false);}
 B(q,-7,0,4.9,6,5.8,.2,0,'#8b805f',K_METAL);shack({...q,z:q.z+4.9*M},-6,0,4.6,4.3,3,{n:[{at:2.3,kind:'window'}],s:[{at:2,kind:'door'}],e:[{at:2,kind:'window'}]},'#b4a888','#70634d',false);ladder(q,-9,3.6,0,4.9,-Math.PI/2);
 beam(q,[-1,0,0],[-1,0,14],.2,.2,'#665340',K_PLAIN);beam(q,[-1,-4,10],[-1,4,10],.12,.12,'#665340',K_PLAIN);beam(q,[-1,0,14],[9,3,4.7],.025,.025,'#3b3630',K_PLAIN);beam(q,[-1,0,14],[-9,-3,4.7],.025,.025,'#3b3630',K_PLAIN);
 for(let i=-5;i<7;i+=4)crate(q,i,0,.6,.1,1.1);B(q,7,0,.3,4,4,.2,0,'#3e392e',K_PLANKS);return q;
}
function layout(){E.SHAPES.charred={about:'Burned thorn tree, leafless crown',mats:{b:'#191512 bark'},parts:[['lathe','b',[0,0,0],[[3,0],[2.5,22],[1,42]],{seg:7}],['box','b',[0,0,31],[20,2,2],{rot:12}],['box','b',[0,0,35],[2,18,2],{rot:-22}]]};E.SHAPES.bottle={about:'Bottle tree with swollen trunk and flat thorn crown',mats:{b:'#8e795b bark',l:'#8e8a55 foliage'},parts:[['lathe','b',[0,0,0],[[5,0],[7,13],[5,28],[2,45],[1.5,54]],{seg:8}],['ball','l',[0,0,56],12,{sz:.23}],['ball','l',[10,0,54],8,{sz:.25}]]};
 for(const o of SITES){const q=o.P;if(o.id==='fleet'){for(let i=0;i<9;i++)hull(q,(i%3-1)*43,(Math.floor(i/3)-1)*36,(i%3-1)*.37,i);}
 else if(o.id==='salt'){shack(q,-9,-8,24,9,4,{s:[{at:9,kind:'bay'},{at:18,kind:'door'}]},'#a9a08a','#7a6e5c');for(let i=0;i<8;i++)B(q,12+i%3*3,Math.floor(i/3)*4,0,3,3,1+i%2,.1,'#d9d2bd',K_PLAIN,false);tentRow({...q,y:q.y+120*M,z:height(q.x,q.y+120*M)},30,-20,-10);}
 else if(o.id==='lamp'){CYL(q,0,0,0,4.8,33,'#c4b9a0',K_CONCRETE,18);CYL(q,0,0,0,4.95,4,'#8c4430',K_CONCRETE,18);CYL(q,0,0,33,5.6,.4,'#433d35',K_METAL,18);CYL(q,0,0,33.4,4.1,4.5,'#a99f7c',K_PLAIN,12);CYL(q,0,0,37.9,5.3,1,'#413c35',K_METAL,12);CYL(q,0,0,39,1,2,'#433d35',K_METAL,8);ladder(q,5,0,0,33,Math.PI);shack(q,14,6,7,6,3,{s:[{at:3,kind:'door'}]},'#c3b69b');}
 else if(o.id==='sill'){B(q,0,0,0,240,14,46,0,'#9e9480',K_CONCRETE);for(const x of [-65,0,65]){B(q,x,7.2,0,28,.6,38,0,'#4b5148',K_RIBS);beam(q,[x,8,0],[x,8,46],.4,.4,STEEL,K_PLAIN);}B(q,0,0,46,242,16,.3,0,'#b6a98b',K_CONCRETE);shack({...q,z:q.z+46.3*M},0,0,13,10,4.3,{s:[{at:6.5,kind:'bay'}],n:[{at:3,kind:'window'},{at:9,kind:'window'}]},'#ada78e');for(let i=0;i<160;i++)B(q,-120+i*1.2,15,0+i*.2875,1.25,3,.3,0,CON2,K_CONCRETE);B(q,38,-18,46,22,22,.3,0,'#525448',K_CONCRETE);B(q,72,10,46,4,10,.3,0,CON2,K_CONCRETE);ladder(q,-4,8,0,46,-Math.PI/2);}
 else if(o.id==='mission'){wall(q,-12,-10,12,-10,5,.6,'#c2b69b',K_CONCRETE,[{at:12,kind:'bay'}]);wall(q,-12,-10,-12,10,4,.6,'#b9ad94',K_CONCRETE,[{at:5,kind:'window'},{at:15,kind:'window'}]);wall(q,12,-10,12,10,3.2,.6,'#b9ad94',K_CONCRETE);B(q,0,-10,5,2,.5,2.5,0,'#b9ad94',K_CONCRETE);tentRow(q,12,-30,20);tank(q,18,-10,0);prop('bed',q,-7,0,0,{scale:1.5});prop('table',q,4,0,0,{scale:1.4});}
 else if(o.id==='port'){for(let i=0;i<14;i++){const x=(i%5-2)*16,y=(Math.floor(i/5)-1)*22;shack(q,x,y,10+i%3,9,4+(i===2?8:0),{s:[{at:5,kind:'door'}],n:[{at:3,kind:'window'}]},i%2?'#b9a789':'#bfae8e');}B(q,0,65,-4,160,5,5,0,'#a89a80',K_CONCRETE);hull(q,-30,47,.1,2);}
 else if(o.id==='reedcamp'){tentRow(q,12,-20,-15);B(q,0,10,0,50,2,.3,0,WOOD,K_PLANKS);tower(q,-24,12,0,7);}
 else if(o.id==='strip'){B(q,0,0,-.1,90,8,.15,0,'#b6a487',K_PLAIN,false);for(let i=-40;i<40;i+=9)B(q,i,0,.06,4,.2,.02,0,'#ded4b8',K_PLAIN,false);B(q,-16,15,0,10,1.8,1.5,.3,'#a78c54',K_METAL);B(q,-16,15,1.3,2,14,.2,.3,'#c1aa74',K_METAL,false);}
 else if(o.id==='st4'){shack(q,0,0,12,9,4,{s:[{at:6,kind:'bay'}],n:[{at:3,kind:'window'}]},'#a7a18a');tank(q,16,0,0,8,2);beam(q,[-15,3,.4],[18,3,.4],.4,.4,'#6e6554',K_METAL);tower(q,-16,16,0,7);}
 else if(o.id==='tannery'){shack(q,-6,-6,9,7,3,{s:[{at:4,kind:'door'}]},'#b09b7a');for(let i=0;i<6;i++){CYL(q,8+i%3*4,Math.floor(i/3)*5,0,1.5,1,'#725c46',K_CONCRETE,10);}}
 else if(o.id==='watertower'){tower(q,0,0,0,12);CYL(q,0,0,12,3.5,5,'#8a8b75',K_RIBS,12);shack(q,8,8,6,6,3,{s:[{at:3,kind:'door'}]},'#a89b7a');}
 else if(o.id==='k9'||o.id==='red'){for(let i=0;i<6;i++)container(q,(i%3-1)*10,(Math.floor(i/3)*2-1)*14,0,0,i%2?'#716e50':'#9b6747',i===1);tower(q,-22,20,0,9);shack(q,0,-28,12,8,4,{s:[{at:6,kind:'bay'}]},'#b6a585');for(let x=-24;x<25;x+=8)sandbags(q,x,25,0,6);}
 if(o.faction==='safe'){prop('bed',q,0,6,0,{scale:1.5});prop('chest',q,5,6,0,{scale:1.5});prop('chair',q,-3,6,0,{scale:1.3});}
 if(!['remnant','fleet','strip','sill'].includes(o.id)){prop('barrel',q,12,12,0,{scale:1.5});prop('crate',q,14,12,0,{scale:1.2});}
 }
 for(const p of POSTS){const q=p.P;barrier(q,0,-3,Math.PI/2);sandbags(q,3,7,Math.PI/2,6);sandbags(q,-3,-8,Math.PI/2,6);tower(q,-9,8,0,5);prop('barrel',q,4,7,0,{scale:1.5});}
 for(const st of STAKES){const q={x:st.m*M,y:st.n*M,z:height(st.m*M,st.n*M),c:1,s:0,yaw:0};for(const a of [0,2.1,4.2])beam(q,[Math.cos(a)*.5,Math.sin(a)*.5,0],[0,0,1.2],.05,.05,STEEL,K_PLAIN);B(q,0,0,1.15,.8,.6,.4,0,'#8e967b',K_METAL,false);}
}
function placeProps(){for(const p of PROPS)world.shape(p.id,p.x,p.y,p.z,{...p.o,solid:false});}

  /* Structures:    *      concrete with stains, corrugated metal, a container's ribs, planks, sandbags in rows ---- */
  let NOISE = null;
  function noiseTex() {   // value noise that tiles (128 px), grey, filtered and mipmapped: seen from near and far
    if (NOISE) return NOISE;
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), img = g.createImageData(S, S);
    const wn = (x, y, per) => { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), m = a => ((a % per) + per) % per, h = (a, b) => E.hash2(m(a) + 11, m(b) + 57);
      return lerp(lerp(h(xi, yi), h(xi + 1, yi), su), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), su), sv); };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let v = 0, a = .5, t = 0; for (let o = 0, f = 4; o < 5; o++, f *= 2) { v += a * wn(x / S * f, y / S * f, f); t += a; a *= .5; }
      const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp((v / t - .5) * 1.7 + .5, 0, 1) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); NOISE = new E.THREE.CanvasTexture(cv); NOISE.wrapS = NOISE.wrapT = E.THREE.RepeatWrapping; NOISE.colorSpace = E.THREE.NoColorSpace; NOISE.anisotropy = 4;
    return NOISE;
  }
  function structureMesh(world) {
    const T3 = E.THREE, { attribute, positionWorld, normalWorld, texture, vec2, float, fract, sin, step, abs, mix, floor, max, length } = E.TSL, NZ = noiseTex();
    const geo = new T3.BufferGeometry();
    geo.setAttribute('position', new T3.Float32BufferAttribute(GEO.P, 3)); geo.setAttribute('normal', new T3.Float32BufferAttribute(GEO.N, 3));
    geo.setAttribute('color', new T3.Float32BufferAttribute(GEO.C, 3)); geo.setAttribute('kind', new T3.Float32BufferAttribute(GEO.K, 1)); geo.setIndex(GEO.I);
    geo.computeBoundingSphere();
    const kind = attribute('kind', 'float'), wp = positionWorld, side = float(1).sub(abs(normalWorld.y)), tn = vec2(normalWorld.z, normalWorld.x.negate());
    const wu = mix(wp.x, wp.xz.dot(tn.div(max(length(tn), .001))), step(.5, side));   // along the face: a wall's own horizontal, a top's x
    const nW = texture(NZ, vec2(wu, wp.y).mul(.21)).r, nT = texture(NZ, wp.xz.mul(.21)).r, n = mix(nT, nW, side), fine = texture(NZ, vec2(wu, wp.y).mul(1.9)).r;
    const concrete = n.sub(.5).mul(.36).add(1).mul(fine.sub(.5).mul(.18).add(1));
    const corr = sin(wu.mul(52)).mul(.09).add(.93).mul(n.sub(.5).mul(.22).add(1));
    const ribs = step(.5, fract(wu.div(.3))).mul(.14).add(.88).mul(n.sub(.5).mul(.34).add(1));
    const planks = step(.06, fract(wp.y.div(.2).add(step(.5, side).oneMinus().mul(wu.div(.2))))).mul(.2).add(.8).mul(fine.sub(.5).mul(.3).add(1));
    const row = floor(wp.y.div(.15)), bu = fract(wu.div(.42).add(row.mul(.5))), bv = fract(wp.y.div(.15)), bag = sin(bu.mul(Math.PI)).mul(sin(bv.mul(Math.PI))).max(0).pow(.5).mul(.4).add(.64);
    const is = i => max(float(0), float(1).sub(abs(kind.sub(i))));   // 1 for its own kind, 0 for the rest
    const k = is(0).mul(concrete).add(is(1).mul(mix(concrete, corr, side))).add(is(2).mul(mix(concrete, ribs, side))).add(is(3).mul(planks)).add(is(4).mul(bag.mul(fine.sub(.5).mul(.2).add(1)))).add(is(5).mul(fine.sub(.5).mul(.12).add(1)));
    const mat = new T3.MeshLambertNodeMaterial({ color: '#ffffff' }); mat.colorNode = attribute('color', 'vec3').mul(k);
    const mesh = new T3.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; world.scene.add(mesh);
    return mesh;
  }

  /* =====================================================================
   * SCATTER: junipers, pines and boulders (shapes) placed chunk by chunk round the player as it moves (in the steps:
   * the trunks near the player are blocks), and grass round the camera (in the frames: only the picture)
   * ===================================================================== */
  const CH = 64 * M, TREE_R = 260 * M, ROCK_R = 170 * M, TRUNK_R = 60 * M;
  const SCAT = {
    juniper: s => ['tree', { params: { h: 26, seed: s }, mats: { l: '#5a6a3a foliage size=3', b: '#5a4636 bark' } }],
    pine: () => ['bottle', { mats: { l: '#8e8a55 foliage size=3', b: '#8e795b bark' } }],
    snag: () => ['pine', { params: { h: 40, tiers: 1 }, mats: { l: '#6a5a44 bark', b: '#7a6650 bark' } }],
    rock: s => ['rock', { params: { r: 7.5, seed: s }, mats: { s: '#b4744e noise' } }]
  };
  /** a chunk's trees and boulders: [kind, seed, x, y, z, facing, scale, trunk radius] (the same every time: its own seed) */
  function chunkItems(world, cx, cy) {
    const out = [], r = E.rng(((cx * 73856093) ^ (cy * 19349663) ^ 0x5bd1e995) | 0), T = world.terrain, nm = [0, 0, 1];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = (cx * 4 + i + .15 + r() * .7) * 16 * M, y = (cy * 4 + j + .15 + r() * .7) * 16 * M, m = x / M, n = y / M, v = r(), s = r(), f = r() * TAU;
      if (biomeAt(m,n)==='salt'||biomeAt(m,n)==='brine') continue;
      if (m < 150 || n < 150 || m > HM - 150 || n > HM - 150 || rs(PADW, m, n) > .02 || rs(ROADC, m, n) > .05) continue;
      const nz = T.normal(x, y, nm)[2], z = T.ground(x, y), river = rs(RIVER, m, n), dens = sstep(.4, .68, fbm(m / 170 + 77, n / 170 + 13, 2)) * .7 + river * .35;
      if (nz > .86 && v < dens * .52) {
        const kind = z > 34 * M || river > .4 ? (s < .7 ? 'pine' : 'snag') : s < .12 ? 'snag' : 'juniper', k = kind === 'juniper' ? 1.4 + s * .9 : kind === 'pine' ? 2.2 + s * 1.2 : 2 + s;
        out.push([kind, 1 + (i + j) % 3, x, y, z - 2, f, k, kind === 'juniper' ? 2.4 * k : 2.6 * k]);
      } else if ((v > .93 && nz > .7) || (nz < .8 && nz > .55 && v > .7)) out.push(['rock', 2 + (i * 3 + j) % 4, x, y, z - 1.5, f, 1 + s * 2.4, 5 * (1 + s * 2.4)]);
    }
    return out;
  }
  const placed = new Map();   // chunk key -> { items, shapes, blocks }
  /** keep the scatter round (x, y): chunks within reach placed (at most `budget` new ones), far ones taken away, trunk
   *  blocks near (x, y) only */
  function streamScatter(world, x, y, budget = 3) {
    const cx0 = Math.floor(x / CH), cy0 = Math.floor(y / CH), R = Math.ceil(TREE_R / CH) + 1, near = [];
    for (let cy = cy0 - R; cy <= cy0 + R; cy++) for (let cx = cx0 - R; cx <= cx0 + R; cx++) {
      if (cx < 0 || cy < 0 || cx >= SIZE / CH || cy >= SIZE / CH) continue;
      const d = Math.hypot((cx + .5) * CH - x, (cy + .5) * CH - y); if (d < TREE_R && !placed.has(cy * 4096 + cx)) near.push([d, cx, cy]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cy] of near.slice(0, budget)) placed.set(cy * 4096 + cx, { cx, cy, items: chunkItems(world, cx, cy), shapes: [], blocks: null });
    for (const [key, c] of placed) {
      const d = Math.hypot((c.cx + .5) * CH - x, (c.cy + .5) * CH - y);
      if (d > TREE_R + CH) { for (const s of c.shapes) world.remove(s); if (c.blocks) for (const b of c.blocks) world.remove(b); placed.delete(key); continue; }
      // shapes: trees within reach, boulders nearer
      const wantRocks = d < ROCK_R;
      const chars=c.items.reduce((v,a)=>v+(Fire.state[cellAt(a[2],a[3])]===2?1:0),0);if (!c.shapes.length || c.rocks !== wantRocks||c.chars!==chars) {c.chars=chars;
        for (const s of c.shapes) world.remove(s); c.shapes = [];
        for (const [kind, seed, ix, iy, iz, f, k] of c.items) if (kind !== 'rock' || wantRocks) { let [id, o] = SCAT[kind](seed);if(kind!=='rock'&&Fire.state[cellAt(ix,iy)]===2){id='charred';o={};} const sh = world.shape(id, ix, iy, iz, Object.assign({ facing: f, scale: k, solid: false }, o)); if (sh) c.shapes.push(sh); }
        c.rocks = wantRocks;
      }
      const wantBlocks = d < TRUNK_R + CH;
      if (wantBlocks && !c.blocks) c.blocks = c.items.map(([kind, , ix, iy, iz, , k, tr]) => world.block({ x: ix, y: iy, z: iz, r: tr, h: kind === 'rock' ? 7 * k : 48 }));
      else if (!wantBlocks && c.blocks) { for (const b of c.blocks) world.remove(b); c.blocks = null; }
    }
  }

  /* ---- grass: 32 m tiles of tufts round the camera, each tile one merged mesh from a pool; every blade leans with the
   *      wind (gusts roll across) and bends away from the player's feet (TSL, in the vertex stage) ---- */
  const GT = 32 * M, GRASS_R = 84 * M, GPOOL = 34, GMAX = 760 * 6 * 3, grass = { pool: [], tiles: new Map(), uT: null, uP: null };
  function grassMeshes(world) {
    const T3 = E.THREE, { attribute, positionLocal, vec3, float, sin, uniform, clamp: cl, length, max } = E.TSL;
    grass.uW=uniform(new T3.Vector2(.12,.06));grass.uT = uniform(0); grass.uP = uniform(new T3.Vector3(0, -999, 0));
    const tip = attribute('tip', 'float'), p = positionLocal;
    const w = sin(grass.uT.mul(1.7).add(p.x.mul(.29)).add(p.z.mul(.17))).mul(.55).add(sin(grass.uT.mul(3.4).add(p.x.mul(.83)).sub(p.z.mul(.61))).mul(.22)).add(.42);
    const d = p.xz.sub(grass.uP.xz), l = max(length(d), .001), near = cl(float(1).sub(l.div(1.15)), 0, 1).mul(cl(float(1.6).sub(p.y.sub(grass.uP.y).abs()), 0, 1));
    const mat = new T3.MeshLambertNodeMaterial({ color: '#ffffff', side: T3.DoubleSide });
    mat.positionNode = p.add(vec3(w.mul(grass.uW.x).add(d.x.div(l).mul(near).mul(.42)), near.mul(-.16), w.mul(grass.uW.y).add(d.y.div(l).mul(near).mul(.42))).mul(tip));
    const bn=E.TSL.texture(Fire.tex,p.xz.div(2048)).level(0).r;mat.positionNode=mat.positionNode.add(vec3(0,bn.mul(tip).mul(-.5),0));mat.colorNode=E.TSL.mix(attribute('color','vec3'),vec3(.02,.018,.016),bn);
    const up = new Float32Array(GMAX * 3); for (let i = 0; i < GMAX; i++) up[i * 3 + 1] = 1;
    const normal = new T3.BufferAttribute(up, 3);
    for (let k = 0; k < GPOOL; k++) {
      const geo = new T3.BufferGeometry();
      geo.setAttribute('position', new T3.BufferAttribute(new Float32Array(GMAX * 3), 3)); geo.setAttribute('normal', normal);
      geo.setAttribute('color', new T3.BufferAttribute(new Float32Array(GMAX * 3), 3)); geo.setAttribute('tip', new T3.BufferAttribute(new Float32Array(GMAX), 1));   // (floats: WebGPU has no one-byte vertex format)
      geo.boundingSphere = new T3.Sphere(new T3.Vector3(), 1); geo.setDrawRange(0, 3);
      const m = new T3.Mesh(geo, mat); m.receiveShadow = true; m.visible = k === 0; m.matrixAutoUpdate = false; world.scene.add(m);   // (one shows at the warm-up: its shader is built)
      grass.pool.push({ mesh: m, key: null, used: -1 });
    }
  }
  /** fill a pooled mesh with tile (tx, ty)'s tufts: golden blades (a sage clump here and there), thinning on roads,
   *  pads, riverbeds and slopes, coloured from the ground under them */
  function buildGrass(world, slot, tx, ty) {
    const geo = slot.mesh.geometry, P = geo.attributes.position.array, C = geo.attributes.color.array, Tp = geo.attributes.tip.array, T = world.terrain;
    const r = E.rng(((tx * 92837111) ^ (ty * 689287499)) | 0), col = [0, 0, 0], nm = [0, 0, 1], step = 1.15; let v = 0;
    const put = (x, y, z, c, k, t) => { P[v * 3] = x / M; P[v * 3 + 1] = z / M; P[v * 3 + 2] = y / M; C[v * 3] = srgb(c[0] * k / 255); C[v * 3 + 1] = srgb(c[1] * k / 255); C[v * 3 + 2] = srgb(c[2] * k / 255); Tp[v] = t; v++; };
    for (let gy = 0; gy < GT / M / step; gy++) for (let gx = 0; gx < GT / M / step; gx++) {
      const x = tx * GT + (gx + r()) * step * M, y = ty * GT + (gy + r()) * step * M, m = x / M, n = y / M, a = r(), b = r();
      const keep = (FUEL[biomeAt(m,n)]?1:0) * (1 - sstep(.05, .5, rs(ROADC, m, n))) * (1 - sstep(.3, .8, rs(PADW, m, n))) * (1 - rs(RIVER, m, n) * .85) * sstep(.78, .9, T.normal(x, y, nm)[2]) * (.55 + N2(m / 9, n / 9) * .6);
      if (a > keep || v > GMAX - 20) continue;
      const z = T.ground(x, y); color(x, y, z, 1, col);
      const sage = N2(m / 14 + 40, n / 14 + 7) > .7 && b < .5, blades = sage ? 5 : 6, hgt = (biomeAt(m,n)==='reeds'?1.3+b*.85:(sage ? .3 : .3 + b * .26)) * M, wid = (sage ? .12 : .042) * M;
      const tint = sage ? [128, 140, 110] : [col[0] * 1.02 + 6, col[1] * 1.02 + 4, col[2] * .9];
      for (let k = 0; k < blades; k++) {
        const ang = (k / blades + b) * TAU, lean = (sage ? .55 : .22 + ((k * 13) % 7) / 30) * hgt, ca = Math.cos(ang), sa = Math.sin(ang), ox = ca * .06 * M, oy = sa * .06 * M;
        put(x + ox - sa * wid, y + oy + ca * wid, z, tint, .62, 0); put(x + ox + sa * wid, y + oy - ca * wid, z, tint, .62, 0);
        put(x + ox + ca * lean, y + oy + sa * lean, z + hgt * (.85 + ((k * 37) % 10) / 40), tint, 1.18, 1);
      }
    }
    for (const a of ['position', 'color', 'tip']) { geo.attributes[a].needsUpdate = true; geo.attributes[a].clearUpdateRanges(); geo.attributes[a].addUpdateRange(0, v * (a === 'tip' ? 1 : 3)); }
    geo.setDrawRange(0, v); geo.boundingSphere.center.set((tx + .5) * GT / M, T.ground((tx + .5) * GT, (ty + .5) * GT) / M, (ty + .5) * GT / M); geo.boundingSphere.radius = GT / M * .75 + 8;
    slot.key = tx + ':' + ty;
  }
  /** a frame's grass round the camera at (x, y): the tiles in reach shown (up to `budget` new ones built), the rest hidden */
  function drawGrass(world, x, y, budget = 2) {
    const f = (grass.frame = (grass.frame || 0) + 1), R = Math.ceil(GRASS_R / GT), tx0 = Math.floor(x / GT), ty0 = Math.floor(y / GT), want = [];
    for (let ty = ty0 - R; ty <= ty0 + R; ty++) for (let tx = tx0 - R; tx <= tx0 + R; tx++) { const d = Math.hypot((tx + .5) * GT - x, (ty + .5) * GT - y); if (d < GRASS_R) want.push([d, tx, ty]); }
    want.sort((a, b) => a[0] - b[0]);
    for (const [, tx, ty] of want) {
      const key = tx + ':' + ty; let s = grass.tiles.get(key);
      if (!s && budget > 0) { s = grass.pool.filter(p => p.used < f - 1).sort((a, b) => a.used - b.used)[0]; if (s) { if (s.key) grass.tiles.delete(s.key); buildGrass(world, s, tx, ty); grass.tiles.set(key, s); budget--; } }
      if (s) s.used = f;
    }
    for (const p of grass.pool) p.mesh.visible = p.used === f;
  }

  /* =====================================================================
   * FX: tracers (streaks that fly from the muzzle to what was hit), bullet holes (a ring of decals), impacts by surface
   * ===================================================================== */
  const TR_MAX = 64, DC_MAX = 160, FL_MAX = 24, FL_V = 3 * (16 + 6 * 2 + 2), fx = { tracers: [], decals: 0, trMesh: null, dcMesh: null, flW: null, flO: null, cam: [0, 0, 0], flashes: { world: [], ov: [] }, stars: [] };
  function fxMeshes(world) {
    const T3 = E.THREE, { attribute } = E.TSL;
    const tg = new T3.BufferGeometry(), ti = [];
    for (let k = 0; k < TR_MAX; k++) ti.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
    tg.setAttribute('position', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setAttribute('color', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setIndex(ti);
    tg.setAttribute('normal', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setDrawRange(0, 6);
    const tm = new T3.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide, fog: false }); tm.colorNode = attribute('color', 'vec3');
    fx.trMesh = new T3.Mesh(tg, tm); fx.trMesh.frustumCulled = false; fx.trMesh.renderOrder = 3; world.scene.add(fx.trMesh);
    const dg = new T3.BufferGeometry(), di = [];
    for (let k = 0; k < DC_MAX; k++) for (let q = 0; q < 6; q++) di.push(k * 7, k * 7 + 1 + q, k * 7 + 1 + (q + 1) % 6);
    dg.setAttribute('position', new T3.BufferAttribute(new Float32Array(DC_MAX * 21), 3)); dg.setAttribute('dc', new T3.BufferAttribute(new Float32Array(DC_MAX * 28), 4));
    dg.setAttribute('normal', new T3.BufferAttribute(new Float32Array(DC_MAX * 21), 3)); dg.setIndex(di);
    const dm = new T3.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: T3.DoubleSide });
    dm.colorNode = attribute('dc', 'vec4').rgb; dm.opacityNode = attribute('dc', 'vec4').a;
    fx.dcMesh = new T3.Mesh(dg, dm); fx.dcMesh.frustumCulled = false; fx.dcMesh.renderOrder = 1; world.scene.add(fx.dcMesh);
    const flashMesh = (sc, mat) => {
      const g = new T3.BufferGeometry(); for (const a of ['position', 'color', 'normal']) g.setAttribute(a, new T3.BufferAttribute(new Float32Array(FL_MAX * FL_V * 3), 3));
      g.setDrawRange(0, 3); const m = new T3.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 4; sc.add(m); return m;
    };
    const tmO = tm.clone(); tmO.colorNode = tm.colorNode; tmO.depthTest = false;   // (on the overlay a flash draws over the gun or the fist that made it)
    fx.flW = flashMesh(world.scene, tm); fx.flO = flashMesh(world.overlay.scene, tmO);
  }
  /** a tracer from a to b (engine units): a bright streak flying at `speed` units a second */
  function tracer(a, b, color = '#ffd890', speed = 9000, width = .5) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (d < 8) return;
    fx.tracers.push({ a: a.slice(), b: b.slice(), d, t: 0, life: d / speed + .03, c: linOf(color), w: width });
    if (fx.tracers.length > TR_MAX) fx.tracers.shift();
  }
  /** a bullet hole (or a scorch: big) at a point on a surface, facing its normal n */
  function decal(p, n, r = .9, color = '#16120e', alpha = .92) {
    const k = fx.decals++ % DC_MAX, g = fx.dcMesh.geometry, P = g.attributes.position.array, Cc = g.attributes.dc.array, c = linOf(color);
    const nl = Math.hypot(n[0], n[1], n[2]) || 1, nx = n[0] / nl, ny = n[1] / nl, nz = n[2] / nl, ax = Math.abs(nz) < .9 ? [0, 0, 1] : [1, 0, 0];
    let tx = ny * ax[2] - nz * ax[1], ty = nz * ax[0] - nx * ax[2], tz = nx * ax[1] - ny * ax[0]; const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx, rot = (fx.decals * 2.39) % TAU;
    const set = (i, x, y, z, a) => { P[(k * 7 + i) * 3] = x / M; P[(k * 7 + i) * 3 + 1] = z / M; P[(k * 7 + i) * 3 + 2] = y / M; const o = (k * 7 + i) * 4; Cc[o] = c[0]; Cc[o + 1] = c[1]; Cc[o + 2] = c[2]; Cc[o + 3] = a; };
    const cx = p[0] + nx * .12, cy = p[1] + ny * .12, cz = p[2] + nz * .12; set(0, cx, cy, cz, alpha);
    for (let q = 0; q < 6; q++) { const a = rot + q * TAU / 6, rr = r * (.8 + ((q * 7 + fx.decals) % 5) * .1), u = Math.cos(a) * rr, v = Math.sin(a) * rr; set(1 + q, cx + tx * u + bx * v, cy + ty * u + by * v, cz + tz * u + bz * v, 0); }
    g.attributes.position.needsUpdate = g.attributes.dc.needsUpdate = true;
  }
  /** a frame's tracers as quads facing the camera (each a streak along its path with a bright head) */
  function drawTracers(dt) {
    const g = fx.trMesh.geometry, P = g.attributes.position.array, C = g.attributes.color.array, cam = fx.cam; let n = 0;
    for (let i = fx.tracers.length - 1; i >= 0; i--) {
      const t = fx.tracers[i]; t.t += dt; if (t.t > t.life) { fx.tracers.splice(i, 1); continue; }
      const u1 = Math.min(1, t.t / t.life * 1.08), u0 = Math.max(0, u1 - Math.min(.5, 260 / t.d)), d = [(t.b[0] - t.a[0]) / t.d, (t.b[1] - t.a[1]) / t.d, (t.b[2] - t.a[2]) / t.d];
      const h = [t.a[0] + d[0] * t.d * u1, t.a[1] + d[1] * t.d * u1, t.a[2] + d[2] * t.d * u1], e = [t.a[0] + d[0] * t.d * u0, t.a[1] + d[1] * t.d * u0, t.a[2] + d[2] * t.d * u0];
      // each end as wide as it needs to be seen at its own distance, thinning to nothing at the eye (a streak that
      // passes the camera never fills the picture)
      const o = n * 12, fade = 1 - t.t / t.life * .5, pts = [[e, -1, .15], [e, 1, .15], [h, 1, 1], [h, -1, 1]];
      pts.forEach(([q, sg, k], j) => {
        const v = [q[0] - cam[0], q[1] - cam[1], q[2] - cam[2]], dist = Math.hypot(...v); let sx = d[1] * v[2] - d[2] * v[1], sy = d[2] * v[0] - d[0] * v[2], sz = d[0] * v[1] - d[1] * v[0]; const sl = Math.hypot(sx, sy, sz) || 1;
        const w = t.w * (1 + dist / 900) * clamp((dist - 12) / 60, 0, 1) * sg; sx = sx / sl * w; sy = sy / sl * w; sz = sz / sl * w;
        P[o + j * 3] = (q[0] + sx) / M; P[o + j * 3 + 1] = (q[2] + sz) / M; P[o + j * 3 + 2] = (q[1] + sy) / M; C[o + j * 3] = t.c[0] * k * fade; C[o + j * 3 + 1] = t.c[1] * k * fade; C[o + j * 3 + 2] = t.c[2] * k * fade;
      });
      if (++n >= TR_MAX) break;
    }
    g.setDrawRange(0, Math.max(6, n * 6)); if (!n) P.fill(0, 0, 12);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
  }
  /** a frame's muzzle flashes as stars facing the eye at cam: a white-hot core, four to six spikes of flame of different
   *  lengths turned at random, a plume along the barrel; additive, so each fades to nothing at its edges and tips. They
   *  last two frames: the shot's, full, and one fading (each its own shape) */
  const FL_PAL = { fire: [[1.7, 1.45, 1], [1.3, .7, .22], [.5, .17, .03]], white: [[1.6, 1.6, 1.55], [1.1, 1, .85], [.35, .3, .26]], blue: [[1.3, 1.6, 1.8], [.45, .9, 1.4], [.08, .24, .5]], purple: [[1.6, 1.4, 1.8], [.95, .55, 1.4], [.3, .1, .5]] };
  /** a hit's star at p (facing d's way, size s, palette 'white', 'blue' or 'purple'): two frames, held through a hit-stop;
   *  (s 0: chips only); shards: chips thrown off it; ov: p is in the eye's frame, drawn on the overlay (over the fist that threw it) */
  function impactStar(p, d, s, pal, shards = 0, ov = false) {
    if (s > 0 && fx.stars.length < 12) fx.stars.push({ p: p.slice(), f: d.slice(), s, pal, t: 0, ov, seed: 1 + Math.floor(Math.abs(p[0] * 31 + p[1] * 17 + p[2] * 7)) % 2147483000 });
    const sd = [-d[1], d[0], 0];
    for (let i = 0; i < shards && fx.stars.length < 24; i++) { const a = (i % 2 ? 1 : -1) * (.4 + Math.random() * .8), v = [(sd[0] * a * 1.6 - d[0] * .4) * 45, (sd[1] * a * 1.6 - d[1] * .4) * 45, 20 + Math.random() * 30]; fx.stars.push({ p: p.slice(), f: d.slice(), s: ov ? .22 : .45, pal, t: 0, v: ov ? mul(v, .5) : v, ov, life: .1, seed: 7 + i * 131 }); }   // (chips thrown aside and back toward the eye, arcing down for six frames)
  }
  function drawFlashes(mesh, list, cam) {
    const g = mesh.geometry, P = g.attributes.position.array, C = g.attributes.color.array, K = [0, 0, 0]; let v = 0;
    const put = (q, c) => { P[v * 3] = q[0] / M; P[v * 3 + 1] = q[2] / M; P[v * 3 + 2] = q[1] / M; C[v * 3] = c[0]; C[v * 3 + 1] = c[1]; C[v * 3 + 2] = c[2]; v++; };
    const tri = (a, ca, b, cb, c, cc) => { put(a, ca); put(b, cb); put(c, cc); };
    for (const fl of list) {
      const { p, s } = fl, h = fl.heat, view = nrm(sub(p, cam)), a = nrm(cross(view, Math.abs(view[2]) < .95 ? UP : [1, 0, 0])), b = cross(a, view);
      let r = fl.seed; const rn = () => (r = (r * 16807) % 2147483647) / 2147483647;
      const pal = FL_PAL[fl.pal || 'fire'], hot = mul(pal[fl.thin && fl.pal !== 'fire' ? 1 : 0], h * (fl.thin ? 1.6 : 1)), warm = mul(pal[1], h * (fl.thin ? 1.6 : 1)), tip = mul(pal[2], h), ring = (rr, t) => add(add(p, a, Math.cos(t) * rr), b, Math.sin(t) * rr);
      const rc = s * (.55 + rn() * .2), dim = mul(warm, h >= 1 ? .16 : 0);
      for (let i = 0; i < 8; i++) { tri(p, hot, ring(rc, i / 8 * TAU), K, ring(rc, (i + 1) / 8 * TAU), K); tri(p, dim, ring(rc * 2.1, i / 8 * TAU), K, ring(rc * 2.1, (i + 1) / 8 * TAU), K); }   // (and the air round it, lit, on the first frame)
      const n = 4 + Math.floor(rn() * 3), rot = rn() * TAU;
      for (let i = 0; i < n; i++) {
        const t = rot + i / n * TAU + (rn() - .5) * .6, d = add(mul(a, Math.cos(t)), b, Math.sin(t)), pp = add(mul(a, -Math.sin(t)), b, Math.cos(t));
        const len = s * (1 + rn() * 1.9) * (i % 2 ? .7 : 1), w = s * (.16 + rn() * .1) * (fl.thin ? .6 : 1), e = add(p, d, len), m = add(p, d, len * .2);
        tri(p, warm, add(m, pp, w), K, e, tip); tri(p, warm, e, tip, add(m, pp, -w), K);
      }
      const wa = cross(fl.f, view), wl = Math.hypot(...wa);
      if (wl > .05) {
        const len = s * (1.8 + rn() * 1.2), e = add(p, fl.f, len), m = add(p, fl.f, len * .3), w = mul(wa, s * .34 / wl);
        tri(p, hot, add(m, w), K, e, tip); tri(p, hot, e, tip, sub(m, w), K);
      }
    }
    g.setDrawRange(0, Math.max(3, v)); if (!v) P.fill(0, 0, 9);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; list.length = 0;
  }


let U=null,water=null,flood=null,waterTime=null,fireLight=null,beamLight=null;
const KF=[[0,'#8aa4e0',.85,'#3a4a86','#1a2030',1.15,'#060b1c','#1a2848','#0a0e18','#16223c'],[5,'#8a94d0',.8,'#3c4a80','#1c2030',1.1,'#0c1434','#34405c','#0e1220','#262f4a'],[6.5,'#ffb070',1.5,'#8a7a98','#54402e',1.05,'#3a5a98','#f6a868','#5a4436','#e0a070'],[9,'#fff0d8',2.8,'#c4d4ee','#8a6a48',1.45,'#3d6fb8','#f2dcb4','#b49070','#ead4b0'],[15,'#fff0d8',3.1,'#c4d4ee','#8a6a48',1.55,'#3d6fb8','#f2dcb4','#b49070','#ead4b0'],[18,'#ff9a58',1.7,'#9a7f8e','#5a3f2c',1.1,'#3a4f90','#ff9a58','#5e4030','#d88a58'],[19.5,'#b0708a',.7,'#46447a','#201e2a',1,'#141a44','#7a4a60','#141218','#3a3048'],[21,'#8aa4e0',.85,'#3a4a86','#1a2030',1.15,'#060b1c','#1a2848','#0a0e18','#16223c'],[24,'#8aa4e0',.85,'#3a4a86','#1a2030',1.15,'#060b1c','#1a2848','#0a0e18','#16223c']];
function makeWeather(){const T=E.THREE,{positionLocal,uniform,mix,pow,dot,max,vec3,float,clamp,smoothstep}=E.TSL;const dir=positionLocal.normalize(),y=dir.y;U={top:uniform(new T.Color()),hor:uniform(new T.Color()),gnd:uniform(new T.Color()),sun:uniform(new T.Vector3(0,1,0)),sunC:uniform(new T.Color('#fff0c8'))};let col=mix(mix(U.hor,U.gnd,clamp(y.negate().mul(4),0,1)),mix(U.hor,U.top,pow(clamp(y,0,1),float(.55))),smoothstep(float(-.01),float(.01),y));const c=max(dot(dir,U.sun),0);col=col.add(U.sunC.mul(smoothstep(float(.9985),float(.9992),c).mul(1.6).add(pow(c,float(40)).mul(.45))));world._skyDome.material.colorNode=vec3(col);world._skyDome.material.needsUpdate=true;
 const {positionWorld,sin}=E.TSL;waterTime=uniform(0);const P=positionWorld,ripple=sin(P.x.mul(1.3).add(waterTime)).mul(sin(P.z.mul(1.7).sub(waterTime.mul(.8))));const wm=new T.MeshLambertNodeMaterial({transparent:true,opacity:.82,side:T.DoubleSide,depthWrite:false});wm.colorNode=mix(vec3(.12,.24,.22),vec3(.34,.46,.4),smoothstep(float(-.6),float(.8),ripple));
 const geo=new T.CircleGeometry(128,64);geo.rotateX(-Math.PI/2);water=new T.Mesh(geo,wm);water.position.set(1120,-13.85,1400);water.renderOrder=2;world.scene.add(water);const fg=new T.PlaneGeometry(2048,2048);fg.rotateX(-Math.PI/2);flood=new T.Mesh(fg,wm);flood.position.set(1024,-30,1024);flood.renderOrder=2;world.scene.add(flood);
 const rg=new T.PlaneGeometry(260,160);rg.rotateX(-Math.PI/2);const reservoir=new T.Mesh(rg,wm);reservoir.position.set(1000,OP.sill.h+38,95);world.scene.add(reservoir);
 fireLight=world.light({color:'#ff9a3f',reach:300,power:12});beamLight=world.light({color:'#f2d999',reach:450,power:12});setHour(18);
}
function setHour(h){h=((h%24)+24)%24;if(S)S.hour=h;if(!U)return;let i=0;while(i<KF.length-2&&h>=KF[i+1][0])i++;const a=KF[i],b=KF[i+1],t=(h-a[0])/(b[0]-a[0]),lc=(x,y,o)=>o.set(x).lerp(new E.THREE.Color(y),t),n=(x,y)=>lerp(x,y,t),w=world;lc(a[1],b[1],w._sun.color);w._sun.intensity=n(a[2],b[2]);lc(a[3],b[3],w._ambient.color);lc(a[4],b[4],w._ambient.groundColor);w._ambient.intensity=n(a[5],b[5]);lc(a[6],b[6],U.top.value);lc(a[7],b[7],U.hor.value);lc(a[8],b[8],U.gnd.value);w.scene.fog.color.set(a[9]).lerp(new E.THREE.Color(b[9]),t);const an=(h-6)/12*Math.PI,day=h>5.6&&h<19.6,sx=day?Math.cos(an):-.35,sz=day?Math.max(Math.sin(an),.12):.7;w._sunDir.set(-sx,-sz,-.28).normalize();U.sun.value.copy(w._sunDir).negate();U.sunC.value.set(day?'#fff0c8':'#c8d4ff');}
function weatherStep(dt){S.hour=(S.hour+dt/TUNE.dayLength)%24;S.weatherTimer+=dt;if(S.weatherTimer>5){setHour(S.hour);S.weatherTimer=0;}S.wind=TUNE.wind;S.windDir+=Math.sin(S.time/120)*dt*.0006;if(S.storm>0){S.storm-=dt;world._fog.near=100;world._fog.far=1920;world.scene.fog.color.set('#bc8253');game.weather={kind:'sand',amount:.7,wind:1};}else{world._fog.near=2500;world._fog.far=19000;if(game.weather)game.weather=null;}if(S.time>60&&Math.floor(S.time)%2160===0&&S.storm<=0){say('Papa Static','Dust off the east bed. Wrap your face. The weather has no papers.');S.storm=150;} }
function drawWeather(){waterTime.value=world.time;const o=OP.lamp,a=world.time*.27,p=world.pen;beamLight.on=S.hour<6||S.hour>18;Object.assign(beamLight,{x:o.x+Math.cos(a)*8*M,y:o.y+Math.sin(a)*8*M,z:o.z+36*M});if(beamLight.on){p.glow(o.x,o.y,o.z+36*M,4,'#ffe3a0');p.tube(o.x,o.y,o.z+36*M,o.x+Math.cos(a)*120*M,o.y+Math.sin(a)*120*M,o.z+35*M,.7,'#b9b293');} }

  /* =====================================================================
   * THE SOLDIER: a procedural skeleton posed every frame from what the body is doing (its speed and heading, crouch,
   * slide, air, the ledge or wall or rung or cable it holds, the gun's pose: aim, recoil, reload, a punch, a kick,
   * a throw, a hit, a death), then drawn with the pen (boots, pads, plates, pouches, a helmet and visor). The player in
   * third person, the raiders and the range's dummies are all soldiers
   * ===================================================================== */
  const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mixv = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const UP = [0, 0, 1], ease = t => t * t * (3 - 2 * t), win = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
  /** a point in a frame: o + f*a + u*b + r*c */
  const at = (F, a, b, c = 0) => [F.o[0] + F.f[0] * a + F.u[0] * b + F.r[0] * c, F.o[1] + F.f[1] * a + F.u[1] * b + F.r[1] * c, F.o[2] + F.f[2] * a + F.u[2] * b + F.r[2] * c];
  /** a frame looking along yaw and pitch (and rolled): { o, f (ahead), u (up), r (right) } */
  function frameYP(o, yaw, pitch, roll = 0) {
    const cp = Math.cos(pitch), f = [Math.cos(yaw) * cp, Math.sin(yaw) * cp, Math.sin(pitch)], r0 = [-Math.sin(yaw), Math.cos(yaw), 0], u0 = cross(f, r0);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    return { o, f, u: add(mul(u0, cr), r0, -sr), r: add(mul(r0, cr), u0, sr) };
  }
  /** turn a frame about its own axes: pitch (about r: the muzzle up), yaw (about u: to the right), roll (about f) */
  function turn(F, pitch, yaw, roll) {
    let { f, u, r } = F;
    if (pitch) { const c = Math.cos(pitch), s = Math.sin(pitch); [f, u] = [add(mul(f, c), u, s), add(mul(u, c), f, -s)]; }
    if (yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); [f, r] = [add(mul(f, c), r, s), add(mul(r, c), f, -s)]; }
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll); [u, r] = [add(mul(u, c), r, s), add(mul(r, c), u, -s)]; }
    return { o: F.o, f, u, r };
  }
  /** two-bone IK: the joint between a (a hip, a shoulder) and the end b, bending toward hint; b pulled in if too far */
  function ik(a, b, L1, L2, hint) {
    let d = sub(b, a), dist = Math.hypot(...d); const mx = (L1 + L2) * .999;
    if (dist > mx) { d = mul(d, mx / dist); b = add(a, d); dist = mx; }
    dist = Math.max(dist, .01); const n = mul(d, 1 / dist);
    let h = sub(hint, mul(n, dot(hint, n))); const hl = Math.hypot(...h); h = hl < 1e-4 ? [n[1], -n[0], 0] : mul(h, 1 / hl);
    const x = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), y = Math.sqrt(Math.max(0, L1 * L1 - x * x));
    return [add(add(a, n, x), h, y), b];
  }
  /** a spring toward a target: s = { x, v } (or arrays of them); k stiffness, d damping */
  const spring = (s, target, k, d, dt) => { s.v += (k * (target - s.x) - d * s.v) * dt; s.x += s.v * dt; return s.x; };
  const SPR = () => ({ x: 0, v: 0 });

  const LOOKS = {
    player: { cloth: '#4a5440', plate: '#cbb48a', dark: '#2c3036', glove: '#33302c', helmet: '#4a5058', visor: '#6ef0ff', skin: '#c89a78', boot: '#2a2622', accent: '#e8742a', pack: '#3a3f36' },
    raider: { cloth: '#6e3a2a', plate: '#3c3632', dark: '#262224', glove: '#2a2420', helmet: '#d8cfbc', visor: '#ff3a2a', skin: '#a87a5a', boot: '#221e1c', accent: '#c8a03a', pack: '#4a3a2e', mask: true },
    heavy: { cloth: '#4a3a4a', plate: '#5a5048', dark: '#24222a', glove: '#2a2428', helmet: '#3a3438', visor: '#c86aff', skin: '#a87a5a', boot: '#221e1c', accent: '#b05ae8', pack: '#3a3240' },
    dummy: { cloth: '#8a8c94', plate: '#e8e4dc', dark: '#4a4c54', glove: '#5a5c64', helmet: '#e8e4dc', visor: '#ffb347', skin: '#d8d4cc', boot: '#3a3c44', accent: '#ff5a2a', pack: '#6a6c74', dummy: true }
  };
  /** a new soldier's body: what the game sets (x, y, z, yaw, aim, velocity, move, the gun's state) and the springs and
   *  phases its pose keeps */
  function body(look, k = 1) {
    return { look: LOOKS[look], k, x: 0, y: 0, z: 0, yaw: 0, aimYaw: 0, aimPitch: 0, vx: 0, vy: 0, vz: 0, grounded: true, move: 'stand', sprint: false, ads: false, weapon: 'rifle',
      act: null, actT: 0, ledge: null, wallN: null, zipP: null, ladder: null, dead: null, hit: [0, 0, 0], flinch: 0, fire: 0, visible: true, onGround: null,
      // pose state
      ph: 0, amp: 0, cr: 0, sl: 0, air: 0, adsB: 0, spB: 0, leanF: SPR(), leanS: SPR(), dip: SPR(), jx: SPR(), jy: SPR(), jz: SPR(), rec: SPR(), pvx: 0, pvy: 0, twist: 0, J: null, G: null, feet: [null, null], stance: null, low: false, lowB: 0 };
  }
  /** joints that would jump when what they do changes (a stride ends, a slide starts, a ledge is caught or let go) go
   *  there over dur seconds from where they were, carried along with the body (key: what they do now) */
  function settle(b, name, key, pts, dt, dur = .12) {
    const o = [b.x, b.y, b.z], s = b[name] || (b[name] = { key, last: null, from: null, t: 0 });
    if (key !== s.key && s.last) { s.from = s.last; s.t = 0; } s.key = key;
    if (s.from) { s.t += dt; const u = ease(clamp(s.t / dur, 0, 1)); for (let i = 0; i < pts.length; i++) if (pts[i] && s.from[i]) pts[i] = mixv(add(o, s.from[i]), pts[i], u); if (u >= 1) s.from = null; }
    s.last = pts.map(q => q && sub(q, o));
  }
  /** the ground under a foot: the level's (the terrain, a floor, a roof) by a short ray down, else the body's own */
  function footGround(world, b, x, y) {
    const h = world.ray(x, y, b.z + 14 * b.k, 0, 0, -1, 30 * b.k, { level: true });
    return h ? h.z : b.z;
  }
  /** pose a soldier for this frame (dt: game seconds since the last pose). Sets b.J (joints) and b.G (the gun's frame) */
  function pose(world, b, dt) {
    const k = b.k, LT = 7.4 * k, LS = 7.1 * k, LU = 4.9 * k, LF = 4.7 * k, sp = Math.hypot(b.vx, b.vy), fine = b.visible;
    // the blends, eased toward what the body is doing
    const ap = (v, t, r) => v + (t - v) * Math.min(1, dt * r);
    b.cr = ap(b.cr, b.move === 'crouch' ? 1 : 0, 10); b.sl = ap(b.sl, b.move === 'slide' ? 1 : 0, 12); b.air = ap(b.air, b.move === 'air' ? 1 : 0, 9);
    b.adsB = ap(b.adsB, b.ads ? 1 : 0, 12); b.spB = ap(b.spB, b.sprint && b.move === 'stand' && !b.act ? 1 : 0, 8);
    b.trB = ap(b.trB || 0, ['mantle', 'climb', 'ladder'].includes(b.move) ? 1 : 0, 14);
    b.lowB = ap(b.lowB, b.low && !b.ads && !b.sprint && !b.act && (b.move === 'stand' || b.move === 'crouch') ? 1 : 0, 7);
    const walking = (b.move === 'stand' || b.move === 'crouch') && b.grounded;
    b.amp = ap(b.amp, walking ? clamp(sp / 34, 0, 1) : 0, 8);
    const L = (b.move === 'crouch' ? 22 : 16) * k + sp * .3;   // a stride (two steps) grows with speed
    if (walking) b.ph = (b.ph + sp / L * dt) % 1;
    // leaning: into the acceleration, forward with speed, into turns
    const fw = [Math.cos(b.yaw), Math.sin(b.yaw), 0], rt = [-Math.sin(b.yaw), Math.cos(b.yaw), 0], ax = dt > 0 ? (b.vx - b.pvx) / dt : 0, ay = dt > 0 ? (b.vy - b.pvy) / dt : 0; b.pvx = b.vx; b.pvy = b.vy;
    const accF = ax * fw[0] + ay * fw[1], accS = ax * rt[0] + ay * rt[1];
    spring(b.leanF, clamp(accF * .0006 + (walking ? sp * .0024 : 0) + b.spB * .3, -.25, .5), 120, 16, dt); spring(b.leanS, clamp(accS * .0005, -.3, .3), 120, 16, dt);
    spring(b.dip, 0, 160, 15, dt); spring(b.rec, 0, 260, 22, dt);
    for (const [q, j] of [[b.jx, 0], [b.jy, 1], [b.jz, 2]]) { q.v += b.hit[j]; spring(q, 0, 140, 13, dt); } b.hit[0] = b.hit[1] = b.hit[2] = 0;
    // the pelvis: standing, crouched, sliding, in the air; the walk's bob and sway; a landing's dip
    const run = clamp((sp - 60) / 50, 0, 1), bob = walking ? Math.abs(Math.sin(b.ph * TAU)) : 0;
    let pz = (15.2 - b.cr * 5.2 - b.sl * 9.8 - b.air * .6) * k + (walking ? (bob - .6) * (.5 + run * .9) * b.amp * k : 0) + b.dip.x;
    if (b.move === 'stand' && !walking) pz += Math.sin(drawT * 1.6) * .12 * k;   // breathing
    const P = [b.x + b.jx.x * .3, b.y + b.jy.x * .3, b.z + pz];
    if (walking) { const sw = Math.sin(b.ph * TAU) * (.35 + run * .25) * b.amp * k; P[0] += rt[0] * sw; P[1] += rt[1] * sw; }
    // turning on the spot: the feet keep the heading they planted at (the hips turn over them) until the body has turned
    // past it, then step round one after the other, the foot on the side it turns to first
    if (!((b.move === 'stand' || b.move === 'crouch') && !(walking && b.amp > .02))) b.stance = null;
    else {
      if (!b.stance || Math.hypot(b.x - b.stance.x, b.y - b.stance.y) > 3 * k) b.stance = { yaw: b.yaw, x: b.x, y: b.y, from: null, t: 1, lead: 0 };
      const S0 = b.stance, dyaw = ((b.yaw - S0.yaw + Math.PI * 3) % TAU) - Math.PI, turning = Math.abs(((b.yaw - (b.pyaw ?? b.yaw) + Math.PI * 3) % TAU) - Math.PI) > dt * .3;
      S0.still = turning ? 0 : (S0.still || 0) + dt; b.pyaw = b.yaw;
      if (S0.t >= 1 && (Math.abs(dyaw) > .48 || (Math.abs(dyaw) > .2 && S0.still > .3)))   // (past the feet: step round, aiming past the turn; stopped turning askew: a last step squares them)
        Object.assign(S0, { from: { yaw: S0.yaw, x: S0.x, y: S0.y }, yaw: b.yaw + (turning ? Math.sign(dyaw) * Math.min(.35, Math.abs(dyaw) * .45) : 0), x: b.x, y: b.y, t: 0, lead: dyaw > 0 ? 1 : 0 });
      if (S0.t < 1) {   // (the hips shift over the planted foot while the other lifts, and dip a little as each lands)
        S0.t = Math.min(1, S0.t + dt / .32); const t = S0.t, u0 = clamp(t / .58, 0, 1), u1 = clamp((t - .42) / .58, 0, 1), sh = (Math.sin(u0 * Math.PI) * (S0.lead ? -1 : 1) + Math.sin(u1 * Math.PI) * (S0.lead ? 1 : -1)) * .5 * k;
        P[0] += rt[0] * sh; P[1] += rt[1] * sh; P[2] -= (Math.max(0, 1 - Math.abs(t - .6) / .1) + Math.max(0, 1 - Math.abs(t - .96) / .08)) * .3 * k;
      }
    }
    const standFoot = (i, yaw, x, y) => {
      const f = [Math.cos(yaw), Math.sin(yaw), 0], r = [-f[1], f[0], 0], side = i ? 1 : -1;
      return { p: add(add([x, y, 0], r, side * (2.1 + b.cr * .7) * k), f, (i ? 1.2 : -.9) * k * (1 + b.cr)), toe: nrm(add(f, r, side * .25)) };
    };
    // ---- the feet on the ground (the gait, standing, crouched, sliding, on a rung), before the pelvis settles to them ----
    const footZ = (x, y) => fine ? footGround(world, b, x, y) : b.z, A = [null, null], toe = [fw, fw];
    if (!(walking && b.amp > .02)) b.feetW = null;
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      if (b.move === 'slide') {   // the lead leg out ahead, the other tucked under
        const vd = sp > 1 ? [b.vx / sp, b.vy / sp, 0] : fw, out = i === 1;
        A[i] = add(add([b.x, b.y, b.z], vd, out ? 9 * k : 2 * k), rt, side * (out ? 1.2 : 2.6) * k); A[i][2] = footZ(A[i][0], A[i][1]) + (out ? 1.6 : 1.1) * k; toe[i] = vd;
      } else if (b.move === 'ladder') {   // on the rungs, stepping in turn
        const Ld = b.ladder, st = .3 * M, ph = (b.z / st + i * .5) % 1, rung = Math.floor(b.z / st + i * .5) * st - i * st / 2;
        A[i] = add(add([b.x, b.y, 0], fw, 1.6 * k), rt, side * 1.9 * k); A[i][2] = Math.max(Ld ? Ld.z0 : 0, rung) + (ph < .3 ? ph * 6 : 0) * k + 1;
      } else if (walking && b.amp > .02) {   // the gait: stance plants the foot (it moves back as fast as the body goes on), swing lifts it forward
        const q = (b.ph + i * .5) % 1, duty = lerp(.6, .34, clamp((sp - 30) / 70, 0, 1)), reach = duty * L * .5, md = sp > 1 ? [b.vx / sp, b.vy / sp, 0] : fw;
        let along, lift, roll = 0;
        if (q < duty) { const t = q / duty; along = reach * (1 - 2 * t); lift = 0; roll = t > .7 ? -(t - .7) / .3 * .6 : 0; }   // (the heel rises as it pushes off)
        else { const t = (q - duty) / (1 - duty); along = -reach + 2 * reach * ease(t); lift = Math.sin(t * Math.PI) * (2 + run * 3.2) * k; roll = lerp(-.7, .45, t); }   // (toe down off the ground, up to meet it)
        const base = add(add([b.x, b.y, 0], rt, side * (2.1 - run * .5) * k * (1 + b.cr * .25)), md, along * b.amp * Math.min(1, sp / 24));   // (the stride shrinks to nothing as the body turns back through a stop: its way flips there)
        // (the foot on the ground stays where it was put down while the body turns, slows or changes way over it, up
        // to half a stride from where the gait would have it; a swing carries it on from where it left the ground)
        const FW = b.feetW || (b.feetW = [null, null]); let f = FW[i], p = [base[0], base[1]];
        if (q < duty) { if (!f || !f.st) f = FW[i] = { st: true, p }; else p = f.p; }
        else { if (!f || f.st) f = FW[i] = { st: false, from: f ? f.p : p }; const u = ease((q - duty) / (1 - duty)); p = [lerp(f.from[0], p[0], u), lerp(f.from[1], p[1], u)]; }
        { const dx = p[0] - base[0], dy = p[1] - base[1], dd = Math.hypot(dx, dy), lim = (reach * .45 + 1.5 * k) * Math.min(1, b.amp * 1.5);   // (half a stride at most; as the body stops, the feet come in under it)
          if (dd > lim) { p = [base[0] + dx * lim / dd, base[1] + dy * lim / dd]; if (f.st) f.p = p; } }
        A[i] = [p[0], p[1], footZ(p[0], p[1]) + 1.15 * k + lift * b.amp]; toe[i] = nrm(add(add(fw, md, .5), UP, roll * b.amp));
      } else if (b.move === 'stand' || b.move === 'crouch') {   // standing: feet apart, the rear one turned out; crouched: wider, a knee forward
        const S0 = b.stance, now = standFoot(i, S0.yaw, S0.x, S0.y); let base = now.p, lift = 0, tq = now.toe;
        if (S0.t < 1 && S0.from) {   // a step round: lifted, carried, put down
          const u = clamp((S0.t - (i === S0.lead ? 0 : .42)) / .58, 0, 1), was = standFoot(i, S0.from.yaw, S0.from.x, S0.from.y);
          base = mixv(was.p, now.p, ease(u)); lift = Math.sin(u * Math.PI) * 2.3 * k; tq = nrm(mixv(was.toe, now.toe, u));
        }
        A[i] = [base[0], base[1], footZ(base[0], base[1]) + 1.15 * k + lift]; toe[i] = tq;
      }
    }
    // a kick: the right leg snaps out ahead at the waist and back (the torso leans away to balance)
    const kick = b.act === 'kick' ? win(b.actT, .04, .2) * (1 - win(b.actT, .3, .58)) : 0;
    if (kick > 0 && A[1]) A[1] = mixv(A[1], add(add([b.x, b.y, b.z + 9 * k], fw, 12.5 * k), rt, .8 * k), kick), toe[1] = nrm(mixv(toe[1], add(fw, UP, 1.2), kick));
    // the pelvis comes down until both legs reach their feet (a long stride lowers it: the run's bob)
    const pz0 = P[2];
    for (let i = 0; i < 2; i++) if (A[i] && !(kick > 0 && i === 1)) { const hx = P[0] + rt[0] * (i ? 1.85 : -1.85) * k - A[i][0], hy = P[1] + rt[1] * (i ? 1.85 : -1.85) * k - A[i][1], R = (LT + LS) * .985; P[2] = Math.min(P[2], A[i][2] + Math.sqrt(Math.max(0, R * R - hx * hx - hy * hy))); }
    // (the hips go down to the feet on a stiff spring, not at once: a foot held to the ground a little far, then lifted,
    // dropped the hips and sprang them back up in a frame)
    { const drop = pz0 - P[2], D = b.dropS || (b.dropS = { x: drop, v: 0 }); spring(D, drop, 900, 60, dt); P[2] = pz0 - Math.max(0, D.x); }
    // the torso: leaning, twisting toward the aim, curling back on a slide; the head looks along the aim
    const twist = clamp(((b.aimYaw - b.yaw + Math.PI * 3) % TAU) - Math.PI, -1.2, 1.2);
    const lf = b.leanF.x + b.sl * -.55 + b.cr * .18 + b.air * (b.vz > 0 ? .08 : -.05) - kick * .35, ls = b.leanS.x;
    const upT = nrm(add(add(add(UP, fw, lf), rt, ls), [b.jx.x * .05, b.jy.x * .05, 0]));
    const chestYaw = b.yaw + twist * .75, cf = [Math.cos(chestYaw), Math.sin(chestYaw), 0];
    let rtT = nrm(cross(upT, cf)); rtT = nrm(sub(rtT, mul(upT, dot(rtT, upT)))); const fT = nrm(cross(rtT, upT));
    const pitchBend = b.aimPitch * (.42 + b.adsB * .1) * (1 - b.spB);
    const upC = nrm(add(mul(upT, Math.cos(pitchBend)), fT, Math.sin(pitchBend))), fC = nrm(cross(rtT, upC));
    const C = add(add(P, upT, 5.2 * k), [b.jx.x, b.jy.x, b.jz.x]), N = add(C, upC, 4.4 * k), Hd = add(N, nrm(add(upC, fC, Math.sin(b.aimPitch) * .3 + b.spB * .45)), 2.3 * k);   // (a sprint drives the head forward and down)
    const S = [add(add(N, upC, -1.3 * k), rtT, -3.15 * k), add(add(N, upC, -1.3 * k), rtT, 3.15 * k)];
    const Hp = [add(P, rt, -1.85 * k), add(P, rt, 1.85 * k)];
    // ---- the legs: the feet that hang from the body (in the air, vaulting, at a wall, on a cable), then the knees by IK ----
    const feet = [];
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      if (b.move === 'air' || b.move === 'vault') {   // knees up on the way up, reaching down to land
        const up = clamp(b.vz / 110, -1, 1), tuck = b.move === 'vault' ? 1 : .55 + up * .4;
        A[i] = add(add(P, rt, side * 2.1 * k), fw, (i ? 2 : -1.5) * k * (1 - tuck * .4)); A[i][2] = P[2] - (13.2 - tuck * 6.5 - (i ? 1.5 : 0)) * k;
      } else if (b.move === 'mantle' || b.move === 'climb') {   // feet scrabbling at the wall, a knee up
        const tt = drawT * (b.move === 'climb' ? 9 : 4) + i * Math.PI, wn = b.wallN || mul(fw, -1);
        A[i] = add(add([b.x, b.y, b.z], rt, side * 2 * k), wn, -1.2 * k); A[i][2] = b.z + (2 + Math.max(0, Math.sin(tt)) * 5) * k + (b.move === 'mantle' ? (i ? 4 : 1) * k : 0);
      } else if (b.move === 'zip') {   // hanging: legs together, swinging a little
        A[i] = add(add(P, rt, side * 1.4 * k), fw, (1.5 + Math.sin(drawT * 3 + i) * 1.5) * k); A[i][2] = P[2] - 13.4 * k;
      }
    }
    settle(b, 'feetB', walking && b.amp > .02 ? 'gait' : (b.move === 'stand' || b.move === 'crouch') && b.stance ? b.stance : b.move, A, dt);
    for (let i = 0; i < 2; i++) if (A[i]) { const hint = nrm(add(add(fw, rt, (i ? 1 : -1) * .25), UP, -.1)); feet.push({ A: A[i], Kn: ik(Hp[i], A[i], LT, LS, hint)[0], toe: toe[i] }); }
    // ---- the gun and the hands ----
    const G = gunFrame(b, C, N, Hd, upC, fC, rtT);
    const hands = handTargets(b, G, C, Hd, fC, rtT, upC);
    settle(b, 'handsB', b.move === 'ladder' && b.ladder ? 'ladder' : b.move === 'zip' && b.zipP ? 'zip' : b.ledge && (b.move === 'mantle' || b.move === 'climb') ? 'ledge' : 'gun', hands, dt);
    const hintR = nrm(add(add(rtT, upC, -.9 + b.spB * .5), fC, -.3)), hintL = nrm(add(add(rtT, upC, -1.4 + b.spB * .5), fC, -.2 - b.spB * .4));   // (a sprint swings the elbows out)
    const arms = [ik(S[0], hands[0], LU, LF, hintL), ik(S[1], hands[1], LU, LF, hintR)];
    b.J = { P, C, N, Hd, S, Hp, feet, arms, hands, upT, upC, rtT, fT, fC, fw, rt };
    b.G = G;
    if (b.move === 'dead') deadPose(world, b);
  }
  /** where the gun is: low and across the chest at a sprint, at the shoulder (the cheek on the stock down the sights),
   *  dipped for a punch or a throw, tilted for a reload; pushed back by recoil */
  function gunFrame(b, C, N, Hd, upC, fC, rtT) {
    const k = b.k, aim = frameYP([0, 0, 0], b.aimYaw, b.aimPitch);
    let F = { o: add(add(add(N, fC, 3.1 * k), rtT, 3 * k), upC, -3 * k), f: aim.f, u: aim.u, r: aim.r };   // (the stock in the right shoulder's pocket)
    if (b.adsB > .01) F.o = mixv(F.o, add(add(add(Hd, aim.f, 3 * k), aim.u, -2.6 * k), aim.r, 1.2 * k), b.adsB);
    if (b.lowB > .01) { const lo = turn(F, -.32 * b.lowB, .16 * b.lowB, .12 * b.lowB); lo.o = mixv(F.o, add(add(add(C, fC, 2.4 * k), rtT, 4.3 * k), upC, -1.8 * k), b.lowB); F = lo; }   // (the low ready: at the right side, muzzle down, where a camera over the shoulder sees it)
    if (b.spB > .01) {   // a sprint at port arms: the rifle across the chest, muzzle up past the left shoulder, swinging with the stride
      // (the rifle rises against world up: the torso leans into the run)
      const sw = Math.sin(b.ph * TAU) * b.amp, pf = nrm(add(add(mul(rtT, -.5), UP, .87 + sw * .05), fC, .04)), pu = nrm(sub(fC, mul(pf, dot(fC, pf))));
      const f = nrm(mixv(F.f, pf, b.spB)), u0 = mixv(F.u, pu, b.spB), u = nrm(sub(u0, mul(f, dot(u0, f))));
      F = { o: mixv(F.o, add(add(add(C, fC, 3.2 * k), rtT, (2.4 + sw * .3) * k), upC, 1.6 * k), b.spB), f, u, r: cross(u, f) };   // (high port arms: from behind, the barrel's top stands clear beside and above the helmet)
    }
    if (b.move === 'slide') F = turn(F, 0, 0, -.35 * b.sl);
    const a = b.act;
    if (a) {
      const t = b.actT;
      if (a === 'reload') { const R = reloadCurve(b.weapon, t, b.reloadDur, b.reloadEmpty); F = turn(F, R.pitch, R.yaw, R.roll); F.o = add(F.o, F.u, R.lift * k); }
      else if (a === 'melee' || a === 'throw' || a === 'kick') { const d = a === 'melee' ? win(t, 0, .07) * (1 - win(t, .32, .5)) : win(t, 0, .12) * (1 - win(t, .4, .6)); F = turn(F, -.7 * d, .5 * d, .6 * d); F.o = add(add(F.o, F.r, 1.5 * d * k), F.u, -2.2 * d * k); }
      else if (a === 'swap') { const d = Math.sin(Math.min(1, t / .5) * Math.PI); F = turn(F, -1.1 * d, 0, .3 * d); F.o = add(F.o, F.u, -3 * d * k); }
    }
    if (b.trB > .01) { const d = b.trB, o = F.o; F = turn(F, -1.3 * d, .9 * d, .3 * d); F.o = mixv(o, add(add(C, rtT, 2 * k), [0, 0, -3 * k]), d); }   // (slung for a climb, eased)
    if (b.move === 'zip') { F.o = add(add(C, fC, 3 * k), rtT, 2 * k); }
    F.o = add(F.o, F.f, -b.rec.x * 1.1 * k);
    if (b.rec.x) F = turn(F, b.rec.x * .06, 0, 0);
    return F;
  }
  /** the hands: right on the grip, left on the handguard (or the mag, the pump, the ledge, a rung, the cable, a punch) */
  function handTargets(b, G, C, Hd, fC, rtT, upC) {
    const k = b.k, W = WEAPONS[b.weapon];
    let R = at(G, -.5 * k, -1.5 * k, 0), Lh = at(G, (W.fore - (b.gun ? b.gun.pump || 0 : 0) * 2.3) * k, -.35 * k, -.2 * k);
    const a = b.act, t = b.actT;
    if (a === 'reload') { const R2 = reloadCurve(b.weapon, t, b.reloadDur, b.reloadEmpty); if (R2.hand) Lh = at(G, R2.hand[0] * k, R2.hand[1] * k, R2.hand[2] * k); }
    if (a === 'melee') {   // the left fist: back, then out across the front at chest height, then home
      const wind = win(t, 0, .045), hit = win(t, .045, .085), back = win(t, .16, .38), aim = [Math.cos(b.aimYaw), Math.sin(b.aimYaw), Math.sin(b.aimPitch) * .6];
      const cock = add(add(C, rtT, -3.5 * k), fC, -.5 * k), strike = add(add(C, aim, 9 * k), upC, 1.6 * k);
      Lh = mixv(mixv(mixv(Lh, cock, wind), strike, hit), Lh, back);
    }
    if (a === 'throw') { const wind = win(t, .1, .35), rel = win(t, .35, .48), back = win(t, .55, .75); Lh = mixv(mixv(mixv(Lh, add(add(Hd, rtT, -3.2 * k), fC, -3 * k), wind), add(add(Hd, fC, 8 * k), upC, 1.5 * k), rel), Lh, back); }
    if (b.ledge && (b.move === 'mantle' || b.move === 'climb')) {
      const e = b.ledge, wn = b.wallN || [0, 0, 0], sd = nrm(cross(UP, wn)), up = b.move === 'climb' ? drawT * 7 : 0;
      const hl = add(add(e, sd, 2.4 * k), wn, .6), hr = add(add(e, sd, -2.4 * k), wn, .6);
      if (b.move === 'climb') { hl[2] = Math.min(e[2], Hd[2] + 2 + Math.max(0, Math.sin(up)) * 4); hr[2] = Math.min(e[2], Hd[2] + 2 + Math.max(0, Math.sin(up + Math.PI)) * 4); }
      Lh = hl; R = hr;
    }
    if (b.move === 'ladder' && b.ladder) {
      const Ld = b.ladder, f = [Math.cos(Ld.yaw), Math.sin(Ld.yaw), 0], s = [-f[1], f[0], 0], base = [Ld.x, Ld.y, 0], step = .3 * M;
      const rung = i => { const z = Math.floor((Hd[2] + (i ? step / 2 : 0)) / step) * step + (i ? 0 : step / 2); return add(add(base, s, (i ? 1 : -1) * .24 * M), [0, 0, Math.min(Ld.z1 + .8 * M, z)]); };
      Lh = rung(0); R = rung(1);
    }
    if (b.move === 'zip' && b.zipP) Lh = b.zipP;
    return [Lh, R];
  }
  /** a death: the knees fold and the pelvis drops (a little the shot's way), then the body falls back from the hips
   *  until it lies on the ground, the arms going limp; the gun leaves the hands and clatters down beside it */
  function deadPose(world, b) {
    const D = b.dead, t = D.t, k = b.k, J = b.J, g = D.g ?? b.z, dir = [Math.cos(D.dir), Math.sin(D.dir), 0], axis = nrm(cross(UP, dir));
    const sink = ease(win(t, 0, .4)), fall = clamp((t - .16) / .52, 0, 1), phi = fall * fall * 1.5 + Math.sin(clamp((t - .68) / .22, 0, 1) * Math.PI) * .07;
    const P0 = J.P, P = mixv(P0, [P0[0] + dir[0] * 4 * k, P0[1] + dir[1] * 4 * k, g + 2.4 * k], sink), dP = sub(P, P0);
    const c = Math.cos(phi), sn = Math.sin(phi), tilt = v => add(add(mul(v, c), cross(axis, v), sn), axis, dot(axis, v) * (1 - c));
    const rot = q => { const o = add(add(P0, tilt(sub(q, P0))), dP); o[2] = Math.max(o[2], g + 1.3 * k); return o; };
    if (!D.G0 && b.G) D.G0 = { o: b.G.o.slice(), f: b.G.f.slice(), u: b.G.u.slice(), r: b.G.r.slice() };
    for (const key of ['C', 'N', 'Hd']) J[key] = rot(J[key]);
    J.P = P; J.S = J.S.map(rot); J.Hp = J.Hp.map(q => add(q, dP));
    for (const key of ['upT', 'upC', 'fT', 'fC', 'rtT']) J[key] = tilt(J[key]);
    // the legs: the feet stay where they stood, the knees fold up between
    J.feet = [0, 1].map(i => { const side = i ? 1 : -1, A = add(add([b.x, b.y, g + 1.15 * k], J.rt, side * (2.3 + sink) * k), J.fw, (i ? 1 : -1) * sink * 1.5 * k); return { A, Kn: ik(J.Hp[i], A, 7.4 * k, 7.1 * k, nrm(add(add(J.fw, UP, .5), J.rt, side * .4)))[0], toe: nrm(add(J.fw, J.rt, side * .5)) }; });
    // the arms: on the gun until it drops, then limp beside the body, on the ground
    const let_go = win(t, .22, .5), held = J.hands.map(rot), limp = [0, 1].map(i => { const h = add(add(J.S[i], J.rtT, (i ? 1 : -1) * 3.5 * k), J.upC, -4.5 * k); h[2] = Math.max(g + 1.1 * k, h[2] - let_go * 6 * k); return h; });
    J.hands = held.map((h, i) => mixv(h, limp[i], let_go));
    J.arms = [0, 1].map(i => ik(J.S[i], J.hands[i], 4.9 * k, 4.7 * k, nrm(add(mul(J.upC, -1), J.rtT, (i ? 1 : -.4)))));
    // the gun: turning with the body, then falling free to lie on its side
    const G0 = D.G0; if (!G0) return;
    if (t < .24) b.G = { o: rot(G0.o), f: tilt(G0.f), u: tilt(G0.u), r: tilt(G0.r) };
    else {
      if (!D.Gd) { const c2 = Math.cos(phi), s2 = Math.sin(phi), tl = v => add(add(mul(v, c2), cross(axis, v), s2), axis, dot(axis, v) * (1 - c2)); D.Gd = { o: rot(G0.o), f: tl(G0.f), r: tl(G0.r) }; }
      const u = t - .24, Gd = D.Gd, fl = nrm([Gd.f[0], Gd.f[1], 0]), s = win(u, 0, .32), o = add(Gd.o, [dir[0] * Math.min(u, .4) * 18, dir[1] * Math.min(u, .4) * 18, 0]);
      o[2] = Math.max(g + .8 * k, Gd.o[2] - .5 * GRAV * u * u);
      const f = nrm(mixv(Gd.f, fl, s)), r = nrm(mixv(Gd.r, UP, s)); b.G = { o, f, r, u: nrm(cross(f, r)) };
    }
  }

  /* ---- drawing a soldier with the pen (engine units, the pen's frame at the origin) ---- */
  function drawSoldier(pen, b) {
    const J = b.J; if (!J) return;
    const c = b.look, k = b.k, tube = (a, e, r, col) => pen.tube(a[0], a[1], a[2], e[0], e[1], e[2], r * k, col), ball = (p, r, col) => pen.ball(p[0], p[1], p[2], r * k, r * k, r * k, col);
    const slab = (a, e, ac, w, t, col) => pen.slab(a[0], a[1], a[2], e[0], e[1], e[2], ac[0], ac[1], ac[2], w * k, t * k, col);
    pen.flash = b.flash > 0;
    // legs: boots, shins with guards, knee pads, thighs, a holster
    J.feet.forEach(({ A, Kn, toe }, i) => {
      const fr = nrm(cross(toe, UP)), heel = add(add(A, toe, -1.3 * k), UP, -.55 * k), tip = add(add(A, toe, 2.5 * k), UP, -.75 * k);
      slab(heel, tip, fr, 2.1, 1.7, c.boot); slab(add(heel, UP, -.6 * k), add(tip, UP, -.55 * k), fr, 2.2, .45, c.dark);
      const lf = nrm(sub(Kn, A)), legF = nrm(cross(fr, lf)).map(v => -v);
      tube(A, Kn, 1.28, c.cloth); slab(add(add(A, lf, 1.6 * k), legF, .9 * k), add(Kn, legF, .9 * k), fr, 1.7, .55, c.plate);
      ball(add(Kn, legF, .55 * k), 1.38, c.dark);
      tube(Kn, J.Hp[i], 1.75, c.cloth);
      if (i === 1) slab(add(lerpP(Kn, J.Hp[i], .55), fr, -1.4 * k), add(lerpP(Kn, J.Hp[i], .88), fr, -1.5 * k), lf, 1.5, 1, c.dark);
    });
    // the belt, the torso, its plate and pouches, the pack
    const { P, C, N, Hd, upT, upC, rtT, fT, fC } = J;
    slab(add(P, rtT, -2.5 * k), add(P, rtT, 2.5 * k), fT, 3.6, 2.6, c.dark);
    for (const s of [-1.3, 0, 1.3]) slab(add(add(add(P, rtT, s * k), fT, 1.9 * k), upT, -.2 * k), add(add(add(P, rtT, s * k), fT, 1.9 * k), upT, 1.1 * k), rtT, 1.1, .9, c.pack);
    slab(add(P, upT, .6 * k), add(N, upC, -.6 * k), rtT, 6.0, 3.7, c.cloth);
    slab(add(add(P, upT, 3.2 * k), fC, 1.75 * k), add(add(N, upC, -1.1 * k), fC, 1.6 * k), rtT, 5.3, 1.1, c.plate);
    for (const s of [-1.6, 0, 1.6]) slab(add(add(add(P, upT, 3.6 * k), fC, 2.4 * k), rtT, s * k), add(add(add(P, upT, 5.4 * k), fC, 2.4 * k), rtT, s * k), rtT, 1.3, .8, s ? c.pack : c.accent);
    slab(add(add(P, upT, 2.6 * k), fC, -2.6 * k), add(add(N, upC, -1.2 * k), fC, -2.8 * k), rtT, 4.6, 2.3, c.pack);
    if (!c.dummy) slab(add(add(N, upC, -1.4 * k), fC, -4 * k), add(add(N, upC, 1.6 * k), fC, -3.6 * k), rtT, .4, .4, c.dark);   // a radio's aerial
    // arms: pads, sleeves, gloves
    J.arms.forEach(([El, Hn], i) => { const Sh = J.S[i]; ball(Sh, 1.85, c.plate); tube(Sh, El, 1.22, c.cloth); ball(El, 1.15, c.dark); tube(El, Hn, 1.08, c.cloth); tube(lerpP(El, Hn, .55), Hn, 1.16, c.glove); ball(Hn, 1.1, c.glove); });
    // the neck and head: a helmet with a visor (the raiders: a pale mask with eyes that glow)
    tube(N, Hd, .95, c.dark);
    const hf = nrm(sub(Hd, N)), hfw = nrm(add(fC, hf, -dot(fC, hf))), hr = nrm(cross(hf, hfw));
    ball(add(Hd, hfw, .5 * k), 1.75, c.skin);
    ball(add(Hd,hf,.9*k),1.85,c.helmet);
    ball(add(Hd,hfw,1.9*k),.45,c.skin);
    for(const ss of [-1,1]) {
      ball(add(add(add(Hd,hfw,1.62*k),hr,ss*.65*k),hf,.25*k),.18,'#201b17');
      slab(add(add(add(Hd,hfw,1.6*k),hr,ss*.65*k-.3*k),hf,.68*k),add(add(add(Hd,hfw,1.6*k),hr,ss*.65*k+.3*k),hf,.68*k),hf,.16,.18,c.dark);
    }
    slab(add(add(Hd,hfw,1.65*k),hf,-.7*k),add(add(Hd,hfw,1.65*k),hf,-.8*k-(b.talk?Math.sin(world.time*28)*.25:0)),hr,.7,.15,c.dark);
    if(c.accent==='#9c2a1e')slab(add(N,rtT,-2*k),add(N,rtT,2*k),upC,.7,.6,c.accent);
    if (b.G) drawGun(pen, b.G, b.weapon, b.gun || GUN0, k);
    pen.flash = false;
  }
  const lerpP = (a, e, t) => [a[0] + (e[0] - a[0]) * t, a[1] + (e[1] - a[1]) * t, a[2] + (e[2] - a[2]) * t];
  const GUN0 = { mag: 0, bolt: 0, pump: 0, flash: 0 };
  /** a gun in its frame (o: the grip's top, f along the barrel, u up, r right): the RANGER rifle (a holo sight, a curved
   *  mag, a two-tone handguard) or the BREACHER pump shotgun; st: { mag (0 in, 1 in the hand at st.magP, 2 out), bolt
   *  (the charging handle pulled 0..1), pump (0..1), flash (0..1), shell (a shell in the hand at st.shellP) } */

function drawGun(pen,F,weapon,st={},k=1){if(!weapon||!WEAPONS[weapon])return;if(weapon==='machete'){pen.slab(...at(F,0,-2),...at(F,0,1),...F.r,1,.8,'#6f553a').slab(...at(F,0,1),...at(F,8,3),...F.r,1.2,.15,'#b6bca3');return;}const W=WEAPONS[weapon],cond=st.cond??1,c=E.hex('#343a35'),rust=E.hex('#7a4930'),col='#'+c.map((v,i)=>Math.round(lerp(rust[i],v,cond)).toString(16).padStart(2,'0')).join(''),wood='#75543a',dk='#252924';const L=(a,b,c=0)=>at(F,a*k,b*k,c*k),bar=(a,b,w,t,c)=>pen.slab(...a,...b,...F.r,w*k,t*k,c),tube=(a,b,r,c)=>pen.tube(...a,...b,r*k,c);const side=W.slot==='side',len=side?6:weapon==='bishop'?16:weapon==='curate'?18:13;
 bar(L(-2,0),L(side?2:4,0),side?1:1.2,side?1.5:1.7,col);bar(L(-.5,0),L(-1.5,-2.7),.85,1.1,wood);tube(L(side?1.5:3,.6),L(len,.6),weapon==='bishop'?1.3:.3,dk);
 if(!side){bar(L(-2,0),L(-7,-.9),.9,1.5,wood);bar(L(4,0),L(8,0),1.3,1.2,wood);if(weapon!=='curate'&&weapon!=='sexton')bar(L(1,-.8),L(2.2,-4.5-(st.mag||0)*2),.85,1.2,col);}
 if(weapon==='verger')tube(L(0,0),L(1.6,0),1.1,col);
 if(weapon==='curate'){tube(L(-1,2.1),L(4,2.1),.65,dk);tube(L(3.6,2.1),L(4.3,2.1),.8,'#424d42');}
 if(weapon==='gardener'){tube(L(3,0),L(13,0),.6,'#746a45');tube(L(6,-1.2),L(11,-1.2),.3,dk);pen.glow(...L(13,.5),.3,'#f6b957');}
 if(weapon==='choir'){bar(L(1,-.7),L(3,-4),2,2,dk);tube(L(11,-.5),L(13,-3),.12,dk);}
 for(const a of [side?0:1,len-1])bar(L(a,.8),L(a,1.7),.22,.3,dk);
 if(cond<.5)for(let i=0;i<3;i++)bar(L(4+i*.45,-.7),L(4+i*.45,.6),1.4,.18,'#aca181');
 if(st.bolt)tube(L(-1-st.bolt*2,1,1),L(-1-st.bolt*2,1,1.8),.2,dk);
 if(st.flash>0){pen.glow(...L(len+1,.6),1.3*st.flash,'#ffc775');pen.cone(...L(len,.6),...L(len+6*st.flash,.6),1.4,'#ffd18a');}
}
function keysAt(keys,t){if(t<=keys[0][0])return keys[0][1];for(let i=0;i<keys.length-1;i++)if(t<keys[i+1][0])return mixv(keys[i][1],keys[i+1][1],win(t,keys[i][0],keys[i+1][0]));return keys[keys.length-1][1];}
function reloadCurve(weapon,t,dur=2){const v=Math.sin(clamp(t/dur,0,1)*Math.PI);return {pitch:v*.3,yaw:0,roll:v*.9,lift:v,hand:[2,-2-v*5,-1],mag:v>.7?1:0,bolt:win(t,dur*.7,dur*.85)*(1-win(t,dur*.9,dur))};}
function drawArms(pen,L,R,blood=false){const c=LOOKS.player;for(const [i,hand]of[L,R].entries()){const sh=[-.5,i?5.2:-5.2,-10],el=ik(sh,hand,8.6,8.6,[-.3,i?1:-1,-1])[0];pen.tube(...sh,...el,1.25,c.cloth).tube(...el,...hand,1,c.skin).ball(...hand,1.05,.9,.8,c.glove);if(blood)pen.ball(...add(hand,[0,0,.75]),.7,.5,.12,'#742c25');}}
function drawViewModel(pen){pen.at();let t=S.actT||0,u=S.actDur?t/S.actDur:0,tool=S.tool,L=[13,-4,-5],R=[10,4,-5];const bob=Math.sin(S.stepPh*TAU)*.25,Sway=Math.sin(S.time*1.6)*.08;
 if(S.act==='flight'){drawArms(pen,[9,-4,-2],[9,4,-2],S.blood);pen.tube(9,-6,-2,9,6,-2,.25,'#656e55');return;}
 if(S.bound){drawArms(pen,[9,-1,-3],[9,1,-3]);pen.tube(9,-1.8,-3,9,1.8,-3,.3,'#b59f6e');return;}
 if(S.mantle||S.ladder){const phase=Math.sin(S.time*8);drawArms(pen,[12,-4,2+phase],[12,4,2-phase],S.blood);return;}
 if(S.vehicle){const s=S.vehicle.v.steer||0;for(let i=0;i<18;i++){const a=i/18*TAU;pen.tube(11,Math.cos(a)*3,-5+Math.sin(a)*3,11,Math.cos(a+.35)*3,-5+Math.sin(a+.35)*3,.18,'#35372c');}L=[11,-2.6,-5+s];R=[11,2.6,-5-s];pen.box(16,0,-8,2,18,3,'#5b5f49');drawArms(pen,L,R);return;}
 if(tool==='map'||tool==='log'||tool==='card'){L=[8,-4,-3.1];R=[8,4,-3.1];drawArms(pen,L,R,S.blood);if(tool==='card'&&S.shopIds)drawGun(pen,frameYP([6,-3,-1],Math.PI/2+Math.sin(S.time*.5)*.2,.05,-.1),S.shopIds[S.shopIndex],{cond:1},.4);return;}
 if(tool==='monocular'){pen.tube(3,-1,0,8,-1,0,2,'#444c3b');drawArms(pen,[6,-2,-1],[5,3,-4]);return;}
 if(S.act==='surgery'||S.act==='heal'||S.act==='ampoule'){const cyc=Math.sin(u*Math.PI*6);L=[12,-1,-5];R=[11+cyc,1,-4.5];pen.tube(7,-7,-6,13,-1,-5,1.2,LOOKS.player.skin);if(S.act==='surgery'){
  const k=S.surgeryKind%4;
  if(k===0){pen.tube(11+cyc,1,-4,12,-1,-4,.16,'#b9b9a3').tube(12,-1,-4,13,0,-3,.16,'#8b8e80').tube(12,-1,-4,13,-2,-3,.16,'#8b8e80');}
  if(k===1){if(u<.62)pen.cone(12,-1,-4,15,-2,-4,.7,'#c4c4af');else pen.box(12,-1,-4,1.2,1,2,'#7b7762').glow(12,-1,-2.5,.65,'#ffab55');}
  if(k===2){R=[12,0,-4];L=[12,-1,-4];pen.tube(12,-1,-4,14,-1,-3+Math.max(0,cyc),.3,LOOKS.player.skin);}
  if(k===3){pen.tube(4,3,-11,14,2,-7,2.5,LOOKS.player.cloth);pen.tube(12+u*2,2,-6,12+u*2,2,-3,.13,'#a5a58d');R=[12+u*2,2,-4];}
 }else{pen.tube(...R,...add(R,[3,-2,0]),.35,'#d2d9c0');if(S.act==='ampoule')for(let i=0;i<S.ampoules;i++)pen.tube(7,-3+i*.6,-6,9,-3+i*.6,-6,.18,'#98b7a6');}drawArms(pen,L,R,true);return;}
 if(S.act==='repair'||S.act==='wheel'){L=[13,-3,-3+Math.sin(t*8)];R=[13,3,-3-Math.sin(t*8)];pen.tube(...R,14,0,-3,.3,'#9a9f8a');drawArms(pen,L,R,S.blood);return;}
 if(S.act==='melee'){const sw=Math.sin(u*Math.PI);R=[10+sw*5,4-sw*7,-5+sw*6];pen.slab(...R,...add(R,[7,-1,2]),0,0,1,1.1,.15,'#b9baa2');drawArms(pen,L,R,S.blood);return;}
 let F=frameYP([lerp(8,6,S.adsB)-S.flash*.9,lerp(4.3,0,S.adsB)+bob,lerp(-6,-1.65,S.adsB)+Sway],0,.015+S.flash*.12,0);
 if(S.sprint){F=turn(F,-.3,-.65,-.55);F.o[2]-=1.2;}
 let st={flash:S.flash,cond:S.inventory[S.cur]?.cond??0};if(S.act==='reload'||S.act==='jam'){const a=reloadCurve(S.cur,t,S.actDur);F=turn(F,a.pitch,a.yaw,a.roll);L=S.act==='jam'&&S.jamKind===1?at(F,-1-a.bolt*2,1,1.5):S.act==='jam'&&S.jamKind===2?[10+Math.sin(t*18)*2,-2,-3]:at(F,...a.hand);st.mag=a.mag;st.bolt=a.bolt;}else L=at(F,WEAPONS[S.cur]?.fore??5,-.5);R=at(F,-.5,-1.6);
 if(S.act==='throw'){L=keysAt([[0,L],[.15,[6,-6,-3]],[.35,[14,-2,0]],[.7,L]],t);pen.tube(...L,...add(L,[2,0,0]),.6,'#6e7250');if(S.throwKind==='bottle')pen.glow(...add(L,[2,0,1]),.6,'#ff9b38');}
 if(S.tool==='locator'){L=[9,-4.5,-3];pen.box(...L,1.2,3,4.8,'#4c5944');for(let i=0;i<4;i++)pen.glow(8.3,-5.2+i*.4,-1.4,.12,i===(Math.floor(S.time*3)%4)?'#ddbd68':'#76845e');}
 drawGun(pen,F,S.cur,st);drawArms(pen,L,R,S.blood);
}

function newState(){const inv={};for(const id of ['verger']){const w=WEAPONS[id];inv[id]={cond:id==='verger'?.43:1,mag:w.mag,reserve:w.reserve,jammed:false};}return {hp:100,alive:true,mode:'campaign',time:0,cur:'verger',inventory:inv,slots:['verger',null,null],unlocked:['verger'],syrettes:3,ampoules:2,bottles:4,nades:4,stones:8,lung:0,fit:0,lastFit:-999,stamina:1,blood:false,merc:0,buddies:[],papers:'clinic',burnedPapers:[],flags:{},contract:0,step:0,completed:[],hour:18,windDir:.15,wind:.65,storm:0,weatherTimer:0,yaw:-Math.PI/2,pitch:0,eye:EYE,ads:false,adsB:0,sprint:false,crouch:false,move:'stand',stepPh:0,view:'first',fireCd:0,flash:0,act:null,actT:0,actDur:0,tool:null,toolT:0,lastDamage:-99,lastShot:-99,shots:0,kills:0,near:null,focus:{x:0,y:0,z:0},cam:null,waypoint:null,mapZoom:1,pencil:[.5,.5],subtitle:null,objectiveT:8,read:[],rescueCd:0,down:false,vehicle:null,ending:null,endingTime:0,defend:0,attract:false,tags:[],banked:0,carried:0,radio:true};}
function reset(seed=1,merc=0){world.reset();rnd=E.rng(seed);raiders.length=loot.length=nades.length=vehicles.length=people.length=0;placed.clear();for(const s of solids)world.block(s);placeProps();setupBarrels();Fire.reset();S=newState();S.merc=merc;LOOKS.player.skin=MERCS[merc].color;for(const p of POSTS){p.clear=false;p.spawned=false;}for(const c of CASES)c.taken=false;for(const st of STAKES)st.found=false;flood.position.y=-30;hero=world.hero({x:OP.strip.x-12*M,y:OP.strip.y-8*M,z:height(OP.strip.x-12*M,OP.strip.y-8*M),r:5,half:9,visible:false,shadow:false,slope:48,step:5,snap:5});pb=body('player');setupPeople();initBuddies();setupVehicles();world.camera.set('fixed');world.camera.follow(S.focus);active=world;camStep(0);}
function look(dt,I){if(S.tool==='map'){S.pencil[0]=clamp(S.pencil[0]+I.mouse[0]*.001+(I.stick2?.[0]||0)*dt*.3,0,1);S.pencil[1]=clamp(S.pencil[1]+I.mouse[1]*.001+(I.stick2?.[1]||0)*dt*.3,0,1);return;}const zoom=S.tool==='monocular'?.22:lerp(1,WEAPONS[S.cur]?.adsFov/FOV||.7,S.adsB);S.yaw+=I.mouse[0]*.0021*zoom;S.pitch=clamp(S.pitch-I.mouse[1]*.0021*zoom,-1.45,1.45);const a=I.stick2;if(a){S.yaw+=(a[0]||0)*2.4*zoom*dt;S.pitch=clamp(S.pitch-(a[1]||0)*1.9*zoom*dt,-1.45,1.45);}}
function move(dt,I){const h=hero;if(S.vehicle)return;if(S.ending){hero.vx=hero.vy=0;return;}if(S.bound||S.choiceUI){hero.vx=hero.vy=0;return;}if(traversal(dt,I))return;const m=I.move,cs=Math.cos(S.yaw),sn=Math.sin(S.yaw);const crouchWant=I.down('crouch');if(crouchWant&&!S.crouch){h.resize(4);S.crouch=true;}else if(!crouchWant&&S.crouch&&!world.ray(h.x,h.y,h.z+18,0,0,1,12,{skip:h,level:true})){h.resize(9);S.crouch=false;}S.sprint=I.down('sprint')&&!S.crouch&&S.stamina>.02&&m[1]<-.1&&!S.act;S.stamina=clamp(S.stamina+dt*(S.sprint?-1/8:1/12),0,1);const speed=(S.sprint?RUN:S.crouch?CROUCH:S.ads?46:WALK)*(S.tool==='map'?.6:1)*(S.fit>0?.4:1)*(biomeAt(h.x/M,h.y/M)==='brine'?.6:1);h.fly=CHEATS.noclip;if(h.fly){h.vx=(m[0]*-sn-m[1]*cs)*speed*5;h.vy=(m[0]*cs-m[1]*sn)*speed*5;h.vz=(I.down('jump')?1:I.down('crouch')?-1:0)*speed*4;}else{h.vx=approach(h.vx,(-sn*m[0]-cs*m[1])*speed,600*dt);h.vy=approach(h.vy,(cs*m[0]-sn*m[1])*speed,600*dt);if(I.pressed('jump')&&!['map','log','card','watch'].includes(S.tool)&&h.grounded){h.jump(JUMP);I.use('jump');A.sfx('jump');}}S.move=S.crouch?'crouch':'stand';h.facing=S.yaw;S.stepPh+=Math.hypot(h.vx,h.vy)*dt/55;}
function traversal(dt,I){
 if(S.mantle){const m=S.mantle;m.t+=dt;hero.fly=true;const u=sstep(0,.55,m.t);hero.place(lerp(m.from[0],m.to[0],u),lerp(m.from[1],m.to[1],u),lerp(m.from[2],m.to[2],sstep(0,.4,m.t))+Math.sin(u*Math.PI)*4);hero.vx=hero.vy=hero.vz=0;if(m.t>.55){S.mantle=null;hero.fly=false;}return true;}
 if(S.ladder){const l=S.ladder;hero.fly=true;const fx=Math.cos(l.yaw),fy=Math.sin(l.yaw);hero.vx=(l.x-fx*8-hero.x)*10;hero.vy=(l.y-fy*8-hero.y)*10;hero.vz=-I.move[1]*76;S.move='ladder';if(hero.z>l.z1-3&&I.move[1]<0){hero.place(...l.top);S.ladder=null;hero.fly=false;hero.vz=0;}else if(I.pressed('jump')||hero.z<l.z0-2){S.ladder=null;hero.fly=false;hero.vx=-fx*70;hero.vy=-fy*70;hero.vz=60;I.use('jump');}return true;}
 if(I.move[1]<-.25&&!CHEATS.noclip){for(const l of ladders)if(Math.hypot(hero.x-l.x,hero.y-l.y)<20&&hero.z>=l.z0-3&&hero.z<l.z1-3&&Math.cos(S.yaw-l.yaw)>.1){S.ladder=l;return true;}}
 if(I.pressed('jump')&&!['map','log','card','watch'].includes(S.tool)&&hero.grounded&&!CHEATS.noclip){const fx=Math.cos(S.yaw),fy=Math.sin(S.yaw);let hit=null;for(const h of [8,18]){hit=world.ray(hero.x,hero.y,hero.z+h,fx,fy,0,16,{skip:hero,level:true});if(hit)break;}if(hit){const x=hit.x+fx*12,y=hit.y+fy*12,top=world.ray(x,y,hero.z+43,0,0,-1,45,{skip:hero,level:true});if(top&&top.nz>.7&&top.z>hero.z+5&&top.z<hero.z+41&&!world.ray(x,y,top.z+1,0,0,1,29,{skip:hero,level:true})){S.mantle={from:[hero.x,hero.y,hero.z],to:[x,y,top.z+1],t:0};I.use('jump');A.sfx('jump');return true;}}}return false;}
function camStep(dt){S.eye=approach(S.eye,S.down?5:S.crouch?17:EYE,dt*80);let x=hero.x,y=hero.y,z=hero.z+S.eye;if(S.vehicle){const v=S.vehicle.v;x=v.x;y=v.y;z=v.z+18;}S.adsB=approach(S.adsB,S.ads?1:0,dt*5);S.cam={x,y,z,yaw:S.yaw,pitch:S.pitch+(S.fit?Math.sin(S.time*9)*.035:0),roll:S.down?.12:S.act==='surgery'?Math.sin(S.actT*2)*.05:0,fov:S.tool==='monocular'?14:lerp(FOV,WEAPONS[S.cur]?.adsFov||50,S.adsB),near:1.1};world.camera.fixed=S.cam;world.camera.near=1.1;Object.assign(S.focus,{x:x+Math.cos(S.yaw)*320,y:y+Math.sin(S.yaw)*320,z:z-10});}
const I={move:[0,0],mouse:[0,0],stick2:null,pressed:a=>game.input.buffered(a,.12),down:a=>game.input.down(a),use:a=>game.input.consume(a)};
function step(dt,input=I){if(!S||!hero)return;S.time+=dt;weatherStep(dt);look(dt,input);if(S.alive&&!S.down){move(dt,input);actions(dt,input);healthStep(dt,input);}stepNades(dt);fireStep(dt);vehicleStep(dt,input);aiStep(dt);S.scatterT=(S.scatterT||0)+dt;if(S.scatterT>.25){S.scatterT=0;streamScatter(world,hero.x,hero.y,3);}buddyStep(dt);salvageStep(dt,input);interpolatePlayers(dt);contractStep(dt);endingStep(dt,input);audioStep(dt);S.near=getNear();if(game.saves)game.saves.canSave=SITES.some(o=>o.faction==='safe'&&Math.hypot(hero.x-o.x,hero.y-o.y)<16*M);world.step(dt);S.flash=Math.max(0,S.flash-dt*12);camStep(dt);}
function run(n=600){reset(3);const c={move:[0,-1],mouse:[0,0],stick2:null,pressed:()=>false,down:a=>a==='sprint',use(){}};for(let i=0;i<n;i++)step(1/120,c);return world.hash([S.hp,S.shots,Math.round(S.yaw*1000)]);}
function onDraw(w){if(!S)return;drawT=w.time;const cam=S.cam;fx.cam=[cam.x,cam.y,cam.z];drawGrass(w,cam.x,cam.y);grass.uT.value=w.time;grass.uW.value.set(Math.cos(S.windDir)*S.wind*.2,Math.sin(S.windDir)*S.wind*.2);grass.uP.value.set(hero.x/M,hero.z/M,hero.y/M);drawTracers(.016);w.overlay.on=S.alive&&!S.title;if(w.overlay.on)drawViewModel(w.overlay.pen);drawWeather();drawFire();drawPeople();drawRemotePlayers();drawWorldObjects();drawHeld();}

function act(name,dur,done){S.act=name;S.actT=0;S.actDur=dur;S.actDone=done||null;}
function actionStep(dt){if(!S.act)return;S.actT+=dt;if(S.actT>=S.actDur){const done=S.actDone;S.act=null;S.actDone=null;if(done)done();}}
function useAmpoule(){if(!S.ampoules||S.act==='surgery')return false;S.ampoules--;S.lung=0;S.fit=0;S.healHold=-1;act('ampoule',1.1);A.sfx('heal');say(MERCS[S.merc].name,'One less in the box.');return true;}
function heal(){if(S.act)return false;if(S.hp<=20){S.surgeryKind=Math.floor(rnd()*4);act('surgery',S.merc===1?3.75:5,()=>{S.hp=60;S.blood=true;});A.sfx('surgery');return true;}if(S.syrettes&&S.hp<100){S.syrettes--;act('heal',.9,()=>{S.hp=Math.min(100,S.hp+40);});A.sfx('heal');return true;}return false;}
function fitStart(){if(CHEATS.noFits)return;const rapid=S.time-S.lastFit<180;S.lastFit=S.time;S.fit=S.ampoules>0?6:14;S.lung=100;S.fitPulse=0;A.sfx('cough');noise(hero.x,hero.y,40);if(!S.ampoules&&rapid){hurtPlayer(1000);return;}say(MERCS[S.merc].name,S.ampoules?prompt('heal','Ampoule. Now.'):'No ampoules. Breathe through it.');}
function healthStep(dt,I){if(!S.alive||S.down)return;if(S.hp>0&&S.time-S.lastDamage>6&&S.hp%20>.001)S.hp=Math.min(Math.ceil(S.hp/20)*20,S.hp+6*dt);if(S.rescueCd>0)S.rescueCd-=dt;if(!CHEATS.noFits){S.lung+=dt*(100/840)*TUNE.lung*(S.storm>0?4:1)*(Fire.near(hero.x,hero.y,15)?6:1)*(S.sprint?1.5:1);if(S.lung>=100&&S.fit<=0)fitStart();if(S.lung>=85&&S.lung-dt*.2<85)A.sfx('breath');}if(S.fit>0){S.fit-=dt;S.fitPulse=(S.fitPulse||0)+dt;if(S.fitPulse>.9){S.fitPulse=0;A.sfx('cough'+(Math.floor(rnd()*4)));noise(hero.x,hero.y,40);}if(S.fit<=0)S.lung=30;}
 if(I.pressed('heal')&&S.fit>0){I.use('heal');useAmpoule();}else if(I.down('heal')){S.healHold=Math.max(0,S.healHold??0)+dt;if(S.healHold>=.4&&!S.act)useAmpoule();}else if((S.healHold??-1)>=0){if(S.healHold<.4)heal();S.healHold=-1;}
}
function hurtPlayer(damage,angle=0){if(CHEATS.god||S.attract||S.bound||S.ending||!S.alive||S.down)return;S.hp=Math.max(0,S.hp-damage);S.lastDamage=S.time;S.hurtT=.5;S.hitDir=angle;A.sfx('hurt',{vol:.5});game.input.rumble?.(.3,.5,150);if(S.hp<=0){if(S.mode==='salvage'){salvageDeath();return;}if(!buddyRescue()){S.alive=false;S.act=null;game.go('dead');}}}

function equip(id){if(!S.inventory[id])return;S.cur=id;S.act=null;S.tool=null;A.sfx('rack');}
function giveGun(id,cond=1){const W=WEAPONS[id];S.inventory[id]={cond,mag:W.mag,reserve:W.reserve,jammed:false};const i=['side','primary','heavy'].indexOf(W.slot);const old=S.slots[i];S.slots[i]=id;if(old&&old!==id)delete S.inventory[old];equip(id);}
function startReload(){if(S.act)return;const g=S.inventory[S.cur],w=WEAPONS[S.cur];if(!g)return;if(g.jammed){S.jamKind=Math.floor(rnd()*3);act('jam',1.3,()=>{g.jammed=false;A.sfx('rack');});A.sfx('rack');}else if(g.mag<w.mag&&g.reserve>0){act('reload',w.reload,()=>{const n=Math.min(w.mag-g.mag,g.reserve);g.mag+=n;g.reserve-=n;A.sfx('rack');});A.sfx('reload');}}
function gunShot(){if(S.cur==='machete')return machete();if(S.act||S.fireCd>0)return false;const g=S.inventory[S.cur],w=WEAPONS[S.cur];if(!g)return false;if(g.jammed){S.fireCd=.25;A.sfx('jam');return false;}if(g.mag<=0){A.sfx('jam');S.fireCd=.3;return false;}if(g.cond<.7&&!CHEATS.noJams&&rnd()<TUNE.jam*w.jam*.09*(1-g.cond/.7)**2){g.jammed=true;A.sfx('jam');S.fireCd=.3;S.jams=(S.jams||0)+1;return false;}if(g.cond<.15&&rnd()<.08){A.sfx('jam');S.fireCd=.4;return false;}
 if(!CHEATS.ammo)g.mag--;g.cond=Math.max(0,g.cond-w.wear*TUNE.wear*(S.merc===3&&S.cur==='sexton'?.5:1));S.shots++;S.lastShot=S.time;S.flash=1;S.fireCd=1/w.rate;S.tool=null;A.sfx('gun_'+w.id);game.input.rumble?.(.2,.6,70);noise(hero.x,hero.y,150);burnPapers();
 const eye=[hero.x,hero.y,hero.z+S.eye],F=frameYP(eye,S.yaw,S.pitch);for(let i=0;i<w.pellets;i++){const spread=S.ads?.002:w.hip*(S.tool==='locator'?2:1),D=nrm(add(add(F.f,F.r,(rnd()-.5)*spread),F.u,(rnd()-.5)*spread));castShot(w.id,eye,D,hero);if(inSession&&!AIHub.isHost)queueShot(w.id,eye,D);}
 S.pitch=clamp(S.pitch+(w.slot==='side'?.018:w.rate<2?.045:.007),-1.45,1.45);
 if(w.id==='gardener'&&g.cond<.1&&rnd()<.004){explodeAt(hero.x,hero.y,hero.z,5,70);g.cond=0;}
 if(g.cond<=0){say(MERCS[S.merc].name,'That was the last thing it had to say.');loot.push({id:'broken'+S.time,x:hero.x,y:hero.y,z:hero.z,weapon:S.cur,cond:0});const i=S.slots.indexOf(S.cur);if(i>=0)S.slots[i]=null;delete S.inventory[S.cur];S.cur=S.slots.find(Boolean)||'machete';A.sfx('break');}return true;
}
function castShot(id,eye,D,owner=hero){const w=WEAPONS[id],range=w.range*M,hit=world.ray(...eye,...D,range,{skip:owner}),p=hit?[hit.x,hit.y,hit.z]:add(eye,D,range);if(!NO_RENDER&&id!=='machete')tracer(add(eye,D,12),p);if(inSession&&!AIHub.isHost)return;
 if(id==='gardener'){for(let d=2;d<13;d+=2)Fire.ignite(eye[0]+D[0]*d*M,eye[1]+D[1]*d*M,2);}
 if(id==='bishop'){explodeAt(...p,7,200);return;}if(id==='acolyte')Fire.ignite(p[0],p[1],4,true);if(hit){const e=hit.actor?.data?.entity;if(e)hurtEnemy(e,w.dmg*TUNE.playerDamage*(p[2]>e.a.z+24?2:1),p[2]>e.a.z+24);else if(hit.actor?.data?.remote!==undefined)netDamage(hit.actor.data.remote,w.dmg);else if(hit.actor===hero&&owner!==hero)hurtPlayer(w.dmg);if(!NO_RENDER)decal(p,[hit.nx||0,hit.ny||0,hit.nz||1],.5);}
 for(const v of vehicles){if(v.hp<=0)continue;const f=dot(sub([v.v.x,v.v.y,v.v.z+10],eye),D);if(f>0&&f<Math.min(range,hit?.dist??range)+30&&Math.hypot(...sub(add(eye,D,f),[v.v.x,v.v.y,v.v.z+10]))<23){damageVehicle(v,id==='bishop'?140:w.dmg*.45);break;}}
 for(const b of barrels){if(b.dead)continue;const f=dot(sub([b.x,b.y,b.z+8],eye),D);if(f>0&&f<Math.min(range,hit?.dist??range)+10&&Math.hypot(...sub(add(eye,D,f),[b.x,b.y,b.z+8]))<12){b.hp-=w.dmg;if(b.hp<=0)barrelBoom(b);}}
 if(id==='choir'&&rnd()<.02)Fire.ignite(p[0],p[1],2);
}
function throwObject(kind){if(S.act)return;if(kind==='bottle'?!S.bottles:!S.nades)return;S.throwKind=kind;act('throw',.7,()=>{if(kind==='bottle')S.bottles--;else S.nades--;const F=frameYP([hero.x,hero.y,hero.z+S.eye],S.yaw,S.pitch);const p=add(F.o,F.f,9);nades.push({kind,x:p[0],y:p[1],z:p[2],vx:F.f[0]*340+hero.vx*.4,vy:F.f[1]*340+hero.vy*.4,vz:F.f[2]*340+55,t:0});A.sfx('throw');});}
function stepNades(dt){for(const n of nades.slice()){const p=[n.x,n.y,n.z];n.vz-=GRAV*dt;const D=[n.vx*dt,n.vy*dt,n.vz*dt],len=Math.hypot(...D);const h=world.ray(...p,...nrm(D),len+1,{skip:hero});n.x+=D[0];n.y+=D[1];n.z+=D[2];n.t+=dt;if(h||n.z<height(n.x,n.y)+2||n.t>2.3){if(inSession&&!AIHub.isHost){Net.requests.push({t:'throw',kind:n.kind,x:Math.round(n.x),y:Math.round(n.y),z:Math.round(n.z)});}else if(n.kind==='bottle'){Fire.ignite(n.x,n.y,S.merc===0?8:6,true);A.sfx('glass');}else explodeAt(n.x,n.y,n.z,7,110);nades.splice(nades.indexOf(n),1);}}}
function explodeAt(x,y,z,r=7,damage=110){Fire.ignite(x,y,4,true);A.sfx('explode');game.shake(5);for(const e of raiders)if(e.alive){const d=Math.hypot(e.a.x-x,e.a.y-y,e.a.z-z)/M;if(d<r)hurtEnemy(e,damage*(1-d/r),true);}for(const v of vehicles){const d=Math.hypot(v.v.x-x,v.v.y-y)/M;if(d<r)damageVehicle(v,140*(1-d/r));}if(inSession&&AIHub.isHost)for(const p of Net.players.values())if(p.id!==AIHub.me&&p.hp>0){const d=Math.hypot(p.x-x,p.y-y,p.z-z)/M;if(d<r)netDamage(p.id,damage*(1-d/r));}const d=Math.hypot(hero.x-x,hero.y-y,hero.z-z)/M;if(d<r)hurtPlayer(damage*(1-d/r));for(const b of barrels)if(!b.dead&&Math.hypot(b.x-x,b.y-y)<r*M){b.dead=true;Fire.ignite(b.x,b.y,8,true);} }
function actions(dt,I){if(S.bound||S.ending)return;S.fireCd=Math.max(0,S.fireCd-dt);S.ads=I.down('aim')&&!S.tool&&!S.act;actionStep(dt);if(S.act==='surgery')return;
 for(const [i,a]of ['one','two','three'].entries())if(I.pressed(a)){I.use(a);if(S.slots[i])equip(S.slots[i]);}
 if(I.pressed('swap')){I.use('swap');const ids=S.slots.filter(Boolean);equip(ids[(ids.indexOf(S.cur)+1)%ids.length]);}
 if(I.pressed('reload')&&(!S.near||game.input.lastDevice!=='gamepad')){I.use('reload');startReload();}
 if(['log','card','watch'].includes(S.tool)&&(I.pressed('fire')||I.pressed('jump')||I.pressed('confirm'))){I.use('fire');I.use('jump');I.use('confirm');if(S.tool==='log')closeCard();else if(S.tool==='card')buyGun();else sleep(S.sleepHour);return;}
 for(const tool of ['map','locator','monocular'])if(I.pressed(tool)){I.use(tool);S.tool=S.tool===tool?null:tool;S.toolT=0;A.sfx('paper');}
 if(S.tool==='map'){
  const pad=game.input.lastDevice==='gamepad';if((pad&&I.pressed('jump'))||(!pad&&I.pressed('fire'))){I.use(pad?'jump':'fire');S.waypoint=[S.pencil[0]*SIZE,S.pencil[1]*SIZE];A.sfx('beep');}
  if(pad&&I.pressed('fire')){I.use('fire');S.mapZoom=clamp(S.mapZoom+.5,1,3);}if(pad&&I.pressed('aim')){I.use('aim');S.mapZoom=clamp(S.mapZoom-.5,1,3);}return;
 }
 if((WEAPONS[S.cur]?.auto?I.down('fire'):I.pressed('fire'))&&!S.vehicle){if(S.tool){S.tool=null;A.sfx('paper');}if(gunShot())I.use('fire');}
 if(I.pressed('bottle')){I.use('bottle');throwObject('bottle');}if(I.pressed('grenade')){I.use('grenade');throwObject('frag');}
 if(I.pressed('melee')&&!S.act){I.use('melee');machete();}
 if(I.pressed('use')){I.use('use');if(S.near)useNear(S.near);else if(S.vehicle)exitVehicle();else startReload();}
 if(S.tool==='monocular'){const F=frameYP([hero.x,hero.y,hero.z+S.eye],S.yaw,S.pitch);let tag=null;for(const e of raiders)if(e.alive){const D=nrm(sub([e.a.x,e.a.y,e.a.z+20],F.o));if(dot(D,F.f)>.996)tag=e;}if(tag){S.tagTime=(S.tagTarget===tag.id?S.tagTime:0)+dt;S.tagTarget=tag.id;if(S.tagTime>.6&&!S.tags.includes(tag.id)){S.tags.push(tag.id);A.sfx('beep');}}}
}

function machete(){if(S.act)return false;act('melee',.6,()=>{if(inSession&&S.mode==='salvage'){if(AIHub.isHost)hostUse(AIHub.me,{t:'melee'});else Net.requests.push({t:'melee'});return;}for(const e of raiders)if(e.alive&&Math.hypot(e.a.x-hero.x,e.a.y-hero.y)<3*M&&Math.cos(Math.atan2(e.a.y-hero.y,e.a.x-hero.x)-S.yaw)>.4){hurtEnemy(e,60,false);break;}const d=doors.find(d=>Math.hypot(d.x-hero.x,d.y-hero.y)<3*M);if(d)d.open=true;});A.sfx('swing');return true;}

const FN=512,FCELL=64,burnData=new Uint8Array(FN*FN),fireState=new Uint8Array(FN*FN),fireTimer=new Float32Array(FN*FN),fuelCache=new Float32Array(FN*FN).fill(-1);
const Fire={state:fireState,t:fireTimer,burning:[],acc:0,rng:E.rng(7),lit:0,tex:null,flames:null,smoke:null,uT:null,ignite,near:fireNear,step:fireStep,reset(){this.burning=[];this.acc=0;this.lit=0;this.rng=E.rng(7);this.state.fill(0);this.t.fill(0);burnData.fill(0);if(this.tex)this.tex.needsUpdate=true;}};
function cellAt(x,y){return clamp(Math.floor(y/FCELL),0,FN-1)*FN+clamp(Math.floor(x/FCELL),0,FN-1);}
function fuelAt(i,j){const k=j*FN+i;if(fuelCache[k]<0)fuelCache[k]=FUEL[biomeAt(i*4+2,j*4+2)]||0;return fuelCache[k];}
function ignite(x,y,r=4,force=false){const i0=Math.floor(x/FCELL),j0=Math.floor(y/FCELL),R=Math.ceil(r/4);const lit=[];for(let j=Math.max(0,j0-R);j<=Math.min(FN-1,j0+R);j++)for(let i=Math.max(0,i0-R);i<=Math.min(FN-1,i0+R);i++){if(Math.hypot((i+.5)*4-x/M,(j+.5)*4-y/M)>r+1)continue;const k=j*FN+i;if(!fireState[k]&&(fuelAt(i,j)>0||force)){fireState[k]=1;fireTimer[k]=6+Fire.rng()*5;Fire.burning.push(k);burnData[k]=170;Fire.lit++;lit.push(k);}}if(Fire.tex)Fire.tex.needsUpdate=true;if(inSession&&AIHub.isHost&&lit.length)Net.lit.push(...lit);return lit.length;}
function fireNear(x,y,r=24){const R=Math.ceil(r/4),cx=Math.floor(x/FCELL),cy=Math.floor(y/FCELL);for(let j=Math.max(0,cy-R);j<=Math.min(FN-1,cy+R);j++)for(let i=Math.max(0,cx-R);i<=Math.min(FN-1,cx+R);i++)if(fireState[j*FN+i]===1&&Math.hypot(i-cx,j-cy)<=R)return true;return false;}
function fireStep(dt){if(inSession&&!AIHub.isHost){for(const k of Fire.burning){Fire.t[k]-=dt;if(Fire.t[k]<=0){Fire.state[k]=2;burnData[k]=255;}}Fire.burning=Fire.burning.filter(k=>Fire.state[k]===1);if(Fire.state[cellAt(hero.x,hero.y)]===1)hurtPlayer(25*dt);if(Fire.tex)Fire.tex.needsUpdate=true;return;}Fire.acc+=dt;let n=0;while(Fire.acc>=.25){Fire.acc-=.25;n++;const next=[],wx=Math.cos(S.windDir)*S.wind,wy=Math.sin(S.windDir)*S.wind;for(const k of Fire.burning){if(fireState[k]!==1)continue;const j=(k/FN)|0,i=k%FN;fireTimer[k]-=.25;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=FN||b>=FN)continue;const q=b*FN+a;if(fireState[q])continue;const l=Math.hypot(di,dj),w=(di*wx+dj*wy)/l,p=TUNE.fireSpread*.018*fuelAt(a,b)*Math.exp(1.5*w)/l;if(Fire.rng()<p){fireState[q]=1;fireTimer[q]=6+Fire.rng()*5;next.push(q);burnData[q]=170;Fire.lit++;if(inSession&&AIHub.isHost)Net.lit.push(q);}}
 if(fuelAt(i,j)>1&&Fire.rng()<.015){const d=2+Math.floor(Fire.rng()*5),a=i+Math.round(wx*d),b=j+Math.round(wy*d),q=b*FN+a;if(a>=0&&b>=0&&a<FN&&b<FN&&!fireState[q]&&fuelAt(a,b)>0){fireState[q]=1;fireTimer[q]=8;next.push(q);burnData[q]=170;}}
 if(fireTimer[k]<=0){fireState[k]=2;burnData[k]=255;}else{burnData[k]=170;next.push(k);}}Fire.burning=next;}if(n&&Fire.tex)Fire.tex.needsUpdate=true;
 if(fireState[cellAt(hero.x,hero.y)]===1){S.onFire=3;hurtPlayer(25*dt);}else if(S.onFire>0){S.onFire-=dt;hurtPlayer(8*dt);}
 for(const e of raiders)if(e.alive&&fireState[cellAt(e.a.x,e.a.y)]===1){e.burning=3;hurtEnemy(e,25*dt,false);}else if(e.burning>0){e.burning-=dt;hurtEnemy(e,12*dt,false);if(n)ignite(e.a.x,e.a.y,2);}
 for(const v of vehicles)if(v.hp>0&&fireState[cellAt(v.v.x,v.v.y)]===1)damageVehicle(v,6*dt);for(const b of barrels)if(!b.dead&&fireNear(b.x,b.y,4)){b.cook=(b.cook||0)+dt;if(b.cook>2)barrelBoom(b);}
 if(S.flooding){const level=flood.position.y;for(const k of Fire.burning){const x=(k%FN+.5)*FCELL,y=(((k/FN)|0)+.5)*FCELL;if(height(x,y)/M<level){fireState[k]=3;burnData[k]=210;}}}
}
function fireMesh(max,smoke=false){const T=E.THREE,g=new T.BufferGeometry();for(const [a,s]of [['position',3],['normal',3],['uv',2],['seed',1],['fade',1]])g.setAttribute(a,new T.BufferAttribute(new Float32Array(max*4*s),s));const idx=new Uint32Array(max*6);for(let k=0;k<max;k++)idx.set([k*4,k*4+1,k*4+2,k*4,k*4+2,k*4+3],k*6);g.setIndex(new T.BufferAttribute(idx,1));g.setDrawRange(0,6);
 const {attribute,uv,uniform,vec3,float,sin,smoothstep,mix,clamp}=E.TSL;const q=uv(),yy=q.y,seed=attribute('seed','float');if(!Fire.uT)Fire.uT=uniform(0);let mat;if(smoke){mat=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,side:T.DoubleSide});const rr=q.sub(.5).length().mul(2);mat.colorNode=vec3(.09,.08,.075);mat.opacityNode=float(1).sub(smoothstep(float(.15),float(1),rr)).mul(attribute('fade','float')).mul(.5);}else{const tt=Fire.uT.mul(2.6).add(seed.mul(13.7)),wob=sin(yy.mul(7).sub(tt.mul(2.2))).mul(.11).add(sin(yy.mul(15).sub(tt.mul(3.7))).mul(.05)).mul(yy),xx=q.x.sub(.5).add(wob).abs(),width=float(.46).mul(float(1).sub(yy)).mul(smoothstep(float(0),float(.16),yy).mul(.5).add(.5)),body=float(1).sub(smoothstep(width.mul(.45),width.add(.002),xx)),heat=clamp(float(1).sub(yy.mul(1.15)),0,1),col=mix(vec3(.9,.16,.02),mix(vec3(1.4,.62,.07),vec3(1.9,1.5,.6),heat.mul(heat)),heat);mat=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false});mat.colorNode=col.mul(body).mul(.62);}
 const mesh=new T.Mesh(g,mat);mesh.frustumCulled=false;mesh.renderOrder=smoke?4:5;world.scene.add(mesh);return mesh;
}
function makeFire(){const T=E.THREE;Fire.tex=new T.DataTexture(burnData,FN,FN,T.RedFormat,T.UnsignedByteType);Fire.tex.magFilter=Fire.tex.minFilter=T.LinearFilter;Fire.tex.generateMipmaps=false;Fire.tex.needsUpdate=true;const {texture,positionWorld,vec3,mix}=E.TSL,m=world.terrain.mat;m.colorNode=mix(m.colorNode,vec3(.035,.03,.028),texture(Fire.tex,positionWorld.xz.div(2048)).r.mul(.95));m.needsUpdate=true;Fire.flames=fireMesh(2400);Fire.smoke=fireMesh(600,true);}
function drawFire(){Fire.uT.value=world.time;const cam=S.cam,g=Fire.flames.geometry,sm=Fire.smoke.geometry;let n=0,ns=0,near=Infinity,nearest=null;const blocks=new Map();
 function put(geo,index,x,y,z,w,h,seed,fade=1){const dx=x-cam.x,dy=y-cam.y,l=Math.hypot(dx,dy)||1,sx=-dy/l*w,sy=dx/l*w,pts=[[x-sx,y-sy,z],[x+sx,y+sy,z],[x+sx,y+sy,z+h],[x-sx,y-sy,z+h]];for(let i=0;i<4;i++){const p=(index*4+i)*3;geo.attributes.position.array.set([pts[i][0]/M,pts[i][2]/M,pts[i][1]/M],p);geo.attributes.uv.array.set([[0,0],[1,0],[1,1],[0,1]][i],(index*4+i)*2);geo.attributes.seed.array[index*4+i]=seed;geo.attributes.fade.array[index*4+i]=fade;}}
 for(const k of Fire.burning){if(fireState[k]!==1)continue;const i=k%FN,j=(k/FN)|0,x=(i+.5)*FCELL,y=(j+.5)*FCELL,d=Math.hypot(x-cam.x,y-cam.y),z=height(x,y),seed=E.hash2(i,j),reed=fuelAt(i,j)>1;if(d<near){near=d;nearest=[x,y,z];}if(d>520*M)continue;blocks.set((j>>3)*64+(i>>3),[x,y,z]);if(d>320*M)continue;const count=d<70*M?4:1;for(let q=0;q<count&&n<2400;q++){const h=(22+seed*26)*(reed?2.2:1)*(d<70*M?1:1.8)*Math.min(1,fireTimer[k]/1.5),w=(6+seed*6)*(reed?1.5:1)*(d<70*M?1:1.9);put(g,n++,x+(q%2-.5)*22,y+(Math.floor(q/2)-.5)*22,z,w,h,seed+q);}}
 for(const [key,[x,y,z]]of blocks){for(let q=0;q<7&&ns<600;q++){const u=(world.time*.07+q/7+E.hash2(key,8))%1,rise=u*46*M,drift=rise*.55;put(sm,ns++,x+Math.cos(S.windDir)*drift,y+Math.sin(S.windDir)*drift,z+rise,(5+u*16)*M,(8+u*16)*M,.5,Math.min(1,u*5)*(1-u));}}
 for(const [geo,count]of [[g,n],[sm,ns]]){geo.setDrawRange(0,Math.max(count*6,6));if(!count)geo.attributes.position.array.fill(0,0,12);for(const a of ['position','uv','seed','fade'])geo.attributes[a].needsUpdate=true;}
 fireLight.on=near<120*M;if(nearest)Object.assign(fireLight,{x:nearest[0],y:nearest[1],z:nearest[2]+20,power:16*(.85+Math.sin(world.time*29)*.1)});
}
const barrels=[];
function barrelBoom(b){if(b.dead)return;b.dead=true;explodeAt(b.x,b.y,b.z,8,130);Fire.ignite(b.x,b.y,8,true);}
function setupBarrels(){barrels.length=0;for(const p of PROPS)if(p.id==='barrel')barrels.push({x:p.x,y:p.y,z:p.z,hp:34,dead:false});}

function drawVehicle(pen,a,t){const q=vehicles.find(q=>q.v===a),type=q?.type||'jeep',col=q?.clinic?'#d0cbb0':type==='technical'?'#696d4a':'#897548',dark='#30382d';pen.at(a.x,a.y,a.z,a.angle);if(type==='airboat'){pen.box(0,0,3,62,29,5,col).box(1,0,7,20,17,3,dark);for(let i=0;i<16;i++){const an=i/16*TAU;pen.tube(-24,Math.cos(an)*13,17+Math.sin(an)*13,-24,Math.cos(an+.4)*13,17+Math.sin(an+.4)*13,.4,'#686e58');}for(let i=0;i<3;i++){const an=t*35+i*TAU/3;pen.tube(-23,0,17,-23,Math.cos(an)*11,17+Math.sin(an)*11,.9,'#4d5545');}}
 else{const truck=type==='truck',L=truck?78:58;pen.box(0,0,7,L,26,7,col).box(13,0,13,21,25,5,col).box(-11,0,10,18,23,4,'#343b2e');for(const x of [-20,20])for(const y of [-15,15]){pen.tube(x,y-3,4,x,y+3,4,6,'#262c24').tube(x,y-3.2,4,x,y+3.2,4,3,'#a29267');}for(const y of [-12,12])pen.tube(4,y,16,4,y,31,.4,dark).tube(4,y,31,-8,y,31,.4,dark);pen.tube(4,-12,31,4,12,31,.5,dark);pen.box(25,0,11,2,23,2,dark);for(const y of [-8,8])pen.box(26,y,15,1,5,4,'#cfbd7e');for(let y=-7;y<8;y+=3)pen.box(26,y,11,1,1,5,'#484d38');if(truck)pen.box(-21,0,23,38,25,25,'#76785b');if(type==='technical'){pen.tube(-17,0,10,-17,0,30,.6,dark).tube(-17,0,30,7,0,32,.5,dark).box(-18,0,31,5,3,3,'#404734');}if(q?.clinic){pen.box(14,0,16,9,3,.2,'#863d2d').box(14,0,16.1,3,9,.2,'#863d2d');}}
 if(q&&q.hp<q.max*.5){const n=Math.floor(t*5)%5;pen.ball(16,0,24+n*5,3+n*2,3+n*2,4+n*2,q.hp<q.max*.2?'#35362d':'#aaa999');}pen.at();}
function makeVehicle(type,x,y,o={}){const spec=V_TYPES[type],surfaces=type==='airboat'?{brine:{top:1},reeds:{top:1},mud:{top:.5},salt:{top:.35},grass:{top:.25},road:{top:.25},pad:{top:.25}}:{road:{top:1},grass:{top:.7},salt:{top:.95,grip:.6},mud:{top:.5},reeds:{top:.4},brine:{top:.3},pad:{top:.85}};const v=world.vehicle({...spec,x,y,z:height(x,y)+2,angle:o.angle||0,ground:(x,y)=>biomeAt(x/M,y/M),surfaces,color:'#897548',draw:drawVehicle});const q={id:'vehicle'+vehicles.length,type,v,hp:spec.hp,max:spec.hp,stalled:false,burn:0,ai:null,...o};vehicles.push(q);return q;}
function setupVehicles(){makeVehicle('jeep',OP.mission.x+14*M,OP.mission.y+5*M,{clinic:true,angle:-Math.PI/2});makeVehicle('jeep',OP.strip.x+5*M,OP.strip.y+10*M);makeVehicle('technical',OP.k9.x+12*M,OP.k9.y+12*M);makeVehicle('airboat',OP.remnant.x,OP.remnant.y);makeVehicle('truck',OP.salt.x+12*M,OP.salt.y+3*M,{bank:true});makeVehicle('jeep',OP.tannery.x+12*M,OP.tannery.y+14*M);}
function enterVehicle(q){if(q.hp<=0)return false;if(inSession&&q.owner!==undefined&&q.owner!==null&&q.owner!==AIHub.me)return false;S.vehicle=q;q.owner=inSession?AIHub.me:0;S.yaw=q.v.angle;S.seat='drive';hero.setSolid(false);hero.fly=true;S.tool=null;A.sfx('engine');say('Papa Static',RADIO[Math.floor(rnd()*RADIO.length)]);return true;}
function exitVehicle(){const q=S.vehicle;if(!q)return;const v=q.v;for(let i=0;i<8;i++){const a=v.angle+Math.PI/2+i*Math.PI/4,x=v.x+Math.cos(a)*30,y=v.y+Math.sin(a)*30,z=height(x,y)+1;if(!world.ray(x,y,z+3,0,0,1,30,{skip:[hero,v],level:true})){hero.place(x,y,z);break;}}hero.fly=false;hero.setSolid(true);q.owner=null;S.vehicle=null;A.sfx('door');}
function damageVehicle(q,d){if(q.hp<=0)return;q.hp=Math.max(0,q.hp-d);if(q.hp<=0){q.burn=3;if(S.vehicle===q){exitVehicle();hurtPlayer(35);}Fire.ignite(q.v.x,q.v.y,4,true);} }
function repairVehicle(q){if(q.hp<=0||S.act)return false;act('repair',S.merc===2?2:4,()=>{q.hp=Math.max(q.hp,q.max*.6);q.stalled=false;A.sfx('rack');});return true;}
function vehicleStep(dt,I){for(const q of vehicles){const v=q.v;q.crashCd=Math.max(0,(q.crashCd||0)-dt);const impact=Math.max(q.prevSpeed||0,Math.abs(v.speed));if(v.bumped&&impact>120&&!q.crashCd){damageVehicle(q,impact*.08);q.crashCd=.7;}q.prevSpeed=Math.abs(v.speed);if(q.hp<=0){v.update(dt,null,{brake:1});if(q.burn>0){q.burn-=dt;if(q.burn<=0){explodeAt(v.x,v.y,v.z,6,100);q.wreck=true;}}if(q.wreck&&(S.time*2)%1<dt*2)Fire.ignite(v.x,v.y,3,true);continue;}let c={steer:0,gas:0,brake:0,top:TUNE.carTop};if(S.vehicle===q){const m=I.move;c={steer:m[0],gas:S.seat==='gun'?0:Math.max(-m[1],game.input.value('fire')||0),brake:Math.max(m[1],game.input.value('aim')||0),drift:I.down('jump'),top:TUNE.carTop*(q.hp<q.max*.2?.5:1)};if(I.pressed('seat')||I.pressed('swap')){I.use('seat');I.use('swap');if(q.type==='technical')S.seat=S.seat==='gun'?'drive':'gun';}if(I.pressed('radio')){I.use('radio');S.radio=!S.radio;}if(q.stalled)c.gas=0;if(S.seat==='gun'&&I.down('fire')&&S.fireCd<=0){castShot('choir',[v.x,v.y,v.z+30],frameYP([0,0,0],S.yaw,S.pitch).f);S.fireCd=.12;A.sfx('gun_choir');}}
 else if(inSession&&q.owner!==undefined&&q.owner!==null&&q.owner!==AIHub.me){continue;}else if(q.ai){const road=roads[q.ai.road],p=road[q.ai.index],dx=p[0]*M-v.x,dy=p[1]*M-v.y,angle=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(angle-v.angle),Math.cos(angle-v.angle));c.steer=clamp(diff*2,-1,1);c.gas=.65;if(Math.hypot(dx,dy)<12*M)q.ai.index=(q.ai.index+4)%road.length;if(Math.hypot(hero.x-v.x,hero.y-v.y)<120*M&&q.type==='technical'&&(S.time%1)<dt){if(!hasPapers(q.faction))hurtPlayer(5*TUNE.enemyDamage);}if(v.bumped&&Math.abs(v.speed)<10){q.ai=null;spawnEnemy(v.x+30,v.y,q.faction);spawnEnemy(v.x-30,v.y,q.faction);}}
 if(q.hp<q.max*.2&&rnd()<dt*.08)q.stalled=true;v.update(dt,null,c);}
 if(S.vehicle){hero.place(S.vehicle.v.x,S.vehicle.v.y,S.vehicle.v.z);hero.vx=hero.vy=hero.vz=0;const rot=S.vehicle.v.angle-(S.prevVehicleAngle??S.vehicle.v.angle);S.yaw+=rot;S.prevVehicleAngle=S.vehicle.v.angle;S.driven=(S.driven||0)+Math.abs(S.vehicle.v.speed)*dt/M;if(S.radio&&S.time-(S.lastRadio||0)>28){S.lastRadio=S.time;say('Papa Static',RADIO[Math.floor(rnd()*RADIO.length)]);}}else S.prevVehicleAngle=null;
}
function spawnPatrol(faction='authority'){const p=POSTS.find(p=>p.faction===faction&&!p.clear);if(!p)return;const q=makeVehicle('technical',p.x+10*M,p.y,{faction,ai:{road:Math.max(0,ROADS.findIndex(r=>r[0]===p.a&&r[1]===p.b)),index:0}});return q;}

let entitySequence=0;
Object.assign(LOOKS,{authority:{cloth:'#7a7350',plate:'#5d5a3e',dark:'#34362c',glove:'#4e4b39',helmet:'#6a7050',skin:'#b28c68',boot:'#2d2c25',accent:'#c3ac67',pack:'#57523a'},front:{cloth:'#8a7657',plate:'#3b2f26',dark:'#332c24',glove:'#514534',helmet:'#4b3628',skin:'#93694b',boot:'#2a2721',accent:'#9c2a1e',pack:'#67513e'},civilian:{cloth:'#9e9a7e',plate:'#9e9a7e',dark:'#5e5b4d',glove:'#997b57',helmet:'#7b7157',skin:'#a47e59',boot:'#4d483a',accent:'#8d8668',pack:'#77745f'},sister:{cloth:'#c4c0a7',plate:'#aaa891',dark:'#2c332d',glove:'#b8997d',helmet:'#303c32',skin:'#bd9d81',boot:'#2d3128',accent:'#d5cba8',pack:'#7c816c'},smuggler:{cloth:'#4a4a3a',plate:'#4a4a3a',dark:'#2d3329',glove:'#66533d',helmet:'#514c3d',skin:'#b28c68',boot:'#222c25',accent:'#8e8665',pack:'#4e5240'}});
const BARKS={authority:['Contact. File it later.','The ceasefire is in effect. Fire.','Who authorised that?','Put him on the list.','Our office is closed.','Mind the fuel. Mind the fuel.','Stamp it after.','He is not in the ledger.'],front:['Subtract him.','Carry the two, comrade.','Burn it. Burn it all.','A lesson for the road.','No remainders.','Behind the pump.','Leave the arithmetic to me.','He is learning.']};
function spawnEnemy(x,y,faction='front',o={}){const a=world.hero({x,y,z:o.z??height(x,y)+1,r:5,half:9.5,visible:false,shadow:false,slope:45,step:4,snap:5});const e={id:++entitySequence,a,b:body(o.look||faction,.95+rnd()*.1),faction,hp:o.hp||100,alive:true,state:'idle',yaw:o.yaw||0,pitch:0,home:[x,y],goal:[x,y],cooldown:rnd(),think:0,alert:0,sees:false,flash:0,jam:0,age:0,...o};e.b.weapon=o.weapon||'parson';a.data.entity=e;raiders.push(e);return e;}
function noise(x,y,r){for(const e of raiders)if(e.alive&&!e.civilian&&Math.hypot(e.a.x-x,e.a.y-y)<r*M){e.alert=15;e.goal=[x,y];if(!hasPapers(e.faction))e.state='hunt';}}
function hasPapers(faction){return !S.burnedPapers.includes(faction)&&(S.papers==='clinic'||S.papers===faction);}
function burnPapers(){for(const p of POSTS){if(!p.clear&&hasPapers(p.faction)&&Math.hypot(hero.x-p.x,hero.y-p.y)<80*M){if(!S.burnedPapers.includes(p.faction))S.burnedPapers.push(p.faction);p.angry=true;say(p.faction==='front'?'Front sentry':'Authority sentry','Papers are ash.');}}}
function setupPeople(){entitySequence=0;for(const p of POSTS){p.spawned=false;p.angry=false;}for(const o of SITES)o.spawned=false;
 const defs=[['sister','mission',0,0,'Sister Perpetua','sister'],['dray','k9',0,-19,'Captain Dray','authority'],['sell','red',0,-19,'Comrade Teacher Sell','front'],['sunday','fleet',-28,27,'Mr. Sunday','smuggler'],['woman','salt',0,116,'The woman with one shoe','civilian'],['tarn','sill',-2,0,'Ilse Tarn','civilian'],['cray','sill',38,-18,'Mr. Abel Cray','authority']];for(const[id,site,x,y,name,look]of defs){const o=OP[site];people.push({id,name,x:o.x+x*M,y:o.y+y*M,z:o.z+(site==='sill'?46.4*M:0),look,b:body(look),site});}
 for(const site of ['mission','salt','port']){const o=OP[site];for(let i=0;i<8;i++)spawnEnemy(o.x+(-24+i%4*9)*M,o.y+(site==='salt'?122:25+Math.floor(i/4)*8)*M,'civilian',{civilian:true,look:'civilian'});}
}
function streamSoldiers(){if(S.mode==='campaign'&&CONTRACTS[S.contract]?.id==='P0')return;for(const p of POSTS){if(p.spawned||p.clear||Math.hypot(p.x-hero.x,p.y-hero.y)>260*M)continue;p.spawned=true;for(let i=0;i<5;i++){const x=p.x+((i%2?1:-1)*(5+Math.floor(i/2)*3))*M,y=p.y+(i-2)*4*M;spawnEnemy(x,y,p.faction,{post:p.id,officer:i===0});}}
 for(const o of SITES){if(o.spawned||!['reedcamp','st4','k9','red','sill'].includes(o.id)||Math.hypot(o.x-hero.x,o.y-hero.y)>280*M)continue;o.spawned=true;for(let i=0;i<5;i++){const a=i/5*TAU;spawnEnemy(o.x+Math.cos(a)*24*M,o.y+Math.sin(a)*24*M,o.faction==='authority'?'authority':'front',{site:o.id,officer:i===0});}}
}
function hurtEnemy(e,damage,head=false){if(!e.alive)return;e.hp-=damage;e.alert=25;e.state=e.civilian?'flee':'combat';e.b.hit=[Math.cos(S.yaw)*damage*.15,Math.sin(S.yaw)*damage*.15,0];if(e.hp>0)return;
 if(!head&&!e.civilian&&!e.wounded&&!e.buddy&&rnd()<.3){e.wounded=true;e.hp=12;e.woundTime=25;e.state='wounded';e.a.vx=e.a.vy=0;say(e.faction==='front'?'Wounded Front soldier':'Wounded Provisional','Not like this. Not in triplicate.');return;}
 e.alive=false;e.a.setSolid(false);e.a.vx=e.a.vy=0;e.b.dead={t:0,dir:S.yaw,g:e.a.z};S.kills++;if(e.civilian){S.flags.civilianDied=(S.flags.civilianDied||0)+1;say('Sister Perpetua','Four hundred and seven. Then you came.');}if(e.buddy){downBuddy(e.buddy);return;}if(e.formerBuddy)killBuddy(e.formerBuddy);if(e.target)S.flags[e.target]=true;loot.push({id:'gun'+e.id,x:e.a.x,y:e.a.y,z:e.a.z,weapon:e.b.weapon,cond:.2+rnd()*.35});
 if(e.post){const p=POSTS.find(p=>p.id===e.post);if(!raiders.some(q=>q.alive&&q.post===e.post)){p.clear=true;S.tags=[];say('Road ledger','Post cleared. It will stay quiet until you sleep.');}}
}
function aiStep(dt){if(CHEATS.freezeAI||(inSession&&!AIHub.isHost))return;if(S.mode!=='salvage')streamSoldiers();for(const e of raiders){e.flash=Math.max(0,e.flash-dt*12);if(!e.alive){if(e.b.dead)e.b.dead.t+=dt;continue;}if(e.salvager)continue;const target=inSession&&S.mode==='salvage'?[...Net.players.values()].filter(p=>p.hp>0).sort((p,q)=>Math.hypot(p.x-e.a.x,p.y-e.a.y)-Math.hypot(q.x-e.a.x,q.y-e.a.y))[0]||hero:hero;const targetId=inSession&&target!==hero?target.id:null;const a=e.a,dist=Math.hypot(a.x-target.x,a.y-target.y)/M;e.age+=dt;e.cooldown-=dt;e.jam=Math.max(0,e.jam-dt);if(e.dragging){const w=e.dragging;if(!w.alive||!w.wounded){e.dragging=null;continue;}const angle=S.windDir+Math.PI/2;a.vx=Math.cos(angle)*22;a.vy=Math.sin(angle)*22;e.yaw=angle;e.state='drag';w.a.place(a.x-Math.cos(angle)*10,a.y-Math.sin(angle)*10,a.z);continue;}if(e.wounded){const helper=raiders.find(q=>q!==e&&q.alive&&!q.wounded&&!q.civilian&&q.faction===e.faction&&!q.dragging&&Math.hypot(q.a.x-a.x,q.a.y-a.y)<15*M);if(helper){if(e.betrayer&&helper.betrayer){e.wounded=false;e.hp=120;e.state='combat';helper.cooldown=2;}else if(Math.hypot(helper.a.x-a.x,helper.a.y-a.y)<5*M){helper.dragging=e;}else{helper.goal=[a.x,a.y];helper.state='hunt';}}e.woundTime-=dt;if(e.woundTime<=0){hurtEnemy(e,100,true);continue;}a.vx=Math.cos(e.yaw)*14;a.vy=Math.sin(e.yaw)*14;continue;}if(e.civilian){const flee=Fire.near(a.x,a.y,24)||(e.alert>0);const yaw=flee?Math.atan2(a.y-target.y,a.x-target.x):e.age*.08+e.id;const sp=flee?70:9;a.vx=Math.cos(yaw)*sp;a.vy=Math.sin(yaw)*sp;e.yaw=yaw;e.alert=Math.max(0,e.alert-dt);continue;}if(e.friendly){if(S.down){const dx=target.x-a.x,dy=target.y-a.y,L=Math.hypot(dx,dy)||1;a.vx=dx/L*110;a.vy=dy/L*110;e.yaw=Math.atan2(dy,dx);}else{const target=raiders.find(q=>q.alive&&!q.friendly&&!q.civilian&&Math.hypot(q.a.x-a.x,q.a.y-a.y)<120*M);if(target&&e.cooldown<0){hurtEnemy(target,24,true);e.cooldown=.3;e.flash=1;e.yaw=Math.atan2(target.a.y-a.y,target.a.x-a.x);}}continue;}
 const fire=Fire.near(a.x,a.y,24);if(fire||e.burning>0){e.state='fleeFire';let best=null,bd=Infinity;for(let i=0;i<12;i++){const angle=i/12*TAU,x=a.x+Math.cos(angle)*28*M,y=a.y+Math.sin(angle)*28*M;if(Fire.state[cellAt(x,y)]!==1){const score=(FUEL[biomeAt(x/M,y/M)]||0)*10+Math.abs(Math.cos(angle-S.windDir))*3;if(score<bd){bd=score;best=[x,y];}}}if(best){const dx=best[0]-a.x,dy=best[1]-a.y,l=Math.hypot(dx,dy)||1;a.vx=dx/l*100;a.vy=dy/l*100;e.yaw=Math.atan2(dy,dx);}continue;}
 e.think-=dt;if(e.think<=0){e.think=.17;const night=S.hour<6||S.hour>20,sight=130*TUNE.enemySight*(night?.55:1)*(S.crouch&&biomeAt(target.x/M,target.y/M)==='reeds'?.5:1)*(S.storm>0?.5:1)*(Fire.near(a.x,a.y,32)?.5:1);e.sees=dist<sight&&(inSession?target.hp>0:S.alive&&!S.down)&&world.clear(a.x,a.y,a.z+23,target.x,target.y,target.z+20);const paper=hasPapers(e.faction)&&!e.betrayer&&!e.target;if(e.sees&&paper){e.state='papers';if(S.ads){e.aimTime=(e.aimTime||0)+.17;if(e.aimTime>1)burnPapers();}else e.aimTime=0;if(!e.waved&&dist<24){e.waved=true;say(e.faction==='front'?'Front sentry':'Authority sentry','In order. Keep moving.');}}else if(e.sees){e.state='combat';e.alert=20;e.goal=[target.x,target.y];}else if(e.alert>0){e.state='hunt';e.alert-=.17;}else e.state='idle';}
 if(e.state==='combat'){const angle=Math.atan2(target.y-a.y,target.x-a.x);e.yaw=angle;const flank=e.id%3===0?Math.PI/2:0,sp=dist>25?40:dist<12?-30:0;a.vx=Math.cos(angle+flank)*sp;a.vy=Math.sin(angle+flank)*sp;if(e.cooldown<=0&&!e.jam){e.cooldown=.35+rnd()*.35;if(rnd()<.05){e.jam=1.5;say(e.faction==='front'?'Front soldier':'Provisional','Come on. Come on.');}else{e.flash=1;if(!NO_RENDER)tracer([a.x,a.y,a.z+22],[target.x,target.y,target.z+16],'#f4ba76',8000,.35);if(rnd()<.22*TUNE.enemyAccuracy*Math.min(1,55/dist))(targetId!==null&&targetId!==AIHub.me?netDamage(targetId,8*TUNE.enemyDamage):hurtPlayer(8*TUNE.enemyDamage,angle+Math.PI));A.sfx('distant',{vol:.12});}}if(e.officer&&(e.combatAge=(e.combatAge||0)+dt)>15&&!e.called){e.called=true;say('Officer radio','Need another truck. This account is growing.');spawnPatrol(e.faction);}}
 else if(e.state==='hunt'){const dx=e.goal[0]-a.x,dy=e.goal[1]-a.y,l=Math.hypot(dx,dy)||1;a.vx=dx/l*40;a.vy=dy/l*40;e.yaw=Math.atan2(dy,dx);}else{a.vx=0;a.vy=0;e.yaw+=Math.sin(e.age*.2)*dt*.1;}
 if(e.state==='combat'&&dist<40&&S.time-(S.lastBark||0)>5){S.lastBark=S.time;const b=BARKS[e.faction]||BARKS.front;say(e.faction==='front'?'Front soldier':'Provisional',b[Math.floor(rnd()*b.length)]);}
 }}
function drawPeople(dt=.016){const pen=world.pen;pen.at();for(const e of raiders){const a=e.a;if(Math.hypot(a.x-S.cam.x,a.y-S.cam.y)>340*M)continue;const b=e.b;Object.assign(b,{x:a.x,y:a.y,z:a.z-(e.wounded?6:0),vx:a.vx,vy:a.vy,vz:a.vz,grounded:a.grounded,yaw:e.yaw,aimYaw:e.yaw,aimPitch:0,move:e.wounded?'crouch':'stand',ads:e.state==='combat',low:e.state!=='combat',sprint:e.state==='fleeFire',gun:{flash:e.flash,mag:0,bolt:e.jam>0?Math.sin(e.jam*8)*.5:0}});pose(world,b,dt);if(e.civilian)b.G=null;if(e.dragging&&b.J){b.G=null;const hand=[e.dragging.a.x,e.dragging.a.y,e.dragging.a.z+10];b.J.hands[0]=hand;b.J.arms[0]=ik(b.J.S[0],hand,4.9*b.k,4.7*b.k,[0,0,-1]);}drawSoldier(pen,b);if(Dev.aiLabels){const p=world.project(a.x,a.y,a.z+36);if(p)Dev.labels.push([p,e.state]);}}
 for(const n of people){if(n.gone||n.buddy?.dead||n.buddy?.entity?.alive&&!n.buddy.down)continue;if(Math.hypot(n.x-S.cam.x,n.y-S.cam.y)>180*M)continue;const b=n.b;Object.assign(b,{x:n.x,y:n.y,z:n.z,yaw:Math.atan2(hero.y-n.y,hero.x-n.x),aimYaw:Math.atan2(hero.y-n.y,hero.x-n.x),move:n.id==='tarn'?'crouch':'stand',weapon:'verger',low:true,talk:S.subtitle?.speaker===n.name});pose(world,b,dt);b.G=null;drawSoldier(pen,b);}
}

function initBuddies(){S.buddies=MERCS.map((m,i)=>({merc:i,name:m.name,dead:false,down:false,rep:0,met:false,entity:null})).filter(b=>b.merc!==S.merc);for(let i=0;i<S.buddies.length;i++){const b=S.buddies[i],site=['salt','lamp','tannery'][i];b.site=site;const o=OP[site];people.push({id:'buddy'+i,name:b.name,x:o.x-3*M,y:o.y+6*M,z:o.z,look:'smuggler',b:body('smuggler'),buddy:b,site});}}
function buddyRescue(){const b=S.buddies.filter(b=>!b.dead&&!b.down&&b.met).sort((a,b)=>b.rep-a.rep)[0];if(!b||S.rescueCd>0||rnd()>TUNE.rescueChance)return false;S.down=true;S.rescueCd=120;S.rescuer=b;S.rescueT=0;S.hp=0;const x=hero.x-M*45,y=hero.y+M*10;b.entity=spawnEnemy(x,y,'front',{friendly:true,buddy:b,look:'smuggler',hp:150});say(b.name,'Up. Not dead. Not yet, anyway. You owe me a drink you will never buy.');return true;}
function buddyStep(dt){if(S.down){S.rescueT+=dt;hero.vx=hero.vy=0;const b=S.rescuer;if(b.dead||b.down){S.down=false;S.alive=false;game.go('dead');return;}if(S.rescueT>7&&S.rescueT<9){const x=hero.x+Math.cos(S.yaw+Math.PI)*3*M*dt,y=hero.y+Math.sin(S.yaw+Math.PI)*3*M*dt;hero.place(x,y,height(x,y)+1);}if(S.rescueT>=10){S.down=false;S.hp=b.merc===1?80:60;S.lung=Math.min(50,S.lung);act('heal',.9);S.rescueT=0;b.fightUntil=S.time+(b.merc===3?120:60);say(b.name,'Stop bleeding on my boots.');}}
 for(const b of S.buddies){if(b.down&&!b.dead){b.bleed-=dt;if(b.bleed<=0)killBuddy(b);}if(b.entity&&b.fightUntil&&S.time>b.fightUntil&&!S.down){world.remove(b.entity.a);const i=raiders.indexOf(b.entity);if(i>=0)raiders.splice(i,1);b.entity=null;b.fightUntil=0;}}}
function downBuddy(b){if(b.dead||b.down)return;b.down=true;b.bleed=45;if(b.entity){b.entity.alive=true;b.entity.hp=40;b.entity.wounded=true;b.entity.woundTime=999;b.entity.b.dead=null;}say(b.name,'I am against the wall. I am not resting.');}
function killBuddy(b){b.dead=true;b.down=false;if(b.entity){b.entity.alive=false;b.entity.a.setSolid(false);b.entity.b.dead={t:0,dir:S.yaw,g:b.entity.a.z};}const n=people.find(n=>n.buddy===b);if(n)n.gone=true;S.flags.buddyDead=true;say('Sister Perpetua','One fewer to count.');}
function saveBuddy(b,mercy=false){if(b.dead||!b.down)return false;if(!mercy&&(b.bleed<5||b.entity&&Fire.near(b.entity.a.x,b.entity.a.y,4)))return false;if(mercy){const prev=S.cur;S.cur='verger';S.flash=1;act('mercy',.6,()=>S.cur=prev);A.sfx('gun_verger');killBuddy(b);return true;}if(!S.syrettes)return false;S.syrettes--;b.down=false;b.rep++;b.fightUntil=S.time+60;if(b.entity){b.entity.wounded=false;b.entity.hp=80;b.entity.state='friendly';b.entity.b.dead=null;}act('heal',.9);say(b.name,'Put it on the account.');return true;}

const Contracts={get current(){return CONTRACTS[S.contract];},get step(){return CONTRACTS[S.contract]?.steps[S.step];},begin:beginContract,next:nextStep,target:targetPoint,update:contractStep};
function currentStep(){return CONTRACTS[S.contract]?.steps[S.step];}
function targetPoint(st=currentStep()){if(st?.kind==='destroy'&&S.stolenTruck&&S.stolenTruck.hp>0)return[OP.red.x,OP.red.y,OP.red.z];if(S.mode==='salvage')return [OP.salt.x+12*M,OP.salt.y+3*M];if(!st)return null;if(st.npc){const n=people.find(n=>n.id===st.npc);if(n)return[n.x,n.y,n.z];}if(st.buddy!==undefined){const n=people.find(n=>n.buddy===S.buddies[st.buddy]);if(n)return[n.x,n.y,n.z];}if(st.post){const p=POSTS.find(p=>p.id===st.post);return[p.x,p.y,p.z];}if(st.kind==='read'&&st.count){const a=STAKES.filter(s=>!s.found).sort((a,b)=>Math.hypot(a.m*M-hero.x,a.n*M-hero.y)-Math.hypot(b.m*M-hero.x,b.n*M-hero.y))[0];if(a)return[a.m*M,a.n*M,height(a.m*M,a.n*M)];}const o=OP[st.site];return o?[o.x+(st.offset?.[0]||0)*M,o.y+(st.offset?.[1]||0)*M,o.z]:null;}
function showCard(title,pages,onDone){S.card={title,pages:Array.isArray(pages)?pages:[pages],index:0,onDone};S.tool='log';S.readText=S.card.pages[0];say(title,S.readText);}
function closeCard(){if(!S.card)return;const c=S.card;if(c.index<c.pages.length-1){c.index++;S.readText=c.pages[c.index];say(c.title,S.readText);}else{S.card=null;S.tool=null;S.readText=null;if(c.onDone)c.onDone();}}
function beginContract(index){S.contract=index;S.step=0;S.stepTime=0;S.prepared='';S.objectiveT=8;const c=CONTRACTS[index];if(!c)return;S.alt=false;S.altPending=false;S.papers=c.papers;S.burnedPapers=S.burnedPapers.filter(f=>f!==c.papers);S.stash={};if(c.id==='P0')showCard('MERIDIAN / PRIVATE CONTRACT',LETTER,()=>nextStep());if(c.id==='C6'){say('Ilse Tarn',c.brief.join(' '),17);S.locatorRing=5;}}
function completeContract(){const c=CONTRACTS[S.contract];if(!c)return;S.stones+=c.pay+(S.alt?(c.alt?.pay||0):0);if(c.ampoules){const less=c.id==='C3'&&(S.flags.tentsBurned||S.flags.civilianDied)?1:0;S.ampoules=Math.min(6,S.ampoules+c.ampoules-less);}if(S.alt&&c.alt){const b=S.buddies[c.alt.buddy];if(b)b.rep++;}if(!S.completed.includes(c.id))S.completed.push(c.id);if(c.id==='C3')say('Sister Perpetua',S.flags.tentsBurned?'Three ampoules. The fourth was under a tent.':S.flags.civilianDied?'One fewer. I have the name in my book.':'Four ampoules. Four people with papers. Arithmetic, at last.');if(c.id==='C4')say('Captain Dray',S.flags.tentsBurned?'The tents were listed as temporary structures.':'The camp is still there. A complication in the report.');if(c.id==='C5'){S.flags.portBurned=true;say('Mr. Sunday','Port Clement is closed for stocktaking.');}beginContract(Math.min(S.contract+1,CONTRACTS.length-1));saveAuto();}
function nextStep(){S.step++;S.stepTime=0;S.prepared='';S.stepHint=null;S.objectiveT=7;if(S.step>=CONTRACTS[S.contract].steps.length)completeContract();}
function prepareStep(st){const c=CONTRACTS[S.contract],pt=targetPoint(st);S.stepTime=0;S.prepared=c.id+':'+S.step;if(st.kind==='kill'){
 if(st.target==='ambushers'){S.papers=null;for(let i=0;i<2;i++)spawnEnemy(OP.strip.x-(39+i*5)*M,OP.strip.y-(22+i*4)*M,'authority',{target:'ambushers'+i});S.tutorialJam=true;}
 if(st.target==='paymaster')spawnEnemy(OP.st4.x,OP.st4.y+8*M,'front',{target:'paymaster',officer:true,hp:100});
 if(st.target==='renn'){const o=OP.port;spawnEnemy(o.x,o.y+15*M,'authority',{target:'renn',officer:true,hp:120});}
 if(st.target==='betrayers'){const living=S.buddies.filter(b=>!b.dead);for(let i=0;i<Math.max(living.length,3);i++){const a=i/3*TAU;const e=spawnEnemy(OP.salt.x+Math.cos(a)*15*M,OP.salt.y+Math.sin(a)*15*M,'front',{target:'betrayers'+i,betrayer:true,hp:200,look:'smuggler',weapon:'choir'});if(living[i])e.formerBuddy=living[i];}say(living[0]?.name||'Mr. Sunday',living.length?'Meridian doubled it. You would do the same. You have done the same.':'An empty chair. That is what loyalty costs today.');for(let i=0;i<16;i++){const a=i/16*TAU;Fire.ignite(OP.salt.x+Math.cos(a)*38*M,OP.salt.y+Math.sin(a)*38*M,5,true);}S.papers=null;}
 }
 if(st.kind==='destroy'){setHour(18.4);S.convoy=[];for(let i=0;i<3;i++){const q=makeVehicle('truck',OP.salt.x+(80+i*28)*M,OP.salt.y+8*M,{convoy:true});q.ai={road:11,index:Math.floor(roads[11].length*.15)+i*4};S.convoy.push(q);}makeVehicle('technical',OP.salt.x+55*M,OP.salt.y+12*M,{ai:{road:11,index:0},faction:'authority'});giveGun('bishop',.7);}
 if(st.kind==='drive')S.driveStart=S.driven||0;
 if(st.kind==='ignite'){S.igniteStart=Fire.lit;giveGun('gardener',.37);setHour(10);S.windDir=0;}
 if(st.kind==='hold'){S.windDir=-.55;say('Sister Perpetua',"Whatever you lit, it's coming to us.");for(let i=0;i<7;i++)Fire.ignite((820+i*22)*M,(1370-i*13)*M,6,true);}
 if(st.kind==='script'&&st.script==='ambush'){S.bound=true;const q=makeVehicle('truck',hero.x,hero.y,{angle:-1});S.ride=q;enterVehicle(q);S.papers=null;say('Papa Static',RADIO[0]);}
 if(st.kind==='script'&&st.script==='firstfit'){S.bound=true;S.lung=100;S.fit=8;S.tool=null;A.sfx('cough');say('Sister Perpetua',"You were on the road when the grass went. That makes you lucky or stupid, and you don't look lucky.",12);}
 if(c.id==='C3'&&st.kind==='drive'){setHour(22);for(let i=0;i<4;i++)Fire.ignite((980-i*13)*M,(1450+i*9)*M,5,true);}
 if(c.id==='C5'&&st.kind==='goto'){for(const [x,y]of [[-30,-20],[35,0],[0,45]])Fire.ignite(OP.port.x+x*M,OP.port.y+y*M,18,true);if(S.alt)triggerAlt('blast');S.flags.portBurned=true;}
 if(c.id==='F'&&st.kind==='goto'){S.windDir=-Math.PI/2;for(let i=0;i<8;i++)Fire.ignite((970+i*8)*M,(400+i*8)*M,8,true);}
 if(st.kind==='choice'){if(S.read.length===8)say('Ilse Tarn',"You read them all. Nobody reads them all. Then you know what it's for.");S.finalChoice=true;}
}
function contractStep(dt){if(S.mode!=='campaign'||S.attract||S.ending)return;const st=currentStep();if(!st)return;if(S.prepared!==CONTRACTS[S.contract].id+':'+S.step)prepareStep(st);S.stepTime+=dt;S.objectiveT=Math.max(0,S.objectiveT-dt);const p=targetPoint(st),dist=p?Math.hypot(hero.x-p[0],hero.y-p[1])/M:999;
 if(st.kind==='script'){if(st.script==='ambush'){if(S.stepTime<8&&S.ride){S.ride.v.update(dt,null,{gas:.8});S.ride.v.angle=-1;}if(S.stepTime>9&&S.bound){exitVehicle();S.bound=false;damageVehicle(S.ride,1000);hero.place(OP.strip.x-20*M,OP.strip.y-12*M,OP.strip.z);for(let i=-4;i<=4;i++)Fire.ignite(OP.strip.x-(26+i*.4)*M,OP.strip.y+(-12+i*4)*M,5,true);const k=cellAt(OP.strip.x-35*M,OP.strip.y-12*M);Fire.state[k]=2;burnData[k]=255;S.hp=65;say('Your contract','Run into the black. The ash cannot burn twice.');}}if(S.stepTime>=st.seconds){if(st.script==='firstfit'){S.bound=false;S.fit=0;S.lung=20;S.hp=65;S.papers='clinic';hero.place(OP.mission.x-6*M,OP.mission.y+2*M,OP.mission.z+1);setHour(8);S.yaw=-.4;}nextStep();}}
 else if(st.kind==='goto'&&dist<(st.radius||20)){if(st.post){const post=POSTS.find(p=>p.id===st.post);post.passed=hasPapers(post.faction);}nextStep();}
 else if(st.kind==='drive'&&S.vehicle&&(!st.boat||S.vehicle.type==='airboat')&&(S.driven||0)-(S.driveStart||0)>st.distance)nextStep();
 else if(st.kind==='kill'){let done=false;if(st.target==='ambushers')done=S.flags.ambushers0&&S.flags.ambushers1;else if(st.target==='betrayers')done=!raiders.some(e=>e.alive&&e.betrayer);else done=!!S.flags[st.target];if(done)nextStep();}
 else if(st.kind==='destroy'&&S.convoy){const intact=S.convoy.filter(v=>v.hp>0);if(S.alt&&intact.length===1){const q=intact[0];q.ai=null;if(S.stolenTruck!==q){S.stolenTruck=q;if(q.hp>q.max*.18)q.hp=q.max*.18;say('Your buddy','The truck is coughing. Repair it, then bring it to Red Steps. Do not open the cargo.');S.stepHint='Repair the stolen truck. Drive it to Red Steps.';}if(Math.hypot(q.v.x-OP.red.x,q.v.y-OP.red.y)<40*M){say('Comrade Teacher Sell','Rifles. Both armies\' stencils. We never said which kind of water.');nextStep();}}else if(!intact.length)nextStep();}
 else if(st.kind==='ignite'&&Fire.lit-(S.igniteStart||0)>8&&dist<100)nextStep();
 else if(st.kind==='hold'&&S.stepTime>=st.seconds){let ash=0;for(let i=0;i<20;i++)if(Fire.state[cellAt((930+i*6)*M,1260*M)]===2)ash++;S.flags.backburned=ash>=5;S.flags.tentsBurned=!S.flags.backburned;if(S.flags.tentsBurned){for(let i=0;i<6;i++)Fire.ignite(OP.salt.x+(-15+i*6)*M,OP.salt.y+120*M,6,true);}nextStep();}
 else if(st.kind==='read'&&st.count&&S.read.length>=st.count)nextStep();
 if(S.tutorialJam&&S.shots>=2&&S.inventory.verger){S.inventory.verger.jammed=true;S.tutorialJam=false;say('Your contract',prompt('reload','Clear the jam. There is no better gun yet.'));}
 if(S.altPending){if(game.input.pressed('use')||game.input.pressed('confirm')){game.input.consumeAll();S.alt=true;S.altPending=false;say(S.buddies[CONTRACTS[S.contract].alt.buddy]?.name||'Buddy','Nothing will go wrong. Put that in writing.');}else if(game.input.pressed('reload')||game.input.pressed('cancel')){S.altPending=false;game.input.consumeAll();}}
 if(S.defend>0){S.defend-=dt;S.defenceSpawn=(S.defenceSpawn||0)-dt;if(S.defenceSpawn<=0){S.defenceSpawn=22;for(let i=0;i<3;i++)spawnEnemy(OP.sill.x+(-15+i*12)*M,OP.sill.y+18*M,i%2?'front':'authority',{z:OP.sill.z+46.6*M});say('Papa Static',Math.ceil(S.defend/60)+' minutes. The column is still crossing.');}if(S.defend<=0){S.wheelReady=true;say('Papa Static','Column clear. Nineteen seconds. Give the country its water.');}}
}
function triggerAlt(kind){const c=CONTRACTS[S.contract],b=S.buddies[c.alt?.buddy??0];if(!b||b.dead)return;if(kind==='alarm'||kind==='blast'){const p=targetPoint();b.met=true;b.entity=spawnEnemy(p[0]+5*M,p[1],'front',{friendly:true,buddy:b,look:'smuggler'});downBuddy(b);if(kind==='blast')Fire.ignite(p[0]+10*M,p[1],5,true);}}
function getNear(){if(S.card)return{kind:'card',text:'Continue'};if(S.altPending)return{kind:'alt',text:'Accept buddy plan'};if(S.tool==='card')return{kind:'shop',text:'Buy / unlock'};if(S.tool==='watch')return{kind:'sleepConfirm',text:'Sleep until '+String(S.sleepHour).padStart(2,'0')+':00'};if(S.finalChoice)return{kind:'final',text:'Choose'};if(S.mode==='salvage')return salvageNear();if(S.vehicle)return{kind:'exit',text:'Exit '+S.vehicle.type};let near=null,bd=4.5*M;const add=(kind,x,y,text,o={},r=4.5*M)=>{const d=Math.hypot(hero.x-x,hero.y-y);if(d<Math.min(bd,r)){near={kind,text,...o};bd=d;}};
 for(const b of S.buddies)if(b.down&&!b.dead&&b.entity)add('buddyDown',b.entity.a.x,b.entity.a.y,'Save '+b.name,{buddy:b});
 const st=currentStep(),p=targetPoint();if(st&&p&&['take','read'].includes(st.kind)&&!st.count)add('objective',p[0],p[1],st.kind==='take'?'Take '+st.item:'Read the letter');
 for(const n of people)if(!n.gone&&Math.abs(hero.z-n.z)<3*M)add('npc',n.x,n.y,'Talk to '+n.name,{npc:n});
 for(const v of vehicles)if(v.hp>0){add('vehicle',v.v.x,v.v.y,'Enter '+v.type,{vehicle:v},4*M);if(v.hp<v.max*.6){const x=v.v.x+Math.cos(v.v.angle)*20,y=v.v.y+Math.sin(v.v.angle)*20;add('repair',x,y,'Repair engine',{vehicle:v},2.5*M);}}
 for(const o of SITES)if(o.faction==='safe'){add('bed',o.x,o.y+6*M,'Sleep / save',{site:o});add('crate',o.x+5*M,o.y+6*M,'Fresh weapons / supplies',{site:o});}
 for(const st of STAKES)if(!st.found)add('stake',st.m*M,st.n*M,'Read survey stake '+(st.index+1),{stake:st});
 for(const c of CASES)if(!c.taken)add('case',c.m*M,c.n*M,'Open diamond case',{case:c});
 for(const l of loot)if(l.cond>0)add('gun',l.x,l.y,'Take worn '+WEAPONS[l.weapon].name,{gun:l});
 for(const d of doors)if(!d.open)add('door',d.x,d.y,'Open door',{door:d},2.5*M);
 return near;}
function useNear(n){if(S.mode==='salvage'&&salvageUse(n))return;if(n.kind==='card'){closeCard();return;}if(n.kind==='alt'){S.alt=true;S.altPending=false;return;}if(n.kind==='exit'){exitVehicle();return;}if(n.kind==='vehicle'){enterVehicle(n.vehicle);return;}if(n.kind==='repair'){repairVehicle(n.vehicle);return;}if(n.kind==='door'){n.door.open=true;A.sfx('door');return;}if(n.kind==='gun'){giveGun(n.gun.weapon,n.gun.cond);loot.splice(loot.indexOf(n.gun),1);return;}if(n.kind==='crate'){for(const id of S.slots.filter(Boolean)){if(S.unlocked.includes(id))S.inventory[id].cond=1;}refill();say('Weapon crate','A clean rifle. The same old hands.');return;}
 if(n.kind==='bed'){S.claimed=S.claimed||[];if(!S.claimed.includes(n.site.id))S.claimed.push(n.site.id);S.tool='watch';S.sleepHour=Math.floor((S.hour+6)%24);S.bedSite=n.site.id;return;}if(n.kind==='sleepConfirm'){sleep(S.sleepHour);return;}
 if(n.kind==='stake'){const st=n.stake;st.found=true;if(!S.read.includes(st.index))S.read.push(st.index);showCard('SOUNDING '+(st.index+1)+' / ILSE TARN',SOUNDINGS[st.index]);return;}
 if(n.kind==='case'){n.case.taken=true;S.stones+=n.case.value;A.sfx('coin');say('Diamond case',n.case.value+' stones. Somebody hid them for a future.');return;}
 if(n.kind==='buddyDown'){S.buddyChoice=n.buddy;showCard(n.buddy.name,['Hold on. Use a syrette, or give them a clean end.'],()=>{S.buddyChoice=n.buddy;const b=n.buddy,can=S.syrettes>0&&b.bleed>=5&&!(b.entity&&Fire.near(b.entity.a.x,b.entity.a.y,4));S.choiceUI={title:'A debt in the dirt',buddy:b,options:[...(can?[['Use syrette',()=>saveBuddy(b)]]:[]),['Mercy',()=>saveBuddy(b,true)]]};});return;}
 if(n.kind==='objective'){const st=currentStep();if(st.item)S.stash[st.item]=true;if(CONTRACTS[S.contract].id==='C1'&&S.alt)triggerAlt('alarm');nextStep();return;}
 if(n.kind==='npc'){const npc=n.npc,st=currentStep(),match=st&&(st.npc===npc.id||st.buddy!==undefined&&npc.buddy===S.buddies[st.buddy]);if(npc.buddy){npc.buddy.met=true;}if(match){const c=CONTRACTS[S.contract];let pages;if(S.step===0)pages=c.brief;else if(npc.id==='tarn')pages=c.brief;else pages=[npc.id==='sister'?'That cough is the seabed. It does not leave. These will hold it off. There are never enough of these.':npc.buddy?'If you go down, I will come. I would prefer you did not test it.':'The account balances. For now.'];showCard(npc.name,pages,()=>{if(c.id==='C5'&&S.step===0)giveGun('curate',.42);nextStep();if(c.alt&&S.step===1&&!S.buddies[c.alt.buddy]?.dead){S.altPending=true;say(S.buddies[c.alt.buddy]?.name||'Buddy',c.alt.brief,12);}});}else if(npc.id==='sunday')openShop();else if(npc.id==='sister'){say(npc.name,'I do not pray for you. I count you. It is more accurate.');}else if(npc.buddy)say(npc.name,npc.buddy.dead?'':npc.buddy.rep?'You keep adding to the account.':'I keep the chair warm. You keep breathing.');else say(npc.name,'Come back when the ledger has your name.');return;}
 if(n.kind==='shop'){buyGun();return;}if(n.kind==='final'){openFinalChoice();return;}
}
function openShop(){S.tool='card';S.shopIndex=0;S.shopIds=Object.keys(WEAPONS).filter(k=>!['rifle','shotgun','verger','machete'].includes(k));say('Mr. Sunday','Everything on this boat is guaranteed until it leaves this boat.');}
function buyGun(){const id=S.shopIds[S.shopIndex],w=WEAPONS[id];if(S.unlocked.includes(id)){giveGun(id);say('Mr. Sunday','Your congregation remembers you.');}else if(S.stones>=w.cost){S.stones-=w.cost;S.unlocked.push(id);giveGun(id);S.tool='card';say('Mr. Sunday','You want clean hands, see the Sister. You want a clean rifle, that is '+w.cost+' stones.');}else say('Mr. Sunday','Faith is free. Steel is '+w.cost+' stones.');}
function refill(){for(const [id,g]of Object.entries(S.inventory)){const w=WEAPONS[id];g.cond=1;g.mag=w.mag;g.reserve=w.reserve;g.jammed=false;}S.syrettes=S.merc===1?7:5;S.bottles=S.nades=4;S.hp=100;}
function sleep(hour=8){S.tool=null;S.card=null;S.fit=0;S.blood=false;setHour(hour);for(const p of POSTS)if(p.clear&&rnd()<TUNE.postRespawn){p.clear=false;p.spawned=false;}for(let k=0;k<burnData.length;k++)if(fireState[k]===2&&rnd()<.05){fireState[k]=0;burnData[k]=0;}Fire.tex.needsUpdate=true;const st=currentStep();if(st?.kind==='sleep')nextStep();saveAuto();say('Safe house','Six hours on borrowed sheets. The radio is still there.');}
function saveData(){const keys=['hp','alive','mode','time','cur','inventory','slots','unlocked','syrettes','ampoules','bottles','nades','stones','lung','lastFit','stamina','blood','merc','papers','burnedPapers','flags','contract','step','completed','hour','windDir','wind','read','rescueCd','claimed','stash','alt','ending','banked'];const state={};for(const k of keys)state[k]=S[k];state.buddies=S.buddies.map(({entity,...b})=>({...b}));const r=[];for(let k=0;k<fireState.length;){if(!fireState[k]){k++;continue;}const start=k,val=fireState[k];while(k<fireState.length&&fireState[k]===val)k++;r.push([start,k-start,val]);}return{version:1,state,at:[hero.x,hero.y,hero.z,S.yaw,S.pitch],posts:POSTS.map(p=>({id:p.id,clear:p.clear})),cases:CASES.map(c=>c.taken),burn:btoa(JSON.stringify(r))};}
function loadData(data){reset(3,data.state.merc);Object.assign(S,data.state);S.ending=null;S.alive=true;S.buddies=data.state.buddies.map(b=>({...b,entity:null}));for(const n of people)if(n.id.startsWith('buddy')){const i=+n.id.slice(5);n.buddy=S.buddies[i];n.gone=n.buddy?.dead;}hero.place(...data.at.slice(0,3));S.yaw=data.at[3];S.pitch=data.at[4];for(const p of POSTS)p.clear=!!data.posts.find(q=>q.id===p.id)?.clear;CASES.forEach((c,i)=>c.taken=!!data.cases[i]);STAKES.forEach(st=>st.found=S.read.includes(st.index));for(const[k,n,v]of JSON.parse(atob(data.burn))){for(let i=k;i<k+n;i++){fireState[i]=v;burnData[i]=v===1?170:255;if(v===1){Fire.burning.push(i);Fire.t[i]=8;}}}Fire.tex.needsUpdate=true;S.prepared='';setHour(S.hour);camStep(0);}
function saveAuto(){if(!inSession&&!S.attract&&S.mode==='campaign')game.saves.autosave();}
function openFinalChoice(){S.finalChoice=false;S.choiceUI={title:'FORTY-ONE METRES',options:[['The Contract — take Cray\'s helicopter',()=>chooseEnding('contract')],['The Arithmetic — open the gates now',()=>{S.wheelReady=true;S.pendingEnding='arithmetic';say('Ilse Tarn','Both hands. Hold both triggers on the wheel.');}],['The Sounding — hold the dam for six minutes',()=>{S.defend=360;S.defenceSpawn=0;S.pendingEnding='sounding';S.wheelReady=false;say('Ilse Tarn','Six minutes. Give them six minutes.');}]]};}
function chooseEnding(id){S.ending=id;S.endingTime=0;S.tool=null;S.choiceUI=null;S.finalChoice=false;S.act=id==='contract'?'flight':'wheel';S.actT=0;S.actDur=999;if(id==='contract')S.stones+=200;else{hero.place(OP.sill.x,OP.sill.y+6*M,OP.sill.z+46.4*M);S.yaw=Math.PI/2;S.pitch=-.075;}S.flooding=id!=='contract';S.flags.finished=true;saveAuto();say('Ilse Tarn',id==='contract'?'Mr. Cray keeps his appointments.':'I measured this lake for thirty years. It was the only honest thing in the country and I killed it with a pencil.',14);}
function endingStep(dt,I){if(S.wheelReady&&!S.ending&&I.down('fire')&&I.down('aim')){S.wheelT=(S.wheelT||0)+dt;S.act='wheel';S.actT=S.wheelT;S.actDur=999;if(S.wheelT>3)chooseEnding(S.pendingEnding);}if(!S.ending)return;S.endingTime+=dt;const t=S.endingTime;if(S.ending==='contract'){hero.fly=true;hero.place(OP.sill.x+Math.sin(t*.03)*t*25,OP.sill.y+t*45,OP.sill.z+(50+t*.8)*M);S.yaw=1.7;S.pitch=-.22;}else{flood.position.y=S.ending==='sounding'&&t>90?lerp(-7,OP.sill.h+48,clamp((t-90)/10,0,1)):lerp(-25,-7,clamp(t/90,0,1));S.cam.z=OP.sill.z+48*M;}
 if(t>118){S.ending=null;S.act=null;game.go('title');}}

function wrapPixel(g,text,x,y,width,color='#e6dfc8',line=10,scale=1){const max=Math.max(14,Math.floor(width/(6*scale))),words=text.split(' ');let row='';for(const w of words){if(row.length+w.length>max){E.font.text(g,row,x,y,color,{scale,shadow:'#10140f',outline:false});y+=line;row='';}row+=(row?' ':'')+w;}if(row)E.font.text(g,row,x,y,color,{scale,shadow:'#10140f',outline:false});return y+line;}
function hud(g,r){if(!S)return;const W=r.W,H=r.H;if(S.attract){E.font.text(g,'DEMO / '+Attract.names[Attract.index],14,15,'#f0d29a',{shadow:'#161e14'});E.font.text(g,'PRESS ANYTHING TO RETURN',W/2,H-16,'#eee6c9',{align:'center',shadow:'#161e14'});return;}
 if(S.mode==='salvage'){const left=Math.max(0,360-Salvage.elapsed);E.font.text(g,'SALVAGE RIGHTS',14,14,'#e6d7ac',{shadow:'#121910'});E.font.text(g,Math.floor(left/60)+':'+String(Math.floor(left%60)).padStart(2,'0'),W-14,14,'#e6d7ac',{align:'right',shadow:'#121910'});E.font.text(g,S.banked+' BANKED / '+S.carried+' CARRIED',W/2,14,'#e6d7ac',{align:'center',shadow:'#121910'});if(inSession&&AIHub.time()<0)E.font.text(g,String(Math.ceil(-AIHub.time()/1000)),W/2,H/2,'#e6d7ac',{align:'center',scale:4});}
 if(S.ending){if(S.endingTime>100){const lines=[GAME_TITLE.toUpperCase(),'EVERYTHING WEARS OUT.','An original game inspired by Far Cry 2','my-3D2dge / three.js / Rapier','Original procedural art, animation and audio','Source and testing details: About / Credits','Usage: added on import'];veil(g,r,0,.28);const y=H+8-(S.endingTime-100)*11;lines.forEach((text,i)=>E.font.text(g,text,W/2,y+i*19,'#eee6cb',{align:'center',shadow:'#142011',outline:false}));return;}const data=ENDINGS[S.ending];if(S.endingTime>16){veil(g,r,H*.6,.65);E.font.text(g,data.title,22,H*.64,'#e6d2a0',{scale:2});wrapPixel(g,data.text,22,H*.64+25,W-44,'#e5dfcb',11);if(S.ending==='sounding'&&S.endingTime>96){g.fillStyle='rgba(240,240,217,'+clamp((S.endingTime-96)/4,0,1)+')';g.fillRect(0,0,W,H);}if(S.endingTime>78)E.font.text(g,data.last,W/2,H-24,'#f4edda',{align:'center',shadow:'#10150e'});}return;}
 if(S.hurtT>0){g.fillStyle='rgba(130,28,17,'+S.hurtT*.35+')';g.fillRect(0,0,W,H);S.hurtT=Math.max(0,S.hurtT-.016);}if(S.fit>0){g.fillStyle='rgba(239,227,190,'+(.1+Math.sin(S.time*8)*.06)+')';g.fillRect(0,0,W,H);E.font.text(g,prompt('heal',S.ampoules?'AMPOULE':'BREATHE'),W/2,H*.64,'#f4e9cf',{align:'center',shadow:'#24291f'});}if(S.onFire>0){g.strokeStyle='rgba(255,95,16,.6)';g.lineWidth=8;g.strokeRect(2,2,W-4,H-4);}
 if(S.down){veil(g,r,0,.45);E.font.text(g,'LISTEN FOR YOUR FRIEND.',W/2,H*.55,'#ddd8c8',{align:'center'});}
 for(let i=0;i<5;i++){g.fillStyle='#282d23';g.fillRect(15+i*13,H-20,11,4);const f=clamp((S.hp-i*20)/20,0,1);g.fillStyle=S.hp<21?'#c5714a':'#d9d1ad';g.fillRect(15+i*13,H-20,11*f,4);}for(let i=0;i<S.syrettes;i++){g.fillStyle='#b8c2a0';g.fillRect(15+i*5,H-10,2,4);}if(S.sprint){g.fillStyle='#b6ad83';g.fillRect(15,H-26,63*S.stamina,1);}
 if(S.tool!=='map'&&S.tool!=='log'&&S.tool!=='watch'&&S.tool!=='card'){g.fillStyle='#ddd9be';g.fillRect(Math.floor(W/2),Math.floor(H/2),1,1);if(S.time-S.lastShot<4||S.inventory[S.cur]?.jammed||S.time<15){const gun=S.inventory[S.cur],w=WEAPONS[S.cur];E.font.text(g,S.cur==='machete'?'':gun?.jammed?'JAMMED':(gun?.mag||0)+' / '+(gun?.reserve||0),W-16,H-24,gun?.jammed?'#db9166':'#e2d9b8',{align:'right',shadow:'#161d12'});E.font.text(g,(w?.name||'EMPTY').toUpperCase(),W-16,H-12,'#bcb594',{align:'right',shadow:'#161d12'});if(gun?.cond<.4)for(let i=0;i<5;i++){g.fillStyle=gun.cond*5>i?'#cc9769':'#555244';g.fillRect(W-45+i*6,H-32,4,2);}}}
 if(S.act&&S.act!=='wheel'){E.font.text(g,S.act==='jam'?'CLEARING JAM':S.act==='surgery'?['PLIERS / SHRAPNEL','KNIFE / LIGHTER','DISLOCATED FINGER','THIGH / NAIL'][S.surgeryKind%4]:S.act.toUpperCase(),W/2,H-35,'#d7ccaa',{align:'center',shadow:'#151e12'});g.fillStyle='#d7ccaa';g.fillRect(W/2-30,H-25,60*clamp(S.actT/S.actDur,0,1),1);}
 else if(S.near&&S.tool!=='map'&&!S.choiceUI)E.font.text(g,prompt('use',S.near.text.toUpperCase()),W/2,H-36,'#e9debd',{align:'center',shadow:'#182211'});
 if(S.wheelReady&&!S.ending)E.font.text(g,prompt('fire','+')+' '+prompt('aim','HOLD THE WHEEL'),W/2,H-45,'#e9debd',{align:'center',shadow:'#151e12'});
 if(S.altPending){veil(g,r,H-80,.65);E.font.text(g,prompt('use','ACCEPT BUDDY PLAN')+'    '+prompt('reload','DECLINE'),W/2,H-66,'#e7cc92',{align:'center'});}
 if(S.subtitle&&!S.card&&!['map','card','watch','log'].includes(S.tool)){const sub=S.subtitle,max=Math.min(W-40,340),x=(W-max)/2;g.fillStyle='rgba(15,24,16,.72)';g.fillRect(x-8,H-91,max+16,44);E.font.text(g,sub.speaker.toUpperCase(),x,H-86,'#d8ac69',{shadow:'#141b10'});wrapPixel(g,sub.text,x,H-74,max,'#e8dfc5',10);}
 if(S.objectiveT>0&&S.mode==='campaign'&&!S.card&&S.tool!=='map'){const c=CONTRACTS[S.contract];E.font.text(g,c.id+' / '+c.title.toUpperCase(),14,14,'#dcb57c',{shadow:'#192012'});wrapPixel(g,S.stepHint||currentStep()?.text||'',14,28,Math.min(W-28,340),'#e5dec5',10);}
 if(S.tool==='monocular'){const cx=W/2,cy=H/2;g.fillStyle='#080e08';g.beginPath();g.rect(0,0,W,H);g.arc(cx,cy,H*.45,0,TAU,true);g.fill('evenodd');for(const id of S.tags){const e=raiders.find(e=>e.id===id);if(e){const p=world.project(e.a.x,e.a.y,e.a.z+22);if(p){g.strokeStyle='#e0d7b9';g.strokeRect(p[0]-4,p[1]-7,8,14);}}}}
 if(S.choiceUI)drawChoice(g,r);if(Dev.stats){E.font.text(g,'ACTORS '+world.actors.length+' / FIRE '+Fire.burning.length,14,50,'#c4d6ab');E.font.text(g,'DRAW '+Math.round(world.stats.drawMs)+'ms / PHYS '+world.stats.physicsMs.toFixed(1)+'ms',14,61,'#c4d6ab');E.font.text(g,'CALLS '+world.stats.calls+' / TRIS '+world.stats.tris,14,72,'#c4d6ab');}if(Dev.aiLabels)for(const[p,t]of Dev.labels)E.font.text(g,t,p[0],p[1],'#e5cd9f',{align:'center'});Dev.labels.length=0;
 if(S.mode==='salvage'){if(!S.alive)E.font.text(g,'RETURNING IN '+Math.ceil((S.respawnAt||0)-Salvage.elapsed),W/2,H/2,'#e7ddbf',{align:'center'});if(Salvage.bankTime>0){g.fillStyle='#d0b276';g.fillRect(W/2-40,H-43,80*Salvage.bankTime/3,2);}if(inSession)for(const p of Net.players.values()){if(p.id===AIHub.me||!p.actor)continue;const q=world.project(p.x,p.y,p.z+36);if(q)E.font.text(g,p.name,q[0],q[1],p.color,{align:'center',shadow:'#10160e'});}}
}
function drawWorldObjects(){const p=world.pen;p.at();const cs=S.mode==='salvage'?Salvage.cases:CASES.filter(c=>!c.taken).map(c=>({...c,x:c.m*M,y:c.n*M}));for(const c of cs)if(!c.taken&&Math.hypot(c.x-S.cam.x,c.y-S.cam.y)<180*M){const z=height(c.x,c.y);p.at(c.x,c.y,z);p.box(0,0,3,11,7,5,'#5d664f').box(0,0,6,11.5,7.5,1,'#73795e').box(0,-4,4,2,1,2,'#b8a473');}for(const l of loot)if(l.cond>0&&Math.hypot(l.x-S.cam.x,l.y-S.cam.y)<90*M){p.at();drawGun(p,frameYP([l.x,l.y,l.z+3],.5,0,1.5),l.weapon,{cond:l.cond},1);}
 for(const n of nades){p.at(n.x,n.y,n.z,n.t*5);if(n.kind==='bottle')p.tube(-2,0,0,2,0,0,.6,'#6e7352').glow(2,0,1,.7,'#ffbf63');else p.ball(0,0,0,1.2,1.2,1.5,'#56623f');}for(const d of doors)if(!d.open){p.at(d.x,d.y,d.z,d.yaw);p.box(0,0,d.h/2,d.w,1.4,d.h,d.color);}
 for(const b of S.buddies)if(b.dead){const o=OP[b.site];p.at(o.x-3*M,o.y+6*M,o.z+8);p.tube(0,0,0,0,0,5,.8,'#6d7350').tube(0,0,5,0,0,7,.3,'#6d7350');}const dam=OP.sill;p.at(dam.x,dam.y+6*M,dam.z+47.2*M);for(let i=0;i<16;i++){const a=i/16*TAU,b=(i+1)/16*TAU;p.tube(Math.cos(a)*9,0,Math.sin(a)*9,Math.cos(b)*9,0,Math.sin(b)*9,.7,'#4f5748');}p.tube(0,0,-12,0,0,0,1.1,'#68705a').tube(-8,0,0,8,0,0,.4,'#68705a').tube(0,0,-8,0,0,8,.4,'#68705a');p.at(dam.x+38*M,dam.y-18*M,dam.z+47*M);p.ball(0,0,16,34,17,16,'#4b574a').tube(-22,0,18,-78,0,28,2.8,'#4f5a4c').tube(0,0,30,0,0,44,1,'#4a5140');const rotor=S.time*14;p.tube(Math.cos(rotor)*65,Math.sin(rotor)*65,44,-Math.cos(rotor)*65,-Math.sin(rotor)*65,44,1,'#353d30');p.at();for(const w of [{x:OP.strip.x+40*M,y:OP.strip.y+10*M,z:OP.strip.z},...POSTS.map(o=>({x:o.x+12*M,y:o.y,z:o.z}))]){p.at(w.x,w.y,w.z);p.tube(0,0,0,0,0,6*M,.7,'#7c785c');const len=(2+S.wind*3)*M,dx=Math.cos(S.windDir)*len,dy=Math.sin(S.windDir)*len;p.bar(0,0,6*M,dx,dy,6*M+Math.sin(S.time*4)*3,7,2,'#b97b49');}if(Dev.fireCells)for(const k of Fire.burning.slice(0,600)){const x=(k%FN+.5)*FCELL,y=(((k/FN)|0)+.5)*FCELL;p.at(x,y,height(x,y)+2);p.box(0,0,0,FCELL-1,FCELL-1,.5,'#e68e3c');}p.at();}

const Held={canvas:null,g:null,tex:null,mesh:null,base:null,last:-1,locator:null,lt:null};
function makeHeld(){const T=E.THREE,cv=document.createElement('canvas');cv.width=1024;cv.height=768;Held.canvas=cv;Held.g=cv.getContext('2d');const tex=Held.tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;const mat=new T.MeshBasicNodeMaterial({map:tex,side:T.DoubleSide,fog:false});const mesh=Held.mesh=new T.Mesh(new T.PlaneGeometry(4,3),mat);mesh.scale.setScalar(.13);mesh.position.set(.5,-.005,0);mesh.rotation.set(0,-Math.PI/2,0,'YXZ');mesh.rotateX(-.22);world.overlay.scene.add(mesh);mesh.visible=false;
 const base=Held.base=document.createElement('canvas');base.width=base.height=512;const bg=base.getContext('2d'),img=bg.createImageData(512,512),hs=new Int16Array(512*512);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const m=x*4,n=y*4,c=BIOME_COL[biomeAt(m,n)],i=(y*512+x)*4,h=Math.floor(height(m*M,n*M)/M/8);hs[y*512+x]=h;const contour=(x&&hs[y*512+x-1]!==h)||(y&&hs[(y-1)*512+x]!==h);img.data.set([contour?c[0]*.66:lerp(c[0],230,.52),contour?c[1]*.66:lerp(c[1],220,.52),contour?c[2]*.66:lerp(c[2],185,.52),255],i);}bg.putImageData(img,0,0);
 const lc=document.createElement('canvas');lc.width=256;lc.height=128;Held.locator=lc;Held.lt=new T.CanvasTexture(lc);Held.lt.colorSpace=T.SRGBColorSpace;const lm=new T.Mesh(new T.PlaneGeometry(.1,.05),new T.MeshBasicNodeMaterial({map:Held.lt,side:T.DoubleSide,fog:false}));lm.position.set(.54,-.14,-.285);lm.rotation.set(0,-Math.PI/2,0,'YXZ');world.overlay.scene.add(lm);lm.visible=false;Held.lm=lm;
}
function wrapCanvas(g,text,x,y,width,line=35){let words=text.split(' '),row='';for(const w of words){if(g.measureText(row+w).width>width){g.fillText(row,x,y);y+=line;row='';}row+=w+' ';}if(row)g.fillText(row,x,y);return y+line;}
function paintHeld(){const g=Held.g,W=1024,H=768,tool=S.tool;g.fillStyle='#d4c5a0';g.fillRect(0,0,W,H);g.strokeStyle='#8c7f60';g.lineWidth=3;g.strokeRect(19,19,W-38,H-38);g.fillStyle='#514e39';g.font='19px monospace';g.fillText('REPUBLIC OF LACUSTRIA     /     WATER BOARD',46,52);g.font='16px monospace';g.fillText('SURVEY EDITION 1998    —    KEEP DRY',46,H-28);
 if(tool==='map'){const z=S.mapZoom,k=650*z/SIZE,ox=50-(z-1)*hero.x*650/SIZE,oy=80-(z-1)*hero.y*650/SIZE;g.save();g.beginPath();g.rect(40,75,700,630);g.clip();g.drawImage(Held.base,ox,oy,650*z,630*z);g.lineWidth=2;g.strokeStyle='#8b634a';for(const road of roads){g.beginPath();road.forEach(([m,n],i)=>{const x=ox+m*M*k,y=oy+n*M*k;if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.stroke();}g.fillStyle='#3e493b';g.font='bold 15px Georgia';for(const o of SITES){const x=ox+o.x*k,y=oy+o.y*k;g.fillRect(x-2,y-2,5,5);g.fillText(o.name,x+5,y-5);}g.strokeStyle='#5c4e74';g.lineWidth=2;for(const st of STAKES){const x=ox+st.m*M*k,y=oy+st.n*M*k;g.strokeRect(x-4,y-4,8,8);if(st.found){g.beginPath();g.moveTo(x-3,y);g.lineTo(x,y+3);g.lineTo(x+6,y-5);g.stroke();}}
 const p=targetPoint();if(p){g.strokeStyle='#9a3e2c';g.lineWidth=3;g.beginPath();g.ellipse(ox+p[0]*k,oy+p[1]*k,19,15,-.2,0,TAU);g.stroke();}if(S.waypoint){g.fillStyle='#9a3e2c';g.fillText('X',ox+S.waypoint[0]*k,oy+S.waypoint[1]*k);}g.save();g.translate(ox+hero.x*k,oy+hero.y*k);g.rotate(S.yaw);g.fillStyle='#284b5c';g.beginPath();g.moveTo(9,0);g.lineTo(-5,-5);g.lineTo(-2,0);g.lineTo(-5,5);g.fill();g.restore();for(const id of S.tags){const e=raiders.find(e=>e.id===id);if(e){const x=ox+e.a.x*k,y=oy+e.a.y*k;g.strokeStyle='#7d382d';g.beginPath();g.moveTo(x-3,y+4);g.lineTo(x+3,y-4);g.stroke();}}
 g.restore();g.strokeStyle='#9c8a64';g.strokeRect(40,75,700,630);g.fillStyle='#514b38';g.font='bold 25px Georgia';g.fillText('FIELD NOTES',768,108);g.font='19px Georgia';let y=155;const c=CONTRACTS[S.contract];y=wrapCanvas(g,c?.title||'Salvage Rights',766,y,205,26);g.font='20px Georgia';y=wrapCanvas(g,S.stepHint||currentStep()?.text||'Bank your stones at the truck.',766,y+20,205,29);g.font='18px monospace';g.fillText('STONES: '+S.stones,766,465);g.fillText('AMPOULES: '+S.ampoules,766,500);g.fillText('READINGS: '+S.read.length+'/8',766,535);g.fillText('N',823,600);g.beginPath();g.moveTo(830,640);g.lineTo(830,610);g.stroke();g.save();g.translate(830,640);g.rotate(S.windDir);g.strokeStyle='#4c5d50';g.beginPath();g.moveTo(-22,0);g.lineTo(20,0);g.lineTo(12,-6);g.stroke();g.restore();g.font='15px monospace';g.fillText('WIND',870,640);g.strokeStyle='#534e3d';const px=40+S.pencil[0]*700,py=75+S.pencil[1]*630;g.beginPath();g.moveTo(px-8,py);g.lineTo(px+8,py);g.moveTo(px,py-8);g.lineTo(px,py+8);g.stroke();}
 else if(tool==='watch'){g.fillStyle='#3f4939';g.font='bold 38px Georgia';g.fillText('BORROWED TIME',245,123);const cx=510,cy=380;g.strokeStyle='#514b38';g.lineWidth=6;g.beginPath();g.arc(cx,cy,190,0,TAU);g.stroke();for(let i=0;i<24;i++){const a=i/24*TAU-Math.PI/2;g.font='22px monospace';g.fillText(String(i),cx+Math.cos(a)*160-12,cy+Math.sin(a)*160+7);}const a=S.sleepHour/24*TAU-Math.PI/2;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*135,cy+Math.sin(a)*135);g.stroke();g.font='26px Georgia';g.fillText('Sleep until '+String(S.sleepHour).padStart(2,'0')+':00',355,625);g.font='20px monospace';g.fillText('LEFT / RIGHT: TURN    USE: SLEEP',270,675);}
 else if(tool==='card'){const id=S.shopIds[S.shopIndex],w=WEAPONS[id];g.fillStyle='#434937';g.font='24px monospace';g.fillText('MR. SUNDAY\'S CONGREGATION',80,120);g.font='bold 58px Georgia';g.fillText(w.name,80,225);g.font='italic 30px Georgia';wrapCanvas(g,PATTER[id],80,300,820,40);g.font='26px monospace';g.fillText(S.unlocked.includes(id)?'UNLOCKED / FRESH COPY':w.cost+' UNCUT STONES',80,510);g.fillText('YOUR ACCOUNT: '+S.stones,80,560);g.font='22px monospace';g.fillText('LEFT / RIGHT: BROWSE    USE: BUY',80,640);g.fillText('MAP: CLOSE    '+(S.shopIndex+1)+' / '+S.shopIds.length,80,682);}
 else{g.fillStyle='#414734';g.font='25px monospace';g.fillText(S.card?.title||'SURVEY NOTES',70,145);g.beginPath();g.moveTo(70,170);g.lineTo(950,170);g.stroke();g.font='34px Georgia';wrapCanvas(g,S.readText||LETTER,70,245,875,48);g.font='21px monospace';g.fillText(prompt('use','CONTINUE'),70,670);if(S.card)g.fillText((S.card.index+1)+' / '+S.card.pages.length,865,670);}
 Held.tex.needsUpdate=true;
}
function heldStep(dt){S.toolT+=dt;if(['card','watch'].includes(S.tool)){if(game.input.repeat('left',.3,.12)){if(S.tool==='watch')S.sleepHour=(S.sleepHour+23)%24;else S.shopIndex=(S.shopIndex+S.shopIds.length-1)%S.shopIds.length;A.sfx('select');Held.last=-1;}if(game.input.repeat('right',.3,.12)){if(S.tool==='watch')S.sleepHour=(S.sleepHour+1)%24;else S.shopIndex=(S.shopIndex+1)%S.shopIds.length;A.sfx('select');Held.last=-1;}}
 if(S.tool==='map'){const wheel=game.input.pressed('zoomIn')?1:game.input.pressed('zoomOut')?-1:0;if(wheel)S.mapZoom=clamp(S.mapZoom+wheel*.5,1,3);}
 if(S.tool==='locator'){const cases=S.mode==='salvage'?Salvage.cases:CASES.filter(c=>!c.taken).map(c=>({...c,x:c.m*M,y:c.n*M}));const d=Math.min(...cases.filter(c=>!c.taken).map(c=>Math.hypot(c.x-hero.x,c.y-hero.y)/M));S.locatorDist=d;if(d<150){S.beepT=(S.beepT||0)-dt;if(S.beepT<=0){S.beepT=lerp(.15,2,clamp(d/150,0,1));A.sfx('beep');}}}}
function drawHeld(){const show=['map','log','card','watch'].includes(S.tool);Held.mesh.visible=show&&S.alive;Held.lm.visible=(S.tool==='locator'||S.vehicle&&!S.bound)&&S.alive;const t=world.time;if(show&&(t-Held.last>.24||Held.tool!==S.tool)){Held.last=t;Held.tool=S.tool;paintHeld();}if(show){Held.mesh.position.y=-.005-(1-sstep(0,.35,S.toolT))*.45;const p=world.overlay.pen;p.at();p.tube(6.3,-4.3,-2.7,7.5,-4.3,-2.7,.58,'#343d32');p.ball(6.8,-4.3,-2.7,.25,.8,.8,'#c7c0a3').ball(6.52,-4.3,-2.7,.08,.65,.65,'#2d3b30');const ha=S.hour/12*TAU,ma=(S.hour%1)*TAU;p.tube(6.4,-4.3,-2.7,6.4,-4.3+Math.sin(ha)*.36,-2.7+Math.cos(ha)*.36,.06,'#d7d2ac').tube(6.4,-4.3,-2.7,6.4,-4.3+Math.sin(ma)*.55,-2.7+Math.cos(ma)*.55,.05,'#d7d2ac');}
 if(S.tool==='locator'||S.vehicle&&!S.bound){Held.lm.position.set(S.vehicle?.8:.54,S.vehicle?-.22:-.14,S.vehicle?.1:-.285);const g=Held.locator.getContext('2d'),p=S.waypoint||targetPoint(),d=p?Math.hypot(p[0]-hero.x,p[1]-hero.y)/M:0,a=p?Math.atan2(p[1]-hero.y,p[0]-hero.x)-S.yaw:0;g.fillStyle='#adb891';g.fillRect(0,0,256,128);g.fillStyle='#2c4233';g.font='bold 39px monospace';g.fillText(Math.round(d)+'m',70,58);g.font='20px monospace';g.fillText(S.locatorDist<150?'CASE '+Math.round(S.locatorDist)+'m':'BEARING',70,95);for(let i=0;i<8;i++){const an=i/8*TAU;g.fillStyle=Math.abs(Math.atan2(Math.sin(an-a),Math.cos(an-a)))<.5?'#313f25':'#7a875e';g.beginPath();g.arc(35+Math.sin(an)*22,63-Math.cos(an)*22,5,0,TAU);g.fill();}Held.lt.needsUpdate=true;}}

let titleMenu,mercIndex=0,aboutUI=null,lastInputAt=performance.now();
const Dev={open:false,page:0,labels:[],aiLabels:false,fireCells:false,stats:false,reset(){Object.assign(TUNE,TUNE_DEFAULTS);renderDev();},teleport(site){const o=OP[site];exitVehicle();hero.place(o.x,o.y+16*M,o.z+1);camStep(0);},skip(n){beginContract(n);},toggle(key){CHEATS[key]=!CHEATS[key];renderDev();}};
const DEV_PAGES=['Balance / 1','Balance / 2','Cheats / 1','Cheats / 2','World / 1','World / 2'];
function openDev(){if(inSession)return;game.resume();game.shell?.hide();document.exitPointerLock?.();Dev.open=true;Dev.page=0;renderDev();}
function closeDev(){Dev.open=false;document.getElementById('devpanel')?.remove();}
function devButton(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
function renderDev(){if(!Dev.open)return;document.getElementById('devpanel')?.remove();const d=document.createElement('section');d.id='devpanel';d.setAttribute('aria-label','Live developer tools');const k=document.createElement('div');k.className='dev-kicker';k.textContent='FIELD OFFICE / LIVE TOOLS';d.append(k);const h=document.createElement('h2');h.textContent=DEV_PAGES[Dev.page];d.append(h);const nav=document.createElement('nav');nav.append(devButton('‹ Previous',()=>{Dev.page=(Dev.page+5)%6;renderDev();}),devButton('Close',closeDev),devButton('Next ›',()=>{Dev.page=(Dev.page+1)%6;renderDev();}));d.append(nav);
 const range=(key,min,max,step=0.05,target=TUNE)=>{const label=document.createElement('label'),name=document.createElement('span'),value=document.createElement('output'),input=document.createElement('input');name.textContent=key;value.value=Number(target[key]).toFixed(step<1?2:0);input.type='range';input.min=min;input.max=max;input.step=step;input.value=target[key];input.setAttribute('aria-label',key);input.oninput=()=>{target[key]=+input.value;value.value=Number(target[key]).toFixed(step<1?2:0);if(key==='wind')S.wind=TUNE.wind;if(key==='hour')setHour(+input.value);if(key==='floodLevel')flood.position.y=+input.value;};label.append(name,value,input);d.append(label);};
 if(Dev.page<2){const keys=Object.keys(TUNE).slice(Dev.page*7,Dev.page*7+7);for(const key of keys)range(key,key==='dayLength'?20:0,key==='dayLength'?240:key==='carTop'?3:key==='rescueChance'||key==='postRespawn'||key==='wind'?1:5,key==='dayLength'?5:.05);d.append(devButton('Reset balance defaults',()=>Dev.reset()));}
 else if(Dev.page===2){for(const key of ['god','ammo','noclip','noFits','noJams','freezeAI','reveal'])d.append(devButton((CHEATS[key]?'ON  ':'OFF  ')+({god:'God mode',ammo:'Infinite ammo',noclip:'No clip',noFits:'No fits',noJams:'No jams',freezeAI:'Freeze AI',reveal:'Reveal map'}[key]),()=>Dev.toggle(key)));}
 else if(Dev.page===3){d.append(devButton('Unlock every weapon',()=>{S.unlocked=Object.keys(WEAPONS).filter(k=>!['rifle','shotgun','machete'].includes(k));for(const id of S.unlocked)giveGun(id);}),devButton('Refill supplies',refill),devButton('+50 stones',()=>S.stones+=50),devButton('Force lung fit',()=>{S.lung=100;fitStart();}),devButton('Force buddy rescue',()=>{S.buddies[0].met=true;TUNE.rescueChance=1;CHEATS.god=false;hurtPlayer(1000);}),devButton('Force jam',()=>S.inventory[S.cur].jammed=true),devButton((Dev.stats?'ON ':'OFF ')+'Frame and world stats',()=>{Dev.stats=!Dev.stats;renderDev();}));}
 else if(Dev.page===4){const select=document.createElement('select');select.setAttribute('aria-label','Teleport to site');for(const o of SITES){const op=document.createElement('option');op.value=o.id;op.textContent=o.name;select.append(op);}d.append(select,devButton('Teleport to selected site',()=>Dev.teleport(select.value)));const c=document.createElement('select');c.setAttribute('aria-label','Skip to contract');CONTRACTS.forEach((q,i)=>{const op=document.createElement('option');op.value=i;op.textContent=q.id+' / '+q.title;c.append(op);});d.append(c,devButton('Begin selected contract',()=>Dev.skip(+c.value)),devButton('Complete current objective',nextStep));range('hour',0,24,.25,S);d.append(devButton('Start dust storm',()=>{S.storm=150;say('Papa Static','Dust off the north bed. Wrap your face.');}));}
 else{d.append(devButton('Ignite here',()=>Fire.ignite(hero.x+Math.cos(S.yaw)*6*M,hero.y+Math.sin(S.yaw)*6*M,8,true)),devButton('Spawn squad',()=>{for(let i=0;i<4;i++)spawnEnemy(hero.x+(20+i*3)*M,hero.y,'front');}),devButton((Dev.fireCells?'ON ':'OFF ')+'Show fire cells',()=>{Dev.fireCells=!Dev.fireCells;renderDev();}),devButton((Dev.aiLabels?'ON ':'OFF ')+'Show AI states',()=>{Dev.aiLabels=!Dev.aiLabels;renderDev();}));Dev.floodLevel=flood.position.y;range('floodLevel',-30,30,.5,Dev);d.append(devButton('Log player position',()=>console.info('Lacustria position (metres)',Math.round(hero.x/M),Math.round(hero.y/M),Math.round(hero.z/M))),devButton('Turn wind 90°',()=>S.windDir+=Math.PI/2));}
 document.body.append(d);for(const b of d.querySelectorAll('button,input,select'))b.addEventListener('pointerenter',()=>b.focus({preventScroll:true}));d.querySelector('button')?.focus({preventScroll:true});}
function devStep(){if(!Dev.open)return;const els=[...document.querySelectorAll('#devpanel button,#devpanel input,#devpanel select')],idx=els.indexOf(document.activeElement);if(game.input.repeat('down',.3,.12))els[(idx+1)%els.length]?.focus();if(game.input.repeat('up',.3,.12))els[(idx+els.length-1)%els.length]?.focus();const e=document.activeElement;if(e?.tagName==='INPUT'&&e.type==='range'){let dir=game.input.repeat('right',.3,.08)?1:game.input.repeat('left',.3,.08)?-1:0;if(dir){e.value=+e.value+dir*Number(e.step);e.dispatchEvent(new Event('input'));}}if(game.input.pressed('confirm')){e?.click();game.input.consumeAll();}if(game.input.pressed('cancel')){closeDev();game.input.consumeAll();}}
function showAbout(){document.exitPointerLock?.();if(!aboutUI)aboutUI=new E.Shell(game,{theme:{ink:'#e8e1c9',paper:'#1b241a',accent:'#c9a96b',muted:'#b7b697'}});const answers=window.__answers;const sections=answers?[['Source Information',Object.entries(answers.sourceInformation).map(([k,v])=>k+': '+v).join('\n')],['Testing Feedback',answers.testingFeedback.join('\n\n')],['Engine Feedback',answers.engineFeedback.join('\n\n')],['Prompt Feedback',answers.promptFeedback.join('\n\n')]]:[['Source Information','Date: 2026-11-05 05:37:20. Source: Far Cry 2. Plan: PLAN.md. Genre: open-world survival shooter. Perspective: first person. Tech: my-3D2dge v0.88.0, World3D, three.js r182, Rapier 0.19.3. Art: native low-poly pen geometry. Animation: native IK and procedural hands. Audio: original code synths, music, gibberish voices. Online: AI Hub shared-world Salvage Rights. Testing: headless scripted playthroughs and browser checks. Research: supplied plan, engine and hub documentation. Environment: Codex CLI (headless); Linux. Model: OpenAI gpt-6.1-sol, reasoning effort max. Usage: added on import.'],['Testing Feedback','unknown'],['Engine Feedback','unknown'],['Prompt Feedback','unknown']];sections.push(['Libraries & original work','my-3D2dge v0.88.0 — MIT. Three.js r182 — MIT. Rapier 0.19.3 — Apache-2.0. AI Hub Session Protocol v1. All locations, characters, music, sounds, gun and vehicle models are original. Generic props use the engine core library.']);aboutUI.show('help',{title:'ABOUT / CREDITS',sections});setTimeout(()=>{const m=document.querySelector('.esh-mod');if(m)m.scrollTop=0;},30);}
function updateAboutScroll(dt){if(!aboutUI?.screen)return;const m=document.querySelector('.esh-mod');if(!m)return;const a=game.input.padAim;if(a)m.scrollTop+=(a[1]||0)*450*dt;if(game.input.down('down'))m.scrollTop+=350*dt;if(game.input.down('up'))m.scrollTop-=350*dt;}
function titlePose(){S.title=true;world.camera.capture=false;hero.place(1070*M,1200*M,height(1070*M,1200*M));S.yaw=.84;S.pitch=.025;camStep(0);setHour(18.5);if(!Fire.burning.length)for(let i=0;i<10;i++)Fire.ignite((1082+i*3)*M,(1220-i)*M,3,true);}
function startCampaign(merc=0){game.go('play',{merc});}
function titlePick(i){const has=!!game.saves.latest(),items=has?['continue','new','salvage','settings','about']:['new','salvage','settings','about'];const a=items[i];if(a==='continue'){const latest=game.saves.latest();game.go('play',{load:latest});}if(a==='new')game.go('merc');if(a==='salvage')game.go('round');if(a==='settings')game.menu('settings');if(a==='about')showAbout();}
scenes.title={input:KEYS,enter(){closeDev();game.shell?.hide();document.exitPointerLock?.();reset();titlePose();lastInputAt=performance.now();titleMenu=new E.Menu(game,game.saves.latest()?['Continue','New contract','Salvage Rights','Settings','About / Credits']:['New contract','Salvage Rights','Settings','About / Credits'],{x:24,y:132,box:false,bg:'#26331f',border:'#7f8562',color:'#c8c5a7',pick:'#e1bc80',onPick:titlePick});A.music(MUSIC,{fade:1});},update(dt){if(!game.shell?.screen)titleMenu.update(dt);if(performance.now()-lastInputAt>10000&&!game.shell?.screen)Attract.start();world.step(dt);fireStep(dt);audioStep(dt);},draw(r){world.draw(r);r.overlay(g=>{const grad=g.createLinearGradient(0,0,r.W*.84,0);grad.addColorStop(0,'rgba(11,20,12,.94)');grad.addColorStop(.52,'rgba(11,20,12,.71)');grad.addColorStop(1,'rgba(11,20,12,0)');g.fillStyle=grad;g.fillRect(0,0,r.W,r.H);g.fillStyle='#c39b60';g.fillRect(24,21,17,2);E.font.text(g,'LACUSTRIA / 1998',49,18,'#d0be96');E.font.title(g,'DEAD',23,39,{scale:5,colors:['#eee5c8','#d3c49c','#aa9769'],depth:1});E.font.title(g,'SEA SIGH',23,78,{scale:4,colors:['#eee5c8','#d3c49c','#aa9769'],depth:1});E.font.text(g,'EVERYTHING WEARS OUT.',25,115,'#b5b79b');E.font.text(g,'A COUNTRY WITHOUT ITS SEA.',24,r.H-22,'#aaa990');E.font.text(g,'FIRE / DEBT / BORROWED TIME',24,r.H-12,'#777e63');E.font.text(g,'01 / THE DRY SEASON',r.W-15,r.H-14,'#d5c49b',{align:'right',shadow:'#192014'});});titleMenu.draw(r);}};
scenes.merc={input:KEYS,enter(){mercIndex=0;document.exitPointerLock?.();},update(){if(game.input.repeat('left',.3,.15)){mercIndex=(mercIndex+3)%4;A.sfx('select');}if(game.input.repeat('right',.3,.15)){mercIndex=(mercIndex+1)%4;A.sfx('select');}if(game.input.pressed('confirm')||game.input.pressed('use')||game.input.pressed('start')){game.input.consumeAll();startCampaign(mercIndex);}const click=game.input.clicked();if(click){const x=click[0]/game.W;if(x<.22)mercIndex=(mercIndex+3)%4;else if(x>.78)mercIndex=(mercIndex+1)%4;else startCampaign(mercIndex);}if(game.input.pressed('cancel'))game.go('title');},draw(r){world.draw(r);r.overlay(g=>{veil(g,r,0,.7);const w=Math.min(340,r.W-28),x=(r.W-w)/2,y=(r.H-190)/2,m=MERCS[mercIndex];g.fillStyle='#d4c7a7';g.fillRect(x,y,w,190);g.strokeStyle='#a18e68';g.strokeRect(x+7,y+7,w-14,176);E.font.text(g,'MERIDIAN / CONTRACTOR RECORD',x+18,y+15,'#424d39');g.fillStyle='#59644d';g.fillRect(x+18,y+38,70,91);g.fillStyle=m.color;g.beginPath();g.ellipse(x+53,y+74,17,22,0,0,TAU);g.fill();g.fillStyle='#393d2b';g.fillRect(x+34,y+47,39,11);g.fillStyle='#3a3c2c';g.fillRect(x+30,y+99,48,30);g.fillStyle='#272d23';g.fillRect(x+45,y+72,3,2);g.fillRect(x+58,y+72,3,2);E.font.text(g,m.name.toUpperCase(),x+105,y+44,'#39472f',{scale:2});E.font.text(g,m.from,x+105,y+65,'#68735a');E.font.text(g,m.role.toUpperCase(),x+105,y+83,'#5a644c');wrapPixel(g,m.perk,x+105,y+101,w-126,'#46503b',10);E.font.text(g,'<',x+18,y+151,'#49553d',{scale:2});E.font.text(g,'>',x+w-29,y+151,'#49553d',{scale:2});E.font.text(g,'PASSPORT '+(mercIndex+1)+' / 4',r.W/2,y+145,'#6c7258',{align:'center'});E.font.text(g,prompt('confirm','SIGN THE CONTRACT'),r.W/2,y+163,'#8a4c32',{align:'center'});});}};
const NULL_INPUT={move:[0,0],mouse:[0,0],stick2:null,pressed:()=>false,down:()=>false,use(){}};
function playUpdate(dt){I.move=game.input.lastDevice==='gamepad'?[...game.input.padMove]:game.input.move();world.camera.takeMouse(I.mouse);I.stick2=game.input.padAim;if(S.choiceUI){choiceStep();step(dt,NULL_INPUT);}else if(Dev.open){devStep();step(dt,NULL_INPUT);}else{step(dt,I);}heldStep(dt);}
scenes.play={input:KEYS,pausable:true,enter(data={}){closeDev();reset(3,data.merc||0);S.title=false;world.camera.capture=true;S.healHold=-1;if(data.load){game.saves.load(data.load.slot??data.load);if(S.flags.finished)beginContract(CONTRACTS.length-1);}else beginContract(0);},update:playUpdate,draw(r){world.draw(r);r.overlay(g=>hud(g,r));},back(){if(S.tool){S.tool=null;S.card=null;return true;}return false;}};
scenes.round={input:KEYS,pausable:!inSession,enter(){world.camera.capture=true;if(!inSession){Net.started=true;Net.ended=false;Net.finished=false;startSalvage();}else if(Net.info)startSalvage(Net.info);},update(dt){if(Net.ended)return;if(inSession&&(!Net.started||AIHub.time()<0)){world.step(dt);netStep();return;}if(inSession&&Net.info?.server){S.time+=dt;fireStep(dt);aiStep(dt);vehicleStep(dt,NULL_INPUT);salvageStep(dt,NULL_INPUT);world.step(dt);return;}playUpdate(dt);},draw(r){if(Net.info?.server)return;world.draw(r);r.overlay(g=>hud(g,r));}};
const deadMenu=new E.Menu(game,['Reload last save','Return to title'],{y:'center',room:22,onPick:i=>{if(i===0&&game.saves.latest())game.go('play',{load:game.saves.latest()});else game.go('title');}});
scenes.dead={input:KEYS,enter(){document.exitPointerLock?.();deadMenu.i=0;},update(dt){deadMenu.update(dt);},draw(r){world.draw(r);r.overlay(g=>{veil(g,r,0,.85);E.font.text(g,'THE ACCOUNT CLOSES WITHOUT YOU.',r.W/2,r.H/2-44,'#d5c4a1',{align:'center'});});deadMenu.draw(r);}};
function drawChoice(g,r){const c=S.choiceUI,w=Math.min(r.W-30,380),x=(r.W-w)/2,y=r.H/2-35;veil(g,r,0,.45);g.fillStyle='#202b1c';g.fillRect(x,y-20,w,c.options.length*22+42);E.font.text(g,c.title,x+10,y-10,'#d3b278');c.options.forEach((o,i)=>{if((S.choiceIndex||0)===i){g.fillStyle='#4c5438';g.fillRect(x+6,y+9+i*22,w-12,20);}wrapPixel(g,o[0],x+13,y+15+i*22,w-26,'#e0d4b4',10);});}
function choiceStep(){const c=S.choiceUI;if(c.buddy&&(c.buddy.bleed<5||c.buddy.entity&&Fire.near(c.buddy.entity.a.x,c.buddy.entity.a.y,4))&&c.options.length>1){c.options=c.options.slice(-1);S.choiceIndex=0;}S.choiceIndex=S.choiceIndex||0;if(game.input.repeat('down',.3,.15))S.choiceIndex=(S.choiceIndex+1)%c.options.length;if(game.input.repeat('up',.3,.15))S.choiceIndex=(S.choiceIndex+c.options.length-1)%c.options.length;const pos=game.input.pointer();if(pos){const W=game.W,H=game.H,w=Math.min(W-30,380),x=(W-w)/2,y=H/2-35;if(pos[0]>=x+6&&pos[0]<=x+w-6){const row=Math.floor((pos[1]-y-9)/22);if(row>=0&&row<c.options.length)S.choiceIndex=row;}if(game.input.clicked()&&pos[0]>=x&&pos[0]<=x+w&&pos[1]>=y+9&&pos[1]<y+9+c.options.length*22){const i=S.choiceIndex;S.choiceUI=null;S.choiceIndex=0;c.options[i][1]();game.input.consumeAll();return;}}if(game.input.pressed('confirm')||game.input.pressed('use')){const i=S.choiceIndex;S.choiceUI=null;S.choiceIndex=0;game.input.consumeAll();c.options[i][1]();}}
function inputActivity(e){lastInputAt=performance.now();if(Attract.active){Attract.stop();if(e?.preventDefault)e.preventDefault();}}
for(const ev of ['keydown','pointermove','pointerdown','touchstart'])addEventListener(ev,inputActivity,{passive:ev==='touchstart'});
game.hook('input',()=>{updateAboutScroll(1/120);if(game.input.lastDevice==='gamepad'){const pads=navigator.getGamepads?.()||[];if([...pads].some(p=>p&&(p.buttons.some(b=>b.pressed)||p.axes.some(a=>Math.abs(a)>.2))))inputActivity();}});

setInterval(()=>{if(built&&!inSession&&S?.title&&game.sceneName==='title'&&!Attract.active&&performance.now()-lastInputAt>10000){game.shell?.hide();game.resume();Attract.start();}},250);
addEventListener('wheel',inputActivity,{passive:true});

const MUSIC={bpm:62,steps:3,tracks:[{name:'strings',wave:'triangle',vol:.25,notes:'D3 - . A3 - . C4 - . D4 - . | F4 - D4 - C4 - A3 - . . . . . . . . . . . . . . . . . . . . .'},{name:'drone',wave:'sine',vol:.1,notes:'D2 - - - - - - - - - - - A2 - - - - - - - - - - -'},{name:'drums',wave:'drums',vol:.16,on:false,notes:'k . . t . . k . . . t .'}]};
const AudioFX={loops:[],pluck:null,ready:false,rng:E.rng(0x4d555349)};
function defineSounds(){const sounds={jam:{wave:'noise',freq:180,to:65,dur:.07,vol:.25},rack:{wave:'noise',freq:1300,to:180,dur:.18,vol:.3},reload:{wave:'noise',freq:600,to:140,dur:.14,vol:.25},paper:{wave:'noise',freq:2400,to:1200,dur:.22,vol:.12},beep:{wave:'sine',freq:980,dur:.07,vol:.14},glass:{wave:'noise',freq:2900,to:380,dur:.25,vol:.4},surgery:{wave:'noise',freq:450,to:130,dur:.4,vol:.18},breath:{wave:'noise',freq:320,to:120,dur:.7,vol:.2},engine:{wave:'saw',freq:45,to:80,dur:.3,vol:.15},break:{wave:'noise',freq:500,to:40,dur:.35,vol:.6},distant:{wave:'noise',freq:180,to:45,dur:.15,vol:.2}};for(let i=0;i<4;i++)sounds['cough'+i]={wave:'noise',freq:120+i*45,to:50,dur:.28+i*.04,vol:.3};sounds.cough=sounds.cough0;for(const w of Object.values(WEAPONS))sounds['gun_'+w.id]=[{wave:'noise',freq:w.slot==='side'?1600:1200,to:75,dur:w.rate<2?.2:.12,vol:.5},{wave:'sine',freq:w.id==='bishop'?65:130,to:35,dur:.16,vol:.55}];for(const[k,v]of Object.entries(sounds))A.define(k,v);A.music(MUSIC,{fade:1});}
function voiceSound(ctx,dest,ch,index=0,speaker=''){const t=ctx.currentTime,base=speaker.includes('Tarn')?104:speaker.includes('Sister')?180:speaker.includes('Sunday')?230:145,osc=ctx.createOscillator(),f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter(),env=ctx.createGain();osc.type='sawtooth';osc.frequency.setValueAtTime(base*(1+(ch.charCodeAt(0)%11)*.025),t);osc.frequency.linearRampToValueAtTime(base*(.92+(index%4)*.06),t+.075);f1.type=f2.type='bandpass';f1.frequency.value=550+(ch.charCodeAt(0)%5)*170;f1.Q.value=2;f2.frequency.value=1400+(index%3)*280;f2.Q.value=.7;env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(.055,t+.008);env.gain.exponentialRampToValueAtTime(.001,t+.08);osc.connect(f1).connect(f2).connect(env).connect(dest);osc.start(t);osc.stop(t+.09);}
function babble(text,speaker){if(A.muted)return;const dest=A.bus('voice'),ctx=A.ctx;if(!dest||!ctx)return;const letters=text.replace(/[^a-z]/gi,'').slice(0,65);for(let i=0;i<letters.length;i++)setTimeout(()=>{if(A.ctx?.state==='running'&&!Net.ended)voiceSound(ctx,dest,letters[i],i,speaker);},i*67);}
function say(speaker,text,seconds=0){if(!S)return;S.subtitle={speaker,text,t:seconds||Math.max(5,Math.min(13,text.length*.047))};babble(text,speaker);}
function audioLoops(){if(AudioFX.ready||!A.ready)return;const ctx=A.ctx,dest=A.bus('sfx'),noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=noise.getChannelData(0);let r=E.rng(99);for(let i=0;i<d.length;i++)d[i]=r()*2-1;for(const kind of ['wind','fire','engine','insects']){const src=kind==='engine'?ctx.createOscillator():ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),pan=ctx.createStereoPanner();if(kind==='engine'){src.type='sawtooth';src.frequency.value=40;}else{src.buffer=noise;src.loop=true;}filter.type='bandpass';filter.frequency.value=kind==='wind'?220:kind==='fire'?450:kind==='insects'?3500:90;filter.Q.value=kind==='insects'?20:.7;gain.gain.value=0;src.connect(filter).connect(gain).connect(pan).connect(dest);src.start();AudioFX.loops.push({kind,src,filter,gain,pan});}
 const len=Math.floor(ctx.sampleRate/146.83),pl=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),a=pl.getChannelData(0);for(let i=0;i<len;i++)a[i]=r()*2-1;for(let i=len;i<a.length;i++)a[i]=(a[i-len]+a[i-len+1])*.497;AudioFX.pluck=pl;AudioFX.ready=true;}
function audioStep(dt){if(S.subtitle){S.subtitle.t-=dt;if(S.subtitle.t<=0)S.subtitle=null;}audioLoops();if(!A.ctx||A.muted)return;for(const l of AudioFX.loops){let gain=0;if(l.kind==='wind')gain=.025*S.wind*(S.storm>0?3:1);if(l.kind==='fire')gain=Fire.near(hero.x,hero.y,30)?.11:Fire.near(hero.x,hero.y,100)?.035:0;if(l.kind==='engine'){gain=S.vehicle?.08:0;l.src.frequency.setTargetAtTime(32+Math.abs(S.vehicle?.v.speed||0)*.24,A.ctx.currentTime,.08);}if(l.kind==='insects')gain=(S.hour>18||S.hour<6)?.006:0;l.gain.gain.setTargetAtTime(gain,A.ctx.currentTime,.2);}A.layer('drums',raiders.some(e=>e.alive&&e.state==='combat')?.8:0,2);
 if(S.time-(S.lastPluck||0)>6&&AudioFX.pluck){S.lastPluck=S.time;const src=A.ctx.createBufferSource(),g=A.ctx.createGain();src.buffer=AudioFX.pluck;src.playbackRate.value=[1,1.5,1.78,2][Math.floor(AudioFX.rng()*4)];g.gain.value=.22;src.connect(g).connect(A.bus('music'));src.start();}
}

const Net={info:null,started:false,ended:false,lastSend:0,lastEvents:0,players:new Map(),shots:[],requests:[],lit:[],events:[],snapshots:new Map(),vehicleSnapshots:new Map(),lastVehicles:0,ready:false,finished:false};
const Salvage={cases:[],rivals:[],start:0,bankTime:0,ignited:false,results:null,elapsed:0};
function startSalvage(info=null){reset(info?.seed||77,info?.me%4||0);S.mode='salvage';S.papers=null;S.ampoules=2;S.inventory={};S.slots=[null,null,null];giveGun('verger',.65);S.tool='locator';setHour(18.7);for(const e of raiders)world.remove(e.a);raiders.length=0;people.length=0;for(const v of vehicles)world.remove(v.v);vehicles.length=0;const bank=makeVehicle('truck',OP.salt.x+12*M,OP.salt.y+3*M,{bank:true});makeVehicle('technical',1025*M,1250*M);makeVehicle('jeep',950*M,1220*M);makeVehicle('airboat',1100*M,1400*M);S.bankTruck=bank;Salvage.start=S.time;Salvage.elapsed=0;Salvage.bankTime=0;Salvage.ignited=false;Salvage.results=null;Salvage.cases=[];Salvage.rivals=[];Net.players.clear();const rng=info?AIHub.rng('salvage-cases'):E.rng(71);for(let i=0;i<12;i++){const a=rng()*TAU,d=60+rng()*230;Salvage.cases.push({id:i,x:(980+Math.cos(a)*d)*M,y:(1320+Math.sin(a)*d)*M,value:2+i%4,taken:false});}
 const players=info?info.players:[{id:0,name:MERCS[S.merc].name,color:'#d5aa60'},...S.buddies.map((b,i)=>({id:i+1,name:b.name,color:['#b45c42','#789576','#7d8aa3'][i]}))];for(const p of players){const a=p.id/4*TAU,x=(980+Math.cos(a)*220)*M,y=(1320+Math.sin(a)*220)*M,q={...p,x,y,z:height(x,y),hp:100,carried:0,banked:0,jams:0,lit:0,alive:true,respawn:0,yaw:0,actor:null,b:body('smuggler')};q.b.look={...LOOKS.smuggler,accent:p.color};Net.players.set(p.id,q);if(p.id===(info?.me??0)){hero.place(x,y,q.z+1);S.yaw=Math.atan2(1320*M-y,980*M-x);}else if(!info){const e=spawnEnemy(x,y,'front',{friendly:true,salvager:true,look:'smuggler'});q.actor=e.a;q.entity=e;e.b.look=q.b.look;Salvage.rivals.push(q);}else{q.actor=world.hero({x,y,z:q.z,r:5,half:9,visible:false,shadow:false});q.actor.data.remote=p.id;}}
 if(!info||info.isHost){for(let i=0;i<7;i++)spawnEnemy((850+i%3*100)*M,(1290+Math.floor(i/3)*55)*M,'front');}
 if(info?.server){world.remove(hero);hero={x:980*M,y:1320*M,z:-14*M,vx:0,vy:0,vz:0,place(x,y,z){this.x=x;this.y=y;this.z=z;},setSolid(){},jump(){},grounded:true};S.alive=false;}
 S.near=getNear();camStep(0);}
function salvageNear(){if(S.vehicle)return{kind:'exit',text:'Exit vehicle'};const bank=vehicles.find(v=>v.bank);if(bank&&Math.hypot(hero.x-bank.v.x,hero.y-bank.v.y)<7*M)return{kind:'bank',text:'Hold to bank diamonds'};for(const c of Salvage.cases)if(!c.taken&&Math.hypot(hero.x-c.x,hero.y-c.y)<4*M)return{kind:'salvageCase',case:c,text:'Take '+c.value+' diamonds'};for(const v of vehicles)if(v.hp>0&&Math.hypot(hero.x-v.v.x,hero.y-v.v.y)<4*M)return{kind:'vehicle',vehicle:v,text:'Enter '+v.type};for(const l of loot)if(l.cond>0&&Math.hypot(hero.x-l.x,hero.y-l.y)<4*M)return{kind:'gun',gun:l,text:'Take '+WEAPONS[l.weapon].name};return null;}
function salvageUse(n){if(n.kind==='salvageCase'){const req={t:'take',id:n.case.id};if(inSession&&!AIHub.isHost)Net.requests.push(req);else hostUse(inSession?AIHub.me:0,req);return true;}return n.kind==='bank';}
function hostUse(id,req){const p=Net.players.get(id);if(!p)return;if(req.t==='throw'){if(Math.hypot(p.x-req.x,p.y-req.y)<65*M){if(req.kind==='bottle')Fire.ignite(req.x,req.y,6,true);else if(req.kind==='frag')explodeAt(req.x,req.y,req.z,7,110);}return;}if(req.t==='melee'){castShot('machete',[p.x,p.y,p.z+18],[Math.cos(p.yaw),Math.sin(p.yaw),0],p.actor||hero);return;}if(req.t==='respawn'){p.hp=100;if(p.actor)p.actor.setSolid(true);return;}if(req.t==='take'){const c=Salvage.cases.find(c=>c.id===req.id);if(c&&!c.taken&&Math.hypot(p.x-c.x,p.y-c.y)<7*M){c.taken=true;p.carried+=c.value;if(id===(inSession?AIHub.me:0))S.carried=p.carried;Net.events.push({t:'case',id:c.id,taken:true,p:id,carried:p.carried});A.sfx('coin');}}if(req.t==='bank'){const v=vehicles.find(v=>v.bank);if(v&&Math.hypot(p.x-v.v.x,p.y-v.v.y)<10*M){p.banked+=p.carried;p.carried=0;if(id===(inSession?AIHub.me:0)){S.banked=p.banked;S.carried=0;}Net.events.push({t:'bank',id,banked:p.banked});}}}
function salvageDeath(){const p=Net.players.get(inSession?AIHub.me:0);if(p)dropStones(p);S.alive=false;S.respawnAt=Salvage.elapsed+8;hero.setSolid(false);S.tool=null;}
function dropStones(p){if(p.carried){const c={id:1000+Salvage.cases.length,x:p.x,y:p.y,value:p.carried,taken:false};Salvage.cases.push(c);Net.events.push({t:'drop',c});p.carried=0;}}
function salvageStep(dt,I){if(S.mode!=='salvage'||Net.ended||Salvage.results)return;Salvage.elapsed=inSession?Math.max(0,AIHub.time()/1000):S.time-Salvage.start;if(inSession&&!Net.started)return;const me=inSession?AIHub.me:0,p=Net.players.get(me);if(p){p.x=hero.x;p.y=hero.y;p.z=hero.z;p.yaw=S.yaw;p.hp=S.hp;}
 if(!S.alive&&S.respawnAt&&Salvage.elapsed>=S.respawnAt){S.alive=true;S.hp=100;S.carried=0;S.respawnAt=0;if(inSession&&!AIHub.isHost)Net.requests.push({t:'respawn'});else if(p)p.hp=100;hero.setSolid(true);hero.place(OP.salt.x,OP.salt.y+20*M,OP.salt.z);giveGun('verger',.6);}
 if(S.near?.kind==='bank'&&I.down('use')&&S.carried>0){Salvage.bankTime+=dt;if(Salvage.bankTime>=3){const req={t:'bank'};if(inSession&&!AIHub.isHost)Net.requests.push(req);else hostUse(me,req);Salvage.bankTime=0;A.sfx('coin');}}else Salvage.bankTime=0;
 if((!inSession||AIHub.isHost)&&Salvage.elapsed>30&&!Salvage.ignited){Salvage.ignited=true;S.windDir=.2;for(const [x,y]of [[660,1280],[690,1430],[700,1540]])Fire.ignite(x*M,y*M,12,true);TUNE.fireSpread=1.6;say('Papa Static','The west edge is burning. The salt does not burn. Neither does the truck.');}
 if(!inSession){for(const q of Salvage.rivals){if(!q.entity.alive){q.respawn+=dt;if(q.respawn>8){dropStones(q);q.entity.alive=true;q.entity.hp=100;q.actor.place(OP.salt.x+20*M,OP.salt.y,OP.salt.z);q.respawn=0;}continue;}const bank=vehicles.find(v=>v.bank);let goal=q.carried>3?{x:bank.v.x,y:bank.v.y}:Salvage.cases.filter(c=>!c.taken).sort((a,b)=>Math.hypot(a.x-q.x,a.y-q.y)-Math.hypot(b.x-q.x,b.y-q.y))[0];if(!goal)goal={x:bank.v.x,y:bank.v.y};const dx=goal.x-q.actor.x,dy=goal.y-q.actor.y,l=Math.hypot(dx,dy)||1;q.actor.vx=dx/l*90;q.actor.vy=dy/l*90;q.entity.yaw=Math.atan2(dy,dx);q.x=q.actor.x;q.y=q.actor.y;if(l<6*M){if(goal.id!==undefined)hostUse(q.id,{t:'take',id:goal.id});else{q.bankHold=(q.bankHold||0)+dt;if(q.bankHold>3){hostUse(q.id,{t:'bank'});q.bankHold=0;}}}if(Fire.near(q.x,q.y,12)){q.actor.vx=-Math.sin(S.windDir)*100;q.actor.vy=Math.cos(S.windDir)*100;}if(Math.hypot(q.x-hero.x,q.y-hero.y)<18*M&&rnd()<dt*.3)hurtPlayer(8);}}
 if(!inSession&&Salvage.elapsed>=360)hostFinish();if(inSession)netStep();
}
function queueShot(w,o,d){Net.shots.push({w,o:o.map(Math.round),d:d.map(v=>Math.round(v*10000))});}
function netDamage(id,d){const p=Net.players.get(id);if(!p)return;p.hp=Math.max(0,p.hp-d);Net.events.push({t:'damage',id,hp:p.hp});if(p.hp<=0){dropStones(p);if(p.actor)p.actor.setSolid(false);}}
function netStep(){if(!Net.info||Net.ended)return;const now=performance.now(),isHost=Net.info.isHost;if(now-Net.lastSend>=100){Net.lastSend=now;if(isHost){const P=[...Net.players.values()].map(p=>[p.id,Math.round(p.x),Math.round(p.y),Math.round(p.z),Math.round(p.yaw*1000),Math.round(p.hp),p.carried,p.banked]);const E=raiders.filter(e=>e.alive).slice(0,10).map(e=>[e.id,Math.round(e.a.x),Math.round(e.a.y),Math.round(e.a.z),Math.round(e.yaw*1000),Math.round(e.hp),e.state==='combat'?1:0]);AIHub.send({t:'s',at:AIHub.time(),P,E},{reliable:false});}else AIHub.send({t:'i',x:Math.round(hero.x),y:Math.round(hero.y),z:Math.round(hero.z),yw:Math.round(S.yaw*1000),hp:Math.round(S.hp),a:S.vehicle?.id||null,v:S.vehicle?[Math.round(S.vehicle.v.x),Math.round(S.vehicle.v.y),Math.round(S.vehicle.v.z),Math.round(S.vehicle.v.angle*1000),Math.round(S.vehicle.v.speed),Math.round(S.vehicle.hp)]:null},{to:Net.info.host,reliable:false});}
 if(isHost&&now-Net.lastVehicles>=350){Net.lastVehicles=now;AIHub.send({t:'v',V:vehicles.map((q,i)=>[i,Math.round(q.v.x),Math.round(q.v.y),Math.round(q.v.z),Math.round(q.v.angle*1000),Math.round(q.v.speed),Math.round(q.hp),q.owner??-1])},{reliable:false});}
 if(now-Net.lastEvents>=300){Net.lastEvents=now;if(isHost){const L=Net.events.splice(0,25),lit=Net.lit.splice(0,350);if(L.length||lit.length)AIHub.send({t:'e',L,lit},{reliable:true});}else{const F=Net.shots.splice(0,12),U=Net.requests.splice(0,8);if(F.length||U.length)AIHub.send({t:'a',F,U},{to:Net.info.host,reliable:true});}}
}
function receiveNet(data,from){if(Net.ended||!data||!Net.info)return;if(Net.info.isHost){const p=Net.players.get(from);if(!p)return;if(data.t==='i'){p.x=data.x;p.y=data.y;p.z=data.z;p.yaw=data.yw/1000;p.hp=Math.min(p.hp,data.hp);for(const q of vehicles)if(q.owner===from&&q.id!==data.a)q.owner=null;p.vehicle=data.a;if(data.a&&data.v){const q=vehicles.find(q=>q.id===data.a);if(q&&(q.owner===undefined||q.owner===null||q.owner===from)){q.owner=from;q.v.place(data.v[0],data.v[1],data.v[2]);q.v.angle=data.v[3]/1000;q.v.speed=data.v[4];q.hp=Math.min(q.hp,data.v[5]);q.v.vx=q.v.vy=0;}}if(p.actor)p.actor.place(p.x,p.y,p.z);}else if(data.t==='a'){for(const f of data.F||[]){if(WEAPONS[f.w])castShot(f.w,f.o,f.d.map(v=>v/10000),p.actor);}for(const u of data.U||[])hostUse(from,u);}}else if(from===Net.info.host){if(data.t==='v'){for(const [i,x,y,z,a,speed,hp,owner]of data.V){const q=vehicles[i];if(!q)continue;q.hp=hp;q.owner=owner<0?null:owner;if(S.vehicle!==q)Net.vehicleSnapshots.set(i,{x,y,z,a:a/1000,speed});}}else if(data.t==='s'){for(const [id,x,y,z,yw,hp,carried,banked]of data.P){const p=Net.players.get(id);if(!p)continue;p.carried=carried;p.banked=banked;p.hp=hp;if(id===AIHub.me){S.carried=carried;S.banked=banked;continue;}Net.snapshots.set(id,{x,y,z,yaw:yw/1000,at:data.at});}const present=new Set(data.E.map(e=>e[0]));for(const e of raiders)if(e.netID&&!present.has(e.netID)){e.alive=false;e.a.setSolid(false);if(!e.b.dead)e.b.dead={t:1,dir:0,g:e.a.z};}for(const [id,x,y,z,yw,hp,combat]of data.E){let e=raiders.find(e=>e.netID===id);if(!e){e=spawnEnemy(x,y,'front',{netID:id});}e.a.place(x,y,z);e.yaw=yw/1000;e.hp=hp;e.state=combat?'combat':'idle';}}else if(data.t==='e'){for(const k of data.lit||[])if(!Fire.state[k]){Fire.state[k]=1;Fire.t[k]=9;burnData[k]=170;Fire.burning.push(k);}for(const e of data.L||[]){if(e.t==='case'){const c=Salvage.cases.find(c=>c.id===e.id);if(c)c.taken=e.taken;}if(e.t==='drop')Salvage.cases.push(e.c);if(e.t==='damage'&&e.id===AIHub.me){S.hp=e.hp;if(e.hp<=0)salvageDeath();}if(e.t==='bank'){const p=Net.players.get(e.id);if(p){p.banked=e.banked;p.carried=0;}}}Fire.tex.needsUpdate=true;}}}
function interpolatePlayers(dt){for(const [i,s]of Net.vehicleSnapshots){const q=vehicles[i];if(!q||S.vehicle===q)continue;const k=Math.min(1,dt*10);q.v.place(lerp(q.v.x,s.x,k),lerp(q.v.y,s.y,k),lerp(q.v.z,s.z,k));q.v.angle=E.approachAng(q.v.angle,s.a,dt*8);q.v.speed=s.speed;}for(const [id,snap]of Net.snapshots){const p=Net.players.get(id);if(!p?.actor)continue;const a=p.actor,k=Math.min(1,dt*10);a.place(lerp(a.x,snap.x,k),lerp(a.y,snap.y,k),lerp(a.z,snap.z,k));p.x=a.x;p.y=a.y;p.z=a.z;p.yaw=snap.yaw;}}
function drawRemotePlayers(){if(!inSession)return;for(const p of Net.players.values()){if(p.id===AIHub.me||!p.actor)continue;if(p.hp<=0){if(!p.b.dead)p.b.dead={t:0,dir:p.yaw,g:p.actor.z};p.b.dead.t+=.016;}else p.b.dead=null;Object.assign(p.b,{x:p.actor.x,y:p.actor.y,z:p.actor.z,yaw:p.yaw,aimYaw:p.yaw,move:'stand',weapon:'verger',low:false,gun:{flash:0}});pose(world,p.b,.016);drawSoldier(world.pen,p.b);}}
function hostFinish(){if(Net.finished)return;Net.finished=true;const ps=[...Net.players.values()].sort((a,b)=>b.banked-a.banked),standings=[];for(const p of ps){const prev=standings[standings.length-1];if(prev&&Net.players.get(prev[0]).banked===p.banked)prev.push(p.id);else standings.push([p.id]);}const scores=Object.fromEntries(ps.map(p=>[p.id,p.banked])),stats=Object.fromEntries(ps.map(p=>[p.id,{banked:p.banked,carried:p.carried}])),awards=ps.length?[{id:ps[0].id,title:'Harbourmaster',detail:ps[0].banked+' stones banked'}]:[];if(inSession){if(Net.info?.isHost)AIHub.finish({standings,scores,stats,awards});}else{Salvage.results={standings,scores,stats};S.choiceUI={title:'SALVAGE RIGHTS / ACCOUNT CLOSED',options:ps.map(p=>[p.name+' — '+p.banked+' banked',()=>game.go('title')])};}}
if(inSession){window.__hub.then(info=>{Net.info=info;if(!info){if(built)game.go('title');return;}if(built){startSalvage(info);tellReady();}});AIHub.on('start',()=>{Net.started=true;});AIHub.on('message',receiveNet);AIHub.on('leave',({id})=>{const p=Net.players.get(id);if(p){if(AIHub.isHost)dropStones(p);if(p.actor)world.remove(p.actor);Net.players.delete(id);}});AIHub.on('time-up',()=>{if(Net.info?.isHost)hostFinish();});AIHub.on('end',()=>{Net.ended=true;game.stop();A.mute(true);});}
function tellReady(){if(built&&Net.info&&!Net.ready){Net.ready=true;AIHub.ready();}}

const Bot={tick(seconds,input=NULL_INPUT){const n=Math.ceil(seconds*120);for(let i=0;i<n;i++)step(1/120,input);},press(action){const pressed=new Set([action]);step(1/120,{move:[0,0],mouse:[0,0],stick2:null,pressed:a=>pressed.has(a),down:a=>pressed.has(a),use:a=>pressed.delete(a)});},teleport(x,y,z){exitVehicle();hero.place(x,y,z??height(x,y)+1);hero.vx=hero.vy=hero.vz=0;camStep(0);S.near=getNear();},aim(x,y,z){const dx=x-hero.x,dy=y-hero.y,dz=z-hero.z-S.eye;S.yaw=Math.atan2(dy,dx);S.pitch=Math.atan2(dz,Math.hypot(dx,dy));camStep(0);},use(){S.near=getNear();this.press('use');},cards(){let n=0;while(S.card&&n++<10)this.use();if(S.altPending){S.altPending=false;S.alt=false;}},shootAt(e){S.tool=null;S.act=null;S.fireCd=0;if(!S.inventory.parson)giveGun('parson');equip('parson');this.teleport(e.a.x-6*M,e.a.y,e.a.z+1);for(let k=0;k<20&&e.alive;k++){if(S.inventory[S.cur].jammed){this.press('reload');this.tick(1.4);}this.aim(e.a.x,e.a.y,e.a.z+24);S.fireCd=0;this.press('fire');this.tick(.12);}},playthrough(ending='contract'){const problems=[],old={...CHEATS};Object.assign(CHEATS,{god:true,ammo:true,noJams:true,noFits:true,freezeAI:true});reset(3);beginContract(0);S.title=false;let safety=0;while(S.contract<CONTRACTS.length-1&&safety++<110){this.cards();const st=currentStep();if(!st)break;const key=CONTRACTS[S.contract].id+':'+S.step;if(S.prepared!==key)prepareStep(st);const p=targetPoint(st);if(st.kind==='script')this.tick(st.seconds+.1);
 else if(st.kind==='talk'||st.kind==='deliver'){this.teleport(p[0]+M,p[1]+M,p[2]||height(p[0],p[1]));this.use();this.cards();}
 else if(st.kind==='goto'){this.teleport(p[0],p[1],p[2]+1);this.tick(.1);}
 else if(st.kind==='read'&&st.count){while(S.read.length<st.count){const stake=STAKES.find(st=>!st.found);this.teleport(stake.m*M,stake.n*M);this.use();this.cards();this.tick(.1);}}
 else if(st.kind==='read'||st.kind==='take'){this.teleport(p[0],p[1],p[2]+1);this.use();this.cards();}
 else if(st.kind==='sleep'){this.teleport(OP[st.site].x,OP[st.site].y+6*M,OP[st.site].z+1);this.use();this.use();}
 else if(st.kind==='drive'){const q=vehicles.find(q=>st.boat?q.type==='airboat':q.clinic);q.v.place(1035*M,1130*M,height(1035*M,1130*M)+4);q.v.angle=0;q.v.vx=q.v.vy=0;this.teleport(q.v.x,q.v.y+2*M,q.v.z);this.use();const drive={move:[0,-1],mouse:[0,0],stick2:null,pressed:()=>false,down:()=>false,use(){}};this.tick(12,drive);exitVehicle();}
 else if(st.kind==='kill'){for(const e of raiders.filter(e=>e.alive&&(st.target==='ambushers'?e.target?.startsWith('ambushers'):st.target==='betrayers'?e.betrayer:e.target===st.target)))this.shootAt(e);this.tick(.2);}
 else if(st.kind==='destroy'){giveGun('bishop');for(const q of S.convoy){for(let k=0;k<6&&q.hp>0;k++){this.teleport(q.v.x-20*M,q.v.y,q.v.z);S.cur='bishop';S.act=null;S.fireCd=0;this.aim(q.v.x,q.v.y,q.v.z+8);this.press('fire');this.tick(3.4);}}this.tick(.1);}
 else if(st.kind==='ignite'){this.teleport(p[0],p[1]);giveGun('gardener');S.yaw=0;S.pitch=-.18;const fire={...NULL_INPUT,down:a=>a==='fire',pressed:()=>false};this.tick(1.2,fire);this.tick(.1);}
 else if(st.kind==='hold'){giveGun('gardener');for(let i=0;i<8;i++){this.teleport((930+i*13)*M,1260*M);S.yaw=0;S.pitch=-.15;S.act=null;S.fireCd=0;this.press('fire');}this.tick(92);}
 else{problems.push('Unhandled '+key);break;}
 if(CONTRACTS[S.contract]?.id+':'+S.step===key&&!S.card)problems.push('Did not advance '+key+' ('+st.kind+')');if(problems.length)break;
 }
 if(!problems.length&&S.contract===CONTRACTS.length-1){let st=currentStep();if(st.kind==='goto'){const p=targetPoint();this.teleport(p[0],p[1],p[2]+1);this.tick(.1);}st=currentStep();if(st?.kind==='talk'){const n=people.find(n=>n.id==='tarn');this.teleport(n.x,n.y+M,n.z+1);this.use();this.cards();}this.tick(.1);if(S.finalChoice){this.use();}if(S.choiceUI){S.choiceIndex=['contract','arithmetic','sounding'].indexOf(ending);const choice=S.choiceUI.options[S.choiceIndex][1];S.choiceUI=null;choice();}if(ending==='sounding')this.tick(360.2);if(ending!=='contract'){const wheel={...NULL_INPUT,down:a=>a==='fire'||a==='aim'};this.tick(3.2,wheel);}if(S.ending!==ending)problems.push('Ending not reached: '+ending);}
 if(safety>=110)problems.push('Playthrough safety limit');Object.assign(CHEATS,old);return {pass:!problems.length,problems,completed:[...S.completed],ending:S.ending};}};
const Attract={active:false,index:0,seen:new Set(),at:0,oldCheats:null,names:['THE CAUSEWAY','PAPERS, PLEASE','THE CLICK','FIRE SEASON','A COUNTRY ON PAPER','A DEBT IN THE DIRT','THROUGH THE REEDS','FORTY-ONE METRES'],start(){if(this.active||inSession)return;game.shell?.hide();game.resume();this.active=true;this.index=-1;this.seen.clear();this.oldCheats={...CHEATS};this.oldTune={...TUNE};Object.assign(CHEATS,{god:true,ammo:true,noFits:true,noJams:true});game.go('attract');},stop(){if(!this.active)return;this.active=false;Object.assign(CHEATS,this.oldCheats);Object.assign(TUNE,this.oldTune);game.input.consumeAll();game.go('title');lastInputAt=performance.now();},next(){this.index=(this.index+1)%8;this.seen.add(this.index);this.at=performance.now();reset(29);S.attract=true;S.title=false;S.papers='clinic';S.tool=null;S.subtitle=null;S.hour=18;const pos=[[1050,1130],[1240,820],[766,1430],[760,1450],[1170,1320],[1010,1150],[1120,1450],[1050,675]][this.index];Bot.teleport(pos[0]*M,pos[1]*M);S.yaw=-.7;S.pitch=.03;setHour(this.index===6?22:this.index===7?6.5:18.4);
 if(this.index===0){const q=vehicles.find(v=>v.type==='jeep'&&!v.clinic);q.v.place(hero.x,hero.y,hero.z+1);q.v.angle=0;enterVehicle(q);say('Papa Static',RADIO[0]);}
 if(this.index===1){S.tool='monocular';spawnEnemy(hero.x+40*M,hero.y-15*M,'authority');S.yaw=-.36;}
 if(this.index===2){giveGun('parson',.3);spawnEnemy(hero.x+30*M,hero.y,'front');S.yaw=0;S.papers=null;}
 if(this.index===3){giveGun('gardener',.6);S.yaw=-1.2;for(let i=0;i<7;i++){Fire.ignite(hero.x+(8+i*4)*M,hero.y-15*M,5,true);spawnEnemy(hero.x+(15+i*5)*M,hero.y-30*M,'front');}}
 if(this.index===4){S.tool='map';S.waypoint=[OP.fleet.x,OP.fleet.y];}
 if(this.index===5){CHEATS.god=false;S.buddies[0].met=true;TUNE.rescueChance=1;hurtPlayer(1000);}
 if(this.index===6){const q=vehicles.find(v=>v.type==='airboat');q.v.place(hero.x,hero.y,hero.z+3);enterVehicle(q);S.yaw=Math.PI;for(let i=0;i<10;i++)Fire.ignite((1010-i*7)*M,(1450+i*5)*M,7,true);}
 if(this.index===7){S.yaw=-1.8;S.pitch=.18;S.flooding=true;flood.position.y=-12;}
 },update(dt){if(this.index<0||performance.now()-this.at>12000)this.next();const t=(performance.now()-this.at)/1000;const input={move:[Math.sin(t*.2)*.12,this.index===0||this.index===6?-.8:this.index===4?0:-.12],mouse:[0,0],stick2:null,pressed:()=>false,down:a=>a==='fire'&&(this.index===2||this.index===3)&&t%3<.7,use(){}};if(this.index===2&&t>4&&t<5){S.inventory[S.cur].jammed=true;if(!S.act)startReload();}if(this.index===4&&t>6)S.tool='locator';step(dt,input);heldStep(dt);}};
scenes.attract={input:KEYS,enter(){Attract.index=-1;},update:dt=>Attract.update(dt),draw(r){world.draw(r);r.overlay(g=>hud(g,r));}};

let built=false;
BOOT.push(['Mapping Lacustria',()=>{defineSounds();planLand();layout();}],['The dead inland sea',()=>{world=new W3(game,{terrain:{size:SIZE,cell:32,chunk:32,height,color,far:17000,physics:1400,detail:1.2,rock:{colors:['#a8644a','#c47e5a','#8e523c','#d0946a'],band:46,slope:[.34,.52]},speckle:.2,mottle:.3},sky:{top:'#485d77',horizon:'#ebaa6e',ground:'#b49070',sun:'#fff0c8'},fog:{color:'#d7a97c',near:2500,far:19000},ambient:['#c4bdac','#8a6a48',1.5],sun:{color:'#ffdaaa',intensity:2.5,dir:[-.55,.4,-.62],area:1150,map:2048},torchLights:0,glowLights:4,lights:3,overlay:{fov:58},camera:{mode:'fixed',capture:true,near:1.1},res:'balanced',gravity:GRAV,onDraw});structureMesh(world);makeFire();grassMeshes(world);fxMeshes(world);makeWeather();makeHeld();reset();built=true;if(Net.info)startSalvage(Net.info);tellReady();}]);
game.start({scenes,scene:inSession?'round':'title',boot:{title:GAME_TITLE,steps:[['The 3D engine',async()=>{try{await W3.init(game,{render:!NO_RENDER});}catch(e){if(inSession)AIHub.fail(e.message||String(e));throw e;}}],...BOOT,['Warming the shaders',()=>world.prepare()]]}});
game.saves.write=()=>({data:saveData(),place:OP[currentStep()?.site]?.name||'Lacustria',level:CONTRACTS[S.contract]?.title});game.saves.read=save=>loadData(save.data);
window.__game={game,scenes,get S(){return S;},get world(){return world;},get hero(){return hero;},TUNE,CHEATS,Dev,openDev,renderDev,showAbout,openShop,refill,sleep,getNear,Bot,Attract,Salvage,Net,Contracts,run,reset,setHour,OP,biomeAt,Fire,saveData,loadData,beginContract,chooseEnding,enterVehicle,exitVehicle,repairVehicle,makeVehicle,damageVehicle,hasPapers,burnPapers,buddyRescue,downBuddy,saveBuddy,killBuddy,spawnEnemy,hurtEnemy,people,raiders,vehicles,CASES,STAKES,voiceSound,gunShot,startReload,giveGun,act,heal,useAmpoule,fitStart,hurtPlayer,step,get ready(){return built;}};
game.debug={snapshot:()=>({title:GAME_TITLE,hp:S?.hp,at:[hero?.x,hero?.y],time:S?.time}),teleport:(x,y,z)=>{hero.place(x,y,z??height(x,y)+1);camStep(0);}};
