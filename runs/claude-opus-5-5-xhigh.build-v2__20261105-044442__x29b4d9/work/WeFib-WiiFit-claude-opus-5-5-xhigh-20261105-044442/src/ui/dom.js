// Tiny DOM helper: h('div.card.big', {onclick}, 'text', child)
export function h(spec, attrs, ...kids) {
  const parts = spec.split('.');
  const el = document.createElement(parts[0] || 'div');
  if (parts.length > 1) el.className = parts.slice(1).join(' ');
  if (attrs && (attrs instanceof Node || typeof attrs !== 'object' || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  if (attrs) for (const k of Object.keys(attrs)) {
    if (k === 'style') el.style.cssText = attrs[k];
    else if (k === 'html') el.innerHTML = attrs[k];
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  for (const c of kids.flat()) { if (c !== null && c !== undefined) el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return el;
}
export const rotJitter = (i) => [-1.4, 0.9, -0.6, 1.2, -1, 0.7, -0.5, 1][i % 8];
