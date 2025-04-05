/**
 * Game Constants
 * Centralized configuration for game parameters
 */

// Player related constants
export const PLAYER = {
  SPEED: 200,
  DASH_SPEED: 400,
  DASH_DURATION: 200,
  DASH_COOLDOWN: 1000,
  BODY_WIDTH: 30,
  BODY_HEIGHT: 30,
  SPRITE_SIZE: 40
};

// Game mechanics constants
export const GAME = {
  INITIAL_WAVE_TIME: 20000,
  COINS_PER_WAVE: 10,
  INITIAL_ENEMY_COUNT: 10,
  BONUS_POINTS_PER_SECOND: 10,
  SAFE_SPAWN_DISTANCE: 200,
  GAME_RESTART_DELAY: 3000,
  WAVE_TRANSITION_DELAY: 2500,
  POWERUP_CHANCE: 0.2,
  ANNOUNCEMENT_DURATION: 3000
};

// Enemy related constants
export const ENEMY = {
  SPEED_MIN: 80,
  SPEED_MAX: 120,
  TYPES: ['basic', 'fast', 'large', 'zigzag'],
  BEHAVIOR_CHANGE_TIME: 5000,
  OVERLAP_THRESHOLD: 0.25 // For collision detection
};

// Animation related constants
export const ANIMATION = {
  COIN_FALL_HEIGHT: 300,
  COIN_FALL_DURATION: 700,
  COIN_BOUNCE_HEIGHT: 50
};

// UI related constants
export const UI = {
  TEXT_STYLE: {
    fontSize: "24px",
    fill: "#ffffff"
  },
  ANNOUNCEMENT_STYLE: {
    fontSize: "36px",
    fill: "#ffffff",
    backgroundColor: "#000000",
    padding: { x: 20, y: 10 }
  },
  ANNOUNCEMENT_DURATION: 2000
};

// Colors
export const COLORS = {
  PLAYER: 0x00ff00,
  COIN: 0xffff00,
  ENEMY_BASIC: 0xff0000,
  ENEMY_FAST: 0xff6600,
  ENEMY_LARGE: 0xcc0000,
  ENEMY_ZIGZAG: 0xff00ff,
  DASH_TRAIL: 0x00ffff,
  BORDER_GLOW: 0x00ffff
};

// Event names
export const EVENTS = {
  SCORE_UPDATED: "updateScore",
  WAVE_UPDATED: "updateWave",
  TIMER_UPDATED: "updateTimer",
  COINS_UPDATED: "updateCoins",
  WAVE_COMPLETED: "waveCompleted",
  GAME_OVER: "gameOver",
  WAVE_TIME_UP: "waveTimeUp",
  DASH_READY: "dashReady"
};
