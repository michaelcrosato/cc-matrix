/** On-screen prompts. Tokens in copy become the device used last. */

const WHEEL = ['scalpel', 'forceps', 'suction', 'gel', 'suture', 'laser', 'scanner', 'clamp'];

function svg(body) {
  return `<svg viewBox="0 0 32 32" class="glyph" aria-hidden="true">${body}</svg>`;
}

const PS = {
  use: svg('<circle cx="16" cy="16" r="12" fill="#6aa6ff"/><path d="M11 16l3 3 7-7" stroke="#fff" stroke-width="2" fill="none"/>'),
  back: svg('<circle cx="16" cy="16" r="12" fill="#ff6a7a"/><circle cx="16" cy="16" r="4" fill="none" stroke="#fff" stroke-width="2"/>'),
  syringe: svg('<rect x="6" y="6" width="20" height="20" rx="3" fill="#f0a0d0"/>'),
  special: svg('<circle cx="16" cy="16" r="12" fill="#7dffb0"/><path d="M16 8l2 7h7l-5.5 4 2 7L16 22l-5.5 4 2-7L7 15h7z" fill="#123"/>'),
  steady: svg('<rect x="4" y="10" width="24" height="12" rx="6" fill="#d0d6dc"/><text x="16" y="19" text-anchor="middle" font-size="8" fill="#122">L2</text>'),
  alt: svg('<circle cx="16" cy="16" r="12" fill="#ff6a7a"/>'),
  confirm: svg('<circle cx="16" cy="16" r="12" fill="#6aa6ff"/>'),
  pause: svg('<rect x="4" y="10" width="24" height="12" rx="4" fill="#d0d6dc"/><text x="16" y="19" text-anchor="middle" font-size="6" fill="#122">OPT</text>'),
  page: svg('<rect x="4" y="8" width="24" height="16" rx="4" fill="#d0d6dc"/><text x="16" y="19" text-anchor="middle" font-size="7" fill="#122">L1</text>'),
};

const XB = {
  use: svg('<circle cx="16" cy="16" r="12" fill="#6ecb5a"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#123">A</text>'),
  back: svg('<circle cx="16" cy="16" r="12" fill="#e24b4b"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#fff">B</text>'),
  syringe: svg('<circle cx="16" cy="16" r="12" fill="#4aa3ff"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#fff">X</text>'),
  special: svg('<circle cx="16" cy="16" r="12" fill="#f5c542"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#123">Y</text>'),
  steady: svg('<rect x="4" y="10" width="24" height="12" rx="6" fill="#d0d6dc"/><text x="16" y="19" text-anchor="middle" font-size="8" fill="#122">LT</text>'),
  alt: svg('<circle cx="16" cy="16" r="12" fill="#e24b4b"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#fff">B</text>'),
  confirm: svg('<circle cx="16" cy="16" r="12" fill="#6ecb5a"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#123">A</text>'),
  pause: svg('<rect x="4" y="10" width="24" height="12" rx="4" fill="#d0d6dc"/><text x="16" y="19" text-anchor="middle" font-size="6" fill="#122">MENU</text>'),
  page: svg('<rect x="4" y="8" width="24" height="16" rx="4" fill="#d0d6dc"/><text x="16" y="19" text-anchor="middle" font-size="7" fill="#122">LB</text>'),
};

const KB = {
  use: svg('<rect x="4" y="8" width="24" height="16" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="7" fill="#122">LMB</text>'),
  back: svg('<rect x="4" y="8" width="24" height="16" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="6" fill="#122">ESC</text>'),
  syringe: svg('<rect x="6" y="8" width="20" height="16" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="10" fill="#122">F</text>'),
  special: svg('<rect x="3" y="10" width="26" height="12" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="6" fill="#122">SPACE</text>'),
  steady: svg('<rect x="3" y="10" width="26" height="12" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="6" fill="#122">SHIFT</text>'),
  alt: svg('<rect x="4" y="8" width="24" height="16" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="7" fill="#122">RMB</text>'),
  confirm: svg('<rect x="3" y="10" width="26" height="12" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="6" fill="#122">ENTER</text>'),
  pause: svg('<rect x="4" y="8" width="24" height="16" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="6" fill="#122">ESC</text>'),
  page: svg('<rect x="6" y="8" width="20" height="16" rx="3" fill="#e8eef0"/><text x="16" y="19" text-anchor="middle" font-size="10" fill="#122">Q</text>'),
};

const SETS = { playstation: PS, xbox: XB, keyboard: KB, mouse: KB };

export function promptHtml(token, set) {
  const table = SETS[set] || PS;
  return table[token] || table.confirm;
}

export function fillPrompt(text, set) {
  return String(text || '').replace(/\{(use|steady|special|confirm|back|syringe|alt|pause|page)\}/g, (_, k) => promptHtml(k, set));
}

export function toolFromStick(x, y, prev) {
  const mag = Math.hypot(x, y);
  if (mag < 0.6) return prev || 'gel';
  let ang = Math.atan2(x, -y);
  if (ang < 0) ang += Math.PI * 2;
  const sector = Math.round(ang / (Math.PI / 4)) % 8;
  return WHEEL[sector];
}

export { WHEEL };
