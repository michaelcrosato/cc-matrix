/**
 * @file The device used last, the mouse's running total for the lean, and pause and the Programme read from the devices directly:
 * `input.pressed` only holds a press for the last sim step's sample, and a frame can run several steps, so a read in the frame
 * misses it. Menus have no mouse bindings for the engine's own tracking to see, either.
 */
export function createDevices(root: HTMLElement, map: () => string, open: () => number) {
  const setDevice = (device: string) => {
    if (root.dataset.device !== device) root.dataset.device = device;
  };
  addEventListener('keydown', () => setDevice('keys'), true);
  addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') setDevice('mouse');
  }, true); // prettier-ignore
  addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && Math.abs(event.movementX) + Math.abs(event.movementY) > 2) setDevice('mouse');
  }, true); // prettier-ignore
  const mouseTotal = [0, 0];
  const settingsOf = { mouse: 1 };
  addEventListener('pointermove', (event) => {
    if (!document.pointerLockElement) return;
    mouseTotal[0] += event.movementX * 0.0035 * settingsOf.mouse;
    mouseTotal[1] -= event.movementY * 0.0035 * settingsOf.mouse;
  });
  let place: [number, number] | null = null; // the pointer over Sand Garden's tray, −1 to 1 each way
  addEventListener('pointermove', (event) => {
    place = [(event.clientX / innerWidth) * 2 - 1, 1 - (event.clientY / innerHeight) * 2];
  });
  const keysAsked = { pause: false, plan: false };
  addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Escape') keysAsked.pause = true;
    if (event.code === 'Tab') {
      keysAsked.plan = true;
      event.preventDefault();
    }
  });
  // Esc under pointer lock goes to the browser, which only gives the pointer back: that is the player asking to pause
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && (map() === 'actionMap:balance' || map() === 'actionMap:roam') && !open())
      keysAsked.pause = true;
  });
  const padWas = { pause: false, plan: false };
  function askedFor(): { pause: boolean; plan: boolean } {
    const pad = (navigator.getGamepads?.() ?? []).find((one) => one);
    const options = pad?.buttons[9]?.pressed ?? false;
    const triangle = pad?.buttons[3]?.pressed ?? false;
    const out = {
      pause: keysAsked.pause || (options && !padWas.pause && !pad?.buttons[8]?.pressed),
      plan: keysAsked.plan || (triangle && !padWas.plan),
    };
    [padWas.pause, padWas.plan] = [options, triangle];
    [keysAsked.pause, keysAsked.plan] = [false, false];
    return out;
  }
  return { setDevice, askedFor, mouseTotal, settingsOf, pointer: () => place };
}
