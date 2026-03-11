import { Vector2D, GAME_CONFIG, Team, EntityType, TerrainType, Entity, AnimationState, AbilitySlot, AbilityType } from './types';

export interface MonsterCamp {
  id: string;
  pos: Vector2D;
  type: 'SMALL' | 'LARGE' | 'BOSS';
  monsterIds: string[];
  respawnTime: number;
  isDead: boolean;
}

export class MapGenerator {
  static generateLanes(): { [key: string]: Vector2D[] } {
    const W = GAME_CONFIG.MAP_WIDTH;
    const H = GAME_CONFIG.MAP_HEIGHT;
    const padding = 150;

    return {
      top: [
        { x: 100, y: H / 2 },
        { x: 100, y: padding },
        { x: W - 100, y: padding },
        { x: W - 100, y: H / 2 }
      ],
      mid: [
        { x: 100, y: H / 2 },
        { x: W - 100, y: H / 2 }
      ],
      bottom: [
        { x: 100, y: H / 2 },
        { x: 100, y: H - padding },
        { x: W - 100, y: H - padding },
        { x: W - 100, y: H / 2 }
      ]
    };
  }

  static generateTerrain(): any[] {
    const terrain: any[] = [];
    const W = GAME_CONFIG.MAP_WIDTH;
    const H = GAME_CONFIG.MAP_HEIGHT;

    // Generate River in the middle
    // For simplicity, river is a vertical strip in the middle
    // But MOBA rivers are usually diagonal. Let's do a vertical one for now.
    
    // Generate Rocks and Trees in Jungle areas
    // Jungle areas are between lanes
    const jungleAreas = [
      { minX: 300, maxX: W - 300, minY: 200, maxY: H / 2 - 200 }, // Upper Jungle
      { minX: 300, maxX: W - 300, minY: H / 2 + 200, maxY: H - 200 } // Lower Jungle
    ];

    jungleAreas.forEach(area => {
      for (let i = 0; i < 20; i++) {
        const x = area.minX + Math.random() * (area.maxX - area.minX);
        const y = area.minY + Math.random() * (area.maxY - area.minY);
        
        const type = Math.random() > 0.5 ? TerrainType.ROCK : TerrainType.TREE;
        terrain.push({
          id: `terrain-${terrain.length}`,
          type: EntityType.TERRAIN,
          terrainType: type,
          pos: { x, y },
          radius: type === TerrainType.ROCK ? 40 : 30,
          team: Team.NEUTRAL,
          health: 1000,
          maxHealth: 1000,
          isDead: false,
          isVisible: true
        });
      }
    });

    return terrain;
  }

  static generateMonsterCamps(): MonsterCamp[] {
    const W = GAME_CONFIG.MAP_WIDTH;
    const H = GAME_CONFIG.MAP_HEIGHT;
    
    return [
      // Upper Jungle Camps
      { id: 'camp-up-1', pos: { x: 800, y: 400 }, type: 'SMALL', monsterIds: [], respawnTime: 0, isDead: false },
      { id: 'camp-up-2', pos: { x: 2200, y: 400 }, type: 'SMALL', monsterIds: [], respawnTime: 0, isDead: false },
      { id: 'camp-up-large', pos: { x: 1500, y: 300 }, type: 'LARGE', monsterIds: [], respawnTime: 0, isDead: false },
      
      // Lower Jungle Camps
      { id: 'camp-low-1', pos: { x: 800, y: H - 400 }, type: 'SMALL', monsterIds: [], respawnTime: 0, isDead: false },
      { id: 'camp-low-2', pos: { x: 2200, y: H - 400 }, type: 'SMALL', monsterIds: [], respawnTime: 0, isDead: false },
      { id: 'camp-low-large', pos: { x: 1500, y: H - 300 }, type: 'LARGE', monsterIds: [], respawnTime: 0, isDead: false },
      
      // World Boss
      { id: 'camp-boss', pos: { x: W / 2, y: H / 2 }, type: 'BOSS', monsterIds: [], respawnTime: 0, isDead: false }
    ];
  }
}
