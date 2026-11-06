// Prompts: button caps from input.label(action), so they follow the device used last and the player's rebinding. Never a hard-coded key.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px, font } = E;
const FACE = { '✕': '#6a8cff', '○': '#ff6a6a', '□': '#e87ad8', '△': '#4ad8a8', A: '#4ac84a', B: '#e84a4a', X: '#4a8cf0', Y: '#e8c83a' };
G.capWidth = s => font.width(s) + 8;
G.drawCap = (g, label, x, y, o = {}) => { const w = font.width(label) + 8, h = 11, face = FACE[label]; const padish = !!face && !/^[A-Z]$/.test(label) || (o.pad && !!face); px.rect(g, x + 1, y, w - 2, h, '#101820'); px.rect(g, x, y + 1, w, h - 2, '#101820'); px.rect(g, x + 1, y + 1, w - 2, h - 2, face && o.pad !== false ? '#26303a' : '#d8e0e4'); px.rect(g, x + 1, y + h - 2, w - 2, 1, face && o.pad !== false ? '#141a22' : '#8a98a0'); font.text(g, label, x + 4, y + 2, face && o.pad !== false ? face : '#101820', { outline: false }); return w; };
// a prompt: [cap] text
G.drawPrompt = (g, input, action, text, x, y, o = {}) => { const label = input.label(action) || '?', pad = input.lastDevice === 'gamepad', w = G.drawCap(g, label, x, y, { pad }); font.text(g, text, x + w + 3, y + 2, o.color || '#ffffff', { outline: false, shadow: '#000' }); return w + 3 + font.width(text); };
G.drawStick = (g, side, x, y, dir) => { px.disc(g, x + 6, y + 6, 6, '#101820'); px.disc(g, x + 6, y + 6, 5, '#26303a'); const a = dir === undefined ? null : dir / 8 * 6.2832 - 1.5708, kx = a === null ? 0 : Math.cos(a) * 2.5, ky = a === null ? 0 : Math.sin(a) * 2.5; px.disc(g, x + 6 + kx, y + 6 + ky, 3, '#8fb8b0'); font.text(g, side, x + 4 + kx, y + 3 + ky, '#101820', { outline: false, font: 'tiny' }); return 14; };
G.promptWidth = (input, action, text) => G.capWidth(input.label(action) || '?') + 3 + font.width(text);
})();
