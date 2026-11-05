// the by-hand review's checks: the paths no other suite ran (New Vacation+, letters, voices, the save screen, the title
// postcard, the hub's time-up)
import { load } from '../lib/load.mjs';
import { chromium } from 'playwright';
import { build, NAME } from '../../tools/build.mjs';
export default async t => {
  const { G, game } = load(); game.advance(.5); const I = game.input;
  // New Vacation+ keeps the wardrobe, album and stats, resets days and affinity to base + 10, adds 10% of the money
  const old = game.debug.tools.newVacation('lola', 7); old.wardrobe.suits.push('midnight', 'fortunagold'); old.album.push({ loc: 'beach', day: 5, people: [] }); old.money = 200000; old.stats.wins = 9; old.day = 5; old.flags.ending = 'A';
  G.beginVacation('ingrid', true); game.advance(.2); const S = G.state;
  t('NG+: wardrobe, album and stats carry over', S.wardrobe.suits.includes('midnight') && S.wardrobe.suits.includes('fortunagold') && S.album.length === 1 && S.stats.wins === 9);
  t('NG+: days reset, money is the start plus 10%', S.day === 1 && S.money === G.T.startMoney + 20000, S.money);
  t('NG+: affinity is base + 10', G.npcs().every(id => S.affinity[id] === Math.min(100, G.baseAff('ingrid', id) + 10)));
  // the NG+ arrival offers to skip the Welcome Match; skipping still pays and gives a partner
  game.advance(1); for (let k = 0; k < 120 && !(G.talkBox().open && G.talkBox().choices); k++) { I.tap('confirm'); game.advance(.3); }
  t('NG+: Pepper offers to skip the Welcome Match', !!G.talkBox().choices && G.talkBox().choices[1] === 'Skip it');
  for (let k = 0; k < 60 && G.talkBox().typing; k++) game.advance(.1); game.advance(.2); I.tap('right'); game.advance(.1); if (G.talkBox().choice !== 1) { I.tap('down'); game.advance(.1); } const picked = G.talkBox().choice; I.tap('confirm'); game.advance(.3); for (let k = 0; k < 6; k++) { I.tap('confirm'); game.advance(.4); }
  game.advance(1); t('NG+: skipping sets a partner, pays the prize and moves to the afternoon', S.partner && S.flags.tutorial && S.slot === 1 && S.money >= G.T.startMoney + 30000, picked + ' ' + S.partner + ' ' + S.slot + ' ' + S.money + ' ' + game.sceneName);
  // letters: the mailbox reads each new letter once, with its sender's voice
  S.letters = ['pepper_welcome', 'friend_note']; S.read = {}; G.go('location', { loc: 'villa' }, { fade: 0 }); game.advance(.3); G.openLetters(); game.advance(.1);
  t('letters: the first unread letter opens', G.talkBox().open && G.talkBox().name === 'PEPPER');
  for (let k = 0; k < 12; k++) { I.tap('confirm'); game.advance(.3); } t('letters: both are read, the friend\'s note signed by the best friend', S.read.pepper_welcome && S.read.friend_note && G.LETTERS.friend_note.text[1].includes(G.CAST[G.LETTERS.friend_note.from].short));
  // the Voices volume is a setting that drives the voice bus
  game.settings.set('voices', .3); t('voices: the Voices setting sets the voice volume', game.audio.voiceVolume === .3 && game.settings.spec('voices').group === 'Sound');
  // the hub's time-up: the host finishes at once with the score so far
  let fin = null; const fake = { time: () => 60000, send() {}, finish: r => { fin = r; } };
  const net = new G.Net({ me: 0, isHost: true, players: [{ id: 0, name: 'A' }, { id: 1, name: 'B' }], host: 0 }); net.H = fake;
  const M = new G.Match({ mode: 'hub', teams: [[{ id: 'rin', suit: 'seigaiha', acc: [], input: I, human: true, seat: 0 }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [], human: true, seat: 1 }, { id: 'mei', suit: 'peony', acc: [] }]] });
  for (const p of M.players) p.seatHuman = p.seat !== undefined && p.seat !== null; net.M = M; M.score = [4, 2]; net.finish('time-up');
  t('hub: time-up finishes with the team ahead first', fin && JSON.stringify(fin.standings) === JSON.stringify([[0], [1]]) && fin.scores[0] === 4 && fin.awards.length === 1, JSON.stringify(fin));
  t('no errors', game.errors.length === 0, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
  // in Chromium: the save screen saves, Load lists it, Continue resumes; a postcard set as the backdrop shows on the title
  build(); const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.goto('file://' + new URL('../../../' + NAME + '.html', import.meta.url).pathname); await p.waitForTimeout(1500);
    await p.evaluate(() => { My3D2dge.current.debug.tools.newVacation('tess', 4); AOA.state.money = 4242; AOA.go('journal', { back: 'map' }, { fade: 0 }); }); await p.waitForTimeout(400);
    await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    const shown = await p.evaluate(() => [...document.querySelectorAll('button')].map(x => x.textContent.trim()).filter(Boolean));
    t('browser: the journal opens the save screen', shown.length > 1, shown.join(','));
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')]; const slot = bs.find(x => /slot\s*1|^1/i.test(x.textContent)) || bs.find(x => /empty/i.test(x.textContent)); slot && slot.click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')]; const ok = bs.find(x => /^(save|yes|overwrite)/i.test(x.textContent.trim())); ok && ok.click(); }); await p.waitForTimeout(400);
    const saved = await p.evaluate(() => My3D2dge.current.saves.list().filter(s => !s.empty && s.slot !== 'auto').length);
    t('browser: a slot is saved from the save screen', saved >= 1, saved);
    await p.evaluate(() => { My3D2dge.current.saves.hide ? 0 : 0; AOA.state = null; AOA.go('menu', null, { fade: 0 }); }); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    const ids = await p.evaluate(() => AOA.SCENES.menu.items().map(i => i.id)); t('browser: the menu offers Continue and Load', ids.includes('continue') && ids.includes('load'), ids.join(','));
    await p.evaluate(() => { const s = My3D2dge.current.saves.latest(); My3D2dge.current.saves.load(s.slot); AOA.resumeVacation(); }); await p.waitForTimeout(800);
    t('browser: Continue resumes the saved vacation', await p.evaluate(() => My3D2dge.current.sceneName === 'map' && AOA.state.money === 4242 && AOA.state.me === 'tess'));
    // a postcard as the title backdrop
    await p.evaluate(() => { AOA.go('location', { loc: 'beach' }, { fade: 0 }); }); await p.waitForTimeout(700);
    await p.evaluate(() => { AOA.photo.open(); }); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Backspace'); await p.waitForTimeout(300);
    await p.evaluate(() => AOA.go('album', { from: 'location' }, { fade: 0 })); await p.waitForTimeout(500); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('KeyR'); await p.waitForTimeout(300);
    t('browser: the album sets a postcard as the title backdrop', await p.evaluate(() => !!My3D2dge.store.get('aoa-title-postcard', null)));
    await p.evaluate(() => AOA.go('title', null, { fade: 0 })); await p.waitForTimeout(800);
    t('browser: the title draws it behind the logo', await p.evaluate(() => { const im = AOA.SCENES.title.backdrop; return !!(im && im.complete && im.width > 0); }));
    await p.screenshot({ path: new URL('../../test-output/title-postcard.png', import.meta.url).pathname });
    t('browser: no errors', await p.evaluate(() => My3D2dge.current.errors.length === 0));
  } finally { await b.close(); }
};
