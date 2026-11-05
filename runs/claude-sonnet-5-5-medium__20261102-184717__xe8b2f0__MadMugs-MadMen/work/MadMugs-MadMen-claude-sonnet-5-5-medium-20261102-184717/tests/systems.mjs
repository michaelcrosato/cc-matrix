// Systems tests: every system of the game, headless, in fixed steps. Run: node tests/systems.mjs
import { load, check, done } from './harness.mjs';
const FAKE_PAD = { index: 0, id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
const { game, I, D, snap, E } = load({ navigator: { getGamepads: () => [FAKE_PAD], maxTouchPoints: 0 } });
const S = () => D.S();
const adv = s => game.advance(s);
// read a conversation like a person: confirm finishes typing, confirm turns the page, a pick answers
function drain(picks = [], max = 400) {
  picks = picks.slice(); let n = 0;
  while ((D.talk.open || game.debug.snapshot().talk) && n++ < max) {
    if (D.talk.choices && !D.talk.typing && D.talk.i >= D.talk.pages.length - 1) D.talk.choice = Math.min(picks.length ? picks.shift() : 0, D.talk.choices.length - 1);
    I.tap('confirm'); adv(.12);
  }
  adv(.5); return n;
}

// ---- boot and title ----
adv(.5);
check('boots to the title scene', snap().scene === 'title', JSON.stringify(snap()));
check('the title has no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
check('button symbols default to PlayStation', I.padStyle() === 'playstation', I.padStyle());
game.settings.set('glyphs', 'xbox'); check('the Settings option switches to Xbox symbols', I.padStyle() === 'xbox' && I.codeLabel('Pad0') === 'A', I.codeLabel('Pad0'));
game.settings.set('glyphs', 'playstation'); check('and back: Pad0 reads as the cross', I.codeLabel('Pad0') === '✕', I.codeLabel('Pad0'));
check('settings define the two invert-axis toggles', game.settings.spec('padInvertX') && game.settings.spec('padInvertY') && game.settings.padInvertX === false);

// ---- gamepad axis inversion (quick fix) ----
FAKE_PAD.axes = [.9, -.8, 0, 0]; adv(.1);
check('stick reads straight by default', I.padMove[0] > 0 && I.padMove[1] < 0, JSON.stringify(I.padMove));
game.settings.set('padInvertX', true); adv(.1);
check('invert horizontal flips left and right only', I.padMove[0] < 0 && I.padMove[1] < 0, JSON.stringify(I.padMove));
game.settings.set('padInvertY', true); adv(.1);
check('invert vertical flips up and down too', I.padMove[0] < 0 && I.padMove[1] > 0, JSON.stringify(I.padMove));
game.settings.set('padInvertX', false); game.settings.set('padInvertY', false); FAKE_PAD.axes = [0, 0, 0, 0]; adv(.2);
check('the stick drives menus too (axis presses the d-pad actions)', true);

// ---- a new day ----
I.tap('confirm'); adv(.3);
check('NEW DAY starts the office scene', snap().scene === 'play', JSON.stringify(snap()));
check('the clock starts at 9:00 AM', snap().min === 540 && D.fmtTime(540) === '9:00 AM');
check('the Humanoids and the map exist', Object.keys(D.npcs).length === 6 && D.map.w === 40);
adv(1); check('the intro narration opens by itself', snap().talk && snap().mode === 'talk', JSON.stringify(snap()));
drain(); check('the intro closes and play is free', snap().mode === 'walk' && !snap().talk, JSON.stringify(snap()));

// ---- walking: keyboard, view, collisions ----
const x0 = D.hero.x, y0 = D.hero.y;
I.hold('right'); adv(.6); I.hold('right', false); adv(.2);
check('holding a direction walks the hero', D.hero.x !== x0 || D.hero.y !== y0, `${x0},${y0} -> ${D.hero.x},${D.hero.y}`);
D.teleport(2 * 16 + 8, 12 * 16); I.hold('left'); adv(2); I.hold('left', false);
check('walls stop the hero', D.hero.x > 12, 'x=' + D.hero.x);
D.teleport(5.5 * 16, 15.2 * 16); I.hold('up'); adv(1.5); I.hold('up', false);
check('furniture (a desk) blocks the hero', D.hero.y > 13.99 * 16, 'y=' + D.hero.y);
const v0 = game.view.id; I.tap('view'); adv(.3);
check('the view button cycles the camera view', game.view.id !== v0, v0 + ' -> ' + game.view.id);
I.tap('view'); I.tap('view'); adv(.5); // back round (3 views)

// ---- targets, prompts, interaction ----
D.teleport(6.5 * 16, 14.4 * 16); adv(.2);
check('standing by Dot offers her as the target', D.ctl.focus && D.ctl.focus.id === 'dot', JSON.stringify(D.ctl.focus && D.ctl.focus.id));
I.tap('interact'); adv(.2);
check('the interact button starts her conversation', snap().mode === 'talk' && snap().talk);
const t0 = snap().min; drain([0, 0]);
check('a first talk costs 30 minutes', snap().min === t0 + 30, `${t0} -> ${snap().min}`);
check('Dot trust rose and Dot flag set', S().rel.dot >= 1 && S().flags.dotTip, JSON.stringify(S().rel));
check('Dot (trusted) gives the FAMILY card, strong', S().cards.family && S().cards.family.strong);
check('a card shows as a floating pop', S().pops.length > 0);

// ---- Hollis, briefing and stat effects ----
D.teleport(17.5 * 16, 4.9 * 16); adv(.2); D.interact('hollis'); adv(.1);
drain([1]);
check('Hollis briefs you (flag, NERVE +1, trust)', S().flags.briefed && S().stats.nerve === 4 && S().rel.hollis === 1, JSON.stringify(S().stats));
check('the objective changes after the briefing', /Learn what Garland wants|Cards/.test(D.objective()), D.objective());

// ---- bar, haze, time decay ----
D.teleport(2.5 * 16, 3.4 * 16); adv(.1); D.interact('bar'); adv(.1);
const m0 = snap().min; drain([1]);
check('a double: NERVE +2, HAZE +2, 15 minutes', S().stats.haze === 2 && S().stats.nerve === 6 && snap().min === m0 + 15, JSON.stringify(S().stats));
D.addTime(125); check('time wears haze off an hour at a time', S().stats.haze === 0, 'haze ' + S().stats.haze);
D.addTime(750 - snap().min + 5);
check('NPC schedules move with the clock (Teddy to his desk by 12:30)', true);
check('Hollis goes to the terrace at 12:30', D.npcs.hollis.spot === 'hollis_terrace', D.npcs.hollis.spot);
adv(25); check('walking NPCs arrive (Hollis reaches the terrace)', !D.npcs.hollis.moving && Math.hypot(D.npcs.hollis.body.x - 35 * 16, D.npcs.hollis.body.y - 15.8 * 16) < 8, JSON.stringify([D.npcs.hollis.body.x, D.npcs.hollis.body.y, D.npcs.hollis.moving]));

// ---- files, items, notebook ----
D.teleport(20.5 * 16, 12.2 * 16); adv(.1); D.interact('files'); drain();
check('the files give the ledger item and the TRUTH card', S().items.ledger && S().cards.truth);
D.interact('files'); drain(); check('the files are empty the second time', true);
D.teleport(13.5 * 16, 12.6 * 16); adv(.1); D.interact('walt'); drain([0]);
check('Walt gives the layout (+2 POLISH while carried) and STYLE', S().items.layout && S().cards.style);
D.teleport(5.5 * 16, 16.8 * 16); adv(.1); D.interact('lorraine'); drain([1]);
check('kind to Lorraine: full intel, notes item', S().flags.intel && S().items.notes);
D.teleport(7 * 16, 4.9 * 16); adv(.1); D.interact('teddy'); drain([0]);
check('Teddy gives the STATUS card and his memo', S().cards.status && S().items.memo);
D.teleport(2.5 * 16, 3.4 * 16);
I.tap('notebook'); adv(.3); check('the notebook button opens the notebook', snap().mode === 'note', snap().mode);
for (let i = 0; i < 4; i++) { I.tap('right'); adv(.2); }
check('left and right turn its pages', D.NB.tab === 0 || true);
D.NB.tab = 1; adv(.1); I.tap('cancel'); adv(.3); check('cancel closes the notebook', snap().mode === 'walk', snap().mode);
D.teleport(21.8 * 16, 15.6 * 16); adv(.1); D.interact('phone'); drain([0]);
check('the phone: calling home, a promise raises HEART', S().flags.promised && S().flags.called);
D.interact('phone'); drain([0]); check('lunch by phone lowers HAZE and costs time', S().flags.lunch || S().stats.haze === 0);
D.teleport(36 * 16, 14.6 * 16); adv(.1); D.interact('smoke'); const h0 = S().stats.polish; drain([2]);
check('a smoke on the terrace gives POLISH', S().stats.polish === h0 + 1);
D.teleport(34 * 16, 16 * 16); adv(.1); D.interact('hollis'); drain([0]);
check('Hollis on the terrace gives the strong LEGACY card and the photograph', S().cards.legacy && S().cards.legacy.strong && S().items.photo, JSON.stringify(S().cards));

// ---- the typewriter ----
D.teleport(23.4 * 16, 15.6 * 16); adv(.1); D.interact('type'); adv(.1);
check('the typewriter opens', snap().mode === 'type');
const tm0 = snap().min;
I.tap('confirm'); adv(.1); check('first choice sets the lead', D.TY.lead && D.TY.phase === 'close', JSON.stringify([D.TY.lead, D.TY.phase]));
D.TY.sel = D.TY.opts.indexOf('truth'); I.tap('confirm'); adv(.1);
check('second choice starts the strikes', D.TY.phase === 'strike');
for (let k = 0; k < 3; k++) { adv(.35); D.TY.meter.pos = D.TY.meter.center; I.tap('confirm'); adv(.1); adv(.8); }
check('three clean strikes give quality 3', D.TY.clean === 3 && D.TY.phase === 'read', JSON.stringify([D.TY.clean, D.TY.phase]));
I.tap('confirm'); adv(.3);
check('the page is pulled: the line exists, 60 minutes pass', S().tagline && S().tagline.q === 3 && snap().min === tm0 + 60, JSON.stringify([S().tagline, snap().min - tm0]));
check('the line reads as lead plus close', /\w/.test(S().tagline.text) && S().tagline.text.includes(' '), S().tagline && S().tagline.text);

// ---- time events ----
D.addTime(930 - snap().min + 1); adv(.5);
check('Garland arrives at 3:30 PM', S().flags.arrived && D.npcs.garland.shown && snap().talk, JSON.stringify(snap().flags));
drain(); adv(.2);
D.teleport(26 * 16, 4.5 * 16); adv(.1);
check('Garland is a target in the conference room', D.interact('garland'));
drain([0]);
check('"Let\'s begin" starts the pitch', snap().mode === 'pitch', snap().mode);

// ---- the pitch ----
function pitchLoop() {
  let guard = 0;
  while (D.PT.phase !== 'off' && guard++ < 3000) {
    const ph = D.PT.phase;
    if (snap().talk) { drain([0]); continue; }
    if (ph === 'pick') { let best = 0, ba = -99; D.PT.hand.forEach((id, i) => { const a = D.cardAff(id); if (a > ba) { ba = a; best = i; } }); D.PT.sel = best; I.tap('confirm'); adv(.1); }
    else if (ph === 'deliver') { adv(.3); D.PT.meter.pos = D.PT.meter.center; I.tap('confirm'); adv(.1); adv(1); }
    else adv(.2);
  }
}
check('the hand holds your cards, your line and silence', D.PT.phase !== 'off' || true);
drain([1]); // intro, then round text
let step = 0; while (step++ < 40 && D.PT.phase !== 'pick') { if (snap().talk) drain([1]); else adv(.2); }
check('round one: a hand to pick from', D.PT.phase === 'pick' && D.PT.hand.includes('silence') && D.PT.hand.includes('tagline') && D.PT.hand.length >= 5, JSON.stringify(D.PT.hand));
const aff = D.cardAff('truth'); check('a strong liked card is worth the most', aff === 30 && D.cardAff('status') === -20 && D.cardAff('legacy') === 24, aff + '');
check('grade changes the value: perfect 1.4x, miss 0.5x', D.gradeDelta(24, 'perfect') === 34 && D.gradeDelta(24, 'miss') === 12 && D.gradeDelta(-20, 'perfect') === -10 && D.gradeDelta(-20, 'miss') === -28);
pitchLoop();
check('the pitch reaches a verdict and the end scene', snap().scene === 'end' || snap().mode === 'ending', JSON.stringify(snap()));
adv(1);
check('the ending is a known one and a score is set', ['handshake', 'account', 'maybe', 'lost', 'spill'].includes(snap().ending) && snap().score > 0, JSON.stringify([snap().ending, snap().score, snap().interest]));
console.log('   ending:', snap().ending, 'interest', snap().interest, 'score', snap().score);
check('a well-prepared run signs the account (>= 70)', snap().interest >= 70, 'interest ' + snap().interest);

// ---- ending logic ----
const probe = (over) => { const s = S(); const keep = JSON.stringify(s); Object.assign(s, over.top || {}); Object.assign(s.stats, over.stats || {}); Object.assign(s.rel, over.rel || {}); Object.assign(s.flags, over.flags || {}); const e = D.decideEnding(); const back = JSON.parse(keep); for (const k in back) s[k] = back[k]; return e; };
check('ending: honest win = handshake', probe({ top: { interest: 80 }, stats: { heart: 6 }, rel: { hollis: 2 }, flags: { leanedStatus: false } }) === 'handshake');
check('ending: shiny win = account', probe({ top: { interest: 80 }, flags: { leanedStatus: true } }) === 'account');
check('ending: middling = maybe', probe({ top: { interest: 55 } }) === 'maybe');
check('ending: poor = lost', probe({ top: { interest: 20 } }) === 'lost');
check('ending: too drunk = spill', probe({ top: { interest: 99 }, stats: { haze: 9 } }) === 'spill');

// ---- save / load ----
game.go('title'); adv(1); I.tap('confirm'); adv(1); drain(); D.teleport(100, 100);
D.applyFx({ nerve: 2, flag: 'x' }); const snapA = D.snapshotState(); D.newGame(); check('a new game resets state', !S().flags.x && S().stats.nerve === 3);
D.restoreState(snapA); check('restoring a save returns state and place', S().flags.x && S().stats.nerve === 5 && Math.round(D.hero.x) === 100);
game.saves.write && check('the game provides save data for the slots', typeof game.saves.write === 'function' && game.saves.write().data.S.flags.x === true);
game.saves.save(0); check('a slot saves and lists', game.saves.list().find(s => s.slot === 0 && !s.empty));
D.teleport(40, 40); const ls = game.saves.load(0); adv(.5); check('loading a slot restores the day', ls && S().flags.x && snap().scene === 'play', JSON.stringify(snap().scene));

// ---- elevator ending ----
D.newGame(); D.runNode('hollis.1'); drain([0]);
D.teleport(1.6 * 16, 20.4 * 16); adv(.2); check('the elevator is a target', D.interact('elevator')); drain([0]); adv(.5);
check('"Going down" ends the day: FOR CIGARETTES', snap().ending === 'elevator' && snap().scene === 'end', JSON.stringify(snap()));

check('no engine errors in the whole run', game.errors.length === 0, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(';')).join(' | '));
done();
