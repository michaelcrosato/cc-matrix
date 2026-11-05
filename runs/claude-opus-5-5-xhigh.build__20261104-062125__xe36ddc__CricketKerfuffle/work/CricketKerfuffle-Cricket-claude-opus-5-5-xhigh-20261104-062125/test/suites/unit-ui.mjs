import { load, takeWarnings } from '../lib.mjs';
import { readFileSync } from 'node:fs';
export async function run(check) {
  const { K, I, game } = load();
  for (const [w, h] of [[320, 240], [427, 240], [640, 270], [320, 690]]) { const L = K.HUD.layout(w, h, null), bad = K.HUD.overlaps(L, null); check('the HUD fits ' + w + 'x' + h + ' without overlaps', !bad.length, bad); const out = Object.entries(L).filter(([k, r]) => r[0] < 0 || r[1] < 0 || r[0] + r[2] > w || r[1] + r[3] > h); check('the HUD stays on a ' + w + 'x' + h + ' screen', !out.length, out); }
  const corner = { x0: 427 - 60, y0: 0, x1: 427, y1: 30 }; check('the HUD keeps clear of the corner area', !K.HUD.overlaps(K.HUD.layout(427, 240, corner), corner).length, K.HUD.overlaps(K.HUD.layout(427, 240, corner), corner));
  const G = K.Glyphs;
  check('a keyboard prompt shows a keycap (shot: J)', G.info(I, 'shot', 'keyboard').kind === 'key' && G.info(I, 'shot', 'keyboard').label === 'J', G.info(I, 'shot', 'keyboard'));
  check('a pad prompt shows a PlayStation cross by default', G.info(I, 'shot', 'gamepad').kind === 'ps' && G.info(I, 'shot', 'gamepad').n === 0, G.info(I, 'shot', 'gamepad'));
  game.settings.set('glyphs', 'xbox'); check('with Xbox symbols the shot prompt is an A disc', G.info(I, 'shot', 'gamepad').kind === 'xbox' && G.info(I, 'shot', 'gamepad').label === 'A', G.info(I, 'shot', 'gamepad'));
  game.settings.set('glyphs', 'playstation');
  check('a mouse prompt shows the left button for the shot', G.info(I, 'shot', 'mouse').kind === 'mouse' && G.info(I, 'shot', 'mouse').n === 0);
  check('run has no mouse button: the mouse prompt falls back to its keycap (Space)', G.info(I, 'run', 'mouse').kind === 'key' && /space/i.test(G.info(I, 'run', 'mouse').label), G.info(I, 'run', 'mouse'));
  // every commentary line fits 2 x 42 characters after filling with the longest names
  const longest = { batter: 'THRUMPTONATOR', bowler: 'THRUMPTONATOR', team: "Thrumpton's Thunderbolts", opp: 'Lower Muddleford Mutineers', ground: 'The Thrumpton Megadome', need: 99, balls: 30, target: 199, kmh: 170, item: 'Lucky Horseshoe', winner: "Thrumpton's Thunderbolts", fielder: 'st john-smythe' };
  const long = []; for (const [tag, pool] of Object.entries(K.LINES)) for (const [, t] of pool) { const s = K.util.fill(t, longest); if (s.length > 84) long.push(tag + ': ' + s.length); }
  check('no commentary line runs past 2 x 42 characters', !long.length, long.slice(0, 6));
  const slines = []; for (const [id, S] of Object.entries(K.SCENES)) for (const [, t] of S.lines) { const s = t.replace(/\{[^}]*\}/g, ''); if (s.length > 96) slines.push(id + ': ' + s.length); }
  check('no story line runs past the dialog box (96 characters)', !slines.length, slines);
  const events = ['dot', 'beaten', 'single', 'four', 'six', 'bowled', 'caught', 'dropped', 'lbw', 'runout', 'wide', 'noball', 'fire', 'special', 'review', 'filler'];
  const thin = events.filter(e => (K.LINES[e] || []).length < 3); check('every main event has at least 3 lines', !thin.length, thin);
  // every song a match can play has the Hype (drums) and ON FIRE (fire) layers, and the engine takes both on each
  const matchSongs = [...new Set([...Object.values(K.GROUNDS).map(g => g.music || 'green'), 'attract', 'showdown'])], noLayer = [];
  for (const id of matchSongs) { const S = K.SONGS[id]; for (const l of ['drums', 'fire']) if (!S || !S.tracks.some(t => t.name === l)) noLayer.push(id + ' lacks ' + l); }
  check('every song a match plays (' + matchSongs.join(', ') + ') has the drums and fire layers', !noLayer.length, noLayer);
  takeWarnings(/./); for (const id of matchSongs) { K.Audio.music(id, { restart: true }); game.audio.layer('drums', 1); game.audio.layer('fire', 1); game.audio.layer('fire', 0); }
  K.Audio.music('title', { restart: true }); K.Audio.layer('fire', 0); K.Audio.layer('drums', 0);   // the title song has no fire layer: left alone, no warning
  const layerWarns = takeWarnings(/audio\.layer/);
  check('the engine takes the layers on every match song and the title song ignores a stray fire-off (no warnings)', !layerWarns.length, layerWarns);
  const html = readFileSync(new URL('../../tools/build.mjs', import.meta.url), 'utf8'), goal = (html.match(/'hub:session-goal': '([^']*)'/) || [])[1] || '', howto = (html.match(/'hub:session-howto': '([^']*)'/) || [])[1] || '';
  check('the hub goal is 60 characters or fewer', goal.length > 0 && goal.length <= 60, goal.length); check('the hub howto is 80 characters or fewer', howto.length > 0 && howto.length <= 80, howto.length);
}
