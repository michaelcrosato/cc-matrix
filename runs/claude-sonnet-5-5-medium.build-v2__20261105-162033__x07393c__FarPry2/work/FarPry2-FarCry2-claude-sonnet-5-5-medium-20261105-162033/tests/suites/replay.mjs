// replay: record a stretch of play, play it back in a fresh game and compare the fingerprints.
import { boot, press, hold } from '../lib/boot.mjs';
export const covers = ['src'];
async function session() {
  const { e, game: g } = await boot(); g.flow.newGame(); g.missions.abort(); g.dialogue.skipAll(); g.train.stop(); g.player.seated = false; g.player.ctrl.body.setEnabled(true); g.cutscene = false; g.mode = 'play'; g.camState.override = null; g.noFever = true; g.player.teleport(30, 200, 0); e.step(10);
  return { e, g };
}
export async function run(t) {
  const { e, g } = await session(); const start = e.recording ? e.recording() : null;
  g.spawnSoldier({ faction: 'concord', at: [34, 170], yaw: 0 }); g.godMode = true;
  e.input.setKey('KeyW', true); e.step(60); e.input.setKey('KeyD', true); e.step(40); e.input.setKey('KeyD', false); e.input.setKey('KeyW', false);
  for (let i = 0; i < 4; i++) { e.input.setKey('MouseLeft', true); e.step(5); e.input.setKey('MouseLeft', false); e.step(25); }
  g.fire.ignite(40, 215, 4); e.step(240);
  const end = e.fingerprint(); t.ok(typeof end === 'string' && end.length > 3, 'a run has a fingerprint');
  const again = await session(); again.g.spawnSoldier({ faction: 'concord', at: [34, 170], yaw: 0 }); again.g.godMode = true;
  again.e.input.setKey('KeyW', true); again.e.step(60); again.e.input.setKey('KeyD', true); again.e.step(40); again.e.input.setKey('KeyD', false); again.e.input.setKey('KeyW', false);
  for (let i = 0; i < 4; i++) { again.e.input.setKey('MouseLeft', true); again.e.step(5); again.e.input.setKey('MouseLeft', false); again.e.step(25); }
  again.g.fire.ignite(40, 215, 4); again.e.step(240);
  t.eq(again.e.fingerprint(), end, 'the same inputs and seed give the same fingerprint');
  t.eq(again.g.fingerprint(), g.fingerprint(), 'the game fingerprints match: positions, hp, wear, fire counts');
}
