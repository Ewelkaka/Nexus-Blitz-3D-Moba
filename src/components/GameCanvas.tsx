import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Html, MapControls, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { GameEngine } from '../game/engine';
import { Entity, EntityType, Team, GAME_CONFIG, HEROES, HeroClass, Vector2D } from '../game/types';
import { DamageNumbers } from './DamageNumbers';

interface GameCanvasProps {
  engine: GameEngine;
  activeAbilityId: string | null;
  onCast: (x: number, y: number) => void;
  onCancel: () => void;
}

const AbilityIndicator = ({ 
  player, 
  abilityId, 
  mousePos 
}: { 
  player: Entity, 
  abilityId: string, 
  mousePos: THREE.Vector3 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Define ranges/shapes based on ability ID
  // Ideally this comes from config, but hardcoding for now based on engine values
  let range = 0;
  let type: 'line' | 'circle' = 'line';
  let width = 50; // Width of skillshot
  
  if (abilityId === 'q') {
    range = 600;
    type = 'line';
  } else if (abilityId === 'w') {
    // Self shield - maybe just a circle around player
    range = player.radius * 2;
    type = 'circle';
  } else if (abilityId === 'e') {
    range = 200; // Dash range
    type = 'line';
  } else if (abilityId === 'r') {
    range = 300; // AOE radius
    type = 'circle';
  }

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = player.pos.x;
      meshRef.current.position.z = player.pos.y;
      meshRef.current.position.y = 2; // Slightly above ground

      if (type === 'line') {
        const angle = Math.atan2(mousePos.z - player.pos.y, mousePos.x - player.pos.x);
        meshRef.current.rotation.y = -angle; // Three.js rotation is counter-clockwise? No, standard is CCW.
        // Actually, plane geometry is usually X-Y. We rotate to lie flat X-Z.
        // Let's use a simple box or plane and rotate it to point to mouse.
        
        meshRef.current.lookAt(mousePos.x, 2, mousePos.z);
      }
    }
  });

  if (type === 'line') {
    return (
      <mesh ref={meshRef}>
        {/* Length is range, width is 50. Origin at one end? */}
        {/* Translate geometry so pivot is at start */}
        <planeGeometry args={[width, range]} /> 
        {/* Rotate -90 X to lie flat. Then rotate Y to point. */}
        {/* Wait, lookAt points +Z usually. */}
        {/* Let's construct it manually: A long rectangle starting at 0,0,0 extending to 0,0,-range */}
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[range - 2, range, 32]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.5} side={THREE.DoubleSide} />
      <mesh rotation={[0, 0, 0]}>
         <circleGeometry args={[range, 32]} />
         <meshBasicMaterial color="#ef4444" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </mesh>
  );
};

// Improved Indicator Component
const SkillshotIndicator = ({ origin, target, range, width = 50, color = "#3b82f6" }: any) => {
    const ref = useRef<THREE.Mesh>(null);
    
    useFrame(() => {
        if (ref.current) {
            ref.current.position.set(origin.x, 2, origin.y);
            ref.current.lookAt(target.x, 2, target.z);
        }
    });

    return (
        <mesh ref={ref}>
            <planeGeometry args={[width, range]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
            {/* Shift geometry so it starts at origin and extends forward */}
            {/* By default plane is centered. We need to shift it by range/2 in Z? */}
            {/* Actually, let's just use a Box and shift it */}
        </mesh>
    );
}

// Correct implementation of Line Indicator
const LineIndicator = ({ origin, target, range, width = 40 }: any) => {
    const ref = useRef<THREE.Group>(null);
    
    useFrame(() => {
        if (ref.current) {
            ref.current.position.set(origin.x, 2, origin.y);
            ref.current.lookAt(target.x, 2, target.z);
        }
    });

    return (
        <group ref={ref}>
            {/* The mesh is offset so its start is at 0,0,0 */}
            <mesh position={[0, 0, range / 2]} rotation={[-Math.PI/2, 0, 0]}>
                <planeGeometry args={[width, range]} />
                <meshBasicMaterial color="#0ea5e9" transparent opacity={0.3} />
                <lineSegments>
                    <edgesGeometry args={[new THREE.PlaneGeometry(width, range)]} />
                    <lineBasicMaterial color="#38bdf8" />
                </lineSegments>
            </mesh>
            {/* End cap */}
            <mesh position={[0, 0, range]} rotation={[-Math.PI/2, 0, 0]}>
                 <ringGeometry args={[0, width/2, 16]} />
                 <meshBasicMaterial color="#0ea5e9" transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

const CircleIndicator = ({ origin, radius, color = "#ef4444" }: any) => {
    const ref = useRef<THREE.Group>(null);
    
    useFrame(() => {
        if (ref.current) {
            ref.current.position.set(origin.x, 2, origin.y);
        }
    });

    return (
        <group ref={ref}>
            <mesh rotation={[-Math.PI/2, 0, 0]}>
                <circleGeometry args={[radius, 64]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} />
            </mesh>
            <mesh rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[radius - 2, radius, 64]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
            </mesh>
        </group>
    );
}

const FogOfWar = ({ entities }: { entities: Entity[] }) => {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    return c;
  }, []);
  
  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  useFrame(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with black (Fog)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'black'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cut holes for vision
    ctx.globalCompositeOperation = 'destination-out';
    
    const scaleX = canvas.width / GAME_CONFIG.MAP_WIDTH;
    const scaleY = canvas.height / GAME_CONFIG.MAP_HEIGHT;

    entities.forEach(entity => {
      if (entity.team === Team.BLUE && !entity.isDead) {
        const x = entity.pos.x * scaleX;
        const y = entity.pos.y * scaleY;
        const radius = (entity.visionRange || 400) * scaleX;

        // Draw gradient for soft edges
        const gradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    texture.needsUpdate = true;
  });

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[GAME_CONFIG.MAP_WIDTH / 2, 20, GAME_CONFIG.MAP_HEIGHT / 2]} 
    >
      <planeGeometry args={[GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT]} />
      <meshBasicMaterial transparent opacity={0.6} map={texture} color="black" />
    </mesh>
  );
};

const EntityMesh = ({ entity }: { entity: Entity }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const healthBarRef = useRef<HTMLDivElement>(null);

  useFrame((state) => {
    const now = Date.now();
    if (groupRef.current) {
      // Update position directly from engine entity
      groupRef.current.position.x = entity.pos.x;
      groupRef.current.position.z = entity.pos.y;
      
      // Simple animations
      if (entity.isMoving) {
        // Face movement direction
        // groupRef.current.rotation.y = Math.atan2(entity.pos.x - groupRef.current.position.x, entity.pos.z - groupRef.current.position.z);
        
        if (meshRef.current) {
          meshRef.current.position.y = meshY + Math.sin(state.clock.elapsedTime * 10) * 2;
        }
      } else {
        if (meshRef.current) {
          meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, meshY, 0.1);
        }
      }

      if (entity.type === EntityType.CHAMPION && meshRef.current) {
        meshRef.current.rotation.y += 0.01;
      }

      // Rotation for projectiles
      if (entity.type === EntityType.PROJECTILE) {
        groupRef.current.rotation.y += 0.1;
      }
    }

    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const damageElapsed = entity.lastDamageTime ? now - entity.lastDamageTime : Infinity;
      
      if (damageElapsed < 150) {
        // Flash red
        mat.emissive.set('#ff0000');
        mat.emissiveIntensity = 2;
      } else {
        // Reset to normal
        const baseColor = entity.team === Team.BLUE ? '#3b82f6' : 
                         entity.team === Team.RED ? '#ef4444' : '#ffffff';
        mat.emissive.set(baseColor);
        mat.emissiveIntensity = 0.3;
      }
    }

    if (healthBarRef.current) {
        healthBarRef.current.style.width = `${(entity.health / entity.maxHealth) * 100}%`;
    }
  });

  const hero = entity.heroId ? HEROES.find(h => h.id === entity.heroId) : null;
  let color = hero ? hero.color : '#ffffff';
  if (!hero) {
    if (entity.team === Team.BLUE) color = '#3b82f6';
    if (entity.team === Team.RED) color = '#ef4444';
  }
  
  // Geometry args
  let args: any[] = [entity.radius, 32, 32];
  let Geometry: any = THREE.SphereGeometry;
  let meshY = 5;
  let healthBarY = 40;

  if (entity.type === EntityType.TOWER) {
      Geometry = THREE.CylinderGeometry;
      args = [entity.radius, entity.radius * 1.2, 80, 8];
      meshY = 40;
      healthBarY = 100;
  } else if (entity.type === EntityType.NEXUS) {
      Geometry = THREE.OctahedronGeometry;
      args = [entity.radius * 2, 0];
      meshY = 30;
      healthBarY = 80;
  } else if (entity.type === EntityType.CHAMPION && hero) {
      switch (hero.class) {
        case HeroClass.WARRIOR:
          Geometry = THREE.BoxGeometry;
          args = [entity.radius * 2, 50, entity.radius * 2];
          meshY = 25;
          break;
        case HeroClass.MAGE:
          Geometry = THREE.DodecahedronGeometry;
          args = [entity.radius * 1.5, 0];
          meshY = 30;
          break;
        case HeroClass.ASSASSIN:
          Geometry = THREE.TetrahedronGeometry;
          args = [entity.radius * 1.8, 0];
          meshY = 20;
          break;
        case HeroClass.TANK:
          Geometry = THREE.CylinderGeometry;
          args = [entity.radius * 1.5, entity.radius * 1.5, 40, 16];
          meshY = 20;
          break;
        case HeroClass.RANGER:
          Geometry = THREE.ConeGeometry;
          args = [entity.radius, 60, 16];
          meshY = 30;
          break;
        default:
          Geometry = THREE.ConeGeometry;
          args = [entity.radius, 50, 8];
          meshY = 25;
      }
      healthBarY = 70;
  } else if (entity.type === EntityType.CHAMPION) {
      Geometry = THREE.ConeGeometry;
      args = [entity.radius, 50, 8];
      meshY = 25;
      healthBarY = 60;
  } else if (entity.type === EntityType.PROJECTILE) {
      Geometry = THREE.IcosahedronGeometry;
      args = [entity.radius, 1];
      meshY = 20;
      healthBarY = 0; // No health bar for projectiles
  }

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        position={[0, meshY, 0]}
        castShadow
        receiveShadow
      >
        {/* @ts-ignore */}
        <primitive object={new Geometry(...args)} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.3} 
          roughness={0.4} 
          metalness={0.2} 
        />
      </mesh>
      
      {/* Shield Visual Effect */}
      {entity.shield > 0 && (
        <mesh position={[0, meshY, 0]}>
          <sphereGeometry args={[entity.radius * 1.5, 32, 32]} />
          <meshStandardMaterial 
            color="#60a5fa" 
            transparent 
            opacity={0.3} 
            emissive="#60a5fa"
            emissiveIntensity={1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Health Bar */}
      <Html position={[0, healthBarY, 0]} center zIndexRange={[100, 0]} as="div">
        <div className="w-16 h-2 bg-slate-900/80 border border-slate-700 rounded-full overflow-hidden pointer-events-none relative">
          <div 
            ref={healthBarRef}
            className={`h-full transition-all duration-75 absolute left-0 top-0 ${
              entity.team === Team.BLUE ? 'bg-green-500' : 
              entity.team === Team.RED ? 'bg-red-500' : 'bg-yellow-500'
            }`}
            style={{ width: '100%' }}
          />
          {entity.shield > 0 && (
            <div 
              className="h-full bg-blue-400 absolute top-0"
              style={{
                left: `${(entity.health / entity.maxHealth) * 100}%`,
                width: `${(entity.shield / entity.maxHealth) * 100}%`,
                opacity: 0.8
              }}
            />
          )}
        </div>
      </Html>
    </group>
  );
};

const ProjectileMesh = ({ projectile }: { projectile: any }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.x = projectile.pos.x;
            meshRef.current.position.z = projectile.pos.y;
            meshRef.current.position.y = 10;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 10, 0]}>
            <sphereGeometry args={[5]} />
            <meshStandardMaterial color={projectile.team === Team.BLUE ? '#60a5fa' : '#f87171'} emissiveIntensity={2} toneMapped={false} />
        </mesh>
    );
}

const DecorativeProps = () => {
    // Simple stylized props
    const props = useMemo(() => {
        const p = [];
        for (let i = 0; i < 50; i++) {
            p.push({
                position: [Math.random() * GAME_CONFIG.MAP_WIDTH, 0, Math.random() * GAME_CONFIG.MAP_HEIGHT],
                type: Math.random() > 0.5 ? 'tree' : 'rock'
            });
        }
        return p;
    }, []);

    return (
        <>
            {props.map((p, i) => (
                <mesh key={i} position={p.position as any}>
                    {p.type === 'tree' ? (
                        <group>
                            <mesh position={[0, 40, 0]}>
                                <coneGeometry args={[20, 60, 8]} />
                                <meshStandardMaterial color="#166534" />
                            </mesh>
                            <mesh position={[0, 15, 0]}>
                                <cylinderGeometry args={[5, 5, 30]} />
                                <meshStandardMaterial color="#451a03" />
                            </mesh>
                        </group>
                    ) : (
                        <mesh>
                            <dodecahedronGeometry args={[15]} />
                            <meshStandardMaterial color="#475569" />
                        </mesh>
                    )}
                </mesh>
            ))}
        </>
    );
}

const GameScene = ({ engine, activeAbilityId, onCast, onCancel }: { engine: GameEngine, activeAbilityId: string | null, onCast: any, onCancel: any }) => {
  const { camera, gl } = useThree();
  const [entityList, setEntityList] = useState<Entity[]>([]);
  const [projectileList, setProjectileList] = useState<any[]>([]);
  const [locked, setLocked] = useState(true);
  const controlsRef = useRef<any>(null);
  
  // Track mouse for indicators
  const [mouseWorldPos, setMouseWorldPos] = useState(new THREE.Vector3());

  // Toggle lock on Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setLocked(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useFrame((state, delta) => {
    // Run Game Loop
    if (!engine.multiplayer) {
      engine.update();
    } else {
      // Interpolate entities
      for (const entity of engine.entities.values()) {
        const serverPos = (entity as any).serverPos;
        if (serverPos) {
          entity.pos.x += (serverPos.x - entity.pos.x) * 10 * delta;
          entity.pos.y += (serverPos.y - entity.pos.y) * 10 * delta;
        }
      }

      // Interpolate projectiles
      for (const proj of engine.projectiles) {
        const serverPos = (proj as any).serverPos;
        if (serverPos) {
          proj.pos.x += (serverPos.x - proj.pos.x) * 10 * delta;
          proj.pos.y += (serverPos.y - proj.pos.y) * 10 * delta;
        }
      }
    }

    // Sync Entity List
    const currentEntities = Array.from(engine.entities.values()).filter(e => !e.isDead && (e.isVisible !== false));
    setEntityList(currentEntities);
    setProjectileList([...engine.projectiles]);

    // Camera Follow
    const player = engine.entities.get(engine.playerID);
    if (player && locked) {
      const targetPos = new THREE.Vector3(player.pos.x, 0, player.pos.y);
      const offset = new THREE.Vector3(0, 800, 600); // Isometric-ish view, zoomed out
      
      // Smooth lerp
      state.camera.position.lerp(targetPos.clone().add(offset), 0.1);
      state.camera.lookAt(targetPos);

      // Sync controls target so when we unlock, it doesn't jump
      if (controlsRef.current) {
          controlsRef.current.target.copy(targetPos);
      }
    }
  });

  const handlePointerDown = (e: any) => {
    // e.point is the 3D point on the ground mesh
    if (e.button === 2) { // Right click
        if (activeAbilityId) {
            onCancel();
        } else {
            if (engine.multiplayer) {
              engine.targetMovePos = { x: e.point.x, y: e.point.z };
              import('../socket').then(({ socket }) => {
                socket.emit('game_input', { type: 'MOVE', data: { x: e.point.x, y: e.point.z, isWorld: true } });
              });
            } else {
              engine.handleInput('MOVE', { x: e.point.x, y: e.point.z, isWorld: true });
            }
        }
    } else if (e.button === 0) { // Left click
        if (activeAbilityId) {
            onCast(e.point.x, e.point.z);
        } else {
            // Check for ability usage (if not targeting, maybe auto-attack move?)
            // For now, just move or do nothing
        }
    }
  };

  const player = engine.entities.get(engine.playerID);

  return (
    <>
      <MapControls 
        ref={controlsRef}
        enabled={!locked}
        enableRotate={false}
        screenSpacePanning={false}
        minDistance={200}
        maxDistance={1000}
        mouseButtons={{
            LEFT: THREE.MOUSE.PAN, 
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        }}
      />

      <ambientLight intensity={0.8} />
      <directionalLight 
        position={[100, 200, 100]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1500}
        shadow-camera-right={1500}
        shadow-camera-top={1500}
        shadow-camera-bottom={-1500}
      />
      
      {/* Background/Skybox */}
      <color attach="background" args={['#0f172a']} />
      <fog attach="fog" args={['#0f172a', 1000, 3000]} />

      {/* Ground */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[GAME_CONFIG.MAP_WIDTH / 2, -1, GAME_CONFIG.MAP_HEIGHT / 2]} 
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
            engine.mousePos = { x: e.point.x, y: e.point.z };
            setMouseWorldPos(e.point);
        }}
        onContextMenu={(e) => e.nativeEvent.preventDefault()}
      >
        <planeGeometry args={[GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Grid Helper */}
      <gridHelper 
        args={[Math.max(GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT), 20, 0x334155, 0x334155]} 
        position={[GAME_CONFIG.MAP_WIDTH / 2, 0.1, GAME_CONFIG.MAP_HEIGHT / 2]} 
      />

      {/* Environment */}
      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <DecorativeProps />
      
      {/* Fog of War */}
      <FogOfWar entities={Array.from(engine.entities.values())} />

      {/* Indicators */}
      {activeAbilityId && player && (
          <>
            {activeAbilityId === 'q' && (
                <LineIndicator origin={player.pos} target={mouseWorldPos} range={600} />
            )}
            {activeAbilityId === 'w' && (
                <CircleIndicator origin={player.pos} radius={player.radius * 2} color="#60a5fa" />
            )}
            {activeAbilityId === 'e' && (
                <LineIndicator origin={player.pos} target={mouseWorldPos} range={200} width={30} />
            )}
            {activeAbilityId === 'r' && (
                <CircleIndicator origin={player.pos} radius={300} color="#ef4444" />
            )}
          </>
      )}

      {/* Entities */}
      {entityList.map(entity => (
        <EntityMesh key={entity.id} entity={entity} />
      ))}

      {/* Projectiles */}
      {projectileList.map((p, i) => (
        <ProjectileMesh key={i} projectile={p} />
      ))}
      
      <DamageNumbers engine={engine} />

      {/* Lock Indicator */}
      <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
        <div className="fixed bottom-4 left-4 text-white/50 text-xs font-mono">
            CAMERA: {locked ? 'LOCKED (SPACE to Unlock)' : 'FREE (SPACE to Lock)'}
        </div>
      </Html>
    </>
  );
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, activeAbilityId, onCast, onCancel }) => {
  return (
    <div className="w-full h-full bg-slate-950">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 500, 500]} fov={70} />
        <GameScene engine={engine} activeAbilityId={activeAbilityId} onCast={onCast} onCancel={onCancel} />
        
        <EffectComposer>
            <Bloom 
                intensity={1.0} 
                luminanceThreshold={0.3} 
                luminanceSmoothing={0.9} 
                blendFunction={BlendFunction.ADD} 
            />
            <Noise opacity={0.03} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
