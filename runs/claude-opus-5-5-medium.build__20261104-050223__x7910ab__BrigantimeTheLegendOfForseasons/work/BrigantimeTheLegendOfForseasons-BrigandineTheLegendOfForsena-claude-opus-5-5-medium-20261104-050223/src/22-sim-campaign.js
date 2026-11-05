/* ---- CAMPAIGNSIM (§4): the war of the seasons as plain JSON state. Commands in, reports out; seeded G.Rng only ---- */
const CR = G.Rng;
G.DIFF = { easy: { aiMana: .8, threshold: 1.35, candle: 18, battleAI: 'easy', exp: 1.25 }, normal: { aiMana: 1, threshold: 1.1, candle: 15, battleAI: 'normal', exp: 1 }, hard: { aiMana: 1.25, threshold: .95, candle: 12, battleAI: 'hard', exp: 1 } };
G.unitPower = (st, lvl, knight) => (st.hp + 4 * (st.atk + st.def + st.int) + 2 * st.agi) * (1 + .05 * (lvl - 1)) * (knight ? 1.2 : 1);
G.makeKnightRec = (id, lvlOverride) => {   // a knight's starting record: tier-1 line growth, then ×1.10 and the tier's growth at each class change
  const d = G.get('knight', id), c = G.get('class', d.cls), lvl = lvlOverride || d.lvl, st = {};
  G.STATS.forEach((s, i) => {
    const b = c.base[i], g = c.growth[i];
    if ((c.tier || 1) === 1) st[s] = b + g * (lvl - 1);
    else if (c.tier === 2) st[s] = (b + g * 9) * 1.1 + g * 1.15 * (lvl - 10);
    else st[s] = ((b + g * 9) * 1.1 + g * 1.15 * 10) * 1.1 + g * 1.3 * (lvl - 20);
    st[s] = Math.round(st[s]);
  });
  return { id, realm: d.realm, castle: d.castle, cls: d.cls, lvl, exp: 0, elem: d.elem, stats: st, hp: st.hp, mp: st.mp, equip: {}, troop: [], formation: 'vanguard', wounded: 0, quest: null, moved: false, marched: false, ruler: !!d.ruler, bondBonus: 0, extraSkills: [] };
};
class CampaignSim {
  constructor(state) { this.state = state; }
  static create(o = {}) {
    const diff = o.difficulty || 'normal', S = { v: 1, seed: o.seed || 1, rng: CR.make(o.seed || 1), si: 0, year: 1, phase: 'tidings', difficulty: diff, humans: (o.humans || []).slice(), turn: 0,
      candle: null, candleMax: Math.round(G.tune.candleSeasons * (G.DIFF[diff].candle / 12)), realms: {}, castles: {}, knights: {}, monsters: {}, nextUid: 1, marches: [], queue: [], flags: {}, seen: {}, chronicle: [], stilled: null, over: null, done: {}, lastBattles: [], season0: true };
    const sim = new CampaignSim(S);
    for (const r of G.all('realm')) S.realms[r.id] = { mana: r.id === 'dominion' ? 300 : r.id === 'brigands' ? 0 : 120, items: (G.START_ITEMS[r.id] || []).slice(), alive: true, human: S.humans.includes(r.id), seat: S.humans.indexOf(r.id), aggression: r.aggression || 1, ai: {}, firstBattle: false };
    for (const c of G.all('castle')) S.castles[c.id] = { owner: c.owner, knights: [], reserve: [], stilled: false, treasuryTaken: false, summons: 0, extra: [] };
    for (const k of G.all('knight')) {
      if (!k.realm || !k.castle || k.id === 'graynight' || k.id === 'sergeant') continue;
      const rec = G.makeKnightRec(k.id); S.knights[k.id] = rec; S.castles[k.castle].knights.push(k.id);
      for (const [sp, lvl, tier] of k.troop) rec.troop.push(sim.newMonster(sp, lvl, tier || 1, k.realm));
    }
    for (const cid in G.START_RESERVE) for (const [sp, lvl] of G.START_RESERVE[cid]) S.castles[cid].reserve.push(sim.newMonster(sp, lvl, 1, S.castles[cid].owner));
    sim.chron('The Brigantime begins.');
    return sim;
  }
  static load(json) { return new CampaignSim(typeof json === 'string' ? JSON.parse(json) : G.clone(json)); }
  serialize() { return G.clone(this.state); }
  hash() { return G.hashStr(JSON.stringify(this.state)); }
  /* ---- helpers ---- */
  season() { return G.SEASONS[this.state.si]; }
  nextSeason() { return G.SEASONS[(this.state.si + 1) % 4]; }
  owner(c) { return this.state.castles[c].owner; }
  chron(text) { this.state.chronicle.push({ season: this.season(), year: this.state.year, text }); if (this.state.chronicle.length > 200) this.state.chronicle.shift(); }
  newMonster(sp, lvl, tier, realm) { const S = this.state, uid = 'm' + (S.nextUid++), st = G.monsterStats(sp, tier, lvl); S.monsters[uid] = { uid, sp, tier, lvl, exp: 0, hp: st.hp, mp: st.mp, realm }; return uid; }
  mon(uid) { return this.state.monsters[uid]; }
  kn(id) { return this.state.knights[id]; }
  castlesOf(r) { return Object.keys(this.state.castles).filter(c => this.state.castles[c].owner === r); }
  knightsOf(r) { return Object.values(this.state.knights).filter(k => k.realm === r); }
  knightAlive(id, r) { const k = this.kn(id); return !!k && k.realm === r; }
  realmMonsters(r) { const S = this.state, out = []; for (const k of this.knightsOf(r)) for (const u of k.troop) out.push(S.monsters[u]); for (const c of this.castlesOf(r)) for (const u of S.castles[c].reserve) out.push(S.monsters[u]); return out.filter(Boolean); }
  capital(r) { const cap = G.get('realm', r).capital; return cap && this.owner(cap) === r ? cap : this.castlesOf(r)[0]; }
  regionOn(c) { return (G.REGION_SEASONS[G.get('castle', c).region] || []).includes(this.season()); }
  income(r) {
    const S = this.state, diff = G.DIFF[S.difficulty]; let inc = 0;
    for (const c of this.castlesOf(r)) { if (S.castles[c].stilled) continue; let y = G.get('castle', c).mana * G.tune.manaIncome; if (this.regionOn(c)) y *= 1 + G.tune.seasonYield; inc += y; }
    if (!S.realms[r].human && r !== 'brigands') inc *= diff.aiMana * (1 + G.tune.aiManaBonus) * (r === 'dominion' ? .75 : 1);
    return Math.round(inc);
  }
  upkeep(r) { let u = 0; for (const m of this.realmMonsters(r)) { let x = G.upkeepOf(m.sp, m.tier) * G.tune.upkeepScale; if (this.season() === 'winter' && G.get('monster', m.sp).elem !== 'winter') x *= 1 + G.tune.winterUpkeep; u += x; } return Math.round(u); }
  knightStats(id) { const k = this.kn(id); return G.knightView(k); }
  bondUsed(id) { return this.kn(id).troop.reduce((a, u) => a + G.get('monster', this.mon(u).sp).rank, 0); }
  bondMax(id) { return this.knightStats(id).mods.bond; }
  troopPower(id) { const k = this.kn(id), kv = G.knightView(k); let p = G.unitPower(Object.assign({}, kv.st, { hp: k.hp }), k.lvl, true); for (const u of k.troop) { const m = this.mon(u), st = G.monsterStats(m.sp, m.tier, m.lvl); p += G.unitPower(Object.assign({}, st, { hp: m.hp }), m.lvl, false); } return p * (this.state.realms[k.realm] && this.state.realms[k.realm].human ? 1 + G.tune.aiPlayerBoost : 1); }
  canAct(id) { const k = this.kn(id); return k && !k.wounded && !k.quest && !this.state.castles[k.castle].stilled; }
  adjacentFoes(c, r) { return (G.adj[c] || []).filter(n => this.owner(n) !== r); }
  /* ---- the season's start: Tidings (§4.3) ---- */
  beginSeason() {
    const S = this.state, rep = [];
    S.phase = 'tidings'; S.done = {}; S.marches = []; S.queue = []; S.lastBattles = [];
    rep.push({ kind: 'season', season: this.season(), year: S.year });
    if (S.candle !== null && !S.season0) { S.candle = Math.max(0, S.candle - 1); rep.push({ kind: 'candle', n: S.candle }); }
    const firstSeason = S.season0; S.season0 = false;
    if (S.candle === 0 && !S.flags.grayKnightDown) { this.end({ kind: 'candle' }); rep.push({ kind: 'over' }); return rep; }
    // recovery
    for (const k of Object.values(S.knights)) {
      if (k.wounded > 0) k.wounded--; k.moved = false; k.marched = false;
      if (k.castle && !k.quest && !firstSeason && G.tune.drillExp > 0 && !k.wounded && S.realms[k.realm] && S.realms[k.realm].human) { this.giveExp(k, G.tune.drillExp); for (const u of k.troop) this.giveMonExp(this.mon(u), G.tune.drillExp); }   // the seasonal drill
      if (k.castle && !k.quest) { const kv = G.knightView(k); k.hp = kv.st.hp; k.mp = kv.st.mp; for (const u of k.troop) this.healMon(u); }
    }
    for (const c in S.castles) { S.castles[c].summons = 0; for (const u of S.castles[c].reserve) this.healMon(u); }
    if (S.stilled) { S.castles[S.stilled].stilled = false; S.stilled = null; }
    // stillness from Autumn of Year 3
    if (S.year > 3 || (S.year === 3 && S.si >= 2)) {
      const cands = Object.keys(S.castles).filter(c => c !== 'meridian' && this.owner(c) !== 'dominion' && (G.adj[c] || []).some(n => this.owner(n) === 'dominion'));
      if (cands.length && !S.flags.grayKnightDown) { const c = CR.pick(S.rng, cands.sort()); S.castles[c].stilled = true; S.stilled = c; S.flags.stilledOnce = true; rep.push({ kind: 'stilled', castle: c }); this.chron(G.get('castle', c).name + ' is Stilled.'); }
    }
    // quests return
    for (const k of Object.values(S.knights)) if (k.quest) { k.quest.back--; if (k.quest.back <= 0) rep.push(this.questReturn(k)); }
    // income and upkeep
    for (const r in S.realms) {
      const R = S.realms[r]; if (!R.alive || r === 'brigands') continue;
      const inc = this.income(r), up = this.upkeep(r); R.mana += inc - up; const lost = [];
      while (R.mana < 0) { const ms = this.realmMonsters(r); if (!ms.length) { R.mana = 0; break; } ms.sort((a, b) => this.monPower(a) / G.upkeepOf(a.sp, a.tier) - this.monPower(b) / G.upkeepOf(b.sp, b.tier) || (a.uid < b.uid ? -1 : 1)); const m = ms[0]; lost.push(G.get('monster', m.sp).names[m.tier - 1]); R.mana += Math.round(G.upkeepOf(m.sp, m.tier)); this.removeMonster(m.uid); }
      rep.push({ kind: 'income', realm: r, income: inc, upkeep: up, mana: R.mana, lost });
    }
    // brigands heal fully; the Dominion's moods
    if (S.realms.hoarfast) S.realms.hoarfast.mood = .9 + CR.next(S.rng) * .5;
    // a rival in Meridian fights the Sanctum
    if (S.flags.rivalMeridian && !S.over) rep.push(this.rivalSanctum());
    // world events: applied now (no choices), shown by the scene
    const evs = this.eventsFor('tidings', 'world');
    for (const id of evs) { this.applyEvent(id, 'world', null); rep.push({ kind: 'event', id, realm: 'world' }); }
    // the AI realms muster at once
    for (const r in S.realms) if (S.realms[r].alive && !S.realms[r].human && r !== 'brigands') G.CampaignAI.muster(this, r);
    this.checkElimination(rep);
    S.phase = 'muster'; S.turn = 0;
    if (!S.humans.some(h => S.realms[h].alive)) S.phase = 'march';
    return rep;
  }
  healMon(uid) { const m = this.mon(uid); if (!m) return; const st = G.monsterStats(m.sp, m.tier, m.lvl); m.hp = st.hp; m.mp = st.mp; }
  monPower(m) { const st = G.monsterStats(m.sp, m.tier, m.lvl); return G.unitPower(st, m.lvl, false); }
  removeMonster(uid) { const S = this.state; for (const k of Object.values(S.knights)) { const i = k.troop.indexOf(uid); if (i >= 0) k.troop.splice(i, 1); } for (const c in S.castles) { const i = S.castles[c].reserve.indexOf(uid); if (i >= 0) S.castles[c].reserve.splice(i, 1); } delete S.monsters[uid]; }
  /* ---- quests (§4.9) ---- */
  questOdds(kid, site) {
    const k = this.kn(kid), c = G.get('class', k.cls), s = G.get('site', site), S = this.state, w = {};
    for (const [o, v] of G.QUEST_OUTCOMES) w[o] = v;
    if (c.line === 'cleric') w.treasure += 10; if (c.line === 'beast') w.beast += 15; if (c.line === 'ranger') w.wanderer += 10; if (k.lvl >= 10) w.mishap -= 5;
    if (s.focus) w[s.focus] += 10; if (s.mishap) w.mishap += s.mishap;
    if (!this.wanderers(site).length) w.wanderer = 0;
    const luck = (k.equip.accessory === 'horseshoe' ? 1.15 : 1) * G.tune.questLuck;
    for (const o of ['treasure', 'beast', 'wanderer', 'mana']) w[o] *= luck;
    return w;
  }
  regionsOf(site) { const reg = G.get('castle', G.get('site', site).castle).region; return { thaw: ['winter', 'spring'], beltane: ['spring', 'summer'], lammas: ['summer', 'autumn'], hallow: ['autumn', 'winter'] }[reg] || [reg]; }
  wanderers(site) { const S = this.state, s = G.get('site', site), out = []; for (const r of this.regionsOf(site)) for (const id of G.POOLS[r].wanderers) { if (S.knights[id]) continue; if (id === 'galeron' && S.year === 1 && S.si < 2) continue; if (id === 'ettard' && !s.ettard && !['winter', 'autumn'].includes(r)) continue; if (!out.includes(id)) out.push(id); } return out; }
  questReturn(k) {
    const S = this.state, q = k.quest, site = G.get('site', q.site), rep = { kind: 'quest', knight: k.id, realm: k.realm, site: q.site, outcome: q.outcome };
    k.quest = null; k.castle = q.from && this.owner(q.from) === k.realm ? q.from : this.capital(k.realm);
    if (!k.castle) { rep.lost = true; return rep; }
    S.castles[k.castle].knights.push(k.id);
    if (site.story && (!site.storyFlag || S.flags[site.storyFlag]) && !S.seen[site.story]) { rep.story = site.story; return rep; }
    const pools = this.regionsOf(q.site).map(r => G.POOLS[r]), pick = l => l[Math.floor(q.roll * l.length) % l.length];
    switch (q.outcome) {
      case 'treasure': { const items = [].concat(...pools.map(p => p.items), site.addItem || []); const it = pick(items); S.realms[k.realm].items.push(it); rep.thing = G.get('item', it).name; break; }
      case 'beast': { let bs = [].concat(...pools.map(p => p.beasts), site.addBeast || []); if (site.beasts) for (const b in site.beasts) for (let i = 1; i < site.beasts[b]; i++) bs.push(b); const sp = pick(bs); const uid = this.newMonster(sp, Math.max(1, k.lvl - 2), 1, k.realm); if (k.troop.length < 6 && this.bondUsed(k.id) + G.get('monster', sp).rank <= this.bondMax(k.id)) k.troop.push(uid); else S.castles[k.castle].reserve.push(uid); rep.thing = G.get('monster', sp).names[0]; break; }
      case 'wanderer': { const ws = this.wanderers(q.site); if (ws.length) { const id = pick(ws); this.addKnight(id, k.realm, k.castle); rep.thing = G.get('knight', id).name; rep.joined = id; } else { S.realms[k.realm].mana += 50; rep.outcome = 'mana'; rep.thing = 50; } break; }
      case 'mana': { const n = 40 + Math.floor(q.roll * 41); S.realms[k.realm].mana += n; rep.thing = n; break; }
      case 'training': { this.giveExp(k, 60); for (const u of k.troop) this.giveMonExp(this.mon(u), 40); rep.thing = 'EXP'; break; }
      case 'mishap': { k.wounded = 1; if (q.roll < .3 && k.troop.length) { const weakest = k.troop.slice().sort((a, b) => this.monPower(this.mon(a)) - this.monPower(this.mon(b)))[0]; rep.thing = G.get('monster', this.mon(weakest).sp).names[this.mon(weakest).tier - 1]; this.removeMonster(weakest); rep.lostBeast = true; } break; }
    }
    rep.text = G.VIGNETTES[rep.outcome][Math.floor(q.roll * 3) % 3].replace(/\{\$knight\}/g, G.get('knight', k.id).short).replace(/\{\$site\}/g, site.name).replace(/\{\$thing\}/g, rep.thing);
    this.chron(rep.text);
    return rep;
  }
  giveExp(k, n) { k.exp += Math.round(n * G.tune.expScale); while (k.exp >= 100 && k.lvl < 40) { k.exp -= 100; G.levelUpKnight(k, this.state.rng); } }
  giveMonExp(m, n) { if (!m) return; m.exp += Math.round(n * G.tune.expScale); while (m.exp >= 100 && m.lvl < 40) { m.exp -= 100; G.levelUpMonster(m); } }
  addKnight(id, realm, castle, o = {}) {
    const S = this.state; if (S.knights[id]) return false;
    const d = G.get('knight', id), rec = G.makeKnightRec(id); rec.realm = realm; rec.castle = castle || this.capital(realm);
    S.knights[id] = rec; S.castles[rec.castle].knights.push(id);
    for (const [sp, lvl, tier] of d.troop) rec.troop.push(this.newMonster(sp, lvl, tier || 1, realm));
    this.chron(d.name + ' joins ' + G.get('realm', realm).short + '.');
    return true;
  }
  /* ---- story events (§6.12.3) ---- */
  eventsFor(when, realm, ctx) {
    const S = this.state, out = [];
    for (const e of G.all('event')) {
      if (e.when !== when) continue;
      if (realm === 'world' ? e.realm !== 'world' : (e.realm === 'world' || (e.realm !== 'player' && e.realm !== realm))) continue;
      const key = e.realm === 'player' ? e.id + ':' + realm : e.id;
      if (e.once !== false && S.seen[key]) continue;
      try { if (e.if && !e.if(this, realm, ctx)) continue; } catch (err) { continue; }
      out.push(e.id);
    }
    out.sort((a, b) => G.get('event', b).priority - G.get('event', a).priority);
    return when === 'tidings' ? out.slice(0, 3) : out;
  }
  applyEvent(id, realm, choice) {
    const S = this.state, e = G.get('event', id), key = e.realm === 'player' ? id + ':' + realm : id;
    S.seen[key] = true;
    const fx = [].concat(e.effects || [], choice !== null && choice !== undefined && e.choices ? e.choices[choice].effects : []);
    const out = [];
    for (const f of fx) out.push(...this.effect(f, realm));
    return out;
  }
  effect(f, realm) {
    const S = this.state, R = S.realms[realm], out = [];
    if (f.toast) out.push({ toast: f.toast });
    if (f.flag) S.flags[f.flag] = f.value === undefined ? true : f.value;
    if (f.mana && R) R.mana += f.mana;
    if (f.pay && R) { if (R.mana < f.pay) { out.push({ toast: 'Not enough mana.' }); return out; } R.mana -= f.pay; }
    if (f.addKnight && R) { if (this.addKnight(f.addKnight, realm)) out.push({ joined: f.addKnight }); }
    if (f.addItem && R) R.items.push(f.addItem);
    if (f.addMonster && R) { const [sp, lv, where] = f.addMonster, lvl = typeof lv === 'string' ? (S.knights[lv] ? S.knights[lv].lvl : 5) : lv, c = where === 'capital' ? this.capital(realm) : where; if (c) S.castles[c].reserve.push(this.newMonster(sp, lvl, 1, realm)); }
    if (f.aiFlag) { const [r, k, v] = f.aiFlag; S.realms[r].ai[k] = v === 'plus2' ? S.year * 4 + S.si + 2 : v; }
    if (f.levels) { const k = S.knights[f.levels[0]]; if (k) for (let i = 0; i < f.levels[1]; i++) { G.levelUpKnight(k, S.rng); } }
    if (f.learn) { const k = S.knights[f.learn[0]]; if (k && !k.extraSkills.includes(f.learn[1])) k.extraSkills.push(f.learn[1]); }
    if (f.bond) { const k = S.knights[f.bond[0]]; if (k) k.bondBonus += f.bond[1]; }
    if (f.circle) S.castles[f.circle[0]].extra.push(...f.circle[1]);
    if (f.lightCandle) { S.candle = S.candleMax; this.chron('The Hour-Candle is lit: ' + S.candle + ' seasons.'); }
    if (f.defect) { const [kid, to] = f.defect, k = S.knights[kid]; if (k) { const sats = ['midnight', 'dawnwatch', 'noonspire', 'vesperhall'].filter(c => this.owner(c) === to), dest = sats.length ? sats[0] : this.capital(to); if (dest) this.relocate(kid, dest, to); } }
    if (f.tutorial) out.push({ tutorial: true });
    if (f.sanctum) out.push({ sanctum: true });
    if (f.battleBuff) out.push({ battleBuff: f.battleBuff });
    return out;
  }
  relocate(kid, castle, realm) {
    const S = this.state, k = S.knights[kid]; if (k.castle) { const l = S.castles[k.castle].knights; l.splice(l.indexOf(kid), 1); }
    k.castle = castle; if (realm) { k.realm = realm; for (const u of k.troop) S.monsters[u].realm = realm; } S.castles[castle].knights.push(kid);
  }
  /* ---- Muster commands (§4.5-4.11) ---- */
  apply(cmd) {
    const S = this.state, ok = (x = {}) => Object.assign({ ok: true }, x), no = why => ({ ok: false, why });
    const R = S.realms[cmd.realm];
    switch (cmd.t) {
      case 'summon': {
        const c = S.castles[cmd.castle]; if (!c || c.owner !== cmd.realm) return no('Not your castle');
        if (c.stilled) return no('The castle is Stilled'); if (c.summons >= 3) return no('3 summons a season');
        const opts = this.summonable(cmd.castle); const o = opts.find(x => x.sp === cmd.sp); if (!o) return no('Not in this circle'); if (!o.ok) return no(o.why);
        if (!G.dev.freeSummon || !R.human) R.mana -= o.cost; c.summons++;
        const lv = Math.max(1, Math.floor(this.knightsOf(cmd.realm).reduce((a, k) => a + k.lvl, 0) / Math.max(1, this.knightsOf(cmd.realm).length) / 2));
        const uid = this.newMonster(cmd.sp, lv, 1, cmd.realm); c.reserve.push(uid);
        if (!R.firstSummon) R.firstSummon = true;
        return ok({ uid });
      }
      case 'bind': {
        const k = S.knights[cmd.knight], c = S.castles[k.castle]; if (k.realm !== cmd.realm) return no('Not yours'); if (k.quest) return no('Away on a quest');
        const i = c.reserve.indexOf(cmd.uid); if (i < 0) return no('Not in reserve'); if (k.troop.length >= 6) return no('A troop holds 6');
        const rk = G.get('monster', S.monsters[cmd.uid].sp).rank; if (this.bondUsed(k.id) + rk > this.bondMax(k.id)) return no('Not enough Bond');
        c.reserve.splice(i, 1); k.troop.push(cmd.uid); if (['wyvern', 'frostwyrm'].includes(S.monsters[cmd.uid].sp)) R.boundDragon = true; return ok();
      }
      case 'unbind': { const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm || k.quest) return no('Not here'); const i = k.troop.indexOf(cmd.uid); if (i < 0) return no('Not in troop'); k.troop.splice(i, 1); S.castles[k.castle].reserve.push(cmd.uid); return ok(); }
      case 'formation': { const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); k.formation = cmd.formation; return ok(); }
      case 'dismiss': { const c = S.castles[cmd.castle]; if (c.owner !== cmd.realm || !c.reserve.includes(cmd.uid)) return no('Not in reserve'); this.removeMonster(cmd.uid); return ok(); }
      case 'move': {
        const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); if (!this.canAct(k.id)) return no(k.wounded ? 'Wounded' : k.quest ? 'Away' : 'Stilled'); if (k.moved) return no('Already moved');
        if (!(G.adj[k.castle] || []).includes(cmd.to) || this.owner(cmd.to) !== cmd.realm) return no('Not an adjacent castle of yours'); if (S.castles[cmd.to].stilled) return no('Stilled');
        if (S.castles[cmd.to].knights.length >= 6) return no('That castle holds 6 knights');
        this.relocate(k.id, cmd.to); k.moved = true; return ok();
      }
      case 'quest': {
        const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); if (k.ruler) return no('Rulers stay home'); if (!this.canAct(k.id)) return no(k.wounded ? 'Wounded' : 'Not able'); if (k.moved) return no('Moved this Muster');
        if (this.knightsOf(cmd.realm).filter(x => x.quest).length >= 2) return no('Two knights are away already');
        const sites = this.questSites(k.id); if (!sites.includes(cmd.site)) return no('Too far');
        const site = G.get('site', cmd.site), w = this.questOdds(k.id, cmd.site), outcome = CR.weighted(S.rng, Object.entries(w)), roll = CR.next(S.rng);
        const l = S.castles[k.castle].knights; l.splice(l.indexOf(k.id), 1);
        k.quest = { site: cmd.site, back: site.away, outcome: site.story && (!site.storyFlag || S.flags[site.storyFlag]) && !S.seen[site.story] ? 'story' : outcome, roll, from: k.castle }; k.castle = null;
        return ok();
      }
      case 'equip': {
        const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); const it = G.get('item', cmd.item); if (!R.items.includes(cmd.item)) return no('Not in the stores');
        if (!G.canEquip(cmd.item, k.cls)) return no(G.get('class', k.cls).name + ' cannot use it');
        const old = k.equip[it.slot]; R.items.splice(R.items.indexOf(cmd.item), 1); if (old) R.items.push(old); k.equip[it.slot] = cmd.item; return ok();
      }
      case 'unequip': { const k = S.knights[cmd.knight]; const old = k.equip[cmd.slot]; if (!old) return no('Empty'); delete k.equip[cmd.slot]; R.items.push(old); return ok(); }
      case 'use': {
        const it = G.get('item', cmd.item); if (!R.items.includes(cmd.item)) return no('None left');
        if (it.mana) { R.mana += it.mana; }
        else if (it.slot === 'consumable') { const tgt = cmd.knight ? S.knights[cmd.knight] : S.monsters[cmd.uid]; if (!tgt) return no('No target'); const max = cmd.knight ? G.knightView(tgt).st : G.monsterStats(tgt.sp, tgt.tier, tgt.lvl); if (it.heal) tgt.hp = Math.min(max.hp, tgt.hp + it.heal); if (it.mpHeal) tgt.mp = Math.min(max.mp, tgt.mp + it.mpHeal); }
        else return no('Not usable');
        R.items.splice(R.items.indexOf(cmd.item), 1); return ok();
      }
      case 'promote': {
        const m = S.monsters[cmd.uid]; if (!m || m.realm !== cmd.realm) return no('Not yours'); const p = this.canPromote(m); if (!p.ok) return no(p.why);
        if (p.seed) R.items.splice(R.items.indexOf(p.seed), 1);
        const before = G.monsterStats(m.sp, m.tier, m.lvl); m.tier++; const after = G.monsterStats(m.sp, m.tier, m.lvl); m.hp = Math.min(after.hp, m.hp + after.hp - before.hp); m.mp = after.mp;
        this.chron(G.get('monster', m.sp).names[m.tier - 2] + ' becomes ' + G.get('monster', m.sp).names[m.tier - 1] + '.'); return ok();
      }
      case 'classChange': {
        const k = S.knights[cmd.knight]; if (k.realm !== cmd.realm) return no('Not yours'); const p = this.canClassChange(k); if (!p.ok) return no(p.why);
        if (p.writ) R.items.splice(R.items.indexOf('writ'), 1);
        k.cls = p.to; for (const s of G.STATS) k.stats[s] = Math.round(k.stats[s] * 1.1); k.hp = k.stats.hp; k.mp = k.stats.mp;
        this.chron(G.get('knight', k.id).short + ' becomes a ' + G.get('class', p.to).name + '.'); return ok();
      }
      case 'endMuster': { S.done[cmd.realm] = true; if (S.humans.filter(h => S.realms[h].alive).every(h => S.done[h])) { S.phase = 'march'; S.done = {}; } return ok(); }
      case 'declare': {
        if (S.phase !== 'march') return no('Not the March');
        const tg = cmd.target, list = cmd.knights || []; if (!list.length || list.length > 3) return no('1 to 3 knights');
        if (tg === 'sanctum') { if (this.owner('meridian') !== cmd.realm || !S.flags.sanctumOpen) return no('Take Meridian first'); }
        else if (this.owner(tg) === cmd.realm) return no('Already yours');
        if (S.marches.some(m => m.realm === cmd.realm && m.target === tg)) return no('Already marching there');
        for (const kid of list) { const k = S.knights[kid]; if (!k || k.realm !== cmd.realm) return no('Not yours'); if (!this.canAct(kid)) return no(G.get('knight', kid).short + ' cannot march'); if (k.marched) return no(G.get('knight', kid).short + ' marches already'); if (tg === 'sanctum' ? k.castle !== 'meridian' && !(G.adj.meridian || []).includes(k.castle) : !(G.adj[tg] || []).includes(k.castle)) return no(G.get('knight', kid).short + ' is not beside it'); }
        for (const kid of list) S.knights[kid].marched = true;
        S.marches.push({ realm: cmd.realm, target: tg, knights: list.slice(), from: Object.fromEntries(list.map(k => [k, S.knights[k].castle])) });
        return ok();
      }
      case 'cancel': { const i = S.marches.findIndex(m => m.realm === cmd.realm && m.target === cmd.target); if (i < 0) return no('No march'); for (const k of S.marches[i].knights) S.knights[k].marched = false; S.marches.splice(i, 1); return ok(); }
      case 'endMarch': {
        S.done[cmd.realm] = true;
        if (S.humans.filter(h => S.realms[h].alive).every(h => S.done[h])) this.beginResolution();
        return ok();
      }
      case 'event': return ok({ out: this.applyEvent(cmd.id, cmd.realm, cmd.choice) });
    }
    return no('Unknown command');
  }
  summonable(castle) {
    const S = this.state, c = S.castles[castle], r = c.owner, R = S.realms[r], out = [];
    for (const e of G.get('castle', castle).circle.concat(c.extra)) {
      const [sp, se] = e.split(':'); if (r === 'dominion' && G.get('monster', sp).elem !== 'hour') continue;
      const m = G.get('monster', sp), cost = Math.round(m.cost * G.tune.summonCost), o = { sp, cost, season: se || null, ok: true };
      if (se && se !== this.season()) { o.ok = false; o.why = 'Only in ' + G.SEASON_NAME[se]; }
      else if (sp === 'pendulumwyrm' && castle !== 'meridian') { o.ok = false; o.why = 'Meridian only'; }
      else if (R.mana < cost && !(G.dev.freeSummon && R.human)) { o.ok = false; o.why = 'Needs ' + cost + ' mana'; }
      else if (c.summons >= 3) { o.ok = false; o.why = '3 summons a season'; }
      else if (c.stilled) { o.ok = false; o.why = 'Stilled'; }
      if (!out.some(x => x.sp === sp)) out.push(o);
    }
    return out;
  }
  questSites(kid) { const k = this.kn(kid); if (!k.castle) return []; const out = [G.get('castle', k.castle).site]; for (const n of G.adj[k.castle] || []) { const s = G.get('castle', n).site, si = G.get('site', s); if (si.story && this.state.flags[si.storyFlag] !== false && (si.storyFlag ? this.state.flags[si.storyFlag] : true)) out.push(s); } return out; }
  canPromote(m) {
    const S = this.state, sp = G.get('monster', m.sp); if (m.tier >= 3) return { ok: false, why: 'Final form' };
    const need = m.tier === 1 ? 12 : 22, seedLv = m.tier === 1 ? 6 : 16, seed = G.SEED_OF[sp.elem];
    if (m.lvl >= need) return { ok: true };
    if (seed && m.lvl >= seedLv && S.realms[m.realm] && S.realms[m.realm].items.includes(seed)) return { ok: true, seed };
    return { ok: false, why: 'Level ' + need + (seed ? ' (or ' + seedLv + ' with a ' + G.get('item', seed).name + ')' : '') };
  }
  canClassChange(k) {
    const c = G.get('class', k.cls); if (!c.next) return { ok: false, why: 'No further class' };
    if (k.lvl < c.nextLv && !G.dev.allClasses) return { ok: false, why: 'Level ' + c.nextLv };
    if (c.writ && !this.state.realms[k.realm].items.includes('writ') && !G.dev.allClasses) return { ok: false, why: 'Needs a Writ of Knighthood' };
    return { ok: true, to: c.next, writ: c.writ && this.state.realms[k.realm].items.includes('writ') };
  }
  /* ---- March and resolution (§4.12-4.14) ---- */
  beginResolution() {
    const S = this.state;
    for (const r in S.realms) if (S.realms[r].alive && !S.realms[r].human && r !== 'brigands') G.CampaignAI.march(this, r);
    const lv = m => Math.max(...m.knights.map(k => S.knights[k].lvl)), pw = m => m.knights.reduce((a, k) => a + this.troopPower(k), 0);
    const tb = S.marches.map(m => CR.next(S.rng));
    S.queue = S.marches.map((m, i) => Object.assign({}, m, { tb: tb[i] })).sort((a, b) => lv(b) - lv(a) || pw(b) - pw(a) || a.tb - b.tb);
    S.phase = 'resolve';
  }
  // the next attack to resolve: { march, kind: 'skip' | 'open' | 'battle' | 'sanctum' } (and removes it from the queue)
  nextAttack() {
    const S = this.state;
    while (S.queue.length) {
      const m = S.queue.shift();
      const alive = m.knights.filter(k => S.knights[k] && S.knights[k].realm === m.realm && S.knights[k].castle && !S.knights[k].quest && S.knights[k].hp > 0);
      if (!alive.length) continue;
      m.knights = alive;
      if (m.target === 'sanctum') return { march: m, kind: 'sanctum' };
      if (this.owner(m.target) === m.realm) continue;
      const def = S.castles[m.target].knights.filter(k => S.knights[k] && !S.knights[k].quest);
      if (!def.length) { this.capture(m, null); return { march: m, kind: 'open' }; }
      return { march: m, kind: 'battle', defender: this.owner(m.target) };
    }
    return null;
  }
  // the Sanctum's attackers: the troops in Meridian, plus one more from a castle of the realm beside it (§6.10)
  sanctumTroops(r) { const S = this.state, inM = S.castles.meridian.knights.filter(k => this.kn(k).realm === r && !this.kn(k).quest).sort((a, b) => this.troopPower(b) - this.troopPower(a)).slice(0, 3); if (inM.length < 3) { const near = (G.adj.meridian || []).filter(c => this.owner(c) === r).flatMap(c => S.castles[c].knights).filter(k => this.kn(k).realm === r && this.canAct(k)).sort((a, b) => this.troopPower(b) - this.troopPower(a)); if (near.length) inM.push(near[0]); } return inM; }
  defenders(castle) { const S = this.state; return S.castles[castle].knights.filter(k => S.knights[k] && !S.knights[k].quest && S.knights[k].hp > 0).sort((a, b) => (S.knights[b].ruler - S.knights[a].ruler) || this.troopPower(b) - this.troopPower(a)).slice(0, 3); }
  knightBattleRec(kid) { const k = this.kn(kid); return { id: kid, cls: k.cls, lvl: k.lvl, exp: k.exp, elem: k.elem, stats: Object.assign({}, k.stats), hp: Math.max(1, k.hp), mp: k.mp, equip: Object.assign({}, k.equip), ruler: k.ruler, extraSkills: k.extraSkills.slice(), bondBonus: k.bondBonus }; }
  troopSpec(kid) { const k = this.kn(kid); return { knight: this.knightBattleRec(kid), monsters: k.troop.map(u => Object.assign({}, this.mon(u))).filter(m => m.hp > 0), formation: k.formation }; }
  battleSpec(att, seed) {
    const S = this.state, m = att.march, diff = G.DIFF[S.difficulty];
    const side = (realm, kids) => { const R = S.realms[realm]; return { realm, human: R.human, ai: R.human ? 'normal' : realm === 'brigands' ? 'easy' : diff.battleAI, expMul: R.human ? diff.exp : 1, boost: R.human ? G.tune.aiPlayerBoost : 0, items: R.items.filter(i => G.get('item', i).slot === 'consumable' && !G.get('item', i).musterOnly), troops: kids.map(k => this.troopSpec(k)) }; };
    if (att.kind === 'sanctum') {
      const gk = G.get('knight', 'graynight'), dk = { easy: .75, normal: 1, hard: 1.1 }[S.difficulty] || 1, gkRec = { id: 'graynight', cls: 'graynight', lvl: 25, exp: 0, elem: 'hour', stats: { hp: Math.round(680 * dk), mp: 200, atk: Math.round(42 * dk), def: Math.round(40 * dk), int: Math.round(42 * dk), agi: 24 }, equip: {}, ruler: true };
      const mons = gk.troop.map(([sp, lvl, tier], i) => ({ uid: 'gk' + i, sp, tier, lvl: Math.max(1, Math.round(lvl * dk)), exp: 0 }));
      const a = side(m.realm, m.knights); for (const t of a.troops) { const kv = G.knightView(S.knights[t.knight.id]); t.knight.hp = kv.st.hp; t.knight.mp = kv.st.mp; for (const mo of t.monsters) { const st = G.monsterStats(mo.sp, mo.tier, mo.lvl); mo.hp = st.hp; mo.mp = st.mp; } }
      return { map: 'clockwork_sanctum', season: this.season(), seed, mode: 'sanctum', castle: 'meridian', region: 'hour', attacker: 0, defender: 1, bells: 12, sides: [a, { realm: 'dominion', ai: diff.battleAI, troops: [{ knight: gkRec, monsters: mons, formation: 'shield' }] }] };
    }
    const c = G.get('castle', m.target);
    return { map: c.map, season: this.season(), seed, mode: 'siege', castle: m.target, region: c.region, attacker: 0, defender: 1, longWinter: S.flags.longWinter && this.season() === 'winter' && S.year === 1,
      sides: [side(m.realm, m.knights), side(this.owner(m.target), this.defenders(m.target))] };
  }
  // after a battle: write the battle's results back (§4.14)
  applyBattle(att, res) {
    const S = this.state, m = att.march, sanctum = att.kind === 'sanctum', defRealm = sanctum ? 'dominion' : this.owner(m.target), out = { castle: sanctum ? 'meridian' : m.target, attacker: m.realm, defender: defRealm, won: res.winner === 0, losses: [], captures: [], wounded: [], levels: [] };
    const realmOf = si => si === 0 ? m.realm : defRealm;
    for (const u of res.units) {
      if (u.ref === 'graynight' || (typeof u.ref === 'string' && (u.ref.startsWith('gk') || u.ref.startsWith('second')))) continue;
      if (u.kind === 'knight') {
        const k = S.knights[u.ref]; if (!k) continue;
        Object.assign(k, { lvl: u.rec.lvl, exp: u.rec.exp, stats: u.rec.stats }); k.hp = Math.max(0, u.hp); k.mp = u.mp;
        if (u.out === 'down') { k.wounded = 2; k.hp = 0; out.wounded.push(k.id); }
        if (u.lvls) out.levels.push([G.get('knight', k.id).short, u.rec.lvl]);
      } else {
        const mm = S.monsters[u.ref]; if (!mm) continue;
        if (u.out === 'dead') { out.losses.push([realmOf(u.side), G.get('monster', mm.sp).names[mm.tier - 1]]); this.removeMonster(u.ref); continue; }
        if (u.out === 'captured') continue;
        Object.assign(mm, { lvl: u.rec.lvl, exp: u.rec.exp, hp: Math.max(1, u.hp), mp: u.mp });
        if (u.lvls) out.levels.push([G.get('monster', mm.sp).names[mm.tier - 1], mm.lvl]);
      }
    }
    // items used in battle leave the realm's stores
    res.used.forEach((list, si) => { const R = S.realms[realmOf(si)]; for (const it of list) { const i = R.items.indexOf(it); if (i >= 0) R.items.splice(i, 1); } });
    // captures: into the captor's reserve (the contested castle if its side won, else its home castle)
    for (const c of res.captures) {
      const mm = S.monsters[c.rec.uid]; if (!mm) continue; const toRealm = realmOf(c.side), capK = S.knights[c.by];
      this.removeMonster(mm.uid); S.monsters[mm.uid] = Object.assign(mm, { realm: toRealm, hp: Math.max(1, c.hp) });
      const won = (res.winner === c.side); const dest = !sanctum && won && c.side === 0 ? m.target : (capK && capK.castle) || this.capital(toRealm);
      if (dest) S.castles[dest].reserve.push(mm.uid); else delete S.monsters[mm.uid];
      out.captures.push([toRealm, G.get('monster', mm.sp).names[mm.tier - 1]]);
    }
    if (sanctum) {
      if (out.won) { S.flags.grayKnightDown = true; this.chron('The Gray Knight falls. The Wheel turns.'); this.end({ kind: 'win', realm: m.realm }); }
      else this.chron('The Sanctum holds. The Wheel trembles.');
      for (const kid of m.knights) { const k = S.knights[kid]; if (k && k.castle !== 'meridian' && this.owner('meridian') === m.realm && S.castles.meridian.knights.length < 6) this.relocate(kid, 'meridian'); }
    } else if (out.won) this.capture(m, res);
    else this.chron(G.get('realm', m.realm).short + ' is thrown back from ' + G.get('castle', m.target).name + '.');
    S.realms[m.realm].firstBattle = true; if (S.realms[defRealm]) S.realms[defRealm].firstBattle = true;
    S.lastBattles.push(out);
    this.checkElimination([]);
    return out;
  }
  capture(m, res) {
    const S = this.state, c = m.target, old = this.owner(c), cs = S.castles[c];
    // defenders fall back to the nearest castle of their realm
    for (const kid of cs.knights.slice()) {
      const k = S.knights[kid], dest = old === 'brigands' ? null : this.nearestOwn(c, old);
      if (dest) this.relocate(kid, dest);
      else { const l = cs.knights; l.splice(l.indexOf(kid), 1); for (const u of k.troop) delete S.monsters[u]; delete S.knights[kid]; }   // a beaten brigand captain leaves the war (the oath may bring them back)
    }
    cs.owner = m.realm;
    for (const u of cs.reserve) if (S.monsters[u]) S.monsters[u].realm = m.realm;
    if (!cs.treasuryTaken) { cs.treasuryTaken = true; S.realms[m.realm].items.push(G.get('castle', c).treasury); }
    for (const kid of m.knights) { const k = S.knights[kid]; if (k && k.realm === m.realm && k.castle && cs.knights.length < 6) this.relocate(kid, c); }
    if (cs.stilled) { cs.stilled = false; if (S.stilled === c) S.stilled = null; }
    this.chron(G.get('realm', m.realm).short + ' takes ' + G.get('castle', c).name + '.');
    if (c === 'meridian' && !S.realms[m.realm].human && m.realm !== 'dominion') { S.flags.rivalMeridian = m.realm; }
    S.lastCapture = { castle: c, realm: m.realm, from: old };
  }
  nearestOwn(from, realm) {
    const seen = new Set([from]), q = [from];
    while (q.length) { const c = q.shift(); for (const n of G.adj[c] || []) { if (seen.has(n)) continue; seen.add(n); if (this.owner(n) === realm && this.state.castles[n].knights.length < 6) return n; q.push(n); } }
    return this.castlesOf(realm)[0] || null;
  }
  rivalSanctum() {
    const S = this.state, r = S.flags.rivalMeridian; S.flags.rivalMeridian = null;
    if (this.owner('meridian') !== r) return { kind: 'note', text: 'Meridian changed hands again.' };
    const kids = S.castles.meridian.knights.filter(k => S.knights[k].realm === r).slice(0, 3);
    if (!kids.length) return { kind: 'note', text: '' };
    const att = { march: { realm: r, target: 'sanctum', knights: kids, from: {} }, kind: 'sanctum' };
    const sim = G.BattleSim.create(this.battleSpec(att, CR.int(S.rng, 1, 1e9))); const res = G.BattleAI.resolve(sim);
    if (res.winner === 0) { this.end({ kind: 'wheel', realm: r }); return { kind: 'rivalWin', realm: r }; }
    this.applyBattle(att, res);
    // Meridian returns to the Dominion with a fresh garrison
    const cs = S.castles.meridian; for (const kid of cs.knights.slice()) { const dest = this.nearestOwn('meridian', r); if (dest) this.relocate(kid, dest); }
    cs.owner = 'dominion'; S.flags.rivalFailed = true;
    let n = 0; for (const id of ['meliant', 'bertilak', 'aurelie', 'morholt']) { if (n >= 2) break; if (!S.knights[id] || S.knights[id].realm !== 'dominion') { delete S.knights[id]; this.addKnight(id, 'dominion', 'meridian'); const k = S.knights[id]; while (k.lvl < 14) G.levelUpKnight(k, S.rng); n++; } }
    this.chron(G.get('realm', r).short + ' is broken in the Sanctum. The Dominion retakes Meridian.');
    return { kind: 'rivalFail', realm: r };
  }
  checkElimination(rep) {
    const S = this.state;
    for (const r in S.realms) {
      const R = S.realms[r]; if (!R.alive || r === 'brigands') continue;
      if (this.castlesOf(r).length) continue;
      R.alive = false; this.chron(G.get('realm', r).name + ' has fallen.');
      for (const k of this.knightsOf(r)) { for (const u of k.troop) delete S.monsters[u]; if (k.castle) { const l = S.castles[k.castle].knights; l.splice(l.indexOf(k.id), 1); } delete S.knights[k.id]; }
      rep.push({ kind: 'fallen', realm: r });
    }
    const alive = S.humans.filter(h => S.realms[h].alive);
    if (S.humans.length && !alive.length && !S.over) this.end({ kind: 'fallen', realm: S.humans[0] });
  }
  endSeason() { const S = this.state; S.si = (S.si + 1) % 4; if (S.si === 0) S.year++; S.phase = 'tidings'; }
  end(o) { const S = this.state; if (S.over) return; S.over = o; S.phase = 'over'; }
  /* a whole season with every realm on the AI (tests, attract, dev "run N seasons", the playthrough bot): human realms use
   * the autoplay planner; every battle is auto-resolved; player events are applied with their first choice */
  autoSeason(o = {}) {
    const S = this.state; if (S.over) return [];
    const log = [], rep = this.beginSeason(); log.push(...rep);
    const evAll = (when, r, ctx) => { for (const id of this.eventsFor(when, r, ctx)) { const e = G.get('event', id); if (id === 'tutorial') { this.applyEvent(id, r, 1); continue; } const out = this.applyEvent(id, r, e.choices ? 0 : null); log.push({ kind: 'event', id, realm: r }); for (const x of out) if (x.sanctum) this.state.flags.sanctumPending = r; } };
    for (const h of S.humans) if (S.realms[h].alive) { evAll('tidings', h); for (const q of rep) if (q.kind === 'quest' && q.realm === h && q.story) { this.applyEvent(q.story, h, 0); } }
    if (S.over) return log;
    for (const h of S.humans) if (S.realms[h].alive && S.phase === 'muster') { G.CampaignAI.autoplayMuster(this, h); this.apply({ t: 'endMuster', realm: h }); }
    if (S.phase === 'march') { for (const h of S.humans) if (S.realms[h].alive) G.CampaignAI.autoplayMarch(this, h); if (S.humans.filter(h => S.realms[h].alive).length) for (const h of S.humans) { if (S.realms[h].alive) this.apply({ t: 'endMarch', realm: h }); } else this.beginResolution(); }
    let a, guard = 0;
    while (!S.over && guard++ < 60 && (a = this.nextAttack())) {
      if (a.kind === 'open') { log.push({ kind: 'open', castle: a.march.target, realm: a.march.realm }); if (S.realms[a.march.realm].human) evAll('capture', a.march.realm, { castle: a.march.target }); }
      else {
        const sim = G.BattleSim.create(this.battleSpec(a, G.Rng.int(S.rng, 1, 1e9))), res = G.BattleAI.resolve(sim, o), out = this.applyBattle(a, res); log.push({ kind: 'battle', out });
        const h = S.realms[out.attacker].human ? out.attacker : S.realms[out.defender] && S.realms[out.defender].human ? out.defender : null;
        if (h) { evAll('afterBattle', h, { won: (h === out.attacker) === out.won, sanctum: a.kind === 'sanctum' }); if (out.won && h === out.attacker && a.kind !== 'sanctum') evAll('capture', h, { castle: out.castle }); }
      }
      if (S.flags.sanctumPending && !S.over) { const r = S.flags.sanctumPending; S.flags.sanctumPending = null; const ks = this.sanctumTroops(r); if (ks.length) S.queue.unshift({ realm: r, target: 'sanctum', knights: ks, from: {} }); }
    }
    if (!S.over) this.endSeason();
    return log;
  }
  // the season label: "SPRING • YEAR 1"
  label() { return G.SEASON_NAME[this.season()].toUpperCase() + ' • YEAR ' + this.state.year; }
}
G.CampaignSim = CampaignSim;
