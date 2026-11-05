// 90-entry.js: the page's entry. In a browser the game starts here (the boot screen, then the title). Under Node (the
// tests) nothing starts: the tests build a Sim and step it with the engine's headless clock.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  TC.game = TC.start();
}
