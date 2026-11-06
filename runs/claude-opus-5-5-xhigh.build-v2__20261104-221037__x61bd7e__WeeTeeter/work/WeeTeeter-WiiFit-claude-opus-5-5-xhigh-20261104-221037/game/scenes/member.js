/* scenes/member.js: three big Member Cards, and a new member made by pills. No text entry. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px } = E, game = G.game;
const txt = (...a) => G.txt(...a);
let mode = 'cards', pills = null, slot = 0, draft = null, rigs = [], cursor = 0, confirmErase = false, idle = 0;
const L = () => G.LOOK;
const rowName = ['Hair', 'Skin', 'Top', 'Bottom', 'Name'];
function cards() {
  mode = 'cards'; rigs = [];
  const items = [];
  for (let i = 0; i < 3; i++) {
    const m = G.Save.member(i), look = m && m.data && m.data.look;
    rigs[i] = look && !m.damaged ? G.memberRig(look, m.data.wear, { size: 1.9 }) : null;
    items.push({ label: m ? (m.damaged ? 'Damaged card' : m.data.name) : 'New Member', id: i, member: m });
  }
  items.push({ label: 'Back', id: 'back' });
  pills = new G.Pills(items, { layout: 'h', y: () => game.H - 38, h: 22, w: Math.min(92, (game.W - 40) / 4 - 6), onPick(i, it) {
    if (it.id === 'back') return G.go('title');
    slot = it.id;
    if (it.member && !it.member.damaged) { if (game.saves.load(slot)) { G.Save.slot = slot; G.startDay(); } }
    else newMember();
  }, onBack() { G.go('title'); } });
}
function newMember() {
  mode = 'new'; cursor = 0;
  const pick = l => l[Math.floor(G.cosmetic() * l.length) % l.length];
  draft = { hair: 0, skin: 1, top: 0, bottom: 0, name: pick(G.DATA.lines.nicknames) };
  refresh();
  const dot = col => (g, r) => { px.disc(g, r.x + 16, r.y + r.h / 2, 6, '#20404c'); px.disc(g, r.x + 16, r.y + r.h / 2, 5, col); };
  const build = () => [{ label: 'Hair: ' + L().hair[draft.hair], id: 'hair', icon: dot(L().hairCols[draft.skin]) }, { label: 'Skin ' + (draft.skin + 1), id: 'skin', icon: dot(L().skins[draft.skin]) }, { label: 'Top ' + (draft.top + 1), id: 'top', icon: dot(L().tops[draft.top]) }, { label: 'Bottom ' + (draft.bottom + 1), id: 'bottom', icon: dot(L().bottoms[draft.bottom]) }, { label: draft.name + '  (Reroll)', id: 'name' }, { label: 'Sign the card', id: 'ok' }];
  pills = new G.Pills(build(), { x: () => game.W * .67, y: () => 22, w: Math.min(170, game.W * .44), h: 22, gap: 5, onPick(i, it) {
    if (it.id === 'ok') { G.Save.create(slot, draft.name, { hair: L().hair[draft.hair], skin: draft.skin, top: draft.top, bottom: draft.bottom }); G.startDay(); return; }
    bump(it.id, 1); pills.set(build()); refresh();
  }, onBack() { cards(); } });
  pills._build = build;
}
function bump(id, d) {
  const n = { hair: L().hair.length, skin: L().skins.length, top: L().tops.length, bottom: L().bottoms.length };
  if (id === 'name') { const list = G.DATA.lines.nicknames; let k = list.indexOf(draft.name); draft.name = list[(k + d + list.length) % list.length]; G.A.sfx('tick'); return; }
  if (n[id]) draft[id] = (draft[id] + d + n[id]) % n[id];
}
function refresh() { rigs[3] = G.memberRig({ hair: L().hair[draft.hair], skin: draft.skin, top: draft.top, bottom: draft.bottom }, {}, { size: 2 }); }
/** printed like a real card: fine rows of dashes, and two soft footprints */
const printCard = (g, x, y, w, h, on) => { const ink = on ? '#c9edf4' : '#d3e2e6', foot = on ? '#dff5f9' : '#dde9ec'; for (let yy = y + 23, row = 0; yy < y + h - 9; yy += 6, row++) for (let xx = x + 5 + (row % 2) * 4; xx < x + w - 6; xx += 8) px.rect(g, xx, yy, 3, 1, ink); for (const s of [-1, 1]) { px.ell(g, x + w / 2 + s * 13, y + 44, 8, 13, foot); px.ell(g, x + w / 2 + s * 13, y + 28, 6, 4, foot); } };
G.scenes.member = {
  view: 'brawler', camera: { zoom: false },
  enter() { cards(); G.L.enabled = false; G.music('studio'); G.talk.close(); },
  update(dt) {
    G.stageCam(30, 8); const I = game.input;
    if (mode === 'new' && pills) {
      const it = pills.items[pills.i];
      if (it.id !== 'ok') { if (I.repeat('left', .35, .14)) { bump(it.id, -1); pills.set(pills._build()); refresh(); } if (I.repeat('right', .35, .14)) { bump(it.id, 1); pills.set(pills._build()); refresh(); } }
    }
    if (mode === 'cards' && !G.talk.update(dt) && I.pressed('retry')) { const it = pills.items[pills.i]; if (it && it.member) { I.consumeAll(); const slotN = it.id; G.say('tare', G.DATA.lines.tare.erase, { face: 'worried', choices: ['Keep it', 'Erase it'], onChoice(k) { if (k === 1) { G.Save.erase(slotN); cards(); } } }); } }
    if (G.talk.open) { for (const r of rigs) if (r) r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); return; }
    pills.update(dt);
    for (const r of rigs) if (r) { r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); }
  },
  draw(r) {
    G.ROOMS.studio(r);
    r.overlay(g => {
      const W = game.W, H = game.H;
      if (mode === 'cards') {
        txt(g, G.DATA.lines.notes.whose, W / 2, 10, '#14a8c8', { align: 'center', scale: 2, shadow: '#ffffff' });
        const cw = Math.min(124, (W - 32) / 3), gap = 6, x0 = (W - (cw * 3 + gap * 2)) / 2, y = 34, ch = H - 34 - 48;
        for (let i = 0; i < 3; i++) {
          const x = x0 + i * (cw + gap), foc = pills.i === i, it = pills.items[i], m = it.member;
          G.panel(g, x, y - (foc ? 2 : 0), cw, ch + (foc ? 4 : 0), { r: 8, border: foc ? '#2cc6e6' : '#c8dde2', bg: foc ? '#ffffff' : '#f6fbfb' }); G.bands(g, x + 1, y + 20, cw - 2, ch - 28, foc ? '#ffffff' : '#f6fbfb', foc ? '#e3f6fa' : '#e6eff1', 8); printCard(g, x, y, cw, ch, foc);
          px.rect(g, x + 6, y + 5, cw - 12, 12, foc ? '#2cc6e6' : '#dfe9ea'); txt(g, 'Member ' + (i + 1), x + cw / 2, y + 7, foc ? '#ffffff' : '#5f7f8a', { align: 'center' });
          if (m && !m.damaged) {
            const d = m.data; if (rigs[i]) rigs[i].draw(g, Math.round(x + cw / 2), y + ch - 44, E.VIEWS.brawler);
            txt(g, d.name, x + cw / 2, y + ch - 40, '#20404c', { align: 'center' });
            txt(g, 'Spine Age ' + (m.level === undefined ? '?' : m.level), x + cw / 2, y + ch - 28, '#ff7a59', { align: 'center' });
            txt(g, m.place || ('Day ' + d.day), x + cw / 2, y + ch - 16, '#5f7f8a', { align: 'center' });
          } else if (m && m.damaged) { G.wrapText(g, G.DATA.lines.notes.damaged, x + cw / 2, y + 40, cw - 12, '#e0553a', { align: 'center' }); }
          else { G.drawTare(g, x + cw / 2, y + ch * .6, 1.6, { face: 'worried' }); txt(g, G.DATA.lines.notes.nobody, x + cw / 2, y + ch - 28, '#5f7f8a', { align: 'center' }); }
        }
      } else {
        G.panel(g, 16, 20, W * .36, H - 60, { r: 8 }); G.bands(g, 17, 40, W * .36 - 2, H - 88, '#ffffff', '#e3f6fa', 8); printCard(g, 16, 20, W * .36, H - 60, true);
        px.rect(g, 22, 25, W * .36 - 12, 13, '#2cc6e6'); txt(g, 'New Member', 16 + W * .18, 28, '#ffffff', { align: 'center' });
        const lk = L(), x = 16 + W * .18;
        rigs[3].draw(g, Math.round(x), H - 66, E.VIEWS.brawler);
        txt(g, draft.name, x, H - 58, '#20404c', { align: 'center' });
      }
      pills.draw(g);
      const focused = pills.items[pills.i]; G.prompts(g, mode === 'new' ? [['confirm', 'Next'], ['left', 'Change'], ['cancel', 'Back']] : focused && focused.member ? [['confirm', 'Pick'], ['retry', 'Erase']] : [['confirm', 'Pick']], { y: game.H - 15 });
    });
    G.talk.draw(r);
  }
};

/* ---- the day's route: everything that begins a day comes through here ---- */
G.startDay = () => {
  const s = G.S;
  if (!s.arrived) return G.go('arrival');
  if (!s.checked) return G.go('bodycheck');
  const D = G.DATA.dayOf(s.day);
  if (D.scene && !s.tareDay && D.scene === 'tareday') return G.go('tareday');
  if (D.games && !s.ended) return G.go('games');
  if (s.session >= 3 && !s.freePlay) return G.go('evening');
  if (s.day === 1 && s.session === 0 && !s.best.stork && D.guided) return G.playActivity(D.guided, { guided: true, from: 'island' });
  G.go('island');
};
G.nextDay = () => {
  const s = G.S; s.history.push(G.DATA.dayOf(s.day).hold ? s.shown : G.spineAge()); if (s.history.length > 8) s.history.shift();
  s.shown = G.spineShownFor(s.day); s.day++; s.session = 0; s.checked = false; s.pauses = 0; s.suggestion = null; G.Save.save();
};
G.spineShownFor = d => { const row = G.DATA.dayOf(d); return row.hold ? G.S.shown : G.spineAge(); };
})();
