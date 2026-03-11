import { GameState } from './types';
import { System } from './systems/System';
import { MapManager } from './systems/MapManager';
import { PlayerManager } from './systems/PlayerManager';
import { AIManager } from './systems/AIManager';
import { EconomyManager } from './systems/EconomyManager';
import { CombatManager } from './systems/CombatManager';
import { UIManager } from './systems/UIManager';

export class GameStateManager {
  private static instance: GameStateManager;
  private currentState: GameState = GameState.MAIN_MENU;
  private systems: Map<string, System> = new Map();

  private constructor() {
    this.registerSystem('map', new MapManager());
    this.registerSystem('player', new PlayerManager());
    this.registerSystem('ai', new AIManager());
    this.registerSystem('economy', new EconomyManager());
    this.registerSystem('combat', new CombatManager());
    this.registerSystem('ui', new UIManager());
  }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  public getState(): GameState {
    return this.currentState;
  }

  public setState(newState: GameState, engine?: any) {
    console.log(`Transitioning from ${this.currentState} to ${newState}`);
    
    // Cleanup current state if needed
    if (this.currentState === GameState.IN_GAME) {
      this.shutdownSystems();
    }

    this.currentState = newState;

    // Init systems if entering InGame
    if (this.currentState === GameState.IN_GAME && engine) {
      this.initSystems(engine);
    }
  }

  private initSystems(engine: any) {
    console.log("Initializing InGame systems...");
    const initOrder = ['map', 'player', 'ai', 'economy', 'combat', 'ui'];
    for (const name of initOrder) {
      const system = this.systems.get(name);
      if (system) {
        system.init(engine);
      }
    }
  }

  private shutdownSystems() {
    console.log("Shutting down InGame systems...");
    for (const [name, system] of this.systems) {
      system.shutdown();
    }
  }

  public registerSystem(name: string, system: System) {
    this.systems.set(name, system);
  }
}
