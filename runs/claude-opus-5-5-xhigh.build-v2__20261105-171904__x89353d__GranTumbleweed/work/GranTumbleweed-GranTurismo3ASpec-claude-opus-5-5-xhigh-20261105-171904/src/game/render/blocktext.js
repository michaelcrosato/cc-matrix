// Letters as blocks, for neon signs and painted boards: a 3x5 font of the game's own, drawn into a GeoBatch.
const F = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101011', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010' };
// Text runs along direction (dx, dz), standing up, from point at. px: block size.
export function blockText(b, text, at, dx, dz, px, color, depth = 0.2) {
  let cx = 0;
  const yaw = Math.atan2(dx, dz) + Math.PI / 2;
  for (const ch of text) {
    const g = F[ch] ?? F[' '];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') b.box(at[0] + dx * (cx + c) * px, at[1] + (4 - r) * px, at[2] + dz * (cx + c) * px, px, px, depth, color, yaw);
    cx += 4;
  }
  return cx * px;
}
export const blockTextWidth = (text, px) => text.length * 4 * px;
