// src/game/data/tracks.js: every circuit as a closed polygon with rounded corners. Corner: [x, z, radius, y, width, bankDeg].
// s = 0 is the middle of the edge from the last corner to the first (the start line). runoff: metres from the road edge to the barrier.
// Every track but Cedar Ridge is right-handed overall, so the infield is on the driver's right: pit lanes go there, the main grandstand opposite. Cedar Ridge is left-handed and has no pits.
// pit: metres from the start line along the start straight. crests: [s, half length, height].
export const TRACKS = {
  kestrel: { name: 'Kestrel Park', surface: 'asphalt', edge: 'grass', runoff: 9, hour: 15, pit: { in: -260, box: 0, out: 260 }, corners: [
    [640, 0, 60, 0, 13, 0], [760, 190, 110, 2, 13, 0], [640, 330, 50, 6, 13, 0], [780, 470, 80, 8, 13, 0], [700, 720, 70, 12, 13, 0], [470, 760, 40, 14, 13, 0],
    [430, 520, 28, 14, 13, 0], [300, 560, 70, 12, 12, 0], [230, 760, 90, 10, 12, 0], [40, 800, 80, 8, 13, 0], [-120, 640, 120, 4, 13, 0], [-60, 340, 60, 2, 13, 0],
    [-190, 190, 70, 0, 13, 0], [-130, 0, 60, 0, 14, 0] ] },
  cedar: { name: 'Cedar Ridge', surface: 'asphalt', edge: 'grass', runoff: 5, hour: 10, crests: [[990, 40, 1.8]], corners: [
    [0, 420, 90, 0, 12, 0], [140, 620, 70, -6, 12, 0], [60, 780, 60, -12, 12, 0], [210, 930, 80, -20, 12, 0], [480, 960, 130, -32, 12, 2], [700, 800, 100, -38, 13, 3],
    [720, 520, 60, -36, 12, 0], [560, 420, 40, -28, 12, 0], [640, 240, 26, -20, 12, 0], [420, 270, 26, -10, 12, 0], [520, 90, 30, -2, 12, 0], [380, -60, 70, 6, 12, 0],
    [160, -150, 90, 8, 12, 0], [0, -60, 60, 4, 12, 0] ] },
  harbour: { name: 'Harbour Lights', surface: 'asphalt', edge: 'apron', runoff: 1.2, hour: 21, pit: { in: -280, box: 0, out: 280 }, corners: [
    [420, 0, 18, 0, 12, 0], [420, 190, 16, 0, 11, 0], [620, 190, 16, 1, 11, 0], [620, 400, 20, 2, 11, 0], [470, 520, 40, 3, 11, 0], [470, 660, 16, 3, 11, 0],
    [210, 660, 30, 2, 11, 0], [170, 610, 24, 2, 11, 0], [110, 660, 30, 2, 11, 0], [-60, 660, 16, 1, 11, 0], [-60, 420, 18, 1, 11, 0], [-190, 420, 16, 0, 11, 0],
    [-190, 200, 22, 0, 11, 0], [-300, 110, 30, 0, 11, 0], [-300, 0, 18, 0, 12, 0] ] },
  saltline: { name: 'Saltline Speedbowl', surface: 'asphalt', edge: 'apron', runoff: 3, hour: 18.5, pit: { in: -200, box: 0, out: 200 }, corners: [
    [632, 0, 215, 0, 18, 16], [0, 1095, 215, 0, 18, 16], [-632, 0, 215, 0, 18, 16] ] },
  redclay: { name: 'Red Clay Stage', surface: 'dirt', edge: 'gravel', runoff: 4, hour: 17, crests: [[420, 36, 2.6], [1660, 30, 2]], corners: [
    [240, 0, 40, 0, 9, 0], [300, 160, 25, 4, 9, 0], [170, 260, 30, 8, 9, 0], [280, 400, 20, 12, 9, 0], [120, 470, 16, 16, 9, 0], [0, 360, 30, 14, 9, 0],
    [-120, 470, 20, 18, 9, 0], [-300, 380, 35, 20, 9, 0], [-220, 220, 18, 14, 9, 0], [-380, 120, 30, 8, 9, 0], [-300, -40, 35, 4, 9, 0], [-60, -60, 40, 1, 9, 0] ] },
  proving: { name: 'Proving Ground', surface: 'asphalt', edge: 'apron', runoff: 14, hour: 11, corners: [
    [1040, 0, 80, 0, 28, 0], [1040, 240, 80, 0, 16, 0], [800, 240, 40, 0, 14, 0], [720, 150, 30, 0, 14, 0], [600, 240, 30, 0, 14, 0], [480, 150, 30, 0, 14, 0], [360, 240, 40, 0, 14, 0],
    [200, 240, 22, 0, 14, 0], [200, 130, 22, 0, 14, 0], [40, 130, 22, 0, 14, 0], [40, 240, 22, 0, 14, 0], [-160, 240, 80, 0, 16, 0], [-160, 0, 80, 0, 28, 0] ] },
};
