// lint: the content. Maps are rectangular and walled; every character is known; features stand on open cells facing a
// wall; every id a wire, story, item, monster or text names exists; stairs pair; locks have keys; reachability with the
// gates the walkthrough has opened, and sealed areas sealed before; no sim file breaks the layer rule.
import { fresh } from '../util.mjs';
import { readdirSync, readFileSync } from 'node:fs';
export async function run(t) {
  const { B } = await fresh();
  const KNOWN = '#.@<>+=LKMHIPTOo^SU*B';
  const walkOpen = (X, x, y, open) => { const c = X.ch(x, y); if (c === '#') return false; const d = X.doorAt[x + ',' + y]; if (d && !open.has(d.id) && d.kind !== 'illusion') return false; return true; };
  const reach = (X, sx, sy, open, avoid = new Set()) => { const seen = new Set([sx + ',' + sy]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || avoid.has(k) || !walkOpen(X, nx, ny, open)) continue; seen.add(k); q.push([nx, ny]); } } return seen; };
  for (const [f, F] of Object.entries(B.FLOORS)) {
    const X = B.idx(f), W = F.map[0].length;
    t.check(f + ' map rectangular', F.map.every(r => r.length === W));
    t.check(f + ' map walled', F.map[0].split('').every(c => c === '#') && F.map[F.map.length - 1].split('').every(c => c === '#') && F.map.every(r => r[0] === '#' && r[W - 1] === '#'));
    t.check(f + ' characters known', F.map.join('').split('').every(c => KNOWN.includes(c)), F.map.join('').split('').filter(c => !KNOWN.includes(c)).join(''));
    for (const ft of X.featList) {
      t.check(`${f} feature ${ft.id} on an open cell`, X.ch(ft.x, ft.y) !== '#');
      t.check(`${f} feature ${ft.id} faces a wall`, X.ch(ft.x + B.DX[ft.dir], ft.y + B.DY[ft.dir]) === '#' || ft.kind === 'undergate', ft.x + ',' + ft.y + ' ' + ft.face);
      if (ft.o.text) t.check(`${f} feature ${ft.id} text`, !!B.TXT[ft.o.text]);
      for (const h of ft.o.holds || []) t.check(`${f} ${ft.id} holds a real item`, !!B.ITEMS[h], h);
    }
    for (const [x, y, id] of F.items || []) { t.check(`${f} item ${id}`, !!B.ITEMS[id]); t.check(`${f} item ${id} on floor`, X.ch(x, y) !== '#', x + ',' + y); }
    for (const [x, y, type] of F.mons || []) { t.check(`${f} monster ${type}`, !!B.MONSTERS[type]); t.check(`${f} monster ${type} on floor`, X.ch(x, y) !== '#'); }
    for (const w of F.wires || []) {
      for (const a of w.do.concat(w.fail || [])) {
        if (['open', 'close', 'toggle'].includes(a[0])) t.check(`${f} wire door ${a[1]}`, !!X.doors[a[1]]);
        if (['msg', 'hint'].includes(a[0])) t.check(`${f} wire text ${a[1]}`, !!B.TXT[a[1]]);
        if (a[0] === 'story') t.check(`${f} wire story ${a[1]}`, !!B.STORY[a[1]]);
        if (a[0] === 'give') t.check(`${f} wire item ${a[1]}`, !!B.ITEMS[a[1]]);
        if (a[0] === 'spawn') t.check(`${f} wire monster ${a[1]}`, !!B.MONSTERS[a[1]]);
        if (a[0] === 'bridge') t.check(`${f} wire pit ${a[1]}`, !!(F.pits || {})[a[1]]);
      }
      const W2 = w.when; for (const k of ['lever', 'catch']) if (W2[k]) t.check(`${f} wire trigger ${W2[k]}`, !!X.feats[W2[k]]);
      if (W2.plate) t.check(`${f} wire plate ${W2.plate}`, !!(F.plates || {})[W2.plate]);
    }
    for (const d of Object.values(X.doors)) if (d.lock) t.check(`${f} lock ${d.id} has a key somewhere`, Object.values(B.FLOORS).some(G => (G.items || []).some(i => i[2] === d.lock) || (G.feats || []).some(q => (q[5] && q[5].holds || []).includes(d.lock))) || Object.values(B.MONSTERS).some(m => (m.fixed || []).includes(d.lock)), d.lock);
    for (const [k, st] of Object.entries(X.stairAt)) if (st.to) { const T = B.idx(st.to), [ax, ay] = st.at; t.check(`${f} stairs ${k} land on open floor`, T.ch(ax, ay) !== '#' && !T.stairAt[ax + ',' + ay], st.to + ' ' + st.at); }
    for (const [id, x, y] of F.waypoints.map(w => [w[0], w[1], w[2]])) t.check(`${f} waypoint ${id}`, X.ch(x, y) !== '#');
    for (const s of F.walk || []) t.check(`${f} walk step known`, ['go', 'use', 'take', 'takeAll', 'clear', 'clearNear', 'put', 'throw', 'place', 'equip', 'choose', 'answerAll', 'wait', 'read', 'cast', 'rest', 'restIfLow', 'scribeAll', 'fill', 'insert', 'unlatch', 'buttons', 'gauntlet', 'candles', 'veil', 'reliquary', 'boss'].includes(s[0]), s[0]);
  }
  for (const [id, steps] of Object.entries(B.STORY)) for (const s of steps) { if (Array.isArray(s)) t.check(`story ${id} speaker`, !!(B.PEOPLE[s[0]] || B.NPCS[s[0]]), s[0]); if (s.choices) for (const c of s.choices) t.check(`story ${id} choice node ${c[1]}`, !!B.STORY[c[1]]); if (s.goto) t.check(`story ${id} goto`, !!B.STORY[s.goto]); }
  // reachability: what each part of the walk opens, and what stays sealed before it
  const X1 = B.idx('f1'), s1 = B.FLOORS.f1.start, wood = ids => new Set(['D1', 'D2', ...ids]);
  let r = reach(X1, s1[0], s1[1], wood([]));
  t.check('f1: the start reaches the Walk, not the Channel, before the lever', r.has('2,12') && !r.has('2,8'));
  r = reach(X1, s1[0], s1[1], wood(['G1']));
  t.check('f1: G1 opens the Channel and the Junction', r.has('3,6') && r.has('10,6'));
  t.check('f1: the closet, Snick, the lair, the Cistern sealed', !r.has('8,3') && !r.has('18,1') && !r.has('19,13'));
  t.check('f1: the illusion leads to the lair', reach(X1, 10, 8, wood(['G1'])).has('9,11'));
  r = reach(X1, s1[0], s1[1], wood(['G1', 'G2', 'L1', 'H1', 'G4', 'L2', 'G3']));
  t.check('f1: everything opened reaches the stairs and Tamsin', r.has('15,15') && r.has('7,1') && r.has('18,1'));
  const X2 = B.idx('f2'), s2 = B.FLOORS.f2.start;
  r = reach(X2, s2[0], s2[1], new Set(['D3']), new Set(['4,11', '5,10', '19,11']));
  t.check('f2: the clock hall sealed before K1; the vault sealed', !r.has('18,2') && !r.has('12,6'));
  r = reach(X2, s2[0], s2[1], new Set(['D3', 'K1']), new Set(['4,11', '5,10', '19,11']));
  t.check('f2: the Endless Hall is cut by the teleporter; the lock room only by the long way', r.has('19,6') && !r.has('19,13'));
  r = reach(X2, s2[0], s2[1], new Set(['D3', 'K1']), new Set(['4,11', '5,10']));
  t.check('f2: with the teleporter off the spinner room and the lock room open', r.has('19,13') && r.has('11,14') && !r.has('11,11'));
  r = reach(X2, 4, 12, new Set(['D3', 'K1', 'G6', 'G7', 'M1']), new Set(['5,10']));
  t.check('f2: the bridged pit leads to the riddle, the weight hall, the vault', r.has('2,9') && r.has('3,6') && r.has('12,6') && r.has('14,8'));
  const X3 = B.idx('f3'), s3 = B.FLOORS.f3.start;
  r = reach(X3, s3[0], s3[1], new Set([]));
  t.check('f3: the Gauntlet open; the chapel, the undergate stair, Veil and the reliquary sealed', r.has('18,8') && !r.has('18,3') && !r.has('12,6') && !r.has('13,13') && !r.has('21,13'));
  r = reach(X3, s3[0], s3[1], new Set(['L3']));
  t.check('f3: the bone key opens the chapel and the undergate hall', r.has('18,3') && r.has('12,4') && !r.has('12,6'));
  t.check('f3: helped, Veil\'s wall leads to the reliquary', reach(X3, 13, 10, new Set(['G8', 'H2'])).has('21,13'));
  t.check('f3: refused, the barracks lead to the reliquary', reach(X3, 19, 8, new Set(['G9'])).has('21,13') && !reach(X3, 19, 8, new Set([])).has('21,13'));
  t.check('f3: the sump is cut off but by its ladder', !reach(X3, 2, 15, new Set(['L3', 'U1', 'G8', 'H2', 'G9'])).has('1,2'));
  const X4 = B.idx('f4');
  t.check('f4: the arena sealed until the vault door', !reach(X4, 6, 11, new Set([])).has('6,3') && reach(X4, 6, 11, new Set(['G10'])).has('3,3'));
  const XR = B.idx('race');
  t.check('race: lever, door and plate gate the route', !reach(XR, 1, 10, new Set([])).has('3,3') && !reach(XR, 1, 10, new Set(['RG1'])).has('8,3') && reach(XR, 1, 10, new Set(['RG1', 'RL', 'RG2'])).has('12,1'));
  // the layer rule
  const dir = new URL('../../src/', import.meta.url);
  for (const f of readdirSync(dir).filter(f => /^(2\d|3[01])-/.test(f))) { const s = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); for (const w of ['World3D', 'document', 'game.audio', 'Math.random', 'W3.']) t.check(`layer rule: ${f} never mentions ${w}`, !s.includes(w)); }
  // no TODOs, placeholders or stubs
  const MARK = /\b(TODO|FIXME|XXX|placeholders?|stubs?|stubbed|lorem ipsum|not implemented|coming soon)\b/i;
  for (const f of readdirSync(dir)) { const s = readFileSync(new URL(f, dir), 'utf8'); t.check(`${f} has no TODO, FIXME, placeholder or stub`, !MARK.test(s), (s.match(MARK) || [])[0]); }
  // no empty function bodies, the shape a stub takes, except the NullView: the do-nothing view headless runs use in place of the 3D
  const EMPTY = /(\)|=>)\s*\{\s*\}/;
  for (const f of readdirSync(dir)) { const lines = readFileSync(new URL(f, dir), 'utf8').split('\n'); const hits = lines.map((l, i) => !/^const NullView = /.test(l) && EMPTY.test(l) ? (i + 1) : 0).filter(Boolean); t.check(`${f} has no empty function bodies`, !hits.length, 'line ' + hits.join(', ')); }
  // the whole deliverable: the bundled page (both engines and the game) and the exit interview
  const page = readFileSync(new URL('../../../EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-opus-5-5-xhigh-20261103-185046.html', import.meta.url), 'utf8');
  const hit = page.split('\n').map((l, i) => MARK.test(l) ? (i + 1) + ': ' + l.match(MARK)[0] : null).filter(Boolean);
  t.check('the bundled page has no TODO, FIXME, placeholder or stub anywhere', !hit.length, hit.slice(0, 5).join(' / '));
  t.check('the bundled page carries no audio files (all sound is code)', !/data:audio|\.(mp3|ogg|wav|m4a|flac)\b['"]/i.test(page));
  const xi = JSON.parse(readFileSync(new URL('../../../exit-interview.json', import.meta.url), 'utf8'));
  t.check('exit-interview.json answers every field', Object.values(xi.sourceInformation).every(v => v) && xi.testingFeedback.length === 4 && xi.engineFeedback.length === 6 && xi.promptFeedback.length === 4 && [...xi.testingFeedback, ...xi.engineFeedback, ...xi.promptFeedback].every(v => v) && Object.values(xi.aiHub).every(v => v !== undefined && v !== '' || v === xi.aiHub.series));
  t.check('exit-interview.json has no marker words either', !MARK.test(JSON.stringify(xi)), (JSON.stringify(xi).match(MARK) || [])[0]);
}
