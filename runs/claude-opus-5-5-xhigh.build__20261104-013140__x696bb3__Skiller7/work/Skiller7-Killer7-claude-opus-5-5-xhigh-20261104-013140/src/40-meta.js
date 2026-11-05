/* META: things to check and pick up (§7.12, §7.14), gates (§7.13), the Featherbed ring and switching (§7.8), freezing
 * and the Sweep's rescue (§7.10), Room 7 (§7.16) and Murmel's hints. */
const REACH = 2.4 * M, PICK_R = 1.6 * M;
Object.assign(Sim.prototype, {
  /* ---------------- what is near: prompts, auto pickups ---------------- */
  updateNear(I) {
    const h = this.hero, c = [h.x, h.y, h.z];
    this.near = null;
    if (this.aim.on || this.mode === 'frozen' || this.W.air) return;
    let best = null, bd = 1e9;
    this.nearList = [];
    for (const s of this.spots) {
      const used = this.spotUsed(s);
      const d = V.dist(c, [s.x, s.y, s.z]);
      if (PICKUPS[s.kind]) { if (!used && d < PICK_R + (s.node ? 6 : 0) && (!s.needs || this.meets(s.needs, true))) this.collect(s); continue; }
      if (!VERBS[s.kind] || s.target) continue;
      if (used && !s.repeat && !REPEAT[s.kind]) continue;
      if (s.node && this.W.node !== s.node && d > REACH * .6) continue;
      if (s.hidden && s.hidden(this)) continue;
      if (d < (s.reach || 2.4) * M) {
        this.nearList.push(s);
        // the one the hero faces wins (a quick turn faces another); a spot on this very node counts as straight ahead
        const ang = s.node === this.W.node ? 0 : Math.abs(S7.angDiff(this.hero.yaw, Math.atan2(s.y - h.y, s.x - h.x))), score = d / M + ang * 3;
        if (score < bd) { bd = score; best = s; }
      }
    }
    // a frozen statue in this area
    const ps = this.statueHere();
    if (ps && V.dist(c, ps.at) < 2.2 * M && this.st.persona === 'ansel') best = { kind: 'statue', id: 'statue:' + ps.id, persona: ps.id, x: ps.at[0], y: ps.at[1], z: ps.at[2] };
    if (best) this.near = { spot: best, verb: typeof VERBS[best.kind] === 'function' ? VERBS[best.kind](this, best) : VERBS[best.kind], label: best.label || '' };
  },
  statueHere() {
    for (const id of PERSONA_ORDER) { const r = this.st.roster[id]; if (r.frozen && r.statue && r.statue.area === this.st.area) return { id, at: r.statue.at }; }
    return null;
  },
  meets(needs, quiet) {
    if (needs.item && !(this.st.items[needs.item] >= (needs.n || 1))) return false;
    if (needs.flag && !this.st.flags[needs.flag]) return false;
    if (needs.persona && this.st.persona !== needs.persona) return false;
    return true;
  },
  interact(pick) {
    let s = this.near && this.near.spot;
    if (pick) { const p = (this.nearList || []).find(x => x.id === pick); if (p) s = p; }
    if (!s) return;
    if (s.kind === 'statue') { this.holdSpot = { spot: s, t: 0 }; return; }
    const f = ACTIONS[s.kind]; if (f) { this.emit('interact', { spot: s.id, kind: s.kind }); f(this, s); }
  },
  updateHold(dt, I) {
    const H = this.holdSpot;
    if (!I.interactD || !this.near || this.near.spot.kind !== 'statue') { this.holdSpot = null; return; }
    H.t += dt; this.emit('chip', { t: H.t });
    if (H.t >= 1.5) { this.holdSpot = null; this.revive(H.spot.persona); }
  },
  collect(s) {
    this.st.spots[this.spotKey(s)] = 1;
    PICKUPS[s.kind](this, s);
  },
  /** a gate target (a far bell, an exposure, a cornice, an echo wall, crystals...) is solved */
  solveSpot(s) {
    if (this.spotUsed(s)) return;
    this.st.spots[this.spotKey(s)] = 1;
    this.emit('solve', { spot: s.id, kind: s.kind, at: [s.x, s.y, s.z] });
    if (s.opens) for (const g of [].concat(s.opens)) this.openGate(g);
    if (s.flag) this.st.flags[s.flag] = 1;
    if (s.give) for (const k in s.give) this.giveItem(k, s.give[k]);
    if (s.dossier) this.addDossier(s.dossier);
    if (s.exposure) { this.st.exposures.push(s.exposure); this.uiRequest = { kind: 'exposure', id: s.exposure }; }
    if (s.beat) this.startBeat(s.beat);
    if (s.line) this.say(s.line);
  },
  hitTarget(s, W, p) {
    if (s.far && !(W.id === 'gamsbock' && this.aim.scope)) { this.splash('TOO FAR.', { at: p, small: true }); this.emit('toofar', { at: p }); return; }
    if (s.kind === 'far' || s.shootable) { this.solveSpot(s); return; }
    this.emit('tink', { at: p });
  },
  openGate(gid) {
    if (this.gateOpen(gid)) return;
    this.st.gates[this.gateKey(gid)] = 1;
    const g = this.areaDef.gates && this.areaDef.gates[gid];
    if (g && g.hides) for (const eid of [].concat(g.hides)) if (this.rails.edges[eid]) this.rails.edges[eid].hidden = false;
    this.grid.dynBlocks = this.grid.dynBlocks.filter(b => b.gate !== gid); this.grid.invalidateFlows();
    this.emit('gate', { gate: gid, ok: true, kind: g && g.kind });
    if (this.W.node) this.setupJunction(this.W.node);
  },
  /** may the walker take edge e? Solves or refuses its gate (with the gate's line) */
  passGate(e) {
    if (!e.gate || this.gateOpen(e.gate) || CHEAT.ghost) return true;
    const g = this.areaDef.gates[e.gate], st = this.st, P = st.persona;
    const refuse = (line) => { this.say(line || g.line || 'The way is shut.', { who: g.who }); this.emit('gate', { gate: e.gate, ok: false }); return false; };
    switch (g.kind) {
      case 'patrol': return P === 'ansel' ? (this.emit('gate', { gate: e.gate, ok: true, kind: 'patrol' }), this.say('Patrol.', { who: 'ansel' }), true) : refuse('Patrol only. You are not patrol.');
      case 'buyout':
        if (P !== 'rurik' && !this.o.attract) return refuse('Members only. Membership is a matter of means.');
        if (this.o.bot || this.o.attract) { if (this.spendRed(g.price)) { this.openGate(e.gate); this.emit('coins', {}); return true; } return refuse('Not enough Red.'); }
        this.prompt = { choice: true, title: 'PAY ' + g.price + ' RED?', items: ['PAY ' + g.price + ' RED', 'LEAVE'], i: 0, onPick: i => { if (i === 0) { if (this.spendRed(g.price)) { this.openGate(e.gate); this.emit('coins', {}); this.say('Paid in full.', { who: 'rurik' }); } else this.say('Not enough Red.', { who: 'rurik' }); } } };
        return false;
      case 'key': return st.items[g.item] ? (this.openGate(e.gate), this.say(g.okLine || 'Unlocked.'), true) : refuse(g.line || 'Locked.');
      case 'icelock': return st.items.ember ? (this.openGate(e.gate), this.emit('steam', { at: [this.hero.x, this.hero.y, this.hero.z + 20] }), this.say('The ice steams away.'), true) : refuse('Frozen shut.');
      case 'delegate':
        if ((st.items.edelweiss || 0) >= 3) { this.openGate(e.gate); this.startBeat(g.beat || 'delegate_gate'); return false; }
        return refuse('Three flowers. You have ' + (st.items.edelweiss || 0) + '.');
      case 'flag': return st.flags[g.flag] ? (this.openGate(e.gate), true) : refuse(g.line);
      case 'clear': return !this.anyAlive() ? true : refuse(g.line || 'Not while someone is laughing.');
      default: return refuse(g.line);
    }
  },
  giveItem(id, n = 1) {
    const st = this.st; st.items[id] = (st.items[id] || 0) + n;
    const I = S7.ITEMS[id];
    this.emit('item', { id, n });
    this.toast((I ? I.name : id).toUpperCase() + (n > 1 ? ' ×' + n : ''), { item: id });
    if (I && I.dossier) this.addDossier(I.dossier);
  },
  addDossier(id) { if (!this.st.dossier.includes(id)) { this.st.dossier.push(id); this.toast('DOSSIER: ' + (S7.DOSSIER[id] ? S7.DOSSIER[id].title : id)); this.emit('dossier', { id }); } },

  /* ---------------- the Featherbed ring and switching ---------------- */
  updateRing(dt, rdt, I) {
    const R = this.ring;
    const may = this.canSwitch() && (this.mode === 'rail' || this.mode === 'lift') && !(this.W.edge && this.rails.edges[this.W.edge].kind === 'ski');
    if (!R) {
      if (I.ringP && may) this.ringT = 0;
      if (I.ringD && may && this.ringT !== undefined) { this.ringT += rdt; if (this.ringT > .18) { this.ring = { i: PERSONA_ORDER.indexOf(this.st.persona), t: 0 }; this.emit('ring', { open: true }); this.tut('ring', true); } }
      if (I.ringR && this.ringT !== undefined && this.ringT <= .18 && may) { this.ringT = undefined; this.trySwitch(this.st.lastPersona); }
      if (!I.ringD) this.ringT = undefined;
      return false;
    }
    R.t += rdt;
    if (I.ringPick !== null && I.ringPick !== undefined) R.i = I.ringPick;
    if (I.pick !== null && I.pick !== undefined) R.i = I.pick;
    const st2 = I.stick; if (Math.hypot(st2[0], st2[1]) > .5) { const a = Math.atan2(st2[1], st2[0]); R.i = Math.round(S7.wrapAng(a + Math.PI / 2) / (TAU / 7) + 7) % 7; }
    if (I.leftP) R.i = (R.i + 6) % 7; if (I.rightP) R.i = (R.i + 1) % 7;
    if (!I.ringD || (I.pick !== null && I.pick !== undefined && I.device !== 'gamepad')) {
      this.ring = null; this.ringT = undefined; this.emit('ring', { open: false });
      const id = PERSONA_ORDER[R.i];
      if (id !== this.st.persona) this.trySwitch(id);
    }
    return true;
  },
  /** can the ring pick this persona now? '' when yes, else why not */
  whyNot(id) {
    const r = this.st.roster[id];
    if (!r.unlocked && !CHEAT.allPersonas) return 'NOT YET';
    if (r.frozen) return 'FROZEN';
    if (id === 'ansel' && this.areaDef.kind !== 'room7' && !CHEAT.allPersonas && !this.o.attract) return 'ROOM 7 ONLY';
    return '';
  },
  trySwitch(id, force) {
    if (!id || id === this.st.persona) return false;
    const why = force ? '' : this.whyNot(id);
    if (why) { this.say(this.personaDef(id).name.toUpperCase() + ': ' + why); this.emit('refuse', {}); return false; }
    this.aimExit(true);
    this.st.lastPersona = this.st.persona; this.st.persona = id;
    this.switching = { from: this.st.lastPersona, to: id, t: 0 };
    this.lowBarked = false;
    this.emit('switch', { from: this.st.lastPersona, to: id });
    return true;
  },
  bark(kind) {
    const P = this.personaDef(); if (!P || !P.barks) return;
    let l = P.barks[kind]; if (!l) return;
    if (Array.isArray(l)) l = l[Math.floor(S7.rnd('fx') * l.length) % l.length];
    this.say(l, { who: this.st.persona, bark: true });
    this.emit('bark', { who: this.st.persona, text: l });
  },

  /* ---------------- freezing and the Sweep (§7.10) ---------------- */
  freezePersona() {
    const st = this.st, id = st.persona, ps = this.pstate();
    this.aimExit(true); this.ring = null;
    if (id === 'ansel') { this.mode = 'gameover'; this.emit('gameover', {}); return; }
    ps.frozen = true; ps.hp = 0;
    ps.statue = { area: st.area, at: [this.hero.x, this.hero.y, this.hero.z], yaw: this.hero.yaw };
    this.curResults().frozen++;
    this.mode = 'frozen'; this.frozenT = 1.2;
    this.emit('freeze', { persona: id, at: ps.statue.at });
    this.bark('frozen');
  },
  startRescue() {
    const st = this.st;
    this.mode = 'rail';
    if (st.roster.ansel.frozen || st.roster.ansel.hp <= 0) { this.mode = 'gameover'; this.emit('gameover', {}); return; }
    st.lastPersona = st.persona; st.persona = 'ansel';
    const A = this.areaDef, node = this.lastDoor7 && this.rails.nodes[this.lastDoor7] ? this.lastDoor7 : (A.sweepNode || this.entryNode || Object.keys(this.rails.nodes)[0]);
    this.placeAt(node);
    this.emit('rescue', { start: true }); this.emit('switch', { from: st.lastPersona, to: 'ansel' });
    this.switching = { from: st.lastPersona, to: 'ansel', t: 0 };
    this.toast('THE SWEEP IS ON. FIND THE STATUE.', { life: 3.5 });
    this.tut('rescue');
  },
  revive(id) {
    const r = this.st.roster[id]; if (!r || !r.frozen) return;
    r.frozen = false; r.statue = null; r.hp = Math.ceil(this.maxHp(id) * .5);
    this.emit('rescue', { persona: id }); this.tut('rescue', true);
    this.say(this.personaDef(id).barks.revived, { who: id });
    if (this.st.flags.scriptedFreeze && !this.st.flags.rescueDone) { this.st.flags.rescueDone = 1; this.startBeat('t00_after_rescue'); }
  },
  /** put the walker on a node (warps, the Sweep's entry), facing its first exit */
  placeAt(nodeId, face) {
    const n = this.rails.nodes[nodeId]; if (!n) return;
    const ex = this.rails.exits(nodeId);
    this.W = { edge: null, node: nodeId, s: 0, dir: 1, v: 0, yaw: face !== undefined ? face : ex.length ? this.rails.branchYaw(ex[0], ex[0].dir) : 0, turnT: 0, turnFrom: 0, lastEdge: null, air: null };
    this.junction = null; this.st.node = nodeId; this.cam.shotId = null;
    this.heroUpdate(0); this.setupJunction(nodeId);
  },

  /* ---------------- Room 7 ---------------- */
  enterRoom7(s) {
    if (this.anyAlive()) { this.say('The door won\'t open while someone is laughing.'); return; }
    this.st.room7Door = { area: this.st.area, node: this.W.node || s.node };
    this.lastDoor7 = this.st.room7Door.node;
    this.emit('room7', { in: true });
    this.transition(() => { this.enterArea('room7', 'door', { noSave: true }); this.autosave('room7'); });
  },
  leaveRoom7() {
    const d = this.st.room7Door || { area: '00A', node: 'r7' };
    this.emit('room7', { in: false });
    this.transition(() => { this.enterArea(d.area, d.node, { noSave: true }); this.lastDoor7 = d.node; this.entryNode = d.node; });
  },
  /** a white flurry over an area change (the presenter shows it; the sim switches at once) */
  transition(fn) { this.emit('flurry', {}); fn(); },
  useExit(n) {
    if (this.o.echo && this.echoRun) { this.echoRun.finish(); return; }
    if (n.needs && !this.meets(n.needs) && !CHEAT.ghost) { this.say(n.line || 'Locked.'); return; }
    if (this.anyAlive() && !n.always) { this.say('Not while someone is laughing.'); return; }
    const [area, node] = n.to;
    this.emit('exit', { to: area });
    this.transition(() => { this.enterArea(area, node); this.entryNode = node; this.lastDoor7 = null; });
  },

  /* ---------------- Murmel's hints ---------------- */
  murmel(s) {
    const st = this.st, rurik = st.persona === 'rurik';
    if (st.freeHint) { st.freeHint = false; this.startTalk(S7.TALKS.murmel_first ? 'murmel_first' : this.hintTalk()); return; }
    this.prompt = { choice: true, title: 'MURMEL', items: [rurik ? 'A HINT (ON THE HOUSE)' : 'BUY A HINT (10 RED)', 'LEAVE'], i: 0, onPick: i => {
      if (i !== 0) { this.startTalk([['murmel', 'Come back... with change...']]); return; }
      if (!rurik && !this.spendRed(10)) { this.startTalk([['murmel', 'Gratuity... is customary... You have... none...']]); return; }
      st.hintsBought++; this.curResults().hints++;
      this.startTalk(this.hintTalk());
    } };
  },
  hintTalk() {
    const k = S7.objectiveKey(this), H = S7.HINTS[k] || S7.HINTS.fallback;
    return [['murmel', H]];
  }
});

/* ---- spot kinds: what △ says and does ---- */
const VERBS = {
  npc: 'TALK', murmel: 'TALK', pim: 'LISTEN', phone: s => 'ANSWER', tableau: 'CHECK', door7: 'ENTER ROOM 7', exit: 'ENTER',
  r7door: 'LEAVE', clock: 'SAVE', bench: 'WAX', wardrobe: 'WARDROBE', bed: 'CHECK', window: 'LOOK', rosalind: 'TALK', r7phone: 'LISTEN',
  codelock: 'OPEN', lift: 'BOARD', sign: 'READ', statue: 'HOLD TO CHIP FREE', gatebox: 'CHECK'
};
const REPEAT = { npc: 1, murmel: 1, tableau: 1, door7: 1, exit: 1, r7door: 1, clock: 1, bench: 1, wardrobe: 1, bed: 1, window: 1, rosalind: 1, r7phone: 1, codelock: 1, sign: 1, gatebox: 1 };
const ACTIONS = {
  npc: (sim, s) => sim.startTalk(typeof s.talk === 'function' ? s.talk(sim) : s.talk),
  pim: (sim, s) => { sim.st.spots[sim.spotKey(s)] = 1; sim.startTalk(s.talk); },
  murmel: (sim, s) => sim.murmel(s),
  phone: (sim, s) => { sim.st.spots[sim.spotKey(s)] = 1; sim.emit('pickup_phone', {}); sim.startTalk(s.talk); if (s.beat) sim.startBeat(s.beat); },
  tableau: (sim, s) => sim.startTalk([[s.who || 'tableau', s.line]]),
  sign: (sim, s) => sim.startTalk([['sign', s.line]]),
  door7: (sim, s) => sim.enterRoom7(s),
  exit: (sim, s) => { const n = sim.rails.nodes[s.node]; sim.useExit(Object.assign({}, n, s)); },
  r7door: (sim) => sim.leaveRoom7(),
  clock: (sim) => { sim.uiRequest = { kind: 'save' }; sim.startTalk([['rosalind', 'The clock is wound. Your sins are not.']]); },
  bench: (sim) => { sim.uiRequest = { kind: 'wax' }; },
  wardrobe: (sim) => { sim.uiRequest = { kind: 'wardrobe' }; },
  bed: (sim) => sim.startTalk([['holle', S7.holleLine(sim)]]),
  window: (sim) => { sim.uiRequest = { kind: 'postcard' }; },
  rosalind: (sim) => sim.startTalk([['rosalind', S7.objectiveLine(sim, 'rosalind')]]),
  r7phone: (sim) => sim.startTalk(sim.st.target >= 1 ? 'briefing_t01' : 'briefing_t00_replay'),
  codelock: (sim, s) => { sim.uiRequest = { kind: 'codelock', spot: s.id, len: s.code.length }; },
  gatebox: (sim, s) => { const e = sim.rails.edges[s.edge]; if (e && sim.passGate(e)) sim.say('Open.'); },
  lift: (sim, s) => { const e = sim.rails.edges[s.edge]; if (e && sim.W.node === e.a) sim.takeBranch({ edge: e, dir: 1 }); }
};
const PICKUPS = {
  red: (sim, s) => { sim.gain('red', s.n || 10, [s.x, s.y, s.z]); },
  rime: (sim, s) => { sim.gain('rime', s.n || 4, [s.x, s.y, s.z]); sim.toast('RIME +' + (s.n || 4)); },
  pin: (sim, s) => { sim.st.pins.push(s.pin); sim.emit('pin', { id: s.pin }); sim.toast('LIFT PIN: ' + S7.PINS[s.pin - 1].name); },
  dossier: (sim, s) => sim.addDossier(s.dossier),
  item: (sim, s) => sim.giveItem(s.item, s.n || 1)
};
S7.VERBS = VERBS; S7.PICKUPS = PICKUPS;
