//! The instruments: SDF rounded cones in Style::Lit steel, so parts can animate and cast real
//! shadows on the tissue. One function draws each, in the hand and on the tray.

use glam::Vec3;
use pav_core::games::surgery::field::Tool;
use pav_render::scene::{SdfInstance, Style, flags};

/// What a tool is doing.
#[derive(Clone, Copy, Debug, Default)]
pub struct Pose {
    pub using: bool,
    /// How far the plunger or the arms have gone, 0..1.
    pub amount: f32,
    pub time: f32,
    pub seat: Vec3,
    pub glow: f32,
    pub group: u32,
    /// No shadow (ghost hands).
    pub ghost: bool,
}

const STEEL: Vec3 = Vec3::new(0.62, 0.66, 0.70);
const DARK: Vec3 = Vec3::new(0.16, 0.18, 0.22);
const RUBBER: Vec3 = Vec3::new(0.05, 0.06, 0.08);

struct Pen<'a> {
    out: &'a mut Vec<SdfInstance>,
    tip: Vec3,
    axis: Vec3,
    side: Vec3,
    up: Vec3,
    s: f32,
    group: u32,
    flag: u32,
    ghost: bool,
}

impl Pen<'_> {
    /// `a` and `b` in tool space: along the shaft from the tip, sideways, up.
    fn cone(&mut self, a: [f32; 3], b: [f32; 3], ra: f32, rb: f32, color: Vec3, emissive: f32, style: Style) {
        let at = |p: [f32; 3]| self.tip + (self.axis * p[0] + self.side * p[1] + self.up * p[2]) * self.s;
        let (color, emissive, style) =
            if self.ghost { (Vec3::new(0.65, 0.86, 1.0), 0.9, Style::Unlit) } else { (color, emissive, style) };
        self.out.push(SdfInstance {
            a: at(a),
            b: at(b),
            ra: ra * self.s,
            rb: rb * self.s,
            color,
            emissive,
            style,
            flags: self.flag,
            group: self.group,
            material: 0,
        });
    }
    fn steel(&mut self, a: [f32; 3], b: [f32; 3], ra: f32, rb: f32) {
        self.cone(a, b, ra, rb, STEEL, 0.0, Style::Lit);
    }
    fn dark(&mut self, a: [f32; 3], b: [f32; 3], ra: f32, rb: f32) {
        self.cone(a, b, ra, rb, DARK, 0.0, Style::Lit);
    }
}

/// Draws a tool. `tip` is its working end, `axis` runs from the tip toward the handle, `side` is
/// across it. `s` scales it (the tray's are smaller).
pub fn model(out: &mut Vec<SdfInstance>, tool: Tool, tip: Vec3, axis: Vec3, side: Vec3, s: f32, p: &Pose) {
    let up = axis.cross(side).normalize_or(Vec3::Y);
    let flag = if p.ghost { flags::NO_SHADOW } else { 0 };
    let mut pen = Pen { out, tip, axis, side, up, s, group: p.group, flag, ghost: p.ghost };
    let accent = p.seat;
    match tool {
        Tool::Scalpel => {
            // A thin blade, a long flat handle with a seat-coloured band.
            pen.cone([0.0, 0.0, 0.0], [0.22, 0.0, 0.02], 0.012, 0.05, Vec3::new(0.86, 0.9, 0.95), 0.0, Style::Lit);
            pen.cone([0.22, 0.0, 0.02], [0.5, 0.0, 0.03], 0.05, 0.06, Vec3::new(0.82, 0.86, 0.92), 0.0, Style::Lit);
            pen.steel([0.5, 0.0, 0.03], [2.0, 0.0, 0.05], 0.07, 0.095);
            pen.cone([1.0, 0.0, 0.04], [1.25, 0.0, 0.04], 0.1, 0.1, accent, 0.3, Style::Cel);
        }
        Tool::Forceps => {
            let open = if p.using { 0.03 } else { 0.2 + (p.time * 2.0).sin().abs() * 0.015 };
            for sign in [-1.0f32, 1.0] {
                pen.steel([0.0, sign * open * 0.25, 0.0], [0.55, sign * open, 0.04], 0.022, 0.04);
                pen.steel([0.55, sign * open, 0.04], [1.85, sign * 0.06, 0.1], 0.04, 0.06);
            }
            pen.steel([1.82, 0.0, 0.1], [2.1, 0.0, 0.1], 0.08, 0.06);
            pen.cone([1.2, 0.0, 0.08], [1.4, 0.0, 0.08], 0.045, 0.045, accent, 0.3, Style::Cel);
        }
        Tool::Suture => {
            // A curved needle in a holder, trailing thread.
            let arc = if p.using { (p.time * 18.0).sin() * 0.25 } else { 0.0 };
            let mut last = [0.0, 0.0, 0.0];
            for i in 1..=6 {
                let t = i as f32 / 6.0 * 2.4 + arc;
                let q = [0.2 - t.cos() * 0.2 + 0.0, t.sin() * 0.22, 0.02];
                pen.cone(last, q, 0.012, 0.016, Vec3::new(0.92, 0.94, 0.98), 0.0, Style::Lit);
                last = q;
            }
            pen.steel([0.3, 0.16, 0.03], [1.8, 0.04, 0.1], 0.04, 0.07);
            pen.steel([1.8, 0.04, 0.1], [2.05, 0.16, 0.1], 0.07, 0.05);
            pen.steel([1.8, 0.04, 0.1], [2.05, -0.1, 0.1], 0.07, 0.05);
            pen.cone([1.0, 0.1, 0.07], [1.2, 0.09, 0.08], 0.075, 0.075, accent, 0.3, Style::Cel);
            pen.cone(last, [0.3, 0.5, 0.0], 0.012, 0.01, Vec3::new(0.14, 0.2, 0.6), 0.0, Style::Cel);
        }
        Tool::Suction => {
            // A nozzle that shudders when it's working, and a hose out of frame.
            let sh = if p.using { (p.time * 70.0).sin() * 0.018 } else { 0.0 };
            pen.steel([0.0, sh, 0.0], [0.7, sh, 0.05], 0.05, 0.075);
            pen.dark([0.7, sh, 0.05], [1.4, 0.0, 0.1], 0.1, 0.12);
            pen.cone([0.9, sh, 0.06], [1.06, sh, 0.07], 0.12, 0.12, accent, 0.3, Style::Cel);
            pen.cone([1.4, 0.0, 0.1], [2.8, 0.3, 0.3], 0.07, 0.07, RUBBER, 0.0, Style::Lit);
            pen.cone([2.8, 0.3, 0.3], [4.6, 0.9, 1.0], 0.07, 0.07, RUBBER, 0.0, Style::Lit);
        }
        Tool::Laser => {
            let hot = if p.using { 1.9 } else { 0.6 };
            pen.cone([0.0, 0.0, 0.0], [0.18, 0.0, 0.02], 0.022, 0.05, Vec3::new(1.0, 0.35, 0.2), hot, Style::Unlit);
            pen.dark([0.18, 0.0, 0.02], [0.8, 0.0, 0.06], 0.07, 0.1);
            pen.steel([0.8, 0.0, 0.06], [1.9, 0.0, 0.1], 0.1, 0.11);
            pen.cone([1.2, 0.0, 0.08], [1.35, 0.0, 0.09], 0.12, 0.12, accent, 0.3, Style::Cel);
        }
        Tool::Gel => {
            // A squeeze applicator; the plunger is the flow meter.
            let plunge = p.amount.clamp(0.0, 1.0);
            pen.cone([0.0, 0.0, 0.0], [0.34, 0.0, 0.03], 0.02, 0.045, Vec3::new(0.7, 0.95, 0.85), 0.2, Style::Cel);
            pen.cone([0.34, 0.0, 0.03], [1.35, 0.0, 0.09], 0.14, 0.15, Vec3::new(0.48, 0.86, 0.72), 0.12, Style::Lit);
            pen.steel([1.35, 0.0, 0.09], [1.42 + plunge * 0.55, 0.0, 0.1], 0.04, 0.04);
            pen.cone([1.42 + plunge * 0.55, 0.0, 0.1], [1.47 + plunge * 0.55, 0.0, 0.1], 0.13, 0.13, accent, 0.3, Style::Cel);
        }
        Tool::Scanner => {
            // A wand with a sonar disc.
            let g = 0.6 + p.glow * 1.5 + if p.using { (p.time * 9.0).sin().abs() * 0.8 } else { 0.0 };
            pen.cone([0.0, 0.0, 0.0], [0.03, 0.0, 0.0], 0.22, 0.22, Vec3::new(0.3, 0.8, 1.0), g, Style::Unlit);
            pen.dark([0.06, 0.0, 0.0], [0.4, 0.0, 0.05], 0.14, 0.07);
            pen.steel([0.4, 0.0, 0.05], [1.9, 0.0, 0.1], 0.07, 0.09);
            pen.cone([1.1, 0.0, 0.08], [1.26, 0.0, 0.08], 0.1, 0.1, accent, 0.3, Style::Cel);
        }
        Tool::Iv => {
            // A syringe; the plunger goes in with the dose.
            let d = p.amount.clamp(0.0, 1.25);
            pen.steel([0.0, 0.0, 0.0], [0.4, 0.0, 0.02], 0.012, 0.012);
            pen.cone([0.4, 0.0, 0.02], [1.4, 0.0, 0.06], 0.1, 0.1, Vec3::new(0.86, 0.9, 0.96), 0.1, Style::Lit);
            pen.cone(
                [0.45, 0.0, 0.03],
                [0.5 + (1.0 - d.min(1.0)) * 0.85, 0.0, 0.05],
                0.075,
                0.075,
                Vec3::new(0.95, 0.72, 0.2),
                0.5,
                Style::Unlit,
            );
            let back = 0.6 + (1.0 - d.min(1.0)) * 1.0;
            pen.steel([back, 0.0, 0.05], [back + 1.0, 0.0, 0.07], 0.025, 0.025);
            pen.cone([back + 1.0, 0.0, 0.07], [back + 1.04, 0.0, 0.07], 0.1, 0.1, accent, 0.3, Style::Cel);
        }
        Tool::Cryo => {
            let frost = if p.using { 1.4 } else { 0.5 };
            pen.cone([0.0, 0.0, 0.0], [0.1, 0.0, 0.01], 0.03, 0.06, Vec3::new(0.6, 0.95, 1.0), frost, Style::Unlit);
            pen.steel([0.1, 0.0, 0.01], [0.9, 0.0, 0.06], 0.05, 0.09);
            pen.cone([0.9, 0.0, 0.06], [1.8, 0.0, 0.1], 0.13, 0.13, Vec3::new(0.4, 0.62, 0.72), 0.05, Style::Lit);
            pen.cone([1.25, 0.0, 0.08], [1.42, 0.0, 0.08], 0.14, 0.14, accent, 0.3, Style::Cel);
        }
        Tool::Dressing => {
            // A roller of white gauze.
            pen.cone([0.0, -0.32, 0.0], [0.0, 0.32, 0.0], 0.13, 0.13, Vec3::new(0.95, 0.95, 0.9), 0.0, Style::Cel);
            pen.steel([0.05, 0.0, 0.05], [1.8, 0.0, 0.12], 0.05, 0.07);
            pen.cone([1.2, 0.0, 0.1], [1.35, 0.0, 0.11], 0.09, 0.09, accent, 0.3, Style::Cel);
        }
        Tool::Defib => {
            let g = p.amount.clamp(0.0, 1.0);
            let glow = Vec3::new(0.6, 0.85, 1.0);
            for sign in [-1.0f32, 1.0] {
                let x = sign * 1.15;
                pen.cone([0.0, x - 0.42, 0.0], [0.0, x + 0.42, 0.0], 0.2, 0.2, STEEL.lerp(glow, g), g * 2.0, Style::Lit);
                pen.dark([0.05, x, 0.1], [0.8, x, 0.5], 0.14, 0.12);
                pen.cone([0.8, x, 0.5], [1.1, x, 0.65], 0.13, 0.13, accent, 0.3, Style::Cel);
            }
        }
    }
}
