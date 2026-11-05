// ---------------------------------------------------------------- the gamepads for the second and later players (standard mapping)
// Pad i (0-based, in the order the browser lists them) plays one seat: left stick or D-pad posture, the right stick or the
// face buttons for the technique. Presses are edges, so holding a stick does not repeat a technique.
KC.padPads = () => (typeof navigator !== 'undefined' && navigator.getGamepads) ? Array.from(navigator.getGamepads() || []) : [];
KC.padConnected = (i) => { const p = KC.padPads()[i]; return !!(p && p.connected !== false); };
KC.padIntent = (i, foeDir, prev) => {
  const p = KC.padPads()[i];
  if (!p) return null;
  const b = p.buttons || [], ax = p.axes || [];
  const down = (k) => !!(b[k] && (b[k].pressed || b[k].value > 0.5));
  // posture: the left stick (dominant axis, 0.5 to press), or the D-pad
  let lq = KC.quantize(ax[0] || 0, ax[1] || 0);
  if (down(12)) lq = 'u'; else if (down(13)) lq = 'd'; else if (down(14)) lq = 'l'; else if (down(15)) lq = 'r';
  const px = lq || 'n';
  // technique: a press edge of a face button, or of the right stick's 4-way direction
  const rq = KC.quantize(ax[2] || 0, ax[3] || 0);
  const faces = [[3, 'u'], [0, 'd'], [2, 'l'], [1, 'r']];
  let edge = null;
  for (const [k, d] of faces) if (down(k) && !prev['f' + k]) edge = edge || d;
  for (const [k] of faces) prev['f' + k] = down(k);
  if (rq && rq !== prev.rq && !edge) edge = rq;
  prev.rq = rq;
  const pr = (s) => (s === 'u' || s === 'd') ? s : KC.relDir(s, foeDir);
  return { posture: pr(px), tech: edge ? pr(edge) : null };
};
