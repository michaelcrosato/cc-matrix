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
