/* 34-data-missions-b: Episodes 3-5 and Tee's last nights. */
/* ---- Episode 3: the van ---- */
const VAN_SPOTS = { V1: { x: 58, y: 45, f: -Math.PI / 2, label: 'Harlow curb, by the Courts', sub: 'Close to the pumps. Close to everyone.' }, V2: { x: 62.5, y: 29.5, f: Math.PI, label: 'Ridley east', sub: 'Far and safe. The long lens reaches.' }, V3: { x: 63, y: 34, f: Math.PI / 2, label: 'The gap in the lot fence', sub: 'In the middle. Kids cut through the lot.' } };
def('missions', 'van', { tod: 'day', clock: '15:30', long: true, film: 48, crowd: 14, corner: { rate: .1 }, start: [62.5, 30.8], noCar: true, cast: ['dale', 'sunday'],
  intro: [['ren', 'Long lens, forty-eight shots. Pick us a spot and I\'ll park.']],
  setup(M) {
    M.noCar = true; M.van = { heat: 0, parked: 0, passes: new Set(), burnedOnce: false }; const P = M.P; P.locked = true;
    const vehicle = F().ops1 === 'ot' ? 'chevy' : 'van'; M.van.k = F().ops1 === 'ot' ? 1.5 : 1; M.van.vehicle = vehicle;
    M.park = (id, cb) => { const s = VAN_SPOTS[id]; M.van.spot = id; M.van.parked = 0; M.statics = (M.statics || []).filter(c => !c.van); staticCar(M, vehicle, s.x, s.y, s.f, { van: true }); P.place(s.x * T, s.y * T); P.inCar = true; P.hidden = true; P.cover = { inCar: true }; if (cb) cb(); };
    const choose = (title, exclude) => UI.choose({ kicker: 'The van', title, back: false, cards: Object.keys(VAN_SPOTS).filter(k => k !== exclude).map(k => ({ id: k, label: k + ': ' + VAN_SPOTS[k].label, sub: VAN_SPOTS[k].sub })) }, k => M.park(k, () => { if (tip('van')) Tut.say('The long lens', 'Hold ' + Prompts.label('watch') + ' and aim: the lens reaches 14 tiles. Every time a crew member walks past a parked van, they remember it.'); }));
    M.chooseSpot = choose; game.after(1.2, () => choose('Where do we park?'));
    M.hudBars = () => M.van.spot ? [{ label: (M.van.vehicle === 'chevy' ? 'Chevy' : 'Van') + ' noticed', value: Math.round(M.van.heat), max: 100, color: M.van.heat > 66 ? '#ff5a4a' : '#ffb347' }] : [];
    // the re-up: the Harstad truck, Dale, Tavon; Pigeon circling on a bike
    const dale = M.person('dale', 61.2, 3); dale.hidden = true; const sunday = M.person('sunday', 58, 60); sunday.hidden = true;
    const tav = M.ppl.tavon; if (tav) { M.sim.crew = M.sim.crew.filter(a => a !== tav); M.extras.push(tav); }
    const pg = M.ppl.pigeon; if (pg) { M.sim.crew = M.sim.crew.filter(a => a !== pg); M.extras.push(pg); pg.body.z = 0; pg.roof = false; pg.bike = true; pg.place(60 * T, 44 * T); pg.walkSpeed = 58; pg.brain = (a, dt) => { if (!a.goal) { const pts = [[60, 44], [66, 44], [66, 53.5], [60, 53.5]]; a.ri = ((a.ri || 0) + 1) % 4; a.goTo(pts[a.ri][0] * T, pts[a.ri][1] * T, 58); } }; }
    M.truck = null;
    const plate = { x: 0, y: 0, z: 0, photoZ: 12, photoTag: 'harstad', photoLabel: 'HARSTAD AUTO PARTS truck', facing: 0, noFace: true, hidden: false };   // one object, moved with the truck: the camera keeps focus on the same subject
    M.photoCands = () => { if (!M.truck) return []; plate.x = M.truck.x; plate.y = M.truck.y; plate.facing = M.truck.facing; return [plate]; };
    M.objective('park', 'Park the van', () => !!M.van.spot);
    M.objective('truck', 'Photograph the truck\'s logo and plate (in focus)', () => hasFact('plate:harstad'));
    M.objective('dale', 'The courier hands off to Tavon: ACT photo', () => hasFact('act:dale:reup-handoff') || hasFact('act:tavon:reup-handoff'));
    M.objective('rob', 'Photograph the robbery', () => STATE.evidence.some(e => e.act === 'robbery'), { optional: true });
    M.objective('dilemma', 'Decide what to do about the robbery', () => !!F().dilemma);
  },
  events: [{ at: '15:48', do: M => {
      const path = new E.Path([[57.5 * T, 1 * T], [57.5 * T, 45 * T], [60 * T, 47 * T], [61.4 * T, 48.6 * T]], { smooth: 'catmull' });
      M.truck = new Car('boxtruck', path, 60, { stay: true, onEnd: () => { const d = M.ppl.dale; d.hidden = false; d.place(60.3 * T, 49.4 * T); d.facing = Math.PI; } }); M.cars.push(M.truck); M.radio('ren', 'Box truck coming down Harlow. Red band on it.', 3); } },
    { at: '15:56', do: M => { const t = M.ppl.tavon; if (t) { t.goTo(60.4 * T, 47.9 * T, 50, () => { const d = M.ppl.dale; t.faceTo(d); d.faceTo(t); M.flags.handoff = true; const go = n => { if (n <= 0) return; t.doAct('reup-handoff', 2.5, d); d.doAct('reup-handoff', 2.5, t); t.pose = 'reach'; d.pose = 'reach'; game.after(2.5, () => { t.pose = null; d.pose = null; t.carry = 'package'; game.after(3, () => go(n - 1)); }); }; go(3); }); } } },
    { at: '16:08', do: M => sundayHit(M) }],
  onPhoto(M, ph) { if (ph.tag === 'harstad' && ph.focus && ph.stars > 0 && !hasFact('plate:harstad')) { addFact('plate:harstad'); STATE.numbers.P5 = { n: '555-0174', known: true, tapped: false, user: 'harstad' }; addEvidence({ id: 'plate:harstad', kind: 'plate', ref: 'dale', pts: 1, text: 'Harstad Auto Parts box truck, Dundalk, MD tags. Phone on the side: 555-0174.' }); casePoint('plate', 'The truck: Harstad Auto Parts, 555-0174'); } },
  tick(M, dt) {
    const v = M.van; if (!v.spot || F().dilemma === 'go') return; v.parked += dt; const s = VAN_SPOTS[v.spot], vp = { x: s.x * T, y: s.y * T };
    const watchers = M.observers.concat(M.extras.filter(a => a.watcher || a.bike)).filter(o => !o.hidden && Math.hypot(o.x - vp.x, o.y - vp.y) < 160);
    if (watchers.length) v.heat += dt / 12 * v.k * 6;
    for (const a of M.extras.concat(M.sim.crew)) { if (a.hidden) continue; const d = Math.hypot(a.x - vp.x, a.y - vp.y); if (d < 40 && v.parked > 90 && !v.passes.has(a.uid)) { v.passes.add(a.uid); v.heat += 25 * v.k; a.say('Hm.', 1.5); } }
    if (v.heat >= 100 && !v.burned) { v.burned = true; F().vanBurned = true; M.talk([['pigeon', 'That van been there two days.']]); Meters.add('heat', 10, 'They made the van'); game.after(2, () => { v.heat = 0; v.burned = false; v.passes.clear(); M.chooseSpot('Burned. Move the van.', v.spot); }); }
  },
  draw: (r, M) => drawStatics(r, M),
  finish: M => !!F().dilemma && M.flags.dilemmaDone
});
function sundayHit(M) {
  const s = M.ppl.sunday, t = M.ppl.tavon; if (!t) return;
  const path = new E.Path([[57.5 * T, 55 * T], [57.5 * T, 49 * T], [59 * T, 48 * T]]);
  M.cars.push(new Car('hearse', path, 55, { stay: true, onEnd: () => {
    s.hidden = false; s.place(59.6 * T, 48.4 * T); s.goTo(t.x - 8, t.y, 40, () => { s.faceTo(t); t.faceTo(s); s.pose = 'gun'; t.pose = 'handsUp'; s.doAct('robbery', 3, t); t.doAct('robbery', 3, s); s.say('Don\'t. It ain\'t worth it.', 2.6);
      game.after(3.2, () => { t.carry = null; M.talk([['ren', 'He\'s got a gun on that kid. We have to do something.'], ['lou', 'We do something, the wire\'s dead by tonight, and that kid\'s still a corner kid tomorrow.'], { who: 'dana', text: '...', choices: [
        { label: 'Stay on the eye', do: () => { F().dilemma = 'stay'; addFact('face:sunday', true); return [['dana', 'We stay. Get his face.'], ['narr', 'The hearse pulls away slow, like it has somewhere to be.']]; } },
        { label: 'Call it in anonymously', do: () => { F().dilemma = 'call'; Meters.add('heat', 20, 'Patrol rolled up on the re-up'); M.cars.push(new Car('patrol', new E.Path([[57.5 * T, 30 * T], [57.5 * T, 47 * T]]), 90, { police: true, lights: true, stay: true })); return [['dana', 'Shots fired, Harlow and the gas station. No name.'], ['narr', 'The hearse is gone before the patrol car turns the corner.']]; } },
        { label: 'Go in yourself', do: () => { F().dilemma = 'go'; F().vanBurned = true; Meters.add('heat', 30, 'A detective walked out of the van'); Meters.stat('brass', 10, 'The package recovered'); return [['dana', 'Police. Put it down.'], ['sunday', 'Detective. Ain\'t Sunday, so it\'s business. But I don\'t do police.'], ['narr', 'He sets the bag on the hood of the hearse.'], ['sunday', 'Police do me.']]; } }] },
        () => { s.pose = null; t.pose = null; s.goTo(59 * T, 48 * T, 50, () => { s.hidden = true; }); addFact('name:sunday', true); M.flags.dilemmaDone = true; }]); });
    });
  } }));
}
/* ---- Tee's third night ---- */
interlude('i3', { target: 2000, corner: { roster: ['tee', 'rook', 'dink', 'tavon:tout', 'pigeon:runner', 'moe'] },
  intro: [['tee', 'Two thousand. By the count. Easy said it soft. That\'s worse.']],
  setup(M) { if (!F().rookFree || F().wallOff) M.sim.remove('rook'); M.sim.vials = 70; M.sim.L.start = 70; const pg = M.sim.crew.find(a => a.crewId === 'pigeon'); if (pg) { pg.body.z = 0; pg.roof = false; pg.watcher = false; } plainclothes(M, 36, 30.4, 77); },
  events: [{ at: '22:30', do: M => { if (F().vanBurned) { staticCar(M, 'van', 62.5, 29.5, Math.PI); M.talk([['moe', 'That white van on Ridley again, Tee.'], ['tee', 'Then we open on the other side of the block for an hour.']]); M.sim.shut('van', 25); } } },
    { at: '23:00', do: M => { M.sim.cars.push(new Car('hearse', new E.Path([[60 * T, 28.5 * T], [5 * T, 28.5 * T]]), 50, {})); M.sim.manual = false; M.sim.shut('hearse', 30); M.talk([['rook', 'That\'s him. That\'s the hearse.'], ['tee', 'Shut it down. Everybody inside.']]); } },
    { at: '00:20', do: M => { plainclothes(M, 24, 30.4, 91); Toast('A face you don\'t know', 'Gray jacket, near the carryout. Read him.'); } },
    { at: '01:10', do: M => { if (!F().wallOff) { Snd.gunshot(); game.after(.6, () => Snd.gunshot()); M.sim.shut('shots', 40); M.talk([['tavon', 'That was Harlow. That was Harlow!'], ['tee', 'Where\'s Rook. Somebody find Rook.']]); } } }],
  objectives: [M => ['callout', 'Spot the plainclothes cop and call him out', () => M.flags.callout, { optional: true }]],
  tick(M) { if (!M.flags.cl) { M.flags.cl = bus.on('callout', e => { if (e.ok) M.flags.callout = true; }); } },
  choice: () => [{ who: 'tee', text: 'Easy\'s loss has to land on somebody.', choices: [
    { label: 'I take it', do: () => { F().lossOn = 'tee'; return [['tee', 'It\'s on me. I\'ll make it back.']]; } },
    { label: 'Corey takes it', do: () => { F().lossOn = 'corey'; return [['tee', 'Corey was sitting on it. It\'s on Corey.']]; } },
    { label: 'Pigeon takes it', do: () => { F().lossOn = 'pigeon'; return [['tee', 'Pigeon was supposed to see that hearse coming.'], ['narr', 'Nobody looks at the roof.']]; } }] }]
});
/* ---- Episode 4: the tail, the trash ---- */
def('missions', 'tail', { tod: 'nightRain', clock: '20:00', start: [36, 30.6], facing: Math.PI, crowd: 8, film: 24, corner: { rate: .08, roster: ['rook', 'dink', 'tavon', 'tout', 'pigeon', 'moe'] }, cast: ['tee', 'lou'],
  intro: [['lou', 'He\'s leaving the corner on foot. Watch him dry-clean. I\'m one street over.'], () => { if (tip('tail')) Tut.say('The tail', 'Keep the distance bar green. When he stops, don\'t stop. ' + Prompts.label('partner') + ' hands the eye to Lou when he\'s close and Tee hasn\'t clocked him.'); }],
  setup(M) {
    const tee = M.person('tee', 30, 32); const lou = M.person('lou', 36, 21.4); M.partner = lou; M.police.push(lou); Perception.setup(M.observers, M.police);
    M.tail = new Tail(M, tee, 'teeDry', { onDone: () => handout(M) });
    M.hudBars = () => M.tail.done ? [] : [M.tail.hudBar()];
    M.mini = () => [{ x: tee.x, y: tee.y, kind: 'ring', color: '#ff8a5a' }];
    M.objective('tail', 'Tail Tee without getting made or losing him', () => M.tail.done, { at: tee });
    M.objective('handout', 'Watch the handout at the court (read Tee)', () => hasFact('obs:burners'));
    Cam.readable = a => (a.person && performingRole(a) && !hasFact('obs:' + a.person + ':' + a.role)) || (a === tee && M.flags.handout && !hasFact('obs:burners'));
    const base = Cam.onRead; Cam.onRead = a => { if (a === tee && M.flags.handout) { addFact('obs:burners'); addEvidence({ id: 'obs:burners', kind: 'obs', ref: 'tee', pts: 1, text: 'Tee handing out new phones at the basketball court, 21:10' }); casePoint('read', 'Tee hands out throwaway phones'); return true; } return base(a); };
  },
  tick(M, dt) { M.tail.tick(dt); },
  draw: (r, M) => { drawStatics(r, M); if (!M.tail.done && M.ppl.tee) r.marker(M.ppl.tee.x, M.ppl.tee.y, 44, { label: 'TEE', color: '#ff8a5a', offscreen: 'arrow' }); },
  finish: M => hasFact('obs:burners')
});
function handout(M) {
  M.flags.handout = true; const tee = M.ppl.tee; tee.pose = 'reach'; tee.faceTo(at16(16, 50));
  for (const [id, x, y] of [['tavon', 16, 50.5], ['dink', 17, 51.4], ['moe', 19.4, 51]]) { const a = M.person(id, x, y); a.faceTo(tee); a.pose = 'phone'; }
  M.radio('lou', 'Court. He\'s handing something out. Get eyes on it.', 3); M.mark(18 * T, 49 * T, 0, 'THE COURT');
}
def('missions', 'trash', { tod: 'nightRain', clock: '21:30', start: [35, 20.6], facing: 0, crowd: 0, film: 12,
  intro: [['dana', 'Ridley Wireless puts its trash out back on Tuesdays. Twelve phones come in boxes with serial numbers.'], () => { if (tip('trash')) Tut.say('Quiet work', 'Crouch (' + Prompts.label('crouch') + ') in the dark alley. Searching a bag is loud. If they make you, start again from the alley mouth.'); }],
  setup(M) {
    const nephew = new Agent({ id: 'nephew', seed: 4242, x: 41.6 * T, y: 21.6 * T }); nephew.facing = -Math.PI / 2 + .3; nephew.pose = 'smoke'; nephew.watcher = true; nephew.range = 110; nephew.fov = 1.6; M.extras.push(nephew); M.observers.push(nephew);
    const moe = new Agent({ person: 'moe', x: 34 * T, y: 20.6 * T }); moe.bike = true; moe.watcher = true; moe.range = 120; moe.fov = 1.8; moe.walkSpeed = 60; M.extras.push(moe); M.observers.push(moe); moe.lap = 0; moe.away = true;
    moe.brain = (a, dt) => { a.lap += dt; if (a.lap > 40 && a.away) { a.away = false; a.hidden = false; a.place(34 * T, 20.6 * T); a.goTo(56 * T, 20.6 * T, 60, () => { a.hidden = true; a.away = true; a.lap = 0; }); } if (a.away) a.hidden = true; };
    Perception.setup(M.observers, M.police);
    const bags = World.props.filter(p => p.id === 'trashbag' && p.y < 22 * T), rr = E.rng(4 + STATE.ep), right = Math.floor(rr() * bags.length) % bags.length; M.flags.searched = new Set();
    bags.forEach((b, i) => M.int({ id: 'bag' + i, x: b.x, y: b.y, r: 16, verb: 'Search the bag', hint: '2.5 s · loud', when: () => !M.flags.searched.has(i) && !M.searching && !F().serials, act: () => {
      M.searching = true; M.P.locked = true; M.P.pose = 'crouch'; Snd.play('rustle'); for (const o of M.observers) { const h = E.hears(o, { x: b.x, y: b.y, z: 0, loud: 60 }, World.map); if (h > 0 && !o.hidden) Perception.mind(o, M.P).hear(h, b); }
      game.after(2.5, () => { M.searching = false; M.P.locked = false; M.P.pose = null; M.flags.searched.add(i);
        if (i === right) { F().serials = true; addEvidence({ id: 'serials:boxes', kind: 'seizure', ref: 'tee', pts: 1, text: 'Twelve empty phone boxes from behind Ridley Wireless, serial numbers intact' }); casePoint('seizure', 'Twelve phone boxes with serial numbers'); Snd.play('powerup'); }
        else Toast('Nothing', pick(RNG.cos, ['Chicken bones and receipts.', 'Shredded paper. Wet.', 'A broken blender.'])); }); } }));
    M.objective('bags', 'Find the bag with the phone boxes', () => F().serials, { at: at16(41.5, 20.6) });
    M.objective('out', 'Get out of the alley', () => F().serials && M.P.x < 35 * T);
    M.unmade = bus.on('made', () => { if (game.sceneName !== 'field' || Mission.M !== M) return; Meters.add('heat', 5, 'The nephew saw a lady in his trash'); M.fail('They made you', 'The kid at the back door is already on his phone.', { sub: 'From the alley mouth', fn: () => { M.P.place(35 * T, 20.6 * T); for (const o of M.observers) for (const k in o.minds) o.minds[k].reset(); M.failing = false; } }); });
  },
  tick(M) { M.P.exposure = M.P.crouch ? .55 : .8; },
  exit: M => { if (M.unmade) M.unmade(); },
  finish: M => F().serials && M.P.x < 35 * T
});
/* ---- Tee's fourth night ---- */
interlude('i4', { target: 1700,
  intro: [['tee', 'New phones tonight. Everybody gets one. Nobody keeps one past Sunday.']],
  setup(M) { if (!F().rookFree || F().wallOff) M.sim.remove('rook'); M.sim.vials = 60; M.sim.L.start = 60; staticCar(M, 'chevy', 22.5, 29.5, 0); M.flags.saw = false; plainclothes(M, 42, 30.4, 66); },
  events: [{ at: '22:20', do: M => { M.mark(18 * T, 49 * T, 0, 'THE COURT'); Toast('The handout', 'Meet your people at the basketball court.'); } },
    { at: '23:30', do: M => { const car = new Car('sedan', new E.Path([[60 * T, 28.5 * T], [31 * T, 28.5 * T], [5 * T, 28.5 * T]]), 40, { mats: { b: '#141414 glaze' } }); M.sim.cars.push(car); game.after(6, () => M.talk([['lonnie', 'Thursday. Count it twice. He means it.'], ['tee', 'Twice.']])); } }],
  objectives: [M => ['court', 'Hand out the phones at the court', () => M.flags.handout, { at: at16(18, 49) }]],
  tick(M) {
    const P = M.P;
    if (!M.flags.handout && Math.hypot(P.x - 18 * T, P.y - 49 * T) < 30) { M.flags.handout = true; M.marks = []; M.talk([['tee', 'One each. Text nobody. Call only the numbers on the card.'], ['tavon', 'What if I lose it?'], ['tee', 'Then you lose me.']]); }
    if (!M.flags.saw && Math.hypot(P.x - 22.5 * T, P.y - 29.5 * T) < 50) { M.flags.saw = true; M.talk([['tee', 'Beige Chevy. Same one from Tuesday.'], ['tee', 'That\'s the lady\'s car. Leather coat.']]); }
  },
  choice: () => [['tee', 'Somebody\'s talking. Somebody always is.'], { who: 'tee', text: 'Feed Corey a fake re-up time and see where it goes?', choices: [
    { label: 'Set the canary trap', do: () => { F().canary = true; if (F().coreyCI) F().coreyExposed = true; return [['tee', 'Tell Corey the truck comes Wednesday. Tell nobody else.']]; } },
    { label: 'Leave it', do: () => { F().canary = false; return [['tee', 'Not yet.']]; } }] }]
});
/* ---- Episode 5 ---- */
def('missions', 'rescue', { tod: 'night', clock: '20:10', start: [44, 30.6], facing: Math.PI, crowd: 6, film: 12, music: 'chase', cast: ['corey'],
  intro: [['lou', 'Corey\'s phone went dead an hour ago. Somebody told them, Dana. The vacant. Sixty seconds or he\'s gone.']],
  setup(M) {
    M.pursuit = true; const holder = F().rookFree && !F().wallOff ? 'rook' : 'tavon'; M.flags.holder = holder;
    const h = M.person(holder, 27.6, 36.3); h.facing = 0; h.pose = 'hips'; const c = M.person('corey', 27.6, 35.6); c.pose = 'handsUp'; c.facing = Math.PI / 2;
    M.timer = 60; M.hudBars = () => [{ label: 'Corey', value: Math.ceil(M.timer), max: 60, color: M.timer < 15 ? '#ff5a4a' : '#ffb347' }];
    M.objective('run', 'Get to the 1412 vacant', () => M.flags.saved || M.flags.late, { at: at16(28, 36) });
  },
  tick(M, dt) {
    if (M.flags.saved || M.flags.late) return; M.timer -= dt; const P = M.P, h = M.ppl[M.flags.holder], c = M.ppl.corey;
    if (Math.hypot(P.x - 28.5 * T, P.y - 36.3 * T) < 30) { M.flags.saved = true; F().coreyRescued = true; h.goTo(25.4 * T, 41 * T, 90, () => { h.hidden = true; }); c.pose = null; M.talk([['dana', 'Police! Corey!'], ['corey', 'D-Detective. He was gonna... he was gonna...'], ['dana', 'I know. I know. You\'re all right.']], () => { M.flags.done = true; }); }
    else if (M.timer <= 0) { M.flags.late = true; F().coreyRescued = false; c.hidden = true; h.hidden = true; M.talk([['narr', 'The vacant is empty. A shoe on the stairs. Duct tape on the toe.']], () => { M.flags.done = true; }); }
  },
  finish: M => M.flags.done
});
def('missions', 'raid', { tod: 'night', clock: '21:00', start: [58.5, 44], facing: Math.PI / 2, crowd: 0, film: 12, music: 'field', cast: ['tee', 'moe', 'dale', 'lou'],
  setup(M) {
    const lou = M.person('lou', 58.5, 45.2); M.partner = lou; lou.pose = 'hips';
    const tee = M.person('tee', 52.2, 51.4); tee.facing = 0; const moe = M.person('moe', 53.4, 50.2); const dale = M.person('dale', 54.2, 51.2); dale.facing = 0;
    if (F().rookFree && !F().wallOff) M.person('rook', 51.6, 49.7);
    staticCar(M, 'boxtruck', 57.5, 52, -Math.PI / 2);
    M.raid = new Raid(M, { onDone: r => { M.flags.done = true; M.talk([['lou', 'That\'s the table. That\'s the Major\'s whole table.'], ['dana', 'And Easy\'s at home asleep.']]); } });
    game.after(.8, () => M.raid.plan(id => { const d = M.raid.breachDoor(); M.mark(d.x, d.y, 0, 'BREACH'); if (id === 'both') { lou.goTo(50 * T, 48.8 * T, 70); } }));
    M.int({ id: 'breach', x: 0, y: 0, r: 22, verb: 'Breach', hint: 'Ram the door', when: () => M.raid.state === 'stack', act: () => { M.raid.breach(); M.marks = []; } });
    M.int({ id: 'hands', x: 0, y: 0, r: 40, verb: '"Hands!"', when: () => M.raid.rookT > 0, act: () => M.raid.hands() });
    M.int({ id: 'paper', agent: tee, x: 0, y: 0, r: 24, verb: 'Show Tee the warrant', when: () => M.raid.state !== 'plan' && M.raid.state !== 'stack' && !M.flags.paper, act: () => { M.flags.paper = true; M.raid.res.tee = true; M.talk([['tee', 'Let me see the paper.'], ['dana', 'Signed this afternoon. Your name is on page two.'], ['tee', '...Spelled right and everything.']]); } });
    for (const s of RAID_SPOTS) M.int({ id: 'spot:' + s.id, x: s.x * T, y: s.y * T, r: 14, verb: s.label, hint: s.clue && M.raid ? 'Something about this spot' : '', when: () => M.raid.state === 'search' && !M.raid.searched[s.id], act: () => M.raid.search(s) });
    M.objective('plan', 'Choose how to go in', () => M.raid.state !== 'plan');
    M.objective('breach', 'Stack up on the door and breach', () => ['live', 'search', 'done'].includes(M.raid.state));
    M.objective('hold', 'Control the room', () => ['search', 'done'].includes(M.raid.state));
    M.objective('search', 'Find the stash (two of four spots)', () => M.raid.state === 'done');
  },
  tick(M, dt) { const R = M.raid; R.tick(dt); const b = M.ints.find(i => i.id === 'breach'), d = R.breachDoor(); b.x = d.x; b.y = d.y; const hh = M.ints.find(i => i.id === 'hands'); if (M.ppl.rook) { hh.x = M.ppl.rook.x; hh.y = M.ppl.rook.y; } const pp = M.ints.find(i => i.id === 'paper'); pp.x = M.ppl.tee.x; pp.y = M.ppl.tee.y; if (R.state === 'live' && R.t > 4 && !M.flags.tc) { M.flags.tc = true; M.ppl.tee.pose = 'cuffed'; } },
  draw: (r, M) => drawStatics(r, M),
  finish: M => M.flags.done && !Talk.busy
});
def('missions', 'press', { tod: 'day', clock: '10:00', start: [57.5, 44], facing: Math.PI / 2, crowd: 0, film: 0, noCam: true, music: 'theme',
  setup(M) {
    M.P.locked = true; M.noCam = true;
    for (const [id, x, y, f, pose] of [['pruitt', 56.2, 46.4, Math.PI / 2, null], ['ostrowski', 57.2, 46.4, Math.PI / 2, null], ['navarre', 55, 45.2, Math.PI / 2, 'hips'], ['lou', 58.7, 45, Math.PI / 2, null], ['ren', 59.4, 45.3, Math.PI / 2, null], ['hal', 54.3, 45.4, Math.PI / 2, null]]) { const a = M.person(id, x, y); a.facing = f; a.pose = pose; }
    for (let i = 0; i < 6; i++) { const a = new Agent({ seed: 900 + i, x: (54.5 + i * .9) * T, y: 48.8 * T }); a.facing = -Math.PI / 2; a.pose = i % 2 ? 'camera' : null; M.extras.push(a); }
    M.P.place(58 * T, 44.6 * T); M.P.facing = Math.PI / 2;
    game.after(1, () => M.talk([['ostrowski', 'Today the men and women of the Western District struck a major blow to the drug trade in West Baltimore.'], ['pruitt', 'Two kilograms. Thirty-one thousand dollars. A loaded handgun. Off the street.'], ['ostrowski', 'Questions.'], ['lou', 'Major blow. They\'ll be open by Monday.'], ['ren', 'They\'re open now.']], () => { M.flags.done = true; }));
    M.camAt = { x: 56.7 * T, y: 47 * T, z: 0 };
  },
  tick(M, dt) { M.ft = (M.ft || 0) - dt; if (M.ft <= 0) { M.ft = .3 + RNG.cos() * .8; Snd.shutter(); game.flash('#ffffff', .05, .35); } },
  draw(r, M) { r.shape('table', 56.7 * T, 47.2 * T, 0, { facing: Math.PI / 2 }); r.shape('crate', 56 * T, 47.3 * T, 12, { scale: .5 }); r.shape('crate', 57.3 * T, 47.3 * T, 12, { scale: .45 }); r.shape('sack', 56.7 * T, 47.1 * T, 12, { scale: .6 }); },
  finish: M => M.flags.done
});
def('missions', 'count', { tod: 'night', clock: '22:30', start: [34, 37.6], facing: Math.PI, crowd: 4, film: 24, long: false, corner: { rate: .06, roster: ['rook', 'dink', 'tout', 'moe'] }, cast: ['easy', 'lonnie'],
  intro: [() => [['lou', F().pigeonRunner ? 'Pigeon says he leaves the vacant at ten forty with the bag. Back door, the yard, the alley, up Gaither. He won\'t look at you.' : 'Tavon carries the bag tonight. He\'ll dry-clean it. Stay loose.']]],
  setup(M) {
    const runnerId = F().pigeonRunner ? 'pigeon' : 'tavon'; F().countRunner = runnerId;
    const rn = M.person(runnerId, 27.5, 36); rn.light = runnerId === 'pigeon'; rn.carry = 'bag';
    M.tail = new Tail(M, rn, 'countRun', { onDone: () => { M.flags.atDoor = true; rn.pose = 'reach'; M.radio('lou', 'He knocked on the back door. Mama B\'s. Get up on that roof across the alley. Door at fifty-twenty.', 4); M.mark(50 * T, 20.5 * T, 0, 'THE VACANT\'S DOOR'); } });
    if (runnerId === 'pigeon') { rn.fov = 1.1; M.tail.acts = { 3: ['cutThrough'] }; }
    // Lonnie's car circles with its headlights: a moving cone that can make you
    M.lonnie = new Car('sedan', new E.Path([[31.5 * T, 28.5 * T], [57.5 * T, 28.5 * T], [57.5 * T, 13.5 * T], [31.5 * T, 13.5 * T]], { closed: true }), 42, { mats: { b: '#141414 glaze' } }); M.cars.push(M.lonnie);
    const eye = new Agent({ id: 'lonnieEye', person: 'lonnie' }); eye.watcher = true; eye.range = 120; eye.fov = .5; eye.carEye = true; M.observers.push(eye); M.eye = eye; Perception.setup(M.observers, M.police);
    M.hudBars = () => M.tail.done ? [] : [M.tail.hudBar()];
    M.int({ id: 'roof', x: 50 * T, y: 20.6 * T, r: 20, verb: 'Up to the roof', hint: 'The long lens', when: () => M.flags.atDoor && !M.flags.roof, act: () => toRoof(M) });
    M.objective('tail', 'Follow the bag to Mama B\'s', () => M.tail.done, { at: rn });
    M.objective('roof', 'Get on the vacant\'s roof across the alley', () => M.flags.roof);
    M.objective('easy', 'Photograph Easy in the act: three stars', () => F().easyPhoto);
  },
  tick(M, dt) { if (!M.tail.done) M.tail.tick(dt); const c = M.lonnie, e = M.eye; e.place(c.x, c.y); e.facing = c.facing; if (M.flags.roof) countRoom(M, dt); },
  draw(r, M) { if (M.flags.roof) return; game.lights.add(M.lonnie.x + Math.cos(M.lonnie.facing) * 40, M.lonnie.y + Math.sin(M.lonnie.facing) * 40, 4, 50, .9, { color: '#fff0c0' }); },
  overlay(r, M) { if (M.flags.roof) drawCountRoom(r, M); },
  finish: M => F().easyPhoto && M.flags.leave
});
function toRoof(M) {
  M.flags.roof = true; M.marks = []; M.noCam = true; Cam.on = false; const P = M.P; P.place(50 * T, 18 * T); P.body.z = 40; P.locked = true; P.pose = 'camera'; M.camAt = { x: 46.5 * T, y: 21 * T, z: 20 };
  M.room = { t: 0, win: -1, wins: 0, ret: null, focus: 0, prev: null, shots: 0 };
  Toast('The long lens', 'Mama B\'s back window. Easy only shows his face when the money changes hands.');
}
function countRoom(M, dt) {
  const R = M.room, c = M.ctl; R.t += dt;
  const cyc = R.t % 14, open = cyc > 7 && cyc < 11; if (open && R.win !== Math.floor(R.t / 14)) { R.win = Math.floor(R.t / 14); R.wins++; }
  R.open = open;
  const W0 = game.W, H0 = game.H; if (!R.ret) R.ret = [W0 / 2, H0 / 2];
  const ptr = c.pointer && c.pointer(), st = c.aimStick && c.aimStick();
  if (ptr && game.input.lastDevice !== 'gamepad') R.ret = ptr.slice(); else if (st) R.ret = [clamp(R.ret[0] + st[0] * 200 * dt, 0, W0), clamp(R.ret[1] + st[1] * 200 * dt, 0, H0)];
  if (c.botAim) R.ret = c.botAim();
  const easy = R.easyAt ? Math.hypot(R.ret[0] - R.easyAt[0], R.ret[1] - R.easyAt[1]) < 14 : false, mv = R.prev ? Math.hypot(R.ret[0] - R.prev[0], R.ret[1] - R.prev[1]) / dt : 0; R.prev = R.ret.slice();
  R.onEasy = easy; R.focus = easy && mv < 30 ? Math.min(1, R.focus + dt / .5) : Math.max(0, R.focus - dt * 2);
  if (c.pressed('photo') && !F().easyPhoto) {
    R.shots++; Snd.shutter();
    const face = easy && open, ph = { id: 'phE' + R.shots, subject: easy ? 'easy' : 'lonnie', t: clockStr(M.clock), place: 'Mama B\'s back window', stars: easy ? (face ? 1 : 0) + (R.focus >= 1 ? 1 : 0) + (open ? 1 : 0) : 0, face, focus: R.focus >= 1, act: easy && open ? 'count-handoff' : null, turn: face ? 0 : Math.PI, ep: 5, night: true };
    STATE.photos.push(ph); showPolaroid(ph);
    if (ph.stars >= 3) { F().easyPhoto = true; addFact('face:easy'); addEvidence({ id: 'act:easy:count', kind: 'act', ref: 'easy', act: 'count-handoff', place: 'Mama B\'s', pts: 2, photo: ph.id, text: 'Darnell Booker taking the count, Mama B\'s back room, ' + ph.t }); casePoint('easy', 'Easy Booker, in the act. Three stars.'); Snd.sting('photoGood'); M.talk([['lou', 'Is that him? Tell me that\'s him.'], ['dana', 'That\'s him. Counting it twice.']], () => { M.flags.leave = true; }); }
    else Toast('Photo ' + '★'.repeat(ph.stars) + '☆'.repeat(3 - ph.stars), !easy ? 'Not Easy.' : !open ? 'He\'s turned away. Wait for the money.' : 'Hold steady. Let the ring close.');
  }
  if (R.wins >= 4 && !F().easyPhoto && !R.warned) { R.warned = true; Toast('They\'re nearly done', 'One more count. Steady.'); }
}
function drawCountRoom(r, M) {
  const R = M.room; r.overlay(g => {
    const w = Math.min(r.W - 40, 300), h = Math.round(w * .62), x0 = Math.round((r.W - w) / 2), y0 = Math.round((r.H - h) / 2) - 6;
    px.rect(g, 0, 0, r.W, r.H, '#05060a'); px.rect(g, x0 - 6, y0 - 6, w + 12, h + 12, '#2a1e16'); px.rect(g, x0, y0, w, h, '#3a2a1e');
    px.rect(g, x0, y0, w, Math.round(h * .55), '#4a3a2a'); px.rect(g, x0 + w * .15, y0 + h * .62, w * .7, 8, '#5a3a22');
    for (let i = 0; i < 6; i++) px.rect(g, Math.round(x0 + w * .35 + i * 7), Math.round(y0 + h * .62 - 4 - (i % 3)), 6, 4 + (i % 3), '#5a8a4a');
    px.disc(g, Math.round(x0 + w * .82), Math.round(y0 + h * .2), 10, '#ffd890'); px.rect(g, Math.round(x0 + w * .82) - 1, Math.round(y0 + h * .2) + 8, 2, 30, '#2a2a2a');
    const ez = rigOf('easy'), lz = rigOf('lonnie'), ex = Math.round(x0 + w * .38), ey = Math.round(y0 + h * .22);
    try { ez.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 }); lz.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 }); ez.drawPortrait(g, ex, ey, 44, { zoom: 1.2, turn: R.open ? 0 : Math.PI, bg: '#4a3a2a' }); lz.drawPortrait(g, Math.round(x0 + w * .6), ey + 4, 40, { zoom: 1.2, turn: R.open ? -1 : -.6, bg: '#4a3a2a' }); } catch (e) { /* headless */ }
    R.easyAt = [ex + 22, ey + 22];
    for (let y = y0; y < y0 + h; y += 3) px.rect(g, x0, y, w, 1, '#00000022');
    if (R.ret) { const [x, y] = R.ret.map(Math.round), c = R.onEasy ? (R.focus >= 1 ? '#45d6a0' : '#ffb347') : '#f2ead8'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.line(g, x + dx * 8, y + dy * 8, x + dx * 3, y + dy * 8, c); px.line(g, x + dx * 8, y + dy * 8, x + dx * 8, y + dy * 3, c); } const rr = Math.round(16 - 9 * R.focus); for (let i = 0; i < 24; i += 2) { const a = i / 24 * TAU; px.dot(g, Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), c); } }
    E.font.text(g, R.open ? 'THE MONEY CHANGES HANDS' : 'WAIT FOR THE COUNT', r.W / 2, y0 + h + 10, R.open ? '#45d6a0' : '#9a9080', { align: 'center', shadow: '#000', outline: false });
    Glyph.prompt(g, 'photo', 'Take photo', r.W / 2, y0 + h + 22, '#f2ead8', 'center');
  });
}
def('missions', 'dawn', { player: 'tee', tod: 'dusk', clock: '05:50', start: [30.5, 32.1], facing: Math.PI / 2, crowd: 2, film: 0, noCam: true, music: 'montage', amb: 'streetDay',
  setup(M) {
    M.noCam = true; M.P.role = 'lieutenant';
    const pg = M.person('pigeon', 34.4, 36.3); pg.body.z = 40; pg.facing = Math.PI; pg.light = true;
    game.after(1.5, () => M.talk([['narr', 'Dawn on Gaither & Ridley. The corner is empty for the only hour of the day it\'s ever empty.'], ['tee', 'They took Easy last night. Lonnie too. They\'ll want me by lunch.'], ['pigeon', 'Tee? You leaving?'],
      { who: 'tee', text: 'Run, or stay and take what comes?', choices: [{ label: 'Run', do: () => { F().i5 = 'run'; return [['tee', 'Tell your grandmother I said bye, Junior.'], ['narr', 'The 22 bus pulls up at the corner. For once, it is on time.']]; } }, { label: 'Stay', do: () => { F().i5 = 'stay'; return [['tee', 'Where I\'m gonna go? Charlotte? I don\'t know nobody in Charlotte.'], ['tee', 'Go home, Junior. Feed your birds.']]; } }] }], () => { M.flags.done = true; }));
  },
  finish: M => M.flags.done
});
