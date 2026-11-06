import { Poses } from './poses.js';
import { Cairn } from './cairn.js';
import { StillWater } from './stillWater.js';
import { LogReps } from './logReps.js';
import { Plank } from './plank.js';
import { Tug } from './tug.js';
import { StepClass } from './stepClass.js';
import { Plates } from './plates.js';
import { IslandLoop } from './islandLoop.js';
import { FruitHat } from './fruitHat.js';
import { RoomService } from './roomService.js';
import { Springboard } from './springboard.js';
import { Raft } from './raft.js';
import { GrandHold } from './grandHold.js';

export const EVENT_CLASSES = [
  Poses, Cairn, StillWater, LogReps, Plank, Tug, StepClass, Plates,
  IslandLoop, FruitHat, RoomService, Springboard, Raft, GrandHold,
];

export function eventById(id) {
  return EVENT_CLASSES.find((Event) => Event.id === id) || null;
}

export function eventIds() {
  return EVENT_CLASSES.map((Event) => Event.id);
}
