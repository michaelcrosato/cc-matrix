//! The operative field: one per-frame mesh with per-vertex colour doing the painting.

use glam::{Vec2, Vec3};
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_render::mesh::{MeshData, Vertex};

use super::{NK, lin};

pub const GX: usize = 220;
pub const GZ: usize = 126;
const W: f32 = 22.0;
const D: f32 = 12.6;

struct Lobe {
    cx: f32,
    cz: f32,
    a: f32,
    b: f32,
    h: f32,
}

struct Plate {
    lobes: Vec<Lobe>,
    bed: Vec3,
    flesh: Vec3,
    top: Vec3,
    vein: Vec3,
    veins: f32,
    ridges: f32,
}

fn plate(name: &str) -> Plate {
    let all = &pav_core::games::surgery::data::plates().plate;
    let d = all.iter().find(|p| p.id == name).or_else(|| all.first()).expect("plates.toml has plates");
    let c = |h: &str| {
        let [r, g, b] = pav_core::games::surgery::data::hex_rgb(h);
        lin(r, g, b)
    };
    Plate {
        lobes: d.lobes.iter().map(|l| Lobe { cx: l[0], cz: l[1], a: l[2], b: l[3], h: l[4] }).collect(),
        bed: c(&d.bed),
        flesh: c(&d.flesh),
        top: c(&d.top),
        vein: c(&d.vein),
        veins: d.veins,
        ridges: d.ridges,
    }
}

fn hash(x: i32, z: i32) -> f32 {
    let mut h = (x as u32).wrapping_mul(374761393).wrapping_add((z as u32).wrapping_mul(668265263));
    h = (h ^ (h >> 13)).wrapping_mul(1274126177);
    ((h ^ (h >> 16)) & 0xffff) as f32 / 65535.0
}

fn vnoise(x: f32, z: f32) -> f32 {
    let (xi, zi) = (x.floor(), z.floor());
    let (fx, fz) = (x - xi, z - zi);
    let (sx, sz) = (fx * fx * (3.0 - 2.0 * fx), fz * fz * (3.0 - 2.0 * fz));
    let (xi, zi) = (xi as i32, zi as i32);
    let a = hash(xi, zi);
    let b = hash(xi + 1, zi);
    let c = hash(xi, zi + 1);
    let d = hash(xi + 1, zi + 1);
    (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sz
}

fn fbm(x: f32, z: f32) -> f32 {
    vnoise(x, z) * 0.55 + vnoise(x * 2.1 + 5.0, z * 2.1 - 3.0) * 0.3 + vnoise(x * 4.3 - 2.0, z * 4.3 + 7.0) * 0.15
}

fn base_height(p: &Plate, x: f32, z: f32) -> f32 {
    let mut h = 0.0;
    for l in &p.lobes {
        let dx = x - l.cx;
        let dz = z - l.cz;
        h += l.h * (1.0 - dx * dx / (l.a * 3.4) - dz * dz / (l.b * 2.2)).max(0.0).powf(0.55);
    }
    h += 0.07 * fbm(x * 0.7, z * 0.7);
    if p.ridges > 0.0 {
        h += p.ridges * 0.12 * ((x * 1.3 + (z * 0.7).sin() * 2.0).sin() * 0.5 + 0.5);
    }
    h
}

fn seg_dist(c: Vec2, a: Vec2, b: Vec2) -> (f32, f32) {
    let ab = b - a;
    let l2 = ab.length_squared().max(1e-6);
    let t = ((c - a).dot(ab) / l2).clamp(0.0, 1.0);
    ((c - (a + ab * t)).length(), t)
}

pub fn field_mesh(f: &SurgeryFrame, time: f32, pulse: f32) -> MeshData {
    let pa = plate(&f.plate);
    let pb = plate(&f.plate_prev);
    let blend_active = f.plate_t < 1.0;
    let nv = (GX + 1) * (GZ + 1);
    let mut hs = vec![0.0f32; nv];
    let mut cs = vec![Vec3::ZERO; nv];
    let to_sun = Vec3::new(0.25, 1.0, 0.35).normalize();
    let view_dir = Vec3::new(0.0, 0.96, 0.29).normalize();
    let half = (to_sun + view_dir).normalize();
    // Hazards that stamp the tissue.
    struct Stamp {
        k: &'static str,
        p: Vec2,
        q: Vec2,
        r: f32,
        prog: f32,
        cnt: u8,
        stages: u8,
        si: u8,
    }
    let stamps: Vec<Stamp> = f
        .hz
        .iter()
        .filter(|h| matches!(NK[h.k as usize], "line" | "lace" | "pool" | "burn" | "bleeder" | "tumor" | "eye"))
        .map(|h| Stamp { k: NK[h.k as usize], p: Vec2::from(h.p), q: Vec2::from(h.q), r: h.r, prog: h.prog, cnt: h.cnt, stages: h.count, si: h.si })
        .collect();
    let breathe = 1.0 + 0.012 * (time * 1.3).sin();
    let pul = 1.0 + 0.05 * pulse;
    let cut = lin(44, 8, 14);
    let pool_c = lin(120, 6, 16);
    for iz in 0..=GZ {
        for ix in 0..=GX {
            let x = -W * 0.5 + W * ix as f32 / GX as f32;
            let z = -D * 0.5 + D * iz as f32 / GZ as f32;
            let i = iz * (GX + 1) + ix;
            let mut h = base_height(&pa, x, z);
            let mut pl = (&pa, h);
            if blend_active {
                let hb = base_height(&pb, x, z);
                let d = (Vec2::new(x, z)).length() / 12.0;
                let k = (f.plate_t * 1.7 - d).clamp(0.0, 1.0);
                let k = k * k * (3.0 - 2.0 * k);
                h = hb + (h - hb) * k;
                pl = (if k > 0.5 { &pa } else { &pb }, h);
            }
            let pp = pl.0;
            let mut hh = h * breathe * pul;
            // colour ramp
            let t = (hh / 1.4).clamp(0.0, 1.0);
            let mut col = if t < 0.5 { pp.bed.lerp(pp.flesh, t * 2.0) } else { pp.flesh.lerp(pp.top, (t - 0.5) * 2.0) };
            let n = fbm(x * 1.7 + 11.0, z * 1.7 - 4.0);
            col *= 0.9 + 0.2 * n;
            // veins
            let vn = (fbm(x * 0.55 + 3.0, z * 0.55) - 0.5).abs();
            let vw = 0.035 * pp.veins;
            if vn < vw {
                col = col.lerp(pp.vein, 0.65 * (1.0 - vn / vw));
            }
            let p2 = Vec2::new(x, z);
            for s in &stamps {
                match s.k {
                    "line" => {
                        let (d, t) = seg_dist(p2, s.p, s.q);
                        if d < 0.45 {
                            let opened = t <= s.prog;
                            let w = if opened { 0.17 } else { 0.0 };
                            if d < w {
                                col = cut;
                                hh -= 0.14;
                            } else if opened && d < w + 0.14 {
                                hh += 0.06;
                                col = col.lerp(lin(236, 120, 110), 0.6);
                            } else if !opened && d < 0.03 {
                                col = col.lerp(lin(60, 20, 30), 0.35);
                            }
                        }
                    }
                    "lace" => {
                        let (d, _) = seg_dist(p2, s.p, s.q);
                        let closed = (s.cnt as f32) / (s.stages.max(1) as f32);
                        let w = 0.13 * (1.0 - 0.8 * closed);
                        if d < w {
                            col = pool_c.lerp(cut, 0.4);
                            hh -= 0.08 * (1.0 - closed);
                        } else if d < w + 0.1 {
                            col = col.lerp(lin(210, 70, 70), 0.5);
                        }
                    }
                    "pool" => {
                        let r = s.r * (1.0 - s.prog * 0.75);
                        let wob = 1.0 + 0.25 * (fbm(x * 2.0 + s.p.x, z * 2.0 + s.p.y) - 0.5);
                        let d = (p2 - s.p).length() / wob;
                        if d < r {
                            col = pool_c * (0.85 + 0.3 * (1.0 - d / r));
                            hh = hh * 0.6 + 0.12;
                        } else if d < r + 0.12 {
                            col = col.lerp(pool_c, 0.5);
                        }
                    }
                    "bleeder" => {
                        let d = (p2 - s.p).length();
                        if d < 0.45 {
                            col = pool_c;
                            hh += 0.08;
                        }
                    }
                    "burn" => {
                        let wob = 1.0 + 0.3 * (fbm(x * 2.2 - s.p.x, z * 2.2 + s.p.y) - 0.5);
                        let d = (p2 - s.p).length() / wob;
                        if d < s.r {
                            let k = (1.0 - d / s.r) * (1.0 - s.prog);
                            col = col.lerp(lin(48, 24, 20), 0.85 * k.clamp(0.0, 1.0) + 0.1);
                            if s.prog > 0.0 {
                                col = col.lerp(lin(160, 230, 240), s.prog * 0.5);
                            }
                        }
                    }
                    "tumor" => {
                        let d = (p2 - s.p).length();
                        if s.si < 2 && d < s.r {
                            col = col.lerp(lin(90, 40, 100), 0.4);
                            hh += 0.1 * (1.0 - d / s.r);
                        } else if s.si >= 2 && d < s.r * 0.9 {
                            col = col.lerp(lin(180, 60, 60), 0.5);
                            hh -= 0.1;
                        }
                    }
                    "eye" => {
                        let d = (p2 - s.p).length();
                        if d < s.r * 1.1 {
                            col = col.lerp(lin(90, 30, 100), 0.35);
                        }
                    }
                    _ => {}
                }
            }
            // Hush: colour drains from everything but the tissue (handled by the filter).
            hs[i] = hh;
            cs[i] = col;
        }
    }
    // Normals + toon highlight.
    let mut vertices = Vec::with_capacity(nv);
    let dx = W / GX as f32;
    let dz = D / GZ as f32;
    for iz in 0..=GZ {
        for ix in 0..=GX {
            let i = iz * (GX + 1) + ix;
            let hl = hs[iz * (GX + 1) + ix.saturating_sub(1)];
            let hr = hs[iz * (GX + 1) + (ix + 1).min(GX)];
            let hu = hs[iz.saturating_sub(1) * (GX + 1) + ix];
            let hd = hs[(iz + 1).min(GZ) * (GX + 1) + ix];
            let n = Vec3::new((hl - hr) / (2.0 * dx), 1.0, (hu - hd) / (2.0 * dz)).normalize();
            let spec = n.dot(half).max(0.0).powf(400.0);
            let mut col = cs[i];
            let k = ((spec - 0.25) / 0.4).clamp(0.0, 1.0);
            col = col.lerp(Vec3::ONE, 0.3 * k * k * (3.0 - 2.0 * k));
            let x = -W * 0.5 + W * ix as f32 / GX as f32;
            let z = -D * 0.5 + D * iz as f32 / GZ as f32;
            debug_assert!(hs[i].is_finite() && col.is_finite());
            let hv = if hs[i].is_finite() { hs[i] } else { 0.0 };
            vertices.push(Vertex {
                pos: [x, hv, z],
                normal: n.to_array(),
                uv: [0.0, 0.0],
                color: [col.x.min(4.0), col.y.min(4.0), col.z.min(4.0), 1.0],
            });
        }
    }
    let mut indices = Vec::with_capacity(GX * GZ * 6);
    for iz in 0..GZ {
        for ix in 0..GX {
            let a = (iz * (GX + 1) + ix) as u32;
            let b = a + 1;
            let c = a + (GX + 1) as u32;
            let d = c + 1;
            // counter-clockwise seen from above (+Y)
            indices.extend_from_slice(&[a, c, b, b, c, d]);
        }
    }
    MeshData { vertices, indices }
}

/// Height of the tissue surface at a field point (the plate under the current blend).
pub fn surface(f: &SurgeryFrame, x: f32, z: f32) -> f32 {
    let a = base_height(&plate(&f.plate), x, z);
    if f.plate_t < 1.0 {
        let b = base_height(&plate(&f.plate_prev), x, z);
        let d = Vec2::new(x, z).length() / 12.0;
        let k = (f.plate_t * 1.7 - d).clamp(0.0, 1.0);
        let k = k * k * (3.0 - 2.0 * k);
        b + (a - b) * k
    } else {
        a
    }
}
