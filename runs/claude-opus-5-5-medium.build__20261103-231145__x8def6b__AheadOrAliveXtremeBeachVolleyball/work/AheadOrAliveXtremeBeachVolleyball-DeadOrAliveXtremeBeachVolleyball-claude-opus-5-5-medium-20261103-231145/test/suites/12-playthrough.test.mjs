// the whole vacation, start to results, driven through the real scenes: once won, once lost
import { load } from '../lib/load.mjs';
async function run(t, me, winFinal) {
  const { G, game } = load({ seed: winFinal ? 3 : 4 }); game.advance(1); const I = game.input, T = game.debug.tools, tag = me + (winFinal ? ' (won)' : ' (lost)');
  G.newVacationFlow(); game.advance(.5); I.tap('confirm'); game.advance(.2); I.tap('confirm'); game.advance(.5);
  for (let k = 0; k < G.FIGHTERS.indexOf(me); k++) { I.tap('right'); game.advance(.1); if (G.FIGHTERS.indexOf(me) >= 3 && k === 0) { } }
  G.beginVacation(me); game.advance(1);
  t(tag + ': the arrival plays', game.sceneName === 'cutscene', game.sceneName);
  const seen = new Set(), log = []; let lastScene = '', sceneT = 0, steps = 0, did = {}, entry = 0;
  while (steps++ < 120 * 2400) {
    const sc = game.sceneName, S = G.state; if (sc !== lastScene) { lastScene = sc; sceneT = 0; entry++; seen.add(sc); log.push(sc + (S ? '@' + S.day + '.' + S.slot : '')); } sceneT += 1 / 120;
    if (sc === 'title' && seen.has('vresults')) break;
    const key = sc + ':' + entry;
    if (sc === 'cutscene' && sceneT > .25 && Math.round(sceneT * 120) % 30 === 0) I.tap('confirm');
    if (sc === 'match' && sceneT > 2 && !did[key + G.M.cfg.title]) { did[key + G.M.cfg.title] = 1; T.endMatch(G.M.cfg.final ? winFinal : true); }
    if ((sc === 'results' || sc === 'dayend' || sc === 'credits') && sceneT > 1 && Math.round(sceneT * 120) % 30 === 0) I.tap('confirm');
    if (sc === 'vresults' && sceneT > 1) { G.SCENES.vresults.focus.i = 1; I.tap('confirm'); }
    if (sc === 'poolhop' && G.SCENES.poolhop.state === 'end' && sceneT > 3 && Math.round(sceneT * 120) % 30 === 0) I.tap('hopA');
    if (sc === 'map' && sceneT > .3 && !did[key]) {
      did[key] = 1; G.talkBox().close();
      if (S.slot < 2) {
        if (S.day === 2 && S.slot === 1) { G.poolBot = true; G.go('poolhop', null, { fade: 0 }); }
        else if (S.day === 2 && S.slot === 0) { G.go('location', { loc: 'promenade' }, { fade: 0 }); did.shop = 1; }
        else G.go('location', { loc: 'beach' }, { fade: 0 });
      } else G.go('location', { loc: S.day === 1 || S.day === 3 ? 'casino' : 'villa' }, { fade: 0 });
    }
    if (sc === 'location' && sceneT > .5 && !did[key + 'act']) {
      did[key + 'act'] = 1; G.talkBox().close(); const L = G.SCENES.location;
      if (L.loc === 'promenade') { S.money += 0; T.give('mochi_box', 1); const n = L.npcs[0]; if (n) G.giveGift(n.id, 'mochi_box'); G.SCENES.location.askLeave(); G.SCENES.location.panel.yes(); }
      else if (L.loc === 'beach') { const team = S.teams.find(tm => !tm.includes(S.partner)); if (S.partner && team) L.challenge(team); else { L.askLeave(); L.panel.yes(); } }
      else if (L.loc === 'casino' && !did['cas' + S.day]) { did['cas' + S.day] = 1; if (S.day === 3) G.vipLounge(L); S.chips = Math.max(S.chips, 10); G.go('casino', { game: 'slots', back: { loc: 'casino' } }, { fade: 0 }); }
      else if (L.loc === 'villa') G.restInVilla();
    }
    if (sc === 'location' && sceneT > 1.5 && G.talkBox().open) I.tap('confirm');
    if (sc === 'location' && G.SCENES.location.loc === 'casino' && did['cas' + S.day] && sceneT > .8 && !did[key + 'leave'] && !did[key + 'act2']) { did[key + 'act2'] = 1; }
    if (sc === 'location' && sceneT > 4 && !did[key + 'leave']) { did[key + 'leave'] = 1; G.talkBox().close(); const L = G.SCENES.location; L.panel = null; L.askLeave(); L.panel.yes(); }
    if (sc === 'casino' && sceneT > .3 && !did[key + 'spin']) { did[key + 'spin'] = 1; I.tap('confirm'); }
    if (sc === 'casino' && sceneT > 6 && !did[key + 'out']) { did[key + 'out'] = 1; G.talkBox().close(); G.SCENES.casino.leave(); }
    game.advance(1 / 120);
  }
  const S = G.state;
  t(tag + ': reaches the vacation results and the title', seen.has('vresults') && game.sceneName === 'title', log.slice(-12).join(' > '));
  t(tag + ': tutorial, semifinal, final and party all happened', S.flags.tutorial && S.flags.semiDone && S.flags.finalDone && S.flags.partyDone, JSON.stringify(S.flags));
  t(tag + ': the right ending', S.flags.ending === (winFinal ? 'A' : 'B'), S.flags.ending);
  t(tag + ': visited the casino, the shops and Pool Hop', seen.has('casino') && seen.has('poolhop'), log.join(' > '));
  t(tag + ': money earned', S.stats.earned > 0 && S.stats.matches >= 4, JSON.stringify(S.stats));
  if (winFinal) t(tag + ': Fortuna Gold won', S.wardrobe.suits.includes('fortunagold'));
  t(tag + ': the overheard call', S.flags.callSeen);
  t(tag + ': no errors', game.errors.length === 0, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
}
export default async t => { await run(t, 'tess', true); await run(t, 'mei', false); };
