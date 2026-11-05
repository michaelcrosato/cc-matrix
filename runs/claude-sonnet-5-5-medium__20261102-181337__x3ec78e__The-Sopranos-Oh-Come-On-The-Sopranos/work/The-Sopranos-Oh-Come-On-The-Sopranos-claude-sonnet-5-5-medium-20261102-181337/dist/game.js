/* ====================================================================================================================
 * THE SOPRANOS OH, COME ON  -  a spiritual successor to The Sopranos (1999-2007)
 * A beat-'em-up with sit-downs: collect the envelopes, keep a lid on the stress, see the therapist, don't feed the ducks
 * to the wrong people.  Built on my-3D2dge (the engine's 'brawler' view, with 3/4, top-down and iso views on V).
 * 00-core: the game, its keys, settings, gamepad fixes, sound, voices, profile, helpers
 * ==================================================================================================================== */
const ABOUT = {"sourceInformation":{"date":"2026-11-02 18:13","source":"The Sopranos (1999-2007)","genre":"Beat-'em-up (brawler) with story / RPG-lite sit-downs: shops to shake down, therapy choices, a stress meter, upgrades","perspective":"Side-on 2.5D brawler camera (engine 'brawler' view); V / R3 switches to three-quarter, top-down and isometric","tech":"my-3D2dge v0.85.1 (single-file engine, canvas, HD Humanoid rigs, TileMap, Backdrop, Dialog, Menu, lighting, weather); plain JavaScript in one IIFE; AI Hub session client 1.3.0","artDirection":"Engine-native HD pixel style at 320x240 expanded to any screen: pixel-art volumetric characters, painted shopfronts, rim-lit fighters, rainy yard at night, dusk city street","animation":"Engine rig system: E.Humanoid skeletons driven by E.MOVES (jab, cross, hook, uppercut, roundhouse, haymaker, axekick...), E.Attack and E.Combo timing, poses, hit-stop, particles","audio":"All code-written: chip-synth music per scene (title, home, street, yard, boss, therapy), synthesized effects, and Animalese-style gibberish voices (a random syllable per letter, pitched per speaker)","online":"AI Hub Session Protocol v1, ghost mode, 1-4 players: each plays their own Tuesday Collections round from the same seed and sees the others as translucent ghosts; score reported as progress and result","testing":"Headless Node suites on the engine's fixed-step clock (49 system checks, 30 flow checks incl. attract mode, shop, save/load, game over, ending), the AI Hub harness (2 players, then 4 players with 150 ms latency, 50 ms jitter, 5% loss, and the host-leave scenario: all pass), and Playwright Chromium runs with real key events (full chapter playthroughs with screenshots; touch-emulated title). Not tested: a real DualSense, real iOS Safari, real humans.","research":"Read the my-3D2dge handoff (API card, brawler kit) and the AI Hub session protocol; drew on general knowledge of the show's tone and setting; no web browsing about the show","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-sonnet-5-5, reasoning effort medium","usage":"unknown"},"testingQ":["How many issues did testing catch?","How many would be considered critical issues / game breaking?","What was the most helpful test you ran?","What was the least helpful test you ran?"],"testingFeedback":["About 14. Seven were visual (cutscene actors drawn behind their backdrop, dialogue box over the actors' feet, title menu covering the cast, HUD text outside its panel, shop signs under awnings, touch banner overflow, kitchen header overlap) and seven were logic or flow (the stuck chapter-advance and exit locks, the attract bot cancelling itself, double envelope payouts, crates blocking the shopkeepers, shooters hiding behind the screen lock, Escape both backing out of the shop and pausing, rage unreachable at 99.x stress).","Three: (1) the chapter-advance and demo-exit guards were cleared by the scene change and stayed locked, so no chapter could end; (2) the attract bot's own confirm taps counted as player input and ended the demo after a few seconds; (3) a shooter could retreat behind the wave lock where the hero could not reach it, soft-locking the chapter. The double payout from the dialog callback order was serious but not game breaking.","The real-browser playthrough bot: real key events, a state readout every ten seconds and screenshots at milestones. It found the soft-lock, the shop pause bug, the double payouts and the blocked shopkeepers, none of which the headless suites could see because they skip drawing and real key timing.","The AI Hub harness runs: it passed on the first real attempt (after a port clash on my side) and told me nothing new, though it was necessary. Close second: the static syntax check of the bundle."],"engineQ":["What did you like most about the engine?","Did you get stuck or guess wrong?","What was the most important thing you had to build yourself?","What was the hardest part about using the engine?","If you had to remove or overhaul one thing from engine, what would that be?","If you could change one thing about the engine, what would it be?"],"engineFeedback":["The HD Humanoid rigs with E.MOVES, E.Attack and E.Combo. A punch string, a roundhouse or a haymaker looks right with almost no animation work. The readable kits, the deterministic fixed-step clock (game.advance made headless tests easy), and the free pause menu, settings, rebinding and save slots were close behind.","Yes. In the side view, a larger y draws nearer, so a backdrop queued at +y covered the actors. The Dialog calls onDone after onChoice, so starting another say() inside onChoice fires the new dialog's onDone at once. game.go() silently clears game.after timers, which left my guard flags stuck. Escape is bound to both cancel and pause, so backing out of a menu also paused. The brawler kit's facades are painted for one view only.","Nearly everything above the rigs: the foe AI with wave locks, the stress and rage system, bosses with a second phase, the shop, save and chapter flow, painted shopfront facades that work in every view, the attract bot, the AI Hub glue (ghost sync), Animalese voices by turning Dialog.voice into a getter, and the stick-inversion fix by wrapping navigator.getGamepads.","Making a brawler that works in all four camera views. The kit is one view, and its facades, bounds and lane logic assume it. Also learning undocumented behaviours (draw depth sorting, callback order, timer clearing) by trial, because the card says what to call but not how things interleave.","The Dialog's single shared onDone slot. Callbacks that can be replaced from inside a callback are what caused the double payout and skipped story beats. Per-line callbacks, or a promise-style say(), would remove the trap.","A first-class AI input source: let a scene be driven by a bot through the same Input pipeline (move(), buffered(), pressed()) without the bot's presses counting as the player's. Attract modes are a standard ask in these prompts and every game rebuilds the same workaround."],"promptQ":["What did you like most about this prompt?","What was confusing?","What was the hardest thing to do?","If there was one test you could have run, what would that test be?"],"promptFeedback":["The shape of the brief: a clear deliverable and 'done' list, the 10-foot controller-first stance with the axis-inversion twist, the attract mode and AI Hub requirements, and the exit-interview JSON that feeds tools. Freedom over genre, research and story gave room to make something with a point of view.","The title step: the random pick can land on a name that barely riffs on the source, and the reply format asks me to include the brainstorm only silently. 'This folder's root' versus the subfolder for the html. 'Testing: testing parameters allowed' reads like a blank to fill. 'As well as for the game on its own' for multiplayer is ambiguous (local co-op, or just that the game still runs outside the hub). Usage numbers are not available inside a session.","Breadth. One vertical slice has to carry a genre game, a story in a TV drama's voice, three input families, settings, an attract mode, code-written music and voices, a hub protocol, and thorough tests, with no human, real pad or real iOS to check feel against. Making a brawler read as a TV drama about a boss in therapy was the creative crux.","A human playing the finished slice with a real DualSense on a TV at 10 feet for 15 minutes, recording what they did not understand. Every other check I could run was an automated stand-in for exactly that."]};
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const TITLE = 'The Sopranos Oh, Come On', SOURCE = 'The Sopranos (1999-2007)', BUILD = '2026-11-02 18:13';

/* ---- INPUT: one game, three families of devices. Pad: PS5 layout (standard mapping): 0 Cross, 1 Circle, 2 Square, 3 Triangle,
 *      4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3 ---- */
const INPUT = Object.assign({}, E.Input.DEFAULT);
delete INPUT.dash; delete INPUT.skill;
Object.assign(INPUT, {
  attack: ['KeyJ', 'Mouse0', 'Pad2'],              // Square / J / left click: the punch string
  kick: ['KeyK', 'Mouse2', 'Pad1'],                // Circle / K / right click: kicks
  jump: ['Space', 'KeyZ', 'Pad0'],                 // Cross / Space
  special: ['KeyL', 'Pad5', 'Pad7'],               // R1 or R2 / L: Fuhgeddaboudit (rage)
  interact: ['KeyE', 'KeyF', 'Pad3'],              // Triangle / E: talk, collect, feed the ducks
  view: ['KeyV', 'Pad11']                          // R3 / V: change the camera view
});

/* ---- GAMEPAD FIX: some pads report an inverted horizontal / vertical stick now and then. Settings has a toggle for each; it is
 *      applied to the pad itself, so menus, walking and everything else follow ---- */
let game = null;
const flipAxes = p => {
  const s = game && game.settings; if (!p || !s || (!s.invertH && !s.invertV)) return p;
  const axes = Array.from(p.axes || []); for (const i of [0, 2]) if (s.invertH && axes[i] !== undefined) axes[i] = -axes[i]; for (const i of [1, 3]) if (s.invertV && axes[i] !== undefined) axes[i] = -axes[i];
  return { index: p.index, id: p.id, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes, vibrationActuator: p.vibrationActuator };
};
if (typeof navigator !== 'undefined' && navigator.getGamepads) {
  const raw = navigator.getGamepads.bind(navigator);
  try { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => Array.from(raw() || []).map(flipAxes) }); } catch (e) { /* locked down */ }
}

/* ---- THE GAME ---- */
game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'brawler', bg: '#07060d', input: INPUT,
  menu: {
    quit: 'title', saves: { version: 1 },
    controls: { attack: 'Punch', kick: 'Kick', jump: 'Jump', special: 'Fuhgeddaboudit (rage)', interact: 'Talk / collect / feed', view: 'Camera view' },
    settings: [
      { key: 'invertH', label: 'Invert gamepad horizontal', value: false },
      { key: 'invertV', label: 'Invert gamepad vertical', value: false },
      { key: 'xbox', label: 'Xbox glyphs (A B X Y)', value: false },
      { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' }
    ]
  } });
const P = game.particles, L = game.lights, A = game.audio;
const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd() * a.length)];
const T = 16;

/* ---- ACTIVITY: attract mode starts after 10 s of nothing on the title; any input ends it ---- */
const act = { at: 0, ptr: null };
const touchAct = () => { act.at = game.real; };
if (typeof addEventListener === 'function') for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, touchAct, { passive: true });
if (typeof addEventListener === 'function') addEventListener('pointermove', e => { const p = e.clientX + ',' + e.clientY; if (act.ptr !== null && p !== act.ptr) act.at = game.real; act.ptr = p; }, { passive: true });
/** has the player done anything this step (a key, a button, a stick, the mouse)? */
let demoAt = 0;                       // when the attract mode began: any real key, click or touch since then ends it, even one that lands during a hit-stop
const demoInput = () => act.at > demoAt + .02;
const userActive = () => { const I = game.input; if (I.anyPressed()) return true; const m = I.move(); return Math.hypot(m[0], m[1]) > .4; };

/* ---- common per-step work: glyph family, the touch-only check ---- */
const touchOnly = () => { try { return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !(navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean)); } catch (e) { return false; } };
function common() {
  const I = game.input, s = game.settings;
  I.glyphs = s.xbox ? 'xbox' : 'playstation';        // PlayStation glyphs unless Settings says Xbox
  I.touchEnabled = false;                              // no touch controls: the game wants a controller or a keyboard
  if (userActive()) act.at = game.real;
}
const prompt = (a, word) => game.input.label(a) + ' ' + word;

/* ---- THE PROFILE: what carries from one chapter to the next, and into a save ---- */
const blank = () => ({ step: 0, cash: 0, respect: 0, calm: 0, kills: 0, envelopes: 0, ducks: 0, up: { hp: 0, dmg: 0, calm: 0, bat: 0, duck: 0 }, flags: {}, time: 0, best: 0 });
let S = blank();
const FLOW = ['intro', 'street', 'kitchen', 'therapy', 'yard', 'ending'];
const DIFF = { Easy: { foeHp: .7, foeDmg: .6 }, Normal: { foeHp: 1, foeDmg: 1 }, Hard: { foeHp: 1.35, foeDmg: 1.3 } };
const diff = () => DIFF[game.settings.difficulty] || DIFF.Normal;
const heroMax = () => 60 + S.up.hp * 12;
const dmgMul = () => 1 + S.up.dmg * .2 + S.calm * .02;
const stressMul = () => Math.max(.4, 1 - S.up.calm * .15 - S.calm * .03);
const score = () => S.cash * 10 + S.kills * 100 + S.respect * 50;
const UPGRADES = [
  { id: 'hp', name: 'GYM MEMBERSHIP', text: 'More health. You will go twice. Maybe.', base: 300, max: 3 },
  { id: 'dmg', name: 'NEW KNUCKLES', text: 'Your hands hit harder. Brass has a way.', base: 400, max: 3 },
  { id: 'calm', name: 'BREATHING TAPES', text: 'Stress builds slower. Dr. M swears by them.', base: 350, max: 3 },
  { id: 'bat', name: 'BAT LESSONS', text: 'A bat lasts longer. Respect for the craft.', base: 250, max: 3 },
  { id: 'duck', name: 'DUCK FEEDER', text: 'The ducks calm you more. Do not ask why.', base: 200, max: 3 }
];
const upCost = u => u.base + S.up[u.id] * 250;

/* ---- SOUND: code-written music, effects and the gibberish voices ---- */
const rep = (s, n) => Array(n).fill(s).join(' ');
const SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, notes: 'A2 . . A2 . . E3 . A2 . . A2 . G2 . . | F2 . . F2 . . C3 . F2 . . F2 . E2 . . | D2 . . D2 . . A2 . D2 . . D2 . F2 . . | E2 . . E2 . . B2 . E2 . . G#2 . B2 . .' },
    { wave: 'pulse12', vol: .1, notes: 'A4 - - . C5 - E5 - D5 - C5 - B4 - . . | C5 - - . A4 - F4 - G4 - A4 - C5 - . . | D5 - - . F5 - A4 - D5 - C5 - A4 - . . | B4 - G#4 - E4 - . . B4 - - - . . . .' },
    { wave: 'sine', vol: .08, notes: 'A3 - - - - - - - E3 - - - - - - - | F3 - - - - - - - C3 - - - - - - - | D3 - - - - - - - A3 - - - - - - - | E3 - - - - - - - G#3 - - - - - - -' },
    { wave: 'drums', vol: .22, notes: 'k . . h . . s h k . h . s . h .' }] },
  home: { bpm: 70, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'C4 - E4 - G4 - E4 - | A3 - C4 - E4 - C4 - | F3 - A3 - C4 - A3 - | G3 - B3 - D4 - B3 -' },
    { wave: 'triangle', vol: .2, notes: 'C2 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | G1 - - - - - - -' }] },
  street: { bpm: 106, steps: 4, tracks: [
    { wave: 'triangle', vol: .25, notes: 'E2 . E2 E3 . E2 . G2 | A2 . A2 A3 . A2 . G2 | E2 . E2 E3 . E2 . B2 | D3 . D3 . B2 . G2 .' },
    { wave: 'pulse', vol: .08, notes: '. . B3 . . . B3 . | . . C4 . . . C4 . | . . B3 . . . B3 . | . . A3 . . . G3 .' },
    { wave: 'pulse12', vol: .07, notes: 'E4 - . G4 - . B4 - | A4 - . C5 - . E5 - | G4 - . B4 - . D5 - | B4 - A4 - G4 - . .' },
    { wave: 'drums', vol: .25, notes: 'k . h . s . h k | . . h . s . h h' }] },
  yard: { bpm: 124, steps: 4, tracks: [
    { wave: 'saw', vol: .13, notes: 'D2 . D2 . D2 . F2 . | D2 . D2 . C2 . A1 . | Bb1 . Bb1 . Bb1 . D2 . | A1 . A1 . C2 . E2 .' },
    { wave: 'pulse12', vol: .07, notes: 'D4 . . F4 . . A4 . | G4 . . F4 . . D4 . | Bb3 . . D4 . . F4 . | E4 . . C#4 . . A3 .' },
    { wave: 'noise', vol: .04, notes: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . h' },
    { wave: 'drums', vol: .28, notes: 'k . h h s . h . | k k h . s . h h' }] },
  boss: { bpm: 142, steps: 4, tracks: [
    { wave: 'saw', vol: .14, notes: 'A1 A1 . A1 A1 . C2 . | A1 A1 . A1 A1 . E2 . | F1 F1 . F1 F1 . A1 . | G1 G1 . G1 G1 . B1 .' },
    { wave: 'pulse', vol: .09, notes: 'A4 . C5 . E5 . C5 . | A4 . C5 . E5 . G5 . | F4 . A4 . C5 . A4 . | G4 . B4 . D5 . B4 .' },
    { wave: 'drums', vol: .3, notes: 'k . k h s . h k | k . k h s h s s' }] },
  therapy: { bpm: 60, steps: 4, tracks: [
    { wave: 'sine', vol: .12, notes: 'E4 - - B3 - - G4 - | F#4 - - D4 - - B3 - | C4 - - G3 - - E4 - | D4 - - B3 - - F#3 -' },
    { wave: 'triangle', vol: .12, notes: 'E2 - - - - - - - | D2 - - - - - - - | C2 - - - - - - - | B1 - - - - - - -' }] },
  sting: { bpm: 100, steps: 4, tracks: [{ wave: 'pulse12', vol: .14, notes: 'A4 C5 E5 - A5 - - - | . . . . . . . .' }, { wave: 'triangle', vol: .2, notes: 'A2 - - - A2 - - - | . . . . . . . .' }] }
};
for (const k of ['title', 'home', 'street', 'yard', 'boss', 'therapy']) SONGS[k].tracks.forEach(t => { t.notes = t.notes.replace(/\|/g, ''); });
const music = (name, o) => { try { A.music(name ? SONGS[name] : null, o); } catch (e) { game.fail('music', e); } };
const sfx = (n, o) => { try { A.sfx(n, o); } catch (e) { game.fail('sfx', e); } };
// the voices: "Animalese" gibberish. Each speaker has a pitch range and a wave; every blip of the dialog box is a random syllable
const VOICES = { vic: { wave: 'square', lo: 90, hi: 150 }, connie: { wave: 'triangle', lo: 260, hi: 360 }, doc: { wave: 'sine', lo: 200, hi: 280 }, sal: { wave: 'pulse', lo: 130, hi: 210 },
  chris: { wave: 'saw', lo: 150, hi: 230 }, dino: { wave: 'square', lo: 70, hi: 100 }, johnny: { wave: 'saw', lo: 80, hi: 120 }, shop: { wave: 'pulse12', lo: 120, hi: 190 }, duck: { wave: 'saw', lo: 520, hi: 700 }, narr: { wave: 'sine', lo: 110, hi: 150 } };
let voice = VOICES.narr;
const setVoice = id => { voice = VOICES[id] || VOICES.narr; };
const blip = () => { const f = voice.lo * Math.pow(voice.hi / voice.lo, rnd()); return { wave: voice.wave, freq: f, to: f * (rnd() < .5 ? .9 : 1.12), dur: .055, vol: .11 }; };

/* ---- small shared helpers ---- */
const TXT = { outline: false, shadow: '#08060e' }, TXC = Object.assign({ align: 'center' }, TXT), TXR = Object.assign({ align: 'right' }, TXT);
const WIN = { bg: ['#3a2a5c', '#0e0a1c'], border: '#a89ad8' }, WINR = { bg: ['#4a1e3a', '#12060e'], border: '#d08aa8' };
const scenes = {};
const store = { get: (k, d) => E.store.get('soprano:' + k, d), set: (k, v) => E.store.set('soprano:' + k, v) };
const money = n => '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const ordinalGrade = p => p >= .9 ? 'A' : p >= .75 ? 'B' : p >= .55 ? 'C' : p >= .35 ? 'D' : 'F';

/* ---- 10-cast: HD Humanoids sized like Final Fight sprites, their moves and what each blow does ---- */
const BASE = { speedRef: 40, footSpread: 4 };
const CAST = {
  vic: { weapon: null, size: 2.3, build: 'bulky', hair: 'short', outfit: 'coat', sleeves: 'long', hunch: .1, colors: { skin: '#e2ac84', hair: '#2a1a14', cloth: '#2a3f6a', coat: '#2a3f6a', pants: '#1e1e28', boot: '#2a2018', belt: '#c8a040', trim: '#c8a040', glove: '#e2ac84' } },
  vicBat: { weapon: 'staff', size: 2.3, build: 'bulky', hair: 'short', outfit: 'coat', sleeves: 'long', hunch: .1, colors: { skin: '#e2ac84', hair: '#2a1a14', cloth: '#2a3f6a', coat: '#2a3f6a', pants: '#1e1e28', boot: '#2a2018', belt: '#c8a040', trim: '#c8a040', metal: '#b07a3a', glove: '#e2ac84' } },
  connie: { weapon: null, size: 2.0, build: 'heroic', hair: 'long', outfit: 'robe', sleeves: 'long', colors: { skin: '#e8b898', hair: '#4a2a1a', cloth: '#a83a5a', pants: '#a83a5a', boot: '#5a3a3a', trim: '#f0d8a0' } },
  doc: { weapon: null, size: 2.0, build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#7a5a3a', cloth: '#d8d0c0', coat: '#5a6a7a', pants: '#3a4252', boot: '#2a2630', trim: '#e8e0d0' } },
  sal: { weapon: null, size: 2.2, build: 'bulky', hair: 'bald', outfit: 'shirt', sleeves: 'short', colors: { skin: '#d8a078', hair: '#2a1a14', cloth: '#d8c040', pants: '#2a2a30', boot: '#201814', belt: '#201814' } },
  chris: { weapon: null, size: 2.1, build: 'heroic', hair: 'spiky', outfit: 'coat', sleeves: 'long', colors: { skin: '#e0b08a', hair: '#1a1a1e', cloth: '#7a2a2a', coat: '#1c1c24', pants: '#1c1c24', boot: '#101014', trim: '#c0c0c8' } },
  shopA: { weapon: null, size: 2.0, build: 'bulky', hair: 'bald', outfit: 'shirt', sleeves: 'short', colors: { skin: '#d8a078', hair: '#704a2a', cloth: '#f0eee4', pants: '#8a3a3a', boot: '#2a2420', belt: '#d8d0c0' } },
  shopB: { weapon: null, size: 2.0, build: 'chibi', hair: 'short', outfit: 'tunic', sleeves: 'short', hat: { style: 'cap', color: '#3a6a8a' }, colors: { skin: '#c89070', hair: '#2a2a2a', cloth: '#3a6a8a', pants: '#2a3040', boot: '#20202a' } },
  shopC: { weapon: null, size: 2.0, build: 'heroic', hair: 'long', outfit: 'shirt', sleeves: 'none', colors: { skin: '#e8b898', hair: '#c83a8a', cloth: '#1a1a22', pants: '#1a1a22', boot: '#a02a5a', trim: '#f0c850' } },
  shopD: { weapon: null, size: 2.0, build: 'bulky', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#d0987a', hair: '#3a3a3e', cloth: '#6a6a4a', coat: '#4a4a3a', pants: '#2a2a30', boot: '#201c18' } },
  // the cast of bad ideas
  associate: { weapon: null, size: 2.15, build: 'heroic', hair: 'spiky', outfit: 'coat', sleeves: 'long', hunch: .2, colors: { skin: '#d8a078', hair: '#1a1a1e', cloth: '#7a3a3a', coat: '#3a3a4a', pants: '#2c2c3a', boot: '#1a1418', belt: '#b8b8c8' } },
  tracksuit: { weapon: null, size: 2.3, build: 'heroic', hair: 'short', outfit: 'shirt', sleeves: 'long', hat: { style: 'band', color: '#d83a2a' }, colors: { skin: '#e0ae88', hair: '#3a2a1a', cloth: '#d83a2a', pants: '#d83a2a', boot: '#f0f0f0', trim: '#f0f0f0' } },
  heavy: { weapon: null, size: 2.55, build: 'bulky', hair: 'bald', outfit: 'shirt', sleeves: 'none', hunch: .3, colors: { skin: '#b07850', cloth: '#2a2a30', pants: '#4a4a3a', boot: '#2a1a1a', belt: '#d8b040' } },
  shooter: { weapon: 'gun', size: 2.15, build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', hat: { style: 'cap', color: '#2a2a30' }, colors: { skin: '#d8a888', hair: '#4a3a2a', cloth: '#3a3a44', coat: '#26262e', pants: '#26262e', boot: '#14141a', metal: '#707078' } },
  dino: { weapon: null, size: 2.7, build: 'bulky', hair: 'bald', outfit: 'shirt', sleeves: 'short', colors: { skin: '#d49a78', hair: '#2a1a14', cloth: '#e8e4d8', pants: '#3a3a52', boot: '#241a18', belt: '#6a4a2a' } },
  johnny: { weapon: null, size: 2.65, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#4a4a52' }, colors: { skin: '#dca880', hair: '#9a9aa2', cloth: '#6a2e3e', coat: '#8a8a94', trim: '#d8c070', pants: '#3a3a4a', boot: '#241a1a', belt: '#d8c070', glove: '#dca880' } }
};
// each foe fights its own way: strings of E.MOVES it picks from. The first blow winds up slowly (the telegraph); follow-ups come faster
const FOES = {
  associate: { name: 'ASSOCIATE', hp: 9, r: 6, speed: 50, wind: .26, moves: [['jab', 'cross'], ['jab', 'jab', 'cross']], cash: [5, 25], rig: 'associate' },
  tracksuit: { name: 'TRACKSUIT', hp: 13, r: 6, speed: 42, wind: .3, moves: [['roundhouse'], ['kick', 'roundhouse']], cash: [10, 40], rig: 'tracksuit' },
  heavy: { name: 'COLLECTOR', hp: 22, r: 8, speed: 30, wind: .38, moves: [['haymaker'], ['bash'], ['bash', 'haymaker']], cash: [20, 60], rig: 'heavy' },
  shooter: { name: 'SHOOTER', hp: 8, r: 6, speed: 34, wind: .5, moves: [['jab']], ranged: true, cash: [15, 45], rig: 'shooter' },
  dino: { name: 'FAT DINO', hp: 52, r: 9, speed: 38, wind: .3, moves: [['cross', 'hook', 'haymaker'], ['elbow', 'uppercut'], ['bash']], boss: true, cash: [200, 200], rig: 'dino', say: ["You know what your problem is? You count other people's envelopes.", "My mother, God rest her, she made a gravy. This? This is NOT gravy."] },
  johnny: { name: 'JOHNNY SALT', hp: 95, r: 9, speed: 44, wind: .26, moves: [['cross', 'hook', 'haymaker'], ['elbow', 'uppercut'], ['axekick'], ['roundhouse', 'sweep']], boss: true, phase2: true, cash: [500, 500], rig: 'johnny',
    say: ['Vic. Look at you. The big man. Standing in my yard, in the rain, like a lawn ornament.', "Business is business. Sunday is Sunday. Tonight? Tonight it's just you and me and the barrels."] }
};
const TUNE = { kick: { reach: .1, r0: 0, r1: 6.5, z0: .9, z1: 1.1 }, roundhouse: { reach: .1, r0: 0, r1: 8.5, a0: 2.6, z0: .15, hold: .12, twist: 2.2, hitAt: .5 },
  sweep: { reach: .1, r0: 0, r1: 7.5, a0: 1.1, a1: -.45, active: .22, hold: .6, lean: 0 }, axekick: { reach: .1, r0: 2, r1: 5, z1: .15, hitAt: .06, lean: -.5 },
  hook: { reach: 5.4, a0: 1.9 }, bash: { plane: 'side', a0: 2, a1: -.4 }, haymaker: { a0: 2.7, z0: -2 } };
const GRAB = { name: 'grab', rel: true, hand: 'L', a0: .3, a1: .05, z0: -1, z1: .4, r0: 3, r1: 6, wind: .06, active: .08, recover: .3, hold: .9, lunge: .8, blade: 0, hitAt: .4 };
const move = (m, o) => new E.Attack(m, Object.assign({}, TUNE[m], o));
// [damage, knockback, lift]: a lift takes the target off its feet. A foe string's early blows only rock the hero
const BLOW = { jab: [2, 10, 0], cross: [2, 15, 0], hook: [3, 25, 0], uppercut: [4, 110, 220], knee: [3, 0, 0], elbow: [3, 110, 0], kick: [3, 35, 0], roundhouse: [4, 130, 160],
  flyingkick: [4, 130, 170], sweep: [3, 50, 120], haymaker: [6, 120, 180], bash: [5, 160, 0], axekick: [6, 15, 70], slash: [5, 70, 0], backslash: [5, 90, 60], overhead: [9, 70, 170], grab: [0, 0, 0], rage: [10, 200, 220] };
const rig = (id, extra) => new E.Humanoid(Object.assign({}, BASE, CAST[id], extra || {}));
const heroMoves = () => ({ punch: new E.Combo(['jab', 'cross', move('hook'), 'uppercut'], { window: .35 }), clinch: new E.Combo([GRAB, 'knee', 'knee', 'elbow'], { window: .35 }),
  kick: new E.Combo([move('kick'), move('roundhouse')], { window: .35 }), fly: new E.Attack('flyingkick'), bat: new E.Combo(['backslash', 'slash', 'overhead'], { window: .4 }), rage: move('haymaker', { wind: .05, recover: .2 }) });
// the little sprites: cash envelope, capicola sandwich (heals), bat, duck, shell casing
const ENVELOPE = E.sprite(['wwwwwwwwww', 'wWwwwwwwWw', 'wwWwwwwWww', 'wwwWwwWwww', 'wwwwWWwwww', 'wwwwwwwwww', 'gggggggggg'], { w: '#f2ead0', W: '#b8a878', g: '#3a8a3a' }, 2);
const SANDWICH = E.sprite(['..bbbbbb..', '.bBBBBBBb.', 'bBBBBBBBBb', 'rrrrrrrrrr', 'wwwwwwwwww', 'rrrrrrrrrr', 'bbbbbbbbbb', '.bBBBBBBb.'], { b: '#8a5a2a', B: '#c8924a', r: '#b83a3a', w: '#f4ecd8' }, 2);
const BATSPR = E.sprite(['......bb', '.....bBb', '....bBb.', '...bBb..', '..bBb...', '.bBb....', 'bBb.....', 'dd......'], { b: '#6a4220', B: '#c8924a', d: '#2a1a0a' }, 2);
const DUCK = E.sprite(['....gggg....', '...gGGGGg...', '...gGgGGg.oo', '....gGGGgoo.', '.wwwwwwwg...', 'wwwwwwwwww..', 'wwWWwwwwww..', '.wwwwwwww...'], { g: '#2a6a3a', G: '#3a9a50', o: '#e89a2a', w: '#f4f0e0', W: '#c8c0a8' }, 2);
const BOXSPR = {};

/* ---- 20-levels: two chapters' streets as data: buildings, floors, skies, props, shops, waves ---- */
const LEVELS = {
  street: {
    id: 'street', name: 'TUESDAY COLLECTIONS', sub: 'NEWARK AVENUE, 6 P.M.', song: 'street', boss: 'dino', dusk: true,
    objective: 'Collect from the three shops. Then deal with Fat Dino.',
    blocks: [
      { n: 9, h: 112, color: '#8a4434', face: 'brick', kind: 'tenement' }, { n: 8, h: 64, color: '#d8c4a0', face: 'plaster', kind: 'pork', text: 'VESUVIO PORK STORE', tc: '#ffd890' },
      { n: 6, h: 100, color: '#5c4c62', face: 'brick', kind: 'tenement' }, { n: 8, h: 70, color: '#5a7a96', face: 'plaster', kind: 'cleaners', text: 'SPARKLE DRY CLEAN', tc: '#9ae8ff' },
      { n: 4, h: 90, color: '#3a3040', face: 'brick', kind: 'alley' }, { n: 10, h: 76, color: '#2a1a30', face: 'none', kind: 'club', text: 'BADA BOOM', tc: '#ff5aa8' },
      { n: 9, h: 120, color: '#743246', face: 'brick', kind: 'tenement' }, { n: 10, h: 66, color: '#6a6a74', face: 'none', kind: 'garage', text: "SAL'S AUTO", tc: '#ffd24a' }, { n: 6, h: 104, color: '#626c8a', face: 'stone', kind: 'tenement' }],
    lamps: [30, 200, 352, 505, 660, 822, 980, 1090],
    street: [['trashcan', 46, 25, 1.25], ['firedrum', 84, 27, 1.3], ['hydrant', 196, 146, 1], ['trashcan', 312, 25, 1.25], ['firedrum', 520, 26, 1.3], ['trashcan', 626, 25, 1.25], ['hydrant', 690, 146, 1], ['trashcan', 800, 25, 1.25], ['firedrum', 940, 27, 1.3], ['trashcan', 1040, 25, 1.25]],
    boxes: [[11, 74, 'crate'], [18, 100, 'barrel'], [26, 66, 'crate'], [36, 78, 'barrel'], [47, 64, 'crate'], [55, 72, 'barrel']],
    npcs: [{ id: 'pork', x: 212, y: 30, rig: 'shopA', face: Math.PI, name: 'MR. BARTOLO', voice: 'shop', cash: [120, 220] }, { id: 'clean', x: 440, y: 30, rig: 'shopB', face: Math.PI, name: 'WALTER KOWAL', voice: 'shop', cash: [100, 180] },
      { id: 'club', x: 648, y: 30, rig: 'shopC', face: Math.PI, name: 'DESIREE', voice: 'shop', cash: [150, 260] }],
    pickups: [['sandwich', 330, 90], ['sandwich', 700, 100], ['bat', 560, 92], ['sandwich', 930, 120], ['sandwich', 1010, 118]],
    waves: [{ x: 250, foes: ['associate', 'associate'] }, { x: 470, foes: ['tracksuit', 'associate', 'associate'] }, { x: 690, foes: ['heavy', 'shooter', 'associate'] }, { x: 940, foes: ['dino', 'associate', 'shooter'] }],
    ambient: .62, rain: false },
  yard: {
    id: 'yard', name: 'THE MEADOWLANDS YARD', sub: 'WASTE MANAGEMENT. 11 P.M. RAIN.', song: 'yard', boss: 'johnny', dusk: false,
    objective: "Feed the ducks if you need it. Then Johnny Salt.",
    blocks: [
      { n: 6, h: 80, color: '#7a2a2a', face: 'none', kind: 'container', text: 'MEADOW HAULING' }, { n: 6, h: 80, color: '#2a4a7a', face: 'none', kind: 'container', text: 'GARDEN STATE' }, { n: 4, h: 40, color: '#5a4a38', face: 'plank', kind: 'fence' },
      { n: 7, h: 80, color: '#3a6a4a', face: 'none', kind: 'container', text: 'SALT & SONS' }, { n: 6, h: 120, color: '#4a4a52', face: 'stone', kind: 'office', text: 'SCALE HOUSE' }, { n: 5, h: 40, color: '#5a4a38', face: 'plank', kind: 'fence' },
      { n: 7, h: 80, color: '#7a5a2a', face: 'none', kind: 'container', text: 'NO WAY OUT' }, { n: 8, h: 80, color: '#5a2a6a', face: 'none', kind: 'container', text: 'SALT & SONS' }, { n: 5, h: 80, color: '#2a6a6a', face: 'none', kind: 'container', text: 'FRESH PICKED' }],
    lamps: [60, 260, 470, 690, 900],
    street: [['firedrum', 40, 27, 1.3], ['barrel', 100, 140, 1], ['barrel', 330, 26, 1], ['firedrum', 400, 27, 1.3], ['barrel', 500, 140, 1], ['firedrum', 650, 27, 1.3], ['barrel', 780, 26, 1], ['hydrant', 800, 146, 1], ['firedrum', 940, 27, 1.3]],
    boxes: [[6, 44, 'barrel'], [15, 40, 'crate'], [24, 46, 'barrel'], [29, 38, 'crate'], [35, 44, 'barrel'], [43, 40, 'crate'], [50, 46, 'barrel']],
    npcs: [{ id: 'sal', x: 70, y: 100, rig: 'sal', face: 0, name: 'SAL PISTACHIO', voice: 'sal', talk: true }],
    pond: { x: 190, y: 86, rx: 38, ry: 18 }, ducks: 5,
    pickups: [['bat', 118, 60], ['sandwich', 420, 96], ['sandwich', 640, 90], ['sandwich', 850, 120], ['sandwich', 920, 118]],
    waves: [{ x: 280, foes: ['associate', 'tracksuit', 'associate'] }, { x: 480, foes: ['heavy', 'shooter', 'tracksuit'] }, { x: 700, foes: ['shooter', 'shooter', 'heavy', 'associate'] }, { x: 880, foes: ['johnny', 'tracksuit', 'shooter'] }],
    ambient: .42, rain: true }
};
for (const lv of Object.values(LEVELS)) {
  let at = 0; lv.blocks.forEach((b, i) => { b.i = i; b.x0 = at * T; b.w = b.n * T; b.id = 'abcdefghij'[i]; at += b.n; }); lv.len = at * T;
  lv.lights = lv.lamps.map(x => ({ x, y: 46, r: 46, c: lv.dusk ? '#ffb45a' : '#c8e0ff' }));
  for (const b of lv.blocks) if (b.tc) lv.lights.push({ x: b.x0 + b.w * .5, y: 22, r: 44, c: b.tc });
}
const Y0 = 28, Y1 = 136;

/* floor: dusk asphalt with sidewalks and a crosswalk; or the yard's wet gravel with painted bays and a pond */
const hx = c => E.hex(c);
const FL = { slab: hx('#8a8496'), slab2: hx('#837d90'), seam: hx('#5a546c'), lip: hx('#9e98aa'), curb: hx('#c4becc'), cface: hx('#5c566e'), gut: hx('#1c1826'), tar: hx('#3a3450'), tar2: hx('#4a4262'), yel: hx('#e8b440'), paint: hx('#d6d2de'),
  gr1: hx('#4a4640'), gr2: hx('#5a554c'), gr3: hx('#38342e'), mud: hx('#3a3228'), wat: hx('#2a4a6a'), wat2: hx('#3a6a8a'), grass: hx('#2e4a2e') };
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function floorStreet(x, y) {
  let c;
  if (y < 42 || y >= 133) { const s = y < 42 ? y - 16 : y - 133, row = s < 10 ? 0 : 1, sy = s - row * 10, sx = (x + s * .7) % 24; c = sx < 1.3 || sy < 1.6 ? FL.seam : sy < 3.2 || sx < 2.6 ? FL.lip : E.hash2(Math.floor((x + s * .7) / 24), row + (y > 99 ? 7 : 0)) > .6 ? FL.slab2 : FL.slab; if (y < 24) c = c.map(v => v * (.6 + (y - 16) * .05)); }
  else if (y < 48.5) c = y < 45 ? FL.curb : FL.cface;
  else if (y < 51 || y >= 130) c = FL.gut;
  else {
    c = mixc(FL.tar, FL.tar2, E.noise2(x * .012, y * .045) * .8);
    const u = (x % 420 - 230) / (.75 + (y - 51) / 79 * .5);
    if (Math.abs(u) < 30 && (u + 30) % 10 < 5.5 && y > 54 && y < 127) c = FL.paint; else if (Math.abs(y - 88.5) < .9 || Math.abs(y - 91.5) < .9) c = FL.yel;
    if (E.noise2(x * .028 + 5, y * .08) > .72) c = mixc(c, hx('#8c6a9c'), .45);
  }
  let [r, g, b] = c;
  for (const Lt of LEVELS.street.lights) { const dx = (x - Lt.x) / Lt.r, dy = (y - Lt.y) / (Lt.r * .6), d2 = dx * dx + dy * dy; if (d2 < 1) { const k = (1 - d2) * (1 - d2) * .7, rgb = Lt.rgb || (Lt.rgb = E.hex(Lt.c)); r += k * rgb[0] * (r / 200 + .12); g += k * rgb[1] * (g / 200 + .12); b += k * rgb[2] * (b / 200 + .12); } }
  return [r, g, b];
}
function floorYard(x, y) {
  const pd = LEVELS.yard.pond, dxp = (x - pd.x) / pd.rx, dyp = (y - pd.y) / pd.ry, d = dxp * dxp + dyp * dyp;
  if (d < 1) return d > .78 ? FL.mud : mixc(FL.wat, FL.wat2, E.noise2(x * .08, y * .12 + game.time * .0) * .9);
  if (d < 1.8) return mixc(FL.grass, FL.mud, E.noise2(x * .1, y * .1));
  let c = mixc(FL.gr3, FL.gr2, E.noise2(x * .03, y * .06) * .9 + E.hash2(x | 0, y | 0) * .15);
  if (y < 30) c = c.map(v => v * .7);
  if (y > 60 && y < 130 && Math.abs(((x % 160) + 160) % 160 - 80) < 1.4) c = FL.paint.map(v => v * .55);        // painted bay lines
  if (E.noise2(x * .02 + 9, y * .07) > .66) c = mixc(c, FL.wat2, .45);                                              // puddles
  let [r, g, b] = c;
  for (const Lt of LEVELS.yard.lights) { const dx = (x - Lt.x) / Lt.r, dy = (y - Lt.y) / (Lt.r * .6), d2 = dx * dx + dy * dy; if (d2 < 1) { const k = (1 - d2) * (1 - d2) * .6, rgb = Lt.rgb || (Lt.rgb = E.hex(Lt.c)); r += k * rgb[0] * (r / 200 + .1); g += k * rgb[1] * (g / 200 + .1); b += k * rgb[2] * (b / 200 + .1); } }
  return [r, g, b];
}
LEVELS.street.floor = floorStreet; LEVELS.yard.floor = floorYard;

/* skies */
const SKY_DUSK = ['#150c30', '#301a52', '#62265e', '#a83a5e', '#e2685a', '#ffa868', '#ffd08a'];
LEVELS.street.sky = () => { const SK = Array.from({ length: 36 }, (_, i) => { const t = Math.min(1, i / 23) * 6, k = Math.min(5, Math.floor(t)); return E.mix(SKY_DUSK[k], SKY_DUSK[k + 1], t - k); });
  return new E.Backdrop({ sky: SK, stars: 36, starsY: .22, layers: [{ kind: 'city', color: '#5e3464', y: .6, height: .3, parallax: .05, windows: '#ffc070' }, { kind: 'city', color: '#3a2248', y: .66, height: .25, parallax: .12, windows: '#ffe08a', seed: 7 }] }); };
LEVELS.yard.sky = () => new E.Backdrop({ sky: ['#06070e', '#0c1220', '#16202e', '#22303c'], stars: 10, starsY: .2, moon: { x: .78, y: .2, r: 14, color: '#c8d4e8' },
  layers: [{ kind: 'city', color: '#10161e', y: .62, height: .26, parallax: .06 }, { kind: 'mountains', color: '#0c1018', y: .72, height: .22, parallax: .1 }, { kind: 'fog', color: '#38485a', y: .88, height: .14, parallax: 0, drift: 5 }] });

/* the map: a row of buildings, then 8 rows of street */
function buildMap(lv) {
  const rows = [lv.blocks.map(b => b.id.repeat(b.n)).join(''), ...Array(8).fill('.'.repeat(lv.len / T))];
  return new E.TileMap({ rows, ao: 0, floorTex: lv.floor, legend: Object.fromEntries(lv.blocks.map(b => [b.id, b.i + 1])),
    types: Object.fromEntries(lv.blocks.map(b => [b.i + 1, { h: b.h, side: b.color, sideLt: b.color, top: E.shade(b.color, -.45), face: b.face, course: b.face === 'brick' ? 3 : undefined, roof: b.face === 'none' ? 'plain' : 'slab' }])) });
}

/* facades: painted onto each building's front (the wall plane, y = T) so they sit right in every camera view */
function paintFront(r, b, lv) {
  const wp = (u, z) => { const s = r.w(b.x0 + u, T, z); return [Math.round(s[0]), Math.round(s[1])]; };
  const at = (b.x0 + b.w / 2), Q = (u, z, w, h, c, a = 1, bias = .01) => { const p = [wp(u, z), wp(u + w, z), wp(u + w, z + h), wp(u, z + h)]; r.queue(at, T + .2, 0, g => { if (a < 1) px.blend(g, a, 'normal', () => px.poly(g, p, c)); else px.poly(g, p, c); }, { bias }); };
  const glow = (u, z, w, h, c, a) => { const p = [wp(u, z), wp(u + w, z), wp(u + w, z + h), wp(u, z + h)]; r.queue(at, T + .3, 0, g => px.blend(g, a, 'add', () => px.poly(g, p, c)), { bias: .02 }); };
  const txt = (s, u, z, c, sc = 1) => { const [x, y] = wp(u, z); r.queue(at, T + .4, 0, g => E.font.text(g, s, x, y, c, { align: 'center', scale: sc, outline: false, shadow: '#000' }), { bias: .03 }); };
  const win = (u, z, w, h, lit) => { Q(u - 1, z - 1, w + 2, h + 2, '#241c2c'); Q(u, z, w, h, lit ? '#ffc46c' : '#28304e'); if (lit) Q(u, z + h - 2, w, 2, '#fff0b4'); Q(u + w / 2 - .5, z, 1, h, '#d8d0c4'); Q(u - 2, z - 2.6, w + 4, 1.6, '#b0a8b8'); };
  const door = (u, w, h, c) => { Q(u - 1.5, 0, w + 3, h + 1.5, '#1c1624'); Q(u, 0, w, h, c); Q(u + 1.5, h * .5, w - 3, h * .36, '#ffd68c'); };
  const lit = (i, j, p = .55) => E.hash2(b.i * 11 + i, j) < p;
  const k = b.kind;
  if (k === 'tenement') { for (let j = 0; j < 3; j++) for (let u = 10, i = 0; u < b.w - 12; u += 25, i++) win(u, 34 + j * 26, 11, 16, lit(i, j)); door(b.w / 2 - 7, 14, 24, '#5a2e22'); Q(0, b.h - 6, b.w, 4, '#b8a8a0'); }
  else if (k === 'pork') { Q(4, 4, b.w - 36, 30, '#3a2418'); Q(6, 5.5, b.w - 40, 27, '#ffd9a0'); Q(6, 24, b.w - 40, 8, '#fff0c8'); for (let u = 10; u < b.w - 36; u += 6) { Q(u, 17, 2, 7, '#a83a3a'); Q(u + 3, 19, 2, 5, '#c8925a'); }
    door(b.w - 26, 14, 24, '#8a2a2a'); Q(8, b.h - 15, b.w - 16, 12, '#2a1a12'); txt(b.text, b.w / 2, b.h - 11, b.tc); glow(8, b.h - 15, b.w - 16, 12, b.tc, .12); }
  else if (k === 'cleaners') { Q(4, 4, b.w - 36, 30, '#1c2a3a'); Q(6, 5.5, b.w - 40, 27, '#9ac8e8'); for (let u = 10, i = 0; u < b.w - 36; u += 9, i++) { Q(u, 12, 6, 18, ['#e8e8f0', '#d84a4a', '#3a5ac8', '#e8c840'][i % 4]); Q(u + 2.7, 30, .6, 4, '#555'); }
    door(b.w - 26, 14, 24, '#3a5a7a'); Q(8, b.h - 17, b.w - 16, 12, '#14243a'); txt(b.text, b.w / 2, b.h - 13, b.tc); glow(8, b.h - 17, b.w - 16, 12, b.tc, .1); }
  else if (k === 'alley') { Q(8, 0, b.w - 16, 40, '#0e0a14'); Q(b.w - 12, 0, 2, b.h - 6, '#4a4a5a'); txt('SKULLZ', b.w * .5, 34, '#4ae8ff', 1); }
  else if (k === 'club') { Q(6, 0, b.w - 12, 38, '#120818'); door(b.w / 2 - 8, 16, 28, '#a01a3a'); for (let u = 10; u < b.w - 12; u += 12) Q(u, 40, 6, 12, E.hash2(b.i, u) > .5 ? '#ff3a8a' : '#6a2a9a');
    Q(8, b.h - 28, b.w - 16, 18, '#12060c'); txt(b.text, b.w / 2, b.h - 22, b.tc, 2); glow(8, b.h - 28, b.w - 16, 18, b.tc, .18); }
  else if (k === 'garage') { Q(10, 0, 70, 40, '#8e929e'); for (let z = 1; z < 40; z += 3) Q(10, z, 70, .8, '#5e626e'); door(b.w - 30, 14, 26, '#3a4a44'); Q(8, b.h - 22, 74, 12, '#1c1c24'); txt(b.text, 45, b.h - 18, b.tc); glow(8, b.h - 22, 74, 12, b.tc, .1); }
  else if (k === 'container' || k === 'office') {
    if (k === 'container') { for (let u = 2; u < b.w - 2; u += 4) Q(u, 0, 1.4, b.h, E.shade(b.color, -.18)); Q(b.w * .08, b.h * .38, b.w * .84, 10, '#14141a'); txt(b.text, b.w / 2, b.h * .38 + 2, '#e8e4d8'); Q(b.w - 6, 0, 2, b.h, '#5a5a62'); }
    else { for (let j = 0; j < 3; j++) for (let u = 10, i = 0; u < b.w - 12; u += 22, i++) win(u, 36 + j * 28, 12, 15, lit(i, j, .4)); door(b.w / 2 - 7, 14, 24, '#3a3a44'); Q(8, b.h - 22, b.w - 16, 11, '#12141a'); txt(b.text, b.w / 2, b.h - 19, '#d8d4c0'); } }
  Q(0, 0, b.w, 7, '#000', .3); Q(0, 0, b.w, 3, '#000', .3);                                     // street grime
}

/* ---- 30-play: the brawl. A chapter's street, the fighters on it, the sit-downs in it, and the HUD ---- */
const PLAY = (() => {
  const puffs = [], sparks = [], floaters = [];
  const talk = new E.Dialog(game, { bg: ['#4a1436', '#12040c'], border: '#f0b0c8', nameColor: '#f0c850', speed: 38 });
  Object.defineProperty(talk, 'voice', { configurable: true, get: () => blip(), set: () => {} });     // Animalese: each blip a new random syllable of the speaker's voice
  let lv, map, bg, shots, hero, foes, npcs, boxes, pickups, ducks, wave, lockX, go, intro, won, target, tgtT, lag, chain, chainT, demo, session, st, snap, ghosts = {}, hover = null, noteT = 0, clearedAt = 0, sent = 0, frameCount = 0, demoClock = 0;
  const isB = () => game.view.id === 'brawler';
  const pose = (a, k = .25) => isB() ? a + (Math.cos(a) > 0 ? k : -k) : a;
  const body = (x, y, r, extra) => Object.assign(new E.Body({ x, y, r }), { facing: 0, flash: 0, inv: 0, stun: 0, down: 0, floor: 0, rise: 0, t: 0, act: null }, extra);
  const dust = (x, y, n, size = 3) => { for (let i = 0; i < n; i++) puffs.push({ x: x + E.rand(-5, 5), y: y + E.rand(-2, 2), vx: E.rand(-40, 40), t: 0, s: size * E.rand(.7, 1.2) }); };
  const spark = (x, y, z, big) => sparks.push({ x, y, z, big, t: game.real + .035, rot: rnd() });
  const float = (x, y, z, text, color) => floaters.push({ x, y, z, text, color, t: 0 });
  const solid = (c, x, y, R) => { const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy); if (d < R && d > .01) { c.x = x + dx / d * R; c.y = y + dy / d * R; } };
  const lockEnd = () => Math.min(lv.len - 10, lockX);
  const live = () => foes.filter(f => !f.dead && f.hp > 0);

  /* ---- START ---- */
  function start(d) {
    d = d || {}; demo = !!d.demo; session = !!d.session; lv = LEVELS[d.level || 'street']; map = buildMap(lv); bg = lv.sky();
    snap = d.snap || JSON.stringify(S); st = { cash: 0, kills: 0, hits: 0, maxChain: 0, hurt: 0, time: 0, envelopes: 0, rage: 0, ducks: 0 };
    game.cam.bounds = v => { const b = map.bounds(v); if (v.id !== 'brawler') return b; const y1 = b.y1 - 9; return { x0: b.x0 + 8, x1: b.x1 - 8, y0: y1 - game.H * Math.max(1, game.zoom), y1 }; };
    shots = new E.Bullets(game, { plane: 'ground' });
    hero = body(54, 84, 7, { hp: heroMax(), max: heroMax(), lives: 3, grip: 0, stress: 0, rage: 0, bat: 0, rig: rig('vic'), batRig: rig('vicBat'), moves: heroMoves(), name: 'VIC', batT: 0 });
    game.follow(hero, { z: 34, lead: 24 });
    npcs = lv.npcs.map(n => body(n.x, n.y, 5, { n, facing: n.face, rig: rig(n.rig), done: false }));
    boxes = lv.boxes.map(([cx, y, kind]) => ({ x: cx * T, y, kind, hp: 2, flash: 0, box: true }));
    pickups = lv.pickups.map(([kind, x, y]) => ({ kind, x, y, got: false }));
    ducks = lv.pond ? Array.from({ length: lv.ducks }, (_, i) => ({ x: lv.pond.x + E.rand(-lv.pond.rx * .6, lv.pond.rx * .6), y: lv.pond.y + E.rand(-lv.pond.ry * .6, lv.pond.ry * .6), a: rnd() * TAU, t: rnd() * 5, fly: 0, i })) : [];
    foes = []; wave = 0; lockX = lv.waves[0].x + 40; go = 0; intro = 2.2; won = 0; target = null; tgtT = 0; lag = 1; chain = chainT = 0; hover = null; clearedAt = 0; frameCount = 0; demoClock = 0;
    lv.waves.forEach(w => { w.spawned = false; });
    puffs.length = sparks.length = floaters.length = 0; talk.open = false;
    L.enabled = true; L.ambient = lv.ambient; game.weather = lv.rain ? { kind: 'rain', amount: .75, wind: .25, lightning: .12 } : null;
    game.timeScale = 1; music(lv.song);
    nextStep.lock = false; exitDemo.lock = false;
  }

  /* ---- THE HERO ---- */
  const human = () => { const I = game.input; return { mv: I.move(), tap: k => I.buffered(k, .4), consume: k => I.consume(k), pressed: k => I.pressed(k) }; };
  const dirOf = h => isB() ? (Math.cos(h.facing) > 0 ? 1 : -1) : 1;
  const nearFoe = h => live().some(f => !f.knocked && Math.hypot(f.x - h.x, f.y - h.y) < 22 && (!isB() || Math.abs(f.y - h.y) < 9) && E.inArc(h, h.facing, f, 22, .9));
  function control(h, c, dt, truce) {
    const air = !h.onGround, busy = !!(h.act && h.act.busy), free = h.hp > 0 && !h.knocked && h.stun <= 0 && !won && !truce;
    const mv = free ? c.mv : [0, 0], md = game.view.screenDirToGround(mv[0], mv[1]), spd = h.rage > 0 ? 100 : 82;
    if (!h.knocked && h.stun <= 0) { const stop = busy && !air; h.vx = approach(h.vx, stop ? 0 : md[0] * spd, 900 * dt); h.vy = approach(h.vy, stop ? 0 : md[1] * spd * (isB() ? .63 : 1), 900 * dt); }
    if (!busy && Math.hypot(md[0], md[1]) > .2) h.facing = isB() ? (md[0] > .2 ? 0 : md[0] < -.2 ? Math.PI : h.facing) : Math.atan2(md[1], md[0]);
    const use = (m, key) => { if (m.press ? m.press() : m.start()) { h.act = m; c.consume(key); } };
    if (h.hp > 0 && !won && !truce && !h.knocked && h.rage <= 0 && h.stress >= 99.9 && c.pressed('special')) { if (h.act) h.act.cancel(); h.act = null; h.stun = 0; rage(h); }   // rage breaks a stagger: the panic button
    if (free && !busy) {
      const hug = nearFoe(h), key = c.tap('kick') ? 'kick' : 'attack', bat = h.bat > 0;
      if (!air && c.pressed('jump') && h.jump(250)) { h.act = null; sfx('jump'); dust(h.x, h.y, 3); }
      else if (c.pressed('special') && h.stress >= 100 && h.rage <= 0) rage(h);
      else if (air) { if (h.act !== h.moves.fly && c.tap(key)) use(h.moves.fly, key); }
      else if (c.tap('attack')) use(bat ? h.moves.bat : hug ? h.moves.clinch : h.moves.punch, 'attack');
      else if (c.tap('kick')) use(h.moves.kick, 'kick');
    }
    if (h.act && h.act.update(dt) === 'active') sfx('whoosh', { pitch: h.act.state.spec.kick ? .8 : 1 });
    const inReach = t => !t.knocked && Math.hypot(t.x - h.x, t.y - h.y) < 36 && (!isB() || Math.abs(t.y - h.y) < 12) && E.inArc(h, h.facing, t, 32, 1.1);
    const grab = t => { if (t.box) return; if (t.act) t.act.cancel(); const d = dirOf(h); Object.assign(t, { act: null, stun: .9, vx: 0, vy: 0, y: h.y, x: h.x + d * 20 }); };
    if (h.act) h.act.hits(foes.concat(boxes), inReach, t => h.act.state.spec.name === 'grab' ? grab(t) : strike(t, h.act.state, h));
    h.update(dt, map); fall(h, dt);
    h.x = clamp(h.x, 10, lockEnd()); h.y = clamp(h.y, Y0, Y1);
    if (lv.pond) { const p = lv.pond, dx = (h.x - p.x) / (p.rx * .9), dy = (h.y - p.y) / (p.ry * .9), d = Math.hypot(dx, dy); if (d < 1 && d > .01) { h.x = p.x + dx / d * p.rx * .9; h.y = p.y + dy / d * p.ry * .9; } }
    for (const b of boxes) if (!b.dead) solid(h, b.x, b.y, 13);
    for (const n of npcs) solid(h, n.x, n.y, 12);
    for (const m of pickups) if (!m.got && h.hp > 0 && Math.hypot(m.x - h.x, m.y - h.y) < 14) take(m);
  }
  function take(m) {
    m.got = true;
    if (m.kind === 'sandwich') { hero.hp = Math.min(hero.max, hero.hp + 24); hero.stress = Math.max(0, hero.stress - 12); sfx('heal'); float(m.x, m.y, 30, '+24 HP', '#8aff8a'); }
    else if (m.kind === 'bat') { hero.bat = 14 + S.up.bat * 6; sfx('powerup'); float(m.x, m.y, 30, 'BAT!', '#ffd23a'); game.note('A BAT. ' + game.input.label('attack') + ' TO SWING'); }
    else if (m.kind === 'cash') { S.cash += m.v; st.cash += m.v; sfx('coin'); float(m.x, m.y, 30, '+' + money(m.v), '#ffe070'); P.glints(m.x, m.y, 12, 6, '#ffe070'); }
  }
  function rage(h) {
    h.rage = 5; h.stress = 0; st.rage++; game.flash('#ff2a2a', .35, .5); game.shake(6); sfx('boom'); sfx('powerup');
    for (const f of live()) if (Math.hypot(f.x - h.x, f.y - h.y) < 80) { const b = BLOW.rage; f.hp -= b[0] * dmgMul(); f.stun = .5; f.act && f.act.cancel(); f.act = null; Object.assign(f, { knocked: true, bounce: .5, friction: 1.2 }); E.knockback(h, f, b[1], b[2]); chain++; chainT = 1.4; if (f.hp <= 0) ko(f); }
    for (const b of boxes) if (!b.dead && Math.hypot(b.x - h.x, b.y - h.y) < 80) { b.hp = 0; smash(b); }
    P.ring && P.ring(h.x, h.y, 4, 70, '#ff4a2a', .5); dust(h.x, h.y, 10, 5);
    game.note('FUHGEDDABOUDIT!', 1.6);
  }

  /* ---- BLOWS ---- */
  const contact = (c, { spec: s, u }) => s.kick ? c.z + lerp(s.z0, s.z1, 1 - (1 - u) ** 3) * c.rig.o.hipZ * c.rig.o.size : c.rig.hand(s.hand)[2];
  function strike(t, a, by) {
    const s = a.spec, b = BLOW[s.name] || [2, 10, 0], mul = dmgMul() * (by.rage > 0 ? 2 : 1) * (demo ? 3 : 1), heavy = b[0] * mul > 3 || b[2] > 0, dir = Math.sign(t.x - by.x) || 1, x = t.x - dir * 6, z = t.box ? 12 : contact(by, a);
    if (!t.box) { chain = chainT > 0 ? chain + 1 : 1; chainT = 1.4; st.maxChain = Math.max(st.maxChain, chain); }
    const dmg = Math.max(1, Math.round(b[0] * mul));
    game.hitFx(x, t.y + 1, z, { power: heavy ? 1.9 : 1.3, angle: dir > 0 ? 0 : Math.PI, color: '#ffd23a', sound: s.kick ? 'kick' : 'punch', damage: t.box ? undefined : dmg,
      textZ: t.box ? 0 : t.rig.head()[2] + 12 - z + (chain - 1) % 3 * 12, textScale: 2, textColor: heavy ? '#ffd23a' : '#ffffff' });
    spark(x, t.y + 1, z, heavy); t.flash = game.real + .05;
    if (t.box) return smash(t);
    P.bits(t.x, t.y, z + 6, heavy ? 7 : 3, ['#ffffff', '#c8e8ff', '#8ac8f0']);
    target = t; tgtT = 3; st.hits++; by.hits = (by.hits || 0) + 1;
    hero.stress = Math.min(100, hero.stress + 2 * stressMul() * (by.rage > 0 ? 0 : 1));
    if (hero.bat > 0 && ['slash', 'backslash', 'overhead'].includes(s.name)) { hero.batT = 0; if (--hero.bat <= 0) { sfx('bump'); game.note('THE BAT SNAPPED'); P.bits(hero.x, hero.y, 20, 10, ['#c8905a', '#6a4424']); } }
    knock(t, by, [dmg, b[1], b[2]]);
    if (t.hp <= 0) ko(t);
  }
  function knock(c, from, [dmg, force, lift]) {
    c.hp -= dmg; c.stun = .32; c.vx = c.vy = 0; c.rig.kick(-1); if (c.act) c.act.cancel(); c.act = null; c.aim = 0;
    if (c.k && c.k.boss && !lift && c.hp > 0) { c.stun = .12; force *= .3; }          // bosses shrug off the small stuff
    if (c.hp <= 0) { force = Math.max(force, 140); lift = Math.max(lift, 200); }
    if (lift) Object.assign(c, { knocked: true, bounce: .5, friction: 1.2 });
    E.knockback(from, c, force, lift);
  }
  function fall(c, dt) {
    if (!c.knocked) return;
    if (c.bounced || c.landed) { const first = !c.down; if (first) { c.down = 1; c.floor = .9; c.rig.kick(-4); } dust(c.x, c.y, first ? 8 : 3, first ? 4 : 3); game.shake(first ? 2.5 : 1); sfx('land'); }
    if (c.down && c.onGround) { c.friction = 4; if (Math.abs(c.vx) > 30 && rnd() < dt * 20) dust(c.x - Math.sign(c.vx) * 10, c.y, 1, 2); }
    if (c.down && (c.floor -= dt) <= 0 && c.hp > 0) { c.down = 0; c.rise = .7; c.inv = Math.max(c.inv, 1.6); }
    else if (c.rise > 0 && (c.rise -= dt) <= 0) Object.assign(c, { knocked: false, bounce: 0, friction: c.grip, t: .8 });
  }
  function ko(f) {
    if (f.dead) return; f.dead = 2.6; S.kills++; st.kills++; hero.stress = Math.min(100, hero.stress + 3 * stressMul());
    const [lo, hi] = f.k.cash, v = Math.round(E.rand(lo, hi) * (f.k.boss ? 1 : .8)); if (v >= 10 && (f.k.boss || rnd() < .55)) pickups.push({ kind: 'cash', x: f.x, y: f.y, v, got: false });
    if (f.k.boss) { pickups.push({ kind: 'sandwich', x: f.x + 20, y: f.y, got: false }); game.flash('#ffffff', .3, .5); game.timeScale = .3; game.after(.5, () => { game.timeScale = 1; }); sfx('boom'); talk.close(); }
  }
  function smash(b) {
    if (--b.hp > 0) return;
    b.dead = true; sfx('bump'); P.bits(b.x, b.y, 10, 26, ['#c8905a', '#9a6a3a', '#6a4424']); dust(b.x, b.y, 6, 4);
    const r = rnd(); if (r < .3) pickups.push({ kind: 'sandwich', x: b.x, y: b.y + 2, got: false }); else if (r < .75) pickups.push({ kind: 'cash', x: b.x, y: b.y + 2, v: Math.round(E.rand(8, 35)), got: false });
  }
  function hurtHero(f, a, h) {
    if (h.rage > 0 || demo) return;
    const more = f.act.step < f.act.moves.length - 1, b = BLOW[a.spec.name] || [2, 10, 0], z = contact(f, a), x = h.x + Math.sign(f.x - h.x) * 6, dm = Math.max(1, Math.round(b[0] * diff().foeDmg * (f.k.boss ? 1.15 : 1)));
    hit(h, f, [dm, b[1], b[2]], more, x, z);
  }
  function hit(h, from, b, more, x, z) {
    game.hitFx(x, h.y + 1, z, { power: b[2] ? 1.9 : 1.3, color: '#ff6a4a', sound: 'hurt', damage: b[0], textZ: h.rig.head()[2] + 12 - z, textScale: 2, textColor: '#ff8a7a' });
    spark(x, h.y + 1, z, b[2] > 0); knock(h, from, more ? [b[0], 8, 0] : b); h.flash = game.real + .05; h.inv = more ? 0 : .6; chainT = 0; st.hurt += b[0];
    h.stress = Math.min(100, h.stress + b[0] * 2.4 * stressMul());
    if (h.hp > 0) return;
    h.hp = 0; h.lives--;
    if (h.lives > 0) game.after(1.6, () => { Object.assign(h, { hp: h.max, inv: 2.5 }); dust(h.x, h.y, 6); sfx('powerup'); lag = 1; });
    else game.after(1.8, () => { if (session) { hubDone(false); } else game.go('over', { level: lv.id, snap }); });
  }

  /* ---- WAVES AND FOES ---- */
  function spawnWave(w) {
    const bossIn = w.foes.some(k => FOES[k].boss);
    w.foes.forEach((kind, i) => {
      const k = FOES[kind], side = wave && i % 2 ? -1 : 1, x = clamp(w.x + side * (Math.max(190, game.W / 2 / game.view.ax + 24) + i * 26), 12, lv.len - 12);
      const f = body(k.boss ? hero.x + 120 : x, Y0 + 12 + (i * 37) % 90, k.r, { k, name: k.name, hp: k.hp * diff().foeHp, maxhp: k.hp * diff().foeHp, facing: Math.PI, t: 1 + rnd(), friction: 5, grip: 5, aim: 0, base: k.speed,
        moves: k.moves.map(s => new E.Combo(s.map((m, j) => move(m, { wind: Math.max(E.MOVES[m].wind, j ? k.wind / 2 : k.wind) })))), rig: rig(k.rig) });
      if (k.boss) f.x = clamp(hero.x + 120, 12, lv.len - 12);
      foes.push(f);
      if (k.boss) { setVoice(kind); talk.say(k.say, { name: k.name, portrait: f.rig, portraitOpts: { zoom: 2.4, turn: -.6 }, auto: demo ? 2.4 : 0 }); music('boss'); }
    });
    return bossIn;
  }
  function foeAI(f, dt, truce) {
    f.stun -= dt; if (f.dead) f.dead -= dt;
    const h = hero, dx = h.x - f.x, dy = h.y - f.y, dist = Math.hypot(dx, dy), sz = f.rig.o.size, gap = 12 + 5.5 * sz, k = f.k;
    if (k.phase2 && !f.p2 && f.hp < f.maxhp * .5 && !f.dead) { f.p2 = true; f.base *= 1.35; game.flash('#ff2a2a', .25, .4); game.shake(5); sfx('boom'); float(f.x, f.y, 70, 'JOHNNY IS DONE TALKING', '#ff8a7a'); talk.say('You want it? Come and get it!', { name: k.name, portrait: f.rig, auto: 1.8, modal: false });
      for (const kind of ['associate', 'shooter']) { const x = clamp(h.x + (kind === 'associate' ? -190 : 190), 12, lv.len - 12), g = body(x, Y0 + 20 + rnd() * 70, FOES[kind].r, { k: FOES[kind], name: FOES[kind].name, hp: FOES[kind].hp * diff().foeHp, maxhp: FOES[kind].hp * diff().foeHp, facing: Math.PI, t: 1, friction: 5, grip: 5, aim: 0, base: FOES[kind].speed, moves: FOES[kind].moves.map(s => new E.Combo(s.map(m => move(m, { wind: FOES[kind].wind })))), rig: rig(FOES[kind].rig) }); foes.push(g); } }
    if (f.act) {
      if (f.act.update(dt) === 'active') sfx('whoosh', { pitch: .7 });
      f.act.hits([h], t => t.inv <= 0 && !t.knocked && Math.hypot(t.x - f.x, t.y - f.y) < 16 + 6 * sz && (!isB() || Math.abs(t.y - f.y) < 12) && E.inArc(f, f.facing, t, 16 + 6 * sz, 1), t => hurtHero(f, f.act.state, t));
      if (!f.act.busy) { if (f.act.step < f.act.moves.length - 1 && f.act.press()) f.vx = Math.sign(dx) * Math.max(0, Math.abs(dx) - gap) * 5; else f.act = null; }
    } else if (!f.knocked && f.stun <= 0 && h.hp > 0) {
      f.facing = isB() ? (dx > 0 ? 0 : Math.PI) : Math.atan2(dy, dx);
      if (k.ranged) {                                  // shooters keep their distance, aim (telegraph), then fire down the line
        const far = dist > 120, near = dist < 70;
        if (isB()) { f.vx = approach(f.vx, far ? Math.sign(dx) * f.base : near ? -Math.sign(dx) * f.base : 0, 300 * dt); f.vy = approach(f.vy, Math.abs(dy) > 4 ? Math.sign(dy) * 30 : 0, 300 * dt); }
        else { const m = far ? 1 : near ? -1 : 0; f.vx = approach(f.vx, dx / (dist || 1) * f.base * m, 300 * dt); f.vy = approach(f.vy, dy / (dist || 1) * f.base * m, 300 * dt); }
        if (f.aim > 0) { f.vx = f.vy = 0; if ((f.aim -= dt) <= 0) fireAt(f); }
        else if ((f.t -= dt) <= 0 && !truce && dist < 170 && (!isB() || Math.abs(dy) < 14)) { f.aim = .65; f.t = 1.8 + rnd(); sfx('charge', { pitch: 1.4 }); }
      } else if (isB()) {
        const tx = h.x + (dx > 0 ? -gap : gap) - f.x;
        f.vx = approach(f.vx, Math.abs(tx) > 4 ? Math.sign(tx) * f.base : 0, 300 * dt); f.vy = approach(f.vy, Math.abs(dy) > 2 ? Math.sign(dy) * 30 : 0, 300 * dt);
        if ((f.t -= dt) <= 0 && !truce && !h.knocked && Math.abs(tx) < 8 && Math.abs(dy) < 7) { f.act = pick(f.moves); f.act.press(); f.t = (k.boss ? .7 : 1 + rnd()) * (f.p2 ? .6 : 1); }
      } else {
        const go2 = dist > gap, ux = dx / (dist || 1), uy = dy / (dist || 1);
        f.vx = approach(f.vx, go2 ? ux * f.base : 0, 300 * dt); f.vy = approach(f.vy, go2 ? uy * f.base : 0, 300 * dt);
        if ((f.t -= dt) <= 0 && !truce && !h.knocked && dist < gap + 8) { f.act = pick(f.moves); f.act.press(); f.t = (k.boss ? .7 : 1 + rnd()) * (f.p2 ? .6 : 1); }
      }
    }
    f.update(dt, map); f.y = clamp(f.y, Y0, Y1); fall(f, dt);
    if (k.ranged && !f.dead) f.x = Math.min(f.x, lockEnd() + 4);                      // a shooter can't hide behind the screen's lock
    if (lv.pond) { const p = lv.pond, qx = (f.x - p.x) / (p.rx * .9), qy = (f.y - p.y) / (p.ry * .9), d = Math.hypot(qx, qy); if (d < 1 && d > .01) { f.x = p.x + qx / d * p.rx * .9; f.y = p.y + qy / d * p.ry * .9; } }
  }
  function fireAt(f) {
    const h = hero, a = Math.atan2(h.y - f.y, h.x - f.x), sp = 110; sfx('shoot', { pitch: .8 });
    shots.fire({ x: f.x + Math.cos(a) * 8, y: f.y + Math.sin(a) * 8, z: 22, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 2.5, team: 'foe', color: '#ffe070', life: 2.2, dmg: 4 });
    P.sparks(f.x + Math.cos(a) * 10, f.y + Math.sin(a) * 10, 22, 3, a);
  }

  /* ---- THE SIT-DOWNS: shopkeepers, Sal, the ducks ---- */
  const nearest = () => {
    let best = null, d0 = 30; for (const n of npcs) { const d = Math.hypot(n.x - hero.x, n.y - hero.y); if (d < d0 && !(n.done && !n.n.talk)) { d0 = d; best = { kind: 'npc', n, x: n.x, y: n.y }; } }
    if (lv.pond && !best) { const p = lv.pond; const d = Math.hypot((hero.x - p.x) / (p.rx + 18), (hero.y - p.y) / (p.ry + 18)); if (d < 1.15) best = { kind: 'ducks', x: p.x, y: p.y + p.ry }; }
    return best;
  };
  function chain2(lines, o, done) { talk.say(lines, Object.assign({ onDone: () => { done && done(); game.input.consumeAll(); } }, o)); }
  function interact(spot, auto) {
    if (!spot || talk.open || won) return;
    if (spot.kind === 'ducks') return feedDucks(auto);
    const n = spot.n, T = TALK[n.n.id]; if (!T) return;
    setVoice(n.n.voice); n.facing = hero.x < n.x ? Math.PI : 0;
    if (n.n.talk && auto) { if (!S.flags.sal) { S.flags.sal = 1; pickups.push({ kind: 'sandwich', x: n.x + 14, y: n.y + 6, got: false }); } return; }
    if (n.n.talk) { chain2(T.lines, { name: n.n.name, portrait: n.rig }, () => { if (!S.flags.sal) { S.flags.sal = 1; pickups.push({ kind: 'sandwich', x: n.x + 14, y: n.y + 6, got: false }); } }); return; }
    const pay = (lean) => { const [lo, hi] = n.n.cash, v = Math.round(lean ? hi : lo); n.done = true; n.pose = null; S.envelopes++; st.envelopes++; S.cash += v; st.cash += v; S.respect += lean ? -1 : 1; hero.stress = Math.min(100, hero.stress + (lean ? 8 : 0)); if (!lean) S.calm = Math.min(5, S.calm + 0);
      sfx('coin'); sfx('powerup'); P.glints(n.x, n.y, 30, 10, '#ffe070'); float(n.x, n.y, 60, '+' + money(v), '#ffe070'); float(n.x, n.y, 76, lean ? 'RESPECT -1 (FEAR +1)' : 'RESPECT +1', lean ? '#ff8a7a' : '#8aff8a'); };
    if (auto) { pay(false); return; }
    talk.say(T.ask, { name: n.n.name, portrait: n.rig, choices: ['Lean on him.', "Take what's there."], onChoice: i => { game.after(.02, () => { setVoice(n.n.voice); chain2(i === 0 ? T.lean : T.nice, { name: n.n.name, portrait: n.rig }, () => pay(i === 0)); }); } });
  }
  function feedDucks(auto) {
    const left = 3 + S.up.duck - st.ducks;
    if (left <= 0) { if (!auto) chain2("The pond is empty. They always leave eventually. You knew that.", { name: 'VIC' }); return; }
    st.ducks++; S.ducks++; hero.stress = Math.max(0, hero.stress - (35 + S.up.duck * 10)); hero.hp = Math.min(hero.max, hero.hp + 10); sfx('heal'); sfx('pickup');
    for (let i = 0; i < 4; i++) P.glints(lv.pond.x + E.rand(-20, 20), lv.pond.y + E.rand(-8, 8), 8, 3, '#bfe8ff');
    float(hero.x, hero.y, 60, 'STRESS DOWN', '#8ac8ff'); for (const d of ducks) d.fly = d.fly || (left === 1 ? 1 : 0);
    if (!auto) { setVoice('duck'); chain2(pick(TALK.ducks), { name: 'THE DUCKS' }); }
  }

  /* ---- UPDATE ---- */
  function update(dt) {
    common(); frameCount++;
    const I = game.input; demoClock += dt;
    if (demo && (userActive() || demoInput() || game.input.clicked())) return exitDemo();
    if (session && !hubGo()) { talk.update(0); return; }
    const truce = talk.update(dt);
    if (!demo && I.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (demo && Math.floor(demoClock) % 40 === 20 && Math.floor(demoClock - dt) % 40 !== 20) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    st.time += dt; S.time += dt;
    const h = hero;
    const drive = (c, o) => {
      const sz = c.rig.o.size, st2 = c.act && c.act.state, ok = !c.knocked && c.stun <= 0, low = st2 && st2.spec.name === 'sweep' && !(st2.phase === 'recover' && st2.u > .6), fly = c.knocked && !c.down && !(c.rise > 0);
      const R = c === h && h.bat > 0 ? h.batRig : c.rig;
      if (c === h) { const other = R === h.rig ? h.batRig : h.rig; other.update(dt, { x: c.x, y: c.y, z: c.z, facing: pose(c.facing) }); }
      R.update(dt, Object.assign({ x: c.x, y: c.y, z: c.z, vx: c.vx / sz, vy: c.vy / sz, facing: pose(c.facing), air: !c.onGround && !c.knocked, stance: ok && !c.k?.ranged ? 'guard' : null,
        hurt: !ok && !c.down && !(c.rise > 0), down: fly ? clamp(.6 - c.vz / 480, 0, 1) : undefined, point: !!(c.k && c.k.ranged && ok), aim: 0,
        pose: c.down ? 'down' : c.rise > .22 ? 'kneel' : c.rise > 0 || low ? 'crouch' : c.aim > 0 ? 'guard' : null, attack: st2 }, o));
      if (R !== c.rig) c.rig.lastView = R.lastView;
    };
    h.inv -= dt; h.stun -= dt; go -= dt; intro -= dt; tgtT -= dt; chainT -= dt; if (h.rage > 0) { h.rage -= dt; if (rnd() < dt * 30) P.add({ kind: 'ember', x: h.x + E.rand(-8, 8), y: h.y, z: 10, vx: E.rand(-12, 12), vz: E.rand(25, 60), g: -10, drag: 1, max: .7, color: '#ff4a2a' }); }
    if (won) won += dt;
    for (const p of puffs) { p.t += dt; p.x += p.vx * dt; p.vx *= 1 - dt * 5; } E.prune(puffs, p => p.t > .5); E.prune(sparks, s => game.real - s.t > .24);
    for (const f of floaters) f.t += dt; E.prune(floaters, f => f.t > 1.6);
    for (const [, x, y] of lv.street) if (lv.id === 'street' && rnd() < dt * .5) puffs.push({ x: x + E.rand(-4, 4), y, vx: E.rand(-8, 8), t: 0, s: 2 });
    for (const n of npcs) n.rig.update(dt, { x: n.x, y: n.y, facing: pose(n.facing), pose: n.done ? 'hips' : (n.n.talk ? null : 'wave') });
    for (const d of ducks) { d.t += dt; if (d.fly) { d.fly += dt; d.y -= 40 * dt; d.x += 22 * dt; } else { d.a += dt * E.rand(-1, 1) * 2; const p = lv.pond; d.x = clamp(d.x + Math.cos(d.a) * 4 * dt, p.x - p.rx * .7, p.x + p.rx * .7); d.y = clamp(d.y + Math.sin(d.a) * 2 * dt, p.y - p.ry * .7, p.y + p.ry * .7); } }
    lag = Math.max(h.hp / h.max, lag - dt * .35);
    // waves
    const w = lv.waves[wave];
    if (w && !w.spawned && h.x > w.x - 60) { w.spawned = true; const boss = spawnWave(w); lockX = Math.max(h.x + 20, w.x + (boss ? 110 : 100)); if (!boss) sfx('confirm'); }
    if (w && w.spawned && !live().length && !foes.some(f => f.act)) {
      wave++; go = 2.5; lockX = lv.waves[wave] ? lv.waves[wave].x + 40 : lv.len - 10;
      if (!lv.waves[wave]) { won = 1e-3; go = 0; clearedAt = S.time; music(null); sfx('powerup'); try { A.sting(SONGS.sting); } catch (e) { game.fail('sting', e); } game.follow(null); }
      else sfx('confirm');
    }
    const c = demo ? botCtl(dt) : human();
    if (demo) { h.hp = h.max; h.lives = 3; h.inv = Math.max(h.inv, .1); }
    // interactions: a prompt near a shopkeeper or the pond; the click on one
    const spot = nearest(); hover = spot;
    if (spot && !truce && !won && !(h.act && h.act.busy)) {
      const click = I.clicked(), clickHit = click && hoverPick && Math.hypot(click[0] - hoverPick[0], click[1] - hoverPick[1]) < 34;
      if (c.pressed('interact') || clickHit || (demo && c.interactNow)) { if (clickHit) I.consumeAll(); interact(spot, demo); }
    }
    control(h, c, dt, truce);
    if (session) hubTick(dt);
    for (const f of foes) foeAI(f, dt, truce);
    shots.update(dt, map);
    shots.hit([h], (b, t) => { if (t.inv > 0 || t.knocked || t.rage > 0 || demo) return; b.life = 0; hit(t, { x: b.x - b.vx, y: b.y - b.vy, vx: 0, vy: 0 }, [Math.max(1, Math.round(b.dmg * diff().foeDmg)), 30, 0], false, t.x, 22); }, 'foe');
    for (const a of [h, ...foes]) for (const b of foes) if (a !== b && !a.dead && !b.dead && a !== h) solid(b, a.x, a.y, a.r + b.r + 10);
    E.prune(foes, f => { const gone = f.dead !== undefined && f.dead <= 0; if (gone) dust(f.x, f.y, 6); return gone; });
    E.prune(pickups, p => p.got);
    if (won) game.focus(h.x - 60 / game.zoom, h.y, 34);
    drive(h, won > 1 ? { facing: pose(h.facing, lerp(.25, .7, Math.min(1, (won - 1) * 2))), pose: won > 4 ? 'hips' : 'cheer', stance: null } : {});
    for (const f of foes) drive(f);
    if (won > 2.5 && !session && (I.pressed('confirm') || demo && won > 6)) nextStep();
    if (session && won > 1.5 && !hub.sent) hubDone(true);
    if (demo && demoClock > 150) nextStep();
  }
  function nextStep() { if (nextStep.lock) return; nextStep.lock = true; flowNext(); }

  /* ---- THE ATTRACT BOT: it cheats (no damage, triple punches), clears the street, takes the envelopes, grabs the bat, feeds the ducks ---- */
  let hoverPick = null;
  function botCtl(dt) {
    const h = hero, ctl = { mv: [0, 0], want: new Set(), interactNow: false, tap(k) { return this.want.has(k); }, consume(k) { this.want.delete(k); }, pressed(k) { return this.want.has(k); } };
    const fs = live().sort((a, b) => Math.abs(a.x - h.x) + Math.abs(a.y - h.y) - Math.abs(b.x - h.x) - Math.abs(b.y - h.y)), f = fs[0], n = frameCount;
    const steer = (tx, ty, pre = 4) => { const dx = tx - h.x, dy = ty - h.y; ctl.mv = [Math.abs(dx) > pre ? Math.sign(dx) : 0, Math.abs(dy) > 3 ? Math.sign(dy) : 0]; return Math.hypot(dx, dy); };
    if (talk.open) return ctl;
    if (!botCtl.p || Math.hypot(h.x - botCtl.p[0], h.y - botCtl.p[1]) > 3 || demoClock - botCtl.p[2] > 1.2) { if (!botCtl.p || demoClock - botCtl.p[2] > 1.2) { botCtl.stuck = botCtl.p && Math.hypot(h.x - botCtl.p[0], h.y - botCtl.p[1]) < 3; } botCtl.p = [h.x, h.y, demoClock]; }
    if (botCtl.stuck && !f) { ctl.want.add('attack'); }
    if (f) {
      const side = h.x < f.x ? -1 : 1, tx = f.x + side * 24;
      if (!isB()) { const d = steer(f.x - side * 18, f.y, 3); if (d < 30) { ctl.mv = [0, 0]; h.facing = Math.atan2(f.y - h.y, f.x - h.x); } }
      else steer(tx, f.y);
      const near = Math.hypot(f.x - h.x, f.y - h.y) < 34, faced = isB() ? (side < 0 ? Math.cos(h.facing) > 0 : Math.cos(h.facing) < 0) === true : true;
      if (isB() && near && !faced) ctl.mv = [-side, 0];
      if (near && faced) { if (n % 9 === 0) ctl.want.add(n % 36 === 0 ? 'kick' : 'attack'); if (n % 150 === 0) ctl.want.add('jump'); }
      if (h.stress >= 100 && fs.length > 2 && h.rage <= 0) ctl.want.add('special');
      else if (h.stress < 100 && fs.length >= 3 && n % 200 === 0) h.stress = Math.min(100, h.stress + 60);
      return ctl;
    }
    const bat = pickups.find(p => p.kind === 'bat' && !p.got && Math.abs(p.x - h.x) < 150); if (bat && h.bat <= 0) { steer(bat.x, bat.y); return ctl; }
    const loot = pickups.find(p => (p.kind === 'cash' || p.kind === 'sandwich' && h.hp < h.max - 4 + 5) && !p.got && Math.abs(p.x - h.x) < 160); if (loot) { steer(loot.x, loot.y); return ctl; }
    const nn = npcs.find(q => !q.done && !q.n.talk && q.x > h.x - 40 && q.x < lockEnd() + 200 && q.x < h.x + 260); if (nn) { const d = steer(nn.x - 18, nn.y + 4, 3); if (d < 28) ctl.interactNow = true; return ctl; }
    if (lv.pond && st.ducks < 2 && hero.x > lv.pond.x - 90 && hero.x < lv.pond.x + 140) { const d = steer(lv.pond.x - lv.pond.rx - 14, lv.pond.y + 10, 3); if (d < 20) { ctl.interactNow = true; } return ctl; }
    const sal = npcs.find(q => q.n.talk && !S.flags.sal); if (sal && Math.abs(sal.x - h.x) < 60) { const d = steer(sal.x + 16, sal.y, 3); if (d < 26) ctl.interactNow = true; return ctl; }
    steer(Math.min(lockEnd(), h.x + 60), 84 + Math.sin(demoClock * .5) * 20, 4);
    return ctl;
  }
  function exitDemo() { if (exitDemo.lock) return; exitDemo.lock = true; game.input.consumeAll(); loopDemo = 0; game.go('title'); }

  /* ---- DRAW ---- */
  const lightAt = (x, y) => { let Lt = null, k = 0; for (const q of lv.lights) { const v = 1 - Math.hypot((x - q.x) / (q.r * 1.5), (y - q.y) / q.r); if (v > k) { k = v; Lt = q; } } return Lt ? { c: Lt.c, side: Lt.x > x ? 1 : -1, k } : { c: '#9a8ae0', side: -1, k: .2 }; };
  const RIM = E.mkCanvas(8, 8), rimG = E.ctx2d(RIM);
  function fighter(r, c, o = {}, R) {
    const Lt = lightAt(c.x, c.y), rg = R || c.rig;
    r.actor(c.x, c.y, c.z, (g, ox, oy) => {
      const Sz = g.canvas.width; if (RIM.width !== Sz) RIM.width = RIM.height = Sz;
      rg.draw(g, ox, oy, r.view);
      px.blend(g, .22 * Lt.k, 'source-atop', () => px.rect(g, 0, 0, Sz, Sz, Lt.c));
      px.blend(rimG, 1, 'copy', () => rimG.drawImage(g.canvas, 0, 0)); px.blend(rimG, 1, 'destination-out', () => rimG.drawImage(g.canvas, -Lt.side, 0));
      px.blend(rimG, 1, 'source-in', () => px.rect(rimG, 0, 0, Sz, Sz, Lt.c)); px.blend(g, .25 + .5 * Lt.k, 'normal', () => g.drawImage(RIM, 0, 0)); px.reset(g);
    }, Object.assign({ rim: false }, o));
  }
  function star(g, x, y, s) {
    const u = (game.real - s.t) / .24, R = (s.big ? 21 : 15) * game.zoom, n = u < .3 ? 6 : 8, pt = (i, d) => [x + Math.cos(i * Math.PI / n + s.rot) * d, y + Math.sin(i * Math.PI / n + s.rot) * d * .8];
    if (u < 0) return;
    const spikes = (r0, r1, c) => px.poly(g, Array.from({ length: n * 2 }, (_, i) => pt(i, i % 2 ? r1 : r0)), c);
    if (u < .3) { spikes(R, R * .3, '#ff6a1a'); spikes(R * .72, R * .24, '#ffe070'); px.disc(g, x, y, R * .28, '#ffffff'); }
    else if (u < .6) { spikes(R * 1.15, R * .5, '#ffd23a'); spikes(R * .85, R * .4, '#fff8e0'); }
    else for (let i = 0; i < 16; i += 2) px.line(g, ...pt(i, R * .8), ...pt(i, R * 1.3), '#ffe8a0', 2);
  }
  function draw(r) {
    const blink = t => t > 0 && t < 1 && Math.floor(game.real * 20) % 2 ? .25 : 1, Z = game.zoom;
    const at = (x, y, z, f, o) => r.queue(x, y, z, g => { const [sx, sy] = r.w(x, y, z); f(g, Math.round(sx), Math.round(sy)); }, o);
    bg.draw(r);
    map.drawFloor(r);
    for (const c of [hero, ...foes, ...npcs]) r.shadow(c.x, c.y, lerp(4.8 * c.rig.o.size * Math.max(.4, 1 - c.z / 60), 24, c.rig.downW || 0), .45);
    map.queueWalls(r);
    for (const b of lv.blocks) paintFront(r, b, lv);
    if (lv.id === 'street') { r.prop('awning', lv.blocks[1].x0 + 24, T + 2, 27, { size: .75, color: '#d83a3a' }); r.prop('awning', lv.blocks[1].x0 + 60, T + 2, 27, { size: .75, color: '#d83a3a' }); r.prop('awning', lv.blocks[3].x0 + 24, T + 2, 27, { size: .75, color: '#3a6ac8' }); }
    for (const x of lv.lamps) { r.prop('streetlamp', x, 44, 0, { size: 1.1, light: true }); L.add(x, 46, 60, 70, .9, { color: lv.dusk ? '#ffb45a' : '#c8e0ff' }); }
    for (const [kind, x, y, size] of lv.street) { r.prop(kind, x, y, 0, { size }); if (kind === 'firedrum') L.add(x, y, 30, 50, .8, { color: '#ff7a2a' }); }
    if (lv.pond) { const p = lv.pond; at(p.x, p.y, 0, (g, sx, sy) => px.blend(g, .3, 'add', () => px.ell(g, sx, sy, p.rx * .6 * Z, p.ry * .5 * Z, '#bfe0ff')), { bias: -.5 }); for (const x of [-30, 34, 8]) r.prop('bush', p.x + x, p.y - p.ry - 4, 0, { size: 1.4 }); for (const q of [[p.x - p.rx - 8, p.y + 4], [p.x + p.rx + 10, p.y + 14]]) r.prop('rock', q[0], q[1], 0, { size: 1.5 });
      for (const d of ducks) at(d.x, d.y, 2 + (d.fly ? 20 + d.fly * 10 : 0), (g, sx, sy) => { if (d.fly > 2) return; px.blend(g, d.fly ? Math.max(0, 1 - d.fly / 2) : 1, 'normal', () => px.sprite(g, DUCK, sx - 12, sy - 16 + Math.round(Math.sin(d.t * 3 + d.i) * 1.2), d.a % TAU > Math.PI)); }); }
    for (const b of boxes) if (!b.dead) { const key = b.kind; if (!BOXSPR[key]) BOXSPR[key] = E.prop(key, { size: .8, color: key === 'barrel' ? '#9a6030' : undefined }).frames[0]; r.sprite(b.x, b.y, 0, BOXSPR[key], { flash: b.flash > game.real }); }
    for (const m of pickups) { const bob = Math.sin(game.real * 4 + m.x) * 1.5; r.sprite(m.x, m.y, 4 + bob, m.kind === 'sandwich' ? SANDWICH : m.kind === 'bat' ? BATSPR : ENVELOPE); }
    for (const n of npcs) fighter(r, n, { flash: false });
    for (const f of foes) fighter(r, f, { flash: f.flash > game.real, alpha: blink(f.dead) });
    fighter(r, hero, { alpha: hero.inv > 0 && hero.hp > 0 && hero.stun <= 0 && (!hero.knocked || hero.rise > 0) && Math.floor(game.real * 16) % 2 ? .45 : 1, flash: hero.rage > 0 ? (Math.floor(game.real * 8) % 2 ? '#ff4a2a' : false) : hero.flash > game.real && '#ffb0a0', flashMix: hero.rage > 0 ? .3 : .5 }, hero.bat > 0 ? hero.batRig : hero.rig);
    for (const id in ghosts) { const g = ghosts[id]; if (!g || game.real - g.seen > 4) continue; const gr = ghostRig(id); gr.update(game.step || 1 / 120, { x: g.x, y: g.y, z: g.z || 0, facing: pose(g.f), vx: 0, vy: 0 }); r.actor(g.x, g.y, g.z || 0, (gg, ox, oy) => gr.draw(gg, ox, oy, r.view), { alpha: .5 }); at(g.x, g.y, 62, (gg, sx, sy) => E.font.text(gg, g.name, sx, sy, g.color, { align: 'center', ...TXT })); }
    for (const c of [hero, ...foes]) { const a = c.rig.atk; if (c.act && c.act.state && (c.act.state.phase === 'active')) (c === hero && hero.bat > 0 ? hero.batRig : c.rig).drawSmear(r, ['#ffffff', '#fff2c8', '#ffd07a', '#e8904a']); }
    for (const f of foes) if (f.aim > 0) at(f.x, f.y, 62, (g, sx, sy) => { E.font.text(g, '!', sx, sy, '#ff3a3a', { align: 'center', scale: 2, ...TXT }); const a = Math.atan2(hero.y - f.y, hero.x - f.x), [ex, ey] = r.w(f.x + Math.cos(a) * 90, f.y + Math.sin(a) * 90, 22), [bx, by] = r.w(f.x, f.y, 22); px.blend(g, .4, 'normal', () => px.line(g, Math.round(bx), Math.round(by), Math.round(ex), Math.round(ey), '#ff3a3a')); });
    shots.draw(r);
    for (const p of puffs) at(p.x, p.y, p.t * 16, (g, x, y) => { const u = p.t / .5, R = p.s * 1.6 * (u < .25 ? .5 + u * 2 : 1.25 - u) * Z; px.blend(g, u < .5 ? .5 : .25, 'normal', () => { px.ell(g, x, y, R * 1.5, R * .7, '#8a7e9a'); px.ell(g, x - R * .3, y - R * .3, R, R * .4, '#d0c8dc'); }); });
    for (const s of sparks) at(s.x, s.y, s.z, (g, x, y) => star(g, x, y, s), { bias: .5 });
    for (const f of floaters) at(f.x, f.y, f.z + f.t * 18, (g, x, y) => E.font.text(g, f.text, x, y, f.color, { align: 'center', ...TXT, scale: 1 }), { bias: .6 });
    if (hover && !talk.open && !won) { hoverPick = null; at(hover.x, hover.y, hover.kind === 'npc' ? 74 : 40, (g, sx, sy) => { hoverPick = [sx, sy]; const label = game.input.label('interact') + (hover.kind === 'ducks' ? '  FEED THE DUCKS' : hover.n.n.talk ? '  TALK' : '  COLLECT'); const w = E.font.width(label) + 10; E.ui.box(g, sx - w / 2, sy - 12, w, 13, WIN); E.font.text(g, label, sx, sy - 9, '#ffe070', { align: 'center', ...TXT }); }, { bias: .7 }); } else hoverPick = null;
    r.overlay(g => hud(g, r)); talk.draw(r);
  }

  /* ---- HUD ---- */
  function panel(g, x, name, f, lagF, color, right, y = 4, sub) {
    E.ui.box(g, x, y, 154, 40, right ? WINR : WIN);
    const c = right ? target : hero;
    if (c && c.rig) c.rig.drawPortrait(g, right ? x + 118 : x + 6, y + 5, 30, { zoom: 2.1, turn: right ? -.6 : .6, bg: right ? ['#a83a5a', '#2a0c1c'] : ['#5a6ac0', '#161030'], border: right ? '#f0b0c8' : '#d0c8f8', shadow: false, tint: c.hp > 0 ? undefined : '#808080' });
    const tx = right ? x + 5 : x + 42, t = E.tones(color), n = Math.round(106 * clamp(f, 0, 1));
    E.font.text(g, name, tx, y + 7, '#ffe070', Object.assign({ gradient: right ? ['#ffd8d8', '#ff7070'] : ['#fff6c0', '#f0a830'] }, TXT));
    if (!right) E.font.text(g, '×' + hero.lives, tx + E.font.width(name) + 5, y + 7, '#ffffff', TXT);
    E.ui.bar(g, tx, y + 23, 108, 10, lagF, '#fff0e0');
    if (n > 0) { px.rect(g, tx + 1, y + 24, n, 8, color); px.rect(g, tx + 1, y + 24, n, 2, t.hi); px.rect(g, tx + 1, y + 30, n, 2, t.sh); }
    if (sub) E.font.text(g, sub, right ? x + 112 : x + 150, y + 7, '#e8e4ff', right ? TXR : TXR);
  }
  function hud(g, r) {
    const W = r.W, H = r.H;
    if (won > 1.5) { if (!session) results(g, r); else E.font.title(g, 'CHAPTER CLEARED', W / 2, H / 2 - 20, { scale: 2, align: 'center' }); return; }
    panel(g, 4, 'VIC', hero.hp / hero.max, lag, '#ffd23a', false);
    // stress meter: fills with hits taken and landed; full: rage is ready
    const sy = 47, full = hero.stress >= 99.9, sw = 154;
    E.ui.box(g, 4, sy, sw, 36, WIN); E.font.text(g, 'STRESS', 10, sy + 4, full ? '#ff8a6a' : '#c8b8f0', TXT);
    E.ui.bar(g, 52, sy + 5, 96, 9, hero.stress / 100, '#fff0e0'); const sn = Math.round(94 * clamp(hero.stress / 100, 0, 1)); if (sn > 0) { px.rect(g, 53, sy + 6, sn, 7, full && Math.floor(game.real * 6) % 2 ? '#ffffff' : '#e8483c'); px.rect(g, 53, sy + 6, sn, 2, '#ff9a8a'); }
    if (full) E.font.text(g, game.input.label('special') + ' FUHGEDDABOUDIT!', 10, sy + 14, Math.floor(game.real * 4) % 2 ? '#ffe070' : '#ffffff', TXT);
    else if (hero.rage > 0) E.font.text(g, 'RAGE ' + hero.rage.toFixed(1), 10, sy + 14, '#ff8a6a', TXT);
    E.font.text(g, money(S.cash), 10, sy + 25, '#8aff8a', TXT); E.font.text(g, 'SCORE ' + String(score()).padStart(6, '0'), 150, sy + 25, '#e8e4ff', TXR);
    if (hero.bat > 0) { E.ui.box(g, 4, 86, 70, 14, WIN); E.font.text(g, 'BAT ×' + hero.bat, 10, 90, '#e8c890', TXT); }
    const foe = tgtT > 0 && target && (!target.dead || tgtT > 2.4) ? target : live().find(f => Math.hypot(f.x - hero.x, f.y - hero.y) < 56) || live().find(f => f.k.boss);
    if (foe && !won) { target = foe; const fx = Math.min(W, cornerX()) - 158; panel(g, fx < 162 ? W - 158 : fx, foe.name, foe.hp / foe.maxhp, 0, '#e8463c', true, fx < 162 ? 48 : 4); }
    if (chain > 1 && chainT > 0) { const s = String(chain), w = E.font.width(s, 3), hy = 106; E.ui.box(g, 6, hy, w + 44, 28, { bg: ['#d8402a', '#4a0a1a'], border: '#ffd070' }); E.font.title(g, s, 12, hy + 3, { scale: 3, colors: ['#ffffff', '#ffe070', '#ff9a2a'] }); E.font.title(g, 'HITS', 18 + w, hy + 13, { scale: 1, colors: ['#fff6d0', '#ffc860'] }); }
    if (!talk.open && !won && !demo) {   // the objective and the buttons, bottom of the screen
      const ln = [['jump', 'JUMP'], ['attack', hero.bat > 0 ? 'SWING' : 'PUNCH'], ['kick', 'KICK'], ['special', 'RAGE'], ['interact', 'TALK'], ['view', 'VIEW']].map(([a, w]) => game.input.label(a) + ' ' + w).join('   ');
      E.font.text(g, ln, W / 2, H - 12, '#c8c0e8', TXC);
      E.font.text(g, lv.objective, W / 2, H - 24, '#ffe7a8', TXC);
    }
    if (intro > 0) { const k = Math.min(1, (2.2 - intro) * 5, intro * 5), cw = 220, x = Math.round(W / 2 - cw / 2 + (1 - k) * (intro < 1 ? W : -W)), m = x + cw / 2, y = 76;
      E.ui.box(g, x, y, cw, 62, WIN); E.font.title(g, 'CHAPTER ' + (lv.id === 'street' ? 1 : 2), m, y + 5, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }); E.font.text(g, lv.name, m, y + 27, '#ffe8c8', TXC); E.font.text(g, lv.sub, m, y + 41, '#b8b0e0', TXC); }
    if (go > 0 && Math.floor(game.real * 3) % 2 === 0 && !won) E.font.title(g, 'GO →', W - 14, 96, { scale: 3, align: 'right', colors: ['#fff6c0', '#ffc040', '#e06a20'] });
    if (demo) { E.ui.box(g, W / 2 - 100, H - 22, 200, 14, { bg: '#000', alpha: .6, border: '#ffe070' }); E.font.text(g, 'ATTRACT MODE  -  PRESS ANYTHING', W / 2, H - 18, '#ffe070', TXC); }
    if (session) { E.font.text(g, 'AI HUB ROUND  ' + Math.max(0, Math.round(hubTimeLeft())) + 's', W / 2, 8, '#8ac8ff', TXC); const t = hubCountdown(); if (t > 0) E.font.title(g, String(Math.ceil(t)), W / 2, H / 2 - 20, { scale: 5, align: 'center' }); else if (t === Infinity || t === -1) E.font.text(g, 'WAITING FOR THE HUB…', W / 2, H / 2, '#fff', TXC); }
  }
  function results(g, r) {
    const W = r.W, X = Math.round(W * .27), grade = ordinalGrade(clamp((st.kills * 2 + st.envelopes * 8 + st.maxChain * 2 - st.hurt * .15) / (lv.waves.reduce((n, w) => n + w.foes.length, 0) * 2 + 24 + 40), 0, 1));
    E.font.title(g, 'CHAPTER CLEARED', X, 40, { scale: 2, align: 'center' });
    E.ui.box(g, X - 108, 60, 216, 110, WIN);
    const rows = [['THE TAKE', money(st.cash)], ['ENVELOPES', st.envelopes + (lv.id === 'street' ? ' / 3' : '')], ['KNOCKED OUT', st.kills], ['BEST CHAIN', st.maxChain], ['DAMAGE TAKEN', st.hurt], ['RAGE', st.rage], ['TIME', Math.floor(st.time / 60) + ':' + String(Math.floor(st.time % 60)).padStart(2, '0')]];
    rows.forEach(([k, v], i) => { E.font.text(g, k, X - 98, 68 + i * 12, '#b8b0d8', TXT); E.font.text(g, String(v), X + 98, 68 + i * 12, '#ffe070', TXR); });
    E.font.title(g, grade, X + 70, 148, { scale: 3, align: 'center', colors: ['#ffffff', '#ffe070', '#ff9a2a'] });
    if (Math.floor(game.real * 2) % 2 === 0) E.font.text(g, game.input.label('confirm') + ' CONTINUE', X, 176, '#ffe7a8', TXC);
  }
  const ghostRigs = {}; const ghostRig = id => ghostRigs[id] || (ghostRigs[id] = rig('vic', { colors: Object.assign({}, CAST.vic.colors, { cloth: (ghosts[id] && ghosts[id].color) || '#3b82f6', coat: (ghosts[id] && ghosts[id].color) || '#3b82f6' }) }));
  const cornerX = () => game.W;
  function jumpToWave(i) { lv.waves.forEach((w, k) => { w.spawned = k < i; }); wave = i; lockX = lv.waves[i].x + 40; hero.x = lv.waves[i].x - 55; foes.length = 0; }
  const state = () => ({ hero, foes, wave, lockX, won, lv, st, pickups, npcs, ducks, boxes, talk, demo, shots });
  const ghost = (id, d) => { ghosts[id] = Object.assign(ghosts[id] || {}, d, { seen: game.real }); };
  const mySnap = () => ({ x: Math.round(hero.x), y: Math.round(hero.y), z: Math.round(hero.z), f: +hero.facing.toFixed(2), s: score() });
  return { view: 'brawler', views: ['brawler', 'threequarter', 'topdown', 'iso'], res: 'ps1', pausable: true, propSize: 2.4, camera: { zoom: [.75, 1.5], tall: 1.5 }, input: INPUT,
    enter: start, update, draw, state, jumpToWave, ghost, mySnap, talkBox: talk, interactNow: interact, rage, strike, ko, take, spawnWave,
    back() { return false } };
})();

/* ---- 40-story: the writing, the kitchen table, the therapist, the ending, the flow between them ---- */
const TALK = {
  pork: { ask: ["Vic! Vic, come in, sit. I got capicola, I got a situation.", "Business is dead since they put the Shop-Rite on Route 21. People want their pork in a bag with a coupon. A coupon, Vic!", "Anyway. It's Tuesday. I know why you're here. I got it right here."],
    lean: ["I'm gonna say this once. Tuesday is Tuesday. The coupon people don't pay for your kid's braces.", "...Fine! FINE! Take it, take all of it. My father is rolling over in his grave. In the display case. Next to the provolone."],
    nice: ["Look, I'm not here to ruin your week. Just what's in the envelope.", "God bless you, Vic. You're a gentleman. Take a sandwich on the way out, on the house. Not literally on the house. The house is also yours."] },
  clean: { ask: ["Mr. Soprano... Vic. Walter. We said Walter.", "The Dry Clean business, nobody tells you, it's chemicals, it's lawyers, it's people who leave a suit for a year and then complain about the starch.", "I got your envelope. It's a little light. It's... it's a little light."],
    lean: ["Light. You say light. I got a suit hanging back there from a guy who 'went to Florida' in 2019. You know what's in the pockets? Nothing. That's what I'm looking at right now.", "Okay. Okay! Take the register. I'll tell my wife it was the vending machine."],
    nice: ["Walter. Easy. A bad month is a bad month. Next Tuesday you make it up, and we never speak of this again.", "You're a good man. I mean that. Not good good. But good."] },
  club: { ask: ["Hey, Vic. Easy on the face, it's a long night. Dennis is in the back crying about the liquor license again.", "I got what you came for. The girls been asking if the boss is gonna say a few words at the staff meeting. Don't say a few words.", "It's under the register. Where it always is. Where everything always is."],
    lean: ["Excuse me? Count it. COUNT IT, then, in front of me. You're gonna count it like I'm a bank?", "...Ugh. Take the tip jar too. Ruin my Tuesday. This is why I'm in therapy. Don't look at me like that. Everybody's in therapy."],
    nice: ["Thanks for not making it weird. It's always weird.", "You know, you're the only one in this business who says 'please.' It's unsettling."] },
  sal: { lines: ["Vic! Over here. Come on, the rain's gonna ruin my shoes. These are suede.", "Listen. Johnny Salt is in the yard tonight. Him and his boys. He's been telling people you got soft. You got soft! You! I almost laughed.", "There's a bat by the ducks. Don't ask where it came from. Not 'why.' WHERE. Because the where is a whole story.", "And hey. The ducks. Go see the ducks. Do the breathing. The doctor said. You come back more... Zen. Less... hitting people with a bat.", "Take this sandwich. It's capicola. We call it gabagool but my mother would slap me. Be careful. They have guns, and I have suede."] },
  ducks: [["The ducks look at you. You look at the ducks. Nobody says anything. It's the best conversation you've had all week."], ["A duck tilts its head. It knows. They always know."], ["You breathe in. You breathe out. You think about your father, your uncle, and a sandwich. Mostly the sandwich."], ["Quack. Which, in duck, is 'it's fine, it's all fine, you're the boss of nothing and everything.'"]]
};

/* A scene is a backdrop, a cast on a floor, and beats: ['who', 'text'] or { ask, who, options: [{ label, fx, reply: [[who, text]] }] } */
const CUTS = {
  intro: { bg: 'kitchen', song: 'home', title: 'CHAPTER ZERO  -  A MORNING IN THE SUBURBS', cast: [['vic', 'vic', 130, 'hips'], ['connie', 'connie', 190]],
    beats: [['narr', 'North Caldwell, New Jersey. Seven a.m. The pool is a rectangle of cold water and the ducks have been gone eleven days.'],
      ['connie', "You're up. You're never up. Is it the thing with your chest again? Because you're not allowed to die before the kitchen is done. The contractor is on payment four."],
      ['vic', "It's not my chest. It's just... something is coming. You ever feel something is coming? Like the whole world's a pot on low, and nobody's looking at the lid?"],
      { who: 'connie', ask: "That's what the doctor said you'd say. You are going Thursday, right?", options: [
        { label: "Thursday. Yes. I'm going.", fx: { calm: 1 }, reply: [['connie', 'Good. Wear the blue one. It makes you look like you listen.']] },
        { label: "I'm not talking to some woman about my feelings.", fx: { respect: 1 }, reply: [['connie', "Everybody's talking to some woman about their feelings, Vic. That's why she has a boat."]] }] },
      ['narr', "The phone rings. It is Sal Pistachio. It is always Sal Pistachio, and it is never good, and it is always about a sandwich."],
      ['vic', "Tuesday. Collections. Three stops. Pork store, dry cleaner, the club. It's nothing. It's a walk. A man takes a walk."],
      ['connie', 'A man takes a walk and comes home with blood on his shoes and a story about a guy named Paulie. Take the umbrella.'],
      ['narr', 'Tuesday begins. Take the umbrella. Do not take the umbrella.']] },
  therapy: { bg: 'office', song: 'therapy', title: 'DR. MARCHETTI  -  THURSDAY, 4 P.M.', cast: [['vic', 'vic', 130, 'hips'], ['doc', 'doc', 195]],
    beats: [['doc', "Vic. Sit. You look like a man who ran a marathon in a suit. Did you? Tell me you didn't."],
      ['vic', 'Three envelopes, a guy named Fat Dino, a hat. I hit a person with a trash can lid. Is that a thing? The lid?'],
      ['doc', "Let's talk about the lid. Not the lid. What the lid is. What was happening in your body when your hand picked it up?"],
      { who: 'vic', ask: "(You think about it. You think about the sandwich.)", options: [
        { label: "Honestly? It felt good. It felt like air.", fx: { stress: -25, calm: 1 }, reply: [['doc', "That's the most honest thing you've said in six weeks. 'Air.' Hold onto that."], ['vic', "Is it normal? To feel good about the lid?"], ['doc', 'It is normal to feel good about the lid. It is not normal to build a life around the lid.']] },
        { label: "I don't have to explain myself to you.", fx: { respect: 1, stress: 10 }, reply: [['doc', "You don't. But you're paying a hundred and eighty an hour to not explain yourself. We could go to a diner."], ['vic', "...The diner has pie."]] },
        { label: "I had a dream about a duck.", fx: { calm: 1 }, reply: [['doc', "Ah. The ducks. We never finished the ducks."], ['vic', "It talked. It said 'they always leave.' Then it ate my car."], ['doc', "Dreams are... generous. Let's call that a breakthrough and move on."]] }] },
      ['doc', "Here's what I'm worried about. Not the violence. The violence you know. It's the Sunday dinners. The way a man like you tries to keep everything in the room by being the biggest thing in it."],
      ['vic', "A man has to be the biggest thing in the room, or the room eats him."],
      ['doc', "And what happens when a man is the room?"],
      ['vic', "...Then he can't leave."],
      ['doc', "That's our time. Thursday. And Vic? Feed the ducks, the real ones. It helps. I'm not allowed to prescribe it, but it helps."],
      ['narr', "You walk out into the parking lot. Your phone shows eleven calls from Sal and one from a number you don't recognize. It's Johnny Salt's. It's always Johnny Salt."]] },
  ending: { bg: 'kitchen', song: 'home', title: 'CHAPTER LAST  -  A LATE SUPPER', cast: [['vic', 'vic', 118, 'hips'], ['connie', 'connie', 170], ['sal', 'sal', 222]],
    beats: [['narr', 'The yard is quiet. Johnny Salt is a shape under a blue tarp. The rain is the only thing that never stops.'],
      ['sal', "He's gone. Done. Over. You know what I'm gonna do? I'm gonna eat. A man needs to eat after a thing like this."],
      ['connie', "I made a gravy. It's been going since morning, and you know what? You can taste when somebody's holding something in."],
      ['vic', "Maybe I'm holding something in. Maybe I'm just... a guy at a table. With a family. A family. Look at 'em. It's the whole world, right here."],
      ['sal', "You hear that? The bell on the door. Somebody's coming in."],
      ['narr', "You look up. You always look up. And that's when it—"]] }
};
/* the scene: backdrop, cast, dialog; choices carry effects into the profile */
const SCENE = (() => {
  const talk = new E.Dialog(game, { bg: ['#4a1436', '#12040c'], border: '#f0b0c8', nameColor: '#f0c850', speed: 38 });
  Object.defineProperty(talk, 'voice', { configurable: true, get: () => blip(), set: () => {} });
  const stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'plain', side: '#2a2230' } }, edges: 'open' });
  const MID = 160;
  let cut, cast, i, done, t, demo, fade, cb, pickT = 0;
  const NAMES = { vic: 'VIC', connie: 'CONNIE', doc: 'DR. MARCHETTI', sal: 'SAL', narr: '' };
  function say(who, text, o) { setVoice(who); talk.say(text, Object.assign({ name: NAMES[who] || '', portrait: cast[who] && cast[who].rig, portraitOpts: { zoom: 2.2, turn: who === 'vic' ? .6 : -.6 }, auto: demo ? 2.6 : 0, onDone: () => { game.input.consumeAll(); step(); } }, o)); }
  function step() {
    if (i >= cut.beats.length) { done = true; fade = 0; if (cut.id === 'ending') music(null); game.after(cut.id === 'ending' ? 3.6 : .4, () => flowNext()); return; }
    const b = cut.beats[i++];
    if (Array.isArray(b)) return say(b[0], b[1]);
    setVoice(b.who);
    talk.say(b.ask, { name: NAMES[b.who], portrait: cast[b.who] && cast[b.who].rig, choices: b.options.map(o => o.label), onChoice: n => {
      const o = b.options[n]; for (const k in o.fx) { if (k === 'stress') S.stress = clamp((S.stress || 0) + o.fx[k], 0, 100); else S[k] = (S[k] || 0) + o.fx[k]; }
      S.calm = clamp(S.calm, 0, 5); let k = 0; const chain = () => { if (k >= o.reply.length) return step(); const [w, tx] = o.reply[k++]; say(w, tx, { onDone: () => { game.input.consumeAll(); game.after(.02, chain); } }); }; game.after(.02, chain); } });
  }
  function enter(d) {
    cut = CUTS[d.id]; demo = !!d.demo; i = 0; done = false; t = 0; cast = {};
    for (const [id, rigId, x, pz] of cut.cast) cast[id] = { rig: rig(rigId), x, pz, face: x < MID + 60 ? 0 : Math.PI };
    music(cut.song); game.follow(null); game.cam.bounds = null; game.cam.room = null; L.enabled = false; game.weather = null; talk.open = false; game.resetCamera();
    game.after(.5, step);
  }
  function update(dt) {
    common(); t += dt;
    if (demo && (userActive() || demoInput())) { game.input.consumeAll(); loopDemo = 0; return game.go('title'); }
    talk.update(dt);
    if (demo && talk.open && talk.choices && !talk.typing && talk.i >= talk.pages.length - 1) { pickT += dt; if (pickT > 1.6) { pickT = 0; const oc = talk.onChoice; talk.close(); oc && oc(0); } } else pickT = 0;
    game.focus(MID, 0, 32 + (game.H / 2 - 88) / -game.view.bz);
    for (const id in cast) { const c = cast[id]; c.rig.update(dt, { x: c.x, y: 0, z: 32, facing: c.face, vx: 0, vy: 0, pose: c.pz, expr: talk.open && talk.speaker === id ? 'shout' : undefined }); }
  }
  function backdrop(r) {
    const FY = Math.round(r.w(MID, 0, 32)[1]);
    if (cut.bg === 'kitchen') {
      r.sky(['#2a1a24', '#4a2a30', '#6a3a34']);
      r.queue(MID, -900, 0, g => { const W = r.W, H = r.H, y0 = Math.round(H * .18), floorY = FY;
        px.rect(g, 0, y0, W, floorY - y0, '#7a5a48'); for (let x = 0; x < W; x += 14) px.rect(g, x, y0, 1, floorY - y0, '#6a4a3a');
        px.rect(g, 0, floorY, W, H - floorY, '#4a3a30'); for (let x = -((game.time * 0) | 0); x < W; x += 24) px.rect(g, x, floorY, 1, H - floorY, '#3a2c24');
        px.rect(g, W * .12, y0 + 10, 56, 44, '#101a30'); px.rect(g, W * .12 + 2, y0 + 12, 52, 40, '#1a2c52'); px.rect(g, W * .12 + 27, y0 + 12, 2, 40, '#c8b8a0'); px.rect(g, W * .12 + 2, y0 + 31, 52, 2, '#c8b8a0'); for (let k = 0; k < 6; k++) px.dot(g, W * .12 + 8 + k * 8, y0 + 18 + (k * 7) % 20, '#e8e0a8');
        px.rect(g, W * .62, y0 + 6, 46, 90, '#d8d4cc'); px.rect(g, W * .62, y0 + 6, 46, 3, '#eeeae2'); px.rect(g, W * .62 + 34, y0 + 20, 3, 18, '#8a8680');
        px.rect(g, W * .35, floorY - 20, 130, 8, '#8a5a30'); px.rect(g, W * .35 + 8, floorY - 12, 6, 24, '#6a4220'); px.rect(g, W * .35 + 116, floorY - 12, 6, 24, '#6a4220');
        for (const [dx, c] of [[16, '#e8e4d8'], [56, '#e8e4d8'], [96, '#e8e4d8']]) { px.ell(g, W * .35 + dx + 8, floorY - 22, 10, 3, c); px.dot(g, W * .35 + dx + 8, floorY - 24, '#c8402a'); }
        px.rect(g, W * .35 + 50, floorY - 36, 24, 14, '#a83a2a'); px.rect(g, W * .35 + 50, floorY - 36, 24, 3, '#d86a4a'); px.rect(g, W * .35 + 72, floorY - 32, 5, 4, '#a83a2a'); });
    } else {
      r.sky(['#1c2230', '#2a3040', '#3a4050']);
      r.queue(MID, -900, 0, g => { const W = r.W, H = r.H, y0 = Math.round(H * .15), floorY = FY;
        px.rect(g, 0, y0, W, floorY - y0, '#5a6a6a'); px.rect(g, 0, floorY, W, H - floorY, '#3a3028'); for (let x = 0; x < W; x += 28) px.rect(g, x, floorY, 14, H - floorY, '#463a30');
        px.rect(g, W * .08, y0 + 12, 70, 80, '#0c1220'); px.rect(g, W * .08 + 3, y0 + 15, 64, 74, '#1c2a40'); for (const [dx, dy] of [[10, 8], [40, 20], [26, 50]]) px.disc(g, W * .08 + dx, y0 + 15 + dy, 1, '#e8e8f0'); px.rect(g, W * .08 + 33, y0 + 15, 2, 74, '#8a8a90');
        px.rect(g, W * .45, floorY - 26, 90, 22, '#6a3a2a'); px.rect(g, W * .45, floorY - 34, 90, 10, '#8a4a3a'); px.rect(g, W * .45 - 6, floorY - 30, 8, 26, '#5a2e22'); px.rect(g, W * .45 + 88, floorY - 30, 8, 26, '#5a2e22');
        px.rect(g, W * .78, y0 + 20, 36, 46, '#2a2a30'); px.rect(g, W * .78 + 3, y0 + 23, 30, 40, '#4a6a7a'); px.rect(g, W * .78 - 12, floorY - 30, 3, 30, '#3a2a20'); px.disc(g, W * .78 - 11, floorY - 36, 6, '#2e6a3a'); px.disc(g, W * .78 - 8, floorY - 42, 5, '#3a8a4a'); });
    }
  }
  function draw(r) {
    r.sky(['#101018', '#201820']); backdrop(r);
    for (const id in cast) { const c = cast[id]; r.shadow(c.x, 0, 12, .4); r.actor(c.x, 0, 32, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view)); }
    r.overlay(g => { E.ui.box(g, r.W / 2 - 150, 6, 300, 16, { bg: '#000', alpha: .65, border: '#a89ad8' }); E.font.text(g, cut.title, r.W / 2, 11, '#ffe8c8', TXC);
      if (demo) E.font.text(g, 'ATTRACT MODE  -  PRESS ANYTHING', r.W / 2, r.H - 14, '#ffe070', TXC); if (done) px.rect(g, 0, 0, r.W, r.H, '#000'); });
    talk.draw(r);
  }
  return { view: 'side', views: ['side'], input: INPUT, res: 'ps1', enter, update, draw, back: () => false, talk };
})();

/* ---- THE KITCHEN TABLE: between chapters, count the money, spend it, save, go back out ---- */
const KITCHEN = (() => {
  let menu, mode, note, t, demo, backAt = -9;
  const upMenu = () => new E.Menu(game, UPGRADES.map(u => ({ label: u.name + '  ' + (S.up[u.id] >= u.max ? 'MAX' : money(upCost(u))) + '  [' + S.up[u.id] + '/' + u.max + ']', disabled: S.up[u.id] >= u.max })).concat(['BACK']), { y: 70, onPick: i => { if (i >= UPGRADES.length) return show('main'); buy(UPGRADES[i]); }, onCancel: () => show('main') });
  function buy(u) { const c = upCost(u); if (S.cash < c) { note = "That's more than you have. Count again."; sfx('cancel'); return; } S.cash -= c; S.up[u.id]++; sfx('powerup'); note = u.name + ' bought. ' + u.text; menu = upMenu(); menu.i = Math.min(UPGRADES.indexOf(u), UPGRADES.length); }
  function show(m) {
    if (m === 'main' && mode === 'shop') backAt = game.real;
    mode = m; note = '';
    if (m === 'main') menu = new E.Menu(game, ['GO OUT: ' + (FLOW[S.step] === 'therapy' ? 'DR. MARCHETTI' : 'THE YARD'), 'SPEND THE ENVELOPES', 'SAVE THE GAME', 'LEAVE THE TABLE (TITLE)'], { y: 100, onPick: i => { if (i === 0) flowNext(); else if (i === 1) show('shop'); else if (i === 2) { save(); } else game.go('title'); } });
    else menu = upMenu();
  }
  function save() { try { game.saves.save(0); note = 'Saved to slot 1. Somewhere, a guy writes it in a ledger.'; sfx('confirm'); } catch (e) { note = 'The ledger will not open.'; } }
  function enter(d) { demo = !!(d && d.demo); t = 0; music('home'); L.enabled = false; game.weather = null; game.follow(null); game.cam.bounds = null; game.cam.room = null; game.resetCamera(); show('main'); game.saves.canSave = !demo; if (demo) { S.cash = Math.max(S.cash, 500); } if (!demo) autosave(); }
  function update(dt) {
    common(); t += dt;
    if (demo) { if (userActive() || demoInput()) { game.input.consumeAll(); loopDemo = 0; return game.go('title'); } if (t > 1.6 && mode === 'main') show('shop'); if (t > 2 && mode === 'shop' && !update.bought) { update.bought = 1; for (const u of UPGRADES.slice(0, 3)) if (S.cash >= upCost(u)) buy(u); } if (t > 4.5) { update.bought = 0; flowNext(); } return; }
    menu.update(dt);
  }
  function draw(r) {
    r.sky(['#2a1a24', '#4a2a30', '#6a3a34']);
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#2a1a24'); for (let y = 0; y < H; y += 3) px.rect(g, 0, y, W, 1, '#32202c');
      E.font.title(g, 'THE KITCHEN TABLE', W / 2, 10, { align: 'center', scale: 2, colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      E.ui.box(g, W / 2 - 170, 34, 340, 22, WIN); E.font.text(g, 'CASH  ' + money(S.cash), W / 2 - 160, 41, '#8aff8a', TXT); E.font.text(g, 'RESPECT ' + S.respect + '   CALM ' + S.calm + '   ENVELOPES ' + S.envelopes, W / 2 + 160, 41, '#e8e4ff', TXR);
      const line = FLOW[S.step] === 'therapy' ? "Connie left a plate. Under the foil, a note: 'Thursday. Dr. M. Don't be late.'" : "Sal called. Johnny Salt is at the yard. It's raining. It's always raining.";
      if (mode === 'main') E.font.text(g, line, W / 2, H - 40, '#c8b8f0', TXC);
      if (mode === 'shop') { const u = UPGRADES[menu.i]; if (u) E.font.text(g, u.text, W / 2, H - 40, '#c8b8f0', TXC); }
      if (note) E.font.text(g, note, W / 2, H - 26, '#ffe070', TXC);
      E.font.text(g, game.input.label('confirm') + ' SELECT   ' + game.input.label('cancel') + ' BACK', W / 2, H - 12, '#8a8ab0', TXC);
      if (demo) E.font.text(g, 'ATTRACT MODE  -  PRESS ANYTHING', W / 2, H - 12, '#ffe070', TXC);
    });
    menu.draw(r);
  }
  // Escape is both 'cancel' and 'pause': backing out of the shop must not also open the pause menu
  return { view: 'side', views: ['side'], input: INPUT, res: 'ps1', get pausable() { return mode !== 'shop' && game.real - backAt > .3; }, enter, update, draw, back: () => { if (mode === 'shop') { show('main'); return true; } return false; } };
})();

/* ---- the flow: intro, street, kitchen, therapy, yard, ending ---- */
function autosave() { try { game.saves.autosave(); } catch (e) { /* storage blocked */ } }
let demoRun = false;
function flowNext() {
  S.step++;
  const id = FLOW[S.step];
  if (demoRun && (!id || id === 'ending')) { demoRun = false; return game.go('title'); }
  if (!id) return game.go('credits', { after: 'title' });
  if (id === 'intro' || id === 'therapy' || id === 'ending') game.go('cut', { id, demo: demoRun });
  else if (id === 'kitchen') game.go('kitchen', { demo: demoRun });
  else game.go('play', { level: id, demo: demoRun });
}
function beginRun(demo) {
  demoRun = !!demo; S = blank(); S.step = 0; S.cash = demo ? 400 : 0;
  game.go('cut', { id: 'intro', demo: demoRun });
}
game.saves.write = () => ({ data: JSON.parse(JSON.stringify(S)), place: FLOW[S.step] === 'therapy' ? 'THE KITCHEN TABLE' : 'THE KITCHEN TABLE', level: S.step });
game.saves.read = save => { S = Object.assign(blank(), save.data); demoRun = false; game.go('kitchen', {}); };

/* ---- game over ---- */
const overMenu = new E.Menu(game, ['TRY THE CHAPTER AGAIN', 'LEAVE THE TABLE'], { y: 120, onPick: i => { if (i === 0) { S = Object.assign(blank(), JSON.parse(overMenu.snap)); game.go('play', { level: overMenu.level, snap: overMenu.snap }); } else game.go('title'); } });
scenes.over = {
  view: 'side', input: INPUT, res: 'ps1',
  enter(d) { overMenu.i = 0; overMenu.snap = d.snap; overMenu.level = d.level; music(null); sfx('die'); game.follow(null); game.focus(0, 0, 0); L.enabled = false; game.weather = null; },
  update(dt) { common(); overMenu.update(dt); },
  back() { game.go('title'); return true; },
  draw(r) { r.sky(['#12040c', '#3a0c1c', '#6a1a28']); overMenu.y = Math.round(r.H / 2) + 8;
    r.overlay(g => { E.font.title(g, 'WHACKED', r.W / 2, Math.round(r.H / 2) - 60, { align: 'center', scale: 4, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' }); E.font.text(g, "Nobody's coming to the funeral. They're all at the buffet.", r.W / 2, Math.round(r.H / 2) - 18, '#e8b8b8', TXC); }); overMenu.draw(r); }
};

/* ---- 50-title: the hub (AI Hub session), the title with its attract mode, the About / credits ---- */
const AH = typeof window !== 'undefined' && window.AIHub ? window.AIHub : null;
const hub = { active: false, info: null, started: false, sent: false, ended: false, lastSend: 0, lastProg: 0, timeUp: false, names: {} };
function hubGo() { return hub.active && !hub.ended && AH.time() >= 0; }
function hubCountdown() { const t = AH.time(); return t === -Infinity ? -1 : t < 0 ? -t / 1000 : 0; }
function hubTimeLeft() { return hub.info && hub.info.limitMs ? (hub.info.limitMs - Math.max(0, AH.time())) / 1000 : 0; }
function hubTick(dt) {
  if (!hub.active || hub.ended || !hubGo()) return;
  const now = game.real;
  if (now - hub.lastSend > .12) { hub.lastSend = now; AH.send(Object.assign({ k: 'p' }, PLAY.mySnap()), { reliable: false }); }
  if (now - hub.lastProg > 1) { hub.lastProg = now; AH.progress({ score: score(), label: money(S.cash) + ' · ' + S.kills + ' KO' }); }
}
function hubDone(won) {
  if (!hub.active || hub.sent) return; hub.sent = true;
  const st = PLAY.state().st;
  AH.result({ score: score() + (won ? 2000 : 0), stats: { cash: S.cash, kills: S.kills, envelopes: st.envelopes, chain: st.maxChain, time: Math.round(st.time) }, awards: [won ? { title: 'MADE MAN', detail: 'cleared Tuesday Collections' } : { title: 'WHACKED', detail: 'did not finish the street' }].concat(st.envelopes >= 3 ? [{ title: 'COLLECTOR', detail: 'all three envelopes' }] : []) });
}
function hubInit() {
  if (!AH || !AH.active) return Promise.resolve(false);
  return AH.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) return false;
    hub.active = true; hub.info = info; for (const p of info.players || []) hub.names[p.id] = p;
    AH.on('message', (d, from) => { if (d && d.k === 'p' && from !== info.me) { const p = hub.names[from] || {}; PLAY.ghost(from, { x: d.x, y: d.y, z: d.z, f: d.f, name: p.name || 'P' + (from + 1), color: p.color || '#3b82f6' }); } });
    AH.on('time-up', () => { hub.timeUp = true; hubDone(false); });
    AH.on('end', () => { hub.ended = true; game.audio.musicVolume = 0; game.audio.sfxVolume = 0; try { game.audio.applyVolume(); music(null); } catch (e) { /* nothing */ } });
    AH.on('leave', () => {});
    return true;
  }).catch(() => false);
}

/* ---- THE TITLE: the cast on a ledge under a New Jersey night, the ducks leaving ---- */
const MID = 480, stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#4a3a52', moss: '#3a5a3a' } }, edges: 'open' });
const titleBg = new E.Backdrop({ sky: ['#06060e', '#0e1020', '#1c1a38', '#3a2646', '#6a3a5a'], stars: 40, starsY: .5, moon: { x: .22, y: .22, r: 14, color: '#e8e0d0' },
  layers: [{ kind: 'city', color: '#241a38', y: .62, height: .3, parallax: .04, windows: '#ffc070' }, { kind: 'city', color: '#150f24', y: .7, height: .25, parallax: .1, windows: '#ffe08a', seed: 4 }, { kind: 'fog', color: '#4a3a62', y: .92, height: .1, parallax: 0, drift: 4 }] });
const LINEUP = [['connie', 0, 2.0], ['doc', 0, 2.0], ['vic', 0, 2.3], ['sal', Math.PI, 2.2], ['chris', Math.PI, 2.1], ['dino', Math.PI, 2.7]].map(([id, face], i) => ({ id, face, rig: rig(id), x: MID + 62 + (i - 2.5) * 30 }));
const DUCKS = Array.from({ length: 5 }, (_, i) => ({ x: MID + 190 + i * 14, i }));
let titleMenu = null, tIdle = 0, touchMode = false, loopDemo = 0;
const hasSave = () => { try { return !!game.saves.latest(); } catch (e) { return false; } };
function buildTitleMenu() {
  const items = touchMode ? ['SETTINGS'] : [{ label: 'NEW GAME' }, { label: 'CONTINUE', disabled: !hasSave() }, { label: 'SETTINGS' }, { label: 'CONTROLS' }, { label: 'ABOUT AND CREDITS' }];
  titleMenu = new E.Menu(game, items, { y: 82, onPick: i => { const label = items[i].label || items[i];
    if (label === 'NEW GAME') { sfx('confirm'); beginRun(false); } else if (label === 'CONTINUE') { sfx('confirm'); const l = game.saves.latest(); l && game.saves.load(l.slot === undefined ? 'auto' : l.slot); }
    else if (label === 'SETTINGS') game.menu('settings'); else if (label === 'CONTROLS') game.menu('controls'); else game.go('credits', { after: 'title' }); } });
}
const ABOUTS = ['A BEAT-EM-UP WITH SIT-DOWNS', 'COLLECT THE ENVELOPES. KEEP A LID ON IT.', 'SEE THE THERAPIST. FEED THE DUCKS.', 'IT IS A STORY ABOUT A GUY WHO CAN NOT QUIT'];
scenes.title = {
  view: 'side', views: ['side', 'brawler'], input: INPUT, res: 'ps1',
  enter() { music('title'); game.resetCamera(); game.follow(null); game.cam.room = null; game.cam.bounds = null; L.enabled = false; game.weather = null; touchMode = touchOnly(); buildTitleMenu(); act.at = game.real; if (loopDemo) { act.at = game.real - 8; loopDemo = 0; } demoRun = false; S = blank(); },
  update(dt) {
    common();
    if (!titleMenu.update(dt)) { const P = game.players; if (P.some(I => I.pressed('start'))) { P.forEach(I => I.consumeAll()); titleMenu.onPick(titleMenu.i, titleMenu.items[titleMenu.i]); } }
    if (game.real - act.at > 10 && !game.paused) return startDemo();
    game.focus(MID, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    const t = game.time;
    LINEUP.forEach((h, i) => { const u = (t * .45 + i * .37) % 3, swing = u < .5 ? { spec: { a0: 1.4, a1: -1.6, z0: 12, z1: 8, reach: 7.5 }, phase: u < .15 ? 'wind' : 'active', u: u < .15 ? u / .15 : (u - .15) / .35 } : null;
      h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.face, vx: 0, vy: 0, attack: i === 2 || i === 5 ? swing : null, pose: i === 0 ? 'hips' : i === 3 ? 'cast' : null }); });
    for (const d of DUCKS) d.x += dt * 5;
    if (DUCKS[0].x > MID + 420) DUCKS.forEach((d, i) => { d.x = MID + 190 + i * 14; });
  },
  draw(r) {
    const top = r.W / 2 + 132 > r.W - 170 ? 40 : 0; titleMenu.y = 86 + top; titleMenu.x = touchMode ? 'center' : 18;
    titleBg.draw(r); stage.draw(r);
    for (const x of [MID - 100, MID + 100]) r.prop('streetlamp', x, 0, 32, { size: 1.2, light: false });
    r.prop('hydrant', MID - 156, -4, 32, { size: 1.3 }); r.prop('trashcan', MID + 140, -4, 32, { size: 1.3 }); r.prop('barrel', MID - 210, -4, 32, { size: 1.2 });
    for (const h of LINEUP) { r.shadow(h.x, 0, 10, .4, undefined, 32); r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view)); }
    for (const d of DUCKS) { const [sx, sy] = r.w(d.x, 6, 32); r.queue(d.x, 6, 32, g => px.sprite(g, DUCK, Math.round(sx) - 12, Math.round(sy) - 16 + Math.round(Math.sin(game.time * 6 + d.i) * 1), false)); }
    r.overlay(g => {
      E.font.title(g, 'THE SOPRANOS', r.W / 2, 8 + top / 3, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.title(g, 'OH, COME ON', r.W / 2, 34 + top / 3, { align: 'center', scale: 2, colors: ['#ffffff', '#ffd0d0', '#ff7a6a', '#c8202a'], depth: 2 });
      E.font.text(g, titleMenu.items.length > 1 ? ABOUTS[Math.floor(game.real / 4) % ABOUTS.length] : '', r.W / 2, r.H - 14, '#ffe7a8', TXC);
      if (touchMode) { E.ui.box(g, r.W / 2 - 130, r.H / 2 - 16, 260, 38, WIN); E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H / 2 - 8, '#ffffff', TXC); E.font.text(g, 'Attract mode starts in a moment.', r.W / 2, r.H / 2 + 8, '#b8b0d8', TXC); }
    });
    titleMenu.draw(r);
    const dev = game.input.lastDevice, how = dev === 'gamepad' ? 'D-pad / stick + ' + game.input.label('confirm') + '    ' + game.input.label('start') + ' menu' : 'Arrows or WASD + Enter, or click';
    if (!touchMode) r.text(how, r.W / 2, r.H - 26, '#b8b0d8', { align: 'center', shadow: '#000', outline: false });
  }
};
/* attract mode: after 10 s of nothing. A bot plays a cheating game of every chapter in a row; any input ends it */
function startDemo() {
  demoRun = true; loopDemo = 1; demoAt = game.real; S = blank(); S.step = 1; S.cash = 450; S.up.hp = 1;
  game.input.consumeAll(); game.go('play', { level: 'street', demo: true });
}

/* ---- ABOUT AND CREDITS: the Source Information and the three feedback sections, paged ---- */
scenes.credits = (() => {
  let page = 0, scroll = 0, after = 'title', pages;
  const mk = () => [
    { h: 'THE SOPRANOS OH, COME ON', body: ['A spiritual successor to The Sopranos (1999-2007).', 'You are Vic Marinara, a boss with a bad chest, a worse kitchen and a therapist. Collect the Tuesday envelopes, keep the stress down, feed the ducks, and do not look up when the bell on the door rings.', '', 'Keys: WASD / arrows move, J or left click punch, K or right click kick, Space jump, L rage, E talk / collect / feed, V camera view. Pad: stick or d-pad, Square punch, Circle kick, Cross jump, R1 rage, Triangle talk, R3 view.', '', 'Online: AI Hub sessions (ghost mode, 1-4 players), each in their own copy of Tuesday Collections.', '', 'Build ' + BUILD + '. Engine: my-3D2dge ' + E.version + '.'] },
    { h: 'SOURCE INFORMATION', body: Object.entries(ABOUT.sourceInformation).map(([k, v]) => k.replace(/([A-Z])/g, ' $1').toUpperCase() + ': ' + v) },
    { h: 'TESTING FEEDBACK', body: ABOUT.testingQ.map((q, i) => q + '\n  ' + ABOUT.testingFeedback[i]) },
    { h: 'ENGINE FEEDBACK', body: ABOUT.engineQ.map((q, i) => q + '\n  ' + ABOUT.engineFeedback[i]) },
    { h: 'PROMPT FEEDBACK', body: ABOUT.promptQ.map((q, i) => q + '\n  ' + ABOUT.promptFeedback[i]) },
    { h: 'THE END, SORT OF', body: ['Written, coded, tuned and tested by Claude (claude-sonnet-5-5, medium effort) on my-3D2dge.', 'Music, effects and the gibberish voices are all made in code at run time. No samples were harmed; no ducks were harmed.', '', 'Any resemblance to persons living, dead, or on a pork store payroll is a coincidence. Thanks for playing.'] }];
  const lines = (W) => { const out = []; for (const p of pages) { const L = []; for (const para of p.body) for (const l of String(para).split('\n')) L.push(...(l === '' ? [''] : E.font.wrap(l, W - 24, { font: 'normal' }))); out.push(L); } return out; };
  let wrapped = null;
  return { view: 'side', input: INPUT, res: 'ps1',
    enter(d) { after = (d && d.after) || 'title'; page = 0; scroll = 0; pages = mk(); wrapped = null; music('home'); game.follow(null); game.focus(0, 0, 0); L.enabled = false; game.weather = null; game.cam.bounds = null; },
    update(dt) { common(); const I = game.input;
      if (I.pressed('right') || I.pressed('confirm')) { if (page < pages.length - 1) { page++; scroll = 0; sfx('select'); } else game.go(after); }
      if (I.pressed('left') && page > 0) { page--; scroll = 0; sfx('select'); }
      if (I.pressed('cancel')) game.go(after);
      if (I.down('down')) scroll += 120 * dt; if (I.down('up')) scroll -= 120 * dt; scroll = Math.max(0, scroll);
      const c = I.clicked(); if (c) { if (page < pages.length - 1) page++; else game.go(after); scroll = 0; } },
    draw(r) { r.sky(['#0a0814', '#1c1430', '#2a1c3c']); const W = r.W, H = r.H; if (!wrapped || wrapped.w !== W) wrapped = { w: W, l: lines(W) };
      r.overlay(g => { px.rect(g, 0, 0, W, H, '#0e0a18'); E.font.title(g, pages[page].h, W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6d0', '#ffd060', '#e8782a'] });
        const L = wrapped.l[page], top = 34, vis = Math.floor((H - top - 22) / 10), maxS = Math.max(0, L.length - vis); scroll = Math.min(scroll, maxS * 10);
        const s0 = Math.floor(scroll / 10); for (let i = 0; i < vis; i++) { const l = L[s0 + i]; if (l !== undefined) E.font.text(g, l, 12, top + i * 10, l.startsWith('  ') ? '#c8c0e8' : '#ffe7c8', TXT); }
        if (maxS > 0) E.font.text(g, '↑ ↓  SCROLL', W - 10, H - 12, '#ffe7a8', TXR);
        E.font.text(g, (page + 1) + ' / ' + pages.length + '    ← →  PAGE    ' + game.input.label('cancel') + ' BACK', W / 2, H - 12, '#8a8ab0', TXC); }); } };
})();

/* ---- 90-start: register the scenes, boot, join an AI Hub session when there is one ---- */
scenes.play = PLAY; scenes.cut = SCENE; scenes.kitchen = KITCHEN;
const startScene = (location.hash || '').slice(1);
const hash = startScene && scenes[startScene.split('/')[0]] ? startScene.split('/') : null;
let first = 'title', data;
if (hash) { first = hash[0]; if (first === 'play') { S.step = 1; data = { level: hash[1] || 'street' }; } if (first === 'cut') data = { id: hash[1] || 'intro' }; if (first === 'kitchen') S.step = 2; }
game.start({ scenes, scene: first, data });
window.__game = { game, scenes, PLAY, SCENE, KITCHEN, S: () => S, setS: s => { S = s; }, FLOW, LEVELS, FOES, CAST, UPGRADES, hub, titleMenu: () => titleMenu, beginRun, startDemo, flowNext, score, heroMax, interactions: { feedDucks: () => PLAY.interactNow }, TALK, CUTS, SONGS, VOICES, blip, act, touchOnly };
// AI Hub: in a session the game opens straight into the round (no title, no menus), then calls ready()
hubInit().then(active => {
  if (!active) return;
  PLAY.pausable = false; S = blank(); S.step = 1; game.menu = () => false;
  game.go('play', { level: 'street', session: true }, { fade: 0 });
  AH.ready();
});
})();
