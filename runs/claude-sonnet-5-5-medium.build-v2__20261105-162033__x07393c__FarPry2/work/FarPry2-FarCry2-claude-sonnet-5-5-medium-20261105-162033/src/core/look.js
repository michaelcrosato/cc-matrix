// First-person camera step: replaces the rig's own so E/Q don't turn the view and menus can freeze it.
export function installLook(ctx, cam) {
  ctx.camera.step = function (u) {
    if (cam.override) {
      this.camera.position.set(...cam.override.position);
      this.camera.lookAt(...cam.override.target);
      this.focus.copy(this.camera.position);
      return;
    }
    const k = cam.enabled ? 1 : 0;
    const dev = cam.device === 'pad';
    const sens = (dev ? cam.sensPad : cam.sensMouse) * (cam.slow || 1);
    let dx = u.input.mouseDelta.x, dy = u.input.mouseDelta.y;
    if (dev) { dx = Math.sign(dx) * Math.pow(Math.abs(dx) / 8, 1.6) * 8; dy = Math.sign(dy) * Math.pow(Math.abs(dy) / 8, 1.6) * 8; }
    this.yaw -= dx * 0.0025 * sens * k;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * 0.0025 * sens * (cam.invertY ? -1 : 1) * k));
    this.focus.copy(u.target);
    this.camera.position.copy(u.eye);
    this.camera.rotation.set(this.pitch + (cam.punch || 0), this.yaw, cam.roll || 0, 'YXZ');
  };
}
export function installPad(ctx, PAD_MAP) {
  ctx.input.gamepadButtons = { ...PAD_MAP };
}
