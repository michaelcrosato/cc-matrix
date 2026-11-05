// dev: sliders change their systems, reset restores, cheats work, warps reach every waypoint, storage persists
import { boot } from '../harness.mjs';
export default async check => {
  const { B, game, store } = await boot();
  B.newState(4); game.go('play', { resume: true }); game.advance(.3);
  B.Play.openScreen('dev', { tab: 1 }); game.advance(.1); check('Dev Mode opens from play', game.debug.snapshot().screen === 'dev');
  const rows = B.DevMode.rows(1), hp = rows.find(r => r.key === 'monHp');
  B.Play.screen.focus = 'r' + rows.indexOf(hp); for (let i = 0; i < 20; i++) B.SCREENS.dev.edge(B.Play.screen, 1);
  check('a slider moves with right', B.T.monHp === 2, B.T.monHp);
  const rat = B.spawnMon('f1', 'rat', 3, 7, {}); check('Monster HP x2 doubles a spawned rat', rat.max === Math.round(4 * 2), rat.max);
  check('the change persists in storage', JSON.parse(store.get('boltholder.dev')).T.monHp === 2);
  rows[0].run(); check('Reset to defaults restores the page', B.T.monHp === 1 && B.T.monDmg === 1);
  B.T.partyDmg = 3; B.resetTune(); check('reset restores every default', Object.entries(B.TDEF).every(([k, v]) => B.T[k] === v));
  const cheats = B.DevMode.rows(4);
  cheats.find(r => r.label === 'God mode').set(true); const m = B.S.party.members[0], h = m.hp; B.hurtMember(m, 5); check('god mode takes no damage', m.hp === h); B.CHEATS.god = false;
  cheats.find(r => r.label === 'One-hit kills').set(true); const r2 = B.spawnMon('f1', 'ooze', 3, 7, {}); B.attackMon(m, r2, { dmg: '1d1' }, 'main', { dmg: '1d1' }); check('one-hit kills', r2.hp <= 0 || r2.hp === r2.max); B.CHEATS.oneHit = false;
  B.CHEATS.noclip = true; B.S.party.cx = 2; B.S.party.cy = 14; B.S.party.dir = 3; B.cmdMove('f'); check('noclip walks through walls', B.S.party.cx === 1); B.CHEATS.noclip = false; B.S.party.tween = null;
  cheats.find(r => r.label === 'Give all keys and wards').run(); check('every key and ward given', B.countItem('ironWard') === 1 && B.countItem('boneKey') === 1);
  for (const fid of ['f1', 'f2', 'f3', 'f4', 'race']) for (const [n, x, y, d] of B.FLOORS[fid].waypoints || []) { B.devWarp(fid, x, y, d); check('warp to ' + n, B.S.floor === fid && B.S.party.cx === x && B.S.party.cy === y); }
  B.devWarp('f1', 2, 14, 0);
  const party = B.DevMode.rows(6); party.find(r => r.label === '+1 level for everyone').run(); check('+1 level', B.S.party.members.every(x => x.lvl === 2));
  party.find(r => r.label === 'Add Durgan').run(); check('add an NPC', B.S.party.members.some(x => x.npc === 'durgan'));
  const sp = B.DevMode.rows(7); const before = B.FS().mons.length; sp.find(r => r.label === 'Spawn in front').run(); check('spawn in front', B.FS().mons.length > before);
  sp.find(r => r.label === 'Kill all on this floor').run(); check('kill all', B.FS().mons.every(x => x.hp <= 0));
  check('the debug tab has auto-play, attract, cutscenes and the sound test', ['Auto-play to floor end', 'Start the attract mode now', 'Play the intro', 'Sound test', 'Fake hub ghosts'].every(l => B.DevMode.rows(8).some(r => r.label === l)));
  check('the sound test lists sfx, songs and voices', B.DevMode.soundList().length > 100);
  check('no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
};
