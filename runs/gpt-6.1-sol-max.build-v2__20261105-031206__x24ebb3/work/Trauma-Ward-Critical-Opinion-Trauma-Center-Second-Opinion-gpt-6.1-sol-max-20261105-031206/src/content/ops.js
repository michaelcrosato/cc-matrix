export const TOOLS=['scalpel','forceps','suture','drain','syringe','gel','laser','scanner'];
export const TOOL_HELP={
 scalpel:'HOLD + TRACE THE DOTTED GUIDE',forceps:'GRAB, FOLLOW THE ARROW, RELEASE',
 suture:'HOLD + ZIGZAG THROUGH THE STITCHES',drain:'HOLD OVER THE BLOOD TO DRAIN',
 syringe:'HOLD TO DRAW. RELEASE IN THE RING',gel:'HOLD + PAINT EVERY GOLD PATCH',
 laser:'HOLD ON THE TARGET. WATCH YOUR HEAT',scanner:'HOLD + SWEEP TO REVEAL HIDDEN TISSUE',
};
const E=(k,x,z,more={})=>({k,x,z,...more});
const row=(k,n,z,more={})=>Array.from({length:n},(_,i)=>E(k,-4.5+i*9/Math.max(1,n-1),z,{...more,angle:i%2?-.25:.25}));
const cut=(x=-2,z=0,length=4)=>E('incision',x,z,{length});
const stitch=(x=-2,z=0,length=4)=>E('laceration',x,z,{length});
const patch=(x=0,z=0,w=4,h=2)=>E('mask',x,z,{w,h});
const dress=()=>({id:'dressing',title:'THE LAST WORD',say:'DRESS THE WOUND. LET THE PATIENT REST.',hint:'forceps',spawn:[E('dressing',-3,.5,{length:6})]});
const close=()=>[
 {id:'close',title:'CLOSE THE INCISION',say:'SUTURE, THEN GEL. LEAVE NO OPEN WOUNDS.',hint:'suture',spawn:[stitch(-2,0,4)]},
 {id:'seal',title:'SEAL THE FIELD',say:'PAINT THE GOLD REGION WITH ANTIBIOTIC GEL.',hint:'gel',spawn:[patch()]},dress(),
];
function op(n,title,arena,time,vitals,drain,doses,patient,stages,extra={}){
 return{id:'op'+n,n,title,arena,time,vitals,drain,doses,patient,stages,surgeon:'ilya',gifts:n>=3?['quiet']:[],tools:TOOLS,par:4800+stages.reduce((a,s)=>a+(s.spawn?.length||1)*220,0),...extra};
}
const P=(name,age,job,hook,S,C)=>({name,age,job,hook,followUp:{S,A:S,B:C,C}});
export const OPS=[
 op(1,'ELEVEN HOOKS','forearm',240,85,.10,3,P('TOMASZ DOLAN',52,'TRAWLER DECKHAND',"HIS DAUGHTER'S WEDDING IS SATURDAY.",'HE WALKED HER DOWN THE AISLE. DRY EYES.','HE DANCED BADLY. SHE CRIED ANYWAY.'),[
  {id:'drain',title:'CLEAR THE FIELD',say:'REYES: TWO POOLS. DRAIN FIRST, DOCTOR.',hint:'drain',spawn:[E('pool',-2.6,-.7,{r:1.4}),E('pool',2.5,.7,{r:1.2})]},
  {id:'hooks',title:'ELEVEN HOOKS',say:'GRAB EACH HOOK. BACK IT OUT ALONG ITS CURVE.',hint:'forceps',spawn:[...row('hook',4,-2),...row('hook',4,0),...row('hook',3,1.8)]},
  {id:'sutures',title:'A LITTLE NEEDLEWORK',say:'HOLD THE NEEDLE. FOLLOW THE ZIGZAG TO TIE.',hint:'suture',spawn:[stitch(-4,-1.1,3.2),stitch(.7,1.1,3.2)]},
  {id:'gel',title:'CLEAN UP YOUR ACT',say:'GEL THE RUST PATCH. PAINT ALL THE GOLD.',hint:'gel',spawn:[patch(0,0,5,2.7)]},
  {id:'stabilise',title:'STABILISE',say:'DRAW A DOSE. RELEASE INSIDE THE INJECTION RING.',hint:'syringe',special:'inject',spawn:[]},
  {id:'twelve',title:'ONE MORE THING',say:'TWELVE. I COUNTED TWELVE. GET THE LAST ONE.',hint:'forceps',spawn:[E('hook',0,-.4,{angle:.5})]},dress(),
 ],{tools:['forceps','suture','drain','syringe','gel'],gifts:[]}),
 op(2,'THE VANISHING ACT','stomach',300,80,.15,3,P('THE GREAT ZAMBONI',43,'STAGE MAGICIAN',"HE WON'T SAY WHAT HE SWALLOWED.",'HIS NEXT TRICK WAS GOING TO HIS FOLLOW-UP.','HE ASKED IF THE TUMOUR WAS TAX-DEDUCTIBLE.'),[
  {id:'open',title:'THE OPENING ACT',say:'SCALPEL. THE SHARP END TOWARD THE PATIENT.',hint:'scalpel',spawn:[cut(-3,0,6)]},
  {id:'drain',title:'A RED HERRING',say:'DRAIN THE BLEEDERS BEFORE THEY HIDE THE FIELD.',hint:'drain',spawn:[E('pool',-2,0,{r:1.2}),E('pool',2,0,{r:1.1})]},
  {id:'scan',title:'NOW YOU SEE IT',say:'SWEEP THE SCANNER. FOUR PROPS. TWO MAGNETS.',hint:'scanner',spawn:[...row('scan',4,-.4)]},
  {id:'lance',title:'A DELICATE TRICK',say:'LANCE EACH POCKET ALONG THE SHORT GUIDE.',hint:'scalpel',spawn:[...[-4,-1.4,1.3,4].map(x=>cut(x,-.5,1))]},
  {id:'props',title:'NOTHING UP HIS SLEEVE',say:'FORCEPS. THE MAGNETS NEED A SLOW PULL.',hint:'forceps',spawn:[E('prop',-4,-.5,{prop:'key'}),E('prop',-1.4,-.5,{prop:'card'}),E('magnet',1.3,-.5),E('magnet',4,-.5)]},
  {id:'tumourScan',title:'THAT ONE IS NOT A PROP',say:'...THAT ONE IS NOT A PROP. SCAN IT AGAIN.',hint:'scanner',spawn:[E('scan',0,0,{r:1})]},
  {id:'tumour',title:'CHANGE OF PLAN',say:'TRACE A CLOSED CUT AROUND THE TUMOUR.',hint:'scalpel',spawn:[E('incision',0,0,{closed:true,r:1.5})]},
  {id:'lift',title:'SOMETHING REAL',say:'LIFT IT CLEANLY. DO NOT TEAR THE MARGIN.',hint:'forceps',spawn:[E('tumor',0,0)]},
  {id:'satellites',title:'BURN THE SATELLITES',say:'LASER EACH SMALL POLYP. AVOID HEALTHY TISSUE.',hint:'laser',spawn:[...row('polyp',5,-.5)]},...close(),
 ]),
 op(3,'NIGHT FERRY','triage',360,70,.25,5,P('THREE PASSENGERS',0,'FERRY COLLISION','THREE TABLES. ONE RESIDENT. NO TIME.',"ALL THREE ASKED WHO SAVED THEM. REYES SAID: US.",'THREE DIFFERENT THANK-YOU CARDS. ONE COFFEE.'),[
  {id:'a',title:'TABLE A - LEG WOUND',say:'TAB / D-PAD TO CHANGE TABLE. ALL VITALS FALL.',hint:'drain',spawn:[E('pool',-2,0,{r:1.2,table:0}),stitch(0,0,4),E('hook',-3,-1,{table:1}),patch(1,1,3,2),cut(-2,-1,4)]},
  {id:'b',title:'TABLE B - HULL DEBRIS',say:'THE SECOND TABLE NEEDS YOUR HANDS, DOCTOR.',hint:'forceps',spawn:[E('hook',-3,-1,{table:1}),E('hook',2,0,{table:1}),E('mask',0,1,{w:4,h:2,table:1})]},
  {id:'quiet',title:'THE ROOM GOES QUIET',say:'I CAN HEAR EVERY HEARTBEAT. HOLD YOUR GIFT.',hint:'gift',special:'quiet',spawn:[]},
  {id:'c',title:'TABLE C - CHEST WOUND',say:'KEEP MOVING. THE QUIET DOES NOT LAST FOREVER.',hint:'scalpel',spawn:[E('incision',-3,-1,{length:5,table:2}),E('pool',2,1,{r:1,table:2}),E('polyp',-3,1,{table:2}),E('laceration',0,1,{length:3,table:2})]},...close(),
 ],{tableCount:3}),
 op(4,'STICKS AND STONES','bone',330,75,.20,3,P('OLLIE BRANDT',16,'FERRY SURVIVOR','HE WAS SAVING UP FOR A GUITAR.','HE CAN PLAY AGAIN. THE NEIGHBOURS ARE FURIOUS.','A CAST FULL OF SIGNATURES. A HAND FULL OF HOPE.'),[
  {id:'open',title:'A SECOND PAIR OF EYES',say:'SABINE: LET ME SEE YOUR HANDS. OPEN THE FIELD.',hint:'scalpel',spawn:[cut(-3,0,6),E('pool',0,-1,{r:1.1})]},
  {id:'fragments',title:'BONE MEND',say:'GRAB. ROTATE Q/E OR WHEEL. MATCH THE SILHOUETTE.',hint:'forceps',spawn:Array.from({length:6},(_,i)=>E('fragment',-4+i*1.6,i%2?1.7:-1.7,{tx:-3.7+i*1.5,tz:0,angle:(i%3-1)*.5,targetAngle:0}))},
  {id:'cement',title:'MAKE IT WHOLE',say:'GEL CEMENT ALONG EVERY SEAM.',hint:'gel',spawn:[patch(0,0,7,1.5)]},
  {id:'artery',title:'ARTERY RUPTURE',say:'SUTURE THAT ARTERY. NOW!',hint:'suture',spawn:[stitch(-2,0,4)],drain:1},
  {id:'blue',title:'CODE BLUE',say:'HOLD BOTH PADDLES. RELEASE IN THE GREEN ZONE.',special:'blue',scripted:true,spawn:[]},...close(),
 ]),
 op(5,'INTROIT','liver',360,80,.30,4,P('MR. ANSELM',61,'HARBOUR PILOT',"HE IS SMILING. HE CANNOT FEEL HIS LIVER.",'HE SAID THE PAIN WAS THE BEST NEWS ALL YEAR.','HE STOPPED SMILING. THEN HE ASKED FOR TEA.'),[
  {id:'open',title:'THE SMILING WARD',say:'OPEN THE FIELD. FIND THE CAUSE.',hint:'scalpel',spawn:[cut(-3,0,6)]},
  {id:'scan',title:'SOMETHING KNOCKED',say:'ILYA: LIVERS DO NOT KNOCK. SCAN THAT SHADOW.',hint:'scanner',spawn:[E('scan',0,0)]},
  {id:'knock',title:'INTROIT - THE KNOCK',say:'WAIT FOR THE KNOCK. LANCE. GRAB. PULL. RELEASE.',hint:'scalpel',boss:'introit',spawn:[E('strain',0,0,{strain:'introit',hp:3})]},
  {id:'eggs',title:'LEAVE IT NO TOMORROW',say:'LASER THE EGGS. SHOW IT NO MERCY.',hint:'laser',spawn:[...row('polyp',3,-1.3),...row('polyp',3,1.3)]},...close(),
 ]),
 op(6,'COLD HANDS','kidney',360,80,.20,3,P('ADA OKOYE',48,'HARBOUR ENGINEER',"PEM'S SISTER. HE HAS STOPPED MAKING JOKES.",'HER BROTHER BOUGHT THE BOAT. SHE FIXED IT.','SHE ASKED PEM TO TELL A JOKE. ANY JOKE.'),[
  {id:'open',title:'SABINE TAKES THE TABLE',say:'SABINE: I HAVE SEEN THIS BEFORE. OPEN.',hint:'scalpel',spawn:[cut(-3,0,6)]},
  {id:'clamp',title:'ISOLATE THE VESSELS',say:'PLACE BOTH CLAMPS BEFORE YOU CUT.',hint:'forceps',spawn:[E('clamp',-2,-.8),E('clamp',2,-.8)]},
  {id:'vessels',title:'DIVIDE',say:'SHORT SCALPEL STROKES. ONE VESSEL AT A TIME.',hint:'scalpel',spawn:[cut(-2.5,-.8,1),cut(1.5,-.8,1)]},
  {id:'remove',title:'THE FAILING KIDNEY',say:'LIFT THE OLD KIDNEY INTO THE TRAY.',hint:'forceps',spawn:[E('organ',0,0)]},
  {id:'donor',title:'A BORROWED TOMORROW',say:'TAKE THE DONOR KIDNEY FROM THE ICE TRAY.',hint:'forceps',spawn:[E('organ',-4,-1,{tx:0,tz:0,place:true})],cold:true},
  {id:'join',title:'ANASTOMOSES',say:'ARTERY. VEIN. URETER. MAKE EACH JOIN COUNT.',hint:'suture',spawn:[stitch(-3,-1,2),stitch(1,-1,2),stitch(-1,1,2)]},
  {id:'again',title:'THE SECOND LOOK',say:'A CLOT. AGAIN. PRESS YOUR GIFT TO REWIND.',special:'rewind',spawn:[]},
  {id:'unclamp',title:'LET IT LIVE',say:'RELEASE THE CLAMPS, LEFT TO RIGHT.',hint:'forceps',spawn:[E('clamp',-2,0),E('clamp',2,0)],pink:true},
  {id:'sample',title:'MERC-Y',say:'SCAN THE SAMPLE. IT WAS IN THE DONOR BANK.',hint:'scanner',spawn:[E('scan',0,0)]},...close(),
 ],{surgeon:'sabine',gifts:['look']}),
 op(7,'LACRIMOSA','lung',390,80,.30,4,P('OTTILIE MARR',57,'HOSPICE NURSE',"REYES'S OLDEST FRIEND. A VERY QUIET SMILE.",'SHE FELT PAIN AGAIN. SHE THANKED THEM FOR IT.','REYES CRIED ONCE. WHERE NO ONE COULD SEE.'),[
  {id:'open',title:'NO ONE SHOULD HURT',say:'SHE SENT FLOWERS. WE NEED INSTRUMENTS.',hint:'scalpel',spawn:[cut(-3,0,6)]},
  {id:'eyes',title:'LACRIMOSA - THE WEEPER',say:'LASER OPEN EYES. DRAIN TEARS. GEL IS A BARRIER.',hint:'laser',boss:'lacrimosa',spawn:Array.from({length:5},(_,i)=>E('eye',-4+i*2,i%2?1:-1,{hp:3,index:i}))},
  {id:'sob',title:'THE SOB',say:'PAINT THE BARRIER BEFORE THE WAVE BREAKS.',hint:'gel',spawn:[patch(0,0,8,1.5)],deadline:8},
  {id:'core',title:'THE LAST TEAR',say:'FORCEPS ON THE OPTIC STALK. PULL IT FREE.',hint:'forceps',spawn:[E('strain',0,0,{strain:'stalk',hp:1,phase:'exposed'})]},...close(),
 ]),
 op(8,'DIES IRAE','heart',420,75,.35,5,P('CORNELIUS BRAM',68,'CHIEF OF SURGERY',"HIS TREMOR WAS MERCY ALL ALONG.",'HE TOOK HIS FIRST STEADY CUP OF TEA IN YEARS.','HE GAVE ILYA HIS OLD SCALPEL. KEEP SHOWING UP.'),[
  {id:'open',title:'DO NOT BE GENTLE',say:'HE WROTE THE PAPER. NOW WE WRITE HIM A FUTURE.',hint:'scalpel',spawn:[cut(-3,0,6)]},
  ...[3,2,2].map((n,round)=>({id:'wrath'+round,title:'DIES IRAE - ROUND '+(round+1),say:'CUT. LIFT. LASER. ONLY IN THE BLUE HEART PHASE.',hint:'scalpel',boss:'wrath',spawn:row('plate',n,0,{round})})),
  {id:'massage',title:'MANUAL CARDIAC MASSAGE',say:'ALTERNATE LEFT / RIGHT ON THE BEAT. EIGHT TIMES.',special:'massage',spawn:[]},
  {id:'final',title:'THE LAST CUT',say:'ONE CLEAN CUT. HE IS STILL HERE.',hint:'scalpel',spawn:[cut(-2,0,4)]},...close(),
 ]),
 op(9,'LIBERA ME','chest',540,70,.35,6,P('ODALYS REYES',46,'SCRUB NURSE','SHE SHIELDED THE PATIENT. START WITHOUT HER.',"...YOUR SUTURES ARE CROOKED, DOCTOR.","...YOUR SUTURES ARE CROOKED, DOCTOR."),[
  {id:'false',title:'SANCTUS - THE FALSE CLEAN',say:'NO SIGNAL',hint:'scanner',boss:'false',spawn:[...row('cyst',4,-1.4,{real:true,hidden:true}),...row('cyst',4,1.4,{real:true,hidden:true}),E('cyst',-1,0,{real:false,hidden:true}),E('cyst',3,0,{real:false,hidden:true})]},
  {id:'reprise',title:'REPRISE',say:'NO SIGNAL',hint:'scalpel',boss:'reprise',spawn:[E('strain',-3,0,{strain:'introit',hp:1}),E('eye',0,-1.5,{hp:2,index:0}),E('eye',2.5,-1.5,{hp:2,index:1}),E('plate',1,1.3),E('plate',4,1.3)]},
  {id:'miserere',title:'MISERERE - IT COPIES YOUR HAND',say:'NO SIGNAL',hint:'forceps',boss:'miserere',spawn:[E('strain',0,0,{strain:'miserere',hp:2,phase:'exposed'})]},
  {id:'blue',title:'BRING HER BACK',say:'NO SIGNAL',special:'blue',scripted:true,spawn:[]},...close(),
 ],{surgeon:'both',gifts:['quiet','look'],partner:true}),
 op(10,'DO NO HARM','spine',240,60,.05,2,P('HESPER LINDQVIST',66,'FOUNDATION DIRECTOR',"SHE TOOK MERCY FIRST. ELEVEN YEARS AGO.",'WHY? BECAUSE IT IS MY SHIFT.','THE FIRST THING SHE FELT WAS A HAND HOLDING HERS.'),[
  {id:'cut',title:'A QUIET KIND OF COURAGE',say:'SLOWLY. SHE IS ALLOWED TO FEEL THIS.',hint:'scalpel',spawn:[cut(-3,-1,6),cut(-3,1,6)]},
  {id:'mercy',title:'NO ONE IS BEYOND CARE',say:'GENTLE FORCEPS. EACH NERVE RETURNED IS A GIFT.',hint:'forceps',spawn:[E('nerve',-3,0),E('nerve',0,0),E('nerve',3,0)]},...close(),
 ]),
];
export const CONSULT=op(11,'PILE-UP','chest',240,85,.18,6,P('PORT VERITY',0,'CONSULT TEAM','ONE PATIENT. EVERY PAIR OF HANDS COUNTS.','THE CITY WILL NEED YOU AGAIN TOMORROW.','A SECOND PAIR OF HANDS MADE THE DIFFERENCE.'),[
 {id:'arrival',title:'PILE-UP - FIRST RESPONSE',say:'FOUR HANDS. ONE FIELD. MAKE THEM COUNT.',spawn:[...row('hook',4,-1.7),E('pool',-2,1,{r:1.1}),E('pool',2,1,{r:1.1})]},
 {id:'wave2',title:'PILE-UP - COMPLICATIONS',say:'SUTURE THE WOUNDS. CLEAR THE POLYPS.',spawn:[stitch(-4,-1,3),stitch(1,1,3),...row('polyp',4,0)]},
 {id:'surge',title:'PILE-UP - SURGE',say:'IT KNOCKED. YOU KNOW WHAT TO DO.',spawn:[E('strain',0,0,{strain:'introit',hp:2}),E('pool',-3,-1,{r:1}),E('pool',3,-1,{r:1})]},...close(),
],{gifts:['quiet','look']});
export const ALL_OPS=[...OPS,CONSULT];
const PARS=[6301,7390,5820,4697,5237,5289,8181,4795,8393,3347,5765];
ALL_OPS.forEach((op,i)=>{op.par=PARS[i];});
export const opById=id=>ALL_OPS.find(x=>x.id===id)||OPS[0];
