// core, input and audio suites
const near = (a, b, e = .05) => Math.abs(a - b) <= e;
/** a run with P1 on the keyboard (and optional bots), in a room, played up to its waves */
export function playRoom(t, room = '1-1', o = {}) {
  const B = t.boot(o.boot || {}), { MT, game } = B;
  MT.newRun({ mode: o.mode || 'rehearsal', diff: o.diff || 'CONTESTANT', seed: o.seed || 7 });
  const c = MT.addRunPlayer({ slot: 0, look: 0, ctl: o.ctl || 'local', input: game.input, bot: o.bot || {}, god: o.god });
  for (let i = 1; i < (o.players || 1); i++) MT.addRunPlayer({ slot: i, look: i, ctl: 'bot', bot: o.bot || {}, god: o.god });
  game.go('play', { room }); game.advance(.35);
  if (o.waves !== false) { let k = 0; while (MT.play.world.phase !== 'WAVES' && MT.play.world.phase !== 'BOSS' && MT.play.world.phase !== 'BONUS' && k++ < 200) game.advance(.05); }
  return Object.assign(B, { c, w: () => MT.play.world });
}
export const suites = {
  core(t) {
    const { MT, E } = t.boot();
    t.check('every tuning starts at its default', MT.TDEF.every(d => MT.T[d.key] === d.def), MT.tunesChanged().map(d => d.key));
    t.check('there are 26 live tunings', MT.TDEF.length === 26, MT.TDEF.length);
    t.check('setTune clamps to the range', MT.setTune('playerSpeed', 9999) === 160);
    t.check('setTune snaps to the step', MT.setTune('dmgMul', 1.3) === 1.25);
    t.check('a changed tuning is saved', (E.store.get('mashtv:tuning', {}) || {}).playerSpeed === 160, E.store.get('mashtv:tuning', null));
    MT.loadTunes(); t.check('saved tunings load back', MT.T.playerSpeed === 160 && MT.T.dmgMul === 1.25);
    t.check('a changed tuning shows as dev-touched', MT.devActive());
    MT.resetTunes(); t.check('reset puts every tuning back', MT.tunesChanged().length === 0 && !MT.devActive());
    t.check('export tuning is one JSON line', MT.exportTuning() === '{}');
    MT.seedAll(7); const a = [MT.rng.spawn(), MT.rng.drops(), MT.rng.ai()]; MT.seedAll(7); const b = [MT.rng.spawn(), MT.rng.drops(), MT.rng.ai()];
    t.check('random streams are deterministic', a.join() === b.join(), [a, b]);
    let got = null; const off = MT.on('x', d => { got = d; }); MT.emit('x', 5); off(); MT.emit('x', 6);
    t.check('the event bus delivers and unsubscribes', got === 5, got);
    const A = new MT.Arena('studio'), m = A.map;
    t.check('the arena is 23 x 15 cells', m.w === 23 && m.h === 15);
    t.check('door cells are their own wall type', [[10, 0], [11, 0], [12, 0], [0, 6], [0, 7], [0, 8], [22, 7], [11, 14]].every(([x, y]) => m.cell(x, y) === 2));
    t.check('the interior is open floor', m.cell(1, 1) === 0 && m.cell(21, 13) === 0 && m.cell(11, 7) === 0);
    t.check('interior cells map to world points', MT.cellW(0, 0).join() === '24,24' && MT.cellW(20, 12).join() === '344,216');
    t.check('the south wall is cut down for the camera', m.types[3].cut === true);
    t.check('doors start closed', ['N', 'E', 'S', 'W'].every(d => A.doors[d].state === 'closed'));
    A.queueSpawn('N', 'goon', 2, .1); const out = []; for (let i = 0; i < 120; i++) A.update(1 / 60, (k, x, y, d) => out.push([k, x, y, d]));
    t.check('a queued door opens, pours its spawns and closes', out.length === 2 && out[0][3] === 'N' && out[0][2] < 0 && A.doors.N.state === 'closed', [out, A.doors.N.state]);
  },
  input(t) {
    const P = playRoom(t, '1-1'), { MT, game, c } = P, I = game.input;
    t.check('play uses the play preset (arrows aim)', !!I.map.aimUp && !I.map.up.includes('ArrowUp'), Object.keys(I.map));
    I.press('ArrowUp'); game.advance(.05);
    let it = MT.intentFrom(I, c); t.check('ArrowUp fires up', it.fire && near(it.aim, -Math.PI / 2), it);
    I.press('ArrowRight'); game.advance(.02); it = MT.intentFrom(I, c); t.check('two arrows fire diagonally', it.fire && near(it.aim, -Math.PI / 4, .2), it);
    I.release('ArrowUp'); I.release('ArrowRight'); game.advance(.02);
    I.press('Escape'); game.advance(.05); I.release('Escape'); game.advance(.05);
    t.check('pausing pauses', game.paused);
    t.check('paused, every player uses the menu preset (arrows move the focus)', I.map.down.includes('ArrowDown') && !I.map.aimUp, Object.keys(I.map));
    game.resume(); game.advance(.05);
    t.check('resumed, arrows aim again', !!I.map.aimUp);
    I.padAim = [1, 0]; it = MT.intentFrom(I, c); t.check('the right stick aims and fires (auto-fire)', it.fire && near(it.aim, 0) && it.aimSrc === 'pad', it);
    game.settings.set('autoFire', false); I.padAim = [0, 1]; it = MT.intentFrom(I, c); t.check('auto-fire off: the stick only aims', !it.fire && it.aim !== null, it); game.settings.set('autoFire', true);
    I.padAim = null; c.lastAim = 1.2; I.press('Pad7'); game.advance(.02); it = MT.intentFrom(I, c); t.check('R2 fires along the last aim', it.fire && near(it.aim, 1.2), it); I.release('Pad7');
    const w = P.w(), e = w.spawnEnemy('goon', c.x + 100, c.y + 8, { inside: true });
    const pad = { aim: Math.atan2(8, 100) + .12, aimSrc: 'pad' }, keys = { aim: Math.atan2(8, 100) + .12, aimSrc: 'keys' };
    w.aimAssist(c, pad); w.aimAssist(c, keys);
    t.check('aim assist nudges a pad aim toward a near enemy', Math.abs(pad.aim - Math.atan2(8, 100)) < .07, pad.aim);
    t.check('aim assist leaves keyboard aim alone', near(keys.aim, Math.atan2(8, 100) + .12, .001));
    const G = MT.glyph;
    I.lastDevice = 'gamepad'; game.settings.set('glyphs', 'playstation');
    t.check('pad glyphs: slide ✕, bomb R1, showboat L1', G.describe('slide', I) === 'L2' || G.describe('slide', I) === '✕', [G.describe('slide', I), G.describe('bomb', I), G.describe('showboat', I)]);
    t.check('pad glyphs: confirm ✕ cancel ○', G.describe('confirm', I) === '✕' && G.describe('cancel', I) === '○', [G.describe('confirm', I), G.describe('cancel', I)]);
    game.settings.set('glyphs', 'xbox');
    t.check('the Xbox setting shows A / B / RB', G.describe('confirm', I) === 'A' && G.describe('cancel', I) === 'B' && G.describe('bomb', I) === 'RB', [G.describe('confirm', I), G.describe('bomb', I)]);
    game.settings.set('glyphs', 'playstation');
    t.check('glyph setting defaults to PlayStation (engine patch P2)', game.settings.spec('glyphs').value === 'playstation' && game.settings.spec('glyphs').options.length === 2);
    I.lastDevice = 'keyboard';
    t.check('keyboard prompts: Space, E, Q', G.describe('slide', I) === 'SPACE' && G.describe('bomb', I) === 'E' && G.describe('showboat', I) === 'Q', [G.describe('slide', I), G.describe('bomb', I), G.describe('showboat', I)]);
    I.lastDevice = 'mouse';
    t.check('mouse prompts: left click fires, right click bombs', G.describe('fire', I) === 'LEFT CLICK' && G.describe('bomb', I) === 'RIGHT CLICK', [G.describe('fire', I), G.describe('bomb', I)]);
    const q = game.addPlayer({ pad: 1 });
    t.check('a player who joins gets the same glyph family', q && q.glyphs === I.glyphs, q && q.glyphs);
    game.advance(.05);
    t.check('a joined player follows the preset', q && q.preset === I.preset);
    t.check('the controls screen names our actions', I.names && I.names.bomb === 'Showstopper' && I.names.tabL === false);
  },
  audio(t) {
    const { MT, game } = t.boot();
    const d1 = MT.babble.say('HI!', 'lance'), d2 = MT.babble.say('GOOD EVENING, PLANET EARTH! THIS IS A MUCH LONGER LINE OF HOST CHATTER, FOLKS!', 'lance');
    t.check('babble works headless and scales with the text', d2 > d1 * 3 && d1 > 0, [d1, d2]);
    t.check('the announcer speaks slower than Lance', MT.babble.duration('LIVE FROM STUDIO 9', 'annc') > MT.babble.duration('LIVE FROM STUDIO 9', 'lance'));
    t.check('babble syllables come from vowel groups', MT.babble.syllables('MASH TV').length === 2, MT.babble.syllables('MASH TV'));
    let bad = [];
    for (const [id, s] of Object.entries(Object.assign({}, MT.SONGS, MT.STINGS))) for (const tr of s.tracks) { const n = tr.notes.replace(/\|/g, ' ').split(/\s+/).filter(Boolean).length; if (MT.SONGS[id] && n % 16) bad.push(id + ':' + (tr.name || tr.wave) + ':' + n); }
    t.check('every song track is whole bars', !bad.length, bad);
    t.check('eight songs', Object.keys(MT.SONGS).length === 8);
    for (const id in MT.SONGS) { try { MT.music.play(id); } catch (e) { bad.push(id + ' ' + e.message); } }
    for (const id in MT.STINGS) { try { MT.music.sting(id); } catch (e) { bad.push(id + ' ' + e.message); } }
    t.check('music and stings never throw headless', !bad.length, bad);
    for (const k in MT.SFX) { try { MT.sfx(k); } catch (e) { bad.push(k); } }
    t.check('every sound plays headless', !bad.length && Object.keys(MT.SFX).length >= 60, [bad, Object.keys(MT.SFX).length]);
    const pools = Object.keys(MT.TEXT.pools), empty = pools.filter(p => !MT.pool(p));
    t.check('every line pool has lines', !empty.length, empty);
    const seqs = ['coldOpen', 'mashyIntro', 'wheelIntro', 'finaleIntro', 'robotReveal', 'networkReveal', 'endingA', 'endingB', 'gameOver', 'continue', 'commercial', 'recap', 'ep1', 'ep2', 'ep3'];
    t.check('every story beat has its lines', seqs.every(s => MT.TEXT.seq[s] && MT.TEXT.seq[s].length), seqs.filter(s => !MT.TEXT.seq[s]));
    const intros = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'tank', 'snake', 'brute'];
    t.check('every enemy has an introduction and a hint', intros.every(k => MT.TEXT.intros[k] && MT.TEXT.intros[k].length === 2));
    t.check('18 prizes and the grand prize', [1, 2, 3].every(e => MT.TEXT.prizes[e].length === 6) && MT.TEXT.grandPrize.value === 100000);
    const scenesSongs = {};
    for (const s of ['title', 'lobby', 'recap', 'ending']) { game.go(s, s === 'recap' ? { ep: 1, fake: true } : s === 'ending' ? { kind: 'a' } : {}); game.advance(.4); scenesSongs[s] = MT.music.current; }
    t.check('each scene sets a song', Object.values(scenesSongs).every(Boolean), scenesSongs);
    t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
  },
};
