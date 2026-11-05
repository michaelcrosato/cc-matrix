// lint: the content's shapes and references, the walkthroughs' targets, the sim layer's rule, no TODOs
import { readFileSync, readdirSync } from 'node:fs';
import { boot } from '../harness.mjs';
export default async check => {
  const { B } = await boot();
  const LEGEND = '#.@<>+=LKMHIPTOo^SU*B';
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], FACE = { N: 0, E: 1, S: 2, W: 3 };
  for (const [fid, F] of Object.entries(B.FLOORS)) {
    const w = F.map[0].length;
    check(fid + ' map is rectangular', F.map.every(r => r.length === w));
    check(fid + ' map is walled', F.map[0].split('').every(c => c === '#') && F.map[F.map.length - 1].split('').every(c => c === '#') && F.map.every(r => r[0] === '#' && r[w - 1] === '#'));
    for (const r of F.map) for (const c of r) check(fid + ' legend knows ' + c, LEGEND.includes(c));
    const ch = (x, y) => (F.map[y] || '')[x] || '#';
    for (const [id, kind, x, y, face] of F.features || []) {
      const d = FACE[face];
      check(fid + ' ' + id + ' stands on an open cell', ch(x, y) !== '#', x + ',' + y);
      if (kind !== 'altarSlab' && kind !== 'undergate') check(fid + ' ' + id + ' faces a wall', ch(x + DX[d], y + DY[d]) === '#', x + ',' + y + ' ' + face);
    }
    for (const [x, y, id] of F.items || []) { check(fid + ' item ' + id + ' exists', !!B.ITEMS[id]); check(fid + ' item ' + id + ' on open floor', ch(x, y) !== '#', x + ',' + y); }
    for (const [t, x, y] of F.mons || []) { check(fid + ' monster ' + t + ' exists', !!B.MONSTERS[t]); check(fid + ' monster ' + t + ' on floor', ch(x, y) !== '#'); }
    for (const [id, d] of Object.entries(F.doors || {})) { check(fid + ' door ' + id + ' on a door cell', '+=LKMU'.includes(ch(...d.at)), d.at); if (d.key) check(fid + ' key ' + d.key + ' exists', !!B.ITEMS[d.key]); }
    const ids = new Set([...Object.keys(F.doors || {}), ...Object.keys(F.plates || {}), ...Object.keys(F.pits || {}), ...Object.keys(F.teleports || {}), ...Object.keys(F.secrets || {}), ...(F.features || []).map(f => f[0])]);
    for (const wr of F.wires || []) {
      for (const k of ['lever', 'catch', 'plate', 'alcove', 'opened']) if (wr.when[k]) check(fid + ' wire trigger ' + wr.when[k] + ' exists', ids.has(wr.when[k]));
      for (const k of ['levers', 'buttons', 'plates', 'gears', 'sequence']) if (wr.when[k]) for (const i of wr.when[k]) check(fid + ' wire trigger ' + i + ' exists', ids.has(i));
      for (const a of [...wr.do, ...(wr.fail || []), ...(wr.undo || [])]) {
        if (['open', 'close', 'toggle', 'secret', 'reveal', 'bridge', 'teleporter'].includes(a[0])) check(fid + ' wire action target ' + a[1], ids.has(a[1]));
        if (a[0] === 'story') check(fid + ' story ' + a[1], !!B.STORIES[a[1]]);
        if (a[0] === 'give' || a[0] === 'place') check(fid + ' item ' + a[1], !!B.ITEMS[a[1]]);
        if (a[0] === 'spawn') check(fid + ' spawn ' + a[1], !!B.MONSTERS[a[1]]);
      }
    }
    for (const [k, st] of Object.entries(F.stairs || {})) { if (!st.to) continue; const T = B.FLOORS[st.to]; check(fid + ' stairs ' + k + ' lead somewhere open', T && (T.map[st.at[1]] || '')[st.at[0]] !== '#', st.to + ' ' + st.at); }
    if (F.fall) check(fid + ' fall lands on floor', B.FLOORS[F.fall.to].map[F.fall.at[1]][F.fall.at[0]] !== '#');
    for (const wp of F.waypoints || []) check(fid + ' waypoint ' + wp[0] + ' is open', ch(wp[1], wp[2]) !== '#');
  }
  for (const [k, plan] of Object.entries(B.WALK)) {
    const fid = k.slice(0, 2), F = B.FLOORS[fid];
    for (const st of plan) {
      if (['go', 'grabAt', 'use', 'openDoor'].includes(st[0])) check('walk ' + k + ' ' + JSON.stringify(st) + ' is open', F.map[st[2]][st[1]] !== '#');
      if (st[0] === 'use' || st[0] === 'openDoor') { const d = FACE[st[3]], feat = (F.features || []).find(f => f[2] === st[1] && f[3] === st[2] && f[4] === st[3]); const door = Object.values(F.doors || {}).find(q => q.at[0] === st[1] + DX[d] && q.at[1] === st[2] + DY[d]); check('walk ' + k + ' ' + JSON.stringify(st) + ' uses something', !!(feat || door)); }
      if (st[0] === 'hold') check('walk ' + k + ' hold ' + st[1], !!B.ITEMS[st[1]]);
    }
  }
  for (const [id, s] of Object.entries(B.STORIES)) for (const [sp] of s.lines) check('story ' + id + ' speaker ' + sp, !!B.SPEAKERS[sp]);
  for (const [id, it] of Object.entries(B.ITEMS)) check('icon for ' + id, !!B.ICON_ART[it.icon], it.icon);
  const here = new URL('../../src/', import.meta.url).pathname;
  for (const f of readdirSync(here)) {
    const s = readFileSync(here + f, 'utf8');
    check('no TODO in ' + f, !/\bTODO\b|\bFIXME\b|placeholder/i.test(s));
    if (/^(2\d|30|31)-/.test(f)) { const code = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); for (const w of ['World3D', 'document', 'Math.random', 'game.audio']) check(f + ' (sim) never touches ' + w, !code.includes(w)); }
  }
};
