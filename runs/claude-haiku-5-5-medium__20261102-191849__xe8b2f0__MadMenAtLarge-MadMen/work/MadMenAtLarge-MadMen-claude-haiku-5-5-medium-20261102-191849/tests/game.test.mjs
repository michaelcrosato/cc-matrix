// Headless tests of the game itself: the engine and src/game.js run in Node (no screen, no sound), driven by fixed steps
// and the same inputs a player sends (input.tap, input.hold). Run: node tests/game.test.mjs (exit 1 on a failure).
// Each block is one system: title and attract, movement and the inverted stick, the bar, the cigarette case, the phone,
// the dialogues, the pitch, the day's end, the three-day playthrough with its ending, the settings, and the AI Hub flow.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = ['vendor/my-3d2dge.js', 'src/credits.js', 'src/logic.js', 'src/game.js'];

let failed = 0, passed = 0;
const check = (what, ok, detail = '') => {
  if (ok) passed++; else failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : '  -- ' + detail));
};

// a fresh page: the engine, the rules and the game, loaded the way index.html loads them
function boot(extra = {}) {
  const ctx = { console, Math, Date, navigator: { maxTouchPoints: 0 }, matchMedia: () => ({ matches: true }), ...extra };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, I: game.input, D: game.debug, MM: ctx.MM };
}

// advance in small steps, so the scene code sees each frame
function run(game, seconds, step = 0.05) { for (let t = 0; t < seconds; t += step) game.advance(Math.min(step, seconds - t)); }
function until(game, pred, maxSec = 60, step = 0.05) {
  for (let t = 0; t < maxSec; t += step) { if (pred()) return true; game.advance(step); }
  return pred();
}
const press = (game, action, after = 0.05) => { game.input.tap(action); game.advance(after); };

// a dialogue is open: confirm through its lines, pick the choice (down, confirm), and let the reply play out
function finishTalk(game, D, pickIndex = 0, maxSec = 40) {
  return until(game, () => {
    if (!D.talk().open) return true;
    if (D.talk().choices) {
      for (let i = 0; i < pickIndex; i++) press(game, 'down', 0.05);
      press(game, 'confirm', 0.05);
    } else press(game, 'confirm', 0.05);
    return false;
  }, maxSec, 0.2);
}

// ------------------------------------------------------------------ title and attract
{
  const { game, D } = boot();
  run(game, 0.5);
  check('the game opens on the title', D.snapshot().scene === 'title', JSON.stringify(D.snapshot()));
  check('the title shows no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));

  run(game, 11);
  check('after 10 s with no input the attract demo starts', D.snapshot().scene === 'office' && D.snapshot().demo === true, JSON.stringify(D.snapshot()));
  let guard = until(game, () => D.snapshot().scene === 'title', 260, 0.25);
  const demoSnap = D.snapshot();
  check('the demo plays its day through to the title by itself', guard && demoSnap.scene === 'title', JSON.stringify(demoSnap));
  check('the demo ran with no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));

  // any input leaves the attract mode
  run(game, 11);
  check('the demo starts again after idling', D.snapshot().demo === true, JSON.stringify(D.snapshot()));
  press(game, 'confirm', 0.05);
  const left = until(game, () => D.snapshot().scene === 'title', 3, 0.05);
  check('any button leaves the demo for the title', left, JSON.stringify(D.snapshot()));
}

// ------------------------------------------------------------------ start, movement, inversion
const fresh = () => {
  const b = boot(); run(b.game, 0.5);
  press(b.game, 'confirm', 0.3);                           // NEW ASSIGNMENT
  run(b.game, 0.5);
  return b;
};
{
  const { game, D, MM } = fresh();
  const s = D.snapshot();
  check('NEW ASSIGNMENT opens day 1 in the office', s.scene === 'office' && s.day === 1 && !s.demo, JSON.stringify(s));
  check('the day starts with the stats as set in the rules', s.composure === 70 && s.whiskey === 0 && s.standing === 40 && s.home === 60, JSON.stringify(s));
  check('the day starts at the elevator, at about 9:00 AM', D.state().t < 2 && /^9:0[0-2] AM$/.test(MM.clockLabel(D.state())), MM.clockLabel(D.state()));

  const x0 = D.snapshot().hero[0];
  game.input.hold('right'); run(game, 0.6); game.input.hold('right', false);
  const dx = D.snapshot().hero[0] - x0;
  check('the stick or right key walks the hero the way it points', dx !== 0, 'no movement');
  const plain = Math.sign(dx);

  // reset and walk the same way with the stick inverted left and right
  D.teleport(40, 40);
  game.settings.set('mmInvertX', true);
  const x1 = D.snapshot().hero[0];
  game.input.hold('right'); run(game, 0.6); game.input.hold('right', false);
  const dxInv = D.snapshot().hero[0] - x1;
  check('invert left and right flips the walk', Math.sign(dxInv) === -plain && plain !== 0, `plain ${dx}, inverted ${dxInv}`);
  game.settings.set('mmInvertX', false);

  const y0 = D.snapshot().hero[1];
  game.input.hold('down'); run(game, 0.5); game.input.hold('down', false);
  const dy = D.snapshot().hero[1] - y0;
  game.settings.set('mmInvertY', true);
  D.teleport(40, 40);
  const y1 = D.snapshot().hero[1];
  game.input.hold('down'); run(game, 0.5); game.input.hold('down', false);
  const dyInv = D.snapshot().hero[1] - y1;
  check('invert up and down flips the walk', dy !== 0 && Math.sign(dyInv) === -Math.sign(dy), `plain ${dy}, inverted ${dyInv}`);
  game.settings.set('mmInvertY', false);
  check('no errors while walking', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
}

// ------------------------------------------------------------------ the bar, the case, the phone, smoking
{
  const { game, D, MM } = fresh();
  const bar = D.nearest('bar');
  D.teleport(bar.x, bar.y); run(game, 0.1);
  const before = D.state();
  const c0 = before.composure, w0 = before.whiskey;
  press(game, 'interact', 0.1);
  const after = D.state();
  check('pouring a bourbon at the bar adds whiskey and composure', after.whiskey > w0 && after.composure > c0, `whiskey ${w0}->${after.whiskey}, composure ${c0}->${after.composure}`);
  check('the bar counts the drink', after.drinks === 1);

  const cig0 = D.state().cigs;
  const comp1 = D.state().composure;
  press(game, 'use', 0.1);
  check('smoking spends a cigarette and steadies the hands', D.state().cigs === cig0 - 1 && D.state().composure > comp1 - 0.5, `cigs ${cig0}->${D.state().cigs}`);

  // the case: one refill a day
  const cs = D.nearest('cigs');
  D.teleport(cs.x, cs.y); run(game, 0.1);
  D.state().cigs = 0;
  press(game, 'interact', 0.1);
  check('the case refills two packs', D.state().cigs === 2, 'cigs ' + D.state().cigs);
  press(game, 'interact', 0.1);
  check('the case refills once a day', D.state().cigs === 2);

  // the phone: one call a day
  const ph = D.nearest('phone');
  D.teleport(ph.x, ph.y); run(game, 0.1);
  const home0 = D.state().home;
  press(game, 'interact', 0.1);
  check('a call home raises home', D.state().home > home0, `home ${home0}->${D.state().home}`);
  const home1 = D.state().home;
  press(game, 'interact', 0.1);
  check('a second call the same day does nothing extra', D.state().home <= home1 + 0.2, `home ${home1}->${D.state().home}`);

  // a dark pour: enough bourbon to go blurry, shown as a toast and as the bar colour
  D.state().whiskey = 80;
  const b2 = D.nearest('bar'); D.teleport(b2.x, b2.y); run(game, 0.1);
  press(game, 'interact', 0.1);
  press(game, 'interact', 0.1);
  check('too much bourbon is blurry, the whiskey bar is over the line', D.state().whiskey > MM.BLURRY_AT, 'whiskey ' + D.state().whiskey);
  check('no errors at the bar, the case or the phone', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
}

// ------------------------------------------------------------------ the dialogues
{
  const { game, D, MM } = fresh();
  const teddy = D.nearest('teddy');
  D.teleport(teddy.x, teddy.y + 14); run(game, 0.2);
  const spots = D.spots().map(s => s.kind);
  check('a colleague with a conversation offered is a spot to talk to', spots.includes('talk'), spots.join(','));
  press(game, 'interact', 0.1);
  check('talking to Teddy opens his conversation', D.snapshot().talk === true);
  const s0 = D.state().standing;
  const finished = finishTalk(game, D, 1);                 // "It is my deck now"
  check('the conversation finishes', finished && D.snapshot().talk === false);
  check('the choice raises standing and sets its flag', D.state().standing > s0 && D.state().flags.teddyBitter === true, `standing ${s0}->${D.state().standing}`);
  check('the conversation is not offered again today', !D.spots().some(s => s.kind === 'talk' && s.enc === 'teddy-memo'));
  check('no errors in a conversation', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
}

// ------------------------------------------------------------------ the meeting and the pitch
{
  const { game, D, MM } = fresh();
  const toMeeting = until(game, () => MM.meetingCalled(D.state()), 120, 0.25);
  check('the meeting is called half way through the day', toMeeting && D.state().t >= MM.meetingAt(D.state()));
  const bo = D.nearest('boardroom');
  D.teleport(bo.x, bo.y); run(game, 0.2);
  check('the boardroom door is a spot once the meeting is called', D.spots().some(s => s.kind === 'pitch'));
  press(game, 'interact', 0.1);
  check('going in opens the pitch', until(game, () => D.snapshot().scene === 'pitch', 3, 0.05), JSON.stringify(D.snapshot()));
  until(game, () => { if (!D.talk().open) return true; press(game, 'confirm', 0.05); return false; }, 40, 0.2);

  // the intro, then three beats: stop each needle in its zone, by reading the same numbers the player sees
  until(game, () => D.pitchRun() && D.pitchRun().phase === 'beat', 40, 0.2);
  check('the pitch opens its beats after the client\'s brief', D.pitchRun() && D.pitchRun().phase === 'beat', JSON.stringify(D.pitchRun() && D.pitchRun().phase));
  const scoresSeen = [];
  for (let beat = 0; beat < 3; beat++) {
    const reached = until(game, () => D.pitchRun().phase === 'beat' && D.pitchRun().beat === beat, 30, 0.02);
    if (!reached) { check('the beat ' + beat + ' comes up', false, 'phase ' + D.pitchRun().phase); break; }
    let pressedAt = null;
    until(game, () => {
      const P = D.pitchRun();
      if (P.phase !== 'beat') return true;
      const hw = MM.beatHalfWidth(D.state(), beat);
      if (MM.aiShouldPress(P.needle.p, P.centers[beat], hw)) { pressedAt = P.needle.p; press(game, 'confirm', 0.02); return true; }
      return false;
    }, 30, 0.02);
    scoresSeen.push(pressedAt !== null);
    run(game, 1.0);                                         // the flash of this beat's score
  }
  check('three beats are played, each stopped in its zone', scoresSeen.length === 3 && scoresSeen.every(Boolean), JSON.stringify(scoresSeen));
  check('the pitch scores three beats', D.pitchRun().scores.length === 3, JSON.stringify(D.pitchRun().scores));
  check('a clean pitch wins the account', D.state().accounts.includes('starbrite'), JSON.stringify(D.state().accounts));

  const done = until(game, () => { if (D.snapshot().scene !== 'pitch') return true; if (D.talk().open) press(game, 'confirm', 0.05); return false; }, 60, 0.2);
  check('the outcome lines finish and the summary follows', done && D.snapshot().scene === 'summary', JSON.stringify(D.snapshot()));
  check('no errors in the pitch', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
}

// ------------------------------------------------------------------ a missed pitch: the day ends, the client does not wait
{
  const { game, D, MM } = fresh();
  D.state().t = MM.dayDef(D.state()) && D.state().dayLength - 0.5;
  run(game, 1);
  check('the day ends at 5:00 PM and a missed pitch is recorded', D.snapshot().scene === 'summary' && D.state().pitches[1] === 'lost', JSON.stringify(D.snapshot()));
  press(game, 'confirm', 0.6);
  check('the next day opens on day 2', D.snapshot().scene === 'office' && D.snapshot().day === 2, JSON.stringify(D.snapshot()));
}

// ------------------------------------------------------------------ the whole week, played by a bot that uses the same inputs
function playDay(game, D, MM, log) {
  for (let guard = 0; guard < 4000; guard++) {
    const s = D.snapshot();
    if (s.scene === 'end' || s.scene === 'about' || s.scene === 'title') return s.scene;
    if (s.scene === 'summary') { press(game, 'confirm', 0.6); continue; }
    if (s.scene === 'pitch') {
      const P = D.pitchRun();
      if (P && P.phase === 'beat') {
        const hw = MM.beatHalfWidth(D.state(), P.beat);
        if (MM.aiShouldPress(P.needle.p, P.centers[P.beat], hw)) press(game, 'confirm', 0.02);
      }
      if (D.talk().open) press(game, 'confirm', 0.1);
      game.advance(0.02);
      continue;
    }
    if (s.scene === 'office') {
      if (D.talk().open) { finishTalk(game, D, 0, 20); continue; }
      const st = D.state();
      const talk = D.spots().find(x => x.kind === 'talk');
      if (talk) { D.teleport(talk.x, talk.y + 14); game.advance(0.1); press(game, 'interact', 0.1); continue; }
      if (st.drinks < 1) { const b = D.nearest('bar'); D.teleport(b.x, b.y); game.advance(0.1); press(game, 'interact', 0.1); continue; }
      if (!st.homeCalls[st.day]) { const p = D.nearest('phone'); D.teleport(p.x, p.y); game.advance(0.1); press(game, 'interact', 0.1); continue; }
      if (MM.meetingCalled(st) && !MM.pitchDone(st)) { const bo = D.nearest('boardroom'); D.teleport(bo.x, bo.y); game.advance(0.1); press(game, 'interact', 0.1); continue; }
      if (MM.canLeave(st)) { const e = D.nearest('elevator'); D.teleport(e.x, e.y); game.advance(0.1); press(game, 'interact', 0.1); continue; }
      game.advance(0.5);                                    // wait for the meeting, or the day
      continue;
    }
    game.advance(0.1);
  }
  return D.snapshot().scene + ' (gave up)';
}

{
  const { game, D, MM } = fresh();
  const endScene = playDay(game, D, MM, []);
  check('day 1 ends at the summary and the bot continues to day 2', D.snapshot().day === 2 || endScene === 'end', endScene + ' ' + JSON.stringify(D.snapshot()));
  // day 2 and day 3
  let scene = endScene;
  for (let day = 2; day <= 3 && scene !== 'end'; day++) {
    if (D.snapshot().scene === 'summary') { press(game, 'confirm', 0.6); }
    scene = playDay(game, D, MM, []);
  }
  check('the week reaches the ending', D.snapshot().scene === 'end', D.snapshot().scene);
  const e = MM.ending(D.state());
  check('the ending counts the accounts won', e.wins === D.state().accounts.length, e.wins + ' vs ' + D.state().accounts.length);
  check('the ending has a title, text and a score', !!(e.title && e.text && typeof e.score === 'number'), JSON.stringify(e));
  check('the playthrough had no errors', game.errors.length === 0, game.errors.map(er => er.message).join(' | '));

  press(game, 'confirm', 0.6);
  check('the ending opens the credits', D.snapshot().scene === 'about', D.snapshot().scene);
  run(game, 2);
  check('the credits draw with no errors', game.errors.length === 0);
  press(game, 'cancel', 0.6);
  check('leaving the credits goes back to the ending', D.snapshot().scene === 'end', D.snapshot().scene);
  press(game, 'cancel', 0.6);
  check('leaving the ending goes to the title', D.snapshot().scene === 'title', D.snapshot().scene);
}

// ------------------------------------------------------------------ settings: button symbols
{
  const { game } = boot();
  run(game, 0.2);
  game.settings.set('mmSymbols', 'xbox');
  check('the Xbox setting shows A B X Y', game.input.glyphs === 'xbox', String(game.input.glyphs));
  game.settings.set('mmSymbols', 'playstation');
  check('the PlayStation setting is the default and comes back', game.input.glyphs === 'playstation', String(game.input.glyphs));
  check('the inversion settings are off by default', game.settings.mmInvertX === false && game.settings.mmInvertY === false);
}

// ------------------------------------------------------------------ AI Hub: a session (parallel, 1-4 players)
const tick = () => new Promise(r => setImmediate(r));
async function sessionTests() {
  const calls = { connect: [], ready: 0, progress: [], result: [], handlers: {}, time: -Infinity };
  const hub = {
    active: true, seeded: false, me: 0, players: [{ id: 0, name: 'You', color: '#e8443a' }],
    connect(opts) { calls.connect.push(opts); return Promise.resolve({ me: 0, players: hub.players, mode: 'parallel', round: 1, limitMs: 600000, seed: 7 }); },
    ready() { calls.ready++; },
    time() { return calls.time; },
    on(ev, fn) { (calls.handlers[ev] = calls.handlers[ev] || []).push(fn); return () => {}; },
    progress(p) { calls.progress.push(p); },
    result(r) { calls.result.push(r); },
    rng(label) { let s = 7 + label.length; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; },
    fail() {}, send() { return true; }
  };
  const { game, D, MM } = boot({ AIHub: hub });
  run(game, 0.3);
  await tick();
  run(game, 0.3);
  check('a session opens straight into the round, with no title', D.snapshot().scene === 'office', D.snapshot().scene);
  check('the session connects as a parallel round for 1 to 4 players', calls.connect.length === 1 && calls.connect[0].mode === 'parallel' && calls.connect[0].seats[0] === 1 && calls.connect[0].seats[1] === 4, JSON.stringify(calls.connect));
  check('the session calls ready() once the round is joined', calls.ready === 1, String(calls.ready));
  check('the session has no pause menu (the hub owns the page)', game.scene && game.scene.pausable === false, String(game.scene && game.scene.pausable));
  run(game, 2);
  check('the round waits for the start (AIHub.time() < 0): the clock holds', D.state().t === 0, 'clock ' + D.state().t);
  calls.time = 0;
  run(game, 3);
  check('play begins once the round starts', D.state().t > 2.5, 'clock ' + D.state().t);
  check('progress is reported to the hub during the round', calls.progress.length > 0 && typeof calls.progress[0].score === 'number', JSON.stringify(calls.progress));
  check('the progress label is short text', calls.progress.length > 0 && calls.progress[0].label.length < 60, JSON.stringify(calls.progress[0]));

  for (const fn of calls.handlers['time-up'] || []) fn({ graceMs: 5000 });
  check('time-up reports the result at once', calls.result.length === 1 && typeof calls.result[0].score === 'number', JSON.stringify(calls.result));
  for (const fn of calls.handlers['end'] || []) fn({ reason: 'finished', standings: [[0]] });
  const sent = calls.progress.length;
  run(game, 2);
  check('after the end nothing more is sent', calls.progress.length === sent && calls.result.length === 1, 'progress ' + calls.progress.length);
  check('no errors in the session', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
}
async function noHubTest() {
  const hub = { active: true, connect() { return Promise.resolve(null); }, ready() {}, time() { return -Infinity; }, on() {}, rng() { return Math.random; } };
  const { game, D } = boot({ AIHub: hub });
  run(game, 0.3);
  await tick();
  run(game, 0.5);
  check('a session with no hub behind it falls back to the title', D.snapshot().scene === 'title', D.snapshot().scene);
  check('no hub: no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
}
await sessionTests();
await noHubTest();

console.log(failed ? `${failed} check(s) failed, ${passed} passed` : `all ${passed} checks passed`);
process.exit(failed ? 1 : 0);
