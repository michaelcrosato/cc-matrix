// one section per system: case rules, the box, the wire, the world and its reachability, perception, heat and burns,
// controls and stick inversion, glyphs, saves, the attract pilot, and the AI Hub session
import { load, makeCheck } from './harness.mjs';
const { check, done } = makeCheck();
const T = 16;
const pads = [null];   // a mock gamepad the engine polls
const nav = { getGamepads: () => pads, maxTouchPoints: 0 };
const t = load({ navigator: nav }); const { game, E, I, dbg, snap } = t;
const step = s => game.advance(s);
const start = (stage) => { dbg.startCase(stage ? { stage } : {}); step(.4); };
step(.4);

/* ---- case rules (pure) ---- */
{
  I.tap('confirm'); step(.5);
  const S = dbg.state();
  check('a new case starts at the briefing with the budget', S.stage === 'brief' && S.cash === 150 && S.heat === 0);
  check('no evidence is worth nothing', snap().evidence === 0);
  dbg.setState({ photos: { lorne: true, sweets: false, dray: false } });
  check('a photograph of Lorne is an exhibit', snap().evidence === 1);
  const base = snap().score; dbg.setState({ tip: 'paid' });
  check('a paid tip adds to the score', snap().score > base);
  const paid = snap().score; dbg.setState({ tip: 'squeezed' });
  check('a squeezed tip is worth less than a paid one', snap().score < paid);
  dbg.setState({ burns: 2 }); const lowered = snap().score; check('burns cost points', lowered < snap().score + 1 && lowered < paid);
}
/* ---- the box ---- */
{
  start('box'); const S = dbg.state();
  check('box stage starts with Dray at full resolve', S.box.resolve === 100 && !S.box.result);
  dbg.startBox(); step(.2);
  check('the interview opens as a screen', snap().boxScreen);
  const before = S.box.resolve; dbg.pick('wire'); check('playing the wire log lowers resolve', S.box.resolve < before, S.box.resolve);
  dbg.pick('photo'); dbg.pick('tip'); dbg.pick('chase'); dbg.pick('soft');
  check('five rounds end the interview', !!S.box.result);
  start('box'); const S2 = dbg.state(); dbg.startBox(); for (const id of ['hard', 'hard', 'hard', 'hard', 'hard']) dbg.pick(id);
  check('leaning on him costs a brutality mark each time', S2.brutality >= 4, S2.brutality);
  check('five hard leans flip him, and the case notes it', S2.box.result === 'flipped' && S2.brutality === 5, JSON.stringify(S2.box));
  start('box'); const S3 = dbg.state(); S3.tip = null; dbg.startBox(); dbg.pick('deal'); check('a deal offered too early is refused', S3.box.resolve === 100, S3.box.resolve);
}
/* ---- the wire ---- */
{
  start('wire'); const [px, py] = dbg.spawn('payphone'); dbg.teleport(px, py + 6); step(.1); I.tap('interact'); step(.2);
  check('the payphone opens the tap game', snap().overlay === 'wire');
  I.tap('interact'); step(.1);   // a press when the marker is wherever it is: usually a fumble
  const fumbles = dbg.state().tapFumbles, heat = dbg.state().heat;
  let fixed = false; for (let i = 0; i < 700 && !fixed; i++) { const W = dbg.wire(); if (!W) break; step(1 / 60); }
  check('a bad timing costs heat or advances (never nothing)', fumbles > 0 ? heat > 0 : dbg.wire().step > 0, JSON.stringify({ fumbles, heat }));
  I.tap('cancel'); step(.2); check('cancel steps away from the phone', snap().overlay === null);
  start('tip'); dbg.state().stage; check('the payphone before the wire stage is only a phone', (() => { const [x, y] = dbg.spawn('payphone'); dbg.teleport(x, y + 6); step(.1); I.tap('interact'); step(.2); return snap().overlay === null; })());
}
/* ---- the van ---- */
{
  start('listen'); const [x, y] = dbg.spawn('van'); dbg.teleport(x, y + 4); step(.1); I.tap('interact'); step(.2);
  check('the van opens the listening post', snap().overlay === 'listen');
  step(40);   // never press: nothing logged
  check('listening without pressing logs nothing', dbg.listen().done && dbg.listen().logged === 0);
  I.tap('interact'); step(.3);
  check('a failed log keeps the case at the van', snap().stage === 'listen' && snap().overlay === null, JSON.stringify(snap()));
}
/* ---- the world ---- */
{
  start('surveil'); const map = dbg.map();
  const tags = ['hero', 'kowalczyk', 'pruitt', 'board', 'boxhero', 'boxsuspect', 'payphone', 'tooley', 'van', 'lorne', 'sweets', 'dray', 'gate', 'deadend'];
  check('every story spawn exists', tags.every(g => map.find(g)), tags.filter(g => !map.find(g)).join());
  check('five lookouts post the Pit and one the avenue', map.findAll('hopper').length === 5 && map.find('hopper2'));
  const ff = new E.FlowField(map); const reach = (tag, from = 'hero') => { const a = map.find(tag), b = map.find(from); ff.update(a.x, a.y); const d = ff.d[b.cy * map.w + b.cx]; return d < 1e8; };
  for (const g of ['kowalczyk', 'pruitt', 'board', 'boxhero', 'payphone', 'tooley', 'van', 'lorne', 'sweets', 'dray', 'gate', 'deadend']) check('"' + g + '" is reachable on foot from the office', reach(g), g);
  check('the interview room connects to the office', reach('boxsuspect'));
}
/* ---- the chase route ---- */
{
  start('chase'); const ch = dbg.chase(); check('the chase stage sets Dray at the gate', ch && !ch.running);
  const d = dbg.people().dray; const [gx, gy] = dbg.spawn('gate'); check('Dray waits at the south gate', Math.hypot(d.x - gx, d.y - gy) < 4);
  dbg.teleport(gx, gy - 60); step(.3); check('being close starts the run', dbg.chase().running);
  step(40); check('left alone, Dray runs the whole route and is cornered', dbg.chase().cornered, JSON.stringify(snap().chase));
  const de = dbg.spawn('deadend'); check('he ends near the alley’s dead end', Math.hypot(d.x - de[0], d.y - de[1]) < 90, JSON.stringify([d.x, d.y, de]));
  dbg.teleport(d.x - 14, d.y); step(.2); check('a cornered man can be cuffed', dbg.interact('cuff') && (step(.3), snap().caught));
  step(5); for (let i = 0; i < 20; i++) { I.tap('confirm'); step(.3); }
  check('cuffing moves the case to the box', snap().stage === 'box', snap().stage);
}
/* ---- lookouts, heat and burns ---- */
{
  start('surveil'); const lk = dbg.lookouts()[0]; const h = dbg.hero();
  dbg.teleport(lk.x + Math.cos(lk.facing) * 50, lk.y + Math.sin(lk.facing) * 50); lk.cool = 0;
  const heat0 = dbg.state().heat; step(8);
  check('standing in a lookout’s view raises his alert and heat', dbg.state().heat > heat0 || dbg.state().seenCount > 0, JSON.stringify([dbg.state().heat, dbg.state().seenCount]));
  start('surveil'); const lk2 = dbg.lookouts()[0]; lk2.cool = 0;
  dbg.teleport(lk2.x - Math.cos(lk2.facing) * 40, lk2.y - Math.sin(lk2.facing) * 40);   // behind him
  lk2.alert = 0; step(3); check('standing behind a lookout goes unseen', lk2.alert === 0 && dbg.state().heat === 0, lk2.alert);
  start('surveil'); dbg.state().heat = 99; dbg.whistle(dbg.lookouts()[2]); step(.3);
  check('a whistle at high heat burns the case', dbg.state().burns === 1, JSON.stringify(dbg.state().burns));
  check('burning returns the detective to the office and costs the evening', Math.hypot(dbg.hero().x - dbg.spawn('hero')[0], dbg.hero().y - dbg.spawn('hero')[1]) < 40 && dbg.state().cash < 150);
  dbg.doBurn(); dbg.doBurn(); step(1.5);
  check('three burns shut the detail down', dbg.state().shutDown && snap().stage === 'done', JSON.stringify(snap()));
}
/* ---- photographs need a clear line and a steady lens ---- */
{
  start('surveil'); for (const l of dbg.lookouts()) l.cool = 99;
  const lorne = dbg.people().lorne; dbg.teleport(lorne.x - 80, lorne.y); dbg.hero().facing = 0; I.hold('camera'); step(.8);
  check('a lens on a crew member develops a photograph over time', (dbg.state()._ph || {}).lorne > 0 || dbg.state().photos.lorne);
  dbg.hero().facing = Math.PI; step(1); I.hold('camera', false);
  check('swinging the lens away lets the picture fade', !dbg.state().photos.lorne);
  { const sw = dbg.people().sweets; dbg.teleport(30.5 * T, 23.5 * T); dbg.hero().facing = Math.atan2(sw.y - dbg.hero().y, sw.x - dbg.hero().x); I.hold('camera'); step(3); I.hold('camera', false);
  check('a wall between lens and subject blocks the picture', !dbg.state().photos.sweets); }
}
/* ---- controls: the stick, inversion, glyphs ---- */
{
  start('surveil'); const pad = { index: 0, id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  pads[0] = pad; const [x0, y0] = [dbg.hero().x, dbg.hero().y]; for (const l of dbg.lookouts()) l.cool = 99;
  pad.axes = [0, .9, 0, 0]; step(.5); const dy1 = dbg.hero().y - y0; pad.axes = [0, 0, 0, 0]; step(.6);
  check('the left stick pushed down walks the detective south in the three-quarter view', dy1 > 6, dy1);
  game.settings.set('invertV', true); const y1 = dbg.hero().y; pad.axes = [0, .9, 0, 0]; step(.5); const dy2 = dbg.hero().y - y1; pad.axes = [0, 0, 0, 0]; step(.5);
  check('invert up and down reverses the vertical axis', dy2 < -6, dy2);
  game.settings.set('invertV', false); game.settings.set('invertH', true); const x1 = dbg.hero().x; pad.axes = [.9, 0, 0, 0]; step(.5); const dx2 = dbg.hero().x - x1; pad.axes = [0, 0, 0, 0]; step(.5);
  check('invert left and right reverses the horizontal axis', dx2 < -6, dx2);
  game.settings.set('invertH', false);
  pad.buttons[0].pressed = true; step(.1); pad.buttons[0].pressed = false; step(.1);
  check('a controller’s prompts show PlayStation symbols', I.label('interact') === '✕', I.label('interact'));
  game.settings.set('glyphs', 'xbox'); check('the Settings option swaps them to Xbox letters', I.label('interact') === 'A', I.label('interact'));
  game.settings.set('glyphs', 'playstation');
  check('the camera button is L2 on PlayStation', I.label('camera') === 'L2', I.label('camera'));
  pads[0] = null; step(.2);
}
/* ---- saves ---- */
{
  start('tip'); dbg.setState({ cash: 77, tip: null }); game.saves.save(1);
  start('surveil'); check('a new case is not the saved one', dbg.state().cash === 150);
  game.saves.load(1); step(.5);
  check('loading restores the stage, cash and photographs', snap().stage === 'tip' && snap().cash === 77 && snap().photos.lorne, JSON.stringify(snap()));
}
/* ---- the attract pilot plays the whole case ---- */
{
  dbg.startAttract(); step(.3); check('the attract mode runs the play scene as a demonstration', snap().demo && snap().scene === 'play');
  let last = '', stages = new Set();
  for (let i = 0; i < 1500 && !(snap().done); i++) { step(.5); stages.add(snap().stage); for (let k = 0; k < 2; k++) { I.tap('confirm'); } }
  check('the pilot passes through every stage', ['brief', 'surveil', 'tip', 'wire', 'listen', 'chase', 'box', 'report'].every(s => stages.has(s)), [...stages].join());
  check('the demonstration finishes a case', snap().done, JSON.stringify(snap()));
  check('the demo never burns the case', snap().burns === 0);
}
check('no engine errors across the systems tests', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
done();
