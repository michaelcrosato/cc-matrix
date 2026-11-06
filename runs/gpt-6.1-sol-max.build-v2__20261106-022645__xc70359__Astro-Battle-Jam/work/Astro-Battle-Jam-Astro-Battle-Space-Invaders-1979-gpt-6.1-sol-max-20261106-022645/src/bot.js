/* Observation-only pilot: returns the same three ordinary actions as a person. Used by tests and attract. */
(function (root) {
  const A = root.ABJ;
  A.pilot = function (s, id) {
    const p = s.ships.find(p => p.id === id);
    if (!p || !p.active) return { move: 0, fire: false, repair: false };
    const speed = s.tuning.playerSpeed, current = p.x;
    let targets = [];
    if (s.boss) {
      const b = s.boss, lead = (p.y - b.y) / s.tuning.shotSpeed;
      const futureX = 240 + Math.sin((s.encounterTick + lead * 120) / 400) * (b.phase === 1 ? 86 : 118);
      targets = b.phase === 1 ? [b.left > 0 && futureX - 48, b.right > 0 && futureX + 48].filter(x => x !== false) : [futureX];
    } else {
      const f = s.formation, ratio = s.enemies.length / Math.max(1, f.initial);
      const interval = s.tuning.march * A.WAVES[Math.min(5, s.encounter)].pace * (.14 + .86 * Math.pow(ratio, .8));
      const cols = s.enemies.map(e => e.col * 38), min = Math.min(...cols) || 0, max = Math.max(...cols) || 0;
      targets = s.enemies.filter(e => !s.enemies.some(q => q.col === e.col && q.row > e.row)).map(e => {
        const [x, y] = A.enemyPos(s, e), flight = (p.y - 9 - y) / s.tuning.shotSpeed;
        let advance = f.dir * flight * 5 / interval, origin = f.x + advance;
        const left = A.FIELD.left + 8 - min, right = A.FIELD.right - 8 - max;
        if (origin > right) origin = right - (origin - right); if (origin < left) origin = left + (left - origin);
        return origin + e.col * 38;
      });
    }
    let desired = targets.sort((a, b) => Math.abs(a - current) - Math.abs(b - current))[0] ?? current;
    // Catch reachable salvage when it is low; it passes through cover.
    const items = s.pickups.filter(q => q.y > 181 && q.y < 248 && Math.abs(q.x - current) / speed < (246 - q.y) / 31 + .12 && p.charges < 3);
    if (items.length) desired = items.sort((a, b) => Math.abs(a.x - current) - Math.abs(b.x - current))[0].x;
    const threats = s.shots.filter(q => q.team === 1 && q.y > 174 && q.y < 254);
    const danger = x => threats.reduce((sum, q) => sum + (Math.abs(q.x - x) < (q.kind === 'lane' ? 22 : 14) ? (q.y - 165) / 14 : 0), 0);
    if (danger(current) > 0 || danger(desired) > 0) {
      const options = [current - 25, current + 25, desired, current - 47, current + 47].filter(x => x > 30 && x < 450);
      desired = options.sort((a, b) => danger(a) * 100 + Math.abs(a - current) + Math.abs(a - desired) * .08 - danger(b) * 100 - Math.abs(b - current) - Math.abs(b - desired) * .08)[0] ?? desired;
    }
    const nearest = s.bunkers.slice().sort((a, b) => Math.abs(current - a.x - 24) - Math.abs(current - b.x - 24) || a.id - b.id)[0];
    let missing = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) if (A.INTACT[r] & (1 << c) && !(nearest.rows[r] & (1 << c))) missing++;
    return { move: Math.abs(desired - current) < 1.2 ? 0 : Math.max(-1, Math.min(1, (desired - current) / 5)), fire: true, repair: p.charges > 0 && missing > 28 && s.tick % 90 === 0 };
  };
})(globalThis);
