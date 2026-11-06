/** @file One fixed surgical tick: hands, instruments, parasites, physiology, clock and checkpoint transitions. */
import { getCase } from '../../data/cases';
import type { Hand, Operation, Rules } from '../../data/types';
import { clamp } from './geometry';
import { pressGift, shock, updateGift } from './gift';
import { event, fail, patientAt, rate, startPhase } from './state';
import { useTool } from './tools';
import { bleed } from './bleeding';
import { updateStrains } from '../strains';
export function stepOperation(s: Operation, hands: Hand[], r: Rules): void {
  if (s.status !== 'playing') return;
  s.tick++;
  if (s.clockScale !== r.balance.clock) {
    s.left = Math.round((s.left * r.balance.clock) / s.clockScale);
    s.clockScale = r.balance.clock;
  }
  let fieldRate = s.seats.some((p) => p.giftKind === 'still' && p.giftUntil > s.tick)
    ? r.balance.stillRate
    : s.seats.some((p) => p.pulseAt)
      ? 0.3
      : 1;
  if (hands.some((h) => h?.[8])) fieldRate *= r.balance.radialSlow;
  const delta = Math.round(100 * fieldRate),
    c = getCase(s.caseId);
  s.fieldTicks += delta;
  for (const p of s.seats) {
    const h = hands[p.id];
    if (h?.[3] === -1) p.active = false;
    if (!h || !p.active) continue;
    p.px = p.x;
    p.pz = p.z;
    p.x = clamp(Math.round(h[0] * 256) / 256, -7.2, 7.2);
    p.z = clamp(Math.round(h[1] * 256) / 256, -3.4, 3.4);
    p.site = clamp(Math.round(h[6]), 0, c.sites.length - 1);
    if (p.tool !== h[2]) {
      p.grab = 0;
      p.charge = 0;
      p.healthy = 0;
      event(s, 'switch', String(h[2]), p.x, p.z, p.id);
    }
    p.tool = clamp(Math.round(h[2]), 0, 7);
    if (h[4] > p.giftCounter) {
      p.giftCounter = h[4];
      pressGift(s, r, p, Math.max(s.tick - 30, Math.min(s.tick, h[9] ?? s.tick)));
    }
    if (h[5] > p.shockCounter) {
      p.shockCounter = h[5];
      shock(s, p.id, Math.max(s.tick - 30, Math.min(s.tick, h[9] ?? s.tick)));
    }
    if (h[7] > p.swapCounter) {
      p.swapCounter = h[7];
      if (s.humans === 1 && ['reverie', 'gala-night', 'mercy'].includes(c.id)) {
        const other = s.seats.find((q) => q.id !== p.id);
        if (other) {
          const state = {
            giftKind: p.giftKind,
            gift: p.gift,
            giftUntil: p.giftUntil,
            x: p.x,
            z: p.z,
            site: p.site,
            tool: p.tool,
            grab: p.grab,
            start: p.start,
          };
          Object.assign(p, {
            giftKind: other.giftKind,
            gift: other.gift,
            giftUntil: other.giftUntil,
            x: other.x,
            z: other.z,
            site: other.site,
            tool: other.tool,
            grab: other.grab,
            start: other.start,
          });
          Object.assign(other, state);
          event(s, 'swap', 'SURGEONS SWAPPED');
          event(s, 'say', p.giftKind === 'pulse' ? 'Sabine has the field.' : 'Wren has the field.');
        }
      }
    }
    if (!s.code) useTool(s, r, p, h[3] > 0);
    for (const t of s.targets) if (t.kind === 'tendril' && t.done && !t.clip) t.clip = s.fieldTicks + 60000;
  }
  if (
    c.id === 'crosstalk' &&
    s.phase === 0 &&
    s.codes[0] === 0 &&
    !s.code &&
    s.tick > 120 &&
    c.sites.some((_, site) => !s.targets.some((t) => t.site === site && t.required && !t.done))
  ) {
    s.patients[0] = 0;
    s.code = { patient: 0, until: s.fieldTicks + 48000, tries: 0, scripted: true };
    event(s, 'code', 'CODE. Both triggers, in the green band.');
  }
  updateGift(s, r);
  updateStrains(s, r, delta);
  bleed(s, r, delta);
  if (!r.freezeVitals && !r.attract) {
    for (let i = 0; i < s.patients.length; i++) {
      let drain = 0;
      for (const t of s.targets) {
        if (t.done || patientAt(s, t.site) !== i) continue;
        if (t.kind === 'wound') drain += t.deep ? 1.2 : 0.5;
        if (t.kind === 'bleeder') drain += 0.5;
        if (t.kind === 'lull') drain += 0.6;
        if (t.kind === 'numb') drain += 0.2;
        if (t.kind === 'balm') drain += t.radius * t.radius * 0.04;
        if (t.kind === 'wound' && t.generation === 2 && s.fieldTicks - t.born > 120000) t.deep = true;
      }
      if (!s.seats.some((p) => p.giftUntil > s.tick && p.giftKind === 'pulse'))
        s.patients[i] -=
          ((drain * delta) / 6000) *
          r.balance.vitalsDrain *
          (r.difficulty === 'Intern' ? 0.6 : r.difficulty === 'Attending' ? 1.3 : 1);
      if (s.patients[i] <= 0 && !s.code) {
        if (c.id === 'first-cut' || c.id === 'quiet-lump' || s.codes[i] >= 1) fail(s, 'The rhythm is gone.');
        else {
          s.patients[i] = 0;
          s.code = { patient: i, until: s.fieldTicks + 48000, tries: 0, scripted: false };
          event(s, 'code', 'CODE. Charge the paddles.');
        }
      }
    }
  }
  if (s.code && s.fieldTicks > s.code.until && !r.attract) fail(s, 'The charge window closed.');
  if (!r.freezeClock && !r.attract) s.left = Math.max(0, s.left - delta);
  if (s.left === 0 && !r.attract) fail(s, 'Time of death. You ran out of time.');
  const phase = c.phases[s.phase];
  if (phase.goal === 'race' && s.fieldTicks - s.phaseAt > 180000 && !r.attract)
    fail(s, 'Thirty seconds. The ventricle could not wait.');
  if (s.status !== 'playing') return;
  const goals = s.targets.filter((t) => t.required && !t.done && t.kind !== 'flap');
  const complete = phase.goal === 'stabilize' ? s.patients[0] >= 58 : goals.length === 0;
  const giftDone = phase.goal !== 'gift' || s.seats.some((p) => p.giftUntil > 0);
  if (complete && !s.code && giftDone) {
    if (++s.phaseWait >= 36) {
      rate(s, r, s.seats[0], 'CLEAN', 1000);
      if (s.phase === c.phases.length - 1) {
        s.status = 'won';
        event(s, 'won', 'OPERATION COMPLETE');
      } else startPhase(s, s.phase + 1);
    }
  } else s.phaseWait = 0;
  if (s.tick - s.lastProgress > 480 && s.tick % 480 === 0 && r.difficulty !== 'Attending') event(s, 'hint', s.hint);
  if (r.attract) for (let i = 0; i < s.patients.length; i++) s.patients[i] = Math.max(65, s.patients[i]);
}
