const FIRST = ['Gentle', 'Patient', 'Earnest', 'Retired', 'Punctual', 'Modest', 'Tentative', 'Sensible', 'Young', 'Quiet', 'Hopeful', 'Reasonable', 'Upright', 'Sturdy', 'Careful', 'Former'];
const LAST = ['Margaret', 'Kevin', 'Sandra', 'Paul', 'Gerald', 'Doreen', 'Clive', 'Maureen', 'Howard', 'Yvonne', 'Trevor', 'Bernice', 'Nigel', 'Agnes', 'Desmond', 'Priya', 'Hiro', 'Marisol', 'Tunde', 'Ingrid'];
export function genName(r) { return `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; }
export const GUESTS = [
  { name: 'Gentle Margaret', paint: '#E77BB0', hat: 'perm', height: .96, width: 1.02, skin: '#F2D3A8' },
  { name: 'Retired Kevin', paint: '#2FA7A0', hat: 'bucket', height: 1.02, width: 1.08, skin: '#E2B48A' },
  { name: 'Sandra', paint: '#8E6BD8', hat: 'beret', height: .98, width: .96, skin: '#C98F62' },
  { name: 'Other Sandra', paint: '#8E6BD8', hat: 'beret', height: .98, width: .96, skin: '#F7E0C2' },
  { name: 'Unsteady Paul', paint: '#F58A2E', hat: 'visor', height: 1.06, width: .92, skin: '#9A6A45' },
  { name: 'Young Gerald', paint: '#22C55E', hat: 'wizard', height: .9, width: .96, skin: '#F7E0C2' },
];
