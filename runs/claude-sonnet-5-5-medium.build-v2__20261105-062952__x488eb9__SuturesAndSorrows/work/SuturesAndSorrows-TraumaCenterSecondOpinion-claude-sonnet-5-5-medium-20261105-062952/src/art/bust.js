// The cast: four leads from Appendix C plus four more and a patient kit. Busts are cached per expression.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const CAST = G.CAST = { ...G.CAST0 };
const hairCap = (col) => [[[-27, 12], [-26, 4], [-14, -8], [14, -8], [26, 4], [27, 12], [18, 8], [6, 4], [-8, 6], [-20, 8]], 'base'];
CAST.percy = { name: 'DR. WHITLOCK', skin: '#f4d2b6', hair: '#3a2c20', iris: '#4a78b8', cloth: '#e6e8f2', coat: '#f8f8fa', undershirt: '#9ab4d8', jaw: .98, blush: '#f0b8a0',
  backHair: [], frontHair: [[[[-27, 14], [-26, 0], [-12, -10], [10, -12], [26, 0], [27, 14], [18, 4], [4, 8], [-6, 2], [-18, 10]], 'base'], [[[-27, 14], [-26, 0], [-12, -10], [-6, 2], [-18, 10]], 'sh'], [[[4, -10], [16, -9], [22, -3], [10, -4]], 'lt']] };
CAST.odalys = { name: 'ODALYS', skin: '#c78d64', hair: '#3a1c14', iris: '#3a2418', cloth: '#c4803c', undershirt: '#f4e8d0', glasses: '#202428', blush: '#e89a7c', wide: 1.04,
  backHair: [[[-30, 6], [-36, 30], [-30, 54], [-20, 40], [-22, 8]], [[30, 6], [36, 30], [30, 54], [20, 40], [22, 8]]],
  frontHair: [[[[-30, 16], [-32, -2], [-18, -14], [0, -16], [18, -14], [32, -2], [30, 16], [22, 6], [8, 8], [-8, 6], [-22, 6]], 'base'], [[[-30, 16], [-32, -2], [-18, -14], [-14, 2], [-24, 8]], 'sh']] };
CAST.hale = { name: 'DR. HALE', skin: '#e8c4a4', hair: '#cdd0d6', iris: '#5a82a8', cloth: '#2e3a52', undershirt: '#f0f0f4', lines: true, jaw: 1.02, brow: '#b4b6bc',
  backHair: [], frontHair: [[[[-27, 16], [-26, 0], [-12, -9], [12, -9], [26, 0], [27, 16], [20, 8], [8, 4], [-10, 5], [-20, 9]], 'base'], [[[-27, 16], [-26, 0], [-12, -9], [-8, 5], [-20, 9]], 'sh']] };
CAST.clementine = { name: 'CLEMENTINE', skin: '#f0e4de', hair: '#6a5a50', iris: '#5a9096', cloth: '#bcd8d8', undershirt: '#7ad8d0', jaw: .92, wide: .92, blush: '#d8c4c0',
  backHair: [], frontHair: [[[[-26, 12], [-25, 0], [-12, -7], [12, -7], [25, 0], [26, 12], [16, 4], [4, 9], [-6, 3], [-18, 8]], 'base']] };
// patients: a parts kit hashed from the name
const SK = ['#f6d0b2', '#e0b088', '#c78d64', '#8a5a3c', '#f2dcc8'], HR = ['#2a1c14', '#6a4a2a', '#b88a4a', '#cfcfd0', '#8a3a24', '#3a3a44'], CL = ['#7a9ac8', '#c88a7a', '#8ac8a0', '#c8b86a', '#a88ac8'];
G.patientCast = (name) => { let h = 7; for (const ch of name || 'x') h = (h * 33 + ch.charCodeAt(0)) >>> 0; const p = n => (h >> n) & 7;
  const style = p(3) % 3; return { name: (name || 'PATIENT').toUpperCase().slice(0, 16), skin: SK[p(0) % 5], hair: HR[p(6) % 6], iris: ['#3a5a7a', '#4a7a50', '#6a4a2a'][p(9) % 3], cloth: CL[p(12) % 5], undershirt: '#f4f4f0', lines: p(15) % 2 === 0 && p(18) % 3 === 0, blush: '#f0a48c',
    backHair: style === 2 ? [[[-27, 14], [-30, 44], [-22, 54], [-16, 40], [-16, 14]], [[27, 14], [30, 44], [22, 54], [16, 40], [16, 14]]] : [],
    frontHair: [[[[-27, 14], [-26, 2], [-14, -8], [14, -8], [26, 2], [27, 14], [18, style === 1 ? 8 : 16], [0, 8], [-18, style === 1 ? 8 : 16]], 'base']] }; };
const cache = new Map();
G.castFor = id => CAST[id] || (typeof id === 'string' && id.startsWith('pt:') ? G.patientCast(id.slice(3)) : CAST.quill);
// a cached 112x128 canvas of one expression
G.bust = (id, expr = 'neutral', o = {}) => {
  const key = id + '|' + expr + '|' + (o.talk ? 1 : 0) + '|' + (o.blink ? 1 : 0) + '|' + (o.maskUp ? 1 : 0) + '|' + (o.look || 0); let cv = cache.get(key); if (cv) return cv;
  cv = E.mkCanvas(112, 128); const g = E.ctx2d(cv); const c = G.castFor(id);
  const e = expr === 'smirk' ? 'smile' : expr === 'tired' ? 'sad' : expr === 'cry' ? 'sad' : expr;
  G.drawBust(g, c, { expr: e, blink: o.blink ? 1 : (expr === 'tired' ? 1 : 0), talk: o.talk ? 1 : 0, maskUp: !!o.maskUp, look: o.look || 0 });
  if (expr === 'cry') { E.px.rect(g, 38, 66, 2, 9, '#9fd8f0'); E.px.rect(g, 72, 66, 2, 9, '#9fd8f0'); }
  if (expr === 'smirk') { E.px.line(g, 62, 72, 66, 70, '#00000040', 1); }
  if (E.px.reset) E.px.reset(cv); cache.set(key, cv); return cv;
};
G.EXPRS = ['neutral', 'smile', 'angry', 'sad', 'shock', 'shout', 'smirk', 'tired', 'cry'];
G.hasCast = id => !!CAST[id] || (typeof id === 'string' && id.startsWith('pt:'));
})();
