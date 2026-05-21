// Color palette used across the game.

export const COL = {
  player: {
    hullDark: 0x0d2440,
    hull: 0x18467a,
    hullLight: 0x3a8acc,
    accent: 0x6ed8ff,
    emissive: 0x9bf3ff,
    cockpit: 0xffd166,
    cockpitGlow: 0xffeaa3,
    engineCore: 0xeaffff,
    engineGlow: 0x39c6ff,
  },
  enemyCommon: {
    bulletCore: 0xfff2c8,
    bulletGlow: 0xff7733,
  },
  scout: { dark: 0x222a33, hull: 0x4a5664, light: 0x7b8a9a, accent: 0x4ec3ff, engine: 0x6ed4ff },
  fighter: { dark: 0x2a0e0e, hull: 0x782525, light: 0xc94747, accent: 0xff8888, engine: 0xffaa55 },
  bomber: { dark: 0x132a17, hull: 0x265c2e, light: 0x5fb462, accent: 0xb8ff8a, engine: 0xffd24a },
  interceptor: { dark: 0x0d0d12, hull: 0x1d1d24, light: 0x3a3a45, accent: 0xff9133, engine: 0xff6a00 },
  drone: { dark: 0x0a2a2a, hull: 0x1a5a5f, light: 0x37d0d6, accent: 0x8af3ff, engine: 0xb8fffd },
  turret: { dark: 0x2a2218, hull: 0x584734, light: 0x9c815e, accent: 0xffb049, engine: 0xff7e2a },
  miner: { dark: 0x20162a, hull: 0x432e58, light: 0x7d569d, accent: 0xc89bff, engine: 0xa974ff },
  sniper: { dark: 0x2a2412, hull: 0x6a5520, light: 0xc7a44a, accent: 0xffe787, engine: 0xfff5a3 },
  kamikaze: { dark: 0x320404, hull: 0x900b0b, light: 0xff3030, accent: 0xff8a3d, engine: 0xffbb33 },
  heavy: { dark: 0x0a1326, hull: 0x152545, light: 0x2f4d8a, accent: 0x69aaff, engine: 0xffce4d },
  stealth: { dark: 0x150724, hull: 0x36124d, light: 0x7434b6, accent: 0xc579ff, engine: 0xe2a3ff },
  tesla: { dark: 0x081826, hull: 0x1a4366, light: 0x65b0e0, accent: 0xbfe6ff, engine: 0xeaffff },
  boss: { dark: 0x1a1019, hull: 0x4b2935, light: 0x9d4a52, accent: 0xff7a33, engine: 0xffdd66 },
};

export const PROJ = {
  playerPulse: 0x9bf3ff,
  playerPulseCore: 0xffffff,
  playerSpread: 0xffe97a,
  playerPlasma: 0xb8ffb0,
  playerPlasmaCore: 0xffffff,
  playerLaser: 0xff66ff,
  playerLaserCore: 0xffffff,
  playerMissile: 0xff8a3d,
  playerWave: 0x9b9bff,
  playerLightning: 0xf5fdff,
  enemyBullet: 0xff7a3d,
  enemyBulletCore: 0xffe7a3,
  enemyHeavy: 0xff2a2a,
  enemyPlasma: 0xc266ff,
  enemySniper: 0xfff5a3,
  enemyLaserCharge: 0xff4a4a,
  enemyMine: 0xff8a2a,
};

export const THEMES: Record<string, ThemePalette> = {
  earth: { name: 'Earth Orbit', bg: 0x040816, fog: 0x102036, stars: 0xc6deff, accents: [0x4a7cc8, 0x99c7ff, 0x5f8aa8], nebula: [0x143560, 0x214a82, 0x2a3a64] },
  industrial: { name: 'Industrial', bg: 0x0a0708, fog: 0x1f1410, stars: 0xffe2c8, accents: [0xb56b2e, 0xd49452, 0x6d5a45], nebula: [0x3a1f12, 0x46271a, 0x231311] },
  darksector: { name: 'Dark Sector', bg: 0x0b0512, fog: 0x190b27, stars: 0xe2c8ff, accents: [0x6a2b91, 0x9a3aa6, 0x2c2647], nebula: [0x2a0a3a, 0x3d0f4a, 0x180a26] },
  anomaly: { name: 'Anomalies', bg: 0x06121a, fog: 0x102230, stars: 0xa4ffe6, accents: [0x36b1a3, 0x6ae5ff, 0x9c44d6], nebula: [0x153c4a, 0x1d6e6e, 0x261a3b] },
  hive: { name: 'Hive', bg: 0x0a1a0a, fog: 0x1a2f12, stars: 0xd6ffa0, accents: [0x84c44a, 0x4ac6b2, 0xd9c84a], nebula: [0x214a1a, 0x1a3a32, 0x3a4a1a] },
  final: { name: 'Final', bg: 0x040814, fog: 0x0c1832, stars: 0xffe19b, accents: [0x9a7a2e, 0x2b4dac, 0xf2c14f], nebula: [0x1a2240, 0x0d1736, 0x322a16] },
};

export interface ThemePalette {
  name: string;
  bg: number;
  fog: number;
  stars: number;
  accents: [number, number, number];
  nebula: [number, number, number];
}

export function themeForLevel(level: number): ThemePalette {
  if (level <= 3) return THEMES.earth;
  if (level <= 7) return THEMES.industrial;
  if (level <= 10) return THEMES.darksector;
  if (level <= 14) return THEMES.anomaly;
  if (level <= 17) return THEMES.hive;
  return THEMES.final;
}
