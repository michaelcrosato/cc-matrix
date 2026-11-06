// The first-person view: the engine rig's step replaced so E/Q stay free and the view can be overridden.
export function installLook(ctx, cam) {
  const rig = ctx.camera;
  if (rig.preset !== 'first') return;
  rig.camera.rotation.order = 'YXZ';
  rig.camera.far = 1400;
  rig.camera.updateProjectionMatrix();
  rig.step = function (u) {
    if (cam.override) {
      this.camera.position.set(...cam.override.position);
      this.camera.lookAt(...cam.override.target);
      this.focus.copy(this.camera.position);
      return;
    }
    const k = cam.enabled ? 1 : 0;
    this.yaw -= u.input.mouseDelta.x * 0.0025 * cam.sensX * k;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - u.input.mouseDelta.y * 0.0025 * cam.sensY * (cam.invertY ? -1 : 1) * k));
    this.focus.copy(u.target);
    this.camera.position.copy(u.eye);
    this.camera.rotation.set(this.pitch + (cam.kickPitch || 0), this.yaw + (cam.kickYaw || 0), cam.roll || 0);
  };
}
