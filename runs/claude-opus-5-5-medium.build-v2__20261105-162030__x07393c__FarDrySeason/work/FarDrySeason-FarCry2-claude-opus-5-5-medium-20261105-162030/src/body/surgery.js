// Field surgery: four scenes in your own hands (section 9).
const SCENES = [
  { clip: 'SurgeryPliers', items: ['tool-pliers', 'prop-forearm'], sounds: [[0.6, 'pliers'], [1.7, 'pliers'], [2.3, 'knife'], [2.5, 'grunt']], blood: [2.3], label: 'PLIERS' },
  { clip: 'SurgeryKnife', items: ['tool-knife', 'prop-thigh'], sounds: [[0.8, 'knife'], [1.6, 'grunt'], [2.2, 'knife']], blood: [1.4, 2.2], label: 'KNIFE' },
  { clip: 'SurgeryFinger', items: [], sounds: [[1.9, 'finger-snap'], [2.1, 'grunt']], blood: [], label: 'FINGER' },
  { clip: 'SurgeryLighter', items: ['tool-lighter', 'prop-burn'], sounds: [[0.3, 'lighter'], [1.2, 'hiss'], [2.2, 'grunt']], blood: [], label: 'LIGHTER' },
];
export class SurgeryPart {
  startSurgery() {
    const p = this.p, game = this.game, idx = this.lastDamageKind === 'fire' ? 3 : (this.surgeryN++ % 3), scene = SCENES[idx];
    p.surgery = { t: 0, scene };
    game.vm.playTool(scene.clip, scene.items);
    game.events.emit('surgeryStart', scene.label);
  }
}
