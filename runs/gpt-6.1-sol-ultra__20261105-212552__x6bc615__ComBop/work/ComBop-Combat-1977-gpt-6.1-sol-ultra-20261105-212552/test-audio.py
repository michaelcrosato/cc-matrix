"""Procedural audio checks, also importable by the main game test runner."""
from pathlib import Path


def run_audio_checks(page):
    source = (Path(__file__).parent / 'audio.js').read_text().replace('export class AudioSystem', 'class AudioSystem')
    return page.evaluate('''async (source) => {
      const AudioSystem = new Function(source + '; return AudioSystem;')();
      const failures = [];
      let count = 0;
      const check = (ok, message) => { count++; if (!ok) failures.push(message); };
      const locked = new AudioSystem();
      check(locked.inspect().context === 'locked', 'Audio initializes before user gesture');
      check(locked.musicVolume === .1 && locked.sfxVolume === .7, 'Incorrect default audio volumes');
      const names = ['shoot','bounce','hit','explode','dash','pickup','click','start','win','lose','respawn'];
      for (const name of names.concat(['voice','music'])) {
        const context = new OfflineAudioContext(1, 96000, 48000);
        const audio = new AudioSystem({context});
        if (name === 'voice') audio.voice('win');
        else if (name === 'music') {
          audio.startMusic();
          audio.update(1/60);
        } else audio.sfx(name);
        const rendered = await context.startRendering();
        const values = rendered.getChannelData(0);
        let sum = 0, peak = 0, finite = true;
        for (const x of values) { sum += x*x; peak = Math.max(peak, Math.abs(x)); if (!Number.isFinite(x)) finite = false; }
        const rms = Math.sqrt(sum / values.length);
        check(finite && rms > .00001 && peak < 1, `Audio ${name}: silence, clipping or nonfinite samples (rms=${rms}, peak=${peak})`);
      }
      const context = new OfflineAudioContext(1, 48000, 48000);
      const audio = new AudioSystem({context});
      audio.setMuted(true); audio.setMusic(2); audio.setSfx(-2);
      check(audio.inspect().muted && audio.musicVolume === 1 && audio.sfxVolume === 0, 'Audio setters fail to clamp or mute');
      audio.startMusic(); audio.update(.016); audio.stopMusic();
      check(audio.inspect().musicStep > 0 && !audio.musicPlaying, 'Music lifecycle does not start/schedule/stop');
      return {failures, count};
    }''', source)


if __name__ == '__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        report = run_audio_checks(page)
        browser.close()
    for failure in report['failures']:
        print('FAIL:', failure)
    print(f"{report['count']} audio checks, {len(report['failures'])} failures")
    raise SystemExit(bool(report['failures']))
