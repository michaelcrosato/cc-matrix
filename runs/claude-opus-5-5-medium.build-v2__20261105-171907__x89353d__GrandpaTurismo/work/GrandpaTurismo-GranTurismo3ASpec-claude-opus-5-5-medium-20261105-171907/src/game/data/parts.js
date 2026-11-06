// Each part changes numbers in tunedParams (sim/tuning.js). group: parts of one group exclude each other.
// slots: 'exhaust' etc. live in install.parts as booleans or levels.
export const CATEGORIES = [
  { id: 'engine', name: 'ENGINE', line: 'MORE POWER. IT WILL BE LOUDER AND IT WILL COST MORE.' },
  { id: 'weight', name: 'WEIGHT', line: 'NOTHING IS LIGHTER THAN THE THING YOU REMOVED.' },
  { id: 'drivetrain', name: 'DRIVETRAIN', line: 'THE ROAD BETWEEN THE ENGINE AND THE TYRE.' },
  { id: 'suspension', name: 'SUSPENSION', line: 'HOW THE WEIGHT MOVES WHEN YOU ASK IT TO.' },
  { id: 'brakes', name: 'BRAKES', line: 'THE FASTEST PART OF THE CAR.' },
  { id: 'aero', name: 'AERO', line: 'AIR IS HEAVY IF YOU GO FAST ENOUGH.' },
  { id: 'tyres', name: 'TYRES', line: 'FOUR HANDPRINTS OF RUBBER. EVERYTHING ELSE IS OPINION.' },
  { id: 'body', name: 'BODY', line: 'NO EFFECT ON THE LAP TIME. A LARGE EFFECT ON YOU.' },
];
export const PARTS = [
  { id: 'exhaust', cat: 'engine', name: 'SPORT EXHAUST', price: 900, line: 'LOUDER, DEEPER. IT CRACKLES WHEN YOU LIFT.', slot: 'exhaust', level: 1 },
  { id: 'intake', cat: 'engine', name: 'INTAKE AND ECU', price: 1800, line: 'BETTER BREATHING. A SMALL, HONEST GAIN.', slot: 'intake', level: 1 },
  { id: 'stage1', cat: 'engine', name: 'ENGINE STAGE 1', price: 3000, line: 'A CAREFUL REBUILD. ABOUT TEN PERCENT.', slot: 'engine', level: 1 },
  { id: 'stage2', cat: 'engine', name: 'ENGINE STAGE 2', price: 8000, line: 'HIGHER REVS. ABOUT TWENTY PERCENT.', slot: 'engine', level: 2 },
  { id: 'stage3', cat: 'engine', name: 'ENGINE STAGE 3', price: 20000, line: 'NOTHING ORIGINAL REMAINS. ABOUT A THIRD MORE.', slot: 'engine', level: 3 },
  { id: 'turbo1', cat: 'engine', name: 'TURBO KIT 1', price: 6000, line: 'A SMALL TURBO. IT ARRIVES A LITTLE LATE.', slot: 'turbo', level: 1 },
  { id: 'turbo2', cat: 'engine', name: 'TURBO KIT 2', price: 15000, line: 'A LARGE TURBO. IT ARRIVES VERY LATE, AND THEN ALL AT ONCE.', slot: 'turbo', level: 2 },
  { id: 'weight1', cat: 'weight', name: 'WEIGHT STAGE 1', price: 1500, line: 'THE REAR SEATS. YOU WERE NOT USING THEM.', slot: 'weight', level: 1 },
  { id: 'weight2', cat: 'weight', name: 'WEIGHT STAGE 2', price: 4500, line: 'THE CARPET AND THE RADIO. IT IS QUIETER NOW.', slot: 'weight', level: 2 },
  { id: 'weight3', cat: 'weight', name: 'WEIGHT STAGE 3', price: 12000, line: 'THIN PANELS AND THIN GLASS. PLEASE CLOSE THE DOOR GENTLY.', slot: 'weight', level: 3 },
  { id: 'clutch', cat: 'drivetrain', name: 'CLUTCH AND FLYWHEEL', price: 1200, line: 'QUICKER GEAR CHANGES.', slot: 'clutch', level: 1 },
  { id: 'gearbox', cat: 'drivetrain', name: 'RACE GEARBOX', price: 5000, line: 'VERY QUICK CHANGES. ADDS A GEARING SETTING.', slot: 'gearbox', level: 1 },
  { id: 'lsd', cat: 'drivetrain', name: 'LIMITED-SLIP DIFF', price: 2500, line: 'BOTH WHEELS PUSH. ADDS AN LSD SETTING.', slot: 'lsd', level: 1 },
  { id: 'susp1', cat: 'suspension', name: 'SPORT SUSPENSION', price: 2000, line: 'LOWER AND FIRMER. ADDS A BALANCE SETTING.', slot: 'suspension', level: 1 },
  { id: 'susp2', cat: 'suspension', name: 'RACE SUSPENSION', price: 6000, line: 'ADDS BALANCE AND RIDE HEIGHT. KERBS WILL BE FELT.', slot: 'suspension', level: 2 },
  { id: 'pads', cat: 'brakes', name: 'SPORT PADS', price: 1500, line: 'THE PEDAL MEANS WHAT IT SAYS.', slot: 'brakes', level: 1 },
  { id: 'brakekit', cat: 'brakes', name: 'RACE BRAKE KIT', price: 5000, line: 'MUCH LATER BRAKING. ADDS A BRAKE BALANCE SETTING.', slot: 'brakes', level: 2 },
  { id: 'lip', cat: 'aero', name: 'STREET KIT', price: 2500, line: 'A LIP SPOILER. A LITTLE GRIP, A LITTLE DRAG.', slot: 'aero', level: 1 },
  { id: 'wing', cat: 'aero', name: 'BIG WING', price: 6000, line: 'MORE DOWNFORCE. MORE DRAG. THERE IS NO THIRD THING.', slot: 'aero', level: 2 },
];
export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p]));
export const PAINT_PRICE = 500, RIM_PRICE = 300, OIL_PRICE = 250, WASH_PRICE = 50;
/** Setup sliders: which part unlocks it, its range, its labels. */
export const SETTINGS = [
  { id: 'gearing', name: 'GEARING', needs: (p) => p.gearbox, min: 0.85, max: 1.15, def: 1, lo: 'TOP SPEED', hi: 'ACCELERATION', line: 'SHORT GEARS PULL HARDER. LONG GEARS GO FURTHER.' },
  { id: 'lsd', name: 'LSD', needs: (p) => p.lsd, min: 0.2, max: 0.8, def: 0.5, lo: 'FREE', hi: 'LOCKED', line: 'LOCKED PUTS POWER DOWN. FREE TURNS IN.' },
  { id: 'balance', name: 'BALANCE', needs: (p) => p.suspension, min: 0.45, max: 0.7, def: 0.56, lo: 'TURNS IN', hi: 'STABLE', line: 'THE FRONT OR THE REAR. ONE OF THEM WILL LET GO FIRST.' },
  { id: 'ride', name: 'RIDE HEIGHT', needs: (p) => p.suspension === 2, min: 0.9, max: 1, def: 1, lo: 'LOW', hi: 'HIGH', line: 'LOW IS QUICK. BELOW A POINT, KERBS JOLT THE BODY.' },
  { id: 'brakeBias', name: 'BRAKE BALANCE', needs: (p) => p.brakes === 2, min: 0.5, max: 0.75, def: 0.62, lo: 'REAR', hi: 'FRONT', line: 'FRONT IS SAFE. REAR ROTATES THE CAR.' },
  { id: 'downforce', name: 'DOWNFORCE', needs: (p) => p.aero === 2, min: 0.5, max: 1.5, def: 1, lo: 'LOW', hi: 'HIGH', line: 'CORNERS OR STRAIGHTS. PLEASE CHOOSE.' },
];
