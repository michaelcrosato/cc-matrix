//! The story scene player: stage commands and lines, read from the story files.

use std::sync::Arc;

use serde::{Deserialize, Serialize};

use super::frame::{ActorView, StoryView};
use super::{Stage, Surgery, content, cue};
use crate::frame::SimEvent;

/// Where a stage name puts a character.
pub fn stage_x(at: &str) -> f32 {
    match at {
        "left" => -3.1,
        "right" => 3.1,
        "centre" | "center" => 0.0,
        "farleft" => -4.9,
        "farright" => 4.9,
        _ => 3.1,
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct StoryState {
    pub key: Arc<str>,
    pub i: usize,
    pub t: f32,
    pub typed: bool,
    pub set: Arc<str>,
    pub who: Arc<str>,
    pub text: Arc<str>,
    pub actors: Vec<ActorView>,
    pub music: Arc<str>,
    pub camera_or: bool,
    pub flash: f32,
    pub shake: f32,
}

impl StoryState {
    pub fn view(&self, cps: f32) -> StoryView {
        let total = self.text.chars().count() as f32;
        let chars = if self.typed { total } else { (self.t * cps).min(total) };
        let talking = !self.typed && chars < total;
        let actors = self
            .actors
            .iter()
            .map(|a| {
                let mut a = a.clone();
                a.talking = talking && a.who == self.who;
                a
            })
            .collect();
        StoryView {
            key: self.key.clone(),
            line: self.i as u32,
            who: self.who.clone(),
            text: self.text.clone(),
            chars: chars as u32,
            typed: self.typed || chars >= total,
            set: self.set.clone(),
            actors,
            camera_or: self.camera_or,
            flash: self.flash,
            shake: self.shake,
            t: self.t,
        }
    }
}

impl Surgery {
    pub fn begin_story(&mut self, key: &str, events: &mut Vec<SimEvent>) {
        self.story = StoryState { key: key.into(), set: "corridor".into(), music: "tense".into(), ..Default::default() };
        self.stage = Stage::Story;
        self.stage_t = 0.0;
        self.op.counters.bump("story");
        self.story_step(0, events);
    }

    /// Runs lines from `from`: commands until a spoken line stops it, or the end of the scene.
    fn story_step(&mut self, from: usize, events: &mut Vec<SimEvent>) {
        let content = content::get();
        let Some(def) = content.stories.get(&*self.story.key) else {
            self.story_done(events);
            return;
        };
        let mut i = from;
        while let Some(l) = def.line.get(i) {
            let st = &mut self.story;
            if !l.set.is_empty() {
                st.set = l.set.as_str().into();
            }
            if !l.music.is_empty() {
                st.music = l.music.as_str().into();
            }
            if !l.camera.is_empty() {
                st.camera_or = l.camera == "or";
            }
            if l.flash > 0.0 {
                st.flash = l.flash;
            }
            if l.shake > 0.0 {
                st.shake = l.shake;
            }
            if !l.exit.is_empty() {
                let who = l.exit.as_str();
                for a in st.actors.iter_mut() {
                    if who == "all" || &*a.who == who {
                        a.leaving = true;
                        a.t = 0.0;
                    }
                }
            }
            if !l.enter.is_empty() {
                let x = stage_x(&l.at);
                let who: Arc<str> = l.enter.as_str().into();
                st.actors.retain(|a| a.who != who);
                st.actors.push(ActorView { who, expr: "neutral".into(), x, t: 0.0, leaving: false, talking: false });
            }
            if !l.who.is_empty() {
                let who: Arc<str> = l.who.as_str().into();
                if !l.expr.is_empty() {
                    if let Some(a) = st.actors.iter_mut().find(|a| a.who == who) {
                        a.expr = l.expr.as_str().into();
                    }
                }
            } else if !l.expr.is_empty() {
                // An expression change with no line needs a who; there is none.
            }
            if !l.cue.is_empty() {
                if let Some(id) = cue::id(&l.cue) {
                    let at = glam::Vec2::ZERO;
                    self.cue_at(events, id, at);
                }
            }
            if !l.who.is_empty() && !l.text.is_empty() {
                let st = &mut self.story;
                st.i = i;
                st.t = 0.0;
                st.typed = false;
                st.who = l.who.as_str().into();
                st.text = l.text.as_str().into();
                return;
            }
            i += 1;
        }
        self.story.i = i;
        self.story_done(events);
    }

    pub(super) fn story_tick(&mut self, dt: f32, _events: &mut Vec<SimEvent>) {
        let st = &mut self.story;
        st.t += dt;
        st.flash = (st.flash - dt * 2.0).max(0.0);
        st.shake = (st.shake - dt * 2.5).max(0.0);
        for a in &mut st.actors {
            a.t += dt;
        }
        st.actors.retain(|a| !(a.leaving && a.t > 0.5));
        self.op.clock += dt;
        self.heart.tick(dt, 100.0, 1.0);
    }

    pub(super) fn story_advance(&mut self, events: &mut Vec<SimEvent>) {
        let total = self.story.text.chars().count() as f32;
        if !self.story.typed && self.story.t * self.text_cps < total {
            self.story.typed = true;
            return;
        }
        let next = self.story.i + 1;
        self.story_step(next, events);
    }

    pub(super) fn story_skip(&mut self, events: &mut Vec<SimEvent>) {
        self.story_done(events);
    }

    /// The scene is over: on to the chart, or the next case after an "after" scene.
    fn story_done(&mut self, events: &mut Vec<SimEvent>) {
        self.story.actors.clear();
        if self.mode == super::Mode::Attract {
            self.attract_t = 99.0;
            self.stage = Stage::Title;
            return;
        }
        let content = content::get();
        let after = content.case(self.op.case).map(|c| c.after.clone()).unwrap_or_default();
        if &*self.story.key == after.as_str() {
            self.next_campaign_case(events);
        } else {
            self.stage = Stage::Chart;
            self.stage_t = 0.0;
        }
    }
}
