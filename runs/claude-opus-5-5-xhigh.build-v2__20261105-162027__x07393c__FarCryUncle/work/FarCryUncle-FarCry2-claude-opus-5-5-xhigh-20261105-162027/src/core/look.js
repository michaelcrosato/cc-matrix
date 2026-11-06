// The first-person step, replacing the rig's: Q and E stay ours, scenes and chase cameras override it.
export function installLook(ctx, cam) {
  const rig = ctx.camera;
  if (rig.preset !== 'first') return;
  rig.step = function (u) {
    if (cam.override) {
      this.camera.position.set(...cam.override.position);
      this.camera.lookAt(...cam.override.target);
      this.focus.copy(this.camera.position);
      return;
    }
    const k = cam.enabled ? 1 : 0;
    const scaleX = cam.padFrame ? cam.sensPad : cam.sensMouse;
    const assist = cam.padFrame ? cam.assist : 1;
    this.yaw -= u.input.mouseDelta.x * 0.0025 * scaleX * assist * k * cam.lookScale;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - u.input.mouseDelta.y * 0.0025 * scaleX * assist * (cam.invertY ? -1 : 1) * k * cam.lookScale));
    this.yaw += cam.kickYaw; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + cam.kickPitch));
    cam.kickYaw = 0; cam.kickPitch = 0;
    this.focus.copy(u.target);
    this.camera.position.copy(u.eye);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, cam.roll);
  };
}
export const makeCamState = () => ({ override: null, enabled: true, sensPad: 1, sensMouse: 1, invertY: false, padFrame: false, assist: 1, lookScale: 1, roll: 0, kickYaw: 0, kickPitch: 0 });
