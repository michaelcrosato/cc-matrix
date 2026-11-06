// Night Shift: SOLO, HOST PARTY, JOIN PARTY. The same-computer lobby lists hosts by itself. Invite codes for two computers.
import { LocalSession } from '../net/local.js';
import { ShiftArena } from '../net/shift.js';
import { save } from '../core/save.js';
export class LobbyScreen {
  constructor(app) { this.app = app; this.s = { focus: 0 }; this.mode = 'menu'; this.done = false; this.noAttract = false; }
  update(ui) {
    ui.rect(0, 0, ui.W, ui.H, 'ink'); ui.center(22, 'NIGHT SHIFT', { scale: 2, color: 'sand' }); ui.center(44, 'FOUR MINUTES ON THE QUAY. HOLD UNTIL DAWN.', { color: 'mist' }); this.noAttract = this.mode !== 'menu'; this[`m_${this.mode}`](ui);
  }
  launch(session) { this.app.session = session; this.done = true; this.dropDom(); this.app.load(new ShiftArena(this.app, session, {})); }
  m_menu(ui) {
    const b = save.get('board', []); if (b.length) ui.center(58, `BEST SHIFT ${b[0]}`, { color: 'sand' }); const items = [{ label: 'SOLO' }, { label: 'HOST PARTY' }, { label: 'JOIN PARTY' }, { label: 'BACK' }]; const i = ui.list(this.s, items, { x: ui.W / 2 - 70, y: 76, w: 140, rowH: 19 }); ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]);
    if (ui.back || i === 3) { this.done = true; ui.sound('uiback'); }
    if (i === 0) { const S = LocalSession.solo(); S.start(); this.launch(S); }
    if (i === 1) { this.S = LocalSession.host(); this.mode = 'host'; this.s = { focus: 0 }; this.S.on('started', () => {}); }
    if (i === 2) { this.S = LocalSession.browser(); this.mode = 'join'; this.s = { focus: 0 }; this.S.on('started', () => this.launch(this.S)); this.S.on('lobby', () => { this.joined = true; }); }
  }
  m_host(ui) {
    const S = this.S; ui.center(60, 'SEATS', { color: 'white' }); S.lobby.forEach((p, i) => ui.center(74 + i * 11, `${i + 1}. ${p.name}`, { color: 'mist' })); const items = [{ label: 'START', disabled: false }, { label: 'INVITE CODE (ANOTHER COMPUTER)' }, { label: 'BACK' }]; const i = ui.list(this.s, items, { x: ui.W / 2 - 120, y: 130, w: 240, rowH: 18 }); ui.center(190, 'ANOTHER WINDOW ON THIS COMPUTER FINDS THIS PARTY BY ITSELF.', { color: 'slate' }); ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]);
    if (i === 0) { S.start(); this.launch(S); } if (i === 1) this.hostInvite(); if (i === 2 || ui.back) { S.close(); this.dropDom(); this.mode = 'menu'; this.s = { focus: 1 }; }
  }
  m_join(ui) {
    const S = this.S; const now = performance.now(); const hosts = [...S.hosts.values()].filter((h) => now - h.at < 1500); if (this.joined) { ui.center(70, 'IN THE PARTY. WAITING FOR THE HOST.', { color: 'lime' }); S.lobby.forEach((p, i) => ui.center(86 + i * 11, `${i + 1}. ${p.name}`, { color: 'mist' })); ui.prompts([['back', 'LEAVE']]); if (ui.back) { S.leave(); this.mode = 'menu'; this.s = { focus: 2 }; this.joined = false; } return; }
    const items = [...hosts.map((h) => ({ label: `PARTY ${h.key.slice(0, 4).toUpperCase()}`, value: `${h.seats}/4`, h })), { label: 'I HAVE AN INVITE CODE' }, { label: 'BACK' }]; ui.center(60, hosts.length ? 'PARTIES ON THIS COMPUTER' : 'LOOKING FOR PARTIES', { color: 'white' }); const i = ui.list(this.s, items, { x: ui.W / 2 - 110, y: 80, w: 220, rowH: 18 }); ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]);
    if (i >= 0) { const it = items[i]; if (it.h) S.join(it.h.key); else if (it.label.startsWith('I HAVE')) this.guestInvite(); else { S.close(); this.dropDom(); this.mode = 'menu'; this.s = { focus: 2 }; } } else if (ui.back) { S.close(); this.dropDom(); this.mode = 'menu'; this.s = { focus: 2 }; }
  }
  // Invite codes: a small DOM overlay is the one allowed exception to pixel UI. Text can't be typed on a TV with a pad.
  dom(title, value, onPaste, label) {
    this.dropDom(); if (typeof document === 'undefined') return; const d = document.createElement('div'); d.id = 'g-invite'; d.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:50;background:#1a1c2c;color:#f4f4f4;border:2px solid #ffcd75;padding:14px;font:14px monospace;width:min(560px,90vw)'; const h = document.createElement('div'); h.textContent = `KEYBOARD NEEDED. ${title}`; const t = document.createElement('textarea'); t.id = 'g-code'; t.rows = 6; t.style.cssText = 'width:100%;margin:8px 0;background:#000;color:#a7f070;font:12px monospace'; t.value = value ?? ''; const b = document.createElement('button'); b.id = 'g-ok'; b.textContent = label ?? 'OK'; const c = document.createElement('button'); c.id = 'g-close'; c.textContent = 'CLOSE'; c.style.marginLeft = '8px'; b.onclick = () => onPaste?.(t.value); c.onclick = () => this.dropDom(); d.append(h, t, b, c); document.body.append(d); this.domEl = d; return t;
  }
  dropDom() { this.domEl?.remove(); this.domEl = null; }
  async hostInvite() { const S = this.S; const offer = await S.makeOffer(); this.dom('COPY THIS CODE TO YOUR FRIEND, THEN PASTE THEIR ANSWER HERE.', offer, async (code) => { await S.acceptAnswer(code); this.dropDom(); }, 'ACCEPT ANSWER'); }
  guestInvite() { const S = this.S; this.dom('PASTE THE HOST INVITE CODE.', '', async (code) => { const ans = await S.answerOffer(code); this.dom('SEND THIS ANSWER BACK TO THE HOST.', ans, null, 'OK'); this.joined = true; }, 'MAKE ANSWER'); }
}
