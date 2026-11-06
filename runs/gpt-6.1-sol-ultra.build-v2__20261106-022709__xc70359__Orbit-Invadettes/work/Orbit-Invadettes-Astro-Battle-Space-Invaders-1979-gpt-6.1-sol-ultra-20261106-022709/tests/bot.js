/** Observation-only pilot: every effect occurs through ordinary move/fire/repair commands. */
import { clearShot,repairPreview } from '../src/sim.js';
function projectedEnemyX(w,e,seconds){
 const f=w.formation;let x=f.x,y=f.y,dir=f.dir,t=f.timer;const n=Math.floor((seconds+t)/f.interval);
 const min=Math.min(...w.enemies.map(v=>v.col))*f.spacingX+f.startX-7,max=Math.max(...w.enemies.map(v=>v.col))*f.spacingX+f.startX+7;
 for(let i=0;i<n;i++)if(dir>0&&max+x+4>460||dir<0&&min+x-4<20){dir*=-1;y+=w.tuning.descent;}else x+=dir*4;
 return f.startX+e.col*f.spacingX+x;
}
export function botCommands(w,{repair=true}={}) {
 return w.players.map((p,seat)=>{
  if(!p.alive||!p.active)return {};
  const dangers=w.bullets.filter(b=>b.owner<0).map(b=>({x:b.x,t:(p.y-b.y)/b.vy,r:b.r+8})).filter(b=>b.t>-.1&&b.t<1.4);
  const risk=(x)=>dangers.reduce((v,b)=>v+(Math.abs(x-b.x)<b.r?80*(1.5-b.t):Math.abs(x-b.x)<b.r+9?10*(1.5-b.t):0),0);
  let target=p.x,best=Infinity;
  if(w.boss){
   const b=w.boss;const es=b.phase===1?b.emitters.filter(e=>e.hp>0):[{x:b.x,y:b.y,open:b.open}];
   for(const e of es){const score=Math.abs(e.x-p.x)+risk(e.x)+(e.open?0:20);if(score<best){best=score;target=e.x;}}
   if(b.phase===2&&b.attackPending&&b.telegraph<.8&&risk(target)>0)target=b.safeLane;
  }else{
   for(const e of w.enemies){if(w.enemies.some(z=>z.col===e.col&&z.y>e.y))continue;
    const eta=(p.y-e.y)/w.tuning.playerShotSpeed;const x=projectedEnemyX(w,e,eta),score=Math.abs(x-p.x)+risk(x)+(clearShot(w,x)?0:24)+(seat===1&&x<240?35:seat===0&&w.players.length>1&&x>240?35:0);
    if(score<best){best=score;target=x;}
   }
  }
  // A saucer is worth leaving cover for only when its projected lane is clear.
  if(w.saucer){const s=w.saucer,eta=(p.y-s.y)/w.tuning.playerShotSpeed,x=s.x+s.dir*31*eta;const unblocked=!w.enemies.some(e=>Math.abs(projectedEnemyX(w,e,(p.y-e.y)/w.tuning.playerShotSpeed)-x)<10);if(x>20&&x<460&&unblocked&&clearShot(w,x)&&Math.abs(x-p.x)+risk(x)<best+65)target=x;}
  // Catch visible salvage that can still be reached. It passes through cover.
  for(const item of w.pickups){const available=(p.y-item.y)/34;if(p.charges<3&&item.y>160&&available>0&&Math.abs(item.x-p.x)/w.tuning.playerSpeed<available-.05&&risk(item.x)<20){target=item.x;break;}}
  // Resolve urgent threats with small horizontal moves before returning to aim.
  if(dangers.some(b=>b.t<.75&&Math.abs(p.x-b.x)<b.r+4)){
   let escape=p.x,score=Infinity;for(let d=-54;d<=54;d+=9){const x=Math.max(18,Math.min(462,p.x+d));const value=risk(x)*4+Math.abs(d)+Math.abs(target-x)*.03;if(value<score){score=value;escape=x;}}
   target=escape;
  }
  const preview=repairPreview(w,seat);
  return {targetX:target,fire:true,repair:repair&&p.charges>0&&preview.usable&&preview.cells.length>=12&&w.tick%(96+seat*13)===0};
 });
}
