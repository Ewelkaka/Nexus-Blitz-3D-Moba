import { Item } from './types';

export const ITEMS: Item[] = [
  {
    id: 'long_sword',
    name: 'Long Sword',
    description: '+10 Attack Damage',
    icon: 'Sword',
    cost: 350,
    stats: {
      damage: 10
    }
  },
  {
    id: 'ruby_crystal',
    name: 'Ruby Crystal',
    description: '+150 Health',
    icon: 'Gem',
    cost: 400,
    stats: {
      health: 150
    }
  },
  {
    id: 'boots',
    name: 'Boots of Speed',
    description: '+25 Move Speed',
    icon: 'Footprints',
    cost: 300,
    stats: {
      moveSpeed: 0.5 // In-game units
    }
  },
  {
    id: 'dagger',
    name: 'Dagger',
    description: '+12% Attack Speed',
    icon: 'Dagger',
    cost: 300,
    stats: {
      attackSpeed: 0.12
    }
  },
  {
    id: 'bf_sword',
    name: 'B.F. Sword',
    description: '+40 Attack Damage',
    icon: 'Sword',
    cost: 1300,
    stats: {
      damage: 40
    }
  },
  {
    id: 'giants_belt',
    name: 'Giant\'s Belt',
    description: '+350 Health',
    icon: 'Shield',
    cost: 1000,
    stats: {
      health: 350
    }
  }
];
