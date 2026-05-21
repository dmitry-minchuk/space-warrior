export type Formation = 'line' | 'v' | 'arc' | 'swarm' | 'random' | 'strafe-l' | 'strafe-r' | 'sides';
export type WaveSide = 'top' | 'left' | 'right';

export interface WaveEntry {
  at: number;
  spawn: string;
  count: number;
  formation?: Formation;
  side?: WaveSide;
  // optional spacing/amp/offset
  spacing?: number;
  offset?: number;
}

export interface LevelData {
  id: number;
  name: string;
  duration: number;        // seconds until boss arrives if waves done
  themeKey: string;
  background: BackgroundDef;
  waves: WaveEntry[];
  bossIndex: number;       // 0..19
}

export interface BackgroundDef {
  nebula?: { themeKey?: string; speed: number };
  planets: Array<{ planetIndex: number; speed: number; x: number; spawnAt: number }>;
  bases: Array<{ burning: boolean; speed: number; x: number; spawnAt: number }>;
  asteroids?: { speed: number; rate: number };  // optional asteroid stream
  satellites?: { speed: number; rate: number };   // optional satellite drift
  derelicts?: Array<{ speed: number; x: number; spawnAt: number; variant?: number }>;
}
