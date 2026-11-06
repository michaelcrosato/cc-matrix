(() => {
const E=My3D2dge,G=window.GAME,{TissueField,matId}=G;
for(const [name,colors,spec] of [
 ['muscle',['#341328','#7d3045','#bf5b69','#ed9d96','#ffd5b8'],.75],
 ['tendon',['#605764','#a69a98','#e1d6c4','#fff4d8'],.5],
 ['brain',['#432e48','#87647d','#ba8d9b','#e3b5b0','#ffe2c6'],.7],
 ['heart',['#340b27','#7b253d','#be4656','#e7857b','#ffd1a2'],1],
 ['hush',['#071a2a','#13525e','#328a92','#63dfcb','#d1fff0'],1.3]
]){G.MAT_IDS.push(name);G.MATS.push({ramp:G.makeRamp(colors,20),slow:G.makeRamp(colors,20,true),spec});}
function base(seed){const F=new TissueField(426,240,seed),cx=213,cy=116;
 for(let y=0;y<240;y++)for(let x=0;x<426;x++){const i=y*426+x,d=((x-cx)/171)**2+((y-cy)/91)**2,fold=Math.sin(x*.09+1.6*Math.sin(y*.05))*1.6+Math.sin(y*.17+x*.03)*.8;
  if(d<1){F.h[i]=-16+12*d*d;F.m[i]=matId('wall');}else if(d<1.18){F.h[i]=4+7*Math.sin((d-1)/.18*Math.PI);F.m[i]=matId('skin');}else{F.h[i]=6+fold;F.m[i]=matId('drape');}}
 return F;
}
function retractors(F){for(const a of [-.5,.55,2.58,3.63]){const x=213+Math.cos(a)*171,y=116+Math.sin(a)*91;F.tube([[x,y],[x+Math.cos(a)*70,y+Math.sin(a)*35]],3.5,5,'steel',{base:11});F.tube([[x-Math.sin(a)*10,y+Math.cos(a)*8],[x+Math.sin(a)*10,y-Math.cos(a)*8]],2.5,5,'steel',{base:11});}}
function forearm(F,wrist){
 for(let i=0;i<5;i++){const y=80+i*19;F.blob(211+(i%2)*12,y,151,15,.05*Math.sin(i),20-i,'muscle',{base:-11,warp:4,pulse:.08});
  for(let k=0;k<3;k++)F.tube([[80,y-5+k*4],[150,y-4+k*4],[230,y+k*3],[338,y-1+k*4]],.65,1,'artery',{add:true,pulse:.15});}
 for(let i=0;i<3;i++)F.tube([[86,98+i*17],[171,107+i*14],[251,111+i*9],[340,98+i*15]],2.5,3,'tendon',{add:true});
 if(wrist)F.tube([[275,69],[292,105],[286,150]],1.3,2,'fat',{add:true});
}
function heart(F,final){
 F.blob(211,120,108,75,-.2,36,'heart',{base:-12,warp:8,pulse:.3});
 F.blob(174,89,50,35,-.45,32,'heart',{base:4,pulse:.22});
 F.blob(253,95,44,32,.4,30,'heart',{base:4,pulse:.25});
 for(let i=0;i<6;i++){const y=72+i*20;F.tube([[63,y],[89,y-6],[106,y-8]],4,5,'tendon',{base:5});F.tube([[362,y],[335,y-5],[322,y-8]],4,5,'tendon',{base:5});}
 F.tube([[211,62],[225,89],[201,117],[218,161],[210,181]],3.5,3,'artery',{add:true,pulse:.5});
 F.tube([[215,91],[174,104],[157,139]],2.5,2,'artery',{add:true,pulse:.5});F.tube([[207,119],[254,133],[268,158]],2,2,'vessel',{add:true});
 F.tube([[208,69],[195,93],[199,120],[218,151]],2,2,'fat',{add:true});
 if(final){F.tube([[222,54],[242,78],[266,91]],8,17,'artery',{base:11,pulse:.5});F.tube([[196,55],[178,76],[153,93]],7,16,'vessel',{base:10,pulse:.4});}
}
function brain(F){F.blob(213,114,137,78,0,23,'brain',{base:-12,pulse:.08});
 for(let side of [-1,1])for(let k=0;k<6;k++){const y=65+k*20,pts=[];for(let i=0;i<32;i++){const x=213+side*(12+i*3.2);pts.push([x,y+Math.sin(i*.54+k*1.8)*7+(x-213)**2*.0005]);}F.tube(pts,5,8,'brain',{base:7});}
 F.tube([[213,47],[209,88],[215,118],[211,176]],2,-2,'wound',{add:true});
 F.tube([[128,76],[153,104],[144,142]],1.4,1,'artery',{add:true,pulse:.2});F.tube([[269,72],[278,104],[267,148]],1.3,1,'fat',{add:true});
}
function implant(F){forearm(F,false);F.blob(213,114,69,49,0,11,'steel',{base:17});F.blob(214,111,56,35,0,10,'steel',{base:20});F.tube([[255,100],[296,88],[307,119],[284,145]],2.3,3,'tendon',{add:true});}
function bakeSite(site,seed=17){let F;if(site==='abdomen')return G.bakeAbdomen(426,240,seed);F=base(seed);
 if(site==='forearm'||site==='wrist')forearm(F,site==='wrist');
 if(site==='flank'){forearm(F,false);for(let i=0;i<11;i++)F.blob(80+i*25,65+(i%2)*91,13,13,.2,9,'fat',{base:2,warp:4});}
 if(site==='heart'||site==='mediastinum')heart(F,site==='mediastinum');
 if(site==='brain')brain(F);
 if(site==='implant')implant(F);
 retractors(F);F.finish(.9);return F;
}
G.bakeSite=bakeSite;
G.sites={forearm:{label:'FOREARM'},wrist:{label:'WRIST'},abdomen:{label:'ABDOMEN'},flank:{label:'FLANK'},heart:{label:'HEART'},brain:{label:'CORTEX'},implant:{label:'CHEST WALL'},mediastinum:{label:'MEDIASTINUM'}};
})();
