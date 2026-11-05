/* 22-stages: the stages as data: route, train, time of day, weather, timetable, events, and every line of story.
 * Timetables start from the plan's values; tools/calibrate.mjs runs the autopilot at minimum time and 23-timetable.js
 * holds the calibrated clocks (par arrives 6-12 s early on Normal). Writing style: short, earnest railway sentences;
 * announcements formal and repeated; Hoshino terse and proverbial; Mika cheerful. */
(() => {
'use strict';
const DH = window.DH;
const L = (who, text, o) => Object.assign({ who, text }, o);
DH.STAGES = {
  S0: { id: 'S0', name: 'DAWN DEPOT', sub: 'Tutorial', route: 'depot', train: 'h8000', cars: 6, track: 'A', tod: 5.5, weather: 'clear', tutorial: true, noATS: true, lead: 6, sunAz: -1.2,
    stops: [{ id: 'depot', dep: '05:30:00' }, { id: 'depot', arr: '05:40:00' }], passes: [],
    teaches: ['The lever: power, coast, brake', 'Stopping on a mark', 'The departure call', 'A speed limit', 'A smooth stop', 'The emergency brake'],
    briefing: [L('hoshino', 'So. You\'re the new one.'), L('hoshino', 'Thirty-eight years I drove this ring. Not one second late. Today is my last day.'), L('hoshino', 'Your paperwork says you can drive. The rails don\'t read paperwork.'), L('mika', 'Good morning! I\'m Mika, your conductor today. Don\'t mind him. He likes you already.')],
    results: { S: 'Signed. Do not let it go to your head.', A: 'Signed. The 06:40 is waiting, Rookie.', B: 'Signed. Barely.', C: 'Signed. We will practise more.', D: 'I signed it. My hand did. Not my heart.' },
    gameOver: 'That\'s enough. Hand me the key.' },
  S1: { id: 'S1', name: 'FIRST LIGHT LOCAL', route: 'halo', train: 'h8000', cars: 6, track: 'A', tod: 6.62, weather: 'clear', sunAz: .9,
    stops: [{ id: 'akari', dep: '06:40:00' }, { id: 'hanabatake', arr: '06:42:05', dep: '06:42:30' }, { id: 'kujira', arr: '06:44:45' }], passes: [],
    teaches: ['The timetable and the clock', 'The departure procedure', 'Point and call', 'The horn board', 'A limit board', 'An oncoming train', 'Crossing bells'],
    briefing: [L('mika', 'Good morning, Driver! Conductor Aoba, at the back. Call me Mika!'), L('hoshino', 'The 06:40 local. Akari Central to Kujira-bashi. Two stops.'), L('hoshino', 'Arrive on the second. Early is not on time. Late is not on time.'), L('mika', 'Melody, doors, my buzzer, then she\'s all yours!')],
    events: [
      { type: 'radio', at: { start: 1 }, lines: [L('pa', 'Thank you for riding the Halo Line. This is a local train for Kujira-bashi.')] },
      { type: 'radio', at: { s: 120 }, lines: [L('hoshino', 'Point at the board. Say it out loud. The rails like to know you are awake.')] },
      { type: 'radio', at: { s: 700 }, lines: [L('pa', 'The next station is Hanabatake. Hanabatake. The doors on the left side will open.')] },
      { type: 'radio', at: { s: 1000 }, lines: [L('hoshino', 'Horn board. Hold it half a second. Let the crossing hear you.')] },
      { type: 'kota', at: { dwell: 'hanabatake' } },
      { type: 'oncoming', at: { s: 2000 }, track: 'B', livery: 'h8000', cars: 6, v: 80 },
      { type: 'radio', at: { s: 2250 }, lines: [L('hoshino', 'The fishermen under the bridge like to know we\'re coming.')] },
      { type: 'radio', at: { s: 2650 }, lines: [L('pa', 'The next station is Kujira-bashi. Kujira-bashi. The doors on the right side will open.')] }
    ],
    results: { S: '...Exactly there. Exactly then.', A: 'Good. Now do it four hundred more times.', B: 'Acceptable. Your brakes are nervous.', C: 'You drove. That is all I will say.', D: 'We will talk about this at the depot.' },
    gameOver: 'That\'s enough. Hand me the key.' },
  S2: { id: 'S2', name: 'HARBOR RAIN RAPID', route: 'halo', train: 'h3000', cars: 6, track: 'A', tod: 10.25, weather: 'rain', sunAz: 2.2,
    stops: [{ id: 'kujira', dep: '10:15:00' }, { id: 'minato', arr: '10:16:55', dep: '10:17:20' }, { id: 'okiku', arr: '10:22:15' }], passes: [{ id: 'todai', at: '10:20:20' }],
    teaches: ['The old 3000: two handles, slow brakes', 'Rain: wheel slip and slide', 'Yellow signals', 'ATS confirm', 'A tunnel', 'Passing a station'],
    briefing: [L('hoshino', 'Today, the old 3000. She\'s older than you. Her brakes think slowly. Ask early.'), L('mika', 'Umbrellas everywhere! The rails will be slippery!'), L('hoshino', 'Rain takes the grip from your wheels. Gentle on the power. Gentle on the brake.')],
    events: [
      { type: 'radio', at: { start: 1 }, lines: [L('pa', 'This is a Rapid service for Okiku-dera. We will not stop at Todai-shita.')] },
      { type: 'freight', at: { start: 1 } },
      { type: 'radio', at: { clock: '10:15:12' }, lines: [L('dispatch', 'Halo 1015, freight ahead of you through the cliff tunnel. Expect restrictive signals.')] },
      { type: 'radio', at: { dwell: 'minato' }, lines: [L('mika', 'Harbor Front! Mind the puddles, everyone!')] },
      { type: 'radio', at: { s: 6560 }, lines: [L('pa', 'We are now passing Todai-shita. The next stop is Okiku-dera.')] },
      { type: 'radio', at: { s: 7700 }, lines: [L('pa', 'The next station is Okiku-dera. Okiku-dera. The doors on the left side will open.')] }
    ],
    results: { S: 'Rain, a freight and the old 3000. And you were on the mark.', A: 'The rain did not frighten you. Good.', B: 'You slid. You recovered. Next time, do not slide.', C: 'The 3000 forgave you. I am still thinking about it.', D: 'Her brakes think slowly. Yours did not think at all.' },
    gameOver: 'That\'s enough. The rain wins today. Hand me the key.' },
  S3: { id: 'S3', name: 'TEMPLE HILL LOCAL', route: 'halo', train: 'h8000', cars: 6, track: 'A', tod: 14.0, weather: 'clear', sunAz: -2.4, festival: true, lead: 24,
    stops: [{ id: 'okiku', dep: '14:00:00' }, { id: 'yuhi', arr: '14:02:40', dep: '14:03:00' }, { id: 'shotengai', arr: '14:05:30' }], passes: [],
    teaches: ['Gradients, up and down', 'A slow order and the horn for workers', 'An emergency stop for an obstruction', 'A festival crowd'],
    briefing: [L('mika', 'It\'s the Chrysanthemum Festival! The whole town is out!'), L('hoshino', 'Up the hill it\'s easy to be slow. Down it, easy to be fast.'), L('hoshino', 'Track workers past the temple. Horn when you see them. Twenty-five through the work.')],
    events: [
      { type: 'festival', at: { start: 1 } },
      { type: 'radio', at: { start: 1 }, lines: [L('pa', 'Okiku-dera. Okiku-dera. Festival visitors, please mind the gap.')] },
      { type: 'radio', at: { s: 9250 }, lines: [L('hoshino', 'Twenty-five permille. Feed her power. Do not let her roll back.')] },
      { type: 'workers', at: { s: 9100 }, site: 'WK1' },
      { type: 'radio', at: { s: 9440 }, lines: [L('hoshino', 'Horn. Now.')] },
      { type: 'fuji', at: { dwell: 'yuhi' } },
      { type: 'radio', at: { dwell: 'yuhi' }, delay: 6, lines: [L('fuji', 'Thank you, driver-san!')] },
      { type: 'radio', at: { s: 10700 }, lines: [L('hoshino', 'Downhill now. The train wants to run. Do not let her.')] },
      { type: 'oncoming', at: { s: 11000 }, track: 'B', livery: 'h8000', cars: 6, v: 70 },
      { type: 'obstruction', at: { s: 10750 }, crossing: 'X3' },
      { type: 'radio', at: { s: 11760 }, lines: [L('pa', 'The next station is Shotengai. Shotengai. The doors on the left side will open.')] }
    ],
    results: { S: 'The takoyaki survived. So did we. Perfectly.', A: 'Up the hill and down it. You kept her honest.', B: 'The hill pushed you around. Push back next time.', C: 'The festival was nice. Your driving was a festival too.', D: 'Even the takoyaki cart drove better.' },
    gameOver: 'That\'s enough. The hill was steeper than you. Hand me the key.' },
  S4: { id: 'S4', name: 'SUNSET RUSH', route: 'halo', train: 'h8000', cars: 10, track: 'A', tod: 17.5, weather: 'clear', sunAz: .35, glare: [13750, 14600],
    stops: [{ id: 'shotengai', dep: '17:30:00' }, { id: 'daigaku', arr: '17:31:55', dep: '17:32:15' }, { id: 'koen', arr: '17:34:05' }], passes: [],
    teaches: ['Ten cars: the 10 marker, not the 6', 'Making up lost time without speeding', 'Staying calm beside a faster train'],
    briefing: [L('hoshino', 'Ten cars. Your marker is the 10, not the 6.'), L('mika', 'Rush hour! Every door, every car, full!'), L('hoshino', 'The Sky Liner runs beside us on the quad track. It is not a race. Remember that.')],
    events: [
      { type: 'rival', at: { start: 1 } },
      { type: 'radio', at: { s: 12300 }, lines: [L('ren', 'Evening, Halo Line! See you at Koen... if you can keep up!')] },
      { type: 'radio', at: { s: 12500 }, lines: [L('hoshino', 'Ignore him. He has his timetable. We have ours.')] },
      { type: 'radio', at: { s: 12900 }, lines: [L('pa', 'The next station is Daigaku-mae. Daigaku-mae. The doors on the left side will open.')] },
      { type: 'doorRush', at: { dwell: 'daigaku' } },
      { type: 'glare', at: { s: 13760 } },
      { type: 'radio', at: { s: 13900 }, lines: [L('hoshino', 'West sun. Squint if you must. Don\'t guess.')] },
      { type: 'oncoming', at: { s: 14300 }, track: 'B', livery: 'h8000', cars: 10, v: 75 },
      { type: 'radio', at: { s: 14700 }, lines: [L('pa', 'The next station is Sakura-Koen. Sakura-Koen. The doors on the left side will open.')] }
    ],
    results: { S: 'Ten cars, a door rush and the west sun. On the mark. ...Hm.', A: 'You did not race him. That is why you won.', B: 'Ten cars is long. Your stop was longer.', C: 'The Sky Liner had fun. We had a timetable.', D: 'Ren is still laughing. I can hear him from here.' },
    gameOver: 'That\'s enough. Rush hour beat you. Hand me the key.' },
  S5: { id: 'S5', name: 'THE LAST HALO', route: 'halo', train: 'h8000', cars: 6, track: 'A', tod: 23.17, weather: 'clear', sunAz: 0, finale: true,
    stops: [{ id: 'koen', dep: '23:10:00' }, { id: 'hoshimi', arr: '23:12:15', dep: '23:12:35' }, { id: 'kawasemi', arr: '23:14:35', dep: '23:14:55' }, { id: 'akari', arr: '23:17:05' }], passes: [],
    teaches: ['Night driving', 'Fog: trust the signals', 'The restricted aspect (YY)', 'The last train home'],
    briefing: [L('mika', 'Last train of the night... and Hoshino-san\'s last run.'), L('hoshino', 'Don\'t make it a ceremony. Drive it like any other train.'), L('hoshino', 'Fog on the heights tonight. When you can\'t see, the signals see for you.')],
    events: [
      { type: 'radio', at: { start: 1 }, lines: [L('pa', 'This is the last train for Akari Central. Thank you for riding the Halo Line today.')] },
      { type: 'fog', at: { s: 16000 }, s0: 16200, s1: 16800 },
      { type: 'radio', at: { s: 16190 }, lines: [L('hoshino', 'When you can\'t see, the signals see for you.')] },
      { type: 'flash', at: { s: 18950 } },
      { type: 'radio', at: { s: 19850 }, lines: [L('pa', 'The next station is Akari Central, the last stop. Thank you for riding the Halo Line today.')] },
      { type: 'radio', at: { s: 20300 }, lines: [L('hoshino', 'Two yellows. Restricted. Twenty-five into the platform. Slowly now.')] },
      { type: 'finale', at: { dwell: 'akari' } }
    ],
    results: { S: 'A loop has no last station. Every ending is the next departure.', A: 'Thirty-eight years. And the last stop was yours. Good.', B: 'Not my best last day. Not my worst.', C: 'They will remember the night. Not the stop.', D: '...It is still my last day. Let us say no more.' },
    gameOver: 'That\'s enough. Not tonight. Hand me the key.' },
  PR: { id: 'PR', name: 'PARALLEL RUN', sub: 'The Drivers\' Festival', route: 'halo', train: 'h8000', cars: 6, track: 'A', tod: 12, weather: 'clear', sunAz: 1.5, race: true, lead: 6,
    stops: [{ id: 'shotengai', dep: '12:00:00' }, { id: 'daigaku', arr: '12:01:55', dep: '12:02:15' }, { id: 'koen', arr: '12:04:05' }], passes: [],
    teaches: ['Four drivers, four tracks, one timetable'],
    briefing: [L('mika', 'The Drivers\' Festival! Four tracks, four trains, one timetable!'), L('hoshino', 'Best stop wins. Not the fastest. The best.')],
    events: [{ type: 'radio', at: { start: 1 }, lines: [L('pa', 'Festival special for Sakura-Koen. Please enjoy the Parallel Run.')] }],
    results: { S: 'A perfect festival run.', A: 'Good racing. Good stopping.', B: 'The others stopped better.', C: 'You came. You drove. You stopped. Somewhere.', D: 'The festival will remember you. Unfortunately.' },
    gameOver: 'That\'s enough.' }
};
DH.CAREER = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
DH.STAGE_ORDER = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'PR'];
/* ---- the tutorial's steps (S0): Hoshino says each; the next unlocks when its check holds ---- */
DH.TUTORIAL = [
  { id: 'p1', say: 'Lever up: power. P1. Gently.', hint: 'Lever up to P1, reach 10 km/h', done: r => r.train.v >= 10 },
  { id: 'coast', say: 'N. Let her coast.', hint: 'Lever to N', done: r => r.train.notch === 0 },
  { id: 'brake', say: 'Lever down: brake. Watch the needle, not your hand.', hint: 'Brake below 5 km/h', done: r => r.train.v < 5 },
  { id: 'mark1', say: 'The yellow board. Put your nose on it.', hint: 'Stop at Mark 1', mark: 300, stopAt: 300 },
  { id: 'depart', say: 'Before you move, point at the signal and say it. Shuppatsu, shinko.', hint: 'Point and call at the shunting signal', call: true },
  { id: 'forty', say: 'Forty is the limit. Forty is not a suggestion.', hint: 'Up to 40 under the 40 board, not over', done: r => r.s > 520 && r.train.v >= 30 },
  { id: 'mark2', say: 'Near the stop, ease off to B1. The passengers\' coffee will thank you.', hint: 'Stop at Mark 2, easing to B1', mark: 620, stopAt: 620, smooth: true },
  { id: 'eb', say: 'That is the emergency brake. You will hate the day you need it.', hint: 'Power to 20 km/h, then pull EB', eb: true },
  { id: 'mark3', say: 'Last mark. Inside one metre and I sign your card.', hint: 'Stop within 1 m of Mark 3', mark: 900, stopAt: 900, final: true }
];
DH.TUTORIAL_MORE = ['Halo Time is your life. Lose it all and I take the key.', 'Signals talk. ATS listens. Answer the bell with the confirm button.', 'Horn boards. Hold the horn half a second.'];
/* ---- the characters: name, colour, voice ---- */
DH.CHARS = {
  hoshino: { name: 'HOSHINO', full: 'Chief Instructor Tetsuo Hoshino', col: '#f2c230', voice: 'hoshino' },
  mika: { name: 'MIKA', full: 'Conductor Mika Aoba', col: '#7ad0ff', voice: 'mika' },
  pa: { name: 'ANNOUNCER', full: 'Station announcer', col: '#c8d0e0', voice: 'pa' },
  haro: { name: 'HARO-KUN', full: 'Haro-kun, the Halo Line mascot', col: '#fff4c0', voice: 'haro' },
  driver: { name: 'YOU', full: 'The driver', col: '#ffffff', voice: 'driver' },
  kota: { name: 'KOTA', full: 'Kota, a train fan', col: '#ffd040', voice: 'kota' },
  fuji: { name: 'GRANDMA FUJI', full: 'Grandma Fuji', col: '#e8a0c8', voice: 'fuji' },
  kenji: { name: 'KENJI', full: 'Kenji, salaryman', col: '#a0c8a0', voice: 'kenji' },
  ren: { name: 'REN', full: 'Ren Kurosawa, Sky Liner driver', col: '#c890ff', voice: 'ren' },
  sato: { name: 'SATO', full: 'Sato, old driver', col: '#d0b090', voice: 'sato' },
  ota: { name: 'STATION MASTER OTA', full: 'Station Master Ota', col: '#ff8a7a', voice: 'ota' },
  dispatch: { name: 'DISPATCH', full: 'Halo Line dispatcher', col: '#90e0a0', voice: 'pa' }
};
DH.FINALE = [L('ota', 'Hoshino-san. Thirty-eight years. The whole station is here.'), L('hoshino', '...And the last stop was yours, Rookie.'), L('hoshino', 'Here. My watch. It runs two seconds fast. I never told anyone.'), L('hoshino', 'A loop has no last station. Every ending is the next departure.'), L('mika', 'Welcome to the Halo Line, Driver!'), L('haro', 'Harooo!')];
/* ---- postcards: rewards in the Driver's Log ---- */
DH.POSTCARDS = [
  { id: 1, title: 'Your First Halo', from: 'Haro-kun', note: 'Harooo! Your first PERFECT HALO! The stop marker is still smiling. So am I!', scene: { route: 'halo', s: -60, h: 7, cam: 'platform' } },
  { id: 2, title: 'Right at My Door!', from: 'Kota', note: 'Mister driver! You stopped right at my door! I took a photo. It is blurry. It is my favourite.', scene: { route: 'halo', s: 1560, h: 7.2 } },
  { id: 3, title: 'Rain or Shine', from: 'Mika', note: 'Not one slide in the rain! The old 3000 purred like a cat. A wet cat. A happy wet cat.', scene: { route: 'halo', s: 4700, h: 10.3, w: 'rain' } },
  { id: 4, title: 'Takoyaki Saved', from: 'The takoyaki stand', note: 'You stopped in time! Free takoyaki for life. Well. For the festival.', scene: { route: 'halo', s: 11380, h: 14 } },
  { id: 5, title: 'Not One Second', from: 'Station Master Ota', note: 'Every arrival on the second, at rush hour. The timetable office sends its regards.', scene: { route: 'halo', s: 13550, h: 17.5 } },
  { id: 6, title: 'The Last Halo', from: 'Tetsuo Hoshino', note: 'Thirty-eight years. I have stopped worrying about the ring. It is in good hands. Keep the watch wound. -T.H.', scene: { route: 'halo', s: 20450, h: 23.3 } },
  { id: 7, title: 'Point, Call, Proceed', from: 'Hoshino', note: 'Every call, right on time. Your finger knows the line now.', scene: { route: 'halo', s: 2050, h: 12 } },
  { id: 8, title: 'Gentle Hands', from: 'The passengers of car 3', note: 'We did not spill a single coffee. Thank you, driver.', scene: { route: 'halo', s: 15200, h: 16.5 } }
];
})();
