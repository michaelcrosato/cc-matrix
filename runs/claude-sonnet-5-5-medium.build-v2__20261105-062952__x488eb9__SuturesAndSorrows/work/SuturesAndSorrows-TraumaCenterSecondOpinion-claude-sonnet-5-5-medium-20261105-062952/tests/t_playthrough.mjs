// Scripted full playthrough: New Game -> every story scene -> ward -> every case (bot, cheats off, Resident) -> ending -> credits -> title.
export default async function ({ check, load, fast }) {
  if (fast) return;
  const ctx = load(); const G = ctx.GAME, game = G.game, I = game.input; G.testBot = true;
  const adv = s => game.advance(s, { draw: false }); const name = () => game.scene && game.scene.__name;
  adv(1); G.prog = { diff: 'Resident', next: 0, ranks: {}, star: {}, flags: {}, ending: false, seen: {} };
  game.go('menu'); adv(.8); game.go('difficulty', { fresh: true }); adv(.8); I.tap('confirm'); adv(.6);
  const seen = []; let guard = 0, caseStarts = 0, t = 0;
  while (guard++ < 4000 && name() !== 'title') {
    const n = name(); if (n === 'story') { I.tap('confirm'); adv(.25); if (guard % 3 === 0) adv(1.5); }
    else if (n === 'chart') { const sc = game.scene; if (sc.sub === 'lightbox') { sc.lbState.cur = sc.def.lightbox.truth.slice(); I.tap('useTool'); adv(.2); I.tap('confirm'); adv(.3); } else { I.tap('confirm'); adv(.3); } }
    else if (n === 'op') { const sc = game.scene; if (!seen.includes(sc.id)) { seen.push(sc.id); caseStarts++; } adv(2); t += 2; if (t > 700 && seen.length < 3) break; if (t > 6000) break; }
    else if (n === 'results') { adv(6); I.tap('confirm'); adv(.3); I.tap('confirm'); adv(.5); }
    else if (n === 'ward') { game.scene.use({ door: true }); adv(.5); }
    else if (n === 'lost') { check('case lost in playthrough: ' + game.scene.d.id, false, game.scene.d.S.why + ' vit ' + game.scene.d.S.vitals); break; }
    else if (n === 'credits') { adv(2); }
    else adv(.5);
  }
  if (process.env.DBG) { const sc = game.scene, S = sc.S; console.log('STUCK', name(), guard, seen.join(), S && JSON.stringify({ rt: S.rt | 0, ph: S.ph, over: S.over, v: S.vitals | 0, clk: S.clock | 0, cb: !!S.cb, close: !!S.close, learn: S.learn, plan: sc.view && sc.view.ctl[0].bot && sc.view.ctl[0].bot.lastPlan, objs: S.objs.filter(o => !o.done).map(o => o.type).join() })); }
  check('every case reached', seen.length === 11, seen.join(','));
  check('ranks saved for every case', G.CASE_ORDER.every(id => G.prog.ranks[id] && G.prog.ranks[id].Resident), JSON.stringify(Object.keys(G.prog.ranks)));
  check('ending flag and unlocks', G.prog.ending && G.prog.next >= 11);
  check('ends at the title', name() === 'title', name());
  check('no errors in playthrough', !game.errors.length, game.errors.map(e => e.stack || e.message).slice(0, 2).join('|'));
}
