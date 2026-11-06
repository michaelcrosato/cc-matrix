/** First-person look. Re-install after every setCamera while the preset is first. */
let wantLock = false;

export function setWantLock(v) {
  wantLock = !!v;
}

export function installLook(ctx, cam) {
  ctx.camera.step = function (u) {
    if (cam.override) {
      this.camera.position.set(cam.override.position[0], cam.override.position[1], cam.override.position[2]);
      this.camera.lookAt(cam.override.target[0], cam.override.target[1], cam.override.target[2]);
      this.focus.copy(this.camera.position);
      return;
    }
    const k = cam.enabled ? 1 : 0;
    const mx = u.input.mouseDelta.x;
    const my = u.input.mouseDelta.y;
    this.yaw -= mx * 0.0025 * cam.sensX * k;
    const inv = cam.invertY ? -1 : 1;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - my * 0.0025 * cam.sensY * inv * k));
    this.focus.copy(u.target);
    this.camera.position.copy(u.eye);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  };
  ctx.input.gamepadButtons = {
    0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle',
    4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2',
    8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3',
    12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight',
  };
  Object.defineProperty(ctx.input, 'wantsPointerLock', {
    get: () => wantLock,
    set() {},
    configurable: true,
  });
}

export const LOOK = {
  scene: [
    { id: 'adjust', params: { brightness: 0, contrast: 1.06, saturation: 1.05, warmth: 0.04 } },
    { id: 'chromatic', params: { spread: 0 } },
    { id: 'vignette', params: { intensity: 0.28, softness: 0.7, amount: 1 } },
  ],
  actors: { pixel: { size: 1, outline: 0.45, crease: 0.08 }, filters: [] },
  environment: { pixel: { size: 1, outline: 0.32, crease: 0.05 }, filters: [] },
};
