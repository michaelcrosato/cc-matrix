(() => {
const E=My3D2dge,G=window.GAME,C=G.CAST;
const hair=[[[[-27,17],[-27,1],[-14,-9],[15,-8],[28,3],[26,21],[16,8],[0,7],[-12,12]],'base'],[[[-26,13],[-23,0],[-14,-9],[-4,-6],[-15,6]],'lt']];
Object.assign(C,{
 percy:{name:'DR. WHITLOCK',skin:'#ecc5a6',hair:'#593827',cloth:'#3c6877',coat:'#f0eee1',iris:'#5a7487',jaw:1.06,frontHair:hair,tag:'#bc7255'},
 odalys:{name:'ODALYS FERREIRA',skin:'#b77a52',hair:'#392a35',cloth:'#b75b56',iris:'#3c2532',glasses:'#e9c780',wide:1.05,backHair:[[[-32,1],[-38,31],[-27,68],[-18,45] ],[[27,-2],[37,22],[32,65],[18,44]]],frontHair:hair},
 hale:{name:'DR. LUCIAN HALE',skin:'#d7b696',hair:'#b9bec7',cloth:'#384757',undershirt:'#eeeedf',iris:'#789689',lines:true,jaw:1.06,frontHair:hair},
 clementine:{name:'CLEMENTINE HALE',skin:'#eddac6',hair:'#b7ad9b',cloth:'#bbddd0',iris:'#63aaa1',wide:.92,jaw:.95,frontHair:hair},
 patient:{name:'PATIENT',skin:'#c49676',hair:'#786c62',cloth:'#a3d0c0',lines:true,frontHair:hair}
});
const cache=new Map();
function portrait(id,expr='neutral',talk=false,mask=false,blink=false){const c=C[id]||C.patient,key=[id,expr,!!talk,!!mask,!!blink].join(':');if(!cache.has(key)){const cv=E.mkCanvas(112,128),g=cv.getContext('2d');G.drawBust(g,c,{expr,talk:talk?1:0,maskUp:mask,blink:blink?1:0});E.px.reset(g);cache.set(key,cv);}return cache.get(key);}
E.Humanoid.hat('surgical',h=>{const p=(f,r,u)=>h.at(f,r,u).slice(0,2),C=E.tones(h.c||'#2aa698');E.px.poly(h.g,[p(-3,-5,1),p(3,-5,2),p(5,-3,4),p(5,3,4),p(3,5,2),p(-3,5,1)],C.base);E.px.line(h.g,...p(4,-4,1),...p(4,4,1),C.lt,2);});
for(const [id,target] of Object.entries({scrub:{handL:[8,-8,28],handR:[8,8,28],elbowL:[2,-9,21],elbowR:[2,9,21]},operate:{handL:[13,-4,16],handR:[13,4,16]},knit:{handL:[7,-3,20],handR:[7,3,20]},pass:{handR:[20,4,22]},push:{handL:[17,-7,19],handR:[17,7,19]}})){
 E.Humanoid.pose(id,(J,w)=>{for(const [name,p] of Object.entries(target))if(J[name])for(let k=0;k<3;k++)J[name][k]+=(p[k]-J[name][k])*w;});
}
function rig(id='vale',patient=false){const c=C[id]||C.patient;return new E.Humanoid({size:1.3,weapon:null,hat:patient?null:{style:'surgical',color:c.cap||c.cloth},outfit:c.coat?'coat':'shirt',sleeves:'short',hair:patient?'short':'bald',colors:{skin:c.skin,hair:c.hair,cloth:c.cloth,coat:c.coat||c.cloth,pants:patient?'#a3c5ba':c.cloth,boot:'#183b3c',glove:'#d7ede3',trim:'#c4d8c8'},draw:{over(g,Q){if(!patient&&Q.head){const [x,y]=Q.head;E.px.poly(g,[[x-4,y],[x+4,y],[x+4,y+4],[x,y+6],[x-4,y+4]],'#b4d5cb');}}}});}
G.Portraits={get:portrait,cache};G.makeRig=rig;
})();
