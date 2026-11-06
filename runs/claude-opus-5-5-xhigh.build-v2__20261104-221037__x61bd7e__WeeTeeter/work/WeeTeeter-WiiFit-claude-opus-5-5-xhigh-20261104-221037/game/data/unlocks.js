/* data/unlocks.js: what Gerald's minutes open. */
(() => {
const G = window.G;
G.DATA.unlocks = [
  { id: 'towel', minutes: 5, name: 'Towel', say: G.DATA.lines.unlocks.towel, wear: true },
  { id: 'headband', minutes: 10, name: 'Headband', say: G.DATA.lines.unlocks.headband, wear: true },
  { id: 'sunhat', minutes: 15, name: 'Sunhat', say: G.DATA.lines.unlocks.sunhat, wear: true },
  { id: 'bowtie', minutes: 20, name: 'Tiny bow tie', say: G.DATA.lines.unlocks.bowtie },
  { id: 'hat', minutes: 25, name: "Gertrude's Spare Hat", say: G.DATA.lines.unlocks.hat, wear: true },
  { id: 'friend', minutes: 30, name: "Gerald's friend", say: G.DATA.lines.unlocks.friend }
];
})();
