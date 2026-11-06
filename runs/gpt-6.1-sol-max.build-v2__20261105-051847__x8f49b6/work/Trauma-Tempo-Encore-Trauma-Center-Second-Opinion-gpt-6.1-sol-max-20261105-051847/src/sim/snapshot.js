// Compact deltas fit a single unreliable packet. Keyframes restore full topology.
export function snapshot(state){return{t:'s',n:state.tick,p:state.phase,v:+state.vitals.toFixed(1),r:+state.timer.toFixed(1),b:state.beat,q:+state.beatPhase.toFixed(2),m:Math.round(state.bpm),s:state.site,c:state.composure,z:state.score,h:+state.hush.toFixed(2),f:+state.sforzando.toFixed(2),a:state.arrest?+state.arrestLeft.toFixed(1):0,tip:state.seats.map(s=>[s.id,+s.x.toFixed(3),+s.y.toFixed(3),s.tool,s.site,s.use,s.held||0]),e:state.entities.filter(e=>!e.done&&(['adagio','tremolo','coda','crescendo'].includes(e.kind)||state.seats.some(s=>s.held===e.id))).slice(0,12).map(e=>[e.id,+e.x.toFixed(2),+e.y.toFixed(2),Math.round(e.hp||0),+(e.progress||0).toFixed(2),e.embedded?1:0])};}
export function keyframe(state){const s=structuredClone(state);for(const e of s.entities){if(e.cells){e.covered=e.cells.filter(c=>c[2]).length;e.cells=[];}delete e.deviations;}return{t:'k',n:s.tick,state:s};}
export function applySnapshot(current,data){
 if(data.t==='k'){
  if(!current||data.n>=current.tick)return data.state;
  if(data.state.phase<current.phase)return current;
  const full=data.state;
  for(const id of ['tick','vitals','timer','beat','bar','beatPhase','elapsed','pulse','bpm','site','composure','score','hush','sforzando','arrest','arrestLeft'])full[id]=current[id];
  for(const seat of full.seats){const newer=current.seats.find(s=>s.id===seat.id);if(newer)Object.assign(seat,{x:newer.x,y:newer.y,tool:newer.tool,site:newer.site,use:newer.use});}
  for(const e of full.entities){const newer=current.entities.find(n=>n.id===e.id);if(newer&&!e.done){e.x=newer.x;e.y=newer.y;e.hp=newer.hp;e.progress=newer.progress;}}
  return full;
 }
 if(data.n<=(current?.tick??-1)||data.t!=='s'||!current)return current;
 const s=structuredClone(current);Object.assign(s,{tick:data.n,phase:data.p,vitals:data.v,timer:data.r,beat:data.b,beatPhase:data.q,bpm:data.m,bar:Math.floor(data.b/4),elapsed:data.n/60,pulse:Math.exp(-data.q*9),hush:data.h||0,sforzando:data.f||0,site:data.s,composure:data.c,score:data.z,arrest:!!data.a,arrestLeft:data.a});
 for(const a of data.tip){const seat=s.seats.find(s=>s.id===a[0]);if(seat)Object.assign(seat,{x:a[1],y:a[2],tool:a[3],site:a[4],use:a[5],held:a[6]||null});}
 for(const a of data.e){const e=s.entities.find(e=>e.id===a[0]);if(e)Object.assign(e,{x:a[1],y:a[2],hp:a[3],progress:a[4],embedded:!!a[5]});}
 return s;
}
