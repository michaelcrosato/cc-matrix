// Mr. Fathom's stock, by chapter. Rows on screen stay few: 6 at most, scrolled.
export const PRICES = {
  ammoPistol: 150, ammoShells: 350, ammoRifle: 550, ammoBolts: 500,
  samphire: 200, tin: 800, dulse: 350, holly: 700,
  flare: 450, depth: 550, oil: 350,
  scatter: 900, rifle: 1800, harpoon: 2600,
  caseMedium: 1500, caseLarge: 4000, chart: 300,
};
export const STOCK = {
  1: ['ammoPistol', 'samphire', 'oil', 'scatter', 'chart', 'caseMedium'],
  2: ['ammoPistol', 'ammoShells', 'samphire', 'dulse', 'tin', 'oil', 'flare', 'depth', 'scatter', 'rifle', 'chart', 'caseMedium', 'caseLarge'],
  3: ['ammoPistol', 'ammoShells', 'ammoRifle', 'ammoBolts', 'samphire', 'dulse', 'holly', 'tin', 'flare', 'depth', 'oil', 'scatter', 'rifle', 'harpoon', 'chart', 'caseMedium', 'caseLarge'],
};
export const SPECIAL_STOCK = {
  caseMedium: { name: 'CASE: 12 BY 7', text: 'THE MEDIUM OSTRANDER SAMPLE CASE. ROOM FOR THE RIFLE AND A CONSCIENCE.', icon: 'chart' },
  caseLarge: { name: 'CASE: 14 BY 8', text: 'THE LARGE OSTRANDER SAMPLE CASE. IT WAS NEVER MEANT FOR SAMPLES.', icon: 'chart' },
  chart: { name: 'TANNOY CHART', text: 'MARKS EVERY LOUDSPEAKER ON THE MAP TAB. SHOOT THEM ALL AND I PAY OUT. BLUB.', icon: 'chart' },
};
export const TANNOY_PRIZES = [
  { at: 5, text: 'FIVE TANNOYS. 1000 DOUBLOONS, FROM AN ADMIRER.', money: 1000 },
  { at: 10, text: 'TEN TANNOYS. A BIGGER CASE, NO CHARGE.', caseUp: true },
  { at: 15, text: 'ALL FIFTEEN. A BLACK PEARL. HE HATES YOU NOW.', treasure: 'blackPearl' },
];
export const BARKS = {
  greet: ['BACK ALREADY? STILL BREATHING? BAD FOR THE ISLAND, GOOD FOR BUSINESS.', 'MIND THE DRIP!', 'STEP ABOARD, STEP ABOARD.'],
  buy: ['SOLD, AND NO REFUNDS FROM THE DEEP.', 'A FINE CHOICE FOR A SHORT LIFE.'],
  sell: ['HALF PRICE AND MY CONDOLENCES.', "I'LL FIND SOMEONE IT FITS. SOMEONE WITH ARMS."],
  tune: ["SHE'LL KICK LIKE A BOSUN NOW.", 'TUNED AND TARRED.'],
  poor: ['CREDIT? FRIEND, NOBODY HERE LIVES THAT LONG.'],
  leave: ["COME BACK ALIVE. I'VE STOCK TO MOVE.", 'MIND THE DRIP!'],
  plastic: ["HE DOESN'T TAKE PLASTIC."],
};
