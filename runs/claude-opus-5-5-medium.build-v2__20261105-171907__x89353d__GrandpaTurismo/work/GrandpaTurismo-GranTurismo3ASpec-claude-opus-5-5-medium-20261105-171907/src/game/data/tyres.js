export const TYRES = [
  { id: 'street', name: 'STREET', tyreMu: 0.95, alphaP: 0.14, dirt: 0.45, wearX: 0.8, price: 600, line: 'FOR THE SHOPS. THEY LAST A LONG TIME.' },
  { id: 'sport', name: 'SPORT', tyreMu: 1.0, alphaP: 0.125, dirt: 0.5, wearX: 1.0, price: 1200, line: 'A GOOD TYRE. THERE IS NOTHING MORE TO SAY.' },
  { id: 'semi', name: 'SEMI-SLICK', tyreMu: 1.12, alphaP: 0.115, dirt: 0.42, wearX: 1.4, price: 4800, line: 'MORE GRIP. THEY WEAR OUT WHILE YOU WATCH.' },
  { id: 'slick', name: 'RACING SLICK', tyreMu: 1.3, alphaP: 0.105, dirt: 0.35, wearX: 2.2, price: 12000, line: 'THE MOST GRIP. BRING A SPARE SET AND A STOPWATCH.' },
  { id: 'rally', name: 'RALLY DIRT', tyreMu: 0.84, alphaP: 0.17, dirt: 0.72, wearX: 1.2, price: 2500, line: 'FOR DIRT. ON TARMAC THEY ARE AN APOLOGY.' },
];
export const TYRE = Object.fromEntries(TYRES.map((t) => [t.id, t]));
