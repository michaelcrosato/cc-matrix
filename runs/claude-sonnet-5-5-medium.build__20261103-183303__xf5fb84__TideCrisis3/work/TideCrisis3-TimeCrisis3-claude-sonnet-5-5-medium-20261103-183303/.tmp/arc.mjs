import { load } from '../tests/harness.mjs';
const { game, dbg, I } = await load(); dbg.Run.begin('arcade', 1, 'normal', 1); dbg.Run.newSim(1); game.go('play'); game.advance(.1); dbg.Run.botOn = true; dbg.bot(true, 'showoff'); dbg.cheat('god', 1); dbg.cheat('ammo', 1);
let last = ''; for (let i = 0; i < 3000; i++) { game.advance(.5); const s = game.sceneName; const key = s + (dbg.sim ? ':' + dbg.sim.sceneId : ''); if (i % 60 === 0 && dbg.sim) console.log('  .. ' + (i/2) + 's ' + key + ' ph=' + dbg.sim.phase + ' en=' + dbg.sim.enemies.filter(e=>!e.dead&&!e.civ).map(e=>e.type+'@'+e.cover?.id).join(',') + ' boss=' + (dbg.sim.boss ? dbg.sim.boss.id + (dbg.sim.boss.dead?'D':'') : '') + ' waves=' + dbg.sim.waves.map(w=>(w.started?1:0)+''+(w.done?1:0)).join('/')); if (key !== last) { console.log((i / 2) + 's', key); last = key; }
  if (s === 'results' || s === 'cutscene' || s === 'briefing' || s === 'ending') { I.tap('confirm'); game.advance(.2); I.tap('confirm'); game.advance(.2); if (s === 'results') game.advance(6); }
  if (s === 'play' && dbg.sim) { dbg.sim.cheats.god = 1; dbg.sim.cheats.ammo = 1; }
  if (['gameover', 'records', 'menu', 'title'].includes(s)) break; if (i === 2999) console.log('timeout'); }
console.log('errors', game.errors.map(e => e.message));
