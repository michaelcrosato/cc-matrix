//! Dialogue: types out with voice blips. Action completes the line, then advances.

use serde::{Deserialize, Serialize};

use crate::frame::SimEvent;

/// Who talks: voice and name.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum Who {
    #[default]
    Pip = 0,
    Posey = 1,
    Kettle = 2,
    Bounce = 3,
    Gull = 4,
    Marjorie = 5,
    Tom = 6,
    Twins = 7,
}

impl Who {
    pub fn name(self) -> &'static str {
        match self {
            Who::Pip => "Pip",
            Who::Posey => "Posey",
            Who::Kettle => "Big Kettle",
            Who::Bounce => "Bounce",
            Who::Gull => "Commodore Gull",
            Who::Marjorie => "Marjorie",
            Who::Tom => "Two-Towel Tom",
            Who::Twins => "The Twins",
        }
    }
    /// Letters a second at normal speed.
    fn rate(self) -> f32 {
        match self {
            Who::Pip => 34.0,
            Who::Posey => 22.0,
            Who::Kettle => 24.0,
            Who::Bounce => 52.0,
            Who::Gull => 38.0,
            Who::Marjorie => 26.0,
            Who::Tom => 30.0,
            Who::Twins => 40.0,
        }
    }
    /// Letters per syllable.
    fn per_syllable(self) -> usize {
        match self {
            Who::Bounce | Who::Gull => 2,
            _ => 3,
        }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Dialog {
    pub who: Who,
    pub lines: Vec<String>,
    pub i: usize,
    /// Letters shown of line `i`.
    pub shown: f32,
    pub last_syllable: usize,
    pub wait: f32,
}

impl Dialog {
    pub fn new(who: Who, lines: Vec<String>) -> Self {
        Self { who, lines, ..Default::default() }
    }

    pub fn text(&self) -> &str {
        self.lines.get(self.i).map(|s| s.as_str()).unwrap_or("")
    }

    pub fn complete(&self) -> bool {
        self.shown as usize >= self.text().chars().count()
    }

    /// Types on. `speed` is the Text Speed setting (0..2).
    pub fn tick(&mut self, speed: u8, dt: f32, ev: &mut Vec<SimEvent>) {
        self.wait = (self.wait - dt).max(0.0);
        if self.complete() {
            return;
        }
        let mult = [0.7, 1.0, 1.7][speed.min(2) as usize];
        self.shown += self.who.rate() * mult * dt;
        let n = self.shown as usize;
        let chars: Vec<char> = self.text().chars().collect();
        let per = self.who.per_syllable();
        while self.last_syllable + per <= n.min(chars.len()) {
            let at = self.last_syllable;
            self.last_syllable += per;
            let c = chars[(at + per - 1).min(chars.len() - 1)];
            if c == ' ' {
                continue;
            }
            let vowel = match c.to_ascii_lowercase() {
                'a' | 'h' | 'r' | 'l' => 0,
                'e' | 'd' | 't' | 'n' => 1,
                'i' | 'y' | 's' | 'c' => 2,
                'o' | 'g' | 'k' | 'w' => 3,
                _ => 4,
            };
            // Pitch falls toward a full stop and rises toward a question.
            let end = chars[(at + per + 6).min(chars.len() - 1)..].iter().find(|c| matches!(c, '.' | '?' | '!')).copied();
            let pitch = match end {
                Some('?') => 1.15,
                Some('!') => 1.08,
                Some('.') if chars.len() - at < 10 => 0.88,
                _ => 1.0,
            };
            ev.push(SimEvent::Syllable { speaker: self.who as u8, vowel, pitch });
        }
    }

    /// Action pressed: completes the line, or goes on. True when the dialogue is over.
    pub fn advance(&mut self) -> bool {
        if !self.complete() {
            self.shown = self.text().chars().count() as f32;
            self.last_syllable = self.shown as usize;
            return false;
        }
        self.i += 1;
        self.shown = 0.0;
        self.last_syllable = 0;
        self.wait = 0.0;
        self.i >= self.lines.len()
    }
}
