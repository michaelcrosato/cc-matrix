import { validateAllClips, CLIP_DEFS } from '../src/art/clips.js';
const p = validateAllClips(); console.log(CLIP_DEFS.length, 'clips', p.length ? p : 'valid');
