// ---- attract mode: the bot plays the first hunt on a loop, cheating freely, so the demo shows as much as possible ------
// It has infinite shells, never misses a bucks' box once it is in view, and skips the doe rule. It is not meant to balance
// the game. Any input returns to the title (hunt.js: exitAttract).
const BOT = { target: null, retarget: 0 };

function botStep(dt, W, H, t) {
  GUN.scoped = false;
  if (GUN.chamber !== 'loaded' && GUN.rackT <= 0 && GUN.reloadT <= 0) pumpGun();
  GUN.tube = TUNING.tubeSize;
  BOT.retarget -= dt;
  if (!BOT.target || BOT.target.dead || BOT.target.state === 'down' || !LIVE.includes(BOT.target) || BOT.retarget <= 0) {
    // the best target: a buck (most points), else anything that is not protected
    let best = null;
    for (const a of LIVE) {
      if (a.dead || a.state === 'down' || a.pop != null) continue;
      const sp = SPECIES[a.species];
      if (sp.protected || sp.stinks || sp.sex === 'doe') continue;
      if (a.x < .05 || a.x > .95) continue;
      const score = (sp.sex === 'buck' ? 2 : 1) + a.d;
      if (!best || score > best.score) best = { a, score };
    }
    BOT.target = best ? best.a : null;
    BOT.retarget = .6;
  }
  const a = BOT.target;
  if (!a) return;
  // aim at the chest of the target, with a little wander so the reticle reads as a person's
  const aimX = a.x, aimY = a.fy - a.hn * .55;
  const dx = aimX - GUN.x, dy = aimY - GUN.y;
  const step = Math.min(1, 2.8 * dt);
  GUN.x += dx * step; GUN.y += dy * step;
  // only when the animal under the reticle is the target: a doe in the way would bench the gun
  const under = targetUnder(GUN.x, GUN.y - .0, W, H);
  if (Math.abs(dx) < .02 && Math.abs(dy) < .04 && GUN.chamber === 'loaded' && under === a) {
    fireOrReport(W, H, t);
    BOT.target = null; BOT.retarget = .2;
  }
}
