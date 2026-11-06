import { CONTENT, DEFAULT_TUNING } from '../content/campaign.js';
export { CONTENT, DEFAULT_TUNING };

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const coord = p => `${p.x},${p.y}`;
const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const ordered = object => Object.keys(object).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const denied = message => ({ ok: false, message });
const accepted = message => ({ ok: true, message });

export class Model {
  constructor({ players = [{ id: '0', name: 'Adventurer' }], seed = 1983, runId = `expedition-${seed}`, content = CONTENT } = {}) {
    const validation = validateContent(content);
    if (!validation.ok) throw new Error(validation.errors.join(' '));
    this.content = clone(content);
    this.state = { schema: 1, contentVersion: 1, runId, seed: seed >>> 0, rng: seed >>> 0, tick: 0, clock: 0, epoch: 0, floor: 0, phase: 'explore', players: {}, items: {}, entities: {}, shared: { keys: [], bossDefeated: false, treasureClaimed: false }, combat: null, tuning: { ...DEFAULT_TUNING }, events: [], log: [], eventSeq: 0, itemSeq: 0, encounterSeq: 0, descentReady: {}, stats: { rounds: 0, enemies: 0, rests: 0, steps: 0, secrets: 0, gates: 0, revives: 0, damageWar: 0, damageSpirit: 0, bossPhases: 0 }, modified: false, invulnerable: false };
    for (const entry of players.slice(0, 2)) this._addPlayer(entry);
    this._populate();
    this._enterFloor(0, true);
    this._event('expedition', 'Descend. Defeat the warden. Claim the Emberheart.');
    if (JSON.stringify(content) !== JSON.stringify(CONTENT)) { this.state.modified = true; this.state.content = clone(content); }
    this.checkpoint = this.snapshot();
  }

  _addPlayer({ id, name }) {
    const pid = String(id), s = this.state;
    const p = { id: pid, name: String(name || 'Adventurer').slice(0, 48), x: 1, y: 9, dir: 0, war: s.tuning.maxWar, maxWar: s.tuning.maxWar, spirit: s.tuning.maxSpirit, maxSpirit: s.tuning.maxSpirit, armor: 0, ring: 0, armorItem: null, ringItem: null, hands: [null, null], pack: Array(6).fill(null), food: 4, arrows: 8, down: false, connected: true, basicSpirit: false, seen: [], sightMoves: 0, guard: null, trainingWar: 0, trainingSpirit: 0, safe: { x: 1, y: 9 } };
    s.players[pid] = p;
    p.hands[0] = this._newItem('blade', `${pid}.starting.blade`);
    p.hands[1] = this._newItem('bow', `${pid}.starting.bow`);
    p.pack[0] = this._newItem('potion', `${pid}.starting.potion`);
    return p;
  }

  addPlayer(entry) {
    if (Object.values(this.state.players).filter(p => p.connected).length >= 2 || this.state.combat) return denied('The expedition already has two adventurers, or a round is underway.');
    const p = this._addPlayer(entry), start = this.content.floors[this.state.floor].start;
    Object.assign(p, start, { basicSpirit: Object.values(this.state.players).some(other => other.basicSpirit), safe: { x: start.x, y: start.y } });
    this._see(p);
    this._event('join', `${p.name} joins the expedition.`, { player: p.id });
    return accepted('Companion joined.');
  }

  _newItem(kind, id) {
    const s = this.state;
    if (!this.content.items[kind]) throw new Error(`Unknown item ${kind}`);
    const key = id || `${s.runId}.item.${++s.itemSeq}`;
    s.items[key] = { id: key, kind };
    return key;
  }

  _populate() {
    const s = this.state;
    this.content.floors.forEach((floor, fi) => floor.entities.forEach(def => {
      const e = { ...clone(def), floor: fi };
      if (e.type === 'enemy') {
        const d = this.content.enemies[e.kind];
        Object.assign(e, { name: d.name, war: d.war, maxWar: d.war, spirit: d.spirit, maxSpirit: d.spirit, armor: d.armor, ring: d.ring, dead: false, phase: 1, scaled: false, damageTaken: 0 });
      }
      if (e.type === 'loot' && e.kind) e.itemId = this._newItem(e.kind, `${e.id}.item`);
      if (e.type === 'loot') e.claimed = false;
      s.entities[e.id] = e;
    }));
  }

  _event(type, text, data = {}) {
    const s = this.state, e = { id: `${s.runId}:${++s.eventSeq}`, type, text, tick: s.tick, ...data };
    s.events.push(e); if (s.events.length > 48) s.events.shift();
    if (text) { s.log.push(text); if (s.log.length > 8) s.log.shift(); }
    return e;
  }

  _entities(floor = this.state.floor) { return Object.values(this.state.entities).filter(e => e.floor === floor); }
  _living() { return ordered(this.state.players).map(id => this.state.players[id]).filter(p => p.connected && !p.down); }
  _owns(p, id) { return p.pack.includes(id) || p.hands.includes(id); }
  _definition(id) { return this.content.items[this.state.items[id]?.kind]; }
  _removeItem(p, id) { p.pack = p.pack.map(v => v === id ? null : v); p.hands = p.hands.map(v => v === id ? null : v); }

  _walkable(x, y, { ignoreEnemies = false } = {}) {
    const s = this.state, f = this.content.floors[s.floor];
    if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
    const here = this._entities().filter(e => e.x === x && e.y === y);
    const secret = here.find(e => e.type === 'secret');
    if ((f.rows[y]?.[x] || '#') === '#' && !secret?.open) return false;
    if (here.some(e => e.type === 'door' && !e.open || e.type === 'gate')) return false;
    if (!ignoreEnemies && here.some(e => e.type === 'enemy' && !e.dead)) return false;
    return true;
  }

  lineOfSight(a, b) {
    if (a.x !== b.x && a.y !== b.y) return false;
    const d = distance(a, b), dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
    for (let k = 1; k < d; k++) if (!this._walkable(a.x + dx * k, a.y + dy * k, { ignoreEnemies: true })) return false;
    return true;
  }

  _see(p) {
    const found = new Set(p.seen);
    found.add(coord(p));
    for (const [dx, dy] of dirs) for (let n = 1; n <= 4; n++) {
      const x = p.x + dx * n, y = p.y + dy * n;
      if (!this.content.floors[this.state.floor].rows[y]?.[x]) break;
      found.add(`${x},${y}`);
      if (!this._walkable(x, y, { ignoreEnemies: true })) break;
    }
    if (p.sightMoves > 0) for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      if (Math.abs(dx) + Math.abs(dy) <= 4 && this.content.floors[this.state.floor].rows[p.y + dy]?.[p.x + dx]) found.add(`${p.x + dx},${p.y + dy}`);
    }
    p.seen = [...found];
  }

  command(playerId, action) {
    const s = this.state, p = s.players[String(playerId)];
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') return denied('Malformed action.');
    if (!p?.connected) return denied('That adventurer has left.');
    if (s.phase === 'ended') return denied('This session has ended.');
    if (['victory', 'defeat'].includes(s.phase)) return denied(s.phase === 'victory' ? 'The Emberheart is yours.' : 'Both strengths must survive. Retry the floor or begin anew.');
    if (action.type === 'inspect') {
      const target = s.entities[action.target];
      return target ? { ok: true, entity: clone(target), definition: clone(this.content.enemies[target.kind] || this.content.items[target.kind] || {}), message: target.text || target.hint || target.name || 'Inspect your surroundings.' } : denied('Nothing there to inspect.');
    }
    if (p.down) return denied('You are down. A nearby companion can revive you with one ration.');
    if (action.type === 'turn') {
      if (![1, -1].includes(action.delta)) return denied('Turn one quarter at a time.');
      p.dir = (p.dir + action.delta + 4) % 4; this._see(p); s.tick++;
      this._event('turn', '', { player: p.id }); return accepted('Turned.');
    }
    if (action.type === 'resume') {
      if (s.phase !== 'preparation') return denied('There is no seal to resume.');
      if (s.combat) { s.phase = 'combat'; s.combat.plans = {}; s.combat.deadline = null; this._telegraph(); this._event('resume', 'The next seal wakes.'); return accepted('The next seal wakes.'); }
      return denied('No encounter to resume.');
    }
    if (s.phase === 'preparation' && ['attack', 'move', 'retreat'].includes(action.type)) return denied('Prepare, then choose FACE THE NEXT SEAL.');
    if (s.phase === 'combat') return this._commit(p, action);
    const result = this._validate(p, action);
    if (!result.ok) return result;
    const applied = this._apply(p, action);
    if (applied.ok) s.tick++;
    return applied;
  }

  _validate(p, a, resolution = false) {
    const s = this.state;
    switch (a.type) {
      case 'move': {
        if (!Number.isInteger(a.dx) || !Number.isInteger(a.dy) || Math.abs(a.dx) + Math.abs(a.dy) !== 1) return denied('Move one orthogonal tile.');
        if (a.epoch != null && a.epoch !== s.epoch) return denied('The encounter changed. Your position has been resynchronized.');
        const to = { x: p.x + a.dx, y: p.y + a.dy };
        if (!this._walkable(to.x, to.y)) return denied('Stone, a closed door, a gate, or a creature bars that step.');
        if (s.combat && this._entities().some(e => e.type === 'enemy' && !e.dead && !s.combat.enemies.includes(e.id) && distance(to, e) <= 1 && this.lineOfSight(to, e))) return denied('Finish the active encounter before entering another threat’s reach.');
        return accepted('Step.');
      }
      case 'attack': {
        if (!s.combat) return denied('There is no active encounter.');
        const e = s.entities[a.target || s.combat.enemies.find(id => !s.entities[id].dead)];
        if (!e || e.dead || !s.combat.enemies.includes(e.id)) return denied('That threat is already gone. Your supplies are safe.');
        const weapon = this._weapon(p, a.source);
        if (!weapon.ok) return weapon;
        if (distance(p, e) > weapon.definition.range || !this.lineOfSight(p, e)) return denied('Out of range or no clear corridor. Reposition, or choose a ranged implement.');
        if (weapon.definition.ammo && p.arrows < 1) return denied('No arrows. Swap to the falchion or choose your free War strike.');
        return accepted('Attack prepared.');
      }
      case 'guard': return accepted('Guard prepared.');
      case 'retreat': {
        if (!s.combat) return denied('There is no encounter to retreat from.');
        if (!a.confirm) return { ok: false, confirm: true, message: this.retreatPreview(p.id), action: { type: 'retreat', confirm: true } };
        return accepted('Retreat prepared.');
      }
      case 'equip':
        if (!Number.isInteger(a.slot) || a.slot < 0 || a.slot > 5 || ![0, 1].includes(a.hand) || !p.pack[a.slot]) return denied('Choose an occupied pack slot and a hand.');
        return accepted('Equipment prepared.');
      case 'swap': return accepted('Hands prepared.');
      case 'use': {
        if (!a.item || !this._owns(p, a.item)) return denied('That item is not yours.');
        const d = this._definition(a.item);
        if (!d?.use) return denied('That object attacks or protects. Equip it in a hand.');
        if (d.use === 'restore' && p.war === p.maxWar && p.spirit === p.maxSpirit) return denied('Both strengths are full. Keep the draught.');
        if (['armor', 'ring'].includes(d.use) && p[d.use] >= d.defense) return denied('Your worn protection is already as strong or stronger.');
        return accepted('Item prepared.');
      }
      case 'drop':
        return Number.isInteger(a.slot) && p.pack[a.slot] ? accepted('Drop prepared.') : denied('Choose an occupied pack slot.');
      case 'pickup': {
        const e = s.entities[a.target];
        if (!e || e.floor !== s.floor || e.type !== 'loot' || e.claimed) return denied('That object has already been claimed.');
        if (distance(p, e) > 1) return denied('Move beside the object to take it.');
        if (e.itemId && !p.pack.includes(null) && !(Number.isInteger(a.swap) && a.swap >= 0 && a.swap < 6)) return { ok: false, full: true, target: e.id, item: e.itemId, message: 'All six pack slots are full. Choose an object to leave here, or cancel.' };
        return accepted('Pickup prepared.');
      }
      case 'rest': {
        if (s.phase === 'combat') return denied('Not while an enemy has an intention. Use a draught, guard, or retreat.');
        if (p.food < 1) return denied('Rest requires one ration. Find sealed supplies.');
        if (p.war === p.maxWar && p.spirit === p.maxSpirit) return denied('Both strengths are full. Save your food.');
        const war = Math.min(s.tuning.rationWar, p.maxWar - p.war), spirit = Math.min(s.tuning.rationSpirit, p.maxSpirit - p.spirit);
        if (!a.confirm) return { ok: false, confirm: true, message: `Spend 1 ration: restore ${war} War and ${spirit} Spirit.`, war, spirit, cost: 1, action: { type: 'rest', confirm: true } };
        return accepted('Rest prepared.');
      }
      case 'handoff': {
        const other = s.players[String(a.target)];
        if (!other || !other.connected || other.id === p.id || distance(p, other) > 1 || other.down) return denied('A standing companion must be beside you.');
        if (a.item === 'food') return p.food > 0 ? accepted('Ration handoff prepared.') : denied('You have no ration to share.');
        if (a.item === 'arrows') return p.arrows > 0 ? accepted('Arrow handoff prepared.') : denied('You have no arrow to share.');
        if (!this._owns(p, a.item)) return denied('That object is not in your hands or pack.');
        if (!other.pack.includes(null)) return denied('Your companion’s six slots are full. Ask them to make room.');
        return accepted('Handoff prepared.');
      }
      case 'revive': {
        const other = s.players[String(a.target)];
        if (!other?.down || !other.connected || distance(p, other) > 1) return denied('Stand beside a fallen companion to revive them.');
        if (p.food < 1) return denied('Revival requires one ration. The survivor may find supplies and return.');
        return accepted('Revival prepared.');
      }
      case 'interact': {
        const e = this._interaction(p, a.target);
        if (!e || e.floor !== s.floor || distance(p, e) > 1) return denied('Nothing within reach. Face a nearby object or step closer.');
        if (s.phase === 'combat' && ['gate', 'ladder', 'treasure', 'camp'].includes(e.type)) return denied('Finish the encounter before committing to that passage.');
        if (e.type === 'loot') return this._validate(p, { ...a, type: 'pickup', target: e.id });
        if (e.type === 'door' && !e.open && e.key && !s.shared.keys.includes(e.key)) return denied('A sun-cut key fits this lock. It lies beyond the marked tail.');
        if (e.type === 'secret' && !e.open && !p.sightMoves && !p.seen.includes(coord(e))) return denied('You have not discovered that seam.');
        if (e.type === 'treasure' && !s.shared.bossDefeated) return denied('The warden’s final oath still seals the treasure.');
        if (e.type === 'treasure' && (e.claimed || s.shared.treasureClaimed)) return denied('The Emberheart is already yours. This expedition is complete.');
        if (e.type === 'gate') {
          if (e.usedBy?.includes(p.id)) return denied('The gate cannot carry you backward.');
          if (!Object.hasOwn(e.options, a.choice || '')) return { ok: false, confirm: true, choices: clone(e.options), message: 'One-way passage. WAR: +6 War, −4 Spirit. SPIRIT: −4 War, +6 Spirit. BALANCED: preserve both. Loss never lowers strength below 1.', target: e.id };
        }
        if (e.type === 'ladder') return this._validate(p, { type: 'descend', confirm: a.choice === 'confirm' || a.confirm, target: e.id });
        if (e.type === 'chest' && !e.open && !['disarm', 'open', 'confirm'].includes(a.choice)) return { ok: false, confirm: true, choices: e.trapped && !e.disarmed ? ['disarm', 'open'] : ['open'], message: e.hint || 'The coffer is safe. Open it.', target: e.id };
        return accepted('Interaction prepared.');
      }
      case 'descend': {
        if (s.phase !== 'explore') return denied('Finish the encounter before descending.');
        const ladder = this._entities().find(e => e.type === 'ladder' && distance(p, e) <= 1 && (!a.target || a.target === e.id));
        if (!ladder) return denied('Stand beside a ladder.');
        if (!a.confirm) return { ok: false, confirm: true, message: `Descend to ${this.content.floors[ladder.toFloor].name}? There is no way back. Standing companions must also ready at the stair.`, action: { type: 'descend', confirm: true, target: ladder.id } };
        return accepted('Descent prepared.');
      }
      case 'cancelDescent': return accepted('Descent canceled.');
      default: return denied('Unknown action.');
    }
  }

  _weapon(p, source = 'right') {
    if (source === 'war') return { ok: true, definition: { name: 'War strike', channel: 'war', power: 3, range: 1, reusable: true }, id: null };
    if (source === 'spirit') return p.basicSpirit ? { ok: true, definition: { name: 'Spirit spark', channel: 'spirit', power: 3, range: 3, reusable: true }, id: null } : denied('Take the Tideglass rune to awaken your lasting Spirit spark.');
    const id = source === 'right' ? p.hands[1] : source, d = this._definition(id);
    if (!id || !this._owns(p, id) || !d || d.family !== 'weapon') return denied('Your right hand needs a weapon. Swap hands, equip one, or choose a free basic strike.');
    if (d.reusable && !p.hands.includes(id)) return denied('Equip that implement before attacking.');
    return { ok: true, id, definition: d };
  }

  _interaction(p, target) {
    if (target) return this.state.entities[target];
    const [dx, dy] = dirs[p.dir];
    const nearby = this._entities().filter(e => distance(p, e) <= 1 && !(e.type === 'loot' && e.claimed) && !(e.type === 'enemy' && e.dead));
    return nearby.find(e => e.x === p.x && e.y === p.y && e.type === 'loot') || nearby.find(e => e.x === p.x + dx && e.y === p.y + dy) || nearby.find(e => e.type !== 'enemy') || nearby[0];
  }

  _apply(p, a) {
    const s = this.state;
    switch (a.type) {
      case 'move': {
        const previous = { x: p.x, y: p.y };
        p.x += a.dx; p.y += a.dy; p.sightMoves = Math.max(0, p.sightMoves - 1); this._see(p); s.stats.steps++; s.descentReady = {};
        this._event('move', '', { player: p.id, x: p.x, y: p.y });
        if (!s.combat) {
          const trigger = this._entities().find(e => e.type === 'enemy' && !e.dead && distance(p, e) <= (this.content.enemies[e.kind].boss ? 2 : 1) && this.lineOfSight(p, e));
          if (trigger) { p.safe = previous; this._beginEncounter(trigger); }
          else p.safe = { x: p.x, y: p.y };
        }
        return accepted('Step.');
      }
      case 'attack': {
        const e = s.entities[a.target || s.combat.enemies.find(id => !s.entities[id].dead)], w = this._weapon(p, a.source), d = w.definition;
        if (d.ammo) p.arrows--;
        if (w.id && !d.reusable) this._removeItem(p, w.id);
        const base = Math.max(1, Math.round(d.power * s.tuning.playerDamage)), defense = d.channel === 'war' ? e.armor : e.ring, loss = Math.max(1, base - defense);
        e[d.channel] = Math.max(0, e[d.channel] - loss); e.damageTaken += loss; s.stats[d.channel === 'war' ? 'damageWar' : 'damageSpirit'] += loss;
        this._event('attack', `${d.name}: ${base} ${d.channel === 'war' ? 'War' : 'Spirit'} − ${defense} defense = ${loss} lost.`, { player: p.id, target: e.id, channel: d.channel, amount: loss, base, defense, weapon: w.id, kind: this.state.items[w.id]?.kind || a.source });
        this._checkEnemy(e);
        return accepted('Attack resolved.');
      }
      case 'guard':
        p.guard = { channel: ['war', 'spirit'].includes(a.channel) ? a.channel : 'both', reduction: 4 };
        this._event('guard', `${p.name} guards: the next matching hit loses 4 damage.`, { player: p.id });
        return accepted('Guarding.');
      case 'retreat': return this._retreat(p);
      case 'equip': {
        const old = p.hands[a.hand]; p.hands[a.hand] = p.pack[a.slot]; p.pack[a.slot] = old;
        this._event('equip', `${p.name} equips ${this._definition(p.hands[a.hand]).name} in the ${a.hand ? 'right' : 'left'} hand.`, { player: p.id, item: p.hands[a.hand], hand: a.hand });
        return accepted('Equipment changed.');
      }
      case 'swap': {
        p.hands.reverse(); this._event('swap', `${p.name} swaps hands.`, { player: p.id }); return accepted('Hands swapped.');
      }
      case 'use': return this._use(p, a.item);
      case 'drop': {
        const id = p.pack[a.slot]; p.pack[a.slot] = null; this._dropAt(id, p);
        this._event('drop', `${this._definition(id).name} rests at your feet.`, { player: p.id, item: id }); return accepted('Object left safely.');
      }
      case 'pickup': return this._pickup(p, a);
      case 'rest': {
        const war = Math.min(s.tuning.rationWar, p.maxWar - p.war), spirit = Math.min(s.tuning.rationSpirit, p.maxSpirit - p.spirit);
        p.food--; p.war += war; p.spirit += spirit; s.stats.rests++;
        this._event('rest', `One ration restores ${war} War and ${spirit} Spirit.`, { player: p.id, war, spirit, amount: war + spirit });
        return accepted(`Restored ${war} War and ${spirit} Spirit.`);
      }
      case 'handoff': {
        const to = s.players[String(a.target)];
        if (a.item === 'food') { p.food--; to.food++; } else if (a.item === 'arrows') { p.arrows--; to.arrows++; } else { this._removeItem(p, a.item); to.pack[to.pack.indexOf(null)] = a.item; }
        this._event('handoff', `${p.name} passes ${a.item === 'food' ? 'one ration' : a.item === 'arrows' ? 'one arrow' : this._definition(a.item).name} to ${to.name}.`, { player: p.id, target: to.id, item: a.item });
        return accepted('Handoff complete.');
      }
      case 'revive': {
        const to = s.players[String(a.target)]; p.food--; to.war = Math.max(to.war, Math.ceil(to.maxWar * .3), 1); to.spirit = Math.max(to.spirit, Math.ceil(to.maxSpirit * .3), 1); to.down = false; s.stats.revives++;
        this._event('revive', `${to.name} rises with ${to.war} War and ${to.spirit} Spirit. One ration spent.`, { player: p.id, target: to.id, war: to.war, spirit: to.spirit }); return accepted('Companion revived.');
      }
      case 'interact': return this._interact(p, a);
      case 'descend': return this._descend(p, a);
      case 'cancelDescent': delete s.descentReady[p.id]; return accepted('Descent canceled.');
      default: return denied('Unknown action.');
    }
  }

  _use(p, id) {
    const d = this._definition(id), s = this.state;
    if (d.use === 'armor' || d.use === 'ring') { p[d.use] = d.defense; p[`${d.use}Item`] = id; }
    if (d.use === 'restore') { p.war = Math.min(p.maxWar, p.war + d.war); p.spirit = Math.min(p.maxSpirit, p.spirit + d.spirit); }
    if (d.use === 'training') { const max = d.channel === 'war' ? 'maxWar' : 'maxSpirit', training = d.channel === 'war' ? 'trainingWar' : 'trainingSpirit'; p[max] += d.power; p[d.channel] += d.power; p[training] += d.power; }
    if (d.use === 'sight') { p.sightMoves = d.moves; this._see(p); }
    if (!d.reusable) this._removeItem(p, id);
    this._event('use', d.use === 'sight' ? 'The masonry grows thin. Secret geometry is revealed for 12 movement steps.' : `${p.name} uses ${d.name}.`, { player: p.id, item: id, kind: s.items[id].kind, channel: d.channel, use: d.use });
    return accepted(d.use === 'sight' ? 'Wall-sight: 12 movement steps.' : `${d.name} used.`);
  }

  _dropAt(id, point) {
    this.state.entities[`drop:${id}`] = { id: `drop:${id}`, type: 'loot', floor: this.state.floor, x: point.x, y: point.y, itemId: id, kind: this.state.items[id].kind, claimed: false, name: this._definition(id).name };
  }

  _pickup(p, a) {
    const e = this.state.entities[a.target], s = this.state;
    if (e.itemId) {
      let slot = p.pack.indexOf(null);
      if (slot < 0) { slot = a.swap; const old = p.pack[slot]; this._dropAt(old, e); }
      p.pack[slot] = e.itemId;
      if (s.items[e.itemId].kind === 'rune' || s.items[e.itemId].kind === 'brightRune') for (const player of Object.values(s.players)) player.basicSpirit = true;
    }
    if (e.key && !s.shared.keys.includes(e.key)) s.shared.keys.push(e.key);
    p.food += e.food || 0; p.arrows += e.arrows || 0; e.claimed = true;
    const name = e.itemId ? this._definition(e.itemId).name : e.name;
    this._event('pickup', `${p.name} takes ${name}${e.food ? `: ${e.food} rations` : ''}${e.arrows ? `, ${e.arrows} arrows` : ''}${e.key ? '. The keyring is shared' : ''}.`, { player: p.id, target: e.id, item: e.itemId, kind: e.kind, food: e.food || 0, arrows: e.arrows || 0 });
    return accepted(`${name} taken.`);
  }

  _interact(p, a) {
    const e = this._interaction(p, a.target), s = this.state;
    if (e.type === 'loot') return this._pickup(p, { ...a, target: e.id });
    if (e.type === 'door') {
      if (e.open) return accepted('The door stands open.');
      e.open = true; this._event('door', `${e.name} opens. The sun-cut key remains on the keyring.`, { player: p.id, target: e.id }); return accepted('Door opened.');
    }
    if (e.type === 'secret') {
      if (e.open) return accepted('The secret way is open.');
      e.open = true; s.stats.secrets++; this._see(p); this._event('secret', 'A hollow stone turns. A forgotten passage opens.', { player: p.id, target: e.id }); return accepted('Secret passage opened.');
    }
    if (e.type === 'gate') {
      const effect = e.options[a.choice];
      const oldWar = p.war, oldSpirit = p.spirit;
      p.war = clamp(p.war + effect.war, 1, p.maxWar); p.spirit = clamp(p.spirit + effect.spirit, 1, p.maxSpirit);
      p.x = e.destination.x; p.y = e.destination.y; p.safe = { x: p.x, y: p.y }; e.usedBy ||= []; e.usedBy.push(p.id); e.used = true; s.stats.gates++; s.epoch++; this._see(p);
      this._event('gate', `The ${a.choice} gate closes behind you: War ${oldWar} → ${p.war}; Spirit ${oldSpirit} → ${p.spirit}.`, { player: p.id, target: e.id, choice: a.choice }); return accepted('One-way passage complete.');
    }
    if (e.type === 'chest') {
      if (e.open) return accepted('The coffer is empty.');
      if (a.choice === 'disarm') { e.disarmed = true; this._event('disarm', 'The silver wire slackens. The coffer is safe to open.', { player: p.id, target: e.id }); return accepted('Trap disarmed. Open the safe coffer.'); }
      if (e.trapped && !e.disarmed) this._hurt(p, 'war', 6, e.id, 'The latch snaps');
      e.open = true; p.food += e.food || 0;
      for (let n = 0; n < e.contains.length; n++) {
        const id = `${e.id}.contents.${n}`, iid = this._newItem(e.contains[n], `${id}.item`);
        s.entities[id] = { id, type: 'loot', floor: s.floor, x: e.x, y: e.y, itemId: iid, kind: e.contains[n], claimed: false };
      }
      this._event('chest', `${e.name} opens${e.food ? `: ${e.food} rations and useful objects` : ''}.`, { player: p.id, target: e.id }); return accepted('Contents lie safely at the coffer.');
    }
    if (e.type === 'ladder') return this._descend(p, { ...a, confirm: true, target: e.id });
    if (e.type === 'treasure') {
      e.claimed = true; s.shared.treasureClaimed = true; s.phase = 'victory'; s.combat = null; s.epoch++;
      this._event('victory', 'You lift the Emberheart. The engine falls silent. The expedition is complete.', { player: p.id, target: e.id }); return accepted('The treasure is yours.');
    }
    if (e.type === 'mural' || e.type === 'camp') { this._event('inspect', e.text, { player: p.id, target: e.id }); return accepted(e.text); }
    if (e.type === 'enemy') return { ok: true, entity: clone(e), message: this.content.enemies[e.kind].hint };
    return denied('Nothing to do here.');
  }

  _descend(p, a) {
    const s = this.state, ladder = this._entities().find(e => e.type === 'ladder' && distance(p, e) <= 1 && (!a.target || a.target === e.id));
    s.descentReady[p.id] = ladder.id;
    const living = this._living();
    if (!living.every(other => s.descentReady[other.id] === ladder.id && distance(other, ladder) <= 1)) {
      this._event('ready', `${p.name} is ready to descend. Waiting for the standing companion.`, { player: p.id }); return { ok: true, waiting: true, message: 'Ready at the ladder. Your standing companion must also confirm here.' };
    }
    this._enterFloor(ladder.toFloor);
    this._event('descend', `${this.content.floors[s.floor].name}. The stair closes above you.`, { floor: s.floor });
    this.checkpoint = this.snapshot();
    return accepted('Descent complete.');
  }

  _enterFloor(fi, initial = false) {
    const s = this.state, start = this.content.floors[fi].start;
    s.floor = fi; s.phase = 'explore'; s.combat = null; s.descentReady = {}; s.epoch++;
    for (const p of Object.values(s.players)) { Object.assign(p, { x: start.x, y: start.y, dir: start.dir, seen: [], safe: { x: start.x, y: start.y }, guard: null, sightMoves: 0 }); if (initial) p.down = false; this._see(p); }
  }

  _beginEncounter(e) {
    const s = this.state;
    if (s.combat) return;
    const group = this._entities().filter(other => other.type === 'enemy' && !other.dead && (other.id === e.id || e.encounter && other.encounter === e.encounter));
    const scale = this._living().length > 1 ? 1.5 : 1;
    for (const enemy of group) if (!enemy.scaled) {
      enemy.war = enemy.maxWar = Math.ceil(enemy.maxWar * scale); enemy.spirit = enemy.maxSpirit = Math.ceil(enemy.maxSpirit * scale); enemy.scaled = true; enemy.scale = scale;
    }
    s.epoch++; s.phase = 'combat'; s.combat = { id: `${s.runId}.encounter.${++s.encounterSeq}`, round: 1, enemies: group.map(other => other.id), intents: {}, plans: {}, deadline: null, phasePause: false };
    this._telegraph(); this._event('encounter', `${group.map(other => other.name).join(' and ')}. Read the intention; choose, then commit.`, { target: e.id, enemies: group.map(other => other.id) });
  }

  _telegraph() {
    const s = this.state, c = s.combat;
    if (!c) return;
    c.intents = {};
    for (const id of c.enemies) {
      const e = s.entities[id]; if (e.dead) continue;
      const d = this.content.enemies[e.kind], living = this._living().sort((a, b) => distance(a, e) - distance(b, e) || a.id.localeCompare(b.id));
      const target = living[(c.round + c.enemies.indexOf(id) - 1) % Math.max(1, living.length)]; if (!target) continue;
      let channel = d.channel === 'mixed' ? (c.round % 2 ? 'war' : 'spirit') : d.channel;
      if (d.boss) channel = e.phase === 1 ? 'war' : e.phase === 2 ? 'spirit' : c.round % 2 ? 'war' : 'spirit';
      const windup = e.kind === 'brute' && c.round % 2 === 1;
      const heavy = e.kind === 'brute' && !windup;
      c.intents[id] = { target: target.id, channel, power: windup ? 0 : Math.max(1, Math.round((d.power + (d.boss && e.phase === 3 ? 1 : 0)) * s.tuning.enemyDamage)), kind: windup ? 'windup' : heavy ? 'heavy' : 'strike', range: d.range, tile: { x: target.x, y: target.y }, label: windup ? 'Drawing back · no damage this round' : `${heavy ? 'Hammer fall' : channel === 'war' ? 'Steel blow' : 'Rune flare'} → ${target.name}` };
    }
  }

  _commit(p, a) {
    const s = this.state, c = s.combat;
    if (!c || c.plans[p.id]) return denied('Your intention is committed for this round.');
    if (a.round != null && a.round !== c.round || a.encounter != null && a.encounter !== c.id) return denied('That intention belongs to an older round.');
    const validation = this._validate(p, a);
    if (!validation.ok) return validation;
    c.plans[p.id] = clone(a);
    if (c.deadline === null && this._living().length > 1) c.deadline = s.clock + s.tuning.planningSeconds * 1000;
    this._event('ready', `${p.name} commits ${a.type}.`, { player: p.id, action: a.type, round: c.round });
    if (this._living().every(other => c.plans[other.id])) this._resolve();
    return { ok: true, committed: true, message: 'Intention committed.' };
  }

  _resolve() {
    const s = this.state, c = s.combat;
    if (!c || s.phase !== 'combat' || c.resolving) return;
    c.resolving = true; s.stats.rounds++; s.tick++;
    for (const p of this._living()) {
      const a = c.plans[p.id] || { type: 'guard', channel: 'both' }, valid = this._validate(p, a, true);
      if (!valid.ok) { p.guard = { channel: 'both', reduction: 4 }; this._event('fallback', `${p.name} guards at no resource cost: ${valid.message}`, { player: p.id }); }
      else this._apply(p, a);
      if (!s.combat || s.phase === 'victory' || s.phase === 'defeat') return;
    }
    if (c.enemies.every(id => s.entities[id].dead)) { this._endEncounter(); return; }
    if (c.phasePause) {
      s.phase = 'preparation'; c.plans = {}; c.deadline = null; c.resolving = false; c.phasePause = false;
      c.round++; for (const p of Object.values(s.players)) p.guard = null; return;
    }
    for (const id of c.enemies) {
      const e = s.entities[id], intent = c.intents[id]; if (e.dead || !intent) continue;
      const p = s.players[intent.target]; if (!p || !p.connected || p.down) continue;
      if (intent.kind === 'windup') { this._event('anticipate', `${e.name} raises its hammer. Next round: ${Math.round(this.content.enemies[e.kind].power * s.tuning.enemyDamage)} War.`, { target: id, player: p.id }); continue; }
      if (intent.kind === 'heavy' && (p.x !== intent.tile.x || p.y !== intent.tile.y)) { this._event('miss', `${e.name} crushes the tile you left.`, { target: id, player: p.id }); continue; }
      if (distance(p, e) > intent.range || !this.lineOfSight(e, p)) { this._approach(e, p); continue; }
      this._hurt(p, intent.channel, intent.power, e.id, e.name);
      if (!s.combat) return;
    }
    for (const p of Object.values(s.players)) p.guard = null;
    c.round++; c.plans = {}; c.deadline = null; c.resolving = false; this._telegraph();
  }

  _approach(e, p) {
    const step = this._pathStep(e, p, true);
    if (step) { e.x = step.x; e.y = step.y; this._event('approach', `${e.name} advances one tile.`, { target: e.id, x: e.x, y: e.y }); }
    else this._event('wait', `${e.name} waits beyond the stone.`, { target: e.id });
  }

  _pathStep(a, b, allowTarget = false) {
    const queue = [{ x: a.x, y: a.y, first: null }], visited = new Set([coord(a)]);
    for (let i = 0; i < queue.length && i < 160; i++) {
      const q = queue[i];
      for (const [dx, dy] of dirs) {
        const next = { x: q.x + dx, y: q.y + dy }, k = coord(next);
        if (visited.has(k)) continue;
        if (next.x === b.x && next.y === b.y) return q.first || (allowTarget ? next : null);
        if (!this._walkable(next.x, next.y)) continue;
        if (Object.values(this.state.players).some(p => p.connected && p.x === next.x && p.y === next.y)) continue;
        visited.add(k); queue.push({ ...next, first: q.first || next });
      }
    }
    return null;
  }

  _hurt(p, channel, power, source, label) {
    const s = this.state;
    const shield = channel === 'war' && this._definition(p.hands[0])?.family === 'shield' ? this._definition(p.hands[0]).defense : 0;
    const defense = (channel === 'war' ? p.armor : p.ring) + shield;
    const guard = p.guard && (p.guard.channel === 'both' || p.guard.channel === channel) ? p.guard.reduction : 0;
    const loss = s.invulnerable ? 0 : Math.max(0, power - defense - guard);
    if (guard) p.guard = null;
    p[channel] = Math.max(0, p[channel] - loss);
    this._event('enemyAttack', `${label}: ${power} ${channel === 'war' ? 'War' : 'Spirit'} − ${defense} defense${guard ? ` − ${guard} guard` : ''} = ${loss} lost.`, { player: p.id, target: source, channel, amount: loss, base: power, defense, guard });
    if ((p.war === 0 || p.spirit === 0) && !p.down) { p.down = true; this._event('down', `${p.name} falls. A ration and a nearby companion can revive them.`, { player: p.id, channel }); }
    if (!this._living().length) { s.phase = 'defeat'; s.combat = null; s.epoch++; this._event('defeat', 'A strength is spent. The vault keeps its treasure. Retry restores your viable floor-entry state.'); }
  }

  _checkEnemy(e) {
    const s = this.state, d = this.content.enemies[e.kind];
    if (d.boss) {
      const total = Math.max(e.maxWar, e.maxSpirit), nextPhase = Math.min(3, Math.floor(e.damageTaken / (total / 3)) + 1);
      if (e.damageTaken >= total || e.war <= 0 || e.spirit <= 0) e.dead = true;
      else if (nextPhase > e.phase) {
        e.phase = nextPhase; e.armor = e.phase === 2 ? 5 : 2; e.ring = e.phase === 2 ? 0 : 2;
        if (s.combat) s.combat.phasePause = true;
        s.stats.bossPhases++;
        this._event('bossPhase', `Seal ${e.phase - 1} breaks. ${e.phase === 2 ? 'The tide seal wakes: its next blows strike Spirit.' : 'The final oath wakes: War and Spirit alternate.'} Prepare before continuing. Damage already earned remains.`, { target: e.id, phase: e.phase, damageTaken: e.damageTaken });
      }
    } else if (e.war <= 0 || e.spirit <= 0) e.dead = true;
    if (e.dead && !e.counted) {
      e.counted = true; s.stats.enemies++; this._event('defeatEnemy', `${e.name} dissolves.`, { target: e.id });
      if (d.boss) { s.shared.bossDefeated = true; this._event('bossDefeated', 'The final oath is broken. The Emberheart is unsealed. Take it yourself.', { target: e.id }); }
    }
  }

  _endEncounter() {
    const s = this.state;
    s.combat = null; s.phase = 'explore'; s.epoch++;
    for (const p of Object.values(s.players)) { p.guard = null; if (!p.down) p.safe = { x: p.x, y: p.y }; }
    this._event('encounterEnd', 'The corridor is quiet. Gather supplies. Mend your strengths.');
  }

  retreatPreview(playerId) {
    const p = this.state.players[String(playerId)], c = this.state.combat;
    if (!p || !c) return 'No encounter.';
    const strikes = c.enemies.filter(id => !this.state.entities[id].dead && c.intents[id]?.power > 0).map(id => { const i = c.intents[id]; const shield = i.channel === 'war' && this._definition(p.hands[0])?.family === 'shield' ? this._definition(p.hands[0]).defense : 0; const defense = (i.channel === 'war' ? p.armor : p.ring) + shield; return `${Math.max(0, i.power - defense)} ${i.channel === 'war' ? 'War' : 'Spirit'}`; });
    return `Retreat the party to safe ground? ${p.name} takes the previewed parting strike${strikes.length > 1 ? 's' : ''}: ${strikes.join(' + ') || '0 damage'}.`;
  }

  _safeTile(p) {
    const safe = p.safe || this.content.floors[this.state.floor].start;
    if (this._walkable(safe.x, safe.y) && !this._entities().some(e => e.type === 'enemy' && !e.dead && distance(safe, e) <= 1 && this.lineOfSight(safe, e))) return safe;
    const start = this.content.floors[this.state.floor].start, q = [{ x: p.x, y: p.y }], visited = new Set();
    for (let n = 0; n < q.length && n < 160; n++) {
      const at = q[n], key = coord(at); if (visited.has(key)) continue; visited.add(key);
      if (this._walkable(at.x, at.y) && !this._entities().some(e => e.type === 'enemy' && !e.dead && distance(at, e) <= 1 && this.lineOfSight(at, e))) return at;
      for (const [dx, dy] of dirs) if (this._walkable(at.x + dx, at.y + dy)) q.push({ x: at.x + dx, y: at.y + dy });
    }
    return { x: start.x, y: start.y };
  }

  _retreat(p) {
    const s = this.state, c = s.combat;
    for (const id of c.enemies) {
      const e = s.entities[id], intent = c.intents[id]; if (!e.dead && intent?.power > 0 && !p.down) this._hurt(p, intent.channel, intent.power, e.id, `${e.name}’s parting strike`);
    }
    for (const other of Object.values(s.players)) { const tile = this._safeTile(other); other.x = tile.x; other.y = tile.y; other.guard = null; this._see(other); }
    if (s.phase !== 'defeat') { s.combat = null; s.phase = 'explore'; s.epoch++; this._event('retreat', 'The party regroups on safe stone.', { player: p.id }); }
    return accepted('Retreat resolved.');
  }

  advance(ms) {
    const s = this.state;
    if (s.phase === 'ended' || !Number.isFinite(ms) || ms < 0) return;
    s.clock += Math.min(ms, 60000);
    if (s.phase === 'combat' && s.combat?.deadline !== null && s.clock >= s.combat.deadline) this._resolve();
  }

  leave(playerId) {
    const s = this.state, p = s.players[String(playerId)];
    if (!p || !p.connected || s.phase === 'ended') return denied('Adventurer already absent.');
    const tile = this._safeTile(p), belongings = [...p.hands, ...p.pack, p.armorItem, p.ringItem].filter(Boolean);
    for (const id of new Set(belongings)) this._dropAt(id, tile);
    if (p.food || p.arrows) { const id = `departed:${p.id}:${s.tick}`; s.entities[id] = { id, type: 'loot', floor: s.floor, ...tile, food: p.food, arrows: p.arrows, name: `${p.name}’s recovered supplies`, claimed: false }; }
    p.connected = false; p.hands = [null, null]; p.pack = Array(6).fill(null); p.food = p.arrows = 0; p.armorItem = p.ringItem = null; delete s.descentReady[p.id];
    if (s.combat) { delete s.combat.plans[p.id]; for (const [id, intent] of Object.entries(s.combat.intents)) if (intent.target === p.id) s.combat.intents[id] = { ...intent, target: null, label: 'Departed target · this blow is canceled' }; if (this._living().length && this._living().every(other => s.combat.plans[other.id])) this._resolve(); }
    if (!this._living().length && Object.values(s.players).some(other => other.connected)) { s.phase = 'defeat'; s.combat = null; }
    this._event('leave', `${p.name} departs. Their belongings wait in a recovered bag on safe stone. Shared keys remain.`, { player: p.id, x: tile.x, y: tile.y });
    return accepted('Departure handled.');
  }

  snapshot() { return clone(this.state); }
  exportSave() { return { schema: 1, state: this.snapshot(), checkpoint: clone(this.checkpoint) }; }

  load(save) {
    const snapshot = save?.state || save;
    if (!snapshot || snapshot.schema !== 1 || snapshot.contentVersion !== 1 || !this.content.floors[snapshot.floor] || !snapshot.players || !snapshot.entities || !snapshot.items || typeof snapshot.runId !== 'string' || !Number.isFinite(snapshot.clock) || !['explore', 'combat', 'preparation', 'defeat', 'victory', 'ended'].includes(snapshot.phase)) return denied('This save is corrupt or belongs to an unsupported version.');
    const imported = snapshot.content || this.content;
    if (!validateContent(imported).ok) return denied('The saved dungeon content is invalid.');
    const ids = Object.keys(snapshot.players), owned = new Set();
    if (ids.length < 1 || ids.length > 2) return denied('Invalid adventurer count in save.');
    for (const id of ids) {
      const p = snapshot.players[id];
      if (!p || !Array.isArray(p.pack) || p.pack.length !== 6 || !Array.isArray(p.hands) || p.hands.length !== 2 || !Array.isArray(p.seen) || !Number.isInteger(p.x) || !Number.isInteger(p.y) || !Number.isInteger(p.dir) || p.dir < 0 || p.dir > 3) return denied('Invalid position or inventory in save.');
      if (![p.war, p.maxWar, p.spirit, p.maxSpirit, p.food, p.arrows].every(Number.isFinite) || p.maxWar < 1 || p.maxSpirit < 1 || p.war < 0 || p.war > p.maxWar || p.spirit < 0 || p.spirit > p.maxSpirit || p.food < 0 || p.arrows < 0) return denied('Invalid strength or counters in save.');
      const possessions = [...p.pack, ...p.hands, p.armorItem, p.ringItem].filter(Boolean);
      if (possessions.some(itemId => !snapshot.items[itemId] || !imported.items[snapshot.items[itemId].kind])) return denied('A saved object has no definition.');
      for (const itemId of possessions) { if (owned.has(itemId)) return denied('A saved object appears in more than one inventory slot.'); owned.add(itemId); }
    }
    if (Object.values(snapshot.items).some(i => !imported.items[i.kind])) return denied('Unknown object in save.');
    for (const e of Object.values(snapshot.entities)) if (e.type === 'loot' && !e.claimed && e.itemId) { if (!snapshot.items[e.itemId] || owned.has(e.itemId)) return denied('A saved world object is duplicated or missing.'); owned.add(e.itemId); }
    if (!snapshot.shared || !Array.isArray(snapshot.shared.keys) || !snapshot.tuning || Object.keys(DEFAULT_TUNING).some(key => !Number.isFinite(snapshot.tuning[key]))) return denied('Invalid shared progression or tuning in save.');
    if (snapshot.combat && (!Array.isArray(snapshot.combat.enemies) || !snapshot.combat.plans || !snapshot.combat.intents || !Number.isInteger(snapshot.combat.round) || snapshot.combat.round < 1 || snapshot.combat.enemies.some(id => snapshot.entities[id]?.type !== 'enemy'))) return denied('Invalid encounter in save.');
    this.content = clone(imported);
    this.state = clone(snapshot);
    if (save.checkpoint?.schema === 1 && save.checkpoint.floor === snapshot.floor) this.checkpoint = clone(save.checkpoint);
    else {
      this.checkpoint = this.snapshot(); const start = this.content.floors[snapshot.floor].start;
      this.checkpoint.phase = 'explore'; this.checkpoint.combat = null;
      for (const p of Object.values(this.checkpoint.players)) { Object.assign(p, start); p.war = p.maxWar; p.spirit = p.maxSpirit; p.food = Math.max(3, p.food); p.down = false; p.safe = { x: start.x, y: start.y }; }
    }
    return accepted('Expedition restored.');
  }

  retry() {
    if (!this.checkpoint) return denied('No floor-entry checkpoint exists.');
    const saved = clone(this.checkpoint); this.state = saved; this.state.epoch++; this.state.phase = 'explore'; this.state.combat = null;
    for (const p of Object.values(this.state.players)) { if (!p.connected) continue; p.war = Math.max(Math.ceil(p.maxWar * .7), p.war); p.spirit = Math.max(Math.ceil(p.maxSpirit * .7), p.spirit); p.food = Math.max(3, p.food); p.down = false; }
    this._event('retry', 'The floor-entry expedition is restored. Both strengths and viable provisions are yours again.');
    return accepted('Floor-entry checkpoint restored.');
  }

  continueExpedition() {
    const s = this.state;
    if (s.phase !== 'victory' || !s.shared.treasureClaimed || !s.shared.bossDefeated) return denied('Claim the Emberheart before continuing a completed expedition.');
    s.phase = 'explore'; s.completed = true; s.combat = null; s.descentReady = {}; s.epoch++;
    this._event('continue', 'The Emberheart is yours. Walk the quiet vault; this expedition remains complete.');
    return accepted('The completed vault is open to you.');
  }

  importContent(content) {
    const validation = validateContent(content);
    if (!validation.ok) return { ok: false, message: validation.errors.join('\n'), errors: validation.errors };
    const s = this.state, next = new Model({ content, players: Object.values(s.players).filter(p => p.connected).map(p => ({ id: p.id, name: p.name })), seed: s.seed, runId: `${s.runId}.edited` });
    this.content = next.content; this.state = next.state; this.state.modified = true; this.state.content = clone(content); this.checkpoint = this.snapshot();
    this._event('content', 'Validated dungeon content applied. A fresh unscored expedition begins.');
    return accepted('Validated content applied to a new unscored expedition.');
  }

  setTuning(patch = {}) {
    const s = this.state, ranges = { playerDamage: [.25, 3], enemyDamage: [.25, 3], maxWar: [12, 120], maxSpirit: [12, 120], rationWar: [1, 24], rationSpirit: [1, 24], planningSeconds: [2, 30], tempo: [.25, 3] };
    for (const [key, value] of Object.entries(patch)) if (ranges[key] && Number.isFinite(value)) s.tuning[key] = clamp(value, ...ranges[key]);
    for (const p of Object.values(s.players)) {
      p.maxWar = Math.round(s.tuning.maxWar) + p.trainingWar; p.maxSpirit = Math.round(s.tuning.maxSpirit) + p.trainingSpirit;
      p.war = clamp(p.war, p.down ? 0 : 1, p.maxWar); p.spirit = clamp(p.spirit, p.down ? 0 : 1, p.maxSpirit);
    }
    if (s.combat) { s.combat.plans = {}; s.combat.deadline = null; this._telegraph(); }
    s.modified = true; this._event('tuning', 'Balance changed. Pending plans reset at this boundary. This expedition is unscored.');
    return accepted('Live tuning applied.');
  }

  dev(a = {}) {
    const s = this.state, p = s.players[String(a.player ?? ordered(s.players)[0])];
    s.modified = true;
    if (a.type === 'jump') { const floor = Number(a.floor); if (!this.content.floors[floor]) return denied('Unknown floor.'); this._enterFloor(floor); for (const other of Object.values(s.players)) { other.war = other.maxWar; other.spirit = other.maxSpirit; other.down = false; other.food = Math.max(other.food, 8); other.basicSpirit = true; } this.checkpoint = this.snapshot(); }
    else if (a.type === 'invulnerable') s.invulnerable = a.value == null ? !s.invulnerable : !!a.value;
    else if (a.type === 'supplies' || a.type === 'restore') { for (const other of Object.values(s.players)) { other.war = other.maxWar; other.spirit = other.maxSpirit; other.down = false; if (a.type === 'supplies') { other.food += 10; other.arrows += 12; } } if (s.phase === 'defeat') { s.phase = 'explore'; s.combat = null; } }
    else if (a.type === 'spawn') { if (!this.content.items[a.kind]) return denied('Unknown item.'); const id = this._newItem(a.kind); this._dropAt(id, p); }
    else if (a.type === 'reveal') { p.seen = this.content.floors[s.floor].rows.flatMap((row, y) => [...row].map((_, x) => `${x},${y}`)); p.sightMoves = 999; }
    else if (a.type === 'encounter') { const e = s.entities[a.target]; if (!e || e.type !== 'enemy' || e.dead) return denied('Choose a living enemy.'); if (e.floor !== s.floor) this._enterFloor(e.floor); const adj = dirs.map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy })).find(v => this._walkable(v.x, v.y)); if (adj) { p.x = adj.x; p.y = adj.y; p.safe = this.content.floors[s.floor].start; } this._beginEncounter(e); }
    else if (a.type === 'step') this.advance(Math.max(0, Math.min(60000, Number(a.ms) || 1000)));
    else if (a.type === 'teleport') { if (!this._walkable(a.x, a.y)) return denied('That tile is blocked.'); p.x = a.x; p.y = a.y; this._see(p); }
    else if (a.type === 'retry') return this.retry();
    else return denied('Unknown developer tool.');
    this._event('developer', `Developer tool: ${a.type}. Expedition marked unscored.`); return accepted('Developer tool applied.');
  }

  end() { this.state.phase = 'ended'; this.state.combat = null; this.state.descentReady = {}; }
}

export function validateContent(content = CONTENT) {
  const errors = [], ids = new Set();
  if (!content || typeof content !== 'object' || !content.items || !content.enemies || !Array.isArray(content.floors)) return { ok: false, errors: ['Content requires items, enemies, and floors.'], warnings: [], floors: 0, entities: 0 };
  if (content.version !== 1) errors.push('Unsupported content schema version.');
  for (const [id, item] of Object.entries(content.items)) {
    if (!item || typeof item.name !== 'string' || typeof item.description !== 'string' || typeof item.family !== 'string') { errors.push(`Item ${id}: missing text or family.`); continue; }
    if (item.family === 'weapon' && (!['war', 'spirit'].includes(item.channel) || !Number.isFinite(item.power) || item.power < 1 || !Number.isFinite(item.range) || item.range < 1)) errors.push(`Item ${id}: invalid attack channel, power, or range.`);
    if (['shield', 'armor', 'ring'].includes(item.family) && (!Number.isFinite(item.defense) || item.defense < 0)) errors.push(`Item ${id}: invalid defense.`);
  }
  for (const [id, enemy] of Object.entries(content.enemies)) {
    if (!enemy || typeof enemy.name !== 'string' || ![enemy.war, enemy.spirit, enemy.power, enemy.range].every(v => Number.isFinite(v) && v > 0) || ![enemy.armor, enemy.ring].every(v => Number.isFinite(v) && v >= 0) || !['war', 'spirit', 'mixed'].includes(enemy.channel)) errors.push(`Enemy ${id}: invalid strength, defense, intention, or range.`);
  }
  if (content.floors?.length !== 3) errors.push('Campaign must have three floors.');
  for (const [fi, f] of (content.floors || []).entries()) {
    if (!f || !Array.isArray(f.rows) || !f.rows.length || f.rows.some(row => typeof row !== 'string')) { errors.push(`Floor ${fi} has no valid rows.`); continue; }
    if (!f.start || !Number.isInteger(f.start.x) || !Number.isInteger(f.start.y) || !Array.isArray(f.entities) || f.entities.some(e => !e || typeof e.id !== 'string' || !['enemy', 'loot', 'door', 'gate', 'ladder', 'mural', 'chest', 'secret', 'treasure', 'camp'].includes(e.type))) { errors.push(`Floor ${fi} requires a start and valid entity definitions.`); continue; }
    const w = f.rows[0].length;
    if (f.rows.some(r => r.length !== w || /[^#.]/.test(r))) errors.push(`${f.id}: rows must be equal width and use #/.`);
    if (f.rows[f.start?.y]?.[f.start?.x] !== '.' || ![0, 1, 2, 3].includes(f.start?.dir)) errors.push(`${f.id}: spawn is inside geometry or has an invalid heading.`);
    const occupiedEnemies = new Set();
    for (const e of f.entities || []) {
      if (ids.has(e.id)) errors.push(`Duplicate entity ID ${e.id}.`); ids.add(e.id);
      if (!Number.isInteger(e.x) || !Number.isInteger(e.y) || !f.rows[e.y]?.[e.x]) errors.push(`${e.id}: outside map.`);
      if (f.rows[e.y]?.[e.x] === '#' && e.type !== 'secret') errors.push(`${e.id}: spawn inside wall.`);
      if (e.kind && !(e.type === 'enemy' ? content.enemies[e.kind] : content.items[e.kind])) errors.push(`${e.id}: dangling kind ${e.kind}.`);
      if (e.type === 'enemy') { if (occupiedEnemies.has(coord(e))) errors.push(`${e.id}: enemy spawn collision.`); occupiedEnemies.add(coord(e)); if (distance(e, f.start) < 2) errors.push(`${e.id}: unsafe floor entry.`); }
      if (e.type === 'door' && e.key && !f.entities.some(other => other.key === e.key && other.type === 'loot')) errors.push(`${e.id}: no reachable key definition.`);
      if (e.type === 'ladder' && !content.floors[e.toFloor]) errors.push(`${e.id}: dangling floor destination.`);
      if (e.type === 'gate' && f.rows[e.destination?.y]?.[e.destination?.x] !== '.') errors.push(`${e.id}: gate lands inside geometry.`);
      for (const kind of e.contains || []) if (!content.items[kind]) errors.push(`${e.id}: dangling contents ${kind}.`);
    }
    const reachable = new Set(), keys = new Set(), queue = [{ x: f.start.x, y: f.start.y }];
    const passable = (x, y) => {
      const at = f.entities.filter(e => e.x === x && e.y === y);
      if ((f.rows[y]?.[x] || '#') === '#' && !at.some(e => e.type === 'secret')) return false;
      return !at.some(e => e.type === 'door' && e.key && !keys.has(e.key));
    };
    for (let restart = 0; restart < 5; restart++) {
      let newKey = false;
      for (let n = 0; n < queue.length && n < 1000; n++) {
        const at = queue[n], k = coord(at); if (reachable.has(k)) continue; reachable.add(k);
        for (const e of f.entities.filter(e => e.x === at.x && e.y === at.y)) {
          if (e.type === 'loot' && e.key && !keys.has(e.key)) { keys.add(e.key); newKey = true; }
          if (e.type === 'gate') queue.push(e.destination);
        }
        for (const [dx, dy] of dirs) if (passable(at.x + dx, at.y + dy)) queue.push({ x: at.x + dx, y: at.y + dy });
      }
      if (!newKey) break;
      queue.length = 0; for (const k of reachable) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of dirs) if (passable(x + dx, y + dy) && !reachable.has(`${x + dx},${y + dy}`)) queue.push({ x: x + dx, y: y + dy }); }
    }
    for (const e of f.entities) if (!reachable.has(coord(e))) errors.push(`${e.id}: unreachable from entry with key/lock order.`);
    for (const gate of f.entities.filter(e => e.type === 'gate')) {
      const exit = f.entities.find(e => e.type === 'ladder');
      if (!gate.destination || !Number.isInteger(gate.destination.x) || !Number.isInteger(gate.destination.y)) { errors.push(`${gate.id}: missing gate destination.`); continue; }
      if (!exit || !reachable.has(coord(gate.destination)) || !reachable.has(coord(exit))) errors.push(`${gate.id}: no proven path to exit.`);
      const afterGate = new Set(), branch = [gate.destination];
      for (let n = 0; n < branch.length && n < 1000; n++) {
        const at = branch[n]; if (!at || afterGate.has(coord(at))) continue; afterGate.add(coord(at));
        for (const [dx, dy] of dirs) { const x = at.x + dx, y = at.y + dy; if (passable(x, y) && !f.entities.some(e => e.type === 'gate' && e.x === x && e.y === y) && !afterGate.has(`${x},${y}`)) branch.push({ x, y }); }
      }
      if (exit && !afterGate.has(coord(exit))) errors.push(`${gate.id}: its irreversible landing cannot reach the next ladder without crossing the gate again.`);
      for (const effect of Object.values(gate.options || {})) if (![effect.war, effect.spirit].every(Number.isFinite)) errors.push(`${gate.id}: invalid strength effect.`);
    }
    const groups = {};
    for (const e of f.entities.filter(e => e.type === 'enemy')) { const key = e.encounter || e.id; groups[key] = (groups[key] || 0) + 1; }
    if (Object.values(groups).some(n => n > 2)) errors.push(`${f.id}: encounter budget exceeds two threats.`);
    if (fi === 0 && (!f.entities.some(e => e.kind === 'rune') || !f.entities.some(e => e.key))) errors.push('Upper vault lacks required tutorial supplies.');
    if (fi === 1 && !f.entities.some(e => e.kind === 'ring')) errors.push('Spirit floor lacks its required defense.');
    if (fi === 2 && (!f.entities.some(e => e.kind === 'brightRune') || !f.entities.some(e => e.kind === 'steelBlade') || !f.entities.some(e => e.food >= 5))) errors.push('Boss preparation lacks baseline tools/provisions.');
  }
  return { ok: errors.length === 0, errors, warnings: [], floors: content.floors?.length || 0, entities: ids.size };
}
