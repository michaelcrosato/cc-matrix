//! Step Party: notes in two lanes fall to two footprints. Timing is read from the music's clock.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Note {
    pub at: f32,
    pub lane: u8, // 0 left, 1 right, 2 both
    pub hit: u8,  // 0 waiting, 1 good, 2 perfect, 3 miss
}

#[derive(Debug, Deserialize)]
struct Chart {
    bars: Vec<String>,
}

pub fn chart_bars() -> Vec<String> {
    let text = crate::games::level_text("fit/charts", include_str!("../charts.toml"));
    toml::from_str::<Chart>(&text).map(|c| c.bars).unwrap_or_default()
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Step {
    pub t: f32,
    pub notes: Vec<Note>,
    pub points: f32,
    pub combo: u32,
    pub perfect: u32,
    pub good: u32,
    pub miss: u32,
    pub end: f32,
    side: f32,
    stepping: f32,
    last: u8,
    flash: f32,
    flash_text: u8,
    band: bool,
    center: Vec3,
    claps: u32,
}

impl Step {
    pub fn start(cx: &mut Cx, o: Opt) -> Self {
        let c = o.at.unwrap_or(cx.spot(BOARDWALK, "center") + Vec3::Y * 0.38);
        cx.player(c, 0.0);
        cx.core.wobble = if o.band { cx.r.step.wobble + cx.r.finale.wobble } else { cx.r.step.wobble };
        *cx.shot = Shot { tilt: 20.0, yaw: 0.0, distance: 9.0, fov: 36.0, height: 0.8, focus: c };
        let bar = 240.0 / cx.r.step.bpm;
        let eighth = bar / 8.0;
        let all = chart_bars();
        let n = o.count.map(|c| c as usize).unwrap_or(all.len()).min(all.len());
        let mut notes = Vec::new();
        // The finale plays the chart's last bars, the busiest.
        for (b, line) in all[all.len() - n..].iter().enumerate() {
            for (k, ch) in line.chars().enumerate() {
                let lane = match ch {
                    'L' => 0,
                    'R' => 1,
                    'B' => 2,
                    _ => continue,
                };
                notes.push(Note { at: bar * (b as f32 + 1.0) + eighth * k as f32, lane, hit: 0 });
            }
        }
        let end = bar * (n as f32 + 1.0) + 1.0;
        Self { t: 0.0, notes, points: 0.0, combo: 0, perfect: 0, good: 0, miss: 0, end, side: 1.0, stepping: 0.0, last: 0, flash: 0.0, flash_text: 0, band: o.band, center: c, claps: 0 }
    }

    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        if self.t == 0.0 {
            // The song starts with the first tick of play, so its clock and the chart agree.
            cx.ev.push(SimEvent::Music { song: if self.band { 6 } else { 4 } });
        }
        self.t += dt;
        // The music's clock leads when it is running: slew toward it, jump only if far out.
        if let Some(p) = i.song_pos {
            let d = p - self.t;
            if d.abs() < 1.0 {
                self.t += d * 0.2;
            }
        }
        let s = &cx.r.step;
        let (perfect, good) = (s.perfect, s.good);
        let beat = 60.0 / s.bpm;
        let beats = (self.t / beat) as u32;
        if beats != self.claps {
            self.claps = beats;
            if beats % 4 == 0 && !self.band {
                cx.sfx(sfx::CLAP, 0.25, 1.0);
            }
        }
        for n in self.notes.iter_mut() {
            if n.hit == 0 && self.t > n.at + good {
                n.hit = 3;
                self.miss += 1;
                self.combo = 0;
                self.flash = 0.5;
                self.flash_text = 3;
            }
        }
        for (pressed, lane) in [(i.l_p, 0u8), (i.r_p, 1u8)] {
            if !pressed {
                continue;
            }
            self.side = if lane == 0 { -1.0 } else { 1.0 };
            self.stepping = 1.0;
            self.last = lane;
            cx.sfx(sfx::STEP, 0.7, 1.0);
            // Doubles want both feet: the other one is checked by being held or pressed too.
            let other = if lane == 0 { i.r } else { i.l };
            let found = self.notes.iter().position(|n| {
                n.hit == 0 && (n.at - self.t).abs() <= good && (n.lane == lane || (n.lane == 2 && other))
            });
            if let Some(k) = found {
                let d = (self.notes[k].at - self.t).abs();
                let p = d <= perfect;
                self.notes[k].hit = if p { 2 } else { 1 };
                self.points += if p { 1.0 } else { 0.6 };
                self.combo += 1;
                if p {
                    self.perfect += 1;
                } else {
                    self.good += 1;
                }
                self.flash = 0.5;
                self.flash_text = if p { 2 } else { 1 };
                cx.sfx(if p { sfx::PERFECT } else { sfx::GOOD }, 0.6, 1.0);
                if self.combo % 16 == 0 {
                    cx.ev.push(SimEvent::Burst { pos: self.center + Vec3::Y * 2.0, kind: 0, count: 30 });
                }
            } else {
                // A step with no note near it: stamping about costs a little, and the streak.
                self.points = (self.points - 0.25).max(0.0);
                self.combo = 0;
            }
        }
        self.flash = (self.flash - dt).max(0.0);
        self.stepping = (self.stepping - dt * 5.0).max(0.0);
        // The step: a little hop to the side, a clip per foot.
        let clip = if self.last == 0 { "FIT/StepL" } else { "FIT/StepR" };
        cx.scrub(clip, 1.0 - self.stepping);
        cx.lean_body(0.0);
        self.t >= self.end
    }

    pub fn bot(&self, core: &BalanceCore, _r: &Rules) -> Intent {
        let mut i = Intent { lean: pd(core, Vec2::ZERO), ..Default::default() };
        for n in &self.notes {
            if n.hit == 0 && (n.at - self.t).abs() < 0.012 {
                match n.lane {
                    0 => {
                        i.l = true;
                        i.l_p = true;
                    }
                    1 => {
                        i.r = true;
                        i.r_p = true;
                    }
                    _ => {
                        i.l = true;
                        i.r = true;
                        i.l_p = true;
                    }
                }
            }
        }
        i
    }

    pub fn hud(&self, b: &mut B, _core: &BalanceCore, r: &Rules) {
        // Two lanes falling to two footprints, in the middle of the screen's left and right.
        let hit_y = 900.0;
        let lanes = [640.0, 1280.0];
        let speed = 520.0;
        for x in lanes {
            b.flat([x - 80.0, 110.0, x + 80.0, 1000.0], [255, 255, 255, 110], 40.0);
            b.circle([x, hit_y], 74.0, [0, 0, 0, 0], INK, 8.0);
        }
        for n in &self.notes {
            if n.hit == 1 || n.hit == 2 {
                continue;
            }
            let y = hit_y - (n.at - self.t) * speed;
            if !(60.0..=1040.0).contains(&y) {
                continue;
            }
            let fill = if n.hit == 3 { [200, 208, 215, 170] } else if n.lane == 2 { SUN } else if n.lane == 0 { TEAL } else { CORAL };
            let mut draw = |x: f32| b.circle([x, y], 62.0, fill, WHITE, 6.0);
            match n.lane {
                0 => draw(lanes[0]),
                1 => draw(lanes[1]),
                _ => {
                    draw(lanes[0]);
                    draw(lanes[1]);
                }
            }
        }
        b.prompt_center(lanes[0], 980.0, &[Glyph::StepL], "");
        b.prompt_center(lanes[1], 980.0, &[Glyph::StepR], "");
        b.title_left(60.0, 30.0, 80.0, INK, &format!("{}", self.score(r) as u32));
        if self.combo > 3 {
            b.title(960.0, 110.0, 72.0, TEAL, &format!("{} in a row", self.combo));
        }
        if self.flash > 0.0 {
            let (t, c) = match self.flash_text {
                2 => ("Perfect", MINT),
                1 => ("Good", TEAL),
                _ => ("Hm", CORAL),
            };
            b.title(960.0, 220.0, 72.0, c, t);
        }
    }

    pub fn score(&self, _r: &Rules) -> f32 {
        1000.0 * self.points / (self.notes.len().max(1) as f32)
    }
}
