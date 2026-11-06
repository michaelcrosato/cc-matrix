// The game's look: crisp outlines on tools and creatures, none on tissue. Params are free to change per frame.
export const LOOK = (sat = 1, vig = 0.3, spread = 0, pix = 1) => ({
  scene: [{ id: 'vignette', params: { intensity: vig } }, { id: 'adjust', params: { saturation: sat, contrast: 1 } }, { id: 'chromatic', params: { spread } }],
  actors: { pixel: { size: pix, outline: 0.85, crease: 0.2 }, filters: [] },
  environment: { pixel: { size: pix, outline: 0, crease: 0 }, filters: [] },
});
export function applyLook(engine, st, key) { const k = `${st.sat.toFixed(2)}|${st.vig.toFixed(2)}|${st.spread.toFixed(3)}|${st.pix}`; if (k === key) return key; engine.setLook(LOOK(st.sat, st.vig, st.spread, st.pix)); return k; }
