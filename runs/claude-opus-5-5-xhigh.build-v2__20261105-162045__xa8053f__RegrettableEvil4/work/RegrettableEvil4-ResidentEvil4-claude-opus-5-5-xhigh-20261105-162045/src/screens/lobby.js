// Night Shift from the title: SOLO, HOST PARTY, JOIN PARTY. A hub session goes straight to the card.
import { app, goto } from '../core/app.js';
import { Engine } from '../../pixel-engine.js';
import { LocalSession } from '../net/local.js';
import { ShiftArena } from '../net/shift.js';
import { loadBoard } from '../core/save.js';
import { SLUG } from '../config.js';

const stun = () => {
  const noStun = typeof location !== 'undefined' && new URLSearchParams(location.search).has('g_nostun');
  return noStun ? [] : [{ urls: 'stun:stun.l.google.com:19302' }];
};

export function startSolo() {
  const session = LocalSession.solo();
  return goto(new ShiftArena({ session }));
}

/** The DOM overlay for codes: the one exception to the pixel UI. Text can't be typed on a TV with a pad anyway. */
function codeBox(label, value, onSubmit, submitLabel = 'USE THIS CODE') {
  if (typeof document === 'undefined') return { close() {} };
  // They stack from the bottom of the window, so a small window can't push a button off the screen.
  let stack = document.getElementById('g-codebox-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'g-codebox-stack';
    stack.style.cssText = 'position:fixed;left:50%;bottom:6px;transform:translateX(-50%);width:min(90vw,640px);max-height:96vh;overflow:auto;display:flex;flex-direction:column;gap:6px;z-index:50';
    document.body.append(stack);
  }
  const box = document.createElement('div');
  box.id = 'g-codebox';
  box.style.cssText = 'background:#1a1c2c;border:2px solid #566c86;padding:8px;color:#f4f4f4;font:bold 13px monospace';
  const l = document.createElement('div');
  l.textContent = label;
  l.style.marginBottom = '6px';
  const ta = document.createElement('textarea');
  ta.value = value ?? '';
  ta.readOnly = !onSubmit;
  ta.style.cssText = 'width:100%;height:70px;background:#333c57;color:#f4f4f4;border:0;font:11px monospace';
  box.append(l, ta);
  if (onSubmit) {
    const b = document.createElement('button');
    b.textContent = submitLabel;
    b.style.cssText = 'margin-top:6px;padding:6px 12px;background:#ef7d57;border:0;color:#1a1c2c;font:bold 13px monospace;cursor:pointer';
    b.onclick = () => onSubmit(ta.value);
    box.append(b);
  } else {
    ta.onfocus = () => ta.select();
  }
  stack.append(box);
  return { ta, close() { box.remove(); if (!stack.children.length) stack.remove(); } };
}

export function openNightShiftMenu() {
  const screen = {
    frozen: false,
    lobby: false,
    name: 'nightshift',
    update(ctx, ui) {
      ui.dim();
      ui.heading('NIGHT SHIFT', 18);
      ui.centerText(50, 'HOLD THE QUAY UNTIL DAWN. FOUR MINUTES.', { color: 'mist' });
      const w = 220; const x = (ui.W - w) >> 1;
      let y = 72;
      if (ui.item('solo', x, y, w, 'SOLO')) { ctx.audio.play('uiConfirm'); app.close(screen); startSolo(); return; }
      y += 22;
      if (ui.item('host', x, y, w, 'HOST PARTY')) { ctx.audio.play('uiConfirm'); openHostLobby(); return; }
      y += 22;
      if (ui.item('join', x, y, w, 'JOIN PARTY')) { ctx.audio.play('uiConfirm'); openJoinLobby(); return; }
      y += 28;
      const board = loadBoard();
      if (board.length) {
        ui.centerText(y, 'BEST SHIFTS', { color: 'sand' });
        board.slice(0, 3).forEach((b, i) => ui.centerText(y + 10 + i * 9, `${b.score}  ${b.kills} KILLS  ${b.won ? 'DAWN' : 'LOST'}`, { color: 'mist' }));
      }
      ui.promptBar([['confirm', 'SELECT'], ['back', 'BACK']]);
      if (ui.nav.back) { ctx.audio.play('uiBack'); app.close(screen); }
    },
  };
  app.open(screen);
  return screen;
}

export function openHostLobby() {
  const session = new LocalSession();
  session.hostParty();
  let code = null;
  let box = null;
  let status = '';
  session.on('go', () => {});
  const screen = {
    frozen: false,
    lobby: true,
    name: 'lobby-host',
    session,
    start() {
      box?.close();
      app.close(screen);
      session.launch();
      goto(new ShiftArena({ session }));
    },
    async makeCode() {
      status = 'PREPARING A CODE...';
      code = await session.createInvite(stun());
      box?.close();
      box = codeBox('KEYBOARD NEEDED. SEND THIS CODE, THEN PASTE THEIR ANSWER BELOW.', code);
      const answerBox = codeBox('PASTE THE ANSWER CODE HERE', '', async (v) => { await session.acceptAnswer(v); status = 'CONNECTING...'; answerBox.close(); });
      screen.answerBox = answerBox;
      status = 'CODE READY';
    },
    update(ctx, ui) {
      ui.dim();
      ui.heading('HOST A PARTY', 12);
      ui.centerWrap(44, 'OPEN THE GAME IN ANOTHER TAB ON THIS COMPUTER, OR SEND A CODE.', { color: 'mist' });
      const { hud, W } = ui;
      let y = 60;
      for (let i = 0; i < 4; i++) {
        const p = session.players[i];
        hud.rect((W >> 1) - 100, y, 200, 15, 'ink');
        ui.text((W >> 1) - 92, y + 4, p ? p.name : `SEAT ${i + 1}: EMPTY`, { color: p ? ['red', 'sky', 'lime', 'sand'][i] : 'slate' });
        y += 17;
      }
      const w = 220; const x = (W - w) >> 1;
      y += 6;
      if (ui.item('start', x, y, w, 'START THE SHIFT', { disabled: false })) { ctx.audio.play('uiConfirm'); screen.start(); return; }
      y += 21;
      if (ui.item('code', x, y, w, 'MAKE AN INVITE CODE', { scale: 1 })) { screen.makeCode(); }
      if (status) ui.centerText(y + 22, status, { color: 'sand' });
      ui.promptBar([['confirm', 'SELECT'], ['back', 'CANCEL']]);
      if (ui.nav.back) { box?.close(); screen.answerBox?.close(); session.close(); app.close(screen); }
    },
    onClose() { box?.close(); screen.answerBox?.close(); },
  };
  app.open(screen);
  return screen;
}

export function openJoinLobby() {
  const session = new LocalSession();
  let hosts = [];
  const unwatch = LocalSession.watchHosts((list) => { hosts = list; });
  let box = null;
  let answerBox = null;
  let status = '';
  let waiting = false;
  session.on('go', (m) => {
    box?.close(); answerBox?.close();
    if (m.players) session.players = m.players;
    if (m.seed !== undefined) session.seed = m.seed;
    app.close(screen);
    unwatch();
    goto(new ShiftArena({ session }));
  });
  session.on('joined', () => { status = 'CONNECTED. WAITING FOR THE HOST.'; waiting = true; answerBox?.close(); });
  const screen = {
    frozen: false,
    lobby: true,
    name: 'lobby-join',
    session,
    joinHost(pid) { session.joinBroadcast(pid); waiting = true; status = 'WAITING FOR THE HOST.'; },
    pasteCode() {
      box?.close();
      box = codeBox('KEYBOARD NEEDED. PASTE THE HOST\'S CODE.', '', async (v) => {
        box.close();
        status = 'PREPARING AN ANSWER...';
        const answer = await session.joinWithInvite(v, stun());
        answerBox = codeBox('SEND THIS ANSWER BACK TO THE HOST', answer);
        status = 'WAITING FOR THE HOST TO PASTE IT.';
      });
    },
    async joinWithCode(v) { return session.joinWithInvite(v, stun()); },
    update(ctx, ui) {
      ui.dim();
      ui.heading('JOIN A PARTY', 12);
      const w = 240; const x = (ui.W - w) >> 1;
      let y = 54;
      if (waiting) {
        ui.centerText(y, status, { color: 'sand' });
        y += 14;
        session.players.forEach((p, i) => { ui.centerText(y + i * 11, p.name, { color: ['red', 'sky', 'lime', 'sand'][p.id % 4] }); });
      } else {
        const now = typeof performance !== 'undefined' ? performance.now() : 0;
        const live = hosts.filter((h) => now - h.at < 1800);
        if (!live.length) ui.centerText(y, 'LOOKING FOR PARTIES ON THIS COMPUTER...', { color: 'mist' });
        live.slice(0, 4).forEach((h, i) => {
          if (ui.item(`h${h.pid}`, x, y + i * 21, w, `PARTY ${i + 1}: ${h.seats}/4`)) { ctx.audio.play('uiConfirm'); screen.joinHost(h.pid); }
        });
        y += 90;
        if (ui.item('paste', x, y, w, 'PASTE AN INVITE CODE', { scale: 1 })) screen.pasteCode();
        if (status) ui.centerText(y + 20, status, { color: 'sand' });
      }
      ui.promptBar([['confirm', 'SELECT'], ['back', 'CANCEL']]);
      if (ui.nav.back) { box?.close(); answerBox?.close(); unwatch(); session.close(); app.close(screen); }
    },
    onClose() { box?.close(); answerBox?.close(); },
  };
  app.open(screen);
  return screen;
}

/** The results, from the same object `finish` takes. Standalone only: in a session the hub shows them. */
export function openResults(area, res, reason) {
  const session = area.session;
  const screen = {
    frozen: false,
    name: 'results',
    res,
    reason,
    update(ctx, ui) {
      const { hud, W } = ui;
      ctx.hud.clear();
      hud.rect(0, 0, W, ui.H, 'ink');
      const title = reason === 'host-left' ? 'THE HOST WENT HOME' : res?.won ? 'DAWN' : 'SHIFT OVER';
      ui.heading(title, 12, 0, W, res?.won ? 'sand' : 'red');
      let y = 54;
      if (res?.standings) {
        for (const group of res.standings) {
          for (const id of group) {
            const p = session.players.find((q) => q.id === id);
            const st = res.stats?.[id] ?? {};
            ui.text(30, y, p?.name ?? `SEAT ${id}`, { scale: 1, color: ['red', 'sky', 'lime', 'sand'][id % 4] });
            ui.text(130, y, `${st.Score ?? 0}  KILLS ${st.Kills ?? 0}  HEADS ${st.Heads ?? 0}  KICKS ${st.Kicks ?? 0}  ${st.Accuracy ?? ''}`, { color: 'white' });
            y += 13;
          }
        }
      }
      y += 8;
      for (const a of res?.awards ?? []) {
        const p = session.players.find((q) => q.id === a.id);
        ui.centerText(y, `${a.title.toUpperCase()}: ${p?.name ?? ''} (${String(a.detail).toUpperCase()})`, { color: 'sand' });
        y += 11;
      }
      if (ui.item('done', (W >> 1) - 100, ui.H - 44, 200, 'BACK TO THE TITLE')) { session.close?.(); app.closeAll(); app.scenes.title(); }
      ui.promptBar([['confirm', 'FINISH']]);
    },
  };
  app.open(screen);
  return screen;
}

/** A hub session: straight to the card, no title, menus or attract. */
export async function startSessionRound(info, startOptions) {
  const session = window.AIHub;
  app.hub = true;
  app.session = session;
  const game = new ShiftArena({ session, hub: true, info });
  return Engine.start(game, startOptions({ seed: info.seed }));
}
export { SLUG };
