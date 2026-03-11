import React, { useEffect, useState } from 'react';
import { GameEngine } from '../game/engine';

interface GameMessage {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'success';
  time: number;
}

export const GameMessages = ({ engine }: { engine: GameEngine }) => {
  const [message, setMessage] = useState<GameMessage | null>(null);

  useEffect(() => {
    // @ts-ignore
    const handleMessage = (data: any) => {
      setMessage({
        id: Math.random().toString(),
        text: data.text,
        type: data.type || 'info',
        time: Date.now()
      });
    };

    // @ts-ignore
    const cleanup = engine.on('message', handleMessage);
    return cleanup;
  }, [engine]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) return null;

  return (
    <div className="absolute top-32 left-1/2 -translate-x-1/2 pointer-events-none z-50">
      <div className="bg-slate-900/80 border border-slate-700 px-8 py-4 rounded-full backdrop-blur-md animate-in zoom-in duration-300 shadow-2xl flex items-center justify-center">
        <span className={`text-2xl font-black uppercase tracking-widest drop-shadow-lg ${
          message.type === 'warning' ? 'text-red-500' : 
          message.type === 'success' ? 'text-emerald-500' : 'text-blue-400'
        }`}>
          {message.text}
        </span>
      </div>
    </div>
  );
};
