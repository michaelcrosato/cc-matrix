// data: references resolve, counts, maps check (rows, anchors, room, Keep reachable in every season), road graph, deny-list
export default async ({ boot, t, rd }) => {
  const { G } = boot();
  await t('every reference resolves', () => G.validate());
  await t('the counts', () => { const n = k => G.all(k).length; const want = { castle: 25, monster: 30, map: 13, item: 33, realm: 6 }; for (const k in want) if (n(k) !== want[k]) throw new Error(k + ' ' + n(k)); if (n('knight') < 36) throw new Error('knights ' + n('knight')); if (n('skill') < 80) throw new Error('skills ' + n('skill')); if (G.ROADS.length !== 36) throw new Error('roads'); if (n('event') < 40) throw new Error('events ' + n('event')); });
  await t('every species has three forms and a rig', () => { for (const m of G.all('monster')) if (m.names.length !== 3 || !m.rig || m.skills.length !== 3) throw new Error(m.id); });
  await t('maps: equal rows, anchors with room, Keep reachable in every season', () => {
    for (const m of G.all('map')) {
      if (new Set(m.rows.map(r => r.length)).size !== 1) throw new Error(m.id + ' rows');
      const pm = G.parseMap(m.id), anchors = m.seats ? ['1', '2', '3', '4'] : m.sanctum ? ['1', '2', '3', '8'] : ['1', '2', '8'];
      for (const a of anchors) if (!pm.anchors[a]) throw new Error(m.id + ' anchor ' + a);
      if (!pm.keep.length) throw new Error(m.id + ' keep');
      for (const se of G.SEASONS) {
        const kn = id => Object.assign(G.makeKnightRec(id), { equip: {} });
        const s = G.BattleSim.create({ map: m.id, season: se, seed: 1, mode: m.seats ? 'shrine' : 'siege', sides: m.seats ? [{ realm: 'verdance', anchor: '1', troops: [{ knight: kn('gareth'), monsters: [] }] }, { realm: 'solmark', anchor: '3', troops: [{ knight: kn('morgause'), monsters: [] }] }] : [{ realm: 'verdance', troops: [{ knight: kn('gareth'), monsters: [] }] }, { realm: 'solmark', troops: [{ knight: kn('morgause'), monsters: [] }] }] });
        const u = s.state.units[0]; u.mov = 99; const r = s.reach(u, 999);
        if (!pm.keep.some(k => r.all.has(G.hex.key(k)) || G.hex.neighbors(k).some(n => r.all.has(G.hex.key(n))))) throw new Error(m.id + ' ' + se + ' keep unreachable');
        const free = G.hex.within(pm.anchors['1'], 2).filter(c => s.inside(c) && s.standable(c, null)).length; if (free < 7) throw new Error(m.id + ' room ' + free);
      }
    }
  });
  await t('the road graph is connected and each realm has the same shape', () => { const seen = new Set(['meridian']), q = ['meridian']; while (q.length) for (const n of G.adj[q.shift()]) if (!seen.has(n)) { seen.add(n); q.push(n); } if (seen.size !== 25) throw new Error('connected ' + seen.size); for (const r of G.PLAYABLE) { const cs = G.all('castle').filter(c => c.owner === r); const deg = cs.map(c => G.adj[c.id].length).sort().join(); if (deg !== '2,3,3,3') throw new Error(r + ' ' + deg); } });
  await t("no source proper names and no unfinished markers in the code", () => { const deny = /\b(Forsena|Almekia|Esgares|Norgard|Caerleon|Iscalio|Leonia|Padstow|Zemeckis|Cador|Henguist|Vaynard|Lyonesse|Dryst)\b/; const src = rd('dist/game.js').replace(/Brigandine: The Legend of Forsena/g, ''); const m = src.match(deny); if (m) throw new Error('found ' + m[0]); if (/\b(TODO|FIXME|XXX)\b/.test(src)) throw new Error('marker'); });
};
