import { AbilityBase } from './AbilityBase';
import { ChampionBase } from '../ChampionBase';
import { AbilityData } from '../types';

export class AbilityController {
  private abilities: Map<string, AbilityBase> = new Map();
  private owner: ChampionBase;

  constructor(owner: ChampionBase) {
    this.owner = owner;
  }

  registerAbility(slot: string, ability: AbilityBase) {
    this.abilities.set(slot, ability);
  }

  handleInput(slot: string) {
    const ability = this.abilities.get(slot);
    if (ability && ability.canCast()) {
      ability.startCast();
    }
  }

  update(deltaTime: number) {
    for (const ability of this.abilities.values()) {
      ability.update(deltaTime);
      if (this.owner.isStunned && ability.isCasting) {
        ability.endCast();
      }
    }
  }

  getAbility(slot: string): AbilityBase | undefined {
    return this.abilities.get(slot);
  }
}
