() => {
  __game.testing.manual(true); __game.testing.start(1);
  const w=__game.testing.rawWorld,p=w.players[0],log=[];
  const controls=(x,y)=>{const e=w.enemies.filter(e=>e.alive&&Math.hypot(e.x-p.x,e.y-p.y)<13).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];return {move:Math.max(-1,Math.min(1,(x-p.x)*1.45)),jet:p.vy<Math.max(-6,Math.min(6,(y-p.y)*3)),fire:true,...(e?{aimX:e.x-p.x,aimY:e.y-p.y}:{} )};};
  function frame(input){w.step(1/60,{0:input});w.animate(1/60);}
  function go(x,y,max=720){for(let i=0;i<max;i++){frame(controls(x,y));if(Math.hypot(p.x-x,p.y-y)<.48){log.push({at:[x,y],health:p.health,fuel:Math.round(p.fuel),air:Math.round(p.air)});return;}if(w.status==='won')return;if(w.status!=='playing')throw Error('Mission stopped: '+w.status);}throw Error('Route blocked '+JSON.stringify({target:[x,y],p:[p.x,p.y],fuel:p.fuel,health:p.health,log}));}
  function hold(x,y,seconds){for(let i=0;i<seconds*60;i++)frame(controls(x,y));}
  function charge(x,y,side,gate){go(x,y);p.face=side;p.bombCool=0;if(!w.plantBomb(p))throw Error('No charge available');go(-side*2,y+1);hold(-side*2,y+1,1.9);if(!w.gates[gate].open)throw Error('Gate did not break '+gate);}
  function rescue(id){p.interactCool=0;if(!w.interact(p)||p.carrying!==id)throw Error('Could not tether crew '+id);}
  function home(){go(0,3.8);go(-11.8,3.1);hold(-11.8,3.1,.25);}
  go(-2,3.7);go(0,-7);charge(2.2,-8.5,1,0);go(10,-7);go(16,-9.3);rescue(0);go(1,-7);home();
  if(w.rescued!==1)throw Error('First delivery failed');
  go(0,3.7);go(0,-22.8);charge(-2.2,-24,-1,1);go(-10,-23.4);go(-16,-25.4);rescue(1);go(-10,-23.2);go(0,-23);go(0,-13);go(-2.8,-13.7);hold(-2.8,-13.7,.3);go(0,-13);home();
  if(w.rescued!==2)throw Error('Second delivery failed');
  go(0,3.7);go(0,-43.5);charge(2.2,-46,1,2);go(10,-43);go(16,-43);go(16,-47.8);rescue(2);go(16,-43);go(0,-43);go(0,-29.3);go(2.8,-29.9);hold(2.8,-29.9,.4);go(0,-29.2);go(0,-13);go(-2.8,-13.7);hold(-2.8,-13.7,.4);go(0,-13);home();
  return {status:w.status,rescued:w.rescued,score:w.score,time:w.time,kills:w.kills,charges:w.charges,health:p.health,downs:p.downs,gates:w.gates.map(g=>g.open),tuned:w.tuning,log};
}
