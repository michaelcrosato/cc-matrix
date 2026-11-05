/* 53-dev: the dev panel, from the pause menu. Tabs (L1/R1 or Q/E): Tools, Vacation, Presentation, Tuning. Opening it freezes game
 * time. Every tool calls the same functions the game uses; the sliders write G.T, which every system reads each step.
 * Presentation holds the Voice Lab (every speaker and a line, spoken), the music jukebox, the sound board and the rig viewer. */
G.devTabs = ['Tools', 'Vacation', 'Presentation', 'Tuning'];
G.devTools = [
  { label: 'Go to the title', fn: () => G.game.go('title', {}) },
  { label: 'Go to the map', fn: () => G.game.go('map', {}) },
  { label: 'Beach Match (quick)', fn: () => G.game.go('exhibition', {}) },
  { label: 'Casino floor', fn: () => G.game.go('casino', { from: 'map', focus: 'floor' }) },
  { label: 'Pool Hop', fn: () => G.game.go('poolhop', { from: 'map' }) },
  { label: 'Album', fn: () => G.game.go('album', { from: 'menu' }) },
  { label: 'Credits', fn: () => G.game.go('credits', {}) },
  { label: 'Attract demo', fn: () => G.game.go('attract', {}) },
  { label: 'Results (sample)', fn: () => G.game.go('results', { won: true, score: [7, 3], teamNames: ['RIN', 'LOLA'], stats: { points: 7, kills: 3, longest: 9 }, opts: null }) }
];
G.devVac = [
  { label: 'Money +10,000', fn: () => G.earn(10000, 'dev') },
  { label: 'Money +100,000', fn: () => G.earn(100000, 'dev') },
  { label: 'Money to zero', fn: () => { G.state.money = 0; } },
  { label: 'Chips +100', fn: () => { G.state.chips += 100; } },
  { label: 'Fill the gift bag x3', fn: () => { for (const g of G.GIFT_ORDER) G.state.bag[g] = (G.state.bag[g] || 0) + 3; } },
  { label: 'Unlock every suit', fn: () => { G.state.wardrobe.suits = G.SUIT_ORDER.slice(); } },
  { label: 'Next day', fn: () => { G.endDay(); } },
  { label: 'Set partner: Tess', fn: () => { G.setPartner('tess'); } },
  { label: 'Clear partner', fn: () => { G.state.partner = null; } },
  { label: 'Affinity: all 90', fn: () => { for (const f of G.NPCS) if (f !== G.state.me) G.state.aff[f] = 90; } }
];
G.voiceLines = function (s) {
  const out = [], L = G.LINES[s] || {};
  const add = (cat, t) => out.push({ label: (cat + ': ' + t).slice(0, 34), text: t });
  for (const k of Object.keys(L)) {
    const v = L[k];
    if (Array.isArray(v)) v.forEach(t => add(k, t));
    else if (v && typeof v === 'object') for (const k2 of Object.keys(v)) (v[k2] || []).forEach(t => add(k + '.' + k2, t));
  }
  return out;
};
G.devSpeakers = ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei', 'sonny', 'pepper'];
G.devPresent = ['Voice Lab', 'Music jukebox', 'Sound board', 'Rig viewer'];
G.devScene = {
  enter(data) {
    this.from = data.from || 'title'; this.tab = data.tab || 0; this.sub = null;
    this.bg = new E.Backdrop('night'); this.box = G.box; this.rigI = 0; this.suitI = 0;
    // the freeze waits for the fade in (the fade runs on game time), then the game stands still
    this.freeze = G.game.after(.5, () => { G.game.timeScale = 0; });
    this.build();
  },
  exit() { if (this.freeze && this.freeze.cancel) this.freeze.cancel(); G.game.timeScale = 1; if (G.music) G.music(null); },
  build() {
    if (this.sub === 'voice') this.list = new G.List({ items: G.devSpeakers.map(s => ({ label: (G.CAST[s] || G.STAFF[s]).short, onPick: () => { this.speaker = s; this.sub = 'voice2'; this.build(); } })).concat([{ label: 'Back', onPick: () => { this.sub = null; this.build(); } }]), x: 24, y: 54, w: 180, rowH: 22, max: 7, scale: 2 });
    else if (this.sub === 'voice2') this.list = new G.List({ items: G.voiceLines(this.speaker).map(l => ({ label: l.label, onPick: () => this.speakLine(l.text, this.speaker) })).concat([{ label: 'Back', onPick: () => { this.sub = 'voice'; this.build(); } }]), x: 24, y: 54, w: 260, rowH: 20, max: 8, scale: 1 });
    else if (this.sub === 'music') this.list = new G.List({ items: Object.keys(G.SONGS).map(k => ({ label: k, onPick: () => G.music(k) })).concat([{ label: 'Stop', onPick: () => G.music(null) }, { label: 'Back', onPick: () => { this.sub = null; this.build(); } }]), x: 24, y: 54, w: 180, rowH: 22, max: 7, scale: 2 });
    else if (this.sub === 'sound') this.list = new G.List({ items: Object.keys(G.SFX).map(k => ({ label: k, onPick: () => G.sfx(k) })).concat([{ label: 'Back', onPick: () => { this.sub = null; this.build(); } }]), x: 24, y: 54, w: 180, rowH: 20, max: 8, scale: 1 });
    else if (this.sub === 'rig') this.list = new G.List({ items: G.FIGHTERS.concat(['sonny', 'pepper']).map((id, i) => ({ label: (G.CAST[id] || G.STAFF[id]).short, onPick: () => { this.rigI = i; this.suitI = 0; } })).concat([{ label: 'Back', onPick: () => { this.sub = null; this.build(); } }]), x: 24, y: 54, w: 180, rowH: 22, max: 7, scale: 2 });
    else if (this.tab === 0) this.list = new G.List({ items: G.devTools.map(t => ({ label: t.label, onPick: t.fn })), x: 24, y: 54, w: 260, rowH: 20, max: 7, scale: 2 });
    else if (this.tab === 1) this.list = new G.List({ items: G.devVac.map(t => ({ label: t.label, onPick: () => { if (!G.state) G.newState({ me: 'rin' }); t.fn(); G.toast('Done: ' + t.label); } })), x: 24, y: 54, w: 260, rowH: 20, max: 7, scale: 2 });
    else if (this.tab === 2) this.list = new G.List({ items: G.devPresent.map((t, i) => ({ label: t, onPick: () => { this.sub = ['voice', 'music', 'sound', 'rig'][i]; this.build(); } })), x: 24, y: 54, w: 260, rowH: 22, max: 6, scale: 2 });
    else this.list = new G.List({ items: this.tuneItems(), x: 24, y: 54, w: 300, rowH: 20, max: 8, scale: 1 });
  },
  speakLine(text, s) { const who = G.CAST[s] || G.STAFF[s]; this.box.say(text.replace(/\{[a-z]+\}/g, 'X'), { name: who.short, prof: who.voice, color: '#ffd36a' }); },
  speak(s) {
    const who = G.CAST[s] || G.STAFF[s];
    const line = s === 'sonny' ? G.LINES.sonny.commentary.spike[0] : s === 'pepper' ? G.LINES.pepper.tips[0].replace(/\{[a-z]+\}/g, 'X') : G.lineFor(s, 'greet', 1);
    this.box.say(line, { name: who.short, prof: who.voice, color: '#ffd36a' });
  },
  tuneItems() {
    const items = G.TUNING.map(t => ({ label: t.label, value: this.valueText(t), tune: t, onPick: () => this.bump(t, 1) }));
    items.push({ label: 'Reset all to defaults', onPick: () => { G.resetTuning(); G.toast('Defaults restored'); this.build(); } });
    items.push({ label: 'Copy JSON', onPick: () => { try { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(G.T)); } catch (e) { /* no clipboard */ } G.toast('Copied'); } });
    return items;
  },
  valueText(t) { const v = G.T[t.key]; return t.toggle ? (v ? 'On' : 'Off') : (typeof v === 'number' ? (Math.round(v * 1000) / 1000) + (t.unit ? ' ' + t.unit : '') : String(v)); },
  bump(t, d) { if (t.toggle) G.setTune(t.key, !G.T[t.key]); else G.setTune(t.key, G.T[t.key] + d * t.step); this.build(); },
  update(dt) {
    const I = G.game.input;
    this.box.update(I, dt);
    if (this.box.open) return;
    if (I.pressed('cancel') || I.pressed('pause')) { if (this.sub) { this.sub = null; this.build(); return; } G.game.go(this.from, {}); return; }
    if (I.pressed('tabR')) { this.tab = (this.tab + 1) % 4; this.sub = null; this.build(); return; }
    if (I.pressed('tabL')) { this.tab = (this.tab + 3) % 4; this.sub = null; this.build(); return; }
    if (this.sub === 'rig') {
      const ids = G.FIGHTERS.concat(['sonny', 'pepper']), id = ids[this.rigI], suits = G.SUIT_ORDER;
      if (I.repeat('right', .3, .2)) { this.suitI = (this.suitI + 1) % suits.length; }
      if (I.repeat('left', .3, .2)) { this.suitI = (this.suitI + suits.length - 1) % suits.length; }
      if (!this.rigObj || this.rigKey !== id + this.suitI) { this.rigKey = id + this.suitI; this.rigObj = G.rigFor(id, { suit: suits[this.suitI] }); }
      this.rigObj.update(.02, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: this.t || 0 });
    }
    if (this.tab === 3 && !this.sub) {
      const it = this.list.items[this.list.i];
      if (it && it.tune) {
        if (I.repeat('left', .3, .08)) this.bump(it.tune, -1);
        if (I.repeat('right', .3, .08)) this.bump(it.tune, 1);
        if (I.pressed('extra')) { G.setTune(it.tune.key, it.tune.def); this.build(); }
      }
    }
    this.list.update(I, dt);
  },
  draw(r) {
    const W = r.W, H = r.H;
    this.bg.draw(r);
    const title = this.sub ? (this.sub === 'voice2' ? 'Voice Lab' : G.devPresent[['voice', 'music', 'sound', 'rig'].indexOf(this.sub)]) : G.devTabs[this.tab];
    G.screenTitle(r, 'DEV MODE', title + ' · time frozen');
    this.list.draw(r);
    r.overlay(g => E.ui.box(g, 300, 50, W - 316, H - 98, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 }));
    if (this.sub === 'rig' && this.rigObj) {
      const suit = G.SUIT_ORDER[this.suitI], rig = this.rigObj;
      r.actor(W * .62, H * .58, 0, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.dress(g, r, rig, ox, oy); }, { pick: 'dev' });
      r.overlay(g => E.font.text(g, G.SUITS[suit].name + ' · ◂ ▸ suits', 310, 60, '#ffd36a', { shadow: '#000' }));
    } else if (this.sub === 'music') r.overlay(g => E.font.text(g, 'Pick a song to hear it.', 310, 60, '#fff8e8', { shadow: '#000' }));
    else if (this.sub === 'sound') r.overlay(g => E.font.text(g, 'Pick a sound to play it.', 310, 60, '#fff8e8', { shadow: '#000' }));
    else if (this.sub === 'voice') r.overlay(g => E.font.text(g, 'Pick a speaker, then a line to hear it.', 310, 60, '#fff8e8', { shadow: '#000' }));
    else if (this.sub === 'voice2') r.overlay(g => E.font.text(g, 'Every line of ' + (G.CAST[this.speaker] || G.STAFF[this.speaker]).short + '. ✕ speaks it.', 310, 60, '#fff8e8', { shadow: '#000' }));
    else if (this.tab === 3) {
      const it = this.list.items[this.list.i];
      r.overlay(g => E.font.text(g, it && it.tune ? (it.tune.group + ' · default ' + G.TUNING_DEFAULTS[it.tune.key]) : 'Pick a slider. ◂ ▸ change it, △ resets it.', 310, 60, '#ffd36a', { shadow: '#000' }));
    } else r.overlay(g => E.font.text(g, 'State: ' + (G.state ? 'Day ' + G.state.day + ' · ' + G.SLOTS[G.state.slot] + ' · ' + G.fmtMoney(G.state.money) : 'no vacation yet'), 310, 60, '#fff8e8', { shadow: '#000' }));
    G.promptBar(r, [['tabL', 'Tab'], ['confirm', 'Use'], ['cancel', this.sub ? 'Back' : 'Back to game']]);
    this.box.draw(r);
  }
};
