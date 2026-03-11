import { System } from './System';
import { GameEngine } from '../engine';

export class PlayerManager implements System {
  init(engine: GameEngine) { console.log("PlayerManager Init"); }
  shutdown() { console.log("PlayerManager Shutdown"); }
}
