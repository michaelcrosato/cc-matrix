use super::events::Kind;
#[derive(serde::Deserialize)]
struct Bank {
    pip: Lines,
    posey: Lines,
    kettle: Lines,
    bounce: Lines,
    gull: Lines,
    awards: Awards,
}
#[derive(serde::Deserialize)]
struct Lines {
    lines: Vec<String>,
}
#[derive(serde::Deserialize)]
struct Awards {
    titles: Vec<String>,
}
fn bank() -> &'static Bank {
    static DATA: std::sync::OnceLock<Bank> = std::sync::OnceLock::new();
    DATA.get_or_init(|| toml::from_str(include_str!("script.toml")).expect("authored resort dialogue"))
}
pub fn pip(day: u8, age: u8, n: usize) -> String {
    if age <= 40 {
        format!("Balance Age {age}. The rowboat has begun to respect you.")
    } else if n % 3 == 0 {
        format!("Balance Age {age}. A number with room for improvement.")
    } else {
        let b = &bank().pip.lines;
        b[((day as usize - 1) * 16 + n % 16) % b.len()].clone()
    }
}
pub fn coach(k: Kind, day: u8, n: usize) -> String {
    let b = bank();
    let lines = match k.coach() {
        "POSEY" => &b.posey.lines,
        "BIG KETTLE" => &b.kettle.lines,
        "BOUNCE" => &b.bounce.lines,
        "COMMODORE GULL" => &b.gull.lines,
        _ => &b.pip.lines,
    };
    lines[(n + day as usize * 3) % lines.len()].clone()
}
pub fn title(score: u32, variant: usize) -> String {
    let a = &bank().awards.titles;
    let group = (score / 170).min(5) as usize;
    a[(group * 6 + variant) % a.len()].clone()
}
