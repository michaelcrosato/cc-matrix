(() => {
const G=window.G,E=G.E;
G.families.step={
 setup(ctx,c){const bpm=ctx.tier===2?120:100,clock={step:0,t:0,bpm,playing:true},dummy={time:0,audio:{pos:clock,sfx(){},music(){}},input:{pressed(){return false;},released(){return false;},down(){return false;}}};
 c.data={clock,dummy,stepAnim:0,judgment:'On the click'};
 const song={...G.SONGS[ctx.tier===2?'step2':'step'],loop:false,len:Math.ceil(ctx.duration*bpm/60*4)};
 c.data.rh=new E.Rhythm(dummy,{song,chart:G.CHARTS[ctx.tier-1],lanes:['stepL','stepD','stepU','stepR'],windows:{perfect:45*G.DEV.rhythmWindow,great:90*G.DEV.rhythmWindow,good:135*G.DEV.rhythmWindow},life:1,lead:2,on:{judge(j){c.data.stepAnim=.4;c.data.judgment=j==='miss'?'Next one':j==='perfect'?'Perfect':j==='great'?'Lovely':'Good';if(j!=='miss'&&G.context===ctx)G.game.audio.sfx('tick');},fail(rh){rh.life=.5;rh.done=false;rh.failed=false;}}});
 c.data.rh.notes=c.data.rh.notes.filter(n=>n.step<song.len);c.data.rh.started=true;
 },
 bot(ctx,c,dt,skill){const d=c.data,bpm=ctx.tier===2?120:100,step=ctx.time*bpm/60*4;c.intent.steps=[false,false,false,false];for(const n of d.rh.notes){if(n.j)continue;const offset=skill==='poor'?.10:skill==='average'?.065:skill==='good'?.022:.004;const skip=skill==='poor'?4:skill==='average'?11:9999;if(Math.floor(n.step)%skip===0&&skill!=='expert'&&skill!=='good')continue;if(step>=n.step+offset*bpm/60*4&&step<n.step+.14*bpm/60*4)c.intent.steps[n.lane]=true;}},
 update(ctx,c,dt){const d=c.data,bpm=ctx.tier===2?120:100;d.clock.t=ctx.time;d.clock.step=ctx.time*bpm/60*4;d.dummy.time=ctx.time;d.stepAnim=Math.max(0,d.stepAnim-dt);c.intent.steps.forEach((hit,i)=>{if(hit)d.rh.hit(i);else d.rh.release(i);});d.rh.update();c.bal.step(dt,c.intent,{noFalls:true});G.animateContestant(ctx,c,dt);},
 result(ctx,c){const rh=c.data.rh;return {pct:rh.counts.perfect+rh.counts.great+rh.counts.good+rh.counts.miss?rh.accuracy:0,detail:rh.maxCombo+' best streak · '+rh.counts.perfect+' perfect steps'};},
 draw(){},
 hud(r,ctx){if(ctx.contestants.length===1){const d=ctx.contestants[0].data;d.rh.draw(r,{x:r.W/2,y:r.H-22,dir:'down',len:53,gap:30,size:7,colors:['#3e98ae','#b293bc','#62af91','#e1ae5e'],arrows:true});r.overlay(g=>G.text(g,d.judgment,16,r.H-42,{color:G.palette.cyan}));}else ctx.contestants.forEach((c,i)=>c.data.rh.draw(r,{x:r.W/2+(i-(ctx.contestants.length-1)/2)*82,y:r.H-12,dir:'down',len:40,gap:13,size:4,arrows:true}));}
};
})();
