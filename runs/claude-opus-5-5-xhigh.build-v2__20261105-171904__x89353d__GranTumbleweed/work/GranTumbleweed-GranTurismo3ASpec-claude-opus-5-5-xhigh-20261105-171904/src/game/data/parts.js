// Tuning Street's catalogue. Each part's numbers are applied in sim/tuning.js. group: exclusive within the group.
export const PARTS = {
  exhaust: { cat: 'engine', name: 'SPORT EXHAUST', price: 900, line: 'POWER +4%. LOUDER, DEEPER, CRACKLES ON LIFT.' },
  intake: { cat: 'engine', name: 'INTAKE AND ECU', price: 1800, line: 'POWER +6%. THE ENGINE BREATHES MORE EASILY.' },
  stage1: { cat: 'engine', group: 'stage', name: 'STAGE 1 TUNE', price: 3000, line: 'POWER +10%.' },
  stage2: { cat: 'engine', group: 'stage', name: 'STAGE 2 TUNE', price: 8000, line: 'POWER +20%. REVS A LITTLE HIGHER.' },
  stage3: { cat: 'engine', group: 'stage', name: 'STAGE 3 TUNE', price: 20000, line: 'POWER +35%. REVS MUCH HIGHER.' },
  turbo1: { cat: 'engine', group: 'turbo', name: 'TURBO KIT 1', price: 6000, line: 'A WHISTLE AND SOME MORE POWER. SOME LAG.' },
  turbo2: { cat: 'engine', group: 'turbo', name: 'TURBO KIT 2', price: 15000, line: 'A LOUDER WHISTLE. POWER ARRIVES LATE.' },
  weight1: { cat: 'weight', group: 'weight', name: 'WEIGHT STAGE 1', price: 1500, line: 'MASS -5%. THE SPARE WHEEL IS GONE.' },
  weight2: { cat: 'weight', group: 'weight', name: 'WEIGHT STAGE 2', price: 4500, line: 'MASS -10%. SO IS THE REAR SEAT.' },
  weight3: { cat: 'weight', group: 'weight', name: 'WEIGHT STAGE 3', price: 12000, line: 'MASS -15%. DO NOT ASK ABOUT THE RADIO.' },
  clutch: { cat: 'drivetrain', name: 'CLUTCH AND FLYWHEEL', price: 1200, line: 'GEAR CHANGES TAKE 0.11 S.' },
  gearbox: { cat: 'drivetrain', name: 'RACE GEARBOX', price: 5000, line: 'CHANGES IN 0.08 S. GEARING BECOMES A SETTING.' },
  lsd: { cat: 'drivetrain', name: 'LIMITED-SLIP DIFF', price: 2500, line: 'BOTH DRIVEN WHEELS SHARE THE WORK. A SETTING.' },
  suspSport: { cat: 'suspension', group: 'susp', name: 'SPORT SUSPENSION', price: 2000, line: 'LOWER, FLATTER. BALANCE BECOMES A SETTING.' },
  suspRace: { cat: 'suspension', group: 'susp', name: 'RACE SUSPENSION', price: 6000, line: 'LOWER STILL. BALANCE AND RIDE HEIGHT TO SET.' },
  brakeSport: { cat: 'brakes', group: 'brakes', name: 'SPORT PADS', price: 1500, line: 'STOPS HARDER, IF THE TYRES ALLOW.' },
  brakeRace: { cat: 'brakes', group: 'brakes', name: 'RACE BRAKE KIT', price: 5000, line: 'STOPS MUCH HARDER. BRAKE BALANCE TO SET.' },
  aeroStreet: { cat: 'aero', group: 'aero', name: 'STREET KIT', price: 2500, line: 'A LITTLE DOWNFORCE. A LIP SPOILER APPEARS.' },
  aeroWing: { cat: 'aero', group: 'aero', name: 'BIG WING', price: 6000, line: 'MUCH MORE DOWNFORCE. MORE DRAG. A SETTING.' },
};
export const PART_IDS = Object.keys(PARTS);
export const TILES = [
  { id: 'engine', name: 'ENGINE', line: 'THE PART YOU CAN HEAR.' },
  { id: 'weight', name: 'WEIGHT', line: 'THE CHEAPEST POWER IS LESS CAR.' },
  { id: 'drivetrain', name: 'DRIVETRAIN', line: 'BETWEEN THE ENGINE AND THE ROAD.' },
  { id: 'suspension', name: 'SUSPENSION', line: 'HOW THE WEIGHT MOVES.' },
  { id: 'brakes', name: 'BRAKES', line: 'A PEDAL WITH A FAR END.' },
  { id: 'aero', name: 'AERO', line: 'GRIP, AT A PRICE, AT SPEED.' },
  { id: 'tyres', name: 'TYRES', line: 'THE ONLY PART THAT TOUCHES ANYTHING.' },
  { id: 'body', name: 'BODY', line: 'NO EFFECT. GREAT IMPORTANCE.' },
];
export const PAINT_PRICE = 500, RIM_PRICE = 300;
// Setup sliders. needs: part ids, any of which makes the slider available.
export const SETUP_SLIDERS = [
  { id: 'gearing', name: 'GEARING', needs: ['gearbox'], min: 0.85, max: 1.15, step: 0.01, def: 1, low: 'ACCELERATION', high: 'TOP SPEED', line: 'SHORT GEARS PULL HARD. LONG GEARS RUN ON.' },
  { id: 'lsd', name: 'LSD', needs: ['lsd'], min: 0.2, max: 0.8, step: 0.02, def: 0.4, low: 'FREE', high: 'LOCKED', line: 'LOCKED PUTS POWER DOWN. FREE TURNS IN.' },
  { id: 'balance', name: 'BALANCE', needs: ['suspSport', 'suspRace'], min: 0.45, max: 0.7, step: 0.01, def: 0.56, low: 'TURNS IN', high: 'STABLE', line: 'WHERE THE CAR LEANS, IT LETS GO FIRST.' },
  { id: 'ride', name: 'RIDE HEIGHT', needs: ['suspRace'], min: 0.9, max: 1, step: 0.01, def: 1, low: 'LOW', high: 'HIGH', line: 'LOW IS QUICK. BELOW 0.94 THE KERBS WILL BE FELT.' },
  { id: 'brakeF', name: 'BRAKE BALANCE', needs: ['brakeRace'], min: 0.5, max: 0.75, step: 0.01, def: 0.62, low: 'REAR', high: 'FRONT', line: 'REAR BIAS ROTATES THE CAR. FRONT BIAS IS CALM.' },
  { id: 'downforce', name: 'DOWNFORCE', needs: ['aeroWing'], min: 0.5, max: 1.5, step: 0.05, def: 1, low: 'LOW DRAG', high: 'HIGH GRIP', line: 'THERE IS NO THIRD THING.' },
];
