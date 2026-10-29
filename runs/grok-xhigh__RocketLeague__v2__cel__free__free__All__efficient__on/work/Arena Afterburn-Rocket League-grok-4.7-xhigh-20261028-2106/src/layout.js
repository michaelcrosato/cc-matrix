/** Split-screen rectangles in CSS pixels, origin top-left. They tile the surface. */

export function layoutViewports(count, width, height) {
  const n = Math.max(1, Math.min(4, count | 0));
  if (n === 1) return [{ x: 0, y: 0, w: width, h: height }];
  if (n === 2) {
    const w = width / 2;
    return [
      { x: 0, y: 0, w, h: height },
      { x: w, y: 0, w: width - w, h: height },
    ];
  }
  if (n === 3) {
    const h = height / 2;
    const w = width / 2;
    return [
      { x: 0, y: 0, w: width, h },
      { x: 0, y: h, w, h: height - h },
      { x: w, y: h, w: width - w, h: height - h },
    ];
  }
  const w = width / 2;
  const h = height / 2;
  return [
    { x: 0, y: 0, w, h },
    { x: w, y: 0, w: width - w, h },
    { x: 0, y: h, w, h: height - h },
    { x: w, y: h, w: width - w, h: height - h },
  ];
}
