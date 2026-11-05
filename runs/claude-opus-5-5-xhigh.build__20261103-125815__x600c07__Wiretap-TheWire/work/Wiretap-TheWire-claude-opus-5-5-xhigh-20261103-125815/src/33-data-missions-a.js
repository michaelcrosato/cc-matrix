/* 33-data-missions-a: Episodes 1-2 and Tee's first two nights, as mission data (App. J.2) with hooks: setup(M),
   tick(M, dt), finish(M), draw(r, M). Positions are in cells (world = cells x 16). */
const at16 = (x, y) => ({ x: x * T, y: y * T });
function staticCar(M, id, x, y, facing, o = {}) { (M.statics = M.statics || []).push(Object.assign({ id, x: x * T, y: y * T, facing }, o)); }
function drawStatics(r, M) { for (const c of M.statics || []) { if (c.hidden) continue; r.shape(c.id, c.x, c.y, 0, { facing: c.facing, mats: c.mats }); if (c.lights) { const on = Math.floor(game.real * 4 + (c.ph || 0)) % 2; game.lights.add(c.x, c.y, 18, 70, .9, { color: on ? '#ff3030' : '#3060ff' }); } } }
/** Tee walks to a payphone, talks, and walks back: an ACT window at the phone */
function crewPhoneCall(M, id, phone, secs = 5) {
  const a = M.ppl[id]; if (!a || a.busy || (M.sim && !M.sim.open)) return; const pp = World.props.find(p => p.tag === phone), stand = { x: pp.x, y: pp.y + (phone === 'P3' ? -9 : 9) };
  a.busy = true; a.goTo(stand.x, stand.y, 44, () => { a.faceTo(pp); a.pose = 'phone'; a.doAct('payphone', secs); game.after(secs, () => { a.pose = null; a.busy = false; a.goTo(a.home.x, a.home.y, 44); }); });
}
/* ---- Episode 1 ---- */
def('missions', 'cold', { tod: 'dawnRain', clock: '05:40', amb: 'streetNight', music: 'montage', start: [34.6, 30.6], facing: Math.PI / 2, crowd: 4, film: 30, cast: ['dukes', 'lou', 'odessa', 'pigeon', 'kowalczyk'],
  intro: [['narr', '1407 Gaither Street. 5:40 in the morning. It has been raining since four.'], () => { if (tip('move')) Tut.say('Moving', 'Move with ' + Prompts.label('up') + Prompts.label('left') + Prompts.label('down') + Prompts.label('right') + ' or the left stick. Hold ' + Prompts.label('sprint') + ' to run. ' + Prompts.label('rotL') + ' / ' + Prompts.label('rotR') + ' turn the view.'); }],
  setup(M) {
    staticCar(M, 'patrol', 32, 37.6, Math.PI / 2, { lights: true }); staticCar(M, 'patrol', 32, 41.8, -Math.PI / 2, { lights: true, ph: .5 });
    const d = M.person('dukes', 31.6, 38.4); d.facing = Math.PI; const l = M.person('lou', 30.7, 40.5); l.pose = 'kneel'; l.facing = Math.PI;
    const o = M.person('odessa', 33.6, 37.4); o.facing = Math.PI; o.pose = 'hips'; const k = M.person('kowalczyk', 32.2, 39.8); k.facing = Math.PI / 2; k.pose = 'hips';
    const pg = M.person('pigeon', 34.4, 36.3); pg.body.z = 40; pg.facing = Math.PI; pg.light = true;
    M.flags.talked = {};
    const talk = (id, steps, after) => M.int({ id: 't:' + id, agent: M.ppl[id], x: M.ppl[id].x, y: M.ppl[id].y, r: 24, verb: 'Talk to ' + nameOf(id), when: () => !M.flags.talked[id] && (!after || M.flags.talked[after]), act: () => { M.flags.talked[id] = true; M.talk(steps); } });
    talk('dukes', [['dukes', 'Detective. Neighbor found him at five, going out for the paper. Nobody heard nothing.'], ['dana', 'Nobody heard a man get beat on his own steps.'], ['dukes', 'That\'s what nobody said.']]);
    talk('lou', [['lou', 'Cornelius Felton. Thirty-one years driving the number 22. Retired in March.'], ['dana', 'He called the corner in. Three times since August. Name and address every time.'], ['lou', 'Then somebody read his name out loud to the wrong person.'], ['dana', 'You\'re Homicide. This is yours.'], ['lou', 'It\'s mine till Friday. Then it\'s a file. You know the street?'], ['dana', 'Grew up three blocks off it.']], 'dukes');
    talk('odessa', [['dana', 'Morning, Miss Odessa.'], ['odessa', 'Dana Lynn. Your mama know you\'re out here this early?'],
      { who: 'dana', text: '...', choices: [{ label: '"Did you see anything last night?"', do: () => [['odessa', 'I saw the TV and the inside of my eyelids.']] }, { label: '"I remember your choir, Miss Odessa."', do: () => { F().odessaRespect = true; return [['odessa', 'Then you remember I don\'t say things twice.']]; } }] },
      ['odessa', 'I got a grandbaby to raise, Dana Lynn.'], () => { M.camAt = M.ppl.pigeon; Snd.play('coo'); game.after(.5, () => Snd.play('flap')); }, { wait: 3 }, () => { M.camAt = null; },
      ['lou', 'This ain\'t a whodunit, Dana. It\'s a who-cares.'], () => { M.flags.over = true; }], 'lou');
    M.int({ id: 'cards', x: 30.9 * T, y: 39.5 * T, r: 20, verb: 'Read the cards', hint: 'Felton\'s memorial', when: () => !M.flags.cards, act: () => { M.flags.cards = true; M.talk([['narr', '"Mr. Felton, you let us ride for free when it rained. - Tasha, 4th grade."'], ['narr', '"He called the police on them and the police told them his name."']]); } });
    M.objective('dukes', 'Talk to Officer Dukes', () => M.flags.talked.dukes, { at: M.ppl.dukes });
    M.objective('lou', 'Find Lou by the body', () => M.flags.talked.lou, { at: M.ppl.lou });
    M.objective('odessa', 'Miss Odessa is on her stoop', () => M.flags.over, { at: M.ppl.odessa });
    M.objective('cards', 'Read the cards on the stoop', () => M.flags.cards, { optional: true });
  },
  draw(r, M) { drawStatics(r, M); r.shape('sheetbody', 30.5 * T, 40.3 * T, 0, { facing: Math.PI / 2 }); for (let i = 0; i < 4; i++) r.prop('candle', (30.6 + i * .25) * T, 39.2 * T, 0, { light: true, size: 1 }); },
  finish: M => M.flags.over && !Talk.busy
});
def('missions', 'photos1', { tod: 'day', clock: '15:00', start: [22.6, 30.7], facing: 0, crowd: 25, film: 30, corner: { rate: .12, patrols: false }, cast: ['pockets'],
  intro: [['lou', 'I\'ll be in the Chevy if anybody asks for me. Nobody will.'], ['dana', 'Faces first. Then who does what.'], () => { if (tip('photos')) Tut.say('Eyes on', 'Hold ' + Prompts.label('watch') + ' to raise the camera. ' + Prompts.label('photo') + ' takes it. A face, held in focus, during a hand-to-hand, is three stars.'); }],
  events: [{ at: '16:10', every: '0:12', do: M => crewPhoneCall(M, 'tee', 'P1', 5) }],
  setup(M) {
    const pk = M.person('pockets', 27.5, 21.4); pk.stroller = true; pk.facing = Math.PI / 2; pk.pose = 'hips';
    M.int({ id: 'pockets', agent: pk, x: pk.x, y: pk.y, r: 24, verb: 'Talk to Pockets', hint: '$20', when: () => !F().pocketsMet, act: () => shoeGame(M) });
    M.int({ id: 'chevyDone', x: W(22), y: W(29.6) - 6, r: 22, verb: 'Back to the Chevy', hint: 'Done for today', when: () => M.obj.filter(o => !o.optional).slice(0, 3).every(o => o.ok), act: () => { M.flags.back = true; } });
    M.objective('faces', 'Photograph the crew\'s faces: Tee, Rook, Corey, Pigeon', () => ['tee', 'rook', 'corey', 'pigeon'].every(p => hasFact('face:' + p)), { sub: () => '' });
    M.objective('reads', 'Read two of them at work (hold the camera on them)', () => STATE.facts.filter(f => f.startsWith('obs:')).length >= 2);
    M.objective('pockets', 'Meet Pockets in the alley behind Gaither Market', () => F().pocketsMet, { at: pk });
    M.objective('chevy', 'Back to the Chevy', () => M.flags.back, { at: at16(22.5, 29.5) });
    M.objective('act', 'A photo of a hand-to-hand (ACT)', () => STATE.evidence.some(e => e.kind === 'act'), { optional: true });
    M.objective('call', 'Tee on the payphone at P1, in the act', () => hasFact('payphoneAct:tee:P1'), { optional: true });
  },
  draw: (r, M) => drawStatics(r, M),
  finish: M => M.flags.back
});
/** Pockets' shoe game: he describes shoes; you pick the photo */
function shoeGame(M) {
  if (STATE.meters.fund < 20) { M.say('pockets', 'Pockets don\'t do credit.'); return; }
  Meters.add('fund', -20, 'Twenty to Pockets'); F().pocketsMet = true; Talk.cast.pockets = M.ppl.pockets.rig;
  const Q = [['tee', 'Wheat Timbs, laces tucked, not a scuff on \'em. That\'s a man who thinks he\'s a businessman.', 'lieutenant'], ['rook', 'Black Air Force, red check, size thirteen. Don\'t let him see you looking.', 'muscle'],
    ['corey', 'Nikes with the duct tape on the left toe. He holds for \'em in the vacant. Nervous boy. Nervous boys live longer.', 'stash'], ['pigeon', 'Little sneakers that light up when he runs. Miss Odessa\'s grandbaby. They call him Pigeon on account of the birds. He\'s fourteen. ...Fourteen.', 'lookout']];
  const names = { tee: 'Terrence. Tee.', rook: 'Ricky Batts. Rook.', corey: 'Corey.', pigeon: 'Junior.' };
  const steps = [['pockets', 'Pockets don\'t do faces, Detective. Faces get you a funeral. Shoes, though. Shoes don\'t talk back.']];
  for (const [id, desc, role] of Q) {
    steps.push(['pockets', desc]);
    steps.push(() => { const have = ['tee', 'rook', 'corey', 'pigeon', 'dink', 'tavon', 'moe'].filter(p => hasFact('face:' + p));
      return [{ who: 'dana', text: 'Which photo?', choices: have.map(p => ({ label: 'Photo: ' + (STATE.facts.includes('name:' + p) ? nameOf(p) : 'the one ' + PEOPLE[p].role.toLowerCase().replace(/^\w+ \(/, '(')), do: () => p === id ? (addFact('name:' + id), addFact('pocket:' + id + ':' + role), addEvidence({ id: 'stmt:pockets:' + id, kind: 'stmt', ref: id, pts: 1, text: 'Pockets: the ' + role + ' is ' + nameOf(id) + ' (by his shoes)' }), casePoint('stmt', 'Pockets names ' + nameOf(id)), [['pockets', names[id]]]) : [['pockets', 'Them ain\'t the shoes.']] }))
        .concat([{ label: 'I don\'t have his picture', do: () => [['pockets', 'Then go get it. Pockets\'ll still be here. Pockets is always here.']] }]) }]; });
  }
  steps.push(['pockets', 'And Dre ain\'t with \'em no more. Broke his ankle jumping the fence at the old Arundel station, running from y\'all. They still meet out there. Ain\'t nobody fixed that fence.'], () => { addFact('pocket:dre'); Toast('Notebook', 'Dre broke his ankle at the old Arundel gas station fence. They still meet there.'); });
  M.talk(steps);
}
/* ---- Episode 2 ---- */
def('missions', 'payphones', { tod: 'day', clock: '11:00', start: [24, 30.7], crowd: 25, film: 30, corner: { rate: .12 },
  intro: [['dana', 'Three payphones on Ridley. Read the numbers off the plates. Don\'t stand there reading too long.']],
  events: [{ at: '11:20', every: '0:15', do: M => crewPhoneCall(M, 'tee', 'P1', 5) }, { at: '11:32', every: '0:20', do: M => crewPhoneCall(M, 'tavon', 'P2', 5) }],
  setup(M) {
    M.flags.read = {};
    for (const [k, x, y] of [['P1', 28.5, 26.75], ['P2', 35.5, 26.75], ['P3', 41.2, 30.2]]) M.int({ id: 'read:' + k, x: x * T, y: y * T, r: 20, verb: 'Read the number plate', hint: k + ' · 3 s', when: () => !M.flags.read[k] && !M.reading, act: () => {
      M.reading = true; M.P.locked = true; M.P.faceTo(at16(x, y)); M.P.loiter = 1.6; M.P.still = 3;
      game.after(3, () => { M.reading = false; M.P.locked = false; M.P.loiter = 0; M.flags.read[k] = true; STATE.numbers[k] = { n: NUMBERS[k], known: true, tapped: false, user: null }; addFact('numknown:' + k); Toast(k + ' · ' + NUMBERS[k], PHONE_LABEL[k]); Snd.play('typekey'); }); } });
    M.objective('nums', 'Read the numbers on P1, P2 and P3', () => Object.keys(M.flags.read).length >= 3);
    M.objective('act1', 'Photograph someone using one of them (ACT)', () => STATE.evidence.some(e => e.kind === 'act' && e.act === 'payphone'), { optional: true });
  },
  tick(M) { if (Object.keys(M.flags.read).length >= 3 && !M.flags.radio && M.t > 4) { M.flags.radio = true; game.after(4, () => { M.radio('navarre', 'Whitlock. Knockers are rolling on Gaither to grab the stash kid with the pager. Get close.', 4); game.after(4.5, () => { M.flags.go = true; }); }); } },
  draw: (r, M) => drawStatics(r, M),
  finish: M => M.flags.go
});
def('missions', 'chase', { tod: 'day', clock: '13:05', start: [36.4, 30.6], facing: Math.PI, crowd: 18, film: 30, music: 'chase', corner: { rate: 0, patrols: false },
  setup(M) {
    const corey = M.ppl.corey; corey.role = 'runner2'; M.sim.remove('corey'); M.extras.push(corey); M.observers = M.observers.filter(o => o !== corey); Perception.setup(M.observers, M.police);
    staticCar(M, 'sedan', 31.5, 31, -Math.PI / 2, { mats: { b: '#3a3a3a glaze' } });
    M.chase = new Chase(M, corey, { onCuff: () => { M.flags.cuffed = true; M.flags.cuffT = M.t; Toast('Cuffed', 'Search for what he threw, then take him in.'); } });
    M.say('narr', 'The knockers\' car pulls up on Gaither. Corey bolts.');
    corey.say('Knockers!', 1.5).loud = true;
    M.int({ id: 'takeIn', agent: corey, x: 0, y: 0, r: 26, verb: 'Take him in', hint: M.chase.ditched ? 'Search first?' : '', when: () => M.flags.cuffed, act: () => { M.flags.done = true; } });
    M.objective('catch', 'Catch Corey', () => M.flags.cuffed, { at: corey });
    M.objective('pkg', 'Find what he ditched', () => F().coreyPackage, { optional: true });
    M.objective('in', 'Take him in', () => M.flags.done);
    if (tip('chase')) Tut.say('Foot chase', 'Hold ' + Prompts.label('sprint') + ' to sprint, but it drains. ' + Prompts.label('interact') + ' vaults a fence, tackles when you\'re close, and held, cuffs. Keep him in sight.');
  },
  tick(M, dt) { M.chase.tick(dt); const ti = M.ints.find(i => i.id === 'takeIn'); ti.x = M.ppl.corey.x; ti.y = M.ppl.corey.y; if (M.flags.cuffed && M.t - M.flags.cuffT > 50) M.flags.done = true; },
  draw: (r, M) => { drawStatics(r, M); if (M.chase.state === 'run' && M.ppl.corey) r.marker(M.ppl.corey.x, M.ppl.corey.y, 40, { label: 'COREY', color: '#ff8a5a' }); },
  finish: M => M.flags.done
});
def('missions', 'fallback', { tod: 'day', clock: '14:00', start: [24, 30.7], crowd: 22, film: 12, corner: { rate: .12 },
  intro: [['dana', 'One more. Somebody on one of those phones, in the act.']],
  events: [{ at: '14:05', every: '0:08', do: M => crewPhoneCall(M, 'tee', 'P1', 6) }, { at: '14:09', every: '0:10', do: M => crewPhoneCall(M, 'tavon', 'P2', 6) }],
  setup(M) { M.objective('act', 'Photograph a crew member using a payphone (ACT)', () => STATE.evidence.filter(e => e.kind === 'act' && e.act === 'payphone').length > (M.flags.before || 0)); M.flags.before = STATE.evidence.filter(e => e.kind === 'act' && e.act === 'payphone').length; },
  finish: M => M.obj[0].ok
});

/* ---- Tee's nights ---- */
function interlude(id, o) {
  def('missions', id, Object.assign({ player: 'tee', tod: o.tod || 'night', clock: '22:00', rate: 4 / 300, start: [30.5, 32.1], facing: Math.PI / 2, crowd: 10, music: 'corner', amb: 'streetNight', noCam: false, intro: o.intro, events: o.events,
    corner: Object.assign({ rate: .35, night: true, patrols: true, autoReup: false, vials: 60, busy: true, reupSize: 150, custMax: 10 }, o.corner || {}),
    setup(M) {
      TeeShift.setup(M, { target: o.target, start: '22:00', end: o.end || '02:00', after: M2 => { const ch = o.choice && o.choice(M2); if (ch) M2.talk(ch, () => M2.finish()); else M2.finish(); } });
      M.sim.reupAt = 30; if (o.setup) o.setup(M);
      M.objective('count', o.target ? 'Make ' + money(o.target) + ' by 2 AM' : 'Get through the night', () => TeeShift.counted);
      for (const ob of o.objectives || []) M.objective(...ob(M));
    },
    tick(M, dt) { if (o.tick) o.tick(M, dt); for (const a of M.extras) if (a.isCop && a.gone) a.hidden = true; M.extras = M.extras.filter(a => !(a.isCop && a.gone)); },
    overlay(r, M) { TeeShift.draw(r); },
    draw(r, M) { drawStatics(r, M); if (o.draw) o.draw(r, M); },
    finish: () => false
  }, o.extra || {}));
}
interlude('i1', { target: 1500, intro: [['narr', 'Ten o\'clock. Gaither & Ridley. You are Terrence Mabry, and this corner is yours to run.']],
  events: [{ at: '22:10', do: M => M.talk([['rook', 'That bus driver. Felton. Who told you his name?'], ['tee', 'Nobody told me nothing. Man on the phone downtown told somebody who told somebody.'], ['rook', 'Downtown got a big mouth.'], ['tee', 'Downtown always do. That\'s why we use payphones.']]) },
    { at: '22:40', do: M => { M.sim.cars.push(new Car('patrol', PATROL_LOOP(), 70, { police: true, laps: 1 })); Toast('Patrol car', 'Coming down Ridley. Your lookouts call it, or you do.'); } },
    { at: '23:10', do: M => dutch(M) }, { at: '23:40', do: M => { const pg = M.sim.crew.find(a => a.crewId === 'pigeon'); if (pg) { pg.asleep = true; pg.blind = true; pg.pose = 'kneel'; Toast('Pigeon fell asleep', 'On the roof. Go wake him (' + Prompts.label('interact') + ' from the sidewalk under him).'); } } },
    { at: '00:30', do: M => M.sim.cars.push(new Car('patrol', PATROL_LOOP(), 70, { police: true, laps: 1 })) }],
  setup(M) { M.sim.vials = 34; M.sim.L.start = 34; },
  objectives: [M => ['wake', 'Wake Pigeon if he dozes', () => { const pg = M.sim.crew.find(a => a.crewId === 'pigeon'); return M.clock > 23.67 && pg && !pg.asleep; }, { optional: true }],
    M => ['reup', 'Page the re-up with the code card when the stash runs low (' + Prompts.label('notebook') + ')', () => M.sim.L.reups > 0]],
  tick(M) { if (M.sim.vials < 30 && !M.flags.lowTip) { M.flags.lowTip = true; Toast('Stash running low', 'Page the connect: code 44, a payphone for the callback.'); } },
  choice: () => [['narr', 'Dutch came up two dollars short tonight. ' + ({ slide: 'You let it slide.', away: 'You turned him away.', rook: 'Rook handled it.' }[F().dutch] || 'He left.')]]
});
function dutch(M) {
  const c = M.sim.spawnCustomer(); c.person = 'dutch'; c.rig = new E.Humanoid(Object.assign({ weapon: null }, PEOPLE.dutch.rig)); c.n = 1;
  game.after(4, () => M.talk([['dutch', 'Tee. Tee. I got eight. I\'m good for the two. You know I\'m good.'], { who: 'tee', text: '...', choices: [
    { label: 'Let it slide', do: () => { F().dutch = 'slide'; STATE.crew.goodwill++; return [['tee', 'Go on. Next time it\'s ten.']]; } },
    { label: 'Turn him away', do: () => { F().dutch = 'away'; STATE.crew.discipline += .2; M.sim.leave(c); return [['tee', 'Ten is ten, Dutch.']]; } },
    { label: 'Let Rook handle it', do: () => { F().dutch = 'rook'; STATE.crew.discipline += .4; STATE.crew.goodwill -= 2; M.sim.leave(c); return [['rook', 'Come here. Come here.'], ['narr', 'Nobody on the block looks at that alley for a minute.']]; } }] }]));
}
interlude('i2', { target: 1600, corner: { roster: ['tee', 'rook', 'dink', 'tavon', 'tout', 'pigeon', 'moe'] },
  intro: [['narr', 'Corey is in Central Booking. The stash is nobody\'s job tonight.'], ['tee', 'First thing. New place for the package.']],
  setup(M) {
    M.sim.vials = 30; M.sim.L.start = 30;
    game.after(1.2, () => UI.choose({ kicker: 'The stash', title: 'Where does it live now?', back: false, cards: [{ id: 'buick', label: 'The dead Buick, right on Gaither', sub: 'Near. Risky.' }, { id: 'trashGate', label: 'The trash can by the court', sub: 'Far, safe, a long walk for the runner' }, { id: 'v1412', label: 'Back in fourteen-twelve', sub: 'Slow and safe, if the police didn\'t hear about it' }] }, k => { M.sim.moveStash(k); F().stashSpot = k; }));
  },
  events: [{ at: '22:30', do: M => Toast('Re-up', 'Page the connect, and pick which payphone takes the callback. Or dial 555-0174 yourself from one.') },
    { at: '23:30', do: M => knockers(M) }, { at: '00:40', do: M => M.sim.cars.push(new Car('patrol', PATROL_LOOP(), 70, { police: true, laps: 1 })) }],
  objectives: [M => ['phone', 'Re-up through a payphone (your choice which)', () => !!F().payphoneChoice && M.sim.L.reups > 0]],
  choice: () => [{ who: 'rook', text: 'What about Corey?', choices: [{ label: 'Bail him out', do: () => { F().coreyBail = 'bail'; Meters.add('heat', -2, '', true); return [['tee', 'Get Corey out. He don\'t know nothing worth knowing.']]; } }, { label: 'Let him sit', do: () => { F().coreyBail = 'sit'; return [['tee', 'Let him sit. Sitting\'s good for him.']]; } }, { label: '"Rook wants to send a message"', do: () => { F().coreyBail = 'message'; return [['rook', 'Somebody should talk to him. About talking.'], ['tee', '...Not yet.']]; } }] }]
});
/** the knockers: an unmarked car, two jump-out men, the nearest crew member carrying gets frisked */
function knockers(M) {
  const sim = M.sim, path = new E.Path([[60 * T, 28.5 * T], [33 * T, 28.5 * T]]);
  const car = new Car('sedan', path, 90, { police: true, stay: true, mats: { b: '#2a2a2e glaze' }, onEnd: () => {
    for (const [dx, dy] of [[-.4, 1.4], [.6, 1.4]]) { const k = new Agent({ person: 'knocker', x: 33 * T + dx * T, y: 29.6 * T + dy * T }); M.extras.push(k); }
    const tgt = sim.crew.filter(a => !a.roof && a.role !== 'lookout' && a !== M.P).sort((a, b) => (b.carrying || 0) - (a.carrying || 0) || dist2(a, car) - dist2(b, car))[0];
    if (!tgt) return; tgt.locked = true; tgt.pose = 'handsUp'; Snd.play('yelp');
    game.after(3, () => { const got = sim.seize(tgt); tgt.locked = false; tgt.pose = null; Toast('Knockers', got.vials || got.cash ? 'They took ' + (got.vials ? got.vials + ' vials' : '') + (got.cash ? ' ' + money(got.cash) : '') + ' off ' + (tgt.crewId || 'him') + '.' : 'Nothing on him. They leave mad.'); });
  } });
  sim.cars.push(car); Toast('Unmarked car', 'Coming fast down Ridley.');
}
