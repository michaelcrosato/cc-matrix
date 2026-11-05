// Batting: the contact model. Two things decide a swing: when it lands (timing, against the moment the ball crosses the
// plate) and where the bat is (the reticle, against the ball's spot over the plate). Both feed one quality, q (0..1),
// which sets the exit speed. Timing sets the spray (early goes to the right, late to the left); the reticle's height
// sets the launch (high for a fly, low for a grounder). A Batzooka swing is always on the sweet spot and fires harder.
BZ.contact = ({ swingT, reticle, plate, batzooka = false }) => {
  const W = BZ.TUNE.swingWindow, lim = W * 1.8;
  const reach = BZ.TUNE.reach * (batzooka ? 1.6 : 1);
  let e = swingT;
  if (batzooka) e = BZ.clamp(e, -W, W);           // the super swing is forgiving on timing
  else if (Math.abs(e) > lim) return { type: 'whiff', why: 'late or early' };
  const d = Math.hypot(reticle.lat - plate.lat, reticle.h - plate.h);
  if (d > reach * 1.5) return { type: 'whiff', why: 'off the ball' };
  if (d > reach) return { type: 'foul', why: 'got under it', q: 0, e, d };
  const timing = 1 - Math.abs(e) / lim;
  const loc = 1 - d / reach;
  const q = BZ.clamp(.55 * timing + .45 * loc, 0, 1);
  const exit = BZ.TUNE.exitSpeed * (.45 + .55 * q) * (batzooka ? BZ.TUNE.batzookaGain : 1);
  const spray = -(e / W) * BZ.TUNE.sprayTiming + plate.lat * 6;
  const launch = BZ.lerp(-8, 48, BZ.clamp((reticle.h - 1.4) / 2.8, 0, 1)) + (batzooka ? 6 : 0);
  return { type: 'hit', q, exit, launch, spray, batzooka, e, d, timing, loc };
};

// A pitch the batter can swing at: the swing's time relative to the ball's arrival (s), from its own clock.
BZ.swingWindowOpen = t => t > .8 && t < 1.2;   // the part of the path where a swing can make contact
