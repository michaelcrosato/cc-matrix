const PS = {
  use: 'SQUARE', fire: 'R2', confirm: 'CROSS', map: 'UP', pause: 'OPTIONS',
  reload: 'SQUARE', heal: 'L1', back: 'CIRCLE', jump: 'CROSS', sprint: 'L3',
};
const XB = {
  use: 'X', fire: 'RT', confirm: 'A', map: 'UP', pause: 'MENU',
  reload: 'X', heal: 'LB', back: 'B', jump: 'A', sprint: 'LS',
};
const KB = {
  use: 'E', fire: 'LMB', confirm: 'ENTER', map: 'M', pause: 'ESC',
  reload: 'R', heal: 'Q', back: 'ESC', jump: 'SPACE', sprint: 'SHIFT',
};

export function glyph(action, device, set) {
  const table = device === 'kbm' ? KB : set === 'xbox' ? XB : PS;
  return table[action] || table.confirm;
}

export function promptList(device, set, rows) {
  return rows.map((row) => ({ text: row.text, glyph: glyph(row.action, device, set), action: row.action }));
}
