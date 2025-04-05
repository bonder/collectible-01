import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene", active: true });

    // UI configuration constants
    this.TEXT_STYLE = {
      fontSize: "24px",
      fill: "#ffffff",
    };

    this.ANNOUNCEMENT_STYLE = {
      fontSize: "36px",
      fill: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 20, y: 10 },
    };

    this.ANNOUNCEMENT_DURATION = 2000; // 2 seconds
  }

  create() {
    // Initialize UI elements
    this.initHighScore();
    this.createUIElements();
    this.setupEventListeners();
  }

  /**
   * Initialize high score from localStorage
   */
  initHighScore() {
    this.highScore = parseInt(localStorage.getItem("highScore")) || 0;
  }

  /**
   * Create all UI elements
   */
  createUIElements() {
    // Create score text
    this.scoreText = this.add.text(
      20, 
      20, 
      "Score: 0", 
      this.TEXT_STYLE
    );
    
    // Create wave text
    this.waveText = this.add.text(
      20, 
      60, 
      "Wave: 1", 
      this.TEXT_STYLE
    );
    
    // Create timer text
    this.timerText = this.add.text(
      20, 
      100, 
      "Time: 0", 
      this.TEXT_STYLE
    );
    
    // Create coins text
    this.coinsText = this.add.text(
      20, 
      140, 
      "Coins: 0", 
      this.TEXT_STYLE
    );
    
    // Create high score text
    this.highScoreText = this.add.text(
      this.cameras.main.width - 20, 
      20, 
      "High Score: " + this.highScore, 
      this.TEXT_STYLE
    ).setOrigin(1, 0);
    
    // Create wave announcement text (initially hidden)
    this.waveAnnouncement = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 3,
      "",
      this.ANNOUNCEMENT_STYLE
    ).setOrigin(0.5).setVisible(false);
  }

  /**
   * Setup event listeners for game events
   */
  setupEventListeners() {
    // Get reference to the game scene
    const gameScene = this.scene.get("GameScene");
    
    // Add event listeners
    this.addEventListeners(gameScene);
  }

  /**
   * Remove all existing event listeners
   * @param {Phaser.Scene} gameScene - Reference to the game scene
   */
  removeEventListeners(gameScene) {
    gameScene.events.off("updateScore", this.updateScore, this);
    gameScene.events.off("updateWave", this.updateWave, this);
    gameScene.events.off("updateTimer", this.updateTimer, this);
    gameScene.events.off("updateCoins", this.updateCoins, this);
    gameScene.events.off("waveCompleted", this.showWaveAnnouncement, this);
    gameScene.events.off("gameOver", this.showGameOver, this);
    gameScene.events.off("waveTimeUp", this.showWaveTimeUp, this);
  }

  /**
   * Add all event listeners
   * @param {Phaser.Scene} gameScene - Reference to the game scene
   */
  addEventListeners(gameScene) {
    gameScene.events.on("updateScore", this.updateScore, this);
    gameScene.events.on("updateWave", this.updateWave, this);
    gameScene.events.on("updateTimer", this.updateTimer, this);
    gameScene.events.on("updateCoins", this.updateCoins, this);
    gameScene.events.on("waveCompleted", this.showWaveAnnouncement, this);
    gameScene.events.on("gameOver", this.showGameOver, this);
    gameScene.events.on("waveTimeUp", this.showWaveTimeUp, this);
  }

  /**
   * Update score
   * @param {number} score - The new score value
   */
  updateScore(score) {
    this.scoreText.setText("Score: " + score);
    if (score > this.highScore) {
      this.highScore = score;
      this.highScoreText.setText("High Score: " + this.highScore);
      localStorage.setItem("highScore", this.highScore);
    }
  }

  /**
   * Update wave
   * @param {number} wave - The new wave number
   */
  updateWave(wave) {
    this.waveText.setText("Wave: " + wave);
  }

  /**
   * Update timer
   * @param {number} time - The new time value
   */
  updateTimer(time) {
    this.timerText.setText("Time: " + time.toFixed(2));
  }

  /**
   * Update coins
   * @param {number} coins - The new coins value
   */
  updateCoins(coins) {
    this.coinsText.setText("Coins: " + coins);
  }

  /**
   * Show wave announcement
   * @param {number} wave - The wave number that was completed
   */
  showWaveAnnouncement(wave) {
    this.waveAnnouncement.setText("Wave " + wave + " Completed!").setVisible(true);
    this.time.delayedCall(this.ANNOUNCEMENT_DURATION, () => {
      this.waveAnnouncement.setVisible(false);
    });
  }

  /**
   * Show game over screen
   */
  showGameOver() {
    this.scene.pause("GameScene");
    this.scene.launch("GameOverScene");
  }

  /**
   * Show wave time up message
   */
  showWaveTimeUp() {
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "Time's Up! Next wave starts in 3 seconds...",
      this.TEXT_STYLE
    ).setOrigin(0.5);
  }
}
