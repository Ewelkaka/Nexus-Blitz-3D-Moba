import { System } from './System';
import { GameEngine } from '../engine';

export class MapManager implements System {
  init(engine: GameEngine) { console.log("MapManager Init"); }
  shutdown() { console.log("MapManager Shutdown"); }
}
