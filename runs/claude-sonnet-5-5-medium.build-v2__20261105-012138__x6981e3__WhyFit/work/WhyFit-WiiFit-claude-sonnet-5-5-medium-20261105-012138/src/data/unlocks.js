// Sweat Jar milestones. Each unlocks a Locker Room item and a remark.
export const MILESTONES = [
  { at: 10, kind: 'headband', value: 'sky', name: 'Second headband', remark: 'Ten drips. A second headband. The first one is jealous.' },
  { at: 25, kind: 'cape', value: 'towel', name: 'Towel cape', remark: 'Twenty-five. A towel cape. It does nothing. It does it well.' },
  { at: 45, kind: 'badge', value: 'confidence', name: 'Confidence: no visible effect', remark: 'Forty-five. A badge: Confidence. No visible effect. I checked.' },
  { at: 70, kind: 'shoe', value: 'sand', name: 'Gold-ish shoes', remark: 'Seventy. Shoes the colour of effort.' },
  { at: 100, kind: 'top', value: 'red', name: 'Red top', remark: 'One hundred. A red top. Blame the Jar, not me.' },
  { at: 135, kind: 'hair', value: 'sand', name: 'Sunny hair', remark: 'One thirty-five. Your hair has opinions now. Sunny ones.' },
  { at: 175, kind: 'bottom', value: 'plum', name: 'Plum bottoms', remark: 'One seventy-five. The Jar is full. It wishes to be photographed.' },
];
export const JAR_MAX = 175;
export const unlockedAt = (drips) => MILESTONES.filter((m) => drips >= m.at);
export const isUnlocked = (drips, kind, value) => !MILESTONES.some((m) => m.kind === kind && m.value === value) || drips >= MILESTONES.find((m) => m.kind === kind && m.value === value).at;
