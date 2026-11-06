// An AI Hub session in ghost mode. The round runs on AIHub.time() alone.
import { EVENTS, SESSION_SET } from '../data/events.js';
import { Ghost, GHOST_CLIPS } from './ghost.js';
import { Poses } from '../events/poses.js';
import { medalFor } from './programme.js';
import { setPalette } from '../render/palette.js';
import { el, txt } from '../ui/ui.js';
import { SEATS } from '../data/config.js';
import { makeDoll } from '../art/doll.js';
import { makeTrudy } from '../art/trudy.js';
const INTRO = 6000, PLAY = 50000, SCORE = 6000, SLOT = INTRO + PLAY + SCORE;
export class Session {
  constructor(game, info) {
    this.g = game; this.info = info; this.me = info.me; this.ghosts = new Map(); this.slot = -1; this.ev = null; this.score = 0; this.slotScores = []; this.resultSent = false; this.ended = false; this.sendT = 0; this.progT = 0; this.falls = 0; this.best = 0; this.volumes = false;
    const r = globalThis.AIHub.rng('deal'); const pool = [...SESSION_SET]; this.deal = []; while (this.deal.length < 3) this.deal.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    const H = globalThis.AIHub; this.H = H; this.phase = 'card'; this.cardState = { left: null, ready: [] };
    H.on('card', (c) => { this.cardState = c; this.drawCard(); }); H.on('start', () => { this.started = true; this.hideCard(); }); H.on('message', (m, from) => this.onMsg(m, from)); H.on('leave', (e) => this.onLeave(e)); H.on('time-up', () => this.timeUp()); H.on('end', () => this.end());
    this.buildStage();
  }
  buildStage() {
    const g = this.g; const specs = [{ kind: 'local', name: this.myPlayer()?.name || 'You', colour: this.myPlayer()?.color || SEATS[0] }];
    this.ev = g.startEventMode(Poses, { tier: 0, session: true, noHud: true, palette: 'golden', hold: 14 }, specs); this.ev.count = 1e9;
    // The class lined up on the deck, Trudy with a clipboard.
    const n = this.info.players.length; this.info.players.forEach((p) => { if (p.id === this.me) return; const d = makeDoll({ paint: p.color }); d.group.position.set(this.seatX(p.id) - this.seatX(this.me), 0, 0); d.rig.play('breathe', 0); this.ev.group.add(d.group); this.ev.anim.push(d); }); void n;
    const tr = makeTrudy(); tr.rig.play('read', 0); tr.group.position.set(-2.2, 0, .9); tr.group.rotation.y = .5; this.ev.group.add(tr.group); this.ev.anim.push({ tick: (dt) => tr.tick(dt, 0) });
    g.audio.playTrack('levelBest'); this.drawCardOnce();
  }
  myPlayer() { return this.info.players.find(p => p.id === this.me); }
  drawCardOnce() {
    const ui = this.g.ui; ui.open('sessioncard', (e) => {
      e.appendChild(txt('div', 'title-h', 'Totter Fit')); const c = el('div', 'bigcard'); c.appendChild(txt('div', 'line', 'Stay balanced through the class: highest score wins.')); this.playersEl = el('div', 'row'); c.appendChild(this.playersEl); c.appendChild(ui.promptBar([['lean', 'Lean'], ['feet', 'Feet'], ['flail', 'Flail']])); this.leftEl = txt('div', 'sub-h', 'Starting...'); c.appendChild(this.leftEl); e.appendChild(c);
      e.appendChild(el('div', 'grow')); const row = el('div', 'row'); this.readyBtn = ui.btn('Ready', () => this.H.answer('ready'), { def: true }); this.moreBtn = ui.btn('More time', () => this.H.answer('more')); const g1 = el('span'); g1.dataset.verb = 'use'; this.readyBtn.appendChild(g1); const g2 = el('span'); g2.dataset.verb = 'more'; this.moreBtn.appendChild(g2); row.append(this.readyBtn, this.moreBtn); e.appendChild(row);
    }, { onMore: () => this.H.answer('more') }); this.drawCard();
  }
  drawCard() {
    const c = this.cardState; if (!this.playersEl) return; this.playersEl.textContent = '';
    for (const p of this.info.players) { const t = el('div', 'gaugeTag'); t.style.color = p.color; t.textContent = `${p.name}${(c.ready || []).includes(p.id) ? ' ✓' : ''}`; this.playersEl.appendChild(t); }
    this.leftEl.textContent = c.starting ? 'Starting...' : c.paused ? 'Paused' : c.left == null ? 'Starting...' : `${Math.ceil(c.left / 1000)} seconds`;
    this.moreBtn.firstChild.textContent = c.asked ? 'Take it back' : 'More time';
  }
  hideCard() { if (this.g.ui.has('sessioncard')) { this.g.ui.closeTo('sessioncard'); this.g.ui.close(); } this.playersEl = null; }
  onMsg(m, from) {
    if (!m || m.t !== 'g') return; let gh = this.ghosts.get(from);
    if (!gh) { const p = this.info.players.find(q => q.id === from); if (!p) return; gh = new Ghost(this.g, p); this.ghosts.set(from, gh); gh.slotPos = this.seatX(from); }
    gh.apply({ ...m, x: m.x - this.seatX(this.me) }); // You stand in the middle of your own class.
  }
  onLeave(e) { const gh = this.ghosts.get(e.id); if (gh) { gh.remove(); this.ghosts.delete(e.id); } }
  seatX(id) { const n = this.info.players.length; return (this.info.players.findIndex(p => p.id === id) - (n - 1) / 2) * 3.2; }
  toggleVolumes() {
    const ui = this.g.ui; if (ui.has('sessionvol')) { ui.closeTo('sessionvol'); ui.close(); return; }
    const S = this.g.settings; ui.open('sessionvol', (e) => { e.classList.add('dim'); e.appendChild(txt('div', 'title-h', 'Volumes')); const c = el('div', 'col'); const save = () => this.g.applySettings(); c.append(ui.slider('Music', () => S.music, (v) => { S.music = v; save(); }, 0, 100, 5), ui.slider('Sound', () => S.sfx, (v) => { S.sfx = v; save(); }, 0, 100, 5), ui.slider('Voice', () => S.voice, (v) => { S.voice = v; save(); }, 0, 100, 5)); e.appendChild(c); }, { onBack: () => this.toggleVolumes() });
  }
  fixed(dt) {
    if (this.ended) return; const t = this.H.time(); if (!Number.isFinite(t)) return;
    if (t < 0) { if (this.ev && this.slot === -1) { const n = Math.ceil(-t / 1000); this.ev.setBig?.(String(n)); } return; }
    const s = Math.floor(t / SLOT); const within = t - s * SLOT;
    if (s >= 3) { this.finishRound(); }
    else if (s !== this.slot) this.enterSlot(s);
    if (this.ev && s < 3) {
      const inPlay = within >= INTRO && within < INTRO + PLAY;
      if (inPlay && this.slotStage !== 'play') { this.slotStage = 'play'; this.g.ui.closeAll(); this.ev.count = 0; }
      if (within >= INTRO + PLAY && this.slotStage !== 'score') { this.slotStage = 'score'; this.closeSlot(); }
      if (this.slotStage === 'intro') { const left = Math.ceil((INTRO - within) / 1000); this.ev.setBig?.(left <= 3 ? String(left) : ''); }
      if (this.slotStage === 'play' && this.ev.phase === 'done' && !this.earlyTag) { this.earlyTag = true; this.ev.setMsg('Nicely done. Waiting for the others.'); }
    }
    this.sendT -= dt; this.progT -= dt;
    if (this.sendT <= 0) { this.sendT = .1; this.sendGhost(s); }
    if (this.progT <= 0) { this.progT = 1; const live = this.slotScore(); this.H.progress({ score: this.score + live, label: this.ev && this.deal[s] ? `${EVENTS[this.deal[s]].title} ${this.score + live}` : `Class ${this.score}` }); }
    for (const [id, gh] of this.ghosts) { const vis = gh.a === this.slot && !!this.ev && this.slotStage !== 'done'; if (vis && this.ev) { gh.attach(this.ev); } gh.tick(dt, vis); }
  }
  slotScore() { if (!this.ev || this.slot < 0 || this.slotClosed) return 0; const f = this.ev.liveForm ? this.ev.lanes[0]?.form || 0 : 0; return Math.round(f * 10); }
  sendGhost(s) {
    const ev = this.ev, l = ev && ev.lanes[0]; const body = l?.bal; const lx = body ? body.leanX : 0, lz = body ? body.leanZ : 0;
    this.H.send({ t: 'g', a: Math.min(s, 2), x: +(l ? this.seatX(this.me) : 0).toFixed(2), z: 0, lx: +lx.toFixed(3), lz: +lz.toFixed(3), c: GHOST_CLIPS.indexOf(l?.doll?.rig?.currentName), f: l?.fallen ? 1 : 0, s: this.score + this.slotScore() }, { reliable: false });
  }
  enterSlot(s) {
    const g = this.g; this.slot = s; this.slotClosed = false; this.earlyTag = false; this.slotStage = 'intro'; const id = this.deal[s], Cls = EVENTS[id]; const cfg = Cls.sessionConfig || {};
    g.ui.closeAll(); for (const gh of this.ghosts.values()) gh.attach(null);
    // Own lane sits at its seat so everyone lines up the same on every copy.
    const specs = [{ kind: 'local', name: this.myPlayer()?.name, colour: this.myPlayer()?.color }];
    this.ev = g.startEventMode(Cls, { tier: cfg.tier || 0, session: true, palette: 'golden', ...cfg }, specs); this.ev.count = 1e9; document.body.classList.remove('hidecursor');
    this.ev.timeLimit = Math.min(this.ev.timeLimit || 50, 50);
    g.ui.open('sessionintro', (e) => { e.appendChild(txt('div', 'title-h', Cls.title)); const c = el('div', 'bigcard'); c.append(txt('div', 'line', Cls.sentence), g.ui.promptBar(Cls.verbs)); e.appendChild(c); e.appendChild(el('div', 'grow')); }, {});
    g.ui.focus.setLayer(null);
  }
  closeSlot() {
    const ev = this.ev; if (!ev) return; if (ev.phase !== 'done') ev.forceFinish(); const r = ev.laneResult(0); this.slotClosed = true; const pts = Math.round(Math.max(0, r.form) * 10); this.score += pts; this.slotScores.push(pts); this.best = Math.max(this.best, r.form); this.falls += ev.lanes[0].falls || 0;
    const m = medalFor(r.form); const g = this.g; g.ui.open('sessionscore', (e) => { e.classList.add('dim'); e.appendChild(txt('div', 'title-h', ev.cls.title)); const st = el('div', 'medalstamp'); st.style.background = m.colour; st.textContent = m.name; e.appendChild(st); e.appendChild(txt('div', 'sub-h', `+${pts}. Total ${this.score}`)); }, {}); g.ui.focus.setLayer(null); g.audio.sting(m.id);
  }
  finishRound() {
    if (this.resultSent) return; this.sendResult(); this.g.ui.closeAll(); this.slotStage = 'done'; this.g.ui.open('sessionwait', (e) => { e.appendChild(el('div', 'grow')); const c = el('div', 'bigcard'); c.appendChild(txt('div', 'line', 'Waiting for the others. Trudy is counting. She says she is not.')); e.appendChild(c); e.appendChild(el('div', 'grow')); }, {}); this.g.ui.focus.setLayer(null);
  }
  sendResult() {
    if (this.resultSent) return; this.resultSent = true; const m = medalFor(this.best);
    const awards = []; if (this.falls === 0) awards.push({ title: 'Suspiciously Still', detail: 'Not one Floor Exercise.' }); else if (this.falls >= 3) awards.push({ title: 'Very Consistent', detail: `${this.falls} Floor Exercises.` });
    this.H.result({ score: this.score, stats: { 'Floor Exercises': this.falls, 'Best medal': m.name }, awards });
  }
  timeUp() { if (this.ev && !this.slotClosed && this.slot >= 0) { const r = this.ev.laneResult(0); this.score += Math.round(Math.max(0, r.form) * 10); this.slotClosed = true; } this.sendResult(); }
  end() { this.ended = true; this.g.audio.silence(); this.g.simPaused = true; for (const gh of this.ghosts.values()) gh.tag.remove(); this.g.input.poll = () => {}; }
}
