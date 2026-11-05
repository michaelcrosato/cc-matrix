// ui: title -> New Game -> Quick Start -> skip the intro -> play; every screen opens and closes; focus by the d-pad and
// the mouse; carry and place; cast targeting; camp pages; map; journal; dialogue choices; prompts follow the last device;
// the Xbox setting; the pause menu's Dev Mode; text and widgets inside 320 x 240 and 427 x 240
import { fresh } from '../util.mjs';
export async function run(t) {
  const { B, game, I, D } = await fresh();
  const adv = s => game.advance(s), tap = (a, s = .15) => { I.tap(a); adv(s); }, press = (code, s = .15) => { I.press(code); adv(1 / 60); I.release(code); adv(s); };
  adv(.5); t.check('the game starts at the title', game.sceneName === 'title');
  tap('confirm', .6); t.check('New Game opens creation', game.sceneName === 'create');
  const C = B.Create; const qs = D.SCREENS ? null : null;
  game.scenes.create.focus = 'quick'; tap('confirm', .6); t.check('Quick Start goes to the intro', game.sceneName === 'cutscene');
  I.hold('pause'); adv(1.3); I.hold('pause', false); adv(.6); t.check('holding Esc skips the intro into play', game.sceneName === 'play' && D.snapshot().floor === 'f1');
  const s0 = D.snapshot(); t.check('play starts at the Drains\' start', s0.cell[0] === 2 && s0.cell[1] === 14 && s0.dir === 0);
  press('KeyW', .5); t.check('W steps forward', D.snapshot().cell[1] === 13);
  press('KeyE', .4); t.check('E turns right', D.snapshot().dir === 1); press('KeyQ', .4);
  press('KeyF', .2); t.check('F takes the top item ahead (the rock) into the Hand', D.snapshot().hand === 'rock');
  press('KeyF', .2); t.check('F again stows it', D.snapshot().hand === null);
  // the Party screen
  tap('party', .3); t.check('I opens the Party screen', D.snapshot().ui === 'party');
  const f0 = D.snapshot().focus; tap('right', .2); t.check('the d-pad moves the focus', D.snapshot().focus !== f0);
  const L = D.layout('party', 427, 240), slot = L.find(w => w.id === 'p0'); game.debug.SCREENS.party.focus = 'p0';
  tap('confirm', .2); t.check('confirm on a pack item carries it', !!D.snapshot().hand);
  const free = L.find(w => w.id === 'p5'); game.debug.SCREENS.party.focus = 'p5'; tap('confirm', .2); t.check('confirm on an empty slot places it', !D.snapshot().hand);
  I.feed('move', L.find(w => w.id === 'p2').x + 4, L.find(w => w.id === 'p2').y + 4); I.lastDevice = 'mouse'; adv(.05); I.feed('move', L.find(w => w.id === 'p2').x + 6, L.find(w => w.id === 'p2').y + 6); adv(.1);
  t.check('the mouse over a slot focuses it', D.snapshot().focus === 'p2');
  tap('mR', .2); t.check('R1 / E switches member', game.debug.SCREENS.party.m === 1);
  tap('mR2', .2); t.check('R2 / V shows the Sheet', game.debug.SCREENS.party.sheet === true); tap('mR2', .1);
  tap('cancel', .2); t.check('cancel closes it', !D.snapshot().ui);
  // cast targeting: Cobb's Mend on Ysa
  B.S.party.members[1].hp = 2; D.cmd({ c: 'select', m: 2 }); game.debug.UI.open('cast', { m: 2 }); adv(.1);
  t.check('the Cast menu lists Mend', game.debug.SCREENS.cast.rows(B.S.party.members[2]).some(r => r.id === 'mend'));
  tap('confirm', .1); t.check('a member spell asks who', !!game.debug.SCREENS.cast.pick);
  game.debug.SCREENS.cast.pi = 1; tap('confirm', .2); t.check('confirm casts on the chosen card', B.S.party.members[1].hp > 2 && !D.snapshot().ui);
  // the map and the journal
  tap('map', .2); t.check('M opens the map', D.snapshot().ui === 'map'); tap('cancel', .2); t.check('and closes', !D.snapshot().ui);
  tap('journal', .2); t.check('J opens the journal', D.snapshot().ui === 'journal'); tap('mR', .1); tap('cancel', .2); t.check('and closes', !D.snapshot().ui);
  // camp in the Wardens' Post
  D.warp('f1', 5, 13, 0); adv(.2); tap('camp', .3); t.check('C opens camp in a quiet place', D.snapshot().ui === 'camp' && D.snapshot().camp);
  game.debug.SCREENS.camp.focus = 'c4'; tap('confirm', .2); t.check('Formation opens its page', game.debug.SCREENS.camp.page === 'form');
  game.debug.SCREENS.camp.focus = 'f0'; tap('confirm', .1); game.debug.SCREENS.camp.focus = 'f2'; tap('confirm', .2); t.check('two places swap', B.S.party.form[0] === 2 && B.S.party.form[2] === 0); D.cmd({ c: 'camp', op: 'swap', a: 0, b: 2 });
  tap('cancel', .2); game.debug.SCREENS.camp.focus = 'c1'; tap('confirm', .2); t.check('Memorize opens for the mage', game.debug.SCREENS.camp.page === 'mem');
  tap('cancel', .2); game.debug.SCREENS.camp.focus = 'c0'; tap('confirm', .2); B.S.party.members[0].hp = 1; adv(5); t.check('Rest passes the hours and heals', B.S.party.members[0].hp > 1);
  tap('cancel', .2); tap('cancel', .3); t.check('Leave Camp closes it', !D.snapshot().ui && !D.snapshot().camp);
  // a talk with choices
  D.warp('f1', 5, 2, 1); adv(.2); press('KeyF', .3); t.check('the lever starts a talk', D.snapshot().talk === 'tamsin');
  for (let i = 0; i < 8 && !(B.S.talk && B.S.talk.choices && !B.TalkBox.typing && B.TalkBox.page >= B.TalkBox.pages.length - 1); i++) { tap('confirm', .1); adv(1.5); }
  tap('down', .15); tap('confirm', .3); for (let i = 0; i < 6 && B.S.talk; i++) { tap('confirm', .1); adv(1.5); }
  t.check('the second choice sends Tamsin home with her picks', !B.S.talk && !B.S.party.members.some(m => m.npc === 'tamsin') && !!B.findItem(r => r.id === 'lockpicks' && true));
  // prompts follow the last device
  I.press('KeyF'); adv(1 / 60); I.release('KeyF'); adv(.05); t.check('keyboard prompts show keys', B.badgeOf('use').kind === 'key' && B.badgeOf('use').text === 'F');
  I.press('Pad0'); adv(1 / 60); I.release('Pad0'); adv(.05); t.check('pad prompts show PlayStation shapes', game.input.lastDevice === 'gamepad' && B.badgeOf('use').kind === 'ps' && B.badgeOf('use').text === '✕');
  game.settings.set('glyphs', 'xbox'); t.check('the Xbox setting turns ✕ into A', B.badgeOf('use').text === 'A'); game.settings.set('glyphs', 'playstation');
  I.lastDevice = 'mouse'; t.check('the mouse shows its own button for use', B.badgeOf('use').kind === 'mouse');
  t.check('Button symbols offer PlayStation and Xbox, PlayStation first', JSON.stringify(game.settings.spec('glyphs').options.map(o => o[0])) === '["playstation","xbox"]' && game.settings.spec('glyphs').value === 'playstation');
  // the pause menu
  t.check('the pause menu offers Dev Mode', B.pauseItems().some(i => i[0] === 'Dev Mode'));
  // layouts inside the screen at 4:3 and 16:9
  for (const [W, H] of [[320, 240], [427, 240]]) {
    for (const s of ['party', 'camp', 'cast', 'dev']) {
      if (s === 'cast') game.debug.SCREENS.cast.m = 2;
      const L2 = D.layout(s, W, H); const bad = L2.filter(w => w.x < 0 || w.y < 0 || w.x + w.w > W || w.y + w.h > H);
      t.check(`${s} fits ${W}x${H}`, !bad.length, bad.map(w => w.id + '@' + w.x + ',' + w.y + ' ' + w.w + 'x' + w.h).join(' '));
    }
    game.debug.UI.W = W; game.debug.UI.H = H; const cards = game.debug.UI.cards(); t.check(`the cards fit ${W}x${H}`, cards.every(c => c.x >= 0 && c.x + c.w <= W));
    B.S.party.members.push(B.mkMember(B.clone(B.NPCS.durgan)), B.mkMember(B.clone(B.NPCS.veil))); B.S.party.form = [0, 1, 2, 3, 4, 5 - (B.S.party.members.length < 6 ? 99 : 0)].map(i => i < B.S.party.members.length ? i : -1);
    const c6 = game.debug.UI.cards(); t.check(`six cards fit ${W}x${H}`, c6.length === B.S.party.members.length && c6.every(c => c.x >= 0 && c.x + c.w <= W), c6.map(c => c.x + '+' + c.w).join(' '));
    B.S.party.members.length = 4; B.S.party.form = [0, 1, 2, 3, -1, -1];
  }
  t.check('no game errors', !game.errors.length, game.errors.map(e => e.where + ': ' + e.message).join(' | '));
}
