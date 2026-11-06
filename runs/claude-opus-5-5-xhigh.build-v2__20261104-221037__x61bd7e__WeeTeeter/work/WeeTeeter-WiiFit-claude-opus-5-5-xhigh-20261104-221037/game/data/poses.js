/* data/poses.js: named poses, a window inside a clip and the way the body faces. The Pose Viewer in Dev Mode prints a row. */
(() => {
const G = window.G;
G.DATA.poses = {
  stork:    { clip: '111_39_part1', a: 3.6, b: 7.0, tgt: 1.57, name: 'Stork' },
  knee:     { clip: '111_39_part2', a: .5,  b: 2.4, tgt: 1.57, name: 'Knee Lift' },
  triangle: { clip: '111_39_part3', a: 2.2, b: 5.2, tgt: 1.2,  name: 'Triangle' },
  warrior:  { clip: '111_39_part3', a: 6.6, b: 7.6, tgt: 1.57, name: 'Warrior' },
  lunge:    { clip: '111_38_part1', a: 2.9, b: 5.0, tgt: .25,  name: 'Low Lunge' },
  dog:      { clip: '111_38_part2', a: 2.8, b: 5.2, tgt: .25,  name: 'Down Dog' },
  fold:     { clip: '111_38_part2', a: 8.0, b: 8.8, tgt: .25,  name: 'Forward Fold' },
  plank:    { clip: '111_41_part3', a: 3.4, b: 6.4, tgt: .25,  name: 'Low Plank' },
  sit:      { clip: 'Meditate',     a: 1.2, b: 3.2, tgt: 1.57, name: 'Cross-Legged' },
  stand:    { clip: 'Idle_Subtle',  a: 0,   b: 2,   tgt: 1.57, name: 'Standing' }
};
})();
