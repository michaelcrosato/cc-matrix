// Pitching: the plan a pitch is thrown with, its path through plate-space, the strike zone, and the Plate Cam's projection.
// Plate-space is in feet: lat (+ to the screen's right, seen from behind the plate) and h (height). depth runs from the
// plate (0) out to the rubber (60.5 ft). The ball flies from the rubber to the plate over `time` seconds.

// The release meter: p runs 0..1 and sweeps. Inside the sweet spot (in the middle) the pitch goes where it was aimed; the
// further out, the wider the miss, up to the full aim error at the meter's ends.
BZ.releaseError = p => {
  const half = BZ.TUNE.releaseSweet / 2;
  const d = Math.abs(p - .5);
  return d <= half ? 0 : BZ.clamp((d - half) / (.5 - half), 0, 1);
};

// The plan: which pitch, where it is aimed (feet, before the release error), and when the release lands.
// rng draws the miss's direction, so a seeded match misses the same way every time.
BZ.planPitch = ({ pitch, aimLat, aimH, release, superPitch = false, rng = BZ.rng.play }) => {
  const P = BZ.PITCHES[pitch];
  const miss = BZ.releaseError(release) * BZ.TUNE.aimError;
  const a = rng() * Math.PI * 2;
  const k = superPitch ? 1.5 : 1;
  return {
    pitch, super: superPitch, release, miss,
    endLat: aimLat + Math.cos(a) * miss, endH: aimH + Math.sin(a) * miss * .7,
    time: P.time / BZ.TUNE.pitchSpeed * (superPitch ? .82 : 1),
    brkX: P.brkX * k, brkY: P.brkY * k
  };
};

// Where the ball is at t (0 = the rubber, 1 = the plate). The break grows toward the plate.
BZ.pitchAt = (plan, t) => ({
  lat: plan.endLat * t + plan.brkX * t * t,
  h: BZ.lerp(5.5, plan.endH, t) + plan.brkY * t * t,
  depth: BZ.PLATE.dist * (1 - t)
});
// Where the ball crosses the plate (the end of the path).
BZ.plateLoc = plan => BZ.pitchAt(plan, 1);

// A ball touching the zone counts (radius 0.12 ft).
BZ.inZone = (lat, h) => Math.abs(lat) <= BZ.ZONE.hi + .12 && h >= BZ.ZONE.bot - .12 && h <= BZ.ZONE.top + .12;

// The Plate Cam: a perspective from 8 ft behind the plate, 4 ft up. The focal length is the screen's height, and the
// horizon sits at 44% of the height, so the plate's feet land near the bottom of the picture and the mound is up the field.
BZ.HORIZON = .44;
BZ.project = (lat, h, depth, W, H) => {
  const s = H / (depth + BZ.PLATE.camBack);
  return { x: W / 2 + lat * s, y: H * BZ.HORIZON + (BZ.PLATE.camH - h) * s, s };
};
// The reverse at the plate: a screen point to plate-space (feet) for the batter's reticle.
BZ.plateFromScreen = (mx, my, W, H) => {
  const s = H / BZ.PLATE.camBack;
  return { lat: (mx - W / 2) / s, h: BZ.PLATE.camH - (my - H * BZ.HORIZON) / s };
};
// The pitcher's mouse: the same plane as the batter's, but a pitch can't be aimed off the screen's zone area.
BZ.aimLimits = { lat: [-1.25, 1.25], h: [.9, 4.4] };
BZ.clampAim = (lat, h) => ({ lat: BZ.clamp(lat, ...BZ.aimLimits.lat), h: BZ.clamp(h, ...BZ.aimLimits.h) });

// The CPU's pitch choice: fastballs early, breaking balls with two strikes, and the aim near the zone's edges.
BZ.cpuPitch = (S, rng = BZ.rng.fx) => {
  const two = S.strikes === 2, behind = S.balls >= 2;
  const r = rng();
  if (two && r < .55) {
    const pitch = r < .25 ? 'curve' : 'slider';
    return { pitch, aimLat: (rng() - .5) * 1.5, aimH: pitch === 'curve' ? 3.6 + rng() * .4 : 1.9 + rng() * .4, release: .5 + (rng() - .5) * .25 };
  }
  const strikeOdds = behind ? .8 : .6;
  const inside = rng() < strikeOdds;
  const pitch = rng() < .6 ? 'fastball' : BZ.pick(rng, ['curve', 'slider', 'change']);
  const drop = pitch === 'curve' ? 2.4 : pitch === 'change' ? 1 : 0;   // aim high enough that the break ends in the zone
  return { pitch, aimLat: inside ? (rng() - .5) * 1.2 : (rng() < .5 ? -1 : 1) * (.95 + rng() * .3),
    aimH: inside ? 1.8 + rng() * 1.6 + drop : (rng() < .5 ? 1.1 : 4.1), release: .5 + (rng() - .5) * .4 };
};
