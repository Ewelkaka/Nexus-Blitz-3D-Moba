import { Vector2D, GAME_CONFIG } from './types';

export class Pathfinder {
  gridSize: number;
  width: number;
  height: number;
  grid: number[][]; // 0 = walkable, 1 = obstacle

  constructor(gridSize: number = 50) {
    this.gridSize = gridSize;
    this.width = Math.ceil(GAME_CONFIG.MAP_WIDTH / gridSize);
    this.height = Math.ceil(GAME_CONFIG.MAP_HEIGHT / gridSize);
    this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(0));
  }

  reset() {
    this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(0));
  }

  markObstacle(pos: Vector2D, radius: number) {
    const gridX = Math.floor(pos.x / this.gridSize);
    const gridY = Math.floor(pos.y / this.gridSize);
    const gridRadius = Math.ceil(radius / this.gridSize);

    for (let y = gridY - gridRadius; y <= gridY + gridRadius; y++) {
      for (let x = gridX - gridRadius; x <= gridX + gridRadius; x++) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          // Simple circle check or just square
          this.grid[y][x] = 1;
        }
      }
    }
  }

  // A* Algorithm
  findPath(start: Vector2D, end: Vector2D): Vector2D[] {
    const startNode = {
      x: Math.floor(start.x / this.gridSize),
      y: Math.floor(start.y / this.gridSize),
      g: 0,
      h: 0,
      f: 0,
      parent: null as any
    };

    const endNode = {
      x: Math.floor(end.x / this.gridSize),
      y: Math.floor(end.y / this.gridSize)
    };

    // Bounds check
    if (startNode.x < 0 || startNode.x >= this.width || startNode.y < 0 || startNode.y >= this.height) return [];
    if (endNode.x < 0 || endNode.x >= this.width || endNode.y < 0 || endNode.y >= this.height) return [];

    // If start or end is blocked, return direct path or empty?
    // Often in games, if end is blocked (e.g. attacking a tower), we path to adjacent node.
    // For simplicity, let's just try to find path.

    const openList: any[] = [startNode];
    const closedList: boolean[][] = Array.from({ length: this.height }, () => Array(this.width).fill(false));

    while (openList.length > 0) {
      // Sort by F cost
      openList.sort((a, b) => a.f - b.f);
      const currentNode = openList.shift();

      // Found end?
      // Check distance to end node instead of exact match for flexibility
      if (Math.abs(currentNode.x - endNode.x) <= 1 && Math.abs(currentNode.y - endNode.y) <= 1) {
        // Reconstruct path
        const path: Vector2D[] = [];
        let curr = currentNode;
        while (curr.parent) {
          // Convert grid to world coordinates (center of tile)
          path.push({
            x: curr.x * this.gridSize + this.gridSize / 2,
            y: curr.y * this.gridSize + this.gridSize / 2
          });
          curr = curr.parent;
        }
        return path.reverse();
      }

      closedList[currentNode.y][currentNode.x] = true;

      // Neighbors
      const neighbors = [
        { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 } // Diagonals
      ];

      for (const offset of neighbors) {
        const neighborX = currentNode.x + offset.x;
        const neighborY = currentNode.y + offset.y;

        if (neighborX < 0 || neighborX >= this.width || neighborY < 0 || neighborY >= this.height) continue;
        if (closedList[neighborY][neighborX]) continue;
        if (this.grid[neighborY][neighborX] === 1) continue; // Obstacle

        const isDiagonal = offset.x !== 0 && offset.y !== 0;
        const gScore = currentNode.g + (isDiagonal ? 1.414 : 1);
        const hScore = Math.abs(neighborX - endNode.x) + Math.abs(neighborY - endNode.y); // Manhattan distance is faster but less accurate for diagonals, Euclidean better?
        // Let's use Euclidean for H
        // const hScore = Math.sqrt(Math.pow(neighborX - endNode.x, 2) + Math.pow(neighborY - endNode.y, 2));
        
        const existingNode = openList.find(n => n.x === neighborX && n.y === neighborY);

        if (!existingNode || gScore < existingNode.g) {
          const neighborNode = existingNode || {
            x: neighborX,
            y: neighborY,
            parent: currentNode
          };

          neighborNode.g = gScore;
          neighborNode.h = hScore;
          neighborNode.f = gScore + hScore;
          neighborNode.parent = currentNode;

          if (!existingNode) {
            openList.push(neighborNode);
          }
        }
      }
    }

    // No path found
    return [];
  }
}
