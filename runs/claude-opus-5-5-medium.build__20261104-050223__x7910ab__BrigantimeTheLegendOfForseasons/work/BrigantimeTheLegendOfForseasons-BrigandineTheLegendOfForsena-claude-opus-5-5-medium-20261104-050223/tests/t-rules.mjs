// rules: formulas with fixed rolls, legality, wins; determinism of auto-resolve
export default async ({ boot, t }) => {
  const { G } = boot();
  const kn = (id, lvl) => { const d = G.get('knight', id), c = G.get('class', d.cls); const st = {}; G.STATS.forEach((s, i) => st[s] = Math.round(c.base[i] + c.growth[i] * (lvl - 1))); return { id, cls: d.cls, lvl, exp: 0, elem: d.elem, stats: st, equip: {}, ruler: !!d.ruler }; };
  const mo = (sp, lvl, uid) => ({ uid, sp, tier: 1, lvl, exp: 0 });
  const spec = (seed, season = 'spring', map = 'river_ford') => ({ map, season, seed, mode: 'siege', sides: [
    { realm: 'verdance', troops: [{ knight: kn('gareth', 6), monsters: [mo('unicorn', 4, 'a'), mo('pixie', 4, 'b'), mo('sproutling', 4, 'c')] }, { knight: kn('lynette', 7), monsters: [mo('treant', 4, 'd')] }] },
    { realm: 'amberlyn', troops: [{ knight: kn('pellam', 8), monsters: [mo('griffin', 4, 'e'), mo('scarecrow', 4, 'f')] }, { knight: kn('lamorak', 8), monsters: [mo('ghoul', 4, 'g')] }] }] });
  await t('a battle builds with units on the field', () => { const s = G.BattleSim.create(spec(1)); if (s.state.units.length !== 11) throw new Error('units ' + s.state.units.length); if (!s.active) throw new Error('no active troop'); });
  await t('auto-resolve ends within the bells', () => { const s = G.BattleSim.create(spec(2)); const r = G.BattleAI.resolve(s); if (r.winner === null) throw new Error('no winner'); if (s.state.bell > 12) throw new Error('bell ' + s.state.bell); });
  await t('the same seed and commands give the same hash', () => { const a = G.BattleSim.create(spec(5)), b = G.BattleSim.create(spec(5)); G.BattleAI.resolve(a); G.BattleAI.resolve(b); if (a.hash() !== b.hash()) throw new Error('hashes differ'); });
  await t('spells are illegal after moving', () => { const s = G.BattleSim.create(spec(3)); const tr = s.active, u = s.state.units[tr.knight]; const r = s.reach(u); const to = [...r.values()].find(v => v.cost > 0); s.apply({ t: 'move', u: u.id, to: to.c }); const sp = u.skills.find(x => G.get('skill', x).kind === 'spell'); if (!sp) return; if (s.skillUsable(u, sp).ok) throw new Error('spell allowed after move'); });
  await t('dmgScale 2 doubles a hit', () => { const s = G.BattleSim.create(spec(4)); const a = s.state.units[0], d = s.state.units.find(u => u.side === 1); G.tune.dmgScale = 1; const x = s.physDmg(a, d, [a.cx, a.cy], null, 1)[1]; G.tune.dmgScale = 2; const y = s.physDmg(a, d, [a.cx, a.cy], null, 1)[1]; G.tune.dmgScale = 1; if (Math.abs(y - 2 * x) > 2) throw new Error(x + ' vs ' + y); });
  await t('opposed elements hit harder, the same element softer', () => { const s = G.BattleSim.create(spec(4)); const d = { elem: 'autumn' }; if (s.elemMul('spring', d) <= 1) throw new Error('strong'); if (s.elemMul('autumn', d) >= 1) throw new Error('same'); });
  await t('winter freezes the river into walkable ice', () => { const s = G.BattleSim.create(spec(6, 'winter')); if (!s.state.cells.includes('ice')) throw new Error('no ice'); });
  await t('spring floods the fords', () => { const s = G.BattleSim.create(spec(6, 'spring')); if (s.state.cells.includes('~')) throw new Error('shallows remain'); });
  await t('every map x season resolves', () => { for (const m of G.all('map')) { if (m.sanctum || m.seats) continue; for (const se of G.SEASONS) { const s = G.BattleSim.create(spec(9, se, m.id)); G.BattleAI.resolve(s); if (!s.state.over) throw new Error(m.id + ' ' + se); } } });
  await t('a fallen ruler routs the side', () => { const s = G.BattleSim.create(spec(7)); const k = s.state.units.find(u => u.ruler && u.side === 1); const ev = []; s.damage(k, 9999, null, ev); if (!s.state.units.filter(u => u.side === 1 && u.kind === 'knight').every(u => u.out)) throw new Error('not routed'); });
};
