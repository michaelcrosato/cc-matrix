//! The Inter-Resort Medley: Paddle Slalom, Tide Table, Cannonball Cup in a row, one seed.
//! Used by AI Hub sessions and by Play Together.

use serde::{Deserialize, Serialize};

use super::events::Kind;

pub const ORDER: [Kind; 3] = [Kind::Paddle, Kind::Tide, Kind::Dive];

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Medley {
    pub players: Vec<String>,
    pub player: usize,
    pub idx: usize,
    pub scores: Vec<i32>,
    pub done: bool,
    /// Finished players' totals (Play Together).
    pub totals: Vec<i32>,
    pub runs: Vec<Vec<Vec<[i16; 2]>>>,
    /// This player's runs so far (moved to `runs` when they finish).
    pub cur: Vec<Vec<[i16; 2]>>,
}

impl Medley {
    pub fn total(&self) -> i32 {
        self.scores.iter().sum()
    }
    pub fn label(&self) -> String {
        match self.idx {
            0 => "Paddle Slalom".into(),
            1 => "Tide Table".into(),
            2 => "Cannonball Cup".into(),
            _ => "Finished".into(),
        }
    }
    pub fn area(&self) -> i32 {
        if self.done { -1 } else { self.idx as i32 }
    }
}
