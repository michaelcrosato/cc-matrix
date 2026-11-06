// Shared UI: button caps that follow the device used last, panels, the HUD pieces.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), px = E.px, font = E.font;
const U = G.UI = {};
const FACE = { '✕': '#6aa8ff', '○': '#ff6a6a', '□': '#ff8ac8', '△': '#6affb0', 'A': '#6bd36b', 'B': '#ff6a6a', 'X': '#6aa8ff', 'Y': '#ffd35a' };
// draw one button cap for an action ("useTool"), returns its width
U.cap = (g, game, action, x, y, o = {}) => { const lab = game.input.label(action) || '?', w = font.width(lab) + 8, h = 11, face = FACE[lab];
  const round = game.input.lastDevice === 'gamepad' && lab.length <= 2; if (round) { px.disc(g, x + 6, y + 5, 6, face ? face + '55' : '#4a5a64'); px.disc(g, x + 6, y + 5, 5, '#10181c'); font.text(g, lab, x + 6 - Math.floor(font.width(lab) / 2), y + 1, face || '#e8f8f4', { outline: false }); return 12; }
  px.rect(g, x, y, w, h, o.bg || '#e8f8f4'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#10181c'); px.rect(g, x + 1, y + h - 1, w - 2, 1, '#3a4a54'); font.text(g, lab, x + 4, y + 2, face || '#e8f8f4', { outline: false }); return w; };
U.capText = (g, game, action, text, x, y, col = '#e8fbf6') => { const w = U.cap(g, game, action, x, y); font.text(g, text, x + w + 3, y + 2, col, { outline: false }); return w + 3 + font.width(text); };
U.panel = (g, x, y, w, h, o = {}) => { px.rect(g, x, y, w, h, o.bg || '#06161aee'); px.rect(g, x, y, w, 1, o.line || '#5ff0e0'); px.rect(g, x, y + h - 1, w, 1, o.line || '#5ff0e0'); px.rect(g, x, y, 1, h, o.line || '#5ff0e044'); px.rect(g, x + w - 1, y, 1, h, o.line || '#5ff0e044'); };
U.wrap = (text, w, scale = 1) => font.wrap(text, w, { scale });
U.text = (g, s, x, y, col = '#e8fbf6', o = {}) => font.text(g, s, x, y, col, { outline: false, shadow: '#000', ...o });
U.center = (g, s, cx, y, col, o = {}) => { const sc = o.scale || 1; font.text(g, s, cx - Math.floor(font.width(s, { scale: sc }) / 2), y, col, { outline: false, shadow: '#000', scale: sc, ...o }); };
U.ease = t => t * t * (3 - 2 * t);
// ECG trace
U.ecg = (g, buf, x, y, w, h, col, rate) => { const n = Math.min(buf.length, w); for (let i = 1; i < n; i++) { const a = buf[buf.length - n + i - 1], b = buf[buf.length - n + i]; px.line(g, x + i - 1, y + h / 2 - a * h / 2, x + i, y + h / 2 - b * h / 2, col, 1); } };
U.ecgY = hb => { const p = hb; if (p < .06) return 0; if (p < .1) return .3 * Math.sin((p - .06) / .04 * Math.PI); if (p < .14) return 0; if (p < .16) return -.25; if (p < .2) return 1; if (p < .24) return -.4; if (p < .3) return 0; if (p < .42) return .25 * Math.sin((p - .3) / .12 * Math.PI); return 0; };
// popup list helper
U.popups = [];
U.pop = (x, y, txt, col, big) => { U.popups.push({ x, y, txt, col, t: 0, big }); if (U.popups.length > 30) U.popups.shift(); };
U.drawPops = (g, dt) => { for (const p of U.popups) { p.t += dt; const a = p.t / 1.1, yy = p.y - 10 - a * 16; if (p.big) U.center(g, p.txt, p.x, yy, p.col, { scale: 2 }); else U.center(g, p.txt, p.x, yy, p.col); } U.popups = U.popups.filter(p => p.t < 1.1); };
// the stick icon, for prompts
U.stick = (g, x, y, lr) => { px.disc(g, x + 6, y + 6, 6, '#4a5a64'); px.disc(g, x + 6, y + 6, 5, '#10181c'); font.text(g, lr, x + 4, y + 2, '#e8f8f4', { outline: false }); return 13; };
})();
