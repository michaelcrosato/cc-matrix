/**
 * @file The five Halcyon strains. Each step is field time. They telegraph, then they hit. The distinguishing
 * transitions live here: Lull's quiet and its cocoon, Solace's split (the cut itself is in act.ts), Reverie's
 * submerge, Balm's lacquer, Mercy's three phases.
 */
import type { Op, Target } from './types';
import { addTarget, FIELD_SECOND } from './world';

/** Run every living strain for this step's field ticks. */
export function stepStrains(op: Op, ft: number): void {
  lacquer(op);
  for (const target of op.targets) {
    if (target.done) continue;
    if (target.kind === 'lull') lull(op, target, ft);
    else if (target.kind === 'matron') matron(op, target, ft);
    else if (target.kind === 'solace') solace(op, target, ft);
    else if (target.kind === 'reverie') reverie(op, target, ft);
    else if (target.kind === 'balmNode') balm(op, target, ft);
    else if (target.kind === 'guide' && target.tag === 'moving') driftGuide(target);
    else if (target.kind === 'tendril' && target.done) retie(op, target, ft);
  }
  retieDone(op, ft);
  mercy(op, ft);
  fadeBalm(op, ft);
  revealTimeout(op, ft);
  for (const target of op.targets)
    if (target.kind === 'flap' && target.clipped > 0 && target.holder < 0)
      target.clipped = Math.max(0, target.clipped - ft);
}

/** Wounds and pools under Balm cells cannot be stitched or drained. */
function lacquer(op: Op): void {
  for (const target of op.targets) {
    if (target.kind !== 'wound' && target.kind !== 'pool') continue;
    const painted = op.targets.some(
      (cell) =>
        cell.kind === 'balmCell' &&
        !cell.done &&
        cell.patient === target.patient &&
        Math.hypot(cell.x - target.x, cell.z - target.z) < 1.2,
    );
    target.lacquer = painted;
  }
}

/** Lull: a quiet aura, then a nuzzle that leaves a numb patch. */
function lull(op: Op, target: Target, ft: number): void {
  target.timer += ft;
  if (target.telegraph > 0) {
    target.telegraph -= ft;
    if (target.telegraph <= 0) {
      optionalNumb(op, target);
      const patient = op.patients[target.patient];
      if (patient) patient.vitals = Math.max(0, patient.vitals - 2);
      op.events.push({ type: 'hit', text: 'Numb.', x: target.x, z: target.z });
    }
    return;
  }
  if (target.timer >= 6 * FIELD_SECOND) {
    target.timer = 0;
    target.telegraph = Math.round(1.5 * FIELD_SECOND);
    op.events.push({ type: 'telegraph', text: 'It nuzzles.', x: target.x, z: target.z, kind: 'lull' });
  }
}

/** A numb patch should be gelled, but it must not trap the phase. */
function optionalNumb(op: Op, target: Target): void {
  const born = addTarget(
    op,
    { kind: 'numb', x: target.x + 0.4, z: target.z, site: target.site, patient: target.patient, coverNeed: 12 },
    target.phase,
  );
  born.optional = true;
}

/** Matron: armoured until the yawn, then a binder dose lands. She births small Lulls. */
function matron(op: Op, target: Target, ft: number): void {
  target.timer += ft;
  const cycle = target.timer % Math.round(8 * FIELD_SECOND);
  target.vulnerable = cycle >= Math.round(5.5 * FIELD_SECOND);
  if (target.telegraph > 0) target.telegraph -= ft;
  if (target.timer > ft && cycle < ft && op.targets.filter((item) => item.kind === 'lull' && !item.done).length < 4) {
    addTarget(
      op,
      { kind: 'lull', x: target.x + 0.8, z: target.z + 0.4, site: target.site, patient: target.patient },
      target.phase,
    );
    op.events.push({ type: 'birth', text: 'Another one.', kind: 'lull' });
  }
}

/** Solace latches, telegraphs along the vessel, then opens a bleed. */
function solace(op: Op, target: Target, ft: number): void {
  if (target.gen >= 3 || target.tag === 'constricted') return;
  target.timer += ft;
  if (target.telegraph > 0) {
    target.telegraph -= ft;
    if (target.telegraph <= 0) {
      const pool = addTarget(
        op,
        { kind: 'pool', x: target.x, z: target.z, volume: 1.2, bleed: 0.5, site: target.site, patient: target.patient },
        target.phase,
      );
      pool.optional = true;
      target.tag = 'constricted';
      const patient = op.patients[target.patient];
      if (patient) patient.vitals = Math.max(0, patient.vitals - 5);
      target.timer = 0;
      op.events.push({ type: 'hit', text: 'It constricts.', x: target.x, z: target.z, kind: 'solace' });
    }
    return;
  }
  if (target.timer >= 5 * FIELD_SECOND) {
    target.telegraph = Math.round(2 * FIELD_SECOND);
    op.events.push({ type: 'telegraph', text: 'The vessel tightens.', x: target.x, z: target.z, kind: 'solace' });
  }
}

/** Reverie sinks again when the surface window ends. Damage already dealt stays. */
function reverie(op: Op, target: Target, ft: number): void {
  if (target.reveal > 0 && !target.surfaced) {
    target.reveal -= ft;
    if (target.reveal <= 0) target.hidden = true;
  }
  if (!target.surfaced) return;
  target.timer -= ft;
  if (target.timer <= 0) {
    target.surfaced = false;
    target.hidden = true;
    target.reveal = 0;
    op.events.push({ type: 'submerge', text: 'Under again.', x: target.x, z: target.z, kind: 'reverie' });
  }
}

/** Balm creeps. One new cell on a slow beat, never a flood. */
function balm(op: Op, target: Target, ft: number): void {
  target.timer += ft;
  const alive = op.targets.filter(
    (cell) => cell.kind === 'balmCell' && !cell.done && cell.patient === target.patient,
  ).length;
  if (target.timer < 4 * FIELD_SECOND || alive > 14) return;
  target.timer = 0;
  const n = alive + 1;
  addTarget(
    op,
    {
      kind: 'balmCell',
      x: target.x + (n % 4) * 0.5 - 0.75,
      z: target.z + Math.floor(n / 4) * 0.5,
      site: target.site,
      patient: target.patient,
    },
    target.phase,
  );
}

/** A guide that walks with the heartbeat. The bot aims at the live point. */
function driftGuide(target: Target): void {
  const shift = Math.sin(target.timer / 20) * 0.004;
  target.timer += 1;
  for (let i = 0; i < target.path.length; i += 2) target.path[i] += shift;
  target.x += shift;
}

/** Tendrils that are out stay out. Ones left behind reattach. */
function retie(op: Op, target: Target, ft: number): void {
  target.timer += ft;
}

/** If any tendril is still in, a freed one reattaches after ten seconds. */
function retieDone(op: Op, ft: number): void {
  const tendrils = op.targets.filter((target) => target.kind === 'tendril');
  if (tendrils.length === 0) return;
  const allOut = tendrils.every((target) => target.done);
  if (allOut) return;
  for (const target of tendrils) {
    if (!target.done) continue;
    target.timer += ft;
    if (target.timer > 10 * FIELD_SECOND) {
      target.done = false;
      target.timer = 0;
      target.holder = -1;
      op.events.push({ type: 'reattach', text: 'It grabs back.', x: target.x, z: target.z, kind: 'tendril' });
    }
  }
}

/** Mercy: motes, then the exposed binders, tracked with operation fields. */
function mercy(op: Op, ft: number): void {
  const motes = op.targets.filter((target) => target.kind === 'mote' && !target.done && target.phase === op.phase);
  const phase = op.phases[op.phase];
  if (!phase || !phase.id.startsWith('mercy')) return;
  if (phase.id === 'mercy-motes') {
    if (motes.length === 0 && op.mercyKills >= 6 && !op.mercyBindSpawned) {
      op.mercyBindSpawned = true;
      for (let i = 0; i < 3; i++) {
        addTarget(
          op,
          { kind: 'binder', x: -0.6 + i * 0.6, z: 0.2, site: 0, patient: 0, doseNeed: 1, tag: 'mercy' },
          op.phase,
        );
      }
      op.events.push({ type: 'expose', text: 'She is open.', kind: 'mercy' });
    } else if (motes.length < 6 && op.mercyKills < 6) {
      op.mercyRound += ft;
      if (op.mercyRound >= 8 * FIELD_SECOND) {
        op.mercyRound = 0;
        const angle = op.mercyKills + motes.length;
        addTarget(
          op,
          { kind: 'mote', x: Math.sin(angle) * 1.2, z: Math.cos(angle) * 0.6, site: 0, patient: 0 },
          op.phase,
        );
      }
    }
  }
}

/** A dead node fades its film. */
function fadeBalm(op: Op, ft: number): void {
  for (const cell of op.targets) {
    if (cell.kind !== 'balmCell' || cell.done || cell.timer <= 0) continue;
    cell.timer -= ft;
    if (cell.timer <= 0) cell.done = true;
  }
}

/** Non-reverie reveals are permanent (reveal 0). Reverie is handled above. */
function revealTimeout(op: Op, ft: number): void {
  for (const target of op.targets) {
    if (target.kind === 'flap') target.clipped = target.clipped;
    void ft;
  }
}
