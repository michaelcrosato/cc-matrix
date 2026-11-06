//! Step Party: a rhythm game on an aerobic step box. Timing uses the music's clock.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

/// How a note went.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Judged {
    #[default]
    Pending,
    Good,
    Perfect,
    Miss,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Note {
    pub time: f32,
    /// 0 left, 1 right, 2 both.
    pub lane: u8,
    pub l: bool,
    pub r: bool,
    pub judged: Judged,
    pub worst: f32,
}

#[derive(Deserialize)]
struct Charts {
    bpm: f32,
    lead_in_beats: f32,
    party: Vec<String>,
    finale: Vec<String>,
}

fn charts() -> Charts {
    toml::from_str(&crate::games::level_text("fit/charts", include_str!("../charts.toml")))
        .unwrap_or_else(|e| panic!("charts.toml: {e}"))
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct StepParty {
    pub bars: Option<usize>,
    pub bpm: f32,
    pub notes: Vec<Note>,
    pub next: usize,
    pub sum: f32,
    pub combo: u32,
    pub song: f32,
    pub end: f32,
    pub beat: i32,
    pub flash: f32,
    pub flash_word: String,
    pub foot: u8,
    pub guests: Vec<EntityId>,
    pub bounce: Option<EntityId>,
    pub stunned: f32,
    /// The finale: the balance matters too.
    pub wobble: bool,
    pub foot_l: f32,
    pub foot_r: f32,
}

impl StepParty {
    pub fn new(bars: Option<usize>) -> Self {
        Self { bars, wobble: bars.is_some(), ..Default::default() }
    }

    fn load(&mut self) {
        let ch = charts();
        self.bpm = ch.bpm;
        let beat = 60.0 / ch.bpm;
        let lines = if let Some(n) = self.bars { ch.finale.iter().take(n).cloned().collect() } else { ch.party };
        for (b, line) in lines.iter().enumerate() {
            for (i, c) in line.chars().enumerate() {
                let lane = match c {
                    'L' => 0,
                    'R' => 1,
                    'B' => 2,
                    _ => continue,
                };
                let at = ch.lead_in_beats + b as f32 * 4.0 + i as f32 * 0.25;
                self.notes.push(Note { time: at * beat, lane, ..Default::default() });
            }
        }
        self.end = (ch.lead_in_beats + lines.len() as f32 * 4.0 + 2.0) * beat;
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        self.load();
        if self.wobble {
            return;
        }
        let at = cx.stage(Set::Boardwalk);
        ready_player(cx, Set::Boardwalk, at + Vec3::Y * 0.5, 0.0);
        cam(cx.sim, 18.0, 0.0, 9.5, 36.0);
        self.bounce = npc(cx.sim, "bounce");
        self.guests = cx.sim.state.entities.iter().filter(|e| e.name.starts_with("clapper")).map(|e| e.id).collect();
        c.say_key(Who::Bounce, "bounce.step_start", 0);
    }

    fn judge(&mut self, song: f32, left: bool, right: bool, r: &Rules, cx: &mut Cx, c: &mut RunCommon) {
        let w = r.step.good_window;
        for lane_press in [(left, 0u8), (right, 1u8)] {
            if !lane_press.0 {
                continue;
            }
            let lane = lane_press.1;
            let best = self
                .notes
                .iter()
                .enumerate()
                .skip(self.next.saturating_sub(4))
                .take_while(|(_, n)| n.time < song + w + 0.01)
                .filter(|(_, n)| n.judged == Judged::Pending && (n.time - song).abs() <= w)
                .filter(|(_, n)| match (n.lane, lane) {
                    (2, 0) => !n.l,
                    (2, 1) => !n.r,
                    (a, b) => a == b,
                })
                .min_by(|a, b| (a.1.time - song).abs().total_cmp(&(b.1.time - song).abs()))
                .map(|(i, _)| i);
            let Some(i) = best else {
                continue;
            };
            let n = &mut self.notes[i];
            let off = (n.time - song).abs();
            n.worst = n.worst.max(off);
            if lane == 0 {
                n.l = true;
            } else {
                n.r = true;
            }
            let done = n.lane != 2 || (n.l && n.r);
            if done {
                let perfect = n.worst <= r.step.perfect_window;
                n.judged = if perfect { Judged::Perfect } else { Judged::Good };
                let v = if perfect { 1.0 } else { r.step.good_value };
                self.sum += v;
                self.combo += 1;
                self.flash = 0.45;
                self.flash_word = if perfect { "Perfect".into() } else { "Good".into() };
                cx.sfx(if perfect { sound::HIT_PERFECT } else { sound::HIT_GOOD }, 0.5, 1.0);
                c.score = self.sum / self.notes.len().max(1) as f32 * 1000.0;
            }
        }
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let dt = cx.dt;
        // The music's clock when it is believable (it isn't for a moment as a song starts).
        let song = match it.song_pos {
            Some(p) if (p - c.t).abs() < 1.5 => p,
            _ => c.t,
        };
        self.song = song;
        let amp = if self.wobble { cx.rules.stand.band_wobble } else { 0.5 };
        c.step(cx, it.lean, amp, Vec2::ZERO, Vec2::ZERO);
        self.stunned = (self.stunned - dt).max(0.0);
        if self.wobble && c.core.tipped {
            self.stunned = 1.2;
            c.tip_fx(cx, true);
        }
        if self.stunned <= 0.0 {
            let rules = cx.rules;
            self.judge(song, it.l_just, it.r_just, rules, cx, c);
        }
        // Misses.
        let w = cx.rules.step.good_window;
        while let Some(n) = self.notes.get_mut(self.next) {
            if n.judged != Judged::Pending {
                self.next += 1;
            } else if n.time + w < song {
                n.judged = Judged::Miss;
                self.combo = 0;
                self.flash = 0.45;
                self.flash_word = "Miss".into();
                cx.ev.push(crate::frame::SimEvent::Sfx { id: sound::MISS, gain: 0.3, pitch: 1.0 });
                self.next += 1;
            } else {
                break;
            }
        }
        self.flash = (self.flash - dt).max(0.0);
        // The figure steps; the box bounces on the beat.
        if it.l_just {
            self.foot = 0;
            self.foot_l = 1.0;
        }
        if it.r_just {
            self.foot = 1;
            self.foot_r = 1.0;
        }
        self.foot_l = (self.foot_l - dt * 3.0).max(0.0);
        self.foot_r = (self.foot_r - dt * 3.0).max(0.0);
        if it.l_just || it.r_just {
            gesture(cx.sim, cx.pid, if self.foot == 0 { "FIT/StepL" } else { "FIT/StepR" }, false);
            cx.sfx(sound::STEP, 0.4, 1.0);
        }
        lean_figure(cx.sim, cx.pid, c.core.cob, 0.0, cx.rules.core.tilt_deg, cx.slump);
        let beat = (song * self.bpm / 60.0).floor() as i32;
        if beat != self.beat {
            self.beat = beat;
            if let Some(bo) = self.bounce {
                if let Some(a) = anim_of(cx.sim, bo) {
                    a.squash_vel = 3.0;
                }
            }
            if beat % 4 == 0 {
                for i in 0..self.guests.len() {
                    gesture(cx.sim, self.guests[i], "MESH2MOTION/Cheering_Two_Hands", true);
                }
                if !self.guests.is_empty() {
                    cx.sfx(sound::CLAP, 0.35, 1.0);
                }
            }
        }
        (song >= self.end).then_some(c.score)
    }

    pub fn stop(&mut self, _cx: &mut Cx) {}

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        if !self.wobble {
            c.top_bar(ui, "Step Party", Some(self.end - self.song));
        }
        // Two lanes on either side of the figure, falling to two footprints.
        let lanes = [640.0, 1280.0];
        let (top, foot) = (170.0, 880.0);
        let window = 1.6;
        for (i, &x) in lanes.iter().enumerate() {
            ui.panel(x - 74.0, top - 40.0, 148.0, foot - top + 120.0, with_alpha(WHITE, 0.5), 74.0);
            let press = if i == 0 { self.foot_l } else { self.foot_r };
            ui.circle(x, foot, 66.0 + press * 12.0, with_alpha(SEA, 0.5 + press * 0.5), TEAL, 8.0);
            ui.label(x, foot - 26.0, 44.0, INK, Align::Center, if i == 0 { "L" } else { "R" });
        }
        for n in &self.notes {
            let dt = n.time - self.song;
            if n.judged != Judged::Pending || !(-0.2..=window).contains(&dt) {
                continue;
            }
            let y = foot - (foot - top) * dt / window;
            let color = if n.lane == 2 { SUN } else if n.lane == 0 { TEAL } else { CORAL };
            if n.lane == 2 || n.lane == 0 {
                ui.circle(lanes[0], y, 50.0, color, WHITE, 6.0);
            }
            if n.lane == 2 || n.lane == 1 {
                ui.circle(lanes[1], y, 50.0, color, WHITE, 6.0);
            }
        }
        if self.flash > 0.0 {
            let col = match self.flash_word.as_str() {
                "Perfect" => TEAL,
                "Good" => MINT,
                _ => CORAL,
            };
            ui.label(960.0, 180.0, 72.0, col, Align::Center, self.flash_word.clone());
        }
        if self.combo >= 5 {
            ui.label(960.0, 270.0, 54.0, INK, Align::Center, format!("{} in a row", self.combo));
        }
        if self.wobble {
            let mut p = c.puck(false);
            p.r = 120.0;
            p.c = [960.0, 860.0];
            ui.puck(p);
        }
        let _ = r;
        ui.prompt_row_at(1040.0, &[(Act::StepL, "Left"), (Act::StepR, "Right")]);
    }

    pub fn bot(&self, c: &RunCommon, _r: &Rules) -> Intent {
        let mut it = Intent { lean: -c.core.cob * 0.6, ..Default::default() };
        let dt = 1.0 / 60.0;
        for n in self.notes.iter().skip(self.next) {
            if n.time > c.t + dt * 1.5 {
                break;
            }
            if n.judged == Judged::Pending && n.time >= c.t + dt * 0.5 - 0.001 {
                it.l_just |= n.lane != 1;
                it.r_just |= n.lane != 0;
            }
        }
        it
    }
}
