/* THE TOUR: Kernel Field is about to become a parking lot. Mortimer Megamax bets the deed on the Kaboom Cup, a
 * barnstorming tour of the wildest parks in baseball. Five road games (each with its cutscenes, rival and hazard), the
 * MegaDome boss, the Tour Map, the Clubhouse (Fan Bucks buy team upgrades), rewards from beaten rivals, saves, the ending
 * and the credits. */
const STOPS = [
  { park: 'barnacle', rival: 'HCK', reward: 'lumber', rewardName: 'BARNACLE GRIP TAPE', pin: [.2, .62],
    pre: [['brine', 'Ahoy, corn-pickers! The tide\'s coming in, and it\'s bringing a whole ocean of hurt!'], ['dot', 'We brought sunscreen.'], ['lou', 'Watch the gulls, folks. They\'ve got better hands than my old infield.']],
    win: [['brine', 'Blast it all. Take this. Barnacle Grip Tape. Sticks to anything, except a lead.'], ['ike', 'Lumber\'s a little sweeter now, kid.']], loss: [['brine', 'Back to the shallow end, landlubbers!']] },
  { park: 'caldera', rival: 'MCE', reward: 'cleats', rewardName: 'MAGMA CLEATS', pin: [.36, .3], rhubarb: true,
    pre: [['iggy', 'Hope you packed sunscreen. SPF one million.'], ['ike', 'Don\'t stand on anything that\'s glowing.'], ['hap', 'Word is Iggy throws inside when he\'s mad. Iggy is always mad.']],
    win: [['iggy', 'You\'ve got fire, Delgado. Here. Magma Cleats. They\'re only a little bit on fire.']], loss: [['iggy', 'Too hot for you? Thought so!']] },
  { park: 'tranquility', rival: 'MBM', reward: 'glove', rewardName: 'ZERO-G GLOVES', pin: [.55, .18],
    pre: [['cosmo', 'Welcome to the Moon, Comets. Up here every pop fly is a field trip.'], ['hank', 'Is there a snack bar on the Moon?'], ['lou', 'Gravity took the day off, folks. Somebody tell the baseball.']],
    win: [['cosmo', 'Mission accomplished, for you. Zero-G Gloves. They catch whatever gravity drops.']], loss: [['cosmo', 'Houston, you have a problem.']] },
  { park: 'boneyard', rival: 'HMH', reward: 'hype', rewardName: 'PHANTOM PINE TAR', pin: [.72, .4],
    pre: [['bones', 'We\'ve been dying to play you. Literally. Since 1887.'], ['pip', 'I\'m not scared.'], ['dot', 'Pip, you\'re holding Pep\'s hand.'], ['pip', 'He\'s holding MINE.']],
    win: [['bones', 'A fine game, mortals. Phantom Pine Tar. It makes the crowd scream louder.']], loss: [['bones', 'Rest in pieces, Comets. Heh heh heh.']] },
  { park: 'megadome', rival: 'MMX', reward: null, rewardName: 'THE KABOOM CUP', pin: [.86, .7], boss: true,
    pre: [['mort', 'Meet my ace. Ninety thousand horsepower. Zero feelings. ENFORCER-9000!'], ['robo', 'PREPARE. TO. BE. STRUCK. OUT.'], ['dot', 'Then let\'s give him some feelings.'], ['ike', 'Swing when they roar, kid.']],
    win: [['hap', 'The Batzooka\'s last blast rattles the MEGA-TRON! It\'s raining sparks in the MegaDome!'], ['mort', 'My jumbotron! My deed! My... reputation!'], ['hap', 'And the deed flutters into the backblast... and it\'s CONFETTI!'], ['dot', 'Kernel Field stays. Same time next season?'], ['robo', '...I. LIKE. BASEBALL.']],
    loss: [['mort', 'Pave it! Pave it all!']] }
];
const PROLOGUE = [['hap', 'Good evening, baseball fans, from Kernel Field, where the corn is high and the stakes are higher!'], ['mort', 'Enjoy your little cornfield, Comets. Monday it\'s a parking lot. Premium spaces only.'], ['dot', 'Over my dead batting glove.'],
  ['mort', 'Win the Kaboom Cup and I\'ll tear up the deed. Lose, and I pave the park AND hang that bat in my lobby.'], ['ike', 'Your grandma\'s BATZOOKA. Hickory, duct tape and a surplus bottle rocket. Summer of \'62.'], ['dot', 'What does it do?'],
  ['ike', 'Nothin\'. Till the crowd gets loud. Then it does EVERYTHING.'], ['lou', 'Folks, I haven\'t seen a bat that dangerous since I swung at my own shadow in \'79!']];
const UPGRADES = [['lumber', 'LUMBER', 'Exit speed +5% a tier', [400, 800, 1400]], ['glove', 'GLUE GLOVES', 'Catch radius and sure hands', [300, 700, 1200]], ['cleats', 'JET CLEATS', 'Run and field speed +4%', [300, 700, 1200]], ['arm', 'CANNON ARMS', 'Throws +5%, pitches +3%', [400, 800, 1400]], ['hype', 'HYPE MACHINE', 'Meter gain +10%', [500, 1000, 1600]]];

/* ---- the cutscene runner: the park as a stage, the speakers standing on it, their lines with portraits and babble.
 * Confirm advances a line; holding cancel for 1 s skips the scene ---- */
const STORY = { steps: [], i: 0, park: 'kernel', onDone: null, hold: 0, talk: null, cast: [] };
SCENES.story = {
  input: KEYS, camera: { zoom: false },
  enter(d) { Object.assign(STORY, { steps: d.steps, i: -1, park: d.park || 'kernel', onDone: d.onDone, hold: 0, title: d.title || '' }); MENUBG.park = STORY.park; music(d.song || 'tourmap'); STORY.talk = HEADLESS ? null : new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffe680', voice: null }); IDLE.t = 0; nextLine(); },
  update(dt) {
    commonTick(dt); const I = game.input;
    if (I.down('cancel') || I.down('east')) { STORY.hold += dt; if (STORY.hold > 1) { STORY.hold = 0; return endStory(); } } else STORY.hold = 0;
    if (STORY.talk) { STORY.talk.update(dt); if (!STORY.talk.open) nextLine(); }
    else if (I.pressed('confirm') || I.pressed('south')) { I.consumeAll(); nextLine(); }
  },
  draw(r) {
    menuBackdrop(r, .25);
    r.overlay(g => {
      const W = r.W, H = r.H, cur = STORY.steps[STORY.i];
      if (STORY.title) title(g, STORY.title, W / 2, 10, 2);
      // the speaker, big, on the left
      if (cur) { const rig = portraitOf(cur[0]); try { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose: /!/.test(cur[1]) ? 'cheer' : null, expr: /!/.test(cur[1]) ? 'shout' : 'smile' }); rig.draw(g, Math.round(W * .2), Math.round(H * .66), E.VIEWS.side); } catch (e) { /* first frame */ } }
      if (STORY.hold > 0) { const a = STORY.hold * TAU; for (let k = 0; k < 24; k++) if (k / 24 * TAU < a) px.dot(g, W - 30 + Math.cos(k / 24 * TAU) * 8, 20 + Math.sin(k / 24 * TAU) * 8, '#ffe680'); }
      promptRow(g, game.input, [['confirm', 'NEXT'], ['cancel', 'HOLD: SKIP']], W / 2, 38, 'center');
    });
    if (STORY.talk) STORY.talk.draw(r);
  }
};
function nextLine() {
  STORY.i++; const s = STORY.steps[STORY.i]; if (!s) return endStory();
  if (STORY.talk) STORY.talk.say(s[1], { name: WHO[s[0]] || ({ brine: 'CAPTAIN BRINE', iggy: 'IGGY BLAZE', cosmo: 'COMMANDER COSMO', bones: 'COUNT RATTLEBONES', robo: 'ENFORCER-9000', hank: 'HANK HOLLIS', pip: 'PIP PORTER', kid: 'KID KERNEL' }[s[0]] || s[0].toUpperCase()), portrait: portraitOf(s[0]) });
  babble.say(s[1], s[0]);
}
function endStory() { babble.stop(); const f = STORY.onDone; STORY.onDone = null; if (STORY.talk) STORY.talk.close(); if (f) f(); else game.go('title'); }

/* ---- the Tour menu, map and clubhouse ---- */
const TOUR = { menu: null, map: null, club: null, busX: 0, msg: '', msgT: 0 };
SCENES.tourMenu = {
  input: KEYS, camera: { zoom: false },
  enter() {
    IDLE.t = 0; music('tourmap'); const has = game.saves && game.saves.latest && game.saves.latest();
    TOUR.menu = new BigMenu([
      { label: 'CONTINUE', hidden: !has, act: () => { game.saves.load(has.slot); game.go('tourMap'); } },
      { label: 'NEW TOUR', sub: 'Prologue: Last Game at Kernel Field?', act: () => newTour() },
      { label: 'LOAD', hidden: !has, act: () => { game.saves.show('load'); } },
      { label: 'BACK', act: () => game.go('title') }
    ], { w: 220, h: 26, gap: 5, onBack: () => game.go('title') });
  },
  update(dt) { commonTick(dt); if (idleTick(dt)) return game.go('attract'); TOUR.menu.update(game.input, dt); if (BZ.justLoaded) { BZ.justLoaded = false; if (game.saves.shown === undefined || true) game.go('tourMap'); } },
  draw(r) { menuBackdrop(r, .5); r.overlay(g => { title(g, 'THE KABOOM CUP TOUR', r.W / 2, 14, 3); TOUR.menu.draw(g, r.W / 2, 60); legend(g, r.W, r.H, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
function newTour() {
  SAVE = SAVE_DEF(); SAVE.tour.started = true;
  game.go('story', { steps: PROLOGUE, park: 'kernel', title: 'LAST GAME AT KERNEL FIELD?', song: 'title', onDone: () => game.go('offerTraining') });
}
SCENES.offerTraining = {
  input: KEYS, camera: { zoom: false },
  enter() { TOUR.offer = new BigMenu([{ label: 'PLAY', sub: 'Learn the ropes with Grandpa Ike', act: () => game.go('lessons', { fromTour: true }) }, { label: 'SKIP', sub: 'Straight to the Tour Map', act: () => { autosave(); game.go('tourMap'); } }], { w: 220, h: 26, gap: 6, onBack: () => game.go('tourMap') }); },
  update(dt) { commonTick(dt); TOUR.offer.update(game.input, dt); },
  draw(r) { menuBackdrop(r, .5); r.overlay(g => { title(g, 'SPRING TRAINING?', r.W / 2, 20, 3); TOUR.offer.draw(g, r.W / 2, 70); legend(g, r.W, r.H, [['confirm', 'SELECT']]); }); }
};
function autosave() { try { if (game.saves && !hubActive()) { game.saves.canSave = true; game.saves.autosave(); } } catch (e) { game.fail('autosave', e); } }
SCENES.tourMap = {
  input: KEYS, camera: { zoom: false },
  enter() {
    IDLE.t = 0; music('tourmap'); if (game.saves) game.saves.canSave = true; TOUR.busX = TOUR.busX || 0;
    const T = SAVE.tour, done = T.done;
    TOUR.map = new BigMenu([
      { label: done ? 'REPLAY THE FINAL' : 'PLAY: ' + PARKS[STOPS[T.stop].park].name, sub: done ? 'The Kaboom Cup is yours' : 'vs the ' + TEAMS[STOPS[T.stop].rival].city + ' ' + TEAMS[STOPS[T.stop].rival].name, act: () => playStop(done ? 4 : T.stop) },
      { label: 'CLUBHOUSE', sub: fmt(SAVE.fb) + ' Fan Bucks', act: () => game.go('clubhouse') },
      { label: 'SAVE', act: () => { game.saves.show('save'); } },
      { label: 'TITLE', act: () => game.go('title') }
    ], { w: 150, h: 18, gap: 3, cols: 2, noSub: true, onBack: () => game.go('title') });
  },
  exit() { if (game.saves) game.saves.canSave = false; },
  update(dt) { commonTick(dt); TOUR.map.update(game.input, dt); TOUR.busX = approach(TOUR.busX, SAVE.tour.stop, dt * .8); TOUR.msgT = Math.max(0, TOUR.msgT - dt); },
  draw(r) {
    r.sky(['#2a4a2a', '#3a6a3a', '#4a7a3a']);
    r.overlay(g => {
      const W = r.W, H = r.H, mx = 30, my = 40, mw = W - 60, mh = H - 122;
      // the county map: fields, a river, the dotted road between the pins
      panel(g, mx - 6, my - 6, mw + 12, mh + 12, { bg: ['#6a8a4a', '#4a6a3a'], border: '#e8d8a0' });
      for (let i = 0; i < 14; i++) { const x = mx + E.hash2(i, 3) * mw, y = my + E.hash2(i, 7) * mh; px.rect(g, x, y, 30, 18, i % 2 ? '#7a9a4a' : '#8aa25a'); }
      px.line(g, mx, my + mh * .85, mx + mw, my + mh * .2, '#4a7ab8', 4);
      const pins = [[.08, .8], ...STOPS.map(s => s.pin)].map(([u, v]) => [mx + u * mw, my + v * mh]);
      for (let i = 0; i < pins.length - 1; i++) { const [a, b] = [pins[i], pins[i + 1]]; for (let t = 0; t < 1; t += .05) px.disc(g, lerp(a[0], b[0], t), lerp(a[1], b[1], t), 1, '#f4ecd8'); }
      pins.forEach(([x, y], i) => { const beaten = i === 0 || SAVE.tour.beaten.includes(i - 1), cur = i - 1 === SAVE.tour.stop && !SAVE.tour.done; px.disc(g, x, y, cur ? 7 : 5, beaten ? '#ffe680' : cur ? '#ff6a3a' : '#c8c8c8'); px.disc(g, x, y, 2.5, '#2a2a30'); text(g, i === 0 ? 'KERNEL FIELD' : PARKS[STOPS[i - 1].park].name.replace(' PARK', '').replace(' BALLPARK', ''), x, y + 9, '#ffffff', { align: 'center' }); });
      // the bus
      const p0 = pins[Math.min(5, SAVE.tour.done ? 5 : SAVE.tour.stop)], bob = Math.sin(game.real * 6) * 1;
      px.rect(g, p0[0] - 10, p0[1] - 20 + bob, 20, 9, '#f2c230'); px.rect(g, p0[0] - 8, p0[1] - 18 + bob, 4, 3, '#a8d8ff'); px.rect(g, p0[0] - 2, p0[1] - 18 + bob, 4, 3, '#a8d8ff'); px.rect(g, p0[0] + 4, p0[1] - 18 + bob, 4, 3, '#a8d8ff'); px.disc(g, p0[0] - 6, p0[1] - 11 + bob, 2, '#2a2a30'); px.disc(g, p0[0] + 6, p0[1] - 11 + bob, 2, '#2a2a30');
      title(g, 'TOUR MAP', W / 2, 8, 2); text(g, 'WINS ' + SAVE.tour.wins + '  LOSSES ' + SAVE.tour.losses + '   ' + fmt(SAVE.fb) + ' FB', W / 2, 28, '#ffe680', { align: 'center' });
      TOUR.map.draw(g, W / 2, H - 66); if (TOUR.map.cur && TOUR.map.cur.sub) text(g, TOUR.map.cur.sub, W / 2, my + mh + 4, '#ffe680', { align: 'center' });
      if (TOUR.msgT > 0) text(g, TOUR.msg, W / 2, my + mh / 2, '#ffffff', { align: 'center', scale: 2 });
      legend(g, W, H, [['confirm', 'SELECT'], ['cancel', 'TITLE']]);
    });
  }
};
function playStop(i) {
  const S = STOPS[i];
  game.go('story', { steps: S.pre, park: S.park, title: 'STOP ' + (i + 1) + ': ' + PARKS[S.park].name, song: 'tourmap', onDone: () => {
    const quick = game.settings.tourLength === 'quick';
    game.go('match', { mode: 'tour', away: 'COM', home: S.rival, park: S.park, innings: quick ? 1 : 3, difficulty: game.settings.difficulty, ctrl: [[game.input, null], [null, null]], boss: !!S.boss, tour: { stop: i, scriptedRhubarb: !!S.rhubarb }, upgrades: [SAVE.upgrades, null],
      onEnd: m => game.after(2.4, () => { const r = tourResult(i, m); game.go('results', { cfg: { mode: 'tour', next: () => postStop(i, r) } }); RES.fbTarget = r.fb; }) });
  } });
}
const FB_EVENTS = [];
BZ.bus.on('fanBucks', d => { if (M && M.mode === 'tour') FB_EVENTS.push(d.n); });
BZ.bus.on('matchStart', () => { FB_EVENTS.length = 0; });
function tourResult(i, m) {
  const com = m.teams.findIndex(t => t.def.id === 'COM'), won = m.winner === com;
  let fb = won ? 500 : 150; for (const p of m.teams[com].def.roster) { const s = m.stats[p.id]; if (s) fb += s.hr * 50; }
  fb += BZ.bus.log.filter(e => e.ev === 'homer' && e.data.batzooka && e.data.team === com).length * 100;
  if (won && m.teams[1 - com].runs === 0) fb += 200;
  fb += FB_EVENTS.reduce((a, b) => a + b, 0);
  SAVE.fb += fb; if (won) SAVE.tour.wins++; else SAVE.tour.losses++;
  emit('tourStop', { stop: i, won, fb });
  return { won, fb };
}
function postStop(i, res) {
  const S = STOPS[i];
  if (!res.won) return game.go('story', { steps: S.loss.concat([['ike', 'RAIN CHECK. We\'ll get \'em next time, kid. Maybe hit the Clubhouse first.']]), park: S.park, title: 'RAIN CHECK', onDone: () => { autosave(); game.go('tourMap'); } });
  if (!SAVE.tour.beaten.includes(i)) { SAVE.tour.beaten.push(i); if (S.reward) SAVE.upgrades[S.reward] = Math.min(3, SAVE.upgrades[S.reward] + 1); }
  if (i === 4) { SAVE.tour.done = true; SAVE.unlocked = true; autosave(); return game.go('story', { steps: S.win, park: 'megadome', title: 'THE KABOOM CUP!', song: 'credits', onDone: () => game.go('credits', { ending: true }) }); }
  SAVE.tour.stop = Math.max(SAVE.tour.stop, i + 1);
  autosave();
  game.go('story', { steps: S.win.concat([['hap', 'The Comets pick up ' + S.rewardName + '! Next stop: ' + PARKS[STOPS[i + 1].park].name + '!']]), park: S.park, title: 'VICTORY!', song: 'tourmap', onDone: () => game.go('tourMap') });
}
SCENES.clubhouse = {
  input: KEYS, camera: { zoom: false },
  enter() { IDLE.t = 0; music('menu'); TOUR.club = new BigMenu(UPGRADES.map(([k, n, d, cost]) => ({ label: n, sub: '', key: k, act: () => buy(k, cost) })).concat([{ label: 'BACK TO THE MAP', act: () => game.go('tourMap') }]), { w: 270, h: 26, gap: 4, onBack: () => game.go('tourMap') }); TOUR.ike = 'Spend those Fan Bucks wisely, kid.'; },
  update(dt) { commonTick(dt); TOUR.club.update(game.input, dt); },
  draw(r) {
    menuBackdrop(r, .65);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'CLUBHOUSE', W / 2, 8, 3); text(g, fmt(SAVE.fb) + ' FAN BUCKS', W / 2, 32, '#ffe680', { align: 'center', scale: 2 });
      UPGRADES.forEach(([k, n, d, cost], i) => { const it = TOUR.club.items[i], t = SAVE.upgrades[k]; it.sub = d + '   ' + '■'.repeat(t) + '□'.repeat(3 - t) + '   ' + (t >= 3 ? 'MAXED' : fmt(cost[t]) + ' FB'); it.disabled = t >= 3 || SAVE.fb < cost[t]; });
      TOUR.club.draw(g, W / 2, 52);
      panel(g, SAFE, H - 64, W - SAFE * 2, 24, { border: '#ffe680' }); text(g, 'GRANDPA IKE: ' + TOUR.ike, SAFE + 8, H - 57, '#ffffff');
      legend(g, W, H, [['confirm', 'BUY'], ['cancel', 'BACK']]);
    });
  }
};
function buy(k, cost) {
  const t = SAVE.upgrades[k]; if (t >= 3 || SAVE.fb < cost[t]) { sfx('back'); return; }
  SAVE.fb -= cost[t]; SAVE.upgrades[k]++; sfx('coin'); emit('purchase', { k, tier: SAVE.upgrades[k] });
  TOUR.ike = { lumber: 'Heavier wood, harder hits. Grandma would approve.', glove: 'Glue on the gloves. Don\'t touch your face.', cleats: 'Faster feet. Try not to outrun the ball.', arm: 'Cannon arms! Aim them at the bag, not the bleachers.', hype: 'Louder crowd, hotter Batzooka. Now we\'re cooking.' }[k];
  babble.say(TOUR.ike, 'ike'); autosave();
}
/* ---- credits: they roll over a blooper reel of mascots and pratfalls; then the title ---- */
SCENES.credits = {
  input: KEYS, camera: { zoom: false },
  enter(d) { this.t = 0; this.ending = d && d.ending; music('credits'); MENUBG.park = 'kernel'; },
  update(dt) { commonTick(dt); this.t += dt; const I = game.input; if (I.pressed('confirm') || I.pressed('cancel') || this.t > 48) { I.consumeAll(); game.go(this.ending ? 'title' : 'about'); } },
  draw(r) {
    menuBackdrop(r, .55);
    r.overlay(g => {
      const W = r.W, H = r.H, lines = creditLines(this.ending);
      lines.forEach((l, i) => { const y = H - this.t * 22 + i * 14; if (y > -20 && y < H + 10) (l.startsWith('#') ? (s => E.font.title(g, s, W / 2, y, { scale: 2, colors: GOLD, align: 'center' })) : (s => text(g, s, W / 2, y, '#ffffff', { align: 'center' })))(l.replace(/^#/, '')); });
      // the blooper reel: mascots tumbling along the bottom
      PARK_ORDER.forEach((id, i) => { const bl = mascotOf(id), x = ((this.t * 40 + i * 70) % (W + 60)) - 30; bl.update(1 / 60, { walk: 1, squash: Math.sin(this.t * 10 + i) * .3 }); try { bl.draw(g, Math.round(x), H - 26 - Math.abs(Math.sin(this.t * 5 + i)) * 10, E.VIEWS.side); } catch (e) { /* none */ } });
    });
  }
};
function creditLines(ending) {
  const L = ending ? ['#THE END?', 'Kernel Field is saved!', 'Exhibition: everything unlocked.', ''] : [];
  return L.concat(['#BATZOOKA BASEBALL', '', 'Design, code, art, music and writing', 'Claude (claude-opus-5-5, Anthropic)', 'built from PLAN.md', '', '#ENGINE', 'my-3D2dge v0.85.2 (MIT)', 'github.com/michaelcrosato/my-3d2dge', '', '#ONLINE', 'AI Hub Session client 1.4.0', 'michaelcrosato/ai-hub', '', '#STARRING', 'Dot "Dynamite" Delgado', 'Grandpa Ike Kowalski', 'Hap Harrigan and "Big" Lou Bombeck', 'Gloria Vox on the PA', 'Umpire Barb Hammersmith', 'Mortimer Megamax', 'ENFORCER-9000', '', '#MASCOTS', 'Popcorn Pete, Squidge, Sparky', 'Moonpie, Boo and Mr. Synergy', '', 'All sounds, music and voices', 'synthesized in code', '', '#THANKS FOR PLAYING!']);
}
