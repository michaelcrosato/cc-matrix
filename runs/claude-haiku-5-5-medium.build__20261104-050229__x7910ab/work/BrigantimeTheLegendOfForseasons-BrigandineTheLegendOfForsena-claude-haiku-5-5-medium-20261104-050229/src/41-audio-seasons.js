// The music of the plan's table (§9.1): one theme for each season of the campaign, the two battle themes (attacking and
// defending, with a tension layer from bell nine), the hourless theme for Dominion ground, the Sanctum's theme, the event
// and ending themes, and a short sting when the season turns. Each is the engine's { bpm, steps, tracks } format.
(() => {
  const H = G;
  Object.assign(H.SONGS, {
    spring: { bpm: 104, steps: 4, tracks: [
      { wave: 'pulse12', vol: .12, notes: 'F4 - A4 - C5 - A4 - G4 - E4 - F4 - - - D4 - - -' },
      { wave: 'triangle', vol: .14, notes: 'F2 - - - C3 - - - D3 - - - C3 - - -' },
      { wave: 'drums', vol: .06, notes: 'h . h . h . h . h . h . h . h .' }] },
    summer: { bpm: 116, steps: 4, tracks: [
      { wave: 'square', vol: .09, notes: 'A4 C#5 E5 - D5 - C#5 - A4 - - - E4 - - -' },
      { wave: 'triangle', vol: .14, notes: 'A2 - E2 - D2 - E2 - A2 - E2 - D2 - E2 -' },
      { wave: 'drums', vol: .12, notes: 'k . s . k . s .' }] },
    autumn: { bpm: 96, steps: 4, tracks: [
      { wave: 'triangle', vol: .13, notes: 'E4 - G4 - B4 - A4 - G4 - - - E4 - - -' },
      { wave: 'saw', vol: .04, notes: 'E3 - G3 - E3 - D3 - C3 - - -' },
      { wave: 'drums', vol: .08, notes: 'k . . k . . k . .' }] },
    winter: { bpm: 72, steps: 4, tracks: [
      { wave: 'sine', vol: .16, notes: 'B3 - - - D4 - - - F#4 - - - B3 - - -' },
      { wave: 'pulse', vol: .05, notes: 'B5 - - - - - - - D5 - - - - - - -' },
      { wave: 'drums', vol: .06, notes: 'k - - - - - - - k - - - - - - -' }] },
    battle_attack: { bpm: 140, steps: 4, tracks: [
      { wave: 'square', vol: .08, notes: 'D4 F4 A4 D5 C5 A4 F4 D4 E4 G4 Bb4 E5 D5 Bb4 G4 E4' },
      { wave: 'saw', vol: .06, notes: 'D2 - D2 - F2 - F2 - C2 - C2 - A1 - A1 -' },
      { wave: 'drums', vol: .14, notes: 'k . s . k . s .' },
      { wave: 'saw', vol: .05, name: 'tension', on: false, notes: 'D5 - F5 - A5 - D6 - A5 - F5 - D5 - - -' }] },
    battle_defend: { bpm: 128, steps: 4, tracks: [
      { wave: 'pulse', vol: .09, notes: 'G4 Bb4 D5 G5 F5 D5 Bb4 G4 A4 C5 Eb5 A5 G5 Eb5 C5 A4' },
      { wave: 'triangle', vol: .14, notes: 'G2 - G2 - Eb2 - Eb2 - F2 - F2 - D2 - D2 -' },
      { wave: 'drums', vol: .12, notes: 'k . t . k . t .' },
      { wave: 'triangle', vol: .05, name: 'tension', on: false, notes: 'G5 - Bb5 - D6 - Bb5 - G5 - Eb5 - D5 - - -' }] },
    hourless: { bpm: 100, steps: 4, tracks: [
      { wave: 'saw', vol: .06, notes: 'C5 B4 Bb4 A4 Ab4 G4 Gb4 F4 E4 Eb4 D4 C4 - - - -' },
      { wave: 'triangle', vol: .10, notes: 'C2 - - - - - C2 - - - - - Ab1 - - -' },
      { wave: 'drums', vol: .08, notes: 'c . c . c . c . c . c . c . c .' }] },
    boss: { bpm: 150, steps: 4, tracks: [
      { wave: 'square', vol: .08, notes: 'E4 F4 G4 A4 B4 - G4 F4 E4 - - - - - - -' },
      { wave: 'saw', vol: .07, notes: 'E2 E2 E2 E2 F2 F2 E2 E2' },
      { wave: 'drums', vol: .16, notes: 'k k s k k s k s' }] },
    event: { bpm: 84, steps: 4, tracks: [
      { wave: 'triangle', vol: .14, notes: 'G4 - E4 - D4 - - - C4 - D4 - - - - - -' },
      { wave: 'pulse', vol: .05, notes: 'C3 - - - G2 - - - C3 - - - G2 - - -' }] },
    ending: { bpm: 80, steps: 4, tracks: [
      { wave: 'square', vol: .09, notes: 'D4 - F#4 - A4 - G4 - F#4 - D4 - - -' },
      { wave: 'triangle', vol: .12, notes: 'D3 - A2 - D3 - G2 - D3 - A2 - D3 - - -' },
      { wave: 'saw', vol: .04, notes: 'D4 A4 D5 A4 G4 D4 F#4 D4' }] }
  });
  // the stings: a short phrase over the music when the season turns
  H.STING = {
    spring: { bpm: 120, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'F4 A4 C5 F5 - - - -' }] },
    summer: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .12, notes: 'A4 C#5 E5 A5 - - - -' }] },
    autumn: { bpm: 120, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'E4 G4 B4 E5 - - - -' }] },
    winter: { bpm: 120, steps: 4, tracks: [{ wave: 'sine', vol: .2, notes: 'B3 D4 F#4 B4 - - - -' }] }
  };
  H.SEASON_SONG = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
})();
