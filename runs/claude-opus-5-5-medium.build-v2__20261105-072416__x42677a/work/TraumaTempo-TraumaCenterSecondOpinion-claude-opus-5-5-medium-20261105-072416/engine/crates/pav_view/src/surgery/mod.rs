//! Draws the surgery game: the operative field, instruments, strains, the paper theatre and their
//! effects, all from one `SurgeryFrame`.

pub mod instruments;
pub mod paper;
pub mod plate;
pub mod strains;

use glam::{Mat4, Vec2, Vec3, Vec4};
use pav_core::SimEvent;
use pav_core::games::surgery::content::content;
use pav_core::games::surgery::cue;
use pav_core::games::surgery::field::{Kind, Tool, iv_port, tray_slot};
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_render::scene::{self as rs, DistortKind, Distortion, ParticleBurst, PointLight, Scene, SdfInstance, Style, Transition};

use self::instruments::Motion;

/// Player settings the picture follows.
#[derive(Clone, Copy, Debug, Default)]
pub struct Looks {
    pub clinical: bool,
    pub reduce_flashes: bool,
    /// Screen shake on (the setting).
    pub no_shake: bool,
    /// Skip drawing altogether: a hub server.
    pub headless: bool,
}

#[derive(Default)]
pub struct SurgeryView {
    pub plate: plate::PlateView,
    pub paper: paper::PaperView,
    pub looks: Looks,
    /// The local player's cursor this render frame: drawn with zero lag.
    pub local_cursor: Option<(usize, Vec2)>,
    pending: Vec<ParticleBurst>,
    rain_carry: f32,
    fx_carry: f32,
    defib_shock: f32,
    last_time: f32,
}

pub const SEAT_COLORS: [[u8; 3]; 4] = [[0xe8, 0x44, 0x3a], [0x3b, 0x82, 0xf6], [0x22, 0xc5, 0x5e], [0xf5, 0xb7, 0x00]];

fn seat(i: usize) -> Vec3 {
    let c = SEAT_COLORS[i % 4];
    rs::srgb(c[0], c[1], c[2])
}

impl SurgeryView {
    /// Particles for cues: blood, smoke, sparks, gel, frost.
    pub fn add_events(&mut self, events: &[SimEvent]) {
        for e in events {
            let SimEvent::Cue { id, pos, gain, .. } = e else { continue };
            let b = ParticleBurst::default();
            let pos = *pos;
            let (count, burst) = match *id {
                cue::SLICE | cue::TEAR | cue::SQUISH => (
                    10,
                    ParticleBurst {
                        vel: Vec3::new(0.0, 2.4, 0.0),
                        spread: 1.3,
                        gravity: 9.0,
                        life: (0.25, 0.55),
                        size: (0.05, 0.02),
                        color0: Vec4::new(0.45, 0.02, 0.04, 1.0),
                        color1: Vec4::new(0.3, 0.01, 0.02, 0.9),
                        additive: false,
                        floor: Some(0.3),
                        ..b
                    },
                ),
                cue::BURST => (
                    46,
                    ParticleBurst {
                        vel: Vec3::new(0.0, 3.4, 0.0),
                        spread: 3.0,
                        gravity: 9.0,
                        life: (0.4, 0.9),
                        size: (0.09, 0.03),
                        color0: Vec4::new(0.4, 0.75, 0.2, 1.0),
                        color1: Vec4::new(0.2, 0.4, 0.1, 0.8),
                        additive: false,
                        floor: Some(0.3),
                        ..b
                    },
                ),
                cue::SIZZLE | cue::LASER => (
                    6,
                    ParticleBurst {
                        vel: Vec3::new(0.0, 1.5, 0.0),
                        spread: 0.5,
                        gravity: -0.5,
                        drag: 1.2,
                        life: (0.6, 1.2),
                        size: (0.08, 0.35),
                        color0: Vec4::new(0.55, 0.55, 0.58, 0.5),
                        color1: Vec4::new(0.7, 0.7, 0.75, 0.0),
                        additive: false,
                        turbulence: 1.2,
                        ..b
                    },
                ),
                cue::GEL => (
                    8,
                    ParticleBurst {
                        vel: Vec3::new(0.0, 1.4, 0.0),
                        spread: 0.8,
                        gravity: 8.0,
                        life: (0.2, 0.45),
                        size: (0.06, 0.03),
                        color0: Vec4::new(0.55, 0.95, 0.8, 1.0),
                        color1: Vec4::new(0.55, 0.95, 0.8, 0.6),
                        additive: false,
                        floor: Some(0.3),
                        ..b
                    },
                ),
                cue::FROST | cue::CRACK => (
                    12,
                    ParticleBurst {
                        vel: Vec3::new(0.0, 0.9, 0.0),
                        spread: 1.2,
                        gravity: 1.0,
                        drag: 1.0,
                        life: (0.5, 1.1),
                        size: (0.06, 0.01),
                        color0: Vec4::new(1.4, 1.9, 2.4, 0.9),
                        color1: Vec4::new(0.8, 1.2, 1.8, 0.0),
                        additive: true,
                        ..b
                    },
                ),
                cue::RATE_IMMACULATE | cue::ON_BEAT | cue::CHAIN_UP => (
                    14,
                    ParticleBurst {
                        vel: Vec3::new(0.0, 2.2, 0.0),
                        spread: 2.0,
                        gravity: 3.0,
                        drag: 1.0,
                        life: (0.35, 0.7),
                        size: (0.05, 0.01),
                        color0: Vec4::new(3.0, 2.5, 1.2, 1.0),
                        color1: Vec4::new(1.2, 0.8, 0.3, 0.0),
                        additive: true,
                        stretch: true,
                        ..b
                    },
                ),
                cue::DEFIB_THUMP => {
                    self.defib_shock = 1.0;
                    (
                        70,
                        ParticleBurst {
                            vel: Vec3::new(0.0, 4.0, 0.0),
                            spread: 6.0,
                            gravity: 8.0,
                            drag: 0.6,
                            life: (0.2, 0.6),
                            size: (0.05, 0.01),
                            color0: Vec4::new(2.5, 3.0, 4.0, 1.0),
                            color1: Vec4::new(1.0, 1.4, 2.5, 0.0),
                            additive: true,
                            stretch: true,
                            area: Vec3::new(3.0, 0.1, 2.0),
                            ..b
                        },
                    )
                }
                _ => continue,
            };
            let mut p = burst;
            p.count = (count as f32 * gain.clamp(0.3, 1.5)) as u32;
            p.pos = pos;
            self.pending.push(p);
        }
    }

    /// Adds the game's frame to the scene: called last in `ViewBuilder::build`.
    pub fn emit(&mut self, scene: &mut Scene, f: &SurgeryFrame, time: f32, dt: f32, particles: bool) {
        if self.looks.headless {
            return;
        }
        let c = content();
        self.last_time = time;
        // Field effects don't follow onto the paper stage.
        if f.stage == Stage::Story {
            self.pending.clear();
            scene.particles.clear();
        }
        scene.particles.append(&mut self.pending);

        if let (Stage::Story, Some(st)) = (f.stage, &f.story) {
            if st.camera == 0 {
                let mut clear = Vec3::ZERO;
                paper::stage_light(scene);
                self.paper.emit(scene, st, &c, time, dt, &mut clear, particles);
                scene.clear_color = clear;
                scene.filter.transition = (1.0 - f.stage_t / 0.45).clamp(0.0, 1.0);
                scene.filter.transition_kind = Transition::Fade;
                if st.flash > 0.0 && !self.looks.reduce_flashes {
                    scene.filter.brightness = 1.0 + st.flash * 1.5;
                }
            } else {
                // The 3D wide shot: engine puppets in scrubs round a table of blocks.
                scene.clear_color = rs::srgb(12, 22, 26);
                scene.sun.direction = Vec3::new(-0.3, -1.0, -0.2).normalize();
                scene.sun.color = Vec3::new(0.9, 0.95, 1.0) * 0.5;
                scene.point_lights.push(PointLight { position: Vec3::new(97.5, 3.2, -3.0), color: Vec3::new(1.0, 0.97, 0.9) * 3.0, radius: 12.0, shadows: true });
                scene.ambient = rs::Ambient { sky: Vec3::new(0.4, 0.5, 0.55), ground: Vec3::new(0.2, 0.2, 0.22) };
                scene.style.cel_bands = 3.0;
                scene.filter.vignette = 0.4;
            }
            return;
        }
        self.emit_field(scene, f, &c, time, dt, particles);
    }

    fn emit_field(&mut self, scene: &mut Scene, f: &SurgeryFrame, c: &pav_core::games::surgery::content::Content, time: f32, dt: f32, particles: bool) {
        let paint = plate::Paint { palette_clinical: self.looks.clinical, time };
        self.plate.emit(scene, f, c, &paint);
        strains::emit(scene, f, &self.plate, time);

        // The drape's frame of steel retractors.
        let steel = Vec3::new(0.56, 0.6, 0.63);
        for (x, z) in [(-9.6, -3.2), (-9.6, 3.0), (9.6, -3.2), (9.6, 3.0)] {
            let inward = if x < 0.0 { 1.0 } else { -1.0 };
            let (a, b) = (Vec3::new(x + inward * 2.2, 0.45, z), Vec3::new(x - inward * 1.2, 1.1, z));
            scene.sdfs.push(SdfInstance { a, b, ra: 0.11, rb: 0.14, color: steel, emissive: 0.0, style: Style::Lit, flags: rs::flags::OBJECT | rs::flags::NO_CUT, group: 0x801, material: 0 });
        }
        for (x, z) in [(-7.6f32, -5.1f32), (7.6, -5.1)] {
            let (a, b) = (Vec3::new(x, 0.45, z + 1.2), Vec3::new(x, 1.1, z - 1.0));
            scene.sdfs.push(SdfInstance { a, b, ra: 0.11, rb: 0.14, color: steel, emissive: 0.0, style: Style::Lit, flags: rs::flags::OBJECT | rs::flags::NO_CUT, group: 0x802, material: 0 });
        }

        let in_op = matches!(f.stage, Stage::Op | Stage::Complete | Stage::Dead | Stage::Chart | Stage::Results);
        if in_op && !f.slots.is_empty() {
            // The IV port and the tray.
            let port = iv_port();
            scene.sdfs.push(SdfInstance { a: Vec3::new(port.x, 0.95, port.y), b: Vec3::new(port.x - 0.1, 0.9, port.y + 0.8), ra: 0.2, rb: 0.08, color: Vec3::new(0.82, 0.88, 0.96), emissive: 0.0, style: Style::Lit, flags: rs::flags::OBJECT, group: 0x803, material: 0 });
            let ring: [Tool; 8] = std::array::from_fn(|k| f.ring_tool(k));
            let slots: [Vec2; 8] = std::array::from_fn(tray_slot);
            let local = self.local_cursor.map(|(i, _)| i).unwrap_or(0);
            let selected = f.slots.get(local).map(|s| s.ring_pos).unwrap_or(0);
            instruments::emit_tray(scene, &ring, selected, time, &slots, self.looks.clinical);
            if f.stage == Stage::Op {
                self.emit_hands(scene, f, time);
            }
        }

        // Light, tested values: lamp, sun, cel, ink, bloom, GI.
        scene.sun = rs::Sun {
            direction: Vec3::new(-0.25, -1.0, -0.35).normalize(),
            color: Vec3::new(1.0, 0.98, 0.92) * 0.42,
            shadows: true,
            shadow_center: Vec3::ZERO,
            shadow_radius: 16.0,
        };
        scene.ambient = rs::Ambient { sky: Vec3::new(0.50, 0.50, 0.54), ground: Vec3::new(0.30, 0.22, 0.22) };
        scene.point_lights.push(PointLight { position: Vec3::new(-1.0, 7.0, -1.0), color: Vec3::new(1.0, 0.97, 0.9) * 0.9, radius: 16.0, shadows: true });
        scene.clear_color = rs::srgb(16, 40, 44);
        scene.style.cel_bands = 3.0;
        scene.style.rim = 0.12;
        scene.post.outlines = true;
        scene.post.outline_darken = 0.45;
        scene.post.bloom = 0.35;
        scene.post.bloom_threshold = 1.15;
        scene.post.gi = 0.6;
        scene.post.distortion = true;
        scene.filter.vignette = 0.35;

        // Lights the parasites and embers throw.
        let mut lights = 0;
        for h in &f.hazards {
            if lights >= 5 {
                break;
            }
            let glow = match h.kind {
                Kind::Ember if h.stage == 0 => Some(Vec3::new(1.0, 0.45, 0.15)),
                Kind::Furnace => Some(Vec3::new(1.0, 0.45, 0.15) * 1.5),
                Kind::Sac => Some(Vec3::new(0.3, 1.0, 0.5) * (0.2 + h.prog * 0.5)),
                Kind::Eye if h.prog > 0.5 => Some(Vec3::new(1.0, 0.8, 0.3)),
                _ => None,
            };
            if let Some(col) = glow {
                lights += 1;
                scene.point_lights.push(PointLight { position: Vec3::new(h.a.x, 1.3, h.a.y), color: col * 0.8, radius: 4.0, shadows: false });
            }
            // Haze over hot tissue.
            if matches!(h.kind, Kind::Ember | Kind::Furnace) && h.stage != 1 {
                scene.distortions.push(Distortion { pos: Vec3::new(h.a.x, 0.9, h.a.y), radius: 1.5, strength: 0.05, kind: DistortKind::Haze, progress: time.fract() });
            }
        }

        self.rain_carry += dt * 40.0;
        if particles {
            self.fx(scene, f, dt);
        }

        // Filters: the Hush desaturates; crisis adds chroma and vignette on the beat.
        let beat = (-f.beat * 5.0).exp();
        if f.hush > 0.0 || f.time_scale < 0.99 {
            let k = (1.0f32).min(f.hush.max(0.4));
            scene.filter.saturation = 1.0 - 0.9 * k;
            scene.filter.grade_part = rs::Part::Objects;
            scene.filter.vignette = 0.55;
        }
        if f.crisis > 0.0 {
            scene.filter.chroma = f.crisis * 0.0035 * (0.5 + beat);
            scene.filter.vignette += f.crisis * 0.25 * (0.5 + beat * 0.5);
        }
        if f.ripple > 0.0 {
            scene.distortions.push(Distortion { pos: Vec3::new(0.0, 0.5, 0.0), radius: 14.0, strength: 0.12, kind: DistortKind::Ripple, progress: 1.0 - f.ripple });
        }
        self.defib_shock = (self.defib_shock - dt * 1.6).max(0.0);
        if self.defib_shock > 0.0 {
            scene.distortions.push(Distortion { pos: Vec3::new(0.0, 0.5, 0.0), radius: 16.0, strength: 0.3, kind: DistortKind::Ring, progress: 1.0 - self.defib_shock });
        }
        if f.flash > 0.0 && !self.looks.reduce_flashes {
            scene.filter.brightness = 1.0 + f.flash * 0.6;
        }
        // Shake: a moment's knock of the view.
        if f.shake > 0.0 && !self.looks.no_shake {
            let s = f.shake * f.shake * 0.12;
            let off = Vec3::new((time * 47.0).sin(), (time * 37.0).cos(), 0.0) * s;
            scene.camera.view = Mat4::from_translation(off) * scene.camera.view;
        }
        // Transitions: an iris onto the incision when a plate is revealed; a fade between stages;
        // black under a death.
        if f.reveal < 1.0 {
            let k = 1.0 - f.reveal;
            scene.filter.transition = (k * 0.8).min(0.55);
            scene.filter.transition_kind = Transition::Iris;
            scene.filter.transition_center = crate::build::screen_uv(&scene.camera, Vec3::new(f.reveal_at.x, 0.5, f.reveal_at.y));
        } else if f.stage == Stage::Dead {
            scene.filter.transition = (f.stage_t * 2.0).clamp(0.0, 1.0);
            scene.filter.transition_kind = Transition::Fade;
        } else if f.stage_t < 0.45 && matches!(f.stage, Stage::Op | Stage::Chart) {
            scene.filter.transition = 1.0 - f.stage_t / 0.45;
            scene.filter.transition_kind = Transition::Fade;
        }
    }

    fn emit_hands(&mut self, scene: &mut Scene, f: &SurgeryFrame, time: f32) {
        for (i, s) in f.slots.iter().enumerate() {
            if !s.active {
                continue;
            }
            let mut p = s.cursor;
            if let Some((who, at)) = self.local_cursor {
                if who == i {
                    p = at;
                }
            }
            let tool = Tool::from_u8(s.tool);
            // IV sits at its port while it pushes.
            let tip2 = if tool == Tool::Iv && s.using { iv_port() } else { p };
            let ground = self.plate.height(tip2);
            let press = if s.using { 0.02 } else { 0.28 };
            let tip = Vec3::new(tip2.x, ground + press + s.recoil * 0.25, tip2.y);
            let m = Motion { using: s.using, pressure: s.pressure, time, meter: if tool == Tool::Defib { s.charge } else { s.meter }, recoil: s.recoil };
            let mut axis = instruments::hand_axis();
            if tool == Tool::Defib {
                axis = Vec3::new(0.0, 1.0, 0.25);
            }
            // The Scalpel leans into the stroke; a clink knocks the hand.
            axis += Vec3::new((time * 42.0).sin() * s.clink * 0.05, 0.0, 0.0);
            instruments::emit(scene, tool, tip, axis, m, 1.4, 0x700 + i as u32 * 8, 0.0);
            // Reticle in the seat's colour.
            let col = seat(i);
            let g = ground + 0.05;
            for k in 0..4 {
                let a = k as f32 * std::f32::consts::FRAC_PI_2 + 0.78;
                let d = Vec2::from_angle(a) * if s.hover != 0 { 0.28 } else { 0.4 };
                let q = Vec3::new(p.x + d.x, g, p.y + d.y);
                scene.sdfs.push(SdfInstance { a: q, b: q, ra: 0.05, rb: 0.05, color: col, emissive: 1.1, style: Style::Unlit, flags: rs::flags::OBJECT | rs::flags::NO_SHADOW | rs::flags::NO_CUT, group: 0x7f0, material: 0 });
            }
        }
        // The Echo's luminous ghost of her younger hands.
        if f.echo > 0.0 {
            let g = f.ghost;
            let ground = self.plate.height(g);
            let tool = f.slots.first().map(|s| Tool::from_u8(s.tool)).unwrap_or(Tool::Forceps);
            let tip = Vec3::new(g.x, ground + 0.12 + f.ghost_t * 0.2, g.y);
            let m = Motion { using: f.ghost_t > 0.0, time, ..Default::default() };
            let start = scene.sdfs.len();
            instruments::emit(scene, tool, tip, Vec3::new(-0.4, 1.0, 0.5), m, 1.4, 0x7e0, 0.0);
            for sd in &mut scene.sdfs[start..] {
                sd.color = Vec3::new(0.5, 0.9, 1.0);
                sd.emissive = 1.4;
                sd.style = Style::Unlit;
                sd.flags |= rs::flags::NO_SHADOW;
            }
        }
    }

    fn fx(&mut self, scene: &mut Scene, f: &SurgeryFrame, dt: f32) {
        self.fx_carry += dt;
        let tick = self.fx_carry >= 0.08;
        if !tick {
            return;
        }
        self.fx_carry = 0.0;
        let b = ParticleBurst::default();
        for h in &f.hazards {
            match h.kind {
                Kind::Bleeder if f.beat < 0.2 && !f.stopped => {
                    scene.particles.push(ParticleBurst {
                        count: 5,
                        pos: Vec3::new((h.a.x + h.b.x) * 0.5, 0.6, (h.a.y + h.b.y) * 0.5),
                        vel: Vec3::new(0.3, 3.8, 0.2),
                        spread: 0.8,
                        gravity: 10.0,
                        life: (0.3, 0.6),
                        size: (0.07, 0.03),
                        color0: Vec4::new(0.5, 0.02, 0.04, 1.0),
                        color1: Vec4::new(0.3, 0.01, 0.02, 0.9),
                        additive: false,
                        floor: Some(0.3),
                        ..b
                    });
                }
                Kind::Ember | Kind::Furnace if h.stage != 1 => {
                    scene.particles.push(ParticleBurst {
                        count: 2,
                        pos: Vec3::new(h.a.x, 0.7, h.a.y),
                        area: Vec3::new(0.4, 0.1, 0.4),
                        vel: Vec3::new(0.0, 1.3, 0.0),
                        spread: 0.4,
                        gravity: -0.2,
                        life: (0.7, 1.3),
                        size: (0.05, 0.01),
                        color0: Vec4::new(4.0, 1.8, 0.4, 1.0),
                        color1: Vec4::new(1.5, 0.3, 0.1, 0.0),
                        additive: true,
                        turbulence: 1.0,
                        ..b
                    });
                }
                _ => {}
            }
        }
        if f.hush > 0.0 {
            scene.particles.push(ParticleBurst {
                count: 6,
                pos: Vec3::new(0.0, 3.0, 0.0),
                area: Vec3::new(9.0, 2.0, 4.5),
                vel: Vec3::ZERO,
                spread: 0.1,
                life: (1.8, 3.0),
                size: (0.035, 0.015),
                color0: Vec4::new(1.5, 1.5, 1.6, 0.0),
                color1: Vec4::new(1.0, 1.0, 1.2, 0.8),
                additive: true,
                turbulence: 0.3,
                ..b
            });
        }
        if f.echo > 0.0 {
            scene.particles.push(ParticleBurst {
                count: 4,
                pos: Vec3::new(f.ghost.x, 1.4, f.ghost.y),
                area: Vec3::new(0.3, 0.8, 0.3),
                spread: 0.3,
                life: (0.4, 0.8),
                size: (0.05, 0.01),
                color0: Vec4::new(0.7, 1.6, 2.2, 0.9),
                color1: Vec4::new(0.3, 0.8, 1.4, 0.0),
                additive: true,
                ..b
            });
        }
        // Rain beyond the window on the title and menu.
        if f.stage == Stage::Title || f.stage == Stage::Card {
            scene.particles.push(ParticleBurst {
                count: 18,
                pos: Vec3::new(0.0, 12.0, -1.0),
                area: Vec3::new(14.0, 0.5, 8.0),
                vel: Vec3::new(-1.0, -18.0, 0.0),
                spread: 0.3,
                gravity: 3.0,
                life: (0.4, 0.7),
                size: (0.025, 0.02),
                color0: Vec4::new(0.8, 0.95, 1.2, 0.5),
                color1: Vec4::new(0.7, 0.85, 1.0, 0.0),
                additive: true,
                stretch: true,
                ..b
            });
        }
    }
}
