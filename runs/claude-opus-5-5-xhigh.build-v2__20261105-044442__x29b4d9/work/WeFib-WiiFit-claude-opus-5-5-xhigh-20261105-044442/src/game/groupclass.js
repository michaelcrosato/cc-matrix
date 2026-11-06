import { h } from '../ui/dom.js';
import { SEAT_COLOURS } from '../data/config.js';
import { EVENTS, DISCIPLINE_ORDER } from '../data/events.js';
import { hasEvent } from '../events/index.js';
import { EventRun } from './eventRun.js';
import { M, G, geo, add } from '../art/materials.js';
import { Doll } from '../art/doll.js';
import { promptHTML } from '../input/glyphs.js';
import { BTN } from '../input/input.js';
import { line } from '../data/dialogue.js';
import { rng } from '../core/rng.js';
import { showResults } from './results.js';
import { RED, TEAL, CREAM } from '../art/props.js';

const POINTS = [4, 3, 2, 1];
const NAMES = ['Mat One', 'Mat Two', 'Mat Three', 'Mat Four'];

/** Up to four on one TV. Lobby, playlist, classes in lanes, podium. */
export class GroupClass {
  constructor(game) {
    this.game = game; this.name = 'group';
    this.seats = [null, null, null, null]; this.stage = 'lobby'; this.points = [0, 0, 0, 0]; this.playlist = []; this.sub = null; this.t = 0;
  }
  get canPause() { return this.stage === 'event' && !!this.sub; }
  skip() { if (this.sub) this.sub.skip(); }
  enter() {
    const g = this.game;
    g.setIsland('home');
    g.ui.clear();
    g.palette.set('golden', 1);
    g.programme.syncIsland();
    g.phys.setRest(g.programme.restDeg());
    g.rig.shot(14, 7, 44, 14, 2, -11, { fov: 38, rate: 2, snap: true });
    g.audio.music('levelBest');
    this.lobby();
    g.speech.say('trudy', line('trudy', 'group_intro'), { auto: 3.6 });
  }
  lobby() {
    const g = this.game;
    this.stage = 'lobby';
    this.scr = g.ui.only({
      name: 'lobby', passive: true,
      build: (s) => {
        s.el.append(h('div.h1', { style: 'margin-top:3rem' }, 'Group Class'));
        this.matsEl = h('div.mats', { style: 'margin-top:3rem' });
        this.hintEl = h('div.tag', { style: 'margin-top:3rem;font-size:3.6rem' }, '');
        s.el.append(this.matsEl, this.hintEl);
        this.renderMats();
      },
    });
  }
  renderMats() {
    const g = this.game, dev = g.input.lastDevice, set = g.save.settings.glyphs;
    this.matsEl.innerHTML = '';
    this.seats.forEach((seat, i) => {
      const el = h('div.mat', { style: seat ? `background:${SEAT_COLOURS[i]};color:#fff;text-shadow:.15rem .15rem 0 #1A1420` : '' });
      el.dataset.seat = String(i);
      el.append(h('div', { style: 'font-size:4rem;font-weight:600' }, seat ? seat.name : 'Empty'));
      el.append(h('div', seat ? (seat.source === 'kbm' ? 'Keys and mouse' : `Controller ${seat.pad + 1}`) : 'Join in'));
      el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer';
      el.addEventListener('click', () => { g.input.clickQueue.push(() => this.joinKbm()); });
      this.matsEl.append(el);
    });
    const joined = this.seats.filter(Boolean).length;
    this.hintEl.innerHTML = `${promptHTML('join', 'Join', dev, set)} ${promptHTML('back', 'Leave', dev, set)} ${joined ? `<span style="margin-left:2rem">${joined} here. Join again to begin.</span>` : ''}`;
  }
  joinKbm() {
    const seats = this.seats;
    if (seats.some((s) => s && s.source === 'kbm')) { this.toPlaylist(); return; }
    const i = seats.findIndex((s) => !s);
    if (i < 0) return;
    seats[i] = { source: 'kbm', name: NAMES[i], pad: -1 };
    this.game.audio.sfx('uiConfirm');
    this.renderMats();
  }
  joinPad(p) {
    const seats = this.seats;
    if (seats.some((s) => s && s.pad === p)) { this.toPlaylist(); return; }
    const i = seats.findIndex((s) => !s);
    if (i < 0) return;
    seats[i] = { source: `pad:${p}`, name: NAMES[i], pad: p };
    this.game.audio.sfx('uiConfirm');
    this.renderMats();
  }
  leave(match) {
    const seats = this.seats;
    const i = seats.findIndex(match);
    if (i >= 0) { seats[i] = null; this.game.audio.sfx('uiBack'); this.renderMats(); return true; }
    return false;
  }
  lobbyInput() {
    const g = this.game, inp = g.input;
    for (const pad of inp.pads) {
      if (!pad.connected) continue;
      if (pad.edge[BTN.cross]) this.joinPad(pad.index);
      if (pad.edge[BTN.circle]) { if (!this.leave((s) => s && s.pad === pad.index) && !this.seats.some(Boolean)) { this.back(); return; } }
    }
    if (inp.pressed.has('enter')) this.joinKbm();
    if (inp.pressed.has('escape') || inp.pressed.has('backspace')) { if (!this.leave((s) => s && s.source === 'kbm') && !this.seats.some(Boolean)) this.back(); }
  }
  back() { const g = this.game; g.go(() => (g.save.profile && g.modeReturnIsland ? g.flow.toIsland({}) : g.flow.toMenu())); }
  fixed(dt) {
    const g = this.game;
    this.t += dt;
    if (this.stage === 'lobby') { g.stepIsland(dt, 0); if (!g.wiping && this.stage === 'lobby' && !g.speech.line?.blocking) this.lobbyInput(); return; }
    if (this.stage === 'menu' || this.stage === 'podium') { g.stepIsland(dt, 0); }
    if (this.sub) this.sub.fixed(dt);
    if (this.stage === 'podium') this.podiumStep(dt);
  }
  frame(dt) {
    const g = this.game;
    if (this.stage === 'lobby' || this.stage === 'menu') { g.syncIsland(dt); }
    if (this.sub) this.sub.frame(dt);
    if (this.stage === 'podium') this.podiumFrame(dt);
  }
  toPlaylist() {
    const g = this.game;
    this.stage = 'menu';
    g.ui.only({
      name: 'playlist', prompts: [['use', 'Choose'], ['back', 'Back']], back: () => this.lobby(),
      build: (s) => {
        s.el.append(h('div.h2', { style: 'margin-top:8rem' }, 'What shall we do?'));
        const col = h('div.col', { style: 'margin-top:3rem' });
        s.el.append(col);
        col.append(s.item(h('div', 'Quick Class (three random)'), { use: () => this.quick() }));
        col.append(s.item(h('div', 'Pick three'), { use: () => this.pick() }));
      },
    });
  }
  couchIds() { return Object.keys(EVENTS).filter((id) => EVENTS[id].couch && hasEvent(id)); }
  quick() {
    const r = rng('groupclass'), pool = this.couchIds(), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    this.playlist = out;
    this.runNext();
  }
  pick() {
    const g = this.game;
    const ids = this.couchIds();
    const chosen = [];
    const pages = [];
    for (let i = 0; i < ids.length; i += 6) pages.push(ids.slice(i, i + 6));
    g.ui.only({
      name: 'pick', prompts: [['use', 'Choose'], ['page', 'Pages'], ['back', 'Back']], back: () => this.toPlaylist(),
      build: (s) => {
        const title = h('div.h2', { style: 'margin-top:6rem' }, 'Pick three');
        const box = h('div.dev-grid', { style: 'margin-top:2rem' });
        const left = h('div.tag', { style: 'margin-top:2rem;font-size:3.4rem' }, '0 of 3');
        s.el.append(title, box, left);
        const render = (pg) => {
          box.innerHTML = '';
          s.clearItems();
          for (const id of pages[pg]) {
            const el = h('div', EVENTS[id].title + (chosen.includes(id) ? ' ✓' : ''));
            box.append(s.item(el, { use: () => {
              if (chosen.includes(id)) chosen.splice(chosen.indexOf(id), 1); else chosen.push(id);
              el.textContent = EVENTS[id].title + (chosen.includes(id) ? ' ✓' : '');
              left.textContent = `${chosen.length} of 3`;
              if (chosen.length >= 3) { this.playlist = chosen.slice(0, 3); this.runNext(); }
            } }));
          }
          s.setFocus(0, true);
        };
        if (pages.length > 1) s.pager(pages.length, render);
        render(0);
      },
    });
  }
  lanes() {
    return this.seats.map((s, i) => (s ? { kind: 'local', name: s.name, colour: SEAT_COLOURS[i], source: s.source, seat: i } : null)).filter(Boolean);
  }
  runNext() {
    const g = this.game;
    if (!this.playlist.length) { g.go(() => this.podium()); return; }
    const id = this.playlist.shift();
    const self = this;
    g.go(() => {
      g.ui.clear();
      self.stage = 'event';
      if (self.sub) { self.sub.exit(); self.sub = null; }
      self.sub = new EventRun(g, {
        id, tier: 0, lanes: self.lanes(), mode: 'group',
        onResult: function* onResult(ev, results) {
          const sorted = results.filter((r) => r.lane.kind === 'local').sort((a, b) => b.form - a.form);
          sorted.forEach((r, i) => { self.points[r.lane.seat] += POINTS[i] ?? 0; });
          let done = false;
          const winner = sorted[0];
          const list = h('div.col', sorted.map((r, i) => h('div.tag', { style: `font-size:3.6rem;border-color:${r.lane.colour}` }, `${i + 1}. ${r.lane.name}: ${Math.round(r.form)} · +${POINTS[i] ?? 0}`)));
          showResults(g, { ev, result: winner, title: ev.data.title, onContinue: () => { done = true; }, extra: list });
          yield () => done;
          g.ui.clear();
          self.runNext();
        },
      });
      self.sub.enter();
      self.ev = self.sub.ev;
    });
  }
  podium() {
    const g = this.game;
    if (this.sub) { this.sub.exit(); this.sub = null; }
    this.ev = null;
    this.stage = 'podium';
    g.ui.clear();
    g.setIsland('far', 40, -120);
    g.sea.setLevel(-3);
    g.palette.set('golden', 1);
    g.audio.sting('exemplary');
    g.audio.music('levelBest');
    const order = this.seats.map((s, i) => (s ? { i, name: s.name, pts: this.points[i] } : null)).filter(Boolean).sort((a, b) => b.pts - a.pts);
    const set = this.podiumSet = G('podium');
    add(set, M(geo.cyl(10, 11, 1, 28), 0x8CCB6A, 0, -0.5, 0));
    const heights = [2.1, 1.4, 0.9, 0.5];
    const xs = [0, -2.3, 2.3, 4.5];
    const cols = [0xF5B700, 0xBFC6CF, 0xC78B4A, CREAM];
    const blocks = this.blocks = [];
    this.dolls = [];
    order.forEach((o, k) => {
      const b = M(geo.box(2.2, heights[k], 2.2), cols[k], xs[k], heights[k] / 2, 0);
      set.add(b);
      blocks.push(b);
      const d = new Doll({ shirt: SEAT_COLOURS[o.i] });
      d.flatFeet = false;
      d.root.position.set(xs[k], heights[k], 0);
      d.rig.loop(k === 0 ? 'cheer' : 'clap');
      set.add(d.root);
      this.dolls.push({ d, k, h: heights[k], x: xs[k], vy: 0, fell: false });
    });
    g.scene.add(set);
    g.focus(0, 0, 0, 14);
    g.rig.shot(0, 4, 13, 0, 2.2, 0, { fov: 38, rate: 2, snap: true });
    this.podT = 0;
    g.speech.say('trudy', line('trudy', 'podium'), { auto: 4 });
    g.ui.only({
      name: 'podium', prompts: [['use', 'Back to the menu']],
      build: (s) => {
        s.el.append(h('div.h1', { style: 'margin-top:2rem' }, 'Podium'));
        s.el.append(h('div.col', order.map((o, k) => h('div.podium-line.tag', { style: 'position:absolute;right:9rem;top:' + (22 + k * 8) + 'rem;font-size:4rem' }, `${k + 1}. ${o.name}: ${o.pts}`))));
        s.el.append(s.item(h('div', { style: 'position:absolute;bottom:12rem' }, 'Back to the menu'), { use: () => g.go(() => g.flow.toMenu()) }));
      },
    });
  }
  podiumStep(dt) {
    this.podT += dt;
    if (this.podT > 5 && !this.tipped) {
      // It tips over. Of course it does.
      this.tipped = true;
      this.game.audio.sfx('fall');
      this.game.comic.pop('CLACK!', 0, 3.4, 0);
      this.game.rig.shake(0.1);
    }
  }
  podiumFrame(dt) {
    const k = this.tipped ? Math.min(1, (this.podT - 5) / 1.2) : 0;
    if (this.podiumSet) {
      for (const b of this.blocks) { b.rotation.z = -k * k * 0.9; b.position.x += 0; }
      for (const o of this.dolls) {
        if (this.tipped && !o.fell) { o.fell = true; o.d.rig.loop('flop'); }
        if (o.fell) { o.d.root.position.y = Math.max(0.05, o.h * (1 - k * k)); o.d.root.position.x = o.x + k * k * 2.5; o.d.root.rotation.z = -k * 1.2; }
        o.d.update(dt);
      }
    }
  }
  exit() {
    const g = this.game;
    if (this.sub) { this.sub.exit(); this.sub = null; }
    if (this.podiumSet) { g.scene.remove(this.podiumSet); this.podiumSet = null; }
    g.ui.clear();
    g.speech.clear();
  }
}
export { DISCIPLINE_ORDER, RED, TEAL };
