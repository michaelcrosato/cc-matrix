/* STORY (§7.15): talks (typed lines with a speaker, voiced by 71-voice), choices, beats (generator scripts: talks,
 * waits, cards, camera overrides, spawns, flags) that run on the sim's clock and can be skipped, title cards, the
 * objective line and Oma Holle's line. */
const TYPE_RATE = 42;   // letters a second
Object.assign(Sim.prototype, {
  /* ---------------- talks ---------------- */
  startTalk(src, o = {}) {
    const raw = typeof src === 'string' ? S7.TALKS[src] : src;
    if (!raw) throw new Error('unknown talk ' + src);
    const lines = [];
    for (const l of raw) {
      if (Array.isArray(l)) { if (l[2] && l[2].if && !l[2].if(this)) continue; lines.push({ who: l[0], text: typeof l[1] === 'function' ? l[1](this) : l[1] }); }
      else if (l.if && !l.if(this)) continue;
      else lines.push(Object.assign({}, l));
    }
    if (!lines.length) { if (o.onDone) o.onDone(); return; }
    this.talk = { id: typeof src === 'string' ? src : null, lines, i: 0, shown: 0, t: 0, onDone: o.onDone, wait: 0 };
    this.aimExit(true); this.healing = false;
    this.emit('talk', { id: this.talk.id, open: true });
    this.talkLine();
  },
  talkLine() {
    const T0 = this.talk, l = T0.lines[T0.i];
    T0.shown = 0; T0.t = 0;
    if (l.card) { this.card = { title: l.card[0], sub: l.card[1] || '', t: 0, dur: l.dur || 2.6, who: l.who }; this.emit('card', { title: l.card[0] }); }
    else if (l.who) this.emit('line', { who: l.who, text: l.text });
    if (l.flag) this.st.flags[l.flag] = 1;
    if (l.sfx) this.emit('sfx', { name: l.sfx });
  },
  updateTalk(dt, I) {
    const T0 = this.talk, l = T0.lines[T0.i];
    T0.t += dt;
    if (l.card) { if (!this.card) this.nextLine(); return; }
    const len = (l.text || '').length;
    T0.shown = Math.min(len, T0.shown + dt * TYPE_RATE * (this.skipping ? 100 : 1));
    const auto = this.o.attract || this.o.bot || this.skipping || (this.talkAuto && T0.shown >= len && T0.t > len / TYPE_RATE + 1.4);
    if (I.confirmP || I.interactP || I.fireP || (I.clicked && !this.o.bot) || auto) {
      if (T0.shown < len && !auto) T0.shown = len;
      else if (!auto || T0.shown >= len) this.nextLine();
    }
  },
  nextLine() {
    const T0 = this.talk; if (!T0) return;
    T0.i++;
    if (T0.i >= T0.lines.length) { this.talk = null; this.emit('talk', { open: false }); if (T0.onDone) T0.onDone(); return; }
    this.talkLine();
  },
  /* ---------------- choices (Murmel, the velvet rope, skip scene) ---------------- */
  updateChoice(dt, I) {
    const P = this.prompt, n = P.items.length;
    if (I.upP || I.leftP) { P.i = (P.i + n - 1) % n; this.emit('tick', {}); }
    if (I.downP || I.rightP) { P.i = (P.i + 1) % n; this.emit('tick', {}); }
    if (I.choicePick !== undefined && I.choicePick !== null) P.i = I.choicePick;
    let pick = null;
    if (I.confirmP || (I.choiceClick !== undefined && I.choiceClick !== null)) pick = P.i;
    else if (I.cancelP) pick = n - 1;
    else if (this.o.bot || this.o.attract) pick = P.botPick !== undefined ? P.botPick : 0;
    if (pick !== null) { this.prompt = null; this.emit('confirm', {}); P.onPick(pick); }
  },
  /* ---------------- cards ---------------- */
  updateCard(dt, I) {
    const C = this.card; C.t += dt;
    if (C.t >= C.dur || this.skipping || ((I.confirmP || I.fireP || I.clicked || I.interactP) && C.t > .8) || (this.o.bot && C.t > .5)) { this.card = null; this.emit('cardEnd', {}); }
  },
  /* ---------------- beats ---------------- */
  startBeat(id, o = {}) {
    const fn = typeof id === 'function' ? id : S7.BEATS[id];
    if (!fn) throw new Error('unknown beat ' + id);
    const G = this.beatApi();
    const b = { id: typeof id === 'string' ? id : 'fn', gen: fn(G, o), wait: null, done: false };
    this.beats.push(b);
    this.emit('beat', { id: b.id });
    this.stepBeat(b, 0);
    return b;
  },
  beatApi() {
    const sim = this;
    return {
      sim,
      say: (src) => ({ talk: src }),
      wait: (s) => ({ t: s }),
      card: (title, sub, o) => ({ card: [title, sub || '', o] }),
      until: (fn) => ({ until: fn }),
      cam: (o, dur) => { sim.camOverride = o ? Object.assign({ t: 0, dur }, o) : null; },
      cut: (on) => { sim.cutscene = on; sim.letterbox = on ? 1 : 0; if (on) { sim.aimExit(true); sim.ring = null; } sim.emit('cutscene', { on }); },
      flag: (k, v = 1) => { sim.st.flags[k] = v; },
      has: (k) => !!sim.st.flags[k],
      spawn: (type, at, o) => sim.spawnEnemy(type, at, o || {}),
      wave: (id) => sim.startWave(id),
      emit: (t, d) => sim.emit(t, d),
      music: (song) => sim.emit('music', { song }),
      sfx: (name) => sim.emit('sfx', { name }),
      toast: (t) => sim.toast(t),
      area: (id, node, o) => sim.enterArea(id, node, o || {}),
      give: (k, n) => sim.giveItem(k, n),
      gate: (g) => sim.openGate(g),
      unlock: (ids) => { for (const id of ids) sim.st.roster[id].unlocked = true; },
      persona: (id) => { sim.st.lastPersona = sim.st.persona; sim.st.persona = id; },
      place: (node, face) => sim.placeAt(node, face),
      boss: (id, phase) => sim.startBoss(id, phase),
      ui: (kind, o) => { sim.uiRequest = Object.assign({ kind }, o || {}); }
    };
  },
  stepBeat(b, dt) {
    for (let guard = 0; guard < 200; guard++) {
      const w = b.wait;
      if (w) {
        if (w.t !== undefined) { w.t -= dt; dt = 0; if (w.t > 0 && !this.skipping) return; }
        else if (w.talk !== undefined) { if (this.talk || this.card) return; }
        else if (w.card !== undefined) { if (this.card) return; }
        else if (w.until) { if (!w.until(this) && !(this.skipping && guard > 2)) return; }
        else if (w.uiDone) { if (this.uiRequest || this.uiOpen) return; }
        b.wait = null;
      }
      const r = b.gen.next();
      if (r.done) { b.done = true; return; }
      const v = r.value;
      if (v === undefined || v === null) { b.wait = { t: 0 }; return; }
      if (typeof v === 'number') b.wait = { t: v };
      else if (v.talk !== undefined) { this.startTalk(v.talk); b.wait = { talk: 1 }; }
      else if (v.card) { this.card = { title: v.card[0], sub: v.card[1], t: 0, dur: (v.card[2] && v.card[2].dur) || 2.6, silhouette: v.card[2] && v.card[2].who }; this.emit('card', { title: v.card[0] }); b.wait = { card: 1 }; }
      else if (v.until) b.wait = { until: v.until };
      else if (v.t !== undefined) b.wait = { t: v.t };
      else b.wait = { t: 0 };
    }
  },
  runBeats(dt) {
    for (const b of this.beats.slice()) if (!b.done) this.stepBeat(b, dt);
    this.beats = this.beats.filter(b => !b.done);
    if (this.skipping && !this.cutscene) this.skipping = false;
  },
  /** skip the running cutscene: every wait, talk and card runs out at once; same state as watching it */
  skipCutscene() {
    if (!this.cutscene) return;
    this.skipping = true;
    for (let i = 0; i < 400 && this.cutscene; i++) {
      if (this.talk) { while (this.talk) this.nextLine(); }
      this.card = null;
      this.runBeats(1);
      if (!this.beats.length) break;
    }
    if (this.talk) while (this.talk) this.nextLine();
    this.card = null;
    if (this.cutscene && !this.beats.length) { this.cutscene = false; this.letterbox = 0; }
    this.camOverride = null;
    this.skipping = false;
    this.emit('skipped', {});
  }
});

/** the current objective's key and text (content/story/objectives.js holds the table) */
S7.objectiveKey = sim => { for (const o of S7.OBJECTIVES) if (o.when(sim)) return o.key; return 'fallback'; };
S7.objective = sim => { for (const o of S7.OBJECTIVES) if (o.when(sim)) return o.text; return 'Go where the laughing is.'; };
S7.objectiveLine = (sim, who) => { for (const o of S7.OBJECTIVES) if (o.when(sim)) return who === 'rosalind' ? o.rosalind || o.text : o.text; return 'Go where the laughing is.'; };
S7.holleLine = sim => {
  const L = S7.HOLLE_LINES, n = (sim.st.flags.holleN = (sim.st.flags.holleN || 0) + 1);
  const stage = sim.st.target >= 1 ? 2 : sim.st.flags.grauDead ? 1 : 0;
  const pool = L.filter(l => l[0] <= stage);
  return pool[(n - 1) % pool.length][1];
};
