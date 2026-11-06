'use strict';

const GROUPS = {
  stillness: { name: 'Stillness', color: '#8dc4ad', light: '#e2f2e9', icon: '✳', description: 'A little room to breathe.' },
  strength: { name: 'Strength', color: '#e8ad8d', light: '#fceadf', icon: '✦', description: 'Find strength without the shouting.' },
  cardio: { name: 'Cardio', color: '#efc76f', light: '#fff3d1', icon: '♪', description: 'Move to your own very good beat.' },
  balance: { name: 'Balance', color: '#9fbde0', light: '#e9f1fc', icon: '◇', description: 'A gentle negotiation with gravity.' }
};

const ACTIVITIES = [
  { id: 'stork', name: 'Stork Stand', group: 'stillness', day: 1, seconds: 45, kind: 'hold', icon: '✳', tagline: 'One leg. Many feelings.', instruction: 'Guide your dot into the moving ring and hold it there. Watch out for the gull.', clip: 'standing' },
  { id: 'sun', name: 'Sun Flow', group: 'stillness', day: 2, seconds: 80, kind: 'breath', icon: '☼', tagline: 'Five poses, one lovely breath.', instruction: 'Stay centered. Hold Space or a trigger as the circle grows; release as it shrinks.', clip: 'yoga' },
  { id: 'candle', name: 'Quiet Candle', group: 'stillness', day: 3, seconds: 60, kind: 'candle', icon: '♨', tagline: 'Out-still a candle.', instruction: 'Keep your dot steady to help the flame grow. Settle back into the ring to relight it.', clip: 'standing' },
  { id: 'squat', name: 'Squat Rail', group: 'strength', day: 1, seconds: 60, kind: 'rep', icon: '↕', tagline: 'Down to earth, back again.', instruction: 'Hold Space or a trigger to lower on the beat. Release to rise, and stay balanced.', clip: 'squat' },
  { id: 'push', name: 'Push-Up', group: 'strength', day: 2, seconds: 60, kind: 'rep', icon: '≋', tagline: 'The floor is very supportive.', instruction: 'Hold Space or a trigger to lower on the beat. Release to press up.', clip: 'pushup' },
  { id: 'lunge', name: 'Side Lunge', group: 'strength', day: 3, seconds: 60, kind: 'rep', icon: '↔', tagline: 'A step in the right direction. Or left.', instruction: 'Lean toward the highlighted side and hold Space on the beat, then release.', clip: 'lunge' },
  { id: 'step', name: 'Step Class', group: 'cardio', day: 1, seconds: 60, kind: 'step', icon: '♪', tagline: 'Meet the beat where it is.', instruction: 'Press the arrow or WASD matching each arriving arrow. A good rhythm is better than a perfect one.', clip: 'walk' },
  { id: 'hoop', name: 'Hoop Hips', group: 'cardio', day: 2, seconds: 60, kind: 'hoop', icon: '◎', tagline: 'A well-rounded workout.', instruction: 'Circle your lean to spin the hoop. Tap Q or E to catch a hoop tossed from that side.', clip: 'standing' },
  { id: 'jog', name: 'Coastal Jog', group: 'cardio', day: 3, seconds: 70, kind: 'jog', icon: '➜', tagline: 'The scenic route is the point.', instruction: 'Alternate J and K, or the triggers, to jog. Lean to steer around the cups.', clip: 'run' },
  { id: 'slalom', name: 'Slalom', group: 'balance', day: 3, seconds: 60, kind: 'slalom', icon: '⚑', tagline: 'A very polite downhill.', instruction: 'Lean left or right through the gates. Lean forward to speed up, back to slow down.', clip: 'standing' },
  { id: 'tray', name: 'Tray Service', group: 'balance', day: 1, seconds: 60, kind: 'tray', icon: '◌', tagline: 'Keep your olives to yourself.', instruction: 'Keep the tray level as you walk. The olives would prefer not to become airborne.', clip: 'walk' },
  { id: 'laundry', name: 'Laundry Line', group: 'balance', day: 2, seconds: 60, kind: 'rope', icon: '⌁', tagline: 'A fine line between socks.', instruction: 'Balance over the line, lean forward to walk, and collect the fluttering pegs.', clip: 'walk' }
];

const DAY_INTROS = [
  'Welcome to the Institute for Gentle Improvement. We have been expecting you, in a very relaxed way.',
  'A new morning. The island has prepared absolutely no urgent emails.',
  'The sea is calm. Dennis is less calm, but is working on it.',
  'You have made space for yourself. The advanced mats have made space for you.',
  'It is the Gentle Games! Participation is mandatory only for the gulls.'
];

const CAST = [
  ['Gertrude', 'I used to be competitive. Now I am competitively relaxed.'],
  ['Dennis', 'I brought a towel in case of a personal breakthrough.'],
  ['Marisol', 'A wobble is just your body writing in cursive.'],
  ['Young Kevin', 'I am called Young Kevin because the other Kevin has tenure.']
];

const COLORS = ['#d98a68', '#e8b28d', '#8c573f', '#f1ccad', '#b87956', '#704638'];
const OUTFITS = ['#e98d78', '#79b9ac', '#e7b961', '#9b9dd1', '#638ca5', '#d77f9c'];
const clamp = (number, min, max) => Math.max(min, Math.min(max, number));
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function seeded(seed) {
  let state = seed >>> 0 || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
