//! The paper theatre: layered, extruded spline cards from the rig and set files, lit, shadowed and
//! outlined by the engine.

use std::collections::HashMap;

use glam::{Mat4, Vec2, Vec3};
use pav_core::games::surgery::content::{self, RigDef, SetDef};
use pav_core::games::surgery::frame::{ActorView, StoryView};
use pav_core::games::surgery::paper;
use pav_render::mesh::{MeshData, Vertex};
use pav_render::scene::{DynamicMesh, ParticleBurst, PointLight, Scene, Style, flags, srgb};

const LAYER: f32 = 0.035;

struct Card {
    role: String,
    name: String,
    pts: Vec<Vec2>,
    tris: Vec<[u32; 3]>,
    z: f32,
    depth: f32,
    color: Vec3,
    spring: f32,
    sign: f32,
    head: bool,
    emissive: f32,
    monitor: bool,
}

struct RigMesh {
    cards: Vec<Card>,
}

struct SetMesh {
    cards: Vec<Card>,
}

fn rgb(c: [u8; 3]) -> Vec3 {
    srgb(c[0], c[1], c[2])
}

fn card_of(pts: Vec<Vec2>, role: &str, name: &str, z: f32, depth: f32, color: Vec3, spring: f32, sign: f32) -> Card {
    let tris = paper::triangulate(&pts);
    let is_head = !matches!(role, "body") && (z >= 2.9 || name.contains("hair") || name.contains("chignon"));
    Card {
        role: role.to_string(),
        name: name.to_string(),
        pts,
        tris,
        z,
        depth,
        color,
        spring,
        sign,
        head: is_head,
        emissive: 0.0,
        monitor: false,
    }
}

fn build_rig(r: &RigDef) -> RigMesh {
    let mut cards = Vec::new();
    for p in &r.part {
        let outline = p.outline();
        let color = r.palette.get(&p.color).map(|c| rgb(*c)).unwrap_or(Vec3::ONE);
        if p.mirror {
            cards.push(card_of(outline.clone(), &p.role, &p.name, p.z, p.depth, color, p.spring, 1.0));
            let flipped: Vec<Vec2> = outline.iter().rev().map(|q| Vec2::new(-q.x, q.y)).collect();
            cards.push(card_of(flipped, &p.role, &p.name, p.z, p.depth, color, p.spring, -1.0));
        } else {
            cards.push(card_of(outline, &p.role, &p.name, p.z, p.depth, color, p.spring, 1.0));
        }
    }
    RigMesh { cards }
}

fn build_set(s: &SetDef) -> SetMesh {
    let mut cards = Vec::new();
    for l in &s.layer {
        let n = l.repeat[0].max(1.0) as i32;
        for k in 0..n {
            let dx = l.repeat[1] * (k as f32 - (n - 1) as f32 * 0.5);
            let pts: Vec<Vec2> = l.points.iter().map(|p| Vec2::new(p[0] + dx, p[1])).collect();
            let pts = paper::chaikin(&pts, l.chaikin);
            let mut c = card_of(pts, "", "layer", l.z, 0.08, rgb(l.color), 0.0, 1.0);
            c.emissive = l.emissive;
            c.monitor = l.monitor;
            cards.push(c);
        }
    }
    SetMesh { cards }
}

/// Emits a card: front face plus edge quads back to `z - depth`, so it casts shadows and takes
/// outlines.
fn push_card(
    scene: &mut Scene,
    pts: &[Vec2],
    tris: &[[u32; 3]],
    m: Mat4,
    z: f32,
    depth: f32,
    color: Vec3,
    emissive: f32,
    group: u32,
    style: Style,
    flag: u32,
) {
    if pts.len() < 3 || tris.is_empty() {
        return;
    }
    let normal = m.transform_vector3(Vec3::Z).normalize_or(Vec3::Z);
    let mut data =
        MeshData { vertices: Vec::with_capacity(pts.len() * 5), indices: Vec::with_capacity(tris.len() * 3 + pts.len() * 6) };
    for p in pts {
        let v = m.transform_point3(Vec3::new(p.x, p.y, z));
        data.vertices.push(Vertex { pos: v.to_array(), normal: normal.to_array(), uv: [0.0, 0.0], color: [1.0; 4] });
    }
    for t in tris {
        data.indices.extend_from_slice(t);
    }
    // Edges. Outward: for a counter-clockwise outline, right of the walking direction.
    let ccw = paper::signed_area(pts) >= 0.0;
    for i in 0..pts.len() {
        let (a, b) = (pts[i], pts[(i + 1) % pts.len()]);
        let d = b - a;
        if d.length_squared() < 1e-9 {
            continue;
        }
        let out = if ccw { Vec3::new(d.y, -d.x, 0.0) } else { Vec3::new(-d.y, d.x, 0.0) }.normalize();
        let nrm = m.transform_vector3(out).normalize_or(Vec3::X).to_array();
        let base = data.vertices.len() as u32;
        for (p, zz) in [(a, z), (b, z), (b, z - depth), (a, z - depth)] {
            let v = m.transform_point3(Vec3::new(p.x, p.y, zz));
            data.vertices.push(Vertex { pos: v.to_array(), normal: nrm, uv: [0.0, 0.0], color: [1.0; 4] });
        }
        if ccw {
            data.indices.extend_from_slice(&[base, base + 3, base + 2, base, base + 2, base + 1]);
        } else {
            data.indices.extend_from_slice(&[base, base + 1, base + 2, base, base + 2, base + 3]);
        }
    }
    scene.dynamic.push(DynamicMesh { data, color, emissive, style, flags: flag, group, material: 0 });
}

fn ease_out_back(t: f32) -> f32 {
    let c1 = 1.70158;
    let c3 = c1 + 1.0;
    let x = t - 1.0;
    1.0 + c3 * x * x * x + c1 * x * x
}

#[derive(Default)]
pub struct PaperView {
    rigs: HashMap<String, RigMesh>,
    sets: HashMap<String, SetMesh>,
}

impl PaperView {
    fn ensure(&mut self, story: &StoryView) {
        let content = content::get();
        for a in &story.actors {
            if !self.rigs.contains_key(&*a.who) {
                if let Some(r) = content.rigs.get(&*a.who) {
                    self.rigs.insert(a.who.to_string(), build_rig(r));
                }
            }
        }
        if !self.sets.contains_key(&*story.set) {
            if let Some(s) = content.sets.get(&*story.set) {
                self.sets.insert(story.set.to_string(), build_set(s));
            }
        }
    }

    /// Forget meshes after a content reload.
    pub fn clear(&mut self) {
        self.rigs.clear();
        self.sets.clear();
    }

    pub fn emit(&mut self, scene: &mut Scene, story: &StoryView, time: f32, dt: f32, beat: f32) {
        self.ensure(story);
        let content = content::get();
        let set = content.sets.get(&*story.set);
        // The stage, per set.
        scene.ambient.sky = set.map(|s| Vec3::from(s.ambient_sky)).unwrap_or(Vec3::new(0.74, 0.74, 0.78));
        scene.ambient.ground = set.map(|s| Vec3::from(s.ambient_ground)).unwrap_or(Vec3::new(0.6, 0.56, 0.56));
        scene.sun.direction = Vec3::new(0.3, -0.45, -0.85).normalize();
        scene.sun.color = Vec3::new(1.0, 0.97, 0.92) * 0.34;
        scene.sun.shadows = true;
        scene.sun.shadow_center = Vec3::new(0.0, 0.0, -2.0);
        scene.sun.shadow_radius = 14.0;
        scene.style.cel_bands = 3.0;
        scene.style.rim = 0.05;
        scene.post.outlines = true;
        scene.post.outline_darken = 0.32;
        scene.post.outline_px = 1.4;
        scene.post.gi = 0.4;
        scene.post.bloom = 0.4;
        scene.post.bloom_threshold = 1.1;
        scene.filter.vignette = 0.32;
        scene.clear_color = set.map(|s| rgb(s.sky)).unwrap_or(Vec3::ZERO);
        if let Some(s) = set {
            for l in &s.lamp {
                scene.point_lights.push(PointLight {
                    position: Vec3::new(l[0], l[1], l[2]),
                    color: Vec3::new(l[3], l[4], l[5]) * 0.7,
                    radius: l[6],
                    shadows: false,
                });
            }
            if s.rain {
                let n = (dt * 90.0).ceil() as u32;
                scene.particles.push(ParticleBurst {
                    count: n,
                    pos: Vec3::new(0.0, 7.0, -5.8),
                    area: Vec3::new(16.0, 0.2, 0.5),
                    vel: Vec3::new(-2.0, -16.0, 0.0),
                    spread: 0.4,
                    life: (0.7, 1.0),
                    size: (0.016, 0.012),
                    color0: glam::Vec4::new(0.5, 0.68, 0.95, 0.4),
                    color1: glam::Vec4::new(0.5, 0.68, 0.95, 0.0),
                    additive: true,
                    stretch: true,
                    ..Default::default()
                });
            }
        }
        // The set's cards.
        if let Some(mesh) = self.sets.get(&*story.set) {
            for (i, c) in mesh.cards.iter().enumerate() {
                let style = if c.emissive > 0.5 { Style::Unlit } else { Style::Cel };
                push_card(scene, &c.pts, &c.tris, Mat4::IDENTITY, c.z, c.depth, c.color, c.emissive, 2000 + i as u32, style, 0);
                if c.monitor {
                    monitor_trace(scene, c, beat, time);
                }
            }
        }
        // The cast.
        let n = story.actors.len();
        for (idx, a) in story.actors.iter().enumerate() {
            if let Some(rig) = self.rigs.get(&*a.who) {
                let r = content.rigs.get(&*a.who);
                emit_actor(scene, rig, r, a, time, dt, idx, n, story);
            }
        }
    }
}

fn monitor_trace(scene: &mut Scene, c: &Card, beat: f32, time: f32) {
    let (mut x0, mut x1, mut y0, mut y1) = (f32::MAX, f32::MIN, f32::MAX, f32::MIN);
    for p in &c.pts {
        x0 = x0.min(p.x);
        x1 = x1.max(p.x);
        y0 = y0.min(p.y);
        y1 = y1.max(p.y);
    }
    let segs = 32;
    let wave = |t: f32| -> f32 {
        let ph = (t * 3.0 - time * 1.2 + beat * 0.0).rem_euclid(1.0);
        let g = |c: f32, w: f32| (-(ph - c) * (ph - c) / w).exp();
        g(0.1, 0.0012) * 1.0 - g(0.14, 0.0006) * 0.3 + g(0.3, 0.004) * 0.25
    };
    let mid = (y0 + y1) * 0.5;
    let amp = (y1 - y0) * 0.38;
    let mut data = MeshData::default();
    for i in 0..=segs {
        let t = i as f32 / segs as f32;
        let x = x0 + (x1 - x0) * t;
        let y = mid + wave(t) * amp - amp * 0.2;
        for dy in [-0.03f32, 0.03] {
            data.vertices.push(Vertex { pos: [x, y + dy, c.z + 0.05], normal: [0.0, 0.0, 1.0], uv: [0.0, 0.0], color: [1.0; 4] });
        }
        if i < segs {
            let b = (i * 2) as u32;
            data.indices.extend_from_slice(&[b, b + 2, b + 1, b + 1, b + 2, b + 3]);
        }
    }
    scene.dynamic.push(DynamicMesh {
        data,
        color: Vec3::new(0.3, 1.0, 0.6),
        emissive: 1.3,
        style: Style::Unlit,
        flags: flags::NO_SHADOW,
        group: 0,
        material: 0,
    });
}

fn emit_actor(
    scene: &mut Scene,
    rig: &RigMesh,
    def: Option<&RigDef>,
    a: &ActorView,
    time: f32,
    _dt: f32,
    idx: usize,
    _n: usize,
    story: &StoryView,
) {
    let seed = a.who.bytes().fold(7u32, |h, b| h.wrapping_mul(31).wrapping_add(b as u32)) as f32 * 0.001;
    // Slide in with overshoot; slide out; shake on shock.
    let side = if a.x < 0.0 { -1.0 } else { 1.0 };
    let k = if a.leaving { 1.0 - (a.t / 0.45).clamp(0.0, 1.0) } else { ease_out_back((a.t / 0.5).clamp(0.0, 1.0)) };
    let mut x = a.x + side * (1.0 - k) * 9.0;
    x += (story.shake * 30.0 + seed).sin() * 0.05 * story.shake;
    let talking = a.talking;
    let t = time + seed * 17.0;
    let breathe = (t * 1.5).sin() * 0.012;
    let sway = (t * 0.6).sin() * 2f32.to_radians();
    let yaw = -side * 0.22 + sway;
    let expr = def.and_then(|d| d.expr.get(&*a.expr).or_else(|| d.expr.get("neutral")));
    let is_speaker = a.who == story.who;
    // Who isn't speaking steps back a little.
    let (scale, z_off) = if is_speaker { (1.0, 0.0) } else { (0.97, -0.25) };
    let root =
        Mat4::from_translation(Vec3::new(x, 0.25, z_off)) * Mat4::from_rotation_y(yaw) * Mat4::from_scale(Vec3::splat(scale));
    let body = root * Mat4::from_translation(Vec3::new(0.0, breathe, 0.0));
    // Head: tilt, a nod on stressed words, a little look-around.
    let nod = if talking { ((t * 7.5).sin() * 0.5 + 0.5).powi(3) * 0.03 } else { 0.0 };
    let (tilt, drop) = expr.map(|e| (e.tilt, e.drop)).unwrap_or((0.0, 0.0));
    let head = body
        * Mat4::from_translation(Vec3::new(0.0, -0.3 - nod - drop, 0.0))
        * Mat4::from_rotation_z((tilt + (t * 0.8).sin() * 0.8).to_radians())
        * Mat4::from_translation(Vec3::new(0.0, 0.3, 0.0));
    // Blink every few seconds.
    let blink_t = (t * 0.27).fract();
    let blink = if blink_t < 0.035 { 1.0 - (blink_t / 0.035 - 0.5).abs() * 2.0 } else { 0.0 };
    let lid_e = expr.map(|e| e.lid).unwrap_or(0.0);
    let closed = (blink + lid_e.max(0.0) * 0.35).clamp(0.0, 1.0);
    let wide = (-lid_e).max(0.0);
    let (bi, bo) = expr.map(|e| (e.brow_inner, e.brow_outer)).unwrap_or((0.0, 0.0));
    let iris_k = expr.map(|e| if e.iris > 0.0 { e.iris } else { 1.0 }).unwrap_or(1.0);
    let look = Vec2::new(-side * 0.012 + (t * 0.4).sin() * 0.006, 0.0);
    let base = 100 + idx as u32 * 60;
    for (i, c) in rig.cards.iter().enumerate() {
        let m = if c.head { head } else { body };
        let z = c.z * LAYER;
        let mut pts = c.pts.clone();
        let sign = c.sign;
        match c.role.as_str() {
            "brow" => {
                for p in &mut pts {
                    let along = ((p.x.abs() - 0.13) / 0.42).clamp(0.0, 1.0);
                    p.y += bi + (bo - bi) * along;
                }
            }
            "lid" => {
                for p in &mut pts {
                    p.y -= closed * 0.14;
                    p.y += wide * 0.02;
                }
            }
            "eye" => {
                for p in &mut pts {
                    p.y = 0.34 + (p.y - 0.34) * (1.0 - closed * 0.9 + wide * 0.25);
                }
            }
            "iris" | "pupil" => {
                let center = Vec2::new(0.34 * sign, 0.34);
                for p in &mut pts {
                    *p = center + (*p - center) * iris_k + look;
                    p.y = 0.34 + (p.y - 0.34) * (1.0 - closed * 0.9);
                }
            }
            "hair" => {
                if c.spring > 0.0 {
                    let wind = (t * 1.7).sin() * 0.018 * c.spring;
                    for p in &mut pts {
                        p.x += wind * (1.8 - p.y).max(0.0);
                    }
                }
            }
            _ => {
                if c.spring > 0.0 {
                    let wind = (t * 1.3).sin() * 0.014 * c.spring;
                    for p in &mut pts {
                        p.x += wind * (1.2 - p.y).max(0.0);
                    }
                }
            }
        }
        let tris = &c.tris;
        let style = if c.name == "glint" { Style::Unlit } else { Style::Cel };
        let group = match c.name.as_str() {
            "cheek" => base,
            "face" => base,
            _ => base + 1 + i as u32,
        };
        push_card(scene, &pts, tris, m, z, c.depth, c.color, 0.0, group, style, 0);
    }
    // The mouth: a frame for talk, a frame for rest.
    if let Some(e) = expr {
        let open = talking && (t * 11.0).sin() > -0.1;
        let shape = if open && !e.open.is_empty() { &e.open } else { &e.closed };
        if shape.len() >= 3 {
            let pts: Vec<Vec2> = shape.iter().map(|p| Vec2::new(p[0], p[1])).collect();
            let pts = paper::chaikin(&pts, 1);
            let tris = paper::triangulate(&pts);
            push_card(scene, &pts, &tris, head, 3.7 * LAYER, 0.01, srgb(92, 30, 40), 0.0, base + 59, Style::Cel, 0);
        }
    }
}
