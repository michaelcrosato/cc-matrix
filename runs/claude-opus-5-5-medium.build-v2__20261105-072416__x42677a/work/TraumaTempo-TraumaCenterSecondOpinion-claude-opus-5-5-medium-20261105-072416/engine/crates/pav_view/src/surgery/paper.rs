//! The paper theatre: layered, extruded spline cards that the engine lights, shadows and outlines.
//! Each character is a rig of parts from a text file; sets are cards too, with parallax layers.

use std::collections::HashMap;

use glam::{Mat4, Vec2, Vec3};
use pav_core::games::surgery::content::{Content, Set};
use pav_core::games::surgery::frame::StoryView;
use pav_core::games::surgery::paper::{Outline, PartGeo, mouth_points, outline, pose_for, posed, rig_parts};
use pav_render::mesh::{MeshData, Vertex};
use pav_render::scene::{self as rs, DynamicMesh, ParticleBurst, PointLight, Scene, Style};

const LAYER: f32 = 0.035;
const DEPTH: f32 = 0.03;

/// Extrudes an outline's points into a card: front face at `z`, walls back to `z - depth`.
fn card(out: &mut MeshData, points: &[Vec2], tris: &[u32], z: f32, depth: f32, xf: &Mat4, color: [f32; 4]) {
    let base = out.vertices.len() as u32;
    let n = xf.transform_vector3(Vec3::Z).normalize_or_zero();
    for q in points {
        let p = xf.transform_point3(Vec3::new(q.x, q.y, z));
        debug_assert!(p.is_finite());
        out.vertices.push(Vertex { pos: p.to_array(), normal: n.to_array(), uv: [q.x, q.y], color });
    }
    out.indices.extend(tris.iter().map(|t| t + base));
    if depth > 0.0 {
        let m = points.len();
        for i in 0..m {
            let (a, b) = (points[i], points[(i + 1) % m]);
            let e = b - a;
            let wall = xf.transform_vector3(Vec3::new(e.y, -e.x, 0.0)).normalize_or_zero();
            let v = out.vertices.len() as u32;
            for (q, zz) in [(a, z), (b, z), (b, z - depth), (a, z - depth)] {
                let p = xf.transform_point3(Vec3::new(q.x, q.y, zz));
                out.vertices.push(Vertex { pos: p.to_array(), normal: wall.to_array(), uv: [0.0, 0.0], color });
            }
            out.indices.extend_from_slice(&[v, v + 2, v + 1, v, v + 3, v + 2]);
        }
    }
}

#[derive(Default)]
pub struct PaperView {
    rigs: HashMap<String, Vec<PartGeo>>,
    sets: HashMap<String, Vec<(f32, [f32; 3], f32, f32, Outline)>>,
    rain_carry: f32,
    group: u32,
}

fn linear(hex: &str) -> [f32; 3] {
    rs::hex(hex).unwrap_or(Vec3::splat(0.5)).to_array()
}

impl PaperView {
    fn next_group(&mut self) -> u32 {
        self.group += 1;
        self.group
    }

    fn push(&mut self, scene: &mut Scene, data: MeshData, emissive: f32, flags: u32) {
        let group = self.next_group();
        scene.dynamic.push(DynamicMesh { data, color: Vec3::ONE, emissive, style: Style::Cel, flags, group, material: 0 });
    }

    fn set_cards(&mut self, s: &Set) {
        if self.sets.contains_key(&s.id) {
            return;
        }
        let mut list = Vec::new();
        for card in &s.card {
            let pts: Vec<Vec2> = match card.rect {
                Some([x0, y0, x1, y1]) => vec![Vec2::new(x0, y0), Vec2::new(x1, y0), Vec2::new(x1, y1), Vec2::new(x0, y1)],
                None => card.points.iter().map(|p| Vec2::new(p[0], p[1])).collect(),
            };
            if pts.len() >= 3 {
                list.push((card.z, linear(&card.color), card.emissive, card.blink, outline(&pts, card.chaikin)));
            }
        }
        self.sets.insert(s.id.clone(), list);
    }

    /// Draws the stage. `dt` for rain.
    pub fn emit(&mut self, scene: &mut Scene, st: &StoryView, c: &Content, time: f32, dt: f32, clear: &mut Vec3, particles: bool) {
        self.group = 0x4000;
        let Some(set) = c.sets.get(&st.set) else { return };
        self.set_cards(set);
        *clear = rs::hex(&set.back).unwrap_or(Vec3::ZERO);
        // The camera sways a touch: real parallax between the layers.
        let parallax = Vec2::new((time * 0.31).sin() * 0.05, (time * 0.23).cos() * 0.02);
        let cards = self.sets.get(&st.set).cloned().unwrap_or_default();
        for (z, color, emissive, blink, o) in cards {
            let mut data = MeshData::default();
            let depthwise = 1.0 + z.abs() * 0.05;
            let xf = Mat4::from_translation(Vec3::new(parallax.x * z.abs() * 0.3, parallax.y * z.abs() * 0.3, 0.0)) * Mat4::from_scale(Vec3::new(depthwise, depthwise, 1.0));
            let dim = if blink > 0.0 { 0.65 + 0.35 * (time * 3.0 * blink).sin().abs() } else { 1.0 };
            let col = [color[0] * dim, color[1] * dim, color[2] * dim, 1.0];
            card(&mut data, &o.points, &o.tris, z, 0.05, &xf, col);
            self.push(scene, data, emissive, rs::flags::NO_SHADOW);
        }
        // Lamp and rain.
        let lamp = rs::hex(&set.lamp).unwrap_or(Vec3::ONE);
        scene.point_lights.push(PointLight { position: Vec3::new(-2.0, 5.0, 5.0), color: lamp * 0.8, radius: 18.0, shadows: true });
        if set.rain > 0.0 && particles {
            self.rain_carry += dt * 45.0 * set.rain;
            let count = self.rain_carry as u32;
            self.rain_carry -= count as f32;
            if count > 0 {
                scene.particles.push(ParticleBurst {
                    count,
                    pos: Vec3::new(0.0, 6.5, -4.6),
                    area: Vec3::new(11.0, 0.5, 0.4),
                    vel: Vec3::new(-1.0, -12.0, 0.0),
                    spread: 0.3,
                    gravity: 3.0,
                    life: (0.8, 1.1),
                    size: (0.02, 0.015),
                    color0: glam::Vec4::new(0.7, 0.85, 1.0, 0.5),
                    color1: glam::Vec4::new(0.7, 0.85, 1.0, 0.0),
                    additive: true,
                    stretch: true,
                    ..Default::default()
                });
            }
        }
        // The characters.
        for (idx, actor) in st.actors.iter().enumerate() {
            let Some(rig) = c.rigs.get(&actor.rig) else { continue };
            if !self.rigs.contains_key(&actor.rig) {
                self.rigs.insert(actor.rig.clone(), rig_parts(c, rig));
            }
            let parts = self.rigs.get(&actor.rig).cloned().unwrap_or_default();
            let seed = idx as f32 * 2.3 + actor.rig.len() as f32;
            let pose = pose_for(rig.expr.get(&actor.expr), time, seed, actor.talking);
            // Slide in with an overshoot; a 3/4 stance turned toward the middle.
            let k = (actor.age * 3.2).min(1.0);
            let over = 1.0 - (1.0 - k).powi(3) + (k * std::f32::consts::PI).sin() * 0.08;
            let from = if actor.x < 0.0 { -9.0 } else { 9.0 };
            let x = from + (actor.x - from) * over;
            let yaw = if actor.x.abs() < 0.3 { 0.0 } else { -actor.x.signum() * 0.22 } + (time * 0.5 + seed).sin() * 0.035;
            let shake = Vec2::new((time * 40.0).sin(), (time * 33.0).cos()) * (st.shake * 0.05);
            let scale = rig.scale.max(0.5) * 0.86;
            let xf = Mat4::from_translation(Vec3::new(x + shake.x, 0.42 + shake.y, 0.0))
                * Mat4::from_rotation_y(yaw)
                * Mat4::from_scale(Vec3::splat(scale));
            for part in &parts {
                let moved: Vec<Vec2> = part.outline.points.iter().map(|q| posed(part, &pose, *q)).collect();
                let mut data = MeshData::default();
                let col = [
                    rs::srgb_to_linear(part.color[0] as f32 / 255.0),
                    rs::srgb_to_linear(part.color[1] as f32 / 255.0),
                    rs::srgb_to_linear(part.color[2] as f32 / 255.0),
                    1.0,
                ];
                card(&mut data, &moved, &part.outline.tris, part.z * LAYER, DEPTH, &xf, col);
                self.push(scene, data, 0.0, 0);
            }
            // The mouth, by frame.
            let expr = rig.expr.get(&actor.expr);
            let shape = expr.map(|e| e.mouth.as_str()).unwrap_or("closed");
            let m = mouth_points(shape, actor.talking, pose.flap);
            let o = outline(&m, 1);
            let head_part = PartGeo { name: "mouth".into(), z: 3.6, color: [0; 3], layer: pav_core::games::surgery::paper::Layer::Head, side: 0.0, outline: Outline::default() };
            let moved: Vec<Vec2> = o.points.iter().map(|q| posed(&head_part, &pose, *q)).collect();
            let mut data = MeshData::default();
            card(&mut data, &moved, &o.tris, 3.6 * LAYER, DEPTH, &xf, [0.18, 0.04, 0.06, 1.0]);
            self.push(scene, data, 0.0, 0);
        }
    }
}

/// The paper stage's light and style (tested values).
pub fn stage_light(scene: &mut Scene) {
    scene.ambient = rs::Ambient { sky: Vec3::new(0.74, 0.74, 0.78), ground: Vec3::new(0.6, 0.56, 0.56) };
    scene.sun = rs::Sun {
        direction: Vec3::new(0.3, -0.45, -0.85).normalize(),
        color: Vec3::splat(0.34),
        shadows: true,
        shadow_center: Vec3::ZERO,
        shadow_radius: 14.0,
    };
    scene.style.cel_bands = 3.0;
    scene.style.rim = 0.05;
    scene.post.outlines = true;
    scene.post.outline_darken = 0.32;
    scene.post.outline_px = 1.4;
    scene.post.gi = 0.4;
    scene.post.bloom = 0.3;
    scene.post.bloom_threshold = 1.15;
    scene.filter.vignette = 0.32;
}
