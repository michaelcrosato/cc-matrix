/* ---- SPECIALS: each belongs to a character (the striker's for batting, the bowler's for bowling, the fielding side's
 * star for a field special). A player without one uses the generic Kerfuffle Shot / Kerfuffle Ball. Used with the
 * special button when the side's Hype meter is full (The Chirp costs 50). ---- */
const SPECIALS = {
  kettle: { name: 'Tea-Kettle Slog', kind: 'bat', text: 'A guaranteed perfect lofted hit, +25% distance', fx: 'steam' },
  certainty: { name: 'Statistical Certainty', kind: 'bat', text: 'Shows the perfect timing ring: GOOD guaranteed', fx: 'ring' },
  longhandle: { name: 'The Long Handle', kind: 'bat', text: 'A lofted hit with power x1.4', fx: 'fire' },
  croquet: { name: 'The Croquet Drive', kind: 'bat', text: "A ground shot that can't be stopped: FOUR", fx: 'croquet' },
  bludgeon: { name: 'Boardwalk Bludgeon', kind: 'bat', text: 'A huge hit, +40% distance', fx: 'fire' },
  grudgeDrive: { name: 'Grudge Drive', kind: 'bat', text: 'A power drive straight at the bowler', fx: 'grudge' },
  ecto: { name: 'Ectoplasmic Edge', kind: 'bat', text: 'The ball passes through the first fielder', fx: 'ghost' },
  kerfuffleShot: { name: 'Kerfuffle Shot', kind: 'bat', text: 'A guaranteed perfect lofted hit with a fire trail', fx: 'fire' },
  vicar: { name: "Vicar's Revenge", kind: 'bowl', text: 'A 155 km/h inswinging yorker', fx: 'holy', delivery: { base: 'yorker', kmh: 155, swing: -1.2, target: [2, 10] } },
  grandad: { name: 'The Grandad', kind: 'bowl', text: 'Bounces three times and still reaches the stumps', fx: 'dust', delivery: { base: 'legbreak', kmh: 62, target: [0, 150], bounces: 3 } },
  dibbly: { name: 'Dibbly-Dobbly Doom', kind: 'bowl', text: 'An 80 km/h ball that wobbles in the air', fx: 'wobble', delivery: { base: 'knuckle', kmh: 80, wobble: 1.2, target: [0, 70] } },
  swoop: { name: 'The Peregrine Swoop', kind: 'bowl', text: 'Banana swing x3, late', fx: 'feather', delivery: { base: 'outswing', kmh: 130, swing: 3, target: [8, 60] } },
  sunburn: { name: 'Sunburn Bouncer', kind: 'bowl', text: 'A 152 km/h bouncer in a heat haze', fx: 'haze', delivery: { base: 'bouncer', kmh: 152, target: [-2, 160] } },
  vanish: { name: 'Vanishing Ball', kind: 'bowl', text: 'Invisible for a quarter of its flight', fx: 'vanish', delivery: { base: 'legbreak', kmh: 84, target: [-4, 70] } },
  sawn: { name: 'Sawn in Half', kind: 'bowl', text: 'A googly; a bowled wicket splits the stumps', fx: 'saw', delivery: { base: 'googly', kmh: 82, target: [-6, 65] } },
  grudge: { name: 'Grudge Ball', kind: 'bowl', text: 'An LBW-seeking yorker', fx: 'grudge', delivery: { base: 'yorker', kmh: 132, swing: -.6, target: [-2, 8] } },
  triple: { name: 'Triple Threat', kind: 'bowl', text: 'Three balls: two holograms, one real', fx: 'triple', delivery: { base: 'piston', kmh: 150, target: [0, 80] } },
  kerfuffleBall: { name: 'Kerfuffle Ball', kind: 'bowl', text: '+15% pace and double swing', fx: 'fire', delivery: { base: null } },
  chirp: { name: 'The Chirp', kind: 'field', text: "Flusters the batter for one ball (50 Hype)", fx: 'chirp', cost: 50 },
  tray: { name: 'Silver Tray Save', kind: 'field', text: 'The next catch is guaranteed', fx: 'tray' },
  lightning: { name: 'Lightning Stumping', kind: 'field', text: 'Stumping window x3 for the over', fx: 'spark' }
};
K.SPECIALS = SPECIALS;
