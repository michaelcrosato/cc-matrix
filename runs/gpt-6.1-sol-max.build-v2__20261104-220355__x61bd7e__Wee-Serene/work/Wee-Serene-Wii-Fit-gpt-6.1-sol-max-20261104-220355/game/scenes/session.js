(() => {
const G=window.G,E=G.E,P=G.palette,{px}=E,game=G.game;
G.startSession=(id,tier=1,mode=G.mode,opts={})=>{G.mode=mode;G.scenes.session.view=G.activities[id].view;G.scenes.card.input=G.scenes.session.input=G.scenes.results.input=mode==='class'?G.CLASS_INPUT:G.INPUT;G.pending={id,tier,mode,...opts};G.go('card',G.pending);};
let menu,preview,instructor;
G.scenes.card={view:'brawler',camera:{zoom:false},pausable:true,
 enter(data){G.pending=data||G.pending;const a=G.activities[G.pending.id];G.sessionPhase='card';G.context=null;G.light();G.music(a.room==='iron'?'iron':a.id==='flow'?'yoga':'studio');preview=G.playerRig(1.8);instructor=G.instructorRig(undefined,1.5);
  menu=new G.Pills([['Begin',()=>G.go('session',G.pending)],['Back',()=>G.go(G.mode==='story'?'island':G.mode==='class'?'classLobby':'catalog',{discipline:a.discipline})]],{x:14,y:()=>game.H-69,w:150,h:23,gap:7,back:()=>G.go(G.mode==='story'?'island':'catalog')});
 },
 update(dt){game.focus(0,0,20);const a=G.activities[G.pending.id],x=(game.W*.73-game.W/2)/1.5;G.poseRig(preview,a.pose,G.time,{dt,x,y:2});menu.update(dt);},
 draw(r){const a=G.activities[G.pending.id];G.studio(r,a.room);const x=(r.W*.73-r.W/2)/1.5;G.mat(r,x,4);G.drawRig(r,preview,x,4);r.overlay(g=>G.round(g,8,7,Math.min(247,r.W*.58),150,'#f8fcfa',7));G.header(r,a.discipline+' · '+(G.pending.tier===2?'Tier 2':'Tier 1'),a.name);r.overlay(g=>{G.paragraph(g,a.rule,14,59,Math.min(195,r.W*.48));G.paragraph(g,G.activityControls(a),14,94,Math.min(195,r.W*.48),{color:P.muted});
  const best=G.best(a.id,G.pending.tier);G.text(g,(G.pending.tier===2&&a.id==='stork'?'Eyes Closed · ':'')+Math.round((G.pending.duration||a.tiers[G.pending.tier-1].duration||a.duration))+' seconds',14,128,{color:P.cyan});G.text(g,'★ '+(a.stars||[G.DEV.star1,G.DEV.star2,G.DEV.star3]).map(x=>Math.round(x*100)+'%').join('   '),14,141,{color:'#a57e30'});G.text(g,'Best  '+(best.stars?'★'.repeat(best.stars)+'  '+Math.round(best.pct*100)+'%':'A fresh start'),r.W-18,r.H-42,{align:'right',color:P.muted});});menu.draw(r);G.prompt(r,'lean','Lean',undefined,r.H-21);}
};
G.beginPlay=()=>{G.sessionPhase='play';G.phaseTime=0;G.context=G.makeContext(G.pending.id,G.pending.tier,{duration:G.pending.duration,contestants:G.pending.contestants,duel:G.pending.duel,fixedDuration:G.pending.fixedDuration,seed:G.pending.seed||18751});if(G.pending.duel){G.context.duel=true;G.context.duration=90;}
 const a=G.context.a;if(a.family==='step'){G.lastSong=null;game.audio.music({...G.SONGS[G.context.tier===2?'step2':'step'],loop:false,len:Math.ceil(G.context.duration*(G.context.tier===2?120:100)/60*4)},{sync:true,restart:true});}G.lastChime=-1;if(a.id==='stork'&&G.context.tier===2)G.context.tone=G.balanceTone();};
G.scenes.session={view:'brawler',camera:{zoom:false},pausable:true,
 enter(data){G.pending=data||G.pending;G.context=G.makeContext(G.pending.id,G.pending.tier,{duration:G.pending.duration,contestants:G.pending.contestants,duel:G.pending.duel,fixedDuration:G.pending.fixedDuration});G.sessionPhase='demonstrate';G.phaseTime=0;G.result=null;G.light(G.context.a.room==='raft');if(G.context.a.id==='slalom')game.weather={kind:'snow',amount:.45,wind:.18};G.music(({flow:'yoga',candle:'raft',step:'step',hoop:'step',slalom:'ski',tray:'tray',jog:'jog',laundry:'laundry'})[G.pending.id]||(G.context.a.room==='iron'?'iron':'studio'));instructor=G.instructorRig(undefined,1.6);G.duelRig=G.regularRig(0,1.8);},
 exit(){if(G.canvas)G.canvas.style.cursor='default';G.context?.tone?.stop?.();},
 update(dt){const ctx=G.context;if(!ctx)return;G.phaseTime+=dt;game.focus(0,0,20);
  if(G.sessionPhase==='demonstrate'){for(const c of ctx.contestants){G.poseRig(c.rig,ctx.a.pose,G.time,{dt,x:ctx.duel?-42:-12,y:4});c.worldX=ctx.duel?-42:-12;c.worldY=4;}if(G.phaseTime>=3||game.input.pressed('confirm')){G.sessionPhase='countdown';G.phaseTime=0;game.input.consumeAll();}}
  else if(G.sessionPhase==='countdown'){if(G.phaseTime>=3)G.beginPlay();}
  else if(G.sessionPhase==='play'){
   if(!G.dev.frame||G.stepFrame){G.stepContext(ctx,dt,G.dev.bot);G.stepFrame=false;}ctx.tone?.set?.(ctx.contestants[0].bal.x,ctx.contestants[0].bal.y);
   for(const c of ctx.contestants){if(c.local&&c.bal.streak>0&&Math.floor(c.bal.streak/3)>G.lastChime){G.lastChime=Math.floor(c.bal.streak/3);game.audio.sfx('chime',{pitch:1+Math.min(5,G.lastChime)*.07});}}
   if(G.canvas)G.canvas.style.cursor=G.source==='mouse'?'none':'default';
   if(ctx.done)G.endSession();
  }
  const t=ctx.time;G.poseRig(instructor,ctx.a.id==='flow'?['lunge','dog','triangle','warrior','stork'][Math.min(4,Math.floor(t/16))]:ctx.a.pose,t,{dt,x:57,y:-12,scrub:ctx.a.family==='rep'?G.repBead(ctx,t):undefined,body:ctx.a.family==='hoop'?G.hula(t*9):ctx.a.id==='lunge'?G.sideLunge(G.repBead(ctx,t)):ctx.a.family==='step'?G.stepUp((Math.sin(t*(ctx.tier===2?120:100)/60*Math.PI)+1)/2):null});
  if(ctx.duel)G.poseRig(G.duelRig,'meditate',t,{dt,x:47,y:4});
 },
 draw(r){const ctx=G.context;if(!ctx)return;const a=ctx.a,custom=G.families[a.family].fullDraw;if(custom)custom(r,ctx);else{
   G.studio(r,ctx.duel?'raft':a.room);for(const c of ctx.contestants){G.mat(r,c.worldX||0,c.worldY||0,c.color);if(a.family==='step')r.shape('stepbench',(c.worldX||0)+3,(c.worldY||0)+6,0);G.drawRig(r,c.rig,c.worldX||0,c.worldY||0);}
   if(ctx.contestants.length===1&&!['tray','candle'].includes(a.family)&&!ctx.duel){G.mat(r,57,-12,'#c5c8a3');G.drawRig(r,instructor,57,-12);}if(ctx.duel){G.mat(r,47,4,'#b7a3c7');G.drawRig(r,G.duelRig,47,4);}a.draw(r,ctx);G.tare(r,-78,22,1.15,ctx.contestants[0].bal.stumble?'worried':'happy');
  }
  r.overlay(g=>{G.round(g,10,9,Math.min(220,r.W-65),31,'#ffffff');G.text(g,ctx.duel?'The Grand Stillness':a.name,18,15,{color:P.ink});G.text(g,G.mode==='story'?'Day '+G.member.day+' · '+a.discipline:G.mode==='class'?'Together, gently':a.discipline,18,27,{color:P.muted});const left=Math.max(0,Math.ceil(ctx.duration-ctx.time));G.round(g,r.W-91,9,43,31,'#ffffff');G.text(g,String(left).padStart(2,'0'),r.W-70,15,{scale:2,align:'center',color:P.cyan});
   if(G.sessionPhase==='play'){
    if(ctx.contestants.length>1){ctx.contestants.forEach((c,i)=>{const x=r.W/2+(i-(ctx.contestants.length-1)/2)*82;G.drawPlate(g,x,r.H-35,c.bal,20);const nw=E.font.width(c.name)+12;G.round(g,x-nw/2,r.H-69,nw,13,'#ffffff',3);G.text(g,c.name,x,r.H-65,{align:'center',color:P.ink});G.text(g,c.participating===false?'Practice':c.score+'',x,r.H-10,{align:'center'});});}
    else if(!['step','tray','jog','slalom'].includes(a.family)){const hidden=a.id==='stork'&&ctx.tier===2;G.drawPlate(g,r.W/2,r.H-34,ctx.contestants[0].bal,26,hidden);G.text(g,hidden?'Feel the balance':ctx.contestants[0].bal.inRing?'In balance':'Small corrections',r.W/2,r.H-72,{align:'center',color:P.muted});}
    if(a.id==='stork'&&ctx.time<14&&G.member.day===1)G.tag(g,ctx.time<4?'Lean':ctx.time<8?'Hold':'Recover',15,52);
   }
   if(G.source==='mouse'&&G.sessionPhase==='play'){const q=game.input.pointer();if(q){px.disc(g,q[0],q[1],2,'#ffffff');px.disc(g,q[0],q[1],1,P.cyan);}}
  });
  if(G.sessionPhase==='demonstrate'){G.ribbon(r,G.member.instructor+' demonstrates','Watch the movement. Yours comes next.');}
  if(G.sessionPhase==='countdown')G.ribbon(r,'Breathe in',String(Math.max(1,3-Math.floor(G.phaseTime))));
  if(G.sessionPhase==='play'){a.hud(r,ctx);G.prompt(r,['step'].includes(a.family)?'stepL':a.family==='jog'?'paceL':'lean',a.family==='step'?'Step':a.family==='jog'?'Alternate':'Lean',ctx.contestants.length>1?r.W-174:undefined,ctx.contestants.length>1?47:undefined);}
  if(a.id==='stork'&&ctx.tier===2&&G.sessionPhase==='play')r.overlay(g=>px.blend(g,.13,'normal',()=>px.rect(g,0,42,r.W,r.H-42,'#274554')));
 }
};
G.endSession=()=>{if(G.sessionPhase==='results')return;G.sessionPhase='results';const ctx=G.context;G.result=G.record(ctx);G.go('results',{ctx,result:G.result});};
let resultData,resultMenu,resultAge;
G.scenes.results={view:'brawler',camera:{zoom:false},pausable:true,
 enter(data){resultData=data;G.context=data.ctx;G.result=data.result;resultAge=0;G.resultComment=G.lines.results[data.result.stars][Math.floor(data.ctx.seed%G.lines.results[data.result.stars].length)];G.light();G.jingle(data.result.stars);const ctx=data.ctx;
  resultMenu=new G.Pills([['Again',()=>G.go('session',G.pending)],['Done',()=>G.doneSession(ctx)]],{x:()=>game.W-164,y:()=>game.H-72,w:150,h:24,gap:9,focus:1});
 },
 update(dt){const before=Math.floor(resultAge*28);resultAge+=dt;const after=Math.floor(resultAge*28);if(after>before&&after<G.resultComment.length)G.babble('Tare',G.resultComment[after]);resultMenu.update(dt);G.poseRig(resultData.ctx.contestants[0].rig,'idle',G.time,{dt,clip:resultData.result.stars===3?'Cheering_Two_Hands':'Victory',x:0,y:0});},
 draw(r){G.studio(r,'deck');const out=resultData.result,ctx=resultData.ctx;r.overlay(g=>{G.round(g,12,10,r.W-60,40,'#ffffff');G.round(g,12,55,r.W-24,106,'#f8fcfa',7);G.text(g,'Session complete',r.W/2-14,18,{align:'center',color:P.cyan});G.text(g,ctx.a.name,r.W/2-14,31,{align:'center',scale:2});const starN=Math.min(out.stars,Math.floor(resultAge*4)+1);for(let i=0;i<3;i++)G.text(g,'★',r.W/2-39+i*28,62,{scale:3,color:i<starN?'#dba845':'#d8e3df'});
  G.text(g,Math.round(out.pct*100)+'%',r.W/2,91,{align:'center',scale:3});G.text(g,out.detail,r.W/2,119,{align:'center',color:P.muted});G.drawGerald(g,44,r.H-48,1.2);G.text(g,'+'+out.minutes.toFixed(1)+' min',72,r.H-60,{scale:2,color:P.cyan});G.text(g,'For Gerald',72,r.H-41,{color:P.muted});
  for(let i=0;i<5;i++){const u=(resultAge*.6+i*.19)%1;px.disc(g,42+Math.sin(i)*8,r.H-90+u*33,2,'#e2ba5f');}G.paragraph(g,G.resultComment,14,139,r.W-28,{color:P.ink});});resultMenu.draw(r);}
};
G.doneSession=ctx=>{
 if(G.mode==='class'){G.classDone(ctx);return;}
 if(G.mode==='festival'){G.festivalDone(ctx);return;}
 if(G.mode==='story'){G.member.sessions++;G.member.dailyScores.push(G.result.stars);G.persist();if(G.member.sessions>=3)G.go('evening');else G.go('island');}
 else G.go('catalog',{discipline:ctx.a.discipline});
};
})();
