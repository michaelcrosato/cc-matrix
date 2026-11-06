from pathlib import Path

from playwright.sync_api import sync_playwright


def audio_checks(browser):
    source = (
        Path(__file__)
        .with_name("audio.js")
        .read_text()
        .replace("export class AudioDirector", "class AudioDirector")
    )
    page = browser.new_page()
    try:
        results = page.evaluate(
            source
            + """
        (async () => {
          const checks = [];
          const context = new OfflineAudioContext(2, 48000 * 3, 48000);
          const audio = new AudioDirector({context});
          checks.push(['music defaults to 10%', audio.musicVolume === 0.1]);
          audio.update(1/60, {flying:true, speed:25});
          checks.push(['music schedules notes', audio.notesPlayed > 0]);
          const beforePause = audio.notesPlayed;
          audio.setMode('paused'); audio.update(1/60);
          checks.push(['pause schedules no music', beforePause === audio.notesPlayed]);
          audio.setMode('play'); audio.setMuted(true); audio.update(1/60);
          checks.push(['mute schedules no music', beforePause === audio.notesPlayed]);
          audio.setMuted(false);
          for (const name of ['launch','pickup','deliver','scan','hit','heal','transform','subway','win','click']) audio.sfx(name);
          audio.speak(7);
          checks.push(['all ten effects dispatched', audio.sfxCount === 10]);
          checks.push(['gibberish voice dispatched', audio.voiceCount === 1]);
          const buffer = await context.startRendering();
          let energy=0, peak=0, finite=true;
          for (const x of buffer.getChannelData(0)) { energy += x*x; peak=Math.max(peak,Math.abs(x)); finite = finite && Number.isFinite(x); }
          checks.push(['rendered audio audible and finite', finite && Math.sqrt(energy/buffer.length)>0.01]);
          checks.push(['rendered audio avoids clipping', peak < 1]);
          return checks;
        })()
        """
        )
    finally:
        page.close()
    return [("Audio: " + name, passed, "") for name, passed in results]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        results = audio_checks(browser)
        browser.close()
    failures = [name for name, passed, detail in results if not passed]
    for name in failures:
        print("FAIL audio: " + name)
    print(f"{len(results) - len(failures)}/{len(results)} audio checks passed")
    raise SystemExit(bool(failures))


if __name__ == "__main__":
    main()
