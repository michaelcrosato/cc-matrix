// dev: each slider changes its system; reset restores the defaults; every cheat works; warps; spawning; storage persists
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B, game, store, D } = await fresh(), S = () => B.S, Dev = B.Dev;
  at(B, 'f1', 10, 6, 1); S().floors.f1.mons.length = 0;
  const r1 = B.spawnMon(S().floors.f1, 'rat', 11, 6, {}); B.T.monHP = 2; const r2 = B.spawnMon(S().floors.f1, 'rat', 11, 6, {});
  t.check('Monster HP x2 doubles a new rat\'s HP', r2.max === r1.max * 2);
  Dev.tab = 0; const rows = Dev.rows(); rows[0].act(); t.check('Reset to defaults restores every number', B.TUNE.every(([, k, , d]) => B.T[k] === d));
  B.T.partyDmg = 4; at(B, 'f1', 10, 6, 1); S().floors.f1.mons.length = 0; const dm = B.spawnMon(S().floors.f1, 'skeleton', 11, 6, { asleep: true }); dm.hp = dm.max = 9999; let total = 0;
  for (let i = 0; i < 200; i++) { S().party.members[0].cool.main = 0; const h = dm.hp; B.handAct(0, 'main'); total += h - dm.hp; dm.st = 'asleep'; } B.tuneDefaults();
  t.check('Party damage x4 hits about four times as hard', total / 200 > 8, (total / 200).toFixed(1));
  Dev.save(); t.check('the tuning persists in storage', !!store.get('boltholder.dev') && JSON.parse(store.get('boltholder.dev')).T.partyDmg === 1);
  // cheats
  const cheat = (k, v) => { B.CHEATS[k] = v; };
  at(B, 'f1', 2, 8, 0); cheat('god', true); for (const m of S().party.members) B.hurtMember(m, 99); t.check('God mode: no harm', S().party.members.every(m => m.hp === m.max)); cheat('god', false);
  at(B, 'f1', 2, 13, 0); cheat('noclip', true); B.update(1 / 120, [{ c: 'move', d: 'r' }]); sim(B, .4); t.check('Noclip walks through walls', S().party.cx === 3); cheat('noclip', false);
  at(B, 'f1', 2, 8, 0); cheat('oneHit', true); S().floors.f1.mons.length = 0; const big = B.spawnMon(S().floors.f1, 'snick', 2, 7, {}); B.hurtMon(big, 1); t.check('One-hit kills', big.hp <= 0); cheat('oneHit', false);
  cheat('reveal', true); t.check('Reveal map shows every cell', B.seen(20, 13, 'f1')); cheat('reveal', false);
  at(B, 'f1', 2, 9, 0); S().floors.f1.doors.G1.open = 1; cheat('freeze', true); const pos = S().floors.f1.mons.map(m => m.cx + ',' + m.cy).join('|'); sim(B, 3); t.check('Freeze monsters stops them', S().floors.f1.mons.map(m => m.cx + ',' + m.cy).join('|') === pos); cheat('freeze', false);
  cheat('noCooldowns', true); at(B, 'f1', 2, 8, 0); B.handAct(0, 'main'); t.check('No cooldowns', S().party.members[0].cool.main <= .06); cheat('noCooldowns', false);
  cheat('infiniteSpells', true); at(B, 'f1', 2, 8, 0); const od = S().party.members[3]; for (let i = 0; i < 4; i++) { od.cool.main = od.cool.off = 0; B.castCmd(3, 'sparkDart', {}); } t.check('Infinite spells', B.readySpells(od).sparkDart >= 1); cheat('infiniteSpells', false);
  cheat('noHunger', true); at(B, 'f1', 2, 8, 0); sim(B, 70); t.check('No hunger', S().party.members.every(m => m.food === 100)); cheat('noHunger', false);
  // warps: every waypoint of every floor
  Dev.tab = Dev.tabs.indexOf('Warp');
  for (let f = 0; f < 4; f++) { Dev.warpF = f; const ws = Dev.rows().filter(r => r.act && !/Next floor|Boss|Ending/.test(r.label) && !/Floor:/.test(r.label)); for (const w of ws) { w.act(); const wp = B.FLOORS[B.FLOOR_ORDER[f]].waypoints.find(q => q[0] === w.label); t.check('warp: ' + w.label, wp && S().floor === B.FLOOR_ORDER[f] && S().party.cx === wp[1] && S().party.cy === wp[2]); } }
  Dev.rows().find(r => r.label === 'Boss').act(); t.check('warp: the boss', S().floor === 'f4' && S().party.cy === 6);
  // spawning and the party tools
  Dev.tab = Dev.tabs.indexOf('Spawn'); at(B, 'f1', 10, 6, 1); S().floors.f1.mons.length = 0; Dev.spawnT = 0; Dev.spawnN = 2; Dev.rows().find(r => r.label === 'Spawn in front').act();
  t.check('spawn in front: a group of two', S().floors.f1.mons.filter(m => m.cx === 11 && m.cy === 6).length === 2);
  Dev.rows().find(r => r.label === 'Kill all on this floor').act(); t.check('kill all', S().floors.f1.mons.every(m => m.hp <= 0));
  Dev.tab = Dev.tabs.indexOf('Party'); S().party.members[0].hp = 1; Dev.rows().find(r => r.label === 'Heal all').act(); t.check('heal all', S().party.members[0].hp === S().party.members[0].max);
  const l0 = S().party.members[0].lvl; Dev.rows().find(r => r.label === '+1 level for everyone').act(); t.check('+1 level', S().party.members[0].lvl === l0 + 1);
  Dev.npcI = 1; Dev.rows().find(r => /Add NPC/.test(r.label)).act(); t.check('add an NPC', S().party.members.some(m => m.npc === 'durgan'));
  t.check('in a session there is no Dev Mode', (() => { B.Hub.active = true; const r = B.pauseItems(); B.Hub.active = false; return !r.some(i => i[0] === 'Dev Mode'); })());
  t.check('no game errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
}
