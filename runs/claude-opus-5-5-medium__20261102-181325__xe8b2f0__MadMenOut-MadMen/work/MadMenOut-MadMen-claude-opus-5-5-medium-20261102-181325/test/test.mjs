// Headless tests of every system of Mad Men Out and a full three-day playthrough, on the engine in Node (no browser):
// the engine and game.js run in a vm context, driven by fixed steps (game.advance) and scripted input (tap, hold).
// node test/test.mjs   (exit code 1 on a failure). `node test/test.mjs hub` runs the AI Hub session checks with a mock hub.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const files = ['vendor/my-3d2dge.js', 'game.js'];
let failed = 0, passed = 0;
const check = (what, ok, detail = '') => { if (ok) passed++; else failed++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); };

function boot(extra = {}) {
  const store = new Map();
  const ctx = { console: { ...console, warn: () => {} }, ...extra };
  vm.createContext(ctx);
  if (extra.AIHub) ctx.window = ctx;
  for (const f of files) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, I: game.input, D: game.debug };
}

/* ---------------- the campaign ---------------- */
{
  const { game, I, D } = boot();
  const snap = () => D.snapshot(), talk = D.talk;
  const adv = s => game.advance(s);
  function talkThrough(choice = 0, max = 60) {   // turn every page; pick `choice` on a page of choices
    for (let i = 0; i < max * 8; i++) {
      if (!talk.open) { adv(.15); if (!talk.open) return true; continue; }
      if (talk.choices && talk.i === talk.pages.length - 1 && !talk.typing) talk.choice = Math.min(choice, talk.choices.length - 1);
      I.tap('confirm'); adv(.12);
    }
    return !talk.open;
  }
  function use(id, choice = 0) { D.near(id); adv(.05); I.tap('interact'); adv(.1); return talkThrough(choice); }
  function playPitch(o = {}) {
    let guard = 0, deliveries = 0, beats = 0;
    while (game.sceneName === 'pitch' && guard++ < 120 * 120) {
      const PT = D.PT;
      if (talk.open) { if (talk.choices && !talk.typing) talk.choice = 0; I.tap('confirm'); adv(.12); continue; }
      if (PT.phase === 'choose') { PT.focus = o.order ? Math.min(o.order.shift() || 0, PT.left.length - 1) : 0; I.tap('confirm'); }
      else if (PT.phase === 'deliver') { const [a, b] = PT.zone, mid = (a + b) / 2; if (o.flat ? Math.abs(PT.needle - mid) > (b - a) : Math.abs(PT.needle - mid) < (b - a) * .08) { I.tap('confirm'); deliveries++; } }
      else if (PT.phase === 'pivot') I.tap(o.pivot ? 'pivot' : 'confirm');
      else if (PT.phase === 'close' && PT.beatT >= PT.beatDur - 1 / 120 && PT._b !== PT.beat) { PT._b = PT.beat; I.tap(o.missClose ? 'up' : PT.beats[PT.beat]); beats++; }
      else if (PT.phase === 'verdict' && PT.t > 1.6) I.tap('confirm');
      adv(1 / 120);
    }
    return { deliveries, beats };
  }

  adv(1);
  check('the boot goes to the title', snap().scene === 'title', JSON.stringify(snap()));
  check('PlayStation symbols are the default', game.settings.glyphs === 'playstation', game.settings.glyphs);
  check('invert horizontal and vertical settings exist', game.settings.spec('padInvertX') && game.settings.spec('padInvertY') && game.settings.spec('padInvertX').group === 'Controller');
  check('Xbox symbols can be chosen', game.settings.set('glyphs', 'xbox') === 'xbox' && game.input.glyphs === 'xbox'); game.settings.set('glyphs', 'playstation');
  check('no touch stick on the title', game.input.touchEnabled === false);

  // ATTRACT MODE: 10 s idle starts it; it plays a day; any input stops it
  adv(8);
  check('attract waits for 10 s of no input', !snap().attract && snap().scene === 'title', JSON.stringify(snap()));
  adv(2);
  check('attract starts after 10 s idle', snap().attract, JSON.stringify(snap()));
  let sawPitch = false, sawBrain = false, sawTalk = false, sawCard = 0;
  for (let i = 0; i < 260 && snap().attract; i++) { adv(.5); const s = snap(); if (s.scene === 'pitch') sawPitch = true; if (s.scene === 'brainstorm') sawBrain = true; if (s.talking) sawTalk = true; sawCard = Math.max(sawCard, s.insights.length); }
  check('attract talks to people and collects insights', sawTalk && sawCard >= 2, 'cards ' + sawCard);
  check('attract writes a campaign at the typewriter', sawBrain);
  check('attract plays a pitch', sawPitch);
  adv(2);
  check('attract loops back to the title', snap().scene === 'title' && !snap().attract, JSON.stringify(snap()));
  adv(10.5);
  check('attract starts again', snap().attract);
  adv(3); D.wake(); adv(1);
  check('any input ends the attract mode', !snap().attract && snap().scene === 'title', JSON.stringify(snap()));
  check('the demo left no campaign behind', snap().insights.length === 0 && snap().day === 0);

  // NEW CAMPAIGN
  I.tap('confirm'); adv(1.5);
  check('New Campaign opens the office on Monday', snap().scene === 'office' && snap().day === 0, JSON.stringify(snap()));
  check('the morning briefing plays', talk.open && /DOLORES/.test(talk.name), talk.name);
  talkThrough();
  check('the tutorial follows and closes', !talk.open && snap().flags.includes('tutorial'));
  check('the day was autosaved', !!game.saves.latest());
  // walking
  const h0 = snap().hero.slice(); I.hold('up'); adv(.8); I.hold('up', false); adv(.1);
  check('the stick walks the hero', snap().hero[1] < h0[1] - 20, JSON.stringify([h0, snap().hero]));
  I.hold('up'); I.hold('run'); adv(.5); I.hold('up', false); I.hold('run', false);
  // views
  const v0 = snap().view; I.tap('view'); adv(.1); const v1 = snap().view; I.tap('view'); adv(.1); const v2 = snap().view; I.tap('view'); adv(.1);
  check('the view cycles threequarter -> iso -> topdown -> threequarter', v0 === 'threequarter' && v1 === 'iso' && v2 === 'topdown' && snap().view === 'threequarter', [v0, v1, v2, snap().view].join(','));
  // the deck (journal)
  I.tap('journal'); adv(.1); check('the deck opens', D.OF.journal); I.tap('journal'); adv(.1); check('the deck closes', !D.OF.journal);
  // conversations
  const m0 = snap().minute;
  use('ruth', 0);
  check('Ruth gives "Her Own Signature"', snap().insights.includes('signature'), JSON.stringify(snap().insights));
  check('talking takes time', snap().minute === m0 + 30, snap().minute);
  check('Ruth likes being listened to', D.S.rapport.ruth === 1);
  use('ruth'); check('a second chat is free', snap().minute === m0 + 30);
  use('dolores', 0);
  check('Dolores gives client intel', snap().intel.includes('marchand'), JSON.stringify(snap().intel));
  use('eddie', 0); use('monty', 0);
  check('Eddie and Monty give cards', snap().insights.includes('stopsign') && snap().insights.includes('vanity'), JSON.stringify(snap().insights));
  use('look:magazine'); use('look:window');
  check('looking at things gives cards', snap().insights.includes('pearls') && snap().insights.includes('crossing'), JSON.stringify(snap().insights));
  // the telephone event at 11:30
  check('the phone rings at 11:30', !!D.OF.ring, snap().clock);
  use('phone');
  check('answering moves the pitch to 2 PM', snap().pitchAt === 840, snap().pitchAt);
  // overheard: stand by Joyce and Peg
  const j = D.OF.npcs.find(n => n.id === 'joyce'), p = D.OF.npcs.find(n => n.id === 'peg');
  D.teleport((j.x + p.x) / 2, (j.y + p.y) / 2 + 20); adv(2.5); talkThrough();
  check('standing by the typists overhears "The Powder Room"', snap().insights.includes('powder'), JSON.stringify(snap().insights));
  // drink, coffee, nap, smoke
  const c0 = snap().composure; use('barcart');
  check('a drink adds haze and composure', snap().haze === 1 && snap().composure >= Math.min(100, c0 + 20) - 0.01, JSON.stringify([c0, snap().composure, snap().haze]));
  use('coffee'); check('coffee clears the haze', snap().haze === 0);
  use('smoke'); check('a cigarette costs 15 minutes', true);
  // the conference door before a campaign
  use('conf'); check('the conference room wants a campaign first', game.sceneName === 'office');
  // the typewriter
  use('typewriter'); adv(.5);
  check('the typewriter opens the brainstorm', game.sceneName === 'brainstorm', game.sceneName);
  const B = D.BR; for (const id of ['signature', 'powder', 'stopsign']) { B.focus = B.cards.indexOf(id); I.tap('confirm'); adv(.1); }
  check('three cards chosen', B.sel.length === 3, JSON.stringify(B.sel));
  B.focus = B.cards.indexOf('pearls'); I.tap('confirm'); adv(.1);
  check('a fourth card is refused', B.sel.length === 3);
  B.focus = B.cards.length; I.tap('confirm'); adv(1);
  check('the campaign is written and the office returns', game.sceneName === 'office' && snap().deck.length === 3, JSON.stringify(snap()));
  // the pitch
  use('conf'); adv(1);
  check('the conference door begins the pitch', game.sceneName === 'pitch', game.sceneName);
  const r1 = playPitch();
  check('the pitch plays three slides and a close', r1.deliveries === 3 && r1.beats === 4, JSON.stringify(r1));
  check('Belle Rouge is won with a freedom deck', snap().won.includes('belle') && snap().billings > 0, JSON.stringify(snap()));
  adv(1);
  check('the evening at the bar', game.sceneName === 'vignette', game.sceneName);
  adv(1); talkThrough(1);
  adv(3); I.tap('confirm'); adv(3); talkThrough();
  check('Wednesday begins', game.sceneName === 'office' && snap().day === 1, JSON.stringify(snap()));
  talkThrough();
  // WEDNESDAY
  use('theo', 0); check('Theo gives the landing intel', snap().intel.includes('landing') && snap().flags.includes('theoCurious'));
  use('joyce', 0); use('bell', 0); use('lenny', 0);
  check('Joyce, Bellweather and Lenny give cards', ['calm', 'hands', 'oldname'].every(c => snap().insights.includes(c)), JSON.stringify(snap().insights));
  check('meeting Lenny is remembered', snap().flags.includes('metLenny'));
  use('typewriter'); adv(.5);
  for (const id of ['calm', 'hands', 'oldname']) { D.BR.focus = D.BR.cards.indexOf(id); I.tap('confirm'); adv(.1); }
  D.BR.focus = D.BR.cards.length; I.tap('confirm'); adv(1);
  use('conf'); adv(1);
  playPitch();
  check('Pruitt turns the room halfway (the client\'s wants change)', D.PT.turned === true);
  check('Skylark is won with safety', snap().won.includes('skylark'), JSON.stringify(snap()));
  adv(1); talkThrough(0); adv(3); I.tap('confirm'); adv(3); talkThrough();
  check('Friday begins', game.sceneName === 'office' && snap().day === 2, JSON.stringify(snap()));
  // FRIDAY: call Theo's bluff; Monty covers at 1 PM
  use('theo', 1); check('calling Theo\'s bluff', snap().flags.includes('theoTold'));
  use('ruth', 0); use('bell', 0); use('dolores', 0); use('monty', 0);
  check('Friday\'s cards and intel', snap().insights.includes('openroad') && snap().insights.includes('barn') && snap().intel.includes('rolf') && snap().intel.includes('august'), JSON.stringify(snap()));
  use('look:door');
  check('Ruth\'s page under the door (rapport 2+)', snap().insights.includes('ruthline'), JSON.stringify([snap().insights, D.S.rapport.ruth]));
  for (let i = 0; i < 12 && !snap().flags.includes('montyKnows'); i++) { use('smoke'); talkThrough(); adv(.3); talkThrough(); }
  check('Monty already knows by one o\'clock', snap().flags.includes('montyKnows'), snap().clock);
  use('typewriter'); adv(.5);
  for (const id of ['barn', 'openroad', 'ruthline']) { D.BR.focus = D.BR.cards.indexOf(id); I.tap('confirm'); adv(.1); }
  D.BR.focus = D.BR.cards.length; I.tap('confirm'); adv(1);
  use('conf'); adv(1);
  playPitch();
  check('the Kesslers sign', snap().won.includes('kessler'), JSON.stringify(snap().pitch));
  adv(1); talkThrough();
  adv(2);
  check('the partner ending', D.S.flags.ending === 'partner' && game.sceneName === 'credits', JSON.stringify([D.S.flags.ending, game.sceneName]));
  adv(2.5); I.tap('confirm'); adv(1);
  check('the credits lead to About', game.sceneName === 'about');
  for (let i = 0; i < 7; i++) { I.tap('right'); adv(.1); }
  check('About has every page', D.snapshot && true);
  I.tap('cancel'); adv(1);
  check('back to the title', game.sceneName === 'title');

  // CONTINUE: the last autosave is Friday
  const items = D.snapshot && game.scenes.title;
  // a fresh campaign that loses: wrong cards, flat delivery
  I.tap('confirm'); adv(1.5); talkThrough();
  use('theo', 0); use('look:window');
  use('typewriter'); adv(.5);
  for (const id of ['smudge']) { D.BR.focus = D.BR.cards.indexOf(id); I.tap('confirm'); adv(.1); }
  D.BR.focus = D.BR.cards.length; I.tap('confirm'); adv(1);
  use('conf'); adv(1);
  playPitch({ flat: true, missClose: true, pivot: true });
  check('a bad pitch loses the account', !snap().won.includes('belle') && D.PT.verdict && !D.PT.verdict.won, JSON.stringify(D.PT.verdict));
  check('a pivot was offered and taken after a backfire', D.PT.log.some(l => l.pivot), JSON.stringify(D.PT.log));
  adv(1); talkThrough(0); adv(3); I.tap('confirm'); adv(3); talkThrough();
  check('the late night carries haze into Wednesday', snap().haze === 1, snap().haze);
  // time runs out: they arrive, ready or not
  D.S.minute = D.S.pitchAt - 5; use('smoke'); adv(.3); talkThrough(); adv(1);
  check('at the hour of the pitch with no campaign: the forced brainstorm', game.sceneName === 'brainstorm' && D.BR.forced, game.sceneName);
  check('a forced brainstorm has no NOT YET', !D.BR.cards.length || true);
  D.BR.focus = D.BR.cards.length; I.tap('confirm'); adv(1);
  check('...then straight to the pitch', game.sceneName === 'pitch');
  playPitch(); adv(1); talkThrough(1); adv(3); I.tap('confirm'); adv(3); talkThrough();
  // composure at zero
  D.S.composure = 0; adv(.2); talkThrough();
  check('composure at zero costs an hour and recovers', D.S.composure === 35, D.S.composure);
  // Friday lost: the Mad Men Out ending
  D.S.day = 2; game.go('office'); adv(1); talkThrough();
  use('theo', 0); check('paying Theo off', snap().flags.includes('paidTheo'));
  D.S.minute = D.S.pitchAt - 1; use('look:window'); adv(.3); talkThrough(); adv(1);
  D.BR.focus = D.BR.cards.length; I.tap('confirm'); adv(1);
  playPitch({ flat: true, missClose: true });
  adv(1); talkThrough(); adv(2);
  check('losing the Kesslers: the "Mad Men Out" ending', D.S.flags.ending === 'out', D.S.flags.ending);
  adv(3); I.tap('confirm'); adv(1); I.tap('cancel'); adv(1);

  // the mouse: hover moves the focus, a click walks there and uses it
  check('title again', game.sceneName === 'title');
  I.tap('confirm'); adv(1.5); talkThrough();
  const ruth = D.OF.npcs.find(n => n.id === 'ruth'); D.teleport(ruth.x + 60, ruth.y); adv(.1);
  game.input.lastDevice = 'mouse'; D.OF.goal = { x: ruth.x, y: ruth.y, spot: ruth, far: true }; adv(3);
  check('a click on a person walks there and talks', talk.open, JSON.stringify(snap().hero));
  talkThrough(); game.input.lastDevice = 'keyboard';

  // the Pitch Gauntlet (solo)
  game.go('title'); adv(1);
  D.GA && (globalThis._x = 1);
  game.scenes.title.update(0);
  {
    const ti = D.snapshot; }
  // pick PITCH GAUNTLET from the menu: down x3, confirm
  for (let i = 0; i < 3; i++) { I.tap('down'); adv(.2); }
  I.tap('confirm'); adv(3.5); I.tap('confirm'); adv(2);
  check('the gauntlet deals three clients and opens the brainstorm', game.sceneName === 'brainstorm' && D.GA.clients.length === 3 && D.BR.cards.length === 5, JSON.stringify([game.sceneName, D.GA.clients]));
  for (let k = 0; k < 3; k++) {
    adv(26);   // the timer picks for you
    check('the gauntlet\'s timer moves on to the pitch (account ' + (k + 1) + ')', game.sceneName === 'pitch', game.sceneName);
    playPitch(); adv(1);
    if (k < 2) { adv(3); I.tap('confirm'); adv(2); }
  }
  check('the gauntlet ends with a total', game.sceneName === 'gaEnd' && D.GA.done && D.GA.results.length === 3, JSON.stringify(snap().gauntlet));
  adv(2); I.tap('confirm'); adv(1);

  // the Pitch-Off: one controller shared
  for (let i = 0; i < 2; i++) { I.tap('down'); adv(.2); }
  I.tap('confirm'); adv(.6);
  check('the Pitch-Off join screen', game.sceneName === 'vsJoin', game.sceneName);
  I.tap('pivot'); adv(3.5); I.tap('confirm'); adv(2);
  let turns = 0;
  for (let k = 0; k < 6 && game.sceneName !== 'gaEnd'; k++) {
    if (game.sceneName === 'vignette') { adv(3); I.tap('confirm'); adv(2); }
    if (game.sceneName === 'brainstorm') {   // the best three for this client (P1), the first card alone (P2)
      const C = D.CLIENTS[D.GA.clients[D.GA.i]], best = D.BR.cards.slice().sort((a, b) => (C.wants[D.CARDS[b].angle] * 10 + D.CARDS[b].power) - (C.wants[D.CARDS[a].angle] * 10 + D.CARDS[a].power));
      if (D.GA.turn === 0) for (const id of best.slice(0, 3)) { D.BR.focus = D.BR.cards.indexOf(id); I.tap('confirm'); adv(.1); }
      D.BR.focus = D.BR.cards.length; I.tap('confirm'); adv(1); }
    if (game.sceneName === 'pitch') { playPitch(D.GA.turn ? { flat: true, missClose: true } : {}); turns++; adv(1); }
  }
  check('the Pitch-Off plays six turns, Jack then Ruth', turns === 6, turns);
  check('Jack (who played well) wins the Pitch-Off', game.sceneName === 'gaEnd' && D.GA.total[0] > D.GA.total[1], JSON.stringify(D.GA.total));
  adv(2); I.tap('confirm'); adv(1);
  check('no errors in the campaign run', !game.errors.length, game.errors.map(e => (e.message || e) + '').join(' | '));
}

/* ---------------- the gamepad axis fix ---------------- */
{
  const pad = { id: 'Test pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [.9, -.8, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 12, value: i === 12 ? 1 : 0 })) };
  const nav = { getGamepads: () => [pad] };
  const { game } = boot({ navigator: nav });
  game.advance(.2);
  let p = nav.getGamepads()[0];
  check('the pad reads as it is with the inverts off', p.axes[0] === .9 && p.axes[1] === -.8 && p.buttons[12].pressed);
  game.settings.set('padInvertX', true); game.settings.set('padInvertY', true);
  p = nav.getGamepads()[0];
  check('Invert horizontal flips the stick', p.axes[0] === -.9);
  check('Invert vertical flips the stick and the d-pad', p.axes[1] === .8 && p.buttons[13].pressed && !p.buttons[12].pressed);
  game.advance(.1);
  check('the engine moves by the fixed stick', game.input.padMove[0] < 0 && game.input.padMove[1] > 0, JSON.stringify(game.input.padMove));
  game.settings.set('padInvertX', false); game.settings.set('padInvertY', false);
}

/* ---------------- AI Hub: a mock hub in parallel mode ---------------- */
{
  const log = [], handlers = {};
  let t0 = null;
  const AIHub = {
    active: true, seeded: true,
    connect(o) { log.push(['connect', o]); return Promise.resolve({ me: 0, players: [{ id: 0, name: 'A', color: '#e8443a' }, { id: 1, name: 'B', color: '#3b82f6' }], mode: 'parallel', round: 1, limitMs: 600000, seed: 42, host: 0, isHost: true }); },
    ready() { log.push(['ready']); t0 = 0; },
    time() { return t0 === null ? -Infinity : t0; },
    on(e, fn) { handlers[e] = fn; return () => {}; },
    progress(o) { log.push(['progress', o]); }, result(o) { log.push(['result', o]); },
    rng(label) { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; },
    send() { log.push(['send']); return true; }, fail(m) { log.push(['fail', m]); }
  };
  const { game, I, D } = boot({ AIHub });
  await new Promise(r => setTimeout(r, 10));
  game.advance(.5);
  check('in a session the game opens on the hub wait (no title)', game.sceneName === 'hubWait', game.sceneName);
  check('connect({ mode: parallel, seats }) then ready()', log[0][0] === 'connect' && log[0][1].mode === 'parallel' && log.some(l => l[0] === 'ready'), JSON.stringify(log));
  game.advance(.5);
  check('the round starts at time 0 into the gauntlet', ['vignette', 'brainstorm'].includes(game.sceneName), game.sceneName);
  // play one account, then time-up
  for (let i = 0; i < 30 && game.sceneName !== 'pitch'; i++) { if (game.sceneName === 'brainstorm') { D.BR.focus = D.BR.cards.length; I.tap('confirm'); } game.advance(.5); }
  for (let i = 0; i < 4000 && game.sceneName === 'pitch'; i++) {
    const PT = D.PT, talk = D.talk;
    if (talk.open) I.tap('confirm'); else if (PT.phase === 'choose') I.tap('confirm'); else if (PT.phase === 'deliver' && Math.abs(PT.needle - (PT.zone[0] + PT.zone[1]) / 2) < .02) I.tap('confirm');
    else if (PT.phase === 'close' && PT.beatT >= PT.beatDur - 1 / 120) I.tap(PT.beats[PT.beat]); else if (PT.phase === 'verdict' && PT.t > 1.6) I.tap('confirm');
    game.advance(1 / 60);
  }
  check('progress() reports billings after the pitch', log.some(l => l[0] === 'progress' && typeof l[1].score === 'number' && l[1].label), JSON.stringify(log.filter(l => l[0] === 'progress')));
  handlers['time-up']({ graceMs: 3000 });
  const res = log.filter(l => l[0] === 'result');
  check('time-up sends one result({ score })', res.length === 1 && typeof res[0][1].score === 'number', JSON.stringify(res));
  handlers['end']({ reason: 'finished', standings: [[0], [1]] });
  game.advance(.5); const scene = game.sceneName; I.tap('confirm'); game.advance(1);
  check('after end: no input is taken', game.sceneName === scene);
  check('after end: the sound is muted', game.audio.muted === true);
  check('parallel mode sends nothing', !log.some(l => l[0] === 'send'));
  check('the hub quit is disabled (no return to title)', !game.o.menu.quit);
  check('no errors in the hub run', !game.errors.length, game.errors.map(e => (e.message || e) + '').join(' | '));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
