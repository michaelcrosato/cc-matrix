use anyhow::{Result, anyhow};
use glam::Vec2;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::{Game, GameBox};
use crate::input::InputFrame;
use crate::room::RoomDef;
use crate::sim::Sim;

const LEVEL: &str = include_str!("fit.toml");

#[derive(Clone, Serialize, Deserialize)]
pub struct FitGame {
    pub center: Vec2,
    pub velocity: Vec2,
    pub elapsed: f32,
    pub stable: f32,
}

impl Default for FitGame {
    fn default() -> Self {
        Self { center: Vec2::ZERO, velocity: Vec2::ZERO, elapsed: 0.0, stable: 0.0 }
    }
}

impl FitGame {
    pub fn advance(&mut self, lean: Vec2, dt: f32) {
        self.elapsed += dt;
        let wobble = Vec2::new((self.elapsed * 1.7).sin(), (self.elapsed * 1.3).cos()) * 0.12;
        let target = lean.clamp_length_max(1.0) * 0.92 + wobble;
        let acceleration = (target - self.center) * 40.0 - self.velocity * 8.5;
        self.velocity += acceleration * dt;
        self.center += self.velocity * dt;
        if self.center.length() < 0.32 {
            self.stable += dt;
        }
    }
}

pub fn build(sim: &mut Sim, _rest: Option<&str>) -> Result<()> {
    let def = RoomDef::parse(&super::level_text(FitGame::KEY, LEVEL)).map_err(|error| anyhow!("fit.toml: {error}"))?;
    crate::scenes::build_standalone_room(sim, FitGame::KEY, def);
    sim.state.play = Some(GameBox::new(FitGame::default()));
    Ok(())
}

impl Game for FitGame {
    const KEY: &'static str = "fit";

    fn pre(&mut self, _sim: &mut Sim, input: &InputFrame, dt: f32, _events: &mut Vec<crate::frame::SimEvent>) -> std::collections::BTreeMap<crate::entity::EntityId, InputFrame> {
        self.advance(input.move_dir, dt);
        std::collections::BTreeMap::new()
    }

    fn status(&self, _sim: &Sim) -> serde_json::Value {
        json!({ "center": [self.center.x, self.center.y], "elapsed": self.elapsed, "stable": self.stable })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn balance_stays_finite_and_follows_input() {
        let mut game = FitGame::default();
        for _ in 0..120 {
            game.advance(Vec2::X, 1.0 / 60.0);
        }
        assert!(game.center.x > 0.7 && game.center.x < 1.1);
        assert!(game.center.is_finite());
    }

    #[test]
    fn center_resting_is_stable() {
        let mut game = FitGame::default();
        for _ in 0..120 {
            game.advance(Vec2::ZERO, 1.0 / 60.0);
        }
        assert!(game.stable > 1.9);
    }
}
