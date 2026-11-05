import { load, DEV } from '../lib/load.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export default function (t) {
  const { E, G } = load({});
  const ids = [...G.SUIT_IDS, ...G.ACC_IDS, ...G.GIFT_IDS];
  t.ok('unique item ids', new Set(ids).size === ids.length);
  t.ok('21 swimsuits, 10 accessories, 25 gifts', G.SUIT_IDS.length === 21 && G.ACC_IDS.length === 10 && G.GIFT_IDS.length === 25, [G.SUIT_IDS.length, G.ACC_IDS.length, G.GIFT_IDS.length].join());
  for (const g of G.GIFT_IDS) t.ok('a taste row for ' + g, (G.GIFT_TASTE_TABLE[g] || '').length === 6);
  for (const f of G.FIGHTERS) {
    const L = G.GIFT_IDS.map(g => G.giftTaste(f, g));
    t.ok(f + ': 2 loves, 3+ likes, 3+ dislikes', L.filter(x => x === 'love').length >= 2 && L.filter(x => x === 'like').length >= 3 && L.filter(x => x === 'dislike').length >= 3, ['love', 'like', 'dislike'].map(k => L.filter(x => x === k).length).join('/'));
  }
  for (const sh of Object.keys(G.SHOPS)) for (const e of G.shopStock(sh, 5)) t.ok('priced: ' + e.item.id, e.item.price > 0);
  const cuts = ['onepiece', 'racer', 'halter', 'sport2', 'tankini', 'rash', 'sarong'];
  for (const s of G.SUIT_IDS) t.ok('known cut and pattern: ' + s, cuts.includes(G.SUITS[s].cut) && !!E.Humanoid && G.SUITS[s].pattern);
  for (const loc of Object.keys(G.LOCS)) {
    const L = G.LOCS[loc]; if (!L.spots) continue; const map = loc === 'beach' ? G.courtMap || (G.courtMap = G.makeCourtMap()) : G.getLocMap(loc);
    for (const s of L.spots) { const c = map.toCell(s.x, s.y); t.ok(`${loc} spot ${s.kind} at ${s.x},${s.y} on the map`, c && c[0] >= 0 && c[1] >= 0 && (s.kind === 'swim' || map.walkable(c[0], c[1]))); }
  }
  for (const id of G.FIGHTERS) { const S = G.CAST[id].sched; t.ok('schedule weights: ' + id, S.length === 3 && S[0].length === 4 && S[2].length === 2 && S.flat().every(v => v >= 0)); }
  for (const id of Object.keys(G.CAST)) t.ok('voice and portrait: ' + id, !!G.voiceOf(id) && !!G.portraitRig(id));
  const need = { greet: 3, love: 2, like: 2, neutral: 1, refuse: 2, suitYes: 1, suitNo: 1, inviteYes: 2, inviteNo: 2, leaveTeam: 1, taunt: 2, win: 2, lose: 2, partnerBark: 2, visit: 4, farewellLow: 1, farewellHigh: 1, ending: 1 };
  for (const f of G.FIGHTERS) { const chats = ['chatLow', 'chatMid', 'chatHigh'].reduce((s, k) => s + G.LINES[f][k].length, 0); t.ok(f + ': 6 chats', chats >= 6); for (const k in need) t.ok(`${f}: ${need[k]} ${k}`, (G.LINES[f][k] || []).length >= need[k]); }
  const sonny = Object.values(G.LINES.sonny).flat().length, pepper = Object.values(G.LINES.pepper).flat().length;
  t.ok('Sonny has about 40 lines', sonny >= 40, sonny); t.ok('Pepper has about 25', pepper >= 25, pepper);
  for (const s of ['kai', 'odette', 'bo']) t.ok(s + ' has 8 shop lines', G.LINES[s].shop.length >= 8);
  // every line fits two lines of the dialog box (about 265 px of text)
  const all = []; for (const who in G.LINES) for (const k in G.LINES[who]) for (const l of G.LINES[who][k]) all.push([who + '.' + k, l]);
  const wide = all.filter(([, l]) => E.font.wrap(l, 262).length > 3);
  t.ok('lines fit the dialog box', !wide.length, wide.slice(0, 3).map(w => w[0]).join(', '));
  // sources: no placeholders, no Math.random
  const src = readdirSync(join(DEV, 'src')).map(f => [f, readFileSync(join(DEV, 'src', f), 'utf8')]);
  const bad = src.filter(([, s]) => /\b(TODO|TBD|FIXME|lorem|placeholder)\b/i.test(s)).map(([f]) => f);
  t.ok('no TODO, TBD, lorem or placeholder in src', !bad.length, bad.join(', '));
  const eng = readFileSync(join(DEV, 'engine/my-3d2dge.js'), 'utf8'), g57 = eng.slice(eng.indexOf('const G57 = {'), eng.indexOf('const parseFont')), have = new Set([...g57.matchAll(/"(.{1,2})": '/g)].map(m => m[1]));
  const missing = [...new Set(src.map(([, s]) => s).join('').split('').filter(ch => ch.charCodeAt(0) > 126 && !have.has(ch)))];
  t.ok('every character the game writes is in the pixel font', !missing.length, missing.join(' '));
  const rnd = src.filter(([, s]) => /Math\.random\(/.test(s)).map(([f]) => f);
  t.ok('no Math.random( in src', !rnd.length, rnd.join(', '));
}
