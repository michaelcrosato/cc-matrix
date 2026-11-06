// The Visit menus: Open my gate, Visit a friend, on one computer or by Gate Pass.
import { Menu } from '../ui/ui.js';
import { panel, drawText, dim, wrap, textBlock } from '../ui/draw.js';
import { loadWorld } from '../core/save.js';
import { BroadcastTransport, RtcTransport, VisitSession } from './visit.js';
import { continueGame, installWorld } from '../systems/newgame.js';
import { rebuildAllObjects } from '../world/objectsView.js';

const box = () => {
  // A pixel-styled DOM textarea for pasting codes: it needs a keyboard, and says so.
  if (typeof document === 'undefined') return null;
  let t = document.getElementById('gate-code');
  if (!t) {
    t = document.createElement('textarea');
    t.id = 'gate-code';
    t.style.cssText = 'position:fixed;left:18%;top:42%;width:64%;height:22%;background:#f4f4f4;color:#1a1c2c;border:6px solid #ffcd75;font:bold 16px monospace;z-index:30;padding:8px;outline:none;';
    t.spellcheck = false;
    document.body.appendChild(t);
  }
  t.style.display = 'block';
  return t;
};
const hideBox = () => { const t = typeof document !== 'undefined' && document.getElementById('gate-code'); if (t) t.style.display = 'none'; };
class CodeScreen {
  constructor({ title, text, readOnly, value = '', onDone, onCancel, allowCopy }) {
    this.id = 'gateCode'; this.title = title; this.text = text; this.readOnly = readOnly; this.onDone = onDone; this.onCancel = onCancel; this.allowCopy = allowCopy; this.value = value; this.copied = false;
  }
  labels() { return ['OK', 'Copy']; }
  open(g) {
    this.g = g;
    g.ctx.input.preventKeys.delete('Backspace'); // so the box can rub out
    this.el = box();
    if (this.el) { this.el.value = this.value; this.el.readOnly = !!this.readOnly; this.el.focus(); if (this.readOnly) this.el.select(); this.el.oninput = () => { this.value = this.el.value; }; }
  }
  close() { hideBox(); this.g?.ctx.input.preventKeys.add('Backspace'); }
  currentText() { return this.el?.value ?? this.value; }
  update(g, inp) {
    const input = g.ctx.input;
    // Enter finishes; Escape backs out; while the box has focus keys type into it.
    if (input.wasPressed('Enter') || input.wasPressed('PadCross')) { if (this.el) this.value = this.el.value; g.sound('uiConfirm'); g.ui.pop(this); this.onDone?.(this.value); return; }
    if (input.wasPressed('Escape') || input.wasPressed('PadCircle')) { g.sound('uiCancel'); g.ui.pop(this); this.onCancel?.(); return; }
    if (this.allowCopy && (input.wasPressed('KeyC') || input.wasPressed('PadSquare')) && this.readOnly) { navigator.clipboard?.writeText(this.value).catch(() => {}); this.el?.select(); this.copied = true; g.sound('stamp'); }
  }
  prompts() { return [['confirm', this.readOnly ? 'Done' : 'Go'], ['back', 'Back']]; }
  draw(g, hud) {
    dim(hud);
    panel(hud, 60, 24, 360, 216, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 34, this.title, { align: 'center', color: 'ink', scale: 2 });
    textBlock(hud, 76, 62, 330, this.text, { color: 'slate' });
    if (this.allowCopy) drawText(hud, 240, 222, this.copied ? 'Copied. Or select it and copy by hand.' : 'Press C to copy, or select it by hand.', { align: 'center', color: 'plum' });
  }
}
/** The host opens their gate on their own save. */
export function openGate(g, kind) {
  const saved = loadWorld();
  if (!saved) { g.ui.toastMsg('You need a village first. Try New Arrival.'); return; }
  continueGame(g);
  if (kind === 'local') {
    const t = new BroadcastTransport('host');
    t.hostName = g.world.player.name;
    const s = new VisitSession(g, t, 'host');
    g.events.emit('gateOpen', { kind });
    g.ui.toastMsg('Your gate is open. A second window on this computer can visit.');
    return s;
  }
  const t = new RtcTransport('host');
  const s = new VisitSession(g, t, 'host');
  g.scripts.run(hostRtcFlow(g, t), { name: 'gatePass' });
  return s;
}
function* hostRtcFlow(g, t) {
  let code = null;
  t.makePass().then((c) => { code = c; });
  g.ui.toastMsg('Writing your Gate Pass…');
  while (code === null) yield;
  let closed = false;
  g.ui.push(new CodeScreen({ title: 'Your Gate Pass', text: 'Send this to your friend, however friends send things. Then paste the Reply Slip they send back. This is a very long friend code, and we are sorry. A little.', readOnly: true, value: code, allowCopy: true, onDone: () => { closed = true; }, onCancel: () => { closed = true; } }));
  while (!closed) yield;
  let reply = null;
  g.ui.push(new CodeScreen({ title: 'Their Reply Slip', text: 'Paste what they sent. It needs a keyboard. Sorry about that too.', readOnly: false, onDone: (v) => { reply = v; }, onCancel: () => { reply = ''; } }));
  while (reply === null) yield;
  if (reply) t.acceptReply(reply).catch(() => g.ui.toastMsg("That Reply Slip doesn't read right."));
}
/** A guest's temporary profile: only pockets and beans come along. */
function guestProfile() {
  const saved = loadWorld();
  return { name: saved?.player.name ?? 'Visitor', beans: saved?.player.beans ?? 500, pockets: saved?.player.pockets ?? Array(15).fill(null), look: saved?.player.look ?? null };
}
export function visitFriendLocal(g, onList) {
  g.guestProfile = guestProfile();
  const t = new BroadcastTransport('guest', null, (m) => onList?.(m, t));
  return t;
}
function localGuestMenu(g) {
  const seen = new Map();
  const items = [{ label: 'Looking for gates…', disabled: true }, { label: 'Back', action: (gg, m) => { t.close(); gg.ui.pop(m); } }];
  let m = null;
  const t = visitFriendLocal(g, (gate) => {
    if (seen.has(gate.id)) return;
    seen.set(gate.id, gate);
    items.unshift({ label: `${gate.name}'s village`, action: (gg, mm) => { gg.ui.pop(mm); joinLocal(gg, t, gate.id); } });
    if (m) { m.items = items; m.focus = 0; }
  });
  m = new Menu({ id: 'visitLocal', title: 'Gates on this computer', items, x: 110, y: 90, w: 260, back: (gg, mm) => { t.close(); gg.ui.pop(mm); } });
  return m;
}
export function joinLocal(g, t, gateId) {
  g.guestProfile ??= guestProfile();
  const s = new VisitSession(g, t, 'guest');
  s.hostId = gateId;
  t.joinGate(gateId, { name: g.guestProfile.name });
  g.ui.toastMsg('You wait at the stop. The bus comes.');
  return s;
}
function* guestRtcFlow(g) {
  g.guestProfile = guestProfile();
  let pass = null;
  g.ui.push(new CodeScreen({ title: 'Their Gate Pass', text: 'Paste the Gate Pass your friend sent. It needs a keyboard.', readOnly: false, onDone: (v) => { pass = v; }, onCancel: () => { pass = ''; } }));
  while (pass === null) yield;
  if (!pass) return;
  const t = new RtcTransport('guest');
  const s = new VisitSession(g, t, 'guest');
  s.hostId = 'host';
  let slip = null;
  t.answerPass(pass).then((c) => { slip = c; }).catch(() => { slip = ''; });
  while (slip === null) yield;
  if (!slip) { g.ui.toastMsg("That Gate Pass doesn't read right."); s.leave(); return; }
  t.on('open', () => t.joinGate(null, { name: g.guestProfile.name }));
  let closed = false;
  g.ui.push(new CodeScreen({ title: 'Your Reply Slip', text: 'Send this back to your friend. When they paste it, the bus comes.', readOnly: true, value: slip, allowCopy: true, onDone: () => { closed = true; }, onCancel: () => { closed = true; } }));
  while (!closed) yield;
}
export function visitMenu(g) {
  const items = [
    { label: 'Open my gate, on this computer', action: (gg) => openGate(gg, 'local') },
    { label: 'Open my gate, by Gate Pass', action: (gg) => openGate(gg, 'rtc') },
    { label: 'Visit a friend, on this computer', action: (gg) => gg.ui.push(localGuestMenu(gg)) },
    { label: 'Visit a friend, by Gate Pass', action: (gg, m) => { gg.scripts.run(guestRtcFlow(gg), { name: 'gatePassGuest' }); } },
    { label: 'Back', action: (gg, m) => gg.ui.pop(m) },
  ];
  return new Menu({ id: 'visit', title: 'Visit', items, x: 90, y: 80, w: 300, back: (gg, m) => gg.ui.pop(m) });
}
/** For tools: the same transports and sessions the menus use, without typing. */
export function visitHandle(g) {
  const v = {
    gates: [],
    openGate: (kind) => openGate(g, kind),
    findGates: () => { v.t = visitFriendLocal(g, (gate) => { if (!v.gates.some((x) => x.id === gate.id)) v.gates.push(gate); }); },
    joinFirst: (profile) => { g.guestProfile = profile; v.session = joinLocal(g, v.t, v.gates[0].id); },
    openRtcHost: async () => { const t = new RtcTransport('host'); v.t = t; v.session = new VisitSession(g, t, 'host'); return t.makePass(); },
    answerRtc: async (code, profile) => { g.guestProfile = profile; const t = new RtcTransport('guest'); v.t = t; v.session = new VisitSession(g, t, 'guest'); v.session.hostId = 'host'; t.on('open', () => t.joinGate(null, { name: profile.name })); return t.answerPass(code); },
    acceptRtc: (slip) => v.t.acceptReply(slip),
  };
  return v;
}
export { CodeScreen, wrap, installWorld, rebuildAllObjects };
