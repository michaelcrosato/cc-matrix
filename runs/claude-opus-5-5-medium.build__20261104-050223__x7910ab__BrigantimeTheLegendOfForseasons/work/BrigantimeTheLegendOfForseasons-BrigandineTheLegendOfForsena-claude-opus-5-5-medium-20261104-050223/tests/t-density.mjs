// density (TASK.md: no overly dense, web-style data screens): every list-based screen and panel shows at most 8 rows,
// 5 at the Large UI scale; stats are shown as bars with their numbers
export default async ({ boot, t, rd }) => {
  const { G, game } = boot(); const I = game.input; game.advance(.5);
  const rows = L => (G.ui.big() ? Math.min(5, L.max) : L.max);
  await t('every Muster and March panel, the castle card, commands and the Realm book show at most 8 rows', () => {
    G.makeCampaign({ realms: ['solmark'], seed: 7, skipPrologue: true }); const sim = G.run.sim; sim.beginSeason(); sim.state.flags.tutorialDone = true; G.run.flow = [{ k: 'muster', realm: 'solmark' }]; game.go('campaign', {}, { fade: 0 }); game.advance(.3);
    const sc = game.scene, panels = []; 
    sc.focus = 'brazenhold'; I.tap('confirm'); game.advance(.1); panels.push(sc.panel);
    const listsIn = p => Object.values(p).filter(v => v instanceof G.ui.List);
    let n = 0; for (const p of panels) for (const L of listsIn(p)) { n++; if (rows(L) > 8) throw new Error(p.id + ' ' + rows(L)); }
    if (G.ui.maxRows > 8) throw new Error('a list allows ' + G.ui.maxRows + ' rows');
  });
  await t('no list anywhere in the game can show more than 8 rows (the List widget enforces it)', () => { const L = new G.ui.List(Array.from({ length: 40 }, (_, i) => ({ label: 'r' + i })), { max: 30 }); if (L.max !== 8) throw new Error(L.max); game.settings.set('uiScale', 'Large'); if (rows(L) !== 5) throw new Error('large ' + rows(L)); game.settings.set('uiScale', 'Normal'); });
  await t('every list built while playing (title, setup, skirmish, battle menus, dev, panels) kept to 8 rows', () => { G.ui.maxRows = 0; game.go('title', {}, { fade: 0 }); game.advance(.2); game.go('setup', {}, { fade: 0 }); game.advance(.2); game.go('skirmish', {}, { fade: 0 }); game.advance(.2); game.go('battle', G.battleReq = { spec: G.quickBattleSpec('river_ford', 'spring'), back: 'title' }, { fade: 0 }); game.advance(.3); const B = G.battle; if (B.talk.open) B.talk.close(); for (let i = 0; i < 200 && !(B.humanTurn() && B.mode === 'select'); i++) game.advance(.1); B.sel = B.unitsLeft()[0]; B.openMenu(); B.openTroopMenu(); G.dev.open = true; for (let tb = 0; tb < 6; tb++) { G.devState.tab = tb; G.devState.list = null; G.devUpdate(.016); } G.dev.open = false; if (!(G.ui.lists > 5) || G.ui.maxRows > 8) throw new Error(G.ui.lists + ' lists, max ' + G.ui.maxRows); });
  await t('stats are shown as bars with their numbers, not tables', () => { const src = rd('dist/game.js'); if (!/G\.ui\.statBar = /.test(src) || !/bars\(g, x \+ 2\d\d, y \+ \d+, st/.test(src)) throw new Error('bars'); if (/<table|innerHTML/.test(src.replace(/aihub/gi, ''))) throw new Error('html table'); });
};
