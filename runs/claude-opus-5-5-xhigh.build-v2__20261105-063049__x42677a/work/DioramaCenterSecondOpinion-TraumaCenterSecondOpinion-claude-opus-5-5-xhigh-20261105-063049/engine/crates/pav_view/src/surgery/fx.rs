//! Effects: cue bursts and the continuous particles and distortions of the field.

use glam::{Vec2, Vec3, Vec4};
use pav_core::games::surgery::cue;
use pav_core::games::surgery::field::{HazardKind as K, Tool};
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_render::scene::{DistortKind, Distortion, ParticleBurst, PointLight, Scene};

use super::plate::PlateView;

/// A cue's burst of particles: stylised, like a medical illustration.
pub fn cue_bursts(id: u16, pos: Vec3, out: &mut Vec<ParticleBurst>) {
    let at = pos + Vec3::Y * 0.5;
    let blood = |n: u32, speed: f32| ParticleBurst {
        count: n,
        pos: at,
        area: Vec3::splat(0.08),
        vel: Vec3::new(0.0, speed, 0.0),
        spread: speed * 0.7,
        gravity: 11.0,
        life: (0.35, 0.6),
        size: (0.07, 0.03),
        color0: Vec4::new(0.42, 0.015, 0.05, 1.0),
        color1: Vec4::new(0.24, 0.01, 0.03, 1.0),
        additive: false,
        ..Default::default()
    };
    match id {
        cue::SLICE | cue::TEAR => out.push(blood(14, 2.4)),
        cue::POP | cue::SPURT => out.push(blood(22, 3.0)),
        cue::BURST => {
            out.push(ParticleBurst {
                count: 42,
                pos: at,
                area: Vec3::splat(0.15),
                vel: Vec3::Y * 3.0,
                spread: 4.0,
                gravity: 10.0,
                life: (0.4, 0.8),
                size: (0.1, 0.03),
                color0: Vec4::new(0.45, 1.0, 0.55, 1.0),
                color1: Vec4::new(0.2, 0.5, 0.2, 0.0),
                additive: false,
                ..Default::default()
            });
        }
        cue::SIZZLE => {
            out.push(ParticleBurst {
                count: 18,
                pos: at,
                vel: Vec3::Y * 2.5,
                spread: 3.4,
                gravity: 7.0,
                life: (0.2, 0.45),
                size: (0.04, 0.0),
                color0: Vec4::new(3.0, 1.4, 0.4, 1.0),
                color1: Vec4::new(1.2, 0.2, 0.0, 0.0),
                stretch: true,
                ..Default::default()
            });
            out.push(smoke(at, 10));
        }
        cue::SCORCH => out.push(smoke(at, 18)),
        cue::FROST => {
            out.push(ParticleBurst {
                count: 22,
                pos: at,
                area: Vec3::splat(0.2),
                vel: Vec3::Y * 0.6,
                spread: 1.2,
                gravity: -0.2,
                life: (0.4, 0.9),
                size: (0.06, 0.0),
                color0: Vec4::new(0.8, 1.0, 1.2, 0.9),
                color1: Vec4::new(0.5, 0.8, 1.0, 0.0),
                ..Default::default()
            });
        }
        cue::GEL => {
            out.push(ParticleBurst {
                count: 6,
                pos: at,
                vel: Vec3::Y * 1.0,
                spread: 1.0,
                gravity: 9.0,
                life: (0.25, 0.45),
                size: (0.06, 0.04),
                color0: Vec4::new(0.55, 0.95, 0.8, 1.0),
                color1: Vec4::new(0.55, 0.95, 0.8, 0.0),
                additive: false,
                ..Default::default()
            });
        }
        cue::IMMACULATE => {
            out.push(ParticleBurst {
                count: 20,
                pos: at,
                vel: Vec3::Y * 2.0,
                spread: 2.6,
                gravity: 3.0,
                life: (0.3, 0.6),
                size: (0.05, 0.0),
                color0: Vec4::new(2.0, 1.8, 1.0, 1.0),
                color1: Vec4::new(1.0, 0.8, 0.3, 0.0),
                ..Default::default()
            });
        }
        cue::DEFIB_THUMP => {
            out.push(ParticleBurst {
                count: 60,
                pos: Vec3::new(0.0, 1.0, 0.0),
                area: Vec3::new(3.0, 0.2, 2.0),
                vel: Vec3::Y * 1.5,
                spread: 5.0,
                gravity: 3.0,
                life: (0.2, 0.5),
                size: (0.04, 0.0),
                color0: Vec4::new(1.0, 1.6, 2.4, 1.0),
                color1: Vec4::new(0.4, 0.8, 1.6, 0.0),
                stretch: true,
                ..Default::default()
            });
        }
        cue::PING | cue::RIPPLE | cue::GIFT_FIRE => {}
        _ => {}
    }
}

fn smoke(at: Vec3, n: u32) -> ParticleBurst {
    ParticleBurst {
        count: n,
        pos: at,
        area: Vec3::splat(0.1),
        vel: Vec3::Y * 1.0,
        spread: 0.5,
        drag: 0.8,
        life: (0.6, 1.2),
        size: (0.1, 0.4),
        color0: Vec4::new(0.5, 0.48, 0.46, 0.5),
        color1: Vec4::new(0.3, 0.3, 0.3, 0.0),
        additive: false,
        turbulence: 1.0,
        ..Default::default()
    }
}

/// What burns and bleeds all the time, this frame.
pub fn continuous(
    scene: &mut Scene,
    f: &SurgeryFrame,
    plate: &PlateView,
    time: f32,
    dt: f32,
    last_beats: &mut u32,
    carry: &mut f32,
) {
    let beat = f.beats != *last_beats;
    *last_beats = f.beats;
    *carry += dt;
    let tick = *carry > 0.05;
    if tick {
        *carry = 0.0;
    }
    let on_tissue = |p: Vec2, up: f32| Vec3::new(p.x, plate.height_at(p) + up, p.y);
    for h in &f.hazards {
        match h.kind {
            K::Bleeder if beat && !f.flat => {
                scene.particles.push(ParticleBurst {
                    count: 26,
                    pos: on_tissue(h.pos, 0.08),
                    vel: Vec3::new(h.axis.cos() * 0.9, 3.6, h.axis.sin() * 0.9),
                    spread: 1.0,
                    gravity: 12.0,
                    life: (0.35, 0.6),
                    size: (0.075, 0.03),
                    color0: Vec4::new(0.5, 0.02, 0.05, 1.0),
                    color1: Vec4::new(0.3, 0.01, 0.03, 1.0),
                    additive: false,
                    ..Default::default()
                });
            }
            K::Ember if tick && h.stage == 0 => {
                scene.particles.push(ParticleBurst {
                    count: 2,
                    pos: on_tissue(h.pos, 0.4),
                    area: Vec3::splat(h.r * 0.5),
                    vel: Vec3::Y * 1.1,
                    spread: 0.5,
                    gravity: -0.5,
                    life: (0.5, 1.1),
                    size: (0.035, 0.0),
                    color0: Vec4::new(3.0, 1.4, 0.3, 1.0),
                    color1: Vec4::new(1.4, 0.2, 0.0, 0.0),
                    turbulence: 1.5,
                    ..Default::default()
                });
                scene.distortions.push(Distortion {
                    pos: on_tissue(h.pos, 0.7),
                    radius: 1.3,
                    strength: 0.06,
                    kind: DistortKind::Haze,
                    progress: (time * 0.3).fract(),
                });
            }
            K::Furnace => {
                scene.distortions.push(Distortion {
                    pos: on_tissue(h.pos, 1.0),
                    radius: 3.0,
                    strength: 0.08,
                    kind: DistortKind::Haze,
                    progress: (time * 0.3).fract(),
                });
                if tick {
                    scene.particles.push(ParticleBurst {
                        count: 3,
                        pos: on_tissue(h.pos, 0.5),
                        area: Vec3::splat(h.r * 0.6),
                        vel: Vec3::Y * 1.8,
                        spread: 0.8,
                        gravity: -0.5,
                        life: (0.5, 1.2),
                        size: (0.05, 0.0),
                        color0: Vec4::new(3.0, 1.2, 0.3, 1.0),
                        color1: Vec4::new(1.2, 0.1, 0.0, 0.0),
                        turbulence: 1.5,
                        ..Default::default()
                    });
                }
            }
            _ => {}
        }
    }
    if let Some(r) = f.heat_ring {
        scene.distortions.push(Distortion {
            pos: Vec3::new(0.0, 0.5, 0.2),
            radius: r.max(0.5),
            strength: 0.14,
            kind: DistortKind::Ring,
            progress: 0.5,
        });
        scene.point_lights.push(PointLight {
            position: Vec3::new(0.0, 2.0, 0.2),
            color: Vec3::new(1.0, 0.4, 0.1) * 0.6,
            radius: r + 3.0,
            shadows: false,
        });
    }
    // Tools at work.
    for s in &f.surgeons {
        if !s.present || !s.using {
            continue;
        }
        let at = on_tissue(s.cursor, 0.1);
        match s.tool {
            Tool::Laser if s.engaged != 0 && tick => {
                scene.particles.push(ParticleBurst {
                    count: 3,
                    pos: at,
                    vel: Vec3::Y * 1.0,
                    spread: 0.5,
                    drag: 0.8,
                    life: (0.4, 0.8),
                    size: (0.06, 0.22),
                    color0: Vec4::new(0.5, 0.48, 0.46, 0.4),
                    color1: Vec4::new(0.3, 0.3, 0.3, 0.0),
                    additive: false,
                    turbulence: 1.0,
                    ..Default::default()
                });
                scene.point_lights.push(PointLight {
                    position: at + Vec3::Y * 0.5,
                    color: Vec3::new(1.0, 0.4, 0.2) * 0.9,
                    radius: 2.5,
                    shadows: false,
                });
            }
            Tool::Cryo if s.engaged != 0 && tick => {
                scene.particles.push(ParticleBurst {
                    count: 4,
                    pos: at,
                    area: Vec3::splat(0.2),
                    vel: Vec3::Y * 0.5,
                    spread: 0.7,
                    life: (0.3, 0.6),
                    size: (0.05, 0.0),
                    color0: Vec4::new(0.8, 1.0, 1.2, 0.9),
                    color1: Vec4::new(0.5, 0.8, 1.0, 0.0),
                    ..Default::default()
                });
            }
            Tool::Gel if tick && s.flow > 0.02 => {
                scene.particles.push(ParticleBurst {
                    count: 2,
                    pos: at + Vec3::Y * 0.4,
                    vel: Vec3::ZERO,
                    spread: 0.4,
                    gravity: 8.0,
                    life: (0.2, 0.3),
                    size: (0.06, 0.04),
                    color0: Vec4::new(0.55, 0.95, 0.8, 1.0),
                    color1: Vec4::new(0.55, 0.95, 0.8, 0.5),
                    additive: false,
                    ..Default::default()
                });
            }
            Tool::Suction if tick => {
                scene.particles.push(ParticleBurst {
                    count: 2,
                    pos: at,
                    area: Vec3::new(0.35, 0.02, 0.35),
                    vel: Vec3::Y * 0.3,
                    spread: 0.2,
                    life: (0.15, 0.3),
                    size: (0.04, 0.0),
                    color0: Vec4::new(0.5, 0.03, 0.06, 1.0),
                    color1: Vec4::new(0.3, 0.02, 0.03, 0.0),
                    additive: false,
                    ..Default::default()
                });
            }
            _ => {}
        }
    }
    // The gifts.
    if f.hush > 0.2 && tick {
        scene.particles.push(ParticleBurst {
            count: 4,
            pos: Vec3::new(0.0, 2.0, 0.0),
            area: Vec3::new(10.0, 1.5, 6.0),
            vel: Vec3::ZERO,
            spread: 0.08,
            life: (1.2, 2.2),
            size: (0.03, 0.0),
            color0: Vec4::new(0.9, 0.92, 1.0, 0.9) * f.hush,
            color1: Vec4::new(0.6, 0.7, 1.0, 0.0),
            turbulence: 0.2,
            ..Default::default()
        });
    }
    if f.echo > 0.2 && tick {
        for g in &f.ghosts {
            let k = (g.t / pav_core::games::surgery::field::GHOST_TRAVEL).clamp(0.0, 1.0);
            let to = f.hazards.iter().find(|h| h.id == g.target).map(|h| h.touch_point()).unwrap_or(g.from);
            let at = g.from.lerp(to, k);
            scene.particles.push(ParticleBurst {
                count: 4,
                pos: on_tissue(at, 0.8),
                vel: Vec3::ZERO,
                spread: 0.3,
                life: (0.2, 0.45),
                size: (0.09, 0.0),
                color0: Vec4::new(0.7, 0.95, 1.4, 0.9),
                color1: Vec4::new(0.4, 0.7, 1.2, 0.0),
                ..Default::default()
            });
        }
    }
    // Title: rain on the glass.
    if f.stage == Stage::Title && tick {
        scene.particles.push(ParticleBurst {
            count: 5,
            pos: Vec3::new(0.0, 12.0, 0.0),
            area: Vec3::new(14.0, 0.2, 7.0),
            vel: Vec3::new(-0.8, -7.0, 1.0),
            spread: 0.2,
            life: (0.9, 1.3),
            size: (0.012, 0.009),
            color0: Vec4::new(0.55, 0.7, 0.95, 0.45),
            color1: Vec4::new(0.55, 0.7, 0.95, 0.0),
            stretch: true,
            ..Default::default()
        });
    }
}
