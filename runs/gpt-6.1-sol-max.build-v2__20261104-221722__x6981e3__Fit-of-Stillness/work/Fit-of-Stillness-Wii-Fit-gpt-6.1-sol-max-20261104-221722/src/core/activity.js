import { Dot, BalanceBot, clamp, disc, rng } from './dot.js';
import { stepNotes, TRAY_BOARDS } from '../data/activities.js';
import { LONG_EVENTS } from '../data/week.js';
export function repTarget(t, tempo) { const p = (t % tempo) / tempo; return p < .4 ? p / .4 : p < .55 ? 1 : p < .9 ? 1 - (p - .55) / .35 : 0; }
export class ActivityRun {
  constructor(data, T, { seed = 1, hard = false, gentle = false, duration } = {}) {
    this.data = data; this.T = T; this.random = rng(seed); this.dot = new Dot(this.random); this.hard = hard; this.gentle = gentle;
    this.duration = duration || data.duration; this.t = 0; this.score = 0; this.inside = 0; this.breath = 0; this.sync = 0; this.r = 0; this.error = 0;
    this.combo = 0; this.bestCombo = 0; this.hoops = 1; this.lift = .8; this.omega = 0; this.angle = null; this.rotations = 0; this.drop = 0;
    this.notes = data.kind === 'step' ? stepNotes(data.bpm).filter(n => n.t < this.duration) : [];
    this.objects = []; this.wave = 0; this.nextWave = 0; this.x = 0; this.daze = 0; this.hits = 0; this.misses = 0;
    this.progress = 0; this.falls = 0; this.recover = 0; this.pace = 0; this.cups = 0; this.lastFoot = ''; this.lastStep = -1; this.cadence = 0; this.stitch = 0;
    this.ballTarget = 0; this.balls = Array.from({length:8}, (_, i) => ({ x: (i % 4 - 1.5) * .5, y: 0, z: .2 + Math.floor(i / 4) * .55, vx: 0, vz: 0, color: i % 2, done: false, wrong: 0 }));
    this.board = TRAY_BOARDS[this.hard ? 2 : seed % 2]; this.trayWalls = [];
    this.trayCups=[{x:-2.4,z:-1.35,color:0},{x:2.4,z:-1.35,color:1}];if(this.hard){this.trayCups.push({x:0,z:-.325,color:2});this.balls.forEach((b,i)=>b.color=i%3);}
    this.board.forEach((row,z)=>[...row].forEach((c,x)=>{if(c==='#'&&x>0&&x<8&&z>0&&z<5)this.trayWalls.push({x:(x-4)*.7,z:(z-2.5)*.65});}));
    this.attempt = 0; this.speed = 6; this.power = 0; this.distance = 0; this.bestDistance = 0; this.style = false; this.jumped = false;
    this.events = []; this.inRing = true; this.done = false; this.input = {}; this.recent = ''; this.quality = ''; this.eventIndex = -1;
  }
  get ring() { let r = this.data.ring || .3; if (this.data.kind === 'long') r = this.t < 30 ? .4 : this.t < 50 ? .34 : this.t < 75 ? .28 : .24; return r * this.T.ringScale * (this.hard ? .72 : 1) * (this.gentle ? 1.25 : 1); }
  emit(type, text) { this.events.push({ type, text, t: this.t }); this.recent = text || this.recent; }
  target() { return { x: 0, y: 0 }; }
  step(dt, input) {
    if (this.done) return;
    dt = Math.min(dt, this.duration - this.t);
    this.input = input; this.t = Math.min(this.duration, this.t + dt); const a = this.data, T = this.T, u = input;
    this.daze = Math.max(0, this.daze - dt); this.stitch = Math.max(0, this.stitch - dt);
    if (a.kind === 'pose' || a.kind === 'long') {
      const breathIn = a.breath && this.t % a.breath < a.breath / 2;
      this.sync += ((!!u.breath === !!breathIn ? 1 : 0) - this.sync) * Math.min(1, dt * 5);
      const m = { noise: (this.gentle ? .8 : 1) * (this.hard ? 1.25 : 1) };
      if (a.breath) m.noise *= 1.25 - T.breathBonus * this.sync;
      if (a.twist === 'wander') m.bx = Math.sin(this.t * .4) * (a.id === 'fold' ? .18 : .12);
      if (a.twist === 'ramp') m.noise *= 1 + .5 * this.t / this.duration;
      if (a.twist === 'breath') m.noise *= 1.3;
      if (a.twist === 'tremor') { m.inst = 1.2; if (this.t > 20) m.bx = Math.sin(this.t * 25) * .3; }
      if (a.kind === 'long') {
        const ei = LONG_EVENTS.findLastIndex(([t]) => this.t >= t);
        if (ei > this.eventIndex) { this.eventIndex = ei; this.emit('story', LONG_EVENTS[ei][2]); if ([20, 65, 85].includes(LONG_EVENTS[ei][0])) this.dot.vx += (ei % 2 ? 1 : -1) * .6; }
        if (this.t >= 10 && this.t < 85) m.bx = .1;
        if (this.t >= 35 && this.t < 75) m.noise *= 1.2;
      }
      this.dot.step(dt, u.x || 0, u.y || 0, T, m);
      const inside = Math.hypot(this.dot.x, this.dot.y) <= this.ring;
      if (inside !== this.inRing) this.emit(inside ? 'in' : 'out'); this.inRing = inside;
      this.inside += inside ? dt : 0; this.breath += this.sync * dt;
      this.score = 100 * (a.breath ? .8 * this.inside + .2 * this.breath : this.inside) / this.t;
    } else if (a.kind === 'reps') {
      const tempo = a.tempo * T.repTempoScale * (this.hard ? .8 : 1); this.targetR = repTarget(this.t, tempo);
      if (u.rate) { const axis = a.axis === 'x' ? (Math.floor(this.t / tempo) % 2 ? -u.x : u.x) : a.axis === 'up' ? u.y : -u.y; this.r = clamp(this.r + axis * dt / (tempo * .37)); }
      else { const wanted = u.rep ?? (a.axis === 'x' ? Math.abs(u.x || 0) : a.axis === 'up' ? clamp(u.y || 0) : clamp(-(u.y || 0))); this.r += (wanted - this.r) * Math.min(1, dt / (T.repLag * (a.id === 'press' ? 1.5 : 1))); }
      const fatigue = Math.sin(this.t * 21) * T.repFatigue * (this.t / this.duration) ** 2;
      this.error += Math.abs(clamp(this.r + fatigue) - this.targetR) * dt;
      this.score = clamp(1 - 1.6 * this.error / this.t) * 100;
      this.quality = Math.abs(this.r - this.targetR) < .09 ? 'Perfect' : Math.abs(this.r - this.targetR) < .22 ? 'Good' : 'Wobbly';
      const rep = Math.floor(this.t / tempo); if (rep !== this.rep) { this.rep = rep; this.emit('rep', rep >= a.reps - 3 ? rep === a.reps - 1 ? 'I lied. This is the last one.' : 'Last one.' : 'Good. Again.'); }
    } else if (a.kind === 'hoop') {
      const mag = Math.hypot(u.x || 0, u.y || 0), angle = Math.atan2(u.y || 0, u.x || 0);
      let speed = 0; if (mag > .5 && this.angle !== null) { let delta = angle - this.angle; while (delta > Math.PI) delta -= Math.PI * 2; while (delta < -Math.PI) delta += Math.PI * 2; speed = delta / dt / (Math.PI * 2); } this.angle = mag > .5 ? angle : null;
      this.omega += (speed - this.omega) * Math.min(1, dt / .25);
      const direction = this.t < 25 ? 1 : this.t < 50 ? -1 : Math.sign(this.omega) || 1;
      const inBand = this.omega * direction >= T.hoopLow && this.omega * direction <= T.hoopHigh;
      if (this.drop > 0) { this.drop -= dt; this.lift = .65; } else { this.lift = clamp(this.lift + (inBand ? T.hoopLiftRate : this.omega * direction < -.2 ? -.5 : -.25) * dt); if (this.lift <= 0) { this.drop = 1.5; this.hoops = Math.max(1, this.hoops - 1); this.emit('fall', 'The hoop has requested the floor.'); } }
      if (inBand && this.drop <= 0) this.rotations += Math.abs(this.omega) * dt * (1 + .5 * (this.hoops - 1));
      const wave = Math.floor(this.t / 9); this.catchSide = wave % 2 ? -1 : 1; this.catchTime = wave * 9 + 7.5;
      if (this.t > this.catchTime && this.t < this.catchTime + .4 && (u.x || 0) * this.catchSide > .7 && this.caughtWave !== wave) { this.caughtWave = wave; this.hoops = Math.min(4, this.hoops + 1); this.emit('catch', 'A sound investment.'); }
      if (this.t >= 25 && !this.reversed) { this.reversed = true; this.emit('story', 'Now the other way.'); }
      this.score = this.rotations; this.inRing = inBand;
    } else if (a.kind === 'step') {
      const offset = T.stepOffsetMs / 1000, win = .14 * T.stepWindow * (this.hard ? .75 : 1);
      for (const [pressed, side] of [[u.stepL, 'L'], [u.stepR, 'R']]) if (pressed) {
        const note = this.notes.find(n => !n.hit && n.side === side && Math.abs(n.t - this.t - offset) <= win);
        if (note) { const delta = Math.abs(note.t - this.t - offset); note.hit = true; note.value = delta <= .055 * T.stepWindow ? 1 : delta <= .10 * T.stepWindow ? .7 : .4; this.combo++; this.hits++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.quality = note.value === 1 ? 'Perfect' : note.value === .7 ? 'Good' : 'OK'; this.emit('step', this.quality); }
        else { this.combo = 0; this.emit('miss', 'A footnote.'); }
      }
      for (const n of this.notes) if (!n.hit && this.t > n.t + win + Math.abs(offset)) { n.hit = true; n.value = 0; this.misses++; this.combo = 0; }
      this.score = this.notes.reduce((s, n) => s + (n.value || 0), 0) / Math.max(1, this.notes.length) * 100;
    } else if (a.kind === 'header') {
      if (Math.abs(u.x || 0) > .025) this.lastLean = this.t;
      this.x = clamp(this.x + (this.daze ? 0 : (u.x || 0) * 4.5 * dt), -.85, .85);
      if (this.t >= this.nextWave) { const r = this.random(); this.objects.push({ t: this.t + 1.4, x: (this.random() * 2 - 1) * .8, type: r < .7 ? 'coconut' : r < .95 ? 'flip' : 'gold', resolved: false }); this.nextWave = this.t + (1.3 - .6 * this.t / this.duration) * T.headerInterval * (this.hard ? .8 : 1); this.wave++; }
      for (const o of this.objects) if (!o.resolved && this.t >= o.t) { o.resolved = true; const hit = Math.abs(o.x - this.x) < .27; if (hit && o.type !== 'flip' && this.t - (this.lastLean ?? -10) < 1.5) { this.combo++; const tier = this.combo >= 20 ? 4 : this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1; this.score += o.type === 'gold' ? 30 : 10 * tier; this.hits++; this.emit('bonk', this.combo % 5 === 0 ? 'Dennis has stopped being fine.' : 'Noted.'); } else if (hit && o.type==='flip') { this.score = Math.max(0, this.score - 10); this.combo = 0; this.daze = .6; this.emit('thwap', 'That was footwear.'); } else if (o.type !== 'flip') { this.combo = 0; this.misses++; } this.bestCombo = Math.max(this.bestCombo, this.combo); }
      this.objects = this.objects.filter(o => this.t - o.t < .8);
    } else if (a.kind === 'slack') {
      if (this.recover > 0) { this.recover -= dt; this.dot.x = this.dot.vx = 0; }
      else {
        const walking = (u.y || 0) > .3, gust = this.progress > 5 && this.progress % 6 < 1.1;
        this.dot.step(dt, u.x || 0, 0, T, { inst: (walking ? T.slackWalkInst : 1.2) / Math.max(.01, T.dotInstability), noise: 1.25, bx: (gust ? Math.floor(this.progress / 6) % 2 ? 1 : -1 : 0) * T.gustForce + (this.progress > 18 && this.progress < 24 ? .1 : 0) }); this.dot.y = this.dot.vy = 0;
        if (walking) this.progress += dt * 1.1;
        if (Math.abs(this.dot.x) > 1) { this.falls++; this.progress = Math.floor(this.progress / 10) * 10; this.recover = 1.2; this.emit('splash', 'The lagoon has noted your arrival.'); }
      }
      if (this.progress >= 30) this.done = true;
      this.score = this.progress >= 30 ? Math.max(0, 1000 - 60 * this.falls - 8 * (this.t - 27)) : 0;
    } else if (a.kind === 'tray') {
      const accel = T.trayGravity * Math.sin(T.trayMaxTilt * Math.PI / 180);
      for (const b of this.balls) if (!b.done) {
        if(b.respawn){if(this.t<b.respawn)continue;b.respawn=0;b.x=0;b.z=.7;b.vx=b.vz=0;}
        b.vx += ((u.x || 0) * accel - b.vx * 1.4) * dt; b.vz += (-(u.y || 0) * accel - b.vz * 1.4) * dt; b.x += b.vx * dt; b.z += b.vz * dt;
        for(const wall of this.trayWalls){const dx=b.x-wall.x,dz=b.z-wall.z;if(Math.abs(dx)<.48&&Math.abs(dz)<.45){if(Math.abs(dx)>.9*Math.abs(dz)){b.x=wall.x+Math.sign(dx||1)*.48;b.vx*=-.4;}else{b.z=wall.z+Math.sign(dz||1)*.45;b.vz*=-.4;}}}
        if(this.hard&&b.z>1.6&&Math.abs(b.x)<.7){b.respawn=this.t+3;this.score=Math.max(0,this.score-1);this.emit('fall','A vitamin has taken a short break.');continue;}
        if (Math.abs(b.x) > 2.8) { b.x = clamp(b.x, -2.8, 2.8); b.vx *= -.4; } if (Math.abs(b.z) > 1.7) { b.z = clamp(b.z, -1.7, 1.7); b.vz *= -.4; }
        for (const cup of this.trayCups) if (Math.hypot(b.x-cup.x,b.z-cup.z) < .42 && this.t > b.wrong) { if (cup.color === b.color) { b.done = true; this.score += 10; this.emit('catch', 'Filed under the correct colour.'); } else { this.score = Math.max(0, this.score - 3); b.wrong = this.t + 3; b.vz = 1; this.emit('miss', 'A clerical error.'); } }
      }
      if (this.balls.every(b => b.done)) this.done = true;
    } else if (a.kind === 'jog') {
      this.x = clamp(this.x + (u.x || 0) * dt * 3, -1.5, 1.5);
      for (const [pressed, side] of [[u.stepL, 'L'], [u.stepR, 'R']]) if (pressed) { if (side === this.lastFoot) { this.stitch = .5; this.emit('miss', 'The other foot. A useful distinction.'); } else if (this.lastStep >= 0) this.cadence += (clamp(1 / Math.max(.08, this.t - this.lastStep), 0, 7) - this.cadence) * .5; this.lastFoot = side; this.lastStep = this.t; this.hits++; }
      if (this.t - this.lastStep > 1) this.cadence *= Math.max(0, 1 - dt * 2);
      const band = this.cadence >= T.jogTargetCadence * .8 && this.cadence <= T.jogTargetCadence * 1.2;
      if (this.cadence > T.jogTargetCadence * 1.2) this.overpace = (this.overpace || 0) + dt; else this.overpace = 0;
      if (this.overpace > 2) { this.stitch = 3; this.overpace = 0; this.emit('out', 'A stitch. An avoidable punctuation mark.'); }
      this.progress += Math.min(3.6, this.cadence) * dt * (this.stitch ? .5 : 1); this.pace += band ? dt : 0;
      const cup = Math.min(18, Math.floor(this.progress / 12)); if (cup > (this.cupIndex || 0)) { this.cupIndex = cup; if (Math.abs(this.x - Math.sin(cup * 2) * 1.2) < .65) { this.cups++; this.emit('catch'); } }
      this.score = 70 * this.pace / this.t + 30 * this.cups / 18; if (this.progress >= 220) this.done = true;
    } else if (a.kind === 'pier') {
      const attempt = Math.min(2, Math.floor(this.t / 10)), phase = this.t % 10;
      if (attempt !== this.attempt) { this.attempt = attempt; this.speed = 6; this.jumped = this.style = false; this.power = 0; this.inside = 0; }
      if (phase < 5 && (u.y || 0) < -.4) this.speed = Math.min(14, this.speed + dt * 1.8);
      if (u.confirm && phase >= 4.5 && phase < 5.5 && !this.jumped) { this.power = clamp(1 - Math.abs(phase - 5) / .25); this.jumped = true; this.emit('jump'); }
      if (phase >= 5 && phase < 9) { this.dot.step(dt, u.x || 0, u.y || 0, T, {inst:3}); this.inside += Math.hypot(this.dot.x,this.dot.y) < .45 ? dt : 0; if (u.confirm && phase > 8.5) this.style = true; this.distance = this.speed * (.8 + .6 * this.power) * (.6 + .4 * this.inside / Math.max(.016, phase - 5)) * T.pierBoost; }
      if (phase >= 9 && this.splashed !== attempt) { this.splashed = attempt; this.bestDistance = Math.max(this.bestDistance, this.distance + (this.style ? 2 : 0)); this.emit('splash', this.style ? 'A considered cannonball.' : 'The water has accepted your application.'); }
      this.score = this.bestDistance;
    }
    if (this.t >= this.duration) this.done = true;
    this.score = Math.max(0, this.score || 0);
  }
  result() {
    let stars = this.data.stars.filter(s => this.score >= s * this.T.starThresholdScale).length;
    if (this.data.kind === 'slack') stars = this.progress < 30 ? 0 : this.falls === 0 && this.t < 32 ? 3 : this.falls <= 1 && this.t < 45 ? 2 : 1;
    return { id: this.data.id, score: Math.round(this.score * 10) / 10, stars, seconds: this.t, falls: this.falls, combo: this.bestCombo, inRing: this.inside / Math.max(1, this.t) };
  }
  fingerprint() { return JSON.stringify([this.data.id, this.t, this.score, this.dot.x, this.dot.y, this.r, this.x, this.progress, this.combo]); }
}
export class ActivityBot {
  constructor(skill = 'expert', seed = 1) { this.skill = skill; this.random = rng(seed); this.balance = new BalanceBot(skill, this.random); this.lastFoot = -1; this.hit = new Set(); }
  read(run, dt) {
    const u = { x: 0, y: 0, breath: false, stepL: false, stepR: false, confirm: false };
    if (this.skill === 'idle') return u;
    const q = { sloppy: .35, average: .6, good: .85, expert: 1 }[this.skill] || 1, t = run.t + dt, a = run.data;
    if (['pose','long','slack','pier'].includes(a.kind)) Object.assign(u, this.balance.read(run.dot, dt));
    if (a.breath) u.breath = (t + (1 - q) * .9) % a.breath < a.breath / 2;
    if (a.kind === 'slack') u.y = Math.abs(run.dot.x) < .45 * q ? 1 : 0;
    if (a.kind === 'reps') u.rep = clamp(repTarget(t + (1 - q) * .7, a.tempo * run.T.repTempoScale * (run.hard ? .8 : 1)) + Math.sin(t * 4) * (1 - q) * .3);
    if (a.kind === 'hoop') { const dir = t < 25 ? 1 : -1, theta = t * Math.PI * 2 * (q < .5 ? .6 : 1.8) * dir; u.x = Math.cos(theta); u.y = Math.sin(theta); const wave = Math.floor(t / 9); if (t % 9 > 7.6 && t % 9 < 7.8) u.x = wave % 2 ? -1 : 1; }
    if (a.kind === 'step') for (let i = 0; i < run.notes.length; i++) { const n = run.notes[i]; if (!this.hit.has(i) && t >= n.t + (1 - q) * .25 && t < n.t + .4) { this.hit.add(i); u[n.side === 'L' ? 'stepL' : 'stepR'] = true; } }
    if (a.kind === 'header') { const o = run.objects.find(o => !o.resolved && (q > .5 || o.t - t < .23)); if (o) { const target = (o.type === 'flip' ? o.x > 0 ? -.8 : .8 : o.x) + Math.sin(t*3.1)*(1-q)*.4; u.x = clamp((target - run.x) * (q * 12), -1, 1); } }
    if (a.kind === 'tray') { const b = run.balls.find(b => !b.done && b.color === 0) || run.balls.find(b => !b.done); if (b) { const cup=run.trayCups[b.color];u.x = clamp((cup.x - b.x) * 1.8 - b.vx * 1.8, -q, q); u.y = clamp(-(cup.z - b.z) * 1.8 + b.vz * 1.8, -q, q); } }
    if (a.kind === 'jog') { const tick = Math.floor(t * run.T.jogTargetCadence * (q < .5 ? .6 : 1)); if (tick !== this.lastFoot) { this.lastFoot = tick; u[tick % 2 ? 'stepR' : 'stepL'] = true; } u.x = clamp((Math.sin((Math.floor(run.progress / 12) + 1) * 2) * 1.2 - run.x) * 4, -1, 1); }
    if (a.kind === 'pier') { const p = t % 10; if (p < 4.85) u.y = -.65; u.confirm = Math.abs(p - (5 + (1 - q) * .3)) < dt || Math.abs(p - 8.75) < dt; }
    return u;
  }
}
