//! The operative field: one `DynamicMesh` per frame over a 420 x 240 grid, Style::Cel, with
//! per-vertex colour doing the painting. The base (lobes, veins, vessels, drape) is cached per
//! plate; pulse, hazards and stains are stamped each frame.

use glam::{Vec2, Vec3};
use pav_core::games::surgery::content::{self, PlateDef};
use pav_core::games::surgery::field::HazardKind as K;
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_render::mesh::{MeshData, Vertex};

pub const NX: usize = 420;
pub const NZ: usize = 240;
pub const W: f32 = 22.0;
pub const D: f32 = 12.6;
const STRIDE: usize = NX + 1;

fn srgb(c: [u8; 3]) -> Vec3 {
    Vec3::from(pav_render::scene::srgb(c[0], c[1], c[2]))
}

fn hash(x: i32, y: i32) -> f32 {
    let n = x.wrapping_mul(374_761_393).wrapping_add(y.wrapping_mul(668_265_263));
    let n = (n ^ (n >> 13)).wrapping_mul(1_274_126_177);
    ((n ^ (n >> 16)) as u32 & 0xffff) as f32 / 65535.0
}

fn value_noise(p: Vec2) -> f32 {
    let (ix, iy) = (p.x.floor() as i32, p.y.floor() as i32);
    let (fx, fy) = (p.x - p.x.floor(), p.y - p.y.floor());
    let (ux, uy) = (fx * fx * (3.0 - 2.0 * fx), fy * fy * (3.0 - 2.0 * fy));
    let a = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * ux;
    let b = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * ux;
    a + (b - a) * uy
}

pub fn fbm(p: Vec2) -> f32 {
    value_noise(p) * 0.6 + value_noise(p * 2.13 + Vec2::splat(7.7)) * 0.28 + value_noise(p * 4.7 + Vec2::splat(3.1)) * 0.12
}

fn smooth(e0: f32, e1: f32, x: f32) -> f32 {
    let t = ((x - e0) / (e1 - e0)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

fn segment_dist(p: Vec2, a: Vec2, b: Vec2) -> (f32, f32) {
    let ab = b - a;
    let t = ((p - a).dot(ab) / ab.length_squared().max(1e-6)).clamp(0.0, 1.0);
    ((a + ab * t).distance(p), t)
}

/// A plate's unchanging part.
pub struct PlateBase {
    pub key: String,
    h: Vec<f32>,
    /// How much of the pulse each vertex takes.
    lobe: Vec<f32>,
    col: Vec<Vec3>,
    drape: Vec<f32>,
    pulse: f32,
    breathe: f32,
    wet: f32,
}

impl PlateBase {
    pub fn build(key: &str, def: &PlateDef) -> Self {
        let n = (NX + 1) * (NZ + 1);
        let (mut h, mut lobe, mut col, mut drape) = (vec![0.0; n], vec![0.0; n], vec![Vec3::ZERO; n], vec![0.0; n]);
        let (bed, flesh, top, vein) = (srgb(def.bed), srgb(def.flesh), srgb(def.top), srgb(def.vein));
        let vessel = srgb(def.vessel_color);
        let drape_col = srgb([34, 112, 116]);
        let drape_dark = srgb([20, 76, 84]);
        let hmax = def.lobes.iter().map(|l| l[4]).fold(0.2f32, f32::max);
        let vessels: Vec<Vec<Vec2>> = def.vessels.iter().map(|v| v.iter().map(|p| Vec2::new(p[0], p[1])).collect()).collect();
        let ridges: Vec<Vec<Vec2>> = def.ridges.iter().map(|v| v.iter().map(|p| Vec2::new(p[0], p[1])).collect()).collect();
        let opening = Vec2::new(def.opening[0], def.opening[1]);
        for j in 0..=NZ {
            for i in 0..=NX {
                let k = j * STRIDE + i;
                let p = Vec2::new(i as f32 / NX as f32 * W - W * 0.5, j as f32 / NZ as f32 * D - D * 0.5);
                // Lobes: a soft maximum keeps the creases between them.
                let (mut hh, mut neg) = (0.0f32, 0.0f32);
                for l in &def.lobes {
                    let (dx, dz) = (p.x - l[0], p.y - l[1]);
                    let f = 1.0 - dx * dx / l[2].max(0.01) - dz * dz / l[3].max(0.01);
                    let v = f.max(0.0).powf(0.55) * l[4];
                    if l[4] >= 0.0 {
                        hh = if hh > 0.0 { hh.max(v) + 0.25 * hh.min(v) } else { v };
                    } else {
                        neg += v;
                    }
                }
                let n1 = fbm(p * 0.9) - 0.5;
                let n2 = fbm(p * 3.1 + Vec2::splat(11.0)) - 0.5;
                let lobe_mask = (hh / hmax).clamp(0.0, 1.0);
                let mut height = hh + neg + (n1 * 0.22 + n2 * 0.06) * def.noise * lobe_mask.max(0.25);
                // Ridges: ribs and bone, pale and raised.
                let mut ridge = 0.0f32;
                for v in &ridges {
                    for w in v.windows(2) {
                        let (d, _) = segment_dist(p, w[0], w[1]);
                        ridge = ridge.max(smooth(0.42, 0.14, d));
                    }
                }
                height += ridge * 0.16;
                let t = (height / hmax).clamp(0.0, 1.0);
                let mut c = if t < 0.5 { bed.lerp(flesh, smooth(0.0, 0.5, t)) } else { flesh.lerp(top, smooth(0.5, 1.0, t)) };
                // A few bands of tone give the cel look something to catch.
                c *= 1.0 + (fbm(p * 1.7 + Vec2::splat(5.0)) - 0.5) * 0.22;
                // Veins from thresholded noise.
                let vn = (fbm(p * 1.25 + Vec2::splat(31.0)) - 0.5).abs();
                let vein_k = smooth(0.016 + 0.018 * def.veins, 0.006, vn) * def.veins.min(1.0) * lobe_mask;
                c = c.lerp(vein, vein_k * 0.75);
                height -= vein_k * 0.012;
                // Big vessels.
                let mut vk = 0.0f32;
                for v in &vessels {
                    for w in v.windows(2) {
                        let (d, _) = segment_dist(p, w[0], w[1]);
                        vk = vk.max(smooth(0.3, 0.1, d));
                    }
                }
                c = c.lerp(vessel, vk * 0.92);
                height += vk * 0.09;
                c = c.lerp(srgb([232, 214, 196]), ridge * 0.72);
                // The drape: everything outside the opening.
                let q = (p.abs() - opening + Vec2::splat(1.3)).max(Vec2::ZERO);
                let round = q.length() - 1.3;
                let out = smooth(-0.02, 0.05, round);
                height *= 1.0 - smooth(-1.0, 0.0, round) * 0.75;
                let fold = (p.x * 0.8 + fbm(p * 0.6 + Vec2::splat(2.0)) * 5.0).sin() * 0.5 + 0.5;
                let drape_here = drape_col.lerp(drape_dark, smooth(0.35, 0.65, fold));
                c = c.lerp(drape_here, out);
                height = height * (1.0 - out) + (0.34 + fold * 0.12) * out;
                let k_lobe = lobe_mask * (1.0 - out);
                h[k] = height;
                lobe[k] = k_lobe;
                col[k] = c;
                drape[k] = out;
            }
        }
        Self { key: key.to_string(), h, lobe, col, drape, pulse: def.pulse, breathe: def.breathe, wet: def.wet }
    }
}

/// A beat's lift over time: lub, then dub.
pub fn beat_env(phase: f32) -> f32 {
    let g = |c: f32, w: f32, x: f32| (-(x - c) * (x - c) / w).exp();
    g(0.05, 0.004, phase) + 0.62 * g(0.27, 0.006, phase)
}

/// Options the player set.
#[derive(Clone, Copy, Debug, Default)]
pub struct PlateOpts {
    pub clinical: bool,
}

#[derive(Default)]
pub struct PlateView {
    cur: Option<PlateBase>,
    prev: Option<PlateBase>,
    h: Vec<f32>,
    c: Vec<Vec3>,
    indices: Vec<u32>,
    verts: Vec<Vertex>,
}

impl PlateView {
    fn sync(&mut self, f: &SurgeryFrame) {
        let content = content::get();
        let want = &*f.plate;
        if self.cur.as_ref().is_none_or(|p| p.key != want) {
            let old = self.cur.take();
            if let Some(def) = content.plates.get(want) {
                self.cur = Some(PlateBase::build(want, def));
            }
            if f.prev_plate.as_deref().is_some() {
                self.prev = old;
            }
        }
        if f.plate_blend >= 1.0 {
            self.prev = None;
        }
    }

    /// Where the tissue surface is, for the things that sit on it.
    pub fn height_at(&self, p: Vec2) -> f32 {
        if self.h.is_empty() {
            return 0.5;
        }
        let i = (((p.x + W * 0.5) / W * NX as f32).round() as i32).clamp(0, NX as i32) as usize;
        let j = (((p.y + D * 0.5) / D * NZ as f32).round() as i32).clamp(0, NZ as i32) as usize;
        self.h[j * STRIDE + i]
    }

    /// Builds this frame's field mesh.
    pub fn build(&mut self, f: &SurgeryFrame, time: f32, opts: PlateOpts) -> Option<MeshData> {
        self.sync(f);
        let cur = self.cur.take()?;
        let n = (NX + 1) * (NZ + 1);
        if self.indices.is_empty() {
            self.indices.reserve(NX * NZ * 6);
            for j in 0..NZ {
                for i in 0..NX {
                    let a = (j * STRIDE + i) as u32;
                    let b = a + 1;
                    let c = a + STRIDE as u32;
                    let d = c + 1;
                    self.indices.extend_from_slice(&[a, c, b, b, c, d]);
                }
            }
        }
        self.h.resize(n, 0.0);
        self.c.resize(n, Vec3::ZERO);
        // Base, cross-fading outward from the cut when an incision reveals the next plate.
        let blend = self.prev.as_ref().map(|_| f.plate_blend).unwrap_or(1.0);
        if let (Some(prev), true) = (&self.prev, blend < 1.0) {
            let r = blend * 26.0;
            for j in 0..=NZ {
                for i in 0..=NX {
                    let k = j * STRIDE + i;
                    let p = Vec2::new(i as f32 / NX as f32 * W - W * 0.5, j as f32 / NZ as f32 * D - D * 0.5);
                    let d = p.distance(f.plate_from);
                    let t = smooth(r, r - 3.5, d);
                    self.h[k] = prev.h[k] + (cur.h[k] - prev.h[k]) * t;
                    self.c[k] = prev.col[k].lerp(cur.col[k], t);
                }
            }
        } else {
            self.h.copy_from_slice(&cur.h);
            self.c.copy_from_slice(&cur.col);
        }
        // The heart and the breath.
        let env = if f.flat { 0.0 } else { beat_env(f.beat) };
        let swell = (time * 1.15).sin() * 0.5 + 0.5;
        let lift_beat = cur.pulse * env;
        let lift_breath = cur.breathe * swell * if f.flat { 0.25 } else { 1.0 };
        for k in 0..n {
            self.h[k] += cur.lobe[k] * (lift_beat + lift_breath);
        }
        stamp_all(self, f, time);
        // Final pass: normals, the wet highlight, the rest of the paint.
        let view = Vec3::new(0.0, 0.956, 0.292);
        let light = Vec3::new(0.25, 1.0, 0.35).normalize();
        let half = (view + light).normalize();
        let (dx, dz) = (W / NX as f32, D / NZ as f32);
        self.verts.resize(n, Vertex::default());
        let ring = f.heat_ring;
        let wet = cur.wet;
        for j in 0..=NZ {
            for i in 0..=NX {
                let k = j * STRIDE + i;
                let hx0 = self.h[if i > 0 { k - 1 } else { k }];
                let hx1 = self.h[if i < NX { k + 1 } else { k }];
                let hz0 = self.h[if j > 0 { k - STRIDE } else { k }];
                let hz1 = self.h[if j < NZ { k + STRIDE } else { k }];
                let nrm = Vec3::new((hx0 - hx1) / (2.0 * dx), 1.0, (hz0 - hz1) / (2.0 * dz)).normalize();
                let x = i as f32 / NX as f32 * W - W * 0.5;
                let z = j as f32 / NZ as f32 * D - D * 0.5;
                let mut c = self.c[k];
                // The wet highlight reads the broad shape of the tissue, not its fine grain: a
                // wider baseline gives clean bands instead of flecks.
                const W2: usize = 5;
                let (ia, ib) = (i.saturating_sub(W2), (i + W2).min(NX));
                let (ja, jb) = (j.saturating_sub(W2), (j + W2).min(NZ));
                let broad = Vec3::new(
                    (self.h[j * STRIDE + ia] - self.h[j * STRIDE + ib]) / ((ib - ia) as f32 * dx),
                    1.0,
                    (self.h[ja * STRIDE + i] - self.h[jb * STRIDE + i]) / ((jb - ja) as f32 * dz),
                )
                .normalize();
                let spec = broad.dot(half);
                let cut = cur.drape[k];
                let band = smooth(0.9975, 0.9988, spec) * wet * (1.0 - cut);
                c = c.lerp(Vec3::splat(1.0), band * 0.46);
                if let Some(r) = ring {
                    let d = Vec2::new(x, z).length();
                    let k = smooth(0.55, 0.0, (d - r).abs());
                    if k > 0.0 {
                        c += Vec3::new(1.6, 0.55, 0.12) * k;
                    }
                }
                if opts.clinical {
                    let y = c.dot(Vec3::new(0.3, 0.55, 0.15));
                    c = c.lerp(Vec3::new(0.58, 0.68, 0.8) * (y * 1.55), 0.9 * (1.0 - cut));
                }
                debug_assert!(self.h[k].is_finite() && c.is_finite(), "a NaN in the plate blows out into white bloom");
                self.verts[k] =
                    Vertex { pos: [x, self.h[k], z], normal: nrm.to_array(), uv: [0.0, 0.0], color: [c.x, c.y, c.z, 1.0] };
            }
        }
        self.cur = Some(cur);
        Some(MeshData { vertices: self.verts.clone(), indices: self.indices.clone() })
    }
}

fn cells(center: Vec2, radius: f32) -> (usize, usize, usize, usize) {
    let (x0, x1) = (center.x - radius, center.x + radius);
    let (z0, z1) = (center.y - radius, center.y + radius);
    let ix = |x: f32| (((x + W * 0.5) / W * NX as f32).floor().max(0.0) as usize).min(NX);
    let iz = |z: f32| (((z + D * 0.5) / D * NZ as f32).floor().max(0.0) as usize).min(NZ);
    (ix(x0), ix(x1) + 1, iz(z0), iz(z1) + 1)
}

#[inline]
fn pos_of(i: usize, j: usize) -> Vec2 {
    Vec2::new(i as f32 / NX as f32 * W - W * 0.5, j as f32 / NZ as f32 * D - D * 0.5)
}

/// Stamps a round thing.
fn disc(v: &mut PlateView, at: Vec2, r: f32, mut f: impl FnMut(f32, Vec2, &mut f32, &mut Vec3)) {
    let (i0, i1, j0, j1) = cells(at, r);
    for j in j0..j1.min(NZ + 1) {
        for i in i0..i1.min(NX + 1) {
            let p = pos_of(i, j);
            let d = p.distance(at) / r.max(1e-3);
            if d < 1.0 {
                let k = j * STRIDE + i;
                let (h, c) = (&mut v.h[k], &mut v.c[k]);
                f(d, p, h, c);
            }
        }
    }
}

/// Stamps along a polyline: `f(distance, along)`.
fn line(v: &mut PlateView, pts: &[Vec2], width: f32, mut f: impl FnMut(f32, f32, &mut f32, &mut Vec3)) {
    if pts.len() < 2 {
        return;
    }
    let mut at = 0.0;
    for w in pts.windows(2) {
        let l = w[0].distance(w[1]);
        let (i0, i1, j0, j1) = cells((w[0] + w[1]) * 0.5, l * 0.5 + width);
        for j in j0..j1.min(NZ + 1) {
            for i in i0..i1.min(NX + 1) {
                let p = pos_of(i, j);
                let (d, t) = segment_dist(p, w[0], w[1]);
                if d < width {
                    let k = j * STRIDE + i;
                    let (h, c) = (&mut v.h[k], &mut v.c[k]);
                    f(d / width, at + t * l, h, c);
                }
            }
        }
        at += l;
    }
}

fn stamp_all(v: &mut PlateView, f: &SurgeryFrame, time: f32) {
    let cut = srgb([44, 8, 14]);
    let pool = srgb([120, 6, 16]);
    let dark_pool = srgb([70, 4, 12]);
    let scar = srgb([160, 70, 74]);
    let char_c = srgb([52, 22, 20]);
    let raw = srgb([250, 120, 96]);
    let inflame = srgb([236, 70, 54]);
    let violet = srgb([86, 40, 140]);
    let frost = srgb([190, 226, 240]);
    let ember_glow = Vec3::new(1.9, 0.72, 0.14);
    for s in &f.stains {
        match s.kind {
            0 => disc(v, s.pos, s.r + 0.3, |d, _, _, c| *c = c.lerp(*c * 0.72, smooth(1.0, 0.7, d))),
            2 => line(v, &s.pts, 0.1, |d, _, h, c| {
                *c = c.lerp(scar, smooth(1.0, 0.4, d));
                *h -= 0.012 * smooth(1.0, 0.0, d);
            }),
            3 => disc(v, s.pos, s.r, |d, _, _, c| *c = c.lerp(frost, smooth(1.0, 0.2, d) * 0.55)),
            4 => disc(v, s.pos, s.r, |d, _, _, c| *c = c.lerp(Vec3::new(0.62, 0.9, 0.8), smooth(1.0, 0.4, d) * 0.2)),
            _ => {}
        }
    }
    for h in &f.hazards {
        match h.kind {
            K::Pool => {
                let r = h.r;
                let caustic = h.tag == 1;
                let color = if caustic { srgb([120, 190, 70]) } else { pool };
                let inner = if caustic { srgb([60, 110, 40]) } else { dark_pool };
                let seed = h.id as f32 * 3.7;
                let at = h.pos;
                disc(v, at, r * 1.35, move |d, p, hh, c| {
                    let a = (p - at).y.atan2((p - at).x);
                    let wob = 1.0
                        + (a * 3.0 + seed).sin() * 0.11
                        + (a * 7.0 + seed * 1.7).sin() * 0.06
                        + (time * 1.3 + a * 2.0).sin() * 0.015;
                    let k = d * 1.35 / wob;
                    if k < 1.0 {
                        let e = smooth(1.0, 0.86, k);
                        *c = c.lerp(color.lerp(inner, smooth(0.8, 0.2, k) * 0.5), e);
                        *hh += 0.05 * e;
                    }
                });
            }
            K::Incision | K::Tether | K::Closure if h.kind == K::Incision => {
                // What's been cut: an open groove with raised lips.
                let progress = h.progress;
                line(v, &h.pts, 0.2, move |d, s, hh, c| {
                    if s <= progress {
                        let k = smooth(0.55, 0.15, d);
                        *c = c.lerp(cut, k);
                        *hh += smooth(1.0, 0.6, d) * 0.03 - k * 0.14;
                    }
                });
            }
            K::Laceration => {
                let progress = h.progress;
                line(v, &h.pts, 0.24, move |d, s, hh, c| {
                    if s > progress {
                        let k = smooth(0.7, 0.2, d);
                        *c = c.lerp(cut.lerp(pool, 0.3), k);
                        *hh += smooth(1.0, 0.7, d) * 0.035 - k * 0.11;
                    } else {
                        let k = smooth(0.4, 0.1, d);
                        *c = c.lerp(scar, k);
                    }
                });
            }
            K::Bleeder => {
                disc(v, h.pos, 0.42, |d, _, hh, c| {
                    *c = c.lerp(cut, smooth(1.0, 0.4, d));
                    *hh -= 0.1 * smooth(1.0, 0.2, d);
                });
                let progress = h.progress;
                line(v, &h.pts, 0.1, move |d, s, _, c| {
                    if s <= progress {
                        *c = c.lerp(scar, smooth(1.0, 0.4, d));
                    }
                });
            }
            K::Burn => {
                let (tag, gel) = (h.tag, h.progress);
                let at = h.pos;
                let id = h.id as f32;
                disc(v, at, h.r * 1.15, move |d, p, hh, c| {
                    let wob = 1.0 + (fbm(p * 2.3 + Vec2::splat(id)) - 0.5) * 0.5;
                    let k = smooth(1.0, 0.7, d * wob);
                    let col = if tag == 5 {
                        inflame.lerp(raw, smooth(0.2, 0.9, d))
                    } else {
                        char_c.lerp(inflame, smooth(0.15, 0.85, d))
                    };
                    *c = c.lerp(col, k * (1.0 - gel * 0.85));
                    if tag == 5 {
                        *hh += 0.09 * k;
                    } else {
                        *hh -= 0.02 * k;
                    }
                });
            }
            K::Polyp => disc(v, h.pos, h.r * 1.7, |d, _, hh, c| {
                let k = smooth(1.0, 0.45, d);
                *c = c.lerp(raw, k * 0.55);
                *hh += 0.1 * k;
            }),
            K::Tumor => {
                let (stage, gel) = (h.stage, h.progress);
                disc(v, h.pos, h.r * 1.5, move |d, _, hh, c| {
                    let k = smooth(1.0, 0.45, d);
                    if stage < 2 {
                        *hh += 0.42 * k;
                        *c = c.lerp(violet.lerp(raw, 0.35), k * 0.35);
                    } else {
                        *hh -= 0.16 * k;
                        *c = c.lerp(raw.lerp(Vec3::new(0.6, 0.86, 0.76), gel), k);
                    }
                });
            }
            K::Nodule => {
                let r = h.r * if h.hidden && h.reveal <= 0.0 { 2.0 } else { 1.6 };
                let ripple = h.dev;
                let hidden = h.hidden && h.reveal <= 0.0;
                disc(v, h.pos, r + ripple * 1.1, move |d, _, hh, c| {
                    let k = smooth(1.0, 0.3, d);
                    *hh += (if hidden { 0.28 } else { 0.1 }) * k;
                    if ripple > 0.0 {
                        *hh += ripple * 0.09 * (d * 11.0 - time * 12.0).sin() * (1.0 - d);
                    }
                    *c = c.lerp(violet, k * if hidden { 0.2 } else { 0.5 });
                });
            }
            K::Eye => disc(v, h.pos, h.r * 1.5, |d, _, hh, c| {
                let k = smooth(1.0, 0.5, d);
                *hh += 0.05 * k;
                *c = c.lerp(violet * 0.6, k * 0.6);
            }),
            K::Crown => disc(v, h.pos, h.r * 1.9, |d, _, _, c| {
                *c = c.lerp(violet * 0.6, smooth(1.0, 0.55, d) * 0.45);
            }),
            K::Ember => {
                let frozen = h.stage >= 1;
                let at_r = h.r * 2.1;
                let pulse = (time * 3.0 + h.id as f32).sin() * 0.15 + 0.85;
                disc(v, h.pos, at_r, move |d, _, _, c| {
                    let k = smooth(1.0, 0.25, d);
                    if frozen {
                        *c = c.lerp(frost, k * 0.6);
                    } else {
                        *c += ember_glow * k * 0.35 * pulse;
                    }
                });
            }
            K::Furnace => {
                let stage = h.stage;
                disc(v, h.pos, h.r * 1.9, move |d, _, hh, c| {
                    let k = smooth(1.0, 0.4, d);
                    *hh -= 0.22 * k;
                    let glow = if stage < 4 { ember_glow * 0.5 } else { Vec3::new(0.5, 0.2, 0.15) };
                    *c = c.lerp(char_c, k * 0.7) + glow * k * 0.5;
                });
            }
            K::Bone => {
                let at = h.to;
                let d = if h.stage == 0 { 0.5 } else { 0.25 };
                disc(v, at, 0.85, move |x, _, hh, c| {
                    let k = smooth(1.0, 0.5, x);
                    *hh -= 0.06 * k * d * 2.0;
                    *c = c.lerp(cut, k * d);
                });
            }
            _ => {}
        }
    }
}
