export interface Vector2D {
  x: number;
  y: number;
}

export enum GameState {
  MAIN_MENU = 'MAIN_MENU',
  CHAMPION_SELECT = 'CHAMPION_SELECT',
  LOADING = 'LOADING',
  IN_GAME = 'IN_GAME',
  PAUSE = 'PAUSE',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
}

export enum GameMode {
  STANDARD = 'STANDARD',
  BLITZ = 'BLITZ',
}

export enum EventType {
  DOUBLE_DAMAGE = 'DOUBLE_DAMAGE',
  METEOR_ZONES = 'METEOR_ZONES',
  KOTH = 'KOTH',
}

export enum Team {
  BLUE = 'BLUE',
  RED = 'RED',
  NEUTRAL = 'NEUTRAL'
}

export enum EntityType {
  CHAMPION = 'CHAMPION',
  MINION = 'MINION',
  TOWER = 'TOWER',
  INHIBITOR = 'INHIBITOR',
  NEXUS = 'NEXUS',
  PROJECTILE = 'PROJECTILE',
  JUNGLE_CAMP = 'JUNGLE_CAMP',
  MONSTER = 'MONSTER',
  BOSS = 'BOSS',
  TERRAIN = 'TERRAIN',
}

export enum BuffType {
  RED_BUFF = 'RED_BUFF',
  BLUE_BUFF = 'BLUE_BUFF',
  BOSS_BUFF = 'BOSS_BUFF',
}

export interface Buff {
  type: BuffType;
  endTime: number;
}

export enum StatusEffectType {
  SLOW = 'SLOW',
  STUN = 'STUN',
  ROOT = 'ROOT',
  BURN = 'BURN',
}

export enum AnimationState {
  IDLE = 'IDLE',
  RUN = 'RUN',
  ATTACK = 'ATTACK',
  CAST = 'CAST',
  DEATH = 'DEATH',
}

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  endTime: number;
  intensity: number;
}

export enum MinionType {
  MELEE = 'MELEE',
  RANGED = 'RANGED',
}

export enum TerrainType {
  ROCK = 'ROCK',
  TREE = 'TREE',
  BUSH = 'BUSH',
  RIVER = 'RIVER',
}

export interface TerrainEntity extends Entity {
  terrainType: TerrainType;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  stats: {
    damage?: number;
    health?: number;
    cooldownReduction?: number;
    moveSpeed?: number;
    abilityPower?: number;
    attackSpeed?: number;
  };
}

export interface Skin {
  id: string;
  name: string;
  model: string;
  texture: string;
  price: number;
}

export enum HeroClass {
  WARRIOR = 'Warrior',
  MAGE = 'Mage',
  ASSASSIN = 'Assassin',
  TANK = 'Tank',
  RANGER = 'Ranger',
}

export interface Hero {
  id: string;
  name: string;
  class: HeroClass;
  description: string;
  role: string;
  icon: string;
  color: string;
  stats: {
    health: number;
    mana: number;
    speed: number;
    attackRange: number;
    attackDamage: number;
    attackSpeed: number;
    resistance: number;
  };
}

export const HEROES: Hero[] = [
  {
    id: 'valkyrie',
    name: 'Valkyrie',
    class: HeroClass.WARRIOR,
    description: 'The Unstoppable Force',
    role: 'Frontline Fighter',
    icon: 'Sword',
    color: '#ef4444',
    stats: {
      health: 800,
      mana: 200,
      speed: 4.5,
      attackRange: 60,
      attackDamage: 65,
      attackSpeed: 0.8,
      resistance: 0.3
    }
  },
  {
    id: 'ignis',
    name: 'Ignis',
    class: HeroClass.MAGE,
    description: 'The Flame Weaver',
    role: 'Burst Damage',
    icon: 'Zap',
    color: '#f97316',
    stats: {
      health: 550,
      mana: 500,
      speed: 4.0,
      attackRange: 500,
      attackDamage: 50,
      attackSpeed: 0.7,
      resistance: 0.1
    }
  },
  {
    id: 'shadow',
    name: 'Shadow',
    class: HeroClass.ASSASSIN,
    description: 'The Silent Blade',
    role: 'Flank Assassin',
    icon: 'Ghost',
    color: '#8b5cf6',
    stats: {
      health: 600,
      mana: 300,
      speed: 5.5,
      attackRange: 50,
      attackDamage: 75,
      attackSpeed: 1.1,
      resistance: 0.15
    }
  },
  {
    id: 'titan',
    name: 'Titan',
    class: HeroClass.TANK,
    description: 'The Living Fortress',
    role: 'Protective Shield',
    icon: 'Shield',
    color: '#64748b',
    stats: {
      health: 1200,
      mana: 250,
      speed: 3.5,
      attackRange: 50,
      attackDamage: 45,
      attackSpeed: 0.6,
      resistance: 0.5
    }
  },
  {
    id: 'hawk',
    name: 'Hawk',
    class: HeroClass.RANGER,
    description: 'The Swift Eye',
    role: 'Sustained Damage',
    icon: 'Target',
    color: '#10b981',
    stats: {
      health: 500,
      mana: 300,
      speed: 4.8,
      attackRange: 600,
      attackDamage: 55,
      attackSpeed: 1.2,
      resistance: 0.05
    }
  }
];

export interface Lane {
  id: string;
  waypoints: Vector2D[];
}

export interface MinionData {
  laneId: string;
  currentWaypointIndex: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  heroId?: string;
  minionType?: MinionType;
  minionData?: MinionData;
  team: Team;
  pos: Vector2D;
  radius: number;
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  gold: number;
  // Movement
  speed: number;
  rotationSpeed: number;
  targetPosition?: Vector2D;
  isMoving: boolean;
  stoppingDistance: number;
  
  // State
  isDead: boolean;
  deathTime?: number;
  isStunned: boolean;
  isRooted: boolean;
  isCasting: boolean;
  animationState?: AnimationState;
  
  // Combat
  attackRange: number;
  attackDamage: number;
  attackSpeed: number; // Attacks per second
  resistance?: number; // Damage reduction factor (0-1)
  lastAttackTime: number;
  lastDamageTime?: number;
  lastAttackerId?: string; // For assists
  target?: string;
  
  // Scoreboard
  kills: number;
  deaths: number;
  assists: number;
  totalGoldEarned: number;
  
  respawnTimer?: number; // Timestamp when respawn happens
  shield: number;
  maxShield: number;
  shieldEndTime?: number;
  goldReward?: number;
  xpReward?: number;
  // Tower specific
  lastTargetId?: string;
  consecutiveHits?: number;
  abilities?: {
    passive: Ability;
    q: Ability;
    w: Ability;
    e: Ability;
    r: Ability;
  };
  items: Item[];
  activeBuffs: Buff[];
  activeStatusEffects: StatusEffect[];
  path?: Vector2D[];
  isVisible?: boolean;
  visionRange?: number;
  cooldownReduction?: number;
  level: number; // Current level
  xp: number; // Current XP
  skillPoints: number; // Available skill points
  stunEndTime?: number;
  rootEndTime?: number;
  castingAbilityEndTime?: number;
}

export enum EffectType {
  DAMAGE = 'DAMAGE',
  CC = 'CC',
  BUFF = 'BUFF',
}

export enum DamageType { PHYSICAL, MAGICAL, TRUE }

export interface DamageData {
  amount: number;
  type: DamageType;
  source: 'ABILITY' | 'BASIC_ATTACK' | 'STRUCTURE';
  sourceOwnerId: string;
  receiverId: string;
}

export enum AbilityType { SKILLSHOT, TARGETED, SELF }
export enum AbilitySlot { PASSIVE, Q, W, E, R }

export interface AbilityData {
  id: string;
  slot: AbilitySlot;
  type: AbilityType;
  castTime: number;
  cooldown: number;
  manaCost: number;
  range: number;
  projectileSpeed?: number;
  radius?: number;
  baseValue: number;
  valuePerLevel: number;
  name: string;
  description: string;
  icon?: string;
}

export interface Ability {
  data: AbilityData;
  level: number;
  maxLevel: number;
  lastUsed: number;
  isCasting: boolean;
}

export interface Projectile {
  id: string;
  pos: Vector2D;
  angle: number;
  speed: number;
  damage: number;
  team: Team;
  sourceId?: string;
  range: number;
  distanceTravelled: number;
  color?: string;
  onHit?: (target: Entity) => void;
}

export const GAME_CONFIG = {
  MAP_WIDTH: 3000,
  MAP_HEIGHT: 2000,
  VIEWPORT_WIDTH: 1280,
  VIEWPORT_HEIGHT: 720,
  TOWER_RANGE: 300,
  TOWER_DAMAGE: 50,
  MINION_SPAWN_RATE: 15000, // 15 seconds
  MINION_COUNT: 3,
};
