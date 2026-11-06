import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { CHARTS, chartNotes } from '../data/charts.js';
import { T } from '../core/tuning.js';
import { cyl, box, at, sphere, cone, bunting, lantern, palm, torus, mesh, toon, flat } from '../art/props.js';
import { makeDoll, PAINTS, HATS } from '../art/doll.js';
import { makeWalrus } from '../art/walrus.js';
import { el, txt } from '../ui/ui.js';
const SYM = { L: 'L', R: 'R', B: 'L+R', '<': '←', '>': '→', '^': '↑', v: '↓' };
const COL = { L: '#3B82F6', R: '#E8443A', B: '#F5B700', '<': '#7FD6C8', '>': '#7FD6C8', '^': '#7FD6C8', v: '#7FD6C8' };
const DIRS = { '<': [-1, 0], '>': [1, 0], '^': [0, -1], v: [0, 1] };
export class StepClass extends EventBase {
  static id = 'stepClass'; static title = 'Step Class'; static discipline = 'Cardio'; static instructor = 'bolster'; static place = 'The Bandstand'; static music = 'cardio'; static palette = 'dusk'; static couch = true; static session = true; static diagram = 'feet';
  static sentence = 'Press each foot as its print reaches the line. Lean into the arrows. The class copies you.';
  static can = 'You can lead lean arrows early: the dot is slow.'; static cant = "You can't fall in time with the music. You can fall, but not in time.";
  static verbs = [['left', 'Left'], ['right', 'Right'], ['hop', 'Both'], ['lean', 'Lean']];
  static tiers = [{ chart: 'tier1' }, { chart: 'tier2' }, { chart: 'tier3' }];
  static sessionConfig = { tier: 1, chart: 'session' };
  buildSet() {
    this.chart = CHARTS[this.opts.chart || this.tier.chart]; const c = chartNotes(this.chart); this.beat = c.beat; this.length = c.length; this.baseNotes = c.notes; this.timeLimit = c.length + .5; this.chartT = -3; this.combo = 0;
    const n = this.opts.laneCount || 1, w = 7 + n * 2.5;
    const stage = cyl(w, w + .3, .5, '#C89B6A', 8); stage.rotation.y = .39; this.add(stage, 0, -.25, -1.5);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + .39; this.add(at(cyl(.12, .14, 4.2, '#FFF8EE'), Math.sin(a) * (w - .4), 2.1, Math.cos(a) * (w - .4) - 1.5)); }
    const roof = cone(w + 1.2, 2.2, '#2FA7A0', 8); roof.rotation.y = .39; roof.castShadow = false; this.add(roof, 0, 5.3, -1.5);
    for (const [x, z, c] of [[-3, -1, 0xffd9a0], [3, -1, 0xffb0c8], [0, -3, 0xbfd8ff], [0, 2.5, 0xfff2d0]]) { const pl = new THREE.PointLight(c, 9, 16, 1.4); pl.position.set(x, 3.6, z); this.add(pl); }
    this.add(bunting(-w + .5, 3.8, -1.5 + 3, w - .5, 3.8, -1.5 + 3, 18)); this.add(palm(1.7), -w - 2.5, -.5, -3); this.add(palm(1.5), w + 2.5, -.5, -4);
    this.spots = []; for (const s of [-1, 1]) { const sp = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.5, 18, 1, true), flat('#FFF2C2', .22)); sp.position.set(s * 2.6, 2.6, .2); sp.visible = false; this.add(sp); this.spots.push(sp); }
    this.klass = []; const rows = [[-3.4, -2.6], [-1.15, -2.6], [1.15, -2.6], [3.4, -2.6], [-3.4, -4.3], [-1.15, -4.3], [1.15, -4.3], [3.4, -4.3]];
    rows.forEach(([x, z], i) => { const d = makeDoll({ paint: PAINTS[i % PAINTS.length], hat: HATS[(i * 3) % HATS.length], height: .92 + (i % 3) * .05 }); d.group.position.set(x, 0, z); d.rig.play('idle', 0); d.tripT = 0; this.add(d.group); this.anim.push(d); this.klass.push(d); });
    this.walrus = makeWalrus(); this.add(this.walrus.group, -4.2, 0, -2.2); this.walrus.group.rotation.y = .6; this.anim.push(this.walrus);
    this.beatLight = sphere(.25, '#FFD23F'); this.add(this.beatLight, 0, 4.3, -1); this.lastBeat = -1;
  }
  placeCamera(snap) { const spread = this.lanes.length ? Math.abs(this.lanes[this.lanes.length - 1].x - this.lanes[0].x) : 0; const d = this.game.rig.fitDistance(8, spread); this.game.rig.set(0, 2, d, 0, 1.35, -.5, snap); }
  setupHud2() { this.rib = el('div', 'ribbon'); this.rib.appendChild(el('div', 'target')); this.hudEl.appendChild(this.rib); this.noteEls = new Map(); this.judgeEl = txt('div', 'hudmsg', ''); }
  start() {
    for (const l of this.lanes) {
      l.notes = this.baseNotes.map(n => ({ ...n, state: 0 })); l.earned = 0; l.maxScore = 0; l.combo = 0; l.bestCombo = 0; l.perfect = 0; l.good = 0; l.ok = 0; l.miss = 0; l.lp = false; l.rp = false; l.ni = 0; l.baseClip = 'idle';
      if (l.kind === 'bot' || this.game.testBotSkill) l.plan = null;
    }
    this.notes0 = this.baseNotes;
    this.maxPts = this.baseNotes.length;
  }
  onPlayStart() {
    const a = this.game.audio; this.audioRef = null;
    if (a.running) { const when = a.now() + .05; this.audioRef = when; a.playTrack('cardio', { bpm: this.chart.bpm, startAt: when }); } else a.playTrack('cardio', { bpm: this.chart.bpm });
    this.chartT = 0;
  }
  clock(dt) {
    this.chartT += dt; const a = this.game.audio;
    if (this.audioRef != null && a.running && !this.game.manual) {
      const off = (this.game.settings?.rhythmOffset || 0) / 1000, at = a.now() - this.audioRef - (a.ctx.outputLatency || 0) - off;
      if (Math.abs(at - this.chartT) > .25) this.audioRef = a.now() - this.chartT - (a.ctx.outputLatency || 0) - off; else this.chartT = at;
    }
  }
  fixedPlay(dt) {
    this.clock(dt); const t = this.chartT, W = T.rhythmWindow * this.diff.win; const P = .045 * W, G = .09 * W, O = .135 * W, beat = this.beat;
    const bn = Math.floor(t / beat); if (bn !== this.lastBeat) { this.lastBeat = bn; this.beatPulse = 1; if (bn % 2 === 0) this.game.audio.sfx('tick', { high: bn % 8 === 0 }); this.walrus.rig.play('clap', .1); }
    for (const l of this.lanes) {
      if (l.kind === 'ghost' || !l.bal) continue;
      const I = l.in; const L = I.lf > .5, R = I.rf > .5; const lE = L && !l.lp, rE = R && !l.rp; l.lp = L; l.rp = R;
      const hop = I.hop;
      if (!l.fallen) {
        if (hop || lE || rE) {
          // Find the nearest unjudged foot note.
          let best = null, bd = 1; for (let i = l.ni; i < l.notes.length; i++) { const n = l.notes[i]; if (n.t > t + O + .1) break; if (n.state || !'LRB'.includes(n.k)) continue; const d = Math.abs(n.t - t); if (d < bd && d <= O) { const fits = n.k === 'B' ? (hop || lE || rE) : ((n.k === 'L' && (lE || hop)) || (n.k === 'R' && (rE || hop))); if (fits) { bd = d; best = n; } } }
          if (best) {
            if (best.k === 'B' && !hop) { if (best.first != null && t - best.first < .12) this.judge(l, best, Math.abs(best.first - best.t), P, G); else best.first = t; if (L && R) this.judge(l, best, Math.abs(t - best.t), P, G); }
            else this.judge(l, best, bd, P, G);
          }
          if (lE) { l.doll.rig.play('stepL', .05, 'idle'); } if (rE) { l.doll.rig.play('stepR', .05, 'idle'); }
          this.game.audio.sfx('foot', { high: rE });
        }
      }
      // Misses and lean notes
      for (let i = l.ni; i < l.notes.length; i++) {
        const n = l.notes[i]; if (n.t > t + 1) break;
        if (n.state) { if (i === l.ni) l.ni++; continue; }
        if (DIRS[n.k]) {
          if (t < n.t - .25 * beat) continue; const [dx, dz] = DIRS[n.k]; const v = l.bal.cobX * dx + l.bal.cobZ * dz, age = t - n.t;
          if (v >= .25 && age <= 1.5 * beat) { n.state = 1; l.earned += 1; this.hit(l, 'NICE'); }
          else if (v >= .25 && age <= 2 * beat) { n.state = 1; l.earned += .5; l.ok++; this.hit(l, 'OK'); }
          else if (age > 2 * beat) { n.state = 2; this.missed(l); }
        } else if (t - n.t > O) { n.state = 2; this.missed(l); }
      }
      l.form = Math.min(100, 100 * l.earned / Math.max(1, this.maxPts)); l.score = l.earned;
      // Guide the bot's lean ribbon
      l.leanGoal = this.leanAt(t);
    }
    if (t >= this.length) this.finish();
  }
  leanAt(t) { for (const n of this.baseNotes) { if (DIRS[n.k] && n.t + this.beat * .9 > t && n.t - this.beat * .9 < t) return DIRS[n.k]; } return null; }
  judge(l, n, d, P, G) {
    n.state = 1; let w = .4, word = 'OK'; if (d <= P) { w = 1; word = 'PERFECT'; l.perfect++; } else if (d <= G) { w = .7; word = 'GOOD'; l.good++; } else l.ok++;
    l.earned += w; this.hit(l, word);
  }
  hit(l, word) {
    l.combo++; l.bestCombo = Math.max(l.bestCombo, l.combo);
    if (l.kind === 'local') { this.lastWord = word; this.wordT = .4; }
    if (l.id === 0) { const k = this.klass; const sync = Math.min(8, Math.floor(l.combo / 2)); for (let i = 0; i < sync; i++) { const d = k[i]; if (d.tripT <= 0) d.rig.play(l.combo % 2 ? 'stepL' : 'stepR', .05, 'idle'); } }
    if (l.combo === 16 && l.id === 0) { for (const s of this.spots) s.visible = true; this.game.particles.confetti(0, 5, -1, 80); this.game.audio.sfx('cheer'); if (!this.attract) this.game.barkNow('bolster', 'step'); }
  }
  missed(l) { if (l.combo >= 16 && l.id === 0) for (const s of this.spots) s.visible = false; l.combo = 0; l.miss++; if (l.id === 0) { const d = this.klass[Math.floor(this.r() * 8)]; d.tripT = 1; d.rig.play('flop', .05); this.game.after(.9, () => { if (!this.disposed) { d.tripT = 0; d.rig.play('idle', .2); } }); if (l.kind === 'local' && this.barkT <= 0) this.bark('bolster', 'stepMiss'); } }
  frame2(dt) {
    const l = this.localLanes()[0] || this.lanes[0]; if (!l || !l.notes) return;
    this.setNum(l.combo, 'Combo'); this.setTime(this.phase === 'play' ? this.length - this.chartT : null);
    if (this.wordT > 0) { this.wordT -= dt; this.setMsg(this.lastWord); } else this.setMsg('');
    this.beatPulse = (this.beatPulse || 0) * Math.exp(-7 * dt); if (this.beatLight) this.beatLight.scale.setScalar(.25 * (1 + this.beatPulse * .9)); this.beatT = (this.beatT || 0) + dt;
    for (const s of this.spots) if (s.visible) s.rotation.z = Math.sin(this.t * 1.6 + s.position.x) * .4;
    if (!this.rib) return;
    const t = this.chartT, span = 2.6, seen = new Set();
    for (let i = l.ni; i < l.notes.length; i++) {
      const n = l.notes[i]; if (n.t > t + span) break; if (n.state) continue; seen.add(n);
      let e = this.noteEls.get(n); if (!e) { e = el('div', 'note'); e.textContent = SYM[n.k]; e.style.background = COL[n.k]; this.rib.appendChild(e); this.noteEls.set(n, e); }
      e.style.left = `${10 + (n.t - t) / span * 90}%`;
    }
    for (const [n, e] of this.noteEls) if (!seen.has(n)) { e.remove(); this.noteEls.delete(n); }
  }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l); const ct = this.chartT; if (!l.notes) return {};
    l.lfT = (l.lfT || 0) - dt; l.rfT = (l.rfT || 0) - dt;
    if (l.planI === undefined) { l.planI = 0; }
    const missRate = skill === 'sharp' ? .005 : skill === 'average' ? .02 : .06;
    while (l.planI < l.notes.length && l.notes[l.planI].t + .2 < ct) l.planI++;
    for (let k = l.planI; k < l.notes.length; k++) {
      const n = l.notes[k]; if (n.t > ct + .3) break; if (n.bp) continue; if (!'LRB'.includes(n.k)) { n.bp = true; continue; }
      if (n.fireAt === undefined) { n.fireAt = n.t + br.gauss() * br.s.timing; n.skip = br.r() < missRate; }
      if (ct >= n.fireAt) { n.bp = true; if (!n.skip) { if (n.k !== 'R') l.lfT = .05; if (n.k !== 'L') l.rfT = .05; } }
    }
    const goal = (() => { for (const n of l.notes) { if (DIRS[n.k] && !n.state && n.t - this.beat * 1.1 < ct && n.t + this.beat * 2 > ct) return DIRS[n.k]; } return [0, 0]; })();
    const [x, z] = br.correct(dt, l, goal[0] * .6, goal[1] * .6);
    return { x, z, lf: l.lfT > 0 ? 1 : 0, rf: l.rfT > 0 ? 1 : 0 };
  }
  onDispose() { this.game.audio.stopTrack(.4); }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: l.bestCombo, label: 'Best combo', stats: `Perfect ${l.perfect}, Good ${l.good}, OK ${l.ok}, Missed ${l.miss}` }; }
  forceThing() { this.game.particles.confetti(0, 5, -1, 80); }
}
