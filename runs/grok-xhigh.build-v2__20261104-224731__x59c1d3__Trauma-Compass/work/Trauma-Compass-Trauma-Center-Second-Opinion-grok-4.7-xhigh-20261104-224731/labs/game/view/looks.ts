/**
 * @file The two looks. Harbor is the night hospital. Field is the wet sheet, full resolution, so a stitch reads at ten feet.
 */
import { defineLook } from '../../../engine';

defineLook('look:harbor', {
  description:
    'Harbor Light at night. Soft contact shadows, a warm teal grade, a thin outline on the people, and a little bloom on the lamp.',
  style: 'pbr',
  resolution: 'full',
  textures: 'smooth',
  filters: {
    ao: { scope: 'all', strength: 0.6 },
    aa: { scope: 'all' },
    outline: { scope: 'characters+objects', width: 2, darken: 0.2 },
    grade: { scope: 'all', temperature: 0.12, tint: 0.18, saturation: 0.95 },
    bloom: { scope: 'all', strength: 0.4, threshold: 0.82 },
  },
});

defineLook('look:field', {
  description: 'The operation. Wet highlights, contact, a little screen-space reflection, and full-frame smoothing.',
  style: 'pbr',
  resolution: 'full',
  textures: 'smooth',
  filters: {
    ao: { scope: 'all', strength: 0.7 },
    ssr: { scope: 'all', strength: 0.35 },
    aa: { scope: 'all' },
    bloom: { scope: 'all', strength: 0.28, threshold: 0.9 },
    grade: { scope: 'all', saturation: 1.05, contrast: 1.04 },
  },
});

defineLook('look:still', {
  description: 'Stillpoint laid over the field: teal, the colour pulled back, a vignette.',
  filters: {
    grade: { scope: 'all', saturation: 0.35, tint: 0.45, temperature: -0.2 },
    vignette: { scope: 'all', strength: 0.65 },
  },
});

defineLook('look:pulse', {
  description: 'Second Pulse laid over the field: amber and a streak of speed.',
  filters: {
    grade: { scope: 'all', temperature: 0.45, saturation: 1.2 },
    speedlines: { scope: 'all', density: 0.45 },
  },
});

defineLook('look:low', {
  description: 'Vitals failing: a red vignette and a colder grade.',
  filters: {
    vignette: { scope: 'all', strength: 0.8 },
    grade: { scope: 'all', temperature: 0.2, saturation: 0.8 },
  },
});
