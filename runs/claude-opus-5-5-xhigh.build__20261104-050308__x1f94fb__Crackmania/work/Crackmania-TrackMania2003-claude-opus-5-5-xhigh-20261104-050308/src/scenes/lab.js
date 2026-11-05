// CRACKMANIA labs (Dev Mode's designer tools): #lab/blocks shows every block in a row on a test track, driven by the
// bot; #lab/physics a loop, a kicker and a banked bend with Dev Mode's TUNING open, for live tuning
import { ctx, E } from '../ctx.js';
import { compile } from '../track/track.js';
import { startRace } from './race.js';
const LABS = {
  blocks: { id: 'LABB', env: 'dustbowl', name: 'Block Lab', start: [2, 6], program: 'ST S CP BO S U1 D1 U2 D2 S R1 L1 L2 R2 S BU S BR2 S LOOPR S KI GAP2 LA S CR S R3 S2 L3 S FN' },
  physics: { id: 'LABP', env: 'dustbowl', name: 'Physics Lab', start: [2, 6], program: 'ST S3 BO S LOOPR S2 BO S KI GAP3 LA S BR2 S2 BR2 S3 FN' }
};
export const labScene = {
  enter(d = {}) {
    const def = LABS[d.kind] || LABS.blocks, tr = compile(def); ctx.tracks[def.id] = tr;
    ctx.game.after(.05, () => { startRace({ kind: 'lab', track: tr, label: 'LAB', intro: false, countdown: 1, players: [{ bot: { skill: 1 }, name: 'BOT', listen: true }], ghosts: [], onFinish(s) { s.after = () => ctx.game.go('lab', d); } }); if (d.kind === 'physics') ctx.game.after(.5, () => { ctx.dev.show('TUNING'); }); });
  },
  update() {}, draw(r) { r.text('LAB', r.W / 2, r.H / 2, '#fff', { align: 'center' }); }
};
export { LABS };
