import { System } from './System';
import { GameEngine } from '../engine';

export class UIManager implements System {
  init(engine: GameEngine) { console.log("UIManager Init"); }
  shutdown() { console.log("UIManager Shutdown"); }
}
