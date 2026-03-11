import { Entity, EntityType, Team, Item, GAME_CONFIG } from '../types';
import { ITEMS } from '../items';

export class ShopSystem {
  private readonly SHOP_ZONE_RADIUS = 500;
  private readonly SHOP_POSITIONS: { [key in Team]: { x: number, y: number } } = {
    [Team.BLUE]: { x: 200, y: GAME_CONFIG.MAP_HEIGHT / 2 },
    [Team.RED]: { x: GAME_CONFIG.MAP_WIDTH - 200, y: GAME_CONFIG.MAP_HEIGHT / 2 },
    [Team.NEUTRAL]: { x: 0, y: 0 } // No shop for neutral
  };

  constructor() {}

  isPlayerInShopZone(player: Entity): boolean {
    const shopPos = this.SHOP_POSITIONS[player.team];
    if (!shopPos) return false;

    const dx = player.pos.x - shopPos.x;
    const dy = player.pos.y - shopPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist <= this.SHOP_ZONE_RADIUS;
  }

  buyItem(player: Entity, itemId: string): boolean {
    if (!this.isPlayerInShopZone(player)) return false;

    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    if (player.gold < item.cost) return false;
    if (player.items.length >= 6) return false; // Max 6 items

    player.gold -= item.cost;
    player.items.push(item);
    
    // Apply stats
    this.applyItemStats(player, item);

    return true;
  }

  sellItem(player: Entity, itemIndex: number): boolean {
    if (!this.isPlayerInShopZone(player)) return false;

    if (itemIndex < 0 || itemIndex >= player.items.length) return false;

    const item = player.items[itemIndex];
    if (!item) return false;

    const sellValue = Math.floor(item.cost * 0.7);
    player.gold += sellValue;
    
    // Remove stats
    this.removeItemStats(player, item);
    
    player.items.splice(itemIndex, 1);

    return true;
  }

  applyItemStats(player: Entity, item: Item) {
    if (item.stats.damage) player.attackDamage += item.stats.damage;
    if (item.stats.health) {
      player.maxHealth += item.stats.health;
      player.health += item.stats.health;
    }
    if (item.stats.moveSpeed) player.speed += item.stats.moveSpeed;
    if (item.stats.attackSpeed) player.attackSpeed += item.stats.attackSpeed;
    if (item.stats.cooldownReduction) player.cooldownReduction = (player.cooldownReduction || 0) + item.stats.cooldownReduction;
    // Cap CDR at 40%
    if (player.cooldownReduction && player.cooldownReduction > 0.4) player.cooldownReduction = 0.4;
  }

  removeItemStats(player: Entity, item: Item) {
    if (item.stats.damage) player.attackDamage -= item.stats.damage;
    if (item.stats.health) {
      player.maxHealth -= item.stats.health;
      if (player.health > player.maxHealth) player.health = player.maxHealth;
    }
    if (item.stats.moveSpeed) player.speed -= item.stats.moveSpeed;
    if (item.stats.attackSpeed) player.attackSpeed -= item.stats.attackSpeed;
    if (item.stats.cooldownReduction) player.cooldownReduction = (player.cooldownReduction || 0) - item.stats.cooldownReduction;
    if (player.cooldownReduction && player.cooldownReduction < 0) player.cooldownReduction = 0;
  }
}
