//! Draws the surgery game from `SurgeryFrame`: the field, the instruments, the tray, the parasites,
//! the paper theatre. Everything here is called at the end of `ViewBuilder::build`, so the game's
//! lighting and post settings win over `ViewSettings`.

pub mod fx;
pub mod instruments;
pub mod paper;
pub mod plate;
pub mod strains;

use glam::{Quat, Vec2, Vec3};
use pav_core::frame::SimEvent;
use pav_core::games::surgery::field::{GHOST_TRAVEL, Tool};
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_core::games::surgery::surgeon::tray_x;
use pav_render::scene::{
    DistortKind, Distortion, DynamicMesh, MeshInstance, MeshKey, Part, PointLight, Scene, Style, Transition, flags, srgb,
};

use crate::camera::CameraRig;

/// Seat colours, in linear light.
pub fn seat_color(slot: usize) -> Vec3 {
    let c: [(u8, u8, u8); 4] = [(232, 68, 58), (59, 130, 246), (34, 197, 94), (245, 183, 0)];
    let (r, g, b) = c[slot.min(3)];
    srgb(r, g, b)
}

/// Puts the game's camera shot on the engine's rig.
pub fn apply_shot(rig: &mut CameraRig, shot: &pav_core::games::surgery::frame::CameraShot) {
    let p = &mut rig.params;
    p.tilt = shot.tilt;
    p.yaw = shot.yaw;
    p.distance = shot.distance;
    p.fov = shot.fov;
    p.ortho = false;
    p.follow_lag = 0.0;
    p.height_offset = 0.0;
    rig.snap(Vec3::from(shot.target));
}

/// What the player's settings and the app's local state say about drawing.
#[derive(Clone, Copy, Debug)]
pub struct Local {
    /// This device's cursor right now, per slot, ahead of the tick.
    pub aim: [Option<Vec2>; 4],
    pub clinical: bool,
    pub shake: bool,
    pub reduce_flashes: bool,
    /// A full-screen fade: 0 clear .. 1 covered.
    pub fade: f32,
    /// The tray place under the pointer.
    pub hover_tray: Option<usize>,
    /// Drawing paused (hub server, or not at all).
    pub skip: bool,
}

impl Default for Local {
    fn default() -> Self {
        Self { aim: [None; 4], clinical: false, shake: true, reduce_flashes: false, fade: 0.0, hover_tray: None, skip: false }
    }
}

#[derive(Default)]
pub struct SurgeryView {
    pub plate: plate::PlateView,
    pub paper: paper::PaperView,
    pub local: Local,
    pending: Vec<pav_render::scene::ParticleBurst>,
    ripples: Vec<(Vec3, f32, DistortKind, f32)>,
    last_beats: u32,
    carry: f32,
    last_time: f32,
    /// Seconds the current flash has left (defib, for the white-out).
    flash: f32,
}

impl SurgeryView {
    /// Cues become particles and distortions.
    pub fn add_events(&mut self, events: &[SimEvent]) {
        use pav_core::games::surgery::cue;
        for e in events {
            if let SimEvent::Cue { id, pos, .. } = e {
                fx::cue_bursts(*id, *pos, &mut self.pending);
                match *id {
                    cue::GIFT_FIRE => self.ripples.push((*pos + Vec3::Y, 7.0, DistortKind::Ripple, 0.0)),
                    cue::DEFIB_THUMP => {
                        self.ripples.push((Vec3::new(0.0, 0.5, 0.0), 11.0, DistortKind::Ring, 0.0));
                        self.flash = 1.0;
                    }
                    cue::PING => self.ripples.push((*pos + Vec3::Y * 0.2, 3.2, DistortKind::Ripple, 0.0)),
                    cue::BURST => self.ripples.push((*pos + Vec3::Y * 0.4, 2.0, DistortKind::Ring, 0.0)),
                    _ => {}
                }
            }
        }
    }

    /// Adds this frame's game to the scene.
    pub fn emit(&mut self, scene: &mut Scene, f: &SurgeryFrame, rig: &CameraRig, aspect: f32, wall: f32) {
        let time = f.clock;
        let dt = (wall - self.last_time).clamp(0.0, 0.1);
        self.last_time = wall;
        scene.particles.append(&mut self.pending);
        self.flash = (self.flash - dt * 2.5).max(0.0);
        for r in &mut self.ripples {
            r.3 += dt / 0.7;
        }
        self.ripples.retain(|r| r.3 < 1.0);
        for r in &self.ripples {
            scene.distortions.push(Distortion { pos: r.0, radius: r.1, strength: 0.25, kind: r.2, progress: r.3 });
        }

        if let (Stage::Story, Some(story)) = (f.stage, &f.story) {
            if story.camera_or {
                self.or_wide(scene);
            } else {
                // A little camera drift: real parallax between the layers.
                let mut r = rig.clone();
                r.params.yaw = (wall * 0.27).sin() * 0.7;
                r.params.tilt = (wall * 0.19).sin() * 0.25;
                scene.camera = r.data(aspect);
                self.paper.emit(scene, story, wall, dt, f.beat);
                if story.shake > 0.0 && self.local.shake {
                    let mut r2 = r.clone();
                    r2.target += Vec3::new((wall * 41.0).sin(), (wall * 37.0).cos(), 0.0) * story.shake * 0.12;
                    scene.camera = r2.data(aspect);
                }
            }
            self.finish(scene, f);
            return;
        }

        // The field.
        let sun = Vec3::new(-0.25, -1.0, -0.35).normalize();
        scene.sun.direction = sun;
        scene.sun.color = Vec3::new(1.0, 0.97, 0.9) * 0.42;
        scene.sun.shadows = true;
        scene.sun.shadow_center = Vec3::ZERO;
        scene.sun.shadow_radius = 16.0;
        scene.ambient.sky = Vec3::new(0.42, 0.42, 0.46);
        scene.ambient.ground = Vec3::new(0.26, 0.19, 0.19);
        scene.point_lights.push(PointLight {
            position: Vec3::new(-1.0, 7.0, -1.0),
            color: Vec3::new(1.0, 0.97, 0.9) * 0.62,
            radius: 16.0,
            shadows: true,
        });
        scene.style.cel_bands = 3.0;
        scene.style.rim = 0.12;
        scene.post.outlines = true;
        scene.post.outline_darken = 0.45;
        scene.post.outline_px = 1.0;
        scene.post.bloom = 0.35;
        scene.post.bloom_threshold = 1.15;
        scene.post.gi = 0.6;
        scene.filter.vignette = 0.35;
        scene.clear_color = srgb(16, 40, 44);

        // Shake and punch.
        if f.shake > 0.0 && self.local.shake {
            let mut r = rig.clone();
            let k = f.shake * f.shake * 0.28;
            r.target += Vec3::new((wall * 47.0).sin(), 0.0, (wall * 39.0).cos()) * k;
            scene.camera = r.data(aspect);
        }

        let opts = plate::PlateOpts { clinical: self.local.clinical };
        if let Some(data) = self.plate.build(f, time, opts) {
            scene.dynamic.push(DynamicMesh {
                data,
                color: Vec3::ONE,
                emissive: 0.0,
                style: Style::Cel,
                flags: 0,
                group: 1,
                material: 0,
            });
        }
        retractors(scene);
        if !f.hazards.is_empty() || !f.stains.is_empty() {
            strains::emit(scene, f, &self.plate, time);
        }
        let in_op = matches!(
            f.stage,
            Stage::Op | Stage::OpStart | Stage::Code | Stage::Complete | Stage::Results | Stage::Chart | Stage::Dead
        );
        if in_op {
            self.tray(scene, f, wall);
        }
        if matches!(f.stage, Stage::Op | Stage::OpStart | Stage::Code | Stage::Complete) {
            self.hands(scene, f, wall);
        }
        fx::continuous(scene, f, &self.plate, time, dt, &mut self.last_beats, &mut self.carry);

        // Gift and crisis looks.
        let hush = f.hush.clamp(0.0, 1.0);
        if hush > 0.0 {
            scene.filter.grade_part = Part::Objects;
            scene.filter.saturation = 1.0 - hush * 0.9;
            scene.filter.vignette = 0.35 + hush * 0.35;
            scene.point_lights.push(PointLight {
                position: Vec3::new(0.0, 5.0, 0.0),
                color: Vec3::new(0.7, 0.75, 1.0) * hush * 0.5,
                radius: 14.0,
                shadows: false,
            });
        }
        if matches!(f.stage, Stage::Op | Stage::Code) {
            let crisis = (1.0 - f.vitals / 30.0).clamp(0.0, 1.0);
            if crisis > 0.0 {
                let beat = if self.local.reduce_flashes { 0.5 } else { plate::beat_env(f.beat).min(1.0) };
                scene.filter.chroma += crisis * (0.0015 + beat * 0.002);
                scene.filter.vignette += crisis * 0.2 * (0.6 + 0.4 * beat);
            }
        }
        if f.stage == Stage::Code {
            scene.filter.saturation *= 0.45;
        }
        if f.plate_blend < 1.0 && !self.local.reduce_flashes {
            // The iris closes on the incision, and opens on the next layer down.
            let k = (f.plate_blend * std::f32::consts::PI).sin();
            scene.filter.transition = k * 0.5;
            scene.filter.transition_kind = Transition::Iris;
            scene.filter.transition_center =
                crate::build::screen_uv(&scene.camera, Vec3::new(f.plate_from.x, 0.4, f.plate_from.y));
        }
        self.finish(scene, f);
    }

    /// The 3D wide shot: the engine draws the level; this only lights it.
    fn or_wide(&self, scene: &mut Scene) {
        scene.sun.direction = Vec3::new(-0.3, -1.0, -0.2).normalize();
        scene.sun.color = Vec3::new(1.0, 0.98, 0.92) * 0.5;
        scene.sun.shadow_center = Vec3::new(94.0, 0.0, -3.0);
        scene.sun.shadow_radius = 16.0;
        scene.ambient.sky = Vec3::new(0.46, 0.56, 0.58);
        scene.ambient.ground = Vec3::new(0.28, 0.32, 0.32);
        scene.point_lights.push(PointLight {
            position: Vec3::new(94.0, 3.6, -3.2),
            color: Vec3::new(1.0, 0.98, 0.9) * 1.1,
            radius: 10.0,
            shadows: true,
        });
        scene.clear_color = srgb(16, 40, 44);
        scene.style.cel_bands = 3.0;
        scene.post.outline_darken = 0.4;
        scene.post.bloom = 0.4;
        scene.post.gi = 0.5;
        scene.filter.vignette = 0.45;
        scene.post.halos = 0.4;
    }

    fn finish(&mut self, scene: &mut Scene, f: &SurgeryFrame) {
        let fade = self.local.fade.clamp(0.0, 1.0);
        if fade > scene.filter.transition {
            scene.filter.transition = fade;
            scene.filter.transition_kind = Transition::Fade;
        }
        if f.stage == Stage::Dead {
            scene.filter.transition = 1.0;
            scene.filter.transition_kind = Transition::Fade;
        }
    }

    fn hands(&mut self, scene: &mut Scene, f: &SurgeryFrame, wall: f32) {
        for s in &f.surgeons {
            if !s.present {
                continue;
            }
            let slot = s.slot as usize;
            let seat = seat_color(slot);
            // This device's cursor is ahead of the tick; the sim's rail and tremor stay on it.
            let mut at = s.cursor;
            if let Some(l) = self.local.aim[slot] {
                at += l - s.raw;
            }
            let ground = self.plate.height_at(at);
            let pose = instruments::Pose {
                using: s.using,
                amount: match s.tool {
                    Tool::Iv => s.dose,
                    Tool::Gel => 1.0 - s.flow,
                    Tool::Defib => s.charge,
                    _ => 0.0,
                },
                time: wall,
                seat,
                glow: 0.0,
                group: 0x900 + slot as u32,
                ghost: false,
            };
            let lean = Vec3::new(0.3, 1.0, 0.62).normalize();
            let side = Vec3::new(1.0, 0.0, -0.3).normalize();
            let recoil = s.kick * s.kick * 0.5;
            let hover = if s.using { 0.03 } else { 0.42 + (wall * 2.1).sin() * 0.03 };
            // The IV goes to its port; the paddles to the field's middle.
            let (tip, axis, sd) = match s.tool {
                Tool::Iv => {
                    let d = Vec3::new(-0.5, 0.6, -0.3).normalize();
                    (Vec3::new(8.3, 0.6, 3.9), d, Vec3::new(0.6, 0.0, -1.0).normalize())
                }
                Tool::Defib => (Vec3::new(0.0, 1.2 - s.charge * 0.5 + recoil, 0.3), lean, side),
                _ => (Vec3::new(at.x, ground + hover + recoil, at.y), lean, side),
            };
            instruments::model(&mut scene.sdfs, s.tool, tip, axis, sd, 1.15, &pose);
            // The laser's beam.
            if s.tool == Tool::Laser && s.using {
                scene.sdfs.push(pav_render::SdfInstance {
                    a: tip,
                    b: Vec3::new(at.x, ground, at.y),
                    ra: 0.022,
                    rb: 0.035,
                    color: Vec3::new(1.0, 0.25, 0.15),
                    emissive: 2.2,
                    style: Style::Unlit,
                    flags: flags::NO_SHADOW | flags::OBJECT,
                    group: 0,
                    material: 0,
                });
            }
        }
        // The Echo's ghost hands.
        for g in &f.ghosts {
            let k = (g.t / GHOST_TRAVEL).clamp(0.0, 1.0);
            let to = f.hazards.iter().find(|h| h.id == g.target).map(|h| h.touch_point()).unwrap_or(g.from);
            let at = g.from.lerp(to, k * k * (3.0 - 2.0 * k));
            let pose = instruments::Pose {
                using: k > 0.7,
                time: wall,
                seat: Vec3::ONE,
                group: 0xA00,
                ghost: true,
                ..Default::default()
            };
            let tip = Vec3::new(at.x, self.plate.height_at(at) + 0.2, at.y);
            instruments::model(
                &mut scene.sdfs,
                g.tool,
                tip,
                Vec3::new(-0.3, 1.0, 0.62).normalize(),
                Vec3::new(1.0, 0.0, 0.3).normalize(),
                1.15,
                &pose,
            );
        }
    }

    /// The steel tray in the scene: the selected instrument lifts and glows.
    fn tray(&mut self, scene: &mut Scene, f: &SurgeryFrame, wall: f32) {
        let steel = Vec3::new(0.17, 0.2, 0.23);
        let half = Vec3::new(8.25, 0.1, 0.72);
        let at = Vec3::new(0.0, 0.92, 5.42);
        scene.meshes.push(MeshInstance {
            mesh: MeshKey::rounded_box(half, 0.08),
            transform: glam::Mat4::from_scale_rotation_translation(Vec3::ONE, Quat::IDENTITY, at),
            color: steel,
            emissive: 0.0,
            style: Style::Lit,
            flags: flags::OBJECT | flags::NO_CUT,
            group: 0x880,
            material: 0,
            ext: half,
        });
        let local = f.surgeons.first();
        let selected = local.map(|s| s.tool);
        for (i, tool) in f.ring.iter().enumerate() {
            let x = tray_x(i);
            let sel = selected == Some(*tool);
            let hover = self.local.hover_tray == Some(i);
            let lift = if sel {
                0.34 + (wall * 3.0).sin() * 0.02
            } else if hover {
                0.16
            } else {
                0.0
            };
            let glow = if sel { 1.0 } else { 0.0 };
            let mut pose = instruments::Pose {
                using: false,
                time: wall,
                seat: seat_color(0),
                glow,
                group: 0x800 + i as u32,
                ..Default::default()
            };
            if let Some(s) = local {
                match tool {
                    Tool::Gel => pose.amount = 1.0 - s.flow,
                    Tool::Iv => pose.amount = (s.iv_cool / 4.0).clamp(0.0, 1.0),
                    _ => {}
                }
            }
            // Pointing up the screen: tip away from the viewer.
            let tip = Vec3::new(x, 1.14 + lift, 4.86);
            instruments::model(&mut scene.sdfs, *tool, tip, Vec3::new(0.0, 0.05, 1.0).normalize(), Vec3::X, 0.56, &pose);
            if sel {
                scene.point_lights.push(PointLight {
                    position: tip + Vec3::new(0.0, 0.8, 0.5),
                    color: Vec3::new(1.0, 0.95, 0.75) * 0.5,
                    radius: 2.0,
                    shadows: false,
                });
            }
        }
    }
}

fn retractors(scene: &mut Scene) {
    let steel = Vec3::new(0.62, 0.66, 0.7);
    for (a, b) in [
        (Vec3::new(-9.5, 0.55, -5.1), Vec3::new(-8.0, 0.3, -4.5)),
        (Vec3::new(9.5, 0.55, -5.1), Vec3::new(8.0, 0.3, -4.5)),
        (Vec3::new(-9.9, 0.55, 3.7), Vec3::new(-8.8, 0.25, 3.2)),
        (Vec3::new(9.9, 0.55, 3.7), Vec3::new(9.3, 0.3, 3.3)),
    ] {
        scene.sdfs.push(pav_render::SdfInstance {
            a,
            b,
            ra: 0.13,
            rb: 0.08,
            color: steel,
            emissive: 0.0,
            style: Style::Lit,
            flags: flags::OBJECT,
            group: 0x8F0,
            material: 0,
        });
    }
    // The IV port, on its stand at the corner of the field.
    scene.sdfs.push(pav_render::SdfInstance {
        a: Vec3::new(8.6, 0.55, 3.75),
        b: Vec3::new(8.1, 0.55, 4.05),
        ra: 0.13,
        rb: 0.13,
        color: Vec3::new(0.86, 0.9, 0.96),
        emissive: 0.0,
        style: Style::Lit,
        flags: flags::OBJECT,
        group: 0x8F1,
        material: 0,
    });
}
