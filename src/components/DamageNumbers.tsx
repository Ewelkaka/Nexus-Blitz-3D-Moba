import React, { useState, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { GameEngine } from '../game/engine';
import { Vector2D, DamageType } from '../game/types';

interface DamageNumber {
  id: string;
  amount: number;
  position: Vector2D;
  type: DamageType;
  startTime: number;
}

export const DamageNumbers = ({ engine }: { engine: GameEngine }) => {
  const [numbers, setNumbers] = useState<DamageNumber[]>([]);

  useEffect(() => {
    const handleDamage = (data: any) => {
      setNumbers(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        amount: data.amount,
        position: { 
          x: data.position.x + (Math.random() - 0.5) * 40, 
          y: data.position.y + (Math.random() - 0.5) * 40 
        },
        type: data.type,
        startTime: Date.now()
      }]);
    };

    const cleanup = engine.on('damage', handleDamage);
    return cleanup;
  }, [engine]);

  useFrame(() => {
    const now = Date.now();
    // Filter out old numbers (older than 1s)
    // We do this in useFrame to keep it in sync with render loop, but updating state in useFrame can be heavy.
    // Better to just let them expire naturally or use a ref for the array and force update.
    // For simplicity, let's just filter on render or use a cleanup interval.
    // Actually, updating state in useFrame is bad practice if it triggers re-renders every frame.
    // Let's use a cleanup interval instead.
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNumbers(prev => prev.filter(n => now - n.startTime < 1000));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {numbers.map(n => (
        <Html key={n.id} position={[n.position.x, 50, n.position.y]} center zIndexRange={[1000, 0]} style={{ pointerEvents: 'none' }}>
          <div 
            className={`text-2xl font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] select-none pointer-events-none
              ${n.type === DamageType.PHYSICAL ? 'text-white' : 
                n.type === DamageType.MAGICAL ? 'text-blue-400' : 'text-red-500'}
            `}
            style={{
              animation: 'floatUp 1s ease-out forwards',
              opacity: 1
            }}
          >
            {Math.round(n.amount)}
          </div>
        </Html>
      ))}
    </>
  );
};
