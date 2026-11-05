// ui: the flow from the title into play, every screen opening and closing, focus by d-pad, prompts per device, the
// Xbox setting, the pause menu's rows, text that fits at 320x240 and 427x240
import { boot } from '../harness.mjs';
export default async check => {
  const { B, game, I } = await boot();
  const adv = (s = .3) => game.advance(s), snap = () => game.debug.snapshot();
  check('boots to the title', snap().scene === 'title');
  I.tap('confirm'); adv(.6); check('New Game opens creation', snap().scene === 'create');
  B.Create.focus = 'quick'; I.tap('confirm'); adv(.3); check('Quick Start fills the four slots', B.Create.slots.every(Boolean));
  B.Create.focus = 'begin'; I.tap('confirm'); adv(.6); check('Begin the Descent plays the intro', snap().scene === 'cutscene');
  I.hold('pause', true); adv(1.3); I.hold('pause', false); adv(.8); check('holding Options skips the intro into play', snap().scene === 'play' && snap().floor === 'f1', snap().scene);
  check('play starts at the Wardens\' Walk', snap().cell[0] === 2 && snap().cell[1] === 14);
  adv(2.5);
  I.tap('party'); adv(.2); check('△/I opens the Party screen', snap().screen === 'party');
  const f0 = B.Play.screen.focus; I.tap('down'); adv(.1); check('the d-pad moves the focus', B.Play.screen.focus !== f0);
  I.tap('cancel'); adv(.2); check('○ closes it', !snap().screen);
  // drag and drop with the mouse: the main hand's sword dragged to pack slot 7
  B.Play.openScreen('party', { m: 0 }); adv(.1); I.lastDevice = 'mouse';
  const pw = B.SCREENS.party.layout(B.UI.W, B.UI.H, B.Play.screen), sm = pw.find(w => w.id === 's_main'), p7 = pw.find(w => w.id === 'p7');
  I.feed('move', sm.x + 4, sm.y + 4); adv(.05); I.feed('down', sm.x + 4, sm.y + 4); adv(.05);
  check('mouse-down on a slot carries its item', B.S.party.hand && B.S.party.hand.id === 'longSword');
  I.feed('move', p7.x + 4, p7.y + 4); adv(.05); I.feed('up', p7.x + 4, p7.y + 4); adv(.1);
  check('mouse-up on another slot places it', !B.S.party.hand && B.S.party.members[0].pack[7] && B.S.party.members[0].pack[7].id === 'longSword');
  I.feed('move', p7.x + 4, p7.y + 4); I.feed('down', p7.x + 4, p7.y + 4); adv(.05); I.feed('move', sm.x + 4, sm.y + 4); adv(.05); I.feed('up', sm.x + 4, sm.y + 4); adv(.1);
  check('and dragged back to the hand', B.S.party.members[0].slots.main && B.S.party.members[0].slots.main.id === 'longSword' && !B.S.party.hand);
  // more drags: armour from the pack onto the body (swapping what was worn), ammunition into the quiver, a potion between pack slots
  const drag = (fromId, toId) => { const ws = B.SCREENS.party.layout(B.UI.W, B.UI.H, B.Play.screen), a = ws.find(w => w.id === fromId), b = ws.find(w => w.id === toId); I.feed('move', a.x + 4, a.y + 4); adv(.05); I.feed('down', a.x + 4, a.y + 4); adv(.05); I.feed('move', b.x + 4, b.y + 4); adv(.05); I.feed('up', b.x + 4, b.y + 4); adv(.1); };
  const br0 = B.S.party.members[0]; br0.pack[3] = B.item('chainShirt'); br0.pack[4] = B.item('bolts', 12); br0.pack[5] = B.item('potionHealing');
  drag('p3', 's_body'); check('drag armour onto the body', br0.slots.body.id === 'chainShirt' && !B.S.party.hand && br0.pack[3] && br0.pack[3].id === 'leatherArmor', JSON.stringify([br0.slots.body, br0.pack[3], B.S.party.hand]));
  drag('p4', 's_quiver'); check('drag ammunition into the quiver', br0.slots.quiver && br0.slots.quiver.id === 'bolts' && !br0.pack[4]);
  drag('p5', 'p11'); check('drag a potion between pack slots', br0.pack[11] && br0.pack[11].id === 'potionHealing' && !br0.pack[5]);
  const logN = B.S.log.length; drag('p11', 's_head'); check('a drop where it cannot go refuses and says why', !br0.slots.head && B.S.log.length > logN && (B.S.party.hand ? B.S.party.hand.id === 'potionHealing' : br0.pack[11].id === 'potionHealing'));
  if (B.S.party.hand) B.Play.cmd({ c: 'inv', m: 0, op: 'place', ref: { pack: 11 } });
  // every item in the game: dragged from the pack to the slot it belongs in (for a member who may use it), and back
  const slotFor = d => ({ body: 'body', shield: 'off', head: 'head', neck: 'neck', arms: 'arms', ring: 'ring1', feet: 'feet', ammo: 'quiver' }[d.kind] || 'main');
  let dragged = 0, bad = [];
  for (const d of Object.values(B.ITEMS)) {
    const P = B.S.party, mi = P.members.findIndex(m => !B.canEquip(m, B.item(d.id), slotFor(d)) && !(d.two && m.slots.off && false)); if (mi < 0) continue;
    B.Play.screen.m = mi; const m = P.members[mi], slot = slotFor(d), old = m.slots[slot]; delete m.slots[slot]; if (d.two) { m.pack[2] = m.slots.off || null; delete m.slots.off; }
    m.pack[6] = B.item(d.id, d.stack ? 5 : undefined); adv(.05);
    drag('p6', 's_' + slot); const okIn = m.slots[slot] && m.slots[slot].id === d.id && !m.pack[6] && !B.S.party.hand;
    drag('s_' + slot, 'p6'); const okBack = m.pack[6] && m.pack[6].id === d.id && !m.slots[slot] && !B.S.party.hand;
    if (!okIn || !okBack) bad.push(d.id + (okIn ? ' (back)' : ' (in)')); else dragged++;
    m.pack[6] = null; if (old) m.slots[slot] = old; if (B.S.party.hand) B.S.party.hand = null;
  }
  check('every item type drags into its slot and back (' + dragged + ' items)', !bad.length && dragged > 60, bad.join(', '));
  B.Play.screen.m = 0;
  I.lastDevice = 'keyboard'; I.tap('cancel'); adv(.2);
  I.tap('camp'); adv(.2); check('L3/C opens Camp', snap().screen === 'camp');
  I.tap('cancel'); adv(.2); check('and closes it', !snap().screen && !B.S.camp);
  I.tap('map'); adv(.2); check('Create/M opens the map (on release)', snap().screen === 'map');
  I.tap('cancel'); adv(.2);
  I.tap('journal'); adv(.2); check('J opens the Journal', snap().screen === 'journal'); I.tap('tabR'); adv(.1); check('tabs switch', B.Play.screen.tab === 1); I.tap('cancel'); adv(.2);
  const oi = B.S.party.members.findIndex(m => m.cls === 'M'); B.Play.cmd({ c: 'select', m: oi }); I.tap('handOff'); adv(.2); check('a spellbook hand opens the Cast screen', snap().screen === 'cast');
  I.tap('cancel'); adv(.2); check('Cast closes', !snap().screen);
  I.tap('pause'); adv(.1); check('Esc pauses in play', game.paused); game.resume(); adv(.1);
  B.Play.openScreen('party'); I.tap('pause'); adv(.1); check('Esc with a screen open closes the screen, not pausing', !game.paused && !snap().screen);
  // prompts follow the device; the Xbox setting
  I.lastDevice = 'keyboard'; check('no prompt prints a raw action name', ['fwd','back','strafeL','strafeR','turnL','turnR','use','putDown','throw','strike','selPrev','selNext','handMain','handOff','party','camp','examine','map','journal','confirm','cancel','alt','alt2','tabL','tabR','pause'].every(a => { const t = B.fillGlyphs(game, '{' + a + '}'); return t && t !== a; }));
  check('keyboard prompts name keys', B.fillGlyphs(game, '{use}') === 'F' && B.fillGlyphs(game, '{strike}') === 'Space');
  I.lastDevice = 'gamepad'; game.settings.set('glyphs', 'playstation'); check('pad prompts are PlayStation shapes by default', B.fillGlyphs(game, '{use}') === '✕' && B.fillGlyphs(game, '{party}') === '△');
  game.settings.set('glyphs', 'xbox'); check('the Xbox setting turns ✕ into A', B.fillGlyphs(game, '{use}') === 'A' && B.fillGlyphs(game, '{strike}') === 'X'); game.settings.set('glyphs', 'playstation');
  check('context prompts show what ✕ does', (() => { B.S.party.cx = 2; B.S.party.cy = 11; B.S.party.dir = 1; return B.HUD.prompts(game).some(([a, v]) => a === 'use' && v === 'Pull lever'); })());
  I.lastDevice = 'keyboard';
  const items = game.o.menu.items(); check('the pause menu has Dev Mode, Journal and About', ['Dev Mode', 'Journal', 'About & Credits'].every(l => items.some(i => i[0] === l)));
  check('Settings has the Game group', ['difficulty', 'menuTime', 'stepAnim', 'headBob', 'hints', 'levelUp', 'voiceVol'].every(k => game.settings.spec(k)));
  // dialogue: a choice picked with the d-pad and ✕
  B.startStory('tamsin'); B.drain(); adv(.1); let n = 0; while (B.S.talk && B.S.talk.stage !== 'choice' && n++ < 10) { I.tap('confirm'); adv(.05); I.tap('confirm'); adv(.05); }
  check('the story reaches its choices', B.S.talk && B.S.talk.stage === 'choice');
  I.tap('confirm'); adv(.1); check('✕ picks the choice (Tamsin joins)', B.S.party.members.some(m => m.npc === 'tamsin'));
  while (B.S.talk) { I.tap('confirm'); adv(.05); }
  // text fits: every screen's widgets inside the screen, and long names cut
  for (const [W, H] of [[320, 240], [427, 240]]) for (const name of ['party', 'cast', 'camp', 'map', 'journal', 'reader', 'confirm', 'dev']) {
    const s = { m: 0, lvl: 1, tab: 0, note: 'note:tornPage', text: 'Dismiss? They will go home for good.' };
    const ws = B.SCREENS[name].layout(W, H, s);
    check(name + ' fits ' + W + 'x' + H, ws.every(w => w.x >= 0 && w.y >= 0 && w.x + w.w <= W + 1 && w.y + w.h <= H + 1), JSON.stringify(ws.find(w => !(w.x >= 0 && w.y >= 0 && w.x + w.w <= W + 1 && w.y + w.h <= H + 1))));
  }
  for (const [W, H] of [[320, 240], [427, 240]]) { const c = B.HUD.cards(W, H); check('six cards fit at ' + W, (() => { B.joinNpc('durgan'); B.joinNpc('veil'); const cs = B.HUD.cards(W, H); return cs.every(x => x.x >= 0 && x.x + x.w <= W); })()); }
  check('About has every page', B.About.pages().length === 6 && B.About.pages()[1][1].length === 16);
  check('no errors in the UI flow', !game.errors.length, game.errors.map(e => e.where + ' ' + e.message).join(' | '));
};
