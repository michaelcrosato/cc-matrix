// CAMPAIGNSIM: the war of the seasons. Pure and deterministic, its state plain JSON (this.s), its randomness G.Rng on
// s.rs. One turn is one season: Tidings (news, recovery, income, quests, events, AI muster), Muster (each human realm
// in seat order), March (declarations), then the battles they cause, one at a time, with their aftermath.
// Commands: apply({ t, ... }) -> events (see the switch). Story events are data (09-data-story.js): their conditions
// and effects run here, so they are saved and replayable.

const CR = G.Rng, HXC = G.hex;
const DIFF = {
  easy: { aiIncome: .8, threshold: 1.6, candle: 16, exp: 1.25, ai: 'easy' },
  normal: { aiIncome: 1, threshold: 1.3, candle: 12, exp: 1, ai: 'normal' },
  hard: { aiIncome: 1.25, threshold: 1.1, candle: 10, exp: 1, ai: 'hard' }
};
G.DIFF = DIFF;

class CampaignSim {
  constructor(s) { this.s = s; }
  static load(json) { return new CampaignSim(typeof json === 'string' ? JSON.parse(json) : G.clone(json)); }
  serialize() { return JSON.stringify(this.s); }
  hash() { return G.hashJSON(this.s); }

  /** a new campaign: { seed, humans: [realm, ...] (seat order), difficulty, tutorial } */
  static create(o = {}) {
    const s = {
      v: 1, seed: o.seed || 1, rs: CR.seed(o.seed || 1), difficulty: o.difficulty || 'normal', turn: 0, phase: 'tidings',
      humans: (o.humans || ['verdance']).slice(), cur: 0, realms: {}, castles: {}, knights: {}, monsters: {}, nextUid: 1,
      marches: [], queue: [], pending: null, candle: null, stilled: null, lastStilled: null, flags: {}, aiFlags: {}, seen: {},
      chronicle: [], result: null, dev: false, sanctumOpen: null, rivalSanctum: null, battles: 0, wanderers: {}, deferred: [],
      stats: { battlesWon: 0, battlesLost: 0, captures: 0, summons: 0 }, firstMarchDone: {}, eventLog: []
    };
    const sim = new CampaignSim(s);
    for (const id of G.REALMS) {
      const r = G.get('realm', id), items = {};
      for (const it of G.START_ITEMS[id]) items[it] = (items[it] || 0) + 1;
      s.realms[id] = { mana: r.mana, alive: true, items, human: s.humans.includes(id), aggression: r.aggression, income: 0, upkeep: 0, flags: {} };
    }
    for (const c of G.all('castle')) s.castles[c.id] = { owner: c.owner, knights: [], reserve: [], stilled: false, summons: 0, treasuryTaken: false };
    for (const k of G.all('knight')) if (k.castle && k.realm) sim._spawnKnight(k.id, k.realm, k.castle);
    for (const [cid, list] of Object.entries(G.START_RESERVE)) for (const [sp, lv] of list) sim._newMonster(sp, lv, 1, s.castles[cid].owner, { castle: cid });
    // free knights: who can be found where
    for (const k of G.all('knight')) if (k.free === 'wanderer') for (const r of k.regions) (s.wanderers[r] = s.wanderers[r] || []).push(k.id);
    sim.log('The Brigantime begins. Spring, Year 1.');
    return sim;
  }

  /* ---- records ---- */
  _spawnKnight(id, realm, castle, o = {}) {
    const s = this.s, d = G.get('knight', id), level = o.level || d.level, stats = G.classStats(d.cls, level);
    const k = { id, realm, cls: d.cls, level, exp: 0, stats, hp: stats.hp, mp: stats.mp, elem: d.elem, items: Object.assign({}, d.items), troop: [], formation: d.form || 'vanguard', castle, wounded: 0, quest: null, moved: false, marched: false, ruler: !!d.ruler, learned: [], bondBonus: 0, free: false };
    s.knights[id] = k; if (castle) s.castles[castle].knights.push(id);
    for (const [sp, lv, form] of d.troop) this._newMonster(sp, lv, form || 1, realm, { knight: id });
    return k;
  }
  _newMonster(sp, level, form, realm, o = {}) {
    const s = this.s, uid = 'm' + s.nextUid++, st = G.monsterStats(sp, form, level);
    const m = { uid, sp, form, level, exp: 0, hp: st.hp, mp: st.mp, realm, castle: null, knight: null };
    s.monsters[uid] = m;
    if (o.knight && this.bondFree(o.knight) >= G.get('monster', sp).rank && s.knights[o.knight].troop.length < 6) { m.knight = o.knight; s.knights[o.knight].troop.push(uid); }
    else { const c = o.castle || (o.knight && s.knights[o.knight].castle) || this.capital(realm); if (c) { m.castle = c; s.castles[c].reserve.push(uid); } }
    return m;
  }
  log(text) { this.s.chronicle.push({ turn: this.s.turn, text }); if (this.s.chronicle.length > 300) this.s.chronicle.shift(); }

  /* ---- queries ---- */
  get season() { return G.SEASONS[this.s.turn % 4]; }
  get year() { return Math.floor(this.s.turn / 4) + 1; }
  realm(id) { return this.s.realms[id]; }
  knight(id) { return this.s.knights[id]; }
  monster(uid) { return this.s.monsters[uid]; }
  castle(id) { return this.s.castles[id]; }
  castlesOf(realm) { return Object.keys(this.s.castles).filter(c => this.s.castles[c].owner === realm); }
  knightsOf(realm) { return Object.values(this.s.knights).filter(k => k.realm === realm && !k.free); }
  capital(realm) { const r = G.has('realm', realm) && G.get('realm', realm); if (r && r.capital && this.s.castles[r.capital].owner === realm) return r.capital; return this.castlesOf(realm)[0] || null; }
  isHuman(realm) { return this.s.humans.includes(realm); }
  currentHuman() { return this.s.humans[this.s.cur] || null; }
  bondOf(kid) { const k = this.knight(kid), c = G.get('class', k.cls); let b = c.bond + Math.floor(k.level / 4) + (k.bondBonus || 0); for (const sl of ['weapon', 'armor', 'accessory']) { const it = k.items[sl]; if (it) b += G.get('item', it).mods.bond || 0; } return b; }
  bondUsed(kid) { return G.sum(this.knight(kid).troop, uid => G.get('monster', this.monster(uid).sp).rank); }
  bondFree(kid) { return this.bondOf(kid) - this.bondUsed(kid); }
  wardOf(kid) { const k = this.knight(kid); let w = G.get('class', k.cls).ward; const acc = k.items.accessory; if (acc) w += G.get('item', acc).mods.ward || 0; return w; }
  monsterStats(uid) { const m = this.monster(uid); return G.monsterStats(m.sp, m.form, m.level); }
  /** can a knight act this Muster (not wounded, not questing, its castle not stilled)? */
  canAct(kid) { const k = this.knight(kid); return !!k && !k.free && !k.wounded && !k.quest && !!k.castle && !this.s.castles[k.castle].stilled; }
  income(realm) {
    const s = this.s, season = this.season; let inc = 0;
    for (const cid of this.castlesOf(realm)) {
      const c = G.get('castle', cid), st = s.castles[cid]; if (st.stilled) continue;
      let y = c.mana * G.tune.manaIncome; if (G.regionSeasons(c.region).includes(season)) y *= 1 + G.tune.seasonYield;
      inc += y;
    }
    if (!this.isHuman(realm) && realm !== 'brigands') inc *= DIFF[s.difficulty].aiIncome + G.tune.aiManaBonus;
    return Math.round(inc);
  }
  upkeep(realm, season = this.season) {
    let u = 0;
    for (const m of Object.values(this.s.monsters)) if (m.realm === realm) { let x = G.monsterUpkeep(m.sp, m.form) * G.tune.upkeepScale; if (season === 'winter' && G.get('monster', m.sp).elem !== 'winter') x *= 1 + G.tune.winterUpkeep; u += x; }
    return Math.round(u);
  }
  summonCost(sp) { return Math.round(G.get('monster', sp).cost * G.tune.summonCost); }
  summonLevel(realm) { const ks = this.knightsOf(realm); return Math.max(1, Math.floor((ks.length ? G.sum(ks, k => k.level) / ks.length : 2) / 2)); }
  /** the species a castle can summon this season */
  circle(cid) { const season = this.season; return G.get('castle', cid).circle.filter(e => !e.season || e.season === season).map(e => e.sp).concat(this.s.flags['hesper_circle'] && cid === 'lionsreach' ? ['minute', 'stillwraith'] : []); }
  questingCount(realm) { return this.knightsOf(realm).filter(k => k.quest).length; }
  /** knights at a castle who could fight (not wounded, not away) */
  defenders(cid) { return this.s.castles[cid].knights.filter(id => { const k = this.knight(id); return k && !k.wounded && !k.quest; }); }
  troopPower(kid) {
    const k = this.knight(kid), u = G.unitFromKnight(k), pw = x => (x.mhp + 4 * (x.atk + x.def + x.int) + 2 * x.agi) * (1 + .05 * (x.level - 1));
    let p = pw(u) * 1.2 * Math.max(.3, k.hp / k.stats.hp);
    for (const uid of k.troop) { const m = this.monster(uid), st = this.monsterStats(uid); p += pw(Object.assign({ level: m.level }, st, { mhp: st.hp })) * Math.max(.3, m.hp / st.hp); }
    return Math.round(p);
  }
  /** castles adjacent to a target that a realm owns */
  launchers(realm, target) { return G.get('castle', target).roads.filter(c => this.s.castles[c].owner === realm && !this.s.castles[c].stilled); }
  /** the targets a realm may march on: foreign castles next to one of its own (plus the Sanctum when open) */
  marchTargets(realm) {
    const s = this.s, out = [];
    for (const cid of Object.keys(s.castles)) {
      if (s.castles[cid].owner === realm) continue;
      if (this.launchers(realm, cid).length) out.push(cid);
    }
    if (s.sanctumOpen === realm && s.castles.meridian.owner === realm) out.push('sanctum');
    return out;
  }
  /** knights that can march on a target */
  marchers(realm, target) {
    const from = target === 'sanctum' ? ['meridian'].concat(G.get('castle', 'meridian').roads.filter(c => this.s.castles[c].owner === realm)) : this.launchers(realm, target);
    const out = [];
    for (const c of from) for (const kid of this.s.castles[c].knights) { const k = this.knight(kid); if (this.canAct(kid) && !k.marched && !this.s.marches.some(m => m.knights.includes(kid))) out.push(kid); }
    return out;
  }
  /** the nearest castle of a realm by roads from a castle (BFS through any castle) */
  nearestOwned(realm, from) {
    const s = this.s, seen = new Set([from]), q = [from];
    while (q.length) { const c = q.shift(); if (c !== from && s.castles[c].owner === realm) return c; for (const n of G.get('castle', c).roads.slice().sort()) if (!seen.has(n)) { seen.add(n); q.push(n); } }
    return null;
  }
  realmAlive(realm) { return this.castlesOf(realm).length > 0; }

  /* ---- commands ---- */
  /** why a command can't run now (null: it can) */
  illegal(c) {
    const s = this.s, r = c.realm;
    if (s.result) return 'The campaign is over';
    const muster = ['summon', 'bind', 'unbind', 'formation', 'dismiss', 'move', 'quest', 'equip', 'unequip', 'use', 'promote', 'classchange'];
    if (muster.includes(c.t)) {
      if (s.phase !== 'muster' && !c.ai) return 'Only during Muster';
      if (!s.realms[r] || !s.realms[r].alive) return 'No such realm';
    }
    switch (c.t) {
      case 'summon': {
        const st = s.castles[c.castle]; if (!st || st.owner !== r) return 'Not your castle';
        if (st.stilled) return 'The castle is Stilled';
        if (st.summons >= 3) return 'Three summons a season';
        if (!this.circle(c.castle).includes(c.sp)) return 'Not in this circle';
        const sp = G.get('monster', c.sp); if (sp.meridianOnly && c.castle !== 'meridian') return 'Meridian only';
        if (!s.flags.devFreeSummon && s.realms[r].mana < this.summonCost(c.sp)) return 'Not enough mana';
        return null;
      }
      case 'bind': {
        const m = this.monster(c.uid), k = this.knight(c.knight); if (!m || !k || k.realm !== r || m.realm !== r) return 'Not yours';
        if (!m.castle || m.castle !== k.castle) return 'Not at the same castle';
        if (k.quest) return 'Away questing';
        if (k.troop.length >= 6) return 'A troop holds six';
        if (this.bondFree(k.id) < G.get('monster', m.sp).rank) return 'Not enough Bond';
        return null;
      }
      case 'unbind': { const m = this.monster(c.uid); if (!m || m.realm !== r || !m.knight) return 'Not bound'; const k = this.knight(m.knight); if (k.quest) return 'Away questing'; if (!k.castle) return 'Not at a castle'; return null; }
      case 'formation': { const k = this.knight(c.knight); return !k || k.realm !== r ? 'Not yours' : ['vanguard', 'shield', 'column'].includes(c.form) ? null : 'No such formation'; }
      case 'dismiss': { const m = this.monster(c.uid); return !m || m.realm !== r || !m.castle ? 'Only reserve monsters' : null; }
      case 'move': {
        const k = this.knight(c.knight); if (!k || k.realm !== r) return 'Not yours';
        if (!this.canAct(k.id)) return k.wounded ? 'Wounded' : k.quest ? 'Away questing' : 'Stilled';
        if (k.moved) return 'Moved already this Muster';
        if (!G.adjacent(k.castle, c.to)) return 'Not adjacent';
        const t = s.castles[c.to]; if (t.owner !== r) return 'Not your castle'; if (t.stilled) return 'The castle is Stilled';
        if (t.knights.length >= 6) return 'Six knights at most';
        return null;
      }
      case 'quest': {
        const k = this.knight(c.knight); if (!k || k.realm !== r) return 'Not yours';
        if (k.ruler) return 'Rulers do not quest';
        if (!this.canAct(k.id)) return k.wounded ? 'Wounded' : 'Not now';
        if (k.moved) return 'Moved this Muster';
        if (this.s.marches.some(m => m.knights.includes(k.id))) return 'Marching';
        const lim = (s.aiFlags[r] && s.aiFlags[r].questers) || 2; if (this.questingCount(r) >= lim) return 'Two away at most';
        const site = G.get('site', c.site);
        if (site.story) { if (!s.flags['site_' + c.site]) return 'Not open yet'; if (!G.adjacent(k.castle, site.castle) && k.castle !== site.castle) return 'Too far'; return null; }
        if (G.get('castle', k.castle).site !== c.site) return 'Quest from the castle itself';
        return null;
      }
      case 'equip': {
        const k = this.knight(c.knight); if (!k || k.realm !== r) return 'Not yours';
        if (!(s.realms[r].items[c.item] > 0)) return 'Not in the inventory';
        if (!G.canEquip(c.item, k.cls)) return 'Cannot use that';
        return null;
      }
      case 'unequip': { const k = this.knight(c.knight); return !k || k.realm !== r || !k.items[c.slot] ? 'Nothing there' : null; }
      case 'use': {
        const it = G.has('item', c.item) && G.get('item', c.item); if (!it || it.slot !== 'consumable') return 'Not usable';
        if (!(s.realms[r].items[c.item] > 0)) return 'None left';
        if (it.use.mana) return null;
        const tgt = c.knight ? this.knight(c.knight) : this.monster(c.uid); if (!tgt || tgt.realm !== r) return 'Not yours';
        return null;
      }
      case 'promote': {
        const m = this.monster(c.uid); if (!m || m.realm !== r) return 'Not yours'; if (m.form >= 3) return 'Fully grown';
        const sp = G.get('monster', m.sp), need = m.form === 1 ? 12 : 22, seedLv = m.form === 1 ? 6 : 16;
        if (m.level >= need || s.flags.devUnlockClass) return null;
        if (sp.elem === 'hour') return 'Hour monsters promote by level (' + need + ')';
        const seed = G.SEASON_SEED[sp.elem]; if (c.seed && m.level >= seedLv && s.realms[r].items[seed] > 0) return null;
        return m.level >= seedLv ? 'Needs a ' + G.get('item', seed).name : 'Level ' + need + ' (or ' + seedLv + ' with a seed)';
      }
      case 'classchange': {
        const k = this.knight(c.knight); if (!k || k.realm !== r) return 'Not yours';
        const cl = G.get('class', k.cls); if (!cl.next) return 'No class change';
        const nx = G.get('class', cl.next);
        if (s.flags.devUnlockClass) return null;
        if (nx.tier === 2 && k.level < 10) return 'Level 10';
        if (nx.tier === 3) { if (k.level < 20) return 'Level 20 and a Writ'; if (!(s.realms[r].items.writ > 0)) return 'Needs a Writ of Knighthood'; }
        return null;
      }
      case 'declare': {
        if (s.phase !== 'march' && !c.ai) return 'Only during March';
        if (!this.marchTargets(r).includes(c.target)) return 'Not a target';
        if (s.marches.some(m => m.realm === r && m.target === c.target)) return 'One attack per target';
        if (!c.knights || !c.knights.length || c.knights.length > 3) return 'One to three knights';
        const ok = this.marchers(r, c.target); for (const kid of c.knights) if (!ok.includes(kid)) return 'Cannot march: ' + G.get('knight', kid).short;
        return null;
      }
      case 'undeclare': return s.marches.some(m => m.realm === r && m.target === c.target) ? null : 'No such march';
    }
    return null;
  }
  legal(c) { return !this.illegal(c); }
  apply(c) {
    const s = this.s, ev = [], bad = this.illegal(c);
    if (bad) return [{ e: 'illegal', why: bad, cmd: c }];
    const r = c.realm;
    switch (c.t) {
      case 'summon': {
        if (!s.flags.devFreeSummon) s.realms[r].mana -= this.summonCost(c.sp);
        s.castles[c.castle].summons++;
        const m = this._newMonster(c.sp, this.summonLevel(r), 1, r, { castle: c.castle });
        s.stats.summons++; ev.push({ e: 'summon', uid: m.uid, sp: c.sp, castle: c.castle, realm: r });
        if (c.bindTo && this.legal({ t: 'bind', realm: r, uid: m.uid, knight: c.bindTo, ai: c.ai })) ev.push(...this.apply({ t: 'bind', realm: r, uid: m.uid, knight: c.bindTo, ai: c.ai }));
        break;
      }
      case 'bind': {
        const m = this.monster(c.uid), k = this.knight(c.knight), st = s.castles[m.castle];
        st.reserve = st.reserve.filter(x => x !== m.uid); m.castle = null; m.knight = k.id; k.troop.push(m.uid);
        ev.push({ e: 'bind', uid: m.uid, knight: k.id });
        if ((m.sp === 'wyvern' || m.sp === 'frostwyrm') && this.isHuman(r)) this._queueStory('owain', r);
        break;
      }
      case 'unbind': {
        const m = this.monster(c.uid), k = this.knight(m.knight); k.troop = k.troop.filter(x => x !== m.uid); m.knight = null; m.castle = k.castle; s.castles[k.castle].reserve.push(m.uid);
        ev.push({ e: 'unbind', uid: m.uid, knight: k.id }); break;
      }
      case 'formation': this.knight(c.knight).formation = c.form; ev.push({ e: 'formation', knight: c.knight, form: c.form }); break;
      case 'dismiss': this._removeMonster(c.uid); ev.push({ e: 'dismiss', uid: c.uid }); break;
      case 'move': {
        const k = this.knight(c.knight), from = k.castle;
        s.castles[from].knights = s.castles[from].knights.filter(x => x !== k.id); s.castles[c.to].knights.push(k.id); k.castle = c.to; k.moved = true;
        ev.push({ e: 'move', knight: k.id, from, to: c.to }); break;
      }
      case 'quest': {
        const k = this.knight(c.knight), site = G.get('site', c.site), outcome = this._rollQuest(k, site);
        s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== k.id);
        k.quest = { site: c.site, from: k.castle, back: s.turn + site.away, outcome }; k.castle = null;
        ev.push({ e: 'quest', knight: k.id, site: c.site, away: site.away }); this.log(G.get('knight', k.id).short + ' rides for ' + site.name + '.'); break;
      }
      case 'equip': {
        const k = this.knight(c.knight), it = G.get('item', c.item), slot = it.slot, old = k.items[slot];
        if (old) s.realms[r].items[old] = (s.realms[r].items[old] || 0) + 1;
        s.realms[r].items[c.item]--; k.items[slot] = c.item; this._clampKnight(k);
        ev.push({ e: 'equip', knight: k.id, item: c.item, slot }); break;
      }
      case 'unequip': { const k = this.knight(c.knight), it = k.items[c.slot]; s.realms[r].items[it] = (s.realms[r].items[it] || 0) + 1; k.items[c.slot] = null; this._clampKnight(k); ev.push({ e: 'unequip', knight: k.id, slot: c.slot }); break; }
      case 'use': {
        const it = G.get('item', c.item); s.realms[r].items[c.item]--;
        if (it.use.mana) { s.realms[r].mana += it.use.mana; ev.push({ e: 'mana', realm: r, amt: it.use.mana }); break; }
        const tgt = c.knight ? this.knight(c.knight) : this.monster(c.uid), mhp = c.knight ? tgt.stats.hp : this.monsterStats(tgt.uid).hp, mmp = c.knight ? tgt.stats.mp : this.monsterStats(tgt.uid).mp;
        if (it.use.heal) tgt.hp = Math.min(mhp, tgt.hp + it.use.heal); if (it.use.mp) tgt.mp = Math.min(mmp, tgt.mp + it.use.mp);
        ev.push({ e: 'use', item: c.item, target: c.knight || c.uid }); break;
      }
      case 'promote': {
        const m = this.monster(c.uid), need = m.form === 1 ? 12 : 22, before = this.monsterStats(m.uid), ratio = m.hp / before.hp;
        if (m.level < need && !s.flags.devUnlockClass) s.realms[r].items[G.SEASON_SEED[G.get('monster', m.sp).elem]]--;
        m.form++; const after = this.monsterStats(m.uid); m.hp = Math.max(1, Math.round(after.hp * ratio)); m.mp = after.mp;
        ev.push({ e: 'promote', uid: m.uid, form: m.form, name: G.monsterName(m.sp, m.form) }); this.log('A ' + G.monsterName(m.sp, m.form - 1) + ' becomes a ' + G.monsterName(m.sp, m.form) + '.'); break;
      }
      case 'classchange': {
        const k = this.knight(c.knight), nx = G.get('class', G.get('class', k.cls).next);
        if (nx.tier === 3 && !s.flags.devUnlockClass) s.realms[r].items.writ--;
        k.cls = nx.id; for (const st of G.STATS) k.stats[st] = Math.round(k.stats[st] * 1.1); k.hp = k.stats.hp; k.mp = k.stats.mp;
        ev.push({ e: 'classchange', knight: k.id, cls: nx.id }); this.log(G.get('knight', k.id).short + ' becomes a ' + nx.name + '.'); break;
      }
      case 'endMuster': ev.push(...this._endMuster(r)); break;
      case 'declare': s.marches.push({ realm: r, target: c.target, knights: c.knights.slice(), from: Object.fromEntries(c.knights.map(k => [k, this.knight(k).castle])) }); ev.push({ e: 'declare', realm: r, target: c.target, knights: c.knights }); break;
      case 'undeclare': s.marches = s.marches.filter(m => !(m.realm === r && m.target === c.target)); ev.push({ e: 'undeclare', realm: r, target: c.target }); break;
      case 'endMarch': ev.push(...this._endMarch(r)); break;
      case 'event': ev.push(...this._applyEvent(c.id, c.choice || 0, c.realm)); break;
      case 'dev': ev.push(...this._dev(c)); break;
    }
    return ev;
  }
  _clampKnight(k) { const u = G.unitFromKnight(k); k.mp = Math.min(k.mp, u.mmp); }
  _removeMonster(uid) {
    const s = this.s, m = s.monsters[uid]; if (!m) return;
    if (m.castle) s.castles[m.castle].reserve = s.castles[m.castle].reserve.filter(x => x !== uid);
    if (m.knight && s.knights[m.knight]) s.knights[m.knight].troop = s.knights[m.knight].troop.filter(x => x !== uid);
    delete s.monsters[uid];
  }
  _addExp(rec, amt, isKnight) {
    rec.exp += amt; const out = [];
    while (rec.exp >= 100 && rec.level < 40) {
      rec.exp -= 100; rec.level++;
      if (isKnight) { const g = G.classGrowth(rec.cls); for (const k of G.STATS) { const v = Math.floor(g[k]) + (CR.next(this.s) < g[k] - Math.floor(g[k]) ? 1 : 0); rec.stats[k] += v; } }
      out.push(rec.level);
    }
    return out;
  }

  /* ---- quests ---- */
  _rollQuest(k, site) {
    const s = this.s, line = G.get('class', k.cls).line, w = Object.fromEntries(G.QUEST_OUTCOMES);
    if (line === 'cleric') w.treasure += 10; if (line === 'beast') w.beast += 15; if (line === 'ranger') w.wanderer += 10;
    if (k.level >= 10) w.mishap -= 5;
    w[site.focus] = (w[site.focus] || 0) + 10;
    if (site.mishap) w.mishap += site.mishap;
    const luck = (k.items.accessory === 'horseshoe' ? 1.15 : 1) * G.tune.questLuck;
    for (const g of G.QUEST_GOOD) w[g] *= luck;
    const regions = G.regionPools(G.get('castle', site.castle).region);
    const wand = regions.flatMap(rg => (s.wanderers[rg] || [])).filter(id => this._wandererFree(id));
    if (site.ettard && this._wandererFree('ettard') && !wand.includes('ettard')) wand.push('ettard');
    if (!wand.length) w.wanderer = 0;
    if (site.story) return { kind: 'story', story: site.story };
    const kind = CR.weighted(s, Object.entries(w).map(([kk, v]) => [v, kk]));
    const out = { kind };
    if (kind === 'treasure') { const items = regions.flatMap(rg => (G.POOLS[rg] || G.POOLS.hour).items).concat(site.addItems || []); out.item = CR.pick(s, items); }
    if (kind === 'beast') {
      const list = regions.flatMap(rg => (G.POOLS[rg] || G.POOLS.hour).beasts).concat(site.addBeasts || []);
      out.sp = CR.weighted(s, list.map(sp => [(site.beastMul && site.beastMul[sp]) || 1, sp]));
    }
    if (kind === 'wanderer') out.knight = CR.pick(s, wand);
    if (kind === 'mana') out.mana = CR.int(s, 40, 80);
    if (kind === 'mishap') out.lose = CR.chance(s, .3);
    out.variant = CR.int(s, 0, 2);
    return out;
  }
  _wandererFree(id) {
    const s = this.s, k = s.knights[id], d = G.get('knight', id);
    if (id === 'galeron' && s.turn < 2) return false;   // found from Autumn of Year 1
    return !k || k.free;
  }
  _questReturn(k, ev) {
    const s = this.s, q = k.quest, site = G.get('site', q.site), o = q.outcome, d = G.get('knight', k.id);
    let home = s.castles[q.from] && s.castles[q.from].owner === k.realm ? q.from : this.nearestOwned(k.realm, q.from) || this.capital(k.realm);
    k.quest = null;
    if (!home) { k.free = true; return; }
    k.castle = home; s.castles[home].knights.push(k.id);
    const card = { e: 'questReturn', knight: k.id, site: q.site, kind: o.kind, variant: o.variant || 0, realm: k.realm };
    switch (o.kind) {
      case 'treasure': s.realms[k.realm].items[o.item] = (s.realms[k.realm].items[o.item] || 0) + 1; card.thing = G.get('item', o.item).name; card.item = o.item; break;
      case 'beast': { const m = this._newMonster(o.sp, Math.max(1, k.level - 2), 1, k.realm, { knight: k.id, castle: home }); card.thing = G.monsterName(o.sp, 1); card.uid = m.uid; break; }
      case 'wanderer': {
        if (this._wandererFree(o.knight)) { this._joinFree(o.knight, k.realm, home); card.thing = G.get('knight', o.knight).short; card.joined = o.knight; if (this.isHuman(k.realm)) this._queueStory(o.knight, k.realm); }
        else { const mana = 40; s.realms[k.realm].mana += mana; card.kind = 'mana'; card.thing = mana + ' mana'; }
        break;
      }
      case 'mana': s.realms[k.realm].mana += o.mana; card.thing = o.mana + ' mana'; break;
      case 'training': { const lv = this._addExp(k, 60, true); for (const uid of k.troop) this._addExp(this.monster(uid), 40, false); card.thing = lv.length ? 'Level ' + k.level : 'experience'; break; }
      case 'mishap': {
        k.wounded = 2; if (o.lose && k.troop.length) { const weakest = k.troop.slice().sort((a, b) => this.monster(a).level - this.monster(b).level || (a < b ? -1 : 1))[0]; card.thing = G.monsterName(this.monster(weakest).sp, this.monster(weakest).form); this._removeMonster(weakest); card.lost = true; }
        break;
      }
      case 'story': card.story = o.story; if (this.isHuman(k.realm)) this._queueStory(o.story === 'lunete' ? 'lunete_joins' : 'blanchefleur_hire', k.realm); else if (o.story === 'lunete') this._joinFree('lunete', k.realm, home); break;
    }
    if (site.keeper) card.keeper = true;
    this.log(d.short + ' returns from ' + site.name + (card.thing ? ' with ' + card.thing : '') + '.');
    ev.push(card);
  }
  _joinFree(id, realm, castle) {
    const s = this.s, k = s.knights[id];
    if (k) { k.free = false; k.realm = realm; k.castle = castle; k.wounded = 0; k.quest = null; s.castles[castle].knights.push(id); for (const uid of k.troop) this.monster(uid).realm = realm; }
    else this._spawnKnight(id, realm, castle);
    for (const r in s.wanderers) s.wanderers[r] = s.wanderers[r].filter(x => x !== id);
  }

  /* ---- the season: Tidings ---- */
  /** run the Tidings: returns the cards to show ({ e: ... }) and the story events to play */
  beginSeason() {
    const s = this.s, ev = [], season = this.season;
    s.phase = 'tidings'; s.marches = []; s.queue = []; s.pending = null;
    ev.push({ e: 'season', season, year: this.year });
    s.longWinter = season === 'winter' && this.year === 1;
    // the Hour-Candle burns
    if (s.candle !== null && s.turn > 0 && !s.candleLitNow) { s.candle--; ev.push({ e: 'candle', left: s.candle }); if (s.candle === 1) this._queueStory('thirteenth_warning', 'world'); }
    s.candleLitNow = false;
    if (s.candle !== null && s.candle <= 0 && !s.result) { this._lose('candle', ev); return { cards: ev, events: this._takeStory(['ending_candle']) }; }
    // a rival's Sanctum battle
    if (s.rivalSanctum) ev.push(...this._rivalSanctum());
    if (s.result) return { cards: ev, events: this._takeStory([s.result.ending]) };
    // recovery
    for (const k of Object.values(s.knights)) { if (k.wounded) k.wounded--; if (k.castle) { k.hp = k.stats.hp; k.mp = G.unitFromKnight(k).mmp; } k.moved = false; k.marched = false; }
    for (const m of Object.values(s.monsters)) { if (m.castle || (m.knight && s.knights[m.knight] && s.knights[m.knight].castle)) { const st = this.monsterStats(m.uid); m.hp = st.hp; m.mp = st.mp; } }
    for (const c of Object.values(s.castles)) { c.summons = 0; c.stilled = false; }
    // Hoarfast's moods
    s.realms.hoarfast.aggression = 0.9 + CR.next(s) * .5;
    // Stillness: from Autumn of Year 3 the Gray Knight stills a castle bordering the Dominion
    s.stilled = null;
    if (s.turn >= 10 && s.castles.meridian.owner === 'dominion') {
      const hourC = this.castlesOf('dominion'), cand = Object.keys(s.castles).filter(c => c !== 'meridian' && s.castles[c].owner !== 'dominion' && G.get('castle', c).roads.some(n => hourC.includes(n))).sort();
      if (cand.length) { const c = CR.pick(s, cand); s.castles[c].stilled = true; s.stilled = c; ev.push({ e: 'stilled', castle: c }); if (!s.flags.stillnessSeen) { s.flags.stillnessSeen = true; this._queueStory('stillness', 'world'); } this.log(G.get('castle', c).name + ' is Stilled.'); }
    }
    // quests return
    for (const k of Object.values(s.knights).sort((a, b) => a.id < b.id ? -1 : 1)) if (k.quest && k.quest.back <= s.turn && !k.free) this._questReturn(k, ev);
    // income and upkeep
    for (const id of G.REALMS) {
      const rr = s.realms[id]; if (!rr.alive || id === 'brigands') continue;
      const inc = this.income(id), up = this.upkeep(id); rr.income = inc; rr.upkeep = up; rr.mana += inc - up;
      const lost = [];
      while (rr.mana < 0) {
        const mine = Object.values(s.monsters).filter(m => m.realm === id); if (!mine.length) { rr.mana = 0; break; }
        const worst = mine.sort((a, b) => { const pa = this.monsterStats(a.uid), pb = this.monsterStats(b.uid); return (pa.hp + pa.atk * 4) / G.monsterUpkeep(a.sp, a.form) - (pb.hp + pb.atk * 4) / G.monsterUpkeep(b.sp, b.form) || (a.uid < b.uid ? -1 : 1); })[0];
        rr.mana += Math.round(G.monsterUpkeep(worst.sp, worst.form) * G.tune.upkeepScale); lost.push(G.monsterName(worst.sp, worst.form)); this._removeMonster(worst.uid);
      }
      if (this.isHuman(id)) ev.push({ e: 'income', realm: id, income: inc, upkeep: up, mana: rr.mana, deserted: lost });
    }
    // brigands heal fully
    // story events this Tidings
    const events = this._collectStory('tidings');
    // the AI realms muster at once
    for (const id of G.REALMS) if (!this.isHuman(id) && s.realms[id].alive && id !== 'brigands') G.CampaignAI.muster(this, id);
    s.phase = 'muster'; s.cur = this._nextHumanIndex(-1);
    for (const id of s.humans) if (s.realms[id].alive) s.firstMuster = s.firstMuster || {};
    ev.push({ e: 'muster', realm: this.currentHuman() });
    return { cards: ev, events };
  }
  _nextHumanIndex(i) { const s = this.s; for (let j = i + 1; j < s.humans.length; j++) if (s.realms[s.humans[j]].alive) return j; return s.humans.length; }
  _endMuster(realm) {
    const s = this.s, ev = [];
    s.cur = this._nextHumanIndex(s.cur);
    if (s.cur < s.humans.length) { ev.push({ e: 'muster', realm: this.currentHuman() }); return ev; }
    s.phase = 'march'; s.cur = this._nextHumanIndex(-1); ev.push({ e: 'march', realm: this.currentHuman() });
    if (!s.flags.firstMarch) { s.flags.firstMarch = true; for (const h of s.humans) this._queueStory('free_companies', h); }
    return ev;
  }
  _endMarch(realm) {
    const s = this.s, ev = [];
    s.cur = this._nextHumanIndex(s.cur);
    if (s.cur < s.humans.length) { ev.push({ e: 'march', realm: this.currentHuman() }); return ev; }
    for (const id of G.REALMS) if (!this.isHuman(id) && s.realms[id].alive && id !== 'brigands') G.CampaignAI.march(this, id);
    // resolution order: the attacker's highest knight level, then power, then a seeded tie-break
    const keyed = s.marches.map(m => ({ m, lv: Math.max(...m.knights.map(k => this.knight(k).level)), pw: G.sum(m.knights, k => this.troopPower(k)), tie: CR.next(s) }));
    keyed.sort((a, b) => b.lv - a.lv || b.pw - a.pw || a.tie - b.tie);
    s.queue = keyed.map(x => x.m); s.phase = 'resolve';
    for (const m of s.marches) for (const k of m.knights) this.knight(k).marched = true;
    ev.push({ e: 'resolve', count: s.queue.length });
    return ev;
  }
  /** the next attack to resolve: { kind: 'battle' | 'open' | 'skip' | 'sanctum', march, ... } or null when the season is done */
  nextBattle() {
    const s = this.s;
    while (s.queue.length) {
      const m = s.queue.shift();
      const live = m.knights.filter(k => { const kk = this.knight(k); return kk && kk.realm === m.realm && !kk.free && (!kk.wounded || m.now) && !kk.quest && kk.castle; });
      if (!live.length) continue;
      if (m.target === 'sanctum') { if (s.castles.meridian.owner !== m.realm) continue; s.pending = { kind: 'sanctum', march: Object.assign({}, m, { knights: live }) }; return s.pending; }
      const t = s.castles[m.target];
      if (t.owner === m.realm) continue;
      const defs = this.defenders(m.target);
      if (!defs.length) { s.pending = { kind: 'open', march: Object.assign({}, m, { knights: live }), def: t.owner, castle: m.target }; return s.pending; }
      const chosen = defs.slice().sort((a, b) => this.troopPower(b) - this.troopPower(a) || (a < b ? -1 : 1)).slice(0, 3);
      const ruler = defs.find(k => this.knight(k).ruler); if (ruler && !chosen.includes(ruler)) chosen[chosen.length - 1] = ruler;
      s.pending = { kind: 'battle', march: Object.assign({}, m, { knights: live }), def: t.owner, castle: m.target, defenders: chosen, id: ++s.battles };
      return s.pending;
    }
    s.pending = null; return null;
  }
  /** take an undefended castle */
  takeOpen() {
    const s = this.s, p = s.pending, ev = []; if (!p || p.kind !== 'open') return ev;
    ev.push({ e: 'open', castle: p.castle, realm: p.march.realm, from: p.def });
    this._capture(p.castle, p.march.realm, p.march.knights, ev);
    s.pending = null; return ev;
  }
  /** the BattleSim spec for the pending battle */
  battleSpec(p = this.s.pending) {
    const s = this.s, att = p.march.realm, castle = p.kind === 'sanctum' ? 'meridian' : p.castle;
    const side = (realm, kids, role, heal) => {
      const human = this.isHuman(realm), boost = human ? G.tune.aiPlayerBoost : 0;
      const troops = kids.map(kid => {
        const k = this.knight(kid), kr = heal ? Object.assign({}, k, { hp: k.stats.hp, mp: undefined }) : k;
        return { knight: G.unitFromKnight(kr, { boost }), monsters: k.troop.map(uid => { const m = this.monster(uid); return G.unitFromMonster(heal ? Object.assign({}, m, { hp: undefined, mp: undefined }) : m, { boost }); }), formation: k.formation };
      });
      const items = {}; for (const [id, n] of Object.entries(s.realms[realm] ? s.realms[realm].items : {})) if (n > 0 && G.get('item', id).slot === 'consumable' && !G.get('item', id).muster) items[id] = n;
      return { realm, role, human, items, troops, expMul: human ? DIFF[s.difficulty].exp : 1, ai: human ? 'normal' : DIFF[s.difficulty].ai };
    };
    if (p.kind === 'sanctum') {
      const gk = this._grayKnightTroop();
      return { seed: s.seed * 31 + s.turn * 7 + 999, map: 'clockwork_sanctum', season: this.season, mode: 'sanctum', castle: 'meridian', sides: [side(att, p.march.knights, 'att', true), { realm: 'dominion', role: 'def', human: false, items: {}, troops: [gk], ai: DIFF[s.difficulty].ai }] };
    }
    const spec = { seed: s.seed * 31 + s.turn * 7 + p.id, map: G.get('castle', castle).map, season: this.season, castle, longWinter: !!s.longWinter, sides: [side(att, p.march.knights, 'att'), side(p.def, p.defenders, 'def')] };
    return spec;
  }
  _grayKnightTroop() {
    const d = G.get('knight', 'graynight'), c = G.get('class', 'graynight');
    const k = { id: 'graynight', cls: 'graynight', level: 25, stats: Object.assign({}, c.base), elem: 'hour', items: {}, ruler: true, realm: 'dominion' };
    return { knight: G.unitFromKnight(k), monsters: d.troop.map(([sp, lv, f], i) => G.unitFromMonster({ uid: 'gk' + i, sp, form: f, level: lv, realm: 'dominion' })), formation: 'shield' };
  }
  /** the battle's end: apply its result (BattleSim.result()) to the campaign. Returns events (aftermath cards) */
  applyBattle(res) {
    const s = this.s, p = s.pending, ev = []; if (!p) return ev;
    const att = p.march.realm, attWon = res.winner === 0;
    // units: levels, stats, HP, deaths, wounds, captures
    const byRef = {}; for (const u of res.units) byRef[u.ref] = u;
    for (const u of res.units) {
      if (u.kind === 'knight') {
        const k = this.knight(u.ref); if (!k) continue;
        k.level = u.level; k.exp = u.exp; if (u.stats) k.stats = Object.assign({}, u.stats); k.hp = Math.max(0, Math.min(k.stats.hp, Math.round(u.hp))); k.mp = u.mp;
        if (u.wounded) { k.wounded = 2; k.hp = 0; }
      } else {
        const m = this.monster(u.ref); if (!m) continue;
        m.level = u.level; m.exp = u.exp; m.hp = Math.max(0, u.hp); m.mp = u.mp;
        if (u.dead) { ev.push({ e: 'dead', uid: m.uid, name: G.monsterName(m.sp, m.form), realm: m.realm }); this._removeMonster(m.uid); }
      }
    }
    // consumables used, per side
    const sides = [att, p.kind === 'sanctum' ? 'dominion' : p.def];
    for (const [si, used] of Object.entries(res.itemsUsed || {})) { const r = sides[si]; if (!s.realms[r]) continue; for (const [it, n] of Object.entries(used)) s.realms[r].items[it] = Math.max(0, (s.realms[r].items[it] || 0) - n); }
    // captures
    const caps = [];
    for (const c of res.captures) {
      const m = this.monster(c.ref), captor = this.knight(c.byRef); if (!m || !captor) continue;
      if (m.knight && s.knights[m.knight]) s.knights[m.knight].troop = s.knights[m.knight].troop.filter(x => x !== m.uid);
      m.knight = null; m.realm = captor.realm; caps.push({ uid: m.uid, realm: captor.realm, side: c.side, captor: captor.id });
      s.stats.captures++;
      ev.push({ e: 'captured', uid: m.uid, name: G.monsterName(m.sp, m.form), by: captor.id, realm: captor.realm });
    }
    if (p.kind === 'sanctum') {
      for (const cc of caps) { const m = this.monster(cc.uid); if (m) this._removeMonster(m.uid); }
      if (attWon) { this._win(att, ev); }
      else {
        ev.push({ e: 'sanctumLost', realm: att });
        for (const kid of p.march.knights) this._sendHome(this.knight(kid), 'meridian');
        if (this.isHuman(att)) this._queueStory('sanctum_retry', att);
      }
      s.pending = null; return ev;
    }
    const castle = p.castle;
    if (attWon) {
      ev.push({ e: 'taken', castle, realm: att, from: p.def });
      this._capture(castle, att, p.march.knights, ev);
      if (this.isHuman(att)) s.stats.battlesWon++;
      if (this.isHuman(p.def)) s.stats.battlesLost++;
    } else {
      ev.push({ e: 'held', castle, realm: p.def, by: att });
      for (const kid of p.march.knights) { const k = this.knight(kid); if (k && !k.free) this._sendHome(k, p.march.from[kid]); }
      if (this.isHuman(att)) s.stats.battlesLost++;
      if (this.isHuman(p.def)) s.stats.battlesWon++;
    }
    // a captured monster joins the winner's reserve at the contested castle if its captor's side won, else the reserve
    // of the captor's home castle
    for (const cc of caps) this._placeCaptured(cc, cc.side === res.winner ? castle : null);
    // story after battles
    const won = attWon ? att : p.def, lost = attWon ? p.def : att;
    for (const r of [won, lost]) if (this.isHuman(r) && !s.flags['firstBattle_' + r]) { s.flags['firstBattle_' + r] = true; this._queueStory(r === won ? 'first_victory' : 'first_loss', r); }
    if (attWon && att === 'verdance' && s.flags.v_letter && castle === 'goldspur') this._queueStory('v_elidure_joins', 'verdance');
    if (won === 'verdance' && s.flags.v_letter && res.units.some(u => u.ref === 'elidure' && (u.wounded || u.out))) this._queueStory('v_elidure_joins', 'verdance');
    s.pending = null;
    return ev;
  }
  _placeCaptured(cc, castle) {
    const s = this.s, m = this.monster(cc.uid); if (!m) return;
    const captor = this.knight(cc.captor);
    const c = castle && s.castles[castle].owner === cc.realm ? castle : (captor && captor.castle) || this.capital(cc.realm);
    if (!c) { this._removeMonster(m.uid); return; }
    m.castle = c; s.castles[c].reserve.push(m.uid);
  }
  _sendHome(k, from) {
    const s = this.s; if (!k || k.free) return;
    const home = from && s.castles[from] && s.castles[from].owner === k.realm ? from : this.nearestOwned(k.realm, from || k.castle);
    if (!home) return;
    if (k.castle && s.castles[k.castle]) s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== k.id);
    k.castle = home; if (!s.castles[home].knights.includes(k.id)) s.castles[home].knights.push(k.id);
  }
  /** a castle changes hands: defenders fall back, attackers occupy, reserve and treasury change owner */
  _capture(cid, realm, attackers, ev) {
    const s = this.s, st = s.castles[cid], old = st.owner;
    st.owner = realm;
    for (const kid of st.knights.slice()) { const k = this.knight(kid); st.knights = st.knights.filter(x => x !== kid); k.castle = null; const to = this.nearestOwned(old, cid); if (to) { k.castle = to; s.castles[to].knights.push(kid); ev.push({ e: 'fallback', knight: kid, to }); } else { k.castle = null; this._freeKnight(k); } }
    for (const kid of attackers) { const k = this.knight(kid); if (!k || k.free || k.realm !== realm) continue; if (k.castle && s.castles[k.castle]) s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== kid); k.castle = cid; st.knights.push(kid); }
    for (const uid of st.reserve) this.monster(uid).realm = realm;
    if (!st.treasuryTaken) { st.treasuryTaken = true; const it = G.get('castle', cid).treasury; if (it) { s.realms[realm].items[it] = (s.realms[realm].items[it] || 0) + 1; ev.push({ e: 'treasury', castle: cid, item: it, realm }); } }
    this.log(G.get('realm', realm).short + ' takes ' + G.get('castle', cid).name + '.');
    if (old === 'brigands' && this.isHuman(realm)) { const cap = { thawgate: 'hob', beltane: 'gerrow', lammas: 'dafydd', hallowmere: 'abbot' }[cid]; if (cap) this._queueStory('brigands_no_more_' + cap, realm); }
    if (old === 'dominion' && G.get('castle', cid).tier === 'satellite' && this.isHuman(realm)) { if (realm === 'verdance') this._queueStory('v_green_oath', realm); if (realm === 'hoarfast') this._queueStory('w_lucid_hour', realm); }
    if (cid === 'meridian') {
      if (this.isHuman(realm)) { s.sanctumOpen = realm; this._queueStory('meridian_falls', realm); }
      else { s.rivalSanctum = realm; this._queueStory('rival_meridian', 'world'); }
    }
    // a realm with no castles is out
    if (old && old !== 'brigands' && !this.realmAlive(old)) this._eliminate(old, ev);
  }
  _freeKnight(k) {
    const s = this.s;
    if (k.ruler) { k.free = true; k.castle = null; k.exiled = true; return; }
    k.free = true; k.castle = null; k.quest = null; k.realm = null;
    for (const uid of k.troop.slice()) this._removeMonster(uid);
    const d = G.get('knight', k.id); const region = d.elem && G.SEASONS.includes(d.elem) ? d.elem : null;
    if (region && !['graynight'].includes(k.id) && d.realm !== 'dominion') { (s.wanderers[region] = s.wanderers[region] || []); if (!s.wanderers[region].includes(k.id)) s.wanderers[region].push(k.id); }
  }
  _eliminate(realm, ev) {
    const s = this.s; if (!s.realms[realm].alive) return;
    s.realms[realm].alive = false;
    for (const k of this.knightsOf(realm).slice()) this._freeKnight(k);
    for (const m of Object.values(s.monsters)) if (m.realm === realm) this._removeMonster(m.uid);
    ev.push({ e: 'eliminated', realm }); this.log(G.get('realm', realm).name + ' has fallen.');
    if (G.PLAYABLE.includes(realm)) this._queueStory('realm_falls_' + realm, 'world');
    if (this.isHuman(realm) && !s.humans.some(h => s.realms[h].alive)) this._lose('fallen', ev, realm);
  }
  _rivalSanctum() {
    const s = this.s, realm = s.rivalSanctum, ev = []; s.rivalSanctum = null;
    if (s.castles.meridian.owner !== realm) return ev;
    const kids = this.defenders('meridian').slice(0, 3); if (!kids.length) return ev;
    s.pending = { kind: 'sanctum', march: { realm, target: 'sanctum', knights: kids, from: {} } };
    const sim = G.BattleSim.create(this.battleSpec()); G.BattleAI.resolve(sim);
    const res = sim.result();
    if (res.winner === 0) {
      s.pending = null; ev.push({ e: 'rivalWheel', realm });
      this._lose('wheel', ev, realm);
    } else {
      this.applyBattle(res);
      ev.push({ e: 'rivalFailed', realm }); this._queueStory('rival_failed', 'world');
      // Meridian returns to the Dominion with a fresh garrison
      const st = s.castles.meridian;
      for (const kid of st.knights.slice()) { const k = this.knight(kid); st.knights = st.knights.filter(x => x !== kid); const to = this.nearestOwned(realm, 'meridian'); if (to) { k.castle = to; s.castles[to].knights.push(kid); } else this._freeKnight(k); }
      st.owner = 'dominion'; s.realms.dominion.alive = true;
      for (const id of ['meliant', 'bertilak']) { const k = s.knights[id]; if (k && !k.free) continue; if (k) delete s.knights[id]; const kk = this._spawnKnight(id, 'dominion', 'meridian', { level: 14 }); for (const uid of kk.troop) { const m = this.monster(uid); m.level = Math.max(m.level, 14); } }
    }
    return ev;
  }
  _win(realm, ev) {
    const s = this.s; s.result = { kind: 'win', realm, ending: 'ending_' + realm, turn: s.turn };
    ev.push({ e: 'victory', realm }); this.log('The thirteenth bell never rang.');
  }
  _lose(why, ev, realm) {
    const s = this.s; if (s.result) return;
    const ending = why === 'candle' ? 'ending_candle' : why === 'wheel' ? 'ending_wheel_' + realm : 'ending_fallen';
    s.result = { kind: 'lose', reason: why, realm: realm || null, ending, turn: s.turn };
    ev.push({ e: 'defeat', why, realm });
  }
  /** the season's battles are done: next Tidings */
  endSeason() {
    const s = this.s; s.turn++; s.phase = 'tidings'; s.marches = []; s.queue = []; s.pending = null;
    return [{ e: 'seasonEnd' }];
  }

  /* ---- story events: conditions, queueing, effects ---- */
  /** a context for event conditions */
  ctx(realm) {
    const sim = this, s = this.s;
    return {
      sim, s, realm, season: this.season, year: this.year, turn: s.turn,
      human: r => sim.isHuman(r), owns: (c, r = realm) => s.castles[c].owner === r, holds: (k, r = realm) => !!s.knights[k] && s.knights[k].realm === r && !s.knights[k].free,
      flag: f => !!s.flags[f], alive: r => s.realms[r].alive, seen: id => !!s.seen[id]
    };
  }
  _queueStory(id, realm) { const s = this.s; if (!G.has('event', id)) return; if (G.get('event', id).once !== false && s.seen[id + '@' + realm]) return; if (!s.deferred.some(d => d.id === id && d.realm === realm)) s.deferred.push({ id, realm, turn: s.turn }); }
  /** collect eligible events for a moment: up to 3 a Tidings, by priority; the rest roll over */
  _collectStory(when) {
    const s = this.s, out = [];
    const cands = [];
    for (const d of s.deferred) cands.push(d);
    for (const ev of G.all('event')) {
      if (ev.when !== when) continue;
      const realms = ev.realm === 'player' ? s.humans.filter(h => s.realms[h].alive) : ev.realm === 'world' ? ['world'] : [ev.realm];
      for (const r of realms) {
        if (ev.realm !== 'world' && ev.realm !== 'player' && !this.isHuman(r)) continue;
        if (r !== 'world' && !s.realms[r].alive) continue;
        if (ev.once !== false && s.seen[ev.id + '@' + r]) continue;
        if (ev.expires !== undefined && s.turn > ev.expires) continue;
        let ok = false; try { ok = !ev.if || ev.if(this.ctx(r === 'world' ? s.humans[0] : r)); } catch (e) { ok = false; }
        if (ok && !cands.some(c => c.id === ev.id && c.realm === r)) cands.push({ id: ev.id, realm: r });
      }
    }
    cands.sort((a, b) => (G.get('event', b.id).priority || 10) - (G.get('event', a.id).priority || 10) || (a.id < b.id ? -1 : 1));
    for (const c of cands) {
      if (out.length >= 3 && !G.get('event', c.id).urgent) continue;
      out.push(c);
    }
    s.deferred = cands.filter(c => !out.includes(c));
    for (const c of out) s.seen[c.id + '@' + c.realm] = s.turn;
    return out;
  }
  /** take pending (deferred) events right now, outside a Tidings (after a battle, a capture, a quest's return) */
  takeStory() {
    const s = this.s, out = s.deferred.filter(d => !s.seen[d.id + '@' + d.realm] || G.get('event', d.id).once === false);
    s.deferred = [];
    for (const c of out) s.seen[c.id + '@' + c.realm] = s.turn;
    return out;
  }
  _takeStory(ids) { const out = ids.filter(id => G.has('event', id)).map(id => ({ id, realm: this.s.humans[0] })); for (const c of out) this.s.seen[c.id + '@' + c.realm] = this.s.turn; return out; }
  /** apply an event's effects (and its choice's) */
  _applyEvent(id, choice, realm) {
    const s = this.s, ev = G.get('event', id), out = [];
    const r = realm && realm !== 'world' ? realm : s.humans[0];
    const effs = [].concat(ev.effects || [], ev.choices && ev.choices[choice] ? ev.choices[choice].effects || [] : []);
    for (const eff of effs) out.push(...this._effect(eff, r, id));
    s.eventLog.push({ id, choice, realm: r, turn: s.turn });
    out.push({ e: 'eventDone', id, choice });
    return out;
  }
  _effect(eff, realm, src) {
    const s = this.s, out = [], cap = this.capital(realm);
    const target = (c) => (c === 'capital' || !c ? cap : c);
    if (eff.addKnight) { const id = eff.addKnight, c = target(eff.at); if (c && (!s.knights[id] || s.knights[id].free)) { this._joinFree(id, realm, c); out.push({ e: 'joined', knight: id, realm }); this.log(G.get('knight', id).short + ' joins ' + G.get('realm', realm).short + '.'); } }
    if (eff.moveKnight) { const [id, r2, c] = eff.moveKnight, k = s.knights[id]; if (k && !k.free) { if (k.castle) s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== id); k.realm = r2; const to = c && s.castles[c] && s.castles[c].owner === r2 ? c : this.capital(r2); k.castle = to; k.quest = null; if (to) s.castles[to].knights.push(id); for (const uid of k.troop) this.monster(uid).realm = r2; out.push({ e: 'defect', knight: id, realm: r2 }); } }
    if (eff.addMonster) { const [sp, lv, where] = eff.addMonster; const c = target(where); if (c) { const m = this._newMonster(sp, lv, 1, realm, { castle: c }); out.push({ e: 'gift', uid: m.uid, sp }); } }
    if (eff.addItem) { s.realms[realm].items[eff.addItem] = (s.realms[realm].items[eff.addItem] || 0) + 1; out.push({ e: 'gotItem', item: eff.addItem }); }
    if (eff.mana) { s.realms[realm].mana += eff.mana; out.push({ e: 'mana', realm, amt: eff.mana }); }
    if (eff.flag) s.flags[eff.flag] = eff.value === undefined ? true : eff.value;
    if (eff.aiFlag) { const [r2, key, val] = eff.aiFlag; (s.aiFlags[r2] = s.aiFlags[r2] || {})[key] = val; }
    if (eff.aiPeace) { const [r2, foe, n] = eff.aiPeace; (s.aiFlags[r2] = s.aiFlags[r2] || {})['peace_' + foe] = s.turn + n; }
    if (eff.unlockSite) s.flags['site_' + eff.unlockSite] = true;
    if (eff.levelUp) { const [id, n] = eff.levelUp, k = s.knights[id]; if (k && !k.free) for (let i = 0; i < n; i++) this._addExp(k, 100 - k.exp, true); }
    if (eff.learn) { const [id, sk] = eff.learn, k = s.knights[id]; if (k && !k.learned.includes(sk)) k.learned.push(sk); }
    if (eff.bond) { const [id, n] = eff.bond, k = s.knights[id]; if (k) k.bondBonus += n; }
    if (eff.giveItemTo) { const [id, it] = eff.giveItemTo, k = s.knights[id]; if (k && !k.free) { const slot = G.get('item', it).slot, old = k.items[slot]; if (old) s.realms[k.realm].items[old] = (s.realms[k.realm].items[old] || 0) + 1; k.items[slot] = it; } }
    if (eff.candle) { s.candle = DIFF[s.difficulty].candle + (G.tune.candleSeasons - G.TUNE_DEFAULTS.candleSeasons); s.candleLitNow = true; out.push({ e: 'candleLit', left: s.candle }); }
    if (eff.dominion) s.flags.dominionAwake = true;
    if (eff.startSanctum) {
      // the Clockwork Sanctum opens at once: the troops in Meridian (healed by the Wheel's light), plus one from a castle beside it
      const inCity = s.castles.meridian.knights.filter(k => !this.knight(k).quest).slice(0, 3);
      const extra = G.get('castle', 'meridian').roads.flatMap(c => s.castles[c].owner === realm ? s.castles[c].knights : []).filter(k => this.canAct(k) && !inCity.includes(k));
      const ks = inCity.concat(extra.slice(0, Math.max(0, Math.min(1, 3 - inCity.length))));
      for (const k of ks) { const kk = this.knight(k); kk.wounded = 0; kk.hp = kk.stats.hp; }
      if (ks.length) s.queue.unshift({ realm, target: 'sanctum', knights: ks, from: Object.fromEntries(ks.map(k => [k, this.knight(k).castle])), now: true });
      out.push({ e: 'sanctumOpens' });
    }
    if (eff.joinFromQuest) { const id = eff.joinFromQuest; const c = target(eff.at); this._joinFree(id, realm, c); out.push({ e: 'joined', knight: id, realm }); }
    if (eff.pay) { if (s.realms[realm].mana >= eff.pay) { s.realms[realm].mana -= eff.pay; } else out.push({ e: 'cannotPay' }); }
    if (eff.captainJoins) {
      const id = eff.captainJoins, k = s.knights[id];
      if (k) { const c = this.capital(realm); if (k.castle) s.castles[k.castle].knights = s.castles[k.castle].knights.filter(x => x !== id); k.realm = realm; k.free = false; k.wounded = 0; k.hp = k.stats.hp; k.castle = target(eff.at) || c; s.castles[k.castle].knights.push(id); for (const uid of k.troop) this.monster(uid).realm = realm; out.push({ e: 'joined', knight: id, realm }); }
    }
    if (eff.exileCaptain) { const k = s.knights[eff.exileCaptain]; if (k) this._freeKnight(k); }
    if (eff.hesperDefects) {
      const k = s.knights.hesper;
      if (k && !k.free && k.realm === realm) { const sats = this.castlesOf('dominion').filter(c => c !== 'meridian'); const to = sats.length ? sats[0] : 'meridian'; this._effect({ moveKnight: ['hesper', 'dominion', s.castles[to].owner === 'dominion' ? to : null] }, realm, src).forEach(x => out.push(x)); }
    }
    return out;
  }

  /* ---- dev tools (dev mode marks the campaign DEV) ---- */
  _dev(c) {
    const s = this.s, ev = [], r = c.realm || s.humans[0]; s.dev = true;
    switch (c.op) {
      case 'mana': s.realms[r].mana += c.amt || 1000; break;
      case 'item': s.realms[r].items[c.item] = (s.realms[r].items[c.item] || 0) + 1; break;
      case 'knight': { const id = c.knight; if (!s.knights[id] || s.knights[id].free) this._joinFree(id, r, c.castle || this.capital(r)); break; }
      case 'spawn': this._newMonster(c.sp, c.level || this.summonLevel(r), c.form || 1, r, { castle: c.castle || this.capital(r), knight: c.knight }); break;
      case 'level': { const k = s.knights[c.knight]; if (k) for (let i = 0; i < (c.n || 1); i++) this._addExp(k, 100 - k.exp, true); const m = s.monsters[c.uid]; if (m) for (let i = 0; i < (c.n || 1); i++) this._addExp(m, 100 - m.exp, false); break; }
      case 'heal': for (const k of Object.values(s.knights)) if (k.realm === r) { k.hp = k.stats.hp; k.wounded = 0; } for (const m of Object.values(s.monsters)) if (m.realm === r) m.hp = this.monsterStats(m.uid).hp; break;
      case 'owner': { const old = s.castles[c.castle].owner; s.castles[c.castle].owner = c.owner; for (const kid of s.castles[c.castle].knights.slice()) this._sendHome(this.knight(kid), null); if (old && old !== 'brigands' && !this.realmAlive(old)) this._eliminate(old, ev); break; }
      case 'candle': s.candle = c.value; break;
      case 'jump': s.turn = c.turn; break;
      case 'flag': s.flags[c.flag] = c.value === undefined ? true : c.value; break;
      case 'freeSummon': s.flags.devFreeSummon = !s.flags.devFreeSummon; break;
      case 'unlockClass': s.flags.devUnlockClass = !s.flags.devUnlockClass; break;
      case 'ending': s.result = { kind: c.ending.startsWith('ending_wheel') || c.ending === 'ending_candle' || c.ending === 'ending_fallen' ? 'lose' : 'win', ending: c.ending, realm: r, dev: true }; break;
      case 'trigger': this._queueStory(c.id, c.realm || r); break;
    }
    ev.push({ e: 'dev', op: c.op });
    return ev;
  }
}
G.CampaignSim = CampaignSim;
