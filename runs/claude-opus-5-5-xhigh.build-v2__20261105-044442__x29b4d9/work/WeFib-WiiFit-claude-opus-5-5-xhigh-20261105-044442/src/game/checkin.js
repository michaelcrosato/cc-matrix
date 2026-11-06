import { EventBase } from '../events/base.js';
import { TESTS } from '../data/programme.js';
import { M, G, geo, add } from '../art/materials.js';
import { Trudy } from '../art/cast.js';
import { paintColour } from '../art/doll.js';
import { h } from '../ui/dom.js';
import { promptHTML } from '../input/glyphs.js';
import { line } from '../data/dialogue.js';
import { refreshJarDisplay } from './jar.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const DIRS = [[-1, 0, 'left'], [1, 0, 'right'], [0, -1, 'forward'], [0, 1, 'back']];

/** Three short tests on a round mat with Trudy. Each scores 0 to 1. */
class CheckInEvent extends EventBase {
  static id = 'checkin';
  constructor(spec) {
    super({ ...spec, data: { title: 'The Check-In', instructor: 'trudy', verbs: [['lean', 'Lean']], music: 'island', tiers: [{}] } });
    this.seaLevel = -6.4; this.tests = spec.tests; this.god = false;
    this.idx = -1; this.cur = null; this.scores = {}; this.allDone = false; this.testT = 0;
  }
  setupLane(lane) { lane.doll.rig.loop('breathe'); }
  buildSet() {
    const g = this.group;
    add(g, M(geo.cyl(5, 5.4, 0.6, 36), 0x8CCB6A, 0, -0.32, 0), M(geo.cyl(2.2, 2.2, 0.04, 40), 0xC24D6A, 0, 0.01, 0), M(geo.tor(2.2, 0.05, Math.PI * 2, 48), 0xFFF3DC, 0, 0.03, 0, { rot: [Math.PI / 2, 0, 0], shadow: false }));
    this.trudy = new Trudy();
    this.trudy.root.position.set(-1.9, 0, 0.6);
    this.trudy.root.rotation.y = 0.8;
    this.trudy.root.scale.setScalar(1.25);
    this.trudy.rig.loop('clipboard');
    g.add(this.trudy.root);
    this.game.setBackdrop(35, -110);
    this.game.sea.setLevel(this.seaLevel);
  }
  cameraShot(snap) { this.game.rig.shot(0.6, 2.2, 7, -0.25, 1, 0, { snap, rate: 4 }); this.inputYaw = Math.atan2(0.85, 7); }
  hudSetup(hud) {
    this.howEl = h('div.tag', { style: 'position:absolute;top:14rem;left:50%;transform:translateX(-50%) rotate(-.5deg);font-size:4.6rem;font-weight:600;text-align:center;max-width:130rem' }, '');
    hud.el.append(this.howEl);
    this.barEl = h('div', { style: 'position:absolute;top:27rem;left:50%;width:96rem;height:6rem;margin-left:-48rem;background:#FFF4DC;border:.6rem solid #1A1420;border-radius:3rem;overflow:hidden;display:none' });
    this.barFill = h('div', { style: 'position:absolute;top:0;bottom:0;background:#6FB7D6' });
    this.barGoal = h('div', { style: 'position:absolute;top:0;bottom:0;width:1.6rem;margin-left:-.8rem;background:#2F8F46' });
    this.barMid = h('div', { style: 'position:absolute;top:0;bottom:0;left:50%;width:.5rem;background:#1A1420' });
    this.barEl.append(this.barFill, this.barGoal, this.barMid);
    hud.el.append(this.barEl);
    this.beatEl = h('div', { style: 'position:absolute;top:27rem;left:50%;width:14rem;height:14rem;margin-left:-7rem;border-radius:50%;background:#F5B700;border:.7rem solid #1A1420;display:none' });
    hud.el.append(this.beatEl);
    hud.setScore('', '');
  }
  removeHud() { if (this.howEl) { this.howEl.remove(); this.barEl.remove(); this.beatEl.remove(); } }
  start() { this.nextTest(); }
  nextTest() {
    this.idx++;
    if (this.idx >= this.tests.length) { this.allDone = true; this.howEl.textContent = 'Thank you.'; this.barEl.style.display = 'none'; this.beatEl.style.display = 'none'; return; }
    const id = this.tests[this.idx], def = TESTS[id];
    this.cur = { id, def, t: 0, sum: 0, n: 0, errors: [], state: 'show', showT: 2.2, sub: 0 };
    this.showHow(def);
    this.game.audio.sfx('bell');
    const lane = this.lanes[0];
    lane.doll.rig.loop('breathe');
    lane.input.wishX = 0; lane.input.wishZ = 0;
    this.game.input.resetRing();
    this.barEl.style.display = id === 'leanMatch' ? '' : 'none';
    this.beatEl.style.display = id === 'stepTime' ? '' : 'none';
    this.setPromptsFor(id);
    if (id === 'stepTime') { this.cur.beat = 60 / 96; this.cur.beats = []; this.cur.foot = null; const n = Math.floor(def.time / this.cur.beat); for (let i = 0; i < n; i++) this.cur.beats.push({ t: (i + 2) * this.cur.beat, hit: false }); }
    if (id === 'leanMatch') { this.cur.targets = [this.pickTarget(), this.pickTarget(), this.pickTarget()]; this.cur.tIdx = -1; }
    if (id === 'quickLean') { this.cur.prompts = []; this.cur.nextPrompt = 0.5; this.cur.active = null; this.cur.reactions = []; }
  }
  pickTarget() { const opts = [-0.7, -0.5, -0.3, 0.3, 0.5, 0.7]; return opts[Math.floor(this.r() * opts.length) % opts.length]; }
  showHow(def) { this.howEl.textContent = `${def.title}: ${def.how}`; }
  setPromptsFor(id) {
    const hud = this.game.hud;
    const map = {
      standStill: [['lean', 'Lean']], leanMatch: [['lean', 'Lean']], stepTime: [['footL', 'Left'], ['footR', 'Right']], quickLean: [['lean', 'Lean']], oneFoot: [['footR', 'Hold down'], ['lean', 'Lean']],
    };
    hud.setPrompts(map[id]);
  }
  fixedEvent(dt) {
    const c = this.cur, lane = this.lanes[0];
    if (!c) return;
    if (c.state === 'show') {
      c.showT -= dt;
      if (c.showT <= 0) { c.state = 'run'; }
      return;
    }
    if (c.state === 'after') {
      c.afterT -= dt;
      if (c.afterT <= 0) this.nextTest();
      return;
    }
    c.t += dt;
    const b = lane.bal, def = c.def;
    b.sway = def.sway; b.tremor = def.tremor;
    const r = Math.hypot(lane.dotX, lane.dotZ);
    switch (c.id) {
      case 'standStill': c.sum += r * dt; c.n += dt; break;
      case 'oneFoot': {
        const held = lane.input.footR > 0.5 && lane.input.footL < 0.5;
        b.params.margin = held ? 0.225 : 0.45;
        c.sum += (held ? r : Math.max(r, 0.5)) * dt; c.n += dt;
        lane.doll.rig.loop(held ? 'pose4' : 'breathe');
        break;
      }
      case 'leanMatch': {
        const i = Math.min(2, Math.floor(c.t / 6));
        if (i !== c.tIdx) {
          c.tIdx = i;
          const x = c.targets[i];
          this.howEl.textContent = `Lean ${Math.round(Math.abs(x) * 100)}% ${x < 0 ? 'left' : 'right'}.`;
          this.game.audio.sfx('uiConfirm');
        }
        c.goal = c.targets[i];
        if (c.t - i * 6 > 1.5) { c.sum += Math.abs(lane.dotX - c.goal) * dt; c.n += dt; }
        break;
      }
      case 'stepTime': {
        const i = lane.input;
        const foot = i.footLPressed ? 'L' : i.footRPressed ? 'R' : null;
        if (foot) {
          lane.doll.rig.once(foot === 'L' ? 'stepR' : 'stepL');
          if (foot !== c.foot) {
            let best = null, bd = 1e9;
            for (const bt of c.beats) { if (bt.hit) continue; const d = Math.abs(bt.t - c.t); if (d < bd) { bd = d; best = bt; } }
            if (best && bd < 0.25) { best.hit = true; c.errors.push(bd); }
            c.foot = foot;
          }
        }
        for (const bt of c.beats) if (!bt.clicked && bt.t <= c.t) { bt.clicked = true; this.game.audio.sfx('metronome'); this.pulseBeat = 1; }
        break;
      }
      case 'quickLean': {
        c.nextPrompt -= dt;
        if (!c.active && c.nextPrompt <= 0 && c.prompts.length < 6 && r < 0.12) {
          const d = DIRS[Math.floor(this.r() * 4) % 4];
          c.active = { dir: d, t: 0 };
          c.prompts.push(d);
          this.howEl.textContent = `Lean ${d[2]}!`;
          this.game.audio.sfx('uiConfirm');
        }
        if (c.active) {
          c.active.t += dt;
          const [dx, dz] = c.active.dir;
          const proj = lane.dotX * dx + lane.dotZ * dz;
          if (proj > 0.15 || c.active.t > 2) {
            c.reactions.push(Math.min(2, c.active.t));
            c.active = null; c.nextPrompt = 0.6;
            this.howEl.textContent = 'And back to the middle.';
          }
        }
        break;
      }
      default: break;
    }
    if (c.t >= def.time) this.finishTest();
  }
  finishTest() {
    const c = this.cur;
    let score = 0;
    if (c.id === 'standStill' || c.id === 'oneFoot') score = 1 - (c.sum / Math.max(0.001, c.n)) / 0.25;
    if (c.id === 'leanMatch') score = 1 - (c.sum / Math.max(0.001, c.n)) / 0.4;
    if (c.id === 'stepTime') {
      const missed = c.beats.length - c.errors.length;
      const mean = (c.errors.reduce((a, b) => a + b, 0) + missed * 0.2) / Math.max(1, c.beats.length);
      score = 1 - mean / 0.12;
    }
    if (c.id === 'quickLean') {
      const rs = c.reactions;
      const mean = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 2;
      score = 1 - (mean - 0.35) / 0.9;
    }
    score = clamp01(score);
    this.scores[c.id] = score;
    this.lanes[0].bal.params.margin = 0.45;
    c.state = 'after'; c.afterT = 2.2;
    this.game.speech.say('trudy', line('trudy', score > 0.55 ? 'checkin_good' : 'checkin_bad'), { auto: 2, top: false });
    this.howEl.textContent = `${c.def.title}: ${Math.round(score * 100)}`;
    this.game.audio.sfx('stamp');
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    const c = this.cur;
    out.wishX = 0; out.wishZ = 0; out.footL = 0; out.footR = 0; out.footLPressed = false; out.footRPressed = false;
    if (!c || c.state !== 'run') return;
    let gx = 0, gz = 0;
    switch (c.id) {
      case 'leanMatch': {
        // Nobody reads a percentage bar exactly, and the slower you are the further out you are.
        const d = bot.data;
        if (d.barFor !== c.goal) { d.barFor = c.goal; d.misread = (bot.r() + bot.r() + bot.r() - 1.5) * 2 * (0.1 + bot.s.lag * 0.5); }
        const [x, z] = bot.steer((c.goal || 0) + d.misread, 0, true);
        out.wishX = x; out.wishZ = z;
        return;
      }
      case 'oneFoot': out.footR = 1; break;
      case 'quickLean':
        if (c.active && c.active.t > bot.s.lag) { gx = c.active.dir[0]; gz = c.active.dir[1]; out.wishX = gx; out.wishZ = gz; return; }
        break;
      case 'stepTime': {
        const d = bot.data;
        for (const bt of c.beats) {
          if (bt.botErr === undefined) bt.botErr = bot.timing();
          if (!bt.botDone && c.t >= bt.t + bt.botErr) {
            bt.botDone = true;
            d.foot = d.foot === 'L' ? 'R' : 'L';
            if (d.foot === 'L') { out.footLPressed = true; out.footL = 1; } else { out.footRPressed = true; out.footR = 1; }
            break;
          }
        }
        return;
      }
      default: break;
    }
    // On one foot there is half the stiffness, so correct gently, as under load.
    const [x, z] = bot.steer(gx, gz, c.id === 'oneFoot');
    out.wishX = x; out.wishZ = z;
  }
  hud() {
    const c = this.cur, lane = this.lanes[0];
    const hud = this.game.hud;
    if (!c) return;
    hud.setTime(c.state === 'run' ? c.def.time - c.t : null);
    lane.discView.zone = null;
    if (c.id === 'standStill' || c.id === 'oneFoot') lane.discView.zone = { x: 0, z: 0, r: 0.25, on: Math.hypot(lane.dotX, lane.dotZ) < 0.25 };
    if (c.id === 'leanMatch' && c.goal !== undefined) {
      lane.discView.zone = { x: c.goal, z: 0, r: 0.14, on: Math.abs(lane.dotX - c.goal) < 0.1 };
      const x = lane.dotX;
      this.barFill.style.left = `${x < 0 ? 50 + x * 50 : 50}%`;
      this.barFill.style.width = `${Math.min(50, Math.abs(x) * 50)}%`;
      this.barGoal.style.left = `${50 + c.goal * 50}%`;
    }
    if (c.id === 'quickLean' && c.active) lane.discView.zone = { x: c.active.dir[0] * 0.65, z: c.active.dir[1] * 0.65, r: 0.3, on: false };
    if (c.id === 'stepTime') {
      this.pulseBeat = Math.max(0, (this.pulseBeat || 0) - 0.08);
      this.beatEl.style.transform = `scale(${1 + this.pulseBeat * 0.5})`;
    }
  }
  frameEvent(dt) {
    this.trudy.update(dt);
    this.trudy.feel(this.lanes[0].dotX);
  }
  isDone() { return this.allDone; }
  dispose() { this.removeHud(); super.dispose(); }
  laneResult() { return { form: 0, raw: 0, stats: '' }; }
}

/** The Check-In and the reveal: lights dim, drum roll, numbers spin on a wooden counter, a sting, a line. */
export class CheckInMode {
  constructor(game) { this.game = game; this.name = 'checkin'; this.canPause = true; this.stage = 'tests'; }
  enter() {
    const g = this.game, pr = g.programme, p = g.save.profile;
    g.setIsland('hidden');
    g.ui.clear(); g.speech.clear();
    g.palette.set('dawn', 0.8);
    const tests = pr.testsToday();
    this.ev = new CheckInEvent({ game: g, tier: 0, tests, lanes: [{ kind: 'local', name: p ? p.name : 'You', colour: p ? paintColour(p.paint) : '#2CB5A0', hat: p ? p.hat : 'none', source: 'any' }], mode: 'solo' });
    g.currentEvent = this.ev;
    this.ev.build();
    g.sea.setLevel(-6.4);
    this.ev.cameraShot(true);
    g.hud.reset();
    g.hud.setDiscs(this.ev.lanes);
    g.hud.setPrompts([['lean', 'Lean']]);
    this.ev.hudSetup(g.hud);
    g.hud.show(true);
    g.audio.music('island');
    this.handle = g.scripts.run(this.flow());
  }
  restart() { const g = this.game; g.setMode(new CheckInMode(g), 'checkin'); }
  *flow() {
    const g = this.game, ev = this.ev, pr = g.programme, p = g.save.profile;
    yield 0.4;
    ev.begin();
    yield () => ev.isDone();
    ev.phase = 'done';
    yield 0.8;
    const vals = Object.values(ev.scores);
    const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    this.mean = mean;
    const age = pr.ageFor(mean, p.today.day);
    const prev = p.ages.length ? p.ages[p.ages.length - 1].age : null;
    const unlocked = pr.checkinDone(age, ev.scores);
    this.stage = 'reveal';
    g.hud.show(false);
    yield* this.reveal(age, prev);
    if (unlocked.unlocks && unlocked.unlocks.length) g.ui.toast(`New: ${unlocked.unlocks.map((u) => u.name).join(', ')}.`, 3);
    this.stage = 'done';
    refreshJarDisplay(g);
    g.go(() => { g.flow.toIsland({ afterCheckin: true }); });
  }
  *reveal(age, prev) {
    const g = this.game;
    let advanced = false;
    let digits = [];
    const scr = g.ui.only({
      name: 'reveal', className: 'dim', passive: true,
      build: (s) => {
        s.el.style.background = 'rgba(26,20,32,.82)';
        const c = h('div.counter', { style: 'margin-top:20rem' });
        digits = [h('div.digit', '0'), h('div.digit', '0')];
        c.append(...digits);
        s.el.append(h('div.h2', { style: 'margin-top:8rem' }, 'Your Wobble Age'), c);
      },
    });
    g.speech.say('trudy', line('trudy', 'reveal_lead'), { auto: 1.5 });
    g.audio.sfx('drumRoll', { dur: 2 });
    let t = 0;
    while (t < 2) {
      t += 1 / 120;
      if (Math.floor(t * 30) !== Math.floor((t - 1 / 120) * 30)) { digits[0].textContent = String(Math.floor(t * 41) % 10); digits[1].textContent = String(Math.floor(t * 67) % 10); }
      yield null;
    }
    const a = String(age).padStart(2, '0');
    digits[0].textContent = a[0]; digits[1].textContent = a[1];
    g.audio.sting('reveal');
    g.audio.sfx('stamp');
    g.rig.shake(0.05);
    const band = age >= 70 ? 'age_old' : age >= 50 ? 'age_mid' : age >= 30 ? 'age_low' : 'age_young';
    g.speech.say('trudy', line('trudy', band, { age }), {});
    let l = g.speech.line;
    yield () => !g.speech.line || g.speech.line !== l;
    if (prev !== null) {
      g.speech.say('trudy', line('trudy', age < prev ? 'age_down' : 'age_same', { prev }), {});
      l = g.speech.line;
      yield () => !g.speech.line || g.speech.line !== l;
    }
    advanced = true;
    g.ui.close(scr);
    return advanced;
  }
  fixed(dt) { this.ev.fixed(dt); }
  frame(dt) { this.ev.frame(dt); }
  exit() {
    const g = this.game;
    if (this.handle) this.handle.cancel();
    g.hud.show(false); g.hud.reset();
    this.ev.dispose();
    g.currentEvent = null;
    g.speech.clear();
    g.ui.clear();
  }
}
export { G, promptHTML };
