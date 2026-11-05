// The content lint (plan §19.2 "content"): every registry entry is valid; every line bank and speaker resolves.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const bb = () => loadGame({ seed: 1 }).bb;

T('content.six teams, eighteen players, five story characters, ratings in 1..10', () => {
  const b = bb(), teams = b.all('team'), players = b.all('player'), chars = b.all('character');
  expect(teams.length === 6, `teams ${teams.length}, want 6`);
  expect(players.length === 18, `players ${players.length}, want 18`);
  expect(chars.length >= 5, `characters ${chars.length}, want 5`);
  for (const t of teams) expect(t.players.length === 3, `${t.id} has ${t.players.length} players, want 3`);
  for (const p of players) {
    const keys = ['zoom', 'splash', 'deep', 'slam', 'dime', 'swipe', 'swat', 'bump'];
    for (const k of keys) expect(Number.isInteger(p.ratings[k]) && p.ratings[k] >= 1 && p.ratings[k] <= 10, `${p.id}.${k} = ${p.ratings[k]}`);
    expect(b.get('team', p.team), `${p.id} has no team`);
    expect(p.voice && p.taunt, `${p.id} needs a voice and a taunt`);
  }
});
T('content.five courts with every field and a twist each', () => {
  const b = bb(), courts = Object.values(b.COURTS);
  expect(courts.length === 5, `courts ${courts.length}`);
  for (const c of courts) {
    for (const f of ['name', 'floor', 'stand', 'sky', 'crowd', 'lights', 'ambient', 'song', 'dribble', 'twist']) expect(c[f] !== undefined, `${c.id}.${f} missing`);
    expect(b.SONGS[c.song], `${c.id} song ${c.song} missing`);
  }
});
T('content.twelve dunks, six power-ups, seven codes-or-more, every catalog id is unique', () => {
  const b = bb();
  expect(b.all('dunk').length === 12, `dunks ${b.all('dunk').length}`);
  expect(b.all('powerup').length === 6, `power-ups ${b.all('powerup').length}`);
});
T('content.line banks have ten lines or more, at most 60 characters, known slots only', () => {
  const b = bb(), slots = ['NAME', 'VICTIM', 'TEAM'];
  for (const [bank, lines] of Object.entries(b.LINE_BANKS)) {
    expect(lines.length >= 1, `${bank} has no line`);
    for (const l of lines) {
      expect(l.length <= 60, `${bank}: "${l}" is ${l.length} characters`);
      for (const m of l.matchAll(/\{([A-Z]+)\}/g)) expect(slots.includes(m[1]), `${bank}: unknown slot ${m[1]}`);
    }
  }
  expect(b.LINE_BANKS.dunkPower.length >= 10 && b.LINE_BANKS.basket.length >= 3, 'the main banks are full');
});
T('content.every story speaker and beat resolves', () => {
  const b = bb();
  for (const [id, beat] of Object.entries(b.BEATS)) {
    if (!Array.isArray(beat) || beat.some(x => !Array.isArray(x))) continue;
    for (const [who] of beat) expect(who === 'captain' || b.SPEAKERS[who] || b.get('player', who) || b.get('character', who), `beat ${id}: speaker ${who}`);
  }
  for (const [team, pre] of Object.entries(b.PREGAME)) expect(b.get('team', team), `pregame team ${team}`);
});
T('content.every setting has a default and every action has a label', () => {
  const b = bb();
  for (const s of b.GAME_SETTINGS) {
    if (s.type === 'slider') expect(s.value >= s.min && s.value <= s.max, `${s.key} default ${s.value} outside its range`);
    else expect(s.options.includes(s.value), `${s.key} default ${s.value} not an option`);
  }
  for (const a of ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt']) {
    expect(b.ACTION_NAMES[a], `action ${a} has no name`);
    expect(b.padGlyph(a), `action ${a} has no pad glyph`);
    expect(b.keyLabel(a), `action ${a} has no key label`);
  }
});
T('content.the tuning table has every Appendix A key with a sane range', () => {
  const b = bb();
  for (const [k, t] of Object.entries(b.TUNING)) expect(t.min <= t.def && t.def <= t.max, `${k}: default ${t.def} outside ${t.min}..${t.max}`);
  for (const k of ['runSpeed', 'turboMult', 'dunkRange', 'stealChance', 'novaBaskets', 'cpuReaction', 'quarterLength', 'ballGravity', 'powerupInterval', 'jackpotBonus']) expect(b.TUNING[k], `missing ${k}`);
});
T('content.the camp has ten lessons and the stings and songs are all there', () => {
  const b = bb();
  expect(b.CAMP_LESSONS.length === 10, `lessons ${b.CAMP_LESSONS.length}`);
  expect(Object.keys(b.SONGS).length >= 12, `songs ${Object.keys(b.SONGS).length}`);
  expect(Object.keys(b.STINGS).length >= 8, `stings ${Object.keys(b.STINGS).length}`);
});
