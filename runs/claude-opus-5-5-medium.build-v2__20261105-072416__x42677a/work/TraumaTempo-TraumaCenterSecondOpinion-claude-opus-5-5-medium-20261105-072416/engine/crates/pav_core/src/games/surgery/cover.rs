//! Coverage counters: what a playthrough actually did. A test proves the campaign exercises
//! every instrument, hazard, strain phase, gift and the Code.

/// Every name a counter can have; unknown names are ignored (phases past the list, say).
pub const NAMES: &[&str] = &[
    "tool:scalpel", "tool:forceps", "tool:suture", "tool:suction", "tool:laser", "tool:gel", "tool:scanner", "tool:iv",
    "tool:cryo", "tool:dressing", "tool:defib",
    "rated:scalpel", "rated:forceps", "rated:suture", "rated:suction", "rated:laser", "rated:gel", "rated:iv", "rated:cryo",
    "rated:dressing", "rated:defib",
    "hazard:incision", "hazard:lacer", "hazard:pool", "hazard:bleeder", "hazard:object", "hazard:polyp", "hazard:tumor",
    "hazard:patch", "hazard:bone", "hazard:closure", "hazard:nodule", "hazard:sac", "hazard:eye", "hazard:ember",
    "hazard:furnace", "hazard:tendril",
    "done:incision", "done:lacer", "done:pool", "done:bleeder", "done:object", "done:polyp", "done:tumor", "done:patch",
    "done:bone", "done:closure", "done:nodule", "done:sac", "done:eye", "done:ember", "done:furnace", "done:tendril",
    "strain:introit", "strain:lacrimosa", "strain:dies", "strain:soloist", "strain:tendril", "strain:director",
    "lacrimosa:wave1", "lacrimosa:wave2", "lacrimosa:wave3", "lacrimosa:burst", "dies:countin", "dies:ring", "dies:merge",
    "dies:crack", "furnace:0", "furnace:1", "furnace:2", "furnace:3", "furnace:4", "duet:window", "hush:woke", "director:strain",
    "gift:hush", "gift:echo", "gift:duet", "echo:repeat", "code", "code:scripted", "on_beat", "chain", "wrong_tool", "scorch",
    "mistake:lacerate", "mistake:burn", "mistake:overdose", "death:time", "death:vitals", "death:code",
    "rating:immaculate", "rating:clean", "rating:good", "rating:sloppy",
];

pub fn mark(cov: &mut [u32], name: &str) {
    if let Some(k) = NAMES.iter().position(|n| *n == name) {
        if let Some(c) = cov.get_mut(k) {
            *c += 1;
        }
    }
}

pub fn merge(into: &mut Vec<u32>, from: &[u32]) {
    into.resize(NAMES.len(), 0);
    for (a, b) in into.iter_mut().zip(from) {
        *a += *b;
    }
}

pub fn get(cov: &[u32], name: &str) -> u32 {
    NAMES.iter().position(|n| *n == name).and_then(|k| cov.get(k).copied()).unwrap_or(0)
}
