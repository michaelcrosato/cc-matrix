// The CPU: a pitcher's choice (11-pitch.js), a batter's swing, and the bot that plays a human's side with the same
// decisions. The CPU's swings use the match's own random stream, so a seeded match is the same every run. Its level
// (the CPU level setting, 1 to 8) sets how well it times the ball and how often it swings at a bad pitch.
BZ.cpuSwing = (S, plan, rng = BZ.rng.play, level = BZ.TUNE.cpuLevel) => {
  const loc = BZ.plateLoc(plan);
  const inZ = BZ.inZone(loc.lat, loc.h);
  const chance = inZ ? .74 : (S.strikes === 2 ? .42 : .16);
  if (rng() > chance) return null;
  const sloppy = (8 - level) / 7;                  // 0 at level 8, 1 at level 1
  const timing = (rng() - .5) * 2 * (.05 + .14 * sloppy);
  // the CPU aims around the ball: mostly liners and grounders (a low aim) with some fly balls, the way a crowd likes it
  const reticle = { lat: loc.lat + (rng() - .5) * (.3 + .9 * sloppy), h: loc.h - .2 + rng() * 1.0 + (rng() < .25 ? .9 : 0) + (rng() - .5) * .4 * sloppy };
  return { swingT: timing, reticle };
};

// A whole bot decision for the pitch being thrown: what the CPU pitcher does, and what the CPU batter does with it.
BZ.botPitch = (S, rng = BZ.rng.play) => {
  const c = BZ.cpuPitch(S, rng);
  return BZ.planPitch({ pitch: c.pitch, aimLat: c.aimLat, aimH: c.aimH, release: c.release, rng });
};
