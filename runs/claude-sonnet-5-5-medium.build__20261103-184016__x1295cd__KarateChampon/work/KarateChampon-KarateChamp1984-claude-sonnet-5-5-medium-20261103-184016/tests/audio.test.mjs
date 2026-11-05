import { fresh } from './lib/helpers.mjs';
export default async t => {
  const G = fresh(), { KC, game, E } = G;
  const warns = []; const cw = G.ctx.console.warn; G.ctx.console = Object.assign({}, G.ctx.console, { warn: (...a) => warns.push(a.join(' ')) });
  // every song parses (the engine's clock builds its tracks) and has notes
  for (const id in KC.SONGS) { const s = KC.SONGS[id]; const C = game.audio._clock(s, false, true, 0); t.check(`song ${id} parses with tracks`, !!C && C.tracks.length >= 1 && C.len >= 16, C && C.len); for (const tr of s.tracks) { const bad = String(tr.notes).replace(/\|/g, ' ').trim().split(/\s+/).filter(tok => !/^([A-G][b#]?\d|-|\.|[kshoct])$/.test(tok)); t.check(`song ${id} track ${tr.wave} uses only valid tokens`, bad.length === 0, bad.slice(0, 3).join()); } }
  for (const id in KC.STINGS) t.check(`sting ${id} parses`, !!game.audio._clock(KC.STINGS[id], false, false, 0));
  // every stage names a song or the shared bonus song; every sfx the game plays is defined
  KC.defineAudio(game.audio); const used = new Set(); const rx = /KC\.sfx\('(\w+)'/g; const src = (await import('node:fs')).readFileSync(new URL('../build/game.js', import.meta.url), 'utf8'); let m; while ((m = rx.exec(src))) used.add(m[1]); const rx2 = /audio\.sfx\('(\w+)'/g; while ((m = rx2.exec(src))) used.add(m[1]);
  for (const id of used) t.check(`sfx ${id} is defined`, !!game.audio.presets[id], id);
  for (const s of KC.STAGES) t.check(`stage ${s.id} music exists`, !!KC.SONGS[s.music]);
  // voices: deterministic plans per line, durations drive timings, calls have fixed shapes
  const V = KC.Voice, prof = KC.FIGHTER.taro.voice; const a = V.plan('I WILL BE CHAMP!', prof), b = V.plan('I WILL BE CHAMP!', prof), c = V.plan('THE SEA MADE ME QUICK.', prof);
  t.check('a line always gets the same syllable plan', JSON.stringify(a) === JSON.stringify(b)); t.check('different lines differ', JSON.stringify(a.sy) !== JSON.stringify(c.sy)); t.check('speak returns the duration headless', V.speak('OSU!', prof) > .1 && Math.abs(V.speak('OSU!', prof) - V.plan('OSU!', prof).dur) < 1e-9);
  t.check('faster speakers say the same line quicker', V.plan('WATCH. THEN DO.', { f0: 240, rate: 17 }).dur < V.plan('WATCH. THEN DO.', { f0: 85, rate: 9 }).dur);
  for (const id in KC.CALLS) { const sh = V.plan(KC.callText(id), KC.REF.voice, { syllables: 3, stress: 1, rate: 9 }); t.check(`call ${id} has a fixed syllable pattern`, sh.sy.length === 3 && sh.sy[1].stress && !sh.sy[0].stress); }
  t.check('the voice profiles of every fighter exist', KC.ROSTER.every(f => f.voice.f0 > 60 && f.voice.rate > 5));
  t.check('no engine warnings while parsing audio', warns.length === 0, warns.slice(0, 2).join(' | '));
};
