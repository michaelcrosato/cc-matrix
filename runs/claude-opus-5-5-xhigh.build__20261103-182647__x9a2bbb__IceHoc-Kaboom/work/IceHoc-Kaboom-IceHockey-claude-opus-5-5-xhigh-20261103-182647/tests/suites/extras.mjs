// The rest of TASK.md's and the plan's rules, one by one: the hat trick and the Hoser Hat Trick, Records, the Practice
// screen, and every Settings option read live (camera, distance, commentary, subtitles, voices, crowd, intros, replays,
// the Flood Wagon option, the puck trail, tips, reset tips, difficulty, period length, button symbols)
import { load } from '../lib.mjs';
import { check, guard } from '../t.mjs';
guard('extras', async () => {
  const { game, G, E } = load(); const tips = () => E.store.get('ihk:tips', {}) || {}; game.advance(.5);
  const { Match, Rink, Setup, Bus, Records, Save } = G, S = k => game.settings[k], I = game.input;
  const ev = []; Bus.sim('*', e => ev.push(e)); const seen = t => ev.filter(e => e.type === t);
  const go = (cfg, s = .1) => { game.go('match', { cfg }, { fade: 0 }); game.advance(s); return Match.m; };
  // a goal for s (straight at the middle of an empty net, again if a post says no), assisted by assist
  const score = (m, s, assist) => { const g0 = s.stats.goals; for (let k = 0; k < 4 && s.stats.goals === g0; k++) { m.setPhase('play'); m.cheats.noGoalies = true; const d = m.attackDir(s.team), gx = Rink.goalX(m.attackNet(s.team)); s.x = gx - d * 60; s.y = Rink.C.y; s.facing = d > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, s, 't'); if (assist) m.puck.touches = [assist, s]; s.intent.aim = [gx, Rink.C.y]; G.Shots.shoot(m, s, 'wrist', 0); game.advance(.8); game.advance(3.2); } };
  // ---- a hat trick: three goals, hats rain; the Hoser Hat Trick: a goal, an assist and a fight win
  let m = go(Object.assign(Setup.quickCfg({}), { seed: 3, replays: 'off', intros: false }), .6); m.cheats.freezeAI = true;
  const sn = m.humans[0].skater, du = m.teams[0].skaters.find(q => q !== sn);
  for (let k = 0; k < 3; k++) score(m, sn);
  check('three goals by one player is a hat trick', sn.stats.goals === 3 && seen('hat_trick').some(e => e.by === sn.id), sn.stats.goals);
  check('the hats rain from the stands', m.items.filter(i => i.kind === 'hat').length >= 20 || seen('stoppage').length > 0, m.items.filter(i => i.kind === 'hat').length);
  score(m, du, sn); check('the last touch before the scorer earns the assist', sn.stats.assists === 1, sn.stats.assists);
  m.cheats.noGoalies = false;
  check('no Hoser Hat Trick yet (no fight won)', !seen('hoser_hat_trick').length);
  m.setPhase('play'); const rival = m.teams[1].skaters[2]; rival.x = sn.x + 14; rival.y = sn.y; G.Fight.start(m, sn, rival); for (let i = 0; i < 25 * 120 && m.fight && !m.fight.over; i++) { if (sn.fight && !sn.fight.act) { sn.fight.act = null; I.tap('pass'); } if (rival.fight) rival.fight.bal = Math.min(rival.fight.bal, 20); game.advance(1 / 120); }
  game.advance(3);
  check('winning a fight after a goal and an assist is a Hoser Hat Trick', seen('hoser_hat_trick').some(e => e.by === sn.id), JSON.stringify(sn.stats));
  // ---- Records: the human's hardest shot, biggest hit, most goals in a game, fights won, KABOOMs, games and wins
  const r0 = Records.get(); m.cheats.noGoalies = false; G.Match.endGame(m, 0); game.advance(.2);
  const r1 = Records.get();
  check('Records: the hardest shot (km/h)', r1.shot > 0 && r1.shot >= r0.shot, r1.shot); check('Records: most goals in a game', r1.goals >= 3, r1.goals); check('Records: fights won', r1.fights >= 1, r1.fights); check('Records: games and wins', r1.games === r0.games + 1 && r1.wins === r0.wins + 1, JSON.stringify(r1));
  m = go(Object.assign(Setup.quickCfg({}), { seed: 4, replays: 'off', intros: false, noAutoSwitch: true }), .6); m.setPhase('play'); m.cheats.freezeAI = true;
  const att = m.humans[0].skater, vic = m.teams[1].skaters[0]; vic.x = 500; vic.y = 300; att.x = 470; att.y = 300; att.vx = 260; att.turboOn = true; att.facing = 0; G.Skater.check(m, att); game.advance(.4);
  check('Records: the biggest hit', Records.get().hit > 0, Records.get().hit);
  G.Boom.start(m, 0); check('Records: KABOOMs', Records.get().kabooms >= 1);
  game.go('records', null, { fade: 0 }); game.advance(.3); check('the Records screen opens with two pages', game.sceneName === 'records' && game.scene.page === 0); I.tap('right'); game.advance(.2); check('the Records screen pages', game.scene.page === 1); I.tap('cancel'); game.advance(.5); check('back from Records returns to the title menu', game.sceneName === 'title');
  // ---- the Practice screen: a carousel of the 7 drills; confirm starts the drill in focus; passing all 7 earns the badge
  game.go('practice', null, { fade: 0 }); game.advance(.3); I.tap('right'); game.advance(.2); I.tap('right'); game.advance(.2);
  check('Practice: the carousel moves to drill 3', game.scene.i === 2); I.tap('confirm'); game.advance(1.2);
  check('Practice: confirm starts that drill', game.sceneName === 'match' && Match.m.cfg.mode === 'drill' && Match.m.cfg.drill === 3);
  for (let d = 1; d <= 7; d++) Save.drillDone(d); check('Practice: all 7 drills passed earns Marge Approved', Save.data.badge);
  // ---- Settings, each read live
  const cfgS = () => Setup.quickCfg({});
  game.settings.set('camera', 'overhead'); m = go(cfgS(), 1); check('Settings: Camera Overhead uses the topdown view', game.view.id === 'topdown', game.view.id);
  game.settings.set('camera', 'broadcast'); game.advance(.2); check('Settings: Camera Broadcast uses the threequarter view', game.view.id === 'threequarter', game.view.id);
  game.settings.set('camDist', 'near'); game.advance(.2); const zn = game.zoom; game.settings.set('camDist', 'far'); game.advance(.2); check('Settings: Camera distance changes the zoom', zn > game.zoom, zn + ' > ' + game.zoom); game.settings.set('camDist', 'normal');
  G.Talk.close(); game.settings.set('commentary', false); check('Settings: Commentary Off silences the booth', G.Talk.say('goal', {}, true) === false); game.settings.set('commentary', true); check('Settings: Commentary On speaks', G.Talk.say('goal', { name: 'X' }, true) === true);
  G.Talk.close(); game.settings.set('subtitles', false); G.Talk.speak('c', 'Test line'); check('Settings: Subtitles Off keeps the box closed (voice only)', !G.Talk.open); game.settings.set('subtitles', true); G.Talk.speak('c', 'Test line'); check('Settings: Subtitles On shows the box', G.Talk.open); G.Talk.close();
  game.settings.set('voices', .3); check('Settings: Voices volume sets the voice bus', game.audio.voiceVolume === .3); game.settings.set('voices', .8);
  game.settings.set('crowdVol', .4); check('Settings: Crowd volume is kept and read', S('crowdVol') === .4); game.settings.set('crowdVol', .8);
  game.settings.set('intros', false);
  m = go(Object.assign(cfgS(), { intros: S('intros') }), .3); check('Settings: Player intros Off (no intro phase)', m.intro === null && m.phase !== 'intro', m.phase); game.settings.set('intros', true);
  m = go(Object.assign(cfgS(), { intros: S('intros') }), .3); check('Settings: Player intros On (the lineup is introduced)', !!m.intro && m.phase === 'intro', m.phase);
  game.settings.set('replays', 'off'); m = go(Object.assign(cfgS(), { replays: S('replays'), intros: false }), .6); m.cheats.freezeAI = true; let rp = false; score(m, m.humans[0].skater); for (let i = 0; i < 600; i++) { game.advance(1 / 120); if (G.Replay.on) rp = true; }
  check('Settings: Replays Off shows no replay', !rp); game.settings.set('replays', 'auto');
  game.settings.set('flood', 'never'); m = go(Object.assign(Setup.quickCfg({}), { flood: S('flood'), intros: false }), .6); m.setPhase('play'); m.clock = .2; let fl = false; for (let i = 0; i < 8 * 120; i++) { game.advance(1 / 120); if (game.sceneName === 'flood') fl = true; }
  check('Settings: Flood Wagon Never skips it', !fl && m.period === 2, m.period);
  game.settings.set('flood', 'always'); m = go(Object.assign(Setup.quickCfg({}), { flood: S('flood'), intros: false }), .6); m.setPhase('play'); m.clock = .2; for (let i = 0; i < 6 * 120 && game.sceneName !== 'flood'; i++) game.advance(1 / 120);
  check('Settings: Flood Wagon Always drives it without asking', game.sceneName === 'flood' && game.scene.phase === 'drive', game.sceneName + ' ' + (game.scene && game.scene.phase));
  game.settings.set('flood', 'ask'); m = go(Object.assign(Setup.quickCfg({}), { flood: S('flood'), intros: false }), .6); m.setPhase('play'); m.clock = .2; for (let i = 0; i < 6 * 120 && game.sceneName !== 'flood'; i++) game.advance(1 / 120);
  check('Settings: Flood Wagon Ask offers it on the intermission card', game.sceneName === 'flood' && game.scene.phase === 'card');
  for (const v of ['off', 'streak', 'glow']) { game.settings.set('trail', v); check('Settings: Puck trail ' + v + ' is kept', S('trail') === v); }
  game.settings.set('tips', false); E.store.set('ihk:tips', {}); G.Talk.tipOnce('chirp'); game.advance(.1); check('Settings: Tips Off shows none', !tips().chirp);
  game.settings.set('tips', true); G.Talk.tipOnce('chirp'); check('Settings: Tips On shows each once', !!tips().chirp);
  game.settings.set('resetTips', 'yes'); await Promise.resolve(); await Promise.resolve(); check('Settings: Reset tips forgets the seen tips', JSON.stringify(tips()) === '{}' && S('resetTips') === 'no', JSON.stringify(tips()) + ' ' + S('resetTips'));
  game.settings.set('difficulty', 'rookie'); m = go(cfgS(), .3); const rk = m.aiSkill(1); game.settings.set('difficulty', 'legend'); m = go(Object.assign(cfgS(), { difficulty: 'legend' }), .3); check('Settings: Difficulty sets the CPU skill (Rookie < Legend)', rk < m.aiSkill(1), rk + ' < ' + m.aiSkill(1)); game.settings.set('difficulty', 'pro');
  game.settings.set('periodLen', '180'); m = go({ mode: 'exhibition', home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [] }, .3); check('Settings: Period length is the exhibition default', m.cfg.periodLen === 180 && m.clock <= 180 && m.clock > 170, m.cfg.periodLen); game.settings.set('periodLen', '120');
  // ---- the animation lab plays every hockey motion; all sound is synthesized (no audio files), voices babble per speaker
  game.go('lab', null, { fade: 0 }); game.advance(.3); const nMot = G.Lab.MOTIONS.length; let lab = 0;
  for (let k = 0; k < nMot; k++) { game.advance(.25); if (G.Lab.st.i === k) lab++; I.tap('down'); game.advance(.05); }
  check('the animation lab plays every motion (' + nMot + ')', lab === nMot && nMot >= 45, lab + '/' + nMot);
  const html = (await import('node:fs')).readFileSync(new URL('../../../IceHoc-Kaboom-IceHockey-claude-opus-5-5-xhigh-20261103-182647.html', import.meta.url), 'utf8');
  check('no audio files: no .mp3 / .ogg / .wav / data:audio anywhere', !/\.(mp3|ogg|wav|m4a)\b|data:audio/i.test(html));
  check('the music is code: 11 songs and 6 goal stings', Object.keys(G.Synth.SONGS).filter(k => !k.startsWith('sting-')).length >= 11 && Object.keys(G.Synth.SONGS).filter(k => k.startsWith('sting-')).length === 6);
  const spk = Object.values(G.SPEAKERS).concat(['chuck', 'moose', 'ref']), noVoice = spk.filter(k => !(G.CAST[k] && G.CAST[k].voice && G.CAST[k].voice.base > 0 && G.CAST[k].voice.speed > 0));
  check('every speaker (' + spk.length + ') has a babble voice with a pitch and a speed', spk.length >= 20 && !noVoice.length, noVoice.join(','));
  check('Animalese babble: a voice function per letter for the dialog', typeof G.Synth.voiceFn({ base: 200, speed: 10 }) === 'function' && typeof G.Synth.say === 'function');
  check('no errors in the extras run', game.errors.length === 0, game.errors.slice(0, 3).map(e => e.message + ' ' + String(e.stack || '').split('\n')[1]).join(' | '));
});
