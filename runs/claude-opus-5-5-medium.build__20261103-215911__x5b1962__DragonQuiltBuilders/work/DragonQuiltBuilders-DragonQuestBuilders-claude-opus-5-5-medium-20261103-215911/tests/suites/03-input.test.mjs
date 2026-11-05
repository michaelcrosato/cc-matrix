import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, errs } = G, I = game.input;
  const ctx = G.play('banner'), b = ctx.builder;
  I.lastDevice = 'keyboard'; check('keyboard prompt for swing is J', DQ.Glyphs.label(game, 'swing') === 'J', DQ.Glyphs.label(game, 'swing'));
  I.lastDevice = 'mouse'; check('mouse prompt for swing is the left button', DQ.Glyphs.code(game, 'swing') === 'Mouse0');
  check('mouse prompt for place is the right button', DQ.Glyphs.code(game, 'place') === 'Mouse2');
  I.lastDevice = 'gamepad'; check('gamepad prompt for swing is square (button 2)', DQ.Glyphs.code(game, 'swing') === 'Pad2' && DQ.Glyphs.family(game) === 'ps');
  game.settings.set('dqGlyphs', 'Xbox'); check('the glyph setting switches to Xbox', DQ.Glyphs.family(game) === 'xbox' && I.label('jump') === 'A', I.label('jump'));
  game.settings.set('dqGlyphs', 'PlayStation'); check('PlayStation glyphs are the default family', DQ.Glyphs.family(game) === 'ps' && I.label('jump') === '✕', I.label('jump'));
  I.lastDevice = 'keyboard';
  // the wheel steps the hotbar
  const s0 = b.sel; I.wheelGame = true; I._wheelAcc = 130; run(1 / 60); run(1 / 60);
  check('the mouse wheel steps the hotbar', b.sel !== s0, [s0, b.sel]);
  // the number keys pick a slot
  I.press('Digit5'); run(1 / 60); I.release('Digit5'); run(1 / 60); check('number keys pick a hotbar slot', b.sel === 4);
  // the satchel opens from its key, and Tab focus is the game's
  I.press('Tab'); run(1 / 60); I.release('Tab'); run(.1); check('Tab opens the Satchel', ctx.ui.top && ctx.ui.top.name === 'satchel');
  I.press('Tab'); run(1 / 60); I.release('Tab'); run(.1); check('Tab closes it again', !ctx.ui.top);
  // the hub rule: while Create is held in a session, the satchel waits (Options belongs to the hub)
  ctx.inHub = true; I.press('Escape'); I.press('Tab'); run(1 / 60); I.release('Tab'); I.release('Escape'); run(.1); check('in a hub session Create + Options does not open the Satchel', !ctx.ui.top); ctx.inHub = false; game.resume(); run(.1);
  // camera turns and zoom steps
  const y0 = game.yaw; I.press('KeyE'); run(1 / 60); I.release('KeyE'); run(.1); check('E turns the camera 90 degrees', (game.yaw - y0 + 360) % 360 === 90, game.yaw);
  I.press('Minus'); run(1 / 60); I.release('Minus'); run(.1); check('minus steps the zoom out', ctx.zoom === .75, ctx.zoom);
  I.press('KeyR'); run(1 / 60); I.release('KeyR'); run(.1); check('R resets the camera', game.yaw === 0 && ctx.zoom === 1);
  // text with button tokens only uses the font's characters
  const bad = []; const scan = (o, p) => { if (typeof o === 'string') { if (!DQ.FONT_OK.test(o.replace(/\{btn:\w+\}/g, ''))) bad.push(p + ': ' + o.slice(0, 40)); } else if (o && typeof o === 'object') for (const k in o) if (typeof o[k] !== 'function') scan(o[k], p + '.' + k); };
  scan(DQ.LINES, 'LINES'); scan(DQ.IDLE, 'IDLE'); scan(DQ.QUESTS.map(q => ({ t: q.title, s: q.steps.map(s => s.text), i: q.intro, o: q.outro })), 'QUESTS'); scan(DQ.ITEMS, 'ITEMS'); scan(DQ.NPCS, 'NPCS');
  check('every string table uses only the font\'s characters', !bad.length, bad.slice(0, 5).join(' | '));
  check('no errors', !game.errors.length, errs());
};
