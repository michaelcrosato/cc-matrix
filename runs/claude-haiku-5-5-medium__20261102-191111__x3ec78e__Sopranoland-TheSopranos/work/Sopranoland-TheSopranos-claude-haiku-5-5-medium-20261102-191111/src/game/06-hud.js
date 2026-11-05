// ---------------------------------------------------------------------------------------------
// 06 · HUD AND MUSIC — the play screen's readouts (hearts, stress, heat, cash, shells, the
// objective, the prompt for what the hero can use, the hub's countdown), and the songs.
// Prompts ask game.input.label() for the key or button in use, so a pad shows its own symbols.
// ---------------------------------------------------------------------------------------------
function drawHUD(r, opts = {}) {
  const I = game.input, Wd = r.W, Ht = r.H;
  const ch = CHAPTERS[S.chapter] || CHAPTERS[1];
  r.overlay(g => {
    // top-left: the hero's health (hearts), the stress and the heat
    E.ui.hearts(g, 6, 6, S.hp / 20, 5);
    E.font.text(g, 'STRESS', 6, 22, '#c8a8e8', { shadow: '#000' });
    E.ui.bar(g, 48, 22, 64, 5, S.stress / 100, S.stress >= 80 ? '#ff4060' : '#a070e0');
    if (S.heat > 0 || S.chapter === 5) {
      E.font.text(g, 'HEAT', 6, 32, '#ffb060', { shadow: '#000' });
      E.ui.bar(g, 48, 32, 64, 5, S.heat / 100, '#ff8040');
    }
    // the panic: the screen's edge darkens red when the stress is high
    if (S.stress >= 80 || W.panicT > 0) E.ui.box(g, 0, 0, Wd, Ht, { bg: '#3a0010', border: false, gradient: false, alpha: .18 + (W.panicT > 0 ? .15 : 0) });
  });
  r.text('$' + S.cash.toLocaleString('en-US'), Wd - 6, 6, '#ffe08a', { align: 'right', shadow: '#000' });
  r.text('SHELLS ' + S.ammo, Wd - 6, 16, '#e8e0c0', { align: 'right', shadow: '#000' });
  r.text('DUCKS ' + S.ducks + '/' + DUCKS.length, Wd - 6, 26, '#f4e080', { align: 'right', shadow: '#000' });
  if (HUB) r.text(HUB.time() >= 0 ? fmtTime(HUB.time()) : 'READY', Wd - 6, 36, '#e8e0f0', { align: 'right', shadow: '#000' });
  // top-center: the chapter and its objective
  r.text(ch.title, Wd / 2, 6, '#ffd36a', { align: 'center', shadow: '#000' });
  r.text(ch.goal, Wd / 2, 17, '#f4eee0', { align: 'center', shadow: '#000' });
  if (ATTRACT) r.text('ATTRACT  •  PRESS ANY BUTTON', Wd / 2, Ht - 10, '#ffd36a', { align: 'center', shadow: '#000' });
  if (W.toast && !ATTRACT) r.text(W.toast, Wd / 2, Ht * .72, '#ffffff', { align: 'center', shadow: '#000', outline: true });
  // the prompt for what the hero can use, and the keys for the rest, on the player's device
  const it = (!talk.open && !conv) ? nearestInteractable() : null;
  if (it && !ATTRACT) r.text(I.label('interact') + '  ' + it.label, Wd / 2, Ht - 22, '#ffe08a', { align: 'center', shadow: '#000', outline: true });
  if (!ATTRACT && !talk.open) r.text(I.label('attack') + ' bat   ' + I.label('use') + ' piece   ' + I.label('dodge') + ' roll   ' + I.label('view') + ' view', 6, Ht - 10, '#c8c0d8', { shadow: '#000' });
  if (opts.hubCountdown) r.text(opts.hubCountdown, Wd / 2, Ht / 2 - 40, '#ffe08a', { align: 'center', shadow: '#000', outline: true, scale: 2 });
}

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ---- music --------------------------------------------------------------------------------------
// The songs are written as the engine's tracks: notes (a 16-step bar each), and drum patterns.
const SONGS = {
  title: { bpm: 76, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'A3 - - - C4 - - - E4 - - - D4 - - - | F3 - - - A3 - - - C4 - - - B3 - - - | D3 - - - F3 - - - A3 - - - G3 - - - | E3 - - - G#3 - - - B3 - - - A3 - - -' },
    { wave: 'square', vol: .06, notes: 'A2 . . . A2 . . . E2 . . . E2 . . . | F2 . . . F2 . . . C3 . . . C3 . . . | D2 . . . D2 . . . A2 . . . A2 . . . | E2 . . . E2 . . . B2 . . . B2 . . .' },
  ] },
  street: { bpm: 96, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'E4 . G4 . A4 . G4 . D4 . F4 . A4 . F4 . | C4 . E4 . G4 . E4 . B3 . D4 . G4 . D4 .' },
    { wave: 'triangle', vol: .09, notes: 'A2 . A2 . E2 . E2 . | F2 . F2 . C2 . C2 . | D2 . D2 . A2 . A2 . | E2 . E2 . B2 . B2 .' },
    { wave: 'drums', notes: 'k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s . h h' },
  ] },
  chase: { bpm: 126, steps: 4, tracks: [
    { wave: 'saw', vol: .05, notes: 'A3 A3 C4 A3 D4 A3 C4 A3 | E3 E3 G3 E3 B3 E3 G3 E3 | D3 D3 F3 D3 A3 D3 F3 D3 | E3 E3 G3 E3 B3 E3 G3 E3' },
    { wave: 'triangle', vol: .09, notes: 'A2 . A2 . E2 . E2 . | F2 . F2 . C2 . C2 . | D2 . D2 . A2 . A2 . | E2 . E2 . B2 . B2 .' },
    { wave: 'drums', notes: 'k h s h k h s h | k h s h k h s s | k h s h k h s h | k h s h k s s s' },
  ] },
  sit: { bpm: 66, steps: 4, tracks: [
    { wave: 'sine', vol: .12, notes: 'D4 - - - F4 - - - A4 - - - G4 - - - | C4 - - - E4 - - - G4 - - - F4 - - - | A3 - - - C4 - - - E4 - - - D4 - - -' },
    { wave: 'triangle', vol: .07, notes: 'D3 . . . D3 . . . A2 . . . A2 . . . | F2 . . . F2 . . . C2 . . . C2 . . .' },
  ] },
  final: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'C4 E4 G4 E4 C4 E4 A4 G4 | F4 A4 C5 A4 F4 A4 C5 B4 | G4 B4 D5 B4 G4 B4 D5 C5 | C5 - - - G4 - - -' },
    { wave: 'square', vol: .05, notes: 'C3 . . . G2 . . . | F2 . . . C3 . . . | G2 . . . D3 . . . | C3 . . . . . . .' },
  ] },
};
let CUR_SONG = null;
function playSong(name) {
  if (CUR_SONG === name) return;
  CUR_SONG = name;
  game.audio.music(SONGS[name] || null);
}
function songForPlay() {
  if (S.done) return 'final';
  return S.chapter >= 4 ? 'chase' : 'street';
}
