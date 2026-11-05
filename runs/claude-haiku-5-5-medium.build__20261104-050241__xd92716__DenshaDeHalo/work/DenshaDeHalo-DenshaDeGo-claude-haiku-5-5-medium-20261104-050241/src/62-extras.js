/* Densha de Halo! · 62-extras: the things the drive shows around the play: the S0 lessons (Hoshino's steps), the Stop Cam (a
 * 2D side view after each stop), the postcards (section 4.22) and their unlock rules. Each is pure data plus a small drawer. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;

/* ---- the S0 lessons (section 5.3): each step waits for its condition, then Hoshino says the next line ---- */
DH.LESSONS = [
  { say: 'So. You are the new one. Lever up: power. P1. Gently.', done: s => s.train.v >= 10 },
  { say: 'N. Let her coast.', done: s => s.train.notch === 0 && s.train.v > 5 },
  { say: 'Lever down: brake. Watch the needle, not your hand.', done: s => s.train.v < 5 },
  { say: 'The yellow board. Put your nose on it.', done: s => s.stopIdx >= 1 },
  { say: 'Forty is the limit. Forty is not a suggestion.', done: s => s.stopIdx >= 2 && s.train.v > 25 && s.train.v <= 40 },
  { say: 'Near the stop, ease off to B1. The passengers coffee will thank you.', done: s => s.stopIdx >= 3 || (s.stats.smooth >= 1) },
  { say: 'That is the emergency brake. You will hate the day you need it.', done: s => s.stats.ebs >= 1 },
  { say: 'Last mark. Inside one metre and I sign your card.', done: s => s.finished }
];
/** the S0 step: returns the current line, advancing when its condition holds. Null when done. */
DH.lessonStep = (S) => {
  const sim = S.sim, i = S.lessonIdx || 0;
  if (i >= DH.LESSONS.length) return null;
  const L = DH.LESSONS[i];
  if (L.done(sim)) { S.lessonIdx = i + 1; return DH.lessonStep(S); }
  return L.say;
};

/* ---- the Stop Cam (section 4.6): a side elevation of the platform edge, the mark post, the train's nose easing to its
 * place, and the metres. Shown for 2.5 s after each stop, or until a button is pressed. ---- */
DH.drawStopCam = (g, r, S, age) => {
  const W = r.W, H = r.H, w = Math.round(W * .34), h = Math.round(H * .34), x0 = W - w - 8, y0 = Math.round(H * .18);
  E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: ['#0a0a14', '#0a0a14'], border: '#8a80b8', alpha: .95 });
  const t = Math.min(1, age / 1.2), ease = 1 - Math.pow(1 - t, 3), err = S.stopCamErr || 0;
  const ground = y0 + h - 16, scale = h / 4.2;   // pixels per metre (vertical)
  const px = E.px;
  px.rect(g, x0, ground, w, h - (ground - y0), '#3a3a40');                     // the platform's ground
  const markX = x0 + w * .62, platX = x0 + w * .2;
  px.rect(g, platX, ground - 1.1 * scale, w * .5, 1.1 * scale, '#b4b0a6');      // the platform edge
  px.line(g, markX, ground, markX, ground - 2.6 * scale, '#f2c230', 2);       // the mark post
  E.font.text(g, S.stopCamLabel || 'STOP', x0 + 4, y0 + 3, '#f2c230', { scale: 1 });
  // the nose slides from the left of the frame to its final place (the error from the mark)
  const finalX = markX + err * scale * 4, startX = x0 - 8, noseX = startX + (finalX - startX) * ease;
  px.rect(g, noseX - w * .18, ground - 2.9 * scale, w * .3, 2.9 * scale, '#c9ced6');
  px.rect(g, noseX - w * .18, ground - 2.9 * scale, w * .3, 1, '#f2c230');
  if (t >= 1) E.font.text(g, (err >= 0 ? '+' : '') + err.toFixed(2) + ' M', x0 + w - 4, y0 + 3, '#ffffff', { align: 'right', scale: 1 });
};

/* ---- postcards (section 4.22): eight, unlocked by the conditions in the stage's own record ---- */
DH.POSTCARDS = [
  { id: 1, title: 'Your First Halo', from: 'Haro-kun', text: 'Harooo! A PERFECT stop!', when: r => r.perfect >= 1 },
  { id: 2, title: 'Right at My Door!', from: 'Kota', text: 'Hanabatake, GREAT or better!', when: r => ['GREAT!', 'PERFECT HALO!'].includes(r.stopLabels && r.stopLabels.hanabatake) },
  { id: 3, title: 'Rain or Shine', from: 'Mika', text: 'Rain, no overrun, no slip!', when: r => r.stage === 'S2' && r.overruns === 0 && r.slips === 0 && r.finished },
  { id: 4, title: 'Takoyaki Saved', from: 'Fuji', text: 'The crossing was clear.', when: r => r.stage === 'S3' && r.hazard >= 1 },
  { id: 5, title: 'Not One Second', from: 'Ren', text: 'Every arrival on time!', when: r => r.stage === 'S4' && r.finished && r.onTime >= 1 && r.late === 0 },
  { id: 6, title: 'The Last Halo', from: 'Hoshino', text: 'Thirty-eight years. Thank you, Rookie.', when: r => r.stage === 'S5' && r.finished && !r.gameOver },
  { id: 7, title: 'Point, Call, Proceed', from: 'Mika', text: 'Every call in a stage GREAT!', when: r => r.calls > 0 && r.callsGreat === r.calls },
  { id: 8, title: 'Gentle Hands', from: 'Kenji', text: 'Every stop SMOOTH. My coffee is safe.', when: r => r.stops > 0 && r.smooth === r.stops }
];
/** the record of a finished stage, for the postcard rules */
DH.stageRecord = (sim) => {
  const s = sim.stats;
  return { stage: sim.stage.id, perfect: s.perfect, stopLabels: sim.stopLabels, overruns: s.overruns, slips: s.slips, finished: sim.finished, gameOver: sim.gameOver,
    hazard: s.hazard, onTime: s.onTime, late: s.late, calls: s.calls, callsGreat: s.callsGreat, stops: s.stops, smooth: s.smooth };
};
/** unlock the postcards a finished stage earns; returns the newly unlocked ones */
DH.unlockPostcards = (p, sim) => {
  const rec = DH.stageRecord(sim), got = [];
  p.postcards = p.postcards || [];
  for (const c of DH.POSTCARDS) if (!p.postcards.includes(c.id) && c.when(rec)) { p.postcards.push(c.id); got.push(c); }
  return got;
};
})();
