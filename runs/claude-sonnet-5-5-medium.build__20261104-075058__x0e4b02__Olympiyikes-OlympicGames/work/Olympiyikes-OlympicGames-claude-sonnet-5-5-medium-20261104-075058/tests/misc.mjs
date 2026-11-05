// attract mode, two-player turns, dev mode, single event + records, settings, determinism
import { load, root } from './lib.mjs';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const out = []; let fails = 0, checks = 0;
const check = (name, ok, detail = '') => { checks++; if (!ok) { fails++; out.push('FAIL ' + name + (detail ? ': ' + detail : '')); } };
{ // ---- attract: 10 s idle on the title starts a looping bot demo; any input exits it
  const ctx = load(), O = ctx.OLY, game = O.game, I = game.input; game.advance(1);
  check('title is idle-capable', O.cur === 'title');
  game.advance(9.0); check('no attract before 10 s', O.cur === 'title', O.cur);
  game.advance(2.5); game.advance(1);
  check('attract starts after 10 s idle', O.cur === 'play' && O.curDef.attract, O.cur);
  const seen = new Set(); for (let i = 0; i < 400; i++) { game.advance(1); if (O.cur === 'play') seen.add(O.playData.ev); }
  check('attract loops through several events', seen.size >= 4, [...seen].join(','));
  I.tap('confirm'); game.advance(.6); check('any input exits attract to the title', O.cur === 'title', O.cur);
  check('attract left no cheats on', !O.cheat.perfect);
  check('attract: no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
}
{ // ---- two players take turns in the same event
  const ctx = load(), O = ctx.OLY, game = O.game; game.advance(.5);
  game.addPlayer({ keys: 'right' }); check('second local player added', game.players.length === 2);
  const m = O.newMeet('single', [{ p: 0, nat: 'SUN' }, { p: 1, nat: 'FRM' }], [], { qual: false });
  O.go('play', { ev: 'archery', humans: [0, 1] }, { fade: 0 }); game.advance(.3);
  check('turn card for player 1', O.curDef.state === 'card' && O.curDef.pIdx === 0);
  O.cheat.perfect = true; let seenP = new Set(); for (let i = 0; i < 400 && O.cur === 'play'; i++) { game.advance(.5); if (O.curDef.run) seenP.add(O.curDef.pIdx); }
  check('both players got a turn', seenP.has(0) && seenP.has(1), [...seenP].join(','));
  check('results scene follows with 8 rows', O.cur === 'results' && O.curDef.d.rows.length === 8, O.cur);
  const humanRows = O.curDef.d.rows.filter(r => r.human); check('two human rows in the results', humanRows.length === 2);
  check('2p: no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
}
{ // ---- dev mode: sliders change the tuning, cheats, jump, reset
  const ctx = load(), O = ctx.OLY, game = O.game; game.advance(.5);
  O.newMeet('single', [{ p: 0, nat: 'SUN' }], [], { qual: false }); O.go('play', { ev: 'sprint', humans: [0] }, { fade: 0 }); game.advance(3);
  O.Dev.open(); check('dev opens', O.Dev.isOpen());
  const t0 = O.playRun.t; game.advance(1); check('dev freezes the event', O.playRun.t === t0);
  const items = O.Dev.items(); check('dev has live sliders', items.filter(i => i.t === 's').length >= 6);
  items[0].set(.2); items[1].set(1.5); check('slider writes the tuning', O.tune.cpuSkill === .2 && O.tune.timing === 1.5);
  const g = items.find(i => i.label === 'Reset to defaults'); g.fn(); check('reset restores defaults', O.tune.cpuSkill === 0 && O.tune.timing === 1);
  O.Dev.items().find(i => i.label === 'Fill hype flame').fn(); check('fill hype', O.playRun.hype === 1);
  O.Dev.items().find(i => i.label === 'Win this event (skip)').fn(); check('skip finishes the event', O.playRun.done);
  O.Dev.close(); game.advance(5); check('dev closes and the game continues', !O.Dev.isOpen() && O.cur === 'results', O.cur);
}
{ // ---- records, laurels and the cabinet are written by a finished event
  const ctx = load(), O = ctx.OLY, game = O.game; game.advance(.5); O.cheat.perfect = true;
  O.newMeet('single', [{ p: 0, nat: 'SUN' }], [], { qual: false }); O.go('play', { ev: 'archery', humans: [0] }, { fade: 0 }); game.advance(.3);
  for (let i = 0; i < 300 && O.cur === 'play'; i++) game.advance(.5);
  check('single event reaches results', O.cur === 'results', O.cur); const d = O.curDef.d;
  check('a perfect run is on the podium', d.rows.slice(0, 3).some(r => r.human), JSON.stringify(d.rows.slice(0, 2).map(r => [r.nat, r.v])));
  game.input.tap('confirm'); game.advance(1.5); for (let i = 0; i < 4 && O.cur === 'results'; i++) { game.advance(.9); game.input.tap('confirm'); }
  game.advance(.8); check('initials entry for a top-5 score', O.cur === 'initials', O.cur);
  for (let i = 0; i < 4; i++) { game.input.tap('confirm'); game.advance(.9); }
  check('record saved', O.Records.table(O.EV.archery).length >= 1);
  check('laurel saved', !!O.store.get('laurels', {}).archery);
  check('rec: no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
}
{ // ---- determinism: the same seed and the same bot give the same result
  const run = () => { const ctx = load(), O = ctx.OLY, game = O.game; game.advance(.5); O.cheat.perfect = true; O.newMeet('single', [{ p: 0, nat: 'SUN' }], [], { qual: false, seed: 99 }); O.go('play', { ev: 'javelin', humans: [0] }, { fade: 0 }); game.advance(.3); for (let i = 0; i < 300 && O.cur === 'play'; i++) game.advance(.5); return O.curDef.d ? O.curDef.d.rows.map(r => r.nat + r.v).join() : 'none'; };
  const a = run(), b = run(); check('same seed, same results', a === b && a !== 'none', a.slice(0, 60) + ' / ' + b.slice(0, 60));
}
{ // ---- settings are wired
  const ctx = load(), O = ctx.OLY, game = O.game; game.advance(.5);
  for (const [k, v] of [['difficulty', 'Hard'], ['mashAssist', 'One button'], ['timingAssist', 'On'], ['commentary', 'Off'], ['textSize', 'Huge'], ['hints', 'Off'], ['promptStyle', 'Xbox']]) { game.settings.set(k, v); check('setting ' + k, game.settings[k] === v, String(game.settings[k])); }
  check('Xbox prompts switch the glyph family', game.input.padStyle() === 'xbox', game.input.padStyle());
  game.settings.set('promptStyle', 'PlayStation'); check('PlayStation prompts', game.input.padStyle() === 'playstation', game.input.padStyle());
  check('CPU is stronger on Hard', (game.settings.set('difficulty', 'Hard'), O.diff().cpu > 0)); check('assist widens timing', O.win() > 1);
}
{ // ---- exit interview parses
  const f = path.join(root, '..', 'exit-interview.json');
  if (existsSync(f)) { let j = null; try { j = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { /* */ }
    check('exit-interview.json parses', !!j);
    if (j) { const empty = (o, p = '') => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' ? empty(v, p + k + '.') : (String(v).trim() === '' && !(p + k).endsWith('series') ? [p + k] : []));
      check('exit interview is filled in', empty(j).length === 0, empty(j).join(','));
      check('4+4+... answers present', j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4); }
  } else check('exit-interview.json exists', false, 'run: node tools/exit.mjs');
}
if (out.length) console.log(out.join('\n')); console.log(fails ? `${fails} of ${checks} misc checks FAILED` : `all ${checks} misc checks passed`); process.exit(fails ? 1 : 0);
