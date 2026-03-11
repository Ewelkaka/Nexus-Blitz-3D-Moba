import { Vector2D, Entity, Team, EntityType, GAME_CONFIG } from './types';

export function getDistance(v1: Vector2D, v2: Vector2D): number {
  return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
}

export function getAngle(v1: Vector2D, v2: Vector2D): number {
  return Math.atan2(v2.y - v1.y, v2.x - v1.x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function moveTowards(current: Vector2D, target: Vector2D, distance: number): Vector2D {
  const d = getDistance(current, target);
  if (d <= distance) return { ...target };
  const angle = getAngle(current, target);
  return {
    x: current.x + Math.cos(angle) * distance,
    y: current.y + Math.sin(angle) * distance
  };
}

export function isColliding(e1: Entity, e2: Entity): boolean {
  return getDistance(e1.pos, e2.pos) < e1.radius + e2.radius;
}
