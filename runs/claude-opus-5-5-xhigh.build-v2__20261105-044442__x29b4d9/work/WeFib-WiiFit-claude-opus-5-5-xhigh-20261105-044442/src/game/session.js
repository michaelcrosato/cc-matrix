import { h } from '../ui/dom.js';
import { SESSION_SET, EVENTS } from '../data/events.js';
import { EventRun } from './eventRun.js';
import { Doll } from '../art/doll.js';
import { useSessionStreams, rng } from '../core/rng.js';
import { promptHTML } from '../input/glyphs.js';
import { BTN, normKey } from '../input/input.js';
import { hasEvent } from '../events/index.js';
import { TITLE, GOAL, medalFor } from '../data/config.js';
import { clipIndex, clipName, GHOST_CLIPS } from './ghost.js';
import { openSessionOptions } from '../ui/screens/sessionOptions.js';
import { installPause } from '../ui/screens/pause.js';

const INTRO = 6, PLAY = 50, SCORE = 6, SLOT = INTRO + PLAY + SCORE;
const AWARDS = ['Suspiciously Still', 'Consistently Floored', 'Mostly Upright', 'Politely Attending'];

/** A round in the AI Hub: three classes, on the hub's clock, with everyone else as ghosts in the next lanes. */
export function runSession(game, info) {
  const AIHub = window.AIHub;
  game.inSession = true;
  useSessionStreams(true);
  installPause(game);
  game.flow = { leaveClass() {}, toTitle() {} };
  const sess = new SessionMode(game, AIHub, info);
  game.setMode(sess, 'session');
  AIHub.ready();
  return sess;
}

class SessionMode {
  constructor(game, hub, info) {
    this.game = game; this.hub = hub; this.info = info; this.name = 'session'; this.canPause = false;
    this.card = null; this.started = false; this.slot = -1; this.total = 0; this.scores = []; this.resultSent = false; this.ended = false; this.falls = 0; this.best = 0;
    this.lastProgress = -9; this.lastSend = -9; this.ghosts = new Map(); this.options = false; this.run = null; this.lastT = 0; this.cardEl = null;
    this.me = info.me;
  }
  enter() {
    const { game, hub } = this;
    this.slots = this.deal();
    // The card answers from the event itself, not the next sim tick: a slow frame must not lose a Ready.
    this.onCardKey = (e) => {
      if (e.repeat || this.started || this.ended) return;
      const k = normKey(e);
      if (k === 'enter') hub.answer('ready');
      else if (k === 'm') hub.answer('more');
    };
    window.addEventListener('keydown', this.onCardKey);
    hub.on('card', (c) => { this.card = c; this.renderCard(); });
    hub.on('start', () => { this.started = true; });
    hub.on('message', (d, from) => this.onMessage(d, from));
    hub.on('leave', (l) => this.onLeave(l));
    hub.on('time-up', () => this.finish());
    hub.on('end', () => this.onEnd());
    game.ui.clear();
    this.stageSet();
    this.renderCard();
  }
  deal() {
    const r = rng('deal');
    const pool = SESSION_SET.filter(hasEvent).slice(), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return out;
  }
  /** The class lined up on the deck, Trudy with a clipboard, the music. */
  stageSet() {
    const g = this.game;
    g.setIsland('home');
    g.palette.set('dawn', 0.5);
    g.programme.syncIsland();
    g.phys.snapTilt();
    g.audio.music('levelBest');
    g.art.trudy.root.position.set(14, 0.52, 0);
    g.art.trudy.rig.loop('clipboard');
    this.cardDolls = this.info.players.map((p, i) => {
      const d = new Doll({ shirt: p.color });
      d.root.position.set(15 + (i - (this.info.players.length - 1) / 2) * 1.6, 0.54, -3);
      d.rig.loop('breathe');
      g.art.group.add(d.root);
      return d;
    });
    g.rig.shot(15, 3.5, 7.4, 15, 1.2, -3, { fov: 38, snap: true });
  }
  clearCardSet() {
    if (!this.cardDolls) return;
    window.removeEventListener('keydown', this.onCardKey);
    for (const d of this.cardDolls) this.game.art.group.remove(d.root);
    this.cardDolls = null;
    if (this.cardScr) { this.game.ui.close(this.cardScr); this.cardScr = null; }
  }
  renderCard() {
    const { game, card, info } = this;
    if (this.started && this.time() >= 0) return;
    if (!this.cardScr) {
      this.cardScr = game.ui.open({
        name: 'card', passive: true,
        build: (s) => {
          this.cardRoot = h('div.card-session');
          s.el.append(this.cardRoot);
          s.el.style.pointerEvents = 'none';
        },
      });
    }
    const root = this.cardRoot;
    root.innerHTML = '';
    root.append(h('div.h1', { style: 'margin:0' }, TITLE));
    const seats = h('div.row');
    const ready = (card && card.ready) || [];
    info.players.forEach((p) => {
      const seat = h('span.seat', h('i', { style: `background:${p.color}` }), document.createTextNode(p.name), ready.includes(p.id) ? h('b', ' ✓') : null);
      seats.append(seat);
    });
    root.append(seats);
    root.append(h('div.tag', { style: 'font-size:3.6rem' }, GOAL));
    const dev = game.input.lastDevice, set = game.save.settings.glyphs;
    const row = h('div.row', { html: [['lean', 'Lean'], ['feet', 'Feet'], ['flail', 'Flail'], ['hop', 'Hop']].map(([v, t]) => promptHTML(v, t, dev, set)).join('') });
    root.append(row);
    let timeText = '...';
    if (card) {
      if (card.starting) timeText = 'Starting...';
      else if (card.paused) timeText = 'Paused';
      else if (card.left !== null && card.left !== undefined) timeText = `${Math.ceil(card.left / 1000)} s`;
    }
    root.append(h('div.tag', { style: 'font-size:4.4rem;font-weight:700' }, timeText));
    const act = h('div.row');
    const rd = h('div.item', { style: 'pointer-events:auto' }, h('span', { html: promptHTML('use', 'Ready', dev, set) }));
    rd.addEventListener('click', () => this.hub.answer('ready'));
    const more = h('div.item', { style: 'pointer-events:auto' }, h('span', { html: promptHTML('more', card && card.asked ? 'Take back' : 'More time', dev, set) }));
    more.addEventListener('click', () => this.hub.answer('more'));
    act.append(rd, more);
    root.append(act);
  }
  time() { return this.hub.time(); }
  cardInput() {
    const { game, hub } = this;
    const inp = game.input;
    // Keys answer in onCardKey, at once. A pad can only be read here.
    if (inp.pads.some((p) => p.connected && p.edge[BTN.cross])) hub.answer('ready');
    if (inp.pads.some((p) => p.connected && p.edge[BTN.triangle])) hub.answer('more');
  }
  fixed(dt) {
    if (this.ended) return;
    const { game } = this;
    const T = this.time();
    if (T === -Infinity || T < -3.5e3 || !this.started) {
      this.cardInput();
      game.stepIsland(dt, 0);
      return;
    }
    const sec = T / 1000;
    if (sec < 0) {
      this.cardInput();
      game.stepIsland(dt, 0);
      const c = Math.ceil(-sec);
      if (c !== this.lastCount) { this.lastCount = c; game.hud.show(true); game.hud.flash(String(c), 0.7); game.audio.sfx('metronome', { vel: 1 }); }
      return;
    }
    if (this.cardDolls) { this.clearCardSet(); game.ui.clear(); }
    const slot = Math.floor(sec / SLOT);
    const local = sec - slot * SLOT;
    if (slot >= this.slots.length) { this.finish(); if (this.run) this.closeRun(); this.waiting(); return; }
    if (slot !== this.slot) this.enterSlot(slot);
    const stage = local < INTRO ? 'intro' : local < INTRO + PLAY ? 'play' : 'score';
    if (stage !== this.stageName) this.enterStage(stage);
    if (this.run) this.run.ev.fixed(dt);
    this.net(sec);
    if (!this.options && game.input.verb('pause')) { this.options = true; openSessionOptions(game, () => { this.options = false; }); }
  }
  enterSlot(slot) {
    const { game, info } = this;
    this.closeRun();
    this.slot = slot;
    this.stageName = null;
    const id = this.slots[slot];
    const data = EVENTS[id];
    const meSeat = info.players.findIndex((p) => p.id === info.me);
    const lanes = [{ kind: 'local', name: info.players[meSeat]?.name || 'You', colour: info.players[meSeat]?.color || '#2CB5A0', source: 'any', playerId: info.me }];
    for (const p of info.players) if (p.id !== info.me && !this.gone?.has(p.id)) lanes.push({ kind: 'ghost', name: p.name, colour: p.color, playerId: p.id });
    this.run = new EventRun(game, { id, tier: 0, lanes, mode: 'session', config: data.sessionConfig, skipIntro: true, skipCountdown: true, manualBegin: true, onResult: function* none() { /* The session reports at the end. */ } });
    // The session owns the timeline: build the set and hold it for the intro.
    this.run.enter();
    this.ghosts = new Map();
    game.hud.setScore(this.total, 'Score');
    this.ghostTags();
  }
  ghostTags() {
    const { game } = this;
    if (this.tagLayer) this.tagLayer.remove();
    this.tagLayer = h('div', { style: 'position:absolute;inset:0;pointer-events:none' });
    game.hud.el.append(this.tagLayer);
    for (const lane of this.run.ev.lanes) {
      if (lane.kind !== 'ghost') continue;
      const tag = h('div.seat', { style: 'position:absolute;transform:translate(-50%,-120%);font-size:3rem' });
      tag.append(document.createTextNode(lane.name));
      this.tagLayer.append(tag);
      lane.tagEl = tag;
      lane.doll.root.visible = false;
      lane.net = null;
    }
  }
  enterStage(stage) {
    const { game } = this;
    const ev = this.run.ev;
    this.stageName = stage;
    if (stage === 'intro') {
      ev.phase = 'intro';
      game.hud.show(false);
      this.introScr = game.ui.only({
        name: 'slotIntro', passive: true,
        build: (s) => {
          const d = ev.data;
          const box = h('div.tag', { style: 'margin-top:16rem;max-width:140rem;text-align:center' });
          box.append(h('div', { style: 'font-size:7rem;font-weight:700' }, d.title), h('div', { style: 'font-size:3.8rem' }, d.line), h('div.row', { html: d.verbs.map(([v, t]) => promptHTML(v, t, game.input.lastDevice, game.save.settings.glyphs)).join(''), style: 'margin-top:1.6rem' }));
          s.el.append(h('div.h2', `Class ${this.slot + 1} of ${this.slots.length}`), box);
        },
      });
      game.audio.music(ev.data.music, ev.musicOpts ? ev.musicOpts() : {});
    } else if (stage === 'play') {
      if (this.introScr) { game.ui.close(this.introScr); this.introScr = null; }
      game.hud.show(true);
      ev.begin();
      game.audio.sfx('bell');
    } else {
      const r = ev.laneResult(ev.lanes[0]);
      const pts = Math.round(Math.max(0, r.form) * 10);
      this.scores[this.slot] = pts;
      this.total = this.scores.reduce((a, b) => a + (b || 0), 0);
      this.falls += ev.lanes[0].falls || 0;
      this.best = Math.max(this.best, r.form);
      ev.phase = 'done';
      game.audio.sfx('whistle');
      game.hud.show(false);
      const m = medalFor(r.form);
      game.audio.sting(m.id);
      this.scoreScr = game.ui.only({ name: 'slotScore', passive: true, build: (s) => {
        s.el.append(h('div.h2', { style: 'margin-top:18rem' }, ev.data.title), h('div.bignum', String(pts)), h('div.tag', { style: 'font-size:3.6rem' }, `${m.name} · Total ${this.total}`));
      } });
    }
  }
  closeRun() {
    if (this.run) {
      const { game } = this;
      if (this.scoreScr) { game.ui.close(this.scoreScr); this.scoreScr = null; }
      if (this.introScr) { game.ui.close(this.introScr); this.introScr = null; }
      if (this.tagLayer) { this.tagLayer.remove(); this.tagLayer = null; }
      this.run.exit();
      this.run = null;
    }
  }
  scoreNow() {
    if (this.run && this.stageName === 'play') {
      const r = this.run.ev.laneResult(this.run.ev.lanes[0]);
      return this.total + Math.round(Math.max(0, r.form) * 10);
    }
    return this.total;
  }
  net(sec) {
    const { hub } = this;
    if (sec - this.lastSend >= 0.1) {
      this.lastSend = sec;
      const lane = this.run && this.run.ev.lanes[0];
      const b = lane && lane.bal;
      const data = {
        t: 'g', a: this.slot, y: lane ? +lane.doll.root.position.y.toFixed(2) : 0, z: lane ? +lane.doll.root.position.z.toFixed(2) : 0,
        lx: b ? +b.leanX.toFixed(3) : 0, lz: b ? +b.leanZ.toFixed(3) : 0, c: lane ? clipIndex(lane.doll.rig.currentName) : 0, f: lane && lane.fallen ? 1 : 0, s: this.scoreNow(),
      };
      hub.send(data, { reliable: false });
    }
    if (sec - this.lastProgress >= 1) {
      this.lastProgress = sec;
      const name = this.run ? this.run.ev.data.title : TITLE;
      hub.progress({ score: this.scoreNow(), label: `${name} ${this.scoreNow()}` });
    }
  }
  onMessage(d, from) {
    if (!d || d.t !== 'g' || !this.run) return;
    const lane = this.run.ev.lanes.find((l) => l.kind === 'ghost' && l.laneSpecId === undefined && this.laneFor(l) === from);
    if (!lane) return;
    if (d.a !== this.slot) { lane.doll.root.visible = false; lane.net = null; return; }
    const now = this.time() / 1000;
    if (!lane.net) lane.net = { prev: d, next: d, t0: now, t1: now + 0.1 };
    else { lane.net.prev = lane.net.next; lane.net.next = d; lane.net.t0 = now; lane.net.t1 = now + 0.15; }
    lane.doll.root.visible = true;
  }
  laneFor(lane) { return lane.ev.laneSpecs[lane.id].playerId; }
  onLeave(l) {
    this.gone = this.gone || new Set();
    this.gone.add(l.id);
    if (!this.run) return;
    const lane = this.run.ev.lanes.find((x) => x.kind === 'ghost' && this.laneFor(x) === l.id);
    if (lane) { lane.doll.root.visible = false; if (lane.tagEl) lane.tagEl.remove(); lane.gone = true; }
  }
  frame(dt) {
    const { game } = this;
    if (this.ended) return;
    if (this.cardDolls) { game.syncIsland(dt); for (const d of this.cardDolls) d.update(dt); game.art.trudy.update(dt); }
    if (!this.run) return;
    const ev = this.run.ev;
    ev.frame(dt);
    const now = this.time() / 1000;
    for (const lane of ev.lanes) {
      if (lane.kind !== 'ghost' || lane.gone) continue;
      const n = lane.net;
      if (!n) continue;
      const k = Math.max(0, Math.min(1, (now - n.t0) / Math.max(0.01, n.t1 - n.t0)));
      const lx = n.prev.lx + (n.next.lx - n.prev.lx) * k, lz = n.prev.lz + (n.next.lz - n.prev.lz) * k;
      const py = n.prev.y + (n.next.y - n.prev.y) * k, pz = n.prev.z + (n.next.z - n.prev.z) * k;
      // Their copy plays in its own lane: here they appear beside you, in the next one.
      lane.doll.root.position.set(lane.x, py, pz);
      lane.doll.root.rotation.set(lz, 0, -lx);
      const clip = n.next.f ? 'flop' : clipName(n.next.c);
      if (lane.doll.rig.currentName !== clip) lane.doll.rig.loop(clip);
      if (lane.tagEl) {
        const p = lane.doll.root.position.clone(); p.y += 2.1;
        p.project(game.camera);
        lane.tagEl.style.left = `${(p.x * 0.5 + 0.5) * 100}%`;
        lane.tagEl.style.top = `${(-p.y * 0.5 + 0.5) * 100}%`;
      }
    }
    game.hud.setScore(this.scoreNow(), 'Score');
  }
  /** Once, at the end or on time-up. Grace is 5 s. */
  finish() {
    if (this.resultSent) return;
    this.resultSent = true;
    const score = this.scoreNow();
    const stats = { 'Floor Exercises': this.falls, 'Best medal': medalFor(this.best).name };
    const award = this.falls === 0 && this.best >= 85 ? AWARDS[0] : this.falls > 3 ? AWARDS[1] : this.best >= 40 ? AWARDS[2] : AWARDS[3];
    this.hub.result({ score, stats, awards: [{ title: award, detail: `${TITLE} says so.` }] });
  }
  waiting() {
    const { game } = this;
    if (this.waitScr) return;
    game.hud.show(false);
    this.waitScr = game.ui.only({ name: 'waiting', passive: true, build: (s) => {
      s.el.append(h('div.h2', { style: 'margin-top:26rem' }, 'Waiting for the others'), h('div.tag', { style: 'font-size:3.8rem' }, 'Trudy is counting. She says she is not.'));
    } });
    game.setIsland('home');
    game.rig.shot(15, 6, 28, 8, 1, -2, { fov: 38, rate: 1 });
  }
  /** Stop input, sending and all sound, and keep the last frame. */
  onEnd() {
    const { game } = this;
    this.ended = true;
    window.removeEventListener('keydown', this.onCardKey);
    game.audio.stopMusic(0.05);
    game.audio.silence();
    game.speech.clear();
    game.ui.clear();
    game.hud.show(false);
    game.mode = null;
  }
  botDrive() { return null; }
}
export { GHOST_CLIPS };
