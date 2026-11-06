// The game's look: crisp outlines on tools and creatures, none on tissue. Filter parameters tween for
// free; the Settings "Look" option can swap in any engine look.
import { LOOK_PRESETS } from '../../pixel-engine.js';

export const SURGICAL = (sat = 1, vig = 0.3, spread = 0, pixel = 1) => ({
  scene: [{ id: 'vignette', params: { intensity: vig } }, { id: 'adjust', params: { saturation: sat, contrast: 1 } }, { id: 'chromatic', params: { spread } }],
  actors: { pixel: { size: pixel, outline: 0.85, crease: 0.2 }, filters: [] },
  environment: { pixel: { size: pixel, outline: 0, crease: 0 }, filters: [] },
});

export const LOOK_CHOICES = [
  ['surgical', 'SURGICAL'], ['pixel_heroes', 'PIXEL HEROES'], ['noir', 'NOIR'], ['playstation', 'GREY BOX'], ['cel_cartoon', 'CEL CARTOON'], ['vhs_rental', 'VHS RENTAL'], ['handheld', 'HANDHELD'], ['ps1_horror', 'HORROR'],
];

export function applyLook(engine, settings, sat = 1, vig = 0.3, spread = 0) {
  if (settings.look && settings.look !== 'surgical' && LOOK_PRESETS[settings.look]) {
    if (engine._gameLook !== settings.look) { engine.setLook(LOOK_PRESETS[settings.look]); engine._gameLook = settings.look; }
    return;
  }
  engine._gameLook = 'surgical';
  engine.setLook(SURGICAL(sat, vig, spread, settings.pixelSize ?? 1));
}
