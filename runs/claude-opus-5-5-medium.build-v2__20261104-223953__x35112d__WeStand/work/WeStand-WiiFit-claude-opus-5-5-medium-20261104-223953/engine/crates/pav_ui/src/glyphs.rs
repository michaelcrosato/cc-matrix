//! PlayStation, Xbox and keyboard-and-mouse prompts, drawn with the painter. One function says
//! what a prompt shows: `prompt(action, device, xbox)`.

use super::*;

#[derive(Clone, Copy, Debug)]
pub struct Style {
    pub device: Device,
    pub mouse: bool,
    pub xbox: bool,
}

#[derive(Clone, Copy, Debug)]
pub struct Sp {
    pub(super) k: f32,
    pub(super) ox: f32,
    pub(super) oy: f32,
}

impl From<Space> for Sp {
    fn from(s: Space) -> Self {
        Sp { k: s.k, ox: s.ox, oy: s.oy }
    }
}

/// What a prompt shows.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Shown {
    /// A round face button: its shape (or Xbox letter) and colour.
    Cross,
    Circle,
    Square,
    Triangle,
    Letter(&'static str, [u8; 3]),
    /// A shoulder or menu pill, a stick or D-pad, a keycap.
    Pill(&'static str),
    Stick(&'static str),
    Key(&'static str),
    /// A little mouse: left button, right button, both, or movement.
    Mouse(u8),
}

/// The one mapping from action, device and glyph setting to what is shown.
pub fn prompt(g: Glyph, device: Device, mouse: bool, xbox: bool) -> Shown {
    use Shown::*;
    match device {
        Device::KeyboardMouse | Device::Touch => {
            if mouse {
                match g {
                    Glyph::Confirm | Glyph::StepL => return Mouse(0),
                    Glyph::Back | Glyph::StepR => return Mouse(1),
                    Glyph::Brace => return Mouse(2),
                    Glyph::Lean => return Mouse(3),
                    Glyph::Move => return Mouse(0),
                    Glyph::Camera => return Mouse(1),
                    _ => {}
                }
            }
            match g {
                Glyph::Confirm => Key("Space"),
                Glyph::Back => Key("Esc"),
                Glyph::Wave => Key("F"),
                Glyph::Schedule => Key("Tab"),
                Glyph::Pause => Key("Esc"),
                Glyph::StepL => Key("Q"),
                Glyph::StepR => Key("E"),
                Glyph::Brace => Key("Q + E"),
                Glyph::Lean | Glyph::Move => Key("W A S D"),
                Glyph::Camera => Mouse(1),
                Glyph::Tabs => Key("Q  E"),
                Glyph::Jog => Key("Shift"),
            }
        }
        Device::Gamepad => match (g, xbox) {
            (Glyph::Confirm, false) => Cross,
            (Glyph::Confirm, true) => Letter("A", [0x5c, 0xb8, 0x5c]),
            (Glyph::Back, false) => Circle,
            (Glyph::Back, true) => Letter("B", [0xe0, 0x5a, 0x4f]),
            (Glyph::Wave, false) => Square,
            (Glyph::Wave, true) => Letter("X", [0x4f, 0x8f, 0xe0]),
            (Glyph::Schedule, false) => Triangle,
            (Glyph::Schedule, true) => Letter("Y", [0xe6, 0xc0, 0x3c]),
            (Glyph::Pause, false) => Pill("Options"),
            (Glyph::Pause, true) => Pill("Menu"),
            (Glyph::StepL, false) => Pill("L1"),
            (Glyph::StepL, true) => Pill("LB"),
            (Glyph::StepR, false) => Pill("R1"),
            (Glyph::StepR, true) => Pill("RB"),
            (Glyph::Brace, false) => Pill("L1 + R1"),
            (Glyph::Brace, true) => Pill("LB + RB"),
            (Glyph::Tabs, false) => Pill("L1  R1"),
            (Glyph::Tabs, true) => Pill("LB  RB"),
            (Glyph::Jog, false) => Pill("R2"),
            (Glyph::Jog, true) => Pill("RT"),
            (Glyph::Lean | Glyph::Move, _) => Stick("L"),
            (Glyph::Camera, _) => Stick("R"),
        },
    }
}

fn fnt(sp: &Sp, s: f32) -> FontId {
    FontId::new(s * sp.k, FontFamily::Name(BODY_FONT.into()))
}

fn tw(p: &Painter, sp: &Sp, s: &str, size: f32) -> f32 {
    p.layout_no_wrap(s.to_string(), fnt(sp, size), Color32::WHITE).size().x / sp.k.max(1e-3)
}

pub fn width(p: &Painter, sp: &Sp, g: Glyph, st: &Style, size: f32) -> f32 {
    match prompt(g, st.device, st.mouse, st.xbox) {
        Shown::Key(s) | Shown::Pill(s) => tw(p, sp, s, size * 0.8) + size * 0.8,
        _ => size * 1.3,
    }
}

pub fn draw(p: &Painter, sp: &Sp, at: [f32; 2], g: Glyph, st: &Style, size: f32) {
    let s = size * 1.3;
    let pt = |x: f32, y: f32| pos2(sp.ox + x * sp.k, sp.oy + y * sp.k);
    let center = pt(at[0] + s * 0.5, at[1] + s * 0.5);
    let r = s * 0.5 * sp.k;
    let ink = Color32::from_rgb(0x26, 0x3e, 0x54);
    let centered = |t: &str, c0: Pos2, col: Color32, size: f32| {
        p.text(c0, Align2::CENTER_CENTER, t, fnt(sp, size), col);
    };
    match prompt(g, st.device, st.mouse, st.xbox) {
        Shown::Cross | Shown::Circle | Shown::Square | Shown::Triangle => {
            p.circle_filled(center, r, ink);
            let stroke = |col: [u8; 3]| Stroke::new(r * 0.16, Color32::from_rgb(col[0], col[1], col[2]));
            let m = r * 0.48;
            match prompt(g, st.device, st.mouse, st.xbox) {
                Shown::Cross => {
                    let st0 = stroke([0x8f, 0xb8, 0xee]);
                    p.line_segment([center + vec2(-m, -m), center + vec2(m, m)], st0);
                    p.line_segment([center + vec2(-m, m), center + vec2(m, -m)], st0);
                }
                Shown::Circle => {
                    p.circle_stroke(center, m, stroke([0xf0, 0x8a, 0x90]));
                }
                Shown::Square => {
                    p.rect_stroke(Rect::from_center_size(center, vec2(m * 1.7, m * 1.7)), 0.0, stroke([0xd9, 0x9a, 0xd9]), StrokeKind::Middle);
                }
                _ => {
                    let a = center + vec2(0.0, -m * 1.05);
                    let b = center + vec2(m, m * 0.8);
                    let c0 = center + vec2(-m, m * 0.8);
                    let t = stroke([0x6e, 0xd6, 0xb0]);
                    p.line_segment([a, b], t);
                    p.line_segment([b, c0], t);
                    p.line_segment([c0, a], t);
                }
            }
        }
        Shown::Letter(l, col) => {
            p.circle_filled(center, r, Color32::from_rgb(col[0], col[1], col[2]));
            centered(l, center, Color32::WHITE, size * 0.86);
        }
        Shown::Pill(t) => {
            let w = tw(p, sp, t, size * 0.8) + size * 0.8;
            let rc = Rect::from_min_size(pt(at[0], at[1] + s * 0.08), vec2(w * sp.k, s * 0.84 * sp.k));
            p.rect_filled(rc, r * 0.7, ink);
            centered(t, rc.center(), Color32::WHITE, size * 0.8);
        }
        Shown::Key(t) => {
            let w = tw(p, sp, t, size * 0.8) + size * 0.8;
            let rc = Rect::from_min_size(pt(at[0], at[1] + s * 0.06), vec2(w * sp.k, s * 0.84 * sp.k));
            p.rect_filled(rc.translate(vec2(0.0, r * 0.14)), r * 0.3, ink);
            p.rect_filled(rc, r * 0.3, Color32::WHITE);
            p.rect_stroke(rc, r * 0.3, Stroke::new(r * 0.08, ink), StrokeKind::Inside);
            centered(t, rc.center(), ink, size * 0.8);
        }
        Shown::Stick(t) => {
            p.circle_filled(center, r, ink);
            p.circle_stroke(center, r * 0.68, Stroke::new(r * 0.1, Color32::WHITE));
            centered(t, center, Color32::WHITE, size * 0.62);
        }
        Shown::Mouse(b) => {
            let rc = Rect::from_center_size(center, vec2(r * 1.3, r * 1.9));
            p.rect_filled(rc, r * 0.6, Color32::WHITE);
            let teal = Color32::from_rgb(0x46, 0xbe, 0xc8);
            let half = |left: bool| Rect::from_min_size(if left { rc.min } else { pos2(rc.center().x, rc.min.y) }, vec2(rc.width() * 0.5, rc.height() * 0.44));
            if b == 0 || b == 2 {
                p.rect_filled(half(true), r * 0.3, teal);
            }
            if b == 1 || b == 2 {
                p.rect_filled(half(false), r * 0.3, teal);
            }
            if b == 3 {
                p.circle_filled(center, r * 0.22, teal);
            }
            p.rect_stroke(rc, r * 0.6, Stroke::new(r * 0.1, ink), StrokeKind::Inside);
            p.line_segment([pos2(rc.center().x, rc.min.y), pos2(rc.center().x, rc.min.y + rc.height() * 0.44)], Stroke::new(r * 0.07, ink));
        }
    }
}
