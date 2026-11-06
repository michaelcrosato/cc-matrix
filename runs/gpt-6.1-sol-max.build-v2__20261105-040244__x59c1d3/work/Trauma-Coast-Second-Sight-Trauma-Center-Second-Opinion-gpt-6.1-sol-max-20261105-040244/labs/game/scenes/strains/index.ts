/** @file Deterministic telegraphed parasite state machines, reattaching tendrils and flap physics. */
import { getCase } from '../../data/cases';
import { STRAINS } from '../../data/strains';
import type { Operation, Rules, Target } from '../../data/types';
import { clamp } from '../op/geometry';
import { event, patientAt, spawn } from '../op/state';
export function telegraph(s: Operation, t: Target, rules: Rules): number {
  const key =
    t.kind === 'matron'
      ? 'matron'
      : t.kind === 'solace'
        ? 'solace'
        : t.kind === 'reverie'
          ? 'reverie'
          : t.kind === 'mercy'
            ? 'mercy'
            : 'lull';
  const cfg = STRAINS[key],
    period = cfg.period * 6000,
    phase = (s.fieldTicks - t.born) % period,
    duration = cfg.telegraph * rules.balance.telegraph * 6000;
  return phase > period - duration ? (phase - (period - duration)) / duration : 0;
}
export function updateStrains(s: Operation, r: Rules, delta: number): void {
  const dt = delta / 6000;
  for (const t of [...s.targets]) {
    if (
      t.kind === 'tendril' &&
      t.done &&
      t.clip &&
      s.fieldTicks > t.clip &&
      getCase(s.caseId).phases[s.phase].id === 'tendrils'
    ) {
      t.done = false;
      t.clip = 0;
      event(s, 'say', 'A tendril reattached. Work around the heart.');
    }
    if (t.done) continue;
    const age =
      ((s.fieldTicks - t.born) / 6000) *
      r.balance.strainSpeed *
      (r.difficulty === 'Intern' ? 0.75 : r.difficulty === 'Attending' ? 1.25 : 1);
    if (t.kind === 'flap') {
      const holder = s.seats.find((p) => p.grab === t.id && p.held);
      if (!holder && t.clip < s.fieldTicks) t.lift = Math.max(0, t.lift - dt * 3);
      continue;
    }
    if (t.kind === 'lull') {
      t.x = clamp(t.baseX + Math.sin(age * 0.75 + t.id) * 0.65, -6.2, 6.2);
      t.z = clamp(t.baseZ + Math.cos(age * 0.8 + t.id) * 0.35, -2.6, 2.6);
    }
    if (t.kind === 'reverie') {
      t.x = Math.sin(age * 0.7 + t.id) * 3.6;
      t.z = Math.sin(age * 1.12 + t.id) * 1.9;
    }
    if (t.kind === 'solace') {
      t.x = t.baseX + Math.sin(age * 0.4 + t.id) * 0.15;
    }
    if (t.kind === 'balm') {
      if (t.clip) {
        t.radius = Math.max(0, t.radius - dt * 0.8);
        if (s.fieldTicks > t.clip || t.radius < 0.1) t.done = true;
      } else t.radius = Math.min(3, t.radius + dt * 0.035 * r.balance.strainSpeed);
      continue;
    }
    if (t.kind === 'mote') {
      const a = (t.id * Math.PI) / 3 + age * 0.22;
      t.x = Math.cos(a) * 2.5;
      t.z = Math.sin(a) * 1.9;
      continue;
    }
    if (t.kind === 'mercy') {
      const motes = s.targets.some((m) => m.kind === 'mote' && !m.done);
      if (!motes && !t.exposed) {
        t.exposed = s.fieldTicks + 30000;
        event(s, 'say', 'The shield is down. Five seconds for Binder.');
      }
      if (!motes && t.exposed > 0 && t.exposed < s.fieldTicks) {
        for (let i = 0; i < 6; i++)
          spawn(s, { kind: 'mote', at: [Math.cos((i * Math.PI) / 3) * 2.5, Math.sin((i * Math.PI) / 3) * 2] });
        t.exposed = 0;
      }
    }
    const cfg = STRAINS[t.kind as keyof typeof STRAINS];
    if (!cfg) continue;
    const period = cfg.period * 6000,
      cycle = Math.floor((s.fieldTicks - t.born) / period);
    if (cycle > t.cycle) {
      t.cycle = cycle;
      if (t.kind === 'matron') {
        if (s.targets.filter((x) => x.kind === 'lull' && !x.done).length < 5)
          spawn(s, { kind: 'lull', at: [t.x + 1.8, t.z + 1], site: t.site, required: true });
      } else {
        const p = patientAt(s, t.site);
        if (!r.freezeVitals && !s.seats.some((x) => x.giftKind === 'pulse' && x.giftUntil > s.tick))
          s.patients[p] -= cfg.damage * r.balance.strainDamage;
        if (t.kind === 'reverie' || t.kind === 'solace')
          spawn(s, {
            kind: 'wound',
            at: [t.x, t.z],
            path: [
              [t.x - 0.8, t.z - 0.1],
              [t.x + 0.8, t.z + 0.2],
            ],
            site: t.site,
            deep: false,
            generation: t.kind === 'reverie' ? 2 : 1,
            required: false,
          });
        else
          spawn(s, {
            kind: 'numb',
            at: [clamp(t.x + 1, -5, 5), clamp(t.z + 0.6, -2.5, 2.5)],
            site: t.site,
            required: false,
            radius: 0.8,
          });
        event(s, 'hit', `${t.kind.toUpperCase()} HIT`, t.x, t.z);
      }
    }
    if (
      t.kind === 'mercy' &&
      age > 0 &&
      Math.floor(age / 8) > t.last &&
      s.targets.some((m) => m.kind === 'mote' && !m.done)
    ) {
      t.last = Math.floor(age / 8);
      if (s.targets.filter((m) => m.kind === 'mote' && !m.done).length < 6)
        spawn(s, { kind: 'mote', at: [2.5, 0], site: t.site });
    }
  }
}
