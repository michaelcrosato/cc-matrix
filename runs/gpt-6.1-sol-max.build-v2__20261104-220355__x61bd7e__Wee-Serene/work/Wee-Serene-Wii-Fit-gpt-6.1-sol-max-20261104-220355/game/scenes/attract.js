(() => {
const G=window.G,E=G.E,game=G.game,P=G.palette;
G.ATTRACT=['island','bodycheck','stork','flow','candle','squat','pushup','lunge','step','hoop','jog','slalom','tray','laundry','class','results','duel'];
let index=0,clock=0,attractIsland,gertrude;
G.startAttract=()=>{if(G.inSession)return;G.game.shell.hide();G.attracting=true;G.go('attract');};
G.attractLoad=i=>{index=i%G.ATTRACT.length;clock=0;G.attractItem=G.ATTRACT[index];const key=G.attractItem;G.context=null;G.sessionPhase='play';G.light();
 if(key==='island'){if(!attractIsland)attractIsland=G.makeIsland();game.setView('threequarter');game.cam.bounds=v=>attractIsland.map.bounds(v);G.music('island');return;}
 game.setView('brawler');game.cam.bounds=null;game.cam.smooth=0;game.focus(0,0,20);
 const id=key==='bodycheck'?'stork':key==='duel'?'candle':key==='results'?'squat':key==='class'?'stork':key;
 G.context=G.makeContext(id,1,{cheat:true,duel:key==='duel',duration:key==='duel'?90:G.activities[id].duration,fixedDuration:true,contestants:key==='class'?Array.from({length:4},(_,i)=>({name:G.regulars[i][0],bot:'expert',rig:G.regularRig(i,1.45),color:E.PLAYER_COLORS[i]})):[{name:'Gertrude',bot:'expert',rig:G.regularRig(0,1.9),color:P.coral}]});
 if(key==='duel'){G.context.duel=true;G.duelRig=G.regularRig(0,1.8);}
 G.music(({flow:'yoga',candle:'raft',step:'step',hoop:'step',jog:'jog',slalom:'ski',tray:'tray',laundry:'laundry'})[id]||'studio');
};
G.scenes.attract={view:'brawler',camera:{zoom:false},enter(){G.attracting=true;G.mode='attract';G.attractLoad(0);},update(dt){clock+=dt;if(clock>=15){G.attractLoad(index+1);return;}
 if(G.attractItem==='island'){G.islandUpdate(attractIsland,dt,true);return;}const ctx=G.context;if(ctx&&!ctx.done){for(let i=0;i<4;i++)G.stepContext(ctx,dt,'expert');if(ctx.duel)G.poseRig(G.duelRig,'meditate',ctx.time,{dt,x:47,y:4});}game.focus(0,0,20);},
 draw(r){if(G.attractItem==='island')G.drawIsland(r,attractIsland,true);else if(G.attractItem==='results'){G.studio(r,'deck');r.overlay(g=>{G.text(g,'★ ★ ★',r.W/2,80,{align:'center',scale:4,color:'#dfb456'});G.drawGerald(g,r.W/2,154,2);G.text(g,'Gerald has swallowed your minutes.',r.W/2,186,{align:'center'});});}
 else {const ctx=G.context,a=ctx.a,f=G.families[a.family];if(f.fullDraw)f.fullDraw(r,ctx);else{G.studio(r,ctx.duel?'raft':a.room);for(const c of ctx.contestants){G.mat(r,c.worldX||0,c.worldY||0,c.color);G.drawRig(r,c.rig,c.worldX||0,c.worldY||0);}a.draw(r,ctx);if(ctx.duel)G.drawRig(r,G.duelRig,47,4);G.tare(r,-82,14,1.2);r.overlay(g=>{ctx.contestants.forEach((c,i)=>G.drawPlate(g,r.W/2+(i-(ctx.contestants.length-1)/2)*70,r.H-33,c.bal,ctx.contestants.length>1?18:26));});}a.hud(r,ctx);}
 r.overlay(g=>{G.round(g,10,9,Math.min(265,r.W-65),30,'#ffffff');G.text(g,'Wee Serene  /  DEMO',18,15,{color:P.cyan});G.text(g,G.attractItem==='island'?'A little walk on Lumbar Island':G.attractItem==='duel'?'The Grand Stillness':G.attractItem==='bodycheck'?'The morning Body Check':G.attractItem==='class'?'A class together':G.attractItem==='results'?'A place for your minutes':G.context.a.name,18,27);const s='Press any button';G.round(g,r.W-114,r.H-24,104,15,'#ffffff');G.text(g,s,r.W-107,r.H-20,{color:P.cyan});if(clock<5&&index===0)G.paragraph(g,G.lines.attract[0],14,r.H-57,260,{color:P.ink});});}
};
})();
