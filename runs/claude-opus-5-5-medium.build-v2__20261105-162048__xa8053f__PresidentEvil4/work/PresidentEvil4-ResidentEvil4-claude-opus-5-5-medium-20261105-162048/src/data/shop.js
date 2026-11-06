// Stock grows per chapter. Mr. Fathom takes doubloons and nothing else.
export const STOCK = {
  1: ['ammo_pistol', 'samphire', 'scatter', 'ammo_shells', 'flare', 'chart', 'case1'],
  2: ['ammo_pistol', 'ammo_shells', 'samphire', 'dulse', 'firstaid', 'scatter', 'rifle', 'ammo_rifle', 'flare', 'depth', 'oil', 'chart', 'case1', 'case2'],
  3: ['ammo_pistol', 'ammo_shells', 'ammo_rifle', 'ammo_bolts', 'samphire', 'dulse', 'holly', 'firstaid', 'scatter', 'rifle', 'harpoon', 'flare', 'depth', 'oil', 'chart', 'case1', 'case2'],
};
export const CASE_SIZES = { case1: { w: 12, h: 7, price: 1500, name: 'LARGER SAMPLE CASE' }, case2: { w: 14, h: 8, price: 4000, name: 'SENIOR ADJUSTER CASE' } };
export const SHOP_BARKS = {
  greet: ['BACK ALREADY? STILL BREATHING? BAD FOR THE ISLAND, GOOD FOR BUSINESS.', 'MIND THE DRIP!', 'STEP ABOARD, STEP ABOARD.'],
  buy: ['SOLD, AND NO REFUNDS FROM THE DEEP.', 'A FINE CHOICE FOR A SHORT LIFE.'],
  sell: ['HALF PRICE AND MY CONDOLENCES.', "I'LL FIND SOMEONE IT FITS. SOMEONE WITH ARMS."],
  tune: ["SHE'LL KICK LIKE A BOSUN NOW.", 'TUNED AND TARRED.'],
  poor: ['CREDIT? FRIEND, NOBODY HERE LIVES THAT LONG.'],
  leave: ["COME BACK ALIVE. I'VE STOCK TO MOVE.", 'MIND THE DRIP!'],
  plastic: ["HE DOESN'T TAKE PLASTIC."],
};
