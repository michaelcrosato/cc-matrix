// Small helpers for writing ops. Everything they return is plain JSON-safe data.
export const closeUp = ({ sutures = [], gel = null, dressing = { at: [-3, 0.4], ang: 0, len: 6 }, gelSay = null, sutureSay = null, dressSay = "reyes|Dress it. Straight line, Doctor. You've seen a line." } = {}) => {
  const out = [];
  if (sutures.length) out.push({ id: 'close-suture', objective: 'SUTURE THE WOUNDS', say: sutureSay, hint: 'suture', spawn: sutures.map((s) => ({ k: 'laceration', ...s })), until: { clear: ['laceration'] } });
  if (gel) out.push({ id: 'close-gel', objective: 'GEL THE SITE', say: gelSay, hint: 'gel', spawn: [{ k: 'mask', ...gel }], until: { clear: ['mask'] } });
  if (dressing) out.push({ id: 'dressing', objective: 'DRESS IT: DRAG THE STRIP ALONG THE LINE', say: dressSay, context: 'dressing', spawn: [{ k: 'dressing', id: 'dress', ...dressing }], until: { clear: ['dressing'] } });
  return out;
};
