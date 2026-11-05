// hand-played battles: a bot that commands its side only through input taps (cursor keys, confirm, menu rows),
// choosing what to do with the battle AI, plays whole battles through the battle scene's UI
export default async ({ boot, t }) => {
  const { G, game } = boot(); const I = game.input; game.advance(.5);
  const tap = (...as) => { for (const a of as) I.tap(a); game.advance(.12); };
  const settle = B => { for (let i = 0; i < 300 && (B.view.busy || B.mode === 'anim'); i++) game.advance(.1); };
  const nav = (B, c) => { for (let i = 0; i < 40 && !G.hex.same(B.cursor, c); i++) { const a = G.hexWorld(B.cursor), b = G.hexWorld(c), q = game.view.p(b[0] - a[0], b[1] - a[1], 0), ax = [], th = .35 * Math.max(Math.abs(q[0]), Math.abs(q[1])); if (q[0] > th) ax.push('right'); if (q[0] < -th) ax.push('left'); if (q[1] > th) ax.push('down'); if (q[1] < -th) ax.push('up'); const before = B.cursor.slice(); tap(...ax); game.advance(.25); if (G.hex.same(before, B.cursor)) { tap(ax[0]); game.advance(.25); } } return G.hex.same(B.cursor, c); };
  const pick = (B, id) => { for (let i = 0; i < 12; i++) { if (B.menuList && B.menuList.cur && B.menuList.cur.id === id) { tap('confirm'); return true; } tap('down'); } return false; };
  let commanded = 0;
  const turn = B => {
    const plan = G.BattleAI.next(B.sim); const act = plan.find(c => c.t === 'act'), mv = plan.find(c => c.t === 'move'); if (!act) { B.endTroop(); return; }
    const u = B.sim.state.units[act.u]; if (!nav(B, [u.cx, u.cy])) throw new Error('cursor could not reach the unit');
    tap('confirm'); if (B.mode !== 'menu') throw new Error('no command menu: ' + B.mode);
    if (mv) { if (!pick(B, 'move')) throw new Error('no Move row'); if (!nav(B, mv.to)) throw new Error('cursor could not reach the destination'); tap('confirm'); settle(B); if (B.mode !== 'menu') throw new Error('menu after move: ' + B.mode); }
    if (act.a === 'attack') { if (!pick(B, 'attack')) throw new Error('no Attack row'); }
    else if (act.a === 'skill') { const kind = G.get('skill', act.skill).kind; if (!pick(B, kind)) throw new Error('no ' + kind + ' row'); if (!pick(B, act.skill)) throw new Error('no ' + act.skill + ' row'); }
    else { if (!pick(B, act.a === 'guard' ? 'guard' : 'wait')) throw new Error('no wait row'); settle(B); commanded++; return; }
    if (B.mode !== 'target') throw new Error('not targeting: ' + B.mode); if (!nav(B, act.target)) throw new Error('cursor could not reach the target');
    tap('confirm'); settle(B); commanded++;
  };
  const play = (spec, side = 0) => {
    game.go('battle', G.battleReq = { spec, back: 'title' }, { fade: 0 }); game.advance(.3); const B = G.battle; if (B.talk.open) B.talk.close(); G.settings.set('confirmEnd', 'Off');
    for (let i = 0; i < 4000 && !B.sim.state.over; i++) { if (B.humanTurn() && B.mode === 'select' && !B.view.busy) turn(B); else game.advance(.1); if (game.errors.length) throw new Error(game.errors[0].message); }
    G.settings.set('confirmEnd', 'On'); return B.sim.state.over;
  };
  await t('the tutorial is won by commands given only through input taps', () => { commanded = 0; const o = play(G.tutorialSpec('solmark')); if (!o || o.winner !== 0) throw new Error(JSON.stringify(o)); if (commanded < 5) throw new Error('commands ' + commanded); });
  await t('a full 3-against-3 battle is played to its end through input taps', () => { commanded = 0; const o = play(G.quickBattleSpec('river_ford', 'autumn')); if (!o) throw new Error('no end'); if (commanded < 10) throw new Error('commands ' + commanded); });
  for (const [diff, realm, target, ks] of [['normal', 'verdance', 'thawgate', ['lynette']], ['hard', 'hoarfast', 'hallowmere', ['safir', 'ragnell']]]) await t('on ' + diff + ', a campaign siege is won by commands given only through input taps', () => {
    const sim = G.CampaignSim.create({ humans: [realm], seed: 11, difficulty: diff }); sim.beginSeason(); if (diff === 'hard') { const m = sim.apply({ t: 'move', realm, knight: 'ragnell', to: 'wolfsgate' }); if (!m.ok) throw new Error(m.why); } sim.apply({ t: 'endMuster', realm });
    const att = { march: { realm, target, knights: ks, from: Object.fromEntries(ks.map(k => [k, sim.kn(k).castle])) }, kind: 'battle', defender: sim.owner(target) };
    commanded = 0; const o = play(sim.battleSpec(att, 5)); if (!o || o.winner !== 0) throw new Error(JSON.stringify(o)); if (commanded < 5) throw new Error('commands ' + commanded);
  });
  await t('hand-commanded siege battles win at least as often as auto-resolve (5 maps)', () => { let hand = 0, auto = 0; for (const m of ['forest_hold', 'hill_fort', 'crossroads', 'lakeside', 'ruined_abbey']) { const sp = G.quickBattleSpec(m, 'summer'); const s = G.BattleSim.create(sp); for (const sd of s.state.sides) sd.human = false; if (G.BattleAI.resolve(s).winner === 0) auto++; const o = play(G.quickBattleSpec(m, 'summer')); if (o && o.winner === 0) hand++; } if (hand < auto) throw new Error('hand ' + hand + ' auto ' + auto); });
};
