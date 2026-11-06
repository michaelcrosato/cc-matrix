/** @file Writes test progress for long headless playthroughs without adding console noise. */
import { writeFileSync, mkdirSync } from 'node:fs';
export default class Progress {
  onTestCaseReady(test) {
    mkdirSync('out/test', { recursive: true });
    writeFileSync(
      'out/test/current.json',
      JSON.stringify({ test: test.fullName, phase: 'running', at: new Date().toISOString() }),
    );
  }
  onTestCaseResult(test) {
    writeFileSync(
      'out/test/current.json',
      JSON.stringify({
        test: test.fullName,
        phase: 'finished',
        result: test.result?.().state ?? 'unknown',
        at: new Date().toISOString(),
      }),
    );
  }
}
