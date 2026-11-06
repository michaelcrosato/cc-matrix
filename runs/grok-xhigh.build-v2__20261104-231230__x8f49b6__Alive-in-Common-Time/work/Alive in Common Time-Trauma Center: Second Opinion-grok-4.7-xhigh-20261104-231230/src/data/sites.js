/** Organ paints. The view reads these. The sim only knows site ids. */

export const SITES = {
  forearm: { color: '#E8B48F', accent: '#c47a62', name: 'Forearm' },
  skin: { color: '#E8B48F', accent: '#d4893a', name: 'Abdomen' },
  bowel: { color: '#E87A8B', accent: '#b84860', name: 'Bowel' },
  liver: { color: '#8E2A3A', accent: '#c45a4a', name: 'Liver' },
  stomach: { color: '#E9967A', accent: '#c46a55', name: 'Stomach' },
  brain: { color: '#E8A9B8', accent: '#6a8ac4', name: 'Brain' },
  heart: { color: '#C4364F', accent: '#7a1830', name: 'Heart' },
  lung: { color: '#F0A3A8', accent: '#d07078', name: 'Lung' },
  aorta: { color: '#B52A3E', accent: '#6e1424', name: 'Aorta' },
};

export function siteLook(organ) {
  return SITES[organ] || SITES.skin;
}
