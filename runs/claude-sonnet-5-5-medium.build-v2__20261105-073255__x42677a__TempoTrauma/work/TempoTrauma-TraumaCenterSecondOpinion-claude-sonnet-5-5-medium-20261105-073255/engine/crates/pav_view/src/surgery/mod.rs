//! Tempo Trauma's view: the operative field as one per-frame mesh, instruments and strains
//! as SDF solids, and the paper theatre for the story (see `paper.rs`).

use glam::{Mat4, Vec2, Vec3, Vec4};
use pav_core::games::surgery::frame::{HzView, SurgeonView, SurgeryFrame};
use pav_core::games::surgery::{Mode, cue};
use pav_render::mesh::{MeshData, Vertex};
use pav_render::scene::{self as rs, CameraData, DynamicMesh, ParticleBurst, PointLight, Scene, SdfInstance, Style};

pub mod paper;
pub mod plates;

pub fn lin(r: u8, g: u8, b: u8) -> Vec3 {
    let f = |c: u8| {
        let c = c as f32 / 255.0;
        if c <= 0.04045 { c / 12.92 } else { ((c + 0.055) / 1.055).powf(2.4) }
    };
    Vec3::new(f(r), f(g), f(b))
}

pub const NK: [&str; 15] =
    ["line", "lace", "pool", "bleeder", "hook", "polyp", "tumor", "burn", "bone", "nodule", "sac", "eye", "ember", "tendril", "dress"];

/// The camera for a shot (also used to turn the mouse into a field position).
pub fn camera_for(shot: &pav_core::games::surgery::frame::CameraShot, aspect: f32) -> CameraData {
    let tilt = shot.tilt.to_radians();
    let yaw = shot.yaw.to_radians();
    let target = Vec3::from(shot.target);
    let off = Vec3::new(yaw.sin() * tilt.cos(), tilt.sin(), yaw.cos() * tilt.cos()) * shot.distance;
    let eye = target + off;
    let forward = (target - eye).normalize();
    let mut fov = shot.fov.to_radians();
    if aspect < 1.4 && aspect > 0.0 {
        // keep the whole field in view on narrower windows
        fov = 2.0 * ((fov * 0.5).tan() * (16.0 / 9.0) / aspect.max(0.5)).atan();
        fov = fov.min(100f32.to_radians());
    }
    let view = glam::camera::rh::view::look_to_mat4(eye, forward, Vec3::Y);
    let proj = glam::camera::rh::proj::directx::perspective(fov, aspect.max(0.1), 0.1, 300.0);
    CameraData { view, proj, eye, forward, ortho: false }
}

/// Field position (x, z) under a pointer at normalised screen coordinates (0..1, y down).
pub fn pointer_to_field(shot: &pav_core::games::surgery::frame::CameraShot, aspect: f32, u: f32, v: f32) -> Vec2 {
    let cam = camera_for(shot, aspect);
    let inv = (cam.proj * cam.view).inverse();
    let ndc = Vec4::new(u * 2.0 - 1.0, 1.0 - v * 2.0, 0.5, 1.0);
    let far = inv * ndc;
    let far = far.truncate() / far.w;
    let dir = (far - cam.eye).normalize();
    // intersect with the plane y = 0.3 (tissue top)
    let y = 0.3;
    if dir.y.abs() < 1e-4 {
        return Vec2::ZERO;
    }
    let t = (y - cam.eye.y) / dir.y;
    let p = cam.eye + dir * t;
    Vec2::new(p.x, p.z)
}

/// Screen position (0..1, y down) of a field point.
pub fn field_to_screen(shot: &pav_core::games::surgery::frame::CameraShot, aspect: f32, p: Vec2, y: f32) -> Vec2 {
    let cam = camera_for(shot, aspect);
    let c = cam.proj * cam.view * Vec4::new(p.x, y, p.y, 1.0);
    let n = c.truncate() / c.w;
    Vec2::new(n.x * 0.5 + 0.5, 0.5 - n.y * 0.5)
}

#[derive(Default)]
pub struct SurgeryView {
    last_fx: u32,
    pending: Vec<ParticleBurst>,
    last_time: f32,
    pub paper: paper::PaperView,
    last_case: i32,
    shock: Vec<(Vec3, f32)>,
}

fn burst(pos: Vec3, count: u32, c0: Vec4, c1: Vec4, additive: bool, f: impl FnOnce(&mut ParticleBurst)) -> ParticleBurst {
    let mut b = ParticleBurst { pos, count, color0: c0, color1: c1, additive, ..Default::default() };
    b.life = (0.25, 0.6);
    b.size = (0.08, 0.0);
    b.spread = 2.0;
    b.gravity = 0.0;
    f(&mut b);
    b
}

fn cyl(scene: &mut Scene, a: Vec3, b: Vec3, r: f32, color: Vec3, style: Style, emissive: f32, group: u32) {
    scene.sdfs.push(SdfInstance { a, b, ra: r, rb: r, color, emissive, style, flags: 0, group, material: 0 });
}
fn cone(scene: &mut Scene, a: Vec3, b: Vec3, ra: f32, rb: f32, color: Vec3, style: Style, emissive: f32, group: u32) {
    scene.sdfs.push(SdfInstance { a, b, ra, rb, color, emissive, style, flags: 0, group, material: 0 });
}
fn ball(scene: &mut Scene, c: Vec3, r: f32, color: Vec3, style: Style, emissive: f32, group: u32) {
    scene.sdfs.push(SdfInstance { a: c, b: c, ra: r, rb: r, color, emissive, style, flags: 0, group, material: 0 });
}
fn glow(scene: &mut Scene, c: Vec3, r: f32, color: Vec3, e: f32) {
    scene.sdfs.push(SdfInstance {
        a: c,
        b: c,
        ra: r,
        rb: r,
        color,
        emissive: e,
        style: Style::Unlit,
        flags: rs::flags::NO_SHADOW | rs::flags::NO_CUT,
        group: 0x5a1,
        material: 0,
    });
}

fn lift(scene: &mut Scene, from: usize, dy: f32) {
    for s in scene.sdfs[from..].iter_mut() {
        s.a.y += dy;
        s.b.y += dy;
    }
}

const SEAT: [[u8; 3]; 4] = [[0xe8, 0x44, 0x3a], [0x3b, 0x82, 0xf6], [0x22, 0xc5, 0x5e], [0xf5, 0xb7, 0x00]];

pub fn seat_color(seat: u8) -> Vec3 {
    let c = SEAT[(seat as usize) % 4];
    lin(c[0], c[1], c[2])
}

impl SurgeryView {
    /// Fills the scene for the surgery game. Returns true when it drew the whole scene.
    pub fn emit(&mut self, scene: &mut Scene, f: &SurgeryFrame, time: f32, aspect: f32, alpha_particles: bool, reduce_flashes: bool) {
        let dt = (time - self.last_time).clamp(0.0, 0.1);
        self.last_time = time;
        scene.clear_color = lin(16, 40, 44);
        scene.post.outlines = true;
        scene.post.outline_darken = 0.45;
        scene.post.outline_px = 1.4;
        scene.post.bloom = 0.35;
        scene.post.bloom_threshold = 1.15;
        scene.post.gi = 0.6;
        scene.post.haze = 0.0;
        scene.style = rs::StyleSettings { flat_shadow: 0.6, cel_bands: 3.0, rim: 0.12, specular: 0.4 };
        scene.filter.vignette = 0.35;
        scene.filter.chroma = 0.0;
        scene.filter.saturation = 1.0;
        let story = matches!(f.mode, Mode::Story);
        if story || matches!(f.mode, Mode::Idle) && f.scene == "title" && false {
            self.paper.emit(scene, f, time, aspect);
            return;
        }
        // Camera.
        let mut shot = f.camera;
        if f.shake > 0.0 {
            let s = f.shake * f.shake * 0.4;
            shot.target[0] += (time * 41.0).sin() * s;
            shot.target[2] += (time * 37.0).cos() * s * 0.6;
        }
        if f.banner_t > 0.0 && f.banner == "OPERATION START" {
            // a short push in
            let k = (f.banner_t / 1.6).clamp(0.0, 1.0);
            shot.distance *= 1.0 - 0.12 * (k * (1.0 - k) * 4.0);
        }
        if f.code_t > 0.0 {
            shot.distance *= 0.92;
        }
        scene.camera = camera_for(&shot, aspect);
        // Lights.
        scene.sun.direction = Vec3::new(-0.25, -1.0, -0.35).normalize();
        scene.sun.color = Vec3::new(1.0, 0.96, 0.9) * 0.42;
        scene.sun.shadows = true;
        scene.sun.shadow_center = Vec3::ZERO;
        scene.sun.shadow_radius = 16.0;
        scene.ambient.sky = Vec3::new(0.50, 0.50, 0.54);
        scene.ambient.ground = Vec3::new(0.30, 0.22, 0.22);
        scene.point_lights.push(PointLight { position: Vec3::new(-1.0, 7.0, -1.0), color: Vec3::new(1.0, 0.97, 0.9) * 0.9, radius: 16.0, shadows: true });
        // Hush: colour drains from everything but the tissue.
        let hush = f.hush > 0.0;
        scene.filter.saturation = if hush { 0.55 } else { 1.0 };
        scene.filter.vignette = 0.35 + if f.vitals < 35.0 { (1.0 - f.vitals / 35.0) * 0.35 * (0.6 + 0.4 * (1.0 - f.beat).powi(3)) } else { 0.0 };
        if f.vitals < 35.0 && !reduce_flashes {
            scene.filter.chroma = (1.0 - f.vitals / 35.0) * 0.4;
        }
        if f.code_t > 0.0 {
            scene.filter.saturation = 0.2;
            scene.filter.vignette = 0.6;
        }
        let pulse = (-f.beat * 7.0).exp() * 0.7 + (-((f.beat - 0.3).max(0.0)) * 9.0).exp() * 0.18 * ((f.beat > 0.3) as i32 as f32);
        let pulse = if f.code_t > 0.0 { 0.0 } else { pulse };
        // The field.
        let mesh = plates::field_mesh(f, time, pulse);
        scene.dynamic.push(DynamicMesh { data: mesh, color: Vec3::ONE, emissive: 0.0, style: Style::Cel, flags: 0, group: 3, material: 0 });
        self.drape(scene);
        self.tray(scene, f, time);
        for h in &f.hz {
            let n0 = scene.sdfs.len();
            self.hazard(scene, f, h, time, pulse);
            lift(scene, n0, plates::surface(f, h.p[0], h.p[1]) - 0.3);
        }
        for s in f.sg.iter().filter(|s| s.active) {
            let n0 = scene.sdfs.len();
            self.instrument(scene, f, s, time);
            lift(scene, n0, plates::surface(f, s.pos[0], s.pos[1]) - 0.3);
        }
        if let Some(g) = f.sg.get(3).and_then(|s| s.ghost) {
            if f.echo > 0.0 {
                let n0 = scene.sdfs.len();
                self.ghost_hands(scene, f, Vec2::from(g), time);
                lift(scene, n0, plates::surface(f, g[0], g[1]) - 0.3);
            }
        }
        // Heat ring sweeping the field.
        if f.ring_r > 0.0 {
            let n = 72;
            for i in 0..n {
                let a0 = i as f32 / n as f32 * std::f32::consts::TAU;
                let a1 = (i + 1) as f32 / n as f32 * std::f32::consts::TAU;
                let p0 = Vec3::new(a0.cos() * f.ring_r, 0.5, a0.sin() * f.ring_r * 0.75);
                let p1 = Vec3::new(a1.cos() * f.ring_r, 0.5, a1.sin() * f.ring_r * 0.75);
                cyl(scene, p0, p1, 0.09, Vec3::new(1.0, 0.45, 0.1), Style::Unlit, 2.0, 0x5a2);
            }
            scene.distortions.push(rs::Distortion {
                pos: Vec3::new(0.0, 0.4, 0.0),
                radius: f.ring_r.max(0.5),
                strength: 0.12,
                kind: rs::DistortKind::Haze,
                progress: 0.5,
            });
        } else if f.ring_warn {
            for i in 0..24 {
                let a = i as f32 / 24.0 * std::f32::consts::TAU;
                glow(scene, Vec3::new(a.cos() * 1.0, 0.5, a.sin() * 0.75), 0.07, Vec3::new(1.0, 0.5, 0.1), 2.0);
            }
        }
        // Gift effects.
        if f.hush > 0.0 {
            scene.distortions.push(rs::Distortion {
                pos: Vec3::new(0.0, 0.5, 0.0),
                radius: 6.0 + (time * 1.5).sin(),
                strength: 0.05,
                kind: rs::DistortKind::Ripple,
                progress: (time * 0.5).fract(),
            });
        }
        if f.code_t > 0.0 {
            scene.distortions.push(rs::Distortion {
                pos: Vec3::new(0.0, 0.5, 0.0),
                radius: 3.0,
                strength: 0.1 * (1.0 - (f.ghost_phase - 0.5).abs() * 2.0).max(0.0),
                kind: rs::DistortKind::Ring,
                progress: f.ghost_phase,
            });
        }
        self.fx(scene, f, time, alpha_particles);
        if hush {
            // Colour drains from everything but the tissue: mark every instrument and prop as an object
            // and aim the saturation at objects only.
            for s in scene.sdfs.iter_mut() {
                s.flags |= rs::flags::OBJECT;
            }
            for m in scene.meshes.iter_mut() {
                m.flags |= rs::flags::OBJECT;
            }
            scene.filter.color_part = rs::Part::Objects;
        }
        // Rating pops in the world.
        for p in &f.pops {
            let col = match p.rating {
                3 => lin(255, 220, 90),
                2 => lin(120, 255, 200),
                1 => lin(230, 230, 240),
                _ => lin(255, 120, 110),
            };
            let name = pav_core::games::surgery::RATING_NAMES[p.rating as usize];
            let rise = p.t * 0.9;
            let txt = if p.on_beat { format!("{name}  ON BEAT") } else { name.to_string() };
            scene.texts.push(pav_render::text::Text3d {
                text: txt,
                origin: Vec3::new(p.pos.x, 1.2 + rise, p.pos.y - 0.6),
                right: Vec3::X,
                up: Vec3::new(0.0, 0.55, -0.83).normalize(),
                size: 0.55 + 0.1 * p.rating as f32,
                color: col,
                anchor: pav_render::text::Anchor::Center,
                flags: rs::flags::NO_SHADOW | rs::flags::NO_CUT,
                weight: 0.3,
            });
            if p.chain >= 3 {
                scene.texts.push(pav_render::text::Text3d {
                    text: format!("x{}", p.chain),
                    origin: Vec3::new(p.pos.x + 1.8, 1.0 + rise, p.pos.y - 0.2),
                    right: Vec3::X,
                    up: Vec3::new(0.0, 0.55, -0.83).normalize(),
                    size: 0.5,
                    color: lin(255, 240, 160),
                    anchor: pav_render::text::Anchor::Center,
                    flags: rs::flags::NO_SHADOW | rs::flags::NO_CUT,
                    weight: 0.2,
                });
            }
        }
        // Co-op names / seat markers.
        let team = f.sg.iter().filter(|s| s.active).count() > 1;
        if team {
            for s in f.sg.iter().filter(|s| s.active) {
                let p = Vec2::from(s.pos);
                scene.texts.push(pav_render::text::Text3d {
                    text: format!("P{}", s.seat + 1),
                    origin: Vec3::new(p.x + 0.9, 1.4, p.y - 0.9),
                    right: Vec3::X,
                    up: Vec3::new(0.0, 0.55, -0.83).normalize(),
                    size: 0.5,
                    color: seat_color(s.seat),
                    anchor: pav_render::text::Anchor::Center,
                    flags: rs::flags::NO_SHADOW | rs::flags::NO_CUT,
                    weight: 0.3,
                });
            }
        }
        self.last_case = f.case as i32;
    }

    fn drape(&self, scene: &mut Scene) {
        let teal = lin(34, 112, 116);
        let steel = lin(170, 178, 190);
        // A teal drape frames the opening on every side, with steel retractors.
        for (c, h) in [
            (Vec3::new(0.0, 0.0, -7.6), Vec3::new(14.0, 0.5, 1.3)),
            (Vec3::new(0.0, 0.0, 7.6), Vec3::new(14.0, 0.5, 1.3)),
            (Vec3::new(-12.6, 0.0, 0.0), Vec3::new(1.6, 0.5, 8.0)),
            (Vec3::new(12.6, 0.0, 0.0), Vec3::new(1.6, 0.5, 8.0)),
        ] {
            scene.meshes.push(rs::MeshInstance {
                mesh: rs::MeshKey::rounded_box(h, 0.25),
                transform: Mat4::from_translation(c),
                color: teal,
                emissive: 0.0,
                style: Style::Cel,
                flags: 0,
                group: 11,
                material: 0,
                ext: h,
            });
        }
        for sx in [-1.0f32, 1.0] {
            cyl(scene, Vec3::new(sx * 10.7, 0.5, -5.2), Vec3::new(sx * 11.4, 0.75, -3.6), 0.17, steel, Style::Lit, 0.0, 12);
            cyl(scene, Vec3::new(sx * 10.7, 0.5, 5.2), Vec3::new(sx * 11.4, 0.75, 3.6), 0.17, steel, Style::Lit, 0.0, 12);
        }
    }

    /// The steel tray with the eight instruments, along the bottom of the field.
    fn tray(&self, scene: &mut Scene, f: &SurgeryFrame, time: f32) {
        let steel = lin(150, 158, 170);
        let tray_h = Vec3::new(8.4, 0.12, 0.9);
        scene.meshes.push(rs::MeshInstance {
            mesh: rs::MeshKey::rounded_box(tray_h, 0.1),
            transform: Mat4::from_translation(Vec3::new(-0.5, 0.15, 5.55)),
            color: steel,
            emissive: 0.0,
            style: Style::Lit,
            flags: 0,
            group: 13,
            material: 0,
            ext: tray_h,
        });
        let sel = f.sg.iter().find(|s| s.active && !s.bot).or_else(|| f.sg.iter().find(|s| s.active)).map(|s| s.tool).unwrap_or(0);
        for slot in 1..=8u8 {
            let x = -4.2 + (slot as f32 - 1.0) * 1.16 - 0.5;
            let unlocked = f.unlocked.get(slot as usize - 1).map(|v| *v != 0).unwrap_or(true);
            let lift = if slot == sel { 0.35 + 0.05 * (time * 5.0).sin() } else { 0.0 };
            let base = Vec3::new(x, 0.3 + lift, 5.55);
            let dim = if unlocked { 1.0 } else { 0.25 };
            let kind = tool_kind(slot, f.cryo_slot);
            tool_model(scene, kind, base, Vec3::new(0.0, 0.0, -1.0), dim, 0.0, 0.0, 30 + slot as u32);
            if slot == sel {
                glow(scene, base + Vec3::new(0.0, 0.1, 0.0), 0.12, Vec3::new(1.0, 0.9, 0.5), 1.4);
            }
        }
    }

    fn hazard(&mut self, scene: &mut Scene, f: &SurgeryFrame, h: &HzView, time: f32, pulse: f32) {
        let hidden = h.hidden && h.reveal <= 0.0;
        let p = Vec2::from(h.p);
        let q = Vec2::from(h.q);
        let g = 100 + h.id;
        let kind = NK[h.k as usize];
        let top = 0.36 + 0.12 * pulse;
        if hidden {
            // A faint bump only; scanner pings reveal it.
            if matches!(kind, "nodule") {
                ball(scene, Vec3::new(p.x, 0.32, p.y), 0.28 + 0.05 * (time * 3.0).sin(), lin(120, 70, 130), Style::Cel, 0.1, g);
            }
            return;
        }
        let revealed_ping = h.reveal > 0.0 && h.reveal < 7.2;
        let _ = revealed_ping;
        match kind {
            "line" | "dress" => {
                // Dashed guide ahead of the stroke: emissive dots.
                let n = ((q - p).length() / 0.35).ceil().max(2.0) as i32;
                for i in 0..=n {
                    let t = i as f32 / n as f32;
                    if t < h.prog {
                        continue;
                    }
                    let c = p.lerp(q, t);
                    let on = (i % 2) == 0;
                    if on {
                        let col = if kind == "line" { Vec3::new(1.0, 0.95, 0.7) } else { Vec3::new(0.7, 1.0, 0.9) };
                        glow(scene, Vec3::new(c.x, 0.5, c.y), 0.07, col, 1.8);
                    }
                }
                if kind == "dress" && h.prog > 0.0 {
                    cyl(scene, Vec3::new(p.x, 0.42, p.y), Vec3::new(p.lerp(q, h.prog).x, 0.42, p.lerp(q, h.prog).y), 0.2, lin(230, 232, 236), Style::Cel, 0.0, g);
                }
            }
            "lace" => {
                for (i, t) in h.stitches.iter().enumerate() {
                    let c = p.lerp(q, *t);
                    let d = (q - p).normalize_or(Vec2::X);
                    let perp = Vec2::new(-d.y, d.x) * 0.3;
                    cyl(scene, Vec3::new(c.x - perp.x, 0.45, c.y - perp.y), Vec3::new(c.x + perp.x, 0.45, c.y + perp.y), 0.035, lin(30, 30, 40), Style::Cel, 0.0, g + i as u32);
                }
                // next stitch marker
                let n = h.count.max(1) as f32;
                let t = (h.cnt as f32 + 0.5) / n;
                let c = p.lerp(q, t);
                glow(scene, Vec3::new(c.x, 0.55, c.y), 0.09, Vec3::new(1.0, 0.95, 0.6), 1.5 + (time * 6.0).sin() * 0.5);
            }
            "pool" => {
                let r = h.r * (1.0 - h.prog * 0.7);
                ball(scene, Vec3::new(p.x, 0.28, p.y), r * 0.2, lin(150, 10, 24), Style::Lit, 0.0, g);
            }
            "bleeder" => {
                let s = (time * 12.0).sin() * 0.5 + 0.5;
                cone(scene, Vec3::new(p.x, 0.3, p.y), Vec3::new(p.x, 0.9 + 0.5 * s, p.y), 0.12, 0.03, lin(190, 20, 30), Style::Lit, 0.2, g);
                ball(scene, Vec3::new(p.x, 0.35, p.y), 0.22, lin(150, 10, 20), Style::Lit, 0.0, g + 1);
            }
            "hook" => {
                let a = h.ang + if h.grabbed >= 0 { 0.0 } else { 0.0 };
                let d = Vec3::new(a.cos(), 0.0, a.sin());
                let base = Vec3::new(p.x, 0.32, p.y);
                cyl(scene, base - d * 0.5 + Vec3::Y * 0.02, base + d * 0.5 + Vec3::Y * 0.28, 0.06, lin(190, 196, 206), Style::Lit, 0.0, g);
                ball(scene, base + d * 0.5 + Vec3::Y * 0.28, 0.1, lin(210, 214, 220), Style::Lit, 0.0, g);
                let barb = base - d * 0.5 + Vec3::Y * 0.02;
                cone(scene, barb, barb + Vec3::new(-d.z, 0.0, d.x) * 0.22, 0.05, 0.01, lin(190, 196, 206), Style::Lit, 0.0, g);
            }
            "polyp" => {
                for i in 0..4 {
                    let a = i as f32 * 1.7 + 0.4;
                    let c = Vec3::new(p.x + a.cos() * 0.22, 0.4 + 0.04 * (time * 2.0 + a).sin(), p.y + a.sin() * 0.22);
                    ball(scene, c, 0.22 - i as f32 * 0.03, lin(236, 128, 150), Style::Cel, 0.05, g + i);
                }
                ball(scene, Vec3::new(p.x, 0.62, p.y), 0.26, lin(250, 150, 170), Style::Cel, 0.1, g + 9);
            }
            "tumor" => {
                let r = h.r * if h.si >= 1 { 0.8 } else { 1.0 };
                let col = if h.si >= 2 { lin(120, 60, 100) } else { lin(94, 40, 110) };
                if h.si < 2 {
                    ball(scene, Vec3::new(p.x, 0.5 + 0.1 * pulse, p.y), r * 0.7, col, Style::Cel, 0.1, g);
                    ball(scene, Vec3::new(p.x - r * 0.25, 0.8, p.y - r * 0.2), r * 0.35, lin(130, 70, 140), Style::Cel, 0.1, g);
                } else {
                    ball(scene, Vec3::new(p.x, 0.32, p.y), r * 0.35, lin(180, 60, 70), Style::Cel, 0.1, g);
                }
                if h.si == 0 {
                    let (a, b) = pav_core::games::surgery::Surgery::stroke(&hz_from(h));
                    dashed(scene, a, b, h.prog);
                }
            }
            "burn" => {
                ball(scene, Vec3::new(p.x, 0.3, p.y), h.r * 0.12, lin(40, 20, 16), Style::Cel, 0.0, g);
                if h.prog > 0.0 {
                    ball(scene, Vec3::new(p.x, 0.34, p.y), h.r * 0.22 * h.prog, lin(150, 240, 255), Style::Cel, 0.35, g + 1);
                }
            }
            "bone" => {
                let a = h.ang;
                let d = Vec3::new(a.cos(), 0.0, a.sin());
                let c = Vec3::new(p.x, 0.5, p.y);
                let col = lin(236, 228, 208);
                cyl(scene, c - d * 0.9, c + d * 0.9, 0.22, col, Style::Cel, 0.05, g);
                ball(scene, c - d * 0.9, 0.3, col, Style::Cel, 0.05, g);
                ball(scene, c + d * 0.9, 0.3, col, Style::Cel, 0.05, g);
                if h.si == 0 {
                    // goal outline
                    let q3 = Vec3::new(q.x, 0.38, q.y);
                    let gd = Vec3::new(h.goal.cos(), 0.0, h.goal.sin());
                    for k in 0..9 {
                        let t = k as f32 / 8.0 * 2.0 - 1.0;
                        glow(scene, q3 + gd * t * 0.95, 0.06, Vec3::new(0.6, 1.0, 0.8), 1.6);
                    }
                }
            }
            "nodule" => {
                let tel = h.window > 0.5;
                let sc = 1.0 + 0.1 * (time * 8.0).sin() + if tel { 0.3 } else { 0.0 };
                let r = h.r * 0.55 * sc;
                let c = Vec3::new(p.x, 0.5 + r * 0.5, p.y);
                let shell = h.si == 0;
                ball(scene, c, r, lin(58, 26, 96), Style::Cel, if shell { 0.2 } else { 0.9 }, g);
                ball(scene, c + Vec3::Y * r * 0.2, r * 0.55, lin(150, 80, 255), Style::Unlit, 1.4, g + 1);
                if h.lvl == 3 {
                    for i in 0..3 {
                        let a = i as f32 * 2.094 + time * 0.5;
                        let e = Vec3::new(p.x + a.cos() * 2.0, 0.4, p.y + a.sin() * 1.5);
                        let done = h.si > 0 || h.cnt > i as u8;
                        if !done {
                            cyl(scene, c, e, 0.07, lin(100, 50, 150), Style::Cel, 0.6, g + 2 + i);
                        }
                    }
                }
                if tel {
                    for i in 0..16 {
                        let a = i as f32 / 16.0 * 6.283;
                        glow(scene, Vec3::new(p.x + a.cos() * 1.1, 0.4, p.y + a.sin() * 1.1), 0.05, Vec3::new(0.7, 0.4, 1.0), 1.8);
                    }
                }
            }
            "sac" => {
                let k = (h.grown / h.aux.max(1.0)).clamp(0.0, 1.0);
                let r = 0.3 + 0.5 * k + 0.05 * (time * (6.0 + 12.0 * k)).sin() * k;
                let stem = Vec3::new(p.x, 0.3, p.y);
                cyl(scene, stem, stem + Vec3::Y * 0.5, 0.09, lin(60, 160, 100), Style::Cel, 0.3, g);
                ball(scene, stem + Vec3::Y * (0.6 + r), r, lin(120, 255, 170), Style::Cel, 0.75 + 0.6 * k, g + 1);
                if k > 0.7 {
                    glow(scene, stem + Vec3::Y * (0.6 + r), r * 1.15, Vec3::new(1.0, 0.8, 0.4), 0.3);
                }
            }
            "eye" => {
                let closed = h.aux > 0.5;
                let c = Vec3::new(p.x, 0.5, p.y);
                let open: f32 = if closed { 0.05 } else { 1.0 };
                for i in 0..28 {
                    let a = i as f32 / 28.0 * 6.283;
                    let rr = h.r;
                    glow(scene, c + Vec3::new(a.cos() * rr, 0.0, a.sin() * rr * 0.55 * open.max(0.2)), 0.09, Vec3::new(1.0, 0.82, 0.3), if closed { 0.4 } else { 1.8 });
                }
                if !closed {
                    ball(scene, c + Vec3::Y * 0.15, 0.55, lin(255, 210, 70), Style::Unlit, 1.6, g);
                    ball(scene, c + Vec3::Y * 0.35, 0.22, lin(30, 10, 20), Style::Cel, 0.0, g + 1);
                    let (a, b) = pav_core::games::surgery::Surgery::stroke(&hz_from(h));
                    dashed(scene, a, b, h.prog);
                }
            }
            "ember" => {
                let hot = 1.0 - h.frost;
                let col = if h.si == 0 { lin(255, 110, 40) } else { lin(120, 200, 255) };
                let c = Vec3::new(p.x, 0.55, p.y);
                ball(scene, c, 0.5 + 0.06 * (time * 7.0).sin() * hot, col, Style::Unlit, 1.8 * hot + 0.4, g);
                ball(scene, c, 0.3, if h.si == 0 { lin(255, 220, 120) } else { lin(220, 245, 255) }, Style::Unlit, 2.0, g + 1);
                if h.si == 1 {
                    let (a, b) = pav_core::games::surgery::Surgery::stroke(&hz_from(h));
                    dashed(scene, a, b, h.prog);
                }
            }
            "tendril" => {
                // follow-the-leader chain, swaying
                let n = 14;
                let mut prev = Vec3::new(p.x, 0.4, p.y);
                for i in 0..n {
                    let t = i as f32 / n as f32;
                    let sway = (time * 2.0 + t * 4.0).sin() * 0.25 * t;
                    let c = Vec3::new(p.x + t * 2.8 * h.ang.cos() + sway, 0.45 + t * 0.6, p.y + t * 2.8 * h.ang.sin() + (time * 1.7 + t * 3.0).cos() * 0.2 * t);
                    cone(scene, prev, c, 0.26 * (1.0 - t * 0.6), 0.26 * (1.0 - (t + 1.0 / n as f32) * 0.6), lin(90, 40, 130), Style::Cel, 0.5, g + i);
                    prev = c;
                }
                ball(scene, prev, 0.14, lin(200, 120, 255), Style::Unlit, 1.5, g + 99);
            }
            _ => {}
        }
        // guided target ring
        if f.guided && h.need > 0 && !h.covered {
            ring(scene, Vec3::new(p.x, 0.55, p.y), h.r.max(0.4) + 0.2 + 0.05 * (time * 4.0).sin(), Vec3::new(0.6, 1.0, 0.8));
        }
    }

    fn instrument(&self, scene: &mut Scene, f: &SurgeryFrame, s: &SurgeonView, time: f32) {
        let p = Vec2::from(s.pos);
        let grabbed = f.hz.iter().find(|h| h.grabbed == s.seat as i8);
        let tip = Vec3::new(p.x, 0.5 + 0.18 * (1.0 - s.recoil.min(1.0) * 0.0), p.y);
        let kind = if f.hz.iter().all(|h| NK[h.k as usize] == "dress") && !f.hz.is_empty() { 10 } else { s.kind };
        let dir = Vec3::new(0.55, 0.9, 0.9).normalize();
        let tint = if f.sg.iter().filter(|o| o.active).count() > 1 { Some(seat_color(s.seat)) } else { None };
        let open = if s.held { 0.0 } else { 1.0 };
        tool_model_pose(scene, kind, tip, dir, 1.0, s.recoil, open, time, 60 + s.seat as u32 * 20, tint, s.heat, s.held);
        // cursor ring
        ring(scene, Vec3::new(p.x, 0.42, p.y), 0.32, tint.unwrap_or(Vec3::new(1.0, 1.0, 1.0)));
        if let Some(h) = grabbed {
            let _ = h;
        }
        // tool state: heat ring / dose / flow
        if matches!(kind, 5 | 9) && s.heat > 0.0 {
            let n = (s.heat.min(1.0) * 24.0) as i32;
            for i in 0..n {
                let a = i as f32 / 24.0 * 6.283 - 1.57;
                let ok = s.heat >= 0.8;
                glow(scene, Vec3::new(p.x + a.cos() * 0.6, 0.6, p.y + a.sin() * 0.6), 0.06, if ok { Vec3::new(0.4, 1.0, 0.5) } else { Vec3::new(1.0, 0.6, 0.2) }, 2.0);
            }
        }
        if s.charge > 0.0 {
            let n = ((s.charge / 1.2).min(1.0) * 24.0) as i32;
            for i in 0..n {
                let a = i as f32 / 24.0 * 6.283;
                glow(scene, Vec3::new(a.cos() * 1.6, 0.8, a.sin() * 1.2), 0.08, Vec3::new(0.6, 0.9, 1.0), 2.0);
            }
        }
    }

    fn ghost_hands(&self, scene: &mut Scene, _f: &SurgeryFrame, g: Vec2, time: f32) {
        // Pet's younger hands: a luminous ghost of the last technique.
        let tip = Vec3::new(g.x, 0.6, g.y);
        let dir = Vec3::new(-0.5, 0.9, 0.9).normalize();
        for i in 0..6 {
            let k = i as f32 / 6.0;
            ball(scene, tip + dir * (0.2 + k * 1.2), 0.1 + 0.05 * k, Vec3::new(0.7, 0.9, 1.0), Style::Unlit, 1.2 - k * 0.8, 0x5b0 + i);
        }
        ring(scene, tip, 0.5 + 0.1 * (time * 6.0).sin(), Vec3::new(0.6, 0.9, 1.0));
    }

    fn fx(&mut self, scene: &mut Scene, f: &SurgeryFrame, time: f32, particles: bool) {
        if !particles {
            return;
        }
        let new_fx: Vec<_> = f.fx.iter().filter(|e| e.id > self.last_fx).cloned().collect();
        if let Some(last) = f.fx.last() {
            self.last_fx = last.id;
        } else if f.t < 0.5 {
            self.last_fx = 0;
        }
        for e in new_fx {
            let pos = Vec3::new(e.pos.x, 0.6, e.pos.y);
            let blood = (Vec4::new(0.7, 0.03, 0.06, 0.9), Vec4::new(0.4, 0.0, 0.03, 0.0));
            match e.kind {
                1 | 2 => scene.particles.push(burst(pos, 4, blood.0, blood.1, false, |b| {
                    b.vel = Vec3::new(0.0, 1.4, 0.0);
                    b.gravity = 6.0;
                    b.life = (0.3, 0.6);
                    b.size = (0.06, 0.02);
                })),
                3 | 4 | 5 => scene.particles.push(burst(pos, 26, Vec4::new(1.0, 0.7, 0.4, 1.0), Vec4::new(1.0, 0.2, 0.1, 0.0), true, |b| {
                    b.vel = Vec3::new(0.0, 2.0, 0.0);
                    b.spread = 3.5;
                    b.size = (0.12, 0.0);
                })),
                6 => {
                    scene.particles.push(burst(Vec3::new(0.0, 0.8, 0.0), 80, Vec4::new(0.8, 0.9, 1.0, 1.0), Vec4::new(0.3, 0.5, 1.0, 0.0), true, |b| {
                        b.spread = 9.0;
                        b.size = (0.14, 0.0);
                        b.life = (0.3, 0.7);
                    }));
                    self.shock.push((Vec3::new(0.0, 0.6, 0.0), time));
                }
                7 => scene.particles.push(burst(pos, 5, Vec4::new(1.0, 1.0, 1.0, 0.8), Vec4::new(0.8, 0.8, 0.9, 0.0), false, |b| {
                    b.spread = 1.0;
                    b.size = (0.04, 0.0);
                })),
                8 => scene.particles.push(burst(pos, 3, blood.0, blood.1, false, |b| {
                    b.vel = Vec3::new(0.0, 0.5, 0.0);
                    b.gravity = 2.0;
                    b.spread = 0.8;
                })),
                9 => scene.particles.push(burst(pos, 6, Vec4::new(0.7, 0.95, 1.0, 1.0), Vec4::new(0.9, 1.0, 1.0, 0.0), true, |b| {
                    b.spread = 1.2;
                    b.size = (0.06, 0.0);
                })),
                10 => scene.particles.push(burst(pos, 5, Vec4::new(1.0, 0.5, 0.2, 1.0), Vec4::new(1.0, 0.2, 0.0, 0.0), true, |b| {
                    b.spread = 2.5;
                    b.vel = Vec3::new(0.0, 1.0, 0.0);
                    b.stretch = true;
                })),
                11 => scene.particles.push(burst(pos, 4, Vec4::new(0.6, 1.0, 0.9, 0.9), Vec4::new(0.3, 0.8, 0.8, 0.0), false, |b| {
                    b.gravity = 3.0;
                    b.spread = 1.0;
                })),
                12 => scene.distortions.push(rs::Distortion { pos, radius: 2.6, strength: 0.15, kind: rs::DistortKind::Ring, progress: 0.4 }),
                13 => {
                    scene.particles.push(burst(Vec3::new(0.0, 0.8, 0.0), 120, Vec4::new(0.8, 0.9, 1.0, 1.0), Vec4::new(0.5, 0.4, 1.0, 0.0), true, |b| {
                        b.spread = 7.0;
                        b.life = (0.5, 1.2);
                        b.size = (0.1, 0.0);
                        b.turbulence = 2.0;
                    }));
                    self.shock.push((Vec3::new(0.0, 0.6, 0.0), time));
                }
                14 => scene.particles.push(burst(pos, 8, blood.0, blood.1, false, |b| {
                    b.vel = Vec3::new(0.0, 3.0, 0.0);
                    b.gravity = 9.0;
                    b.spread = 1.0;
                    b.life = (0.4, 0.8);
                })),
                15 => scene.distortions.push(rs::Distortion { pos, radius: 1.4, strength: 0.18, kind: rs::DistortKind::Ripple, progress: 0.3 }),
                16 => scene.particles.push(burst(pos, 40, Vec4::new(0.5, 1.0, 0.6, 1.0), Vec4::new(0.8, 0.5, 0.2, 0.0), true, |b| {
                    b.spread = 5.0;
                    b.size = (0.14, 0.0);
                    b.vel = Vec3::new(0.0, 2.0, 0.0);
                })),
                17 => scene.distortions.push(rs::Distortion { pos, radius: 1.6, strength: 0.2, kind: rs::DistortKind::Ring, progress: 0.2 }),
                _ => {}
            }
        }
        self.shock.retain(|s| time - s.1 < 0.7 && time >= s.1);
        for &(pos, start) in &self.shock {
            scene.distortions.push(rs::Distortion { pos, radius: 12.0, strength: 0.3, kind: rs::DistortKind::Ring, progress: ((time - start) / 0.7).clamp(0.0, 1.0) });
        }
        // Rain-streaked ambience: sparse dust motes in the lamp light.
        if (time * 4.0).fract() < 0.05 {
            scene.particles.push(burst(Vec3::new(0.0, 4.0, 0.0), 2, Vec4::new(1.0, 0.95, 0.8, 0.25), Vec4::new(1.0, 0.95, 0.8, 0.0), true, |b| {
                b.area = Vec3::new(9.0, 2.0, 5.0);
                b.spread = 0.1;
                b.life = (2.0, 4.0);
                b.size = (0.03, 0.02);
            }));
        }
        let _ = cue::PICK;
    }
}

fn hz_from(h: &HzView) -> pav_core::games::surgery::data::Hz {
    use pav_core::games::surgery::data::{Hz, Kind};
    let kinds = [
        Kind::Line,
        Kind::Lace,
        Kind::Pool,
        Kind::Bleeder,
        Kind::Hook,
        Kind::Polyp,
        Kind::Tumor,
        Kind::Burn,
        Kind::Bone,
        Kind::Nodule,
        Kind::Sac,
        Kind::Eye,
        Kind::Ember,
        Kind::Tendril,
        Kind::Dress,
    ];
    let mut z = Hz::new(h.id, kinds[h.k as usize], Vec2::from(h.p));
    z.q = Vec2::from(h.q);
    z.r = h.r;
    z.cnt = h.cnt;
    z.prog = h.prog;
    z
}

fn dashed(scene: &mut Scene, a: Vec2, b: Vec2, prog: f32) {
    let n = ((b - a).length() / 0.3).ceil().max(2.0) as i32;
    for i in 0..=n {
        let t = i as f32 / n as f32;
        if t < prog || i % 2 == 1 {
            continue;
        }
        let c = a.lerp(b, t);
        glow(scene, Vec3::new(c.x, 0.62, c.y), 0.07, Vec3::new(1.0, 0.95, 0.7), 1.8);
    }
}

fn ring(scene: &mut Scene, c: Vec3, r: f32, col: Vec3) {
    let n = 20;
    for i in 0..n {
        let a0 = i as f32 / n as f32 * std::f32::consts::TAU;
        let a1 = (i as f32 + 0.6) / n as f32 * std::f32::consts::TAU;
        let p0 = c + Vec3::new(a0.cos() * r, 0.0, a0.sin() * r);
        let p1 = c + Vec3::new(a1.cos() * r, 0.0, a1.sin() * r);
        scene.sdfs.push(SdfInstance {
            a: p0,
            b: p1,
            ra: 0.03,
            rb: 0.03,
            color: col,
            emissive: 1.6,
            style: Style::Unlit,
            flags: rs::flags::NO_SHADOW | rs::flags::NO_CUT,
            group: 0x5a3,
            material: 0,
        });
    }
}

fn tool_kind(slot: u8, cryo_slot: u8) -> u8 {
    if cryo_slot == slot { 9 } else { slot }
}

fn tool_model(scene: &mut Scene, kind: u8, tip: Vec3, dir_flat: Vec3, dim: f32, recoil: f32, open: f32, group: u32) {
    // Tray pose: lying flat, tip toward -Z.
    let dir = (Vec3::new(0.0, 0.2, 1.0)).normalize() * 1.5;
    let _ = dir_flat;
    tool_model_pose(scene, kind, tip, dir, dim, recoil, open, 0.0, group, None, 0.0, false);
}

/// One instrument built from SDF rounded cones, tip at `tip`, handle extending along `dir`.
#[allow(clippy::too_many_arguments)]
fn tool_model_pose(scene: &mut Scene, kind: u8, tip: Vec3, dir: Vec3, dim: f32, recoil: f32, open: f32, time: f32, group: u32, tint: Option<Vec3>, heat: f32, held: bool) {
    let steel = lin(196, 204, 214) * dim;
    let dark = lin(50, 56, 66) * dim;
    let acc = tint.unwrap_or(lin(90, 190, 200)) * dim;
    let side = Vec3::new(dir.z, 0.0, -dir.x).normalize_or(Vec3::X);
    let tipc = tip + dir * (recoil * 0.12);
    match kind {
        1 => {
            // Scalpel: slim blade + handle.
            cone(scene, tipc, tipc + dir * 0.55, 0.01, 0.07, steel, Style::Lit, 0.0, group);
            cone(scene, tipc + dir * 0.5, tipc + dir * 2.4, 0.09, 0.1, dark, Style::Lit, 0.0, group + 1);
            ball(scene, tipc + dir * 2.4, 0.1, acc, Style::Lit, 0.0, group + 2);
        }
        2 => {
            // Forceps: two tines that close.
            let gap = 0.12 + 0.18 * open;
            for sgn in [-1.0f32, 1.0] {
                cone(scene, tipc + side * sgn * 0.02, tipc + dir * 1.2 + side * sgn * gap, 0.025, 0.05, steel, Style::Lit, 0.0, group);
            }
            cone(scene, tipc + dir * 1.15, tipc + dir * 2.3, 0.1, 0.12, dark, Style::Lit, 0.0, group + 1);
        }
        3 => {
            // Suture: curved needle and thread.
            let c = tipc + dir * 0.35;
            for i in 0..6 {
                let a = i as f32 / 6.0 * 2.2 - 0.4;
                let p = c + side * a.sin() * 0.35 + Vec3::Y * (1.0 - a.cos()) * 0.35 * 0.0 + dir * (a.cos() - 1.0) * 0.35;
                ball(scene, p, 0.025, steel, Style::Lit, 0.0, group);
            }
            cone(scene, tipc + dir * 0.6, tipc + dir * 2.3, 0.07, 0.1, dark, Style::Lit, 0.0, group + 1);
            cyl(scene, c + side * 0.3, c + dir * 1.8 + side * 0.6, 0.012, lin(230, 230, 220) * dim, Style::Cel, 0.0, group + 2);
        }
        4 => {
            // Suction: a wide flared tube that shudders when held.
            let sh = if held { (time * 60.0).sin() * 0.02 } else { 0.0 };
            cone(scene, tipc + side * sh, tipc + dir * 0.7, 0.2, 0.12, steel, Style::Lit, 0.0, group);
            cyl(scene, tipc + dir * 0.7, tipc + dir * 2.6, 0.1, lin(120, 150, 170) * dim, Style::Lit, 0.0, group + 1);
        }
        5 => {
            // Laser: pen with a glowing tip.
            let g = 0.6 + heat * 2.0;
            cone(scene, tipc, tipc + dir * 0.5, 0.015, 0.07, dark, Style::Lit, 0.0, group);
            glow(scene, tipc, 0.07 + heat * 0.08, Vec3::new(1.0, 0.25, 0.2), g);
            cone(scene, tipc + dir * 0.5, tipc + dir * 2.3, 0.1, 0.1, steel, Style::Lit, 0.0, group + 1);
            ball(scene, tipc + dir * 1.3, 0.12, acc, Style::Lit, 0.0, group + 2);
        }
        6 => {
            // Gel: a squeeze-tube.
            cone(scene, tipc, tipc + dir * 0.4, 0.03, 0.1, steel, Style::Lit, 0.0, group);
            cone(scene, tipc + dir * 0.4, tipc + dir * 1.9, 0.16, 0.22, lin(150, 230, 230) * dim, Style::Lit, 0.2, group + 1);
            cone(scene, tipc + dir * 1.9, tipc + dir * 2.3, 0.22, 0.05, steel, Style::Lit, 0.0, group + 2);
        }
        7 => {
            // Scanner: a wand with a disc.
            cyl(scene, tipc + dir * 0.1, tipc + dir * 0.18, 0.28, acc, Style::Lit, 0.4, group);
            cone(scene, tipc + dir * 0.2, tipc + dir * 2.3, 0.1, 0.12, dark, Style::Lit, 0.0, group + 1);
        }
        8 => {
            // IV push: a syringe.
            cone(scene, tipc, tipc + dir * 0.4, 0.01, 0.06, steel, Style::Lit, 0.0, group);
            cyl(scene, tipc + dir * 0.4, tipc + dir * 1.8, 0.15, lin(220, 235, 245) * dim, Style::Lit, 0.1, group + 1);
            cyl(scene, tipc + dir * 1.8, tipc + dir * 2.4, 0.04, steel, Style::Lit, 0.0, group + 2);
            ball(scene, tipc + dir * 2.4, 0.12, steel, Style::Lit, 0.0, group + 3);
        }
        9 => {
            // Cryoprobe: a frosty rod.
            cone(scene, tipc, tipc + dir * 0.9, 0.05, 0.11, lin(190, 235, 255) * dim, Style::Lit, 0.8, group);
            cone(scene, tipc + dir * 0.9, tipc + dir * 2.4, 0.12, 0.12, dark, Style::Lit, 0.0, group + 1);
        }
        _ => {
            // Dressing: a roll.
            cyl(scene, tipc + side * 0.3 + Vec3::Y * 0.1, tipc - side * 0.3 + Vec3::Y * 0.1, 0.22, lin(240, 240, 244) * dim, Style::Cel, 0.0, group);
            cone(scene, tipc + dir * 0.4, tipc + dir * 2.2, 0.06, 0.08, dark, Style::Lit, 0.0, group + 1);
        }
    }
}
