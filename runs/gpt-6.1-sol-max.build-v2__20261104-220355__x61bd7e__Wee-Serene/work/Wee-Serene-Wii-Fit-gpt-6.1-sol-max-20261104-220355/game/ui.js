(() => {
const G=window.G,E=G.E,{px}=E,P=G.palette;
G.round=(g,x,y,w,h,c,r=5)=>{r=Math.min(r,h/2,w/2);px.rect(g,x+r,y,w-2*r,h,c);px.rect(g,x,y+r,w,h-2*r,c);for(const xx of [x+r,x+w-r-1])for(const yy of [y+r,y+h-r-1])px.disc(g,xx,yy,r,c);};
G.text=(g,s,x,y,o={})=>E.font.text(g,String(s),x,y,o.color||P.ink,{outline:false,shadow:null,...o});
G.wrap=(s,w,scale=1)=>E.font.wrap(String(s),w,{scale,outline:false});
G.paragraph=(g,s,x,y,w,o={})=>{const ls=G.wrap(s,w,o.scale||1);ls.forEach((l,i)=>G.text(g,l,x,y+i*(o.lineHeight||11)*(o.scale||1),o));return ls.length*(o.lineHeight||11)*(o.scale||1);};
G.tag=(g,s,x,y,color=P.cyan)=>{const w=E.font.width(s)+12;G.round(g,x,y,w,13,'#ffffff',3);G.text(g,s,x+6,y+3,{color});};
G.header=(r,small,title)=>r.overlay(g=>{G.text(g,small.toUpperCase(),14,12,{color:P.cyan});G.text(g,title,14,28,{scale:2});});
G.promptText=(action,verb)=>{
 const I=G.game.input;let label;if(action==='lean')label=G.source==='gamepad'?'Left stick':G.source==='mouse'?'Move mouse':'WASD / arrows';else label=G.source==='gamepad'?I.label(action,'gamepad'):G.source==='mouse'?I.label(action,'mouse'):I.label(action,'keyboard');return label+'  '+verb;
};
G.prompt=(r,action,verb,x,y)=>r.overlay(g=>{const s=G.promptText(action,verb),w=E.font.width(s)+14;const xx=x===undefined?r.W-w-12:x,yy=y===undefined?r.H-21:y;G.round(g,xx,yy,w,14,'#ffffff');G.text(g,s,xx+7,yy+4,{color:P.muted});});
G.Pills=class{
 constructor(items,opts={}){this.items=items.map(a=>typeof a==='string'?{label:a}:Array.isArray(a)?{label:a[0],fn:a[1]}:a);this.i=opts.focus||0;this.opts=opts;this.rows=[];this.mouseT=-99;this.age=0;this.layout();}
 layout(){const o=this.opts,w=typeof o.w==='function'?o.w():o.w||172,x=typeof o.x==='function'?o.x():o.x===undefined?(G.game.W-w)/2:o.x,y=typeof o.y==='function'?o.y():o.y===undefined?68:o.y,h=o.h||25,gap=o.gap===undefined?5:o.gap;this.rows=this.items.map((a,i)=>({x,y:y+i*(h+gap),w,h}));}
 update(dt){this.age+=dt;this.layout();if(G.dev.open)return false;const I=G.game.input;let move=0;if(I.repeat('down')||this.opts.horizontal&&I.repeat('right'))move=1;if(I.repeat('up')||this.opts.horizontal&&I.repeat('left'))move=-1;if(move){this.i=(this.i+move+this.items.length)%this.items.length;G.game.audio.sfx('tick');}
 const p=I.pointer(),mt=I.mouse?.t||0;if(p&&mt>this.mouseT&&G.source==='mouse'){const n=this.rows.findIndex(b=>p[0]>=b.x&&p[0]<=b.x+b.w&&p[1]>=b.y&&p[1]<=b.y+b.h);if(n>=0&&n!==this.i){this.i=n;G.game.audio.sfx('tick');}this.mouseT=mt;}
 const click=I.clicked(),ci=click?this.rows.findIndex(b=>click[0]>=b.x&&click[0]<=b.x+b.w&&click[1]>=b.y&&click[1]<=b.y+b.h):-1;
 if(ci>=0)this.i=ci;
 if(this.age>.10&&(ci>=0||((I.pressed('confirm')||I.pressed('start'))&&I.lastDevice!=='mouse'))){const a=this.items[this.i];I.consumeAll();if(!a.disabled){G.game.audio.sfx('pick');a.fn?.(this.i,a);return true;}G.game.audio.sfx('creak');}
 if(I.pressed('cancel')&&this.opts.back){I.consumeAll();this.opts.back();return true;}return false;
 }
 draw(r){r.overlay(g=>{this.rows.forEach((b,i)=>{const a=this.items[i],focus=i===this.i;const grow=focus?1:0;G.round(g,b.x-grow,b.y-grow+2,b.w+grow*2,b.h+grow*2,focus?'#9dcbd2':'#d0e1df',6);G.round(g,b.x-grow,b.y-grow,b.w+grow*2,b.h+grow*2,focus?P.cyan:'#ffffff',6);if(focus)G.text(g,'▸',b.x+8,b.y+(b.h-7)/2,{color:'#ffffff'});const label=typeof a.label==='function'?a.label():a.label;G.text(g,label,b.x+(focus?19:12),b.y+(b.h-7)/2,{color:a.disabled?'#94a8ad':focus?'#ffffff':P.ink});if(a.value){const s=typeof a.value==='function'?a.value():a.value;G.text(g,s,b.x+b.w-10,b.y+(b.h-7)/2,{align:'right',color:focus?'#ffffff':P.cyan});}});});}
};
G.speech=(lines,opts={})=>{G.talk.say(lines,{name:opts.name||'Tare',portrait:opts.name&&opts.name!=='Tare'?G.instructorRig(opts.name,1):((g,x,y,size)=>G.drawTare(g,x+size/2,y+size*.78,size/28,'happy')),onDone:opts.done,auto:opts.auto,...opts});};
G.ribbon=(r,s,sub)=>r.overlay(g=>{const w=Math.min(280,r.W-28),x=(r.W-w)/2;G.round(g,x,56,w,39,'#ffffff',6);G.text(g,s,r.W/2,64,{scale:2,align:'center'});if(sub)G.text(g,sub,r.W/2,83,{align:'center',color:P.muted});});
G.dots=(g,n,total,x,y,color=P.cyan)=>{for(let i=0;i<total;i++){px.disc(g,x+i*9,y,2.5,i<n?color:'#d5e3e4');}};
G.flower=(g,x,y,m=G.member)=>{G.disciplines.forEach((d,i)=>{const aa=Object.values(G.activities).filter(a=>a.discipline===d.id),v=aa.reduce((s,a)=>s+(m.best[a.id+'-1']?.stars||0),0)/9;const a=i*Math.PI/2-Math.PI/4;px.ell(g,x+Math.cos(a)*9,y+Math.sin(a)*9,6+v*3,6+v*3,E.mix('#e3ecec',d.color,Math.max(.18,v)));});px.disc(g,x,y,4,'#fff6d5');};
G.dayHUD=r=>r.overlay(g=>{G.round(g,10,9,100,28,'#ffffff');G.text(g,'Day '+Math.min(G.member.day,5),17,15,{color:P.cyan});G.text(g,G.DAYS[Math.min(4,G.member.day-1)].name,17,26);G.dots(g,G.member.sessions,3,91,20);const xx=r.W-132;G.round(g,xx,9,83,28,'#ffffff');G.text(g,'Spine '+G.member.spineAge,xx+8,15);G.text(g,G.member.minutes.toFixed(1)+' min',xx+8,26,{color:P.muted});});
G.paper=r=>{r.sky(['#eaf5f5','#f6fafa']);r.overlay(g=>{for(let x=8;x<r.W;x+=24)for(let y=8;y<r.H;y+=24)px.dot(g,x,y,'#dcebec');});};
})();
(() => {
const G=window.G;
G.activityControls=a=>{const src=G.source,I=G.game.input,label=x=>I.label(x,src==='gamepad'?'gamepad':src==='mouse'?'mouse':'keyboard'),lean=src==='gamepad'?'Left stick':src==='mouse'?'Move the mouse':'WASD / arrows: small nudges';
 if(a.family==='step')return src==='gamepad'?'D-pad or stick flicks. Step on the click.':src==='mouse'?'Left / right click. Wheel for forward / back.':'A / D or left / right arrows. Step on the click.';
 if(a.family==='hoop')return (src==='gamepad'?'Circle left stick. ':src==='mouse'?'Circle the mouse. ':'W → D → S → A. ')+label('catchL')+' / '+label('catchR')+' to catch.';
 if(a.family==='jog')return label('paceL')+' then '+label('paceR')+' to step. '+lean+' to steer.';
 if(a.family==='laundry')return lean+'. '+label('breath')+' to walk. '+label('jump')+' to jump.';
 if(a.id==='flow')return lean+'. '+label('breath')+': hold to inhale, release to exhale.';
 if(a.family==='slalom')return lean+'. Forward to tuck, back to brake.';
 return lean+'. '+(a.family==='rep'?'Lean back to lower. Hold halfway.':a.family==='candle'?'Slow corrections protect the flame.':'Return gently toward the ring.');
};
})();
