import { Entity, EntityType, Team, Vector2D, Ability } from './types';

export class ChampionBase implements Entity {
  id: string;
  type: EntityType = EntityType.CHAMPION;
  team: Team;
  pos: Vector2D;
  radius: number = 25;
  
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  speed: number;
  attackRange: number;
  attackDamage: number;
  attackSpeed: number;
  lastAttackTime: number = 0;
  
  cooldownReduction: number; // e.g. 0.1 for 10%
  
  isDead: boolean = false;
  shield: number = 0;
  maxShield: number = 0;
  visionRange: number = 500;
  isVisible: boolean = true;
  
  // Entity properties
  gold: number = 0;
  rotationSpeed: number = 0;
  isMoving: boolean = false;
  stoppingDistance: number = 0;
  isStunned: boolean = false;
  isRooted: boolean = false;
  isCasting: boolean = false;
  items: any[] = []; // Should be Item[]
  activeBuffs: any[] = []; // Should be Buff[]
  activeStatusEffects: any[] = []; // Should be StatusEffect[]
  level: number = 1;
  xp: number = 0;
  skillPoints: number = 0;

  abilities: {
    passive: Ability;
    q: Ability;
    w: Ability;
    e: Ability;
    r: Ability;
  };
  
  constructor(id: string, team: Team, pos: Vector2D, config: Partial<ChampionBase> & { abilities: ChampionBase['abilities'] }) {
    this.id = id;
    this.team = team;
    this.pos = pos;
    
    this.health = config.health ?? 600;
    this.maxHealth = config.maxHealth ?? 600;
    this.mana = config.mana ?? 300;
    this.maxMana = config.maxMana ?? 300;
    this.speed = config.speed ?? 4;
    this.attackRange = config.attackRange ?? 150;
    this.attackDamage = config.attackDamage ?? 60;
    this.attackSpeed = config.attackSpeed ?? 0.8;
    this.cooldownReduction = config.cooldownReduction ?? 0;
    
    this.abilities = config.abilities;
    
    if (config.visionRange !== undefined) {
      this.visionRange = config.visionRange;
    }
    if (config.isVisible !== undefined) {
      this.isVisible = config.isVisible;
    }
  }
}
