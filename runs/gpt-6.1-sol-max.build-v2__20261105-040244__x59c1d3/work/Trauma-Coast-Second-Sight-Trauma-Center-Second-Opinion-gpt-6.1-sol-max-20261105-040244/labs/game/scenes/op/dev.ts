/** @file Reproducible developer actions; every mutation goes through the engine action recorder. */
import { defineDevAction, type World } from '../../../../engine/sim-api';
import { KINDS } from '../../data/tools';
import { circle } from '../../data/cases/helpers';
import { getCase } from '../../data/cases';
import type { Operation, TargetKind } from '../../data/types';
import { event, fail, seat, spawn, startPhase } from './state';
const state = (w: World): Operation | undefined =>
  (w.query('operation')[0] as unknown as { operation: { data: Operation } } | undefined)?.operation.data;
defineDevAction('surgeryControl', {
  help: 'Advance, fail, restore vitals, grant Gift or add a bot.',
  args: {
    command: {
      type: 'string',
      default: 'heal',
      enum: ['phase', 'fail', 'heal', 'gift', 'bot', 'win', 'mark'],
      description: 'The change to record.',
    },
  },
  run(w, args) {
    const s = state(w);
    if (!s) return;
    s.dev = true;
    switch (args.command) {
      case 'phase':
        if (s.phase < getCase(s.caseId).phases.length - 1) startPhase(s, s.phase + 1);
        else s.status = 'won';
        break;
      case 'fail':
        fail(s, 'Developer failure injection.');
        break;
      case 'heal':
        s.patients.fill(100);
        s.code = null;
        break;
      case 'gift':
        for (const p of s.seats) p.gift = 99;
        break;
      case 'bot':
        if (s.seats.length < 4) s.seats.push(seat(s.seats.length, 'none', 0));
        break;
      case 'win':
        s.status = 'won';
        event(s, 'won', 'OPERATION COMPLETE');
        break;
    }
  },
});
defineDevAction('surgerySpawn', {
  help: 'Spawn a target at a surgeon cursor.',
  args: {
    kind: { type: 'string', default: 'lull', enum: KINDS, description: 'Target kind.' },
    x: { type: 'number', default: 0, description: 'East, metres.' },
    z: { type: 'number', default: 0, description: 'South, metres.' },
    site: { type: 'integer', default: 0, minimum: 0, maximum: 2, description: 'Field index.' },
  },
  run(w, args) {
    const s = state(w);
    if (!s) return;
    s.dev = true;
    spawn(s, {
      kind: args.kind as TargetKind,
      at: [args.x as number, args.z as number],
      site: args.site as number,
      path:
        args.kind === 'mass'
          ? circle(Number(args.x), Number(args.z))
          : ['wound', 'incision'].includes(String(args.kind))
            ? [
                [Number(args.x) - 1, Number(args.z)],
                [Number(args.x) + 1, Number(args.z)],
              ]
            : undefined,
    });
  },
});
