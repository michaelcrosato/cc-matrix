// Every drill completes by its bot (the tests and the attract mode rely on them); a failure restarts it.
import { load } from '../lib/context.mjs';
export default async ok => {
  const { game, FF } = load();
  for (const d of FF.data.drills) {
    game.go('drill', { id: d.id, bot: true }, { fade: 0 }); game.advance(.1);
    let t = 0, fails0 = FF.drill.fails; while (t < 90 && !(FF.drill.result === 'ok')) { game.advance(.25); t += .25; if (game.errors.length) break; }
    ok('drill ' + d.id + ' completes by its bot', FF.drill.result === 'ok', 'after ' + t + ' s, ' + (FF.drill.fails - fails0) + ' failures, progress: ' + (FF.drillLogic[d.id].progress && FF.drill.st ? FF.drillLogic[d.id].progress() : '') + ' phase ' + (FF.match && FF.match.phase) + ' ' + game.errors.slice(0, 2).map(e => e.message).join(' | '));
    game.errors.length = 0;
  }
};
