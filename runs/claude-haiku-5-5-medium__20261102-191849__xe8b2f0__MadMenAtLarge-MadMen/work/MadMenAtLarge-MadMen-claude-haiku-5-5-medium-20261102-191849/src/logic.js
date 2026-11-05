/* Mad Men at Large: the game's rules, with no engine and no DOM, so the tests can run them in Node.
 * A classic script. It exposes window.MM (the rules) and reads nothing else.
 *
 * Stats (0..100): Standing (what the partners think), Composure (how steady your hands are), Whiskey (how much
 * bourbon is in you; past 85 your pitch goes blurry), Home (what is left of the house in Westchester).
 * The day runs 9:00 AM to 5:00 PM over DAY_SECONDS. The client's meeting is called half way through the day; you
 * must walk into the boardroom and pitch before you can take the elevator home.
 */
(function (root) {
  'use strict';

  var DAY_SECONDS = 180;          // a workday: 9:00 AM to 5:00 PM in three minutes of play
  var DEMO_DAY_SECONDS = 110;      // the attract-mode day
  var CLOCK_START = 9 * 60;       // minutes after midnight
  var CLOCK_END = 17 * 60;
  var MEETING_FRACTION = 0.5;     // the meeting is called half way through the day
  var DRAIN_COMPOSURE = 0.35;     // per second
  var DECAY_WHISKEY = 1.2;        // per second, while the bourbon wears off
  var DRAIN_HOME = 0.08;          // per second: work leaks into the house
  var CIGARETTES_PER_DAY = 4;
  var BEATS = ['HEADLINE', 'COPY', 'CLOSE'];
  var BEAT_HALF_WIDTH = [0.13, 0.11, 0.09];   // the good zone's half-width (0..1 of the bar), per beat

  var START = { standing: 40, composure: 70, whiskey: 0, home: 60 };
  var STAT_KEYS = ['standing', 'composure', 'whiskey', 'home'];

  var CLIENTS = {
    starbrite: { id: 'starbrite', brand: 'Starbrite Cigarettes', rep: 'Dennison Stahl', threshold: 5,
      brief: 'Starbrite wants the girl on the bicycle to make the cigarette feel like the first day of spring.' },
    kestrel: { id: 'kestrel', brand: 'Kestrel Kitchen Appliances', rep: 'Eileen Marsh', threshold: 6,
      brief: 'Kestrel wants a refrigerator to be a member of the family. The buyer has heard every metaphor.' },
    cobalt: { id: 'cobalt', brand: 'Cobalt Airways', rep: 'Franklin Vail', threshold: 7,
      brief: 'Cobalt wants to be where the world goes on holiday. The partners want it more than the client does.' }
  };

  var DAYS = [
    { n: 1, name: 'Monday', client: 'starbrite', encounters: ['teddy-memo', 'gil-bourbon'] },
    { n: 2, name: 'Tuesday', client: 'kestrel', encounters: ['vera-brief', 'marian-lunch'] },
    { n: 3, name: 'Wednesday', client: 'cobalt', encounters: ['teddy-credit', 'gil-partner'] }
  ];

  // Each encounter is a conversation with one colleague. A choice changes the stats, may set a flag, and gets a reply.
  var ENCOUNTERS = {
    'teddy-memo': {
      id: 'teddy-memo', npc: 'teddy', name: 'Teddy Brandt',
      lines: ['Ray, I wrote the Starbrite headline. Last night, on the train.',
        'The partners want it under your name. Would you sign off on it for me?'],
      choices: [
        { label: 'Put his name on the deck', fx: { standing: 4 }, flag: 'teddyAlly',
          reply: ['Good. Credit is the only currency nobody inflates.', 'Teddy will remember the favour. Teddy remembers everything.'] },
        { label: 'It is my deck now', fx: { standing: 9 }, flag: 'teddyBitter',
          reply: ['Of course it is.', 'He will not say a word. He will simply stop passing you the good files.'] }
      ]
    },
    'gil-bourbon': {
      id: 'gil-bourbon', npc: 'gil', name: 'Gil Ashcombe',
      lines: ['Come have one with me. The bourbon is the only honest man in this building.',
        'The partners are sick of pitches. They want a story.'],
      choices: [
        { label: 'Pour me one', fx: { whiskey: 22, composure: 14, standing: 3 }, flag: 'gilDrinks',
          reply: ['To the story, then.', 'It goes down like a good idea and sits like a bad one.'] },
        { label: 'Not before the pitch', fx: { composure: -4, home: 6 }, flag: null,
          reply: ['Suit yourself.', 'You will think of something on the train home. Call your wife.'] }
      ]
    },
    'vera-brief': {
      id: 'vera-brief', npc: 'vera', name: 'Vera Quill',
      lines: ['Kestrel\'s buyer wants a pot roast, not a poem. Four minutes of notes, Ray.',
        'I typed them myself, so you cannot say you were not told.'],
      choices: [
        { label: 'Read them now', fx: { standing: 2 }, flag: 'veraBrief',
          reply: ['Good. Circle the word "reliable" and never say it aloud.', 'The buyer says it twice. Be ready.'] },
        { label: 'I will wing it', fx: { composure: 5 }, flag: null,
          reply: ['Confidence is a lovely thing to lose in front of a buyer.', 'Your funeral. Pick up the notes anyway.'] }
      ]
    },
    'marian-lunch': {
      id: 'marian-lunch', npc: 'marian', name: 'Marian Loftus',
      lines: ['I have booked the corner table for half past one. Don\'t be late, and don\'t be early.',
        'Nobody in this office has ever eaten lunch with a man and kept his name clean.'],
      choices: [
        { label: 'Lunch, then', fx: { home: -14, composure: 12, standing: 5 }, flag: 'marianLunch',
          reply: ['Good. I\'ll keep the grapefruit warm.', 'Nobody saw you leave. Almost nobody.'] },
        { label: 'Send my regards to the file room', fx: { home: 6, composure: -3 }, flag: null,
          reply: ['Regards are cheap.', 'Go on, then. Keep your clean name and your cold lunch.'] }
      ]
    },
    'teddy-credit': {
      id: 'teddy-credit', npc: 'teddy', name: 'Teddy Brandt',
      lines: ['Cobalt is the big one, Ray. I have a jingle that goes up at the end.',
        'Let me pitch the close. I know the words better than you do.'],
      choices: [
        { label: 'Give him the close', fx: { standing: 4 }, flag: 'teddyClose',
          reply: ['Thank you. Do not watch me, it makes me nervous.', 'Keep your eyes on the buyer. He\'s the only one who matters.'] },
        { label: 'No. I will close it', fx: { standing: 6, composure: -6 }, flag: null,
          reply: ['Fine. Your name, your rope.', 'He will be insufferable on the elevator.'] }
      ]
    },
    'gil-partner': {
      id: 'gil-partner', npc: 'gil', name: 'Gil Ashcombe',
      lines: ['If Cobalt signs, the partners will put your name on the papers.',
        'Partnership is a contract with the firm and a drink with the house. Will you sign?'],
      choices: [
        { label: 'I will sign', fx: { standing: 10, home: -8 }, flag: 'signed',
          reply: ['Then welcome to the firm. Leave the ink on your cuffs.', 'Your wife will read about it in the trades.'] },
        { label: 'Ask me when it is signed', fx: { standing: -4, home: 8 }, flag: null,
          reply: ['Then ask me when there is something to ask about.', 'Go home. Tell the house you are sorry.'] }
      ]
    }
  };

  var CALL_HOME = { home: 12, composure: 6 };
  var DRINK = { whiskey: 18, composure: 12 };
  var SMOKE = { composure: 16 };
  var BLURRY_AT = 85;
  var TIPSY_AT = 60;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function newState(opts) {
    opts = opts || {};
    var s = { day: 1, t: 0, dayLength: opts.demo ? DEMO_DAY_SECONDS : DAY_SECONDS, demo: !!opts.demo,
      cigs: CIGARETTES_PER_DAY, drinks: 0, smokes: 0, accounts: [], pitches: {}, done: {}, homeCalls: {},
      flags: {}, log: [], pitchesRun: 0, ended: false };
    STAT_KEYS.forEach(function (k) { s[k] = START[k]; });
    return s;
  }

  function adjust(state, key, delta) {
    if (STAT_KEYS.indexOf(key) < 0) throw new Error('unknown stat ' + key);
    state[key] = clamp(state[key] + delta, 0, 100);
    return state[key];
  }

  function applyFx(state, fx) {
    Object.keys(fx || {}).forEach(function (k) { adjust(state, k, fx[k]); });
    return state;
  }

  function beginDay(state, day) {
    state.day = day;
    state.t = 0;
    state.cigs = CIGARETTES_PER_DAY;
    state.pitches[day] = state.pitches[day] || 'pending';
    state.log.push('Day ' + day + ': ' + DAYS[day - 1].name);
    return state;
  }

  function dayDef(state) { return DAYS[state.day - 1]; }

  // time passing: composure drains, the bourbon wears off, the house gets a little further away
  function tick(state, dt) {
    if (state.ended) return state;
    state.t = Math.min(state.dayLength, state.t + dt);
    adjust(state, 'composure', -DRAIN_COMPOSURE * dt);
    if (state.whiskey > 0) adjust(state, 'whiskey', -DECAY_WHISKEY * dt);
    adjust(state, 'home', -DRAIN_HOME * dt);
    return state;
  }

  function dayOver(state) { return state.t >= state.dayLength; }
  function clockMinutes(state) { return CLOCK_START + (state.t / state.dayLength) * (CLOCK_END - CLOCK_START); }
  function clockLabel(state) {
    var m = Math.floor(clockMinutes(state)), h = Math.floor(m / 60), mm = m % 60;
    var ampm = h >= 12 ? 'PM' : 'AM', h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ampm;
  }
  function meetingAt(state) { return state.dayLength * MEETING_FRACTION; }
  function meetingCalled(state) { return state.t >= meetingAt(state); }
  function pitchDone(state, day) { return state.pitches[day || state.day] === 'won' || state.pitches[day || state.day] === 'lost'; }

  function drink(state) {
    state.drinks++;
    adjust(state, 'whiskey', DRINK.whiskey);
    adjust(state, 'composure', DRINK.composure);
    return state.whiskey > BLURRY_AT ? 'blurry' : state.whiskey > TIPSY_AT ? 'tipsy' : 'fine';
  }

  function smoke(state) {
    if (state.cigs <= 0) return false;
    state.cigs--;
    state.smokes++;
    adjust(state, 'composure', SMOKE.composure);
    return true;
  }

  // a pack from the cigarette case, once a day, up to CIGARETTES_MAX in hand
  var CIGARETTES_MAX = 6, CIGARETTE_PACK = 2;
  function refillCigs(state) {
    if (state.cigRefilled === undefined) state.cigRefilled = {};
    if (state.cigRefilled[state.day]) return false;
    state.cigRefilled[state.day] = true;
    state.cigs = Math.min(CIGARETTES_MAX, state.cigs + CIGARETTE_PACK);
    return true;
  }

  function callHome(state) {
    if (state.homeCalls[state.day]) return false;
    state.homeCalls[state.day] = true;
    adjust(state, 'home', CALL_HOME.home);
    adjust(state, 'composure', CALL_HOME.composure);
    return true;
  }

  function encountersToday(state) {
    return dayDef(state).encounters.filter(function (id) { return state.done[id] === undefined; });
  }

  function chooseEncounter(state, id, index) {
    var enc = ENCOUNTERS[id];
    if (!enc) throw new Error('no encounter ' + id);
    if (state.done[id] !== undefined) return null;
    var choice = enc.choices[index];
    if (!choice) throw new Error('no choice ' + index + ' in ' + id);
    state.done[id] = index;
    applyFx(state, choice.fx);
    if (choice.flag) state.flags[choice.flag] = true;
    state.log.push(enc.name + ': ' + choice.label);
    return choice.reply;
  }

  // ---- the pitch: three beats, each a needle sweeping a bar, stopped inside a zone that is wider when you are steady
  function makeCenters(rand) {
    return [0, 1, 2].map(function () { return 0.2 + rand() * 0.6; });
  }

  function beatHalfWidth(state, beat) {
    var steady = 0.85 + (state.composure / 100) * 0.3;
    var blur = state.whiskey > BLURRY_AT ? 0.75 : 1;
    return BEAT_HALF_WIDTH[beat] * steady * blur;
  }

  function needlePeriod(state) { return 1.5 / (1 + state.whiskey / 200); }   // seconds for one full sweep, 0 to 1 and back

  function stepNeedle(p, dir, dt, period) {
    p += dir * dt * 2 / period;
    if (p >= 1) { p = 1; dir = -1; }
    if (p <= 0) { p = 0; dir = 1; }
    return { p: p, dir: dir };
  }

  function beatScore(p, c, hw) {
    var d = Math.abs(p - c);
    if (d <= hw * 0.4) return 3;
    if (d <= hw) return 2;
    if (d <= hw * 2) return 1;
    return 0;
  }

  function pitchBonus(state) {
    return Math.floor(state.standing / 25) + (state.flags.veraBrief ? 1 : 0) + (state.flags.teddyClose ? 1 : 0);
  }

  function pitchResult(state, scores) {
    var client = CLIENTS[dayDef(state).client];
    var total = scores.reduce(function (a, b) { return a + b; }, 0);
    var bonus = pitchBonus(state);
    var effective = total + bonus;
    return { client: client.id, total: total, bonus: bonus, effective: effective, threshold: client.threshold,
      win: effective >= client.threshold };
  }

  function recordPitch(state, result) {
    var day = state.day;
    state.pitchesRun++;
    state.pitches[day] = result.win ? 'won' : 'lost';
    if (result.win) state.accounts.push(result.client);
    state.log.push((result.win ? 'Won ' : 'Lost ') + CLIENTS[result.client].brand + ' (' + result.effective + '/' + result.threshold + ')');
    return state;
  }

  function missPitch(state) {
    if (pitchDone(state)) return null;
    var result = { client: dayDef(state).client, total: 0, bonus: 0, effective: 0,
      threshold: CLIENTS[dayDef(state).client].threshold, win: false, missed: true };
    recordPitch(state, result);
    return result;
  }

  // the elevator takes you home only when the client has been seen
  function canLeave(state) { return pitchDone(state); }

  function score(state) {
    return state.accounts.length * 1000 + Math.round(state.standing) * 10 + Math.round(state.home) * 5;
  }

  function ending(state) {
    var wins = state.accounts.length, s = state.standing, h = state.home, e;
    if (wins === 3 && s >= 60) e = { id: 'partner', title: 'Partner', text: 'Your name goes on the door in gold leaf. Nobody asks how the house is.' };
    else if (wins === 3) e = { id: 'corner-empty', title: 'The Corner Office', text: 'The window is yours and the chair is comfortable. Nobody comes in to sit in it with you.' };
    else if (wins === 2) e = { id: 'account-exec', title: 'Account Executive', text: 'A desk by the window and a good phone line. The work is good enough to keep you here.' };
    else if (wins === 1) e = { id: 'new-hire', title: 'The New Hire', text: 'Teddy has your old office with the good view. You have the small one with the pigeons.' };
    else e = { id: 'pink-slip', title: 'The Envelope', text: 'The pink slip is in an envelope with your name spelled right. That is the only courtesy on offer.' };
    e.note = h < 25 ? 'The house is quiet. Quieter than the office, which is saying something.'
      : h >= 60 ? 'Home is still there when you get back. Nobody has told the children anything yet.' : '';
    e.wins = wins;
    e.score = score(state);
    return e;
  }

  // a pitch-time press for the attract mode: stop the needle when it sits near the zone's middle
  function aiShouldPress(p, c, hw) { return Math.abs(p - c) <= hw * 0.25; }

  // is this device one with only a touch screen? (no keyboard, no controller, no mouse-like pointer)
  function touchOnly(info) {
    info = info || {};
    if (!(info.maxTouchPoints > 0)) return false;
    if (info.finePointer) return false;
    return info.lastDevice !== 'keyboard' && info.lastDevice !== 'gamepad' && info.lastDevice !== 'mouse';
  }

  var api = {
    DAY_SECONDS: DAY_SECONDS, DEMO_DAY_SECONDS: DEMO_DAY_SECONDS, MEETING_FRACTION: MEETING_FRACTION,
    CIGARETTES_PER_DAY: CIGARETTES_PER_DAY, BEATS: BEATS, BEAT_HALF_WIDTH: BEAT_HALF_WIDTH,
    START: START, STAT_KEYS: STAT_KEYS, CLIENTS: CLIENTS, DAYS: DAYS, ENCOUNTERS: ENCOUNTERS,
    newState: newState, adjust: adjust, applyFx: applyFx, beginDay: beginDay, dayDef: dayDef, tick: tick,
    dayOver: dayOver, clockLabel: clockLabel, clockMinutes: clockMinutes, meetingAt: meetingAt,
    meetingCalled: meetingCalled, pitchDone: pitchDone, drink: drink, smoke: smoke, callHome: callHome, refillCigs: refillCigs, CIGARETTES_MAX: CIGARETTES_MAX,
    encountersToday: encountersToday, chooseEncounter: chooseEncounter, makeCenters: makeCenters,
    beatHalfWidth: beatHalfWidth, needlePeriod: needlePeriod, stepNeedle: stepNeedle, beatScore: beatScore,
    pitchBonus: pitchBonus, pitchResult: pitchResult, recordPitch: recordPitch, missPitch: missPitch,
    canLeave: canLeave, score: score, ending: ending, aiShouldPress: aiShouldPress, touchOnly: touchOnly,
    BLURRY_AT: BLURRY_AT, TIPSY_AT: TIPSY_AT
  };
  root.MM = api;
})(typeof window !== 'undefined' ? window : globalThis);
