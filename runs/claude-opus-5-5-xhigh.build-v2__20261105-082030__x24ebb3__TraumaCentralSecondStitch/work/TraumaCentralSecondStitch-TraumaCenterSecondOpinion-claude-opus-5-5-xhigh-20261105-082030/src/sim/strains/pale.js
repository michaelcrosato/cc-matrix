// The pale strain of Op 10. It lies curled along the spine and does not fight. It only breathes.
export const pale = {
  init(sim, e) {
    e.task = false;
    e.phase = 'curled';
    e.t = 0;
  },
  update(sim, e, dt) {
    e.t += dt;
  },
};
