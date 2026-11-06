//! Painter-only, ten-foot UI. The sim owns every menu and focus value.
use egui::{Align2, Color32 as C, CornerRadius, FontFamily, FontId, Pos2, Rect, Stroke, StrokeKind, Vec2};
use pav_core::games::fit::ui_model::UiFrame;
use pav_core::input::UiEvent;
const INK: C = C::from_rgb(38, 62, 84);
const TEAL: C = C::from_rgb(45, 158, 168);
const MINT: C = C::from_rgb(120, 220, 170);
const CORAL: C = C::from_rgb(255, 120, 110);
const CREAM: C = C::from_rgb(250, 248, 239);
const MUTED: C = C::from_rgb(102, 128, 133);
#[derive(Clone, Debug, Default)]
pub struct Response {
    pub event: Option<UiEvent>,
    pub items: Vec<(u16, [f32; 4])>,
}
pub fn install_fonts(ctx: &egui::Context) {
    let mut f = egui::FontDefinitions::default();
    f.font_data.insert(
        "Fredoka".into(),
        std::sync::Arc::new(egui::FontData::from_static(include_bytes!("../fonts/Fredoka_600SemiBold.ttf"))),
    );
    f.font_data
        .insert("Nunito".into(), std::sync::Arc::new(egui::FontData::from_static(include_bytes!("../fonts/Nunito_700Bold.ttf"))));
    let fallback = f.families.get(&FontFamily::Proportional).cloned().unwrap_or_default();
    let mut title = vec!["Fredoka".into()];
    title.extend(fallback.clone());
    let mut body = vec!["Nunito".into()];
    body.extend(fallback);
    f.families.insert(FontFamily::Name("title".into()), title);
    f.families.insert(FontFamily::Name("body".into()), body);
    ctx.set_fonts(f);
}
struct Canvas {
    p: egui::Painter,
    s: f32,
    o: Vec2,
}
impl Canvas {
    fn at(&self, x: f32, y: f32) -> Pos2 {
        Pos2::new(self.o.x + x * self.s, self.o.y + y * self.s)
    }
    fn rect(&self, x: f32, y: f32, w: f32, h: f32) -> Rect {
        Rect::from_min_size(self.at(x, y), Vec2::new(w, h) * self.s)
    }
    fn panel(&self, x: f32, y: f32, w: f32, h: f32, r: f32, c: C) {
        self.p.rect_filled(self.rect(x, y, w, h), CornerRadius::same((r * self.s).max(1.) as u8), c);
    }
    fn border(&self, x: f32, y: f32, w: f32, h: f32, r: f32, c: C, weight: f32) {
        self.p.rect_stroke(
            self.rect(x, y, w, h),
            CornerRadius::same((r * self.s).max(1.) as u8),
            Stroke::new(weight * self.s, c),
            StrokeKind::Inside,
        );
    }
    fn text(&self, x: f32, y: f32, t: &str, size: f32, c: C, title: bool) {
        self.p.text(
            self.at(x, y),
            Align2::LEFT_TOP,
            t,
            FontId::new(size * self.s, FontFamily::Name(if title { "title" } else { "body" }.into())),
            c,
        );
    }
    fn center(&self, x: f32, y: f32, t: &str, size: f32, c: C, title: bool) {
        self.p.text(
            self.at(x, y),
            Align2::CENTER_CENTER,
            t,
            FontId::new(size * self.s, FontFamily::Name(if title { "title" } else { "body" }.into())),
            c,
        );
    }
    fn wrap(&self, x: f32, y: f32, t: &str, size: f32, w: f32, c: C, title: bool) -> f32 {
        let galley = self.p.layout(
            t.into(),
            FontId::new(size * self.s, FontFamily::Name(if title { "title" } else { "body" }.into())),
            c,
            w * self.s,
        );
        let h = galley.size().y / self.s;
        self.p.galley(self.at(x, y), galley, c);
        h
    }
    fn line(&self, a: (f32, f32), b: (f32, f32), c: C, w: f32) {
        self.p.line_segment([self.at(a.0, a.1), self.at(b.0, b.1)], Stroke::new(w * self.s, c));
    }
    fn dot(&self, x: f32, y: f32, r: f32, c: C) {
        self.p.circle_filled(self.at(x, y), r * self.s, c);
    }
}
fn star(c: &Canvas, x: f32, y: f32, r: f32, on: bool) {
    let mut points = vec![];
    for n in 0..10 {
        let a = n as f32 * std::f32::consts::PI / 5. - std::f32::consts::FRAC_PI_2;
        let rad = if n % 2 == 0 { r } else { r * 0.47 };
        points.push(c.at(x + a.cos() * rad, y + a.sin() * rad));
    }
    c.p.add(egui::Shape::convex_polygon(
        points,
        if on { C::from_rgb(245, 193, 85) } else { C::from_rgb(221, 226, 215) },
        Stroke::NONE,
    ));
}
fn lotus(c: &Canvas, x: f32, y: f32, k: f32) {
    for n in [-2, -1, 0, 1, 2] {
        let a = n as f32 * 0.48;
        let center = c.at(x + a.sin() * 15. * k, y - a.cos() * 10. * k);
        c.p.add(egui::Shape::ellipse_filled(center, Vec2::new(8., 19.) * k * c.s, if n % 2 == 0 { MINT } else { TEAL }));
    }
    c.line((x - 33. * k, y + 12. * k), (x + 33. * k, y + 12. * k), TEAL, 2.);
}
fn puck(c: &Canvas, u: &UiFrame) {
    let x = 1570.;
    let y = 765.;
    let r = 155.;
    c.dot(x + 3., y + 9., r + 12., C::from_black_alpha(16));
    c.dot(x, y, r + 12., C::from_rgba_premultiplied(255, 255, 250, 245));
    for n in 0..36 {
        let a = n as f32 * std::f32::consts::TAU / 36.;
        let len = if n % 3 == 0 { 10. } else { 5. };
        c.line(
            (x + a.cos() * (r - 3.), y + a.sin() * (r - 3.)),
            (x + a.cos() * (r - len - 3.), y + a.sin() * (r - len - 3.)),
            C::from_rgb(204, 221, 212),
            2.,
        );
    }
    let target = c.at(x + u.target.x * r, y - u.target.y * r);
    c.p.circle_filled(target, u.radius * r * c.s, C::from_rgba_premultiplied(120, 220, 170, 34));
    c.p.circle_stroke(target, u.radius * r * c.s, Stroke::new(4. * c.s, MINT));
    if u.trace.len() > 1 {
        for a in u.trace.windows(2) {
            c.line(
                (x + a[0].x * r, y - a[0].y * r),
                (x + a[1].x * r, y - a[1].y * r),
                C::from_rgba_premultiplied(45, 158, 168, 65),
                2.,
            );
        }
    }
    c.dot(x + u.dot.x * r + 2., y - u.dot.y * r + 3., 14., C::from_black_alpha(15));
    c.dot(x + u.dot.x * r, y - u.dot.y * r, 13., CORAL);
    c.dot(x + u.dot.x * r - 3., y - u.dot.y * r - 4., 4., C::from_rgb(255, 206, 186));
    c.center(x, y + r + 44., "YOUR BALANCE", 34., TEAL, false);
}
fn control_hint(c: &Canvas, u: &UiFrame) {
    c.panel(96., 988., 1728., 58., 24., C::from_rgba_premultiplied(251, 250, 246, 225));
    c.text(126., 997., &u.prompt, 34., INK, false);
    c.text(1545., 1003., "BREATHE EASY.", 24., MUTED, false);
}
pub fn draw(ctx: &egui::Context, u: &UiFrame) -> Response {
    let screen = ctx.input(|i| i.content_rect());
    let s = (screen.width() / 1920.).min(screen.height() / 1080.);
    let o = screen.center().to_vec2() - Vec2::new(1920., 1080.) * s * 0.5;
    let c = Canvas { p: ctx.layer_painter(egui::LayerId::new(egui::Order::Foreground, egui::Id::new("fit"))), s, o };
    let mut out = Response::default();
    let pointer = ctx.input(|i| i.pointer.hover_pos());
    let moved = ctx.input(|i| i.pointer.delta().length_sq() > 0.);
    let clicked = ctx.input(|i| i.pointer.primary_clicked());
    let down = ctx.input(|i| i.pointer.primary_down());
    let title = u.screen == "Title";
    let gameplay = u.screen == "Event";
    let hub = u.screen == "Hub";
    let still = gameplay && u.event == 11 && u.phase == 4;
    if title {
        // A quiet paper edge leaves the resort itself in view.
        c.panel(-10., -10., 770., 1100., 0., C::from_rgba_premultiplied(250, 248, 239, 248));
        for n in 0..8 {
            c.panel(760. + n as f32 * 12., -10., 12., 1100., 0., C::from_rgba_premultiplied(250, 248, 239, ((8 - n) * 25) as u8));
        }
        lotus(&c, 151., 106., 0.8);
        c.text(204., 88., "TIPPY CAY", 36., TEAL, false);
        c.text(120., 162., "A COMPLIMENTARY STAY", 25., MUTED, false);
        c.text(112., 218., "Wobble", 144., INK, true);
        c.text(116., 357., "Wit", 150., INK, true);
        c.dot(353., 461., 15., CORAL);
        c.wrap(121., 527., &u.subtitle, 36., 550., MUTED, false);
        c.panel(1465., 90., 335., 68., 34., C::from_rgba_premultiplied(251, 250, 246, 230));
        c.center(1632., 124., "NO RUSH. EVER.", 30., TEAL, false);
        c.text(121., 1017., "A FIVE-DAY HOLIDAY IN STANDING STILL", 23., MUTED, false);
    } else if hub {
        c.panel(82., 64., 430., 126., 32., CREAM);
        c.text(112., 82., &u.kicker, 29., TEAL, false);
        c.text(111., 125., &format!("{} / {} resort minutes", u.minutes, u.minute_goal), 34., INK, false);
        c.panel(1558., 64., 280., 126., 32., CREAM);
        c.text(1587., 82., "BALANCE AGE", 25., TEAL, false);
        c.text(1585., 111., &u.age.to_string(), 64., INK, true);
        c.panel(96., 840., 1215., 120., 32., C::from_rgba_premultiplied(251, 250, 246, 235));
        c.text(126., 854., &u.label, 42., INK, true);
        c.wrap(126., 910., &u.subtitle, 29., 1130., MUTED, false);
        c.panel(1430., 844., 382., 114., 32., C::from_rgba_premultiplied(251, 250, 246, 235));
        c.text(1460., 859., "Tippy Cay", 43., TEAL, true);
        c.text(1460., 915., "YOUR TIME IS YOURS.", 24., MUTED, false);
    } else if gameplay || u.screen == "Countdown" {
        if !still {
            c.panel(82., 64., 650., 127., 32., C::from_rgba_premultiplied(251, 250, 246, 235));
            c.text(112., 79., &u.kicker, 27., TEAL, false);
            c.text(111., 119., &u.heading, 47., INK, true);
            c.panel(1500., 64., 338., 127., 32., CREAM);
            c.text(1530., 81., "A SMALL SCORE", 25., TEAL, false);
            c.text(1527., 115., &format!("{:04}", u.score), 56., INK, true);
            let remain = (u.duration - u.time).max(0.);
            c.center(960., 95., &format!("{}:{:02}", (remain as u32) / 60, (remain as u32) % 60), 48., INK, true);
            c.panel(790., 145., 340., 9., 4., C::from_rgb(222, 232, 219));
            c.panel(790., 145., 340. * (u.time / u.duration).clamp(0., 1.), 9., 4., TEAL);
            c.panel(96., 857., 1235., 103., 32., C::from_rgba_premultiplied(251, 250, 246, 235));
            c.wrap(127., 883., &u.label, 36., 1170., INK, false);
        }
        if u.blind {
            c.panel(-10., -10., 1940., 1100., 0., C::from_rgba_premultiplied(16, 32, 46, 249));
            c.center(960., 480., "Eyes closed.", 64., CREAM, true);
            c.center(960., 585., "Listen for your centre.", 36., MINT, false);
        } else if u.show_puck {
            puck(&c, u);
        }
        if !still && !u.blind {
            match u.event {
                0 | 2 => {
                    let x = 158.;
                    let y = 385.;
                    c.panel(x, y, 70., 340., 35., C::from_rgba_premultiplied(255, 255, 250, 230));
                    c.panel(x + 10., y + 10. + (1. - u.lungs) * 320., 50., u.lungs * 320., 25., MINT);
                    c.line((x - 14., y + 10. + (1. - u.guide) * 320.), (x + 84., y + 10. + (1. - u.guide) * 320.), CORAL, 7.);
                    c.text(110., 744., if u.event == 0 { "BREATH" } else { "DEPTH" }, 27., TEAL, false);
                }
                10 => {
                    c.panel(142., 377., 94., 350., 42., C::from_rgba_premultiplied(255, 255, 250, 235));
                    c.p.circle_stroke(c.at(189., 685.), 31. * s, Stroke::new(5. * s, MINT));
                    c.dot(189., 405. + (1. - u.guide) * 280., 17., CORAL);
                    c.text(106., 753., "BOUNCE", 29., TEAL, false);
                }
                4 => {
                    let base = 780.;
                    for lane in 0..2 {
                        let x = 310. + lane as f32 * 230.;
                        c.panel(x - 77., 290., 154., 530., 65., C::from_rgba_premultiplied(251, 250, 246, 190));
                        c.dot(x, base, 58., C::from_rgb(227, 238, 223));
                        c.p.circle_stroke(c.at(x, base), 58. * s, Stroke::new(5. * s, TEAL));
                        c.center(x, base, if lane == 0 { "L" } else { "R" }, 44., TEAL, true);
                        for (t, l, judged) in &u.notes {
                            let d = t - u.time;
                            if !judged && *l == lane && (-0.15..2.2).contains(&d) {
                                let y = base - d * 210.;
                                c.panel(x - 53., y - 23., 106., 46., 20., if lane == 0 { CORAL } else { TEAL });
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        if still {
            c.center(
                960.,
                925.,
                if u.time > 127. { "Press to skip" } else { "" },
                36.,
                C::from_rgba_premultiplied(38, 62, 84, 135),
                false,
            );
        }
        if u.screen == "Countdown" {
            c.dot(960., 470., 135., CREAM);
            c.center(960., 470., &u.countdown.to_string(), 148., TEAL, true);
        }
    } else if u.screen == "Intro" {
        c.panel(130., 742., 1660., 224., 36., CREAM);
        c.text(170., 763., &u.coach, 28., TEAL, false);
        let text: u32 = u.dialogue.chars().count() as u32;
        let line: String = u.dialogue.chars().take(u.revealed).collect();
        c.wrap(170., 810., &line, 42., 1510., INK, false);
        c.text(
            170.,
            917.,
            if u.revealed >= text as usize { "SPACE / ×  Continue" } else { "SPACE / ×  Complete line" },
            27.,
            MUTED,
            false,
        );
    } else {
        let wide = matches!(u.screen.as_str(), "Calendar" | "About" | "How" | "Ending" | "Credits" | "Podium");
        c.panel(
            -10.,
            -10.,
            if wide { 1940. } else { 1135. },
            1100.,
            0.,
            C::from_rgba_premultiplied(250, 248, 239, if wide { 240 } else { 247 }),
        );
        c.text(104., 75., &u.kicker, 29., TEAL, false);
        let heading_size = if u.heading.len() > 25 { 64. } else { 76. };
        c.wrap(101., 131., &u.heading, heading_size, if wide { 1690. } else { 960. }, INK, true);
        if !u.subtitle.is_empty() {
            c.wrap(107., 240., &u.subtitle, 34., if wide { 1620. } else { 940. }, MUTED, false);
        }
        if matches!(u.screen.as_str(), "Result" | "Report") {
            if u.screen == "Report" {
                c.text(111., 334., &u.age.to_string(), 206., INK, true);
                c.text(121., 565., "BALANCE AGE", 32., TEAL, false);
                for (n, age) in u.ages.iter().take(5).enumerate() {
                    let x = 132. + n as f32 * 150.;
                    c.dot(x, 685., 32., if n == u.ages.len() - 1 { TEAL } else { C::from_rgb(192, 220, 205) });
                    c.center(x, 685., &age.to_string(), 30., CREAM, true);
                    if n > 0 {
                        c.line((x - 113., 685.), (x - 38., 685.), C::from_rgb(192, 220, 205), 4.);
                    }
                }
            } else {
                c.text(111., 339., &format!("{:04}", u.score), 170., INK, true);
                for n in 0..3 {
                    star(&c, 167. + n as f32 * 112., 570., 40., n < u.stars as i32);
                }
                c.text(120., 647., &format!("+{} MINUTES IN THE CLAM", u.banked), 34., TEAL, false);
                for (n, line) in u.lines.iter().enumerate() {
                    c.wrap(120., 710. + n as f32 * 48., line, 29., 850., MUTED, false);
                }
            }
        }
        if u.screen == "Calendar" {
            for n in 0..5 {
                let x = 135. + n as f32 * 339.;
                c.panel(x, 405., 294., 290., 35., C::WHITE);
                c.center(x + 147., 464., &format!("DAY {}", n + 1), 34., TEAL, false);
                c.center(x + 147., 559., &format!("{}", n + 1), 100., INK, true);
                if n < (u.stamps as i32) {
                    c.p.circle_stroke(c.at(x + 147., 571.), 96. * s, Stroke::new(8. * s, CORAL));
                    c.center(x + 147., 642., "PRESENT", 29., CORAL, false);
                }
            }
        }
        if matches!(u.screen.as_str(), "About" | "How" | "Ending" | "Credits" | "Podium") {
            let mut y = 369.;
            for line in &u.lines {
                let h = c.wrap(110., y, line, if u.screen == "Podium" { 46. } else { 34. }, 1660., INK, false);
                y += h + 30.;
            }
            if u.pages > 1 {
                c.text(109., 817., &format!("PAGE {} / {}", u.page + 1, u.pages), 27., TEAL, false);
            }
        }
        if u.screen == "Card" {
            c.text(109., 386., &u.coach, 29., TEAL, false);
            if let Some(line) = u.lines.first() {
                c.wrap(108., 437., line, 42., 900., INK, true);
            }
            c.wrap(109., 618., &u.prompt, 34., 900., MUTED, false);
        }
        if matches!(u.screen.as_str(), "Card" | "Pass" | "Look" | "Wardrobe") {
            c.panel(1270., 195., 500., 74., 36., C::from_rgba_premultiplied(251, 250, 246, 230));
            c.center(
                1520.,
                232.,
                if u.screen == "Look" { "YOU LOOK VERY HERE." } else { "SMALL MOVEMENTS. BIG FEELINGS." },
                24.,
                TEAL,
                false,
            );
        }
    }
    // Menu cards: focus and navigation have identical geometry on every device.
    if !u.items.is_empty() {
        let result = matches!(u.screen.as_str(), "Result" | "Report");
        let lower = matches!(u.screen.as_str(), "Card" | "How" | "About" | "Calendar" | "Ending" | "Credits" | "Podium");
        let first = (u.focus / 6) * 6;
        let visible: Vec<_> = u.items.iter().enumerate().skip(first).take(6).collect();
        let n = visible.len();
        let y0 = if title {
            634. - if u.items.len() > 4 { 30. } else { 0. }
        } else if result {
            836.
        } else if lower {
            850.
        } else if u.screen == "Pass" {
            530.
        } else {
            348.
        };
        let height = if title {
            70.
        } else if lower || result {
            81.
        } else {
            86.
        };
        let gap = if title { 14. } else { 13. };
        for (visible_index, (index, it)) in visible.iter().enumerate() {
            let focused = *index == u.focus;
            let x = if title { 119. } else { 106. };
            let y = y0 + visible_index as f32 * (height + gap);
            let w = if title {
                514.
            } else if lower || result {
                790.
            } else {
                914.
            };
            // Wide informational pages use two horizontal buttons.
            let (x, y, w) = if (lower || result) && n <= 2 { (x + visible_index as f32 * 850., y0, 790.) } else { (x, y, w) };
            let r = c.rect(x, y, w, height);
            c.panel(x + 2., y + 6., w, height, 22., C::from_black_alpha(10));
            c.panel(
                x,
                y,
                w,
                height,
                22.,
                if focused { C::from_rgb(232, 245, 233) } else { C::from_rgba_premultiplied(255, 255, 253, 237) },
            );
            if focused {
                c.border(x, y, w, height, 22., TEAL, 4.);
                c.dot(x + 30., y + height * 0.5, 6., TEAL);
            }
            let tint = if it.enabled { INK } else { MUTED };
            let font = if title {
                35.
            } else if it.text.len() > 38 {
                32.
            } else {
                35.
            };
            if it.detail.is_empty() || title {
                c.text(x + if focused { 54. } else { 30. }, y + (height - font) * 0.45, &it.text, font, tint, false);
            } else {
                c.text(x + if focused { 54. } else { 30. }, y + 6., &it.text, font, tint, false);
                c.text(
                    x + if focused { 54. } else { 30. },
                    y + 50.,
                    &it.detail,
                    25.,
                    if it.enabled { MUTED } else { C::from_rgb(156, 164, 153) },
                    false,
                );
            }
            if let Some((value, lo, hi)) = it.value {
                let bx = x + w - 280.;
                let by = y + height * 0.5;
                c.panel(bx, by - 5., 228., 10., 5., C::from_rgb(211, 226, 212));
                let f = (value - lo) / (hi - lo).max(0.001);
                c.panel(bx, by - 5., 228. * f, 10., 5., TEAL);
                c.dot(bx + 228. * f, by, 13., CORAL);
                let slider_rect = c.rect(bx - 15., y, 265., height);
                if down && pointer.is_some_and(|p| slider_rect.contains(p)) {
                    let px = (pointer.unwrap().x - c.at(bx, 0.).x) / (228. * s);
                    out.event = Some(UiEvent::Slider(it.id, lo + (hi - lo) * px.clamp(0., 1.)));
                }
            } else if it.enabled {
                c.center(x + w - 39., y + height * 0.5, "›", 42., if focused { TEAL } else { MUTED }, true);
            }
            out.items.push((it.id, [r.min.x, r.min.y, r.max.x, r.max.y]));
            if out.event.is_none() && pointer.is_some_and(|p| r.contains(p)) {
                if clicked && it.enabled {
                    out.event = Some(UiEvent::Click(it.id));
                } else if moved && *index != u.focus {
                    out.event = Some(UiEvent::Hover(it.id));
                }
            }
        }
        if u.items.len() > 6 {
            c.text(106., 955., &format!("{} / {}     ↑ ↓  MORE POSSIBILITIES", u.focus + 1, u.items.len()), 25., TEAL, false);
        }
    }
    if !title && !still && u.screen != "Intro" {
        control_hint(&c, u);
    }
    if u.demo {
        c.panel(800., 228., 320., 65., 30., INK);
        c.center(960., 260., "A LITTLE DEMO", 30., CREAM, false);
        c.panel(660., 988., 600., 60., 26., CREAM);
        c.center(960., 1018., "PRESS ANY BUTTON TO CHECK IN", 29., TEAL, false);
    }
    if u.stats {
        c.text(1260., 365., &format!("{} OBJECTS · TICK {}", u.entities, u.tick), 34., INK, false);
    }
    if u.free_camera {
        c.text(1260., 415., "FREE CAMERA · RIGHT STICK", 29., TEAL, false);
    }
    if u.debug {
        c.text(1260., 315., &format!("LEAN  {:+0.2}  {:+0.2}", u.dot.x, u.dot.y), 34., INK, false);
    }
    out
}
