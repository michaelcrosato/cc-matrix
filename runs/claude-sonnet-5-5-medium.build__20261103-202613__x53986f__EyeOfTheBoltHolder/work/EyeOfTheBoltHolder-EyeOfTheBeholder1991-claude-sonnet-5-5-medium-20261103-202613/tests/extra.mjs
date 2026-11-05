import { open, sleep } from './browser.mjs';
const { b, page, errs } = await open({});
await page.waitForFunction(() => window.__game && window.__game.game.sceneName === 'title', null, { timeout: 120000 });
const G = f => page.evaluate(f); const log = (...a) => console.log(...a);
await G(() => { const { B, UI } = window.__game; B.premade(); UI.beginCampaign(B.PREMADE.map(s => B.makeMember(s))); window.__game.game.advance(2); const U = window.__game.UI; if (U.curCut) U.curCut.skip(); U.dlg.close(); U.applyTimeScale(); });
// NPC talk and join
await G(() => { const { B, UI, game } = window.__game; B.warp('f1', 16, 10, 0); game.advance(.2); B.warp('f1', 17, 11, 0); game.advance(.2); B.F().mons.length = 0; UI.talkNpc('tamsin'); game.advance(.3); });
log('dlg open', await G(() => window.__game.UI.dlg.open));
for (let i = 0; i < 14; i++) { await G(() => { const { game } = window.__game; game.input.press('Enter'); game.advance(.15); game.input.release('Enter'); game.advance(1.4); }); }
log('dlg', await G(() => window.__game.UI.dlg.open + ' choices ' + JSON.stringify(window.__game.UI.dlg.choices) + ' members ' + window.__game.B.S.party.members.length));
// cast flow: mage hand opens the cast menu
await G(() => { const { B, UI, game } = window.__game; UI.close && UI.screen && UI.close(); B.warp('f1', 3, 11, 0); game.advance(.2); B.cmdHand(2, 'off'); game.advance(.3); });
log('screen after mage hand', await G(() => window.__game.UI.screen && window.__game.UI.screen.id)); await page.screenshot({ path: 'shots/cast.png' });
await G(() => { const { game, UI } = window.__game; game.input.press('Backspace'); game.advance(.1); game.input.release('Backspace'); game.advance(.3); });
// camp flow via key C
await G(() => { const { B, game } = window.__game; B.F().mons.length = 0; B.S.party.members[0].hp = 3; game.input.press('KeyC'); game.advance(.1); game.input.release('KeyC'); game.advance(.4); });
log('camp screen', await G(() => window.__game.UI.screen && window.__game.UI.screen.id));
await G(() => { const { UI, game } = window.__game; UI.screen.pickTile('rest'); game.advance(4); });
log('hp after rest', await G(() => window.__game.B.S.party.members[0].hp), 'errors', await G(() => window.__game.game.errors.map(e => e.where + ' ' + e.message)), errs);
await b.close();
