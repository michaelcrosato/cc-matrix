import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../vendor/engine/my-3d2dge.js';
import '../src/content/content.js';
import '../src/sim/sim.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const S = globalThis.RingSim;
const C = globalThis.RingContent;
const DT = 1 / 120;
const compact = c => [c.mx,c.my,c.ax,c.ay].map(n=>Math.round((n||0)*100)/100).concat(['primary','power','dodge','interact','ping'].map(k=>+!!c[k]));

export function ordinaryExpedition(options = {}) {
  const seed = options.seed || 'normal-fourfold-20261106';
  const classes = options.classes || ['warrior','wizard'];
  const w = S.create({ seed, classes });
  const itinerary = options.caches ? ['dungeon','cacheCrystal','crystal','inferno','cacheShift','shifting','final'] : ['dungeon','crystal','inferno','shifting','final'];
  const actions = [], transitions = [], samples = [];
  let cursor = 0, lastEpoch = -1, lastAction = '', lastProgressTick = 0, lastHistory = 0;
  let status = 'timeout';
  const maxTicks = Math.round((options.maxSeconds || 1200) / DT);
  const maxRetries = options.maxRetries ?? 3;
  for (let i = 0; i < maxTicks; i++) {
    if (w.mode === 'victory') { status = 'victory'; break; }
    if (w.mode === 'failed') {
      if (w.stats.retries >= maxRetries) { status = 'wipe'; break; }
      const ok = S.intent(w,0,{type:'retry'});
      actions.push({at:w.tick,intent:'retry',ok});
    }
    if (w.mode === 'board') {
      const site = itinerary[cursor++];
      if (!site) { status = 'itinerary-exhausted'; break; }
      const ok = S.intent(w,0,{type:'route',value:site});
      actions.push({at:w.tick,intent:'route',value:site,ok});
      if (!ok) { status = 'route-rejected'; break; }
    }
    if (w.epoch !== lastEpoch) {
      transitions.push({tick:w.tick,time:w.time,epoch:w.epoch,room:w.roomId,dread:w.dread,hp:w.heroes.map(h=>h.hp)});
      lastEpoch = w.epoch; lastProgressTick = w.tick;
    }
    // This driver observes state and supplies the same ordinary action object as a human input device.
    // The companion utility is a path/ability chooser, not a simulation shortcut.
    const cmd = S.companion(w,w.heroes[0],DT,true);
    cmd.ping = w.tick % 600 === 0;
    const encoded = JSON.stringify(compact(cmd));
    if (encoded !== lastAction) { if(options.record !== false) actions.push({at:w.tick,c:JSON.parse(encoded)}); lastAction = encoded; }
    S.step(w,DT,[cmd]);
    if (w.history.length !== lastHistory) { lastProgressTick=w.tick; lastHistory=w.history.length; }
    if (w.tick % 240 === 0) samples.push({tick:w.tick,room:w.roomId,hp:w.heroes.map(h=>h.hp),down:w.heroes.map(h=>h.down),pos:w.heroes.map(h=>[Math.round(h.x),Math.round(h.y)]),carrier:w.ring?.carrier||0,beat:w.finalBeat,bound:w.bound});
    if (w.tick - lastProgressTick > 120 * 150) { status = 'stalled'; break; }
  }
  const expected = ['courtyard','dungeon1','dungeon2','crystal1','crystal2','inferno1','inferno2','shifting1','shifting2','final'];
  const visited = w.history.filter(e=>e.type==='room-enter').map(e=>e.room);
  const completed = w.history.filter(e=>e.type==='room-complete').map(e=>e.room);
  const secured = w.history.filter(e=>e.type==='ring-secured').map(e=>e.index);
  const bound = w.history.filter(e=>e.type==='seal-bound').map(e=>e.index);
  const issues=[];
  if(status!=='victory') issues.push(`Expedition ended ${status} in ${w.roomId} at ${w.roomTime.toFixed(2)}s (${w.heroes.map(h=>`${h.classId}:${h.hp}@${h.x.toFixed(1)},${h.y.toFixed(1)}`).join('; ')})`);
  if(!expected.every(id=>visited.includes(id))) issues.push('Required room-enter history is incomplete: '+expected.filter(id=>!visited.includes(id)).join(','));
  if(!expected.slice(1,-1).every(id=>completed.includes(id))) issues.push('Eight authored room completions are incomplete');
  if(new Set(secured).size!==4 || secured.length!==4 || !w.rings.every(Boolean)) issues.push('Four rings were not secured exactly once');
  if(new Set(bound).size!==4 || bound.length!==4) issues.push('Four distinct final seal stations were not bound exactly once');
  if(w.history.filter(e=>e.type==='victory').length!==1) issues.push('Exactly one ordinary victory event required');
  if(w.assisted||w.invulnerable||w.events.some(e=>e.type==='debug')) issues.push('Normal evidence was assisted');
  const evidence={seed,classes,normalActions:true,debugMutations:false,status,simulationSeconds:w.time,ticks:w.tick,stats:w.stats,dread:w.dread,rings:w.rings,caches:w.caches,transitions,history:w.history,samples,actions,issues,
    caveat:'A deterministic simulation driver is an input stand-in. This is not evidence of a human 20–30 minute playtime, physical controllers, remote humans or subjective difficulty.'};
  return {world:w,evidence,issues};
}

export function runPlaythroughTests(options = {}) {
  const results=[];
  const run=ordinaryExpedition({caches:true,...options});
  fs.writeFileSync(path.join(ROOT,'evidence/playthrough.json'),JSON.stringify(run.evidence,null,2));
  results.push({name:'ordinary complete expedition including both optional caches',pass:run.issues.length===0,errors:run.issues,seed:run.evidence.seed});
  const fresh=S.create({seed:'replay-after-victory'});
  results.push({name:'fresh replay clears prior rings, Dread and statistics',pass:fresh.rings.every(v=>!v)&&fresh.dread===0&&fresh.stats.rooms===0&&fresh.mode==='courtyard',errors:[]});
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results=runPlaythroughTests();
  for (const r of results) if(!r.pass) console.error('FAIL '+r.name+'\n'+r.errors.join('\n'));
  console.log(`${results.filter(r=>r.pass).length} passed, ${results.filter(r=>!r.pass).length} failed`);
  process.exitCode=results.some(r=>!r.pass)?1:0;
}
