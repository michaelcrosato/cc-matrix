(() => {
const G=window.GAME;
const P=(name,tip,objects,extra={})=>({name,tip,objects,...extra});
const O=(type,x,y,extra={})=>({type,x,y,...extra});
const line=(x,y,n=60)=>[[x,y],[x+6,y+n*.3],[x-4,y+n*.7],[x,y+n]];
const shards=n=>Array.from({length:n},(_,i)=>O('shard',120+i*42,86+(i%2)*47,{axis:[0,-1],depth:28}));
const cuts=n=>Array.from({length:n},(_,i)=>O('laceration',141+i*57,104+(i%2)*32,{r:13}));
const close=n=>O('wound',213,114,{n,length:66});
const opening=(n=60)=>O('guide',213,72,{points:line(213,72,n)});
const pools=n=>Array.from({length:n},(_,i)=>O('pool',162+i*92,104,{volume:70}));
const bleeds=n=>Array.from({length:n},(_,i)=>O('bleeder',130+i*48,101+(i%2)*32));
const CASES=[
 {id:1,name:'Glasshouse',chapter:1,chapterName:'First Incision',patient:'Agnes Pellow',age:74,detail:'She wants the glass kept for her grandchildren.',doctor:'vale',site:'forearm',clock:180,vitals:80,drain:.1,par:3027,complaint:'Greenhouse fall. Four embedded fragments.',first:'Glass in the forearm. Keep the tendons intact.',phases:[
 P('Pull the glass','Grip a shard. Pull slowly along its arrow. Release away from the wound.',shards(4),{tutorial:'forceps'}),
 P('Clean the cuts','Hold Salve and paint every hatched patch.',cuts(3),{tutorial:'salve'}),
 P('Close the wound','Press on the blue dot, cross, and release on the other dot.',[close(4)],{tutorial:'suture'}),
 P('Give her a boost','Hold to fill the syringe. Release to send medicine to the IV.',[O('iv',300,118)],{tutorial:'syringe',dip:40})]},
 {id:2,name:'Low Brass',chapter:1,patient:'Desmond "Slide" Achebe',age:63,detail:'His band is waiting at the Harbor Jazz Hall.',doctor:'vale',site:'abdomen',clock:210,vitals:70,drain:.2,par:4597,complaint:'Abdominal swelling. The chart says hernia.',first:'Hernia. Obviously. - Dr. Whitlock',lightbox:[246,121],phases:[
 P('Open on the guide','Start at the white dot. Trace the violet line.',[opening()],{tutorial:'scalpel'}),
 P('Clear the field','Suction first. Then seal the pulsing bleeder.',[...pools(2),O('bleeder',165,104)],{tutorial:'suction'}),
 P('Burn the polyps','Hold Cautery on each orange ring. Watch the heat.',Array.from({length:5},(_,i)=>O('polyp',124+i*43,100+(i%2)*40)),{tutorial:'cautery'}),
 P('Remove the mass','Cut around it, then lift it with Forceps.',[O('mass',213,113,{r:26}),O('shard',279,131,{axis:[0,-1],depth:22,cork:true})]),
 P('Close and dress','Six stitches, then a little Salve.',[close(6),O('patch',285,128,{r:13})])]},
 {id:3,name:'Crane Nine',chapter:1,patient:'Tam Rennie',age:48,detail:'The harbor foreman sent his crew home first.',doctor:'vale',site:'abdomen',clock:150,vitals:55,drain:.5,par:6355,complaint:'Crush injuries after the harbor crane collapse.',first:'Unstable. You are the only surgeon in the building.',cinematic:'gurney',phases:[
 P('Stop the bleeding','Seal the tears, drain the blood. The IV is always available.',[...Array.from({length:3},(_,i)=>O('arteryTear',138+i*75,118,{n:3,length:26})),...pools(2),...bleeds(2)]),
 P('Extract the shrapnel','Drain any pool covering a fragment.',shards(5).map((o,i)=>({...o,x:113+i*47,underPool:i<2}))),
 P('Bring him back','Two well-timed shocks. Then use The Steady.',[],{codeBlue:true}),
 P('Seal six ruptures','Long Breath slows the world. Your hands keep their time.',Array.from({length:6},(_,i)=>O('bleeder',213+Math.cos(i*Math.PI/3)*83,116+Math.sin(i*Math.PI/3)*47)),{limit:12,gauge:80,tutorial:'gift'}),
 P('Close the foreman','He sent his crew home. Send him home too.',[close(5)])]},
 {id:4,name:'The Whistling Man',chapter:2,chapterName:'The Quiet Ones',patient:'Captain Ned Harrow',age:52,detail:'He is whistling. There is a gaff through his side.',doctor:'vale',site:'flank',clock:200,vitals:75,drain:.25,par:5738,complaint:'A fishing gaff. No pain whatsoever.',first:'Superficial. Patient cheerful. - Dr. Whitlock',lightbox:[259,116],phases:[
 P('Free the gaff','Relieve both barbs with the blade. Then pull.',[O('hook',213,115,{axis:[0,-1],depth:38})]),
 P('Find the singing','Sonar reveals hidden nests. Cut and lift them.',[O('nest',155,112,{hidden:true}),O('nest',270,126,{hidden:true})],{tutorial:'sonar'}),
 P('Silence Staccato','Burn the beads at the dotted landing rings.',Array.from({length:7},(_,i)=>O('bead',130+i*29,100+(i%2)*32))),
 P('Repair the bites','The captain is still whistling. Keep working.',[...cuts(4),close(4)])]},
 {id:5,name:'Slur',chapter:2,patient:'Ilse Brandt',age:19,detail:'A violinist. Her left hand has gone beautifully numb.',doctor:'vale',site:'wrist',clock:220,vitals:70,drain:.2,par:2899,complaint:'Painless neuropathy. Guard the gold nerve line.',first:'A moving ridge beneath the flexor tendons.',phases:[
 P('Find the head','Sweep Sonar along the raised track.',[O('legato',205,112,{hidden:true,segments:8})]),
 P('Repair the track','Paint the ridge. Place five fine stitches.',[O('patch',156,117,{r:18}),close(5),O('nerve',294,110,{points:[[276,77],[293,109],[286,149]]})])]},
 {id:6,name:'Bedside Manner',chapter:2,patient:'Marguerite Oyelaran',age:61,detail:'Your chief. Her cane is still on the gala floor.',doctor:'vale',site:'heart',clock:240,vitals:60,drain:.35,par:3517,complaint:'Sudden cardiac collapse at the Foundation gala.',first:'A shivering web around the coronary vessel.',cinematic:'gala',phases:[
 P('Open the sternum','Steady hands, Doctor. She taught you this.',[opening(84),...pools(1)]),
 P('Quiet Tremolo','Dose the five reeds as they flare. Then burn the core.',[O('tremolo',213,112)]),
 P('Mend between beats','The stitch only takes between the heartbeats.',[O('wound',216,118,{n:6,length:66,beatGate:true}),O('patch',282,132,{r:15})])]},
 {id:7,name:'Force Nine',chapter:3,chapterName:'Second Look',patient:'Yusuf Demir',age:34,detail:'The deckhand still owes his daughter a birthday cake.',doctor:'sokolova',site:'abdomen',clock:170,vitals:60,drain:.35,par:4580,complaint:'Winch damage aboard Samaritan\'s Wake.',first:'Operate through the storm. The ship will not wait.',cinematic:'ship',tilt:true,phases:[
 P('Treat the winch damage','The ship will lurch. Second Look can take a moment back.',[...shards(4),O('arteryTear',174,126,{n:3}),O('arteryTear',258,126,{n:3})],{lurch:25,gauge:80}),
 P('Work in the blackout','The lamp is out. Sonar still sees.',bleeds(3).map(o=>({...o,hidden:true})),{blackout:true}),
 P('Close on the roll','Follow the dots as the deck moves.',[O('wound',213,119,{n:8,length:80,roll:true})])]},
 {id:8,name:'From the Top',chapter:3,patient:'Sister Perpetua',age:72,detail:'She runs the seamen\'s hospice and knows every name.',doctor:'sokolova',site:'abdomen',clock:210,vitals:65,drain:.3,par:9621,complaint:'A strain that regrows when it is cut.',first:'Three lobes. Finish the phrase before it repeats.',phases:[
 P('Open and clear','There is a rhythm underneath the tissue.',[opening(),...pools(1)]),
 P('Break Da Capo','A: burn. B: cut and lift. C: dose and coat. Ten seconds together.',[O('dacapo',213,110)]),
 P('Double time','The same phrase, twice as fast. Read the opening rings.',[O('dacapo',213,110,{round:2}),...Array.from({length:3},(_,i)=>O('bead',147+i*65,150))]),
 P('Close the sister','Give her back her choice.',[close(5)])]},
 {id:9,name:'Dead Man\'s Rhythm',chapter:3,patient:'Hollis Crane',age:46,detail:'A researcher with a confession and a rigged pacemaker.',doctor:'sokolova',site:'implant',clock:200,vitals:70,drain:.25,par:3398,complaint:'The device detonates below 25 pulse. Keep the IV ready.',first:'His wire order is wrong. Read the board yourself.',device:true,tilt:true,phases:[
 P('Expose the device','A heart is not a detonator. We will keep it that way.',[opening(),...pools(1)]),
 P('Remove four screws','Grip each screw and turn three full circles.',Array.from({length:4},(_,i)=>O('screw',173+(i%2)*80,91+Math.floor(i/2)*53))),
 P('Read the circuit','Sonar shows the true order: triangle, square, circle.',[O('board',212,110,{hidden:true})]),
 P('Bridge then disconnect','Solder the bypass. Cut triangle, square, circle.',[O('bypass',178,133),O('wire',195,102,{symbol:'triangle',order:0}),O('wire',235,102,{symbol:'circle',order:2}),O('wire',275,102,{symbol:'square',order:1})]),
 P('Lift without force','A very gentle pull. Fine mode helps.',[O('device',213,113,{axis:[0,-1],depth:38,maxSpeed:65})]),
 P('Close the chest','We are doctors. Keep that in mind.',[close(6)])]},
 {id:10,name:'Eloquent Cortex',chapter:4,chapterName:'Coda',patient:'Percival Whitlock',age:29,detail:'The chart in his own handwriting says migraine.',doctor:'vale',consult:true,site:'brain',clock:240,vitals:60,drain:.3,par:4779,complaint:'He collapsed in your arms. "It is finally quiet."',first:'Migraine. Nothing more. - Dr. Whitlock',lightbox:[243,110],phases:[
 P('Open with care','Gold is eloquent tissue. Do not cross it with heat or blade.',[O('guide',181,74,{points:[[181,74],[203,65],[231,78],[245,102]]}),...pools(1)]),
 P('Wait for Fermata','Domes stop tools. Burn the eye just as a dome falls.',[O('fermata',214,112),O('eloquent',272,105,{points:[[260,71],[277,104],[266,145]]})],{gauge:85}),
 P('Close with both hands','Consult freely. Two doctors, one patient.',[close(6),O('patch',285,118,{r:13})])]},
 {id:11,name:'Last Note',chapter:4,patient:'Clementine Hale',age:19,detail:'She has not felt her hands since she was nine.',doctor:'vale',consult:true,site:'mediastinum',clock:420,vitals:70,drain:.3,par:11074,complaint:'Every Anodyne patient is failing. She is the source.',first:'Listen to her. Do not let it go quiet.',cinematic:'final',phases:[
 P('Open for the choir','Everyone is here. Begin.',[opening(84),...pools(2),...bleeds(2)]),
 P('I. Exposition','Slash the conducting tendrils at rest, then burn the mouths.',Array.from({length:3},(_,i)=>O('mouth',145+i*69,108,{index:i})),{refill:120,gauge:90}),
 P('II. Development','No monitor. Trust the tissue, the choir, and Quill.',[O('voicebox',213,114,{hidden:true,hits:0})],{refill:120,static:true}),
 P('III. Recapitulation','Slash the repeat sign during its wind-up. Six counters.',[O('repeat',213,112,{hits:0})],{refill:120,gauge:90}),
 P('IV. The Last Note','Trace the spiral between beats. Then draw out the Note.',[O('lastnote',213,112)],{refill:120,silent:true,gauge:90}),
 P('Six quiet stitches','One beep. Six stitches. Bring her home.',[O('wound',213,117,{n:6,length:72})],{silent:true})]},
 {id:12,name:'Grand Rounds',chapter:0,patient:'The ferry patient',age:41,detail:'One table. Four pairs of hands. Do not let it go quiet.',doctor:'vale',site:'heart',clock:300,vitals:85,drain:.23,par:7000,complaint:'Mass casualty after the ferry disaster.',first:'Work together. One patient, one clock.',coop:true,phases:[
 P('Triage together','Divide the field. Keep the pulse alive.',[...bleeds(3),O('arteryTear',250,143,{n:3}),...pools(2)],{scale:true}),
 P('Clear the swarm','Find the nest. Cut, lift, burn.',[O('nest',213,107,{hidden:true}),...Array.from({length:4},(_,i)=>O('bead',140+i*47,141))],{scale:true}),
 P('One holds, one cuts','Forceps hold the retractor. A colleague traces the window.',[O('retractorHandle',143,117),O('guide',245,92,{points:line(245,92,40),retracted:true})]),
 P('Silence the choir','Three lobes. Plan the order together.',[O('dacapo',213,108)]),
 P('Close together','Each stitch is a promise.',[close(6)],{scale:true})]}
];
CASES.forEach(c=>{c.story='pre'+c.id;c.after='post'+c.id;G.defCase(c);});
G.dataHelpers={P,O,line,shards,cuts,close};
G.barks={
 slip:['That was tissue, Doctor. We keep that.','Breathe. One of you should.','The line is a suggestion. A strong one.','A little less enthusiasm with the blade.','A pause is shorter than a repair.','Your hands can hear you worrying.','Let us not make extra work.','I have a spare. Not a spare patient.'],
 clean:['Clean work, Doctor.','Quite serviceable.','The tissue agrees.','One less thing to sing about.','Keep that rhythm.','A useful pair of hands.','No objection from me.','Better. Carry on.'],
 textbook:['...Hm.','I shall pretend I expected that.','Textbook. The good edition.','Someone was listening in class.','I might put my knitting down.','You can sign that one.','A stitch worth keeping.','That will hold, Doctor.'],
 low:['Pulse forty. I mention it in passing.','An IV would be a splendid idea.','The monitor is making a point.','We need a little more patient.','I would like to keep this one.','The syringe is not decorative.','Breathe, then give her a boost.','Still here. Keep it that way.'],
 phase:['Next instrument, Doctor.','A little quieter already.','We are getting somewhere.','One thing at a time. In order.','I have seen worse. He was a plumber.','The tray is ready.','You have time to be precise.','Let us finish what we started.'],
 idle:['Read the field before you read the clock.','The marker tells you where to begin.','Call the tool. I have it ready.','A steady hand starts with a breath.','The patient is not going anywhere. Yet.','Follow the arrow, Doctor.','Try the lens. It hears rather well.','Morale. A clinical necessity.']};
})();
