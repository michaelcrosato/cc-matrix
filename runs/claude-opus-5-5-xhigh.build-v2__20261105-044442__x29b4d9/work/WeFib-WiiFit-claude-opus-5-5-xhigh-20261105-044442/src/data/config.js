// One place for the title and the names that follow from it.
export const TITLE = 'We Fib';
export const TAGLINE = 'Level with us. Eventually.';
export const RESORT = 'The Level Best Retreat';
export const SAVE_KEY = 'we-fib-save';
export const SAVE_VERSION = 1;
export const INK = '#1A1420';
export const SEAT_COLOURS = ['#E8443A', '#3B82F6', '#22C55E', '#F5B700'];
export const FIXED_DT = 1 / 120;
export const LANE_SPACING = 3.2;
export const HOWTO = 'Lean: stick, WASD or mouse. Feet: L2 R2, Q E or clicks. Flail: Square or F';
export const GOAL = 'Stay balanced through the class: highest score wins';
export const MEDALS = [
  { id: 'attended', name: 'Attended', min: 0, bonus: 0, colour: '#B7B0A2' },
  { id: 'adequate', name: 'Adequate', min: 40, bonus: 1, colour: '#C78B4A' },
  { id: 'pleasant', name: 'Pleasant', min: 65, bonus: 2, colour: '#6FB7D6' },
  { id: 'exemplary', name: 'Exemplary', min: 85, bonus: 3, colour: '#F5B700' },
  { id: 'suspicious', name: 'Suspicious', min: 97, bonus: 5, colour: '#C24D6A' },
];
export const medalFor = (form) => {
  let m = MEDALS[0];
  for (const x of MEDALS) if (form >= x.min) m = x;
  return m;
};
