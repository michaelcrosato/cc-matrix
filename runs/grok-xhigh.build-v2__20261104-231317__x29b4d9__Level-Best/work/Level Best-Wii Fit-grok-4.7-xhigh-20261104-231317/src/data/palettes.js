/** Four resort lights. Hex strings stay as written in the art notes. */
export const PALETTES = {
  dawn: {
    skyTop: 0x8fb4e0, skyMid: 0xf6cfd8, skyLow: 0xffe3b5,
    sea: 0x3e8fb5, seaHi: 0xa9e3e4, sun: 0xffe6d8, sunIntensity: 2.6,
    hemiSky: 0xfce8f0, hemiGround: 0x7c8bb5, hemi: 1.35,
  },
  noon: {
    skyTop: 0x6fc3e8, skyMid: 0xbfe9f0, skyLow: 0xfff2d0,
    sea: 0x16a8b0, seaHi: 0x8cf0dd, sun: 0xfffbe8, sunIntensity: 3.2,
    hemiSky: 0xffffff, hemiGround: 0xa09080, hemi: 1.35,
  },
  golden: {
    skyTop: 0x7fb7c9, skyMid: 0xf7d9a6, skyLow: 0xf59e6c,
    sea: 0x1f9ea3, seaHi: 0x71dccb, sun: 0xfff0d0, sunIntensity: 3.1,
    hemiSky: 0xfff4e0, hemiGround: 0x8a7fa0, hemi: 1.25,
  },
  dusk: {
    skyTop: 0x2b2f6b, skyMid: 0xa8558f, skyLow: 0xf58a5c,
    sea: 0x24406f, seaHi: 0xc26a8c, sun: 0xffb98a, sunIntensity: 2.4,
    hemiSky: 0xb48ad0, hemiGround: 0x2b2f5f, hemi: 1.1,
  },
};

export const PALETTE_ORDER = ['dawn', 'noon', 'golden', 'dusk'];
