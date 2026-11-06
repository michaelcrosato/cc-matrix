import { CheckInTest } from '../events/checkin.js';
import { CHECK_NAMES } from '../data/programme.js';
import { rng } from '../core/rng.js';
import { esc } from '../ui/dom.js';
const HANDICAP = [24, 16, 8, 3, 0];
export function wobbleAge(mean, day) { const h = HANDICAP[Math.min(day - 1, 4)] ?? 0; return Math.max(18, Math.min(99, Math.round(18 + 81 * Math.pow(1 - Math.max(0, Math.min(1, mean)), 1.3) + h))); }
export function install(game) {
  const ui = game.ui, S = game.screens;
  game.checkIn = function* () {
    const p = game.profile; const days = game.programmeDays(); const d = days[p.day - 1]; let tests = d ? d.checks.slice() : ['standStill', 'leanMatch', 'quickLean'];
    if (tests[0] === 'best3') { const best = Object.entries(p.checkBest || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]); tests = best.length === 3 ? best : ['standStill', 'leanMatch', 'stepTime']; }
    const scores = []; p.checkBest = p.checkBest || {};
    for (const kind of tests) {
      let doneFlag = false; let sc = 0; const key = { standStill: 'tStand', leanMatch: 'tLean', stepTime: 'tStep', quickLean: 'tQuick', oneFoot: 'tOne' }[kind];
      game.wipe(() => { if (game.scr && game.scr.exit) game.scr.exit(); game.setScene('stage', { palette: 'dawn', music: 'island' }); game.island.group.visible = false; game.showHud(false); game.ev && game.disposeEvent(); game.screenName = 'checkintest'; game.scr = { nav() { }, prompts: () => null }; game.ev = new CheckInTest(game, { kind, tier: 0, seed: p.day * 7 + scores.length, lanes: game.makeLanes({}) }); game.eventOpts = { id: 'checkin', checkin: true }; game.ev.camSnap = true; game.ev.updateCamera(0.1); });
      yield 0.9; yield game.say('trudy', game.line('trudy', key)); yield 0.2; game.beginPlay2();
      yield () => game.ev && game.ev.phase === 'done'; yield 0.8; sc = game.ev.score01; scores.push(sc); p.checkBest[kind] = Math.max(p.checkBest[kind] || 0, sc); game.showHud(false); game.disposeEvent();
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length; const age = wobbleAge(mean, p.day); const prev = p.ages.length ? p.ages[p.ages.length - 1] : null;
    p.ages.push(age); p.checkedIn = true; p.todaysAge = age; p.marbles += 0; game.persist();
    game.wipe(() => game.go('reveal', { age, prev, mean }), 0.3);
  };
  game.beginPlay2 = () => { const ev = game.ev; ui.clear(); game.screenName = 'play'; game.scr = game.screens.play; ev.begin(); game.buildHud(); game.showHud(true); game.endSpeech(); };
  S.reveal = {
    enter({ age, prev, mean }) {
      game.setScene('stage', { palette: 'dusk', music: null }); game.island.group.visible = false; game.audio.stopMusic(); this.age = age; this.prev = prev; this.t = 0; this.stage = 0;
      ui.set(`<div class="center" style="position:fixed;inset:0;background:#1A1420CC"><div class="sign big">Your Wobble Age</div><div class="huge" id="wa" style="color:#FFF4DC;font-size:calc(var(--u)*320);-webkit-text-stroke:calc(var(--u)*10) var(--ink);paint-order:stroke fill;margin-top:calc(var(--u)*20)">00</div></div>`); this.wa = document.getElementById('wa'); game.audio.sfx('drumRoll', 2.2); ui.setPrompts(null);
      game.gfx.camera.position.set(0, 2, 8); game.gfx.camera.lookAt(0, 1, 0);
    },
    fixed(dt) {
      this.t += dt; if (this.stage === 0) { if (this.t < 2.3) this.wa.textContent = String(18 + Math.floor((this.t * 37) % 82)).padStart(2, '0'); else { this.stage = 1; this.wa.textContent = String(this.age); game.audio.sfx('reveal'); game.audio.sfx('stamp'); this.wa.style.transform = 'scale(1.15) rotate(-3deg)'; game.after(1.2, () => { const who = this.age >= 70 ? 'ageOld' : this.age <= 30 ? 'ageYoung' : 'age'; const line = who === 'age' ? game.line('trudy', 'age', { age: this.age, prev: this.prev ?? this.age + 10 }) : game.line('trudy', who, { age: this.age }); game.run(function* () { yield game.say('trudy', line); yield game.say('trudy', game.line('trudy', 'noAge')); game.profile.marbles += 1; game.profile.marbleList = (game.profile.marbleList || []).concat([1]); game.persist(); game.busy = false; game.wipe(() => { game.go('island', { at: 'board' }); game.go('plan'); }); }); }); } }
    },
    nav() { },
  };
}
