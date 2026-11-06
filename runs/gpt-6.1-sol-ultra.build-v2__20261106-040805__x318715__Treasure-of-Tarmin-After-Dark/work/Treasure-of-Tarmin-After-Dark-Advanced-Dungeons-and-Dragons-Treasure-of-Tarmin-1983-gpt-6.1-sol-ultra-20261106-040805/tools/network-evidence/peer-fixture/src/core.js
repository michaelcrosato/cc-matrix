import { CONTENT_VERSION, CONTENT, FLOORS, ITEMS, ENEMIES, DEFAULT_TUNING } from './content.js';

export const STATE_VERSION = 1;
const clone = value => JSON.parse(JSON.stringify(value));
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
const ok = extra => ({ ok: true, ...extra });
const fail = reason => ({ ok: false, reason });
export const itemName = item => item ? ITEMS[item.kind]?.name || item.kind : 'Empty';
export const getFloor = state => FLOORS[state.floor];
export function rng(state) { state.rng = ((state.rng * 1664525 + 1013904223) >>> 0); return state.rng / 4294967296; }
function event(state, type, data = {}) {
  const e = { id: `${state.expedition}:${++state.eventSeq}`, type, tick: state.tick, at: state.clock, ...data };
  state.events.push(e); if (state.events.length > 48) state.events.shift(); return e;
}
function say(state, text) { state.log.push(text); if (state.log.length > 24) state.log.shift(); event(state, 'message', { text }); }
function instance(state, kind, id) { return { id: id || `${state.expedition}:item:${++state.itemSeq}`, kind }; }
function linkFloor(state) {
  const f = state.floors[state.floor];
  for (const key of ['enemies', 'loot', 'doors', 'features', 'explored']) state[key] = f[key];
}
function makeFloor(def) {
  return { id: def.id, rows: [...def.rows], explored: [], doors: clone(def.doors), features: clone(def.features), loot: def.loot.map(l => ({ ...l, claimed: false })), enemies: def.enemies.map(e => {
    const d = ENEMIES[e.kind]; return { ...e, name: d.name, war: d.war, spirit: d.spirit, maxWar: d.war, maxSpirit: d.spirit, armor: d.armor, ward: d.ward, alive: true, phase: 1, scaled: false, rounds: 0, intent: null };
  }) };
}
function player(state, identity) {
  const { x, y, dir } = FLOORS[state.floor].start;
  return { id: String(identity.id), name: String(identity.name || 'Adventurer').slice(0, 40), x, y, dir, war: state.tuning.maxWar, spirit: state.tuning.maxSpirit, maxWar: state.tuning.maxWar, maxSpirit: state.tuning.maxSpirit, food: 7, arrows: 9, right: instance(state, 'bow'), left: instance(state, 'blade'), pack: [instance(state, 'shield'), instance(state, 'potion'), instance(state, 'throwing'), null, null, null], armor: null, ring: null, down: false, connected: true, guard: null, unlocks: { war: true, spirit: state.unlockedSpirit }, sightUntil: 0, lastSafe: { x, y }, stats: { kills: 0, damage: 0 } };
}
export function createRun({ players = [{ id: 'solo', name: 'Adventurer' }], seed = 1733, tuning = {}, mode = 'solo', expedition } = {}) {
  const state = { version: STATE_VERSION, contentVersion: CONTENT_VERSION, expedition: expedition || `tarmin-${(Number(seed) >>> 0).toString(36)}`, seed: Number(seed) >>> 0, rng: Number(seed) >>> 0, mode, floor: 0, floors: FLOORS.map(makeFloor), players: {}, tuning: { ...DEFAULT_TUNING, ...tuning }, status: 'playing', bossDefeated: false, treasureClaimed: false, keyring: [], unlockedSpirit: false, encounter: null, round: 0, clock: 0, tick: 0, eventSeq: 0, itemSeq: 0, events: [], log: [], modified: false, invulnerable: false, descentReady: [], stats: { rounds: 0, kills: 0, rests: 0, steps: 0, treasure: 0, gates: 0, secrets: 0 }, checkpoint: null };
  linkFloor(state); for (const identity of players.slice(0, 2)) { const p = player(state, identity); state.players[p.id] = p; }
  reveal(state); say(state, 'Descend. Defeat the guardian. Claim the treasure.'); saveCheckpoint(state); return state;
}
export function snapshot(state) { return clone(state); }
export function restore(value) {
  const s = typeof value === 'string' ? JSON.parse(value) : clone(value);
  if (!s || s.version !== STATE_VERSION || s.contentVersion !== CONTENT_VERSION || !Array.isArray(s.floors) || s.floors.length !== FLOORS.length || !s.players || !Number.isInteger(s.floor) || s.floor < 0 || s.floor >= FLOORS.length) throw new Error('This is not a compatible expedition save.');
  for (const p of Object.values(s.players)) {
    if (!Array.isArray(p.pack) || p.pack.length !== 6 || !Number.isFinite(p.war) || !Number.isFinite(p.spirit) || p.war < 0 || p.spirit < 0 || !Number.isFinite(p.maxWar) || !Number.isFinite(p.maxSpirit) || p.maxWar < 1 || p.maxSpirit < 1 || p.war > p.maxWar || p.spirit > p.maxSpirit || p.food < 0 || p.arrows < 0) throw new Error('The saved pack or strengths are damaged.');
    for (const it of [p.right, p.left, p.armor, p.ring, ...p.pack]) if (it && !ITEMS[it.kind]) throw new Error('The save contains an unknown item.');
  }
  linkFloor(s); for (const p of Object.values(s.players)) if (!walkable(s, p.x, p.y, { ignoreEnemy: true })) throw new Error('The save places an adventurer inside a wall.'); return s;
}
function saveCheckpoint(s) { if (s.mode !== 'solo') return; const cp = snapshot(s); cp.checkpoint = null; s.checkpoint = cp; event(s, 'checkpoint', { floor: s.floor }); }
export function checkpoint(state) { if (state.mode !== 'solo' || state.encounter || state.status !== 'playing') return fail('A safe solo milestone is required.'); saveCheckpoint(state); return ok(); }
export function retryCheckpoint(state) {
  if (!state.checkpoint || state.mode !== 'solo') return fail('No solo floor-entry checkpoint is available.');
  const cp = clone(state.checkpoint); cp.checkpoint = clone(state.checkpoint); Object.assign(state, restore(cp)); say(state, 'The lantern is lit again. Your floor-entry supplies are restored.'); return ok();
}
function reveal(s) {
  for (const p of Object.values(s.players)) for (let y = p.y - 2; y <= p.y + 2; y++) for (let x = p.x - 2; x <= p.x + 2; x++) {
    if (x < 0 || y < 0 || y >= getFloor(s).rows.length || x >= getFloor(s).rows[0].length || distance(p, { x, y }) > 3) continue;
    const key = `${x},${y}`; if (!s.explored.includes(key)) s.explored.push(key);
  }
}
export function walkable(s, x, y, { ignoreEnemy = false, ignoreDoor = false, ignoreSecret = false } = {}) {
  const row = s.floors[s.floor].rows[y]; if (!row || row[x] === undefined || row[x] === '#') return false;
  if (!ignoreDoor && s.doors.some(d => d.x === x && d.y === y && !d.open)) return false;
  if (!ignoreSecret && s.features.some(f => f.kind === 'secret' && f.x === x && f.y === y && !f.open)) return false;
  return ignoreEnemy || !s.enemies.some(e => e.alive && e.x === x && e.y === y);
}
export function lineOfSight(s, a, b) {
  if (a.x !== b.x && a.y !== b.y) return false;
  const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y); let x = a.x + dx, y = a.y + dy;
  for (let count = 0; count < 64 && (x !== b.x || y !== b.y); count++, x += dx, y += dy) if (!walkable(s, x, y, { ignoreEnemy: true })) return false;
  return true;
}
function living(s) { return Object.values(s.players).filter(p => !p.down && p.connected !== false); }
function setIntents(s) {
  if (!s.encounter || s.encounter.preparation) return;
  const participants = living(s).sort((a, b) => a.id.localeCompare(b.id));
  for (const id of s.encounter.enemies) {
    const e = s.enemies.find(e => e.id === id && e.alive); if (!e) continue;
    const d = ENEMIES[e.kind]; const reachable = participants.filter(p => lineOfSight(s, e, p) && distance(e, p) <= 4);
    const target = (reachable.length ? reachable : participants)[e.rounds % Math.max(1, (reachable.length ? reachable : participants).length)];
    let channel = d.channel, power = d.power, label = channel === 'war' ? 'Blade strike' : 'Rune sting';
    if (e.kind === 'brute') { power = e.rounds % 2 === 0 ? 0 : d.power; label = power ? 'HAMMER FALL · move or guard' : 'Raises hammer · no damage'; }
    if (e.kind === 'wraith') { channel = e.rounds % 2 === 0 ? 'spirit' : 'war'; label = channel === 'war' ? 'Steel lament' : 'Soul lament'; }
    if (e.kind === 'sentinel') label = 'Shield bash';
    if (e.kind === 'minotaur') { channel = e.phase === 1 ? 'war' : e.phase === 2 ? 'spirit' : e.rounds % 2 === 0 ? 'war' : 'spirit'; power = e.phase === 3 ? 9 : 7; label = ['','IRON SEAL · horn sweep','EMBER SEAL · soul brand','JOINED HORNS · alternating strike'][e.phase]; }
    e.intent = { channel, power, target: target?.id || null, x: target?.x ?? e.x, y: target?.y ?? e.y, label };
  }
  event(s, 'intention', { round: s.encounter.round });
}
function trigger(s, p) {
  if (s.encounter || p.down) return;
  const e = s.enemies.find(e => e.alive && distance(p, e) <= 2 && lineOfSight(s, p, e)); if (!e) return;
  if (!e.scaled) { const scale = living(s).length > 1 ? 1.55 : 1; e.war = e.maxWar = Math.ceil(e.maxWar * scale); e.spirit = e.maxSpirit = Math.ceil(e.maxSpirit * scale); e.scaled = true; }
  s.encounter = { id: e.id, enemies: [e.id], round: ++s.round, plans: {}, deadline: null, startedTick: s.tick, preparation: false, safe: Object.fromEntries(Object.values(s.players).map(p => [p.id, { ...p.lastSafe }])) };
  setIntents(s); say(s, `${e.name} bars your way. Read its intention. Choose, then commit.`); event(s, 'encounter', { target: e.id });
}
export function inspectTarget(s, id, target) {
  const p = s.players[id]; if (!p) return null;
  const e = target ? s.enemies.find(e => e.id === target) : s.encounter ? s.enemies.find(e => s.encounter.enemies.includes(e.id) && e.alive) : s.enemies.filter(e => e.alive && distance(p, e) <= 4 && lineOfSight(s, p, e)).sort((a,b)=>distance(p,a)-distance(p,b))[0];
  return e ? { ...clone(e), description: ENEMIES[e.kind].description } : null;
}
export function restPreview(s, id) {
  const p = s.players[id]; if (!p) return null;
  return { food: 1, war: Math.max(0, Math.min(s.tuning.rationWar, p.maxWar - p.war)), spirit: Math.max(0, Math.min(s.tuning.rationSpirit, p.maxSpirit - p.spirit)) };
}
function attackSpec(s, p, a) {
  if (a.channel) {
    if (!['war','spirit'].includes(a.channel) || !p.unlocks[a.channel]) return { error: 'That basic attack has not been learned.' };
    return { channel: a.channel, power: 3, range: a.channel === 'war' ? 1 : 3, fallback: true, name: a.channel === 'war' ? 'Basic strike' : 'Spirit spark' };
  }
  const it = a.slot !== undefined ? p.pack[a.slot] : p.right; const d = it && ITEMS[it.kind];
  if (!d?.channel) return { error: 'Hold a weapon, or select a learned basic attack.' };
  if (d.reuse === 'ammo' && p.arrows < 1) return { error: 'No arrows. Swap hands or use a basic attack.' };
  return { ...d, item: it, source: a.slot !== undefined ? a.slot : 'right' };
}
export function attackPreview(s,id,a={type:'attack'}){
  const p=s.players[id];if(!p)return null;const spec=attackSpec(s,p,a);if(spec.error)return{ok:false,reason:spec.error};const target=findTarget(s,a);const defense=target?(spec.channel==='war'?target.armor:target.ward):0;const power=Math.max(1,Math.round(spec.power*s.tuning.playerDamage));return{ok:true,name:spec.name,channel:spec.channel,power,range:spec.range,defense,damage:Math.max(1,power-defense),cost:spec.reuse==='ammo'?'1 arrow':spec.reuse==='single'?'Consumed':'Reusable',target:target?.id||null};
}
function findTarget(s, a) { return s.enemies.find(e => e.alive && (a.target ? e.id === a.target : s.encounter?.enemies.includes(e.id))); }
function validateCombat(s, p, a) {
  if (a.type === 'attack') {
    const spec = attackSpec(s,p,a); if (spec.error) return fail(spec.error);
    const e = findTarget(s,a); if (!e || !s.encounter?.enemies.includes(e.id)) return fail('That threat is no longer part of this encounter.');
    if (distance(p,e) > spec.range || !lineOfSight(s,p,e)) return fail('Out of range or blocked. Reposition one tile, or choose a ranged implement.');
  }
  if (a.type === 'move') {
    if (!Number.isInteger(a.dx) || !Number.isInteger(a.dy) || Math.abs(a.dx) + Math.abs(a.dy) !== 1) return fail('Choose one adjacent tile.');
    const x = p.x + a.dx, y = p.y + a.dy; if (!walkable(s,x,y)) return fail('Stone, a closed passage, or a creature blocks that tile.');
    if (s.encounter && s.enemies.some(e => e.alive && !s.encounter.enemies.includes(e.id) && distance({x,y},e)<=2 && lineOfSight(s,{x,y},e))) return fail('Finish this encounter before drawing another threat.');
  }
  if (a.type === 'equip' && (!Number.isInteger(a.slot) || a.slot < 0 || a.slot > 5 || !p.pack[a.slot])) return fail('Choose an occupied pack slot.');
  if (a.type === 'use') {
    const it = a.slot !== undefined ? p.pack[a.slot] : p.right; if (!it) return fail('There is no item there.');
    if (!['potion','warBook','spiritBook','sightBook','armor','ring'].includes(it.kind)) return fail('This object must be held, attacked with, or worn through a different action.');
    if (it.kind === 'potion' && p.war === p.maxWar && p.spirit === p.maxSpirit) return fail('Both strengths are full. Keep the potion.');
  }
  if (a.type === 'revive') {
    const ally = s.players[a.target]; if (!ally?.down) return fail('That ally is already standing.'); if (distance(p,ally) > 1) return fail('Stand beside your ally to revive them.'); if (p.food < 1) return fail('Reviving an ally requires one ration.');
  }
  if (a.type === 'handoff') {
    const ally=s.players[a.to];if(!ally || ally.id===p.id || distance(p,ally)>1)return fail('Stand beside a teammate to hand off an item.'); if(!Number.isInteger(a.slot)||!p.pack[a.slot])return fail('Choose a packed item.');if(!ally.pack.includes(null))return fail('Your teammate needs an empty pack slot.');
  }
  return ok();
}
function removeItem(p, source) { if (source === 'right') p.right = null; else p.pack[source] = null; }
function damagePlayer(s, p, channel, raw, source) {
  const body = channel === 'war' ? (p.armor ? ITEMS[p.armor.kind].defense || 0 : 0) + (p.left?.kind === 'shield' ? ITEMS.shield.defense : 0) : (p.ring ? ITEMS[p.ring.kind].defense || 0 : 0);
  const guarding = p.guard && (p.guard === 'both' || p.guard === channel) ? 4 : 0;
  const power = Math.max(0, Math.round(raw * s.tuning.enemyDamage)); const loss = s.invulnerable ? 0 : Math.max(0, power - body - guarding);
  p[channel] = Math.max(0,p[channel]-loss); if (guarding) p.guard = null;
  event(s,'damage',{target:p.id,attacker:source,channel,power,defense:body,guard:guarding,damage:loss});
  say(s, `${channel === 'war' ? '⚔ War' : '◇ Spirit'}: ${power} − ${body} defense${guarding ? ` − ${guarding} guard` : ''} = ${loss} lost.`);
  if (p.war===0 || p.spirit===0) {p.down=true; event(s,'down',{target:p.id,channel}); say(s,`${p.name} falls. Either strength at zero is defeat.`);}
}
function kill(s,e,p) {
  e.alive=false; e.intent=null; s.stats.kills++; p.stats.kills++; event(s,'defeat',{target:e.id,kind:e.kind});
  if(e.kind==='minotaur'){s.bossDefeated=true;s.stats.treasure+=100;say(s,'The Horned Warden falls. The treasure is UNGUARDED. It is not yet yours.');event(s,'boss-defeated',{target:e.id});}
  else {say(s,`${e.name} is defeated. The corridor is yours.`);p.food++;}
}
function applyCombat(s,p,a) {
  const v=validateCombat(s,p,a); if(!v.ok){say(s,`${p.name} guards: ${v.reason}`);p.guard='both';return;}
  if(a.type==='attack'){
    const spec=attackSpec(s,p,a),e=findTarget(s,a);if(!e)return;
    const defense=spec.channel==='war'?e.armor:e.ward;const power=Math.max(1,Math.round(spec.power*s.tuning.playerDamage));const loss=Math.max(1,power-defense);
    e[spec.channel]=Math.max(0,e[spec.channel]-loss);p.stats.damage+=loss;
    if(spec.reuse==='ammo')p.arrows--;if(spec.reuse==='single')removeItem(p,spec.source);
    event(s,'attack',{attacker:p.id,target:e.id,channel:spec.channel,power,defense,damage:loss,item:spec.item?.kind||'basic'});say(s,`${spec.name}: ${power} − ${defense} = ${loss} ${spec.channel === 'war'?'War':'Spirit'} damage.`);
    if(e.war===0||e.spirit===0)kill(s,e,p);
    else if(e.kind==='minotaur'){
      const fraction=Math.min(e.war/e.maxWar,e.spirit/e.maxSpirit);const phase=fraction<=1/3?3:fraction<=2/3?2:1;
      if(phase>e.phase){e.phase=phase;s.encounter.preparation=true;s.encounter.plans={};s.encounter.deadline=null;event(s,'boss-phase',{target:e.id,phase});say(s,`${phase===2?'THE IRON SEAL BREAKS':'THE EMBER SEAL BREAKS'}. The Warden recoils. Rest or prepare, then continue.`);}
    }
  } else if(a.type==='guard'){p.guard=a.channel==='war'||a.channel==='spirit'?a.channel:'both';event(s,'guard',{target:p.id,channel:p.guard});say(s,`${p.name} guards the next hit (−4).`);}
  else if(a.type==='move'){p.x+=a.dx;p.y+=a.dy;s.stats.steps++;event(s,'move',{target:p.id,x:p.x,y:p.y});reveal(s);}
  else if(a.type==='equip'){const old=p.right;p.right=p.pack[a.slot];p.pack[a.slot]=old;event(s,'equip',{target:p.id,item:p.right.kind});say(s,`${p.name} readies ${itemName(p.right)}.`);}
  else if(a.type==='swap'){[p.right,p.left]=[p.left,p.right];event(s,'swap',{target:p.id});}
  else if(a.type==='use'){
    const source=a.slot!==undefined?a.slot:'right',it=source==='right'?p.right:p.pack[source];
    if(it.kind==='armor'||it.kind==='ring'){const old=p[it.kind];p[it.kind]=it;if(source==='right')p.right=old;else p.pack[source]=old;event(s,'equip',{target:p.id,item:it.kind});say(s,`${p.name} wears ${itemName(it)}. Defense +2.`);}
    else if(it.kind==='sightBook'){p.sightUntil=s.clock+60000;for(const f of s.features.filter(f=>f.kind==='secret'&&distance(p,f)<=4)){f.revealed=true;const key=`${f.x},${f.y}`;if(!s.explored.includes(key))s.explored.push(key);}say(s,'Wall-sight reveals nearby seams for 60 seconds.');event(s,'sight',{target:p.id});}
    else{removeItem(p,source);if(it.kind==='potion'){p.war=Math.min(p.maxWar,p.war+16);p.spirit=Math.min(p.maxSpirit,p.spirit+12);}if(it.kind==='warBook'){p.maxWar+=10;p.war=Math.min(p.maxWar,p.war+10);}if(it.kind==='spiritBook'){p.maxSpirit+=8;p.spirit=Math.min(p.maxSpirit,p.spirit+8);}event(s,'use',{target:p.id,item:it.kind});say(s,`${itemName(it)} restores your strength.`);}
  } else if(a.type==='revive'){
    const ally=s.players[a.target];p.food--;ally.war=Math.max(ally.war,Math.ceil(ally.maxWar*.3));ally.spirit=Math.max(ally.spirit,Math.ceil(ally.maxSpirit*.3));ally.down=false;ally.guard='both';event(s,'revive',{target:ally.id,attacker:p.id});say(s,`${ally.name} rises with at least 30% of both strengths. One ration spent.`);
  } else if(a.type==='handoff'){const ally=s.players[a.to],slot=ally.pack.indexOf(null);ally.pack[slot]=p.pack[a.slot];p.pack[a.slot]=null;event(s,'handoff',{attacker:p.id,target:ally.id,item:ally.pack[slot].kind});}
}
function resolve(s) {
  const encounter=s.encounter;if(!encounter||encounter.resolving)return;encounter.resolving=true;s.stats.rounds++;
  for(const p of living(s).sort((a,b)=>a.id.localeCompare(b.id))){const a=encounter.plans[p.id]||{type:'guard'};if(a.type==='retreat'){retreat(s);return;}applyCombat(s,p,a);}
  for(const id of encounter.enemies){const e=s.enemies.find(e=>e.id===id&&e.alive);if(!e)continue;
    if(!encounter.preparation){const t=e.intent,p=t&&s.players[t.target];if(p&&!p.down&&p.connected!==false&&distance(e,p)<=4&&lineOfSight(s,e,p)){
      if(e.kind==='brute'&&t.power>0&&(p.x!==t.x||p.y!==t.y))say(s,'The hammer shatters the tile you left.');
      else if(t.power>0)damagePlayer(s,p,t.channel,t.power,e.id);
      else say(s,'The ogre lifts its hammer. The next blow will be heavy.');
    }}e.rounds++;
  }
  for(const p of Object.values(s.players))p.guard=null;
  if(!living(s).length){s.status='defeat';s.encounter=null;say(s,'Both paths go dark. Retry from a supplied floor entry.');event(s,'loss');return;}
  if(encounter.enemies.every(id=>!s.enemies.some(e=>e.id===id&&e.alive))){s.encounter=null;for(const p of living(s))p.lastSafe={x:p.x,y:p.y};event(s,'encounter-end',{id:encounter.id});return;}
  encounter.round=++s.round;encounter.plans={};encounter.deadline=null;encounter.resolving=false;setIntents(s);
}
function retreat(s){
  const enc=s.encounter;if(!enc)return fail('There is no encounter to retreat from.');
  for(const p of living(s)){
    const e=s.enemies.find(e=>enc.enemies.includes(e.id)&&e.alive);if(e?.intent&&distance(p,e)<=4&&lineOfSight(s,p,e))damagePlayer(s,p,e.intent.channel,Math.max(3,e.intent.power),e.id);
    const safe=enc.safe[p.id]||getFloor(s).start;if(walkable(s,safe.x,safe.y,{ignoreEnemy:true})){p.x=safe.x;p.y=safe.y;}event(s,'retreat',{target:p.id});
  }
  s.encounter=null;if(!living(s).length)s.status='defeat';say(s,'You withdraw under a parting strike. Prepare before returning.');reveal(s);return ok();
}
export function availableInteractions(s,id){
  const p=s.players[id];if(!p)return[];const all=[];
  for(const l of s.loot)if(!l.claimed&&distance(p,l)<=1)all.push({id:l.id,type:'pickup',name:ITEMS[l.item]?.name||l.item,item:l.item,amount:l.amount||1,x:l.x,y:l.y});
  for(const d of s.doors)if(!d.open&&distance(p,d)<=1)all.push({id:d.id,type:'door',name:d.name||'Locked door',key:d.key,available:s.keyring.includes(d.key),x:d.x,y:d.y});
  for(const f of s.features)if(distance(p,f)<=1)all.push({...clone(f),type:f.kind,name:f.kind==='treasure'?'Claim the treasure':f.kind==='gate'?'Enter one-way gate':f.kind==='secret'?'Examine the sighing seam':f.kind==='trap'?'Inspect wired coffer':f.kind==='camp'?'The last hearth':f.kind==='cache'?'Open old cache':'Read the eye mural'});
  const ladder=getFloor(s).ladder;if(ladder&&distance(p,ladder)<=1)all.push({id:'ladder',type:'ladder',name:'Descend to the next floor',...ladder});
  for(const ally of Object.values(s.players))if(ally.id!==id&&ally.down&&distance(p,ally)<=1)all.push({id:ally.id,type:'revive',name:`Revive ${ally.name}`,food:1,war:Math.ceil(ally.maxWar*.3),spirit:Math.ceil(ally.maxSpirit*.3)});
  return all.map(i=>({...i,label:i.name}));
}
function pickup(s,p,a){
  const l=s.loot.find(l=>l.id===a.target&&!l.claimed);if(!l)return fail('That object was already claimed or is no longer here.');if(distance(p,l)>1)return fail('Move beside the object before picking it up.');
  if(l.item==='food'||l.item==='arrows'){p[l.item]+=l.amount||1;l.claimed=true;event(s,'pickup',{target:p.id,item:l.item,loot:l.id,amount:l.amount||1});say(s,`${ITEMS[l.item].name} +${l.amount||1}.`);return ok();}
  if(l.item==='key'){if(!s.keyring.includes(l.key||'brass'))s.keyring.push(l.key||'brass');l.claimed=true;event(s,'pickup',{target:p.id,item:'key',loot:l.id});say(s,'The brass key joins the shared keyring. It cannot be lost.');return ok();}
  let slot=p.pack.indexOf(null);
  if(slot===-1){if(a.replace===undefined)return{ok:false,needs:'swap',reason:'Six pack slots are full. Choose a slot to exchange, or cancel; the object stays here.',loot:clone(l)};if(!Number.isInteger(a.replace)||a.replace<0||a.replace>5)return fail('Choose one of the six pack slots.');slot=a.replace;}
  const old=p.pack[slot],it=instance(s,l.item,l.id);l.claimed=true;p.pack[slot]=it;
  if(old)s.loot.push({id:old.id,item:old.kind,x:l.x,y:l.y,claimed:false,dropped:true});
  if(l.item==='rune'){s.unlockedSpirit=true;for(const q of Object.values(s.players))q.unlocks.spirit=true;say(s,'The Cinder rune teaches Spirit spark forever. Spiritual attacks consume no survival strength.');}
  event(s,'pickup',{target:p.id,item:l.item,loot:l.id});say(s,`${ITEMS[l.item].name} enters pack slot ${slot+1}${old?`; ${itemName(old)} remains on the floor`:''}.`);return ok({slot});
}
function interact(s,p,a){
  const interactions=availableInteractions(s,p.id);const it=a.target?interactions.find(i=>i.id===a.target):interactions.find(i=>!['mural','camp','secret'].includes(i.type))||interactions[0];if(!it)return fail('Nothing is within reach. Face a doorway, object, or suspicious wall.');
  if(it.type==='pickup')return pickup(s,p,{...a,target:it.id});
  if(it.type==='revive')return command(s,p.id,{type:'revive',target:it.id},s.clock);
  if(s.encounter&&!s.encounter.preparation)return fail('Finish or retreat from the encounter before opening a passage.');
  if(it.type==='ladder')return descend(s,p,a);
  if(it.type==='door'){const d=s.doors.find(d=>d.id===it.id);if(!s.keyring.includes(d.key))return fail('This door needs the sunken brass key. Search the upper vault.');d.open=true;event(s,'door',{target:d.id,open:true});say(s,'The brass lock yields. The key stays on your ring.');return ok();}
  const f=s.features.find(f=>f.id===it.id);
  if(f.kind==='mural'||f.kind==='camp'){say(s,f.text);return ok();}
  if(f.kind==='secret'){if(f.open)return fail('The secret passage is already open.');f.open=true;f.revealed=true;s.stats.secrets++;event(s,'secret',{target:f.id});say(s,'The sighing wall turns inward. A hidden passage is revealed.');return ok();}
  if(f.kind==='gate'){
    if(f.used)return fail('The Ember gate has spent its power. Its transfer was one way.');
    if(!a.confirm)return{ok:false,needs:'confirm',reason:f.text,preview:{war:Math.max(1,Math.min(p.maxWar,p.war+f.warDelta)),spirit:Math.max(1,Math.min(p.maxSpirit,p.spirit+f.spiritDelta))}};
    if(!walkable(s,f.destination.x,f.destination.y,{ignoreEnemy:true}))return fail('The gate destination is blocked.');
    for(const q of Object.values(s.players)){if(!q.down){q.war=Math.max(1,Math.min(q.maxWar,q.war+f.warDelta));q.spirit=Math.max(1,Math.min(q.maxSpirit,q.spirit+f.spiritDelta));}q.x=f.destination.x;q.y=f.destination.y;q.lastSafe={x:q.x,y:q.y};}f.used=true;s.stats.gates++;event(s,'gate',{target:f.id});say(s,'The Ember gate draws you through. Its transfer is spent.');reveal(s);trigger(s,p);return ok();
  }
  if(f.kind==='trap'){
    if(f.opened)return fail('The coffer stands empty.');
    if(!f.inspected){f.inspected=true;say(s,'A copper wire joins lid to rune. Disarm it safely before opening.');return ok({needs:'disarm'});}
    if(!f.disarmed){f.disarmed=true;event(s,'disarm',{target:f.id});say(s,'You lift the wire clear of the rune. The coffer is safe.');return ok();}
    f.opened=true;const loot={id:`${f.id}:reward`,item:f.reward,x:f.x,y:f.y,claimed:false};s.loot.push(loot);event(s,'container',{target:f.id});say(s,'The coffer opens. A Twinwell potion gleams inside.');return ok();
  }
  if(f.kind==='cache'){if(f.opened)return fail('The cache is empty.');f.opened=true;s.stats.treasure+=50;p.food+=2;event(s,'treasure-cache',{target:f.id});say(s,'Old coins and two rations. A small victory in the dark.');return ok();}
  if(f.kind==='treasure'){if(!s.bossDefeated)return fail('The Horned Warden still guards the treasure.');if(s.treasureClaimed)return fail('The treasure is already yours.');s.treasureClaimed=true;s.status='victory';s.stats.treasure+=1000;event(s,'victory',{target:p.id});say(s,'YOU HAVE THE TREASURE. The dark keeps its silence. You keep your life.');return ok();}
  return fail('There is nothing more to do here.');
}
function descend(s,p,a){
  const ladder=getFloor(s).ladder;if(!ladder||distance(p,ladder)>1)return fail('Stand beside the ladder.');if(s.encounter)return fail('An encounter bars your descent.');
  if(!a.confirm)return{ok:false,needs:'confirm',reason:'Descend one floor? The ladder allows no return. Both strengths and your supplies travel with you.'};
  if(!s.descentReady.includes(p.id))s.descentReady.push(p.id);const waiting=living(s).filter(q=>!s.descentReady.includes(q.id));if(waiting.length){say(s,'Descent ready. Your ally must also confirm the ladder.');return ok({waiting:waiting.map(q=>q.id)});}
  s.floor++;linkFloor(s);s.encounter=null;s.descentReady=[];const start=getFloor(s).start;
  for(const q of Object.values(s.players)){q.x=start.x;q.y=start.y;q.dir=start.dir;q.lastSafe={x:q.x,y:q.y};q.food=Math.max(q.food,3);q.arrows=Math.max(q.arrows,3);}
  reveal(s);say(s,`${getFloor(s).subtitle} A ladder cache guarantees at least 3 rations and 3 arrows.`);event(s,'descent',{floor:s.floor});saveCheckpoint(s);return ok();
}
export function command(s,id,a,now=s.clock){
  const begin=s.eventSeq;const p=s.players[id];if(!p)return fail('Unknown adventurer.');if(!a||typeof a.type!=='string')return fail('Invalid action.');
  if(a.type==='retry')return retryCheckpoint(s);
  if(s.status!=='playing')return fail('This expedition has ended.');if(p.connected===false)return fail('This adventurer has departed.');if(p.down)return fail('You are down. A nearby ally can spend one ration to revive both strengths.');
  if(Number.isFinite(now))s.clock=Math.max(s.clock,now);
  if(a.round!==undefined&&a.round!==(s.encounter?.round??0))return fail('That command belongs to an old round.');
  if(a.tick!==undefined&&a.type==='move'&&s.encounter&&a.tick<s.encounter.startedTick)return fail('An encounter began before that movement arrived.');
  if(a.type==='turn'){if(!Number.isInteger(a.delta))return fail('Turn by a quarter turn.');p.dir=(p.dir+a.delta+400)%4;event(s,'turn',{target:id,dir:p.dir});return ok();}
  if(a.type==='inspect'){const target=inspectTarget(s,id,a.target);return target?ok({target}):fail('No threat is in sight.');}
  if(a.type==='continueBoss'){
    if(!s.encounter?.preparation)return fail('There is no broken seal to continue from.');s.encounter.preparation=false;s.encounter.plans={};s.encounter.deadline=null;setIntents(s);say(s,'The next seal burns. Read the new intention.');return ok();
  }
  if(a.type==='rest'){
    if(s.encounter&&!s.encounter.preparation)return fail('You cannot rest while an enemy is ready to strike.');if(p.food<1)return fail('Rest requires one ration.');const preview=restPreview(s,id);if(!preview.war&&!preview.spirit)return fail('Both strengths are full. No ration is spent.');
    if(!a.confirm)return{ok:false,needs:'confirm',reason:`Spend 1 ration: restore ${preview.war} War and ${preview.spirit} Spirit.`,preview};
    p.food--;p.war+=preview.war;p.spirit+=preview.spirit;s.stats.rests++;event(s,'rest',{target:id,...preview});say(s,`Rest restores ${preview.war} War and ${preview.spirit} Spirit. One ration spent.`);return ok();
  }
  const combatTypes=['attack','guard','equip','swap','use','move','revive','handoff','retreat'];
  if(s.encounter&&!s.encounter.preparation&&combatTypes.includes(a.type)){
    if(s.encounter.plans[id])return fail('Your intention is committed. Wait for your ally or the planning deadline.');
    if(a.type==='retreat'&&!a.confirm){const e=inspectTarget(s,id);return{ok:false,needs:'confirm',reason:`Retreat takes a parting strike: ${e?.intent?.power||3} ${e?.intent?.channel||'war'} before defense. Return to the last safe tile.`};}
    const valid=validateCombat(s,p,a);if(!valid.ok)return valid;s.encounter.plans[id]=clone(a);if(s.encounter.deadline===null)s.encounter.deadline=s.clock+s.tuning.planningSeconds*1000;event(s,'ready',{target:id,round:s.encounter.round});
    if(living(s).every(q=>s.encounter.plans[q.id]))resolve(s);s.tick++;return ok({events:s.events.filter(e=>Number(e.id.split(':').at(-1))>begin)});
  }
  let result;
  if(a.type==='attack'){trigger(s,p);if(!s.encounter)return fail('No enemy is close enough to engage.');return command(s,id,{...a,round:s.encounter.round},s.clock);}
  if(['equip','swap','use','revive','handoff'].includes(a.type)){const valid=validateCombat(s,p,a);if(!valid.ok)return valid;applyCombat(s,p,a);result=ok();}
  else if(a.type==='guard'){say(s,'No enemy is threatening you.');result=ok();}
  else if(a.type==='move'){
    if(s.encounter?.preparation)return fail('Prepare or continue the guardian encounter before moving.');const valid=validateCombat(s,p,a);if(!valid.ok)return valid;
    p.lastSafe={x:p.x,y:p.y};p.x+=a.dx;p.y+=a.dy;s.stats.steps++;s.descentReady=[];reveal(s);event(s,'move',{target:id,x:p.x,y:p.y});trigger(s,p);result=ok();
  }
  else if(a.type==='pickup'){if(s.encounter&&!s.encounter.preparation)return fail('Finish the encounter before claiming supplies.');result=pickup(s,p,a);}
  else if(a.type==='interact')result=interact(s,p,a);
  else if(a.type==='descend')result=descend(s,p,a);
  else if(a.type==='retreat')result=fail('There is no encounter to retreat from.');
  else if(a.type==='drop'){
    if(s.encounter)return fail('Finish the encounter before dropping supplies.');if(!Number.isInteger(a.slot)||a.slot<0||a.slot>5||!p.pack[a.slot])return fail('Choose an occupied pack slot.');const it=p.pack[a.slot];p.pack[a.slot]=null;s.loot.push({id:it.id,item:it.kind,x:p.x,y:p.y,claimed:false,dropped:true});event(s,'drop',{target:id,item:it.kind});result=ok();
  }
  else return fail('Unknown action.');
  if(result.ok)s.tick++;return result;
}
export function advance(s,now){
  if(s.status!=='playing'||!Number.isFinite(now))return; s.clock=Math.max(s.clock,now);
  if(s.encounter?.deadline!==null&&s.encounter?.deadline!==undefined&&!s.encounter.preparation&&s.clock>=s.encounter.deadline)resolve(s);
}
export function addPlayer(s,identity){
  if(s.players[identity.id])return fail('That adventurer is already present.');if(Object.values(s.players).filter(p=>p.connected!==false).length>=2)return fail('This expedition has two seats.');
  const p=player(s,identity),anchor=living(s)[0]||getFloor(s).start;p.x=anchor.x;p.y=anchor.y;p.dir=anchor.dir??1;p.lastSafe={x:p.x,y:p.y};p.unlocks.spirit=s.unlockedSpirit;s.players[p.id]=p;reveal(s);event(s,'join',{target:p.id});return ok();
}
export function removePlayer(s,id){
  const p=s.players[id];if(!p||p.connected===false)return fail('That adventurer has already departed.');
  const safe=living(s).find(q=>q.id!==id)||getFloor(s).start;for(const it of [p.right,p.left,...p.pack,p.armor,p.ring].filter(Boolean))s.loot.push({id:it.id,item:it.kind,x:safe.x,y:safe.y,claimed:false,dropped:true,bag:id});
  if(p.food)s.loot.push({id:`${id}:food:${s.tick}`,item:'food',amount:p.food,x:safe.x,y:safe.y,claimed:false,bag:id});if(p.arrows)s.loot.push({id:`${id}:arrows:${s.tick}`,item:'arrows',amount:p.arrows,x:safe.x,y:safe.y,claimed:false,bag:id});
  p.connected=false;p.right=null;p.left=null;p.pack=Array(6).fill(null);p.armor=null;p.ring=null;p.food=0;p.arrows=0;
  if(s.encounter){delete s.encounter.plans[id];if(living(s).length&&living(s).every(q=>s.encounter.plans[q.id]))resolve(s);}
  event(s,'leave',{target:id});say(s,`${p.name}'s supplies remain in a reachable bag. The shared keyring is safe.`);return ok();
}
export function endRun(s,reason='Session ended'){s.status='ended';s.encounter=null;say(s,reason);}
export function setTuning(s,changes){
  if(s.mode==='hub'||s.scored)return fail('Balance tools are disabled in scored sessions.');const t={...s.tuning,...changes};for(const k of Object.keys(DEFAULT_TUNING))if(!Number.isFinite(t[k]))return fail('Tuning values must be finite.');
  t.playerDamage=clamp(t.playerDamage,.25,4);t.enemyDamage=clamp(t.enemyDamage,0,4);t.maxWar=Math.round(clamp(t.maxWar,12,120));t.maxSpirit=Math.round(clamp(t.maxSpirit,8,100));t.rationWar=Math.round(clamp(t.rationWar,1,40));t.rationSpirit=Math.round(clamp(t.rationSpirit,1,40));t.planningSeconds=clamp(t.planningSeconds,2,30);t.tempo=clamp(t.tempo,.25,3);
  for(const p of Object.values(s.players)){const dw=t.maxWar-s.tuning.maxWar,ds=t.maxSpirit-s.tuning.maxSpirit;p.maxWar=Math.max(1,p.maxWar+dw);p.maxSpirit=Math.max(1,p.maxSpirit+ds);p.war=clamp(p.war,0,p.maxWar);p.spirit=clamp(p.spirit,0,p.maxSpirit);}
  s.tuning=t;s.modified=Object.keys(DEFAULT_TUNING).some(k=>t[k]!==DEFAULT_TUNING[k]);if(s.encounter){s.encounter.plans={};s.encounter.deadline=null;setIntents(s);}event(s,'tuning');return ok();
}
export function developer(s,id,tool,value){
  if(s.mode==='hub'||s.scored)return fail('Developer mutations are disabled in scored sessions.');const p=s.players[id];if(!p)return fail('Unknown adventurer.');s.modified=true;
  if(tool==='invulnerable')s.invulnerable=!!value;
  else if(tool==='supplies'){p.food+=10;p.arrows+=20;p.war=p.maxWar;p.spirit=p.maxSpirit;p.down=false;}
  else if(tool==='reveal'){const rows=s.floors[s.floor].rows;for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){const key=`${x},${y}`;if(!s.explored.includes(key))s.explored.push(key);}for(const f of s.features)if(f.kind==='secret')f.revealed=true;}
  else if(tool==='floor'){if(!Number.isInteger(value)||value<0||value>=FLOORS.length)return fail('Unknown floor.');s.floor=value;linkFloor(s);s.encounter=null;s.descentReady=[];for(const q of Object.values(s.players)){Object.assign(q,getFloor(s).start);q.lastSafe={x:q.x,y:q.y};}reveal(s);event(s,'descent',{floor:s.floor});}
  else if(tool==='encounter'){const e=s.enemies.find(e=>e.id===value||e.kind===value);if(!e)return fail('Unknown encounter.');s.encounter=null;e.alive=true;e.war=e.maxWar;e.spirit=e.maxSpirit;const tile=directions.map(d=>({x:e.x+d.x,y:e.y+d.y})).find(t=>walkable(s,t.x,t.y));if(!tile)return fail('No legal approach tile.');p.x=tile.x;p.y=tile.y;p.lastSafe={...getFloor(s).start};trigger(s,p);}
  else if(tool==='spawn'){if(!ITEMS[value])return fail('Unknown item.');s.loot.push({id:`dev:${++s.itemSeq}`,item:value,x:p.x,y:p.y,claimed:false});}
  else if(tool==='step')advance(s,s.clock+Number(value||1000));
  else return fail('Unknown developer tool.');event(s,'developer',{tool});return ok();
}
export function validateContent(content=CONTENT){
  const errors=[],ids=new Set();if(content.version!==CONTENT_VERSION)errors.push('Unsupported content version.');
  for(const f of content.floors||[]){
    if(!Array.isArray(f.rows)||!f.rows.length){errors.push(`${f.id}: missing map`);continue;}const width=f.rows[0].length;if(f.rows.some(r=>typeof r!=='string'||r.length!==width||/[^#.]/.test(r)))errors.push(`${f.id}: malformed rows`);
    const inMap=t=>f.rows[t.y]?.[t.x]==='.';const refs=[...(f.enemies||[]),...(f.loot||[]),...(f.doors||[]),...(f.features||[])];
    if(!inMap(f.start))errors.push(`${f.id}: spawn in geometry`);if(f.ladder&&!inMap(f.ladder))errors.push(`${f.id}: ladder in geometry`);
    for(const e of refs){if(!e.id||ids.has(e.id))errors.push(`${f.id}: duplicate or absent entity ID ${e.id}`);ids.add(e.id);if(!inMap(e))errors.push(`${f.id}: ${e.id} inside geometry`);}
    for(const e of f.enemies||[])if(!content.enemies[e.kind])errors.push(`${f.id}: dangling enemy ${e.kind}`);
    for(const l of f.loot||[])if(!content.items[l.item])errors.push(`${f.id}: dangling item ${l.item}`);
    for(const d of f.doors||[])if(d.key&&!content.floors.some(g=>g.loot.some(l=>l.item==='key'&&(l.key||'brass')===d.key)))errors.push(`${f.id}: key ${d.key} missing`);
    const reached=new Set([`${f.start.x},${f.start.y}`]),queue=[f.start];while(queue.length){const t=queue.shift();for(const d of directions){const n={x:t.x+d.x,y:t.y+d.y},k=`${n.x},${n.y}`;if(inMap(n)&&!reached.has(k)){reached.add(k);queue.push(n);}}for(const g of f.features.filter(g=>g.kind==='gate'&&distance(t,g)<=1)){const k=`${g.destination.x},${g.destination.y}`;if(inMap(g.destination)&&!reached.has(k)){reached.add(k);queue.push(g.destination);}}}
    for(const e of [...refs,...(f.ladder?[f.ladder]:[])])if(!reached.has(`${e.x},${e.y}`))errors.push(`${f.id}: unreachable ${e.id||'ladder'}`);
    for(const g of f.features.filter(g=>g.kind==='gate')){if(!inMap(g.destination))errors.push(`${f.id}: gate ${g.id} lands in geometry`);if(!reached.has(`${g.destination.x},${g.destination.y}`))errors.push(`${f.id}: gate destination unreachable`);}
    for(let i=0;i<(f.enemies||[]).length;i++)if(f.enemies.some((e,j)=>j!==i&&e.x===f.enemies[i].x&&e.y===f.enemies[i].y))errors.push(`${f.id}: enemy spawn collision`);
    if(!f.loot.some(l=>l.item==='food'))errors.push(`${f.id}: direct-route food missing`);
  }
  if(!content.floors?.[0]?.loot.some(l=>l.item==='rune'))errors.push('Tutorial rune missing.');
  if(!content.floors?.some(f=>f.features.some(e=>e.kind==='treasure')))errors.push('Treasure objective missing.');return errors;
}
export function importContent(value){const c=typeof value==='string'?JSON.parse(value):clone(value);const errors=validateContent(c);if(errors.length)return{ok:false,reason:errors.join('\n')};FLOORS.splice(0,FLOORS.length,...c.floors);for(const k of Object.keys(ITEMS))delete ITEMS[k];Object.assign(ITEMS,c.items);for(const k of Object.keys(ENEMIES))delete ENEMIES[k];Object.assign(ENEMIES,c.enemies);return ok();}
