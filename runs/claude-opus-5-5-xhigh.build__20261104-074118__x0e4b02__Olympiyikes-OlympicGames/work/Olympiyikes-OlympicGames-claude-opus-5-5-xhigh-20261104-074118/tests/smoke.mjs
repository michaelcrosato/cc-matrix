import { boot } from './harness.mjs';
const h = boot({ verbose: true });
console.log('booted', Object.keys(h.O).length, h.errors());
