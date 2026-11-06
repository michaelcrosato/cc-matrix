// Operations are complete, self-contained sequences. Coordinates are field units.
const e=(kind,x=0,y=0,o={})=>({kind,x,y,...o});
const zone=(w=1.1,h=.45)=>e('gelZone',0,0,{w,h,parTime:9});
const cut=(x1=-.65,y1=0,x2=.65,y2=0)=>e('incision',x1,y1,{points:[[x1,y1],[(x1+x2)/2,(y1+y2)/2+.055],[x2,y2]]});
const wound=(x=0,y=0,n=6,w=.7)=>e('wound',x,y,{gates:Array.from({length:n},(_,i)=>[x-w/2+w*i/(n-1),y+(i%2?-.08:.08)])});
const shard=(x,y,a=90,embed=.2,hidden=false)=>e('shard',x,y,{axis:a,embed,hidden,poolOnRemove:.4});
const bleeder=(x,y)=>e('bleeder',x,y);
const phase=(id,objective,tools,spawn,more={})=>({id,objective,tools,spawn,done:{all:true},...more});
const sites=(...organs)=>organs.map((organ)=>({id:organ,organ}));
const patient=(name,age,job,note,followUp,style='slick',skin='#d5a080')=>({name,age,job,note,followUp,bust:{style,skin}});
export const operations=[
 {id:'broken-glass',chapter:1,title:'Broken Glass',doctor:'ren',scene:{before:'S1',after:'S2'},timer:240,bpm:72,parScore:10500,music:'or-calm',sites:sites('forearm'),
 patient:patient('Desmond Pell',52,'Taxi driver','Has never once used a turn signal.','Discharged Tuesday. Was seen signaling, once, leaving the car park.','slick'),
 teaches:['gel','forceps','suction','syringe','scanner','suture'],phases:[
 phase('clean','Disinfect the wound',['gel'],[zone(1.2,.5)],{say:'Gel first, child. Everything in a taxi is filthy.'}),
 phase('glass','Pull four shards to the tray. Drain the pools.',['forceps','suction'],[shard(-.65,.16,70,.18),shard(-.2,-.22,100,.22),shard(.32,.19,60,.25),shard(.7,-.12,110,.3)],{say:'That is a shard of windshield, not a sacrament. Take it out.'}),
 phase('dip','Stabilize the patient. Hold {syringe}.',['syringe'],[],{begin:{vitals:-25,lockFail:true},done:{vitalsAbove:90},say:'Pressure is falling. The IV, child. Hold {syringe}.'}),
 phase('missing','Count them. Scan for the missing shard.',['scanner','forceps'],[shard(.05,.2,85,.3,true)],{say:'Four on the tray. Five on the radiograph. Count them, child.'}),
 phase('stitch','Close both lacerations. Follow every gate.',['suture'],[wound(-.1,.27,6,1),wound(.1,-.28,8,1.15)],{say:'Numbered gates. Left, right, left. Then tie your knot.'}),
 phase('finish','Seal the stitches with gel.',['gel'],[zone(1.3,.55)],{say:'A little gel. Let him keep his arm.'})]},
 {id:'growth-spurt',chapter:1,title:'Growth Spurt',doctor:'ren',scene:{before:'S3',after:'S4'},timer:330,bpm:76,parScore:12800,music:'or-tense',sites:sites('abdomen','bowel'),
 patient:patient('Hana Ito',38,'Crane operator','Lifts forty tons for a living. Fainted at the consent form.','Back on the cranes. Has asked you to stop visiting.','bob','#e5b697'),teaches:['scalpel','clamp','laser','hush'],phases:[
 phase('open','Disinfect, then trace the incision.',['gel','scalpel'],[zone(1.5,.4),cut(-.7,0,.7,0)],{ordered:true}),
 phase('bleed','Clamp both bleeders. Clear the field.',['clamp','suction'],[bleeder(-.4,.15),bleeder(.45,-.1),e('pool',-.4,.15,{vol:.6}),e('pool',.45,-.1,{vol:.6})],{site:1}),
 phase('nodules','Five nodules. One is under the surface.',['scanner','laser'],[-.8,-.4,0,.4,.8].map((x,i)=>e('nodule',x,i%2?.22:-.15,{hp:30,hidden:i===3}))),
 phase('tumor','Sever three tethers. Extract the mass.',['scalpel','forceps'],[e('tumor',0,0,{embed:.4,axis:90,tethers:3}),...[-1,0,1].map((s,i)=>e('tether',s*.33,.08,{points:[[s*.33-.15,-.22],[s*.33+.15,.38]],order:i}))]),
 phase('crash','THE HUSH. Slow the world. Close the rupture.',['hush','suture'],[wound(0,0,12,1.35)],{begin:{vitalsSet:35,composure:100,drain:3},say:'THE VESSEL! Child, listen. Listen to the room.'}),
 phase('close','Remove clamps with {alt}. Close and seal.',['clamp','suture','gel'],[bleeder(-.65,.25),bleeder(.65,.25),wound(0,0,10,1.2),zone(1.4,.45)],{ordered:true,clampsOn:true,done:{all:true,allClampsOff:true}})]},
 {id:'adagio',chapter:2,title:'Adagio',doctor:'ren',scene:{before:'S5',after:'S6'},timer:330,bpm:80,parScore:13000,sites:sites('liver'),
 patient:patient('Theodora Lund',61,'Cellist · Harbor Orchestra','Refuses anesthesia until she finishes a sentence about Brahms.','Dedicated the slow movement to “the nervous one.”','long','#e3bca8'),teaches:['adagio'],phases:[
 phase('open','Disinfect and open the field.',['gel','scalpel'],[zone(),cut()],{ordered:true}),
 phase('scan','Scan the stave lines. Mark three nests.',['scanner'],[-.6,0,.6].map(x=>e('scanMark',x,0,{hidden:true}))),
 phase('adagio','Laser the core, then extract Adagio.',['laser','forceps'],[e('adagio',0,0,{hp:100,embed:.22,axis:90})],{strain:'adagio'}),
 phase('eggs','Find four eggs before they hatch.',['scanner','laser'],[-.7,-.25,.25,.7].map((x,i)=>e('egg',x,i%2?.25:-.2,{hidden:true,hp:20,hatchBar:16}))),
 phase('grande','Adagio Grande. Clamp its bleeders.',['laser','forceps','clamp'],[e('adagio',0,0,{hp:150,grande:true,embed:.3,axis:90}),bleeder(-.7,.25),bleeder(.7,-.25)],{strain:'adagio'}),
 phase('close','Clamps out. Stitch and seal the lesions.',['clamp','suture','gel'],[bleeder(-.75,.15),bleeder(.75,.15),wound(0,.25,6,1),wound(0,-.25,6,1),zone(1.2,.65)],{ordered:true,clampsOn:true,done:{all:true,allClampsOff:true}})]},
 {id:'staccato',chapter:2,title:'Staccato',doctor:'ren',scene:{before:'S7',after:'S8'},timer:360,bpm:84,parScore:20000,sites:sites('bowel','stomach'),
 patient:patient('Ruben Castellano',47,'Ferry captain','Has not missed a crossing in nineteen years. Is asking how long.','Missed two crossings. Sent flowers to the ferry.','bald','#b78060'),teaches:['staccato','tremolo'],phases:[
 phase('open','Disinfect and open the field.',['gel','scalpel'],[zone(),cut()],{ordered:true}),
 phase('wave-one','Pinch the notes before they burst.',['forceps','laser'],Array.from({length:8},(_,i)=>e('note',-.8+(i%4)*.5,-.26+Math.floor(i/4)*.5,{hp:8,ttl:8+i*.75})),{strain:'staccato'}),
 phase('nests','Scan and seal four hidden nests.',['scanner','gel'],[-.75,-.25,.25,.75].map((x,i)=>e('nest',x,i%2?.22:-.2,{hidden:true}))),
 phase('waves','Two more waves. Keep the field clean.',['laser','forceps','gel'],Array.from({length:12},(_,i)=>e('note',-.9+(i%6)*.36,-.3+Math.floor(i/6)*.6,{hp:8,ttl:10+i*.9})),{extraWave:16}),
 phase('tremolo','Slow hands. Pin Tremolo three times.',['scanner','laser'],[e('tremolo',0,0,{hp:40,pinsRequired:3})],{site:1,strain:'tremolo',say:'Slow hands, child. It is more frightened than you.'}),
 phase('close','Close and seal the field.',['suture','gel'],[wound(0,0,8,1.2),zone(1.3,.45)],{ordered:true})]},
 {id:'legato',chapter:3,title:'Legato',doctor:'ines',scene:{before:'S9',after:'S10'},timer:360,bpm:70,parScore:19000,consult:true,scalpelMult:.75,sites:sites('brain'),
 patient:patient('Nadia Bloom',29,'School music teacher','Class 4 sent a card signed “Please do not miss.”','Back with Class 4. They have sent a second card.','buns','#a97655'),teaches:['legato','sforzando'],phases:[
 phase('membrane','Open the membrane. Precise hands.',['scalpel'],[cut(-.7,-.2,.65,-.12),cut(-.65,.24,.7,.2)]),
 phase('chain','Cut the glowing tail. Carry every bead away.',['scalpel','forceps'],[e('legato',0,0,{links:12})],{strain:'legato'}),
 phase('thrash','SFORZANDO. Sever the thrashing chain.',['sforzando','scalpel','forceps'],[e('legato',0,0,{links:6,speed:1.7})],{begin:{composure:100},say:'Now you will see how I work, Doctor.'}),
 phase('second','A second chain. Tail first, Doctor.',['scalpel','forceps'],[e('legato',0,0,{links:8,twoTails:true})]),
 phase('repair','Repair the vessel. Clamps out. Seal.',['suture','clamp','gel'],[bleeder(-.8,0),wound(0,0,10,1),zone(1.2,.4)],{ordered:true,clampsOn:true,done:{all:true,allClampsOff:true}})]},
 {id:'fermata',chapter:3,title:'Fermata',doctor:'ren',scene:{before:'S11',after:'S12'},timer:420,bpm:88,parScore:14000,consult:true,sites:sites('heart'),
 patient:patient('Dr. Augustin Bell',66,'Chief of Surgery','Has told every surgeon here to quit smoking. Smokes.','Under arrest. Recovering. Has quit.','bald','#e6b292'),teaches:['crescendo','fermata','defib'],phases:[
 phase('open','Open and disinfect the field.',['scalpel','gel'],[cut(-.75,0,.75,0),zone(1.5,.4)],{ordered:true}),
 phase('crescendo','Kill four feeders. Cut and extract the ring.',['laser','scalpel','forceps'],[e('crescendo',0,0,{size:.2,embed:.3,axis:90})],{strain:'crescendo'}),
 phase('first-arrest','CARDIAC ARREST. Charge. Release in gold.',['defib'],[],{begin:{arrest:true,arrestTime:14},done:{arrestsSurvived:1},strain:'fermata'}),
 phase('antidote','Inject three antidote sites. Clamp bleeding.',['syringe','clamp'],[e('injection',-.6,0),e('injection',0,.3),e('injection',.6,0),bleeder(-.4,-.3),bleeder(.4,-.3)]),
 phase('second-arrest','Laser the eye. Then CLEAR!',['laser','defib'],[e('fermata',0,0,{hp:60})],{begin:{arrest:true,arrestTime:12},done:{arrestsSurvived:1}}),
 phase('third-arrest','Laser. Shock. Extract the eye.',['laser','defib','forceps'],[e('fermata',0,0,{hp:80,extract:true,embed:.25,axis:90})],{begin:{arrest:true,arrestTime:14}}),
 phase('close','Remove clamps. Close the heart.',['clamp','suture','gel'],[bleeder(-.7,.25),bleeder(.7,.25),wound(0,0,10,1.2),zone(1.3,.5)],{ordered:true,clampsOn:true,done:{all:true,allClampsOff:true}})]},
 {id:'coda',chapter:4,title:'Coda',doctor:'ren',scene:{before:'S13',after:'S14'},timer:570,bpm:92,parScore:21000,consult:true,sites:sites('heart','lung','aorta'),
 patient:patient('Beatrice Okonkwo',58,'Head Nurse · OR 3','In her own handwriting: “Do not be dramatic about this.”','Discharged herself. Is back in OR 3. Has opinions.','wrap','#915c43'),teaches:['coda'],phases:[
 phase('exposition','Adagio and Staccato. Keep her with us.',['laser','forceps','gel'],[e('adagio',-.3,0,{hp:100,embed:.2,axis:90}),e('nest',.65,.1),e('note',.5,-.3,{hp:8,ttl:10})],{strain:'adagio',say:'“Suction before you cannot see.” She underlined that twice.'}),
 phase('development','Switch to the lung. Pin and sever.',['scanner','laser','scalpel','forceps'],[e('tremolo',-.5,0,{hp:40,pinsRequired:2}),e('legato',.4,0,{links:5})],{site:1,strain:'tremolo'}),
 phase('recapitulation','The aorta. Stop the crescendo.',['laser','scalpel','forceps'],[e('crescendo',0,0,{size:.2,embed:.3,axis:90})],{site:2,strain:'crescendo'}),
 phase('rest','Her heart has stopped. Laser. Defibrillate.',['laser','defib'],[e('fermata',0,0,{hp:60})],{site:0,begin:{arrest:true,arrestTime:12},done:{arrestsSurvived:1},strain:'fermata'}),
 phase('conductor','CODA. Cut the batons. Strike during the rest.',['scalpel','laser','forceps'],[e('coda',0,0,{hp:300,embed:.6,axis:90,arms:2})],{strain:'coda'}),
 phase('closing','Close every site. Remove every clamp.',['suture','gel','clamp'],[wound(0,0,8,1.1),{...wound(0,0,8,1.1),site:1},{...wound(0,0,8,1.1),site:2},zone(.8,.28),{...zone(.8,.28),site:1},{...zone(.8,.28),site:2},bleeder(-.7,.15)],{clampsOn:true,done:{all:true,allClampsOff:true}}),
 phase('last-stop','Listen, Doctor. Bring her back.',['hush','defib'],[],{site:0,begin:{composure:100,arrest:true,arrestTime:12,doctor:'ren'},done:{arrestsSurvived:1},say:'Her notebook ends here, Doctor.'})]},
 {id:'last-patient',chapter:4,title:'Last Patient',doctor:'ren',scene:{before:'S15',after:'S16'},timer:0,bpm:60,parScore:0,unfailing:true,sites:sites('heart'),
 patient:patient('Dr. Cordelia Voss',71,'Founder · Cardiac unit','“Deceased.” Seventeen years ago. Crossed out by Ren.','Tonight’s patient survived.','long','#d9bfae'),teaches:[],phases:[
 phase('clamp','',['clamp'],[bleeder(0,0)],{say:'She is a patient.',minDuration:15}),
 phase('heartbeat','',['defib'],[],{begin:{arrest:true,arrestTime:60},done:{arrestsSurvived:1},minDuration:25,say:'Tonight, the room is quiet for her.'})]},
 {id:'grand-rounds',chapter:0,title:'Grand Rounds',doctor:'ren',timer:300,bpm:82,parScore:22000,sites:sites('liver','bowel','heart'),
 patient:patient('Ngaio Reeve',55,'Harbor master','Ward Zero has only this to say: everyone scrub in.','A harbor needs every pair of hands. So does a heart.','slick','#ac775b'),teaches:[],phases:[
 phase('open','Split the work. Open, extract, disinfect.',['scalpel','forceps','gel','clamp'],[cut(-.6,.2,.6,.2),zone(1.3,.35),...[-.6,-.2,.2,.6].map(x=>({...shard(x,0),site:1})),{...bleeder(-.5,.2),site:2},{...bleeder(.5,-.2),site:2}],{ordered:true}),
 phase('first-movement','Adagio on the liver. Notes on the bowel.',['laser','forceps','scanner','gel'],[e('adagio',0,0,{hp:100,embed:.25,axis:90}),e('nest',-.4,0,{site:1,hidden:true}),e('note',.5,0,{site:1,hp:8,ttl:12})]),
 phase('second-movement','Legato on the bowel. Crescendo at the heart.',['scalpel','laser','forceps'],[e('legato',0,0,{links:6,site:1}),e('crescendo',0,0,{size:.2,site:2,embed:.3,axis:90})]),
 phase('arrest','One heart. Any surgeon’s shock counts.',['defib','syringe'],[e('injection',-.5,0,{site:0}),e('injection',0,0,{site:1}),e('injection',.5,0,{site:2})],{site:2,begin:{arrest:true,arrestTime:14},done:{arrestsSurvived:1}}),
 phase('close','Close every site. No instruments left behind.',['suture','gel','clamp'],[wound(0,0,6,1),{...wound(0,0,6,1),site:1},{...wound(0,0,6,1),site:2},zone(1.3,.46)],{ordered:true,done:{all:true,allClampsOff:true}})]}
];
export const GRAND_ROUNDS=8;
export const kinds=['gelZone','incision','wound','shard','pool','bleeder','nodule','tumor','tether','scanMark','adagio','egg','nest','note','tremolo','legato','crescendo','feeder','fermata','coda','injection','scratch','spore','piece'];
