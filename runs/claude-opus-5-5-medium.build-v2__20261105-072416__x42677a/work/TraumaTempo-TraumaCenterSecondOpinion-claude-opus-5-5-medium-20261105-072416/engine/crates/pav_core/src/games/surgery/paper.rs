//! Paper-theatre geometry: closed outlines rounded by Chaikin corner cutting and ear-clipped into
//! triangles, and the poses that move a rig's parts. The view extrudes these into lit cards; the
//! HUD flattens the same rig into its cameo.

use glam::Vec2;

use super::content::{Content, Expr, Rig, RigPart};

/// One round of corner cutting per `n`; each edge a→b yields a.lerp(b, .25) and a.lerp(b, .75).
pub fn chaikin(points: &[Vec2], n: u8) -> Vec<Vec2> {
    let mut p = points.to_vec();
    for _ in 0..n {
        let mut out = Vec::with_capacity(p.len() * 2);
        for i in 0..p.len() {
            let (a, b) = (p[i], p[(i + 1) % p.len()]);
            out.push(a.lerp(b, 0.25));
            out.push(a.lerp(b, 0.75));
        }
        p = out;
    }
    p
}

fn signed_area(p: &[Vec2]) -> f32 {
    let mut a = 0.0;
    for i in 0..p.len() {
        let (q, r) = (p[i], p[(i + 1) % p.len()]);
        a += q.x * r.y - r.x * q.y;
    }
    a * 0.5
}

fn in_tri(p: Vec2, a: Vec2, b: Vec2, c: Vec2) -> bool {
    let s = |u: Vec2, v: Vec2, w: Vec2| (v - u).perp_dot(w - u);
    s(a, b, p) >= -1e-5 && s(b, c, p) >= -1e-5 && s(c, a, p) >= -1e-5
}

/// Ear-clips a counter-clockwise outline (concave hair shapes need it).
pub fn triangulate(p: &[Vec2]) -> Vec<u32> {
    let mut idx: Vec<u32> = (0..p.len() as u32).collect();
    let mut out = Vec::with_capacity(p.len() * 3);
    let mut guard = 0;
    while idx.len() > 3 && guard < p.len() * p.len() + 16 {
        guard += 1;
        let n = idx.len();
        let mut cut = None;
        for i in 0..n {
            let (ia, ib, ic) = (idx[(i + n - 1) % n], idx[i], idx[(i + 1) % n]);
            let (a, b, c) = (p[ia as usize], p[ib as usize], p[ic as usize]);
            if (b - a).perp_dot(c - b) <= 1e-6 {
                continue;
            }
            let blocked = idx.iter().any(|&j| {
                j != ia && j != ib && j != ic && in_tri(p[j as usize], a, b, c)
            });
            if !blocked {
                out.extend_from_slice(&[ia, ib, ic]);
                cut = Some(i);
                break;
            }
        }
        match cut {
            Some(i) => {
                idx.remove(i);
            }
            None => {
                idx.remove(0);
            }
        }
    }
    if idx.len() == 3 {
        out.extend_from_slice(&[idx[0], idx[1], idx[2]]);
    }
    out
}

/// A rounded, triangulated outline, counter-clockwise.
#[derive(Clone, Debug, Default)]
pub struct Outline {
    pub points: Vec<Vec2>,
    pub tris: Vec<u32>,
}

pub fn outline(points: &[Vec2], rounding: u8) -> Outline {
    let mut p = chaikin(points, rounding);
    if signed_area(&p) < 0.0 {
        p.reverse();
    }
    let tris = triangulate(&p);
    Outline { points: p, tris }
}

/// What animation moves a part.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Layer {
    #[default]
    Body,
    Head,
    Hair,
    Eyes,
    Lid,
    Brow,
}

/// A part ready to draw.
#[derive(Clone, Debug)]
pub struct PartGeo {
    pub name: String,
    pub z: f32,
    pub color: [u8; 3],
    pub layer: Layer,
    /// -1 or 1: which side's eye or brow, for mirrored parts (0 for others).
    pub side: f32,
    pub outline: Outline,
}

fn hex(s: &str) -> [u8; 3] {
    let t = s.trim_start_matches('#');
    let v = u32::from_str_radix(t, 16).unwrap_or(0x808080);
    [(v >> 16) as u8, (v >> 8) as u8, v as u8]
}

fn color_of(rig: &Rig, name: &str) -> [u8; 3] {
    if name.starts_with('#') {
        hex(name)
    } else {
        rig.colors.get(name).map(|c| hex(c)).unwrap_or([128, 128, 128])
    }
}

fn part_geo(rig: &Rig, p: &RigPart, out: &mut Vec<PartGeo>) {
    let layer = match p.layer.as_str() {
        "head" => Layer::Head,
        "hair" => Layer::Hair,
        "eyes" => Layer::Eyes,
        "lid" => Layer::Lid,
        "brow" => Layer::Brow,
        _ => Layer::Body,
    };
    let pts: Vec<Vec2> = p.points.iter().map(|q| Vec2::new(q[0], q[1])).collect();
    if pts.len() < 3 {
        return;
    }
    let mut add = |pts: &[Vec2], side: f32| {
        out.push(PartGeo {
            name: p.name.clone(),
            z: p.z,
            color: color_of(rig, &p.color),
            layer,
            side,
            outline: outline(pts, p.chaikin),
        });
    };
    if p.mirror {
        add(&pts, 1.0);
        let flipped: Vec<Vec2> = pts.iter().map(|q| Vec2::new(-q.x, q.y)).collect();
        add(&flipped, -1.0);
    } else {
        add(&pts, 0.0);
    }
}

/// All of a rig's parts (the shared face and its own), back to front.
pub fn rig_parts(c: &Content, rig: &Rig) -> Vec<PartGeo> {
    let mut out = Vec::new();
    for p in c.face.part.iter().chain(rig.part.iter()) {
        part_geo(rig, p, &mut out);
    }
    out.sort_by(|a, b| a.z.total_cmp(&b.z));
    out
}

/// The mouth outline for a shape and how open it is right now.
pub fn mouth_points(shape: &str, talking: bool, flap: f32) -> Vec<Vec2> {
    if talking && flap > 0.0 {
        let o = 0.05 + 0.1 * flap;
        return vec![
            Vec2::new(-0.15, -0.255),
            Vec2::new(0.0, -0.21),
            Vec2::new(0.15, -0.255),
            Vec2::new(0.08, -0.255 - o),
            Vec2::new(-0.08, -0.255 - o),
        ];
    }
    let v = |x: f32, y: f32| Vec2::new(x, y);
    match shape {
        "smile" => vec![v(-0.18, -0.235), v(0.0, -0.285), v(0.18, -0.235), v(0.0, -0.33)],
        "frown" => vec![v(-0.16, -0.31), v(0.0, -0.25), v(0.16, -0.31), v(0.0, -0.285)],
        "flat" => vec![v(-0.16, -0.27), v(0.16, -0.27), v(0.16, -0.295), v(-0.16, -0.295)],
        "open" => vec![v(-0.1, -0.24), v(0.0, -0.2), v(0.1, -0.24), v(0.07, -0.38), v(-0.07, -0.38)],
        _ => vec![v(-0.16, -0.26), v(0.0, -0.235), v(0.16, -0.26), v(0.0, -0.285)],
    }
}

/// A character's pose this moment.
#[derive(Clone, Copy, Debug)]
pub struct Pose {
    pub head: Vec2,
    pub tilt: f32,
    pub eye_open: f32,
    pub pupil: f32,
    pub brow_y: f32,
    pub brow_rot: f32,
    pub look: Vec2,
    pub hair: Vec2,
    pub breathe: f32,
    pub flap: f32,
}

fn flap_of(t: f32, seed: f32) -> f32 {
    let v = (t * 15.0 + seed).sin() * 0.5 + 0.5;
    if v > 0.28 { v } else { 0.0 }
}

/// Blink, breathe, sway, head nods on speech, hair on springs (as a function of time: paper rigs
/// are the view's, not the sim's).
pub fn pose_for(expr: Option<&Expr>, t: f32, seed: f32, talking: bool) -> Pose {
    let e = expr.cloned().unwrap_or(Expr { eye: 1.0, pupil: 1.0, ..Default::default() });
    let blink_cycle = (t * 0.31 + seed * 0.37).fract();
    let blink = if blink_cycle < 0.035 { 0.08 } else { 1.0 };
    let nod = if talking { ((t * 5.3 + seed).sin() * 0.018).max(-0.01) } else { 0.0 };
    let sway = (t * 0.8 + seed).sin();
    Pose {
        head: Vec2::new(sway * 0.012, nod + (t * 1.4 + seed).sin() * 0.006),
        tilt: e.tilt + sway * 0.012,
        eye_open: e.eye.max(0.2) * blink,
        pupil: e.pupil.max(0.2),
        brow_y: e.brow_y + if talking { (t * 7.0 + seed).sin().abs() * 0.012 } else { 0.0 },
        brow_rot: e.brow_rot,
        look: Vec2::new((t * 0.53 + seed).sin() * 0.018, 0.0),
        hair: Vec2::new((t * 1.1 + seed).sin() * 0.018 + (t * 2.7 + seed).sin() * 0.006, (t * 1.3).cos() * 0.006),
        breathe: (t * 1.5 + seed).sin() * 0.012,
        flap: if talking { flap_of(t, seed) } else { 0.0 },
    }
}

/// Where a point of a part goes under a pose.
pub fn posed(part: &PartGeo, pose: &Pose, q: Vec2) -> Vec2 {
    let head_pivot = Vec2::new(0.0, -0.55);
    let turn = |p: Vec2, about: Vec2, a: f32| {
        let (s, c) = a.sin_cos();
        let d = p - about;
        about + Vec2::new(d.x * c - d.y * s, d.x * s + d.y * c)
    };
    let mut p = q;
    match part.layer {
        Layer::Body => {
            // Shoulders rise and fall.
            p.y += pose.breathe * (1.0 + q.y * 0.3);
            return p;
        }
        Layer::Hair => {
            let weight = ((q.y + 1.0) / 3.0).clamp(0.0, 1.0);
            p += pose.hair * (1.0 - weight * 0.5);
        }
        Layer::Lid => {
            let c = Vec2::new(0.34 * part.side, 0.35);
            p.y = c.y + (p.y - c.y) * pose.eye_open;
        }
        Layer::Eyes => {
            let c = Vec2::new(0.34 * part.side, 0.34);
            let scale = if part.name == "pupil" { pose.pupil } else { 1.0 };
            let d = p - c;
            p = c + Vec2::new(d.x * scale, d.y * scale * pose.eye_open.min(1.05)) + pose.look;
        }
        Layer::Brow => {
            let c = Vec2::new(0.34 * part.side, 0.58);
            p = turn(p, c, pose.brow_rot * part.side);
            p.y += pose.brow_y;
        }
        Layer::Head => {}
    }
    turn(p, head_pivot, pose.tilt) + pose.head
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_concave_outline_triangulates_to_its_own_area() {
        // An L shape, area 3.
        let l = [Vec2::new(0.0, 0.0), Vec2::new(2.0, 0.0), Vec2::new(2.0, 1.0), Vec2::new(1.0, 1.0), Vec2::new(1.0, 2.0), Vec2::new(0.0, 2.0)];
        let o = outline(&l, 0);
        let mut area = 0.0;
        for t in o.tris.chunks(3) {
            let (a, b, c) = (o.points[t[0] as usize], o.points[t[1] as usize], o.points[t[2] as usize]);
            area += (b - a).perp_dot(c - a) * 0.5;
        }
        assert!((area - 3.0).abs() < 1e-3, "{area}");
    }

    #[test]
    fn every_rig_builds_finite_geometry() {
        let c = super::super::content::content();
        for (id, rig) in &c.rigs {
            let parts = rig_parts(&c, rig);
            assert!(parts.len() > 10, "{id}");
            for p in &parts {
                assert!(!p.outline.tris.is_empty(), "{id}: part {} has no triangles", p.name);
                assert!(p.outline.points.iter().all(|q| q.is_finite()));
            }
        }
    }
}
