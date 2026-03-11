import React, { useState, useEffect, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { ShopUI } from './components/ShopUI';
import { Scoreboard } from './components/Scoreboard';
import { HeroSelect } from './components/HeroSelect';
import { Lobby } from './components/Lobby';
import { Entity, Team, Hero, HEROES } from './game/types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Skull, Swords, Info, Wallet } from 'lucide-react';
import { soundManager } from './game/SoundManager';
import { socket } from './socket';

import { Chat } from './components/Chat';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const engine = new GameEngine();

export default function App() {
  const [player, setPlayer] = useState<Entity | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'hero-select' | 'lobby' | 'playing' | 'victory' | 'defeat'>('menu');
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [lastTick, setLastTick] = useState(0);
  const [teamGold, setTeamGold] = useState<{ [key in Team]: number }>({ [Team.BLUE]: 0, [Team.RED]: 0, [Team.NEUTRAL]: 0 });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Targeting State
  const [activeAbilityId, setActiveAbilityId] = useState<string | null>(null);

  // Game Loop Interval
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowScoreboard(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setShowScoreboard(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
    const interval = setInterval(() => {
      const p = engine.entities.get(engine.playerID);
      if (p) {
        setPlayer({ ...p });
      }
      
      setTeamGold({ ...engine.gold });

      // Check win/loss
      const redNexus = engine.entities.get('red-nexus');
      const blueNexus = engine.entities.get('blue-nexus');
      
      if (redNexus?.isDead && gameState !== 'victory') {
        setGameState('victory');
        soundManager.play('victory', 1.0);
      }
      if (blueNexus?.isDead && gameState !== 'defeat') {
        setGameState('defeat');
        soundManager.play('defeat', 1.0);
      }

      setLastTick(Date.now());
    }, 100);

    const handleGameStateUpdate = (state: any) => {
      if (gameState === 'playing') {
        // Update local engine state with server state
        state.entities.forEach((serverEntity: any) => {
          const localEntity = engine.entities.get(serverEntity.id);
          if (localEntity) {
            // Save current pos for interpolation
            const currentPos = { ...localEntity.pos };
            Object.assign(localEntity, serverEntity);
            (localEntity as any).serverPos = { ...serverEntity.pos };
            localEntity.pos = currentPos; // Keep current pos, we will interpolate to serverPos
          } else {
            engine.entities.set(serverEntity.id, serverEntity);
            (serverEntity as any).serverPos = { ...serverEntity.pos };
          }
        });
        
        // Remove entities that no longer exist on server
        const serverEntityIds = new Set(state.entities.map((e: any) => e.id));
        for (const id of engine.entities.keys()) {
          if (!serverEntityIds.has(id)) {
            engine.entities.delete(id);
          }
        }

        engine.gold = state.gold;
        engine.gameState = state.gameState;
        engine.activeEvent = state.activeEvent;
        engine.activeEventEndTime = state.activeEventEndTime;
        
        // Update projectiles
        state.projectiles.forEach((serverProj: any) => {
          const localProj = engine.projectiles.find(p => p.id === serverProj.id);
          if (localProj) {
            const currentPos = { ...localProj.pos };
            Object.assign(localProj, serverProj);
            (localProj as any).serverPos = { ...serverProj.pos };
            localProj.pos = currentPos;
          } else {
            engine.projectiles.push(serverProj);
            (serverProj as any).serverPos = { ...serverProj.pos };
          }
        });

        // Remove projectiles that no longer exist on server
        const serverProjIds = new Set(state.projectiles.map((p: any) => p.id));
        engine.projectiles = engine.projectiles.filter(p => serverProjIds.has(p.id));

        // Play sounds
        if (state.sounds) {
          state.sounds.forEach((s: any) => {
            soundManager.play(s.sound, s.volume);
          });
        }
      }
    };

    socket.on('game_state_update', handleGameStateUpdate);

    return () => {
      clearInterval(interval);
      socket.off('game_state_update', handleGameStateUpdate);
    };
  }, [gameState]);

  const handleAbility = useCallback((key: string) => {
    if (activeAbilityId === key) {
      setActiveAbilityId(null);
      return;
    }
    setActiveAbilityId(key);
  }, [activeAbilityId]);

  const handleCast = useCallback((x: number, y: number) => {
    if (activeAbilityId) {
      if (engine.multiplayer) {
        socket.emit('game_input', { type: 'ABILITY', data: { key: activeAbilityId, x, y, isWorld: true } });
      } else {
        engine.handleInput('ABILITY', { key: activeAbilityId, x, y, isWorld: true });
      }
      setActiveAbilityId(null);
    }
  }, [activeAbilityId]);

  const handleCancel = useCallback(() => {
    setActiveAbilityId(null);
  }, []);

  const handleUpgradeAbility = useCallback((key: string) => {
    if (engine.multiplayer) {
      socket.emit('game_input', { type: 'UPGRADE_ABILITY', data: { key } });
    } else {
      engine.upgradeAbility(key);
    }
  }, []);

  const handleToggleShop = useCallback(() => {
    setShowShop(prev => !prev);
  }, []);

  const handleBuyItem = useCallback((itemId: string) => {
    if (engine.multiplayer) {
      socket.emit('game_input', { type: 'BUY_ITEM', data: { itemId } });
    } else {
      engine.buyItem(itemId);
    }
  }, []);

  const handleSellItem = useCallback((itemIndex: number) => {
    if (engine.multiplayer) {
      socket.emit('game_input', { type: 'SELL_ITEM', data: { itemIndex } });
    } else {
      engine.sellItem(itemIndex);
    }
  }, []);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showShop) {
          setShowShop(false);
        } else if (gameState === 'playing') {
          setIsPaused(prev => !prev);
        }
      }
      if (isPaused) return;

      if (['q', 'w', 'e', 'r'].includes(e.key.toLowerCase())) {
        handleAbility(e.key.toLowerCase());
      }
      if (e.key.toLowerCase() === 'p') {
        handleToggleShop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleAbility, handleToggleShop, showShop, gameState, isPaused]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (error: any) {
        if (error.code === 4001) {
          console.warn("User rejected the connection request.");
        } else {
          console.error("Failed to connect to MetaMask", error);
          alert("Failed to connect to MetaMask: " + error.message);
        }
      }
    } else {
      alert("MetaMask is not installed! Please install it to connect your wallet.");
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* Pause Menu */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl w-80 text-center space-y-4">
            <h2 className="text-3xl font-black uppercase italic text-slate-100 mb-8">Paused</h2>
            
            <button 
              onClick={() => setIsPaused(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold uppercase tracking-widest transition-all"
            >
              Resume
            </button>
            
            <button 
              onClick={() => {
                setIsPaused(false);
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold uppercase tracking-widest transition-all text-slate-400"
            >
              Settings
            </button>

            <button 
              onClick={() => {
                setIsPaused(false);
                setGameState('menu');
                engine.entities.clear();
              }}
              className="w-full py-3 bg-red-900/50 hover:bg-red-900 rounded-xl font-bold uppercase tracking-widest transition-all text-red-200 border border-red-900"
            >
              Exit Match
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center space-y-8 z-10"
          >
            <div className="space-y-2">
              <h1 className="text-7xl font-black tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
                Nexus Blitz 3D
              </h1>
              <p className="text-slate-400 font-mono tracking-widest uppercase text-sm">3D MOBA Prototype</p>
            </div>

            <div className="flex flex-col gap-4 max-w-md mx-auto bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-4 text-left mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase">
                    <Info className="w-3 h-3" /> Controls
                  </div>
                  <p className="text-[10px] text-slate-500">Right Click: Move</p>
                  <p className="text-[10px] text-slate-500">Q: Skillshot</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                    <Trophy className="w-3 h-3" /> Goal
                  </div>
                  <p className="text-[10px] text-slate-500">Destroy enemy Nexus</p>
                </div>
              </div>

              {walletAddress ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400 font-mono text-xs truncate max-w-[200px]">
                    {walletAddress}
                  </span>
                </div>
              ) : (
                <button 
                  onClick={connectWallet}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all mb-2 border border-slate-700"
                >
                  <Wallet className="w-4 h-4" /> Connect Wallet
                </button>
              )}

              <button 
                onClick={() => {
                  setGameState('lobby');
                }}
                className="group relative px-8 py-4 bg-emerald-600 rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 overflow-hidden shadow-lg shadow-emerald-500/20 mb-2"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Swords className="w-5 h-5" /> Multiplayer
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              <button 
                onClick={() => {
                  setGameState('hero-select');
                }}
                className="group relative px-8 py-4 bg-blue-600 rounded-2xl font-bold uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 overflow-hidden shadow-lg shadow-blue-500/20"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Skull className="w-5 h-5" /> Practice Mode
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'hero-select' && (
          <motion.div 
            key="hero-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0 z-10"
          >
            <HeroSelect onSelect={(hero) => {
              setSelectedHero(hero);
              engine.multiplayer = false;
              engine.playerID = 'player-1';
              engine.init(hero.id);
              setGameState('playing');
            }} />
          </motion.div>
        )}

        {gameState === 'lobby' && (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0 z-10"
          >
            <Lobby 
              onBack={() => setGameState('menu')}
              onStartGame={(lobbyData) => {
                const myPlayer = lobbyData.players.find(p => p.id === socket.id);
                if (myPlayer && myPlayer.heroId) {
                  const hero = HEROES.find(h => h.id === myPlayer.heroId);
                  if (hero) {
                    setSelectedHero(hero);
                    engine.playerID = myPlayer.id;
                    engine.multiplayer = true;
                    const players = lobbyData.players.map(p => ({
                      id: p.id,
                      heroId: p.heroId as string,
                      team: p.team as Team
                    }));
                    engine.init(hero.id, players);
                    setGameState('playing');
                  }
                }
              }} 
            />
          </motion.div>
        )}

        {gameState === 'playing' && player && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 w-screen h-screen"
          >
            <GameCanvas 
              engine={engine} 
              activeAbilityId={activeAbilityId}
              onCast={handleCast}
              onCancel={handleCancel}
            />
            <div className="absolute inset-0 z-10 pointer-events-none">
              <HUD 
                engine={engine}
                player={player} 
                onAbility={handleAbility} 
                onUpgradeAbility={handleUpgradeAbility}
                onToggleShop={handleToggleShop}
              />
            </div>
            
            <AnimatePresence>
              {showScoreboard && (
                <Scoreboard 
                  entities={Array.from(engine.entities.values())}
                  onClose={() => setShowScoreboard(false)}
                />
              )}
              
              {showShop && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-50 pointer-events-none"
                >
                  <ShopUI 
                    player={player}
                    onBuy={handleBuyItem}
                    onSell={handleSellItem}
                    onClose={() => setShowShop(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
              <div className="bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur-md flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-xs font-bold font-mono text-yellow-400">{teamGold[Team.BLUE]}g</span>
                </div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">vs</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-yellow-400">{teamGold[Team.RED]}g</span>
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
              </div>

              <div className="bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur-md">
                <span className="text-xs font-mono text-slate-400">
                  {formatTime(Date.now() - engine.startTime)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {(gameState === 'victory' || gameState === 'defeat') && (
          <motion.div 
            key="end"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 z-20"
          >
            <div className={gameState === 'victory' ? 'text-emerald-400' : 'text-red-400'}>
              {gameState === 'victory' ? <Trophy className="w-24 h-24 mx-auto mb-4" /> : <Skull className="w-24 h-24 mx-auto mb-4" />}
              <h2 className="text-8xl font-black uppercase italic tracking-tighter">
                {gameState === 'victory' ? 'Victory' : 'Defeat'}
              </h2>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold uppercase tracking-widest transition-all"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Atmospheric Background */}
      <Chat />
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
