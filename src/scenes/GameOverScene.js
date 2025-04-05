import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data) {
    this.score = data.score || 0;
    this.wave = data.wave || 1;
    
    // Get the high score from localStorage or from passed data
    const storedHighScore = parseInt(localStorage.getItem("highScore")) || 0;
    this.highScore = data.highScore || storedHighScore;
    
    // Update localStorage if we have a new high score
    if (this.score > storedHighScore) {
      localStorage.setItem("highScore", this.score);
    }
  }

  create() {
    // Create background
    this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000
    );
    
    // Create title
    this.add.text(
      this.cameras.main.width / 2,
      100,
      'GAME OVER',
      {
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#ff0000',
        stroke: '#ffffff',
        strokeThickness: 6,
        align: 'center'
      }
    ).setOrigin(0.5);
    
    // Create score text
    this.add.text(
      this.cameras.main.width / 2,
      200,
      `Final Score: ${this.score}`,
      {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
    
    // Create wave text
    this.add.text(
      this.cameras.main.width / 2,
      250,
      `Wave Reached: ${this.wave}`,
      {
        fontSize: '28px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
    
    // Create high score text with animation if it's a new high score
    const highScoreText = this.add.text(
      this.cameras.main.width / 2,
      320,
      `High Score: ${this.highScore}`,
      {
        fontSize: '36px',
        fontStyle: 'bold',
        color: this.score >= this.highScore ? '#ffff00' : '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
    
    // Add pulsing animation if it's a new high score
    if (this.score >= this.highScore && this.score > 0) {
      this.add.text(
        this.cameras.main.width / 2,
        370,
        'NEW HIGH SCORE!',
        {
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#ffff00',
          align: 'center'
        }
      ).setOrigin(0.5);
      
      this.tweens.add({
        targets: highScoreText,
        scale: { from: 1, to: 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Create restart button
    const restartButton = this.add.rectangle(
      this.cameras.main.width / 2,
      450,
      200,
      60,
      0x4444ff,
      1
    ).setInteractive();
    
    // Add text to button
    const restartText = this.add.text(
      this.cameras.main.width / 2,
      450,
      'RESTART',
      {
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
    
    // Add hover effect
    restartButton.on('pointerover', () => {
      restartButton.fillColor = 0x6666ff;
      restartText.setScale(1.1);
    });
    
    restartButton.on('pointerout', () => {
      restartButton.fillColor = 0x4444ff;
      restartText.setScale(1);
    });
    
    // Add click handler
    restartButton.on('pointerdown', () => {
      this.restartGame();
    });
    
    // Add keyboard handler for 'R' key
    this.input.keyboard.on('keydown-R', () => {
      this.restartGame();
    });
    
    // Add instruction text
    this.add.text(
      this.cameras.main.width / 2,
      520,
      'Press R to restart',
      {
        fontSize: '20px',
        color: '#aaaaaa',
        align: 'center'
      }
    ).setOrigin(0.5);
  }
  
  restartGame() {
    // Add button press effect
    this.cameras.main.flash(300, 0, 0, 0);
    
    // Restart the game
    this.time.delayedCall(300, () => {
      this.scene.start('GameScene');
    });
  }
}
