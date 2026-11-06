/**
 * @file Checks over the cases and the story. A bad id, a missing scene, a stub word, or a name the plan forbids
 * is a problem string. Tests and the handbook both refuse to ship a list that is not empty.
 */
import { CASES } from './cases';
import { SCENES, sceneById } from './story';
import type { CaseDef } from './types';

/** Names and phrases that must not appear, even inside a longer sentence. */
const BANNED = [
  'derek stiles',
  'angie thompson',
  'naomi kimishima',
  'nozomi weaver',
  'hope hospital',
  'caduceus',
  'delphi',
  'guilt',
  'healing touch',
  'kyriaki',
  'deftera',
  'triti',
  'tetarti',
  'pempti',
  'paraskevi',
  'savato',
  'z-cells',
  'z cells',
  'star gesture',
];

/** Whole words that are too short to ban as a substring. */
const BANNED_WORDS = ['adam', 'bliss'];

/** Banned hits in `text`, lower-cased. */
export function bannedHits(text: string): string[] {
  const lower = text.toLowerCase();
  const hits = BANNED.filter((phrase) => lower.includes(phrase));
  for (const word of BANNED_WORDS) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) hits.push(word);
  }
  if (/\b(TODO|placeholder|lorem)\b/i.test(text)) hits.push('stub');
  return hits;
}

/** Problems in one case. Empty means it can be played. */
export function validateCase(def: CaseDef): string[] {
  const problems: string[] = [];
  if (!def.id.startsWith('case:')) problems.push(`${def.id}: id`);
  if (def.phases.length < 1) problems.push(`${def.id}: no phases`);
  if (!sceneById(def.storyBefore)) problems.push(`${def.id}: missing ${def.storyBefore}`);
  if (!sceneById(def.storyAfter)) problems.push(`${def.id}: missing ${def.storyAfter}`);
  if (def.patients.length < 1) problems.push(`${def.id}: no patient`);
  if (def.par <= 0) problems.push(`${def.id}: par`);
  for (const patient of def.patients) {
    for (const letter of ['S', 'A', 'B', 'C'] as const) {
      if (!patient.postcards[letter]) problems.push(`${def.id}: postcard ${letter}`);
    }
  }
  for (const hit of bannedHits(JSON.stringify(def))) problems.push(`${def.id}: ${hit}`);
  return problems;
}

/** Problems in the story, plus any extra lines the page shows. */
export function validateStory(extra: readonly string[] = []): string[] {
  const problems: string[] = [];
  for (const scene of SCENES) {
    if (scene.boxes.length < 12 || scene.boxes.length > 35) {
      problems.push(`${scene.id}: ${scene.boxes.length} boxes`);
    }
    for (const box of scene.boxes) {
      if (!box.who || !box.text) problems.push(`${scene.id}: empty box`);
      for (const hit of bannedHits(`${box.who} ${box.text} ${box.drama ?? ''}`)) problems.push(`${scene.id}: ${hit}`);
    }
  }
  for (const line of extra) {
    for (const hit of bannedHits(line)) problems.push(`page: ${hit}`);
  }
  return problems;
}

/** Every case, story included. */
export function validateAll(extra: readonly string[] = []): string[] {
  return [...CASES.flatMap(validateCase), ...validateStory(extra)];
}
