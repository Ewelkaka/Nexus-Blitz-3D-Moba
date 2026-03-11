import { AbilityData, AbilitySlot, AbilityType, HeroClass, Hero, HEROES } from './types';

export const getHeroAbilities = (heroId: string): { [key in 'q' | 'w' | 'e' | 'r']: AbilityData } => {
  switch (heroId) {
    case 'valkyrie':
      return {
        q: {
          id: 'valk_q',
          slot: AbilitySlot.Q,
          type: AbilityType.SKILLSHOT,
          castTime: 100,
          cooldown: 8000,
          manaCost: 50,
          range: 300,
          projectileSpeed: 15,
          baseValue: 80,
          valuePerLevel: 40,
          name: 'Shield Dash',
          description: 'Dash forward, dealing damage to enemies hit.',
          icon: 'Sword'
        },
        w: {
          id: 'valk_w',
          slot: AbilitySlot.W,
          type: AbilityType.SELF,
          castTime: 0,
          cooldown: 12000,
          manaCost: 60,
          range: 0,
          baseValue: 100,
          valuePerLevel: 50,
          name: 'Iron Will',
          description: 'Gain a shield for 3 seconds.',
          icon: 'Shield'
        },
        e: {
          id: 'valk_e',
          slot: AbilitySlot.E,
          type: AbilityType.SELF,
          castTime: 200,
          cooldown: 10000,
          manaCost: 70,
          range: 200,
          radius: 200,
          baseValue: 70,
          valuePerLevel: 35,
          name: 'Whirlwind',
          description: 'Spin around, dealing damage to nearby enemies.',
          icon: 'Zap'
        },
        r: {
          id: 'valk_r',
          slot: AbilitySlot.R,
          type: AbilityType.SKILLSHOT,
          castTime: 500,
          cooldown: 80000,
          manaCost: 100,
          range: 600,
          radius: 250,
          baseValue: 250,
          valuePerLevel: 150,
          name: 'Leap of Faith',
          description: 'Leap to a location, dealing massive damage and stunning enemies.',
          icon: 'Target'
        }
      };
    case 'ignis':
      return {
        q: {
          id: 'ignis_q',
          slot: AbilitySlot.Q,
          type: AbilityType.SKILLSHOT,
          castTime: 250,
          cooldown: 4000,
          manaCost: 40,
          range: 800,
          projectileSpeed: 20,
          baseValue: 90,
          valuePerLevel: 45,
          name: 'Fireball',
          description: 'Launch a fireball that explodes on hit.',
          icon: 'Flame'
        },
        w: {
          id: 'ignis_w',
          slot: AbilitySlot.W,
          type: AbilityType.SKILLSHOT,
          castTime: 400,
          cooldown: 10000,
          manaCost: 80,
          range: 700,
          radius: 150,
          baseValue: 120,
          valuePerLevel: 60,
          name: 'Flame Pillar',
          description: 'Summon a pillar of fire after a short delay.',
          icon: 'Flame'
        },
        e: {
          id: 'ignis_e',
          slot: AbilitySlot.E,
          type: AbilityType.SELF,
          castTime: 0,
          cooldown: 15000,
          manaCost: 70,
          range: 0,
          baseValue: 80,
          valuePerLevel: 40,
          name: 'Blaze Shield',
          description: 'Surround yourself with fire, gaining a shield and burning nearby enemies.',
          icon: 'Shield'
        },
        r: {
          id: 'ignis_r',
          slot: AbilitySlot.R,
          type: AbilityType.SKILLSHOT,
          castTime: 1000,
          cooldown: 100000,
          manaCost: 150,
          range: 1000,
          radius: 400,
          baseValue: 400,
          valuePerLevel: 200,
          name: 'Meteor Strike',
          description: 'Call down a massive meteor from the sky.',
          icon: 'Flame'
        }
      };
    case 'shadow':
      return {
        q: {
          id: 'shadow_q',
          slot: AbilitySlot.Q,
          type: AbilityType.SKILLSHOT,
          castTime: 100,
          cooldown: 6000,
          manaCost: 50,
          range: 400,
          baseValue: 60,
          valuePerLevel: 30,
          name: 'Shadow Dash',
          description: 'Dash through shadows, dealing damage to enemies hit.',
          icon: 'Wind'
        },
        w: {
          id: 'shadow_w',
          slot: AbilitySlot.W,
          type: AbilityType.SELF,
          castTime: 0,
          cooldown: 18000,
          manaCost: 60,
          range: 0,
          baseValue: 0,
          valuePerLevel: 0,
          name: 'Vanish',
          description: 'Become invisible for 2 seconds and gain movement speed.',
          icon: 'Ghost'
        },
        e: {
          id: 'shadow_e',
          slot: AbilitySlot.E,
          type: AbilityType.SKILLSHOT,
          castTime: 100,
          cooldown: 8000,
          manaCost: 40,
          range: 500,
          projectileSpeed: 25,
          baseValue: 50,
          valuePerLevel: 25,
          name: 'Poison Dagger',
          description: 'Throw a dagger that slows and poisons the target.',
          icon: 'Sword'
        },
        r: {
          id: 'shadow_r',
          slot: AbilitySlot.R,
          type: AbilityType.TARGETED,
          castTime: 200,
          cooldown: 90000,
          manaCost: 100,
          range: 500,
          baseValue: 200,
          valuePerLevel: 100,
          name: 'Death Mark',
          description: 'Mark an enemy for death, dealing massive damage after 3 seconds.',
          icon: 'Target'
        }
      };
    case 'titan':
      return {
        q: {
          id: 'titan_q',
          slot: AbilitySlot.Q,
          type: AbilityType.SKILLSHOT,
          castTime: 300,
          cooldown: 14000,
          manaCost: 70,
          range: 900,
          projectileSpeed: 18,
          baseValue: 80,
          valuePerLevel: 40,
          name: 'Iron Hook',
          description: 'Launch a hook that pulls the first enemy hit towards you.',
          icon: 'ArrowUp'
        },
        w: {
          id: 'titan_w',
          slot: AbilitySlot.W,
          type: AbilityType.SELF,
          castTime: 200,
          cooldown: 10000,
          manaCost: 60,
          range: 300,
          radius: 300,
          baseValue: 60,
          valuePerLevel: 30,
          name: 'Ground Slam',
          description: 'Slam the ground, slowing and damaging nearby enemies.',
          icon: 'Sword'
        },
        e: {
          id: 'titan_e',
          slot: AbilitySlot.E,
          type: AbilityType.SELF,
          castTime: 0,
          cooldown: 16000,
          manaCost: 50,
          range: 0,
          baseValue: 0.2,
          valuePerLevel: 0.05,
          name: 'Fortify',
          description: 'Reduce incoming damage for 4 seconds.',
          icon: 'Shield'
        },
        r: {
          id: 'titan_r',
          slot: AbilitySlot.R,
          type: AbilityType.SELF,
          castTime: 500,
          cooldown: 110000,
          manaCost: 100,
          range: 500,
          radius: 500,
          baseValue: 200,
          valuePerLevel: 100,
          name: 'Earthquake',
          description: 'Create a massive shockwave that stuns all nearby enemies.',
          icon: 'Zap'
        }
      };
    case 'hawk':
      return {
        q: {
          id: 'hawk_q',
          slot: AbilitySlot.Q,
          type: AbilityType.SKILLSHOT,
          castTime: 500,
          cooldown: 6000,
          manaCost: 50,
          range: 1200,
          projectileSpeed: 30,
          baseValue: 100,
          valuePerLevel: 50,
          name: 'Piercing Arrow',
          description: 'Fire a long-range arrow that pierces through enemies.',
          icon: 'Target'
        },
        w: {
          id: 'hawk_w',
          slot: AbilitySlot.W,
          type: AbilityType.SELF,
          castTime: 0,
          cooldown: 14000,
          manaCost: 60,
          range: 0,
          baseValue: 0.3,
          valuePerLevel: 0.1,
          name: 'Eagle Eye',
          description: 'Gain increased attack speed and vision for 5 seconds.',
          icon: 'Zap'
        },
        e: {
          id: 'hawk_e',
          slot: AbilitySlot.E,
          type: AbilityType.SKILLSHOT,
          castTime: 100,
          cooldown: 12000,
          manaCost: 50,
          range: 300,
          baseValue: 0,
          valuePerLevel: 0,
          name: 'Vault',
          description: 'Dash in the opposite direction of the target.',
          icon: 'ArrowUp'
        },
        r: {
          id: 'hawk_r',
          slot: AbilitySlot.R,
          type: AbilityType.SKILLSHOT,
          castTime: 400,
          cooldown: 90000,
          manaCost: 100,
          range: 800,
          projectileSpeed: 20,
          baseValue: 50,
          valuePerLevel: 25,
          name: 'Arrow Volley',
          description: 'Fire a cone of arrows that damage and slow enemies.',
          icon: 'Target'
        }
      };
    default:
      return getHeroAbilities('valkyrie');
  }
};
