export type WeaponId =
  | 'pulse'
  | 'spread'
  | 'plasma'
  | 'missiles'
  | 'wave'
  | 'lightning';

export const ALL_WEAPONS: WeaponId[] = [
  'pulse',
  'spread',
  'plasma',
  'missiles',
  'wave',
  'lightning',
];

export const WEAPON_LABELS: Record<WeaponId, string> = {
  pulse: 'Pulse Gun',
  spread: 'Spread Shot',
  plasma: 'Plasma Cannon',
  missiles: 'Homing Missiles',
  wave: 'Wave Beam',
  lightning: 'Lightning',
};
