/* DENSHA DE HALO! · stages, timetables, events and the script. All text lives here as data.
 * Style (after the source): short, earnest railway sentences; announcements formal, the station said twice; calls in
 * romaji with English subtitles; the instructor terse and proverbial, hiding his warmth; the conductor cheerful; banners
 * of 1-3 words in capitals; the comedy is railway earnestness, never mockery of it. */
(() => {
'use strict';
const DH = window.DH, t = DH.tsec;

/* ---------- trains ---------- */
DH.TRAINS = {
  h8000: { id: 'h8000', name: 'HALO 8000', np: 5, nb: 8, aP: [0, .8, 1.4, 2.0, 2.6, 3.2], vk: [0, 15, 25, 35, 40, 45], bk: .5, aEB: 5.0, lagA: .7, lagR: .5, lagP: .3, vmax: 110, sound: 'vvvf', cab: 'modern', handles: 1 },
  h3000: { id: 'h3000', name: 'HALO 3000', np: 4, nb: 7, aP: [0, .7, 1.3, 1.9, 2.5], vk: [0, 18, 28, 36, 42], bk: .55, aEB: 4.6, lagA: 1.1, lagR: .8, lagP: .5, vmax: 100, sound: 'resistor', cab: 'classic', handles: 2 }
};

/* ---------- calls: what the driver says (romaji, English) ---------- */
DH.CALLS = {
  start: ['Shuppatsu, shinko!', 'Departure. Proceed!'], blockG: ['Heisoku, shinko!', 'Block. Proceed!'], homeG: ['Jonai, shinko!', 'Home signal. Proceed!'],
  YG: ['Gensoku!', 'Reduce speed!'], Y: ['Chui!', 'Caution!'], YY: ['Keikai!', 'Restricted!'], R: ['Teishi!', 'Stop!'],
  limit: v => ['Seigen, ' + v + '!', 'Limit ' + v + '!'], approach: ['Teisha!', 'Stopping!'], pass: ['Tsuka!', 'Passing!'], crossing: ['Fumikiri, yoshi!', 'Crossing, clear!'], horn: ['Keiteki!', 'Horn!']
};

/* ---------- the stages ---------- */
const S = DH.STAGES = {};
S.S0 = {
  id: 'S0', name: 'DAWN DEPOT', sub: 'Tutorial', route: 'depot', train: 'h8000', cars: 6, tod: 5.5, weather: 'clear', startS: 140, startClock: t('05:30:00'), tutorial: true,
  stops: [{ id: 'mark1', arr: null }, { id: 'mark2', arr: null }, { id: 'gate', arr: null }], events: [], postcards: [],
  teaches: 'The lever, the brake, stopping on a mark, the departure call, a limit, a smooth stop, the emergency brake.',
  briefing: [['hoshino', 'So. You\'re the new one.'], ['hoshino', 'Thirty-eight years I drove this ring. Not one second late. Today is my last day.'], ['hoshino', 'Your paperwork says you can drive. The rails don\'t read paperwork.']],
  steps: [
    { id: 'p1', line: 'Lever up: power. P1. Gently.', hint: 'power', goal: 'Reach 10 km/h' },
    { id: 'coast', line: 'N. Let her coast.', hint: 'neutral', goal: 'Lever to N' },
    { id: 'brake', line: 'Lever down: brake. Watch the needle, not your hand.', hint: 'brake', goal: 'Slow below 5 km/h' },
    { id: 'mark1', line: 'The yellow board. Put your nose on it.', hint: 'brake', goal: 'Stop at MARK 1' },
    { id: 'call', line: 'Before you move, point at the signal and say it. Shuppatsu, shinko.', hint: 'call', goal: 'Point and call the signal' },
    { id: 'limit', line: 'Forty is the limit. Forty is not a suggestion.', hint: 'power', goal: 'Run up to 40 under the board' },
    { id: 'mark2', line: 'Near the stop, ease off to B1. The passengers\' coffee will thank you.', hint: 'brake', goal: 'Stop at MARK 2, ease to B1' },
    { id: 'eb', line: 'That is the emergency brake. You will hate the day you need it.', hint: 'eb', goal: 'Run over 15 km/h, pull EB, stop' },
    { id: 'mark3', line: 'Last mark. Inside one metre and I sign your card.', hint: 'brake', goal: 'Stop within 1 m at DEPOT GATE' }
  ],
  pass: [['hoshino', '...Hmph. Signed. The 06:40 is waiting, Rookie.'], ['hoshino', 'Halo Time is your life on the line. ATS bells and horn boards, you\'ll meet those in service.']],
  results: { S: 'Signed.', A: 'Signed.', B: 'Signed.', C: 'Signed.', D: 'Signed.' }, gameOver: 'Again. From the yard.'
};
S.S1 = {
  id: 'S1', name: 'FIRST LIGHT LOCAL', sub: 'Akari Central to Kujira-bashi', route: 'halo', train: 'h8000', cars: 6, tod: 6.67, weather: 'clear', startClock: t('06:39:44'),
  stops: [{ id: 'akari', dep: t('06:40:00') }, { id: 'hanabatake', arr: t('06:42:24'), dep: t('06:42:49') }, { id: 'kujira', arr: t('06:45:05') }], passes: [],
  teaches: 'The timetable and clock, the departure procedure, calls, the horn board, a limit board, an oncoming train, crossing bells, melodies and announcements.',
  briefing: [['mika', 'Good morning, Driver! Conductor Aoba, at the back. Call me Mika!'], ['hoshino', 'Arrive on the second. Early is not on time. Late is not on time.'], ['mika', 'Melody, doors, my buzzer, then she\'s all yours!']],
  events: [
    { id: 'pa1', type: 'radio', at: 30, who: 'pa', line: 'Thank you for riding the Halo Line. This is a local train for Kujira-bashi.' },
    { id: 'tipCall', type: 'tip', at: 40, tip: 'call' },
    { id: 'pa2', type: 'radio', at: 1000, who: 'pa', line: 'The next station is Hanabatake. Hanabatake. The doors on the left side will open.' },
    { id: 'kota', type: 'kota', station: 'hanabatake' },
    { id: 'onc1', type: 'oncoming', at: 2000 },
    { id: 'hornFish', type: 'radio', at: 2290, who: 'hoshino', line: 'The fishermen under the bridge like to know we\'re coming.' },
    { id: 'pa3', type: 'radio', at: 2850, who: 'pa', line: 'The next station is Kujira-bashi. Kujira-bashi. The doors on the right side will open.' }
  ],
  results: { S: '...Exactly there. Exactly then.', A: 'Good. Now do it four hundred more times.', B: 'Acceptable. Your brakes are nervous.', C: 'You drove. That is all I will say.', D: 'We will talk about this at the depot.' },
  gameOver: 'That\'s enough. Hand me the key.'
};
S.S2 = {
  id: 'S2', name: 'HARBOR RAIN RAPID', sub: 'Kujira-bashi to Okiku-dera', route: 'halo', train: 'h3000', cars: 6, tod: 10.25, weather: 'rain', startClock: t('10:14:44'),
  stops: [{ id: 'kujira', dep: t('10:15:00') }, { id: 'minato', arr: t('10:17:13'), dep: t('10:17:38') }, { id: 'okiku', arr: t('10:23:19') }], passes: [{ id: 'todai', at: t('10:21:10') }],
  teaches: 'Another train (two handles, slow brakes), rain slip and slide, yellow signals, ATS confirm, a tunnel, a pass station.',
  briefing: [['hoshino', 'Today, the old 3000. She\'s older than you. Her brakes think slowly. Ask early.'], ['mika', 'Umbrellas everywhere! The rails will be slippery!'], ['hoshino', 'Two handles. Brake on the left, power on the right. One at a time.']],
  events: [
    { id: 'pa1', type: 'radio', at: 3480, who: 'pa', line: 'This is a Rapid service. We will not stop at Todai-shita.' },
    { id: 'disp', type: 'radio', at: 3700, who: 'dispatch', line: 'Halo 1015, freight ahead of you through the cliff tunnel. Expect restrictive signals.' },
    { id: 'freight', type: 'preceding', kind: 'freight' },
    { id: 'pa2', type: 'radio', at: 4500, who: 'pa', line: 'The next station is Minato-mae. Minato-mae. The doors on the left side will open.' },
    { id: 'tipAts', type: 'tip', at: 5300, tip: 'ats' },
    { id: 'passTd', type: 'radio', at: 6990, who: 'hoshino', line: 'Tsuka. Good. Eyes forward.' },
    { id: 'pa3', type: 'radio', at: 7700, who: 'pa', line: 'Okiku-dera. Okiku-dera. Festival visitors, please mind the gap.' },
    { id: 'onc2', type: 'oncoming', at: 7300 }
  ],
  results: { S: 'Rain did not slow you. Good.', A: 'You asked the brakes early. She listened.', B: 'You slid. You recovered. Once is a lesson.', C: 'The 3000 forgives. The timetable does not.', D: 'Dry off. Then think.' },
  gameOver: 'The rain didn\'t do that. You did.'
};
S.S3 = {
  id: 'S3', name: 'TEMPLE HILL LOCAL', sub: 'Okiku-dera to Shotengai', route: 'halo', train: 'h8000', cars: 6, tod: 14.0, weather: 'clear', startClock: t('13:59:44'), festival: true,
  stops: [{ id: 'okiku', dep: t('14:00:00') }, { id: 'yuhi', arr: t('14:03:45'), dep: t('14:04:10') }, { id: 'shotengai', arr: t('14:07:25') }], passes: [],
  teaches: 'Gradients both ways, a slow order and the horn for workers, an emergency stop, a festival crowd.',
  briefing: [['mika', 'It\'s the Chrysanthemum Festival!'], ['hoshino', 'Up the hill it\'s easy to be slow. Down it, easy to be fast.']],
  events: [
    { id: 'fest', type: 'festival', station: 'okiku' },
    { id: 'workers', type: 'workers' },
    { id: 'wkLine', type: 'radio', at: 9440, who: 'hoshino', line: 'Horn. Now.' },
    { id: 'fuji', type: 'fuji', station: 'yuhi' },
    { id: 'pa2', type: 'radio', at: 9700, who: 'pa', line: 'The next station is Yuhi-zaka. Yuhi-zaka. The doors on the right side will open.' },
    { id: 'obst', type: 'obstruction', crossing: 'X3', at: 10900 },
    { id: 'onc3', type: 'oncoming', at: 11200 },
    { id: 'pa3', type: 'radio', at: 11650, who: 'pa', line: 'The next station is Shotengai. Shotengai. The doors on the left side will open.' }
  ],
  results: { S: 'The hill, the festival, the cart. All of it, on the second.', A: 'Good hands on the hill.', B: 'Downhill, you ran. Downhill, never run.', C: 'The crowd forgave you. I wrote it down.', D: 'The temple bell rang for you. Not kindly.' },
  gameOver: 'A festival is no excuse.'
};
S.S4 = {
  id: 'S4', name: 'SUNSET RUSH', sub: 'Shotengai to Sakura-Koen, ten cars', route: 'halo', train: 'h8000', cars: 10, tod: 17.5, weather: 'clear', startClock: t('17:29:44'),
  stops: [{ id: 'shotengai', dep: t('17:30:00') }, { id: 'daigaku', arr: t('17:32:09'), dep: t('17:32:34') }, { id: 'koen', arr: t('17:34:46') }], passes: [],
  teaches: 'Train length and stop markers, making up lost time without speeding, staying calm beside a faster train.',
  briefing: [['hoshino', 'Ten cars. Your marker is the 10, not the 6.'], ['mika', 'Rush hour! Full cars, full platforms!']],
  events: [
    { id: 'rival', type: 'rival' },
    { id: 'ren1', type: 'radio', at: 12300, who: 'ren', line: 'Evening, Halo Line! See you at Koen... if you can keep up!' },
    { id: 'hosh1', type: 'radio', at: 12500, who: 'hoshino', line: 'Ignore him. He has his timetable. We have ours.' },
    { id: 'rush', type: 'doorRush', station: 'daigaku' },
    { id: 'glare', type: 'glare', from: 13750, to: 14600 },
    { id: 'glareLine', type: 'radio', at: 13800, who: 'hoshino', line: 'West sun. Squint if you must. Don\'t guess.' },
    { id: 'onc4', type: 'oncoming', at: 14800, track: 'B' },
    { id: 'pa3', type: 'radio', at: 14700, who: 'pa', line: 'The next station is Sakura-Koen. Sakura-Koen. The doors on the left side will open.' },
    { id: 'renEnd', type: 'radio', at: 15200, who: 'ren', line: 'Not bad, rookie. Not bad at all.' }
  ],
  results: { S: 'Ten cars. Every one of them on the mark.', A: 'You ignored him. Good.', B: 'You raced him. He was not racing you.', C: 'The 10, Rookie. Not the 6.', D: 'Rush hour rushed you.' },
  gameOver: 'Faster trains will always pass you. Let them.'
};
S.S5 = {
  id: 'S5', name: 'THE LAST HALO', sub: 'Sakura-Koen to Akari Central, the last train', route: 'halo', train: 'h8000', cars: 6, tod: 23.17, weather: 'fog', startClock: t('23:09:44'), finale: true,
  stops: [{ id: 'koen', dep: t('23:10:00') }, { id: 'hoshimi', arr: t('23:12:20'), dep: t('23:12:45') }, { id: 'kawasemi', arr: t('23:14:56'), dep: t('23:15:21') }, { id: 'akari', arr: t('23:17:57') }], passes: [],
  teaches: 'Night driving, fog and trusting signals, the YY aspect; the story\'s close.',
  briefing: [['mika', 'Last train of the night... and Hoshino-san\'s last run.'], ['hoshino', 'Don\'t make it a ceremony. Drive it like any other train.']],
  events: [
    { id: 'fog', type: 'fog', from: 16200, to: 16800 },
    { id: 'fogLine', type: 'radio', at: 16150, who: 'hoshino', line: 'When you can\'t see, the signals see for you.' },
    { id: 'pa2', type: 'radio', at: 16300, who: 'pa', line: 'The next station is Hoshimi-dai. Hoshimi-dai. The doors on the left side will open.' },
    { id: 'pa3', type: 'radio', at: 18000, who: 'pa', line: 'The next station is Kawasemi. Kawasemi. The doors on the right side will open.' },
    { id: 'flash', type: 'flash', at: 19000 },
    { id: 'flashLine', type: 'radio', at: 18990, who: 'hoshino', line: 'That\'s Sato. Thirty years. He\'s flashing for me... Answer him.' },
    { id: 'tipYY', type: 'tip', at: 19700, tip: 'yy' },
    { id: 'pa4', type: 'radio', at: 19800, who: 'pa', line: 'The next station is Akari Central, the last stop. Thank you for riding the Halo Line today.' },
    { id: 'finale', type: 'finale', station: 'akari' }
  ],
  results: { S: 'The last stop was yours, Rookie.', A: 'Like any other train. Good.', B: 'You made it a ceremony. I forgive you.', C: 'The fog won some. The ring is still ours.', D: 'Tomorrow, the 06:40. Again.' },
  gameOver: 'Not tonight. Not on my last night.'
};
S.PR = {
  id: 'PR', name: 'PARALLEL RUN', sub: 'The Drivers\' Festival: four tracks, one timetable', route: 'halo', train: 'h8000', cars: 6, tod: 12.0, weather: 'clear', startClock: t('11:59:44'), parallel: true,
  stops: [{ id: 'shotengai', dep: t('12:00:00') }, { id: 'daigaku', arr: t('12:02:09'), dep: t('12:02:34') }, { id: 'koen', arr: t('12:04:38') }], passes: [],
  teaches: 'Racing on the same timetable: stop on the mark, on the second.',
  briefing: [['mika', 'The Drivers\' Festival! Four trains, four tracks, one timetable!'], ['hoshino', 'It is not a race. It is a timetable. The best timetable wins.']],
  events: [{ id: 'pa1', type: 'radio', at: 12300, who: 'pa', line: 'Today\'s Parallel Run. Every train arrives together. In principle.' }],
  results: { S: 'Exactly. All of it.', A: 'Good driving under eyes.', B: 'Watched, you hurried.', C: 'The others drove. You also drove.', D: 'A festival. Not a funeral.' },
  gameOver: 'Out of Halo Time.'
};
DH.CAREER = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];

/* ---------- rule-triggered lines (once per stage) ---------- */
DH.RULE_LINES = {
  firstAts: ['hoshino', 'ATS. Confirm it, then brake. In that order.'],
  firstYellow: ['hoshino', 'Yellow. Forty-five. Don\'t argue with yellow.'],
  firstSlip: ['mika', 'Wheels spinning! Ease the power!'],
  firstSlide: ['mika', 'We\'re sliding! Gentle on the brake!'],
  graceLow: ['hoshino', 'Ten seconds left. Breathe.'],
  missedCall: ['hoshino', 'You didn\'t point. A signal ignored is a signal you didn\'t see.'],
  comfortLow: ['mika', 'Um, driver? The passengers are holding on very tightly.'],
  limit: ['hoshino', 'Too fast. The board said what it said.'],
  spad: ['hoshino', 'Red is red. You passed it. Never again.'],
  hazard: ['mika', 'The crossing alarm! Something\'s on the tracks!'],
  hazardOk: ['hoshino', 'The takoyaki survived. So did we.'],
  doorRush: ['kenji', 'Wait! Wait for me!'],
  doorRush2: ['mika', 'One moment please! Doors re-opening!'],
  doorRush3: ['hoshino', 'Eight seconds. Earn them back. Without speeding.'],
  kota: ['kota', 'Haro! Haro! Mister driver!'],
  kota2: ['mika', 'Our biggest fan is here again.'],
  fuji: ['fuji', 'Thank you, driver-san!'],
  festival: ['mika', 'It\'s the Chrysanthemum Festival! Crowds everywhere!'],
  overrun: ['hoshino', 'Past the mark. The mark does not move for you.'],
  perfect: ['haro', 'Harooo!'],
  flashOk: ['sato', 'Good night, Tetsuo. Thirty-eight years. Good night.'],
  ebNoHazard: ['hoshino', 'Emergency brake. Was there an emergency?'],
  workersWave: ['hoshino', 'They heard you. They\'re waving.'],
  late: ['mika', 'We\'re a little late! You can make it up!'],
  early: ['hoshino', 'Early. Early is not on time.']
};
DH.FINALE = [['ota', 'Hoshino-san. Thirty-eight years. The whole station is here.'], ['hoshino', '...And the last stop was yours, Rookie.'], ['hoshino', 'Here. My watch. It runs two seconds fast. I never told anyone.'],
  ['hoshino', 'A loop has no last station. Every ending is the next departure.'], ['mika', 'Welcome to the Halo Line, Driver!'], ['haro', 'Harooo!']];

/* ---------- tips (first time each mechanic appears; "Show tips" brings them back) ---------- */
DH.TIPS = {
  lever: ['power', 'brake', 'Lever: power up, brake down. One notch at a time.'],
  call: ['call', null, 'Point and call! Press it when a bracket shows around a signal or board.'],
  depart: ['call', null, 'The pilot lamp is lit: call "Shuppatsu, shinko!", then power.'],
  stop: ['brake', null, 'Watch the Stop Gauge. Ease to B1 in the last metres for SMOOTH.'],
  horn: ['horn', null, 'HORN board! Hold the horn for half a second in the next 150 m.'],
  ats: ['ats', null, 'ATS bell! Press to confirm, then brake for the red signal.'],
  limit: ['brake', null, 'A limit board: keep under the number until the train clears the END board.'],
  slip: ['power', null, 'Wheel slip! Use fewer power notches on wet rails.'],
  obstruction: ['eb', null, 'Red flashing emitter: something on the crossing. Stop before it!'],
  yy: ['brake', null, 'Two yellows: restricted, 25 km/h into the terminal.'],
  flash: ['horn', null, 'The other driver flashed his lights. Answer with the horn!'],
  ten: ['brake', null, 'Ten cars: stop on the 10 marker, 8 m past the 6.']
};

/* ---------- postcards ---------- */
DH.POSTCARDS = [
  { id: 1, title: 'Your First Halo', from: 'Haro-kun', note: 'Harooo! You stopped right on the mark! That is a PERFECT HALO! I drew you a picture.', shot: { stage: 'S1', s: 1560, tod: 7, cam: 'platform' } },
  { id: 2, title: 'Right at My Door!', from: 'Kota', note: 'Mister driver, the door stopped right where I was standing! I took a picture! Haro!', shot: { stage: 'S1', s: 1590, tod: 6.9, cam: 'platform' } },
  { id: 3, title: 'Rain or Shine', from: 'Mika', note: 'Not one slide in the rain! The old 3000 was purring. Thank you, Driver!', shot: { stage: 'S2', s: 6500, tod: 10.3, cam: 'chase', weather: 'rain' } },
  { id: 4, title: 'Takoyaki Saved', from: 'The festival stall', note: 'Our cart got stuck on the crossing and you stopped in time. Free takoyaki for life!', shot: { stage: 'S3', s: 11420, tod: 14.2, cam: 'cab' } },
  { id: 5, title: 'Not One Second', from: 'The timetable office', note: 'Every arrival on time at rush hour. The office has framed your printout.', shot: { stage: 'S4', s: 13650, tod: 17.6, cam: 'chaseHigh' } },
  { id: 6, title: 'The Last Halo', from: 'Tetsuo Hoshino', note: 'Rookie. The watch runs two seconds fast. Keep it that way. A loop has no last station. - T.H.', shot: { stage: 'S5', s: 20560, tod: 23.3, cam: 'platform' } },
  { id: 7, title: 'Point, Call, Proceed', from: 'Hoshino', note: 'Every call, at the right moment. You saw every signal before it saw you.', shot: { stage: 'S1', s: 690, tod: 6.8, cam: 'cab' } },
  { id: 8, title: 'Gentle Hands', from: 'The passengers', note: 'Not one drop of coffee spilled the whole trip. We noticed. Thank you.', shot: { stage: 'S3', s: 10420, tod: 14.1, cam: 'platform' } }
];
DH.BOARD_DEFAULT = [['HOSHINO', 9999 * 9], ['SATO', 72400], ['OTA', 61200], ['MIKA', 54800], ['HARO', 40000]];
})();
