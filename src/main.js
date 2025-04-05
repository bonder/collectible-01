import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';

// Game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#222222",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // No gravity for a top-down game
      debug: false, // Debug mode disabled
    },
  },
  scene: [GameScene, UIScene, GameOverScene], // Include all scenes
  parent: "game-container",
}

// Create the game instance
const game = new Phaser.Game(config);