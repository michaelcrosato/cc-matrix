// ui-flow: the game played through input only (taps, holds), checked through game.debug
export default async ({ boot, t }) => {
  const { G, game } = boot(); const I = game.input, snap = () => game.debug.snapshot();
  const tap = (a, s = .2) => { I.tap(a); game.advance(s); }, hold = (a, s) => { I.hold(a); game.advance(s); I.hold(a, false); game.advance(.1); };
  const errs = () => { if (game.errors.length) throw new Error(game.errors[0].message + ' ' + String(game.errors[0].stack || '').split('\n')[1]); };
  game.advance(.5);
  await t('title -> setup -> realm -> difficulty -> begin', () => { tap('confirm', .4); if (snap().scene !== 'setup') throw new Error(snap().scene); tap('confirm'); tap('right'); tap('confirm'); tap('confirm'); tap('confirm', .8); errs(); if (snap().scene !== 'event' || snap().realm !== 'solmark') throw new Error(snap().scene + ' ' + snap().realm); });
  await t('holding cancel skips the prologue', () => { hold('cancel', 1.2); game.advance(.6); if (snap().scene === 'event' && snap().event === 'prologue') throw new Error('still in prologue'); errs(); });
  await t('tidings cards and story lead to the tutorial battle', () => { for (let i = 0; i < 200 && snap().scene !== 'battle'; i++) tap('confirm', .3); errs(); if (snap().scene !== 'battle') throw new Error(snap().scene + ' ' + snap().flow); if (snap().battle.map !== 'border_meadow') throw new Error(snap().battle.map); });
  await t('a commanded turn: select, move, attack or wait through the command list', () => {
    const B = G.battle; for (let i = 0; i < 200 && !(B.humanTurn() && B.mode === 'select'); i++) game.advance(.1);
    if (B.mode !== 'select') throw new Error('mode ' + B.mode);
    const c0 = B.cursor.slice(); tap('right', .15); if (B.cursor[0] === c0[0] && B.cursor[1] === c0[1]) { tap('left', .15); } B.cursor = c0;
    const u = B.unitsLeft()[0]; B.cursor = [u.cx, u.cy]; tap('confirm', .15); if (B.mode !== 'menu') throw new Error('menu ' + B.mode);
    tap('confirm', .15); if (B.mode !== 'move') throw new Error('move ' + B.mode);
    const dest = [...B.reach.values()].find(v => v.cost > 0); B.cursor = dest.c; tap('confirm', .1); for (let i = 0; i < 40 && B.mode !== 'menu'; i++) game.advance(.1);
    if (B.sim.state.units[u.id].cx !== dest.c[0]) throw new Error('did not move');
    const attack = B.menuList.items.findIndex(x => x.id === 'attack' && !x.disabled), wait = B.menuList.items.findIndex(x => x.id === 'wait');
    B.menuList.i = attack >= 0 ? attack : wait; tap('confirm', .15); if (attack >= 0) { tap('confirm', .2); } for (let i = 0; i < 60 && B.view.busy; i++) game.advance(.1);
    if (!B.sim.state.units[u.id].acted) throw new Error('did not act'); errs();
  });
  await t('the command menu ends the troop turn', () => { const B = G.battle; for (let i = 0; i < 100 && !(B.humanTurn() && B.mode === 'select'); i++) game.advance(.1); const tr = B.sim.active.id; G.settings.set('confirmEnd', 'Off'); tap('command', .15); if (B.mode !== 'troop') throw new Error('troop menu ' + B.mode); tap('confirm', .2); game.advance(1); if (B.sim.active && B.sim.active.id === tr && B.sim.state.bell === 1 && B.humanTurn()) throw new Error('troop did not end'); G.settings.set('confirmEnd', 'On'); errs(); });
  await t('the tutorial battle finishes (the AI plays the rest) and returns to the campaign', () => { G.battle.allAuto = true; for (let i = 0; i < 2000 && snap().scene === 'battle'; i++) { game.advance(.1); if (G.battle && G.battle.results) tap('confirm', .2); } errs(); if (snap().scene === 'battle') throw new Error('stuck in battle'); for (let i = 0; i < 200 && !(snap().scene === 'campaign' && snap().flow === 'muster'); i++) tap('confirm', .3); if (snap().flow !== 'muster') throw new Error('flow ' + snap().flow + ' ' + snap().scene); });
  const sim = () => G.run.sim, S = () => G.run.sim.state, C = () => game.scene;
  await t('muster: summon at the capital through the castle card', () => { C().focus = 'brazenhold'; const m0 = S().realms.solmark.mana, r0 = S().castles.brazenhold.reserve.length; tap('confirm'); if (snap().panel !== 'castle') throw new Error(snap().panel); tap('down'); tap('confirm'); if (snap().panel !== 'summon') throw new Error(snap().panel); tap('confirm', .3); if (S().castles.brazenhold.reserve.length !== r0 + 1 || S().realms.solmark.mana >= m0) throw new Error('no summon'); tap('cancel'); errs(); });
  await t('muster: organize binds a reserve monster', () => { tap('confirm'); C().panel = null; tap('confirm'); tap('confirm'); if (snap().panel !== 'organize') throw new Error(snap().panel); const k = S().castles.brazenhold.knights[0], n0 = S().knights[k].troop.length; tap('confirm'); tap('confirm'); const n1 = S().knights[k].troop.length; if (n1 === n0) { tap('right'); tap('confirm'); } tap('cancel'); tap('cancel'); C().panel = null; errs(); });
  await t('muster: move, quest and equip panels open and act', () => {
    C().focus = 'cinderwall'; tap('confirm'); const p = C().panel; if (!p || p.id !== 'castle') throw new Error('castle'); C().panel = null;
    const R = 'solmark', k = S().castles.cinderwall.knights.find(x => !S().knights[x].ruler);
    C().panel = null; tap('confirm'); tap('down'); tap('down'); tap('down'); tap('confirm'); if (snap().panel !== 'quest') throw new Error('quest ' + snap().panel); tap('confirm'); tap('confirm', .3); if (!S().knights[k].quest) throw new Error('not questing'); C().panel = null;
    C().focus = 'brazenhold'; tap('confirm'); C().panel.update && C().panel; for (let i = 0; i < 4; i++) tap('down'); tap('confirm'); if (snap().panel !== 'equip') throw new Error('equip ' + snap().panel); tap('confirm'); tap('down'); tap('down'); tap('down'); tap('confirm'); C().panel = null; errs();
  });
  await t('save and load keep the campaign', () => { const h = sim().hash(); game.saves.canSave = true; const ok = game.saves.save(0); if (!ok) throw new Error('save refused'); sim().state.realms.solmark.mana += 999; game.saves.load(0); game.advance(.5); if (sim().hash() !== h) throw new Error('hash differs'); errs(); });
  await t('end the Muster (hold), declare a march, resolve', () => {
    for (let i = 0; i < 50 && !(snap().scene === 'campaign' && snap().flow === 'muster'); i++) tap('confirm', .2);
    G.settings.set('confirmEnd', 'Off'); hold('command', .8); for (let i = 0; i < 80 && !(snap().flow === 'march' && snap().scene === 'campaign'); i++) tap('confirm', .2);
    if (snap().flow !== 'march') throw new Error('flow ' + snap().flow + ' ' + snap().scene);
    C().focus = 'beltane'; tap('confirm'); if (snap().panel !== 'march') throw new Error('march panel ' + snap().panel); tap('confirm'); tap('up'); tap('confirm'); if (!S().marches.some(m => m.realm === 'solmark')) throw new Error('no march declared');
    hold('command', .8); for (let i = 0; i < 400 && !(snap().scene === 'campaign' && snap().flow === 'muster'); i++) { if (snap().scene === 'battle') { G.battle.allAuto = true; if (G.battle.results) tap('confirm', .2); } if (snap().flow === 'battleChoice') { tap('down'); } tap('confirm', .25); }
    errs(); if (snap().season !== 'summer') throw new Error('season ' + snap().season + ' flow ' + snap().flow);
  });
  await t('How to Play and About open and close', () => { game.go('help', { back: 'title' }, { fade: 0 }); game.advance(.2); tap('right'); tap('cancel', .4); if (snap().scene !== 'title') throw new Error(snap().scene); game.go('about', { back: 'title' }, { fade: 0 }); game.advance(.2); for (let i = 0; i < 6; i++) tap('right'); tap('cancel', .4); if (snap().scene !== 'title') throw new Error(snap().scene); errs(); });
};
