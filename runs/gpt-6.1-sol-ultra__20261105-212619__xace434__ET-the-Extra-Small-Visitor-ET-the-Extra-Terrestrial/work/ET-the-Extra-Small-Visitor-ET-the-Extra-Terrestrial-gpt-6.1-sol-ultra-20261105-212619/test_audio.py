from pathlib import Path
from playwright.sync_api import sync_playwright


def run_audio_checks(browser):
    page = browser.new_page()
    code = Path(__file__).with_name('audio.js').read_text().replace('export class ', 'class ').replace('export function ', 'function ')
    stats = page.evaluate('''async (source) => {
      const factory = new Function(source + '\\nreturn {GameAudio,synthTest};');
      const {GameAudio,synthTest} = factory();
      const ctx = new OfflineAudioContext(2, 44100 * 8, 44100);
      const audio = synthTest(ctx);
      const musicDefault = audio.musicVolume;
      const buffer = await ctx.startRendering();
      let sum = 0, peak = 0, invalid = 0;
      for(let channel=0;channel<buffer.numberOfChannels;channel++) {
        for(const x of buffer.getChannelData(channel)) {
          if(!Number.isFinite(x)) invalid++;
          sum += x*x; peak = Math.max(peak,Math.abs(x));
        }
      }
      const empty = new GameAudio();
      empty.sfx('collect'); empty.speak('locked'); empty.update(0.1); empty.pause(true);
      empty.setMusic(0); empty.setSfx(0); empty.dispose();
      return {musicDefault,rms:Math.sqrt(sum / buffer.length / 2),peak,invalid,notes:audio.stats.notes,syllables:audio.stats.syllables};
    }''', code)
    page.close()
    checks = [
        (stats['musicDefault'] == 0.1, 'Music must default to 10%'),
        (stats['invalid'] == 0, 'Offline audio contained invalid samples'),
        (0.0001 < stats['rms'] < 0.3, f"Offline audio signal RMS out of range: {stats['rms']}"),
        (0 < stats['peak'] < 0.98, f"Offline audio clipped or was silent: peak {stats['peak']}"),
        (stats['notes'] > 40 and stats['syllables'] >= 3, 'Score, effects and voice did not all synthesize'),
    ]
    return [message for success, message in checks if not success], len(checks)


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        failures, count = run_audio_checks(browser)
        browser.close()
    for failure in failures:
        print('FAIL:', failure)
    print(f'{count - len(failures)}/{count} audio checks passed')
    raise SystemExit(bool(failures))
