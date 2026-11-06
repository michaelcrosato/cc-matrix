// Ghost lanes play clips by index, sent over the wire. They never touch anyone's physics.
export const GHOST_CLIPS = ['idle', 'breathe', 'holdSlab', 'squat', 'hipCircle', 'stepL', 'stepR', 'diveReady', 'spread', 'tuck', 'pike', 'flail', 'hop', 'land', 'pose0', 'pose1', 'pose2', 'pose3', 'pose4', 'pose5', 'pose6', 'pose7', 'stand', 'flop'];
export const clipIndex = (name) => Math.max(0, GHOST_CLIPS.indexOf(name));
export const clipName = (i) => GHOST_CLIPS[i] || 'idle';
