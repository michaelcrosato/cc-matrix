//! The operation HUD: heart and vitals, the live ECG, the countdown, the tray's labels, the gift
//! meter, the speaker cameo, the NOW line, and everything anchored to the field.

use std::f32::consts::TAU;

use egui::epaint::{Mesh, Vertex};
use egui::{Align2, Color32, Painter, Pos2, Rect, Stroke, StrokeKind, pos2, vec2};
use glam::{Mat4, Vec2, Vec3};
use pav_core::games::surgery::field::{HazardKind as K, Rating, Tool, polyline_at};
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_core::games::surgery::surgeon::tray_x;

use super::glyphs::{self, Action};
use super::style::{self, DIM, GOLD, GREEN, INK, RED, SEATS, TEAL};
use super::{Shell, ShellInput};
use crate::Device;

/// The trace's memory: value per sample.
#[derive(Default)]
pub struct HudState {
    trace: Vec<(f32, f32)>,
    clock: f32,
    last_time: f32,
    pub stamp_t: f32,
    pub stats: String,
}

/// One beat of ECG: P, QRS, T. Phase 0 is the R wave.
pub fn ecg_wave(phase: f32) -> f32 {
    let g = |c: f32, w: f32, x: f32| (-(x - c) * (x - c) / w).exp();
    let x = phase;
    let x2 = if x > 0.5 { x - 1.0 } else { x };
    g(0.0, 0.00022, x2) * 1.0 - g(-0.03, 0.0002, x2) * 0.14 - g(0.035, 0.0003, x2) * 0.26
        + g(0.26, 0.0028, x2) * 0.26
        + g(-0.18, 0.0014, x2) * 0.13
}

pub struct Projector {
    pub vp: Mat4,
    pub rect: Rect,
}

impl Projector {
    pub fn at(&self, p: Vec3) -> Pos2 {
        let c = self.vp.project_point3(p);
        pos2(self.rect.min.x + (c.x * 0.5 + 0.5) * self.rect.width(), self.rect.min.y + (0.5 - c.y * 0.5) * self.rect.height())
    }
    pub fn field(&self, p: Vec2) -> Pos2 {
        self.at(Vec3::new(p.x, 0.55, p.y))
    }
    /// About how many points one field unit is across here.
    pub fn scale(&self, p: Vec2) -> f32 {
        self.field(p).distance(self.field(p + Vec2::X))
    }
}

fn rating_color(r: Rating) -> Color32 {
    match r {
        Rating::Immaculate => Color32::from_rgb(255, 224, 110),
        Rating::Clean => Color32::from_rgb(120, 236, 200),
        Rating::Good => Color32::from_rgb(190, 214, 230),
        Rating::Sloppy => Color32::from_rgb(232, 110, 90),
    }
}

/// A gauge ring around a screen point.
fn arc(p: &Painter, c: Pos2, r: f32, from: f32, to: f32, w: f32, color: Color32) {
    let n = (((to - from) * 40.0).ceil() as usize).clamp(2, 64);
    let pts: Vec<Pos2> = (0..=n)
        .map(|k| {
            let a = -std::f32::consts::FRAC_PI_2 + (from + (to - from) * k as f32 / n as f32) * TAU;
            c + vec2(a.cos(), a.sin()) * r
        })
        .collect();
    p.add(egui::Shape::line(pts, Stroke::new(w, color)));
}

fn dashed(p: &Painter, pr: &Projector, pts: &[Vec2], from: f32, color: Color32, time: f32) {
    let len: f32 = pts.windows(2).map(|w| w[0].distance(w[1])).sum();
    let mut s = from;
    let dash = 0.3;
    let shift = (time * 0.6).fract() * dash * 2.0;
    s += shift.min((len - s).max(0.0));
    while s < len {
        let a = polyline_at(pts, s).0;
        let b = polyline_at(pts, (s + dash).min(len)).0;
        p.line_segment([pr.field(a), pr.field(b)], Stroke::new(7.0, Color32::from_black_alpha(150)));
        p.line_segment([pr.field(a), pr.field(b)], Stroke::new(3.5, color));
        s += dash * 2.0;
    }
}

fn arrow(p: &Painter, from: Pos2, to: Pos2, color: Color32, w: f32) {
    let d = (to - from).normalized();
    let n = vec2(-d.y, d.x);
    for (a, b) in [(from, to), (to, to - d * 14.0 + n * 9.0), (to, to - d * 14.0 - n * 9.0)] {
        p.line_segment([a, b], Stroke::new(w + 3.0, Color32::from_black_alpha(160)));
    }
    for (a, b) in [(from, to), (to, to - d * 14.0 + n * 9.0), (to, to - d * 14.0 - n * 9.0)] {
        p.line_segment([a, b], Stroke::new(w, color));
    }
}

/// A red edge that pulses on the beat.
fn vignette(p: &Painter, rect: Rect, color: Color32, a: f32, depth: f32) {
    if a <= 0.0 {
        return;
    }
    let mut m = Mesh::default();
    let edge = style::with_alpha(color, a);
    let clear = style::with_alpha(color, 0.0);
    let mut quad = |p0: Pos2, p1: Pos2, p2: Pos2, p3: Pos2, c0: Color32, c1: Color32| {
        let b = m.vertices.len() as u32;
        for (q, c) in [(p0, c0), (p1, c0), (p2, c1), (p3, c1)] {
            m.vertices.push(Vertex { pos: q, uv: egui::epaint::WHITE_UV, color: c });
        }
        m.indices.extend_from_slice(&[b, b + 1, b + 2, b, b + 2, b + 3]);
    };
    let (a0, b0) = (rect.min, rect.max);
    let d = depth;
    quad(a0, pos2(b0.x, a0.y), pos2(b0.x, a0.y + d), pos2(a0.x, a0.y + d), edge, clear);
    quad(pos2(a0.x, b0.y), b0, pos2(b0.x, b0.y - d), pos2(a0.x, b0.y - d), edge, clear);
    quad(a0, pos2(a0.x, b0.y), pos2(a0.x + d, b0.y), pos2(a0.x + d, a0.y), edge, clear);
    quad(pos2(b0.x, a0.y), b0, pos2(b0.x - d, b0.y), pos2(b0.x - d, a0.y), edge, clear);
    p.add(m);
}

pub fn draw(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame, vp: Mat4, i: &ShellInput) {
    let pr = Projector { vp, rect };
    if matches!(f.stage, Stage::Title | Stage::Card) {
        return;
    }
    let time = f.clock;
    let _ = &shell.hud.stamp_t;
    field_marks(shell, p, &pr, f, time, i);
    popups(p, &pr, f);
    hud_top(shell, p, rect, f, i.dt);
    tray_labels(shell, p, &pr, rect, f);
    cameo_line(shell, p, rect, f);
    if f.fever.is_some() || f.ring_in > 0 || f.heat_ring.is_some() {
        fever(p, rect, f);
    }
    // Low vitals: a red edge on the beat.
    let low = (1.0 - f.vitals / 30.0).clamp(0.0, 1.0);
    if low > 0.0 && matches!(f.stage, Stage::Op | Stage::Code) {
        let beat = (-f.beat * 5.0).exp();
        let k = if shell.save.settings.reduce_flashes { 0.5 } else { beat };
        vignette(p, rect, RED, low * (0.25 + 0.55 * k), 240.0);
    }
    if f.hush > 0.0 {
        vignette(p, rect, Color32::from_rgb(170, 190, 255), f.hush * 0.28, 300.0);
        if f.hush > 0.5 {
            style::outlined(
                p,
                rect.center_top() + vec2(0.0, 186.0),
                Align2::CENTER_CENTER,
                if f.duet { "THE DUET" } else { "THE HUSH" },
                44.0,
                style::with_alpha(Color32::WHITE, f.hush),
            );
        }
    }
    if f.echo > 0.5 && f.hush <= 0.5 {
        style::outlined(
            p,
            rect.center_top() + vec2(0.0, 186.0),
            Align2::CENTER_CENTER,
            "THE ECHO",
            44.0,
            style::with_alpha(Color32::from_rgb(160, 220, 255), f.echo),
        );
    }
    if let Some(c) = &f.code {
        code(shell, p, rect, f, c);
    }
    if let Some((text, age)) = &f.banner {
        banner(p, rect, text, *age);
    }
    if shell.chart_open {
        chart_overlay(shell, p, rect, f);
    }
    if i.chart && matches!(f.stage, Stage::Op | Stage::OpStart) {
        shell.chart_open = !shell.chart_open;
    }
}

fn field_marks(shell: &mut Shell, p: &Painter, pr: &Projector, f: &SurgeryFrame, time: f32, i: &ShellInput) {
    let tool = f.surgeons.first().map(|s| s.tool).unwrap_or(Tool::Scalpel);
    let hover = i.pointer.filter(|_| shell.device == Device::KeyboardMouse);
    for h in &f.hazards {
        if h.hidden && h.reveal <= 0.0 {
            continue;
        }
        let c = pr.field(h.touch_point());
        let u = pr.scale(h.pos).max(20.0);
        let valid = h.accepts(tool);
        let guide = f.guide == h.id;
        let hovered = hover.is_some_and(|q| q.distance(c) < (h.r * u + 26.0));
        match h.kind {
            K::Incision | K::Tether | K::Closure => {
                let color = if h.kind == K::Tether {
                    Color32::from_rgb(210, 170, 255)
                } else if h.kind == K::Closure {
                    Color32::from_rgb(240, 240, 220)
                } else {
                    Color32::from_rgb(250, 250, 250)
                };
                if h.kind != K::Tether {
                    dashed(p, pr, &h.pts, h.progress, color, time);
                }
                // Where the stroke starts, or resumes.
                let pulse = (time * 5.0).sin() * 0.2 + 0.8;
                p.circle_stroke(c, 12.0 + 3.0 * pulse, Stroke::new(3.5, style::with_alpha(color, pulse)));
                if h.life > 0.0 {
                    // A stroke with a deadline: the ring closes on it.
                    let frac = (h.life / 3.0).clamp(0.0, 1.0);
                    arc(p, c, 22.0, 0.0, frac, 4.0, GOLD);
                }
            }
            K::Laceration | K::Bleeder => {
                if tool == Tool::Suture || guide {
                    let len: f32 = h.pts.windows(2).map(|w| w[0].distance(w[1])).sum();
                    if h.progress < len {
                        let (n, t) = polyline_at(&h.pts, h.progress);
                        let side = Vec2::new(-t.y, t.x) * 0.5;
                        let (a, b) = (pr.field(n + side), pr.field(n - side));
                        p.line_segment([a, b], Stroke::new(3.0, style::with_alpha(TEAL, 0.9)));
                        p.circle_filled(pr.field(n), 5.0, TEAL);
                    }
                }
            }
            K::Foreign | K::Tumor | K::Nodule | K::Eye | K::Furnace if h.accepts(Tool::Forceps) => {
                if tool == Tool::Forceps || guide {
                    let d = Vec2::from_angle(h.axis);
                    let from = pr.field(h.pos + d * (h.r + 0.2));
                    let to = pr.field(h.pos + d * (h.r + 1.1));
                    arrow(p, from, to, GOLD, 4.0);
                }
                if h.kind == K::Nodule && h.life > 0.0 {
                    let frac = (h.life / 1.6).clamp(0.0, 1.0);
                    arc(p, c, h.r * u + 16.0, 0.0, frac, 5.0, RED);
                }
            }
            K::Tendril => {
                // The tug-of-war: pull when the heart relaxes.
                let d = f.beat > 0.38 && f.beat < 0.95;
                let (text, col) = if d { ("PULL", GREEN) } else { ("WAIT", RED) };
                style::outlined(p, c + vec2(0.0, -70.0), Align2::CENTER_CENTER, text, 52.0, col);
            }
            K::Bone => {
                if h.stage == 0 {
                    // The home it wants: a ghost of the fragment at the right angle.
                    let d = Vec2::from_angle(h.axis) * 0.9;
                    let (a, b) = (pr.field(h.to - d), pr.field(h.to + d));
                    p.line_segment([a, b], Stroke::new(14.0, Color32::from_rgba_unmultiplied(255, 255, 255, 60)));
                    p.circle_stroke(pr.field(h.to), 0.35 * u, Stroke::new(2.5, style::with_alpha(GREEN, 0.8)));
                    if h.by != 0 {
                        let off = pav_core::games::surgery::field::angle_diff(h.angle, h.axis).to_degrees();
                        let txt = format!("{off:+.0}°");
                        style::outlined(
                            p,
                            c + vec2(40.0, -40.0),
                            Align2::LEFT_CENTER,
                            &txt,
                            36.0,
                            if off.abs() < 12.0 { GREEN } else { GOLD },
                        );
                        shell_rotate_hint(shell, p, c + vec2(40.0, 0.0));
                    }
                }
            }
            _ => {}
        }
        // Rings: laser and probe heat, with the green band.
        let heat_like = matches!(h.kind, K::Polyp | K::Ember | K::Nodule | K::Sac | K::Furnace);
        if heat_like && h.heat > 0.01 && h.count == 0 {
            let r = (h.r * u).max(26.0) + 16.0;
            let frost = h.kind == K::Ember || (h.kind == K::Furnace && h.stage == 0);
            p.circle_stroke(c, r, Stroke::new(8.0, Color32::from_black_alpha(150)));
            arc(p, c, r, 0.0, 0.77, 7.0, Color32::from_gray(70));
            arc(p, c, r, 0.615, 0.77, 7.0, GREEN);
            let fill = (h.heat / 1.3).clamp(0.0, 1.0);
            let col = if h.heat > 1.0 {
                RED
            } else if frost {
                Color32::from_rgb(150, 220, 255)
            } else {
                Color32::from_rgb(255, 170, 70)
            };
            arc(p, c, r, 0.0, fill, 7.0, col);
        }
        // Gel coverage.
        if h.accepts(Tool::Gel) {
            let r = (h.r * u).max(20.0) + 10.0;
            if h.progress > 0.0 {
                arc(p, pr.field(h.pos), r, 0.0, h.progress.clamp(0.0, 1.0), 6.0, Color32::from_rgb(120, 240, 200));
            }
        }
        // A sac swelling to burst.
        if h.kind == K::Sac && h.progress > 0.62 {
            let r = h.r * u + 10.0;
            p.circle_stroke(pr.field(h.pos), r, Stroke::new(3.0, style::with_alpha(RED, (h.progress - 0.6) * 2.0)));
        }
        // Scanner: how long what it found stays lit.
        if h.hidden && h.reveal > 0.0 {
            arc(p, pr.field(h.pos), h.r * u + 18.0, 0.0, (h.reveal / 8.0).clamp(0.0, 1.0), 3.5, Color32::from_rgb(120, 220, 255));
        }
        if guide || (hovered && valid) || (valid && h.required && f.guided) {
            let pulse = (time * 6.0).sin() * 0.25 + 0.75;
            let r = (h.r * u).max(18.0) + 8.0 + pulse * 6.0;
            let col = if guide { GOLD } else { Color32::WHITE };
            let target = if h.kind == K::Bleeder { pr.field(h.pos) } else { c };
            p.circle_stroke(target, r, Stroke::new(3.0, style::with_alpha(col, pulse)));
        }
    }
    // Dev overlays.
    if f.overlays != 0 {
        for h in &f.hazards {
            let c = pr.field(h.touch_point());
            let u = pr.scale(h.pos);
            if f.overlays & 1 != 0 {
                p.circle_stroke(pr.field(h.pos), h.r * u, Stroke::new(2.0, Color32::from_rgb(255, 90, 200)));
            }
            if f.overlays & 2 != 0 {
                if let Some(t) = h.wants() {
                    style::outlined(
                        p,
                        c + vec2(0.0, 24.0),
                        Align2::CENTER_CENTER,
                        t.name(),
                        26.0,
                        Color32::from_rgb(255, 170, 240),
                    );
                }
            }
            if f.overlays & 8 != 0 && h.accepts(tool) {
                p.circle_stroke(c, 1.2 * u, Stroke::new(1.5, Color32::from_rgb(120, 200, 255)));
            }
        }
        if f.overlays & 4 != 0 {
            // The on-beat window, around the R wave.
            let r = Rect::from_min_size(pr.rect.left_top() + vec2(520.0, 100.0), vec2(600.0, 16.0));
            p.rect_filled(r, 2.0, Color32::from_black_alpha(180));
            let w = 0.11 / (60.0 / f.bpm.max(20.0));
            p.rect_filled(Rect::from_min_size(r.min, vec2(600.0 * w, 16.0)), 2.0, GREEN);
            p.rect_filled(Rect::from_min_size(r.right_top() - vec2(600.0 * w, 0.0), vec2(600.0 * w, 16.0)), 2.0, GREEN);
            let x = r.min.x + 600.0 * f.beat;
            p.line_segment([pos2(x, r.min.y - 3.0), pos2(x, r.max.y + 3.0)], Stroke::new(3.0, Color32::WHITE));
        }
    }
    // Pings from the Scanner.
    for (at, t) in &f.pings {
        let k = (t / 0.8).clamp(0.0, 1.0);
        let c = pr.field(*at);
        let u = pr.scale(*at);
        p.circle_stroke(c, k * 3.2 * u, Stroke::new(3.0, style::with_alpha(Color32::from_rgb(120, 220, 255), 1.0 - k)));
    }
    // Cursors: a small reticle, and names in co-op.
    let many = f.surgeons.iter().filter(|s| s.present).count() > 1;
    for s in &f.surgeons {
        if !s.present || matches!(f.stage, Stage::Results | Stage::Dead) {
            continue;
        }
        let at = pr.field(s.cursor);
        let col = SEATS[s.slot as usize % 4];
        p.circle_stroke(at, 10.0, Stroke::new(3.0, Color32::from_black_alpha(170)));
        p.circle_stroke(at, 10.0, Stroke::new(2.0, col));
        if s.chain >= 2 {
            style::outlined(p, at + vec2(18.0, -26.0), Align2::LEFT_CENTER, &format!("{}×", s.chain), 34.0, GOLD);
        }
        if many {
            style::outlined(p, at + vec2(18.0, 20.0), Align2::LEFT_CENTER, &s.name, 28.0, col);
        }
        if s.tool == Tool::Gel {
            let r = Rect::from_min_size(at + vec2(-24.0, 20.0), vec2(48.0, 7.0));
            p.rect_filled(r, 3.0, Color32::from_black_alpha(170));
            p.rect_filled(
                Rect::from_min_size(r.min, vec2(48.0 * s.flow.clamp(0.0, 1.0), 7.0)),
                3.0,
                Color32::from_rgb(120, 240, 200),
            );
        }
        if s.tool == Tool::Iv && (s.iv_on || s.iv_cool > 0.0) {
            iv_gauge(p, pr, s);
        }
    }
    // The Dies Irae's sweep: a big warning.
    if let Some(r) = f.heat_ring {
        let c = pr.field(Vec2::new(0.0, 0.2));
        let u = pr.scale(Vec2::ZERO);
        p.circle_stroke(c, r * u, Stroke::new(5.0, Color32::from_rgb(255, 170, 70)));
    }
}

fn shell_rotate_hint(shell: &mut Shell, p: &Painter, at: Pos2) {
    let g = shell.glyphs();
    shell.prompted(g, Action::Rotate);
    glyphs::draw(p, at, 34.0, g, Action::Rotate);
}

fn iv_gauge(p: &Painter, pr: &Projector, s: &pav_core::games::surgery::frame::SurgeonView) {
    let c = pr.field(Vec2::new(8.3, 3.9));
    let r = Rect::from_min_size(c + vec2(-100.0, -86.0), vec2(200.0, 22.0));
    p.rect_filled(r, 6.0, Color32::from_black_alpha(190));
    // The green band: 75 to 100% of a dose.
    let w = r.width() / 1.25;
    p.rect_filled(Rect::from_min_size(r.min + vec2(w * 0.75, 0.0), vec2(w * 0.25, 22.0)), 2.0, style::with_alpha(GREEN, 0.7));
    let col = if s.dose > 1.0 { RED } else { Color32::WHITE };
    p.rect_filled(Rect::from_min_size(r.min, vec2(w * s.dose.clamp(0.0, 1.25), 22.0)), 4.0, style::with_alpha(col, 0.72));
    if s.iv_cool > 0.0 && !s.iv_on {
        style::outlined(p, r.center(), Align2::CENTER_CENTER, &format!("{:.0}", s.iv_cool.ceil()), 26.0, DIM);
    } else {
        style::outlined(p, r.center_top() - vec2(0.0, 18.0), Align2::CENTER_CENTER, "IV", 28.0, INK);
    }
}

fn popups(p: &Painter, pr: &Projector, f: &SurgeryFrame) {
    for q in &f.popups {
        let at = pr.field(q.pos) + vec2(0.0, -40.0 - q.age * 70.0);
        let a = (1.3 - q.age).clamp(0.0, 1.0);
        let punch = 1.0 + ((0.12 - q.age).max(0.0) / 0.12) * 0.4;
        let size = if q.rating == Rating::Immaculate { 58.0 } else { 46.0 } * punch;
        style::outlined(p, at, Align2::CENTER_CENTER, q.rating.word(), size, style::with_alpha(rating_color(q.rating), a));
        if q.on_beat {
            style::outlined(
                p,
                at + vec2(0.0, 44.0),
                Align2::CENTER_CENTER,
                "ON BEAT",
                34.0,
                style::with_alpha(Color32::from_rgb(140, 255, 220), a),
            );
        }
        if q.points > 0 {
            style::outlined(
                p,
                at + vec2(0.0, -40.0),
                Align2::CENTER_CENTER,
                &format!("+{}", q.points),
                30.0,
                style::with_alpha(INK, a),
            );
        }
    }
}

fn hud_top(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame, dt: f32) {
    // Backing strip.
    let strip = Rect::from_min_size(rect.min, vec2(rect.width(), 104.0));
    p.rect_filled(strip, 0.0, Color32::from_rgba_unmultiplied(4, 14, 18, 190));
    // Heart, pulsing on the beat, and the big number.
    let beat = if f.flat { 0.0 } else { (-f.beat * 6.0).exp() };
    let hc = rect.min + vec2(62.0, 52.0);
    let s = 24.0 + beat * 7.0;
    let color = if f.vitals < 25.0 { RED } else { Color32::from_rgb(240, 90, 90) };
    heart(p, hc, s, color);
    let v = f.vitals.max(0.0).ceil() as i32;
    style::outlined(
        p,
        hc + vec2(48.0, -2.0),
        Align2::LEFT_CENTER,
        &format!("{v}"),
        76.0,
        if f.vitals < 25.0 { RED } else { Color32::WHITE },
    );
    let bar = Rect::from_min_size(rect.min + vec2(204.0, 34.0), vec2(290.0, 36.0));
    p.rect_filled(bar, 8.0, Color32::from_black_alpha(190));
    let frac = (f.vitals / f.vitals_max.max(1.0)).clamp(0.0, 1.0);
    let bar_col = if f.vitals < 25.0 {
        RED
    } else if f.vitals < 50.0 {
        GOLD
    } else {
        GREEN
    };
    p.rect_filled(Rect::from_min_size(bar.min, vec2(bar.width() * frac, 36.0)), 8.0, bar_col);
    p.rect_stroke(bar, 8.0, Stroke::new(2.0, Color32::from_white_alpha(70)), StrokeKind::Inside);
    // The ECG: a live sweep; samples in, oldest out.
    ecg(shell, p, Rect::from_min_size(rect.min + vec2(520.0, 8.0), vec2(rect.width() - 520.0 - 280.0, 88.0)), f, dt);
    // The countdown.
    let t = f.timer.max(0.0);
    let txt = format!("{}:{:02}", (t / 60.0) as i32, (t as i32) % 60);
    let low = t < 30.0;
    style::outlined(
        p,
        rect.right_top() + vec2(-40.0, 52.0),
        Align2::RIGHT_CENTER,
        &txt,
        76.0,
        if low { RED } else { Color32::WHITE },
    );
    // The score: everyone's, in their seat's colour.
    let mut y = 132.0;
    for s in f.surgeons.iter().filter(|s| s.present) {
        let text = format!("{}", s.score);
        let many = f.surgeons.iter().filter(|x| x.present).count() > 1;
        let color = if many { SEATS[s.slot as usize % 4] } else { INK };
        style::outlined(p, rect.right_top() + vec2(-40.0, y), Align2::RIGHT_CENTER, &text, 38.0, color);
        y += 40.0;
    }
    // NOW: the one objective line.
    if matches!(f.stage, Stage::Op | Stage::OpStart) && !f.objective.is_empty() {
        let g = shell.glyphs();
        let c = rect.center_top() + vec2(0.0, 134.0);
        let w = (f.objective.chars().count() as f32 * 15.5 + 110.0).min(rect.width() - 200.0);
        let r = Rect::from_center_size(c, vec2(w, 48.0));
        p.rect_filled(r, 8.0, Color32::from_rgba_unmultiplied(4, 14, 18, 170));
        style::outlined(p, r.left_center() + vec2(16.0, 0.0), Align2::LEFT_CENTER, "NOW", 34.0, GOLD);
        style::outlined(p, r.left_center() + vec2(84.0, 0.0), Align2::LEFT_CENTER, &f.objective, 34.0, Color32::WHITE);
        let _ = g;
    }
}

fn heart(p: &Painter, c: Pos2, s: f32, color: Color32) {
    p.circle_filled(c + vec2(-s * 0.45, -s * 0.28), s * 0.56, color);
    p.circle_filled(c + vec2(s * 0.45, -s * 0.28), s * 0.56, color);
    p.add(egui::Shape::convex_polygon(
        vec![c + vec2(-s * 0.96, -s * 0.12), c + vec2(s * 0.96, -s * 0.12), c + vec2(0.0, s * 0.96)],
        color,
        Stroke::NONE,
    ));
}

fn ecg(shell: &mut Shell, p: &Painter, r: Rect, f: &SurgeryFrame, dt: f32) {
    let h = &mut shell.hud;
    if f.clock < h.last_time {
        h.trace.clear();
    }
    h.last_time = f.clock;
    h.clock += dt.max(0.0);
    let value = if f.flat { 0.0 } else { ecg_wave(f.beat) };
    // In a strain's meter the accent beat runs tall: the eye can count it.
    let accent = if f.meter > 0 && f.bar_beat == 0 { 1.22 } else { 1.0 };
    h.trace.push((h.clock, value * accent));
    let span = 3.2;
    let cut = h.clock - span;
    if h.trace.first().is_some_and(|s| s.0 < cut) {
        let keep = h.trace.partition_point(|s| s.0 < cut);
        h.trace.drain(..keep);
    }
    p.rect_filled(r, 8.0, Color32::from_rgba_unmultiplied(0, 24, 18, 200));
    // Grid.
    for k in 1..8 {
        let x = r.min.x + r.width() * k as f32 / 8.0;
        p.line_segment([pos2(x, r.min.y), pos2(x, r.max.y)], Stroke::new(1.0, Color32::from_rgba_unmultiplied(70, 180, 120, 26)));
    }
    let mid = r.center().y + r.height() * 0.18;
    let amp = r.height() * 0.58;
    let color = if f.flat { Color32::from_rgb(230, 80, 70) } else { GREEN };
    let pts: Vec<Pos2> = h.trace.iter().map(|(t, v)| pos2(r.max.x - (h.clock - t) / span * r.width(), mid - v * amp)).collect();
    if pts.len() >= 2 {
        p.add(egui::Shape::line(pts.clone(), Stroke::new(7.0, Color32::from_rgba_unmultiplied(60, 240, 150, 40))));
        p.add(egui::Shape::line(pts, Stroke::new(3.0, color)));
    }
    // The bpm and the meter.
    let label = if f.meter > 0 {
        format!("{} bpm · {}/{}", f.bpm.round(), f.meter, if f.meter == 6 || f.meter == 7 { 8 } else { 4 })
    } else {
        format!("{} bpm", f.bpm.round())
    };
    style::outlined(p, r.left_top() + vec2(10.0, 24.0), Align2::LEFT_CENTER, &label, 32.0, if f.meter > 0 { GOLD } else { INK });
}

fn tray_labels(shell: &mut Shell, p: &Painter, pr: &Projector, rect: Rect, f: &SurgeryFrame) {
    if !matches!(f.stage, Stage::Op | Stage::OpStart | Stage::Code | Stage::Complete) {
        return;
    }
    let g = shell.glyphs();
    let selected = f.surgeons.first().map(|s| s.tool);
    let dirs: [Vec2; 8] = [
        Vec2::new(0.0, -1.0),
        Vec2::new(0.7, -0.7),
        Vec2::new(1.0, 0.0),
        Vec2::new(0.7, 0.7),
        Vec2::new(0.0, 1.0),
        Vec2::new(-0.7, 0.7),
        Vec2::new(-1.0, 0.0),
        Vec2::new(-0.7, -0.7),
    ];
    for (i, tool) in f.ring.iter().enumerate() {
        let at = pr.at(Vec3::new(tray_x(i), 1.0, 6.05));
        let sel = selected == Some(*tool);
        // The hint: a flick direction on a pad, a digit on keys.
        let hint = at + vec2(-58.0, -2.0);
        if g.device == Device::Gamepad {
            p.circle_filled(hint, 19.0, Color32::from_rgba_unmultiplied(0, 0, 0, 190));
            let d = dirs[i];
            arrow(p, hint - vec2(d.x, d.y) * 8.0, hint + vec2(d.x, d.y) * 12.0, if sel { GOLD } else { INK }, 3.0);
        } else {
            let k = Rect::from_center_size(hint, vec2(32.0, 32.0));
            p.rect_filled(k, 6.0, Color32::from_rgb(232, 236, 236));
            p.text(k.center(), Align2::CENTER_CENTER, format!("{}", i + 1), style::font(26.0), Color32::from_rgb(24, 28, 32));
        }
        let name = short_name(*tool);
        let c = if sel { GOLD } else { INK };
        style::outlined(p, at + vec2(-32.0, -2.0), Align2::LEFT_CENTER, name, 30.0, c);
        if sel {
            p.rect_filled(Rect::from_center_size(at + vec2(10.0, 20.0), vec2(120.0, 5.0)), 2.0, GOLD);
        }
    }
    // The gift meter, on the tray's right.
    if let Some(s) = f.surgeons.first() {
        if f.gift_awake {
            gift_meter(shell, p, rect, f, s);
        }
    }
    // One line of prompts, top of the tray.
    let y = rect.max.y - 158.0;
    if matches!(f.stage, Stage::Op) {
        let mut x = rect.min.x + 280.0;
        let tool = selected.unwrap_or(Tool::Scalpel);
        let (label, a) = (use_word(tool), Action::Use);
        shell.prompted(g, a);
        x = glyphs::labeled(p, pos2(x, y), 34.0, g, a, label, INK);
        shell.prompted(g, Action::Pick);
        x = glyphs::labeled(p, pos2(x, y), 34.0, g, Action::Pick, "Instrument", INK);
        shell.prompted(g, Action::Cancel);
        x = glyphs::labeled(p, pos2(x, y), 34.0, g, Action::Cancel, "Let go", INK);
        shell.prompted(g, Action::Chart);
        glyphs::labeled(p, pos2(x, y), 34.0, g, Action::Chart, "Chart", INK);
    }
}

fn use_word(t: Tool) -> &'static str {
    match t {
        Tool::Scalpel => "Cut",
        Tool::Forceps => "Grab and pull",
        Tool::Suture => "Stitch",
        Tool::Suction => "Suction",
        Tool::Laser => "Burn",
        Tool::Gel => "Paint",
        Tool::Scanner => "Sweep",
        Tool::Iv => "Push",
        Tool::Cryo => "Freeze",
        Tool::Dressing => "Dress",
        Tool::Defib => "Charge",
    }
}

fn short_name(t: Tool) -> &'static str {
    match t {
        Tool::Iv => "IV",
        Tool::Cryo => "Cryo",
        other => other.name(),
    }
}

fn gift_meter(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame, s: &pav_core::games::surgery::frame::SurgeonView) {
    let g = shell.glyphs();
    let name = if f.duet || (f.case_no == 7) {
        "DUET"
    } else if s.gift_kind == 1 {
        "ECHO"
    } else {
        "HUSH"
    };
    let c = rect.right_bottom() - vec2(150.0, 208.0);
    let r = 62.0;
    p.circle_filled(c, r + 6.0, Color32::from_black_alpha(190));
    let frac = (s.gift / 100.0).clamp(0.0, 1.0);
    let beat = (-f.beat * 5.0).exp();
    arc(p, c, r, 0.0, 1.0, 11.0, Color32::from_gray(50));
    let col = if s.gift_kind == 1 { Color32::from_rgb(150, 220, 255) } else { Color32::from_rgb(214, 200, 255) };
    arc(p, c, r, 0.0, frac, 11.0, col);
    style::outlined(p, c - vec2(0.0, 14.0), Align2::CENTER_CENTER, name, 34.0, if s.gift_ready { Color32::WHITE } else { DIM });
    if s.gift_ready {
        p.circle_stroke(c, r + 12.0 + beat * 10.0, Stroke::new(4.0, style::with_alpha(col, 0.4 + beat * 0.5)));
        shell.prompted(g, Action::Gift);
        glyphs::draw(p, c + vec2(-20.0, 24.0), 40.0, g, Action::Gift);
        let msg = if s.gift_hold { "Release on the beat!" } else { "Hold, then release on the beat" };
        style::outlined(p, c + vec2(-90.0, -92.0), Align2::RIGHT_CENTER, msg, 34.0, Color32::WHITE);
    }
}

fn cameo_line(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame) {
    let Some(sub) = &f.subtitle else { return };
    let a = ((5.0 - sub.age) * 3.0).clamp(0.0, 1.0);
    let box_r = Rect::from_min_size(rect.left_bottom() + vec2(30.0, -338.0), vec2(740.0, 134.0));
    p.rect_filled(box_r, 10.0, style::with_alpha(Color32::from_rgb(4, 14, 18), 0.8 * a));
    let cam = Rect::from_min_size(box_r.min + vec2(8.0, 8.0), vec2(118.0, 118.0));
    super::story::cameo(shell, p, cam, &sub.who, "neutral", sub.age < 1.4 && (sub.age * 11.0).sin() > 0.0);
    let content = pav_core::games::surgery::content::get();
    let (title, accent) = content
        .rigs
        .get(&*sub.who)
        .map(|r| (r.title.clone(), Color32::from_rgb(r.accent[0], r.accent[1], r.accent[2])))
        .unwrap_or((sub.who.to_string(), INK));
    style::outlined(p, box_r.min + vec2(140.0, 26.0), Align2::LEFT_CENTER, &title, 30.0, style::with_alpha(accent, a));
    style::wrapped(
        p,
        box_r.min + vec2(140.0, 46.0),
        box_r.width() - 156.0,
        &sub.text,
        32.0,
        style::with_alpha(Color32::WHITE, a),
    );
}

fn fever(p: &Painter, rect: Rect, f: &SurgeryFrame) {
    if let Some(v) = f.fever {
        let at = rect.min + vec2(30.0, 168.0);
        style::outlined(p, at + vec2(0.0, 22.0), Align2::LEFT_CENTER, "FEVER", 34.0, Color32::from_rgb(255, 170, 70));
        let bar = Rect::from_min_size(at + vec2(96.0, 6.0), vec2(366.0, 32.0));
        p.rect_filled(bar, 8.0, Color32::from_black_alpha(190));
        let col = if v > 100.0 { RED } else { Color32::from_rgb(255, 150, 60) };
        p.rect_filled(Rect::from_min_size(bar.min, vec2(bar.width() * (v / 100.0).clamp(0.0, 1.0), 32.0)), 8.0, col);
    }
    // The count-in: "lift off" is a rhythm.
    if f.ring_in > 0 && f.ring_in <= 2 {
        let c = rect.center() + vec2(0.0, -200.0);
        let beat = (-f.beat * 4.0).exp();
        let text = if f.ring_in == 1 { "LIFT OFF!" } else { "RING COMING" };
        style::outlined(p, c, Align2::CENTER_CENTER, text, 70.0 + beat * 16.0, Color32::from_rgb(255, 180, 90));
    }
}

fn code(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame, c: &pav_core::games::surgery::frame::CodeView) {
    let g = shell.glyphs();
    let center = rect.center();
    p.rect_filled(rect, 0.0, Color32::from_rgba_unmultiplied(40, 0, 0, 120));
    if !c.scripted {
        style::outlined(p, center + vec2(0.0, -330.0), Align2::CENTER_CENTER, &format!("{:.1}", c.left.max(0.0)), 110.0, RED);
    }
    let track = Rect::from_center_size(center + vec2(0.0, -120.0), vec2(1100.0, 120.0));
    p.rect_filled(track, 10.0, Color32::from_black_alpha(200));
    // The flat line, the centre mark, the ghost beat crossing.
    p.line_segment([track.left_center(), track.right_center()], Stroke::new(3.0, Color32::from_rgb(230, 80, 70)));
    let mid_x = track.center().x;
    p.line_segment([pos2(mid_x, track.min.y), pos2(mid_x, track.max.y)], Stroke::new(4.0, GOLD));
    let zone = Rect::from_center_size(track.center(), vec2(track.width() * 0.25, track.height()));
    p.rect_filled(zone, 0.0, style::with_alpha(GREEN, 0.12));
    let x = track.min.x + track.width() * c.ghost;
    let col = Color32::from_rgb(190, 235, 255);
    let n = 40;
    let pts: Vec<Pos2> = (0..=n)
        .map(|k| {
            let t = k as f32 / n as f32 - 0.5;
            pos2(x + t * 200.0, track.center().y - ecg_wave(t * 0.6) * 48.0)
        })
        .filter(|q| q.x > track.min.x && q.x < track.max.x)
        .collect();
    if pts.len() > 1 {
        p.add(egui::Shape::line(pts, Stroke::new(5.0, col)));
    }
    // Charge.
    let charge = f.surgeons.iter().map(|s| s.charge).fold(0.0f32, f32::max);
    let bar = Rect::from_center_size(center + vec2(0.0, 12.0), vec2(620.0, 40.0));
    p.rect_filled(bar, 10.0, Color32::from_black_alpha(200));
    p.rect_filled(
        Rect::from_min_size(bar.min, vec2(bar.width() * charge, 40.0)),
        10.0,
        if charge >= 1.0 { GREEN } else { Color32::from_rgb(150, 210, 255) },
    );
    let msg = if charge >= 1.0 { "CHARGED: release on the line" } else { "Hold to charge" };
    shell.prompted(g, Action::Defib);
    let w = glyphs::draw(p, center + vec2(-280.0, 86.0), 56.0, g, Action::Defib);
    style::outlined(p, center + vec2(-280.0 + w + 16.0, 86.0), Align2::LEFT_CENTER, msg, 50.0, Color32::WHITE);
    if c.shocks > 1 {
        style::outlined(p, center + vec2(0.0, 160.0), Align2::CENTER_CENTER, &format!("{} shocks to go", c.shocks), 44.0, GOLD);
    }
}

fn banner(p: &Painter, rect: Rect, text: &str, age: f32) {
    let in_t = (age / 0.18).clamp(0.0, 1.0);
    let out = ((2.6 - age) / 0.5).clamp(0.0, 1.0);
    let a = in_t * out;
    let w = rect.width();
    // The big ones stop play for a moment; the rest mustn't cover the hands.
    let big = text.starts_with("OPERATION") || text.starts_with("PATIENT") || text == "CODE";
    if big {
        let c = rect.center() + vec2(0.0, -40.0);
        let size = 110.0 + (1.0 - in_t) * 60.0;
        p.rect_filled(
            Rect::from_center_size(c, vec2(w, 160.0)),
            0.0,
            Color32::from_rgba_unmultiplied(0, 0, 0, (150.0 * a) as u8),
        );
        style::outlined(p, c, Align2::CENTER_CENTER, text, size, style::with_alpha(Color32::WHITE, a));
    } else {
        let c = rect.center_top() + vec2(0.0, 214.0);
        let size = 64.0 + (1.0 - in_t) * 30.0;
        p.rect_filled(Rect::from_center_size(c, vec2(w, 84.0)), 0.0, Color32::from_rgba_unmultiplied(0, 0, 0, (110.0 * a) as u8));
        style::outlined(p, c, Align2::CENTER_CENTER, text, size, style::with_alpha(GOLD, a));
    }
}

fn chart_overlay(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame) {
    let content = pav_core::games::surgery::content::get();
    let Some(case) = content.case(f.case_no) else { return };
    let r = Rect::from_center_size(rect.center(), vec2(980.0, 560.0));
    p.rect_filled(r, 12.0, style::PAPER);
    let ink = style::PAPER_INK;
    let mut y = r.min.y + 28.0;
    let x = r.min.x + 40.0;
    style::plain(p, pos2(x, y), Align2::LEFT_TOP, &format!("{}: {}", case.name, case.patient), 48.0, ink);
    y += 76.0;
    y = style::wrapped(p, pos2(x, y), r.width() - 80.0, &case.diagnosis, 34.0, ink) + 18.0;
    let phase = case.phase.get(f.phase as usize);
    if let Some(ph) = phase {
        style::plain(
            p,
            pos2(x, y),
            Align2::LEFT_TOP,
            &format!("Phase {} of {}: {}", f.phase + 1, case.phase.len(), ph.name),
            36.0,
            ink,
        );
        y += 56.0;
    }
    let left = f.hazards.iter().filter(|h| h.required && (!h.hidden || h.reveal > 0.0)).count();
    style::plain(p, pos2(x, y), Align2::LEFT_TOP, &format!("Tasks in view: {left}"), 36.0, ink);
    y += 56.0;
    let hidden = f.hazards.iter().any(|h| h.hidden && h.reveal <= 0.0);
    if hidden {
        style::plain(p, pos2(x, y), Align2::LEFT_TOP, "Something on the film is not in view. Scanner.", 36.0, style::RED);
    }
    let g = shell.glyphs();
    shell.prompted(g, Action::Chart);
    glyphs::labeled(p, r.left_bottom() + vec2(40.0, -40.0), 36.0, g, Action::Chart, "Close", ink);
}
