// the systems around the rules: cameras, HUD layout, input and glyphs, sound, voices, story, the autopilot, attract,
// Dev Mode, progress, settings, screens, the AI Hub (mock) and the duel
const recorder = () => { const box = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, n: 0 }; const add = (x, y, w, h) => { if (w <= 0 || h <= 0) return; box.n++; box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y); box.x1 = Math.max(box.x1, x + w); box.y1 = Math.max(box.y1, y + h); };
  const g = new Proxy({ fillRect: add, drawImage: (img, ...a) => { if (a.length >= 8) add(a[4], a[5], a[6], a[7]); else if (a.length >= 4) add(a[0], a[1], a[2], a[3]); else add(a[0], a[1], img.width || 1, img.height || 1); } }, { get: (t, k) => k in t ? t[k] : typeof k === 'string' && k[0] === '_' ? undefined : () => {}, set: (t, k, v) => { t[k] = v; return true; } }); return { g, box }; };
const tick = (game, s = .1) => game.advance(s);
const flush = () => new Promise(r => setTimeout(r, 0));
export default {
  cameras({ DH, game, check }) {
    game.go('drive', { stage: 'S1' }, { fade: 0 }); game.advance(.2); const d = DH.drive, NULLG = recorder().g;
    for (const [mode, side] of [['chase', 'centre'], ['chaseHigh', 'centre'], ['platform', 'any']]) { d.cam = mode; const cam = d.camera(mode); d.rail.paint(NULLG, { x: 0, y: 0, w: 427, h: 240 }, cam, {}); const p = d.rail.project(d.R.wrap(d.run.s), 0, 2); check('the ' + mode + ' camera sees our train\'s front', p && p[0] > 0 && p[0] < 427 && p[1] > 0 && p[1] < 240, JSON.stringify(p)); }
    d.cam = 'cab'; const seen = new Set(); d.run.teleport(800, { v: 50 }); for (let i = 0; i < 6; i++) { d.nextCam(); seen.add(d.cam); } check('the view button skips the platform camera between stations', !seen.has('platform') && seen.has('chase') && seen.has('cab'), [...seen].join(','));
    d.run.jumpToStop(1); const seen2 = new Set(); for (let i = 0; i < 6; i++) { d.nextCam(); seen2.add(d.cam); } check('and offers it at a station', seen2.has('platform'), [...seen2].join(','));
  },
  hud({ DH, game, check }) {
    game.go('drive', { stage: 'S1' }, { fade: 0 }); game.advance(.2); const d = DH.drive; d.run.teleport(1250, { v: 50 });
    for (const [W, H] of [[320, 240], [427, 240], [320, 690]]) {
      const { g, box } = recorder(); d.cab.paint(g, W, H, d.run, {}); d.hud.draw(g, W, H, d.run, { top: Math.round(H * .7), guide: true }); d.story.draw(g, W, H, Math.round(H * .7), {});
      check('the cab and HUD stay on a ' + W + 'x' + H + ' screen', box.n > 50 && box.x0 >= -2 && box.y0 >= -2 && box.x1 <= W + 2 && box.y1 <= H + 2, JSON.stringify(box));
    }
    const ids = d.cab.hits.map(h => h.id); check('the dash has its clickable widgets', ['handle', 'n', 'ats', 'horn', 'eb', 'view'].every(i => ids.includes(i)), ids.join(','));
    const eb = d.cab.hits.find(h => h.id === 'eb'); check('a click on the EB button hits it', d.cab.hit(eb.x + eb.w / 2, eb.y + eb.h / 2).id === 'eb');
    d.run.teleport(1520, { v: 40 }); d.run.forced = { B103: 'R' }; d.run._aspects(); for (let i = 0; i < 120 * 4; i++) game.advance(1 / 120);
    d.run.weather = 'rain'; DH.devTod = 23; const { g: g2, box: b2 } = recorder(); d.hud.draw(g2, 427, 240, d.run, { top: 168, guide: true }); DH.devTod = null;
    check('the HUD draws with the guide on, ATS ringing, rain and night', d.run.ats.ringing && b2.n > 30 && b2.x0 >= -2 && b2.x1 <= 429 && b2.y1 <= 242, JSON.stringify(b2) + ' ' + d.run.ats.ringing);
  },
  input({ DH, game, I, check }) {
    const L = a => DH.Glyph.label(a);
    I.lastDevice = 'gamepad'; game.settings.set('buttons', 'playstation'); check('PlayStation: call is Cross', L('call') === 'Cross', L('call'));
    game.settings.set('buttons', 'xbox'); check('Xbox: call is A', L('call') === 'A', L('call')); check('Xbox symbols set the engine glyphs too', game.settings.glyphs === 'xbox', game.settings.glyphs);
    game.settings.set('buttons', 'playstation'); I.lastDevice = 'keyboard'; check('keyboard: call is E', L('call') === 'E', L('call'));
    I.lastDevice = 'mouse'; check('mouse: call is the left click', L('call') === 'Left click', L('call'));
    game.go('drive', { stage: 'S1' }, { fade: 0 }); game.advance(.2); const d = DH.drive; d.run.jumpToStop(0);
    game.settings.set('leverDir', 'brakeUp'); I.press('KeyW'); game.advance(1 / 120); const c1 = d.commands(1 / 120); I.release('KeyW'); game.advance(.3);
    I.press('Pad7'); game.advance(1 / 120); const c2 = d.commands(1 / 120); I.release('Pad7'); game.settings.set('leverDir', 'powerUp'); game.advance(.3);
    check('Up = Brake: W brakes', c1.brake && !c1.power, JSON.stringify(c1)); check('R2 still powers', c2.power && !c2.brake, JSON.stringify(c2));
    DH.wheelQ.push('brake'); const c3 = d.commands(1 / 120); check('a wheel notch moves the lever', c3.brake, JSON.stringify(c3));
    // touch only: the message, no menu by taps, attract still starts
    game.go('title', null, { fade: 0 }); game.advance(.2); DH.forceTouchOnly = true; game.advance(.2); I.feed('down', 200, 120, { touch: true }); I.feed('up', 200, 120, { touch: true }); game.advance(.2);
    check('touch only: the title stays (no taps into the menu)', game.sceneName === 'title', game.sceneName);
    game.advance(10.5); check('touch only: attract mode still starts', game.sceneName === 'attract', game.sceneName); DH.forceTouchOnly = undefined;
  },
  sound({ DH, game, check }) {
    const P = v => DH.soundParams({ v, P: 2, B: 0, type: 'vvvf' });
    check('the VVVF tone steps down at a band edge', P(23.9).vvvf.f > P(24.1).vvvf.f, P(23.9).vvvf.f + ' ' + P(24.1).vvvf.f);
    check('wind grows with the square of speed', Math.abs(P(100).wind.vol / P(50).wind.vol - 4) < .05, P(100).wind.vol / P(50).wind.vol);
    check('the resistor growl rises with speed', DH.soundParams({ v: 60, P: 2, type: 'resistor' }).res.f > DH.soundParams({ v: 20, P: 2, type: 'resistor' }).res.f);
    const A = game.audio, used = ['clack', 'ebClunk', 'release', 'joint', 'chime', 'doorThunk', 'buzzer', 'pilot', 'atsDing', 'atsChime', 'slip', 'crack', 'tick', 'bell', 'bell2', 'whoosh', 'toot', 'gull', 'ferry', 'taiko', 'cicada', 'stamp', 'move', 'ok', 'back', 'jPerfect', 'jGreat', 'jGood', 'jOk', 'jBad', 'jTime', 'jSmooth', 'callOk', 'callGreat', 'bad', 'countdown', 'go'];
    check('every sound effect exists', used.every(k => A.presets[k]), used.filter(k => !A.presets[k]).join(','));
    check('every song exists', ['march', 'timetable', 'briefing', 'results', 'resultsMid', 'resultsLow', 'over', 'parallel', 'evening', 'groove'].every(k => DH.SONGS[k] && DH.SONGS[k].tracks.length));
    const R = DH.route('halo'); check('every station has a departure melody', R.stations.every(s => DH.MELODIES[s.melody] || DH.MELODIES[s.id]), R.stations.filter(s => !DH.MELODIES[s.melody]).map(s => s.id).join(','));
    check('a melody lasts 4-9 s', R.stations.every(s => { const m = DH.melodyVoices(s.melody); return m.len >= 3.5 && m.len <= 9.5; }), R.stations.map(s => DH.melodyVoices(s.melody).len.toFixed(1)).join(','));
  },
  babble({ DH, E, game, check }) {
    const a = DH.syllabify('Shuppatsu, shinko!', 'driver'), b = DH.syllabify('Shuppatsu, shinko!', 'driver');
    check('the same line always sounds the same', JSON.stringify(a) === JSON.stringify(b));
    check('longer lines make more syllables', DH.syllabify('The next station is Hanabatake. Hanabatake.').length > DH.syllabify('Hanabatake.').length * 2);
    const q = DH.syllabify('Is it here?'), s = DH.syllabify('Is it here.'); check('a question rises at its end', q[q.length - 1].pitch > s[s.length - 1].pitch, q[q.length - 1].pitch + ' ' + s[s.length - 1].pitch);
    check('every character has a voice', Object.values(DH.CHARS).every(c => DH.VOICES[c.voice]), Object.values(DH.CHARS).filter(c => !DH.VOICES[c.voice]).map(c => c.voice).join(','));
    let n = 0; const talk = new E.Dialog(game, { speed: 200 }); talk.voice = () => { n++; }; talk.say('Hello there.', {}); for (let i = 0; i < 30; i++) talk.update(1 / 60);
    check('the Dialog calls the voice hook for each character', n === 'Hello there.'.length, n);
  },
  story({ DH, E, check }) {
    for (const id of DH.STAGE_ORDER) { const S = DH.STAGES[id]; check(id + ' has results lines for every rank', 'SABCD'.split('').every(k => S.results[k]), Object.keys(S.results)); if (id !== 'PR') check(id + ' has a briefing', S.briefing && S.briefing.length >= 2); }
    const st = new DH.Story(); st.reset(); st.say([{ who: 'mika', text: 'One.' }, { who: 'hoshino', text: 'Two.' }]); st.update(.1); check('radio lines queue: one at a time', st.cur && st.cur.l.text === 'One.' && st.q.length === 1);
    const all = []; for (const id in DH.STAGES) { const S = DH.STAGES[id]; for (const l of (S.briefing || [])) all.push(l.text); for (const k in S.results) all.push(S.results[k]); for (const e of S.events || []) for (const l of e.lines || []) all.push(l.text); } for (const l of DH.FINALE) all.push(l.text);
    const long = all.filter(t => E.font.wrap(t, 320 - 46).length > 3); check('no line wraps past 3 rows at 320 px', !long.length, long.join(' | '));
  },
  autopilot({ DH, check }) {
    for (const id of ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'PR']) { const r = DH.autoRun(id, { skill: 1 }); check(id + ': the autopilot finishes', r.phase === 'finished', r.phase + ' ' + r.s.toFixed(0)); if (id !== 'S0') { check(id + ': skill 1 ranks S', r.rank() === 'S', r.rank() + ' ' + r.finalScore() + '/' + r.maxScore()); const pf = r.judgments.filter(j => j.key === 'perfect').length; check(id + ': skill 1 stops PERFECT at 80%+', pf >= .8 * r.judgments.length, pf + '/' + r.judgments.length); } }
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5']) { const r = DH.autoRun(id, { skill: .6 }); check(id + ': skill 0.6 finishes with no game over', r.phase === 'finished', r.phase + ' grace ' + r.grace.toFixed(1)); }
    check('the proof hash is the same twice', DH.proof('S1', 60) === DH.proof('S1', 60));
  },
  attract({ DH, game, I, check, ctx }) {
    const before = JSON.stringify(DH.Progress.get());
    game.go('title', null, { fade: 0 }); game.advance(.3); DH.lastInput = game.real; game.advance(9.7); const still = game.sceneName; game.advance(1.2); check('not before 10 s', still === 'title', still); check('10 s idle on the title starts attract', game.sceneName === 'attract', game.sceneName);
    const seen = []; for (let t = 0; t < 230; t += 2) { game.advance(2); const v = DH._attractI; if (seen[seen.length - 1] !== v) seen.push(v); }
    check('the vignettes run in order and loop', seen.slice(0, 8).join(',').startsWith('0,1,2,3,4,5,6,0'), seen.join(','));
    check('attract writes nothing', JSON.stringify(DH.Progress.get()) === before);
    for (const [what, act] of [['a confirm', () => I.tap('confirm')], ['a key', () => { I.press('KeyA'); }], ['the mouse', () => I.feed('move', 50, 50)], ['a stick', () => { const pad = { index: 0, id: 'Test pad', connected: true, axes: [.9, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; ctx.navigator.getGamepads = () => [pad]; I.pad = I.pad === null ? 'any' : I.pad; }]]) {
      game.go('attract', null, { fade: 0 }); game.advance(1); act(); game.advance(.9); I.release('KeyA'); ctx.navigator.getGamepads = () => [];
      check(what + ' returns attract to the title', game.sceneName === 'title', game.sceneName);
    }
  },
  dev({ DH, game, check, E }) {
    const dist = () => { const st = { v: 80, P: 0, B: 0, a: 0, jerk: 0, slipT: 0 }; let d = 0; while (st.v > 0) { DH.trainStep(st, -4, 1 / 120, { T: DH.TUNING, ty: DH.TRAINS.h8000, doors: true }); d += st.v / 3.6 / 120; } return d; };
    const d0 = dist(); game.settings.set('dev_brakeScale', 2); const d1 = dist(); check('the brake slider changes the train at once (B4 distance -45 to -55%)', d1 / d0 > .45 && d1 / d0 < .55, (d1 / d0).toFixed(2));
    game.settings.set('dev_graceStart', 60); DH.resetTuning(); check('Reset to defaults restores every slider', Object.keys(DH.TUNING_DEFAULTS).every(k => DH.TUNING[k] === DH.TUNING_DEFAULTS[k] && game.settings['dev_' + k] === DH.TUNING_DEFAULTS[k]));
    check('the Dev group holds the sliders', game.settings.keys('Dev').length >= 19, game.settings.keys('Dev').length);
    const keys = []; const S = game.settings, sh = game.shell; const groups = []; const orig = sh._row; sh._row = k => { keys.push(k); return null; }; sh._el = sh._el || (() => null); try { sh._settingsRows(() => {}); } catch (e) { } sh._row = orig; check('standard Settings lists no dev_ keys', !keys.some(k => k.startsWith('dev_')), keys.filter(k => k.startsWith('dev_')).join(','));
    game.go('drive', { stage: 'S1' }, { fade: 0 }); game.advance(.2); check('Dev Mode is in the pause menu', DH.pauseItems().some(i => i[0] === 'Dev Mode'));
    DH.hubInfo = { me: 0, players: [] }; check('Dev Mode is not in a session\'s pause menu', !DH.pauseItems().some(i => i[0] === 'Dev Mode')); DH.hubInfo = null;
    const r = DH.drive.run, p = r.stops[1]; r.teleport(p.target - 600, { v: 50 }); check('a jump lands within 1 m', Math.abs(r.s - (p.target - 600)) < 1, r.s);
    game.debug.finishStage(); check('Finish the stage judges every stop left PERFECT', r.judgments.length === r.stops.length - 1 && r.judgments.every(j => /^PERFECT/.test(j.label)), r.judgments.map(j => j.label).join(',') + ' of ' + (r.stops.length - 1));
    game.advance(20); check('finishing the stage reaches the results', game.sceneName === 'results', game.sceneName);
    game.go('drive', { stage: 'S2' }, { fade: 0 }); game.advance(.2); const r2 = DH.drive.run, k0 = r2.stopIdx; DH.Dev.skipStop(r2); check('Skip to the next stop judges that stop and the next is still ahead', r2.stopIdx === k0 + 1 && r2.phase === 'dwell' && /^PERFECT/.test(r2.lastJudgment.label), r2.stopIdx + ' ' + r2.phase);
  },
  devTriggers({ DH, game, check }) {
    // Dev Mode's "Trigger an event" at a station, with Halo Time frozen, then the autopilot through all of them
    game.go('drive', { stage: 'S1' }, { fade: 0 }); game.advance(.5);
    const d = DH.drive, r = d.run, ev = r.events;
    check('S1 opens standing in the dwell at its first station', r.dwell && !r.dwell.done && r.train.v === 0, r.dwell && r.dwell.stop.st.id);
    r.frozen = true; const g0 = r.grace, close0 = r.dwell.closeAt;
    check('at a station with Halo Time frozen, a door rush triggers', ev.trigger('doorRush') === true && !!r.dwell.rush);
    let n = 0; while (!r.dwell.rush.opened && n++ < 240) game.advance(.25);
    check('the rush re-opens the doors and holds them 8 s more', r.dwell.rush.opened && r.doors === 1 && r.dwell.closeAt >= close0 + 7, JSON.stringify({ o: r.dwell.rush.opened, doors: r.doors, c: r.dwell.closeAt - close0 }));
    check('an obstruction picks the next crossing ahead', ev.trigger('obstruction') === true && ev.obst.active && ev.obst.c.blocked && ev.obst.s - r.s > 150 && ev.obst.s - r.s < 3000, ev.obst && ev.obst.s - r.s);
    game.advance(3); check('standing at the station does not count as avoiding it', ev.obst.active && !ev.obst.stopped);
    check('track workers: a 25 slow order ahead of the train', ev.trigger('workers') === true && r.extraLimits.length === 1 && r.limitAt(r.extraLimits[0].s + 20) === 25 && r.extraLimits[0].s - r.s >= 500, JSON.stringify(r.extraLimits));
    check('the work site has its crew, lookout and boards', d.people.list.filter(p => p.work && p.work.dev).length === 4 && d.devThings.length >= 4, d.devThings.length);
    check('an oncoming train appears ahead on the other track', ev.trigger('oncoming') === true && r.actors.some(a => /^oncoming/.test(a.id) && a.dir === -1));
    check('the ATS bell rings for the next signal', ev.trigger('ats') === true && r.ats.ringing);
    check('Freeze Halo Time held the clock all through', r.grace === g0, r.grace + ' vs ' + g0);
    check('a door rush away from a station says so and does nothing', (() => { const dw = r.dwell; r.dwell = null; const ok = ev.trigger('doorRush'); r.dwell = dw; return ok === false; })());
    // now the autopilot deals with every one of them
    game.debug.auto(true); const hits0 = r.misc.limitHits; let flashed = false, maxV = 0;
    for (let t = 0; t < 400 && !(r.s > r.extraLimits[0].until + 50 && !ev.obst.active && flashed); t += .5) {
      game.advance(.5);
      if (!flashed && r.s > ev.obst.s + 50 && r.s > r.extraLimits[0].until) { flashed = true; ev.trigger('flash'); }
      if (r.s > r.extraLimits[0].s && r.s - d.run.len < r.extraLimits[0].until) maxV = Math.max(maxV, r.train.v);
    }
    check('the autopilot confirmed the ATS', !r.ats.ringing && r.misc.ebs === 0, r.ats.ringing + ' ebs ' + r.misc.ebs);
    check('it stopped short of the obstruction and the crossing cleared', r.misc.hazard && !ev.obst.active && !ev.obst.c.blocked, JSON.stringify(r.misc));
    check('it kept to 25 through the work site', maxV > 5 && maxV <= 25 + DH.TUNING.limitTol && r.misc.limitHits === hits0, maxV.toFixed(1));
    let t2 = 0; while (ev.flash && !ev.flash.done && t2 < 20) { game.advance(.25); t2 += .25; }
    check('a headlight flash ahead is answered with the horn', ev.flash && ev.flash.done && r.misc.flash && r.actors.some(a => a.id === 'sato'), JSON.stringify(ev.flash && { t: ev.flash.t, done: ev.flash.done }));
  },
  progress({ DH, check }) {
    DH.Progress.reset(); const p0 = DH.Progress.get(); check('a fresh save has the tutorial unlocked only', p0.unlocked.join() === 'S0');
    const r0 = DH.autoRun('S0', { skill: 1 }); DH.Progress.record(DH.summarize(r0), r0); check('the tutorial unlocks S1', DH.Progress.unlocked('S1') && !DH.Progress.unlocked('S2'));
    const r1 = DH.autoRun('S1', { skill: 1 }), got = DH.Progress.record(DH.summarize(r1), r1); check('S1 unlocks S2 and gives postcards 1, 2 (and 7, 8)', DH.Progress.unlocked('S2') && got.includes(1) && got.includes(2), got.join(','));
    const p = DH.Progress.get(); check('the save keeps the rank and the best', p.ranks.S1 === 'S' && p.best.S1.score > 0, JSON.stringify(p.ranks));
    DH.attractOn = true; const before = JSON.stringify(DH.Progress.get()); DH.Progress.record(DH.summarize(r1), r1); check('attract never writes the save', JSON.stringify(DH.Progress.get()) === before); DH.attractOn = false;
    for (const id of ['S2', 'S3', 'S4', 'S5']) { const r = DH.autoRun(id, { skill: 1 }); DH.Progress.record(DH.summarize(r), r); }
    const pc = DH.Progress.get().postcards.sort((a, b) => a - b); check('the career gives every postcard', pc.join() === '1,2,3,4,5,6,7,8', pc.join());
  },
  settings({ DH, game, check }) {
    game.settings.set('buttons', 'xbox'); check('controller symbols apply', game.input.glyphs === 'xbox'); game.settings.set('buttons', 'playstation');
    game.settings.set('guide', 'on'); check('the braking guide setting applies', DH.guideOn()); game.settings.set('guide', 'auto'); game.settings.set('difficulty', 'normal'); check('auto guide is off on Normal', !DH.guideOn());
    game.settings.set('autoCalls', true); const r = new DH.Run('S1', {}); r.teleport(1900, { v: 0 }); const c = r.callTargets.find(q => q.id === 'sig:B103'); r.s = c.s - 85; r._calls(0, {}); check('auto calls applies', c.state === 'done'); game.settings.set('autoCalls', false);
    game.settings.set('subtitles', false); check('subtitles can be turned off', game.settings.subtitles === false); game.settings.set('subtitles', true);
    game.settings.set('difficulty', 'easy'); check('difficulty applies to a new run', new DH.Run('S1', {}).grace === 40); game.settings.set('difficulty', 'normal');
  },
  screens({ DH, game, I, check }) {
    const go = (s, d) => { game.go(s, d, { fade: 0 }); game.advance(.2); };
    go('title'); I.tap('confirm'); game.advance(.5); check('CAREER opens the halo map', game.sceneName === 'haloMap', game.sceneName);
    I.tap('cancel'); game.advance(.5); check('back from the map to the title', game.sceneName === 'title', game.sceneName);
    go('haloMap', { select: 'S2' }); const m0 = DH.mapSel(); for (let i = 0; i < 6; i++) { I.tap('right'); game.advance(.1); } check('the halo map wraps round', DH.mapSel() === m0 && m0 === 'S2', m0 + ' -> ' + DH.mapSel());
    DH.Progress.reset(); go('haloMap', { select: 'S3' }); I.tap('confirm'); game.advance(.5); check('a locked stage cannot be started', game.sceneName === 'haloMap', game.sceneName);
    go('haloMap', { select: 'S0' }); I.tap('confirm'); game.advance(.5); check('an unlocked stage opens its briefing', game.sceneName === 'briefing', game.sceneName);
    for (let i = 0; i < 12; i++) { I.tap('confirm'); game.advance(.4); } game.advance(1); check('the briefing leads into the drive', game.sceneName === 'drive', game.sceneName);
    for (const s of ['freeRun', 'driversLog', 'about', 'duelLobby']) { go(s); I.tap('cancel'); game.advance(.5); check(s + ' backs out to the title', game.sceneName === 'title', game.sceneName); }
    go('title'); game.advance(.2); const M = DH.titleMenu; M.draw(recorder().g, game.W, game.H); const b3 = M.box[3]; I.mouse.t = -1; I.feed('move', b3.x + 10, b3.y + 4); game.advance(.1); check('the mouse over a menu entry moves the focus', M.i === 3, M.i);
    const text = DH.ABOUT_PAGES().map(p => p.body.map(b => b[1]).join(' ')).join(' ').toUpperCase(); check('About has every Source Information label', DH.SOURCE_LABELS.every(l => text.includes(l.toUpperCase())), DH.SOURCE_LABELS.filter(l => !text.includes(l.toUpperCase())).join(','));
    check('About has the three feedback sets', DH.ABOUT.testingFeedback.length === 4 && DH.ABOUT.engineFeedback.length === 6 && DH.ABOUT.promptFeedback.length === 4);
    const r = DH.autoRun('S1', { skill: 1 }); go('results', { sum: DH.summarize(r), cards: [] }); game.advance(3); I.tap('confirm'); game.advance(.6); check('results: the first button routes on', ['briefing', 'drive'].includes(game.sceneName), game.sceneName);
    go('gameOver', { stage: 'S1', canContinue: false }); game.advance(1.5); I.tap('confirm'); game.advance(.6); check('game over: retry restarts the stage', game.sceneName === 'drive', game.sceneName);
  },
  async hub({ load, check }) {
    const h = { active: true, seeded: true, version: '1.4.0', handlers: {}, sent: [], progressN: 0, results: [], t: -Infinity, readyN: 0, answers: [], failed: null,
      connect(o) { h.connectArgs = o; return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ada', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], mode: 'ghost', round: 1, limitMs: 300000, seed: 7 }); },
      ready() { h.readyN++; }, answer(a) { h.answers.push(a); }, time() { return h.t; }, on(ev, fn) { (h.handlers[ev] = h.handlers[ev] || []).push(fn); return () => {}; }, emit(ev, ...a) { for (const fn of h.handlers[ev] || []) fn(...a); },
      progress(p) { h.progressN++; }, result(r) { h.results.push(r); }, send(d, o) { h.sent.push({ d, t: h.t, size: JSON.stringify(d).length }); return true; }, rng() { let x = 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; }, fail(m) { h.failed = m; } };
    const { DH, game, I } = load({ hub: h }); const scenes = new Set(); const step = s => { for (let i = 0; i < s * 60; i++) { game.advance(1 / 60); scenes.add(game.sceneName); if (h.t > -1e9) h.t += 1000 / 60; } };
    step(.5); await flush(); step(.3); await flush(); step(.3);
    check('connect asks for ghost mode, 2-4 seats, its own card', h.connectArgs && h.connectArgs.mode === 'ghost' && h.connectArgs.seats.join() === '2,4' && h.connectArgs.card === true, JSON.stringify(h.connectArgs));
    check('ready() is called once, with no key press', h.readyN === 1, h.readyN); check('the card shows', game.sceneName === 'hubCard', game.sceneName);
    h.emit('card', { left: 9000, ready: [], asking: 0 }); I.tap('confirm'); step(.2); check('Enter on the card answers ready', h.answers.includes('ready'), h.answers.join());
    I.tap('ats'); step(.2); check('Triangle on the card asks for more time', h.answers.includes('more'), h.answers.join());
    DH.hubAuto = true; h.t = -3000; h.emit('start', { in: 3000 }); step(.3); const s0 = DH.Hub.drive && DH.Hub.drive.run.s; step(1.5);
    check('play waits for the hub\'s zero', DH.Hub.drive && DH.Hub.drive.run.s === s0 && DH.Hub.drive.run.t === 0, DH.Hub.drive && DH.Hub.drive.run.t);
    h.emit('message', { t: 'g', area: 'quad', s: 12120, v: 20, n: 'P3', st: 'run' }, 1);
    step(330); await flush(); step(1);
    const dur = Math.max(1, (h.t) / 1000), rate = h.sent.length / dur;
    check('progress at least once a second', h.progressN >= dur * .8, h.progressN + ' in ' + dur.toFixed(0) + ' s');
    check('sends at most 20 a second, each under 16 KB', rate <= 20 && h.sent.every(m => m.size < 16000), rate.toFixed(1));
    check('one result at the finish', h.results.length === 1 && h.results[0].score > 0, JSON.stringify(h.results));
    h.emit('time-up', { graceMs: 5000 }); step(.2); check('no second result at time-up', h.results.length === 1, h.results.length);
    h.emit('end', { reason: 'finished', standings: [[0], [1]] }); step(.5); I.tap('confirm'); step(.5);
    check('the end silences the game and stops input', game.sceneName === 'hubEnd' && game.audio.muted, game.sceneName + ' ' + game.audio.muted);
    check('no title or attract in a session', !scenes.has('title') && !scenes.has('attract'), [...scenes].join(','));
    check('no Quit or Dev Mode in the session\'s pause menu', game.o.menu.quit === false && !DH.pauseItems().length);
    // time-up before the finish reports at once
    const h2 = Object.assign({}, h, { handlers: {}, results: [], sent: [], answers: [], readyN: 0, t: -Infinity }); h2.on = (ev, fn) => { (h2.handlers[ev] = h2.handlers[ev] || []).push(fn); }; h2.emit = (ev, ...a) => { for (const fn of h2.handlers[ev] || []) fn(...a); }; h2.result = r => h2.results.push(r); h2.send = () => true; h2.ready = () => { h2.readyN++; }; h2.time = () => h2.t;
    const L2 = load({ hub: h2 }); for (let i = 0; i < 40; i++) L2.game.advance(1 / 60); await flush(); for (let i = 0; i < 40; i++) L2.game.advance(1 / 60); h2.t = -100; h2.emit('start', { in: 100 }); for (let i = 0; i < 60; i++) { L2.game.advance(1 / 60); h2.t += 16; } h2.emit('time-up', { graceMs: 5000 }); L2.game.advance(.1);
    check('time-up before the finish sends the result at once', h2.results.length === 1, JSON.stringify(h2.results));
  },
  duel({ DH, game, I, check }) {
    game.go('duelLobby', null, { fade: 0 }); game.advance(.2); const p2 = game.addPlayer({ keys: 'right' }); check('a second player joins on the keyboard\'s right half', game.players.length === 2 && p2.half === 'right', game.players.length);
    DH.duelAuto = true; I.tap('confirm'); p2.tap('confirm'); game.advance(.5); check('both ready starts the duel', game.sceneName === 'duel', game.sceneName);
    check('two viewports', (game.viewports || []).length === 2, (game.viewports || []).length);
    let t = 0; while (game.sceneName === 'duel' && t < 400) { game.advance(1); t++; }
    check('two autopilots finish the race', game.sceneName === 'duelResults', game.sceneName + ' after ' + t + ' s');
    const sums = DH.scenes.duelResults.d.sums; check('both drivers have a score', sums.every(s => s.score > 0), sums.map(s => s.score).join(' '));
    DH.duelAuto = false;
  }
};
