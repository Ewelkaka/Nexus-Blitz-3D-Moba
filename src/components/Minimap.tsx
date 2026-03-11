import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { EntityType, Team, GAME_CONFIG, HEROES } from '../game/types';

interface MinimapProps {
  engine: GameEngine;
  playerTeam: Team;
}

export const Minimap: React.FC<MinimapProps> = ({ engine, playerTeam }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Background (simple rect)
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw Lanes (simplified)
      ctx.strokeStyle = '#334155'; // slate-700
      ctx.lineWidth = 2;
      
      // Top Lane
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.lineTo(canvas.width - 20, 20);
      ctx.stroke();

      // Bot Lane
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 20);
      ctx.lineTo(canvas.width - 20, canvas.height - 20);
      ctx.stroke();

      // Mid Lane
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.lineTo(canvas.width - 20, canvas.height - 20);
      ctx.stroke();

      // Scale factors
      const scaleX = canvas.width / GAME_CONFIG.MAP_WIDTH;
      const scaleY = canvas.height / GAME_CONFIG.MAP_HEIGHT;

      // Draw Entities
      engine.entities.forEach((entity) => {
        if (entity.isDead || !entity.isVisible) return;

        const x = entity.pos.x * scaleX;
        const y = entity.pos.y * scaleY;

        let color = '#fbbf24'; // Neutral (Yellow)
        if (entity.team === Team.BLUE) color = '#3b82f6'; // Blue
        if (entity.team === Team.RED) color = '#ef4444'; // Red
        if (entity.team === playerTeam) color = '#ffffff'; // Self (White)

        let size = 2;
        if (entity.type === EntityType.CHAMPION) size = 4;
        if (entity.type === EntityType.TOWER) size = 3;
        if (entity.type === EntityType.NEXUS) size = 5;

        // Draw Entity
        ctx.fillStyle = color;
        
        if (entity.type === EntityType.CHAMPION) {
          // Draw a diamond/square for champions instead of a circle
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-size, -size, size * 2, size * 2);
          
          // Draw a small letter for the hero
          const hero = HEROES.find(h => h.id === entity.heroId);
          if (hero) {
            ctx.rotate(-Math.PI / 4);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hero.name[0], 0, 0);
          }
          ctx.restore();
        } else if (entity.type === EntityType.TOWER || entity.type === EntityType.NEXUS) {
          // Draw a square for structures
          ctx.fillRect(x - size, y - size, size * 2, size * 2);
        } else {
          // Draw a small circle for minions
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Vision Cone or Icon for Self
        if (entity.id === engine.playerID) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, size + 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw Camera Viewport Rect
      const viewW = (GAME_CONFIG.VIEWPORT_WIDTH * scaleX);
      const viewH = (GAME_CONFIG.VIEWPORT_HEIGHT * scaleY);
      const camX = (engine.camera.x * scaleX) - viewW / 2;
      const camY = (engine.camera.y * scaleY) - viewH / 2;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(camX, camY, viewW, viewH);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [engine, playerTeam]);

  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
      <canvas 
        ref={canvasRef} 
        width={200} 
        height={133} // Aspect ratio of map (3000x2000) -> 3:2
        className="w-full h-full object-contain"
      />
    </div>
  );
};
