/* ---- THE CONTROLS: one preset for every play scene (PC keys, the pad's standard mapping, two keyboard halves) ---- */
TT.KEYS = (() => {
  const K = Object.assign({}, E.Input.DEFAULT);
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete K[k];
  Object.assign(K, {
    x: ['Space', 'Pad0'], sq: ['KeyF', 'Pad2'], ci: ['KeyC', 'Mouse2', 'Pad1'], tri: ['KeyR', 'Pad3'],
    l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7'], view: ['KeyV', 'Pad11'], mouseL: ['Mouse0']
  });
  K.confirm = ['Enter', 'Space', 'Pad0']; K.cancel = ['Escape', 'Backspace', 'Pad1'];
  Object.defineProperty(K, 'halves', { enumerable: false, value: {
    left: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], turbo: ['ShiftLeft'], x: ['Space'], sq: ['KeyF'], ci: ['KeyC'], tri: ['KeyR'], l1: ['KeyQ'], r1: ['KeyE'], view: ['KeyV'], mouseL: ['Mouse0'], start: ['Digit1'], pause: ['Escape', 'Digit1'], confirm: ['Space', 'Enter'], cancel: ['Escape'] },
    right: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], turbo: ['Comma', 'Numpad0'], x: ['Period', 'Numpad1'], sq: ['Slash', 'Numpad2'], ci: ['Semicolon', 'Numpad3'], tri: ['Quote', 'Numpad6'], l1: ['KeyK', 'Numpad4'], r1: ['KeyL', 'Numpad5'], view: ['KeyM'], mouseL: [], start: ['Digit2', 'NumpadEnter'], pause: ['Digit2', 'Backspace'], confirm: ['Period', 'NumpadEnter'], cancel: ['Backspace'] }
  } });
  return K;
})();
