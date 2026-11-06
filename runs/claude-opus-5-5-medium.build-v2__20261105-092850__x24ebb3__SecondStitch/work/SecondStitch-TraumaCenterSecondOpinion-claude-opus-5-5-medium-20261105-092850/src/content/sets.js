// The story sets as data: a lighting recipe and what stands where. Generic furniture comes from the Kenney pack.
export const SETS = {
  or7: { label: 'OR-7', wall: 0x2a3a46, floor: 0x2a3742, sun: 0.35, ambient: [0x8fa8c8, 0.5], lamp: [0, 3.2, 0, 14, 7, 0xfff0d0], rain: false, wide: { pos: [4.4, 3, 6.6], target: [0, 1, 0] } },
  scrub: { label: 'SCRUB ROOM', wall: 0x4a6a70, floor: 0x35464c, sun: 0.5, ambient: [0xbfd8e0, 0.7], lamp: [0, 3, 1, 8, 8, 0xe0fff5], wide: { pos: [3.4, 2.4, 6], target: [0, 1.1, 0] } },
  office: { label: "CHIEF'S OFFICE", wall: 0x4a3226, floor: 0x33241c, sun: 0.35, ambient: [0xc8c0b8, 0.7], lamp: [-1, 2.6, 1.4, 7, 7, 0xffe8c8], rain: true, wide: { pos: [3.6, 2.4, 6.4], target: [0, 1.1, -0.5] } },
  ward: { label: 'WARD 4', wall: 0x5a7080, floor: 0x3c4a54, sun: 0.5, ambient: [0xc8d8e8, 0.7], lamp: [0, 3, 0, 7, 9, 0xf0f8ff], wide: { pos: [4.2, 2.6, 6.6], target: [0, 1, 0] } },
  corridor: { label: 'A&E CORRIDOR', wall: 0x54646a, floor: 0x2f3b40, sun: 0.4, ambient: [0xb0c0c8, 0.6], lamp: [0, 3, 0, 10, 8, 0xfff4d8], wide: { pos: [0.5, 2.1, 7.2], target: [0, 1.1, -2] } },
  atrium: { label: 'FOUNDATION ATRIUM', wall: 0xe8e4d8, floor: 0xc8c4b4, sun: 1, ambient: [0xfff6e0, 0.9], lamp: [0, 4, 0, 10, 12, 0xfff0c0], wide: { pos: [4, 2.8, 7], target: [0, 1.3, -1] } },
  roof: { label: 'HELIPAD', wall: 0x101828, floor: 0x20262e, sun: 0.25, ambient: [0x486080, 0.6], lamp: [1, 4, 1, 10, 9, 0xbfd8ff], rain: true, outdoor: true, wide: { pos: [5, 3.4, 7.4], target: [0, 1, 0] } },
  morning: { label: 'THE ROOF, MORNING', wall: 0x9fd0e8, floor: 0x50585e, sun: 1.1, ambient: [0xffe8c8, 0.9], lamp: [0, 4, 0, 2, 6, 0xffffff], outdoor: true, dawn: true, wide: { pos: [4, 2.6, 7], target: [0, 1.2, 0] } },
};
