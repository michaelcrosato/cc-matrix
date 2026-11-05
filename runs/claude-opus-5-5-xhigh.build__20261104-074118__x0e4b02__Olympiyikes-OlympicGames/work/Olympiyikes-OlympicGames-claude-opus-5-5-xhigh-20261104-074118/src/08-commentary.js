// O.Comms: two commentators and the stadium PA. CHIP BELLOWS (play-by-play, booming hyperbole) and DAME VERA VELOCITY
// (seven-time champion turned colour commentator, dry and sentimental). Lines come from banks by key (the event's own,
// then the generic ones), with cooldowns and priorities, shown in a lower third with a live portrait and subtitles and
// spoken in gibberish. Lines name athletes by {name} and never by a gendered pronoun.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;

// the commentators' rigs (portraits)
const chipRig = new E.Humanoid({ build: 'heroic', size: 1.25, weapon: null, hair: 'short', outfit: 'coat', colors: { hair: '#5a3a1a', skin: '#e0b090', cloth: '#2a3a8a', coat: '#2a3a8a', trim: '#f2b632' } });
const veraRig = new E.Humanoid({ build: 'heroic', size: 1.25, weapon: null, hair: 'long', outfit: 'coat', colors: { hair: '#d8d8e8', skin: '#c88a5e', cloth: '#7a2a4a', coat: '#7a2a4a', trim: '#f2b632' } });
const coachRig = new E.Humanoid({ build: 'bulky', size: 1.25, weapon: null, hair: 'bald', outfit: 'coat', colors: { skin: '#f2d4c4', cloth: '#2a5a3a', coat: '#2a5a3a' } });
const SPEAKERS = {
  chip: { name: 'CHIP BELLOWS', rig: chipRig, voice: 'chip', color: '#7fb2ff' },
  vera: { name: 'DAME VERA VELOCITY', rig: veraRig, voice: 'vera', color: '#ff9ad0' },
  pa: { name: 'STADIUM PA', rig: null, voice: 'pa', color: '#ffe066' },
  coach: { name: 'COACH BRUNO', rig: coachRig, voice: 'coach', color: '#6fe0c0' },
  yikesy: { name: 'YIKESY', rig: null, voice: 'yikesy', color: '#ff7a1a' }
};
let maxRig = null;
const speaker = id => {
  if (SPEAKERS[id]) return SPEAKERS[id];
  if (id === 'max' || O.NATION_IDS && O.NATION_IDS.includes(id)) {
    const nid = id === 'max' ? 'TRB' : id, n = O.nation(nid);
    if (id === 'max') { if (!maxRig) maxRig = O.makeRig('TRB', 'ceremony'); return { name: 'MAX OVERDRIVE', rig: maxRig, voice: O.voiceOf('TRB'), color: '#e23b2e' }; }
    const k = '_rig' + nid; if (!SPEAKERS[k]) SPEAKERS[k] = { name: n.athlete.name, rig: O.makeRig(nid, 'ceremony'), voice: O.voiceOf(nid), color: n.colors.a };
    return SPEAKERS[k];
  }
  return SPEAKERS.chip;
};
O.speaker = speaker;

// ---------------------------------------------------------------------------------------------------------------
// the banks
// ---------------------------------------------------------------------------------------------------------------
const C = t => ['chip', t], V = t => ['vera', t], P = t => ['pa', t], X = t => ['max', t];
const BANK = O.COMMS_BANK = {
  generic: {
    start: [C('And they\'re OFF!'), C('Here we go, folks, the moment of truth!'), V('Breathe. That\'s all I ever told myself. Breathe and go.'), C('The waiting is over! The Games are ON!')],
    lead: [C('{name} takes the lead for {nation}!'), C('{name} hits the front and the crowd is ON ITS FEET!'), V('{name} has the lead. Now the hard part: keeping it.'), C('{nation} is in front! Somebody tell {nation}!')],
    close: [C('Too close to call!'), V('Somebody fetch a ruler. A very small ruler.'), C('Neck and neck! Nose and nose! Eyebrow and eyebrow!')],
    photo: [C('We go to the PHOTO!'), V('Grab some popcorn, Chip. Photos take a while.'), C('PHOTO FINISH! Nobody breathe! Somebody breathe for me!')],
    wr: [[C('A NEW WORLD RECORD! Somebody call the record books!'), C('Somebody call the record books\' MOTHER!')], V('I held a world record once. For eleven minutes. Cherish this.'), C('WORLD RECORD! History made right here, right now!'), [C('That is the best anyone has EVER done that, Vera.'), V('Ever is a long time, Chip. Today it is true.')]],
    gr: [C('A new Games record!'), V('Every record starts as somebody\'s good day.')],
    pb: [C('A personal best for {name}!'), V('Personal bests are the only records that really matter. Don\'t tell the record books.')],
    yikes: [C('OLYMPIYIKES! That\'s going on the highlight reel for a thousand years!'), V('{name} is okay. The equipment will need counseling.'), [C('OH NO. Oh no no no.'), C('Oh... yes, actually, that was amazing.')], V('I did that once. They named a sauce after it.'), C('YIKES! The replay department is weeping with joy!')],
    falsestart: [C('Too eager! The gun hadn\'t even THOUGHT about firing!'), V('Nerves. I once false-started a press conference.'), C('False start! Back to the blocks!')],
    foul: [C('Over the line! The judges say NO!'), V('Lines are there for a reason. Mostly to be stepped on.'), C('Red flag! No mark!')],
    turbo: [C('{name} is ON FIRE!'), [C('LOOK at that! Is that legal? Vera, is that legal?'), V('Entirely. I checked in 1988.')], C('YIKES TURBO! {name} has gone NUCLEAR!'), V('That\'s not adrenaline, Chip. That\'s a small sun.')],
    win: [C('GOLD for {nation}!'), V('Somewhere, a small town is throwing a very loud party.'), C('{name} wins it! {nation}, put the kettle on!')],
    lose: [V('{name} will be back. They always come back.'), C('Not today for {name}, but what a show!')],
    last: [V('Last place is still a place at the Games. Remember that.'), C('Somebody has to finish last, and {name} did it with STYLE.')],
    comeback: [C('What a COMEBACK from {name}!'), V('Never count out an athlete who has fallen down. They know the floor. They are not afraid of it.')],
    rivalBeat: [X('That was a fluke. A very fast fluke.'), X('I let you have that one. For morale. Yours.'), X('I\'m not crying. Turbonians don\'t cry. We vent.'), X('Enjoy it. I\'m writing this down.')],
    rivalWins: [X('Second place is just first loser. That\'s a quote. Mine.'), X('Did you see me? Everybody saw me.'), X('Was there ever any doubt? No. There was not.')],
    idle: [V('Fun fact, Chip: the medals here are made from recycled trophies.'), C('What a day for it, folks!'), V('I trained on a frozen pond with one skate. We were poor, but we were fast.'), C('The atmosphere here is ELECTRIC! The wiring, less so.'), V('Every athlete here has a story. Most of them involve a parent driving very early in the morning.')],
    dnf: [V('Not finishing hurts. Starting took courage, though.'), C('{name} did not finish, folks.')],
    dq: [C('Disqualified! The rules are the rules!'), V('Twice is a pattern, Chip.')],
    qualify: [C('{name} makes the qualifying mark!'), V('Through. Breathe out.')],
    noqualify: [C('No qualifying mark! YIKES!'), V('Shake it off. Again.')]
  },
  sprint: {
    intro: [P('In lane {lane}... representing {nation}... {name}!')],
    marks: [C('On your marks...'), V('Ten seconds. A whole life of training for ten seconds.')],
    start: [C('That\'s not a start, that\'s a LAUNCH!'), C('BANG! And they\'re away!'), V('Clean start. Lovely.')],
    half: [C('Halfway and {name} is FLYING!'), V('Fifty metres. This is where the legs start asking questions.')],
    lead: [C('{name} hits the front!'), C('{name} is pulling away! Look at those KNEES!')],
    faceplant: [C('FACEPLANT! {name} has eaten the track!'), V('That track has seen worse. Not much worse.')],
    dip: [C('What a DIP at the line!'), V('The lean. Always lean. I leaned so hard once I won by a nose. Literally.')],
    win: [C('{name} is the fastest human at the Games!'), V('Faster than the ostrich, I hope.')],
    extra: [C('Ten seconds of pure, uncut SPEED!'), V('Sprinters are the only people who can be late in under ten seconds.')]
  },
  javelin: {
    start: [C('{name} begins the run-up...'), V('Speed first, then the angle. It\'s not complicated. It\'s just hard.')],
    throw: [C('That javelin is still climbing!'), C('UP it goes! Look at it GO!'), V('Lovely release. You could hang laundry on that arc.')],
    far: [C('A MONSTER throw from {name}!'), V('Somewhere in that sector, a groundskeeper is sighing.')],
    stadium: [C('It\'s left the stadium! Someone check the parking lot!'), C('OUT OF THE STADIUM! I hope that car has insurance!')],
    blimp: [C('IT HIT THE BLIMP! BLIMP BUSTER!'), V('Nobody was in the blimp, Chip. I hope.')],
    flat: [C('FLAT! It bounced! BOING!'), V('Javelins are meant to stick, dear. Like friendships.')],
    foul: [C('Over the line! The judge has the red flag out!'), V('Toes, toes, toes. It\'s always the toes.')],
    extra: [V('Javelin started as hunting. Now it\'s mostly hoping.'), C('Spear-chucking at the HIGHEST level!')]
  },
  swim: {
    start: [C('Into the water they go!'), V('The dive is free speed. Never waste free speed.')],
    turn: [C('Perfect turn! Like a dolphin with a mortgage to pay!'), V('I could never do flip turns. I did flip-flops.')],
    bonk: [C('BONK! Straight into the wall!'), V('The wall always wins. Walls are undefeated.')],
    gasp: [C('{name} forgot to BREATHE!'), V('Breathing is underrated. I recommend it.')],
    flop: [C('BELLY FLOP START! That stung from up here!'), V('Ooh. That\'s going to be pink for a week.')],
    touch: [C('{name} touches the wall!'), V('A long reach wins races. So do short fingernails.')],
    dolphin: [C('DOLPHIN MODE! Is that an actual dolphin?!'), V('It seems to be cheering, Chip.')],
    extra: [C('Fifty metres of churning, splashing GLORY!'), V('In the water there are no excuses. Only bubbles.')]
  },
  diving: {
    start: [C('{name} on the ten metre platform...'), V('Ten metres. It looks higher from up there. Trust me.')],
    rip: [C('A rip entry! You could hear a pin drop! You could NOT hear that diver!'), V('No splash. Like slipping into a warm bath.')],
    good: [C('Clean entry! The judges like that!'), V('Toes pointed. Mother would be proud.')],
    flop: [C('SLAP! You could hear that one in the next time zone!'), V('The judges are soaked. They are holding up wet cards.')],
    over: [C('Over-rotated! Too much spin!'), V('A little too much enthusiasm in the somersault department.')],
    hard: [C('{name} is going for the YIKES dive! Five and a half somersaults!'), V('That dive should not exist. And yet here we are.')],
    tens: [C('TENS! ALL TENS!'), V('Perfection, Chip. I need a moment.')],
    extra: [V('Diving is falling with opinions.'), C('Gravity is undefeated, but today it\'s being judged on style!')]
  },
  archery: {
    start: [C('{name} nocks an arrow...'), V('Quiet now. Archers can hear you thinking.')],
    x: [C('Dead centre! The wind didn\'t stand a chance!'), C('BULLSEYE! Right in the X!'), V('The middle of the middle. Marvellous.')],
    good: [C('Into the gold!'), V('Steady hands, steady heart.')],
    bad: [C('Oh, that drifted. The wind took it.'), V('I tried archery once. The target was very relieved.')],
    robin: [C('ROBIN HOOD! It split the arrow!'), V('That\'s a very expensive arrow ruined in a very beautiful way.')],
    slap: [C('STRING SLAP! OW!'), V('Never release while gasping. Lesson learned. Painfully.')],
    breath: [V('Hold the breath. Hold it. Now.'), C('{name} is holding that breath!')],
    extra: [C('Seventy metres! That target is the size of a pizza from here!'), V('Archery is ninety percent patience and ten percent more patience.')]
  },
  weights: {
    start: [C('{name} approaches the bar...'), V('Chalk, breathe, believe. In that order.')],
    clean: [C('Look at that bar BEND!'), C('Up to the shoulders! What a clean!')],
    jerk: [C('And the JERK! Arms locked!'), V('Split the legs, lock the arms, think about nothing.')],
    good: [C('Three white lights! GOOD LIFT!'), V('Gravity loses one. Write it down.')],
    drop: [C('DROPPED IT! The floor felt that one!'), V('The bar is fine. The athlete is fine. The floor has filed a complaint.')],
    yikesbar: [C('{name} has called for the YIKES BAR!'), V('That bar weighs as much as a small piano. A very dense piano.')],
    crack: [C('The FLOOR is CRACKING!'), V('Structural engineers, please report to the platform.')],
    extra: [C('Raw. Unfiltered. POWER!'), V('My grandmother lifted pianos. She wasn\'t a weightlifter. She was a piano mover.')]
  },
  skijump: {
    start: [C('{name} is on the bar at the top of the hill...'), V('Down there is the landing. Up here is the courage.')],
    fly: [C('{name} is flying! Still flying? STILL FLYING!'), V('Gravity always wins. It just takes its time.')],
    far: [C('BEYOND THE K-POINT! What a jump!'), V('That\'s what we call going the distance, Chip. Literally.')],
    telemark: [C('Telemark landing! Beautiful!'), V('One knee down, like a proposal. The judges said yes.')],
    crash: [C('CRASH! Skis everywhere!'), V('{name} is okay. The snow will need counseling.')],
    table: [C('Fell off the table! No take-off at all!'), V('That was more of a ski step than a ski jump.')],
    rocket: [C('ROCKET SKIS! Somebody check the rule book!'), V('I checked, Chip. Nothing about rockets.')],
    extra: [C('Ninety kilometres an hour and then... NOTHING beneath them!'), V('Ski jumpers are birds who were told no and did it anyway.')]
  },
  downhill: {
    start: [C('{name} out of the start hut!'), V('The Yikes Face. They named it that for a reason.')],
    fast: [C('One hundred and thirty kilometres an hour down a frozen cliff. On purpose.'), C('{name} is a BULLET!')],
    gate: [C('Through the gate, clean!'), V('Tight line. Beautiful.')],
    miss: [C('Missed the gate! That\'s a penalty!'), V('Half a second. You feel it in your stomach.')],
    crash: [C('Into the netting! The netting has done its job!'), V('Somebody give the netting a medal.')],
    jump: [C('Big air off the Kangaroo Kicker!'), V('Keep the skis together. Keep the lunch down.')],
    avalanche: [C('AVALANCHE MODE! The mountain is chasing {name}!'), V('That is not a metaphor, Chip.')],
    extra: [C('The Yikes Face! Thirty-eight degrees of PURE TERROR!'), V('When I raced downhill I prayed in four languages.')]
  },
  bobsled: {
    push: [C('Big push from {name}!'), V('The start is half the race. The other half is not crashing.')],
    load: [C('And they\'re in! Clean load!'), V('Nobody left behind. That\'s teamwork.')],
    late: [C('LATE LOAD! The brakeman is still outside!'), V('One leg in, one leg sightseeing.')],
    curve: [C('Through the Omega like it isn\'t even there!'), C('Into the Kreisel! Feel those G-forces!')],
    flip: [C('They\'re upside down! Still fast, though!'), V('On the roof. Still sliding. Bobsled is a very honest sport.')],
    skid: [C('Skidding! Losing time!'), V('Sparks are pretty. Sparks are slow.')],
    jet: [C('JET SLED! Is that... a jet engine?'), V('It\'s called aerodynamic hospitality, apparently.')],
    extra: [C('Two athletes, one sled, ZERO brakes until the finish!'), V('A bobsled is a bathtub with ambition.')]
  },
  figure: {
    start: [C('{name} takes the ice for the free skate...'), V('The music. Listen to the music. The ice will do the rest.')],
    jump: [C('A big jump! Clean landing!'), V('Like a feather that has been to the gym.')],
    quad: [C('A quad! A QUAD YIKES!'), V('Grandpa would be whistling now.')],
    fall: [C('A fall! But {name} is up again!'), V('Falling is part of skating. Getting up is the skating.')],
    spin: [C('Look at that spin! A blur!'), V('If you spin long enough, the world spins with you.')],
    coach: [['coach', 'Watch me first! Then you!'], V('Coach\'s Corner. Listen, then answer.')],
    star: [C('STAR POWER! Glitter EVERYWHERE!'), V('That\'s going to be in the ice for years.')],
    extra: [V('Figure skating is a sport. And a dance. And a prayer.'), C('The ice is a stage tonight!')]
  },
  curling: {
    start: [C('{name} settles into the hack...'), V('Curling is chess on ice, if chess had brooms.')],
    sweep: [C('HURRY HARD! HURRY HARD!'), V('Sweep, sweep, sweep! Oh, I get so emotional.')],
    takeout: [C('Double takeout! The house has been CLEARED!'), C('Takeout! Gone!')],
    draw: [C('A perfect draw to the button!'), V('Like parking a car in a postage stamp.')],
    slip: [C('OVER-THROW SLIP! Down goes {name}!'), V('That ice is slippery. That\'s the whole point of ice.')],
    own: [C('OWN GOAL! It knocked out its own stone!'), V('Friendly fire, Chip. On ice.')],
    end: [C('End of the end!'), V('Granite, ice and nerves.')],
    extra: [['MTP', 'Back home we curl to settle arguments. Mostly about curling.'], V('Forty-four pounds of granite and a dream.')]
  },
  hockey: {
    faceoff: [C('The puck drops! THE FINAL is underway!'), V('Two nations. One puck. A lot of padding.')],
    goal: [C('{name} shoots... and SCORES!'), C('GOAL! GOAL! GOOOOAL!'), V('The goal light is on and so is the crowd.')],
    save: [C('What a save!'), V('Goalies are the bravest people I know. And the strangest.')],
    check: [C('Into the glass! The glass is fine. The glass is always fine.'), C('BIG HIT!')],
    fire: [C('{name} is ON FIRE! The puck is literally on fire!'), V('That\'s a health and safety conversation for later.')],
    period: [C('End of the period!'), V('Time to resurface the ice. And our nerves.')],
    overtime: [C('OVERTIME! Sudden death!'), V('Next goal wins. I can\'t look. I\'m looking.')],
    shootout: [C('A SHOOTOUT! It comes down to THIS!'), V('One skater, one goalie, one second of courage.')],
    extra: [C('Ice hockey: like chess, if chess hit you!'), V('The organist has been waiting all fortnight for this.')]
  }
};

// ---------------------------------------------------------------------------------------------------------------
// the voice of the broadcast
// ---------------------------------------------------------------------------------------------------------------
const PRIO = { wr: 5, yikes: 4, faceplant: 4, crash: 4, flop: 4, bonk: 4, flip: 4, drop: 4, fall: 4, slip: 4, photo: 3, falsestart: 4, win: 3, goal: 4, lead: 2, idle: 0, extra: 0 };
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v && v[k] !== undefined ? v[k] : m);
O.Comms = {
  queue: [], current: null, cool: {}, lastT: -99, t: 0, enabled: true, event: null, log: [],
  reset() { this.queue = []; this.current = null; this.cool = {}; this.lastT = -99; },
  pick(key, ev) { const bank = (ev && BANK[ev] && BANK[ev][key]) || BANK.generic[key]; if (!bank || !bank.length) return null; const h = (O.hash(key + ':' + (this.t * 1000 | 0)) + (this.count = (this.count || 0) + 1)) % bank.length; return bank[h]; },
  /** cue a line by key: O.Comms.cue('lead', { name, nation }, { prio }) */
  cue(key, vars = {}, o = {}) {
    if (O.sandbox) return false;
    const prio = o.prio !== undefined ? o.prio : PRIO[key] !== undefined ? PRIO[key] : 1, now = this.t;
    if (!o.force) { if (this.cool[key] && now - this.cool[key] < (o.cool || 7)) return false; if (this.current && prio <= this.current.prio) return false; if (now - this.lastT < 1.2 && prio < 3) return false; }
    const line = this.pick(key, o.event !== undefined ? o.event : this.event); if (!line) return false;
    this.cool[key] = now;
    const parts = Array.isArray(line[0]) ? line : [line];
    this.queue = parts.map(([sp, tx]) => ({ sp, text: fill(tx, vars).toUpperCase(), prio, key }));
    this.current = null; this.next();
    return true;
  },
  say(sp, text, o = {}) { if (O.sandbox) return; this.queue.push({ sp, text: String(text).toUpperCase(), prio: o.prio || 2, key: 'say' }); if (!this.current) this.next(); },
  next() {
    const q = this.queue.shift(); if (!q) { this.current = null; game.audio.talkDuck = 1; game.audio.applyVolume(); return; }
    const S = speaker(q.sp), dur = Math.max(1.8, O.Voice.duration(q.text, S.voice) + .9);
    q.dur = Math.min(5.5, dur); q.t = 0; q.S = S; this.current = q; this.lastT = this.t;
    this.log.push(q.text); if (this.log.length > 40) this.log.shift();
    if (game.settings.commentary !== 'off') { O.Voice.speak(q.text, S.voice); game.audio.talkDuck = .7; game.audio.applyVolume(); }
  },
  update(rdt) { this.t += rdt; const c = this.current; if (!c) return; c.t += rdt; if (c.t >= c.dur) this.next(); },
  draw(g, W, H, o = {}) {
    const c = this.current; if (!c || game.settings.commentary === 'off' || !this.enabled || (O.Dev && O.Dev.photo)) return;
    const compact = !!o.compact, huge = O.textK() > 1, k = compact ? (huge ? 2 : 1) : (huge ? 3 : 2), S = c.S;
    const maxW = compact ? Math.max(150, Math.min(W - 290, 280)) : Math.min(W - 110, 330 * (k / 2));
    const lines = E.font.wrap(c.text, maxW, { scale: k }).slice(0, compact ? 3 : 2), lh = k * 9 + (compact ? 1 : 2);
    const portrait = compact ? 26 : 40, ph = Math.max(portrait + 6, 13 + lines.length * lh), pw = Math.min(W - 24, Math.max(...lines.map(l => E.font.width(l, { scale: k }))) + portrait + 20);
    const x = Math.round((W - pw) / 2), y = Math.round(o.top !== undefined ? o.top : (o.y !== undefined ? o.y : H - 40) - ph);
    const a = Math.min(1, c.t / .15, (c.dur - c.t) / .25); if (a <= 0) return;
    px.blend(g, .84 * a, 'normal', () => px.rect(g, x, y, pw, ph, '#070a1e'));
    px.rect(g, x, y, 2, ph, S.color); px.rect(g, x, y + ph - 1, pw, 1, '#f2b632');
    const py = y + Math.round((ph - portrait) / 2);
    if (S.rig) { S.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: Math.floor(c.t * 8) % 2 ? 'shout' : 'smile' }); S.rig.drawPortrait(g, x + 5, py, portrait, { bg: '#1a2050', zoom: compact ? 2 : 3 }); }
    else if (c.sp === 'pa') { E.ui.box(g, x + 3, py - 2, portrait + 4, portrait + 4, { bg: '#1a2050' }); const cy = py + portrait / 2, cx = x + 6; px.poly(g, [[cx + 3, cy - 4], [cx + 9, cy - 4], [cx + portrait - 6, cy - portrait / 2 + 4], [cx + portrait - 6, cy + portrait / 2 - 4], [cx + 9, cy + 4], [cx + 3, cy + 4]], '#ffe066'); }
    else if (c.sp === 'yikesy' && O.Art) { E.ui.box(g, x + 3, py - 2, portrait + 4, portrait + 4, { bg: '#1a2050' }); O.Art.emblem(g, x + 5 + portrait / 2, py + portrait / 2, portrait * .38); }
    const tx = x + portrait + 13;
    E.font.text(g, S.name, tx, y + 3, S.color, { shadow: '#000', outline: false, font: compact ? 'tiny' : undefined });
    lines.forEach((l, i) => E.font.text(g, l, tx, y + (compact ? 10 : 13) + i * lh, '#ffffff', { scale: k, shadow: '#000', outline: false }));
  }
};
O.updaters.push(rdt => O.Comms.update(rdt));
})();
