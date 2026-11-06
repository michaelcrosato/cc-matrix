(() => { const axes = [0, 0, 0, 0], buttons = Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes, buttons,
    vibrationActuator: { playEffect() { return Promise.resolve('complete'); }, reset() { return Promise.resolve('complete'); } } };
  window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; })();
