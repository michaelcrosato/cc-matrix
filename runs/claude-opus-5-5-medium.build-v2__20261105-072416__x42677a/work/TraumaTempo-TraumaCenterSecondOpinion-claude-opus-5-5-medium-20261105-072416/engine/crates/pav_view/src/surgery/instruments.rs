//! The instruments: built in code from SDF rounded cones, so parts can animate (forceps tips open,
//! the needle arcs, the plunger moves, the suction shudders). They cast real shadows on the tissue,
//! an essential depth cue. The same model sits on the steel tray and in the hand.

use glam::{Mat3, Mat4, Quat, Vec2, Vec3};
use pav_core::games::surgery::field::Tool;
use pav_render::scene::{self as rs, MeshInstance, MeshKey, Scene, SdfInstance, Style};

#[derive(Clone, Copy)]
pub struct P {
    pub a: Vec3,
    pub b: Vec3,
    pub ra: f32,
    pub rb: f32,
    pub c: Vec3,
    pub e: f32,
}

fn steel() -> Vec3 {
    Vec3::new(0.72, 0.76, 0.8)
}
fn dark() -> Vec3 {
    Vec3::new(0.09, 0.1, 0.12)
}
fn p(a: [f32; 3], b: [f32; 3], ra: f32, rb: f32, c: Vec3) -> P {
    P { a: Vec3::from_array(a), b: Vec3::from_array(b), ra, rb, c, e: 0.0 }
}
fn glow(mut x: P, e: f32) -> P {
    x.e = e;
    x
}

/// How an instrument is moving right now.
#[derive(Clone, Copy, Default)]
pub struct Motion {
    pub using: bool,
    pub pressure: f32,
    pub time: f32,
    /// The gesture's meter: heat, frost, dose.
    pub meter: f32,
    pub recoil: f32,
}

/// The model in its own frame: the tip at the origin, the handle along +Y, about 3.2 units long.
pub fn parts(tool: Tool, m: Motion) -> Vec<P> {
    let mut v = Vec::new();
    let s = steel();
    let t = m.time;
    match tool {
        Tool::Scalpel => {
            v.push(p([0.0, 0.0, 0.0], [0.02, 0.52, 0.0], 0.012, 0.085, Vec3::new(0.9, 0.93, 0.96)));
            v.push(p([0.03, 0.46, 0.0], [0.03, 3.1, 0.0], 0.06, 0.075, s));
            for k in 0..4 {
                let y = 1.5 + k as f32 * 0.22;
                v.push(p([0.03, y, 0.0], [0.03, y + 0.09, 0.0], 0.082, 0.082, dark()));
            }
        }
        Tool::Forceps => {
            let open = if m.using { 0.02 } else { 0.16 };
            v.push(p([-open, 0.0, 0.0], [-0.1, 1.5, 0.0], 0.022, 0.055, s));
            v.push(p([open, 0.0, 0.0], [0.1, 1.5, 0.0], 0.022, 0.055, s));
            v.push(p([-0.1, 1.5, 0.0], [-0.03, 3.0, 0.0], 0.055, 0.05, s));
            v.push(p([0.1, 1.5, 0.0], [0.03, 3.0, 0.0], 0.055, 0.05, s));
        }
        Tool::Suture => {
            // A needle holder, with the curved needle at its jaws.
            let arc = if m.using { (t * 14.0).sin() * 0.5 } else { 0.0 };
            for k in 0..7 {
                let a0 = -1.4 + k as f32 * 0.42 + arc;
                let a1 = a0 + 0.42;
                let q = |a: f32| [a.sin() * 0.28, 0.28 - a.cos() * 0.28, a.cos() * 0.05];
                v.push(p(q(a0), q(a1), 0.018, 0.018, Vec3::new(0.95, 0.9, 0.7)));
            }
            v.push(p([0.0, 0.28, 0.0], [0.03, 1.4, 0.0], 0.04, 0.07, s));
            v.push(p([0.03, 1.4, 0.0], [-0.14, 2.9, 0.0], 0.06, 0.05, s));
            v.push(p([0.03, 1.4, 0.0], [0.2, 2.9, 0.0], 0.06, 0.05, s));
            v.push(p([-0.14, 2.9, 0.0], [-0.14, 3.05, 0.0], 0.1, 0.1, dark()));
            v.push(p([0.2, 2.9, 0.0], [0.2, 3.05, 0.0], 0.1, 0.1, dark()));
        }
        Tool::Suction => {
            let shudder = if m.using { (t * 60.0).sin() * 0.018 * m.pressure.max(0.3) } else { 0.0 };
            v.push(p([shudder, 0.0, 0.0], [0.0, 1.3, 0.0], 0.07, 0.085, s));
            v.push(p([0.0, 1.3, 0.0], [0.04, 2.1, 0.0], 0.085, 0.14, Vec3::new(0.2, 0.42, 0.55)));
            v.push(p([0.04, 2.1, 0.0], [0.25, 3.2, 0.25], 0.09, 0.08, Vec3::new(0.82, 0.86, 0.88)));
        }
        Tool::Laser => {
            let on = m.using;
            v.push(p([0.0, 0.32, 0.0], [0.0, 3.0, 0.0], 0.05, 0.13, Vec3::new(0.16, 0.18, 0.24)));
            v.push(p([0.0, 0.14, 0.0], [0.0, 0.34, 0.0], 0.03, 0.05, s));
            let c = Vec3::new(1.0, 0.16, 0.08);
            v.push(glow(p([0.0, 1.5, 0.1], [0.0, 2.1, 0.11], 0.03, 0.03, c), if on { 2.2 } else { 0.6 }));
            if on {
                v.push(glow(p([0.0, 0.0, 0.0], [0.0, 0.16, 0.0], 0.045, 0.02, c), 3.5));
            }
        }
        Tool::Gel => {
            let plunge = if m.using { 0.5 + (t * 3.0).sin() * 0.1 } else { 0.8 };
            v.push(p([0.0, 0.0, 0.0], [0.0, 0.46, 0.0], 0.025, 0.07, Vec3::new(0.82, 0.86, 0.88)));
            v.push(p([0.0, 0.46, 0.0], [0.0, 2.1, 0.0], 0.17, 0.17, Vec3::new(0.5, 0.9, 0.78)));
            v.push(p([0.0, 2.1, 0.0], [0.0, 2.1 + plunge, 0.0], 0.05, 0.05, s));
            v.push(p([-0.16, 2.1 + plunge, 0.0], [0.16, 2.1 + plunge, 0.0], 0.05, 0.05, s));
        }
        Tool::Scanner => {
            let pulse = if m.using { 1.0 + (t * 7.0).sin() * 0.5 } else { 0.5 };
            v.push(p([-0.36, 0.1, 0.0], [0.36, 0.1, 0.0], 0.12, 0.12, Vec3::new(0.22, 0.26, 0.32)));
            v.push(glow(p([-0.3, 0.02, 0.0], [0.3, 0.02, 0.0], 0.06, 0.06, Vec3::new(0.3, 0.9, 1.0)), pulse));
            v.push(p([0.0, 0.2, 0.0], [0.04, 3.0, 0.0], 0.09, 0.07, s));
        }
        Tool::Iv => {
            let dose = m.meter.clamp(0.0, 1.3);
            v.push(p([0.0, 0.0, 0.0], [0.0, 0.8, 0.0], 0.012, 0.02, s));
            v.push(p([0.0, 0.8, 0.0], [0.0, 2.2, 0.0], 0.13, 0.13, Vec3::new(0.76, 0.85, 0.96)));
            v.push(p([0.0, 2.2 - dose * 1.1, 0.0], [0.0, 3.05 - dose * 1.1, 0.0], 0.04, 0.04, s));
            v.push(p([-0.14, 3.05 - dose * 1.1, 0.0], [0.14, 3.05 - dose * 1.1, 0.0], 0.05, 0.05, s));
        }
        Tool::Cryo => {
            let c = Vec3::new(0.65, 0.9, 1.0);
            v.push(glow(p([0.0, 0.0, 0.0], [0.0, 0.3, 0.0], 0.06, 0.04, c), if m.using { 1.5 } else { 0.4 }));
            v.push(p([0.0, 0.3, 0.0], [0.0, 1.5, 0.0], 0.04, 0.11, s));
            v.push(p([0.0, 1.5, 0.0], [0.0, 3.0, 0.0], 0.11, 0.1, Vec3::new(0.25, 0.42, 0.62)));
            v.push(glow(p([0.0, 2.0, 0.1], [0.0, 2.6, 0.1], 0.02, 0.02, c), 1.0));
        }
        Tool::Dressing => {
            v.push(p([-0.5, 0.12, 0.0], [0.5, 0.12, 0.0], 0.13, 0.13, Vec3::new(0.94, 0.94, 0.9)));
            v.push(p([-0.56, 0.12, 0.0], [-0.1, 1.5, 0.0], 0.03, 0.04, s));
            v.push(p([0.56, 0.12, 0.0], [0.1, 1.5, 0.0], 0.03, 0.04, s));
            v.push(p([0.0, 1.5, 0.0], [0.0, 3.0, 0.0], 0.07, 0.07, Vec3::new(0.2, 0.55, 0.58)));
        }
        Tool::Defib => {
            let r = Vec3::new(0.22, 0.24, 0.28);
            let charge = m.meter;
            for x in [-0.95f32, 0.95] {
                v.push(p([x - 0.4, 0.06, 0.0], [x + 0.4, 0.06, 0.0], 0.1, 0.1, s));
                v.push(p([x, 0.14, 0.0], [x, 1.2, 0.0], 0.14, 0.1, r));
                v.push(glow(p([x, 0.5, 0.13], [x, 0.9, 0.13], 0.03, 0.03, Vec3::new(1.0, 0.8, 0.2)), charge * 3.0));
            }
        }
    }
    v
}

/// The direction the handle leans in the hand: toward the camera and the player.
pub fn hand_axis() -> Vec3 {
    Vec3::new(0.42, 1.0, 0.48).normalize()
}

/// Draws a model: `tip` in the world, its handle along `axis`.
pub fn emit(scene: &mut Scene, tool: Tool, tip: Vec3, axis: Vec3, m: Motion, scale: f32, group: u32, lift_glow: f32) {
    let rot = Quat::from_rotation_arc(Vec3::Y, axis.normalize());
    let mat = Mat3::from_quat(rot);
    for q in parts(tool, m) {
        let a = tip + mat * (q.a * scale);
        let b = tip + mat * (q.b * scale);
        scene.sdfs.push(SdfInstance {
            a,
            b,
            ra: q.ra * scale,
            rb: q.rb * scale,
            color: q.c,
            emissive: q.e + lift_glow,
            style: if q.e > 0.0 { Style::Unlit } else { Style::Lit },
            flags: rs::flags::OBJECT | rs::flags::NO_CUT,
            group,
            material: 0,
        });
    }
}

/// The steel tray at the bottom of the field, an instrument per ring position.
#[allow(clippy::too_many_arguments)]
pub fn emit_tray(scene: &mut Scene, ring: &[Tool; 8], selected: u8, time: f32, slots: &[Vec2; 8], clinical: bool) {
    let _ = clinical;
    let tray_steel = Vec3::new(0.46, 0.5, 0.53);
    let half = Vec3::new(6.9, 0.07, 0.86);
    scene.meshes.push(MeshInstance {
        mesh: MeshKey::rounded_box(half, 0.06),
        transform: Mat4::from_translation(Vec3::new(0.0, 0.92, 5.3)),
        color: tray_steel,
        emissive: 0.0,
        style: Style::Lit,
        flags: rs::flags::OBJECT | rs::flags::NO_CUT,
        group: 0x900,
        material: 0,
        ext: half,
    });
    let selected = selected as usize;
    for (k, tool) in ring.iter().enumerate() {
        let lift = k == selected;
        let y = if lift { 1.42 + (time * 3.0).sin() * 0.03 } else { 1.06 };
        let at = slots[k];
        // Laid flat, tips toward the patient.
        let axis = Vec3::new(0.12, 0.05, 1.0);
        let tip = Vec3::new(at.x, y, at.y - 0.56);
        let scale = if lift { 0.42 } else { 0.36 };
        let m = Motion { time, ..Default::default() };
        emit(scene, *tool, tip, axis, m, scale, 0x910 + k as u32, if lift { 0.28 } else { 0.0 });
    }
}
