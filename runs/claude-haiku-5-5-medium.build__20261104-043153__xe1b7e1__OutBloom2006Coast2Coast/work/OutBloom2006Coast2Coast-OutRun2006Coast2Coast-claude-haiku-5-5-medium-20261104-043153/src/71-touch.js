// Touch-only devices (plan §7.21): a phone or a tablet with no fine pointer, no pad and no key pressed shows the
// "Controller or keyboard required" notice and its Settings button; the attract mode runs anyway. Any key or pad
// press, or a pad connecting, clears it at once.
(() => {
'use strict';
const OB = window.OB || (window.OB = {});
const detect = () => {
  try {
    if (typeof navigator === 'undefined' || typeof matchMedia === 'undefined') return false;
    const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const fine = matchMedia('(any-pointer: fine)').matches;
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).some(p => p) : false;
    return !!touch && !fine && !pads && !OB.env.keyed;
  } catch (e) { return false; }
};
OB.env.keyed = false;
OB.env.touchOnly = detect();
const clear = () => { OB.env.keyed = true; OB.env.touchOnly = false; };
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', clear);
  window.addEventListener('gamepadconnected', clear);
}
OB.touchDetect = detect;
})();
