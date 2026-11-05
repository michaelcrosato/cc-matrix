// motion-capture clips: the set loads, every clip the game names exists, celebrations and reactions play them, and the
// IK moves still blend in underneath
import { load } from '../lib/load.mjs';
export default async t => {
  const { G, game } = load(); game.advance(.5);
  const lib = G.clipLib(); t('the clip set loads', !!lib && lib.names.length >= 19, lib && lib.names.length);
  const missing = Object.values(G.CLIP_OF).filter(n => !lib.clip(n)); t('every clip the game names is in the set', !missing.length, missing.join(','));
  for (const [kind, name] of Object.entries(G.CLIP_OF)) {
    const rig = G.anim.rig(G.makeRig('amara')); rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 }); const before = JSON.stringify(rig.J.handR);
    rig.vb = { kind, u: .5, w: 1 }; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 });
    t(kind + ' plays ' + name, rig._clipName === name && rig.mocapW === 1 && JSON.stringify(rig.J.handR) !== before && rig.J.handR.every(isFinite));
  }
  const rig = G.anim.rig(G.makeRig('rin')); rig.vb = { kind: 'bow', u: .5, w: 1 }; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 }); rig.vb = { kind: 'set', u: .5, w: 1 }; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 });
  t('an IK move turns the clip off again', rig.mocapW === 0 && rig.J.handR[2] > 24, rig.mocapW + ' ' + rig.J.handR);
  // in play: a celebration after a point uses the scorer's signature clip
  let res = null; G.seed('match', 2); G.startMatch({ mode: 'exhibition', cpuAll: true, pointsToWin: 3, replays: false, teams: [[{ id: 'rin', suit: 'seigaiha', acc: [] }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [] }, { id: 'mei', suit: 'peony', acc: [] }]], after: r => { res = r; } }, { fade: 0 });
  const seen = new Set(); for (let s = 0; s < 120 * 300 && !res; s++) { game.advance(1 / 120); for (const p of G.M.players) if (G.clipPlaying(p.rig)) seen.add(p.rig._clipName); }
  t('matches play clips in celebrations and reactions', seen.size >= 3, [...seen].join(','));
  t('no errors', game.errors.length === 0, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
};
