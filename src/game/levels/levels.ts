import type { LevelData, WaveEntry } from './types';

// Compact wave constructor.
const w = (at: number, spawn: string, count = 1, formation?: WaveEntry['formation'], side?: WaveEntry['side']): WaveEntry => ({
  at, spawn, count, formation, side,
});

export const LEVELS: LevelData[] = [
  // ===== 1: Earth, intro =====
  {
    id: 1, name: 'Earth Patrol', duration: 100, themeKey: 'earth', bossIndex: 0,
    background: {
      planets: [{ planetIndex: 0, speed: 60, x: 1050, spawnAt: 6 }],
      bases: [],
    },
    waves: [
      w(2, 'scout', 4, 'line'),
      w(8, 'scout', 6, 'v'),
      w(16, 'scout-shooter', 4, 'arc'),
      w(26, 'scout-bouncer', 6, 'line'),
      w(38, 'scout-ambusher', 5, 'line'),
      w(50, 'fighter', 3, 'v'),
      w(62, 'scout-bouncer', 8, 'arc'),
      w(74, 'fighter-pincer', 4, 'sides'),
      w(86, 'scout-ambusher', 6, 'random'),
    ],
  },
  // ===== 2: Earth orbit =====
  {
    id: 2, name: 'Orbital Defense', duration: 110, themeKey: 'earth', bossIndex: 1,
    background: {
      planets: [{ planetIndex: 0, speed: 60, x: 200, spawnAt: 8 }, { planetIndex: 7, speed: 70, x: 1100, spawnAt: 50 }],
      bases: [],
      satellites: { speed: 50, rate: 0.18 },
    },
    waves: [
      w(3, 'scout', 6, 'line'),
      w(10, 'scout-shooter', 4, 'v'),
      w(20, 'fighter', 4, 'arc'),
      w(32, 'scout-ambusher', 6, 'random'),
      w(44, 'fighter', 5, 'line'),
      w(56, 'scout-shooter', 6, 'arc'),
      w(68, 'fighter-pincer', 5, 'sides'),
      w(80, 'scout-ambusher', 8, 'random'),
      w(92, 'fighter', 6, 'arc'),
    ],
  },
  // ===== 3: Asteroid belt =====
  {
    id: 3, name: 'Asteroid Belt', duration: 120, themeKey: 'earth', bossIndex: 2,
    background: {
      planets: [{ planetIndex: 1, speed: 60, x: 1050, spawnAt: 10 }],
      bases: [],
      asteroids: { speed: 110, rate: 1.2 },
    },
    waves: [
      w(3, 'scout-shooter', 5, 'v'),
      w(12, 'fighter', 4, 'arc'),
      w(22, 'bomber', 2, 'line'),
      w(34, 'scout-ambusher', 7, 'random'),
      w(46, 'fighter-pincer', 4, 'sides'),
      w(58, 'bomber-captain', 2, 'arc'),
      w(70, 'fighter', 6, 'line'),
      w(82, 'scout-shooter', 6, 'arc'),
      w(94, 'bomber-captain', 3, 'v'),
      w(104, 'fighter-pincer', 6, 'sides'),
    ],
  },
  // ===== 4: Lunar base =====
  {
    id: 4, name: 'Lunar Base', duration: 130, themeKey: 'industrial', bossIndex: 3,
    background: {
      planets: [{ planetIndex: 6, speed: 60, x: 220, spawnAt: 8 }],
      bases: [{ burning: false, speed: 70, x: 1080, spawnAt: 50 }],
    },
    waves: [
      w(3, 'fighter', 4, 'v'),
      w(12, 'interceptor', 3, 'arc'),
      // Filler — keeps the playfield from going empty between heavy waves.
      // L4 was the slowest level by telemetry (0.14 kills/s vs L3's 0.28).
      w(17, 'scout', 6, 'swarm'),
      w(22, 'scout-shooter', 6, 'line'),
      w(34, 'bomber-captain', 2, 'v'),
      w(40, 'drone-shooter', 5, 'line'),
      w(46, 'interceptor-ace', 3, 'arc'),
      w(58, 'fighter-pincer', 5, 'sides'),
      w(64, 'scout-bouncer', 6, 'random'),
      w(70, 'interceptor-ace', 4, 'v'),
      w(82, 'bomber', 3, 'line'),
      w(88, 'drone', 7, 'swarm'),
      w(94, 'scout-ambusher', 8, 'random'),
      w(106, 'interceptor-ace', 5, 'arc'),
      w(112, 'scout-shooter', 6, 'arc'),
      w(118, 'fighter-pincer', 5, 'sides'),
    ],
  },
  // ===== 5: Belt outskirts — drones =====
  {
    id: 5, name: 'Belt Outskirts', duration: 130, themeKey: 'industrial', bossIndex: 4,
    background: {
      planets: [{ planetIndex: 2, speed: 60, x: 1080, spawnAt: 30 }],
      bases: [],
      asteroids: { speed: 130, rate: 1.8 },
    },
    waves: [
      w(3, 'fighter', 4, 'arc'),
      w(12, 'drone', 10, 'swarm'),
      w(24, 'interceptor-ace', 3, 'v'),
      w(34, 'drone', 12, 'swarm'),
      w(46, 'drone-cross', 6, 'arc'),
      w(58, 'fighter-pincer', 5, 'sides'),
      w(70, 'drone-cross', 10, 'swarm'),
      w(82, 'bomber-captain', 2),
      w(92, 'interceptor-ace', 4, 'arc'),
      w(104, 'drone-cross', 8, 'swarm'),
      w(116, 'drone', 16, 'swarm'),
    ],
  },
  // ===== 6: Abandoned station — turrets =====
  {
    id: 6, name: 'Abandoned Station', duration: 130, themeKey: 'industrial', bossIndex: 5,
    background: {
      planets: [{ planetIndex: 6, speed: 50, x: 1100, spawnAt: 60 }],
      bases: [{ burning: false, speed: 80, x: 600, spawnAt: 14 }, { burning: false, speed: 80, x: 1000, spawnAt: 65 }],
      derelicts: [{ speed: 70, x: 280, spawnAt: 35, variant: 0 }, { speed: 70, x: 920, spawnAt: 95, variant: 1 }],
    },
    waves: [
      w(3, 'fighter', 4, 'arc'),
      w(12, 'turret', 2, 'line'),
      w(24, 'interceptor-ace', 4, 'v'),
      w(34, 'turret-crossfire', 2),
      w(46, 'fighter-pincer', 6, 'sides'),
      w(56, 'turret-crossfire', 3, 'line'),
      w(70, 'bomber-captain', 2),
      w(82, 'interceptor-ace', 4, 'arc'),
      w(92, 'turret-crossfire', 2),
      w(104, 'fighter-pincer', 6, 'sides'),
      w(116, 'turret-crossfire', 3, 'line'),
    ],
  },
  // ===== 7: Mine fields =====
  {
    id: 7, name: 'Mine Fields', duration: 130, themeKey: 'industrial', bossIndex: 6,
    background: {
      planets: [{ planetIndex: 3, speed: 60, x: 240, spawnAt: 12 }],
      bases: [],
      asteroids: { speed: 110, rate: 1.0 },
    },
    waves: [
      w(3, 'fighter', 4),
      w(12, 'miner', 3, 'strafe-l'),
      w(22, 'miner', 3, 'strafe-r'),
      w(34, 'fighter-pincer', 6, 'sides'),
      w(46, 'miner', 4, 'strafe-l'),
      w(58, 'turret-crossfire', 2),
      w(70, 'miner', 4, 'strafe-r'),
      w(82, 'bomber-captain', 2),
      w(92, 'interceptor-ace', 4, 'arc'),
      w(104, 'miner', 5, 'sides'),
      w(116, 'fighter-pincer', 6, 'sides'),
    ],
  },
  // ===== 8: Dark sector — snipers =====
  {
    id: 8, name: 'Dark Sector', duration: 135, themeKey: 'darksector', bossIndex: 7,
    background: {
      planets: [{ planetIndex: 2, speed: 60, x: 1100, spawnAt: 14 }, { planetIndex: 5, speed: 70, x: 220, spawnAt: 70 }],
      bases: [],
    },
    waves: [
      w(3, 'fighter', 4),
      w(12, 'sniper', 2, 'line'),
      w(22, 'interceptor-ace', 4, 'arc'),
      w(34, 'sniper', 3),
      w(46, 'miner', 4, 'sides'),
      w(58, 'sniper', 2),
      w(70, 'turret-crossfire', 2),
      w(82, 'fighter-pincer', 7, 'sides'),
      w(94, 'sniper', 3),
      w(106, 'bomber-captain', 3, 'v'),
      w(118, 'sniper', 3, 'line'),
    ],
  },
  // ===== 9: Blockade breakout — kamikaze =====
  {
    id: 9, name: 'Blockade', duration: 135, themeKey: 'darksector', bossIndex: 8,
    background: {
      planets: [{ planetIndex: 5, speed: 60, x: 1080, spawnAt: 20 }],
      bases: [{ burning: true, speed: 80, x: 320, spawnAt: 50 }],
    },
    waves: [
      w(3, 'fighter-pincer', 6, 'sides'),
      w(12, 'kamikaze', 3),
      w(22, 'interceptor-ace', 4, 'v'),
      w(32, 'kamikaze', 4),
      w(44, 'drone-lane', 5, 'line'),
      w(56, 'kamikaze', 5),
      w(68, 'fighter-pincer', 6, 'sides'),
      w(80, 'kamikaze', 6),
      w(92, 'bomber-captain', 3),
      w(104, 'kamikaze', 7),
      w(118, 'interceptor-ace', 5, 'arc'),
    ],
  },
  // ===== 10: Saturn — heavy =====
  {
    id: 10, name: 'Saturn Wreckage', duration: 140, themeKey: 'darksector', bossIndex: 9,
    background: {
      planets: [{ planetIndex: 1, speed: 50, x: 600, spawnAt: 15 }],
      bases: [{ burning: true, speed: 80, x: 200, spawnAt: 80 }],
      asteroids: { speed: 110, rate: 0.8 },
      derelicts: [{ speed: 80, x: 380, spawnAt: 45, variant: 0 }, { speed: 80, x: 1000, spawnAt: 110, variant: 1 }],
    },
    waves: [
      w(3, 'fighter-pincer', 4, 'sides'),
      w(12, 'heavy-breaker', 1),
      w(22, 'interceptor-ace', 4, 'arc'),
      w(34, 'turret-crossfire', 2),
      w(46, 'heavy-breaker', 2),
      w(60, 'kamikaze', 4),
      w(72, 'sniper', 3),
      w(86, 'heavy-breaker', 2),
      w(100, 'bomber-captain', 3, 'v'),
      w(112, 'heavy-breaker', 2),
      w(124, 'fighter-pincer', 8, 'sides'),
    ],
  },
  // ===== 11: Ghost nebula — stealth =====
  {
    id: 11, name: 'Ghost Nebula', duration: 140, themeKey: 'anomaly', bossIndex: 10,
    background: {
      planets: [{ planetIndex: 4, speed: 60, x: 1080, spawnAt: 14 }],
      bases: [],
    },
    waves: [
      w(3, 'fighter-pincer', 4, 'sides'),
      w(12, 'stealth', 2, 'arc'),
      w(24, 'sniper', 2),
      w(34, 'stealth', 3),
      w(46, 'interceptor-ace', 5, 'v'),
      w(58, 'stealth', 4),
      w(70, 'turret-crossfire', 2),
      w(82, 'stealth', 4),
      w(94, 'heavy-breaker', 2),
      w(106, 'stealth', 5, 'arc'),
      w(118, 'kamikaze', 4),
    ],
  },
  // ===== 12: Storm — tesla =====
  {
    id: 12, name: 'Energy Storm', duration: 140, themeKey: 'anomaly', bossIndex: 11,
    background: {
      planets: [{ planetIndex: 4, speed: 60, x: 240, spawnAt: 14 }],
      bases: [],
    },
    waves: [
      w(3, 'fighter-pincer', 6, 'sides'),
      w(14, 'tesla', 2),
      w(26, 'tesla-weaver', 3, 'arc'),
      w(38, 'stealth', 3),
      w(50, 'tesla-weaver', 3, 'line'),
      w(62, 'sniper', 2),
      w(74, 'tesla-weaver', 4),
      w(86, 'heavy-breaker', 2),
      w(98, 'tesla-weaver', 4),
      w(110, 'fighter-pincer', 8, 'sides'),
      w(122, 'tesla-weaver', 5),
    ],
  },
  // ===== 13: Burning base — elites start =====
  {
    id: 13, name: 'Blazing Outpost', duration: 145, themeKey: 'anomaly', bossIndex: 12,
    background: {
      planets: [],
      bases: [{ burning: true, speed: 90, x: 640, spawnAt: 10 }, { burning: true, speed: 90, x: 320, spawnAt: 70 }],
    },
    waves: [
      w(3, 'elite-scout', 6, 'arc'),
      w(14, 'elite-fighter', 4, 'v'),
      w(26, 'turret-crossfire', 3),
      w(38, 'elite-scout', 8, 'line'),
      w(50, 'heavy-suppressor', 1),
      w(62, 'bomber-captain', 3),
      w(74, 'elite-scout', 10, 'random'),
      w(86, 'heavy-breaker', 2),
      w(98, 'elite-fighter', 6, 'v'),
      w(112, 'stealth', 4),
      w(124, 'kamikaze', 6),
    ],
  },
  // ===== 14: Gravity anomalies — elite bombers =====
  {
    id: 14, name: 'Gravity Anomalies', duration: 145, themeKey: 'anomaly', bossIndex: 13,
    background: {
      planets: [{ planetIndex: 3, speed: 60, x: 600, spawnAt: 14 }],
      bases: [],
    },
    waves: [
      w(3, 'elite-fighter', 6, 'arc'),
      w(14, 'elite-bomber', 2),
      w(26, 'tesla-weaver', 3),
      w(38, 'elite-bomber', 3),
      w(50, 'interceptor-ace', 6, 'v'),
      w(62, 'elite-bomber', 4),
      w(74, 'stealth', 5),
      w(86, 'elite-bomber', 4),
      w(98, 'heavy-breaker', 3),
      w(110, 'elite-fighter', 6, 'arc'),
      w(124, 'elite-bomber', 4),
    ],
  },
  // ===== 15: Hive — drone swarms + elites =====
  {
    id: 15, name: 'Alien Hive', duration: 150, themeKey: 'hive', bossIndex: 14,
    background: {
      planets: [{ planetIndex: 3, speed: 60, x: 1100, spawnAt: 20 }],
      bases: [],
    },
    waves: [
      w(3, 'drone', 14, 'swarm'),
      w(12, 'elite-interceptor', 4, 'arc'),
      w(24, 'drone-cross', 14, 'swarm'),
      w(36, 'drone-lane', 7, 'line'),
      w(48, 'elite-interceptor', 5),
      w(60, 'drone', 18, 'swarm'),
      w(72, 'tesla-weaver', 4),
      w(84, 'elite-interceptor', 6, 'arc'),
      w(96, 'drone-cross', 12, 'arc'),
      w(110, 'elite-fighter', 6, 'arc'),
      w(122, 'drone-lane', 8, 'v'),
      w(136, 'elite-interceptor', 6, 'v'),
    ],
  },
  // ===== 16: Black hole orbit — elite heavy =====
  {
    id: 16, name: 'Event Horizon', duration: 150, themeKey: 'hive', bossIndex: 15,
    background: {
      planets: [{ planetIndex: 7, speed: 60, x: 320, spawnAt: 14 }],
      bases: [],
    },
    waves: [
      w(3, 'elite-fighter', 6, 'arc'),
      w(14, 'elite-heavy', 1),
      w(26, 'sniper', 4),
      w(38, 'heavy-breaker', 2),
      w(50, 'tesla-weaver', 5),
      w(62, 'elite-heavy', 2),
      w(76, 'kamikaze', 8),
      w(88, 'heavy-breaker', 3),
      w(100, 'stealth', 6),
      w(112, 'elite-fighter', 8, 'arc'),
      w(126, 'elite-heavy', 3),
    ],
  },
  // ===== 17: Factories — all elites =====
  {
    id: 17, name: 'Enemy Factories', duration: 155, themeKey: 'hive', bossIndex: 16,
    background: {
      planets: [],
      bases: [{ burning: false, speed: 80, x: 320, spawnAt: 10 }, { burning: false, speed: 80, x: 960, spawnAt: 70 }],
    },
    waves: [
      w(3, 'elite-scout', 8, 'arc'),
      w(12, 'elite-interceptor', 5, 'v'),
      w(24, 'elite-fighter', 6, 'arc'),
      w(36, 'stealth', 5),
      w(48, 'elite-bomber', 3),
      w(60, 'sniper', 4),
      w(72, 'turret-crossfire', 4),
      w(84, 'heavy-suppressor', 2),
      w(96, 'elite-interceptor', 6, 'arc'),
      w(108, 'tesla-weaver', 5),
      w(120, 'elite-fighter', 8, 'arc'),
      w(132, 'elite-bomber', 4),
    ],
  },
  // ===== 18: Imperial fleet — big formations =====
  {
    id: 18, name: 'Imperial Fleet', duration: 160, themeKey: 'final', bossIndex: 17,
    background: {
      planets: [{ planetIndex: 7, speed: 60, x: 1100, spawnAt: 20 }],
      bases: [{ burning: false, speed: 80, x: 200, spawnAt: 80 }],
      derelicts: [{ speed: 70, x: 640, spawnAt: 50, variant: 0 }, { speed: 70, x: 240, spawnAt: 120, variant: 1 }],
      satellites: { speed: 60, rate: 0.12 },
    },
    waves: [
      w(3, 'fighter-pincer', 10, 'sides'),
      w(14, 'elite-fighter', 8, 'v'),
      w(28, 'bomber-captain', 4, 'line'),
      w(42, 'elite-heavy', 2),
      w(56, 'fighter-pincer', 10, 'sides'),
      w(70, 'elite-interceptor', 8, 'arc'),
      w(84, 'turret-crossfire', 4),
      w(98, 'elite-bomber', 4),
      w(112, 'heavy-breaker', 4, 'line'),
      w(124, 'elite-fighter', 10, 'arc'),
      w(138, 'elite-heavy', 3),
    ],
  },
  // ===== 19: Citadel perimeter — mix everything =====
  {
    id: 19, name: 'Citadel Perimeter', duration: 165, themeKey: 'final', bossIndex: 18,
    background: {
      planets: [],
      bases: [{ burning: true, speed: 80, x: 640, spawnAt: 15 }],
    },
    waves: [
      w(3, 'elite-scout', 8, 'arc'),
      w(14, 'elite-fighter', 6, 'v'),
      w(26, 'kamikaze', 6),
      w(38, 'tesla-weaver', 4),
      w(50, 'elite-bomber', 3),
      w(62, 'sniper', 4),
      w(74, 'elite-interceptor', 6, 'arc'),
      w(86, 'stealth', 6),
      w(98, 'turret-crossfire', 4),
      w(110, 'elite-heavy', 3),
      w(122, 'kamikaze', 8),
      w(134, 'elite-fighter', 10, 'arc'),
      w(146, 'elite-bomber', 4),
    ],
  },
  // ===== 20: Finale =====
  {
    id: 20, name: 'Final Battle', duration: 175, themeKey: 'final', bossIndex: 19,
    background: {
      planets: [{ planetIndex: 5, speed: 50, x: 200, spawnAt: 10 }, { planetIndex: 7, speed: 60, x: 1100, spawnAt: 80 }],
      bases: [{ burning: true, speed: 80, x: 640, spawnAt: 100 }],
    },
    waves: [
      w(3, 'elite-fighter', 8, 'v'),
      w(14, 'elite-bomber', 3),
      w(26, 'elite-interceptor', 8, 'arc'),
      w(38, 'tesla-weaver', 5),
      w(50, 'kamikaze', 8),
      w(62, 'elite-heavy', 3),
      w(74, 'sniper', 5),
      w(86, 'stealth', 6),
      w(98, 'elite-fighter', 12, 'arc'),
      w(110, 'turret-crossfire', 5),
      w(122, 'elite-bomber', 5),
      w(134, 'kamikaze', 10),
      w(148, 'heavy-breaker', 4),
      w(160, 'elite-fighter', 14, 'arc'),
    ],
  },
];
