//! Whiff Fit's whole UI: draws a `UiFrame` at a virtual 1920x1080, scaled to fit, on egui's
//! painter (no default windows), and says what the pointer did. The window and the headless
//! tools draw it with this same code, so captures show the real thing.

use egui::epaint::{Shadow, TextShape};
use egui::text::LayoutJob;
use egui::{Color32, CornerRadius, FontData, FontDefinitions, FontFamily, FontId, Painter, Pos2, Rect, Shape, Stroke, StrokeKind, Vec2, pos2, vec2};
use glam::{Mat4, Vec3};
use pav_core::games::fit::ui_model::*;
use pav_core::input::UiEvent;

use crate::Device;
pub use crate::glyphs::{Glyph, MouseBit, glyph_name, prompt};

const TITLE: &str = "Fredoka";
const BODY: &str = "Nunito";

/// Puts the game's fonts in `ctx`. Call before the context's first pass: a family used in the
/// pass that installs it panics.
pub fn install_fonts(ctx: &egui::Context) {
    let mut f = FontDefinitions::default();
    f.font_data.insert(TITLE.into(), FontData::from_static(include_bytes!("../fonts/Fredoka_600SemiBold.ttf")).into());
    f.font_data.insert(BODY.into(), FontData::from_static(include_bytes!("../fonts/Nunito_700Bold.ttf")).into());
    f.families.insert(FontFamily::Name(TITLE.into()), vec![TITLE.into(), BODY.into()]);
    f.families.insert(FontFamily::Name(BODY.into()), vec![BODY.into()]);
    ctx.set_fonts(f);
}

/// What the player's using, as far as prompts care.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub struct Input {
    pub device: Device,
    /// On keyboard and mouse: the mouse moved or clicked last.
    pub mouse: bool,
}

/// What the pointer did and what is on screen.
#[derive(Clone, Debug, Default)]
pub struct Output {
    pub event: Option<UiEvent>,
    /// The pointer is on an item, so a click there isn't for the game.
    pub over_item: bool,
    /// Items in window points: id, rect, label.
    pub rects: Vec<(u16, [f32; 4], String)>,
    /// `Glyph:label` of every prompt drawn.
    pub prompts: Vec<String>,
}

pub(crate) struct View<'a> {
    pub(crate) p: Painter,
    pub(crate) s: f32,
    o: Vec2,
    vp: Mat4,
    screen: Vec2,
    input: Input,
    xbox: bool,
    prompts: &'a mut Vec<String>,
}

pub(crate) fn c(rgba: Rgba) -> Color32 {
    Color32::from_rgba_unmultiplied(rgba[0], rgba[1], rgba[2], rgba[3])
}

fn title_font(size: f32) -> FontId {
    FontId::new(size, FontFamily::Name(TITLE.into()))
}
fn body_font(size: f32) -> FontId {
    FontId::new(size, FontFamily::Name(BODY.into()))
}

impl View<'_> {
    fn pt(&self, x: f32, y: f32) -> Pos2 {
        pos2(self.o.x + x * self.s, self.o.y + y * self.s)
    }
    fn rect(&self, r: &[f32; 4]) -> Rect {
        Rect::from_min_size(self.pt(r[0], r[1]), vec2(r[2] * self.s, r[3] * self.s))
    }
    fn radius(&self, r: f32) -> CornerRadius {
        CornerRadius::same((r * self.s).clamp(0.0, 200.0) as u8)
    }
    pub(crate) fn text(&self, at: Pos2, size: f32, font: Font, color: Color32, align: Align, wrap: f32, text: &str) {
        let id = match font {
            Font::Title => title_font(size * self.s),
            Font::Body => body_font(size * self.s),
        };
        let mut job = LayoutJob::simple(text.to_string(), id, color, if wrap > 0.0 { wrap * self.s } else { f32::INFINITY });
        job.halign = match align {
            Align::Left => egui::Align::LEFT,
            Align::Center => egui::Align::Center,
            Align::Right => egui::Align::RIGHT,
        };
        let galley = self.p.fonts_mut(|f| f.layout_job(job));
        self.p.add(TextShape::new(at, galley, color));
    }
    fn project(&self, w: Vec3) -> Option<Pos2> {
        let h = self.vp * w.extend(1.0);
        if h.w <= 0.01 {
            return None;
        }
        let n = h.truncate() / h.w;
        Some(pos2((n.x * 0.5 + 0.5) * self.screen.x, (0.5 - n.y * 0.5) * self.screen.y))
    }

    fn label_width(&self, label: &str, size: f32) -> f32 {
        if label.is_empty() {
            return 0.0;
        }
        let font = body_font(size * 0.92 * self.s);
        self.p.fonts_mut(|f| f.layout_no_wrap(label.to_string(), font, Color32::WHITE)).size().x
    }

    fn prompt_row(&mut self, y: f32, items: &[(Act, String)]) {
        let size = 40.0;
        let gap = size * 0.25 * self.s;
        let between = 44.0 * self.s;
        let widths: Vec<f32> = items.iter().map(|(a, l)| self.glyph_width(prompt(*a, self.input, self.xbox), size) + gap + self.label_width(l, size)).collect();
        let total = widths.iter().sum::<f32>() + between * (items.len().max(1) - 1) as f32;
        let at = self.pt(960.0, y);
        let pad = 34.0 * self.s;
        let rect = Rect::from_center_size(at, vec2(total + pad * 2.0, 76.0 * self.s));
        self.p.rect_filled(rect, self.radius(38.0), Color32::from_rgba_unmultiplied(255, 255, 255, 232));
        let mut x = rect.min.x + pad;
        for ((a, l), w) in items.iter().zip(widths) {
            self.prompt(pos2(x, at.y), size, *a, l, c(INK), Align::Left);
            x += w + between;
        }
    }

    /// A glyph and its label at a point; returns nothing, draws both.
    fn prompt(&mut self, at: Pos2, size: f32, act: Act, label: &str, color: Color32, align: Align) {
        let g = prompt(act, self.input, self.xbox);
        self.prompts.push(format!("{}:{label}", glyph_name(g)));
        let mut x = at;
        if align == Align::Right {
            x.x -= (label.chars().count() as f32 * size * 0.55 + size * 1.3) * self.s;
        } else if align == Align::Center {
            x.x -= (label.chars().count() as f32 * size * 0.55 + size * 1.3) * self.s * 0.5;
        }
        let w = self.glyph(x, g, size);
        if !label.is_empty() {
            let y = x.y - size * 0.62 * self.s;
            self.text(pos2(x.x + w + size * 0.25 * self.s, y), size * 0.92, Font::Body, color, Align::Left, 0.0, label);
        }
    }

    fn star(&self, center: Pos2, r: f32, fill: Color32) {
        let mut pts = Vec::new();
        for i in 0..10 {
            let a = -std::f32::consts::FRAC_PI_2 + i as f32 * std::f32::consts::TAU / 10.0;
            let rr = if i % 2 == 0 { r } else { r * 0.46 };
            pts.push(center + vec2(a.cos() * rr, a.sin() * rr));
        }
        // A fan of triangles: the star isn't convex.
        let mut shapes = Vec::new();
        for i in 0..10 {
            shapes.push(Shape::convex_polygon(vec![center, pts[i], pts[(i + 1) % 10]], fill, Stroke::NONE));
        }
        self.p.extend(shapes);
    }

    fn puck(&self, k: &Puck) {
        let center = self.pt(k.c[0], k.c[1]);
        let r = k.r * self.s;
        let at = |u: f32, v: f32| center + vec2(u * r * 0.86, -v * r * 0.86);
        self.p.add(Shadow { offset: [0, 6], blur: 28, spread: 2, color: Color32::from_black_alpha(50) }.as_shape(Rect::from_center_size(center, vec2(r * 2.0, r * 2.0)), CornerRadius::same(r.min(250.0) as u8)));
        self.p.circle_filled(center, r, Color32::from_rgb(248, 250, 248));
        let rim = c(TEAL).lerp_to_gamma(c(CORAL), k.danger);
        self.p.circle_stroke(center, r, Stroke::new(r * 0.05, rim));
        self.p.circle_stroke(center, r * 0.86, Stroke::new(r * 0.012, Color32::from_rgb(210, 222, 226)));
        self.p.line_segment([center + vec2(-r * 0.86, 0.0), center + vec2(r * 0.86, 0.0)], Stroke::new(r * 0.008, Color32::from_rgb(220, 230, 232)));
        self.p.line_segment([center + vec2(0.0, -r * 0.86), center + vec2(0.0, r * 0.86)], Stroke::new(r * 0.008, Color32::from_rgb(220, 230, 232)));
        let mint = c(MINT);
        if let Some(b) = k.band {
            let w = b * r * 0.86;
            self.p.rect_filled(Rect::from_center_size(center, vec2(w * 2.0, r * 1.5)), w * 0.3, mint.gamma_multiply(0.45));
        }
        if let Some([x, y, rad]) = k.ring {
            let ring = at(x, y);
            let rr = rad * r * 0.86;
            let col = if k.good { mint } else { Color32::from_rgb(170, 214, 200) };
            self.p.circle_filled(ring, rr, col.gamma_multiply(0.28));
            self.p.circle_stroke(ring, rr, Stroke::new(r * 0.035, col));
        }
        if let Some([x, y]) = k.mark {
            self.p.circle_stroke(at(x, y), r * 0.12, Stroke::new(r * 0.03, c(SUN)));
        }
        if k.trace.len() > 1 {
            let pts: Vec<Pos2> = k.trace.iter().map(|p| at(p[0], p[1])).collect();
            self.p.add(Shape::line(pts, Stroke::new(r * 0.012, c(TEAL).gamma_multiply(0.6))));
        }
        if let Some([x, y]) = k.ghost {
            self.p.circle_filled(at(x, y), r * 0.075, Color32::from_rgba_unmultiplied(120, 150, 170, 150));
        }
        let dot = at(k.dot[0].clamp(-1.15, 1.15), k.dot[1].clamp(-1.15, 1.15));
        self.p.circle_filled(dot, r * 0.1, c(CORAL));
        self.p.circle_stroke(dot, r * 0.1, Stroke::new(r * 0.016, Color32::WHITE));
        for i in 0..k.streak.min(4) {
            let a = -2.2 + i as f32 * 0.42;
            self.star(center + vec2(a.cos() * r * 1.12, a.sin() * r * 1.12), r * 0.11, c(SUN));
        }
    }

    fn item(&self, it: &Item) {
        let k = if it.focused { 1.03 + 0.03 * it.bounce } else { 1.0 };
        let base = self.rect(&it.r);
        let rect = Rect::from_center_size(base.center(), base.size() * k);
        let radius = self.radius(28.0);
        let locked = it.kind == ItemKind::Locked;
        self.p.add(Shadow { offset: [0, 4], blur: 16, spread: 0, color: Color32::from_black_alpha(28) }.as_shape(rect, radius));
        let fill = if locked {
            Color32::from_rgb(232, 236, 238)
        } else if it.focused {
            Color32::from_rgb(232, 250, 248)
        } else {
            Color32::WHITE
        };
        self.p.rect_filled(rect, radius, fill);
        if it.focused {
            self.p.rect_stroke(rect, radius, Stroke::new(8.0 * self.s, c(TEAL)), StrokeKind::Outside);
        }
        let ink = if locked { c(INK_SOFT) } else { c(INK) };
        let tall = it.r[3] > 180.0;
        let pad = 34.0 * self.s;
        let label_size = if tall { 56.0 } else { 44.0 };
        if tall {
            self.text(rect.center() - vec2(0.0, 80.0 * self.s), label_size, Font::Title, ink, Align::Center, it.r[2] - 30.0, &it.label);
            if !it.sub.is_empty() {
                self.text(rect.center() + vec2(0.0, 40.0 * self.s), 38.0, Font::Body, c(INK_SOFT), Align::Center, it.r[2] - 30.0, &it.sub);
            }
            if let Some(n) = it.stars {
                for i in 0..3u8 {
                    let col = if i < n { c(SUN) } else { Color32::from_rgb(222, 230, 232) };
                    self.star(rect.center() + vec2((i as f32 - 1.0) * 84.0 * self.s, 136.0 * self.s), 36.0 * self.s, col);
                }
            }
            return;
        }
        let ly = rect.center().y - label_size * 0.62 * self.s;
        match &it.kind {
            ItemKind::Slider { frac, value } => {
                self.text(pos2(rect.min.x + pad, ly), label_size, Font::Title, ink, Align::Left, 0.0, &it.label);
                let (bx, bw) = (rect.min.x + rect.width() * 0.5, rect.width() * 0.33);
                let by = rect.center().y;
                let track = Rect::from_min_size(pos2(bx, by - 9.0 * self.s), vec2(bw, 18.0 * self.s));
                self.p.rect_filled(track, 9.0 * self.s, Color32::from_rgb(216, 228, 232));
                let f = frac.clamp(0.0, 1.0);
                self.p.rect_filled(Rect::from_min_size(track.min, vec2(bw * f, track.height())), 9.0 * self.s, c(TEAL));
                self.p.circle_filled(pos2(bx + bw * f, by), 19.0 * self.s, Color32::WHITE);
                self.p.circle_stroke(pos2(bx + bw * f, by), 19.0 * self.s, Stroke::new(5.0 * self.s, c(TEAL)));
                self.text(pos2(rect.max.x - pad, by - 26.0 * self.s), 38.0, Font::Body, c(INK_SOFT), Align::Right, 0.0, value);
            }
            ItemKind::Choice { value } => {
                self.text(pos2(rect.min.x + pad, ly), label_size, Font::Title, ink, Align::Left, 0.0, &it.label);
                let by = rect.center().y - 26.0 * self.s;
                let txt = if it.focused { format!("<  {value}  >") } else { value.clone() };
                self.text(pos2(rect.max.x - pad, by), 40.0, Font::Body, c(TEAL), Align::Right, 0.0, &txt);
            }
            _ => {
                let has_sub = !it.sub.is_empty();
                self.text(pos2(rect.min.x + pad, ly), label_size, Font::Title, ink, Align::Left, 0.0, &it.label);
                if has_sub {
                    let right = rect.max.x - pad - if it.stars.is_some() { 210.0 * self.s } else { 0.0 };
                    self.text(pos2(right, rect.center().y - 24.0 * self.s), 36.0, Font::Body, c(INK_SOFT), Align::Right, 0.0, &it.sub);
                }
                if let Some(n) = it.stars {
                    for i in 0..3u8 {
                        let col = if i < n { c(SUN) } else { Color32::from_rgb(222, 230, 232) };
                        self.star(pos2(rect.max.x - pad - 22.0 * self.s - (2 - i) as f32 * 58.0 * self.s, rect.center().y), 26.0 * self.s, col);
                    }
                }
            }
        }
    }

    fn node(&mut self, n: &Node) {
        match n {
            Node::Card { r, fill, radius, shadow } => {
                if r[2] <= 0.0 || r[3] <= 0.0 {
                    return;
                }
                let rect = self.rect(r);
                let rr = self.radius(*radius);
                if *shadow {
                    self.p.add(Shadow { offset: [0, 10], blur: 36, spread: 2, color: Color32::from_black_alpha(46) }.as_shape(rect, rr));
                }
                self.p.rect_filled(rect, rr, c(*fill));
            }
            Node::Outline { r, color, width, radius } => {
                self.p.rect_stroke(self.rect(r), self.radius(*radius), Stroke::new(width * self.s, c(*color)), StrokeKind::Outside);
            }
            Node::Text { at, size, font, color, align, wrap, text } => {
                self.text(self.pt(at[0], at[1]), *size, *font, c(*color), *align, *wrap, text);
            }
            Node::Prompt { at, size, act, label, align, color } => {
                self.prompt(self.pt(at[0], at[1]), *size, *act, label, c(*color), *align);
            }
            Node::PromptRow { y, items } => self.prompt_row(*y, items),
            Node::Puck(k) => self.puck(k),
            Node::Stars { at, n, of, size } => {
                let s = size * self.s;
                let gap = s * 2.3;
                for i in 0..*of {
                    let x = (i as f32 - (*of as f32 - 1.0) * 0.5) * gap;
                    let col = if i < *n { c(SUN) } else { Color32::from_rgb(222, 230, 232) };
                    self.star(self.pt(at[0], at[1]) + vec2(x, 0.0), s, col);
                }
            }
            Node::Bar { r, frac, fill, bg } => {
                let rect = self.rect(r);
                let rr = rect.height() * 0.5;
                self.p.rect_filled(rect, rr, c(*bg));
                let w = rect.width() * frac.clamp(0.0, 1.0);
                if w > 0.5 {
                    self.p.rect_filled(Rect::from_min_size(rect.min, vec2(w, rect.height())), rr, c(*fill));
                }
            }
            Node::Circle { c: at, r, fill, stroke, width } => {
                let p = self.pt(at[0], at[1]);
                self.p.circle_filled(p, r * self.s, c(*fill));
                if *width > 0.0 {
                    self.p.circle_stroke(p, r * self.s, Stroke::new(width * self.s, c(*stroke)));
                }
            }
            Node::Line { pts, width, color } => {
                let pts: Vec<Pos2> = pts.iter().map(|p| self.pt(p[0], p[1])).collect();
                self.p.add(Shape::line(pts, Stroke::new(width * self.s, c(*color))));
            }
            Node::Fade { color } => {
                self.p.rect_filled(Rect::from_min_size(Pos2::ZERO, self.screen), 0.0, c(*color));
            }
            Node::WorldText { pos, size, color, text } => {
                if let Some(at) = self.project(*pos) {
                    self.text(at, *size, Font::Title, c(*color), Align::Center, 0.0, text);
                }
            }
            Node::WorldPrompt { pos, act, label } => {
                if let Some(at) = self.project(*pos) {
                    let w = (label.chars().count() as f32 * 24.0 + 100.0) * self.s;
                    let rect = Rect::from_center_size(at, vec2(w, 72.0 * self.s));
                    self.p.add(Shadow { offset: [0, 4], blur: 14, spread: 0, color: Color32::from_black_alpha(40) }.as_shape(rect, self.radius(36.0)));
                    self.p.rect_filled(rect, self.radius(36.0), Color32::WHITE);
                    self.prompt(pos2(rect.min.x + 18.0 * self.s, at.y), 40.0, *act, label, c(INK), Align::Left);
                }
            }
            Node::WorldRing { pos, r, color } => {
                let pts: Vec<Pos2> = (0..=32)
                    .filter_map(|i| {
                        let a = i as f32 / 32.0 * std::f32::consts::TAU;
                        self.project(*pos + Vec3::new(a.cos() * r, 0.0, a.sin() * r))
                    })
                    .collect();
                if pts.len() > 2 {
                    self.p.add(Shape::line(pts, Stroke::new(6.0 * self.s, c(*color))));
                }
            }
        }
    }
}

/// Text anchored in the world, from the host (other players' names).
pub struct WorldLabel {
    pub pos: Vec3,
    pub text: String,
    pub color: [u8; 3],
}

/// Draws the frame. `input` says which glyphs to use; `vp` projects world anchors.
pub fn draw(ctx: &egui::Context, f: &UiFrame, input: Input, vp: Mat4, labels: &[WorldLabel]) -> Output {
    let screen = ctx.content_rect();
    let (w, h) = (screen.width(), screen.height());
    let s = (w / 1920.0).min(h / 1080.0);
    let o = vec2((w - 1920.0 * s) * 0.5, (h - 1080.0 * s) * 0.5);
    let p = ctx.layer_painter(egui::LayerId::new(egui::Order::Middle, egui::Id::new("fit_ui")));
    let mut out = Output::default();
    let mut prompts = Vec::new();
    {
        let mut v = View { p, s, o, vp, screen: vec2(w, h), input, xbox: f.xbox, prompts: &mut prompts };
        for n in &f.nodes {
            v.node(n);
        }
        for it in &f.items {
            v.item(it);
        }
        for n in &f.top {
            v.node(n);
        }
        for l in labels {
            if let Some(at) = v.project(l.pos) {
                let color = Color32::from_rgb(l.color[0], l.color[1], l.color[2]);
                v.text(at, 40.0, Font::Title, color, Align::Center, 0.0, &l.text);
            }
        }
        for it in &f.items {
            let r = v.rect(&it.r);
            out.rects.push((it.id, [r.min.x, r.min.y, r.width(), r.height()], it.label.clone()));
        }
        // The pointer.
        let (hover, release, down) = ctx.input(|i| {
            // A release's position comes from its event: a finger leaves the pointer gone.
            let release = i.events.iter().rev().find_map(|e| match e {
                egui::Event::PointerButton { pos, button: egui::PointerButton::Primary, pressed: false, .. } => Some(*pos),
                _ => None,
            });
            (i.pointer.interact_pos().or(i.pointer.hover_pos()), release, i.pointer.primary_down())
        });
        let clicked = release.is_some();
        let hover = release.or(hover);
        // Hover moves the focus when the pointer moves, not while it rests and a pad moves it.
        let last_id = egui::Id::new("fit_ui_last_pointer");
        let last: Option<Pos2> = ctx.data(|d| d.get_temp(last_id));
        let moved = hover.is_some() && hover != last;
        ctx.data_mut(|d| {
            if let Some(h) = hover {
                d.insert_temp(last_id, h);
            } else {
                d.remove::<Pos2>(last_id);
            }
        });
        if let Some(at) = hover {
            let on = f.items.iter().find(|it| v.rect(&it.r).contains(at));
            if let Some(it) = on {
                out.over_item = true;
                if clicked {
                    out.event = Some(UiEvent::Click(it.id));
                } else if down && matches!(it.kind, ItemKind::Slider { .. }) {
                    let rect = v.rect(&it.r);
                    let (bx, bw) = (rect.min.x + rect.width() * 0.5, rect.width() * 0.33);
                    if at.x >= bx - 20.0 * s {
                        out.event = Some(UiEvent::Slider(it.id, ((at.x - bx) / bw).clamp(0.0, 1.0)));
                    }
                } else if moved {
                    out.event = Some(UiEvent::Hover(it.id));
                }
                if matches!(it.kind, ItemKind::Slider { .. }) && clicked {
                    let rect = v.rect(&it.r);
                    let (bx, bw) = (rect.min.x + rect.width() * 0.5, rect.width() * 0.33);
                    if at.x >= bx - 20.0 * s {
                        out.event = Some(UiEvent::Slider(it.id, ((at.x - bx) / bw).clamp(0.0, 1.0)));
                    }
                }
            }
        }
    }
    out.prompts = prompts;
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prompts_follow_the_device_and_the_glyph_setting() {
        // A row of cards moves left and right, whatever the device.
        assert_eq!(prompt(Act::MenuSide, Input { device: Device::KeyboardMouse, mouse: false }, false), Glyph::Key("A D"));
        assert_eq!(prompt(Act::Menu, Input { device: Device::KeyboardMouse, mouse: false }, false), Glyph::Key("W S"));
        let pad = Input { device: Device::Gamepad, mouse: false };
        let keys = Input { device: Device::KeyboardMouse, mouse: false };
        let mouse = Input { device: Device::KeyboardMouse, mouse: true };
        assert_eq!(prompt(Act::Confirm, pad, false), Glyph::Cross);
        assert_eq!(prompt(Act::Back, pad, false), Glyph::Circle);
        assert_eq!(prompt(Act::Wave, pad, false), Glyph::Square);
        assert_eq!(prompt(Act::Schedule, pad, false), Glyph::Triangle);
        assert_eq!(prompt(Act::StepL, pad, false), Glyph::Pill("L1"));
        assert_eq!(prompt(Act::Pause, pad, false), Glyph::Pill("Options"));
        assert_eq!(glyph_name(prompt(Act::Confirm, pad, true)), "A");
        assert_eq!(glyph_name(prompt(Act::Back, pad, true)), "B");
        assert_eq!(glyph_name(prompt(Act::Wave, pad, true)), "X");
        assert_eq!(glyph_name(prompt(Act::Schedule, pad, true)), "Y");
        assert_eq!(prompt(Act::StepR, pad, true), Glyph::Pill("RB"));
        assert_eq!(prompt(Act::Pause, pad, true), Glyph::Pill("Menu"));
        assert_eq!(prompt(Act::Confirm, keys, false), Glyph::Key("Space"));
        assert_eq!(prompt(Act::Schedule, keys, true), Glyph::Key("Tab"));
        assert_eq!(prompt(Act::Confirm, mouse, false), Glyph::Mouse(MouseBit::Left));
        assert_eq!(prompt(Act::Lean, mouse, false), Glyph::Mouse(MouseBit::Move));
    }

    /// What the headless reading (the tools' view of the real UI) says for one device.
    fn reading(device: Device, xbox: bool) -> String {
        let mut ui = Ui::default();
        ui.title(960.0, 100.0, 96.0, INK, Align::Center, "Whiff Fit");
        ui.prompt_row(&[(Act::Confirm, "Begin")]);
        ui.f.xbox = xbox;
        let hud = pav_core::frame::HudFrame { fit: Some(std::sync::Arc::new(ui.f)), ..Default::default() };
        let mut h = crate::headless::Headless { device, ..Default::default() };
        let drawn = h.frame(None, &hud, Mat4::IDENTITY, 1920, 1080, Default::default());
        drawn.reading.hud.iter().map(|t| t.text.clone()).collect::<Vec<_>>().join("|")
    }

    #[test]
    fn headless_readings_show_the_right_prompts_per_device_and_glyph_setting() {
        let keys = reading(Device::KeyboardMouse, false);
        assert!(keys.contains("Whiff Fit") && keys.contains("Begin") && keys.contains("Space"), "{keys}");
        // A DualSense's Cross is a drawn shape, not a letter.
        let pad = reading(Device::Gamepad, false);
        assert!(pad.contains("Begin") && !pad.contains("Space") && !pad.split('|').any(|t| t == "A"), "{pad}");
        let xbox = reading(Device::Gamepad, true);
        assert!(xbox.split('|').any(|t| t == "A"), "{xbox}");
    }

    #[test]
    fn a_frame_draws_and_the_pointer_lands_on_items() {
        let ctx = egui::Context::default();
        install_fonts(&ctx);
        let mut ui = Ui::default();
        ui.title(960.0, 100.0, 96.0, INK, Align::Center, "Whiff Fit");
        ui.puck(Puck { c: [960.0, 500.0], r: 170.0, ring: Some([0.1, 0.1, 0.3]), ..Default::default() });
        ui.prompt_row(&[(Act::Confirm, "Begin"), (Act::Back, "Leave")]);
        ui.f.items.push(Item { id: 3, r: [100.0, 100.0, 400.0, 100.0], label: "Hi".into(), sub: String::new(), kind: ItemKind::Button, focused: true, bounce: 0.0, stars: Some(2) });
        let raw = |events: Vec<egui::Event>| egui::RawInput {
            screen_rect: Some(Rect::from_min_size(Pos2::ZERO, vec2(1920.0, 1080.0))),
            events,
            ..Default::default()
        };
        let mut out = Output::default();
        let input = Input { device: Device::Gamepad, mouse: false };
        let frame = ui.f;
        ctx.run_ui(raw(vec![]), |c| {
            out = draw(c.ctx(), &frame, input, Mat4::IDENTITY, &[]);
        })
        .textures_delta
        .clear();
        assert_eq!(out.rects.len(), 1);
        assert!(out.prompts.iter().any(|p| p == "Cross:Begin"), "{:?}", out.prompts);
        // Hover at the item, then click.
        let at = pos2(200.0, 150.0);
        ctx.run_ui(raw(vec![egui::Event::PointerMoved(at)]), |c| {
            out = draw(c.ctx(), &frame, input, Mat4::IDENTITY, &[]);
        })
        .textures_delta
        .clear();
        assert_eq!(out.event, Some(UiEvent::Hover(3)));
        let press = |pressed| egui::Event::PointerButton { pos: at, button: egui::PointerButton::Primary, pressed, modifiers: Default::default() };
        ctx.run_ui(raw(vec![press(true)]), |c| {
            out = draw(c.ctx(), &frame, input, Mat4::IDENTITY, &[]);
        })
        .textures_delta
        .clear();
        ctx.run_ui(raw(vec![press(false)]), |c| {
            out = draw(c.ctx(), &frame, input, Mat4::IDENTITY, &[]);
        })
        .textures_delta
        .clear();
        assert_eq!(out.event, Some(UiEvent::Click(3)));
    }
}
