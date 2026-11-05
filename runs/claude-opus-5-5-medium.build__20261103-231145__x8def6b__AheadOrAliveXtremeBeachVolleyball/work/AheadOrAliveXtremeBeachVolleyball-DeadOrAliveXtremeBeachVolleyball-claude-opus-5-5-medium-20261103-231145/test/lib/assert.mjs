// a tiny assertion collector: suites call t(name, ok, detail); only failures print
export function makeT(suite, out) {
  return (name, ok, detail = '') => { out.n++; if (!ok) { out.fail++; out.lines.push('FAIL ' + suite + ' › ' + name + (detail ? ': ' + String(detail).slice(0, 400) : '')); } return ok; };
}
