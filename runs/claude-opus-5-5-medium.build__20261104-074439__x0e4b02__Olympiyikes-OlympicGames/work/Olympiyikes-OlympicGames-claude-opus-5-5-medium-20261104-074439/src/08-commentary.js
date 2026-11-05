/* OLYMPIYIKES! — commentary (§5.10, §7.6): Chip Bellows, Dame Vera Velocity, the stadium PA and Max Overdrive.
 * Lines are 'C:' Chip, 'V:' Vera, 'P:' PA, 'M:' Max, 'Y:' Yikesy, 'K:' the coach; ' || ' joins an exchange. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;

const BANK = {
  start: ['C:And they\'re OFF!', 'C:Here we go, folks, the moment of truth!', 'V:Breathe. That\'s all I ever told myself. Breathe and go.', 'C:The waiting is over!', 'V:Four years of training. Starting... now.'],
  lead: ['C:{name} takes the lead for {nation}!', 'C:{name} hits the front and the crowd is ON ITS FEET!', 'V:{name} has found another gear. I never found that gear.', 'C:{nation} in front! {nation} in FRONT!'],
  close: ['C:Too close to call!', 'V:Somebody fetch a ruler. A very small ruler.', 'C:Nothing in it! NOTHING!'],
  photo: ['C:We go to the PHOTO!', 'V:Grab some popcorn, Chip. Photos take a while.', 'C:A photo finish! My heart cannot take this!'],
  wr: ['C:A NEW WORLD RECORD! Somebody call the record books! Somebody call the record books\' MOTHER!', 'V:I held a world record once. For eleven minutes. Cherish this.', 'C:RECORD! RECORD! I am out of breath and I did nothing!', 'P:Ladies and gentlemen... a new World Record!'],
  pb: ['V:A personal best for {name}. Somewhere a coach is crying happy tears.', 'C:Personal best! Best they\'ve ever done, folks!'],
  yikes: ['C:OLYMPIYIKES! That\'s going on the highlight reel for a thousand years!', 'V:They\'re okay. The snow will need counseling.', 'C:OH NO. Oh no no no. Oh... yes, actually, that was amazing.', 'V:I did that once. In 1988. We don\'t talk about 1988.', 'C:YIKES! The crowd gasps! I gasp! We ALL gasp!', 'V:Dust yourself off, {name}. That\'s the whole sport, really.'],
  falsestart: ['C:Too eager! The gun hadn\'t even THOUGHT about firing!', 'V:Nerves. I once false-started a press conference.', 'P:False start. False start.'],
  foul: ['C:Over the line! The judges say NO!', 'V:Lines are there for a reason. Mostly to be stepped on.', 'C:Red flag! Oh, the agony!'],
  turbo: ['C:{name} is ON FIRE!', 'C:LOOK at that! Is that legal? Vera, is that legal? || V:Entirely. I checked in 1988.', 'C:YIKES TURBO! Hold onto your hats!', 'V:That\'s the hype talking. Let it talk.'],
  win: ['C:GOLD for {nation}!', 'V:Somewhere, a small town is throwing a very loud party.', 'C:{name} wins it! WINS IT!', 'V:Look at that face. That\'s why we do this.'],
  lose: ['V:Not today for {name}. But there\'s always a tomorrow. Usually.', 'C:Heartbreak for {nation}!'],
  last: ['V:Last place is still a place at the Games. Remember that.', 'C:They finished! And honestly? That counts!'],
  comeback: ['C:WHAT A COMEBACK!', 'V:Never count out a stubborn athlete. I was one.'],
  rivalBeat: ['M:That was a fluke. A very fast fluke.', 'M:I let you have that one. For morale. Yours.', 'M:I\'m not crying. Turbonians don\'t cry. We vent.', 'M:Rematch. Now. No? Fine. Later. Definitely later.'],
  rivalWins: ['M:Second place is just first loser. That\'s a quote. Mine.', 'M:Did you see me? Everybody saw me.', 'M:Another day, another medal. I should get a bigger neck.'],
  idle: ['V:You know, Chip, the Games are really about friendship. || C:And SPEED, Vera!', 'C:What a day for it here at Mount Glory and Sunny Bay!', 'V:The crowd is wonderful today. Somebody brought a tuba.', 'C:Our mascot Yikesy is apparently stuck in a vending machine.', 'V:I\'m told the hot dogs are summer AND winter themed. They\'re frozen.'],
  dnf: ['C:Oh no, {name} doesn\'t finish!', 'V:Sometimes the body says no. The body is rude.'],
  qualify: ['V:A qualifying mark! On to the next day.', 'C:That\'ll do it! That\'ll do it!'],
  noqualify: ['V:No qualifying mark. Deep breath, try again.', 'C:Not enough! The torch flickers!'],
  halftimeLead: ['M:Halftime means nothing. I\'m a second-half athlete.'],
  halftimeTrail: ['M:Halfway home, and already bored of winning.'],
  /* per event */
  sprint: ['C:Ten seconds. A whole life of training for ten seconds.', 'C:That\'s not a start, that\'s a LAUNCH!', 'V:Arms, arms, arms! The legs follow the arms.', 'C:They\'re flying down the straight!', 'V:The lean at the line. Always the lean.', 'C:Did anyone get the license plate of THAT sprinter?', 'P:In lane {lane}... representing {nation}... {name}!', 'V:One hundred meters. It takes longer to say it.'],
  javelin: ['C:That javelin is still climbing!', 'C:It\'s left the stadium! Someone check the parking lot!', 'V:The angle, Chip. It\'s all about the angle.', 'C:A MONSTER throw!', 'V:The wind is helping today. The wind is a fan.', 'C:Look at the arm on {name}!', 'V:Run, plant, throw. Don\'t step over. Simple. Never simple.', 'C:Where did it GO?'],
  swim: ['C:Perfect turn! Like a dolphin with a mortgage to pay!', 'V:I could never do flip turns. I did flip-flops.', 'C:Stroke, stroke, BREATHE!', 'V:Rhythm is everything in the water.', 'C:Two lengths of pure fury!', 'V:Splashing is wasted energy. Ask any duck.', 'C:They\'re neck and neck! Well, cap and cap!', 'C:Into the wall! Out of the wall! What a turn!'],
  diving: ['C:A rip entry! You could hear a pin drop. You could NOT hear that diver!', 'C:SLAP! You could hear that one in the next time zone.', 'V:Ten meters. That\'s three floors. Into a bathtub.', 'C:Tuck, tuck, tuck... and OPEN!', 'V:The judges are very serious people. They have clipboards.', 'C:The armstand quintuple! Is that even allowed?', 'V:A clean entry is a quiet entry.', 'C:Look at those rotations!'],
  archery: ['C:Dead center! The wind didn\'t stand a chance.', 'V:I tried archery once. The target was very relieved.', 'C:A BULLSEYE!', 'V:Hold the breath. Let the arrow go. Let it go.', 'C:ROBIN HOOD! An arrow through an arrow!', 'V:The heart rate is the real opponent here.', 'C:The wind is gusting, folks. Aim off!', 'C:Into the gold!'],
  weights: ['C:Look at that bar BEND!', 'C:Three white lights! GOOD LIFT!', 'V:The lift happens in the mind first. Then the knees.', 'C:Up, up, UP!', 'V:Steady. Steady. Steady. Now.', 'C:The floor is shaking! The FLOOR is shaking!', 'V:I tried weightlifting once. I lifted a sandwich. Proudly.', 'C:That\'s more than a small car!'],
  skijump: ['C:{name} is flying! Still flying? STILL FLYING!', 'V:Gravity always wins. It just takes its time.', 'C:A TELEMARK! Beautiful!', 'V:Lean into the air. Trust it. It\'s mostly air.', 'C:Past the K-point!', 'C:Off the table... and AWAY!', 'V:The landing is where poems end.', 'C:Is that the hill record?'],
  downhill: ['C:One hundred and thirty kilometers an hour down a frozen cliff. On purpose.', 'C:Into the netting! The netting has done its job!', 'V:Tuck low, think small, be the snowball.', 'C:Through the gate!', 'V:The Yikes Face. They named it after the face you make.', 'C:Airborne! AIRBORNE!', 'C:Green on the split! Green!', 'V:Skis are just long, expensive shoes.'],
  bobsled: ['C:Through the Omega like it isn\'t even there!', 'C:They\'re upside down! Still fast, though!', 'V:Load in clean and the sled does the rest.', 'C:Push, push, PUSH!', 'V:Find the groove, Chip. The groove finds you back.', 'C:Sparks flying off the wall!', 'C:The Washing Machine! Hold on!', 'V:I rode a bobsled once. I left my lunch at the top.'],
  figure: ['C:A quad! A QUAD YIKES!', 'V:Grandpa would be whistling now.', 'C:Look at that spiral!', 'V:Skating is just falling, beautifully, in a circle.', 'C:Plush toys raining down!', 'V:Every note. Every edge. Every breath.', 'C:A sit spin! I\'m dizzy just watching!', 'K:Follow my lead! Step, step, step!'],
  curling: ['C:HURRY HARD! HURRY HARD!', 'C:Double takeout! The house has been CLEARED!', 'V:Curling: chess, but cold, and with brooms.', 'C:Right on the button!', 'V:Gentle weight. Gentle... gentle...', 'C:Sweep! SWEEP!', 'V:The ice whispers. You have to listen.', 'C:A guard! A sneaky little guard!'],
  hockey: ['C:{name} shoots... and SCORES!', 'C:Into the glass! The glass is fine. The glass is always fine.', 'V:Pass, move, pass. It\'s a dance with sticks.', 'C:WHAT A SAVE!', 'V:Ice hockey: the only sport where the floor is your enemy.', 'C:Breakaway! BREAKAWAY!', 'C:The crowd is going WILD!', 'V:Two minutes for being too exciting.']
};
O.COMM_BANK = BANK;
O.commLines = () => Object.values(BANK).reduce((n, a) => n + a.length, 0);

const SPEAKER = { C: 'chip', V: 'vera', P: 'pa', M: 'max', Y: 'yikesy', K: 'coach' };
const PRIO = { wr: 9, yikes: 8, falsestart: 8, foul: 8, photo: 7, win: 7, turbo: 6, lead: 5, close: 5, comeback: 6, rivalBeat: 6, rivalWins: 6, start: 5 };
const rigs = {};
const rigFor = who => { if (rigs[who] === undefined) { const c = O.COMMENTATORS[who]; rigs[who] = c && c.rig ? c.rig() : null; if (rigs[who]) rigs[who].update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); } return rigs[who]; };
let queue = [], cur = null, lastT = -99, cooldown = {}, rnd = E.rng(77);
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v && v[k] !== undefined ? v[k] : '');

O.Comms = {
  get current() { return cur; },
  reset() { queue = []; cur = null; lastT = -99; cooldown = {}; },
  /** cue a line from a bank (event bank falls back to the generic); returns true if queued */
  cue(key, vars, o = {}) {
    if (game.settings.commentary === 'off' || O.hubEnded) return false;
    const now = game.real, p = o.prio !== undefined ? o.prio : (PRIO[key] || 3);
    if (cooldown[key] && now < cooldown[key]) return false;
    if (!o.force && cur && p <= (cur.prio || 0)) { if (queue.length < 2 && p >= 5) { queue.push({ key, vars, p }); } return false; }
    if (!o.force && now - lastT < 3.5 && p < 7 && cur) return false;
    const bank = BANK[key]; if (!bank || !bank.length) return false;
    const line = bank[Math.floor(rnd() * bank.length)];
    this.play(line, vars, p); cooldown[key] = now + (o.cool || 6);
    return true;
  },
  /** play a literal line ('C:...' syntax, exchanges with ' || ') */
  say(line, vars, prio = 9) { this.play(line, vars, prio); },
  play(line, vars, prio) {
    const parts = String(line).split(' || ').map(s => { const m = s.match(/^([CVPMYK]):(.*)$/); return m ? { who: SPEAKER[m[1]], text: fill(m[2], vars) } : { who: 'chip', text: fill(s, vars) }; });
    cur = { parts, i: 0, t: 0, prio, dur: 0 };
    this._start();
    lastT = game.real;
  },
  _start() {
    const p = cur.parts[cur.i], v = p.who === 'max' ? O.VOICES.max : O.VOICES[p.who] || O.VOICES.chip;
    const d = O.Voice.speak(p.text, v);
    cur.t = 0; cur.dur = Math.max(1.8, d + .6, p.text.length * .055);
  },
  update(dt) {
    if (!cur) { if (queue.length) { const q = queue.shift(); this.cue(q.key, q.vars, { prio: q.p, force: true }); } return; }
    cur.t += dt;
    if (cur.t >= cur.dur) { cur.i++; if (cur.i < cur.parts.length) this._start(); else { cur = null; lastT = game.real; } }
  },
  draw(g, r) {
    if (!cur || game.settings.commentary === 'off') return;
    const p = cur.parts[cur.i]; if (!p) return;
    const big = game.settings.textSize === 'huge', top = !!(game.sceneName && game.sceneName.startsWith('ev:')), s = big || r.H >= 300 ? 2 : 1, w = Math.min(r.W - (top ? 240 : 40), s === 2 ? 420 : 300), lines = O.wrap(p.text, w - 60, s).slice(0, 3);
    const h = Math.max(42, 16 + lines.length * (s * 9 + 2)), x = Math.round((r.W - w) / 2), y = top ? 32 : Math.round(r.H - h - 30);
    O.panel(g, x, y, w, h, { border: '#f2b632', alpha: .92 });
    const rig = rigFor(p.who);
    if (rig) rig.drawPortrait(g, x + 4, y + 4, 34, { zoom: 3 }); else if (p.who === 'pa') { px.rect(g, x + 6, y + 8, 30, 26, '#2a3060'); for (let i = 0; i < 4; i++) px.rect(g, x + 12 + i * 5, y + 14, 3, 14, '#9aa2c8'); } else { px.disc(g, x + 21, y + 21, 13, '#f8f8ff'); px.disc(g, x + 16, y + 19, 2, '#1a1d2e'); px.disc(g, x + 26, y + 19, 2, '#1a1d2e'); px.rect(g, x + 8, y + 30, 13, 3, '#ff7a2a'); px.rect(g, x + 21, y + 30, 13, 3, '#3fa8e8'); }
    const nm = (O.COMMENTATORS[p.who] || {}).name || '';
    O.text(g, nm, x + 44, y + 4, '#f2b632');
    lines.forEach((ln, i) => O.text(g, ln, x + 44, y + 15 + i * (s * 9 + 2), '#ffffff', { scale: s }));
  }
};
O.bus.on('*', () => {});
})();
