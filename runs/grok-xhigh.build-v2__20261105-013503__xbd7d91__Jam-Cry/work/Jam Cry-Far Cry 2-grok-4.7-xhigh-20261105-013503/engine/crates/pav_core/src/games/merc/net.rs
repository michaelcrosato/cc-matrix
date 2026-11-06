//! Host-authoritative messages on an in-memory link. Latency, jitter and loss are seeded.

use serde::{Deserialize, Serialize};

use super::world::World;
use crate::rng::Rng;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Msg {
    pub at: f32,
    pub reliable: bool,
    pub body: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Link {
    pub latency: f32,
    pub jitter: f32,
    pub loss: f32,
    pub rng: Rng,
    pub now: f32,
    pub queue: Vec<Msg>,
    pub sent: u32,
    pub window: u32,
    pub window_t: f32,
    pub max_per_sec: u32,
    pub max_bytes: usize,
    pub finishes: u32,
}

impl Link {
    pub fn new(seed: u64, latency: f32, jitter: f32, loss: f32) -> Self {
        Self {
            latency,
            jitter,
            loss,
            rng: Rng::new(seed),
            now: 0.0,
            queue: Vec::new(),
            sent: 0,
            window: 0,
            window_t: 0.0,
            max_per_sec: 0,
            max_bytes: 0,
            finishes: 0,
        }
    }

    pub fn advance(&mut self, dt: f32) {
        self.now += dt;
        self.window_t += dt;
        if self.window_t >= 1.0 {
            self.max_per_sec = self.max_per_sec.max(self.window);
            self.window = 0;
            self.window_t = 0.0;
        }
    }

    pub fn send(&mut self, reliable: bool, body: String) {
        self.sent += 1;
        self.window += 1;
        self.max_bytes = self.max_bytes.max(body.len());
        if !reliable && self.rng.f32() < self.loss {
            return;
        }
        let j = (self.rng.f32() - 0.5) * 2.0 * self.jitter;
        let at = self.now + self.latency + j.max(0.0);
        self.queue.push(Msg { at, reliable, body });
    }

    pub fn poll(&mut self) -> Vec<String> {
        let mut out = Vec::new();
        let mut stay = Vec::new();
        for m in self.queue.drain(..) {
            if m.at <= self.now {
                out.push(m.body);
            } else {
                stay.push(m);
            }
        }
        self.queue = stay;
        out
    }
}

/// One host tick of the depot contract: fire deltas and, once, the finish.
pub fn host_publish(host: &World, link: &mut Link, finished: bool) {
    if link.finishes > 0 {
        return;
    }
    // Reliable fire cells, at most five sends a second, each body under 1200 bytes.
    if link.window < 5 {
        let mut n = 0;
        for (cell, c) in &host.fire.cells {
            if !c.burning || n >= 4 || link.window >= 5 {
                break;
            }
            let body = format!("{{\"t\":\"fire\",\"c\":[{},{}]}}", cell.0, cell.1);
            if body.len() < 1200 {
                link.send(true, body);
                n += 1;
            }
        }
    }
    if finished {
        link.finishes += 1;
        link.send(true, "{\"t\":\"finish\",\"won\":true}".into());
    }
}

pub fn client_apply(client: &mut World, bodies: &[String]) {
    for b in bodies {
        if let Some(rest) = b.strip_prefix("{\"t\":\"fire\"") {
            // {"t":"fire","x":N,"z":M}
            let nums: Vec<i32> = rest
                .split(|ch: char| !ch.is_ascii_digit() && ch != '-')
                .filter_map(|s| if s.is_empty() { None } else { s.parse().ok() })
                .collect();
            if nums.len() >= 2 {
                let _ = client.fire.ignite_cell((nums[0], nums[1]), client.tune.burn_time, client.minutes);
            }
        }
    }
}
