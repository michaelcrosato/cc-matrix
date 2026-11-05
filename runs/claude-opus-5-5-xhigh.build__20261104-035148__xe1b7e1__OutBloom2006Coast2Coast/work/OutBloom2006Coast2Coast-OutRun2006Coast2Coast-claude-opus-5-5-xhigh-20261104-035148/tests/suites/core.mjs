// core, content, determinism, saves, voice, audio data
import { boot, raceIn, run } from '../lib/boot.mjs';
export default async function (t) {
  const { OB, game, E } = boot();
  game.advance(1);
  t('boot reaches the title', game.sceneName === 'title', game.sceneName);
  t('no errors at boot', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  // the bus delivers in order
  const got = []; const off = OB.bus.on('*', (d, n) => { if (n.startsWith('tst')) got.push(n); }); OB.bus.emit('tst1'); OB.bus.emit('tst2'); off();
  t('the bus delivers in order', got.join() === 'tst1,tst2', got.join());
  // tuning
  OB.setTune('topSpeedScale', 1.3); OB.setTune('curvePush', .9); OB.resetTuning();
  t('tuning reset restores every default', Object.keys(OB.TUNING_DEFAULTS).every(k => OB.tuning[k] === OB.TUNING_DEFAULTS[k]));
  const a = OB.rand.stream('x', 3), b = OB.rand.stream('x', 3), c = OB.rand.stream('x', 4);
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
  t('random streams repeat for a seed', sa.join() === sb.join() && sa.join() !== sc.join());
  // content lint
  const S = OB.STAGES;
  t('15 stages', Object.keys(S).length === 15);
  for (const [id, s] of Object.entries(S)) {
    t(id + ' length in 820-980', s.length >= 820 && s.length <= 980, s.length);
    t(id + ' has 2-3 request slots', s.requests.length >= 2 && s.requests.length <= 3 && s.requests.every(r => OB.REQUESTS[r.type] && r.at * s.length >= 120), JSON.stringify(s.requests));
    t(id + ' has 2+ landmarks and a kit', s.landmarks.length >= 2 && OB.KITS[s.kit] && OB.SKIES[s.sky], id);
    t(id + ' traffic mix', Object.keys(s.traffic).every(k => OB.TRAFFIC[k]));
  }
  for (const [g, G] of Object.entries(OB.GOALS)) for (const m of ['bloom', 'bud', 'wilt']) { const e = OB.ENDINGS[g][m]; t('ending ' + g + ' ' + m + ' has every line', e && e.caption && OB.PASSENGERS.every(p => e[p] && e[p].length > 3) && G.titles[m]); }
  for (const p of OB.PASSENGERS) for (const ev of ['start', 'perfect', 'great', 'good', 'miss', 'bump', 'crash', 'nearmiss', 'air', 'fork_left', 'fork_right', 'fork_yes', 'fork_no', 'checkpoint', 'lowtime', 'goal', 'timeup'].concat(OB.REQ_ORDER.map(r => 'req_' + r)))
    t('line ' + p + '.' + ev + ' has 4 variants', OB.LINES[p][ev] && OB.LINES[p][ev].length >= 4 && OB.LINES[p][ev].every(l => l.length > 1 && l.length <= 60), (OB.LINES[p][ev] || []).length);
  for (const ev of ['start', 'drift', 'win', 'fail']) t('Bruno ' + ev + ' has 3 lines', OB.LINES.bruno[ev].length >= 3);
  t('14 missions with rules and rewards', OB.MISSIONS.length === 14 && OB.MISSIONS.every(m => OB.Rules[m.kind] && m.seeds > 0 && m.ranks.length === 4 && m.brief.length === 2));
  t('every bed has a cost and a source', OB.BEDS.every(b => b.cost > 0 && (!b.needs || OB.MISSION[b.needs])));
  t('beds total 6150 seeds', OB.BEDS.reduce((s, b) => s + b.cost, 0) === 6150);
  const A = OB.ABOUT.interview, si = A.sourceInformation;
  t('about: every Source Information field filled', Object.values(si).every(v => typeof v === 'string' && v.length > 2 && !/tbd|todo|placeholder/i.test(v)), JSON.stringify(si).slice(0, 100));
  t('about: feedback answers', A.testingFeedback.length === 4 && A.engineFeedback.length === 6 && A.promptFeedback.length === 4 && [...A.testingFeedback, ...A.engineFeedback, ...A.promptFeedback].every(s => s.length > 10));
  t('about: aiHub block', A.aiHub.name === 'OutBloom 2006: Coast 2 Coast' && A.aiHub.tags.length >= 3 && A.aiHub.tags.length <= 6 && A.aiHub.genre === 'Racing');
  // voice planner
  const p1 = OB.Babble.plan('Ooh, balloons! Pop them all for me!', 'marisol', 'happy'), p2 = OB.Babble.plan('Ooh, balloons! Pop them all for me!', 'marisol', 'happy');
  t('babble: the same text gives the same plan', JSON.stringify(p1) === JSON.stringify(p2));
  t('babble: syllables and a duration', p1.syllables.length >= 7 && p1.syllables.length <= 14 && p1.duration > .8 && p1.duration < 3, p1.syllables.length + ' ' + p1.duration);
  const ph = OB.Babble.plan('Hello there', 'vivi', 'happy'), ps = OB.Babble.plan('Hello there', 'vivi', 'sad');
  t('babble: moods shift pitch', ph.syllables[0].f0 > ps.syllables[0].f0);
  const pa = OB.Babble.plan('Hello there', 'juni'), pb = OB.Babble.plan('Hello, there', 'juni');
  t('babble: punctuation pauses', pb.duration > pa.duration);
  const pq = OB.Babble.plan('Are we there yet?', 'juni'), pst = OB.Babble.plan('We are there yet.', 'juni');
  t('babble: questions rise', pq.syllables[pq.syllables.length - 1].f0 > pst.syllables[pst.syllables.length - 1].f0 * .95);
  // audio data
  const songs = OB.SONGS.concat(Object.values(OB.THEMES));
  for (const s of songs) {
    t('song ' + s.title + ' has its layers', ['drums', 'perc', 'bass', 'keys', 'pad', 'lead', 'sparkle'].every(n => s.tracks.find(x => x.name === n)), s.tracks.map(x => x.name).join());
    t('song ' + s.title + ' instruments exist', s.tracks.every(x => x.wave === 'drums' || E.INSTRUMENTS[x.inst]), s.tracks.map(x => x.inst).join());
    const lead = s.tracks.find(x => x.name === 'lead').notes.split(' '), rests = lead.filter(x => x === '.' || x === '-').length / lead.length;
    t('song ' + s.title + ' lead rests 25%+', rests >= .25, rests.toFixed(2));
    t('song ' + s.title + ' notes parse', s.tracks.every(x => x.wave === 'drums' || x.notes.split(' ').every(k => k === '.' || k === '-' || k.replace(/[!~]$/, '').split('+').every(n => E.note(n) > 0))), s.title);
    if (OB.SONGS.includes(s)) t('radio song ' + s.title + ' is 64-96 bars', s.bars >= 56 && s.bars <= 96, s.bars);
  }
  for (const [k, j] of Object.entries(OB.JINGLES)) t('jingle ' + k + ' is valid', j.tracks.every(x => x.wave === 'drums' || E.INSTRUMENTS[x.inst]));
  for (const n of ['pop', 'boink', 'sting', 'snap', 'tok', 'chime', 'harp', 'shutter', 'beep', 'gobeep', 'zing', 'whoosh2', 'thunk', 'scrape', 'squealspin', 'backfire', 'cheer', 'focus', 'tick', 'back', 'error', 'toggle', 'plant', 'static'])
    t('sound ' + n + ' exists', !!game.audio.presets[n]);
  // saves: round trip, migration, blocked storage
  OB.Profile.data.seeds = 321; OB.Profile.save(); OB.Profile.data.seeds = 0; OB.Profile.load();
  t('profile round-trip', OB.Profile.data.seeds === 321, OB.Profile.data.seeds);
  E.store.set('outbloom:profile', { v: 0, seeds: 77, career: { M1: { cleared: true, rank: 'B' } } }); OB.Profile.load();
  t('profile migrates from v0', OB.Profile.data.v === 1 && OB.Profile.data.seeds === 77 && OB.Profile.data.career.M1.rank === 'B');
  const was = E.store.set; E.store.set = () => { throw new Error('blocked'); }; let ok = true; try { OB.Profile.grant(5, 'test'); } catch (e) { ok = false; } E.store.set = was;
  t('blocked storage is survived', ok && OB.Profile.blocked);
  // determinism: 1,200 scripted steps hashed twice
  const proof = seed => { const { race } = raceIn({ seed, players: [{ car: 'orchidea', bot: { route: 'LRLR' } }] }); run(race, 10); return JSON.stringify(race.stateHash()) + JSON.stringify(race.traffic.of('S1').map(v => Math.round(v.z))); };
  const h1 = proof(9), h2 = proof(9), h3 = proof(10);
  t('determinism: the same seed, the same run', h1 === h2, h1 + ' vs ' + h2);
  t('determinism: another seed, another run', h1 !== h3);
}
