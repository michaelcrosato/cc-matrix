// workshop: build a level through the editor (walls, the hero, a target, the exit, guards with routes); validation
// catches a missing exit and an unreachable target; slots and export / import round trips; a test play is won
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  game.go('workshop', {}, { fade: 0 }); t.step(.2);
  const Ed = B.Ed; Ed.load(Ed.blank(32, 32));
  for (let x = 10; x < 20; x++) Ed.paint(x, 12, 'W');
  Ed.place(4, 28, 'hero'); Ed.place(26, 4, 'exit'); Ed.place(15, 6, 'target'); Ed.place(8, 20, 'ashigaru'); Ed.place(22, 20, 'samurai'); Ed.place(14, 14, 'stoneLantern'); Ed.place(6, 6, 'cherry');
  Ed.sel = Ed.L.guards[0].id; Ed.route('add', 12, 20); Ed.route('add', 12, 24); Ed.route('wait');
  check('the editor builds a level', Ed.L.rows[12][15] === 'W' && Ed.L.guards.length === 2 && Ed.L.guards[0].route.length === 3 && Ed.L.civilians[0].target, JSON.stringify(Ed.L.guards[0]));
  check('its objectives come from what is placed', Ed.L.objectives.map(o => o.type).join(',') === 'assassinate,reach', Ed.L.objectives.map(o => o.type).join(','));
  check('a full level validates', Ed.validate().length === 0, Ed.problems.map(p => p.text).join(' '));
  const exit = Ed.L.exit; Ed.L.exit = null; Ed.rebuild(); check('a missing exit is caught', Ed.validate().some(p => /exit/.test(p.text)), ''); Ed.L.exit = exit; Ed.rebuild();
  for (let x = 13; x <= 17; x++) { Ed.paint(x, 4, 'M'); Ed.paint(x, 8, 'M'); } for (let y = 4; y <= 8; y++) { Ed.paint(13, y, 'M'); Ed.paint(17, y, 'M'); }
  check('an unreachable target is caught', Ed.validate().some(p => /target/.test(p.text)), Ed.problems.map(p => p.text).join(' '));
  for (let x = 13; x <= 17; x++) Ed.paint(x, 8, '.'); Ed.validate();
  const j = Ed.json(); Ed.save(1); Ed.load(Ed.blank()); Ed.loadSlot(1); check('a slot keeps the level exactly', Ed.json() === j, Ed.json().length + ' vs ' + j.length);
  const err = Ed.importJson(j); check('export and import round trip', !err && Ed.json() === j, err);
  check('import rejects what is not a level', !!Ed.importJson('{"rows": 3}'), '');
  Ed.importJson(j);
  // a test play, won by the autopilot
  game.go('mission', { level: JSON.parse(Ed.json()), mission: 'workshop', mode: 'workshop', char: 'sojiro' }, { fade: 0 }); t.step(.2); B.Cutscene.clear();
  const M = B.M; M.cheats.god = true; M.cheats.invisible = true;
  game.debug.autopilot([{ fn: (M, h) => { const k = M.civs.find(c => c.target); h.x = k.x - Math.cos(k.facing) * 14; h.y = k.y - Math.sin(k.facing) * 14; h.z = 0; } }, { fn: M => { M.cheats.invisible = false; } }, { cut: 'target', max: 6 }, { wait: 1 }, { at: [26, 5] }, { goto: [26, 4], max: 4 }, { wait: 3 }], 'workshop');
  let s = 0; while (s < 40 && !(M.ended && M.endT > 2)) { t.step(.5); s += .5; }
  check('a test play is won', M.ended && M.result === 'win' && game.sceneName === 'results', M.objectives.map(o => o.id + ':' + o.state).join(' ') + ' ' + game.sceneName);
}
