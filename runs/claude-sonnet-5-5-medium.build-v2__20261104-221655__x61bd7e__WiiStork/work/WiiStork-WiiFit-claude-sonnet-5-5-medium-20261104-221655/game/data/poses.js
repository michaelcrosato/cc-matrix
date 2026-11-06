// Held poses: a clip, a window in seconds and the way the body faces. Add a row; the Pose Viewer in Dev Mode prints new ones.
window.G.POSES = {
  stork:    { clip: '111_39_part1', a: 3.6, b: 7.0, tgt: 1.57 },
  kneelift: { clip: '111_39_part2', a: .5,  b: 2.4, tgt: 1.57 },
  triangle: { clip: '111_39_part3', a: 2.2, b: 5.2, tgt: 1.2 },
  warrior:  { clip: '111_39_part3', a: 6.6, b: 7.6, tgt: 1.57 },
  lunge:    { clip: '111_38_part1', a: 2.9, b: 5.0, tgt: .25 },
  dog:      { clip: '111_38_part2', a: 2.8, b: 5.2, tgt: .25 },
  fold:     { clip: '111_38_part2', a: 8.0, b: 8.8, tgt: .25 },
  plank:    { clip: '111_41_part3', a: 3.4, b: 6.4, tgt: .25 }
};
// the five poses of Sun Flow, in order
window.G.FLOW = ['lunge', 'dog', 'triangle', 'warrior', 'stork'];
