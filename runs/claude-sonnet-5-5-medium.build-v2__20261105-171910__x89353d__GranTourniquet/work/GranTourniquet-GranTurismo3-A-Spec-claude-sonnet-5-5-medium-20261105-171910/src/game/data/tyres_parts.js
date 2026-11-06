// Tyres and parts (section 6). Effects are applied in sim/tuning.js by part id.
export const TYRES = {
  street: { name: 'STREET', tyreMu: 0.95, alphaP: 0.14, dirt: 0.45, wearX: 0.8, price: 600, about: 'Fine for errands. Honest about its limits.' },
  sport: { name: 'SPORT', tyreMu: 1.0, alphaP: 0.125, dirt: 0.5, wearX: 1.0, price: 1200, about: 'The sensible choice. It lasts.' },
  semi: { name: 'SEMI-SLICK', tyreMu: 1.12, alphaP: 0.115, dirt: 0.42, wearX: 1.4, price: 4800, about: 'More grip, shorter life, a little noise.' },
  slick: { name: 'RACING SLICK', tyreMu: 1.3, alphaP: 0.105, dirt: 0.35, wearX: 2.2, price: 12000, about: 'Grip of a different order. Do not take it out in the rain.' },
  dirt: { name: 'RALLY DIRT', tyreMu: 0.84, alphaP: 0.17, dirt: 0.72, wearX: 1.2, price: 2500, about: 'Poor on tarmac. On a loose road it is the point.' },
};
export const TYRE_IDS = Object.keys(TYRES);
export const CATEGORIES = ['ENGINE', 'WEIGHT', 'DRIVETRAIN', 'SUSPENSION', 'BRAKES', 'AERO', 'TYRES', 'BODY'];
// group: parts in the same exclusive group replace each other.
export const PARTS = {
  exhaust: { cat: 'ENGINE', name: 'SPORT EXHAUST', price: 900, about: 'POWER +4%. A deeper voice, and crackle on lift.' },
  intake: { cat: 'ENGINE', name: 'INTAKE AND ECU', price: 1800, about: 'POWER +6%. The engine breathes and is told how.' },
  eng1: { cat: 'ENGINE', group: 'eng', name: 'ENGINE STAGE 1', price: 3000, about: 'POWER +10%. Nothing dramatic. Everything better.' },
  eng2: { cat: 'ENGINE', group: 'eng', name: 'ENGINE STAGE 2', price: 8000, about: 'POWER +20%. It now revs 200 higher.' },
  eng3: { cat: 'ENGINE', group: 'eng', name: 'ENGINE STAGE 3', price: 20000, about: 'POWER +35%. A different engine in the same box.' },
  turbo1: { cat: 'ENGINE', group: 'turbo', name: 'TURBO KIT 1', price: 6000, about: 'A turbocharger. It whistles, then it pushes.' },
  turbo2: { cat: 'ENGINE', group: 'turbo', name: 'TURBO KIT 2', price: 15000, about: 'A larger turbocharger. Patience is required.' },
  wt1: { cat: 'WEIGHT', group: 'wt', name: 'WEIGHT STAGE 1', price: 1500, about: 'MASS -5%. Seats, mats, opinions.' },
  wt2: { cat: 'WEIGHT', group: 'wt', name: 'WEIGHT STAGE 2', price: 4500, about: 'MASS -10%. The radio is also gone.' },
  wt3: { cat: 'WEIGHT', group: 'wt', name: 'WEIGHT STAGE 3', price: 12000, about: 'MASS -15%. What remains is mostly intent.' },
  clutch: { cat: 'DRIVETRAIN', name: 'CLUTCH AND FLYWHEEL', price: 1200, about: 'SHIFTS IN 0.11 S. The car answers sooner.' },
  gearbox: { cat: 'DRIVETRAIN', name: 'RACE GEARBOX', price: 5000, about: 'SHIFTS IN 0.08 S. Adds a GEARING setting.' },
  lsd: { cat: 'DRIVETRAIN', name: 'LIMITED-SLIP DIFF', price: 2500, about: 'Adds an LSD setting. Both wheels pull together.' },
  susp1: { cat: 'SUSPENSION', group: 'susp', name: 'SPORT SUSPENSION', price: 2000, about: 'Lower and firmer. Adds BALANCE.' },
  susp2: { cat: 'SUSPENSION', group: 'susp', name: 'RACE SUSPENSION', price: 6000, about: 'Lower still. Adds BALANCE and RIDE HEIGHT.' },
  pads: { cat: 'BRAKES', group: 'brk', name: 'SPORT PADS', price: 1500, about: 'BRAKING +0.15 G. Bite arrives earlier.' },
  brk2: { cat: 'BRAKES', group: 'brk', name: 'RACE BRAKE KIT', price: 5000, about: 'BRAKING +0.40 G. Adds BRAKE BALANCE.' },
  aero1: { cat: 'AERO', group: 'aero', name: 'STREET AERO KIT', price: 2500, about: 'A lip spoiler. A little more downforce.' },
  aero2: { cat: 'AERO', group: 'aero', name: 'BIG WING', price: 6000, about: 'Much more downforce, and drag. Adds DOWNFORCE.' },
};
export const PART_IDS = Object.keys(PARTS);
export const PAINTS = ['ink', 'plum', 'red', 'orange', 'sand', 'lime', 'green', 'teal', 'navy', 'blue', 'sky', 'cyan', 'white', 'mist', 'slate', 'night'];
export const RIMS = ['PLAIN', 'SPOKED', 'MESH', 'DISH'];
export const PAINT_PRICE = 500, RIM_PRICE = 300, OIL_PRICE = 250, WASH_PRICE = 50;
// Setup sliders: key, label, low label, high label, which part unlocks it
export const SETTINGS = [
  { key: 'gearing', label: 'GEARING', lo: 'ACCELERATION', hi: 'TOP SPEED', need: ['gearbox'], about: 'Shortens or lengthens every gear together.' },
  { key: 'lsd', label: 'LSD', lo: 'OPEN', hi: 'LOCKED', need: ['lsd'], about: 'How firmly the driven wheels share the drive.' },
  { key: 'balance', label: 'BALANCE', lo: 'TURNS IN', hi: 'STABLE', need: ['susp1', 'susp2'], about: 'Which end of the car leans on its springs.' },
  { key: 'ride', label: 'RIDE HEIGHT', lo: 'HIGH', hi: 'LOW', need: ['susp2'], about: 'Lower is quicker. Below a point, kerbs jolt the body.' },
  { key: 'brakebal', label: 'BRAKE BALANCE', lo: 'REAR', hi: 'FRONT', need: ['brk2'], about: 'How the braking effort is shared front to rear.' },
  { key: 'downforce', label: 'DOWNFORCE', lo: 'LESS', hi: 'MORE', need: ['aero2'], about: 'The wing angle. More grip, more drag.' },
];
