// Prompts: what each action shows on each device. The last device used picks; ui/glyphs.js draws it.
// Every prompt action: what it shows on each device.
export const ACTION_GLYPHS = {
  confirm: { pad: 'cross', key: 'ENTER', mouse: 'lmb' }, back: { pad: 'circle', key: 'ESC', mouse: 'rmb' }, alt: { pad: 'square', key: 'T', mouse: 'key:T' }, info: { pad: 'triangle', key: 'I', mouse: 'key:I' },
  tabL: { pad: 'L1', key: 'Q', mouse: 'key:Q' }, tabR: { pad: 'R1', key: 'E', mouse: 'key:E' }, tabs: { pad: 'L1 R1', key: 'Q E', mouse: 'key:Q E' },
  move: { pad: 'dpad', key: 'ARROWS', mouse: 'mouse' }, moveX: { pad: 'dpad', key: '< >', mouse: 'wheel' }, wheel: { pad: 'dpad', key: '< >', mouse: 'wheel' },
  pause: { pad: 'options', key: 'ESC', mouse: 'key:ESC' }, steer: { pad: 'stick', key: 'A D', mouse: 'key:A D' }, throttle: { pad: 'R2', key: 'W', mouse: 'key:W' }, brake: { pad: 'L2', key: 'S', mouse: 'key:S' },
  handbrake: { pad: 'square', key: 'SPACE', mouse: 'key:SPACE' }, shift: { pad: 'R1 L1', key: 'E Q', mouse: 'key:E Q' }, camera: { pad: 'triangle', key: 'C', mouse: 'key:C' }, lookBack: { pad: 'circle', key: 'B', mouse: 'key:B' }, look: { pad: 'stickR', key: 'DRAG', mouse: 'rmb' }, recover: { pad: 'triangle', key: 'R', mouse: 'key:R' },
  drag: { pad: 'stickR', key: 'DRAG', mouse: 'lmb' }, more: { pad: 'triangle', key: 'M', mouse: 'key:M' }, focus: { pad: 'L1 R1', key: 'Q E', mouse: 'lmb' }, slow: { pad: 'R2', key: 'SHIFT', mouse: 'key:SHIFT' }, play: { pad: 'cross', key: 'ENTER', mouse: 'lmb' }, scrub: { pad: 'dpad', key: '< >', mouse: 'key:< >' }, hide: { pad: 'square', key: 'H', mouse: 'key:H' },
};
export function specFor(action, device) { const g = ACTION_GLYPHS[action] ?? ACTION_GLYPHS.confirm; return g[device === 'pad' ? 'pad' : device === 'mouse' ? 'mouse' : 'key']; }
