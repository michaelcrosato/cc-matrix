// Night Shift lobby, the hub session card, the results screen, the local board, and a small settings overlay for sessions.
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { TITLE } from '../config.js';
import { LocalSession, BroadcastBus, RtcBus, SEAT_COLORS } from '../net/local.js';
import { loadBoard } from '../core/save.js';
import { SettingsScreen } from './menus.js';
import { glyphName } from '../core/device.js';

const hexToName = (hex) => ({ '#e8443a': 'red', '#3b82f6': 'blue', '#22c55e': 'green', '#f5b700': 'sand' }[hex] || 'white');

/** A DOM textarea overlay for invite codes. Text can't be typed on a TV with a pad: the label says KEYBOARD NEEDED. */
export function codeOverlay({ title, text = '', readonly = false, submit = 'OK', onSubmit, onCancel }) {
  if (typeof document === 'undefined') return null;
  const el = document.createElement('div'); el.id = 'code-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.92);z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;font:14px monospace;color:#e8dcc0;gap:10px';
  el.innerHTML = `<div style="font-size:18px;color:#f5b700">${title} (KEYBOARD NEEDED)</div><textarea id="code-ta" rows="8" cols="64" style="font:12px monospace;background:#161628;color:#e8dcc0;border:2px solid #556"></textarea><div><button id="code-ok">${submit}</button> <button id="code-no">CANCEL</button></div>`;
  document.body.appendChild(el);
  const ta = el.querySelector('#code-ta'); ta.value = text; if (readonly) { ta.readOnly = true; ta.select(); }
  const close = () => { el.remove(); };
  el.querySelector('#code-ok').onclick = () => { const v = ta.value.trim(); close(); onSubmit?.(v); };
  el.querySelector('#code-no').onclick = () => { close(); onCancel?.(); };
  ta.focus();
  return el;
}

export class LobbyScreen {
  constructor(kind) { this.kind = kind; this.isLobby = true; this.st = { i: 0 }; this.session = null; this.hosts = []; this.msg = ''; this.remote = false; this.starting = false; this.bus = null; this.codes = {}; }
  enter() { this.open(false); }
  open(remote) {
    this.close(); this.remote = remote;
    try {
      this.bus = remote ? new RtcBus(this.kind === 'host', !(new URLSearchParams(location.search).get('g_nostun'))) : new BroadcastBus(`${'rh4'}-party`);
      this.session = new LocalSession(this.bus, { host: this.kind === 'host', name: this.kind === 'host' ? 'PLAYER 1' : 'GUEST' });
      this.session.on('hosts', (h) => { this.hosts = h; }); this.session.on('roster', () => {});
      this.session.on('start', () => { this.launch(); });
      this.session.on('end', (e) => { if (e.reason === 'host-left' && !this.launched) { this.msg = 'THE HOST LEFT.'; } });
    } catch (e) { this.msg = 'PARTIES NEED A BROWSER WITH BROADCASTCHANNEL.'; }
  }
  close() { if (this.session && !this.launched) this.session.leave(); this.session = null; }
  launch() { if (this.launched) return; this.launched = true; app.pop(); app.startShift?.({ session: this.session, solo: false }); }
  frame(host, ctx) {
    const W = ui.W, H = ui.H, nav = ui.nav; ui.rect(0, 0, W, H, 'ink');
    ui.text(W / 2, 14, this.kind === 'host' ? 'HOST PARTY' : 'JOIN PARTY', { align: 'center', scale: 3, color: 'sand' });
    ui.text(W / 2, 44, this.remote ? 'TWO COMPUTERS: INVITE CODES' : 'THIS COMPUTER: OTHER TABS AND WINDOWS FIND YOU AUTOMATICALLY', { align: 'center', color: 'mist' });
    const s = this.session;
    if (this.kind === 'host' && s) {
      for (let i = 0; i < 4; i++) { const p = s.players[i]; ui.rect(40, 66 + i * 22, W - 80, 18, p ? 'navy' : 'night'); ui.rect(40, 66 + i * 22, 6, 18, p ? hexToName(p.color) : 'slate'); ui.text(54, 71 + i * 22, p ? p.name + (i === 0 ? '  (HOST)' : '') : 'WAITING FOR A PLAYER...', { color: p ? 'white' : 'slate' }); }
      const rows = [{ label: 'START NIGHT SHIFT' }, { label: this.remote ? 'SWITCH TO THIS COMPUTER' : 'SWITCH TO TWO COMPUTERS (CODES)' }, ...(this.remote ? [{ label: 'MAKE AN INVITE CODE' }, { label: 'PASTE AN ANSWER CODE' }] : []), { label: 'BACK' }];
      const r = ui.list(Math.floor(W / 2) - 110, 160, 220, rows, this.st, { rowH: 16 });
      if (r.ok >= 0) {
        const l = rows[r.ok].label; ctx.audio.play('uiOk');
        if (l === 'START NIGHT SHIFT') { s.start(0); }
        else if (l.startsWith('SWITCH')) { this.open(!this.remote); }
        else if (l === 'MAKE AN INVITE CODE') this.makeInvite();
        else if (l === 'PASTE AN ANSWER CODE') this.pasteAnswer();
        else this.back();
      }
    } else if (this.kind === 'join') {
      if (!this.remote) {
        const rows = (this.hosts.length ? this.hosts : []).map((h) => ({ label: `${h.name} (${h.count}/4)` }));
        rows.push({ label: 'SWITCH TO INVITE CODE' }, { label: 'BACK' });
        if (!this.hosts.length) ui.text(W / 2, 70, 'LOOKING FOR HOSTS ON THIS COMPUTER...', { align: 'center', color: 'mist' });
        const r = ui.list(Math.floor(W / 2) - 110, 90, 220, rows, this.st, { rowH: 16 });
        if (r.ok >= 0) { ctx.audio.play('uiOk'); if (r.ok < this.hosts.length) { s.join(this.hosts[r.ok].id); this.msg = 'JOINED. WAITING FOR THE HOST TO START.'; } else if (r.ok === this.hosts.length) this.open(true); else this.back(); }
      } else {
        const rows = [{ label: 'PASTE AN INVITE CODE' }, { label: 'SWITCH TO THIS COMPUTER' }, { label: 'BACK' }];
        const r = ui.list(Math.floor(W / 2) - 110, 90, 220, rows, this.st, { rowH: 16 });
        if (r.ok >= 0) { ctx.audio.play('uiOk'); if (r.ok === 0) this.pasteInvite(); else if (r.ok === 1) this.open(false); else this.back(); }
      }
      if (s && s.players.length) { ui.text(W / 2, H - 50, `IN THE PARTY: ${s.players.length}`, { align: 'center', color: 'lime' }); }
    }
    if (this.msg) ui.text(W / 2, H - 34, this.msg, { align: 'center', color: 'sand' });
    if (nav.back) this.back();
    ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]);
  }
  back() { this.close(); app.pop(); }
  async makeInvite() {
    const slot = (this.nextSlot ||= 0); if (slot >= 3) { this.msg = 'ALL SEATS HAVE INVITES.'; return; }
    this.msg = 'MAKING AN INVITE...';
    try {
      const code = await this.bus.hostOffer(slot); this.nextSlot = slot + 1;
      this.bus.onopen = () => { this.msg = 'A GUEST CONNECTED.'; this.session.bus.cb && this.bus.send({ t: 'roster', players: this.session.players, to: 'all' }); };
      codeOverlay({ title: `INVITE CODE FOR SEAT ${slot + 2}: SEND IT TO YOUR FRIEND`, text: code, readonly: true, submit: 'DONE' });
    } catch (e) { this.msg = 'COULD NOT MAKE A CODE: ' + e.message; }
  }
  pasteAnswer() { const slot = Math.max(0, (this.nextSlot || 1) - 1); codeOverlay({ title: 'PASTE THE ANSWER CODE', onSubmit: async (v) => { try { await this.bus.hostAccept(slot, v); this.msg = 'CONNECTING...'; } catch (e) { this.msg = 'BAD CODE.'; } } }); }
  pasteInvite() {
    codeOverlay({ title: 'PASTE THE INVITE CODE', onSubmit: async (v) => {
      try { const answer = await this.bus.guestAnswer(v); this.bus.onopen = () => { this.session.join('*'); this.msg = 'CONNECTED. WAITING FOR THE HOST.'; }; codeOverlay({ title: 'SEND THIS ANSWER CODE BACK TO THE HOST', text: answer, readonly: true, submit: 'DONE' }); } catch (e) { this.msg = 'BAD CODE.'; }
    } });
  }
}

/** The hub's round card: ours, with the game's name, players in colour, how to win, controls, time left. */
export class HubCard {
  constructor(session) { this.s = session; this.left = null; this.ready = []; this.asked = false; this.live = false; this.started = false; session.on('card', (c) => { this.left = c.left; this.ready = c.ready || []; this.asked = c.asked; }); session.on('start', () => { this.started = true; }); }
  frame(host, ctx) {
    const W = ui.W, H = ui.H, s = this.s; ui.rect(0, 0, W, H, 'ink');
    ui.text(W / 2, 12, TITLE, { align: 'center', scale: 3, color: 'sand' });
    ui.text(W / 2, 42, 'NIGHT SHIFT: HOLD THE QUAY TOGETHER UNTIL DAWN', { align: 'center', color: 'orange' });
    (s.players || []).forEach((p, i) => { const y = 62 + i * 14; ui.rect(60, y, 8, 10, hexToName(p.color)); ui.text(74, y + 1, p.name || ('PLAYER ' + (i + 1)), { color: 'white' }); ui.text(W - 60, y + 1, this.ready.includes(p.id) ? 'READY' : '...', { align: 'right', color: this.ready.includes(p.id) ? 'lime' : 'slate' }); });
    ui.text(60, 128, 'HOW TO WIN: SURVIVE FOUR MINUTES. REVIVE EACH OTHER.', { color: 'mist' });
    ui.text(60, 142, 'MOVE: STICK / WASD   AIM: L2 / RIGHT MOUSE   FIRE: R2 / LEFT MOUSE', { color: 'mist' });
    ui.text(60, 154, 'KICK A STUNNED ENEMY: ' + glyphName('action') + '   RELOAD: ' + glyphName('reload'), { color: 'mist' });
    if (this.left !== null) ui.text(W / 2, H - 50, 'STARTS IN ' + Math.ceil(this.left / 1000) + ' S', { align: 'center', color: 'sand' });
    ui.prompts([['ready', 'READY'], ['more', 'MORE TIME']]);
    const i = ctx.input;
    if (i.wasPressed('Enter', 'PadCross')) { s.answer?.('ready'); ctx.audio.play('uiOk'); }
    if (i.wasPressed('KeyM', 'PadTriangle')) { s.answer?.('more'); }
    for (const e of i.buttonEvents || []) if (e.down) s.answer?.('ready');
    if (this.started) app.pop();
  }
}
export class SettingsOverlay extends SettingsScreen { constructor() { super(); this.live = true; } }

export class ResultsScreen {
  constructor(area) { this.a = area; this.t = 0; this.live = false; }
  frame(host, ctx) {
    const W = ui.W, H = ui.H, r = this.a.results; if (!r) return; this.t += 1 / 60; ui.rect(0, 0, W, H, 'ink');
    ui.text(W / 2, 12, r.won ? 'DAWN. THE HORN SOUNDS.' : 'THE SHIFT IS OVER', { align: 'center', scale: 2, color: r.won ? 'lime' : 'red' });
    ui.text(W / 2, 34, r.won ? 'EVERYONE WALKED INTO THE SEA. YOU DID NOT.' : 'CLAIM DENIED', { align: 'center', color: 'mist' });
    const seats = this.a.session ? this.a.session.players : [{ id: 0, name: 'MAX' }];
    let y = 54; let place = 1;
    for (const grp of r.standings) for (const id of grp) {
      const s = seats.find((q) => q.id === id) || { name: 'PLAYER' }; const st = r.stats[id] || {};
      ui.rect(30, y, W - 60, 30, 'night'); ui.text(36, y + 4, `${place}. ${s.name}`, { color: 'white' }); ui.text(W - 36, y + 4, String(r.scores[id] || 0), { align: 'right', color: 'sand', scale: 2 });
      ui.text(36, y + 18, `KILLS ${st.Kills ?? 0}  HEADS ${st.Heads ?? 0}  KICKS ${st.Kicks ?? 0}  REVIVES ${st.Revives ?? 0}  ACC ${st.Accuracy ?? '0%'}`, { color: 'mist' });
      y += 34;
    }
    place++;
    for (const aw of r.awards.slice(0, 3)) { ui.text(W / 2, y + 2, `${aw.title}: ${aw.detail}`, { align: 'center', color: 'orange' }); y += 11; }
    if (!app.hub) { ui.prompts([['confirm', 'BACK TO TITLE']]); if (ui.nav.ok || ui.nav.click) { app.pop(); this.a.session?.leave?.(); host.quitToTitle?.(); } }
    else ui.text(W / 2, H - 16, 'THE HUB IS TALLYING...', { align: 'center', color: 'slate' });
  }
}
export class BoardScreen {
  frame(host, ctx) {
    const W = ui.W, H = ui.H; ui.rect(0, 0, W, H, 'ink'); ui.text(W / 2, 14, 'LOCAL BOARD', { align: 'center', scale: 3, color: 'sand' });
    const b = loadBoard(); if (!b.length) ui.text(W / 2, 80, 'NO SHIFTS WORKED YET.', { align: 'center', color: 'mist' });
    b.slice(0, 8).forEach((e, i) => { ui.text(60, 50 + i * 16, `${i + 1}. ${e.name}`, { color: 'white' }); ui.text(W - 60, 50 + i * 16, `${e.score}${e.won ? '  DAWN' : ''}`, { align: 'right', color: e.won ? 'lime' : 'sand' }); });
    if (ui.nav.back || ui.nav.ok) app.pop(); ui.prompts([['back', 'BACK']]);
  }
}
app.ResultsScreen = ResultsScreen; app.BoardScreen = BoardScreen; app.SettingsOverlay = SettingsOverlay;
