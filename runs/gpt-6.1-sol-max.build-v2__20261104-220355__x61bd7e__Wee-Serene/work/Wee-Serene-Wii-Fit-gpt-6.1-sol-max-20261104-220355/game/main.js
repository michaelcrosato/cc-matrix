(() => {
const G=window.G,game=G.game;
G.finishRegistry();
for(const [name,scene]of Object.entries(G.scenes)){const draw=scene.draw;scene.draw=r=>{draw?.(r);if(G.dev.trace&&G.context)r.overlay(g=>{const b=G.context.contestants[0].bal;G.text(g,'p '+b.x.toFixed(2)+' '+b.y.toFixed(2)+' / v '+b.vx.toFixed(2)+' '+b.vy.toFixed(2),12,r.H-88,{color:G.palette.ink});});if(G.dev.open&&!G.inSession)G.devDraw(r);};}
game.hook('enter',name=>{G.sceneName=name;G.visited.add(name);});
let lastMouse=-99;
game.hook('input',dt=>{const I=game.input,p=I.pointer(),mt=I.mouse?.t||-99;const moved=mt>lastMouse;if(moved){lastMouse=mt;if(mt>G.lastKey&&I.lastDevice!=='gamepad')G.source='mouse';}if(I.lastDevice==='gamepad')G.source='gamepad';
 const activity=I.anyPressed()||Math.hypot(...I.move())>.1||moved;
 if(activity){G.idle=0;if(G.attracting){G.attracting=false;I.consumeAll();G.go('title',null,true);return;}}
 if(G.inSession&&G.hub?.over){I.clear();return;}
 if(!G.inSession&&!G.attracting&&['title','members','memberOptions','customize','about','classLobby','catalog'].includes(game.sceneName)){G.idle+=dt;if(G.idle>=10)G.startAttract();}
 G.devUpdate?.(dt);
});
game.hook('step',dt=>{G.time+=dt;game.audio.voiceVolume=game.settings.voice;game.audio.applyVolume();if(G.dev.open&&G.DEV.timeScale!==game.timeScale)game.timeScale=G.DEV.timeScale;});
G.start=()=>{
 let target=G.inSession?'round':'title',data;
 if(!G.inSession&&typeof location!=='undefined'){
 const h=location.hash||'';if(h.startsWith('#act/')){const [id,t]=h.slice(5).split('/');if(G.activities[id]){G.mode='free';G.member.ended=true;G.pending={id,tier:Number(t)||1,mode:'free'};target='card';data=G.pending;}}
 else if(h==='#hub')target='island';else if(h.startsWith('#day/')){G.member.day=Math.max(1,Math.min(5,Number(h.slice(5))||1));target='bungalow';}else if(h==='#ending')target='ending';
 }
 G.sceneName=target;
 game.start({scene:target,scenes:G.scenes,boot:{title:G.title,steps:[{label:'Zeroing the scale',run:()=>{}},{label:'Sanding the instructors',run:()=>{}},{label:'Counting the ducks',run:()=>{}},{label:'Telling the hippo',run:()=>{}}]}});
 if(data){game.booted.then(()=>G.go(target,data,true));}
 if(G.inSession)G.connectHub();
};
G.start();
})();
