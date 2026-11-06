// Small helpers for the client's mirror of the host's props.
export function removePropBy(w, ev) {
  const p = w.props.find((q) => q.id === ev.id); if (!p) return;
  if (ev.t === 'break') { p.broken = true; p.hp = 0; }
  else if (ev.t === 'propgone') { w.props = w.props.filter((q) => q !== p); }
  else p.used = true;
}
export const hubColors = ['red', 'blue', 'lime', 'sand'];
