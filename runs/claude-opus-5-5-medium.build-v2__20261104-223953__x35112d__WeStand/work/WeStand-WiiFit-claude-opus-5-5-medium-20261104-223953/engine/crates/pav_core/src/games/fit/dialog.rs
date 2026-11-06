//! Lines that type out with voice blips. Action completes the line, then advances.

use std::collections::VecDeque;

use serde::{Deserialize, Serialize};

use super::ui_model::*;
use crate::frame::SimEvent;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Line {
    pub who: u8,
    pub text: String,
}

/// What happens when the lines run out.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum After {
    #[default]
    Nothing,
    StartCheck,
    IslandDay,
    EndDay,
    FinaleCheck,
    Ending,
    Credits,
    GotoCheck,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Dialog {
    pub lines: VecDeque<Line>,
    /// Letters shown of the first line.
    pub shown: f32,
    pub after: After,
    last_voice: usize,
}

impl Dialog {
    pub fn new(after: After) -> Self {
        Self { after, ..Default::default() }
    }

    pub fn push(&mut self, who: u8, text: impl Into<String>) {
        let text = text.into();
        if !text.is_empty() {
            self.lines.push_back(Line { who, text });
        }
    }

    pub fn finished_line(&self) -> bool {
        self.lines.front().is_none_or(|l| self.shown as usize >= l.text.chars().count())
    }

    /// Returns true when the dialog has run out of lines.
    pub fn tick(&mut self, confirm: bool, speed: f32, dt: f32, ev: &mut Vec<SimEvent>) -> bool {
        let Some(line) = self.lines.front() else { return true };
        let n = line.text.chars().count();
        let was_done = self.shown as usize >= n;
        if confirm {
            if was_done {
                self.lines.pop_front();
                self.shown = 0.0;
                self.last_voice = 0;
                ev.push(SimEvent::Sfx { id: super::sfx::MOVE, gain: 0.4, pitch: 1.2 });
                return self.lines.is_empty();
            }
            self.shown = n as f32;
            return false;
        }
        self.shown = (self.shown + 42.0 * speed * dt).min(n as f32);
        // A syllable per few letters: vowel from the letter, pitch falling at "." and rising at "?".
        let (rate, who) = (voice_rate(line.who), line.who);
        let at = self.shown as usize;
        while self.last_voice + rate <= at {
            self.last_voice += rate;
            let c = line.text.chars().nth(self.last_voice).unwrap_or(' ');
            let end = line.text.chars().skip(self.last_voice).take(4).find(|x| matches!(x, '.' | '?' | '!'));
            let pitch = match end {
                Some('.') => 0.86,
                Some('?') => 1.22,
                Some('!') => 1.1,
                _ => 0.96 + (c as u32 % 5) as f32 * 0.03,
            };
            if c.is_alphanumeric() {
                let vowel = match c.to_ascii_lowercase() {
                    'a' | 'h' | 'k' | 'q' | 'r' => 0,
                    'e' | 'b' | 'c' | 'd' | 'p' | 't' => 1,
                    'i' | 'g' | 'j' | 'l' | 'y' | 's' => 2,
                    'o' | 'f' | 'm' | 'n' | 'x' => 3,
                    _ => 4,
                };
                ev.push(SimEvent::Syllable { speaker: who, vowel, pitch });
            }
        }
        false
    }

    pub fn draw(&self, b: &mut B) {
        let Some(line) = self.lines.front() else { return };
        b.card([240.0, 760.0, 1680.0, 1040.0], DECK);
        let who = super::script::SPEAKERS.get(line.who as usize).copied().unwrap_or("");
        if !who.is_empty() {
            b.flat([280.0, 730.0, 280.0 + 40.0 + who.len() as f32 * 26.0, 800.0], TEAL, 26.0);
            b.text(300.0, 742.0, 40.0, WHITE, who);
        }
        let shown: String = line.text.chars().take(self.shown as usize).collect();
        b.wrap(300.0, 826.0, 1320.0, 46.0, INK, &shown);
        b.prompt(300.0, 978.0, &[Glyph::Back], "Skip");
        if self.finished_line() {
            b.prompt_right(1640.0, 978.0, &[Glyph::Confirm], "");
        }
    }
}

fn voice_rate(who: u8) -> usize {
    match who {
        super::script::BOUNCE | super::script::GULL => 2,
        super::script::KETTLE => 4,
        _ => 3,
    }
}
