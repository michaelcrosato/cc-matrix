// Clothes, hats, glasses, umbrellas. tags feed Flavia's fashion check.
const C = (id, name, shirt, trim, price, tags, o = {}) => ({ id, name, cat: 'clothes', shirt, trim, price, tags, icon: 'shirt', iconColors: { o: shirt, x: trim }, ...o });
const H = (id, name, hat, hatColor, hatTrim, price, tags, o = {}) => ({ id, name, cat: 'hat', hat, hatColor, hatTrim, price, tags, icon: 'hat', iconColors: { o: hatColor, x: hatTrim }, ...o });
const G = (id, name, glasses, glassesColor, price, tags, o = {}) => ({ id, name, cat: 'glasses', glasses, glassesColor, price, tags, icon: 'glasses', iconColors: { o: glassesColor === 'white' ? 'mist' : glassesColor, x: glassesColor }, ...o });
const U = (id, name, a, b, price, tags, o = {}) => ({ id, name, cat: 'umbrella', a, b, price, tags, icon: 'umbrella', iconColors: { o: a, x: b }, ...o });

export const CLOTHES = [
  C('tatteredShirt', 'Slightly Regrettable Shirt', 'slate', 'mist', 300, ['drab']),
  C('plainBlue', 'Plain Blue Shirt', 'blue', 'white', 500, ['plain']),
  C('plainRed', 'Plain Red Shirt', 'red', 'white', 500, ['plain', 'loud']),
  C('plainGreen', 'Plain Green Shirt', 'green', 'white', 500, ['plain', 'leafy']),
  C('sailor', 'Sailor Top', 'white', 'navy', 800, ['nautical', 'damp']),
  C('fishNet', 'Fisher’s Jersey', 'teal', 'sand', 900, ['nautical', 'damp']),
  C('oilskin', 'Oilskin Coat', 'sand', 'orange', 1400, ['damp', 'practical']),
  C('duster', 'Duster Coat', 'orange', 'plum', 1200, ['practical', 'dusty']),
  C('knitted', 'Knitted Thing', 'orange', 'sand', 700, ['cosy', 'wool']),
  C('cableKnit', 'Cable Knit', 'white', 'mist', 1100, ['cosy', 'wool']),
  C('mossGreen', 'Moss Cardigan', 'teal', 'green', 1000, ['cosy', 'leafy']),
  C('leafPrint', 'Leaf Print', 'lime', 'green', 900, ['leafy', 'loud']),
  C('nightShirt', 'Night Shirt', 'navy', 'sky', 800, ['sleepy']),
  C('moonRobe', 'Moon Robe', 'night', 'sand', 1600, ['sleepy', 'dramatic']),
  C('suitGrey', 'Grey Suit', 'slate', 'white', 2800, ['formal', 'drab']),
  C('suitNavy', 'Navy Suit', 'navy', 'white', 3000, ['formal']),
  C('waistcoat', 'Ledger Waistcoat', 'plum', 'sand', 2200, ['formal', 'money']),
  C('sequin', 'Sequin Jacket', 'plum', 'cyan', 3600, ['loud', 'dramatic']),
  C('flame', 'Flame Shirt', 'red', 'sand', 1800, ['loud']),
  C('cheeseTop', 'Cheese Rind Top', 'sand', 'orange', 1500, ['cheese', 'loud']),
  C('striped', 'Stripy Jumper', 'mist', 'navy', 900, ['plain', 'nautical']),
  C('gym', 'Gym Singlet', 'red', 'white', 700, ['sporty']),
  C('track', 'Track Top', 'sky', 'white', 900, ['sporty']),
  C('plumeCape', 'Plume Cape', 'orange', 'white', 8000, ['couture', 'dramatic'], { couture: true }),
  C('velvetCoat', 'Velvet Rope Coat', 'plum', 'red', 12000, ['couture', 'formal'], { couture: true }),
  C('neonSuit', 'Neon Suit', 'cyan', 'plum', 14000, ['couture', 'loud'], { couture: true }),
  C('mothEaten', 'Moth-Eaten Finery', 'mist', 'plum', 600, ['dramatic', 'drab']),
  C('apron', "Store Apron", 'navy', 'sand', 400, ['practical', 'money']),
  C('wetWeather', 'Wet Weather Gear', 'sand', 'night', 1600, ['damp', 'practical']),
  C('beanSuit', 'Bean Suit', 'red', 'orange', 2000, ['money', 'loud', 'cheese']),
];
export const HAT_ITEMS = [
  H('capBlue', 'Blue Cap', 'cap', 'blue', 'white', 500, ['sporty', 'plain']),
  H('strawHat', 'Straw Hat', 'straw', 'sand', 'red', 700, ['leafy', 'plain']),
  H('bobbleHat', 'Bobble Hat', 'bobble', 'red', 'white', 600, ['cosy', 'wool']),
  H('topHat', 'Top Hat', 'top', 'ink', 'red', 2400, ['formal', 'dramatic']),
  H('beret', 'Beret', 'beret', 'plum', 'night', 1200, ['dramatic', 'couture']),
  H('paperCrown', 'Paper Crown', 'crown', 'sand', 'orange', 900, ['loud', 'dramatic']),
  H('potHat', 'Pot', 'pot', 'night', 'slate', 300, ['practical', 'damp']),
  H('cheeseHat', 'Cheese Hat', 'cheese', 'sand', 'orange', 1500, ['cheese', 'loud']),
  H('bigBow', 'Big Bow', 'bow', 'red', 'plum', 800, ['loud']),
  H('sou', "Sou'wester", 'sou', 'sand', 'orange', 1000, ['damp', 'nautical']),
  H('plumeHat', 'Plume Hat', 'plume', 'plum', 'orange', 9000, ['couture', 'dramatic'], { couture: true }),
  H('bucketHat', 'Bucket Hat', 'bucket', 'slate', 'mist', 400, ['damp', 'drab']),
];
export const GLASSES_ITEMS = [
  G('roundSpecs', 'Round Specs', 'round', 'night', 900, ['formal']),
  G('squareSpecs', 'Square Specs', 'square', 'slate', 900, ['formal', 'drab']),
  G('shades', 'Shades', 'shades', 'ink', 1300, ['loud', 'sporty']),
  G('monocle', 'Monocle', 'monocle', 'sand', 2000, ['formal', 'money', 'dramatic']),
  G('starShades', 'Star Glasses', 'star', 'orange', 1600, ['loud', 'dramatic']),
  G('fakeMoustache', 'Moustache, Unconvincing', 'moustache', 'plum', 500, ['dramatic']),
];
export const UMBRELLAS = [
  U('umbrellaBlue', 'Blue Umbrella', 'blue', 'navy', 800, ['damp', 'plain']),
  U('umbrellaRed', 'Red Umbrella', 'red', 'plum', 800, ['damp', 'loud']),
  U('umbrellaFrog', 'Frog Umbrella', 'green', 'lime', 1000, ['damp', 'leafy']),
  U('umbrellaBean', 'Bean Umbrella', 'orange', 'red', 1200, ['damp', 'money']),
  U('umbrellaLace', 'Lace Parasol', 'white', 'mist', 2200, ['dramatic', 'formal']),
  U('umbrellaNeon', 'Neon Umbrella', 'cyan', 'plum', 3000, ['loud', 'couture'], { couture: true }),
];
