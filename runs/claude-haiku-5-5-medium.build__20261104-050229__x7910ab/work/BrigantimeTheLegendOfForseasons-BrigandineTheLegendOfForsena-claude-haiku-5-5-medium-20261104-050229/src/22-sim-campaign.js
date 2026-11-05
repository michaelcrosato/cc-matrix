// CampaignSim: the season loop as plain JSON state. A season is Tidings, then Muster (every realm acts: summon, bind,
// evolve, unbind, move, quest, equip, march), then March (each declared march becomes a battle, fought in the order it was
// declared), then Aftermath (wounds heal, quests return, mana comes in, the Hour-Candle burns down). A battle a human is in
// pauses the sim until the battle scene hands its result back (finishPending). The sim never touches the engine, the clock
// or Math.random.
(() => {
  const H = G;
  const STOCK_START = ['sun-rune', 'green-phial', 'iron-shield'];
  const REALM_MONSTER = { verdance: 'gleam-slime', solmark: 'cinder-imp', amberlyn: 'dusk-bat', hoarfast: 'frost-wisp', dominion: 'bonewalker', free: 'thorn-hare' };
  const WILD = ['gleam-slime', 'dusk-bat', 'thorn-hare', 'cinder-imp', 'frost-wisp', 'storm-pixie'];
  const CASTLE_CAP = 6;      // monsters a castle can hold (bound ones included)
  const SIDE_CAP = 8;        // units a side brings into a battle
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  class CampaignSim {
    constructor(state) { this.s = state; }

    // o: { humans: [realm ids], seed }. Every castle starts with its realm; every knight at its start castle; each realm's
    // capital holds one monster; the humans start with some mana.
    static create(o = {}) {
      const humans = o.humans || ['verdance'];
      const castles = {}, knights = {}, monsters = {}, realms = {};
      for (const c of H.all('castle')) castles[c.id] = { owner: c.realm, summoned: 0 };
      // the plan's starting mana (§4.5): 120 for each season-realm, 300 for the Dominion; the brigands have no economy
      for (const r of H.all('realm')) realms[r.id] = { mana: r.id === 'dominion' ? 300 : r.id === 'free' ? 0 : 120, rulerWounded: false };
      for (const k of H.all('knight')) {
        if (!k.start) continue;
        knights[k.id] = { id: k.id, realm: k.realm, castle: k.start, state: 'ready', woundedFor: 0, questFor: 0, questFrom: null,
          level: k.level, xp: 0, hp: k.hp, items: [] };
      }
      let uid = 0;
      for (const c of H.all('castle')) {
        const sp = REALM_MONSTER[c.realm];
        if (sp && c.capital) {
          const id = 'm' + (uid++), f = H.speciesForm(sp, 0);
          monsters[id] = { uid: id, species: sp, form: 0, hp: f.hp, maxHp: f.hp, castle: c.id, bondTo: null };
        }
        // the Calendar City is garrisoned: three of the Dominion's own creatures keep its walls
        if (c.id === 'meridian') for (let i = 0; i < H.tune.meridianGarrison; i++) { const id = 'm' + (uid++), f = H.speciesForm('bonewalker', 0); monsters[id] = { uid: id, species: 'bonewalker', form: 0, hp: f.hp, maxHp: f.hp, castle: c.id, bondTo: null }; }
      }
      const state = { season: 0, year: 1, phase: 'muster', humans, rng: new H.Rng(o.seed || 1).state(), castles, knights, monsters,
        realms, stock: STOCK_START.slice(), marches: [], marchAt: 0, pending: null, log: [], report: [], ended: null, stilled: null,
        nextUid: uid, candle: H.tune.candleSeasons, seasonsPlayed: 0, flags: {}, queue: [], seen: {} };
      const sim = new CampaignSim(state);
      sim.fire('start', humans[0]);
      sim.beginMuster();
      return sim;
    }
    static load(json) { return new CampaignSim(JSON.parse(JSON.stringify(json))); }
    serialize() { return JSON.parse(JSON.stringify(this.s)); }
    hash() { return H.hash(this.s); }
    rng() { const r = H.Rng.from(this.s.rng); const v = r.next(); this.s.rng = r.state(); return v; }
    rand(a, b) { return a + Math.floor(this.rng() * (b - a + 1)); }
    get season() { return H.SEASON_ORDER[this.s.season]; }
    isHuman(realm) { return this.s.humans.includes(realm); }
    ownerOf(castle) { return this.s.castles[castle].owner; }
    knightsAt(castle) { return Object.values(this.s.knights).filter(k => k.castle === castle && k.state !== 'quest'); }
    bondedTo(knightId) { return Object.values(this.s.monsters).filter(m => m.bondTo === knightId); }
    unboundAt(castle) { return Object.values(this.s.monsters).filter(m => m.castle === castle && !m.bondTo); }
    monstersAt(castle) { return Object.values(this.s.monsters).filter(m => m.castle === castle); }
    realmRuler(realm) { return H.get('realm', realm).ruler || null; }
    bondCap(knightId) { return H.get('knight', knightId).bond; }
    // the species' costs are the plan's scale (about six times the first table's): a summon costs cost x 6 x tune
    summonCost(species) { return Math.max(1, Math.round(H.get('species', species).forms[0].cost * 6 * H.tune.summonCost)); }
    evolveCost(species, form = 1) { return Math.max(1, Math.round(H.get('species', species).forms[form].cost * 6 * H.tune.summonCost)); }
    adjacentCastles(castle) { return H.neighbourCastles(castle); }
    log1(text) { this.s.log.push(text); return text; }
    // ---- story triggers: an event whose trigger matches plays once, in the order it fired ----
    fire(kind, value) {
      for (const ev of H.all('event')) {
        if (ev.when[kind] === undefined || ev.when[kind] !== value || this.s.seen[ev.id]) continue;
        if (ev.requires && !this.s.flags[ev.requires.flag]) continue;
        this.s.seen[ev.id] = true;
        this.s.queue.push(ev.id);
      }
    }
    nextEvent() { return this.s.queue.length ? H.get('event', this.s.queue.shift()) : null; }
    // a choice's effects: a flag, mana, an item, or a knight who joins the player's realm
    applyEffects(list, realm) {
      for (const e of list || []) {
        if (e.t === 'flag') this.s.flags[e.f] = true;
        if (e.t === 'mana') this.s.realms[realm].mana = Math.max(0, this.s.realms[realm].mana + e.n);
        if (e.t === 'item') this.s.stock.push(e.item);
        if (e.t === 'join') {
          const K = this.s.knights[e.knight];
          if (K) { K.realm = realm; K.castle = H.get('realm', realm).capital; for (const m of this.bondedTo(K.id)) m.castle = K.castle; }
        }
      }
    }
    report1(text, kind = 'info') { this.s.report.push({ text, kind }); return text; }
    moveKnight(K, to) { K.castle = to; for (const m of this.bondedTo(K.id)) m.castle = to; }
    levelUp(k) {
      // experience: 4 x the level to the next (knights grow through battle, §14.5's targets need them to)
      while (k.xp >= 4 * k.level) {
        k.xp -= 4 * k.level; k.level++; k.hp += 3;
        this.report1(H.get('knight', k.id).name + ' reached level ' + k.level + '.', 'level');
      }
    }

    // ---- muster: one action for a realm. Returns null when it is done, else the reason it was refused. ----
    do(a, realm) {
      const s = this.s;
      if (s.phase !== 'muster') return 'not the muster';
      if (s.ended) return 'the game is over';
      const K = s.knights[a.knight], M = s.monsters[a.monster];
      const holds = castle => castle && this.ownerOf(castle) === realm;
      if (a.t === 'summon') {
        if (!holds(a.castle)) return 'not your castle';
        if (s.castles[a.castle].summoned >= 3) return 'three summons a castle is the most in one season';
        if (this.monstersAt(a.castle).length >= CASTLE_CAP) return 'the castle is full';
        const cost = this.summonCost(a.species);
        if (s.realms[realm].mana < cost) return 'not enough mana (' + cost + ')';
        s.realms[realm].mana -= cost; s.castles[a.castle].summoned++;
        const id = 'm' + s.nextUid++, f = H.speciesForm(a.species, 0);
        s.monsters[id] = { uid: id, species: a.species, form: 0, hp: f.hp, maxHp: f.hp, castle: a.castle, bondTo: null };
        this.log1(H.get('realm', realm).name + ' summoned a ' + f.name + ' at ' + H.get('castle', a.castle).name + '.');
        return null;
      }
      if (a.t === 'bind') {
        if (!M || !K) return 'no such monster or knight';
        if (M.castle !== K.castle || M.bondTo) return 'the monster is not free at this castle';
        if (K.state !== 'ready' || !holds(K.castle)) return 'the knight is not ready here';
        if (this.bondedTo(K.id).length >= this.bondCap(K.id)) return 'the knight\'s bond is full';
        M.bondTo = K.id;
        return null;
      }
      if (a.t === 'unbind') {
        if (!M || !M.bondTo) return 'not bound';
        if (!holds(s.knights[M.bondTo].castle)) return 'not your knight';
        M.bondTo = null;
        return null;
      }
      if (a.t === 'evolve') {
        if (!M || M.form >= 2) return 'cannot evolve that';
        const bound = M.bondTo && s.knights[M.bondTo];
        const need = M.form === 0 ? 3 : 6;
        if (!bound || bound.level < need || !holds(bound.castle)) return 'its knight must be level ' + need + ' at a castle you hold';
        const cost = this.evolveCost(M.species, M.form + 1);
        if (s.realms[realm].mana < cost) return 'not enough mana (' + cost + ')';
        const f = H.speciesForm(M.species, M.form + 1);
        s.realms[realm].mana -= cost; M.form = M.form + 1; M.maxHp = f.hp; M.hp = f.hp;
        this.log1(f.name + ' rises from its ' + H.get('species', M.species).name + ' shape.');
        this.report1(f.name + ' rises from its ' + H.get('species', M.species).name + ' shape.', 'promote');
        return null;
      }
      if (a.t === 'promote') {
        if (!K || K.state !== 'ready' || !holds(K.castle)) return 'not a knight you can promote';
        const cur = H.get('class', K.cls || H.get('knight', K.id).cls);
        if (!cur.next) return cur.name + ' has no higher class';
        const next = H.get('class', cur.next), need = H.PROMOTE_LEVEL[next.tier], cost = H.PROMOTE_COST[next.tier];
        if (K.level < need) return 'needs level ' + need;
        if (s.realms[realm].mana < cost) return 'not enough mana (' + cost + ')';
        s.realms[realm].mana -= cost; K.cls = next.id; K.hp += next.hp || 0;
        this.fire('promoted', true);
        this.log1(H.get('knight', K.id).name + ' is now a ' + next.name + '.');
        this.report1(H.get('knight', K.id).name + ' is now a ' + next.name + '.', 'promote');
        return null;
      }
      if (a.t === 'move') {
        if (!K || K.state !== 'ready' || !holds(K.castle)) return 'not a knight you can move';
        if (this.isStill(K.castle)) return 'the Gray Knight has stilled this castle';
        if (!this.adjacentCastles(K.castle).includes(a.to)) return 'not on a road from here';
        if (s.marches.some(m => m.knight === K.id)) return 'the knight has a march';
        this.moveKnight(K, a.to);
        return null;
      }
      if (a.t === 'quest') {
        if (!K || K.state !== 'ready' || !holds(K.castle)) return 'not a knight you can send';
        if (this.isStill(K.castle)) return 'the Gray Knight has stilled this castle';
        if (s.marches.some(m => m.knight === K.id)) return 'the knight has a march';
        K.state = 'quest'; K.questFor = H.tune.questSeasons; K.questFrom = K.castle;
        this.log1(H.get('knight', K.id).name + ' rides out on a quest from ' + H.get('castle', K.castle).name + '.');
        return null;
      }
      if (a.t === 'equip') {
        if (!K || !holds(K.castle)) return 'not your knight';
        if (!s.stock.includes(a.item)) return 'not in the treasury';
        if (K.items.length) s.stock.push(K.items.shift());
        s.stock.splice(s.stock.indexOf(a.item), 1);
        K.items = [a.item];
        return null;
      }
      if (a.t === 'march') {
        if (!K || K.state !== 'ready' || !holds(K.castle)) return 'not a knight you can march';
        if (this.isStill(K.castle)) return 'the Gray Knight has stilled this castle';
        if (!this.adjacentCastles(K.castle).includes(a.to)) return 'not on a road from here';
        if (this.ownerOf(a.to) === realm) return 'that castle is yours';
        if (s.marches.some(m => m.knight === K.id)) return 'the knight has a march';
        s.marches.push({ knight: K.id, from: K.castle, to: a.to, by: realm });
        if (a.to === 'meridian') { this.fire('march-to', 'meridian'); this.fire('sanctum', true); }
        return null;
      }
      return 'unknown action ' + a.t;
    }

    // ---- the season ----
    // Tidings and the start of muster: the knights heal, the castles' summons reset, and the CPU realms muster
    beginMuster() {
      const s = this.s;
      s.phase = 'muster';
      for (const c of Object.values(s.castles)) c.summoned = 0;
      const season = H.get('season', this.season);
      this.log1(season.name + ' ' + s.year + ': ' + season.tidings);
      this.report1(season.tidings, 'tidings');
      for (const k of Object.values(s.knights)) {
        if (k.state === 'ready' && this.ownerOf(k.castle) === k.realm) k.hp = Math.min(H.get('knight', k.id).hp + (k.level - H.get('knight', k.id).level) * 3, k.hp + 3);
        // the Gray Knight keeps the Calendar City: he is back on his wall at the start of every season
        if (k.id === 'gray' && k.state === 'wounded') { k.state = 'ready'; k.woundedFor = 0; k.hp = H.get('knight', 'gray').hp; }
      }
      this.fire('season', s.seasonsPlayed);
      this.fire('candle', s.candle);
      this.chooseStill();
      for (const r of H.all('realm')) if (!s.humans.includes(r.id) && r.id !== 'free') H.aiCampaign.muster(this, r.id);
    }
    // the human's muster is over: the marches resolve. Returns { battle: pending } when a human battle waits for the scene.
    endMuster() {
      if (this.s.phase !== 'muster' || this.s.ended) return { battle: null };
      this.s.phase = 'march';
      this.s.marchAt = 0;
      return this.resolveMarches();
    }
    resolveMarches() {
      const s = this.s;
      const validMarch = (x) => { const K = s.knights[x.knight]; return !!K && K.state === 'ready' && K.castle === x.from && this.ownerOf(x.from) === x.by && this.ownerOf(x.to) !== x.by; };
      while (s.marchAt < s.marches.length) {
        const m = s.marches[s.marchAt];
        if (m.done || !validMarch(m)) { m.done = true; s.marchAt++; continue; }
        // an army: every march on the same castle by the same realm, from the castles beside it, fights as one battle
        const group = [m];
        for (const x of s.marches.slice(s.marchAt + 1)) if (!x.done && x.to === m.to && x.by === m.by && validMarch(x)) group.push(x);
        for (const g of group) g.done = true;
        this.fire('march-by', m.by);
        const setup = this.battleSetup(m, group);
        if (this.isHuman(m.by) || this.isHuman(this.ownerOf(m.to))) {
          s.pending = { march: m, group, setup, sim: H.BattleSim.create(setup).serialize() };
          this.report1('The march on ' + H.get('castle', m.to).name + ' begins.', 'battle');
          return { battle: s.pending };
        }
        const sim = H.BattleSim.create(setup);
        H.autoplayBattle(sim, 5000);
        this.finishBattle(sim, m, group);
        s.marchAt++;
        if (s.ended) return { battle: null };
      }
      this.endSeason();
      return { battle: null };
    }
    // the battle the scene fought for the pending march: hand its result back, and the marches carry on
    finishPending(sim) {
      const p = this.s.pending;
      if (!p) return { battle: null };
      this.finishBattle(sim, p.march, p.group || [p.march]);
      this.s.pending = null;
      this.s.marchAt++;
      if (this.s.ended) return { battle: null };
      return this.resolveMarches();
    }
    // a march's battle: the attacker's knight with its bound monsters; the castle's knights (up to two) and their monsters,
    // then the monsters that stand free there
    battleSetup(m, group = [m]) {
      const s = this.s, castle = m.to;
      const att = [];
      group.forEach((g, i) => {
        const K = s.knights[g.knight];
        att.push(this.knightSpec(K, i === 0));
        for (const mo of this.bondedTo(K.id)) att.push({ kind: 'monster', ref: mo.species, form: mo.form, hp: mo.hp, _id: mo.uid });
      });
      // the castle's commander is its strongest knight; a ruler defends from home only when it is the strongest
      // a ruler stays out of the defence while another knight can hold the castle: a fallen ruler ends the game
      const ready = this.knightsAt(castle).filter(k => k.state === 'ready');
      const others = ready.filter(k => k.id !== this.realmRuler(k.realm));
      const garrison = (others.length ? others : ready).sort((a, b) => b.level - a.level || (a.id < b.id ? -1 : 1));
      const def = [];
      garrison.slice(0, 2).forEach((k, i) => {
        def.push(this.knightSpec(k, i === 0));
        for (const mo of this.bondedTo(k.id)) def.push({ kind: 'monster', ref: mo.species, form: mo.form, hp: mo.hp, _id: mo.uid });
      });
      for (const mo of this.unboundAt(castle)) def.push({ kind: 'monster', ref: mo.species, form: mo.form, hp: mo.hp, _id: mo.uid });
      const map = H.MAP_FOR_CASTLE[castle] || H.MAP_POOL[hashOf(castle + m.knight) % H.MAP_POOL.length];
      return { map, season: this.season, seed: this.rand(1, 2 ** 30), sides: [{ troops: att.slice(0, SIDE_CAP) }, { troops: def.slice(0, SIDE_CAP) }],
        bellLimit: H.tune.bellLimit, title: H.get('castle', castle).name };
    }

    // a knight as a battle unit: its class, its items, and the healing its items give before the first bell
    knightSpec(K, leader) {
      const items = K.items.map(id => H.get('item', id));
      const heal = items.reduce((n, it) => n + (it.heal || 0), 0);
      return { kind: 'knight', ref: K.id, level: K.level, cls: K.cls, items: K.items.slice(), hp: Math.min(K.hp + heal, 999), leader };
    }

    // Stillness (§4.16): from autumn of year three, each Tidings the Gray Knight stills one castle that borders the Dominion
    // (seeded): it yields nothing that season, and its troops can't move, march or quest. Meridian is never stilled.
    chooseStill() {
      const s = this.s;
      s.stilled = null;
      if (s.seasonsPlayed < 10) return;
      const dominion = Object.keys(s.castles).filter(c => s.castles[c].owner === 'dominion');
      const pool = Object.keys(s.castles).filter(c => c !== 'meridian' && s.castles[c].owner !== 'dominion' && this.adjacentCastles(c).some(d => dominion.includes(d))).sort();
      if (!pool.length) return;
      s.stilled = pool[this.rand(0, pool.length - 1)];
      this.fire('stillness', true);
      this.report1('The Gray Knight stills ' + H.get('castle', s.stilled).name + ' for the season.', 'still');
    }
    isStill(castle) { return this.s.stilled === castle; }

    // a finished battle: wounds, experience, the monsters that fell, and the castle that changes hands
    finishBattle(sim, m, group = [m]) {
      const s = this.s, castle = m.to, K = s.knights[m.knight];
      const sideRealm = { 0: m.by, 1: this.ownerOf(castle) };
      const attackerWon = sim.s.winner === 0;
      for (const u of sim.s.units) {
        if (u.kind === 'knight') {
          const k = s.knights[u.ref];
          // every knight that fought earns experience, win or lose; the battle's own kills and hits add to it
          k.xp += Math.round((u.xp + 4) * H.tune.knightXp);
          this.levelUp(k);
          k.hp = Math.max(1, u.hp);
          if (u.dead) {
            if (k.id === 'gray') this.fire('wounded', 'gray');
            k.state = 'wounded'; k.woundedFor = 1;
            const realm = sideRealm[u.side];
            if (u.ref === this.realmRuler(realm)) {
              if (this.isHuman(realm)) this.endRuler(realm);
              else { s.realms[realm].rulerWounded = true; this.fire('ruler-hurt', true); }
            }
          }
        } else if (u.campaignId && s.monsters[u.campaignId]) {
          const mo = s.monsters[u.campaignId];
          if (u.dead) { delete s.monsters[u.campaignId]; this.report1(H.get('species', mo.species).name + ' fell.', 'fell'); }
          else {
            mo.hp = u.hp;
            // a captured monster joins its captor's reserve: at the contested castle if the captors won, else at the captor's capital
            const cap = sim.s.captures.find(c => c.uid === u.uid);
            if (cap) {
              const captorRealm = sideRealm[cap.side];
              mo.castle = attackerWon === (cap.side === 0) ? castle : H.get('realm', captorRealm).capital;
              mo.bondTo = null;
              this.report1(H.get('species', mo.species).name + ' was taken by ' + H.get('realm', captorRealm).name + '.', 'captured');
            }
          }
        }
      }
      if (attackerWon) {
        const old = this.ownerOf(castle);
        if (this.isHuman(m.by)) this.fire('capture', castle);
        if (this.isHuman(old)) this.fire('castle-lost', castle);
        if (H.get('castle', castle).capital && this.isHuman(old)) this.fire('castle-lost', castle);
        s.castles[castle].owner = m.by;
        this.report1(H.get('realm', m.by).name + ' took ' + H.get('castle', castle).name + ' from ' + H.get('realm', old).name + '.', this.isHuman(m.by) ? 'won' : 'captured');
        this.log1(H.get('castle', castle).name + ' changed hands.');
        for (const g of group) { const G1 = s.knights[g.knight]; if (G1 && G1.state !== 'quest') this.moveKnight(G1, castle); }
        // the defeated knights fall back to a neighbouring castle of their own, if one stands
        for (const k of Object.values(s.knights)) {
          if (k.castle !== castle || k.realm === m.by) continue;
          const back = this.adjacentCastles(castle).find(c => this.ownerOf(c) === k.realm);
          if (back) this.moveKnight(k, back);
        }
      } else {
        for (const g of group) { const G1 = s.knights[g.knight]; if (G1) this.moveKnight(G1, g.from); }
        this.report1(H.get('knight', K.id).name + ' was turned back from ' + H.get('castle', castle).name + '.', 'lost');
      }
      this.checkEnd();
    }

    // the end of a season: quests return, the wounded recover, the castles give mana, the candle burns down
    endSeason() {
      const s = this.s;
      for (const k of Object.values(s.knights)) {
        if (k.state === 'quest') {
          k.questFor--;
          if (k.questFor <= 0) { k.state = 'ready'; this.moveKnight(k, k.questFrom); this.questReward(k); this.fire('quest-return', true); }
        } else if (k.state === 'wounded') {
          k.woundedFor--;
          if (k.woundedFor <= 0) { k.state = 'ready'; k.hp = Math.max(k.hp, Math.ceil(H.get('knight', k.id).hp * .5)); }
        }
      }
      for (const c of Object.keys(s.castles)) {
        const owner = s.castles[c].owner;
        if (owner === 'free') continue;
        // the plan's yields (§4.5): a capital 40, Meridian 60, any other castle 25; a castle in its realm's season +25% (§4.2)
        const cd = H.get('castle', c);
        let gain = this.isStill(c) ? 0 : (cd.capital ? 40 : cd.goal ? 60 : 25) * H.tune.manaYield * (this.isHuman(owner) ? H.tune.humanYield : 1);
        if (H.get('realm', owner).season === this.season) gain *= 1.25;
        if (s.realms[owner].rulerWounded) gain *= .5;
        s.realms[owner].mana += Math.round(gain);
      }
      for (const r of Object.values(s.realms)) r.rulerWounded = false;
      // upkeep (§4.5): every monster a realm keeps costs mana each season; a realm short of mana loses its weakest monsters
      for (const r of H.all('realm')) {
        if (r.id === 'free') continue;
        const mine = Object.values(s.monsters).filter(m => this.ownerOf(m.castle) === r.id);
        const upkeep = (m) => Math.max(1, Math.round(H.get('species', m.species).forms[m.form].cost * 6 * H.tune.upkeep));
        s.realms[r.id].mana -= mine.reduce((n, m) => n + upkeep(m), 0);
        const deserters = mine.slice().sort((a, b) => upkeep(a) - upkeep(b) || (a.uid < b.uid ? -1 : 1));
        while (s.realms[r.id].mana < 0 && deserters.length) {
          const m = deserters.shift();
          s.realms[r.id].mana += upkeep(m);
          delete s.monsters[m.uid];
          if (this.isHuman(r.id)) this.report1(H.get('species', m.species).name + ' deserted for want of mana.', 'lost');
        }
        s.realms[r.id].mana = Math.max(0, s.realms[r.id].mana);
      }
      s.candle--;
      s.seasonsPlayed++;
      s.season = (s.season + 1) % 4;
      if (s.season === 0) s.year++;
      s.marches = []; s.marchAt = 0; s.pending = null;
      s.phase = 'aftermath';
      this.checkEnd();
      if (!s.ended && s.candle <= 0) this.end(null, 'candle');
      if (!s.ended) this.beginMuster();
    }
    questReward(k) {
      const name = cap(H.get('knight', k.id).name);
      const roll = this.rand(1, 100);
      if (roll <= 30) {
        const items = H.all('item');
        const item = items[this.rand(0, items.length - 1)].id;
        this.s.stock.push(item);
        this.report1(name + ' came home with a ' + H.get('item', item).name + '.', 'reward');
      } else if (roll <= 55) {
        this.s.realms[this.ownerOf(k.castle)].mana += 6;
        this.report1(name + ' brought back 6 mana from the roads.', 'reward');
      } else if (roll <= 75) {
        const sp = WILD[this.rand(0, WILD.length - 1)], id = 'm' + this.s.nextUid++, f = H.speciesForm(sp, 0);
        this.s.monsters[id] = { uid: id, species: sp, form: 0, hp: f.hp, maxHp: f.hp, castle: k.castle, bondTo: null };
        this.report1(name + ' brought back a wild ' + H.get('species', sp).name + '.', 'reward');
      } else if (roll <= 90) {
        k.xp += 12; this.levelUp(k);
        this.report1(name + ' trained with the wardens of the road.', 'reward');
      } else {
        k.state = 'wounded'; k.woundedFor = 1; k.hp = Math.max(1, k.hp - 4);
        this.report1(name + ' was ambushed on the road and is hurt.', 'lost');
      }
    }

    // ---- the ends ----
    endRuler(realm) { this.end(null, 'ruler', realm); }
    checkEnd() {
      if (this.s.ended) return;
      const meridian = this.ownerOf('meridian');
      if (meridian !== 'dominion' && meridian !== 'free') this.end(meridian, 'meridian');
    }
    end(winner, reason, realm = null) {
      const s = this.s;
      s.ended = { winner, reason, realm, season: s.seasonsPlayed, year: s.year };
      s.phase = 'over';
      s.pending = null;
      const text = reason === 'meridian' ? H.get('realm', winner).name + ' holds Meridian.'
        : reason === 'candle' ? 'The Hour-Candle has burned out.' : 'Your ruler has fallen.';
      this.report1(text, 'end');
    }
    // the human's result, for the endings: 'won' when they hold Meridian, 'candle', or 'ruler'
    outcome() {
      const e = this.s.ended;
      if (!e) return null;
      if (e.reason === 'meridian') return this.isHuman(e.winner) ? 'won-' + e.winner : 'lost-meridian';
      return e.reason === 'candle' ? 'candle' : 'ruler';
    }
  }

  const hashOf = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  H.CampaignSim = CampaignSim;
  H.STOCK_START = STOCK_START;
})();
