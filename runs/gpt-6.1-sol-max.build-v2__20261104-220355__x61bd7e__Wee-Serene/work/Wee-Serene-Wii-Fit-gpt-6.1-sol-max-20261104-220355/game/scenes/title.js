(() => {
const G=window.G,E=G.E,game=G.game,P=G.palette;
let menu,hero;
G.scenes.title={input:G.INPUT,view:'brawler',camera:{zoom:false},
 enter(){G.attracting=false;G.context=null;G.sessionPhase=null;G.idle=0;G.mode='story';G.light();G.music('studio');hero=G.playerRig(2.05);const latest=game.saves.latest();
 const items=[];if(latest)items.push(['Continue',()=>{G.loadMember(latest.slot);G.go('bungalow');}]);items.push(['New member',()=>G.go('members')],['Class',()=>G.go('classLobby')],{label:'Free Play',disabled:!G.member.ended,fn:()=>{G.mode='free';G.go('catalog');}},['Settings',()=>G.settings()],['About / Credits',()=>G.go('about')]);
 menu=new G.Pills(items,{x:14,y:()=>Math.max(111,game.H-6-items.length*21),w:157,h:17,gap:4});
 },
 update(dt){const x=(game.W*.75-game.W/2)/1.5;G.poseRig(hero,'stork',G.time,{dt,x,y:11,wob:[Math.sin(G.time*.7)*.08,.03]});game.focus(0,0,20);menu.update(dt);},
 draw(r){G.studio(r,'deck',{title:true});const x=(r.W*.75-r.W/2)/1.5;G.mat(r,x,12);G.drawRig(r,hero,x,12);G.tare(r,x-24,35,1.3);r.overlay(g=>{G.text(g,'INSTITUTE FOR GENTLE IMPROVEMENT',14,13,{color:P.muted});E.font.title(g,'Wee',14,29,{scale:4,colors:['#36bfd0','#149caf'],outline:false,depth:1,depthColor:'#b9dadd'});E.font.title(g,'Serene',14,63,{scale:4,colors:['#36bfd0','#149caf'],outline:false,depth:1,depthColor:'#b9dadd'});G.text(g,'A little balance. A little better.',15,98,{color:P.ink});G.tag(g,'LUMBAR ISLAND',r.W-110,47);G.text(g,'Gently, or not at all.',r.W-15,r.H-17,{align:'right',color:P.muted});});menu.draw(r);}
};
})();
