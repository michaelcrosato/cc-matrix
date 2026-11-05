// Dialogue (a Dragon Quest-style stitched box, Animalese voices, choices), quests, cutscenes and using objects.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;

// ---------------- DIALOGUE ----------------
class Talk {
  constructor(ctx) { this.ctx = ctx; this.q = []; this.cur = null; }
  get open() { return !!this.cur; }
  say(lines, o = {}) { const item = Object.assign({ lines: Array.isArray(lines) ? lines : [lines] }, o); if (this.cur) this.q.push(item); else this._open(item); return this; }
  _open(item) {
    const pages = []; const maxW = this._dims().tw;
    for (const t of item.lines) { const L = E.font.wrap(String(t), maxW); for (let k = 0; k < L.length; k += 3) pages.push(L.slice(k, k + 3)); }
    this.cur = Object.assign(item, { pages: pages.length ? pages : [['']], i: 0, shown: 0, choice: 0 });
    this.ctx.events.emit('talkOpen', { who: item.who });
  }
  close() { const c = this.cur; this.cur = null; this.ctx.game.input.consumeAll(); if (c && c.onDone) c.onDone(); if (!this.cur && this.q.length) this._open(this.q.shift()); }
  _dims() { const g = this.ctx.game, W = g.W, H = g.H, w = Math.min(W - 16, 360), h = 3 * 11 + 12, x = Math.round((W - w) / 2), y = H - h - 8, P = 36; return { x, y, w, h, P, tw: w - P - 22 }; }
  speed() { const s = this.ctx.game.settings.dqTextSpeed || 'Normal'; const v = this.cur && this.cur.who && DQ.NPCS[this.cur.who] && DQ.NPCS[this.cur.who].voice; return (v ? v.speed : 45) * (s === 'Slow' ? .6 : s === 'Fast' ? 1.8 : 1); }
  update(dt) {
    const c = this.cur; if (!c) return false;
    const I = this.ctx.game.input, page = c.pages[c.i], len = page.reduce((a, l) => a + l.length, 0), prev = Math.floor(c.shown);
    c.shown = Math.min(len, c.shown + this.speed() * dt);
    const flat = page.join(' ');
    for (let q = prev; q < Math.floor(c.shown); q++) if (this.ctx.audioX && c.who) this.ctx.audioX.voiceLetter(c.who, flat[q] || ' ', q, flat);
    const last = c.i >= c.pages.length - 1, asking = last && c.choices && c.shown >= len;
    if (c.auto) { c._t = (c._t || 0) + dt; if (c.shown >= len && c._t > c.auto + len / this.speed()) { c._t = 0; if (last) this.close(); else { c.i++; c.shown = 0; } } return !!c.modal; }
    const d = this._dims(), cl = I.clicked();
    if (asking) {
      if (I.repeat('up')) { c.choice = (c.choice + c.choices.length - 1) % c.choices.length; this.ctx.audioX && this.ctx.audioX.sfx('uiMove'); }
      if (I.repeat('down')) { c.choice = (c.choice + 1) % c.choices.length; this.ctx.audioX && this.ctx.audioX.sfx('uiMove'); }
      const cb = this._cbox(d), row = p => p && p[0] >= cb.x && p[0] < cb.x + cb.w && p[1] >= cb.y && p[1] < cb.y + cb.h ? E.clamp(Math.floor((p[1] - cb.y - 4) / 11), 0, c.choices.length - 1) : -1;
      const hp = I.lastDevice === 'mouse' ? row(I.pointer()) : -1; if (hp >= 0) c.choice = hp;
      const cr = row(cl);
      if (cr >= 0 || I.pressed('confirm') || I.pressed('jump')) { if (cr >= 0) c.choice = cr; const ch = c.choice; this.ctx.audioX && this.ctx.audioX.sfx('uiConfirm'); const cb2 = c.onChoice; this.cur.onChoice = null; this.close(); if (cb2) cb2(ch, c.choices[ch]); return true; }
      if (I.pressed('cancel') && c.cancel !== undefined) { const cb2 = c.onChoice; this.close(); if (cb2) cb2(c.cancel, c.choices[c.cancel]); return true; }
      return true;
    }
    const tapped = cl && cl[1] > d.y - 14;
    if (I.pressed('confirm') || I.pressed('jump') || I.pressed('interact') || I.pressed('swing') || tapped) {
      if (c.shown < len) c.shown = len; else if (!last) { c.i++; c.shown = 0; } else this.close();
    }
    return true;
  }
  _cbox(d) { const c = this.cur, w = Math.max(...c.choices.map(s => E.font.width(s))) + 24, h = c.choices.length * 11 + 8; return { x: d.x + d.w - w - 4, y: d.y - h - 4, w, h }; }
  draw(r) {
    const c = this.cur; if (!c) return;
    r.overlay(g => {
      const d = this._dims(), who = c.who && DQ.NPCS[c.who], gold = who && who.gold, t = this.ctx.game.real;
      const bg = gold ? ['#3a2a10', '#24180a'] : ['#2a2350', '#1a1636'], thread = gold ? '#ffd870' : '#f1e6c8', text = gold ? '#ffe8a0' : '#ffffff';
      DQ.UI.panel(g, d.x, d.y, d.w, d.h, { bg, thread, alpha: c.auto && !c.modal ? .85 : 1 });
      // portrait
      const P = d.P, pxx = d.x + 6, pyy = d.y + Math.round((d.h - P) / 2);
      if (c.who === 'granny') DQ.UI.grannyPortrait(g, pxx, pyy, P, t);
      else if (c.who && this.ctx.npcs && this.ctx.npcs.get(c.who) && !DQ.NPCS[c.who].blob) { const rig = this.ctx.npcs.get(c.who).rig; rig._talk = c.shown < c.pages[c.i].reduce((a, l) => a + l.length, 0); rig.drawPortrait(g, pxx, pyy, P, { bg: '#3a3264', border: thread, shadow: false }); rig._talk = false; }
      else if (c.who === 'lintwick' || c.who === 'lintwickSign') DQ.UI.blobPortrait(g, pxx, pyy, P, t);
      else if (c.portrait) c.portrait(g, pxx, pyy, P, t);
      else if (c.who) DQ.UI.monsterPortrait(g, pxx, pyy, P, c.who, t);
      if (who || c.name) { const nm = c.name || who.name, nw = E.font.width(nm) + 14; DQ.UI.panel(g, d.x + P + 10, d.y - 13, nw, 15, { bg, thread }); E.font.text(g, nm, d.x + P + 17, d.y - 9, gold ? '#ffd870' : '#ffd36a', { shadow: '#05040a', outline: false }); }
      let left = Math.floor(c.shown);
      c.pages[c.i].forEach((line, k) => { const s = line.slice(0, Math.max(0, left)); left -= line.length; if (s) E.font.text(g, s, d.x + P + 14, d.y + 7 + k * 11, text, { shadow: '#05040a', outline: false }); });
      const len = c.pages[c.i].reduce((a, l) => a + l.length, 0), last = c.i >= c.pages.length - 1;
      if (c.shown >= len && !(last && c.choices) && Math.floor(t * 3) % 2 === 0) px.poly(g, [[d.x + d.w - 13, d.y + d.h - 9], [d.x + d.w - 7, d.y + d.h - 9], [d.x + d.w - 10, d.y + d.h - 5]], thread);
      if (last && c.choices && c.shown >= len) {
        const cb = this._cbox(d); DQ.UI.panel(g, cb.x, cb.y, cb.w, cb.h, { bg, thread });
        c.choices.forEach((s, k) => { const sel = k === c.choice; E.font.text(g, s, cb.x + 14, cb.y + 5 + k * 11, sel ? '#ffd36a' : '#ffffff', { shadow: '#05040a', outline: false }); if (sel) E.font.text(g, '▸', cb.x + 5 + (Math.floor(t * 4) % 2), cb.y + 5 + k * 11, '#ffd36a', false); });
      }
    });
  }
}
DQ.Talk = Talk;

// ---------------- QUESTS ----------------
class Quests {
  constructor(ctx) { this.ctx = ctx; this.s = {}; this.track = {}; this._t = 0; this.kills = {}; }
  st(id) { return this.s[id] || (this.s[id] = { state: 'locked', step: 0, base: {} }); }
  active(id) { return this.st(id).state === 'active'; }
  done(id) { return this.st(id).state === 'done'; }
  list(state) { return DQ.QUESTS.filter(q => this.st(q.id).state === state); }
  // a quest becomes available when its predecessor is done and its start condition holds
  _avail(q) {
    const s = this.st(q.id); if (s.state !== 'locked') return false;
    const prev = DQ.QUESTS.find(p => p.next === q.id); if (prev && !this.done(prev.id)) return false;
    if (q.id === 'm1' && !prev) return true;
    if (q.start && q.start.level && (!this.ctx.town || this.ctx.town.level < q.start.level)) return false;
    if (q.side && !this.ctx.town.planted) return false;
    if (q.giver !== 'granny' && q.giver !== 'lintwickSign' && !q.auto && !(this.ctx.npcs && this.ctx.npcs.get(q.giver))) return false;
    return true;
  }
  accept(id) {
    const q = DQ.quest(id), s = this.st(id); if (s.state === 'active' || s.state === 'done') return;
    s.state = 'active'; s.step = 0; s.base = Object.assign({}, this.ctx.combat ? this.ctx.combat.kills : {}); s.talked = {}; s.placedBase = this._placedInTown();
    if (this.track[id] === undefined) this.track[id] = true;
    if (q.notionsStart && this.ctx.crafting) for (const n of q.notionsStart) this.ctx.crafting.know(n);
    if (q.give && this.ctx.builder) for (const k in q.give) this.ctx.builder.take(k, q.give[k]);
    if (this.ctx.crafting) this.ctx.crafting.trigger('quest', id + 'start');
    this.ctx.events.emit('questStep', { id, step: 0, accepted: true });
  }
  balloonFor(npc) {
    for (const q of DQ.QUESTS) { if (q.giver !== npc) continue; const s = this.st(q.id); if (s.state === 'turnin') return '?'; if (this._avail(q)) return '!'; if (s.state === 'active') { const st = q.steps[s.step]; if (st && st.done.talk === npc && this._cond(q, st.done, true)) return '?'; } }
    return null;
  }
  talkTo(npc, builder, done) {
    const ctx = this.ctx, talk = ctx.talk;
    for (const q of DQ.QUESTS) {
      if (q.giver !== npc) continue;
      const s = this.st(q.id);
      if (s.state === 'turnin') { this.complete(q.id); talk.say(q.outro || ['Thank you, Builder!'], { who: npc, onDone: done }); return true; }
      if (s.state === 'active') { const st = q.steps[s.step]; if (st && st.done.talk === npc) { if (this._cond(q, st.done, true)) { s.talked[npc] = true; if (q.take) for (const k in q.take) builder.bag.remove(k, q.take[k]); this.update(0, true); if (this.st(q.id).state === 'turnin') { this.complete(q.id); talk.say(q.outro || ['Thank you!'], { who: npc, onDone: done }); } else talk.say(q.outro || ['Splendid!'], { who: npc, onDone: done }); return true; } } }
      if (this._avail(q)) {
        talk.say((q.intro || ['I have a favour to ask...']).concat(['Will you help?']), { who: npc, choices: ['Of course!', 'Maybe later'], cancel: 1, onChoice: i => { if (i === 0) { this.accept(q.id); ctx.hud && ctx.hud.popup('New quest', q.title); ctx.audioX && ctx.audioX.jingle('item'); } else talk.say(['Oh... all right. Come back soon!'], { who: npc }); }, onDone: done });
        return true;
      }
    }
    // special talks
    if (npc === 'mortimer' && this.active('m13') && this.st('m13').step === 1 && !ctx.flags.siegeStarted) {
      talk.say(DQ.LINES.siegeAsk.concat(['Ready?']), { who: npc, choices: ['Yes! Bring it on!', 'Not yet'], cancel: 1, onChoice: i => { if (i === 0) { talk.say(DQ.LINES.siegeGo, { who: npc }); ctx.siege.start(); } else talk.say(DQ.LINES.siegeWait, { who: npc }); }, onDone: done });
      return true;
    }
    return false;
  }
  _placedInTown() { const out = {}; const w = this.ctx.world, t = this.ctx.town; if (!t || !t.planted) return out; const r = t.radius; for (let y = t.by - r; y <= t.by + r; y++) for (let x = t.bx - r; x <= t.bx + r; x++) for (let z = 1; z < w.H; z++) { const id = w.get(x, y, z); if (id === 24) out.feltBlue = (out.feltBlue || 0) + 1; } return out; }
  // a step condition
  _cond(q, c, ignoreTalk) {
    const ctx = this.ctx, b = ctx.builder, s = this.st(q.id), P = DQ.WORLD.poi;
    const at = (name, rad) => { const p = P[name]; if (!p || !b) return false; const z = p[2] === null ? ctx.world.topZ(p[0], p[1]) : p[2]; return Math.hypot(b.body.x / T - (p[0] + .5), b.body.y / T - (p[1] + .5)) <= (rad || 2) && Math.abs(b.body.z / T - z) < 3; };
    if (c.have) for (const k in c.have) if (!b || b.bag.real(k) < c.have[k]) return false;
    if (c.crafted) { const cr = ctx.crafting.crafted; if (typeof c.crafted === 'string') { if (!cr[c.crafted]) return false; } else if (Array.isArray(c.crafted)) { if (!c.crafted.every(k => cr[k])) return false; } else for (const k in c.crafted) if ((cr[k] || 0) < c.crafted[k]) return false; }
    if (c.placed) { const objs = ctx.objects.filter(o => o.id === c.placed && (!o.def.fixed)); if (c.at) { const p = P[c.at]; if (!objs.some(o => Math.hypot(o.x - p[0], o.y - p[1]) <= (c.radius || 1.5))) return false; } else if (!objs.some(o => !ctx.town.planted || ctx.town.inBorder(o.x, o.y))) return false; }
    if (c.room) { if (!ctx.rooms.has(c.room, c.felt ? (r => r.felt) : null)) return false; }
    if (c.level && ctx.town.level < c.level) return false;
    if (c.talk && !ignoreTalk && !(s.talked && s.talked[c.talk])) return false;
    if (c.killed) for (const k in c.killed) if (((ctx.combat.kills[k] || 0) - (s.base[k] || 0)) < c.killed[k]) return false;
    if (c.at && !c.placed && !at(c.at, c.radius)) return false;
    if (c.pattern && !(ctx.town.pattern && ctx.town.pattern.id === c.pattern && ctx.town.pattern.done) && !(c.pattern === 'hall' && ctx.town.hallDone)) return false;
    if (c.flag && !ctx.flags[c.flag]) return false;
    if (c.boss && !ctx.flags['boss_' + c.boss]) return false;
    if (c.placedInTown) { const now = this._placedInTown(); for (const k in c.placedInTown) if ((now[k] || 0) < c.placedInTown[k]) return false; }
    return true;
  }
  update(dt, force) {
    this._t -= dt; if (this._t > 0 && !force) return; this._t = 1;
    const ctx = this.ctx;
    for (const q of DQ.QUESTS) {
      const s = this.st(q.id);
      if (s.state === 'locked' && this._avail(q) && (q.auto || q.giver === 'granny')) this.accept(q.id);
      if (s.state === 'locked' && q.id === 's1' && this._avail(q) && ctx.flags.lintCampSeen) this.accept('s1');
      if (s.state !== 'active') continue;
      let guard = 0;
      while (s.step < q.steps.length && guard++ < 10 && this._cond(q, q.steps[s.step].done)) {
        s.step++; ctx.events.emit('questStep', { id: q.id, step: s.step });
        if (s.step < q.steps.length) { ctx.audioX && ctx.audioX.sfx('questStep'); }
      }
      if (s.step >= q.steps.length) { if (q.auto || q.giver === 'granny' || q.giver === 'lintwickSign' || q.id === 'm13' || q.id === 'm14' || q.steps[q.steps.length - 1].done.talk) this.complete(q.id); else { s.state = 'turnin'; ctx.hud && ctx.hud.hint('Talk to ' + DQ.NPCS[q.giver].name + ' to finish "' + q.title + '".'); } }
    }
  }
  complete(id) {
    const q = DQ.quest(id), s = this.st(id), ctx = this.ctx; if (s.state === 'done') return;
    s.state = 'done'; const r = q.reward || {};
    if (r.items && ctx.builder) for (const k in r.items) ctx.builder.take(k, r.items[k], { quiet: true });
    if (r.notions) for (const n of r.notions) ctx.crafting.know(n);
    if (r.flags) Object.assign(ctx.flags, r.flags);
    if (r.flags && r.flags.spin && ctx.builder) ctx.builder.spinUnlocked = true;
    if (ctx.crafting) ctx.crafting.trigger('quest', id);
    if (r.cheer) ctx.town.addCheer(r.cheer, 'quest');
    ctx.hud && ctx.hud.popup('Quest complete!', q.title); ctx.audioX && ctx.audioX.jingle('quest');
    ctx.events.emit('questDone', { id });
  }
  // the current objective of the first tracked quest (main first): { q, step, text, target: [x, y, z] | null }
  objective() {
    const ctx = this.ctx; if (ctx.game.settings.dqTracker === false) return null;
    const qs = DQ.QUESTS.filter(q => (this.st(q.id).state === 'active' || this.st(q.id).state === 'turnin') && this.track[q.id] !== false).sort((a, b) => (a.side ? 1 : 0) - (b.side ? 1 : 0));
    const q = qs[0]; if (!q) return null; const s = this.st(q.id);
    if (s.state === 'turnin') { const n = ctx.npcs && ctx.npcs.get(q.giver); return { q, text: 'Talk to ' + DQ.NPCS[q.giver].name, target: n ? [n.body.x, n.body.y, n.body.z + 30] : null }; }
    const st = q.steps[s.step]; if (!st) return null;
    return { q, step: s.step, text: st.text, target: this.markTarget(st.mark) };
  }
  markTarget(m) {
    if (!m) return null; const ctx = this.ctx, w = ctx.world, P = DQ.WORLD.poi, b = ctx.builder;
    const cz = (x, y) => w.topZ(x, y);
    if (P[m]) { const p = P[m]; return [(p[0] + .5) * T, (p[1] + .5) * T, ((p[2] === null ? cz(p[0], p[1]) : p[2]) + 1) * T]; }
    if (m.startsWith('npc:')) { const n = ctx.npcs.get(m.slice(4)); return n ? [n.body.x, n.body.y, n.body.z + 32] : null; }
    if (m === 'lintling') { const mm = ctx.monsters.list.find(q => !q.dead && q.id === 'lintling'); return mm ? [mm.body.x, mm.body.y, mm.body.z + 20] : null; }
    if (m === 'pattern') { const p = ctx.town.pattern; return p ? [(p.x + 5) * T, (p.y + 4) * T, (p.z + 2) * T] : null; }
    if (m === 'buttons') { const left = ctx.objects.filter(o => o.id === 'ancientButton'); if (!left.length || !b) return null; left.sort((a, c) => Math.hypot(a.x - b.body.x / T, a.y - b.body.y / T) - Math.hypot(c.x - b.body.x / T, c.y - b.body.y / T)); const o = left[0]; return [(o.x + .5) * T, (o.y + .5) * T, (o.z + 1) * T]; }
    if (!b) return null;
    // the nearest matching plant, block or object within 40 blocks (scanned once a second)
    if (this._mk && this._mk.m === m && ctx.game.time - this._mk.t < 1) return this._mk.p;
    let best = null, bd = 40 * T; const bx = b.body.x, by = b.body.y;
    if (m.startsWith('plant:') || m.startsWith('obj:')) { const id = m.split(':')[1]; for (const o of ctx.objects.list) { if (o.id !== id) continue; const d = Math.hypot((o.x + .5) * T - bx, (o.y + .5) * T - by); if (d < bd) { bd = d; best = [(o.x + .5) * T, (o.y + .5) * T, (o.z + 1) * T]; } } }
    else { const key = m === 'nearestEarth' ? 'earth' : m.split(':')[1], id = DQ.blockId(key), cx = Math.floor(bx / T), cy = Math.floor(by / T); for (let r = 0; r < 40 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = cx + dx, y = cy + dy, t = w.topZ(x, y); for (let z = Math.max(1, t - 3); z < t; z++) if (w.get(x, y, z) === id && (!w.solidAt(x, y, z + 1) || !w.solidAt(x + 1, y, z) || !w.solidAt(x, y + 1, z))) { best = [(x + .5) * T, (y + .5) * T, (z + 1) * T]; break; } } }
    this._mk = { m, t: ctx.game.time, p: best }; return best;
  }
  // a story beat (dev mode and tests): set quests up to a point consistently
  serialize() { return { s: JSON.parse(JSON.stringify(this.s)), track: Object.assign({}, this.track) }; }
  load(d) { this.s = d.s || {}; this.track = d.track || {}; }
}
DQ.Quests = Quests;

// ---------------- CUTSCENES ----------------
// each is { run: generator(ctx), apply(ctx) } : apply sets the end state (skipping and tests call it)
DQ.CUTSCENES = {
  wake: {
    *run(ctx) { ctx.blackout = 1; yield .6; yield ctx.game.tween(ctx, { blackout: 0 }, 1.2); yield* say(ctx, DQ.LINES.wake, 'granny'); },
    apply(ctx) { ctx.blackout = 0; }
  },
  exit: {
    *run(ctx) { const b = ctx.builder.body; yield* pan(ctx, [b.x, b.y, b.z], [72.5 * T, 70 * T, 10 * T], 2); yield* say(ctx, DQ.LINES.exit, 'granny'); yield* pan(ctx, null, [b.x, b.y, b.z], 1.2); },
    apply(ctx) { ctx.camFocus = null; }
  },
  plantBanner: {
    *run(ctx) {
      const t = ctx.town, x = (t.bx + .5) * T, y = (t.by + .5) * T, z = t.bz * T;
      yield* pan(ctx, null, [x, y, z + 20], .8); ctx.game.particles.ring(x, y, 4, 120, '#ffd870', .9); ctx.audioX && ctx.audioX.jingle('level'); ctx.game.particles.glints(x, y, z + 40, 30, '#ffd870');
      t.radiusShown = 0; yield 1.4;
      ctx.hud && ctx.hud.banner('Thimbleton has been founded!');
      yield* say(ctx, DQ.LINES.planted.slice(0, 2), 'granny');
      if (!ctx.npcs.get('wren')) ctx.npcs.arrive('wren', { quiet: true });
      const wren = ctx.npcs.get('wren'); yield* pan(ctx, null, [wren.body.x, wren.body.y, wren.body.z + 10], 1);
      yield 1.5; yield* say(ctx, ['Hello? Is someone there? I saw a light!'], 'wren');
      yield* say(ctx, DQ.LINES.planted.slice(2), 'granny');
      yield* pan(ctx, null, null, .8);
    },
    apply(ctx) { ctx.camFocus = null; if (!ctx.npcs.get('wren')) ctx.npcs.arrive('wren', { quiet: true }); ctx.crafting.know('bench', true); ctx.crafting.know('latticeDoor', true); }
  },
  arrival: {
    *run(ctx, id) { const n = ctx.npcs.arrive(id, { quiet: true }); ctx.hud && ctx.hud.banner(n.name + ' has moved into Thimbleton!'); ctx.audioX && ctx.audioX.jingle('arrive'); yield* pan(ctx, null, [n.body.x, n.body.y, n.body.z + 10], 1.2); yield 1.6; const line = { mortimer: ['Hmph. Another dreamer. ...Is that a BED?'], marigold: ['Is that a TABLE? I could weep!'], professor: ['Fascinating! A functioning door!'] }[id] || ['Hello!']; yield* say(ctx, line, id); yield* pan(ctx, null, null, .8); },
    apply(ctx, id) { ctx.camFocus = null; ctx.npcs.arrive(id, { quiet: true }); }
  },
  levelUp: {
    *run(ctx) { const t = ctx.town, x = (t.bx + .5) * T, y = (t.by + .5) * T, z = t.bz * T; yield* pan(ctx, null, [x, y, z + 20], .8); ctx.audioX && ctx.audioX.jingle('level'); ctx.game.particles.ring(x, y, 4, t.radius * T, '#ffd870', 1); DQ.FX.confetti(ctx, x, y, z + 50, 50); ctx.hud && ctx.hud.levelUp(t.level); yield 3; yield* pan(ctx, null, null, .8); },
    apply(ctx) { ctx.camFocus = null; }
  },
  spinDemo: {
    *run(ctx) { const m = ctx.npcs.get('mortimer'); if (m) { m.anim = new E.Attack('spin'); m.anim.start(); ctx.game.particles.ring(m.body.x, m.body.y, 4, 26, '#f1e6c8', .3); } yield .6; ctx.hud && ctx.hud.popup('Spin Stitch learned!', 'Hold {btn:swing}, then let go.'); yield 1; },
    apply(ctx) { if (ctx.builder) ctx.builder.spinUnlocked = true; }
  },
  buttonsIntro: {
    *run(ctx, m) { yield* pan(ctx, null, [m.body.x, m.body.y, m.body.z + 30], 1); m.awake = true; ctx.game.shake(6); ctx.game.particles.bits(m.body.x, m.body.y, m.body.z + 10, 24, ['#e8c040', '#c8a878', '#f8f4ec']); ctx.audioX && ctx.audioX.sfx('roar'); yield .8; yield* say(ctx, DQ.LINES.buttonsIntro, 'buttonsworth'); yield* pan(ctx, null, null, .6); },
    apply(ctx, m) { if (m) m.awake = true; ctx.camFocus = null; }
  },
  gateRip: {
    *run(ctx) {
      const w = ctx.world, g = w.gate || []; yield* pan(ctx, null, [99.5 * T, 113.5 * T, 12 * T], .8); yield* say(ctx, DQ.LINES.gate, 'granny');
      const cols = [...new Set(g.map(c => c[2]))].sort((a, b) => b - a);
      for (const z of cols) { for (const c of g.filter(q => q[2] === z)) if (w.get(...c)) { w.set(...c, 0, { silent: true }); ctx.game.particles.bits((c[0] + .5) * T, (c[1] + .5) * T, (c[2] + .5) * T, 6, ['#2a1a3a', '#6a4a8a', '#f1e6c8']); } ctx.audioX && ctx.audioX.sfx('rip'); yield .25; }
      ctx.flags.gateCut = true; yield* pan(ctx, null, null, .8);
    },
    apply(ctx) { for (const c of ctx.world.gate || []) ctx.world.set(...c, 0, { silent: true }); ctx.flags.gateCut = true; ctx.camFocus = null; }
  },
  thread: {
    *run(ctx) { yield* say(ctx, DQ.LINES.thread, 'granny'); ctx.frayvern = 1; ctx.audioX && ctx.audioX.sfx('roar'); yield ctx.game.tween(ctx, { frayvern: 2 }, 1.2); yield* say(ctx, DQ.LINES.frayvern, 'frayvern'); yield ctx.game.tween(ctx, { frayvern: 0 }, 1); ctx.game.shake(4); ctx.audioX && ctx.audioX.sfx('roar'); yield* say(ctx, DQ.LINES.roar, 'granny'); },
    apply(ctx) { ctx.frayvern = 0; }
  },
  gnarlIntro: {
    *run(ctx, m) { yield* pan(ctx, null, [m.body.x, m.body.y, m.body.z + 40], 1.2); m.roar = 1.4; ctx.game.shake(8); ctx.audioX && ctx.audioX.sfx('roar'); yield 1; yield* say(ctx, DQ.LINES.gnarlIntro, 'gnarlgrim'); yield* pan(ctx, null, null, .8); },
    apply(ctx) { ctx.camFocus = null; }
  },
  finale: {
    *run(ctx) {
      const t = ctx.town, x = (t.bx + .5) * T, y = (t.by + .5) * T, z = t.bz * T;
      yield* say(ctx, DQ.LINES.gnarlDefeat, 'gnarlgrim');
      yield* pan(ctx, null, [x, y, z + 30], 1.2); ctx.game.particles.glints(x, y, z + 40, 40, '#ffd84a'); ctx.audioX && ctx.audioX.jingle('victory'); yield 1;
      // the Rift re-stitches ring by ring
      for (let r = 4; r >= 0; r--) { DQ.restitchRing(ctx, r); ctx.audioX && ctx.audioX.sfx('stitch'); yield .3; }
      ctx.flags.bossBeaten = true; if (t.level < 5) { t.cheer = Math.max(t.cheer, DQ.LEVELS[5].cheer); t.level = 5; ctx.events.emit('townLevel', { level: 5, silent: true }); }
      ctx.hud && ctx.hud.levelUp(5); ctx.party = 14;
      for (let i = 0; i < 6; i++) { DQ.FX.firework(ctx, x + (DQ.fx() - .5) * 120, y + (DQ.fx() - .5) * 120, z + 80); yield .35; }
      for (const n of ctx.npcs.list) { n.state = 'dance'; n.emote('heart', 6); }
      ctx.builder.take('pie', 1, { quiet: true });
      yield* say(ctx, ["Pies for everyone! Hearty Pies! Made with love and too much butter!"], 'marigold');
      yield* say(ctx, DQ.LINES.finale, 'granny');
      yield 1; ctx.flags.chapterClear = true; ctx.events.emit('chapterClear', {});
    },
    apply(ctx) { for (let r = 4; r >= 0; r--) DQ.restitchRing(ctx, r); ctx.flags.bossBeaten = true; const t = ctx.town; if (t.level < 5) { t.level = 5; t.cheer = Math.max(t.cheer, 450); } const was = ctx.flags.chapterClear; ctx.flags.chapterClear = true; ctx.camFocus = null; if (!was) ctx.events.emit('chapterClear', {}); }
  },
  lintwickFree: {
    *run(ctx) { const n = ctx.npcs.get('lintwick'); yield* say(ctx, DQ.LINES.lintwickFree, 'lintwick'); if (n) n.follow = ctx.builder; },
    apply(ctx) { const n = ctx.npcs.get('lintwick'); if (n) n.follow = ctx.builder; }
  }
};
function* say(ctx, lines, who) { let done = false; ctx.talk.say(lines, { who, onDone: () => { done = true; } }); yield E.until(() => done); }
function* pan(ctx, from, to, s) {
  const b = ctx.builder.body, f = ctx.camFocus || { x: from ? from[0] : b.x, y: from ? from[1] : b.y, z: from ? from[2] : b.z + 14 };
  ctx.camFocus = f; const tgt = to || [b.x, b.y, b.z + 14];
  yield ctx.game.tween(f, { x: tgt[0], y: tgt[1], z: tgt[2] }, s, { ease: 'inOutSine' });
  if (!to) ctx.camFocus = null;
}
DQ.restitchRing = (ctx, r) => { const w = ctx.world, [cx, cy] = DQ.WORLD.poi.riftCenter; for (let y = cy - 5; y <= cy + 5; y++) for (let x = cx - 5; x <= cx + 5; x++) { const d = Math.hypot(x - cx, y - cy); if (d >= r - .5 && d < r + .7 && w.topZ(x, y) === 0) { w.set(x, y, 0, 1, { silent: true }); for (let z = 1; z < 9; z++) w.set(x, y, z, z === 8 ? 3 : z > 5 ? 2 : 6, { silent: true }); ctx.game.particles.glints((x + .5) * T, (y + .5) * T, 9 * T, 2, '#f1e6c8'); } } };
DQ.FX.confetti = (ctx, x, y, z, n) => { const cols = ['#d04a4a', '#4a6ad0', '#e8c040', '#5aa04a', '#a050c0', '#f1e6c8']; ctx.game.particles.bits(x, y, z, Math.round(n * (ctx.game.reduceMotion ? .4 : 1)), cols); };
DQ.FX.firework = (ctx, x, y, z) => { ctx.game.particles.explosion(x, y, z, .8, { debris: false, freeze: false, shake: 0 }); DQ.FX.confetti(ctx, x, y, z, 20); ctx.audioX && ctx.audioX.sfx('firework'); };

class Cutscenes {
  constructor(ctx) { this.ctx = ctx; this.cur = null; this.skipT = 0; this.queue = []; }
  play(id, arg) {
    const c = DQ.CUTSCENES[id]; if (!c) return;
    if (this.cur) { this.queue.push([id, arg]); return; }
    const ctx = this.ctx; this.cur = { id, arg, c };
    ctx.cutscene = this.cur;
    this.cur.script = ctx.game.script(function* () { yield* c.run(ctx, arg); });
    ctx.events.emit('cutscene', { id });
  }
  update(dt) {
    const cur = this.cur; if (!cur) { if (this.queue.length) this.play(...this.queue.shift()); return; }
    const I = this.ctx.game.input;
    if (I.down('cancel') || I.down('interact') || I.held.has('Mouse2')) this.skipT += dt; else this.skipT = 0;
    if (this.skipT >= 1 || this.ctx.skipCutscenes) { this.skip(); return; }
    if (cur.script.done) this._end();
  }
  skip() { const cur = this.cur; if (!cur) return; cur.script.cancel(); this.ctx.talk.cur = null; this.ctx.talk.q = []; cur.c.apply(this.ctx, cur.arg); this.ctx.blackout = 0; this._end(); }
  _end() { const ctx = this.ctx; const id = this.cur.id; this.cur = null; ctx.cutscene = null; ctx.camFocus = null; this.skipT = 0; ctx.events.emit('cutsceneDone', { id }); }
}
DQ.Cutscenes = Cutscenes;

// ---------------- USING OBJECTS ----------------
DQ.useObject = (ctx, o, b) => {
  const d = o.def, ui = ctx.ui;
  if (d.station) { ui && ui.open('craft', { station: d.station, obj: o }); return true; }
  if (d.chest) { ui && ui.open('chest', { obj: o }); return true; }
  if (d.bed) return DQ.trySleep(ctx, b);
  if (d.ballista) {
    if (o.broken) { if (b.bag.count('planks') >= 2) { b.bag.remove('planks', 2); o.broken = false; o.hp = d.ballista; ctx.hud && ctx.hud.hint('Ballista repaired!'); ctx.audioX && ctx.audioX.sfx('craft'); } else ctx.hud && ctx.hud.hint('Repair it with 2 Planks.'); return true; }
    if (ctx.siege && !ctx.siege.active && ctx.mode !== 'bee' && !(ctx.monsters && ctx.monsters.list.some(m => !m.dead))) { ctx.hud && ctx.hud.hint('Nothing to shoot at. Man it during a siege!'); }
    o.manned = true; b.seat = o; ctx.audioX && ctx.audioX.sfx('ballistaReload'); ctx.hud && ctx.hud.hint('{btn:swing} Fire   {btn:move} Aim   {btn:interact} Get off'); return true;
  }
  if (d.portal) { ctx.objects.discover(o.portalId); ui && ui.open('travel', { from: o }); return true; }
  if (d.banner) { ui && ui.open('banner', {}); return true; }
  if (d.bundle) { for (const k in o.contents || {}) b.take(k, o.contents[k], { quiet: true }); ctx.objects.remove(o); ctx.hud && ctx.hud.hint('You picked up your Lost Bundle.'); ctx.audioX && ctx.audioX.sfx('pickup'); ctx.flags.lostBundle = null; return true; }
  if (d.collect) { b.take(d.collect, 1); ctx.objects.remove(o); ctx.audioX && ctx.audioX.jingle('item'); ctx.hud && ctx.hud.popup('You got ' + DQ.ITEMS[d.collect].name + '!', DQ.ITEMS[d.collect].desc); ctx.events.emit('collected', { id: d.collect, obj: o }); return true; }
  if (d.supply) {
    const now = ctx.game.time, k = 'supply' + b.id; if (now - (ctx[k] || -999) < 60) { ctx.hud && ctx.hud.hint('The crate is empty. Come back in ' + Math.ceil(60 - (now - ctx[k])) + ' s.'); return true; }
    ctx[k] = now; b.take('planks', 10); if (!ctx['lint' + b.id]) { ctx['lint' + b.id] = 1; b.take('lint', 2); b.take('branch', 2); } ctx.audioX && ctx.audioX.sfx('pickup'); return true;
  }
  if (o.id === 'cage') { ctx.talk.say(DQ.LINES.lintwickCage, { who: 'lintwick' }); ctx.flags.lintCampSeen = true; return true; }
  if (d.seat) { ctx.hud && ctx.hud.hint('A fine stool. Residents sit here at supper.'); return true; }
  return false;
};
DQ.trySleep = (ctx, b) => {
  const c = ctx.clock; if (!c.isNight && !(c.hour >= 19 || c.hour < 5)) { ctx.talk.say(DQ.LINES.notbedtime, { who: 'granny' }); return true; }
  if (ctx.monsters.list.some(m => !m.dead && Math.hypot(m.body.x - b.body.x, m.body.y - b.body.y) < 8 * T)) { ctx.talk.say(DQ.LINES.monstersNear, { who: 'granny' }); return true; }
  if (ctx.siege && ctx.siege.active) { ctx.hud && ctx.hud.hint('No time to sleep now!'); return true; }
  ctx.sleeping = 2.6; b.sleeping = true; ctx.audioX && ctx.audioX.jingle('zzz');
  ctx.game.after(1.3, () => { c.sleep(); b.hp = b.maxHp; b.belly = Math.max(0, b.belly - 10); ctx.events.emit('slept', {}); });
  ctx.game.after(2.6, () => { b.sleeping = false; ctx.sleeping = 0; ctx.save && ctx.save.auto('slept'); ctx.audioX && ctx.audioX.jingle('morning'); });
  return true;
};
})();
