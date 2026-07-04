export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const HUD_TOP = 0;
export const HUD_BOTTOM = GAME_HEIGHT;

export const PLAYER_MIN_X = 32;
export const PLAYER_MAX_X = GAME_WIDTH - 32;
export const PLAYER_MIN_Y = GAME_HEIGHT * 0.35;
export const PLAYER_MAX_Y = GAME_HEIGHT - 40;

/** Longest single simulation step; longer frames are split into sub-steps. */
export const MAX_SUBSTEP = 1 / 40;
