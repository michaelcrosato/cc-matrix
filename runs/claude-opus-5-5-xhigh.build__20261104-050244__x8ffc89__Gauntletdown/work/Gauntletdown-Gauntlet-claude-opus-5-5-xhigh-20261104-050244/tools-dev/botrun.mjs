// node tools-dev/botrun.mjs [floorId ...] [--cls a,b] [--god]: bots play floors headless; prints time to the stairs
import { boot } from '../tests/lib.mjs';
import { buildGame } from '../build.mjs';
buildGame();
const args = process.argv.slice(2), clsArg = args.find(a => a.startsWith('--cls=')), ids = args.filter(a => !a.startsWith('--'));
const cls = clsArg ? clsArg.slice(6).split(',') : ['berserker'];
const t = boot(), { api, game, D } = t;
if (args.includes('--god')) game.settings.set('cheat_god', true);
for (const id of (ids.length ? ids : api.FLOOR_ORDER)) {
  const index = api.FLOOR_ORDER.indexOf(id);
  api.startRun(cls.map((c, i) => ({ seat: i, cls: c, bot: api.makeBot({ cheat: false }) })));
  game.go('play', { floor: index, card: false }, { fade: 0 }); game.advance(.2);
  let sec = 0, goals = {}, lastGoal = '';
  const W0 = D.world();
  while (sec < 360 && D.world() === W0 && game.sceneName === 'play') {
    game.advance(1); sec++;
    const s = D.snapshot(); const g = s.heroes.map(h => h.goal).join('/'); goals[g] = (goals[g] || 0) + 1; lastGoal = g;
    if (s.boss && s.boss.dead && sec % 10 === 0) {}
  }
  const s = D.snapshot();
  console.log(id + ': ' + (D.world() !== W0 || game.sceneName !== 'play' ? 'done in ' + sec + ' s -> ' + game.sceneName + ' ' + (s.floor || '') : 'STUCK at ' + sec + ' s') + ' | hp ' + s.heroes.map(h => h.hp).join(',') + ' score ' + s.heroes.map(h => h.score).join(',') + ' | mon ' + s.monsters.total + ' | last goal ' + lastGoal + ' | at ' + s.heroes.map(h => h.x + ',' + h.y).join(' ') + (s.boss ? ' boss ' + JSON.stringify(s.boss) : '') + ' errors ' + t.errors().slice(0, 3).join(' | '));
  if (process.argv.includes('--goals')) console.log('   ', JSON.stringify(goals));
}
