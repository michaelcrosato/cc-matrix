/* start it up */
(() => {
const G = SD, E = G.E, game = G.game, W = G.W;
/* saves: three slots + autosave through the engine's own screens */
game.saves.write = () => ({ data: JSON.parse(JSON.stringify(G.S)), place: (W.A ? W.A.label : 'Jersey'), level: (G.S.chap || 0) + 1 });
game.saves.read = save => { G.S = Object.assign(G.fresh(), save.data); G.S.hp = Math.max(G.S.hp, 40); W.lastRank = G.rank(); game.go('play', { area: G.S.area, demo: false }, { fade: 'black' }); };
game.start({ scene: 'title', scenes: G.scenes, boot: { title: 'THE SOPRANO DIET', steps: [['Heating up the gravy', () => { G.applySettings(); }], ['Counting the envelopes', () => {}]] } });
})();
