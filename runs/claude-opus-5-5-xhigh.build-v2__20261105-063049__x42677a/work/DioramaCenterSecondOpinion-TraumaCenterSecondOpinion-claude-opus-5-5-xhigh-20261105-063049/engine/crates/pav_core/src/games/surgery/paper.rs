//! Paper cards: closed outlines rounded by corner cutting and ear-clipped into triangles. The
//! view extrudes them; the HUD's cameo flattens them.

use glam::Vec2;

/// Chaikin corner cutting on a closed outline.
pub fn chaikin(points: &[Vec2], passes: u32) -> Vec<Vec2> {
    let mut pts = points.to_vec();
    for _ in 0..passes {
        let mut next = Vec::with_capacity(pts.len() * 2);
        for i in 0..pts.len() {
            let (a, b) = (pts[i], pts[(i + 1) % pts.len()]);
            next.push(a.lerp(b, 0.25));
            next.push(a.lerp(b, 0.75));
        }
        pts = next;
    }
    pts
}

/// Twice the signed area (positive = counter-clockwise).
pub fn signed_area(pts: &[Vec2]) -> f32 {
    let mut a = 0.0;
    for i in 0..pts.len() {
        let (p, q) = (pts[i], pts[(i + 1) % pts.len()]);
        a += p.x * q.y - q.x * p.y;
    }
    a
}

/// Ear-clips a simple polygon into triangles (indices into `pts`). Any winding comes in;
/// triangles come out counter-clockwise.
pub fn triangulate(pts: &[Vec2]) -> Vec<[u32; 3]> {
    let n = pts.len();
    if n < 3 {
        return Vec::new();
    }
    let mut idx: Vec<u32> = (0..n as u32).collect();
    if signed_area(pts) < 0.0 {
        idx.reverse();
    }
    let mut out = Vec::with_capacity(n - 2);
    let cross = |a: Vec2, b: Vec2, c: Vec2| (b - a).perp_dot(c - a);
    let mut guard = 0;
    while idx.len() > 3 && guard < n * n {
        guard += 1;
        let m = idx.len();
        let mut clipped = false;
        for i in 0..m {
            let (ia, ib, ic) = (idx[(i + m - 1) % m], idx[i], idx[(i + 1) % m]);
            let (a, b, c) = (pts[ia as usize], pts[ib as usize], pts[ic as usize]);
            if cross(a, b, c) <= 1e-7 {
                continue;
            }
            let inside = idx.iter().any(|&j| {
                if j == ia || j == ib || j == ic {
                    return false;
                }
                let p = pts[j as usize];
                cross(a, b, p) >= 0.0 && cross(b, c, p) >= 0.0 && cross(c, a, p) >= 0.0
            });
            if !inside {
                out.push([ia, ib, ic]);
                idx.remove(i);
                clipped = true;
                break;
            }
        }
        if !clipped {
            // A degenerate outline: drop a flat corner and carry on.
            idx.remove(0);
        }
    }
    if idx.len() == 3 {
        out.push([idx[0], idx[1], idx[2]]);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_concave_outline_triangulates_with_the_right_area() {
        let l = [
            Vec2::new(0.0, 0.0),
            Vec2::new(2.0, 0.0),
            Vec2::new(2.0, 1.0),
            Vec2::new(1.0, 1.0),
            Vec2::new(1.0, 2.0),
            Vec2::new(0.0, 2.0),
        ];
        let t = triangulate(&l);
        assert_eq!(t.len(), 4);
        let area: f32 =
            t.iter().map(|t| (l[t[1] as usize] - l[t[0] as usize]).perp_dot(l[t[2] as usize] - l[t[0] as usize]) * 0.5).sum();
        assert!((area - 3.0).abs() < 1e-5);
        let round = chaikin(&l, 2);
        assert_eq!(round.len(), 24);
        assert!(!triangulate(&round).is_empty());
    }
}
