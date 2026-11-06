import {repairPreview} from './sim.js';
import {WAVES,LOCATIONS} from './content.js';

export function createView(E,game,assets){
  const {px}=E;
  const rand=E.rng(92411);
  const stars=Array.from({length:180},()=>({x:rand(),y:rand(),size:rand()>.94?2:1,t:rand()*7}));
  const palettes=[
    {sky:['#06151f','#102937','#254344'],planet:'#8bbcb2',rim:'#c9dbc1',land:'#344f50',ground:'#192f38',bunker:'#81bda7',accent:'#f1ad83'},
    {sky:['#141327','#292b47','#554658'],planet:'#b8a4cc',rim:'#e6d1ca',land:'#51425c',ground:'#2c293f',bunker:'#ad9ab7',accent:'#e3bc83'},
    {sky:['#071b29','#15394b','#376168'],planet:'#d7b892',rim:'#ffdda5',land:'#786162',ground:'#23404b',bunker:'#73a8ad',accent:'#ff9c82'}
  ];
  let fx=[],celebration=0,celebrationBeat=0;
  function events(list){
    for(const e of list){
      if(e.type==='victory'){celebration=3;celebrationBeat=0;}
      if(['kill','armour','loss','repair','erode','pickup','victory','extra','boss-hit','boss-phase','emitter-break','saucer-hit','pickup-expire'].includes(e.type)){
        const count=e.type==='victory'?80:e.type==='emitter-break'?28:e.type==='boss-phase'?24:e.type==='boss-hit'?7:e.type==='saucer-hit'?20:e.type==='pickup-expire'?6:e.type==='loss'?20:e.type==='kill'?9:e.type==='repair'?8:e.type==='erode'?3:6;
        for(let i=0;i<count;i++){
          const a=rand()*Math.PI*2,s=10+rand()*40;
          fx.push({x:e.x??240,y:e.y??140,vx:Math.cos(a)*s,vy:Math.sin(a)*s-10,life:.25+rand()*.45,max:.7,type:e.type,c:Math.floor(rand()*3)});
        }
      }
    }
    if(fx.length>400)fx=fx.slice(-400);
  }
  function update(dt){
    if(celebration>0){celebration-=dt;celebrationBeat-=dt;if(celebrationBeat<=0){celebrationBeat=.24;const x=70+rand()*340,y=65+rand()*115;for(let i=0;i<18;i++){const a=i*Math.PI/9;fx.push({x,y,vx:Math.cos(a)*38,vy:Math.sin(a)*38,life:.7,max:.7,type:'pickup',c:i%3});}}}
    for(const p of fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=65*dt;}
    fx=fx.filter(p=>p.life>0);
  }
  function text(g,s,x,y,c='#e6f9de',opts={}){
    E.font.text(g,s,Math.round(x),Math.round(y),c,{outline:false,shadow:'#07141e',...opts});
  }
  function border(g,x,y,w,h,c){px.line(g,x,y,x+w,y,c);px.line(g,x,y+h,x+w,y+h,c);px.line(g,x,y,x,y+h,c);px.line(g,x+w,y,x+w,y+h,c);}
  function planet(g,cx,cy,r,p,t){
    const ramp=E.ramp(p.planet,7);
    px.disc(g,cx,cy,r+3,p.rim);
    px.disc(g,cx+1,cy+1,r+1,p.land);
    for(let yy=-r;yy<=r;yy+=2){
      const half=Math.sqrt(Math.max(0,r*r-yy*yy));
      for(let xx=-half;xx<half;xx+=3){
        const light=(1-(xx/r)*.5-(yy/r)*.32);
        const zone=Math.max(0,Math.min(6,Math.floor(light*4)));
        const cloud=Math.sin((xx+yy*.55)*.079)+Math.cos(yy*.18+xx*.021);
        const c=cloud>.8?ramp[Math.min(6,zone+1)]:cloud<-.7?ramp[Math.max(0,zone-2)]:ramp[zone];
        px.rect(g,cx+xx,cy+yy,Math.min(3,half-xx),2,c);
      }
    }
    px.poly(g,[[cx+r*.2,cy-r*.91],[cx+r*.78,cy-r*.62],[cx+r*.99,cy],[cx+r*.75,cy+r*.65],[cx+r*.07,cy+r*.99],[cx+r*.58,cy+r*.2]],p.land);
  }
  function background(r,world,front=false){
    const p=palettes[world?.location??0],t=game.real;
    r.sky(p.sky);
    r.decal(g=>{
      const [ox,oy]=r.w(0,0,0);
      for(let i=0;i<stars.length;i++){
        const s=stars[i],sx=s.x*r.W,sy=s.y*r.H;
        const twinkle=Math.sin(t*.8+s.t)>-.35;
        px.rect(g,sx,sy,s.size,s.size,twinkle?'#638c8e':'#2e505f');
        if(s.size===2){px.rect(g,sx-2,sy+1,6,1,'#315663');px.rect(g,sx+1,sy-2,1,6,'#315663');}
      }
      // A distant planet, rasterized in stepped hue-shifted bands.
      const pr=front?88:59;
      if(r.H>400){const extra=(r.H-270)/2;planet(g,r.W*.61,extra*.48,Math.min(76,extra*.38),p,t);text(g,'INHABITED WORLD / KEEP IT THAT WAY',r.W/2,extra-8,'#557e7a',{align:'center'});}
      else planet(g,ox+(front?349:370),oy+(front?96:107),pr,p,t);
      px.line(g,ox+282,oy+94,ox+457,oy+163,p.land,2);
      px.line(g,ox+274,oy+98,ox+451,oy+168,p.rim);
      // Orbital dust and a tiny high-altitude relay.
      px.rect(g,ox+44,oy+57,16,2,'#456a72');
      px.rect(g,ox+50,oy+51,4,13,'#819a91');
      px.rect(g,ox+38,oy+53,8,9,'#233e50');px.rect(g,ox+59,oy+53,8,9,'#233e50');
      // Extra display area is scenery, never additional combat space.
      const floor=oy+254;
      px.rect(g,0,floor,r.W,r.H-floor+2,p.ground);
      for(let i=0;i<r.W;i+=22)px.line(g,i,floor,i+(i-r.W/2)*.8,r.H,'#304c53');
      for(let y=floor+8;y<r.H;y+=18)px.line(g,0,y,r.W,y,'#29444d');
      const horizon=oy+192;
      for(let x=0;x<r.W;x+=13){
        const h=5+Math.sin(x*.17)*4+Math.sin(x*.047)*8;
        px.rect(g,x,horizon-h,14,Math.max(1,floor-horizon+h),p.land);
        px.rect(g,x+2,horizon-h,3,2,'#486b69');
      }
      // The central combat sky stays dark enough for every shot silhouette.
      px.rect(g,ox+9,oy+27,462,164,'#091d29');
      for(const s of stars.slice(0,75)){
        const x=ox+16+s.x*448,y=oy+31+s.y*155;
        px.dot(g,x,y,s.size===2?'#456977':'#263f50');
      }
      planet(g,ox+365,oy+112,49,{...p,planet:'#24404c',rim:'#375863',land:'#142d3e'},t);
      px.line(g,ox+15,oy+31,ox+465,oy+31,'#40646a');
      px.line(g,ox+15,oy+31,ox+15,oy+248,'#31525e');
      px.line(g,ox+465,oy+31,ox+465,oy+248,'#31525e');
      // Foreground apron and original-footprint plinths.
      px.rect(g,ox+15,oy+229,450,25,'#1b3641');
      for(let x=20;x<461;x+=12)px.rect(g,ox+x,oy+251,7,2,p.accent);
      for(let x=16;x<465;x+=8)px.line(g,ox+x,oy+230,ox+x+3,oy+230,'#d87877');
      text(g,'BREACH',ox+16,oy+219,'#b76a77',{font:'tiny'});
      for(const b of world?.bunkers||[]){
        px.rect(g,ox+b.x-2,oy+b.y+b.rows*b.cell, b.cols*b.cell+4,4,'#0a1e29');
        px.line(g,ox+b.x-2,oy+b.y+b.rows*b.cell,ox+b.x+b.cols*b.cell+2,oy+b.y+b.rows*b.cell,'#53706d');
      }
      if(r.H>400){
        const y=oy+308;
        text(g,'PLANETARY DEFENSE NETWORK',r.W/2,y,'#78998d',{align:'center',scale:2});
        text(g,'CUT A LANE. CATCH THE SCRAP. KEEP YOUR PLANET.',r.W/2,y+25,'#54796e',{align:'center'});
        border(g,ox+68,y+55,344,70,'#345958');
        for(let j=0;j<8;j++){
          px.rect(g,ox+80+j*41,y+68,31,6,j<4?'#699b8d':'#b07f70');
          px.rect(g,ox+80+j*41,y+80,31,29,'#102c38');
          px.line(g,ox+84+j*41,y+101,ox+104+j*41,y+87,'#3a6a69');
        }
      }
    });
    return p;
  }
  function drawBoss(r,w,p){
    const b=w.boss;if(!b)return;
    const body=assets.flagship;
    if(body){
      r.actor(b.x,b.y-1,0,(g,x,y)=>{
        px.poly(g,[[x-74,y-3],[x-54,y-14],[x-25,y-17],[x+25,y-17],[x+54,y-14],[x+74,y-3],[x+60,y+11],[x-60,y+11]],'#4a3e5d');
        px.poly(g,[[x-69,y-4],[x-52,y-11],[x+52,y-11],[x+69,y-4],[x+55,y+4],[x-55,y+4]],'#91768e');
        px.line(g,x-51,y-12,x+51,y-12,'#eeb3a1',2);
        px.line(g,x-67,y+2,x-30,y+2,'#c6979a');px.line(g,x+30,y+2,x+67,y+2,'#c6979a');
      });
      r.sprite(b.x,b.y,0,b.phase===2&&b.open?assets.flagshipOpen:body,{anchor:'center',t:b.age,glow:.25});
    }
    else r.actor(b.x,b.y,0,(g,x,y)=>{
      px.poly(g,[[x-68,y-2],[x-48,y-17],[x-17,y-22],[x,y-28],[x+17,y-22],[x+48,y-17],[x+68,y-2],[x+49,y+13],[x-49,y+13]],'#574361');
      px.poly(g,[[x-62,y-3],[x-45,y-13],[x+45,y-13],[x+62,y-3],[x+38,y+6],[x-38,y+6]],'#9b7a98');
      px.line(g,x-43,y-14,x+43,y-14,'#f5bcaa',2);
      for(let i=-2;i<=2;i++)px.rect(g,x+i*18-3,y-10,6,3,'#c7dcd0');
    });
    for(const e of b.phase===1?(b.emitters||[]):[]){
      r.actor(e.x,e.y,0,(g,x,y)=>{
        const open=e.open&&e.hp>0;
        px.rect(g,x-9,y-9,18,18,e.hp>0?'#233c50':'#101c2b');
        border(g,x-9,y-9,18,18,e.hp>0?'#e2a087':'#52636b');
        if(e.hp>0){
          px.disc(g,x,y,open?5:3,open?'#ffdd8b':'#9f7184');
          if(!open){px.line(g,x-7,y-4,x+7,y-4,'#d2c0b8',2);px.line(g,x-7,y+4,x+7,y+4,'#776f86',2);}
          for(let k=0;k<e.maxHp;k++)px.rect(g,x-8+k*(16/e.maxHp),y+13,Math.max(1,16/e.maxHp-1),2,k<e.hp?'#ffc797':'#30404e');
        }
        if(e.telegraph>0){border(g,x-13,y-13,26,26,'#ff9f85');px.line(g,x,y+15,x,y+25,'#ffd28e');}
      },{emissive:true});
    }
    r.actor(b.x,b.y+3,0,(g,x,y)=>{
      if(b.phase===2){
        const open=b.open;
        px.disc(g,x,y,11,'#112c40');px.disc(g,x,y,8,open?'#f5c47e':'#57697a');
        if(open){px.disc(g,x-1,y-2,4,'#fff4cc');}
        else{px.rect(g,x-10,y-2,20,4,'#b9a6b6');}
      }
    },{emissive:true});
    if(b.phase===2&&b.telegraph>0){
      r.overlay(g=>{
        const safe=typeof b.safeLane==='number'?b.safeLane:240;
        const [sx,sy]=r.w(safe,234,0);
        const sw=b.safeWidth||82;border(g,sx-sw/2,sy-14,sw,22,'#b4f5cf');text(g,'SAFE',sx,sy-10,'#d3ffd4',{align:'center'});
      });
    }
    r.text(b.phase===1?'BREAK BOTH EMITTERS':'EXPOSED CORE',r.W/2,(r.H-270)/2+38,'#ffcf96',{align:'center'});
  }
  function drawWorld(r,w,{front=false,attract=false,overlays=false}={}){
    const p=background(r,w,front);
    if(!w)return;
    const preview=w.players.filter(s=>s.active&&s.alive&&s.charges>0).map(s=>({seat:s.seat,...repairPreview(w,s.seat)}));
    for(const b of w.bunkers){
      const bi=w.bunkers.indexOf(b),ramp=E.ramp(p.bunker,5);
      r.actor(b.center,b.y+b.rows*b.cell,0,(g,x,y)=>{
        const left=x-b.cols*b.cell/2,top=y-b.rows*b.cell;
        for(let i=0;i<b.mask.length;i++)if(b.mask[i]){
          const col=i%b.cols,row=Math.floor(i/b.cols),xx=left+col*b.cell,yy=top+row*b.cell;
          const shade=(col+row*3)%7===0?2:row<2?3:2;
          px.rect(g,xx,yy,b.cell,b.cell,ramp[shade]);
          px.rect(g,xx,yy,b.cell,1,ramp[Math.min(4,shade+1)]);
          px.rect(g,xx+b.cell-1,yy+1,1,b.cell-1,ramp[1]);
          const grow=b.growth?.find(q=>q.cell===i);if(grow&&grow.time>0)px.line(g,xx,yy,xx+b.cell-1,yy,'#e7ffd1');
        }
        for(const q of preview)if(q.bunker===bi&&q.usable){
          border(g,left-2,top-2,b.cols*b.cell+4,b.rows*b.cell+4,q.seat===0?'#a1d4bb':'#d6a2aa');
          for(const i of q.cells.slice(0,24)){const xx=left+(i%b.cols)*b.cell,yy=top+Math.floor(i/b.cols)*b.cell;px.dot(g,xx+1,yy+1,'#dbf4c9');}
        }
      });
    }
    const march=w.formation?.beat||0;
    for(const e of w.enemies){
      const spr=e.type==='bombardier'?assets.bombardier:assets.enemies[e.row%4];
      if(e.telegraph>0)r.actor(e.x,e.y,0,(g,x,y)=>{
        px.line(g,x-9,y+10,x+9,y+10,'#ffd68e');
        px.line(g,x-9,y+8,x-9,y+12,'#ffd68e');px.line(g,x+9,y+8,x+9,y+12,'#ffd68e');
        for(let yy=y+15;yy<y+42;yy+=5)px.dot(g,x,yy,'#ce8e82');
      },{emissive:true});
      if(spr)r.sprite(e.x,e.y,0,spr,{anchor:'center',t:march*.5,flash:e.flash>0&&game.settings.flashes>0?'#fff4c9':undefined,glow:.2});
      if(e.type==='armour'&&e.hp>1){
        if(assets.armourShell)r.sprite(e.x,e.y,0,assets.armourShell,{anchor:'center',t:march*.5});
        else r.actor(e.x,e.y,0,(g,x,y)=>{px.line(g,x-9,y-6,x+9,y-6,'#e6d8ac',2);px.line(g,x-10,y-5,x-10,y+4,'#8c9bac',2);px.line(g,x+10,y-5,x+10,y+4,'#8c9bac',2);});
      }
      if(overlays)r.actor(e.x,e.y,0,(g,x,y)=>border(g,x-7,y-5,14,10,'#ff6d90'),{emissive:true});
    }
    if(w.saucer){
      r.sprite(w.saucer.x,w.saucer.y??43,0,assets.saucer,{anchor:'center',t:w.time,glow:.4});
      
    }
    if(w.boss&&w.status!=='victory')drawBoss(r,w,p);
    for(const b of w.bullets)r.actor(b.x,b.y,0,(g,x,y)=>{
      if(b.owner>=0){
        px.rect(g,x-1,y-4,3,8,b.owner===0?'#dffff1':'#ffe3d4');px.rect(g,x,y-5,1,5,b.owner===0?'#a4f5cf':'#ffb69a');px.rect(g,x,y+4,1,3,'#3c787f');
      }else if(b.kind==='heavy'){
        px.poly(g,[[x,y-6],[x+5,y-2],[x+5,y+3],[x,y+7],[x-5,y+3],[x-5,y-2]],'#ff997e');
        px.rect(g,x-2,y-2,4,4,'#fff1c8');px.line(g,x-3,y-8,x+3,y-8,'#d37a83');
      }else{
        px.rect(g,x-2,y-4,4,8,'#ff937c');px.rect(g,x-1,y,2,4,'#ffedb7');px.dot(g,x+1,y-6,'#d07883');
      }
    },{emissive:true});
    for(const q of w.pickups){
      if(q.life<2&&game.settings.flashes>0&&Math.floor(w.time*6)%2===0)continue;
      r.sprite(q.x,q.y,0,assets.salvage,{anchor:'center',t:w.time,glow:.8});
      r.actor(q.x,q.y,0,(g,x,y)=>{px.dot(g,x-7,y-5,'#e4ffd2');px.dot(g,x+6,y+4,'#7dc6b3');if(q.life<2){px.rect(g,x-7,y+8,14,2,'#30505a');px.rect(g,x-7,y+8,14*Math.max(0,q.life/2),2,'#c8edbe');}},{emissive:true});
    }
    for(const s of w.players){
      if(!s.active)continue;
      if(!s.alive){
        if(s.respawn>0)r.textAt(s.x,s.y-15,0,'REDEPLOY','#b4d9c6',{font:'tiny'});
        continue;
      }
      const spr=assets.ships[s.seat%2];
      r.shadow(s.x,s.y+5,11,.5);
      if(spr)r.sprite(s.x,s.y+(s.recovery>.2?1:0),0,spr,{anchor:'center',t:w.time,glow:.25,alpha:s.protected>0&&game.settings.flashes>0&&Math.floor(w.time*7)%2?.55:1});
      r.actor(s.x,s.y,0,(g,x,y)=>{
        const count=w.bullets.filter(b=>b.owner===s.seat).length;
        px.rect(g,x-1,y-9,3,2,s.recovery<=0&&count<2?'#eaffd3':'#4a6876');
        if(s.protected>0)border(g,x-12,y-11,24,20,s.seat===0?'#b4edcd':'#ffbb9e');
      },{emissive:true});
      game.lights.add(s.x,s.y,0,28,.22,{color:s.seat===0?'#96dfc0':'#ffb399'});
    }
    r.overlay(g=>{
      for(const q of fx){
        const [x,y]=r.w(q.x,q.y,0);
        const colors=q.type==='repair'||q.type==='pickup'?['#d7ffd2','#a0dfba','#65ac9f']:q.type==='armour'?['#fff0bb','#a5b7ba','#718895']:['#ffdd9e','#f29c82','#b36f88'];
        px.rect(g,x,y,q.c===0?2:1,q.c===0?2:1,colors[q.c]);
      }
      const [ox,oy]=r.w(0,0,0);
      if(w.status==='victory'){planet(g,ox+240,oy+126,66,p,game.real);text(g,'PLANET KEPT!',ox+240,oy+198,'#e6ffd0',{align:'center',scale:3});text(g,'ALL OUTPOSTS REPORT: STILL HERE.',ox+240,oy+225,'#b4f5cf',{align:'center'});}
      px.rect(g,ox+13,oy+5,454,23,'#0a202b');
      text(g,'TEAM',ox+20,oy+9,'#86ada2',{font:'tiny'});
      text(g,String(w.score).padStart(6,'0'),ox+20,oy+16,'#ecfbd8',{scale:1});
      const stage=w.encounter===6?'FLAGSHIP':('WAVE '+(w.encounter+1)+' / 6');
      text(g,stage,ox+240,oy+9,'#f9c58e',{align:'center'});
      const loc=LOCATIONS[w.location];
      text(g,(typeof loc==='string'?loc:loc?.name)||['LAGOON RELAY','DUSK QUARRY','POLAR ARRAY'][w.location],ox+240,oy+20,'#8fafa4',{font:'tiny',align:'center'});
      text(g,'RESERVE '+w.reserve,ox+458,oy+11,'#cde5cd',{align:'right'});
      if(w.assisted&&!attract)text(g,'ASSISTED',ox+458,oy+22,'#dca68f',{align:'right',font:'tiny'});
      for(const s of w.players){
        if(!s.active)continue;
        const left=s.seat===0?21:310;
        text(g,'P'+(s.seat+1),ox+left,oy+260,s.seat===0?'#b4f5cf':'#ffb297');
        for(let i=0;i<3;i++){
          px.rect(g,ox+left+17+i*7,oy+261,5,5,i<s.charges?(s.seat===0?'#b4f5cf':'#ffb297'):'#37535e');
          if(i<s.charges)px.dot(g,ox+left+18+i*7,oy+262,'#f5ffd7');
        }
        text(g,s.alive?'REPAIR':s.respawn>0?'RETURNING':'SPECTATING',ox+left+42,oy+261,'#8faea0',{font:'tiny'});
      }
      if(w.status==='transition'){
        px.rect(g,ox+85,oy+112,310,43,'#0c2634');
        text(g,w.nextEncounter===6?'HOSTILE FLAGSHIP INBOUND':(w.nextEncounter%2===0?'NEXT OUTPOST SECURED':'FORMATION CLEARED'),ox+240,oy+120,'#ffdaa0',{align:'center',scale:2});
        text(g,'CATCH YOUR BREATH. REPAIR YOUR COVER.',ox+240,oy+144,'#b6d6be',{align:'center'});
      }
      if(w.encounter===0&&w.encounterTime<40&&!front&&!attract){
        let hint;
        if(!w.intro?.moved)hint='MOVE TO CHOOSE YOUR FIRING LANE';
        else if(!w.intro?.fired)hint='HOLD FIRE TO CUT THROUGH YOUR OWN COVER';
        else if(!w.intro?.repaired)hint=w.players.some(s=>s.charges)?'REPAIR NEAR A BUNKER  -  KEEP YOUR BARREL LANE':'CATCH THE DIAMOND SALVAGE';
        if(hint){px.rect(g,ox+85,oy+174,310,15,'#112c38');text(g,hint,ox+240,oy+178,'#ffe0a3',{align:'center'});}
      }
      if(overlays){
        text(g,'TICK '+w.tick+'  EPOCH '+w.epoch,ox+20,oy+36,'#ebbe9e',{font:'tiny'});
        for(const s of w.players)if(s.alive){const [x,y]=r.w(s.x,s.y,0);border(g,x-5,y-4,10,8,'#ff6d90');}
      }
    });
  }
  return {drawWorld,background,events,update,reset(){fx=[];celebration=0;celebrationBeat=0;}};
}
