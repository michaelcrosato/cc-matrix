// Tyres. Stock rows in carphysics.js stay in place until the player buys a set.
export const TYRES = {
  street: { id: 'street', name: 'STREET', tyreMu: 0.95, alphaP: 0.14, dirt: 0.45, wearX: 0.8, price: 600, line: 'THEY LAST. THEY ALSO SQUEAL.' },
  sport: { id: 'sport', name: 'SPORT', tyreMu: 1.0, alphaP: 0.125, dirt: 0.5, wearX: 1.0, price: 1200, line: 'A GOOD HONEST TYRE.' },
  semi: { id: 'semi', name: 'SEMI-SLICK', tyreMu: 1.12, alphaP: 0.115, dirt: 0.42, wearX: 1.4, price: 4800, line: 'MORE GRIP. LESS OF THE TYRE AT THE END.' },
  slick: { id: 'slick', name: 'RACING SLICK', tyreMu: 1.3, alphaP: 0.105, dirt: 0.35, wearX: 2.2, price: 12000, line: 'VERY FAST. VERY BRIEF. HOPELESS ON DIRT.' },
  rally: { id: 'rally', name: 'RALLY DIRT', tyreMu: 0.84, alphaP: 0.17, dirt: 0.72, wearX: 1.2, price: 2500, line: 'FOR THE RED CLAY. NOT FOR ANYTHING ELSE.' },
};
export const TYRE_IDS = Object.keys(TYRES);
