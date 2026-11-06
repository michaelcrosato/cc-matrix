/* Observation-driven pilot. The verification pilot uses ordinary intents only. */
(() => {
  "use strict";
  const F = globalThis.FWR;
  const hypot = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const hostile = (e) =>
    ["layer", "interceptor", "guard", "organ", "core"].includes(e.type) &&
    !e.dead &&
    e.state !== "shielded";
  F.botIntent = (world) => {
    const s = world.ship,
      neutral = F.neutral();
    if (world.outcome) return neutral;
    const enemies = world.entities.filter(hostile).sort((a, b) => hypot(a, s) - hypot(b, s));
    const crystals = world.entities.filter((e) => e.type === "crystal" && !e.dead);
    let target = world.objective?.target || { x: s.x + 600, y: 338 };
    // The verification pilot also attempts the optional high-risk signal.
    const optional = crystals.find((e) => e.optional && hypot(e, s) < 1400);
    if (optional && world.localRescued >= world.quota) target = optional;
    let enemy = enemies.find((e) => hypot(e, s) < 790 && !(e.type === "guard" && e.shield));
    // Clear dangerous or required mine-layers as they enter view instead of flying through their field.
    const important = enemies.find(
      (e) => (e.key || e.type === "layer" || e.type === "organ") && hypot(e, s) < 850,
    );
    if (important) enemy = important;
    let tx = target.x,
      ty = target.y;
    if (enemy && hypot(enemy, s) < 800 && world.mode !== "evasion") {
      const desiredX = enemy.x - 330,
        desiredY = enemy.y + (enemy.y < 338 ? 100 : -100);
      if (enemy.type === "core") {
        tx = enemy.x - 380;
        ty = enemy.y + Math.sin(world.time * 1.2) * 95;
      } else if (enemy.type === "organ" || enemy.key) {
        tx = desiredX;
        ty = desiredY;
      }
    }
    let dx = tx - s.x,
      dy = ty - s.y,
      d = Math.hypot(dx, dy);
    let desired = d > 12 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
    const hazards = world.entities.filter(
      (e) =>
        (e.type === "mine" && e.state !== "disarmed" && !e.dead) ||
        (hostile(e) && e.state !== "warning"),
    );
    const bullets = world.bullets.filter((b) => b.team === "enemy");
    // Evaluate steering directions by clearance along a short swept horizon.
    let move = desired,
      best = -Infinity;
    for (let i = -1; i < 24; i++) {
      const angle = i < 0 ? Math.atan2(desired.y, desired.x) : (i / 24) * Math.PI * 2;
      const vx = Math.cos(angle),
        vy = Math.sin(angle);
      let score = 4 * (vx * desired.x + vy * desired.y);
      const ex = s.x + vx * 100,
        ey = s.y + vy * 100;
      if (ey < 98 || ey > 578) score -= 100;
      if (world.sector === 3 && !world.coreDestroyed && ex > 5390 && ey > 160 && ey < 515)
        score -= 100;
      for (const h of hazards) {
        const distance = Math.hypot(h.x - s.x, h.y - s.y);
        if (distance > 290) continue;
        const along = (h.x - s.x) * vx + (h.y - s.y) * vy;
        const cross = Math.abs((h.x - s.x) * vy - (h.y - s.y) * vx);
        const rr = h.r + 35;
        if (along > -20 && along < 160 && cross < rr) score -= 18 * (1 - cross / rr) + 4;
        const end = Math.hypot(h.x - ex, h.y - ey);
        if (end < rr) score -= 25 * (1 - end / rr);
      }
      for (const h of bullets) {
        const hx = h.x + h.vx * 0.25,
          hy = h.y + h.vy * 0.25;
        if (Math.hypot(hx - ex, hy - ey) < 48) score -= 7;
      }
      if (score > best) {
        best = score;
        move = { x: vx, y: vy };
      }
    }
    if (d < 12 && best > 0) move = { x: 0, y: 0 };
    let aim = { x: s.aimX, y: s.aimY },
      fire = false;
    if (enemy && world.mode !== "evasion") {
      const ax = enemy.x - s.x,
        ay = enemy.y - s.y,
        n = Math.hypot(ax, ay);
      aim = { x: ax / n, y: ay / n };
      fire = !crystals.some(
        (c) => F.swept(s.x, s.y, enemy.x, enemy.y, c.x, c.y, c.r + 12) !== null,
      );
    }
    let burst = false;
    const aheadX = s.x + move.x * 355,
      aheadY = s.y + move.y * 355;
    const safe =
      aheadY >= 105 &&
      aheadY <= 570 &&
      hazards.every((h) => F.swept(s.x, s.y, aheadX, aheadY, h.x, h.y, h.r + 28) === null);
    if (
      s.energy >= world.config.warpCost &&
      s.drive === "ready" &&
      d > 480 &&
      safe &&
      (!enemy || world.mode === "evasion") &&
      world.tick % 90 < 20
    )
      burst = true;
    return { mx: move.x, my: move.y, ax: aim.x, ay: aim.y, fire, burst };
  };
})();
