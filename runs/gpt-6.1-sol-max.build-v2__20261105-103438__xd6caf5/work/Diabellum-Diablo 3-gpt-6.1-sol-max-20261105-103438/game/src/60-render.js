function text(g,str,x,y,c=IVORY,o={}){E.font.text(g,String(str),Math.round(x),Math.round(y),c,{outline:false,shadow:'#070c12',...o});}
function smallBox(g,x,y,w,h,accent=GOLD,alpha=.94){E.ui.box(g,x,y,w,h,{bg:[PANEL,INK],border:accent,alpha});px.line(g,x+2,y+2,x+w-3,y+2,'#344247');}
function ornate(g,x,y,w,h,c=GOLD){smallBox(g,x,y,w,h,c);for(const [xx,yy,dx,dy] of [[x,y,1,1],[x+w-1,y,-1,1],[x,y+h-1,1,-1],[x+w-1,y+h-1,-1,-1]]){px.line(g,xx,yy,xx+dx*9,yy,c);px.line(g,xx,yy,xx,yy+dy*9,c);px.dot(g,xx+dx*3,yy+dy*3,c);}}
function icon(g,id,x,y,size,color=GOLD){
  const sc=size/24,cx=x+size/2,cy=y+size/2,ln=(a,b,c,d,w=1)=>px.line(g,cx+a*sc,cy+b*sc,cx+c*sc,cy+d*sc,color,Math.max(1,w*sc));
  const verb=DB.skill[id]?.verb||id;
  if(['bell','clap','knell'].includes(verb)||id==='clap'||id==='knell'||id==='hour')bellArt(g,cx,cy,sc*.53);
  else if(['cone','charge','spade'].includes(verb)){ln(-6,7,6,-7,2);ln(2,-7,8,-1,2);ln(-7,2,-2,7);}
  else if(verb==='bolt'||verb==='wave'){ln(-8,6,8,-6,2);ln(1,-6,8,-6);ln(8,-6,8,1);ln(-7,-3,-2,-7);}
  else if(verb==='chain'){for(let i=-1;i<2;i++){ln(i*6-3,-4,i*6+3,4,2);ln(i*6-2,3,i*6+3,-3);}}
  else if(verb==='beam'){ln(-8,5,8,-5,2);ln(-8,1,7,-8);ln(-5,8,8,-1);}
  else if(verb==='guard'||verb==='heal'){px.poly(g,[[cx-7*sc,cy-7*sc],[cx+7*sc,cy-7*sc],[cx+6*sc,cy+3*sc],[cx,cy+9*sc],[cx-6*sc,cy+3*sc]],E.shade(color,-.5));ln(-6,-6,6,-6);ln(0,-4,0,5,2);ln(-4,0,4,0,2);}
  else if(verb==='summon'||verb==='corpse'){px.disc(g,cx,cy-2*sc,6*sc,color);px.rect(g,cx-4*sc,cy-2*sc,2*sc,2*sc,INK);px.rect(g,cx+2*sc,cy-2*sc,2*sc,2*sc,INK);ln(-3,4,3,4,2);ln(-6,8,6,8);}
  else if(verb==='lob'||verb==='area'){ln(-7,7,-5,-1);ln(-5,-1,0,-6);ln(0,-6,5,-1);ln(5,-1,7,7);px.disc(g,cx,cy-7*sc,2*sc,color);ln(-4,7,4,7,2);}
  else if(verb==='leap'||verb==='blink'){ln(-8,6,-1,-7,2);ln(-1,-7,7,0,2);ln(-1,-7,-5,-5);ln(7,0,7,6);ln(4,6,9,6);}
  else {for(let i=0;i<8;i++){const a=i*Math.PI/4;ln(Math.cos(a)*4,Math.sin(a)*4,Math.cos(a)*9,Math.sin(a)*9);}px.disc(g,cx,cy,3*sc,color);}
}
function drawGlass(r,x,y,z=0,size=78){
  const cols=['#5a83af','#ab6979','#d9b975','#688e8d','#8c79a5','#b77863'];
  r.decal(g=>px.blend(g,.26,'add',()=>{
    const center=r.w(x,y,z),rotation=Math.sin((W?.time||0)*.07)*.04;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6+rotation,points=[center,...[a,a+Math.PI/6].map(v=>r.w(x+Math.cos(v)*size,y+Math.sin(v)*size,z))];px.poly(g,points,cols[i%cols.length]);
      const p=r.w(x+Math.cos(a)*size,y+Math.sin(a)*size,z);px.line(g,center[0],center[1],p[0],p[1],'#17212b');
    }
    const pts=r.groundPts(x,y,size*.63,12,z);for(let i=0;i<12;i++)px.line(g,...pts[i],...pts[(i+1)%12],'#273e48',2);
  }),{emissive:.2});
  game.lights.add(x,y,z+3,size*1.3,.4,{color:'#87bfc1'});
}
function drawProp(r,p,w){
  if(p.broken){r.decal(g=>{const q=r.w(p.x,p.y,0);for(let i=0;i<4;i++)px.line(g,q[0]-7+i*4,q[1]+(i%2)*3,q[0]-3+i*4,q[1]-1,'#65544a',2);});return;}
  const x=p.x,y=p.y;
  if(p.type==='deadTree')r.shape('tree',x,y,0,{params:{h:45,seed:p.seed},mats:{bark:'#4c5651',leaves:'#414b46'},facing:p.facing,hides:true});
  else if(p.type==='hangingBell'){r.shape('parishBell',x,y,25,{scale:1.3,facing:0});r.shape('chain',x,y,54,{scale:.7});}
  else if(['headstone','pew','urn','chain','anvil','crate','barrel','rock','bush'].includes(p.type))r.shape(p.type,x,y,0,{facing:p.facing||0,scale:p.type==='headstone'?1.05:1,pick:p.breakable?p:null});
  else if(p.type==='pillar')r.shape('spire',x,y,0,{scale:.9});
  else r.prop(p.type,x,y,0,{size:1.2,light:true,pick:p.breakable?p:null});
}
function drawObject(r,o,w){
  const x=o.x,y=o.y,t=w.time;
  if(['forge','pawn','agnes'].includes(o.type)){const rig=npcRig(o.type);r.actor(x-19,y-6,0,(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{pick:o});}
  if(o.type==='exit'||o.type==='lychgate'||o.type==='vigilDoor'||o.type==='returnPortal'||o.type==='sideCrypt'){
    r.shape('lychgate',x,y,0,{scale:o.type==='exit'?1.4:1,pick:o});const active=o.type!=='exit'||objectiveReady(w);
    r.decal(()=>{r.groundRing(x,y,22,active?TEAL:'#716856',.7);if(active)r.groundRing(x,y,18+Math.sin(t*2)*3,TEAL,.3);});
    if(active){game.lights.add(x,y,22,70,.7,{color:TEAL});}
    if(o.type==='exit')r.textAt(x,y,65,active?'ONWARD':'SEALED',active?TEAL:GOLD);
  }else if(o.type==='quillon'||o.type==='quillonTown'){
    if(o.used&&o.type==='quillon')return;r.queue(x,y,15,g=>{const p=r.w(x,y,16+Math.sin(t*2));lanternArt(g,p[0],p[1],1.3,w.dialogue?Math.sin(t*20)*.5+.5:0);},{pick:o});game.lights.add(x,y,18,60,.6,{color:'#bad9a3'});
  }else if(o.type==='forge'){r.shape('anvil',x,y,0,{scale:1.6,pick:o});r.prop('brazier',x-20,y-15,0,{size:1.5,light:true});}
  else if(o.type==='pawn'){r.shape('table',x,y,0,{scale:1.4,pick:o});r.prop('chest',x+14,y,0);r.prop('lantern',x,y,19,{light:true});}
  else if(o.type==='agnes'){for(let i=0;i<6;i++)r.prop('candle',x+i*4-12,y+(i%2)*4,0,{size:1.7,light:true,pick:o});}
  else if(o.type==='stash'||o.type==='chest'||o.type==='cursed')r.prop('chest',x,y,0,{size:1.5,open:o.used,pick:o});
  else if(o.type==='campfire'){r.prop('brazier',x,y,0,{size:1.2,light:true,pick:o});for(let i=0;i<3;i++)r.shape('stool',x+Math.cos(i*2)*25,y+Math.sin(i*2)*25,0);}
  else if(o.type==='dog')r.actor(x,y,0,(g,ox,oy)=>{px.ell(g,ox,oy-5,7,4,'#b8a17e');px.disc(g,ox+6,oy-9,4,'#b8a17e');px.line(g,ox-4,oy-3,ox-4,oy+2,'#8d7961',2);px.line(g,ox+3,oy-3,ox+3,oy+2,'#8d7961',2);px.line(g,ox-5,oy-7,ox-10,oy-12+Math.sin(t*9)*2,'#b8a17e',2);px.dot(g,ox+7,oy-10,INK);},{pick:o});
  else if(o.type==='chapel'){r.shape('spire',x-15,y,0,{scale:.6});r.prop('brazier',x,y,0,{size:1.5,light:!!o.used,pick:o});if(o.used)game.lights.add(x,y,16,90,.8,{color:'#f0c982'});}
  else if(o.type==='trap'){r.prop('chandelier',x,y,o.used?2+(o.falling||0)/.55*60:62,{size:1.8,light:!o.used});r.shape('headstone',x+12,y,0,{pick:o});if(!o.used)r.queue(x,y,60,g=>{const a=r.w(x,y,85),b=r.w(x,y,62);px.line(g,a[0],a[1],b[0],b[1],'#8b8873');});}
  else if(o.type==='lore'){if(!o.used)r.queue(x,y,2,g=>{const p=r.w(x,y,4+Math.sin(t*2));px.poly(g,[[p[0]-5,p[1]-2],[p[0]+3,p[1]-4],[p[0]+5,p[1]+2],[p[0]-3,p[1]+4]],'#d4c49e');px.line(g,p[0]-2,p[1],p[0]+2,p[1]-1,'#887f68');},{pick:o});}
  else if(o.type==='epitaph'||o.type==='unquiet')r.shape('headstone',x,y,0,{pick:o,scale:1.4});
  else if(o.type==='oldBell')r.shape('parishBell',x,y,-10,{scale:4.5,facing:1,pick:o});
  else if(o.type==='regentTalk'){
    let rig=viewRigs.get('regentTalk');if(!rig){rig={rig:new E.Humanoid({size:1.4,build:'heroic',outfit:'robe',weapon:null,hair:'long',colors:{skin:'#d4c7ad',hair:'#d1d0b9',cloth:'#b4ac9d',trim:GOLD}})};viewRigs.set('regentTalk',rig);}
    r.actor(x,y,0,(g,ox,oy)=>rig.rig.draw(g,ox,oy,r.view),{pick:o});
  }else if(o.type==='caravan')r.shape('cart',x,y,0,{scale:1.8,facing:-Math.PI/4,pick:o});
  else if(o.type==='sluice'){r.shape('sluice',x,y,0,{pick:o});if(o.used)r.decal(()=>r.groundDisc(x,y,35,'#d8944c',.4));}
  else if(o.type==='brazier')r.prop('brazier',x,y,0,{light:o.active,size:1.8,pick:o});
  else if(o.type==='hangingBell'){r.shape('parishBell',x,y,55,{scale:2.2,pick:o});r.shape('chain',x,y,112,{scale:1});r.decal(()=>r.groundDisc(x,y,38,'#16232b',.65));}
  else if(o.type==='tongue'){if(w.angelusKneeling){r.shape('parishBell',x,y,0,{scale:1.8,pick:o});r.decal(()=>r.groundRing(x,y,25,TEAL,.7));}}
  else if(o.type==='pylon'||o.type==='shrine'){r.shape('spire',x,y,0,{scale:.6,pick:o});if(!o.used){r.prop('crystal',x,y,37,{size:1.2,color:TEAL,light:true});game.lights.add(x,y,35,60,.7,{color:TEAL});}}
  else if(o.type==='sermon'){r.prop('banner',x,y,0,{size:1.6,pick:o});for(let i=0;i<Math.max(0,6-(o.converted||0));i++)r.prop('statue',x+20+(i%3)*14,y+15+Math.floor(i/3)*15,0,{size:.55});}
  else if(o.type==='bigEwe')r.prop('statue',x,y,0,{size:1.8,pick:o});
  if(currentHover===o)r.decal(()=>r.groundRing(x,y,12,IVORY));
}
function drawWorld(r,w=W,options={}) {
  if(!w?.map)return;const z=DB.zone[w.zone],theme=THEMES[z.theme];
  w.map.drawFloor(r);
  if(z.theme==='works'){
    r.decal(g=>{for(let i=0;i<3;i++){const x=w.width*(.25+i*.22),y0=w.height*.1,y1=w.height*.9;px.poly(g,[[x-10,y0],[x+10,y0],[x+10,y1],[x-10,y1]].map(([xx,yy])=>r.w(xx,yy,0)),'#382d2a');px.poly(g,[[x-6,y0],[x+6,y0],[x+6,y1],[x-6,y1]].map(([xx,yy])=>r.w(xx,yy,0)),'#be7845');for(let y=y0;y<y1;y+=15){const a=r.w(x-10,y,1),b=r.w(x+10,y,1);px.line(g,...a,...b,'#6a6254',2);}}});
    r.shape('parishBell',w.width*.7,w.height*.37,-8,{scale:3,mats:{b:w.flags.includes('bellRecast')?'bellBronze':'holyIron'}});
  }
  for(const d of w.decals.slice(-100))if(r.visible(d.x,d.y,0))r.decal(()=>r.groundDisc(d.x,d.y,d.r,game.settings.blood==='wax'?'#b7a984':game.settings.blood==='none'?'#303c3b':'#693a45',.45));
  if(['nave','chapterhouse','audience','mothcourt','chamber'].includes(w.zone))for(let i=0;i<4;i++){
    const x=w.width*(.3+i*.13),y=w.height*(.68-i*.13);drawGlass(r,x,y,0,65);r.prop('window',x-35,y-40,54,{size:2.3,colors:['#6e9ab2','#b88a73','#c5ab71'],light:true});
  }
  if(w.zone==='town'||w.zone==='prologue'){
    r.shape('parishBell',w.width*.5,w.height*.5,-12,{scale:3.1,facing:Math.sin(w.time*.3)*.03});r.decal(()=>r.groundRing(w.width*.5,w.height*.5,65,'#282e31',.8));
    for(let i=0;i<12;i++){const a=i*Math.PI/6;r.prop('candle',w.width*.5+Math.cos(a)*68,w.height*.5+Math.sin(a)*68,0,{size:1.4,light:true});}
  }
  if(z.layout==='halls'||z.layout==='boss'||z.theme==='heaven')for(let i=0;i<5;i++){
    const t=.12+i*.18,x=lerp(w.spawn.x,w.exit.x,t),y=lerp(w.spawn.y,w.exit.y,t);
    for(const side of [-1,1]){r.shape('spire',x+side*83,y+side*83,0,{scale:z.layout==='boss'?1.3:1});r.prop('candelabra',x+side*65,y+side*65,0,{size:1.4,light:true});}
  }
  w.map.queueWalls(r);
  for(const p of w.props)if(r.visible(p.x,p.y,0))drawProp(r,p,w);
  for(const o of w.objects)if(r.visible(o.x,o.y,0,100))drawObject(r,o,w);
  for(const c of w.corpses)if(!c.used&&r.visible(c.x,c.y,c.z)){
    const rig=viewRigs.get(c.id)?.rig;if(rig)r.actor(c.x,c.y,c.z-(c.age>40?(c.age-40)*3:0),(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{outline:false,alpha:c.age>40?(45-c.age)/5:.75});
  }
  for(const h of w.hazards){
    const ratio=clamp(h.t/h.delay,0,1),radius=h.expand&&h.t>=h.delay?(h.t-h.delay)/(h.life-h.delay)*h.r:h.r;
    r.decal(()=>{
      if(h.shape==='pool'){r.groundDisc(h.x,h.y,h.r,h.color,.23);r.groundRing(h.x,h.y,h.r*(.8+Math.sin(w.time*4)*.1),h.color,.4);}
      else if(h.shape==='ring'){r.groundRing(h.x,h.y,radius,h.color,.9);if(h.expand&&h.t>=h.delay)r.groundRing(h.x,h.y,Math.max(0,radius-5),h.color,.5);}
      else if(h.shape==='line'||h.shape==='cone')r.groundArc(h.x,h.y,0,h.r*ratio,(h.a||0)-(h.shape==='line'?.08:h.half||1),(h.a||0)+(h.shape==='line'?.08:h.half||1),h.color,.35);
      else{r.groundDisc(h.x,h.y,h.r*ratio,h.color,.22);r.groundRing(h.x,h.y,h.r,h.color,.85);}
    },{emissive:.5});
    if(['bell','candle'].includes(h.shape))r.queue(h.x,h.y,75,g=>{const p=r.w(h.x,h.y,90*(1-ratio)+8);if(h.shape==='bell')bellArt(g,p[0],p[1],1.8);else{px.rect(g,p[0]-3,p[1]-16,6,17,'#e2c29b');px.disc(g,p[0],p[1]-19,3,'#f4c77f');}},{emissive:true});
  }
  for(const d of w.drops)if(r.visible(d.x,d.y,d.z)){
    if(d.type==='item'){
      const c=RARITY[d.item.rarity].color,rare=d.item.rarity>=4;const locals=w.heroes.filter(h=>!h.follower),owner=locals.find(h=>h.id===d.owner);if(locals.length>1&&owner){r.decal(()=>r.groundRing(d.x,d.y,7,owner.color,.9));r.textAt(d.x,d.y,10,'P'+(locals.indexOf(owner)+1),owner.color);}
      if(rare){r.queue(d.x,d.y,0,g=>{const p=r.w(d.x,d.y,0),top=r.w(d.x,d.y,95);px.blend(g,.2,'add',()=>{px.poly(g,[[p[0]-4,p[1]],[top[0]-1,top[1]],[top[0]+1,top[1]],[p[0]+4,p[1]]],c);});px.line(g,p[0],p[1],top[0],top[1],c);},{emissive:true});game.lights.add(d.x,d.y,15,60,.9,{color:c});r.decal(()=>r.groundRing(d.x,d.y,9+Math.sin(w.time*2)*2,c,.6));}
      r.queue(d.x,d.y,4,g=>{const p=r.w(d.x,d.y,5+Math.sin(w.time*3+d.id)*2);px.poly(g,[[p[0]-4,p[1]],[p[0],p[1]-4],[p[0]+4,p[1]],[p[0],p[1]+4]],c);px.dot(g,p[0]-1,p[1]-2,IVORY);},{pick:d,emissive:true});
      const main=getMain(w),visible=rare||game.settings.lootLabels==='all'||game.input.down('labels')||main&&dist(main,d)<38;
      if(visible&&d.owner===main?.id)r.textAt(d.x,d.y,15,(rare?'★ ':'')+itemName(d.item),c);
    }else r.queue(d.x,d.y,6,g=>{const p=r.w(d.x,d.y,d.type==='votive'?9+Math.sin(w.time*4+d.id)*2:2);if(d.type==='votive'){px.disc(g,p[0],p[1],3,'#f3d694');px.disc(g,p[0],p[1]-2,2,'#fff1c1');}else{px.ell(g,p[0],p[1],2,1,'#cdb072');px.dot(g,p[0],p[1]-1,'#f0dba0');}},{emissive:true});
  }
  for(const f of w.foes){
    const rig=ensureRig(f),body=DB.monster[f.kind]?.body,fz=f.z+(body==='ghost'?10+Math.sin(w.time*3+f.id)*2:0);
    r.shadow(f.x,f.y,f.r+2,.25);r.actor(f.x,f.y,fz,(g,ox,oy)=>rig.draw(g,ox,oy+(f.spawn>0?f.spawn*15:0),r.view),{outline:!!(f.boss||f.elite||currentHover===f),flash:f.flash>0?'#f9e8c5':null,flashMix:.7,alpha:f.kind==='unvoiced'&&Math.hypot(f.vx,f.vy)<10?.35:1,pick:f});
    if(f.ringing)r.decal(()=>{for(let i=0;i<f.ringing;i++)r.groundRing(f.x,f.y,9+i*4+Math.sin(w.time*5)*1.2,GOLD,.7);});
    if(f.elite||f.hp<f.maxHp&&currentHover===f){const [x,y]=r.w(f.x,f.y,f.boss?70:45);r.overlay(g=>{const cc=f.elite==='rare'?GOLD:'#9ab9e5';px.rect(g,x-13,y,26,3,INK);px.rect(g,x-12,y+1,24*f.hp/f.maxHp,1,cc);if(f.elite)text(g,f.name,x,y-10,cc,{align:'center'});});}
    if(f.reflect>0)r.decal(()=>r.groundRing(f.x,f.y,19,'#f2d9a5'));
  }
  for(const a of w.allies){const rig=viewRigs.get(a.id)?.rig;if(rig){r.shadow(a.x,a.y,5,.3);r.actor(a.x,a.y,0,(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{outline:false});}}
  for(const h of w.heroes){const rig=ensureRig(h,true),z=h.z+(h.travelAnim>0?Math.sin(h.travelAnim/.4*Math.PI)*22:0);
    r.decal(()=>r.groundRing(h.x,h.y,9,h.color,.8));r.shadow(h.x,h.y,7,.35);
    r.actor(h.x,h.y,z,(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{xray:{color:h.color},flash:h.hurt>0?'#fff0da':null,flashMix:.6,alpha:h.stealth>0?.45:1,pick:h});rig.drawSmear?.(r,[IVORY,GOLD,'#a78355','#6d584b']);
    if(!w.flags.includes('bookBurned')&&h.id===w.heroes[0].id&&(w.flags.includes('quillonRescued')||w.zone!=='prologue'))r.queue(h.x,h.y,z+8,g=>{const p=r.w(h.x-8,h.y+4,z+10);lanternArt(g,p[0],p[1],.5,w.dialogue?.5:0);});
    game.lights.add(h.x,h.y,22,h.kind==='lamplighter'?lanternRadius(h):72,.8,{color:h.kind==='lamplighter'?'#f2bc6b':'#c3bc97'});
    if(w.heroes.length>1)r.textAt(h.x,h.y,z+49,h.name,h.color);
  }
  for(const b of w.shots)r.queue(b.x,b.y,b.z,g=>{const p=r.w(b.x,b.y,b.z),q=r.w(b.x-b.vx*.035,b.y-b.vy*.035,b.z);px.line(g,p[0],p[1],q[0],q[1],b.color,2);px.disc(g,p[0],p[1],2,IVORY);},{emissive:true});
  drawEffects(r,w);
  if(CHEATS.overlays)r.decal(g=>{for(const u of [...w.heroes,...w.foes]){r.groundRing(u.x,u.y,u.r,u.team==='hero'?TEAL:'#e4977f');const a=r.w(u.x,u.y,0),b=r.w(u.x+Math.cos(u.facing)*18,u.y+Math.sin(u.facing)*18,0);px.line(g,...a,...b,GOLD);}const h=getMain(w);if(h)for(let iy=-5;iy<=5;iy++)for(let ix=-5;ix<=5;ix++){const x=Math.floor(h.x/16)*16+ix*16+8,y=Math.floor(h.y/16)*16+iy*16+8,d=w.flow.dir(x,y,h.x,h.y),a=r.w(x,y,0),b=r.w(x+d[0]*6,y+d[1]*6,0);px.line(g,...a,...b,'#72948b');}});
  if(options.hud!==false)drawHUD(r,w);
}
function drawEffects(r,w){
  for(const f of w.fx){const u=f.t/f.life,alpha=1-u;
    if(['ring','nova','rise','blink','leap'].includes(f.verb))r.decal(()=>{r.groundRing(f.x,f.y,(f.r||40)*u,f.color||GOLD,alpha);r.groundRing(f.x,f.y,(f.r||40)*u*.7,f.color||GOLD,alpha*.6);});
    else if(f.verb==='cone')r.decal(()=>r.groundArc(f.x,f.y,f.r*(.3+u*.5),f.r,(f.a||0)-1.1+u,(f.a||0)+.6+u,f.color,.65*alpha));
    else if(f.verb==='beam')r.queue(f.x,f.y,18,g=>{const a=r.w(f.x,f.y,18),b=r.w(f.x+Math.cos(f.a)*f.r,f.y+Math.sin(f.a)*f.r,18);px.line(g,...a,...b,f.color,7);px.line(g,...a,...b,IVORY,2);},{emissive:true});
    else if(f.verb==='chain')r.queue(f.x,f.y,f.z||18,g=>{const a=r.w(f.x,f.y,f.z||18),b=r.w(f.to.x,f.to.y,f.to.z||18);const rng=E.rng(f.id);let p=a;for(let i=1;i<=6;i++){const q=i===6?b:[lerp(a[0],b[0],i/6)+(rng()-.5)*8,lerp(a[1],b[1],i/6)+(rng()-.5)*8];px.line(g,...p,...q,IVORY);p=q;}},{emissive:true});
    else if(f.verb==='guard'){const h=w.heroes.find(h=>h.id===f.owner);if(h)r.decal(()=>{r.groundRing(h.x,h.y,18+Math.sin(w.time*4)*2,f.color,.8);r.groundRing(h.x,h.y,23,f.color,.35);});}
    else if(f.verb==='bell')r.queue(f.x,f.y,5,g=>{const p=r.w(f.x,f.y,5);bellArt(g,p[0],p[1],2*(1-u*.15),Math.sin(u*14)*.1);},{alpha,emissive:true});
    else if(f.verb==='cast')r.queue(f.x,f.y,f.z||18,g=>{const p=r.w(f.x,f.y,f.z||18);px.disc(g,p[0],p[1],5*(1-u),f.color);},{emissive:true});
    else if(f.verb==='heart')r.textAt(f.x,f.y,20+u*12,'♥',f.color);
  }
  if(game.settings.numbers)for(const n of w.numbers){const [x,y]=r.w(n.x,n.y,n.z+n.t*14);r.overlay(g=>text(g,Math.round(n.n),x,y,n.color,{align:'center',scale:n.n>999?2:1}));}
}
function bellVessel(g,x,y,value,color,label,amount){
  const s=.9,points=[[-15,12],[-11,6],[-8,-12],[-5,-17],[5,-17],[8,-12],[11,6],[15,12],[15,16],[-15,16]].map(([a,b])=>[x+a,y+b]);
  px.poly(g,points,'#82724f');px.poly(g,points.map(([a,b])=>[x+(a-x)*.86,y+(b-y)*.86]),'#151c23');
  const top=y+12-28*clamp(value,0,1);for(let yy=Math.ceil(top);yy<y+12;yy++){const half=yy<y-7?6:yy<y+4?8:11;px.line(g,x-half,yy,x+half,yy,yy<top+2?E.shade(color,.25):color);}
  px.line(g,x-11,y+13,x+11,y+13,'#c2aa72');px.rect(g,x-2,y-21,4,3,GOLD);text(g,amount,x,y+4,IVORY,{align:'center'});text(g,label,x,y+23,MUTED,{align:'center'});
}
function drawMiniMap(g,w,x,y,width=72,height=43){
  smallBox(g,x,y,width,height,'#405459',.85);const sx=(width-8)/w.width,sy=(height-8)/w.height;
  for(const o of w.objects)if(['exit','lychgate','chapel','sluice','caravan'].includes(o.type)){const col=o.type==='exit'?GOLD:o.used?'#56716e':TEAL;px.rect(g,x+4+o.x*sx-1,y+4+o.y*sy-1,3,3,col);}
  for(const h of w.heroes)px.rect(g,x+4+h.x*sx-1,y+4+h.y*sy-1,3,3,h.color);
  for(const d of w.drops)if(d.type==='item'&&d.item.rarity>=4&&d.owner===w.me)text(g,'★',x+4+d.x*sx,y+4+d.y*sy,RARITY[d.item.rarity].color,{align:'center'});
  const h=getMain(w),target=h&&questTarget(w,h);if(target){const a=[x+4+h.x*sx,y+4+h.y*sy],b=[x+4+target.x*sx,y+4+target.y*sy];px.line(g,...a,...b,'#597a78');px.rect(g,b[0]-1,b[1]-1,3,3,TEAL);}
}
function drawHUD(r,w){
  r.overlay(g=>{
    const h=getMain(w);if(!h)return;const playerCount=w.heroes.filter(u=>!u.follower).length,center=r.W/2,y=r.H-48,pad=game.input.lastDevice==='gamepad';
    if(playerCount===1&&pad){
      const points=[[r.W-110,r.H-38],[r.W-144,r.H-70],[r.W-110,r.H-102],[r.W-76,r.H-70],[r.W-42,r.H-102],[r.W-42,r.H-38]];
      for(let i=0;i<6;i++){const [x,yy]=points[i],s=tunedSkill(h,h.slots[i]),unlocked=s&&(s.unlock<=h.level||h.unlockedAll),cd=h.cooldowns[h.slots[i]]||0;smallBox(g,x,yy,29,28,unlocked?GOLD:'#34424a');if(s)icon(g,s.id,x+6,yy+1,18,unlocked?ELEMENT[s.element||'physical']:'#4b555b');if(cd>0){px.blend(g,.7,'normal',()=>px.rect(g,x+1,yy+1,27,26,INK));text(g,Math.ceil(cd),x+14,yy+7,IVORY,{align:'center'});}text(g,prompt('s'+i),x+14,yy+20,['#8eadd8','#d5a0c4','#8bc3a9','#dc9e91',GOLD,GOLD][i],{align:'center'});}
      bellVessel(g,38,y+4,h.hp/h.maxHp,'#8d4549','LIFE',Math.round(h.hp));bellVessel(g,88,y+4,h.resource/h.resourceMax,DB.hero[h.kind].color,DB.hero[h.kind].resource.toUpperCase(),Math.floor(h.resource));
      text(g,prompt('potion')+' '+(h.potion>0?Math.ceil(h.potion)+'s':'POTION'),38,y-36,IVORY,{align:'center'});text(g,'EVADE '+h.evades+'/2',88,y-36,MUTED,{align:'center'});
    }else if(playerCount===1){
      smallBox(g,center-103,y-10,206,43,'#75664a',.92);
      for(let i=0;i<6;i++){
        const xx=center-96+i*33,s=tunedSkill(h,h.slots[i]),unlocked=s&&s.unlock<=h.level,cd=h.cooldowns[h.slots[i]]||0;
        smallBox(g,xx,y-5,28,28,unlocked?(i===0?GOLD:'#4d6568'):'#34424a');
        if(s)icon(g,s.id,xx+2,y-3,24,unlocked?ELEMENT[s.element||'physical']:'#4b555b');
        if(cd>0){px.blend(g,.65,'normal',()=>px.rect(g,xx+1,y-4,26,26*clamp(cd/Math.max(1,s.cd),0,1),INK));text(g,Math.ceil(cd),xx+14,y+5,IVORY,{align:'center'});}
        if(!unlocked)text(g,'L'+s.unlock,xx+14,y+5,MUTED,{align:'center'});
        text(g,prompt('s'+i).replace('Left click','LMB').replace('Right click','RMB'),xx+14,y+28,i===0?GOLD:IVORY,{align:'center'});
      }
      bellVessel(g,center-127,y+4,h.hp/h.maxHp,'#8d4549','LIFE',Math.round(h.hp));
      bellVessel(g,center+127,y+4,h.resource/h.resourceMax,DB.hero[h.kind].color,DB.hero[h.kind].resource.toUpperCase(),Math.floor(h.resource));
      text(g,prompt('potion')+' '+(h.potion>0?Math.ceil(h.potion)+'s':'POTION'),center-127,y-36,h.potion>0?MUTED:IVORY,{align:'center'});
      text(g,'EVADE '+h.evades+'/2',center+127,y-36,MUTED,{align:'center'});
    }else{
      const bw=Math.min(112,(r.W-28)/playerCount);for(let i=0;i<playerCount;i++){const p=w.heroes.filter(u=>!u.follower)[i],xx=center-playerCount*bw/2+i*bw;
        smallBox(g,xx,y-9,bw-3,43,p.color);text(g,p.name.split(' ')[0]+' • '+p.level,xx+5,y-3,p.color);E.ui.bar(g,xx+5,y+8,bw-13,4,p.hp/p.maxHp,'#9b4e50');E.ui.bar(g,xx+5,y+13,bw-13,2,p.resource/p.resourceMax,DB.hero[p.kind].color);if(!p.alive)text(g,p.deathTimer>0?'RISE IN '+Math.ceil(p.deathTimer):'✕ / ENTER: RISE',xx+5,y+21,GOLD);else for(let j=0;j<6;j++)icon(g,p.slots[j],xx+5+j*15,y+17,12,(p.cooldowns[p.slots[j]]||0)>0?'#526362':GOLD);
      }
    }
    const bh=14;smallBox(g,14,14,120,27,'#475c5c',.86);text(g,h.name.toUpperCase(),20,19,h.color);text(g,DB.hero[h.kind].title+'  •  LEVEL '+h.level,20,30,MUTED);
    if(h.kind==='lamplighter')text(g,'NERVE '+Math.floor(h.nerve)+'/30',20,49,GOLD);
    if(h.kind==='cantor'){for(let i=0;i<3;i++)px.disc(g,22+i*7,51,2,h.chord?GOLD:i<h.notes.length?DB.hero.cantor.color:'#344348');}
    if(h.kind==='sexton')text(g,'BURIED '+w.allies.filter(a=>a.owner===h.id).length,20,49,'#b9cf9d');
    const mx=r.W-92,my=16;drawMiniMap(g,w,mx,my,76,44);
    const quest=CAMPAIGN[w.progress],objective=w.zone==='vigil'?'Fill the Reckoning. Slay the Warden.':quest?.objective||'The world is yours.';
    const ow=Math.min(188,r.W-190);if(w.zoneCard<=0)text(g,w.zone==='vigil'?'THE LONG VIGIL • '+w.tier:quest?.title||DB.zone[w.zone].name,r.W-16,68,GOLD,{align:'right'});
    const lines=E.font.wrap(objective,ow);for(let i=0;w.zoneCard<=0&&i<Math.min(3,lines.length);i++)text(g,lines[i],r.W-16,80+i*10,IVORY,{align:'right'});
    if(w.zoneCard<=0&&w.need&&w.killsZone<w.need)text(g,'Road cleared '+Math.min(w.need,w.killsZone)+'/'+w.need,r.W-16,113,MUTED,{align:'right'});
    if(net?.started)text(g,Math.max(0,Math.ceil((net.info.limitMs-ROOT.AIHub.time())/1000))+'s REMAIN',center,40,GOLD,{align:'center'});
    if(w.zone==='vigil'){smallBox(g,center-100,14,200,22,'#647770');E.ui.bar(g,center-93,29,186,3,w.reckoning/100,TEAL);text(g,'RECKONING '+Math.floor(w.reckoning)+'%',center,19,IVORY,{align:'center'});if(w.greater)text(g,Math.max(0,Math.ceil(w.vigilClock))+'s',center,40,GOLD,{align:'center'});}
    const boss=w.foes.find(f=>f.boss&&f.alive),target=boss||(currentHover?.team==='foe'?currentHover:null);
    if(target){const yy=w.zone==='vigil'?43:15,ww=Math.min(198,r.W*.42);smallBox(g,center-ww/2,yy,ww,25,boss?'#b29766':'#6e8280');text(g,target.name.toUpperCase(),center,yy+5,boss?GOLD:IVORY,{align:'center'});E.ui.bar(g,center-ww/2+7,yy+17,ww-14,4,target.hp/target.maxHp,'#9c4b50');if(target.affixes?.length)text(g,target.affixes.map(a=>DB.affix[a].name).join(' • '),center,yy+29,MUTED,{align:'center'});}
    if(w.requiem>=10){text(g,'REQUIEM',18,r.H*.43,GOLD);text(g,'× '+w.requiem,18,r.H*.43+13,IVORY,{scale:2});E.ui.bar(g,18,r.H*.43+35,60,2,w.requiemT/TUNE.requiem,GOLD);}
    if(w.sacrilege>=6)text(g,'SACRILEGE × '+w.sacrilege,18,r.H*.43+45,GOLD);
    const usable=nearestUsable(w,h);
    if(usable&&!PANEL_STATE&&!attract){const label=usable.type==='item'?'Take '+itemName(usable.item):usable.team==='hero'?'Hold to revive':usable.label||objectLabel(usable.type),str=prompt('interact')+'  '+label;const ww=Math.min(r.W-28,E.font.width(str)+18);smallBox(g,center-ww/2,r.H-90,ww,20,TEAL);text(g,str,center,r.H-83,IVORY,{align:'center'});}
    const toast=w.toasts.at(-1);if(toast&&!w.dialogue){const lines=E.font.wrap(toast.text,r.W-60);for(let i=0;i<lines.length;i++)text(g,lines[i],center,r.H-108-(lines.length-i-1)*10,toast.color,{align:'center'});}
    if(w.dialogue&&!PANEL_STATE&&!talk?.open){const bw=Math.min(330,r.W-32),lines=E.font.wrap(w.dialogue.text,bw-24),yy=r.H-152-lines.length*10;smallBox(g,center-bw/2,yy,bw,24+lines.length*10,'#4e6868',.9);text(g,w.dialogue.speaker.toUpperCase(),center-bw/2+10,yy+7,TEAL);for(let i=0;i<lines.length;i++)text(g,lines[i],center-bw/2+10,yy+20+i*10,IVORY);}
    if(w.zoneCard>0&&!attract){const u=Math.min(1,w.zoneCard);px.blend(g,u,'normal',()=>{const name=DB.zone[w.zone].name.toUpperCase(),scale=E.font.width(name,{scale:2})<r.W-32?2:1;smallBox(g,center-Math.min(r.W-28,E.font.width(name,{scale})+24)/2,58,Math.min(r.W-28,E.font.width(name,{scale})+24),scale===2?30:23,'#596c64',.9);text(g,name,center,67,GOLD,{align:'center',scale});const s=DB.boss[DB.zone[w.zone].boss];if(s)text(g,s.subtitle,center,99,IVORY,{align:'center'});});}
    if(h.level<30){px.rect(g,14,r.H-6,r.W-28,2,'#293e43');px.rect(g,14,r.H-6,(r.W-28)*h.xp/xpNext(h),2,'#92b9a8');}
    if(h.hp<h.maxHp*.25){px.blend(g,.2+Math.sin(w.time*6)*.08,'normal',()=>{px.rect(g,0,0,r.W,5,'#ad3c49');px.rect(g,0,r.H-5,r.W,5,'#ad3c49');px.rect(g,0,0,5,r.H,'#ad3c49');px.rect(g,r.W-5,0,5,r.H,'#ad3c49');});}
    if(CHEATS.god||CHEATS.bot||CHEATS.oneHit||CHEATS.freezeAI||CHEATS.noClip)text(g,'DEV',14,r.H-17,TEAL);
    if(isTuned())text(g,'TUNED',40,r.H-17,GOLD);
    if(!attract&&playerCount===1)text(g,prompt('inventory')+' BAG  '+prompt('skills')+' SKILLS  '+prompt('map')+' MAP',r.W-16,128,MUTED,{align:'right'});
    if(net&&!net.started&&!net.ended)drawHubCard(g,r);
    if(CHEATS.overlays)drawDebugOverlay(g,r,w);
  });
}
function drawDebugOverlay(g,r,w){text(g,'SIM '+w.time.toFixed(1)+'  FOES '+w.foes.length+'  FX '+w.fx.length,14,48,TEAL);if(net)text(g,'NET TX '+net.sent+' RX '+net.received+'  HOST '+net.info.host,14,60,TEAL);for(const f of w.foes){const p=r.w(f.x,f.y,40);text(g,(f.boss?'BOSS':DB.monster[f.kind].ai)+' '+f.atk.toFixed(1),p[0],p[1],TEAL,{align:'center'});}}
