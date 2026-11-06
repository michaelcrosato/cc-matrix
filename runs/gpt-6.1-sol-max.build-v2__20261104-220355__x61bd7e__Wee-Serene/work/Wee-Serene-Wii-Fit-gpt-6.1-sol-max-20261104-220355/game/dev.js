(() => {
const G=window.G,E=G.E,game=G.game,P=G.palette,{px,clamp}=E;
G.openDev=()=>{if(G.inSession||G.dev.open)return;const I=game.input;G.dev.savedInput=I.preset;I.use({...I.preset,devUp:['ArrowUp','Pad12'],devDown:['ArrowDown','Pad13'],devLeft:['ArrowLeft','Pad14'],devRight:['ArrowRight','Pad15'],devMore:['Tab','Pad3'],devPage:['KeyR','Pad2'],devConfirm:['Enter','Pad0'],devCancel:['Escape','Pad1']});I.consumeAll();G.dev.open=true;};
G.closeDev=()=>{if(G.dev.savedInput){game.input.use(G.dev.savedInput);G.dev.savedInput=null;game.input.consumeAll();}G.dev.open=false;};
const groups=['Tools','Lean','Scoring','Cardio','Games','World','Pose','Jump'];let rows=[],boxes=[],drag=-1,lastClick=0;
G.devRows=()=>{
 const d=G.dev;
 if(d.group==='Tools')return [
  {label:'Activity jump',act:()=>{d.group='Jump';d.page=0;d.row=0;}},
  {label:'Day',key:'day',value:()=>d.day,change:s=>d.day=clamp(d.day+s,1,6),act:()=>{G.member.day=d.day;G.member.checked=false;G.go('bungalow');}},
  {label:'Finish with stars',value:()=>d.stars,change:s=>d.stars=clamp(d.stars+s,0,3),act:()=>{if(G.context){const ctx=G.context;G.sessionPhase='results';const st=d.stars,pct=st===3?1:st===2?.8:st===1?.5:.1;G.result={pct,stars:st,minutes:1,detail:'Developer finish'};if(!G.attracting){G.member.best[ctx.a.id+'-'+ctx.tier]={pct,stars:st};G.member.minutes++;G.refreshAge();G.persist();}G.go('results',{ctx,result:G.result});}}},
  {label:'Unlock all',act:()=>{G.member.ended=true;G.member.day=6;for(const a of Object.values(G.activities))G.member.best[a.id+'-1']={stars:3,pct:1};G.member.spineAge=G.calculateAge();G.persist();}},
  {label:'+10 minutes',act:()=>{G.member.minutes+=10;G.persist();}},
  {label:'Spine Age',value:()=>G.member.spineAge,change:s=>{G.member.spineAge=clamp(G.member.spineAge+s,19,71);}},
  {label:'Reset this member',act:()=>{G.member=G.memberDefault();G.persist();G.go('bungalow');}},
  {label:'No stumbles',value:()=>d.noFalls?'On':'Off',change:()=>d.noFalls=!d.noFalls,act:()=>d.noFalls=!d.noFalls},
  {label:'Bot plays',value:()=>d.bot||'Off',change:s=>{const a=[null,'poor','average','good','expert'];d.bot=a[(a.indexOf(d.bot)+s+5)%5];},act:()=>{const a=[null,'poor','average','good','expert'];d.bot=a[(a.indexOf(d.bot)+1)%5];}},
  {label:'Plate numbers',value:()=>d.trace?'On':'Off',act:()=>d.trace=!d.trace,change:()=>d.trace=!d.trace},
  {label:'Freeze / frame step',value:()=>d.frame?'Frozen':'Running',act:()=>{d.frame=!d.frame;G.stepFrame=true;},change:()=>{d.frame=true;G.stepFrame=true;}},
  {label:'Force attract',act:()=>{G.startAttract();}},
  {label:'Pose viewer',act:()=>{G.go('pose');}},
  {label:'Log snapshot',act:()=>{console.log(JSON.stringify(game.debug.snapshot(),null,2));game.note('Snapshot in console');}},
  {label:'Reset all defaults',act:()=>G.resetDev()}
 ];
 if(d.group==='Jump')return Object.values(G.activities).map(a=>({label:a.name,value:()=>d.tier,change:s=>d.tier=clamp(d.tier+s,1,2),act:()=>G.startSession(a.id,d.tier,'free')})).concat([{label:'Title',act:()=>G.go('title')},{label:'Island',act:()=>G.go('island')},{label:'Body Check',act:()=>G.go('bodycheck')},{label:'Evening',act:()=>G.go('evening')},{label:'Gentle Games',act:()=>G.go('games')},{label:'Ending',act:()=>G.go('ending')},{label:'Free Play',act:()=>{G.member.ended=true;G.mode='free';G.go('catalog');}},{label:'Class',act:()=>G.go('classLobby')}]);
 if(d.group==='Pose')return [{label:'Clip',value:()=>d.pose,change:s=>{const names=G.lib.names;d.pose=names[(names.indexOf(d.pose)+s+names.length)%names.length];}},{label:'Time',value:()=>d.poseTime.toFixed(2),change:s=>d.poseTime=clamp(d.poseTime+s*.1,0,G.lib.clip(d.pose).dur)},{label:'Open viewer',act:()=>G.go('pose')},{label:'Print pose row',act:()=>{console.log(JSON.stringify({clip:d.pose,a:+d.poseTime.toFixed(2),b:+(d.poseTime+.5).toFixed(2),tgt:1.57}));game.note('Pose row in console');}}];
 return G.DEFS.filter(x=>x[6]===d.group).map(a=>({label:a[1],key:a[0],min:a[2],max:a[3],step:a[4],default:a[5],value:()=>G.DEV[a[0]].toFixed(a[4]<1?2:0),change:s=>{G.DEV[a[0]]=clamp(G.DEV[a[0]]+s*a[4],a[2],a[3]);if(a[0]==='timeScale')game.timeScale=G.DEV.timeScale;}})).concat([{label:'Reset all defaults',act:()=>{G.resetDev();game.timeScale=1;}}]);
};
G.devUpdate=dt=>{
 if(G.inSession||!G.dev.open)return;const d=G.dev,I=game.input;rows=G.devRows();const count=Math.ceil(rows.length/5),pageRows=rows.slice(d.page*5,d.page*5+5);d.row=clamp(d.row,0,pageRows.length-1);
 if(I.pressed('devCancel')){G.closeDev();return;}
 if(I.pressed('devMore')){d.group=groups[(groups.indexOf(d.group)+1)%groups.length];d.page=0;d.row=0;I.consumeAll();return;}
 if(I.repeat('devDown'))d.row=(d.row+1)%pageRows.length;if(I.repeat('devUp'))d.row=(d.row+pageRows.length-1)%pageRows.length;
 const current=pageRows[d.row];let change=I.repeat('devRight')?1:I.repeat('devLeft')?-1:0;if(I.down('catchL')||I.down('catchR'))change*=5;if(change)current?.change?.(change);
 if(I.pressed('devConfirm')){current?.act?.();I.consumeAll();}
 if(I.pressed('devPage')){d.page=(d.page+1)%count;d.row=0;}
 const click=I.clicked();if(click){if(click[0]<game.W*.39&&click[1]<37){d.group=groups[(groups.indexOf(d.group)+1)%groups.length];d.page=0;d.row=0;}
 else if(click[0]<game.W*.39&&click[1]>game.H-32){d.page=(d.page+1)%count;d.row=0;}
 else{const n=boxes.findIndex(b=>click[0]>=b.x&&click[0]<=b.x+b.w&&click[1]>=b.y&&click[1]<=b.y+b.h);if(n>=0){d.row=n;const row=pageRows[n];if(row?.change)row.change(click[0]>game.W*.23?1:-1);else row?.act?.();}}I.consumeAll();}
 const p=I.pointer();if(I.down('breath')&&G.source==='mouse'&&p){const n=boxes.findIndex(b=>p[0]>=b.x&&p[0]<=b.x+b.w&&p[1]>=b.y+12&&p[1]<=b.y+b.h);const row=pageRows[n];if(row?.key&&row.min!==undefined){const b=boxes[n],v=clamp((p[0]-b.x-5)/(b.w-10),0,1);G.DEV[row.key]=Math.round((row.min+v*(row.max-row.min))/row.step)*row.step;if(row.key==='timeScale')game.timeScale=G.DEV.timeScale;}}
};
G.devDraw=r=>{const d=G.dev;rows=G.devRows();const pageRows=rows.slice(d.page*5,d.page*5+5),w=Math.max(143,Math.floor(r.W*.39));r.overlay(g=>{G.round(g,4,4,w-4,r.H-8,'#f9fdfb');G.text(g,'DEV / '+d.group,12,13,{color:P.cyan});const device=G.source==='gamepad'?'gamepad':'keyboard';G.text(g,game.input.label('devMore',device)+' category  '+game.input.label('devCancel',device)+' close',12,27,{color:P.muted});boxes=[];pageRows.forEach((row,i)=>{const x=9,y=44+i*30,ww=w-13,focus=i===d.row;boxes.push({x,y,w:ww,h:27});if(focus)G.round(g,x,y,ww,27,'#d5eee9');G.text(g,row.label,x+4,y+3);if(row.value)G.text(g,String(row.value()),x+ww-4,y+15,{align:'right',color:P.cyan});if(row.key&&row.min!==undefined){const v=(G.DEV[row.key]-row.min)/(row.max-row.min);px.rect(g,x+5,y+19,ww-51,2,'#bed5d4');px.rect(g,x+5,y+19,(ww-51)*v,2,P.cyan);px.disc(g,x+5+(ww-51)*v,y+19,2,P.cyan);G.text(g,'D '+row.default,x+5,y+12,{color:P.muted});}});G.text(g,game.input.label('devPage',G.source==='gamepad'?'gamepad':'keyboard')+': page '+(d.page+1)+' / '+Math.ceil(rows.length/5),12,r.H-21,{color:P.cyan});});};
let rig,menu;
G.scenes.pose={view:'brawler',camera:{zoom:false},pausable:true,enter(){G.light();rig=G.playerRig(2);G.openDev();G.dev.group='Pose';},update(dt){G.poseRig(rig,'idle',G.dev.poseTime,{dt,clip:G.dev.pose,x:40,y:0});if(game.input.pressed('cancel')&&!G.dev.open)G.go('title');},draw(r){G.studio(r,'iron');G.drawRig(r,rig,40,0);r.overlay(g=>{G.text(g,G.dev.pose,r.W-15,55,{align:'right',color:P.cyan});G.text(g,G.dev.poseTime.toFixed(2)+' seconds',r.W-15,70,{align:'right'});});}};
})();
