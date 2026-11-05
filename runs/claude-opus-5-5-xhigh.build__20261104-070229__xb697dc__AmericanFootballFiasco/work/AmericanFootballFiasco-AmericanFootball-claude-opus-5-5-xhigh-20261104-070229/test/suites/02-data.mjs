import { load } from '../lib/context.mjs';
export default async ok => {
  const { FF, E } = load({ only: s => !/\/(5\d|70|80|90)-/.test(s) });
  const hex = c => /^#[0-9a-f]{6}$/i.test(c);
  for (const t of Object.values(FF.data.teams)) {
    const nums = t.players.map(p => p.num);
    ok(t.id + ': 15 players, unique numbers', t.players.length === 15 && new Set(nums).size === 15, nums.join(','));
    ok(t.id + ': ratings 1-10', t.players.every(p => Object.values(p.r).every(v => v >= 1 && v <= 10)));
    ok(t.id + ': hex colors', Object.values(t.colors).filter(v => typeof v === 'string').every(hex), JSON.stringify(t.colors));
    ok(t.id + ': a 12x12 logo with its palette', t.logo.rows.length === 12 && t.logo.rows.every(r => r.length === 12 && [...r].every(ch => ch === '.' || t.logo.pal[ch])), t.logo.rows.map(r => r.length).join(','));
    ok(t.id + ': a coach, a mascot, a chant', !!t.coach && !!t.mascot && t.chant.length > 0);
  }
  const P = FF.data.plays, F = FF.data.formations;
  for (const p of Object.values(P)) {
    if (p.formation) ok(p.id + ': formation exists', !!F[p.formation], p.formation);
    if (p.side === 'off' && p.assign && p.formation) for (const sl in p.assign) ok(p.id + ': ' + sl + ' is in the formation', !!F[p.formation][sl] || (p.formation === 'punt' && sl === 'K'), sl);
    if (p.qb && p.qb.reads) ok(p.id + ': reads point at receivers', p.qb.reads.every(r => ['WR1', 'WR2', 'RB'].includes(r)), p.qb.reads);
    const pts = []; for (const a of Object.values(p.assign || {})) for (const k of ['route', 'carry', 'pull', 'fake']) if (a[k]) pts.push(...a[k]);
    ok(p.id + ': coordinates in range', pts.every(([x, y]) => Math.abs(x) <= 45 && Math.abs(y) <= 26), JSON.stringify(pts));
  }
  ok('every off formation has 3 linemen on the line', ['pro', 'shotgun', 'tight', 'spread'].every(f => ['C', 'LG', 'RG'].every(s => F[f][s] && F[f][s][0] > -1.5)));
  for (const s of Object.values(FF.data.stadiums)) {
    ok(s.id + ': its song exists', !!FF.SONGS[s.music], s.music);
    for (const [id] of s.props) ok(s.id + ': prop ' + id + ' exists', !!E.SHAPES[id] || ['cactus', 'bench', 'lamp', 'lantern', 'crate', 'pine', 'firedrum', 'crystal', 'table', 'banner'].includes(id) || id.startsWith('fiasco-store:'), id);
  }
  ok('8 cards with text, art, a trigger and an effect', FF.data.cardList.length === 8 && Object.values(FF.data.cards).every(c => c.text && c.art && typeof c.cpu === 'function' && typeof c.apply === 'function'));
  const story = FF.data.story;
  for (const c of story.chapters) for (const k of ['intro', 'win', 'halftime', 'loss']) if (c[k]) ok(c.id + ': cutscene ' + c[k] + ' exists', !!story.cutscenes[c[k]], c[k]);
  for (const [id, cs] of Object.entries(story.cutscenes)) for (const s of cs.steps) if (s[0] === 'say') ok(id + ': speaker ' + s[1] + ' exists', !!FF.data.speakers[s[1]], s[1]);
  ok('9 drills', FF.data.drills.length === 9);
  const L = FF.data.lines;
  const all = []; for (const who of ['chet', 'lou']) for (const [k, v] of Object.entries(L[who])) { if (Array.isArray(v)) all.push(...v.map(l => [who, k, l])); else for (const [kk, vv] of Object.entries(v)) all.push(...vv.map(l => [who, k + '.' + kk, l])); }
  const long = all.filter(([, , l]) => l.length > 48); ok('commentary lines are at most 48 characters', !long.length, long.slice(0, 3).map(x => x[2]).join(' | '));
  const vars = all.filter(([, , l]) => (l.match(/\{(\w+)\}/g) || []).some(v => !['{player}', '{team}', '{opp}', '{yards}', '{score}', '{mascot}'].includes(v))); ok('commentary variables are known', !vars.length, vars.slice(0, 3).map(x => x[2]).join(' | '));
  const main = ['kickoff', 'bigRun', 'td', 'bigHit', 'megaHit', 'sack', 'int', 'fumble', 'drop', 'lateHit', 'hotOn', 'final'];
  ok('8+ lines for the main events', main.every(k => L.chet[k] && L.chet[k].length >= 8), main.filter(k => !L.chet[k] || L.chet[k].length < 8).join(','));
  ok('16 attract segments', FF.data.attract.length === 16, FF.data.attract.length);
};
