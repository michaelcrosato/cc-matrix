/* 21-story: Talk runs dialogue as data (steps: ['lou', 'line'], { who, text, choices, pick }, { if, then, else }, { wait },
   or a function) over E.Dialog, with live portraits and the Animalese voice synced letter by letter. The Director walks
   the beats of the five episodes (30-data-episodes), autosaves at every beat and finds the right scene for each. */
const Talk = {
  d: null, rd: null, q: [], done: null, last: 0, page: -1, rlast: 0, rpage: -1, busy: false, cast: {}, filter: null,
  init() {
    this.d = new E.Dialog(game, { speed: 45, lines: 3, voice: null, bg: '#141210', border: '#ffb347', nameColor: '#ffb347', portraitSize: 40 });
    this.rd = new E.Dialog(game, { speed: 60, lines: 2, voice: null, place: 'top', bg: '#0e1410', border: '#8fe388', nameColor: '#8fe388', portraitSize: 32 });
  },
  get open() { return !!(this.d && this.d.open); },
  play(steps, done) { this.q = steps.slice(); this.done = done || null; this.busy = true; this.next(); },
  stop() { this.q = []; this.done = null; this.busy = false; if (this.d && this.d.open) this.d.close(); },
  next() {
    if (!this.q.length) { this.busy = false; const f = this.done; this.done = null; if (f) f(); return; }
    const s = this.q.shift();
    if (typeof s === 'function') { const r = s(); if (Array.isArray(r)) this.q.unshift(...r); return this.next(); }
    if (Array.isArray(s)) return this.line(s[0], s[1], s[2] || {}, () => this.next());
    if (s.if !== undefined) { const ok = typeof s.if === 'function' ? s.if() : s.if; const br = ok ? s.then : s.else; if (br) this.q.unshift(...br); return this.next(); }
    if (s.wait) { game.after(s.wait, () => this.next()); return; }
    if (s.choices) {
      const list = s.choices.filter(c => !c.when || c.when());
      return this.line(s.who || 'dana', s.text || '…', { choices: list.map(c => typeof c === 'string' ? c : c.label) }, null, i => {
        const c = list[i]; let r = null; if (s.pick) r = s.pick(i, c); else if (c && c.do) r = c.do();
        if (Array.isArray(r)) this.q.unshift(...r); this.next();
      });
    }
    if (s.who) return this.line(s.who, s.text, s, () => this.next());
    this.next();
  },
  line(who, text, o = {}, onDone, onChoice) {
    const rig = this.cast[who] || rigOf(who), txt = clean(text);
    this.who = who; this.prof = voiceOf(who); this.last = 0; this.page = 0; this.filter = o.filter || null;
    if (HEADLESS || Globals.auto) {   // tests and the attract reel: lines resolve at once (choices take the first or the scripted pick)
      game.after(Globals.auto ? Math.min(2.2, .4 + txt.length / 40) : 0, () => { if (onChoice) onChoice(Globals.choose ? Globals.choose(o.choices) : 0); else if (onDone) onDone(); });
      if (!HEADLESS) this.d.say(txt, { name: nameOf(who), portrait: rig || undefined, auto: Math.min(2.2, .4 + txt.length / 40), modal: false });
      return;
    }
    this.d.say(txt, { name: who === 'narr' ? '' : nameOf(who), portrait: rig || undefined, choices: o.choices, onDone, onChoice, place: o.place });
  },
  /** non-modal radio chatter (the partner, dispatch) */
  radio(who, text, secs = 3) { this.rwho = who; this.rprof = voiceOf(who); this.rlast = 0; this.rpage = 0; this.rd.say(clean(text), { name: nameOf(who), portrait: this.cast[who] || rigOf(who) || undefined, auto: secs, modal: false }); Snd.play('radio'); },
  pageText(dl) { const p = dl.pages && dl.pages[dl.i]; return Array.isArray(p) ? p.join(' ') : String(p || ''); },
  update(dt) {
    if (!this.d) return false;
    const cps = textCps(); this.d.speed = cps; this.rd.speed = cps;
    if (this.rd.open) { this.rd.update(dt); if (this.rd.i !== this.rpage) { this.rpage = this.rd.i; this.rlast = 0; } const t = this.pageText(this.rd); while (this.rlast < this.rd.shown) Voice.char(t, this.rlast++, this.rprof, 'radio'); }
    if (!this.d.open) return false;
    const m = this.d.update(dt);
    if (this.d.i !== this.page) { this.page = this.d.i; this.last = 0; }
    const t = this.pageText(this.d); while (this.last < this.d.shown) Voice.char(t, this.last++, this.prof, this.filter);
    if (this.d.open) game.audio.duck(true); else game.audio.duck(false);
    return m && !Globals.auto;
  },
  draw(r) { if (this.d) { this.d.draw(r); this.rd.draw(r); } }
};

/* ---- the Director: beats, autosaves, episode select, the detail shut down ---- */
const Director = {
  get beat() { return BEATS[STATE.beat]; },
  newGame() { STATE = newState(); reseed(1412); this.go('e1.cold'); },
  go(id, o = {}) {
    const b = BEATS[id]; if (!b) { game.fail('director', new Error('no beat ' + id)); return; }
    STATE.beat = id; if (b.ep !== STATE.ep && b.kind === 'card') Meters.episodeStart(b.ep); STATE.ep = b.ep; STATE.unlocked = Math.max(STATE.unlocked || 1, b.ep);
    if (!o.noSave && !Globals.attract && b.kind !== 'card') this.autosave();
    try { if (b.enter) b.enter(); } catch (e) { game.fail('beat enter ' + id, e); }
    const scene = { card: 'card', field: 'field', annex: 'annex', car: 'car', stage: 'stage', montage: 'montage', credits: 'credits' }[b.kind];
    game.go(scene, { beat: b }, { fade: b.kind === 'card' ? 'black' : 'dissolve', seconds: .5 });
  },
  done(res) {
    const b = this.beat; if (!b) return; STATE.done[b.id] = true;
    let n = typeof b.next === 'function' ? b.next(res) : b.next; if (!n) n = ORDER[ORDER.indexOf(b.id) + 1];
    if (!Globals.attract) Snd.sting('beatDone');
    this.go(n);
  },
  autosave() { try { if (!HEADLESS || game.saves) game.saves.save('auto'); } catch (e) { /* storage blocked */ } },
  restartBeat() { try { const s = game.saves.get('auto'); if (s && s.data) { restoreState(s.data); this.go(STATE.beat, { noSave: true }); return; } } catch (e) { /* none */ } this.go(STATE.beat, { noSave: true }); },
  shutDown() { if (game.sceneName !== 'shutdown') game.go('shutdown', {}); },
  /** episode select: start an episode from its canonical state */
  startEpisode(n) { STATE = EP_PRESETS[n](); reseed(1412 + n); STATE.unlocked = Math.max(n, STATE.unlocked || 1); this.go(EP_FIRST[n]); },
  episodeMenu(back) {
    const un = Math.max(STATE.unlocked || 1, E.store.get('wiretap:unlocked', 1));
    UI.choose({ kicker: 'Episodes', title: 'Pick up the case', text: 'Each episode starts from the case as it usually stands by then.',
      cards: EPISODES.map((e, i) => ({ id: i + 1, label: (i + 1) + '. ' + e.title, sub: e.blurb, disabled: i + 1 > un, why: 'Play the episode before it first' })), back: back || (() => UI.close()) }, n => this.startEpisode(n));
  }
};
bus.on('restore', () => {});
