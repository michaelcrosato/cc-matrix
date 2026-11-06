//! The operative field: one `DynamicMesh` per frame, a grid over 22×12.6 units in `Style::Cel`,
//! with per-vertex colour doing the painting. A plate's heightfield and veins are cached; hazards
//! stamp into height and colour each frame. A hard band where `n·h` is high makes it read as wet.

use std::collections::HashMap;

use glam::{Vec2, Vec3};
use pav_core::games::surgery::content::{Content, Plate};
use pav_core::games::surgery::field::{Hazard, Kind, sub};
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_render::mesh::{MeshData, Vertex};
use pav_render::scene::{self as rs, DynamicMesh, Scene, Style};

pub const NX: usize = 420;
pub const NZ: usize = 240;
const WIDE: f32 = 22.0;
const DEEP: f32 = 12.6;

pub fn grid_x(i: usize) -> f32 {
    -WIDE * 0.5 + WIDE * i as f32 / (NX - 1) as f32
}
pub fn grid_z(j: usize) -> f32 {
    -DEEP * 0.5 + DEEP * j as f32 / (NZ - 1) as f32
}

fn hash2(x: i32, z: i32) -> f32 {
    let mut h = (x as u32).wrapping_mul(374_761_393).wrapping_add((z as u32).wrapping_mul(668_265_263));
    h = (h ^ (h >> 13)).wrapping_mul(1_274_126_177);
    ((h ^ (h >> 16)) & 0xffff) as f32 / 65535.0
}

/// Value noise, 0..1.
pub fn noise(x: f32, z: f32) -> f32 {
    let (xi, zi) = (x.floor(), z.floor());
    let (fx, fz) = (x - xi, z - zi);
    let (u, v) = (fx * fx * (3.0 - 2.0 * fx), fz * fz * (3.0 - 2.0 * fz));
    let (i, j) = (xi as i32, zi as i32);
    let a = hash2(i, j) + (hash2(i + 1, j) - hash2(i, j)) * u;
    let b = hash2(i, j + 1) + (hash2(i + 1, j + 1) - hash2(i, j + 1)) * u;
    a + (b - a) * v
}

fn fbm(x: f32, z: f32) -> f32 {
    noise(x, z) * 0.55 + noise(x * 2.1 + 3.3, z * 2.1 + 1.7) * 0.3 + noise(x * 4.3 + 7.1, z * 4.3 + 5.3) * 0.15
}

fn smooth(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

fn hex3(s: &str) -> [f32; 3] {
    rs::hex(s).unwrap_or(Vec3::splat(0.5)).to_array()
}

fn mix(a: [f32; 3], b: [f32; 3], t: f32) -> [f32; 3] {
    let t = t.clamp(0.0, 1.0);
    [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

pub fn srgb3(r: u8, g: u8, b: u8) -> [f32; 3] {
    rs::srgb(r, g, b).to_array()
}

struct Base {
    h: Vec<f32>,
    vein: Vec<f32>,
    /// 1 inside the opening, 0 on the drape.
    open: Vec<f32>,
    bed: [f32; 3],
    flesh: [f32; 3],
    top: [f32; 3],
    vein_c: [f32; 3],
    pulse: f32,
    bone: bool,
    height_top: f32,
}

fn seg_dist(p: Vec2, a: Vec2, b: Vec2) -> f32 {
    let ab = b - a;
    let t = ((p - a).dot(ab) / ab.length_squared().max(1e-5)).clamp(0.0, 1.0);
    p.distance(a + ab * t)
}

fn build_base(p: &Plate) -> Base {
    let n = NX * NZ;
    let (mut h, mut vein, mut open) = (vec![0.0; n], vec![0.0; n], vec![0.0; n]);
    let mut top = 0.3f32;
    for j in 0..NZ {
        for i in 0..NX {
            let (x, z) = (grid_x(i), grid_z(j));
            let mut v = 0.0f32;
            for l in &p.lobes {
                let (dx, dz) = (x - l.x, z - l.z);
                let e = (1.0 - dx * dx / l.a.max(0.01) - dz * dz / l.b.max(0.01)).max(0.0);
                if e > 0.0 {
                    v = v.max(l.h * e.powf(0.55));
                }
            }
            v += (fbm(x * 0.7, z * 0.7) - 0.5) * p.noise * 2.0;
            let q = Vec2::new(x, z);
            let mut vessel = 0.0f32;
            for s in &p.vessels {
                for w in s.points.windows(2) {
                    let d = seg_dist(q, Vec2::new(w[0][0], w[0][1]), Vec2::new(w[1][0], w[1][1]));
                    vessel = vessel.max((1.0 - d / s.w.max(0.01)).max(0.0).sqrt() * s.h / 0.1);
                    v += (1.0 - d / s.w.max(0.01)).max(0.0).sqrt() * s.h * 0.2;
                }
            }
            // Veins: thin ridges of noise.
            let ridge = 1.0 - (fbm(x * 1.2 + 9.0, z * 1.2 - 4.0) * 2.0 - 1.0).abs() * 14.0;
            let veiny = ridge.max(0.0) * p.veins;
            // The opening in the drape.
            let (ex, ez) = ((x.abs() - 9.3).max(0.0), (z.abs() - 4.75).max(0.0));
            let d = (ex * ex + ez * ez).sqrt() + (noise(x * 2.0, z * 2.0) - 0.5) * 0.06;
            let inside = 1.0 - smooth(0.0, 0.14, d);
            let idx = j * NX + i;
            h[idx] = v.max(0.0) * inside + (1.0 - inside) * (0.62 + (fbm(x * 0.8, z * 1.4 + 2.0) - 0.5) * 0.25);
            vein[idx] = veiny.max(vessel.min(1.0));
            open[idx] = inside;
            top = top.max(v);
        }
    }
    Base {
        h,
        vein,
        open,
        bed: hex3(&p.bed),
        flesh: hex3(&p.flesh),
        top: hex3(&p.top),
        vein_c: hex3(&p.vein),
        pulse: p.pulse,
        bone: p.bone,
        height_top: top,
    }
}

#[derive(Default)]
pub struct PlateView {
    bases: HashMap<String, Base>,
    /// This frame's height and colour.
    pub h: Vec<f32>,
    c: Vec<[f32; 3]>,
    indices: Vec<u32>,
}

pub struct Paint {
    pub palette_clinical: bool,
    pub time: f32,
}

impl PlateView {
    /// The tissue's height at a field point this frame.
    pub fn height(&self, p: Vec2) -> f32 {
        if self.h.is_empty() {
            return 0.0;
        }
        let i = (((p.x + WIDE * 0.5) / WIDE) * (NX - 1) as f32).clamp(0.0, (NX - 2) as f32);
        let j = (((p.y + DEEP * 0.5) / DEEP) * (NZ - 1) as f32).clamp(0.0, (NZ - 2) as f32);
        let (i0, j0) = (i as usize, j as usize);
        let (u, v) = (i - i0 as f32, j - j0 as f32);
        let g = |a: usize, b: usize| self.h[b * NX + a];
        let top = g(i0, j0) + (g(i0 + 1, j0) - g(i0, j0)) * u;
        let bot = g(i0, j0 + 1) + (g(i0 + 1, j0 + 1) - g(i0, j0 + 1)) * u;
        top + (bot - top) * v
    }

    fn base_for(&mut self, c: &Content, id: u8) {
        let key = c.plate_order.get(id as usize).cloned().unwrap_or_default();
        if !self.bases.contains_key(&key) {
            if let Some(p) = c.plates.get(&key) {
                self.bases.insert(key, build_base(p));
            }
        }
    }

    fn stamp(&mut self, cx: f32, cz: f32, r: f32, mut f: impl FnMut(&mut f32, &mut [f32; 3], f32, f32, f32)) {
        let to_i = |x: f32| ((x + WIDE * 0.5) / WIDE * (NX - 1) as f32) as i32;
        let to_j = |z: f32| ((z + DEEP * 0.5) / DEEP * (NZ - 1) as f32) as i32;
        let (i0, i1) = (to_i(cx - r).max(0), (to_i(cx + r) + 1).min(NX as i32 - 1));
        let (j0, j1) = (to_j(cz - r).max(0), (to_j(cz + r) + 1).min(NZ as i32 - 1));
        for j in j0..=j1 {
            for i in i0..=i1 {
                let (x, z) = (grid_x(i as usize), grid_z(j as usize));
                let d = ((x - cx).powi(2) + (z - cz).powi(2)).sqrt();
                if d <= r {
                    let k = j as usize * NX + i as usize;
                    f(&mut self.h[k], &mut self.c[k], d, x, z);
                }
            }
        }
    }

    /// A painted line: `f(height, colour, across 0..1)`.
    fn stroke(&mut self, a: Vec2, b: Vec2, w: f32, mut f: impl FnMut(&mut f32, &mut [f32; 3], f32, f32)) {
        let (lo, hi) = (a.min(b) - Vec2::splat(w), a.max(b) + Vec2::splat(w));
        let to_i = |x: f32| ((x + WIDE * 0.5) / WIDE * (NX - 1) as f32) as i32;
        let to_j = |z: f32| ((z + DEEP * 0.5) / DEEP * (NZ - 1) as f32) as i32;
        let ab = b - a;
        let len2 = ab.length_squared().max(1e-5);
        for j in to_j(lo.y).max(0)..=(to_j(hi.y) + 1).min(NZ as i32 - 1) {
            for i in to_i(lo.x).max(0)..=(to_i(hi.x) + 1).min(NX as i32 - 1) {
                let q = Vec2::new(grid_x(i as usize), grid_z(j as usize));
                let t = ((q - a).dot(ab) / len2).clamp(0.0, 1.0);
                let d = q.distance(a + ab * t);
                if d <= w {
                    let k = j as usize * NX + i as usize;
                    f(&mut self.h[k], &mut self.c[k], d / w, t);
                }
            }
        }
    }

    /// Builds the frame's field into the scene.
    pub fn emit(&mut self, scene: &mut Scene, f: &SurgeryFrame, c: &Content, paint: &Paint) {
        self.base_for(c, f.plate);
        self.base_for(c, f.plate_prev);
        let n = NX * NZ;
        self.h.resize(n, 0.0);
        self.c.resize(n, [0.0; 3]);
        let key = c.plate_order.get(f.plate as usize).cloned().unwrap_or_default();
        let prev_key = c.plate_order.get(f.plate_prev as usize).cloned().unwrap_or_default();
        // The tissue pulses on the beat: a sharp systole, a slow fall, plus a breathing swell.
        let b = f.beat;
        let systole = if f.stopped { 0.0 } else { (-b * 7.0).exp() * (b * 40.0).min(1.0) + 0.35 * (-((b - 0.28) * 9.0).powi(2)).exp() };
        let breath = (paint.time * 1.1).sin() * 0.012;
        let drape = srgb3(34, 112, 116);
        let drape_dark = srgb3(18, 70, 74);
        let heat = f.fever.map(|v| (v / 100.0).clamp(0.0, 1.2)).unwrap_or(0.0);
        let fever_c = srgb3(255, 120, 40);
        {
            let Some(base) = self.bases.get(&key) else { return };
            let prev = self.bases.get(&prev_key).unwrap_or(base);
            let front = f.reveal.clamp(0.0, 1.0) * 16.0;
            let blending = f.reveal < 1.0;
            for j in 0..NZ {
                for i in 0..NX {
                    let k = j * NX + i;
                    let mut pick = base;
                    let mut blend = 1.0;
                    if blending {
                        let d = Vec2::new(grid_x(i), grid_z(j)).distance(f.reveal_at);
                        blend = smooth(front + 0.8, front - 0.8, d);
                        if blend < 0.5 {
                            pick = prev;
                        }
                    }
                    let open = base.open[k];
                    let top = pick.height_top.max(0.3);
                    let raw = if blending { prev.h[k] + (base.h[k] - prev.h[k]) * blend } else { base.h[k] };
                    let amp = (pick.pulse * systole + breath) * open;
                    let h = raw * (1.0 + amp);
                    self.h[k] = h;
                    let t = (raw / top).clamp(0.0, 1.0);
                    let mut col = if t < 0.45 { mix(pick.bed, pick.flesh, t / 0.45) } else { mix(pick.flesh, pick.top, (t - 0.45) / 0.55) };
                    col = mix(col, pick.vein_c, pick.vein[k] * 0.85);
                    if pick.bone && t > 0.72 {
                        col = mix(col, srgb3(236, 226, 196), smooth(0.72, 0.8, t));
                    }
                    if heat > 0.0 {
                        col = mix(col, fever_c, heat * 0.28 * t);
                    }
                    if open < 1.0 {
                        let cloth = mix(drape_dark, drape, smooth(0.45, 0.8, raw));
                        col = mix(cloth, col, open);
                    }
                    self.c[k] = col;
                }
            }
        }
        self.stamps(f, paint);
        if paint.palette_clinical {
            for col in &mut self.c {
                let l = col[0] * 0.3 + col[1] * 0.55 + col[2] * 0.15;
                *col = [l * 0.72, l * 0.86, l * 1.02];
            }
        }
        self.mesh(scene, paint);
    }

    fn stamps(&mut self, f: &SurgeryFrame, paint: &Paint) {
        let t = paint.time;
        let cut = srgb3(44, 8, 14);
        let pool_c = srgb3(120, 6, 16);
        let dash = srgb3(255, 236, 150);
        for s in &f.stains {
            let col = match s.kind {
                0 => srgb3(120, 30, 34),
                1 => srgb3(46, 28, 26),
                _ => srgb3(150, 216, 196),
            };
            let (r, at) = (s.r, s.at);
            self.stamp(at.x, at.y, r * 1.3, |_, c, d, x, z| {
                let e = d + (noise(x * 3.0, z * 3.0) - 0.5) * r * 0.5;
                if e < r {
                    *c = mix(*c, col, 0.32 * (1.0 - e / r));
                }
            });
        }
        for h in &f.hazards {
            self.stamp_hazard(h, f, cut, pool_c, dash, t);
        }
        if let Some(radius) = f.heat_ring {
            let col = srgb3(255, 170, 60);
            self.stamp(0.0, 0.0, radius + 0.6, |h, c, d, _, _| {
                let e = (d - radius).abs();
                if e < 0.5 {
                    let k = 1.0 - e / 0.5;
                    *h += k * 0.12;
                    *c = mix(*c, col, k * 0.95);
                }
            });
        }
    }

    fn path_stamps(&mut self, h: &Hazard, cut: [f32; 3], dash: [f32; 3], groove: f32, t: f32, white: bool) {
        let len = h.path_len().max(0.4);
        let steps = (len / 0.09) as i32;
        let pulse = 0.8 + 0.2 * (t * 5.0).sin();
        for k in 0..steps {
            let s = k as f32 / steps as f32;
            let p = h.path(s);
            let q = h.path((k + 1) as f32 / steps as f32);
            if s < h.prog {
                if white {
                    self.stroke(p, q, 0.3, |hh, c, a, _| {
                        *hh += (1.0 - a * a) * 0.09;
                        *c = mix(*c, srgb3(238, 240, 232), 1.0 - a * a * 0.5);
                    });
                } else {
                    self.stroke(p, q, 0.13, |hh, c, a, _| {
                        *hh -= (1.0 - a) * groove;
                        *c = mix(*c, cut, 1.0 - a * 0.6);
                    });
                }
            } else if k % 6 < 4 {
                let w = 0.075;
                let col = dash;
                self.stroke(p, q, w, |_, c, a, _| {
                    *c = mix(*c, col, (1.0 - a * a) * pulse);
                });
            }
        }
    }

    fn stamp_hazard(&mut self, h: &Hazard, f: &SurgeryFrame, cut: [f32; 3], pool_c: [f32; 3], dash: [f32; 3], t: f32) {
        let a = h.a;
        match h.kind {
            Kind::Incision => self.path_stamps(h, cut, dash, 0.2, t, false),
            Kind::Closure => self.path_stamps(h, cut, srgb3(250, 250, 240), 0.0, t, true),
            Kind::Lacer | Kind::Bleeder => {
                let seed = h.id as f32 * 3.7;
                let steps = 14;
                let width = if h.kind == Kind::Bleeder { 0.2 } else { 0.17 };
                let dir = (h.b - h.a).normalize_or_zero().perp();
                let mut last = h.a;
                for k in 1..=steps {
                    let s = k as f32 / steps as f32;
                    let wiggle = (noise(s * 5.0 + seed, seed) - 0.5) * 0.3 * (s * std::f32::consts::PI).sin();
                    let p = h.a.lerp(h.b, s) + dir * wiggle;
                    let closed = s < h.prog;
                    let taper = (s * std::f32::consts::PI).sin().powf(0.5);
                    let w = (width * taper).max(0.05) * if closed { 0.45 } else { 1.0 };
                    let c0 = if closed { srgb3(150, 50, 60) } else { cut };
                    self.stroke(last, p, w + 0.16, |hh, c, a_, _| {
                        let inner = w / (w + 0.16);
                        if a_ < inner {
                            *hh -= 0.14;
                            *c = mix(*c, c0, 1.0 - a_ * 0.3);
                        } else {
                            *hh += (1.0 - a_) * 0.2;
                            *c = mix(*c, srgb3(226, 110, 100), (1.0 - a_) * 0.75);
                        }
                    });
                    last = p;
                }
            }
            Kind::Pool => {
                let caustic = h.sub == sub::CAUSTIC;
                let col = if caustic { srgb3(150, 170, 40) } else { pool_c };
                let r = h.r;
                let seed = h.id as f32;
                let cx = a.x;
                let cz = a.y;
                let film = self.height(a) + 0.05;
                self.stamp(a.x, a.y, r * 1.4, |hh, c, d, x, z| {
                    let ang = (z - cz).atan2(x - cx);
                    let e = d + (noise(ang * 1.5 + seed, seed) - 0.5) * r * 0.45 + (noise(x * 3.0 + seed, z * 3.0) - 0.5) * 0.12;
                    if e < r {
                        let k = smooth(r, r - 0.14, e);
                        *hh = *hh + (film.max(*hh) + 0.02 - *hh) * k;
                        *c = mix(*c, col, k);
                    }
                });
            }
            Kind::Patch => {
                let burn = h.sub == sub::BURN;
                let r = h.r;
                let col = if burn { srgb3(40, 24, 22) } else { srgb3(232, 70, 60) };
                let gel = srgb3(170, 232, 214);
                let cover = h.prog;
                let seed = h.id as f32;
                self.stamp(a.x, a.y, r * 1.2, |hh, c, d, x, z| {
                    let n = noise(x * 2.6 + seed, z * 2.6);
                    let e = d + (n - 0.5) * r * 0.5;
                    if e < r {
                        let k = smooth(r, r * 0.7, e);
                        *hh += k * 0.05 * (0.5 + n);
                        *c = mix(*c, col, k * 0.85);
                        // The gel covers it from the outside in.
                        if d > r * (1.0 - cover) {
                            *c = mix(*c, gel, 0.8);
                            *hh += 0.03;
                        }
                    }
                });
            }
            Kind::Tumor => {
                let r = h.r;
                let col = srgb3(96, 52, 88);
                if h.stage == 0 {
                    self.stamp(a.x, a.y, r, |hh, c, d, _, _| {
                        let k = smooth(r, r * 0.3, d);
                        *hh += k * 0.5;
                        *c = mix(*c, col, k);
                    });
                    self.path_stamps(h, cut, dash, 0.18, t, false);
                } else if h.stage == 1 {
                    self.stamp(a.x, a.y, r, |hh, c, d, _, _| {
                        let k = smooth(r, r * 0.65, d);
                        *hh += k * 0.3;
                        *c = mix(*c, col, k);
                        if (d - r * 0.92).abs() < 0.1 {
                            *c = cut;
                            *hh -= 0.15;
                        }
                    });
                } else {
                    let gel = srgb3(170, 232, 214);
                    let cover = h.prog;
                    self.stamp(a.x, a.y, r, |hh, c, d, _, _| {
                        let k = smooth(r, r * 0.8, d);
                        *hh -= k * 0.3;
                        *c = mix(*c, cut, k * 0.85);
                        if d > r * (1.0 - cover) {
                            *c = mix(*c, gel, 0.85);
                        }
                    });
                }
            }
            Kind::Bone => {
                if h.stage == 0 {
                    let (seat, w) = (h.b, h.r);
                    let col = srgb3(70, 26, 30);
                    self.stamp(seat.x, seat.y, w, |hh, c, d, _, _| {
                        let k = smooth(w, w * 0.6, d);
                        *hh -= k * 0.2;
                        *c = mix(*c, col, k);
                    });
                }
            }
            Kind::Nodule => {
                // A bump travelling under the tissue, visible even before the Scanner finds it.
                let r = h.r * 1.6;
                let tele = if h.telegraph { 0.25 + 0.2 * (t * 16.0).sin() } else { 0.0 };
                let violet = srgb3(120, 60, 150);
                let vis = h.visible();
                self.stamp(a.x, a.y, r + if h.telegraph { 1.1 } else { 0.0 }, |hh, c, d, _, _| {
                    let k = smooth(r, r * 0.2, d);
                    *hh += k * (0.34 + tele * 0.5);
                    if vis {
                        *c = mix(*c, violet, k * 0.65);
                    } else {
                        *c = mix(*c, violet, k * 0.2);
                    }
                    if tele > 0.0 && (d - (r + 0.5)).abs() < 0.12 {
                        *hh += 0.07;
                        *c = mix(*c, violet, 0.5);
                    }
                });
            }
            Kind::Ember | Kind::Furnace => {
                let r = h.r * 2.1;
                let hot = srgb3(255, 130, 40);
                let frost = srgb3(190, 230, 255);
                let frozen = (h.kind == Kind::Ember && h.stage == 1) || (h.kind == Kind::Furnace && h.stage == 1);
                self.stamp(a.x, a.y, r, |_, c, d, _, _| {
                    let k = smooth(r, 0.0, d);
                    *c = mix(*c, if frozen { frost } else { hot }, k * k * 0.85);
                });
            }
            Kind::Eye => {
                let r = h.r * 1.6;
                let col = srgb3(36, 18, 66);
                self.stamp(a.x, a.y, r, |hh, c, d, _, _| {
                    let k = smooth(r, r * 0.5, d);
                    *hh += k * 0.25;
                    *c = mix(*c, col, k * 0.9);
                });
            }
            Kind::Tendril => {
                let col = srgb3(58, 26, 96);
                let (p, q) = (h.a, h.a.lerp(h.b, 1.0 - h.prog * 0.9));
                self.stroke(p, q, 0.34, |hh, c, a_, _| {
                    *hh += (1.0 - a_) * 0.16;
                    *c = mix(*c, col, 1.0 - a_ * 0.6);
                });
            }
            Kind::Sac => {
                let (p, q) = (h.b, h.a);
                let col = srgb3(70, 30, 96);
                self.stroke(p, q, 0.13, |hh, c, a_, _| {
                    *hh += (1.0 - a_) * 0.08;
                    *c = mix(*c, col, 1.0 - a_ * 0.5);
                });
            }
            Kind::Object | Kind::Polyp => {
                let r = h.r * 0.8;
                let col = cut;
                self.stamp(a.x, a.y, r, |hh, c, d, _, _| {
                    let k = smooth(r, r * 0.3, d);
                    *hh += k * 0.02;
                    *c = mix(*c, col, k * 0.45);
                });
            }
        }
        let _ = f;
    }

    fn mesh(&mut self, scene: &mut Scene, paint: &Paint) {
        // A wet highlight: the lamp's half vector, hardened to a band.
        let half = Vec3::new(-0.08, 1.0, 0.32).normalize();
        let (dx, dz) = (WIDE / (NX - 1) as f32, DEEP / (NZ - 1) as f32);
        let mut verts = Vec::with_capacity(NX * NZ);
        for j in 0..NZ {
            for i in 0..NX {
                let k = j * NX + i;
                let hl = self.h[if i > 0 { k - 1 } else { k }];
                let hr = self.h[if i + 1 < NX { k + 1 } else { k }];
                let hd = self.h[if j > 0 { k - NX } else { k }];
                let hu = self.h[if j + 1 < NZ { k + NX } else { k }];
                let n = Vec3::new((hl - hr) / (2.0 * dx), 1.0, (hd - hu) / (2.0 * dz)).normalize();
                let wet = n.dot(half);
                let mut col = self.c[k];
                // A hard band reads as wet tissue, and only on the tissue.
                let on_tissue = self.c[k][0] > self.c[k][2] * 1.05;
                let band = if on_tissue { smooth(0.9975, 0.9992, wet) * smooth(0.25, 0.5, self.h[k]) } else { 0.0 };
                col = mix(col, [1.0, 0.96, 0.92], band * 0.3);
                debug_assert!(self.h[k].is_finite() && n.is_finite(), "NaN in the plate");
                verts.push(Vertex {
                    pos: [grid_x(i), self.h[k], grid_z(j)],
                    normal: n.to_array(),
                    uv: [i as f32 / NX as f32, j as f32 / NZ as f32],
                    color: [col[0], col[1], col[2], 1.0],
                });
            }
        }
        if self.indices.is_empty() {
            for j in 0..NZ - 1 {
                for i in 0..NX - 1 {
                    let a = (j * NX + i) as u32;
                    let b = a + 1;
                    let c = a + NX as u32;
                    let d = c + 1;
                    self.indices.extend_from_slice(&[a, c, b, b, c, d]);
                }
            }
        }
        let _ = paint;
        scene.dynamic.push(DynamicMesh {
            data: MeshData { vertices: verts, indices: self.indices.clone() },
            color: Vec3::ONE,
            emissive: 0.0,
            style: Style::Cel,
            flags: 0,
            group: 1,
            material: 0,
        });
    }
}
