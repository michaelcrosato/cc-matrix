// Story: the dialog box (a stitched Dragon Quest-style box, typed text with per-letter Animalese voices, portraits,
// choices), the quest director (steps advance on events), what interact does, and the cutscenes (skippable: each has an
// apply() that sets its end state).
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
// ================================================================ the dialog box
class Talk {
  constructor(ctx) { this.ctx = ctx; this.q = []; this.cur = null; this.shown = 0; this.page = 0; this.choice = 0; this.blipI = 0; }
  get open() { return !!this.cur; }
  get modal() { return !!this.cur && this.cur.modal !== false; }
  say(who, pages, o = {}) {
    const sp = DQ.SPEAKERS[who] || {}, npc = this.ctx.npcs && this.ctx.npcs.get(who);
    const name = o.name || sp.name || (npc ? npc.name : (DQ.NPCS[who] ? DQ.NPCS[who].name : ''));
    const item = { who, name, gold: !!sp.gold || who === 'granny', pages: [], choices: o.choices || null, onChoice: o.onChoice || null, onDone: o.onDone || null, auto: o.auto || 0, modal: o.modal !== false, wait: 0 };
    for (const p of [].concat(pages)) { const lines = DQ.wrapText(DQ.safe(p).replace(/\{name\}/g, this.ctx.builder ? this.ctx.builder.name : 'Patch'), 282); for (let i = 0; i < lines.length; i += 3) item.pages.push(lines.slice(i, i + 3)); }
    if (!item.pages.length) item.pages.push(['']);
    if (this.cur) this.q.push(item); else this.begin(item);
    if (npc) npc.talking = item.modal;
    return item;
  }
  begin(item) { this.cur = item; this.page = 0; this.shown = 0; this.choice = 0; this.wait = 0; this.ctx.events.emit('talkOpen', { who: item.who }); }
  get pageText() { return this.cur.pages[this.page].join('\n'); }
  get typing() { return this.shown < this.pageText.replace(/\n/g, '').length; }
  speed() { const s = DQ.game.settings.textSpeed || 'Normal'; return s === 'Slow' ? 28 : s === 'Fast' ? 95 : 50; }
  close() {
    const it = this.cur; if (!it) return; const npc = this.ctx.npcs && this.ctx.npcs.get(it.who); if (npc) npc.talking = false;
    this.cur = null; if (this.q.length) this.begin(this.q.shift()); DQ.game.input.consumeAll && DQ.game.input.consumeAll();
    if (it.choices && it.onChoice) it.onChoice(this.choice, it.choices[this.choice]); if (it.onDone) it.onDone();
  }
  closeAll() { this.q.length = 0; while (this.cur) { const it = this.cur; this.cur = null; const npc = this.ctx.npcs && this.ctx.npcs.get(it.who); if (npc) npc.talking = false; if (it.onDone) it.onDone(); } }
  /** returns true while a modal box is open */
  update(dt, I = DQ.game.input) {
    const it = this.cur; if (!it) return false;
    const len = this.pageText.replace(/\n/g, '').length, prev = Math.floor(this.shown);
    this.shown = Math.min(len, this.shown + this.speed() * dt);
    const flat = this.pageText.replace(/\n/g, '');
    for (let k = prev; k < Math.floor(this.shown); k++) if (DQ.AudioX) DQ.AudioX.voice(it.who, flat[k], k, flat);
    const last = this.page >= it.pages.length - 1, asking = last && it.choices && !this.typing;
    if (it.auto && !it.choices && !this.typing) { this.wait += dt; if (this.wait >= it.auto) { this.wait = 0; if (last) this.close(); else { this.page++; this.shown = 0; } } return it.modal && !!this.cur; }
    if (!it.modal) return false;
    const box = this.box(), c = I.clicked ? I.clicked() : null;
    if (asking) {
      if (I.repeat('up', .3, .1)) { this.choice = (this.choice + it.choices.length - 1) % it.choices.length; DQ.sfx('uiMove'); }
      if (I.repeat('down', .3, .1)) { this.choice = (this.choice + 1) % it.choices.length; DQ.sfx('uiMove'); }
      const p = I.lastDevice === 'mouse' && I.pointer ? I.pointer() : null, cb = this.cbox(box);
      const row = q => q && q[0] >= cb.x && q[0] < cb.x + cb.w && q[1] >= cb.y && q[1] < cb.y + cb.h ? E.clamp(Math.floor((q[1] - cb.y - 4) / 12), 0, it.choices.length - 1) : -1;
      const hv = row(p); if (hv >= 0 && hv !== this.choice) { this.choice = hv; DQ.sfx('uiMove'); }
      if (row(c) >= 0) { this.choice = row(c); DQ.sfx('uiConfirm'); this.close(); return true; }
    }
    const tapped = c && c[1] >= box.y - 14;
    if (I.pressed('ok') || I.pressed('interact') || tapped) {
      if (this.typing) this.shown = len;
      else if (!last) { this.page++; this.shown = 0; DQ.sfx('uiTick', { vol: .3 }); }
      else { DQ.sfx('uiConfirm', { vol: .4 }); this.close(); }
    }
    return true;
  }
  box() { const G = DQ.game, W = G.W, H = G.H, w = Math.min(W - 16, 352), h = 52, top = this.cur && this.cur.modal === false; return { x: Math.round((W - w) / 2), y: top ? 62 : H - h - 10, w, h }; }
  cbox(b) { const it = this.cur, w = Math.max(...it.choices.map(c => E.font.width(DQ.safe(c)))) + 24, h = it.choices.length * 12 + 7; return { x: b.x + b.w - w - 4, y: b.y - h - 4, w, h }; }
  draw(r) {
    const it = this.cur; if (!it) return;
    r.overlay(g => {
      const b = this.box(), gold = it.gold, border = gold ? '#e8c040' : '#f1e6c8', col = gold ? '#ffe9a0' : '#ffffff';
      DQ.Hud.panel(g, b.x, b.y, b.w, b.h, { gold });
      const pp = 44, py = b.y + 4; let tx = b.x + 10;
      if (it.who && it.who !== 'builder' && it.who !== 'sign') { DQ.Hud.portrait(g, this.ctx, it.who, b.x + 4, py, pp); tx = b.x + pp + 12; }
      if (it.name) { const nw = E.font.width(it.name) + 14; DQ.Hud.panel(g, tx - 4, b.y - 12, nw, 15, { gold }); E.font.text(g, it.name, tx + 3, b.y - 8, gold ? '#ffe070' : '#ffd36a', { outline: false, shadow: '#05040a' }); }
      let left = Math.floor(this.shown);
      it.pages[this.page].forEach((line, k) => { const s = line.slice(0, Math.max(0, left)); left -= line.length; if (s) E.font.text(g, s, tx, b.y + 7 + k * 14, col, { outline: false, shadow: '#05040a' }); });
      const last = this.page >= it.pages.length - 1;
      if (!this.typing && !(last && it.choices) && !it.auto) { const yy = b.y + b.h - 8 + (Math.floor(DQ.game.real * 3) % 2); px.poly(g, [[b.x + b.w - 14, yy], [b.x + b.w - 8, yy], [b.x + b.w - 11, yy + 3]], border); }
      if (last && it.choices && !this.typing) {
        const c = this.cbox(b); DQ.Hud.panel(g, c.x, c.y, c.w, c.h, { gold });
        it.choices.forEach((ch, k) => { const sel = k === this.choice; E.font.text(g, DQ.safe(ch), c.x + 16, c.y + 5 + k * 12, sel ? '#ffd36a' : '#ffffff', { outline: false, shadow: '#05040a' }); if (sel) E.font.text(g, '▸', c.x + 6 + (Math.floor(DQ.game.real * 4) % 2), c.y + 5 + k * 12, '#ffd36a', { outline: false }); });
      }
    });
  }
}
DQ.Talk = Talk;

// ================================================================ the quest director
class Quests {
  constructor(ctx) { this.ctx = ctx; this.s = {}; for (const id of DQ.QUEST_ORDER) this.s[id] = { status: 'locked', step: 0, counts: {}, track: true }; this.t = 0; this.hinted = {}; this.lastScene = null; }
  q(id) { return DQ.QUESTS[id]; }
  st(id) { return this.s[id]; }
  done(id) { return this.s[id] && this.s[id].status === 'done'; }
  active(id) { return this.s[id] && this.s[id].status === 'active'; }
  wire() {
    const ev = this.ctx.events, chk = () => { this.dirty = true; };
    for (const n of ['itemGained', 'crafted', 'objectPlaced', 'roomFormed', 'townLevel', 'monsterKilled', 'patternDone', 'flag', 'siegeDone', 'bossDefeated', 'blockPlaced', 'roomLost', 'npcArrived']) ev.on(n, chk);
    ev.on('crafted', e => { for (const id in this.s) { const s = this.s[id]; if (s.status === 'active') s.counts['c:' + e.id] = (s.counts['c:' + e.id] || 0) + e.n; } });
    ev.on('monsterKilled', e => { for (const id in this.s) { const s = this.s[id]; if (s.status === 'active') s.counts['k:' + e.kind] = (s.counts['k:' + e.kind] || 0) + 1; } });
    ev.on('blockPlaced', e => { const t = this.ctx.town; if (!t || !t.inside(e.x, e.y) || !e.id) return; const k = DQ.BLOCKS[e.id].key; for (const id in this.s) { const s = this.s[id]; if (s.status === 'active') s.counts['t:' + k] = (s.counts['t:' + k] || 0) + 1; } });
    ev.on('objectPlaced', e => { if (this.ctx.crafting) this.ctx.crafting.trigger('placed', e.id); if (e.id === 'torch') { const m = this.ctx.poi && this.ctx.poi.tunnelMark; if (m && Math.abs(e.x - m.x) <= 1 && Math.abs(e.y - m.y) <= 1 && e.z === m.L) this.setFlag('tunnelLit'); } });
    ev.on('blockBroken', e => { if (e.id === DQ.blockId('knot') && e.x >= 99 && e.x <= 100 && e.y >= 111 && e.y <= 115 && !this.ctx.flags.gateCut) { this.setFlag('gateCut'); DQ.Cutscenes.play(this.ctx, 'gate'); } });
  }
  setFlag(k, v = true) { this.ctx.flags[k] = v; this.ctx.events.emit('flag', { k, v }); if (this.ctx.crafting) this.ctx.crafting.trigger('flag', k); this.dirty = true; }
  /** is a condition met for quest s? */
  cond(c, s, id) {
    const ctx = this.ctx, b = ctx.builder, bag = b.bag;
    if (c.have) for (const k in c.have) if (bag.count(k) < c.have[k]) return false;
    if (c.crafted) { const list = typeof c.crafted === 'string' ? { [c.crafted]: 1 } : Array.isArray(c.crafted) ? Object.fromEntries(c.crafted.map(k => [k, 1])) : c.crafted; for (const k in list) if ((s.counts['c:' + k] || 0) < list[k] && !(s.pre && s.pre['c:' + k])) return false; }
    if (c.placed) { if (!ctx.objects.list.some(o => o.id === c.placed && !o.gone && (!ctx.town.planted || ctx.town.inside(o.x, o.y, 6)))) return false; }
    if (c.room) { if (!ctx.rooms.list.some(r => r.type === c.room && r.inTown && (!c.felt || r.felt))) return false; }
    if (c.level && !c.at) { if (!ctx.town || ctx.town.level < c.level) return false; }
    if (c.talk) { if (!s.talked || s.talked !== c.talk + ':' + s.step) return false; }
    if (c.killed) for (const k in c.killed) if ((s.counts['k:' + k] || 0) < c.killed[k]) return false;
    if (c.at) { const p = ctx.poi[c.at]; if (!p) return false; const r = (c.radius || p.r || 2) * T; if (Math.hypot(b.x - (p.x * T + 8), b.y - (p.y * T + 8)) > r) return false; if (c.level && b.L < c.level - 1) return false; }
    if (c.pattern) { if (!ctx.town.patterns.some(p => p.id === c.pattern && p.done)) return false; }
    if (c.flag) { if (!ctx.flags[c.flag]) return false; }
    if (c.siegeDone) { if (!ctx.flags.siegeDone) return false; }
    if (c.boss) { if (!ctx.flags['boss_' + c.boss]) return false; }
    if (c.placedInTown) for (const k in c.placedInTown) if ((s.counts['t:' + k] || 0) < c.placedInTown[k]) return false;
    return true;
  }
  /** can this quest be offered now? */
  available(id) {
    const qd = this.q(id), ctx = this.ctx;
    if (qd.after && !this.done(qd.after)) return false;
    if (qd.minLevel && (!ctx.town || ctx.town.level < qd.minLevel)) return false;
    if (qd.needNpc && !(ctx.npcs && ctx.npcs.get(qd.needNpc))) return false;
    if (qd.giver !== 'granny' && qd.giver !== 'lintwick' && !qd.auto && !(ctx.npcs && ctx.npcs.get(qd.giver))) return false;
    return true;
  }
  update(dt) {
    if (this.ctx.mode !== 'story') return;
    this.t += dt; if (this.t >= 1) { this.t = 0; this.dirty = true; }
    if (!this.dirty || this.ctx.modal === 'cutscene') return; this.dirty = false;
    for (const id of DQ.QUEST_ORDER) {
      const s = this.s[id], qd = this.q(id);
      if (s.status === 'locked' && this.available(id)) { s.status = 'avail'; if (qd.auto) this.start(id); }
      if (s.status === 'active') this.check(id);
    }
  }
  start(id, o = {}) {
    const s = this.s[id], qd = this.q(id); if (s.status === 'active' || s.status === 'done') return;
    s.status = 'active'; s.step = 0; s.counts = {}; s.talked = null;
    if (qd.start) this.grant(qd.start, id);
    if (this.ctx.crafting) this.ctx.crafting.trigger('quest', id + 'start');
    this.ctx.events.emit('questStart', { id });
    if (!o.quiet && this.ctx.hud) this.ctx.hud.popup('quest', (qd.side ? 'Side quest: ' : 'New quest: ') + qd.title, qd.steps[0].text);
    this.stepStart(id, o.quiet);
    this.check(id);
  }
  stepStart(id, quiet) {
    const s = this.s[id], st = this.q(id).steps[s.step]; if (!st) return;
    s.counts = {}; s.talked = null;
    // credit what was already crafted for 'crafted' steps where the item is in the bag already
    if (st.done.crafted) { s.pre = {}; const list = typeof st.done.crafted === 'string' ? [st.done.crafted] : Array.isArray(st.done.crafted) ? st.done.crafted : Object.keys(st.done.crafted); for (const k of list) { const need = typeof st.done.crafted === 'object' && !Array.isArray(st.done.crafted) ? st.done.crafted[k] : 1; if (this.ctx.builder.bag.count(k) >= need || this.ctx.objects.list.some(o => o.id === k && !o.gone)) s.pre['c:' + k] = true; } }
    if (st.start && DQ.QuestHooks[st.start]) DQ.QuestHooks[st.start](this.ctx);
    if (st.hint && !quiet && !this.hinted[id + st.step]) { this.hinted[id + st.step] = true; this.ctx.say('granny', st.hint, { modal: false, auto: 3.2 }); }
    if (st.tutorial && this.ctx.hud) this.ctx.hud.tutorial(st.tutorial);
    this.ctx.events.emit('questStep', { id, step: s.step });
  }
  check(id) {
    const s = this.s[id], qd = this.q(id);
    for (let guard = 0; guard < 8 && s.status === 'active'; guard++) {
      const st = qd.steps[s.step]; if (!st) break;
      if (!this.cond(st.done, s, id)) break;
      if (st.take) for (const k in st.take) this.ctx.builder.bag.remove(k, st.take[k]);
      s.step++; DQ.sfx('questStep', { vol: .4 });
      if (s.step >= qd.steps.length) { if (qd.giver === 'granny' || qd.autoDone || !qd.done) this.complete(id); else { s.status = 'ready'; if (this.ctx.hud) this.ctx.hud.toast('Report back to ' + DQ.NPCS[qd.giver].name + '!', null, 'report'); } break; }
      if (this.ctx.hud) this.ctx.hud.toast('Next: ' + qd.steps[s.step].text, null, 'step');
      this.stepStart(id);
    }
  }
  complete(id, o = {}) {
    const s = this.s[id], qd = this.q(id); if (s.status === 'done') return;
    s.status = 'done'; s.step = qd.steps.length;
    this.grant(qd.reward, id);
    if (this.ctx.crafting) this.ctx.crafting.trigger('quest', id);
    if (!o.quiet) { DQ.AudioX && DQ.AudioX.jingle('quest'); if (this.ctx.hud) this.ctx.hud.popup('questDone', 'Quest complete!', qd.title); }
    this.ctx.events.emit('questDone', { id });
    if (qd.doneScene && !o.quiet && !o.noScene) DQ.Cutscenes.play(this.ctx, qd.doneScene);
    else if (qd.doneScene && o.quiet) DQ.Cutscenes.end(this.ctx, qd.doneScene, {});
    this.dirty = true;
  }
  grant(r, id) {
    if (!r) return; const ctx = this.ctx, b = ctx.builder;
    if (r.take) for (const k in r.take) b.bag.remove(k, r.take[k]);
    if (r.items) for (const k in r.items) { b.bag.add(k, r.items[k]); if (ctx.hud) ctx.hud.toast('You got ' + (r.items[k] > 1 ? r.items[k] + ' ' : 'the ') + DQ.ITEMS[k].name + '!', k); ctx.events.emit('itemGained', { id: k, n: r.items[k], by: b, reward: true }); if (ctx.crafting) ctx.crafting.trigger('pickup', k); }
    if (r.notions) for (const k of r.notions) ctx.crafting.learn(k);
    if (r.flags) for (const k in r.flags) this.setFlag(k, r.flags[k]);
    if (r.cheer && ctx.town) ctx.town.addCheer(r.cheer, 'quest');
  }
  /** a resident's balloon: ! an offer, ? a report */
  balloonFor(npc) {
    for (const id of DQ.QUEST_ORDER) { const s = this.s[id], qd = this.q(id); if (qd.giver !== npc) continue; if (s.status === 'ready') return '?'; if (s.status === 'avail' && !qd.auto && !qd.place) return '!'; }
    for (const id of DQ.QUEST_ORDER) { const s = this.s[id], qd = this.q(id); if (s.status !== 'active') continue; const st = qd.steps[s.step]; if (st && st.done.talk === npc && this.cond(Object.assign({}, st.done, { talk: null }), s, id)) return '?'; }
    return null;
  }
  /** talking to a resident: report, offer, a talk step, or idle chatter */
  talkTo(npc) {
    const ctx = this.ctx, id = npc.id;
    for (const qid of DQ.QUEST_ORDER) { const s = this.s[qid], qd = this.q(qid); if (qd.giver === id && s.status === 'ready') { ctx.say(id, qd.done || ['Thank you, Builder!'], { onDone: () => this.complete(qid) }); return; } }
    for (const qid of DQ.QUEST_ORDER) { const s = this.s[qid], qd = this.q(qid); if (s.status !== 'active') continue; const st = qd.steps[s.step]; if (st && st.done.talk === id) { if (this.cond(Object.assign({}, st.done, { talk: null }), s, qid)) { s.talked = id + ':' + s.step; this.dirty = true; if (s.step === qd.steps.length - 1 && qd.done) { if (st.take) for (const k in st.take) ctx.builder.bag.remove(k, st.take[k]); ctx.say(id, qd.done, { onDone: () => { s.step = qd.steps.length; this.complete(qid); } }); return; } this.check(qid); return; } } }
    for (const qid of DQ.QUEST_ORDER) { const s = this.s[qid], qd = this.q(qid); if (qd.giver === id && s.status === 'avail' && !qd.auto) { ctx.say(id, qd.offer || ['Will you help me?'], { choices: ['Of course!', 'Not right now'], onChoice: i => { if (i === 0) { this.start(qid); ctx.say(id, ['Hooray! Thank you, Builder!'], { auto: 1.6, modal: false }); } else ctx.say(id, ['Oh. Well. Come back soon!'], { auto: 1.4, modal: false }); } }); return; } }
    // the siege: Mortimer asks if you're ready
    if (id === 'mortimer' && this.active('M13') && this.s.M13.step === 1) { ctx.say('mortimer', ['Ready, Builder? Once they come, there\'s no stopping them.'], { choices: ['Ready!', 'Not yet'], onChoice: i => { if (i === 0) { this.setFlag('siegeStarted'); DQ.Cutscenes.play(ctx, 'siegeStart'); } else ctx.say('mortimer', ['Hmph. Build some Ballistas. Set some Pin Traps. Then talk to me.'], { auto: 2.4, modal: false }); } }); return; }
    ctx.say(id, [this.idleLine(npc)]);
  }
  idleLine(npc) {
    const ctx = this.ctx, d = npc.def, clock = ctx.clock, lv = ctx.town ? ctx.town.level : 1, b = ctx.builder;
    const ok = c => !c || (c === 'night' && clock.isNight) || (c === 'day' && clock.isDay) || (c === 'lv3' && lv >= 3) || (c === 'belly' && b.belly < 30) || (c === 'unhappy' && npc.mood <= 0) || (c === 'happy' && npc.mood >= 2);
    const pri = d.lines.filter(([c]) => c && ok(c)), any = d.lines.filter(([c]) => !c);
    const pool = pri.length && DQ.h01(npc.talkN = (npc.talkN || 0) + 1, 7) < .65 ? pri : any;
    if (npc.mood <= 0 && !npc.hasFav()) return d.id === 'lintwick' ? d.lines.find(l => l[0] === 'unhappy')[1] : (d.lines.find(l => l[0] === 'unhappy') || any[0])[1];
    return pool[(npc.talkN || 0) % pool.length][1];
  }
  /** the objective shown on the HUD: the first active main quest (or the tracked side quest) */
  current() {
    for (const id of DQ.QUEST_ORDER) { const s = this.s[id], qd = this.q(id); if ((s.status === 'active' || s.status === 'ready') && s.track && !qd.side) return { id, title: qd.title, text: s.status === 'ready' ? 'Report back to ' + DQ.NPCS[qd.giver].name : qd.steps[s.step].text, step: qd.steps[s.step], ready: s.status === 'ready', giver: qd.giver }; }
    for (const id of DQ.QUEST_ORDER) { const s = this.s[id], qd = this.q(id); if ((s.status === 'active' || s.status === 'ready') && s.track) return { id, title: qd.title, text: s.status === 'ready' ? 'Report back to ' + DQ.NPCS[qd.giver].name : qd.steps[s.step].text, step: qd.steps[s.step], ready: s.status === 'ready', giver: qd.giver }; }
    return null;
  }
  /** where the objective marker points: a world point [x, y, z] */
  targetOf(cur) {
    const ctx = this.ctx; if (!cur) return null;
    if (cur.ready) { const n = ctx.npcs.get(cur.giver); return n ? [n.x, n.y, n.z + 30] : null; }
    const t = cur.step && cur.step.target; if (!t) return null;
    if (t.poi) { const p = ctx.poi[t.poi]; return p ? [p.x * T + 8, p.y * T + 8, (p.L || ctx.world.topZ(p.x, p.y)) * T + 4] : null; }
    if (t.npc) { const n = ctx.npcs.get(t.npc); return n ? [n.x, n.y, n.z + 30] : null; }
    if (t.monster) { const m = ctx.monsters.list.find(m => m.kind === t.monster && !m.dead); return m ? [m.x, m.y, m.z + 20] : null; }
    if (t.block || t.plant) {
      if (!this._scanT || ctx.game.real - this._scanT > 1 || this._scanKey !== (t.block || t.plant)) { this._scanT = ctx.game.real; this._scanKey = t.block || t.plant; this._scan = t.block ? this.nearestBlock(DQ.blockId(t.block)) : this.nearestPlant(t.plant); }
      return this._scan;
    }
    return null;
  }
  nearestBlock(id) {
    const w = this.ctx.world, b = this.ctx.builder; let best = null, bd = 1e9;
    for (let dy = -40; dy <= 40; dy += 1) for (let dx = -40; dx <= 40; dx += 1) { const x = b.cx + dx, y = b.cy + dy; if (!w.inside(x, y, 0)) continue; const t = w.topZ(x, y); for (let z = Math.max(1, t - 3); z < t; z++) if (w.get(x, y, z) === id && (!DQ.SOLID[w.get(x, y, z + 1)] || !DQ.SOLID[w.get(x + 1, y, z)] || !DQ.SOLID[w.get(x, y + 1, z)])) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x * T + 8, y * T + 8, z * T + 16]; } } }
    return best;
  }
  nearestPlant(id) { const b = this.ctx.builder; let best = null, bd = 1e9; for (const o of this.ctx.objects.list) if (o.id === id && !o.gone) { const d = DQ.d2(o.x, o.y, b.cx, b.cy); if (d < bd && d < 1600) { bd = d; best = [o.x * T + 8, o.y * T + 8, o.z * T + 12]; } } return best; }
  serialize() { return { s: JSON.parse(JSON.stringify(this.s)), hinted: this.hinted }; }
  load(d) { if (!d) return; for (const id in d.s) if (this.s[id]) this.s[id] = d.s[id]; this.hinted = d.hinted || {}; this.dirty = true; }
  /** jump the story to a beat (dev, tests): quests done up to it, residents, rooms, inventory and level consistent */
  applyBeat(beat) { return DQ.Beats.apply(this.ctx, beat); }
}
DQ.Quests = Quests;

// hooks a step can run when it starts
DQ.QuestHooks = {
  hollowLintling(ctx) { if (!ctx.monsters.list.some(m => m.kind === 'lintling' && m.fixed)) { const m = ctx.monsters.spawn('lintling', 40, 42, 7, { fixed: true }); ctx.hud && ctx.hud.toast('A Lintling bounces into view!', 'lint'); m.target = null; } },
  buttonsworth(ctx) { if (ctx.bosses) ctx.bosses.wakeButtonsworth(); }
};

// ================================================================ interaction
DQ.Interact = {
  /** what interact would do now: { label, act } or null */
  find(ctx, b) {
    const w = ctx.world, c = b.cursor;
    const cand = [];
    // residents: a picked one, or the nearest in front
    const npcs = ctx.npcs ? ctx.npcs.list : [];
    for (const n of npcs) { if (n.hidden || n.sleeping && !ctx.flags.debugTalkSleep) continue; const d = Math.hypot(n.x - b.x, n.y - b.y), a = Math.abs(E.angDiff(b.facing, Math.atan2(n.y - b.y, n.x - b.x))); if ((c.npc === n && d < 60) || (d < 26 && a < 1.6) || d < 14) cand.push([d - (c.npc === n ? 100 : 0), { label: 'Talk to ' + n.name, act: () => { n.facing = Math.atan2(b.y - n.y, b.x - n.x); ctx.quests.talkTo(n); }, ent: n }]); }
    // objects: in the target cell, the picked one, or beside the builder
    const objs = new Set(); if (c.obj) objs.add(c.obj);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const z of [b.L, b.L - 1, b.L + 1]) { const o = w.inside(b.cx + dx, b.cy + dy, z) ? w.objIdx.get(w.idx(b.cx + dx, b.cy + dy, z)) : null; if (o) objs.add(o); }
    for (const o of objs) { const r = DQ.Interact.objAct(ctx, b, o); if (r) { const d = Math.hypot(o.x * T + 8 - b.x, o.y * T + 8 - b.y) + (o === c.obj ? -6 : 0); cand.push([d, r]); } }
    cand.sort((a, b2) => a[0] - b2[0]);
    return cand.length ? cand[0][1] : null;
  },
  objAct(ctx, b, o) {
    const d = o.def, M = DQ.Menus;
    if (d.station) return { label: 'Craft at the ' + d.name, act: () => M.openCraft(ctx, d.station, o) };
    if (d.chest) return { label: 'Open the chest', act: () => M.openChest(ctx, o) };
    if (d.bed) return { label: 'Sleep', act: () => DQ.Interact.sleep(ctx, b, o) };
    if (d.ballista) return o.data.broken ? { label: 'Repair (2 Planks)', act: () => DQ.Interact.repair(ctx, b, o) } : { label: 'Man the Ballista', act: () => ctx.ballista && ctx.ballista.mount(b, o) };
    if (d.portal) return ctx.flags['portal_' + o.data.portal] ? { label: 'Travel', act: () => M.openTravel(ctx, o) } : null;
    if (d.banner) return { label: 'Look at the Banner', act: () => M.openBanner(ctx) };
    if (d.bundle) return { label: 'Pick up your Lost Bundle', act: () => DQ.Interact.bundle(ctx, b, o) };
    if (d.collect) return { label: 'Take the ' + DQ.ITEMS[d.collect].name, act: () => { ctx.objects.remove(o, { by: b }); b.bag.add(d.collect, 1); DQ.AudioX && DQ.AudioX.jingle('item'); ctx.hud.popup('item', 'You found an Ancient Button!', 'That makes ' + b.bag.count('ancientButton') + ' of 3.', d.collect); ctx.events.emit('itemGained', { id: d.collect, n: 1, by: b }); } };
    if (d.pedestal && !ctx.flags.threadTaken) return { label: 'Take the Golden Thread', act: () => { ctx.flags.threadTaken = true; b.bag.add('goldenThread', 1); ctx.events.emit('itemGained', { id: 'goldenThread', n: 1, by: b }); ctx.quests.dirty = true; } };
    if (d.crate) return { label: 'Take Planks', act: () => ctx.bee && ctx.bee.crate(b, o) };
    if (d.cage) return { label: 'Talk to the caged Lintling', act: () => DQ.Interact.cage(ctx) };
    if (d.id === 'sign') return { label: 'Read the sign', act: () => ctx.say('sign', ['THIMBLETON. Pop. 0. (Someone has scratched out the 0 and written "for now!")']) };
    return null;
  },
  sleep(ctx, b, o) {
    const why = ctx.clock.canSleep(b); if (why) { ctx.hud.toast(why, null, 'sleep'); return; }
    DQ.Cutscenes.play(ctx, 'sleep', { bed: o });
  },
  repair(ctx, b, o) { if (!b.bag.remove('planks', 2)) { ctx.hud.toast('You need 2 Planks to repair it!', 'planks'); return; } o.data.broken = false; o.hp = o.def.hp; DQ.sfx('craft'); ctx.hud.toast('The Ballista is good as new!', 'ballista'); },
  bundle(ctx, b, o) { const it = o.data.items || {}; let n = 0; for (const k in it) { b.bag.add(k, it[k]); n += it[k]; } ctx.objects.remove(o, { by: b }); ctx.flags.lostBundle = null; DQ.sfx('pickup'); ctx.hud.toast('You got your things back! (' + n + ' items)', 'lostBundle'); },
  cage(ctx) {
    const qs = ctx.quests;
    if (qs.s.S1.status === 'locked' || qs.s.S1.status === 'avail') { if (ctx.town && ctx.town.level >= 2) { ctx.say('lintwick', DQ.QUESTS.S1.offer, { name: 'Lintwick', choices: ['I\'ll get you out!', 'Not right now'], onChoice: i => { if (i === 0) qs.start('S1'); } }); } else ctx.say('lintwick', ['Lintwick stuck! Lintwick... Lintwick wait for Builder\'s town to grow a bit. Then come back?'], { name: 'Lintling' }); }
    else ctx.say('lintwick', ['Hit cage! Hit it hard! With club! Lintwick believe in Builder!'], { name: 'Lintwick' });
  }
};

// ================================================================ cutscenes
DQ.CUTSCENES = DQ.CUTSCENES || {};
const C = DQ.CUTSCENES;
DQ.Cutscenes = {
  /** play a cutscene: a game.script generator; ctx.modal = 'cutscene' while it runs; hold back to skip (apply sets its end) */
  play(ctx, name, data = {}) {
    const cs = C[name]; if (!cs) return null;
    if (ctx.quiet) { end(ctx, name, data); return null; }
    if (ctx.cutscene) { (ctx.csQueue || (ctx.csQueue = [])).push([name, data]); return null; }
    if (ctx.mode !== 'story' && !cs.anyMode) { end(ctx, name, data); return null; }
    if (DQ.TEST.skipCutscenes) { end(ctx, name, data); ctx.events.emit('cutsceneDone', { name }); return null; }
    const run = { name, data, t: 0, skip: 0, done: false };
    ctx.cutscene = run; ctx.modal = 'cutscene'; ctx.camFocus = null; ctx.events.emit('cutsceneStart', { name });
    run.script = DQ.game.script(function* () { yield* cs.run(ctx, data); run.done = true; });
    return run;
  },
  update(ctx, dt) {
    const run = ctx.cutscene; if (!run) return;
    run.t += dt; const I = DQ.game.input;
    if (cs(run).noSkip !== true && (I.down('back') || I.down('interact') || (I.held && I.held.has('Mouse2')))) { run.skip += dt; if (run.skip >= 1) { run.script && run.script.cancel(); ctx.talk.closeAll(); if (ctx.npcs) for (const n of ctx.npcs.list) n.scripted = false; end(ctx, run.name, run.data); run.done = true; } } else run.skip = Math.max(0, run.skip - dt * 2);
    if (run.done || (run.script && run.script.done)) { ctx.cutscene = null; ctx.modal = null; ctx.camFocus = null; ctx.events.emit('cutsceneDone', { name: run.name }); if (ctx.csQueue && ctx.csQueue.length) { const [n, d] = ctx.csQueue.shift(); DQ.Cutscenes.play(ctx, n, d); } }
  }
};
const cs = run => C[run.name] || {};
/** a cutscene's end state, for a skip or a quiet apply */
const end = (ctx, name, d) => { const c = C[name]; if (c && c.apply) c.apply(ctx, d); };
DQ.Cutscenes.end = (ctx, name, d = {}) => end(ctx, name, d);
/** wait for the dialog to close */
const talkDone = ctx => E.until(() => !ctx.talk.open);
const say = (ctx, who, lines, o) => { ctx.say(who, lines, o); return talkDone(ctx); };
const pan = (ctx, x, y, z, s = 1.2) => { ctx.camFocus = ctx.camFocus || { x: ctx.builder.x, y: ctx.builder.y, z: ctx.builder.z + 14 }; return DQ.game.tween(ctx.camFocus, { x, y, z }, s, { ease: 'inOutSine' }); };
C.wake = {
  *run(ctx) { ctx.flags.dark = true; DQ.game.lights.ambient = 0; yield .8; yield say(ctx, 'granny', DQ.LINES.wake); ctx.flags.dark = false; },
  apply(ctx) { ctx.flags.dark = false; ctx.flags.woke = true; }
};
C.reveal = {
  *run(ctx) { const t = ctx.poi.bannerSpot; yield pan(ctx, 60 * T, 60 * T, 12 * T, 1.6); yield .4; yield pan(ctx, t.x * T, t.y * T, 9 * T, 1.6); yield say(ctx, 'granny', DQ.LINES.reveal); yield pan(ctx, ctx.builder.x, ctx.builder.y, ctx.builder.z + 14, 1); },
};
C.plant = {
  *run(ctx, d) {
    const t = ctx.town; DQ.AudioX && DQ.AudioX.jingle('level');
    yield pan(ctx, t.x * T + 8, t.y * T + 8, t.L * T + 16, .6); yield 1.2;
    DQ.game.particles.ring(t.x * T + 8, t.y * T + 8, 4, 160, '#ffe070', 1.2, t.L * T + 1); DQ.game.flash('#fff0b0', .2, .4); yield 1.4;
    ctx.hud.banner('Thimbleton has been founded!');
    yield say(ctx, 'granny', DQ.LINES.plant.slice(1));
    // Wren walks in along the east road
    if (!ctx.npcs.get('wren')) { const n = ctx.npcs.arrive('wren', { quiet: true }); n.scripted = true; yield pan(ctx, n.x, n.y, n.z + 14, .8); n.scripted = false; n.walker.to(t.x + 2, t.y + 2, t.L); yield E.any([4, () => Math.hypot(n.x - (t.x + 2) * T, n.y - (t.y + 2) * T) < 24]); }
    const n = ctx.npcs.get('wren'); if (n) { yield pan(ctx, n.x, n.y, n.z + 14, .5); yield say(ctx, 'wren', DQ.NPCS.wren.intro); ctx.hud.popup('arrive', 'Wren has moved into Thimbleton!', 'Talk to residents with a ! over their heads.'); DQ.AudioX && DQ.AudioX.jingle('arrive'); }
    yield pan(ctx, ctx.builder.x, ctx.builder.y, ctx.builder.z + 14, .6);
  },
  apply(ctx) { if (!ctx.npcs.get('wren')) { const t = ctx.town; ctx.npcs.add('wren', t.x + 2, t.y + 2, t.L); } }
};
C.arrival = {
  *run(ctx, d) {
    const n = ctx.npcs.get(d.id); if (!n) return; const t = ctx.town;
    yield pan(ctx, n.x, n.y, n.z + 14, 1); n.walker.to(t.x + 1, t.y + 3, t.L); yield E.any([3.5, () => Math.hypot(n.x - (t.x + 1) * T, n.y - (t.y + 3) * T) < 30]);
    yield pan(ctx, n.x, n.y, n.z + 14, .4);
    DQ.AudioX && DQ.AudioX.jingle('arrive');
    yield say(ctx, d.id, DQ.NPCS[d.id].intro);
    arrived(ctx, d); yield pan(ctx, ctx.builder.x, ctx.builder.y, ctx.builder.z + 14, .8);
  },
  apply(ctx, d) { const n = ctx.npcs.get(d.id), t = ctx.town; if (n && t && !d.popped) n.walker.to(t.x + 1, t.y + 3, t.L); arrived(ctx, d); }
};
const arrived = (ctx, d) => { if (d.popped || !DQ.NPCS[d.id]) return; d.popped = true; ctx.hud.popup('arrive', DQ.NPCS[d.id].arrive, 'Their favourite room: ' + (d.id === 'lintwick' ? 'a Bedroom with Felt' : DQ.ROOM[DQ.NPCS[d.id].fav].name) + '.'); };
C.spinDemo = {
  *run(ctx, d) {
    const m = ctx.npcs.get('mortimer'); if (!m) return;
    const dx = m.cx + 2, dy = m.cy, L = ctx.world.topZ(dx, dy), dum = d.dummy = !ctx.objects.at(dx, dy, L) ? ctx.objects.add('dummy', dx, dy, L, 2, { silent: true }) : null;
    yield pan(ctx, m.x, m.y, m.z + 14, .7); m.scripted = true; m.facing = 0;
    yield say(ctx, 'mortimer', DQ.LINES.spinDemo);
    m.atk = new E.Attack('spin', { active: .5 }); m.atk.start(); DQ.sfx('spinRelease'); yield .7; DQ.game.particles.bits(dx * T + 8, dy * T + 8, L * T + 14, 16, ['#e0b850', '#f0d070']); DQ.sfx('rip');
    if (dum) ctx.objects.remove(dum, { silent: true }); d.dummy = null;
    m.scripted = false; spinNote(ctx, d);
    yield pan(ctx, ctx.builder.x, ctx.builder.y, ctx.builder.z + 14, .6);
  },
  apply(ctx, d) { ctx.flags.spinStitch = true; if (d && d.dummy && !d.dummy.gone) ctx.objects.remove(d.dummy, { silent: true }); if (d) d.dummy = null; const m = ctx.npcs.get('mortimer'); if (m) m.scripted = false; spinNote(ctx, d || {}); }
};
const spinNote = (ctx, d) => { if (d.noted) return; d.noted = true; ctx.hud.popup('skill', 'You learned the Spin Stitch!', 'Hold {btn:swing} to charge, release to spin!'); };
C.hallReveal = { *run(ctx) { const p = ctx.npcs.get('professor'); if (p) yield pan(ctx, p.x, p.y, p.z + 14, .8); yield 1; yield pan(ctx, ctx.builder.x, ctx.builder.y, ctx.builder.z + 14, .6); } };   // (camera only: nothing to set when skipped)
C.gate = {
  *run(ctx) {
    yield pan(ctx, 99.5 * T, 113 * T, 11 * T, .6); ctx.say('granny', DQ.LINES.gate, { modal: false, auto: 2 });
    for (let z = 9; z <= 13; z++) { for (let y = 112; y <= 114; y++) for (const x of [99, 100]) if (ctx.world.get(x, y, z) === DQ.blockId('knot')) { ctx.world.set(x, y, z, 0, { silent: true }); DQ.game.particles.bits(x * T + 8, y * T + 8, z * T + 8, 6, ['#2a1a3a', '#6a5a8a', '#f1e6c8']); } DQ.sfx('rip', { pitch: .8 + z * .05 }); yield .25; }
    yield pan(ctx, ctx.builder.x, ctx.builder.y, ctx.builder.z + 14, .6);
  },
  apply(ctx) { for (let z = 9; z <= 13; z++) for (let y = 112; y <= 114; y++) for (const x of [99, 100]) if (ctx.world.get(x, y, z) === DQ.blockId('knot')) ctx.world.set(x, y, z, 0, { silent: true }); }
};
C.threadTaken = {
  *run(ctx) {
    DQ.game.flash('#ffe070', .3, .5); DQ.sfx('notion'); yield .8;
    ctx.flags.frayvernSky = 1; DQ.AudioX && DQ.AudioX.jingle('dread'); yield say(ctx, 'frayvern', DQ.LINES.frayvern);
    DQ.sfx('roar'); DQ.game.shake(6); yield 1; ctx.flags.frayvernSky = 0;
    yield say(ctx, 'granny', DQ.LINES.threadHome);
  },
  apply(ctx) { ctx.flags.frayvernSky = 0; }
};
C.sleep = {
  *run(ctx, d) {
    const b = ctx.builder, bed = d.bed; b.sleeping = true; b.place3(bed.x * T + 8, bed.y * T + 8, bed.z * T);
    ctx.fade = { t: 0, to: 1 }; DQ.AudioX && DQ.AudioX.jingle('zzz'); yield 1.6;
    ctx.clock.sleepToMorning(); b.hp = b.maxHp; b.belly = Math.max(0, b.belly - 10);
    for (const n of ctx.npcs.list) if (n.sleeping) n.wake(ctx.clock.day);
    if (ctx.save) ctx.save.autosave('slept');
    yield .4; ctx.fade = { t: 0, to: 0 }; b.sleeping = false; yield .6;
    ctx.hud.toast('Good morning! Day ' + ctx.clock.day, null, 'morning'); DQ.AudioX && DQ.AudioX.jingle('morning');
  },
  apply(ctx, d) { const b = ctx.builder; b.sleeping = false; ctx.fade = null; if (ctx.clock.hour >= 19 || ctx.clock.hour < 5) { ctx.clock.sleepToMorning(); b.hp = b.maxHp; } }
};
C.siegeStart = {
  *run(ctx) { const m = ctx.npcs.get('mortimer'); if (m) yield pan(ctx, m.x, m.y, m.z + 14, .6); yield say(ctx, 'mortimer', DQ.LINES.siegeRally); yield pan(ctx, ctx.builder.x, ctx.builder.y, ctx.builder.z + 14, .5); ctx.siege.begin(); },
  apply(ctx) { if (!ctx.siege.active) ctx.siege.begin(); }
};
C.finale = {
  *run(ctx) {
    const t = ctx.town; DQ.AudioX && DQ.AudioX.music('finale');
    yield pan(ctx, t.x * T + 8, t.y * T + 8, t.L * T + 20, 1.2);
    DQ.game.flash('#ffe070', .4, .6); DQ.sfx('notion'); ctx.builder.bag.remove('goldenThread', 1); yield 1;
    // the Rift re-stitches, ring by ring
    yield pan(ctx, 96 * T, 80 * T, 9 * T, 1.2);
    for (let r = 0; r <= 4; r++) { DQ.Beats.stitchRift(ctx, r); DQ.sfx('stitch', { pitch: 1 + r * .1 }); DQ.game.particles.ring(96 * T + 8, 80 * T + 8, r * T, r * T + 12, '#f1e6c8', .5, 9 * T); yield .45; }
    yield pan(ctx, t.x * T + 8, t.y * T + 8, t.L * T + 20, 1.2);
    if (t.level < 5) t.levelUp();
    for (const n of ctx.npcs.list) n.anim = { kind: 'cheer', t: 0, dur: 6 };
    for (let i = 0; i < 6; i++) { const a = i * 1.1; DQ.game.particles.explosion(t.x * T + Math.cos(a) * 60, t.y * T + Math.sin(a) * 60, t.L * T + 70, .6, { shake: 0, freeze: false, debris: false }); DQ.game.particles.bits(t.x * T + Math.cos(a) * 60, t.y * T + Math.sin(a) * 60, t.L * T + 70, 20, ['#d04a4a', '#4a6ad0', '#e8c040', '#5aa04a', '#f1e6c8']); yield .35; }
    for (const n of ctx.npcs.list) n.say(n.id === 'marigold' ? 'Hearty Pies for everyone!' : n.id === 'mortimer' ? 'Hmph. Well done.' : n.id === 'lintwick' ? 'Lintwick so proud!' : 'Hooray!', 4);
    ctx.builder.bag.add('pie', 3);
    yield say(ctx, 'granny', DQ.LINES.finale);
    ctx.flags.chapterClear = true; ctx.events.emit('chapterClear', {});
  },
  apply(ctx) { DQ.Beats.stitchRift(ctx, 4); if (ctx.town.level < 5) ctx.town.setLevel(5); ctx.flags.chapterClear = true; ctx.events.emit('chapterClear', {}); }
};
})();
