// Where you stand to fix a truck, or to get in.
export function repairVehicle(game, v) { v.hp = Math.max(v.hp, 50); v.stalled = false; v.cough = 3; v.onFire = 0; game.audio.play('starter'); game.events.emit('repaired', v); game.notice('SHE COUGHS. SHE RUNS.'); }
export class RepairPart {
  bonnet() { return [this.x + Math.sin(this.yaw) * (this.t.size[2] + 0.9), this.z + Math.cos(this.yaw) * (this.t.size[2] + 0.9)]; }
  door() { const a = this.yaw + Math.PI / 2; return [this.x + Math.sin(a) * 1.8, this.z + Math.cos(a) * 1.8]; }
}
