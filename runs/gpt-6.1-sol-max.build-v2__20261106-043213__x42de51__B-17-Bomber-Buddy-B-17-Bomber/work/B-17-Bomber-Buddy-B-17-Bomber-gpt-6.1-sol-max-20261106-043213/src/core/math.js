export const TAU = Math.PI * 2;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const mix = (a, b, k) => a + (b - a) * k;
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const approach = (a, b, n) =>
	a < b ? Math.min(b, a + n) : Math.max(b, a - n);
export function random(seed) {
	let n = seed >>> 0;
	return () => {
		n += 0x6d2b79f5;
		let t = n;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
// Single aircraft-local conversion: forward x, right y, up z. Radians, z up.
export function local(a, f, r, u) {
	const cy = Math.cos(a.heading),
		sy = Math.sin(a.heading),
		cp = Math.cos(a.pitch || 0),
		sp = Math.sin(a.pitch || 0),
		cb = Math.cos(a.bank || 0),
		sb = Math.sin(a.bank || 0);
	const right = r * cb + u * sb,
		up = -r * sb + u * cb,
		front = f * cp - up * sp;
	return {
		x: a.x + front * cy - right * sy,
		y: a.y + front * sy + right * cy,
		z: a.z + f * sp + up * cp,
	};
}
export function segmentHit(p, q, c, radius) {
	const dx = q.x - p.x,
		dy = q.y - p.y,
		dz = q.z - p.z;
	const t = clamp(
		((c.x - p.x) * dx + (c.y - p.y) * dy + (c.z - p.z) * dz) /
			(dx * dx + dy * dy + dz * dz || 1),
		0,
		1,
	);
	return (
		Math.hypot(p.x + dx * t - c.x, p.y + dy * t - c.y, p.z + dz * t - c.z) <=
		radius
	);
}
