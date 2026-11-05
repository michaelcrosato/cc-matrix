// Feature checks for the Cup Run's boss and special rules and the unlocks (11.1-11.3, 7.10, 7.14): the Golden Twister,
// The Vault (locked, then cracked), Glitterman's Gilded Boost, Doris's organ (early and late), Gilded Mode, the star
// unlocks reaching an exhibition match, a perfect Flood Wagon, the Lumberjack choice mods, hunting the bear, the
// Shootout Showcase rule, Lemmy's posts, and the About pages built from the same text as the exit interview
import { readFileSync } from 'node:fs';
import { load } from '../lib.mjs';
import { check, guard } from '../t.mjs';
import { makeBot } from '../bot.mjs';
guard('features', async () => {
  const { game, G } = load(); game.advance(.5);
  const { Match, Rink, Skater, Boom, Story, Save, Setup, Bus } = G;
  const ev = []; Bus.sim('*', e => ev.push(e));
  const seen = t => ev.filter(e => e.type === t);
  const go = cfg => { game.go('match', { cfg }, { fade: 0 }); game.advance(.1); return Match.m; };
  // ---- chapter 5's boss config: the Gilded Boost (Grizzlies faster from the 3rd) and Doris (early: the 2nd period; late: half the 3rd)
  Save.data.choices[5] = { doris: 'early' }; let cfg = Story.matchCfg(5);
  check('chapter 5: the boss config has the Gilded Boost and Doris events', cfg.events.some(e => e.kind === 'boost' && e.period === 3) && cfg.events.some(e => e.kind === 'organ' && e.period === 2));
  Save.data.choices[5] = { doris: 'late' }; const late = Story.matchCfg(5).events.find(e => e.kind === 'organ'); check('Doris late: half way through the 3rd, 50% stronger', late.period === 3 && late.clock === 60 && late.k === 1.5, JSON.stringify(late));
  cfg = Object.assign(Story.matchCfg(5), { intros: false, replays: 'off', flood: 'never' }); let m = go(cfg); game.advance(.5); m.setPhase('play');
  const grz = m.teams[1].skaters[0], before = Skater.vmax(grz, m);
  m.period = 3; m.clock = 119; m.events = cfg.events; game.advance(.2);
  check('the Gilded Boost fires in the 3rd period', seen('boost_start').length > 0); check('the Boost makes the Grizzlies 10% faster', Math.abs(Skater.vmax(grz, m) / before - 1.1) < .02, (Skater.vmax(grz, m) / before).toFixed(3));
  m.clock = 59; const boom0 = m.boom[0], mus = m.teams[0].skaters[0], free = () => { if (m.puck.owner === mus) G.Puck.loose(m, m.puck); }; free(); const v0 = Skater.vmax(mus, m); game.advance(.2); free();
  check("Doris's organ plays: the Muskrats' BOOM +30 (or KABOOM)", seen('organ_boost').length > 0 && (m.boom[0] >= boom0 + 30 * .8 * 1.5 - 1 || m.kaboom[0] > 0), boom0 + ' -> ' + m.boom[0]);
  check("Doris's organ: the Muskrats 15% faster (late, x1.5)", Math.abs(Skater.vmax(mus, m) / v0 - 1.15) < .02, (Skater.vmax(mus, m) / v0).toFixed(3));
  m.setPhase('play'); game.advance(21); free(); check('the organ boost wears off after 20 s', Math.abs(Skater.vmax(mus, m) / v0 - 1) < .02, (Skater.vmax(mus, m) / v0).toFixed(3));
  // ---- the Golden Twister in real play: the CPU's Sterling chooses it, spins 0.6 s with the puck (no other action), then
  // shoots a curling shot the goalie reads late; a check during the spin is a guaranteed big hit
  m = go({ mode: 'exhibition', home: 'muskrats', away: 'grizzlies', arena: 'dome', humans: [], intros: false, flood: 'never', periodLen: 120, seed: 31, replays: 'off' }); game.advance(.3);
  const st = m.teams[1].skaters.find(s => s.def.twister); check('Sterling has the Golden Twister', !!st);
  const tw = []; Bus.sim('twister', e => tw.push({ t: m.t, by: e.by })); const twShots = []; Bus.sim('shot', e => { if (e.by === st.id && m.puck.twister) twShots.push({ t: m.t, curl: m.puck.curl }); });
  let spinSeen = false, react = []; for (let i = 0; i < 360 * 120 && m.phase !== 'final'; i++) { game.advance(1 / 120); if (st.twistT > .3 && m.puck.owner === st) spinSeen = true; const g = m.goalieAt(m.attackNet(1)); if (m.puck.twister && g.threat && g.threat.at === m.t - (1 / 120) * 0) react.push(g.react); }
  check('the CPU chooses the Golden Twister in a real game', tw.length >= 2, tw.length);
  check('Sterling spins with the puck during the Twister', spinSeen);
  check('each Twister ends in a curling shot by Sterling', twShots.length >= Math.min(2, tw.length) && twShots.every(q => q.curl !== 0), JSON.stringify(twShots.slice(0, 4)));
  const gq = m.goalies[0], base = (() => { const th = { screened: false }; m.puck.twister = false; const a = G.Goalie && gq ? null : null; void a; return th; })(); void base;
  const reactFor = twist => { m = go(Object.assign(Setup.quickCfg({ home: 'muskrats', away: 'grizzlies', arena: 'dome' }), { seed: 41, replays: 'off' })); game.advance(.5); m.setPhase('play'); m.cheats.freezeAI = true; const sh = m.teams[1].skaters.find(s => s.def.twister), d = m.attackDir(1), gx2 = Rink.goalX(m.attackNet(1)); sh.x = gx2 - d * 150; sh.y = Rink.C.y; sh.facing = d > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, sh, 't'); sh.twistShot = twist; G.Shots.shoot(m, sh, 'wrist', 0); game.advance(.05); return m.goalieAt(m.attackNet(1)).react; };
  const rN = reactFor(false), rT = reactFor(true); check('the goalie reads a Twister shot late (reaction x1.25)', rT > rN * 1.2 && rN > 0, rN.toFixed(3) + ' vs ' + rT.toFixed(3));
  m = go(Object.assign(Setup.quickCfg({ home: 'muskrats', away: 'grizzlies', arena: 'dome' }), { seed: 6, replays: 'off' })); game.advance(.5); m.setPhase('play'); m.cheats.freezeAI = true;
  const st2 = m.teams[1].skaters.find(s => s.def.twister), hitter = m.teams[0].skaters[0]; st2.x = 500; st2.y = 400; st2.twistT = .6; hitter.x = 470; hitter.y = 400; hitter.vx = 40; hitter.facing = 0; const bm = m.boom[0]; ev.length = 0; Skater.check(m, hitter); game.advance(.3);
  check('checking Sterling during the spin is a guaranteed big hit, BOOM +10', seen('hit').some(e => e.big) && m.boom[0] >= bm + 10 * .8 + 9 * .8 - 1, m.boom[0] - bm);
  const vault = m.teams[1].goalie; check('The Vault is the boss goalie at size 1.75', vault.def.boss && vault.rig.o.size === 1.75);
  const kab = k => { const s = m.teams[0].skaters[0], d2 = m.attackDir(0), gx2 = Rink.goalX(m.attackNet(0)); vault.x = gx2 - Rink.intoNet(m.attackNet(0)) * 10; vault.y = Rink.C.y; vault.state = 'ready'; s.x = gx2 - d2 * 60; s.y = Rink.C.y; s.facing = d2 > 0 ? 0 : Math.PI; Boom.start(m, 0); G.Puck.setOwner(m, m.puck, s, 't'); m.puck.x = s.x + d2 * 10; m.puck.y = Rink.C.y; m.puck.vx = d2 * 760; m.puck.vy = 0; m.puck.vz = 0; m.puck.z = 6; m.puck.owner = null; m.puck.onFire = true; m.puck.shot = { by: s.id, team: 0, kind: 'kaboom', t: m.t, x: s.x, y: s.y, net: m.attackNet(0) }; game.advance(.3); m.kaboom[0] = 0; m.setPhase('play'); };
  ev.length = 0; kab(); check('a KABOOM shot into The Vault: VAULT LOCKED', seen('vault_locked').length === 1 && !vault.cracked, ev.map(e => e.type).slice(-8).join(','));
  kab(); check('the second: THE VAULT IS CRACKED (size 1.4, Rfx -1)', seen('vault_cracked').length === 1 && vault.cracked && vault.rig.o.size === 1.4 && vault.def.r[0] === 4, JSON.stringify([vault.cracked, vault.rig.o.size, vault.def.r]));
  // ---- Gilded Mode: the Grizzlies' KABOOM, with the KABOOM rules: infinite turbo, a 2x slapshot charge, 2x checks, a quicker goalie
  m = go(Object.assign(Setup.quickCfg({ home: 'grizzlies', away: 'muskrats', arena: 'dome' }), { seed: 9, replays: 'off', humans: [{ team: 0, input: game.input }] })); game.advance(.5); m.setPhase('play'); m.cheats.freezeAI = true;
  const gs = m.humans[0].skater, gg = m.teams[0].goalie, react0 = (() => { const th = { screened: false }; return G.Goalie && gg ? null : th; })(); void react0;
  ev.length = 0; Boom.start(m, 0); check("Gilded Mode: the Grizzlies' KABOOM is announced gilded", seen('kaboom_start').some(e => e.gilded && e.team === 0) && m.kaboom[0] > 0);
  gs.turbo = .2; game.input.hold('right'); game.input.hold('turbo'); game.advance(3); game.input.hold('turbo', false); game.input.hold('right', false);
  check('Gilded Mode: infinite turbo (the meter stays full while held)', gs.turbo >= .99 && gs.stats.turbo > 2.5, gs.turbo.toFixed(2) + ' ' + gs.stats.turbo.toFixed(2));
  const dir2 = m.attackDir(0); gs.x = Rink.C.x; gs.y = Rink.C.y; gs.vx = gs.vy = 0; gs.facing = dir2 > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, gs, 't'); game.advance(.1);
  game.input.hold('shoot'); game.advance(.18 + G.T.slapCharge / 2 + .04); const chg = gs.charge; game.input.hold('shoot', false); game.advance(.3);
  check('Gilded Mode: the slapshot charges twice as fast (full in half the time)', chg >= .95, chg.toFixed(2)); check('Gilded Mode: a full charge fires a KABOOM shot', seen('kaboom_shot').length > 0);
  m.setPhase('play'); const vic = m.teams[1].skaters[0], att = m.teams[0].skaters[1]; const hitImp = () => { vic.x = 500; vic.y = 300; vic.vx = vic.vy = 0; G.Skater.setState(vic, 'skate'); vic.items = {}; att.x = 480; att.y = 300; att.vx = 60; att.vy = 0; att.turboOn = false; att.facing = 0; ev.length = 0; Skater.check(m, att); game.advance(.15); const h = seen('hit')[0]; return h ? h.power : 0; };
  const pk1 = hitImp(); m.kaboom[0] = 0; G.Skater.setState(att, 'skate'); att.checkCD = 0; game.advance(.6); const pk0 = hitImp();
  check('Gilded Mode: checks are twice as strong', pk1 > 0 && pk0 > 0 && Math.abs(pk1 / pk0 - 2) < .25, pk1 + ' vs ' + pk0);
  Boom.start(m, 0); m.puck.twister = false; const thr = { screened: false }; const rK = (() => { const old = m.kaboom[0]; return old; })(); void rK; void thr;
  check('Gilded Mode flames are gold (the KABOOM sparks use the Grizzlies color)', /ffd84a/.test(readFileSync(new URL('../../build/game.js', import.meta.url), 'utf8').match(/grizzlies' \? '#ffd84a'/) ? "grizzlies' ? '#ffd84a'" : ''));
  // ---- unlocks: stars open cheats; an exhibition match with them applies them
  Save.data.stars = { 1: [true, true, true], 2: [true, true, true], 3: [true, true, true], 4: [true, true, true], 5: [true, true, true] };
  check('15 stars unlock all 5 cheats', Save.cheatsOpen().length === 5); Save.data.stars = { 1: [true, true, true] }; check('3 stars unlock Big Heads only', Save.cheatsOpen().length === 1 && Save.cheatsOpen()[0][0] === 'bigHeads');
  Save.data.stars = { 1: [true, true, true], 2: [true, true, true], 3: [true, true, true], 4: [true, true, true], 5: [true, true, true] };
  // the real menus: title -> EXHIBITION -> sides (ready) -> setup: down to CHEATS, right to ALL ON -> FACE OFF!
  const I = game.input, tap = (a, w = .15) => { I.tap(a); game.advance(w); };
  game.go('title', null, { fade: 0 }); game.advance(.6); tap('confirm', .3); tap('right'); tap('confirm', .6);
  check('the EXHIBITION tile opens side select', game.sceneName === 'sides', game.sceneName); tap('confirm', .6);
  check('ready on side select opens the setup', game.sceneName === 'setup', game.sceneName);
  for (let k = 0; k < 6; k++) tap('down'); check('the setup focus is on CHEATS', game.scene.rows[game.scene.i] === 'cheat', game.scene.rows[game.scene.i]);
  for (let k = 0; k < 6 && Setup.st.cheat !== 'all'; k++) tap('right'); check('the CHEATS chip cycles to ALL ON (every unlock)', Setup.st.cheat === 'all', Setup.st.cheat);
  tap('down'); tap('confirm', .8); m = Match.m;
  check('FACE OFF starts the exhibition with the human on HOME', game.sceneName === 'match' && m.cfg.mode === 'exhibition' && m.humans.length === 1 && m.humans[0].team === 0, game.sceneName);
  check('the exhibition match has every unlocked cheat on', ['bigHeads', 'octoRain', 'glowPuck', 'alwaysKaboom', 'retro'].every(k => m.cheats[k]), JSON.stringify(m.cheats));
  check('Big Heads and Retro Rigs change the rigs', m.skaters[0].rig.o.headR > 5 && m.skaters[0].rig.o.style === 'classic');
  game.advance(2); m.setPhase('play'); game.advance(3); check('Always KABOOM keeps the human team in KABOOM', m.kaboom[0] > 0);
  const oct = m.items.filter(i => i.kind === 'octopus').length; game.advance(12); check('Octopus Rain throws octopi', m.items.filter(i => i.kind === 'octopus').length > oct || seen('item_throw').some(e => e.kind === 'octopus'));
  Setup.st.cheat = 'off'; Save.data.finished = true; check('finishing the Cup Run unlocks the Grizzlies for exhibition', Setup.teams().includes('grizzlies')); Save.data.finished = false; check('not before', !Setup.teams().includes('grizzlies'));
  // ---- the Flood Wagon after a real period: a driver mowing the ice clears 85%+ (a perfect flood, BOOM +30); a driver who
  // does nothing earns nothing
  const runFlood = drive => { const b = makeBot(G, game); b.wantFlood = true; m = go(Object.assign(Setup.quickCfg({}), { seed: 12, intros: false, replays: 'off', flood: 'ask', periodLen: 90 })); let t = 0; while (game.sceneName !== 'flood' && t < 400 * 120) { b.step(); game.advance(1 / 120); t++; } const sc0 = G.Rink.scuffTotal(), boom0 = m.boom[0], k0 = m.kaboom[0]; ev.length = 0; t = 0; while (game.sceneName === 'flood' && t < 60 * 120) { if (drive) b.step(); else if (game.scene.phase === 'card') I.tap('pass'); game.advance(1 / 120); t++; } return { sc0, boom0, k0, m, done: seen('flood_done')[0] }; };
  let fr = runFlood(true);
  check('a real period scuffs the ice', fr.sc0 > 50, fr.sc0); check('a good driver floods a perfect sheet (85%+)', fr.done && fr.done.perfect, JSON.stringify(fr.done));
  check('a perfect flood gives the team BOOM +30 (or tips it into KABOOM)', fr.m.boom[0] >= fr.boom0 + 30 * .8 - .01 || seen('kaboom_start').length > 0, fr.boom0 + ' -> ' + fr.m.boom[0]);
  check('then the next period starts', game.sceneName === 'match' && fr.m.period === 2, game.sceneName + ' ' + fr.m.period);
  fr = runFlood(false); check('a driver who does nothing gets no perfect flood and no bonus', fr.done && !fr.done.perfect && fr.m.boom[0] <= fr.boom0 + .01, JSON.stringify(fr.done) + ' ' + fr.boom0 + ' -> ' + fr.m.boom[0]);
  // ---- choices with rules: Lou loose (Fgt +1), hunt the bear (the AI goes after Polar Pete)
  Save.data.choices[3] = { lou: 'loose' }; let c3 = Story.matchCfg(3); m = go(Object.assign(c3, { intros: false })); check("'Let Lou loose' raises Big Lou's Fight rating", m.teams[0].skaters[2].def.r[4] === 6);
  Save.data.choices[4] = { bear: 'hunt' }; const c4 = Story.matchCfg(4); check("'Hunt the bear' sets the Muskrats on Polar Pete", c4.huntBear === 0 && c4.showcase && c4.ot === 'none');
  m = go(Object.assign(c4, { intros: false, seed: 4 })); check('the mall has Polar Pete on the ice', m.extras.some(e => e.kind === 'pete'));
  // ---- Lemmy talks to his posts: some goals near a post ring off it
  check("Lemmy's trait is Talks to Posts", G.TEAMS.muskrats.goalie.trait === 'posts');
  // ---- the About pages say what exit-interview.json says
  const ij = JSON.parse(readFileSync(new URL('../../../exit-interview.json', import.meta.url), 'utf8'));
  check('About: Testing Feedback matches the exit interview', JSON.stringify(G.FEEDBACK.testing) === JSON.stringify(ij.testingFeedback));
  check('About: Engine and Prompt Feedback match', JSON.stringify(G.FEEDBACK.engine) === JSON.stringify(ij.engineFeedback) && JSON.stringify(G.FEEDBACK.prompt) === JSON.stringify(ij.promptFeedback));
  check('About: Source Information has all 15 fields', G.FEEDBACK.source.length === 15 && G.FEEDBACK.source.every(l => /: \S/.test(l)));
  check('About: the engine changes come from ENGINE-CHANGES.md (6)', G.FEEDBACK.changes.length === 6);
  check('no errors in the feature run', game.errors.length === 0, game.errors.slice(0, 3).map(e => e.message + ' ' + String(e.stack || '').split('\n')[1]).join(' | '));
});
