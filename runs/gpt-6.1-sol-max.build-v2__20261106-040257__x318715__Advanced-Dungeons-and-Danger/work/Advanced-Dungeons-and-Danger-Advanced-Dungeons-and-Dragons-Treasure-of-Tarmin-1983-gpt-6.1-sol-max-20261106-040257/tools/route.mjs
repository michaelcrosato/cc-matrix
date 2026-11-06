import { CONTENT } from '../src/core/model.js';

const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const key = p => `${p.x},${p.y}`;

// This pilot observes public state and submits the same production commands as a player.
// It never edits the run, tuning, health, inventory, position, clock, or enemy state.
export function scriptedRoute(model, { player = '0', claimTreasure = true, onAction = null, onMilestone = null } = {}) {
  const actions = [], milestones = [];
  const p = () => model.state.players[player];
  const def = id => CONTENT.items[model.state.items[id]?.kind];
  const send = action => {
    const result = model.command(player, action); actions.push({ action: structuredClone(action), result: structuredClone(result) });
    if (onAction) onAction(action, result, model.state);
    if (!result.ok) throw new Error(`Route action ${JSON.stringify(action)} failed: ${result.message}`);
    if (model.state.phase === 'defeat') throw new Error('Normal-rules route died.');
    return result;
  };
  const mark = name => { milestones.push({ name, floor: model.state.floor, war: p().war, spirit: p().spirit, rounds: model.state.stats.rounds }); if (onMilestone) onMilestone(name, model.state); };
  const itemKind = kind => [...p().hands, ...p().pack].find(id => model.state.items[id]?.kind === kind);
  const equip = kind => {
    const id = itemKind(kind); if (!id || p().hands[1] === id) return false;
    if (p().hands[0] === id) send({ type: 'swap' }); else send({ type: 'equip', slot: p().pack.indexOf(id), hand: 1 });
    return true;
  };
  const sight = (a, b) => {
    if (a.x !== b.x && a.y !== b.y) return false;
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y), n = dist(a, b);
    for (let i = 1; i < n; i++) if (!walkable(a.x + dx * i, a.y + dy * i, true)) return false;
    return true;
  };
  const walkable = (x, y, enemies = false) => {
    const s = model.state, row = CONTENT.floors[s.floor].rows[y], here = Object.values(s.entities).filter(e => e.floor === s.floor && e.x === x && e.y === y);
    if ((row?.[x] || '#') === '#' && !here.some(e => e.type === 'secret' && e.open)) return false;
    if (here.some(e => e.type === 'gate')) return false;
    if (here.some(e => e.type === 'door' && !e.open && !s.shared.keys.includes(e.key))) return false;
    return enemies || !here.some(e => e.type === 'enemy' && !e.dead);
  };
  const path = (target, range = 0) => {
    const root = p(), queue = [{ x: root.x, y: root.y, steps: [] }], seen = new Set();
    for (let i = 0; i < queue.length && i < 1000; i++) {
      const q = queue[i], k = key(q); if (seen.has(k)) continue; seen.add(k);
      if (dist(q, target) <= range) return q.steps;
      for (const [dx, dy] of dirs) { const x = q.x + dx, y = q.y + dy; if (walkable(x, y) && !seen.has(`${x},${y}`)) queue.push({ x, y, steps: [...q.steps, { dx, dy }] }); }
    }
    return null;
  };
  let guarded = false, bruteGuarded = false, threw = false, scrolled = false;
  const fight = () => {
    let safety = 0;
    while (['combat', 'preparation'].includes(model.state.phase)) {
      if (++safety > 160) throw new Error('Route combat made no progress.');
      const s = model.state, enemies = s.combat.enemies.map(id => s.entities[id]).filter(e => !e.dead);
      if (s.phase === 'preparation') {
        while (p().food > 0 && (p().war < p().maxWar || p().spirit < p().maxSpirit)) send({ type: 'rest', confirm: true });
        const boss = enemies.find(e => e.kind === 'minotaur'); if (boss?.phase === 2) equip(itemKind('brightRune') ? 'brightRune' : 'rune');
        send({ type: 'resume' }); continue;
      }
      if (!guarded && enemies[0]?.kind === 'skeleton') { guarded = true; send({ type: 'guard', channel: 'war' }); continue; }
      const brute = enemies.find(e => e.kind === 'brute'), intent = brute && s.combat.intents[brute.id];
      if (brute && !bruteGuarded && intent?.kind === 'heavy' && dist(p(), brute) <= intent.range) { bruteGuarded = true; send({ type: 'guard', channel: 'war' }); continue; }
      let target = enemies.slice().sort((a, b) => dist(a, p()) - dist(b, p()))[0];
      const preferred = target.kind === 'skeleton' && p().arrows > 0 ? 'bow' : target.kind === 'minotaur' && target.phase === 1 ? 'steelBlade' : itemKind('brightRune') ? 'brightRune' : itemKind('rune') ? 'rune' : 'blade';
      if (equip(preferred)) continue;
      const weapon = def(p().hands[1]);
      const reachable = enemies.filter(e => dist(e, p()) <= weapon.range && sight(p(), e));
      if (reachable.length) target = reachable[0];
      if (!reachable.length) {
        let next = null;
        for (const enemy of enemies) {
          const steps = path(enemy, 1); if (steps?.length && (!next || steps.length < next.length)) next = steps;
        }
        if (!next) throw new Error(`No tactical route to ${target.id}.`);
        send({ type: 'move', ...next[0] }); continue;
      }
      if (!threw && target.kind === 'brute' && itemKind('throwing')) { threw = true; send({ type: 'attack', target: target.id, source: itemKind('throwing') }); continue; }
      if (!scrolled && target.kind === 'brute' && itemKind('scroll')) { scrolled = true; send({ type: 'attack', target: target.id, source: itemKind('scroll') }); continue; }
      send({ type: 'attack', target: target.id, source: 'right' });
    }
  };
  const navigate = (target, range = 0) => {
    let safety = 0;
    while (dist(p(), target) > range) {
      if (++safety > 250) throw new Error(`No route progress to ${JSON.stringify(target)}.`);
      fight();
      const steps = path(target, range);
      if (!steps?.length) throw new Error(`No walking route from ${key(p())} to ${key(target)} range${range}.`);
      const step = steps[0], door = Object.values(model.state.entities).find(e => e.floor === model.state.floor && e.type === 'door' && !e.open && e.x === p().x + step.dx && e.y === p().y + step.dy);
      if (door) send({ type: 'interact', target: door.id }); else send({ type: 'move', ...step });
    }
    fight();
  };
  const take = (id, swap = null) => {
    const e = model.state.entities[id]; if (e.claimed) return;
    navigate(e, 1);
    let slot = swap;
    if (e.itemId && !p().pack.includes(null) && slot === null) {
      const refusal = model.command(player, { type: 'pickup', target: id });
      if (!refusal.full) throw new Error('Full-pack choice did not preserve the object.');
      slot = p().pack.findIndex(i => def(i)?.family === 'potion'); if (slot < 0) slot = p().pack.findIndex(i => model.state.items[i]?.kind === 'blade'); if (slot < 0) slot = 1;
    }
    send({ type: 'pickup', target: id, ...(slot === null ? {} : { swap: slot }) });
  };
  const use = kind => { const id = itemKind(kind); if (!id) throw new Error(`Route lacks ${kind}.`); send({ type: 'use', item: id }); };
  const wearLeft = kind => { const id = itemKind(kind); if (!id) throw new Error(`Route lacks ${kind}.`); const slot = p().pack.indexOf(id); if (slot >= 0) send({ type: 'equip', slot, hand: 0 }); };
  const rest = () => { while (p().food > 0 && (p().war < p().maxWar || p().spirit < p().maxSpirit)) send({ type: 'rest', confirm: true }); };

  navigate({ x: 3, y: 6 }); fight(); mark('first-war-victory');
  take('upper.rune'); equip('rune');
  take('upper.provisions'); take('upper.hauberk'); use('armor');
  take('upper.shield'); wearLeft('shield');
  take('upper.javelin'); take('upper.scroll'); take('upper.draught');
  navigate({ x: 5, y: 2 }); fight(); mark('both-channels-unlocked');
  take('upper.key');
  navigate(model.state.entities['upper.vaultDoor'], 1); send({ type: 'interact', target: 'upper.vaultDoor' });
  take('upper.ladderSupplies'); navigate(model.state.entities['upper.camp']); rest();
  navigate(model.state.entities['upper.ladder'], 1); send({ type: 'descend', confirm: true }); mark('spirit-floor');

  take('spirit.ring'); use('ring');
  take('spirit.sight'); use('sightBook');
  navigate(model.state.entities['spirit.secret'], 1); send({ type: 'interact', target: 'spirit.secret' });
  take('spirit.secretBook'); use('spiritBook'); mark('secret-training');
  navigate({ x: 1, y: 6 }); fight();
  take('spirit.training'); use('warBook');
  navigate(model.state.entities['spirit.chest'], 1); send({ type: 'interact', target: 'spirit.chest', choice: 'disarm' }); send({ type: 'interact', target: 'spirit.chest', choice: 'open' });
  take('spirit.westSupply');
  navigate(model.state.entities['spirit.gate'], 1); send({ type: 'interact', target: 'spirit.gate', choice: 'spirit' }); mark('one-way-gate');
  navigate({ x: 7, y: 6 }); fight();
  take('spirit.eastSupply'); navigate({ x: 9, y: 4 }); fight();
  take('spirit.brightRune'); equip('brightRune'); rest();
  navigate(model.state.entities['spirit.ladder'], 1); send({ type: 'descend', confirm: true }); mark('guardian-floor');

  take('guardian.provisions'); take('guardian.blade'); take('guardian.shield'); wearLeft('greatShield');
  // The guaranteed bright rune is optional if the improved rune was carried down.
  if (!itemKind('brightRune')) take('guardian.rune');
  navigate({ x: 7, y: 6 }); fight(); mark('mixed-encounter');
  navigate(model.state.entities['guardian.camp']); rest();
  navigate({ x: 5, y: 5 }); fight(); mark('boss-defeated');
  if (!model.state.shared.bossDefeated || model.state.shared.treasureClaimed) throw new Error('Boss defeat and treasure claim are not separate.');
  if (claimTreasure) { navigate(model.state.entities['guardian.treasure'], 1); send({ type: 'interact', target: 'guardian.treasure' }); mark('treasure-claimed'); }
  if (model.state.modified) throw new Error('Route unexpectedly enabled developer balance.');
  return { actions, milestones, summary: structuredClone(model.state.stats), final: model.snapshot() };
}

export { scriptedRoute as runRoute };

// A real second participant follows and commits guard. The leader makes the
// authored carrying/channel decisions; both avatars use production commands.
export function scriptedCoopRoute(model, { player = '0', companion = '1', claimTreasure = true, onAction = null, onMilestone = null } = {}) {
  const allActions = [];
  const submit = (id, action) => {
    const result = model.command(id, action);
    allActions.push({ player: id, action: structuredClone(action), result: structuredClone(result) });
    if (onAction) onAction(id, action, result, model.state);
    return result;
  };
  const walkable = (x, y) => {
    const s = model.state, f = (s.content || CONTENT).floors[s.floor], entities = Object.values(s.entities).filter(e => e.floor === s.floor && e.x === x && e.y === y);
    if ((f.rows[y]?.[x] || '#') === '#' && !entities.some(e => e.type === 'secret' && e.open)) return false;
    return !entities.some(e => e.type === 'gate' || e.type === 'door' && !e.open || e.type === 'enemy' && !e.dead);
  };
  const follow = () => {
    let limit = 0;
    while (model.state.phase === 'explore' && dist(model.state.players[player], model.state.players[companion]) > 0 && ++limit < 100) {
      const p = model.state.players[companion], goal = model.state.players[player];
      if (p.down || !p.connected) return;
      const queue = [{ x: p.x, y: p.y, first: null }], seen = new Set(); let step = null;
      for (let n = 0; n < queue.length && n < 500; n++) {
        const at = queue[n], k = key(at); if (seen.has(k)) continue; seen.add(k);
        if (at.x === goal.x && at.y === goal.y) { step = at.first; break; }
        for (const [dx, dy] of dirs) if (walkable(at.x + dx, at.y + dy)) queue.push({ x: at.x + dx, y: at.y + dy, first: at.first || { dx, dy } });
      }
      if (!step || !submit(companion, { type: 'move', ...step }).ok) return;
    }
  };
  const wrapper = {
    get state() { return model.state; }, snapshot: () => model.snapshot(),
    command(id, a) {
      const r = submit(id, a); if (!r.ok) return r;
      if (a.type === 'interact' && model.state.entities[a.target]?.type === 'gate' && !model.state.players[companion].down) {
        const gate = submit(companion, a); if (!gate.ok) throw new Error(`Companion gate: ${gate.message}`);
      }
      if (a.type === 'descend' && r.waiting) { const descent = submit(companion, a); if (!descent.ok) throw new Error(`Companion descent: ${descent.message}`); }
      if (model.state.phase === 'combat' && model.state.combat?.plans[player] && !model.state.combat.plans[companion] && !model.state.players[companion].down) {
        const guard = submit(companion, { type: 'guard' }); if (!guard.ok) throw new Error(`Companion guard: ${guard.message}`);
      }
      if (model.state.phase === 'preparation') {
        const p = model.state.players[companion];
        while (p.food > 0 && (p.war < p.maxWar || p.spirit < p.maxSpirit)) if (!submit(companion, { type: 'rest', confirm: true }).ok) break;
      }
      if (model.state.phase === 'explore') follow();
      return r;
    },
  };
  const route = scriptedRoute(wrapper, { player, claimTreasure, onMilestone });
  return { ...route, allActions };
}
