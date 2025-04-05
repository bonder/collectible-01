import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.ENEMY_BEHAVIOR_CHANGE_TIME = 5000; // ms between behavior changes
  }

  preload() {
    // Generate all game textures using a helper method
    this.generateTexture("playerSprite", 40, 40, (graphics) => {
      graphics.fillStyle(0x00ff00, 1); // Green color
      graphics.fillRect(0, 0, 40, 40); // Draw a rectangle
    });

    this.generateTexture("coinSprite", 20, 20, (graphics) => {
      graphics.fillStyle(0xffff00, 1); // Yellow color
      graphics.fillCircle(10, 10, 10); // Draw a circle
    });
    
    // Generate different enemy sprite textures based on type
    this.generateTexture("basicEnemySprite", 30, 30, (graphics) => {
      graphics.fillStyle(0xff0000, 1); // Red color
      graphics.fillTriangle(15, 0, 30, 30, 0, 30); // Triangle pointing up
    });
  }

  create() {
    // Create the floor first (so it's behind everything else)
    this.createFloor();
    
    // Keep existing code
    this.initGameState();
    this.createGameObjects();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.updateUI();
    
    // Add border glow effect
    this.setupBorderGlow();
  }

  /**
   * Create all game objects and set up physics
   */
  createGameObjects() {
    // Create player
    this.createPlayer();

    // Initialize physics groups
    this.coins = this.physics.add.group({ allowGravity: false }); // Renamed from collectibles
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group({ allowGravity: false });

    // Create initial game entities
    this.createCoins(); // Renamed from createCollectibles
    this.createEnemies();
    this.createParticleEffects();

    // Set up collisions
    this.setupCollisions();
  }

  /**
   * Set up all collision handlers
   */
  setupCollisions() {
    this.physics.add.overlap(
      this.player,
      this.coins,  // Renamed from collectibles
      this.collectCoin,  // Renamed from collectItem
      null,
      this
    );

    // Use overlap instead of collider for player-enemy interactions
    // This allows us to use a custom process callback to check for significant overlap
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.hitEnemy,
      this.checkSignificantOverlap,
      this
    );

    this.physics.add.collider(this.enemies, this.enemies);
    
    // Add powerup collision
    this.physics.add.overlap(
      this.player,
      this.powerups,
      this.collectPowerup,
      null,
      this
    );
  }

  /**
   * Reset the wave timer and create a new timer event
   */
  resetWaveTimer() {
    this.waveTimer = this.waveTime;

    if (this.waveTimerEvent) {
      this.waveTimerEvent.remove();
    }

    this.waveTimerEvent = this.time.addEvent({
      delay: this.waveTime,
      callback: this.waveTimeUp,
      callbackScope: this,
    });
  }

  update(time, delta) {
    if (this.gameOver) {
      return;
    }

    this.updateWaveTimer(delta);
    this.handlePlayerMovement();
    this.updateComboSystem(delta);
    
    // Update dash trail if dashing
    if (this.isDashing) {
      this.playerTrail.setPosition(this.player.x, this.player.y);
    }

    // Update waypoints position to follow the player
    if (this.waypointsContainer) {
      this.waypointsContainer.setPosition(this.player.x, this.player.y);
      
      // Update waypoint yo-yo movement
      this.updateWaypointsMovement(delta);
    }

    // Update enemy movement to target waypoints
    this.updateEnemyMovement();
    
    // Update coins rotation (spinning animation)
    this.updateCoinsRotation();

    // Add subtle floor animation
    if (this.floorContainer && time % 100 < 16) {
      // Occasionally pulse a random floor decoration
      const decorations = this.floorContainer.getAll();
      if (decorations.length > 0) {
        const randomDecoration = Phaser.Utils.Array.GetRandom(decorations);
        if (randomDecoration.type === 'Graphics') {
          this.tweens.add({
            targets: randomDecoration,
            alpha: { from: randomDecoration.alpha, to: 0.5 },
            duration: 500,
            yoyo: true,
            ease: 'Sine.easeInOut'
          });
        }
      }
    }
  }
  
  /**
   * Update coins to create tabletop-style spinning animation
   */
  updateCoinsRotation() {
    // Get all coins
    const coins = this.coins.getChildren();
    
    // Update each coin's spinning animation
    coins.forEach(coin => {
      if (coin.active && coin.spinSpeed) {
        // Update the spin phase
        coin.spinPhase += coin.spinSpeed;
        
        // Use sine wave to create the narrowing effect (like a coin spinning on its edge)
        // scaleX will oscillate between 0.2 (narrow/edge view) and 1.0 (full view)
        coin.scaleX = 0.2 + 0.8 * Math.abs(Math.sin(coin.spinPhase));
      }
    });
  }

  /**
   * Create the player sprite and set up physics properties
   */
  createPlayer() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.player = this.physics.add.sprite(centerX, centerY, "playerSprite");
    this.player.setCollideWorldBounds(true);
    
    // Adjust the player's physics body to be slightly smaller than the visual sprite
    const bodyWidth = 30;
    const bodyHeight = 30;
    
    // Center the body within the sprite
    const offsetX = (40 - bodyWidth) / 2;
    const offsetY = (40 - bodyHeight) / 2;
    
    this.player.body.setSize(bodyWidth, bodyHeight, true);
    this.player.body.setOffset(offsetX, offsetY);

    // Create waypoints container
    this.createWaypoints();
  }

  /**
   * Handle coin collection
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   * @param {Phaser.GameObjects.Sprite} coin - The collected coin
   */
  collectCoin(player, coin) {
    // Disable the collected coin
    coin.disableBody(true, true);

    // Update game state
    this.score += 10;
    this.remainingCoins--;

    // Update UI
    this.events.emit("updateScore", this.score);
    this.events.emit("updateCoins", this.remainingCoins);

    // Add particle effect
    this.collectParticles.setPosition(coin.x, coin.y);
    this.collectParticles.explode(10);
    
    // Combo system
    this.combo++;
    this.comboTimer = 2000; // Reset combo timer
    
    // Enhanced combo bonus calculation - more rewarding
    let comboBonus = 0;
    if (this.combo > 1) {
      // Exponential bonus growth: 5, 15, 30, 50, 75, etc.
      comboBonus = Math.floor(Math.pow(this.combo, 1.5)) * 5;
      this.score += comboBonus;
      
      // Play combo sound with increasing pitch
      this.playComboSound(this.combo);
    }
    
    // Show combo text
    if (this.combo > 1) {
      this.showEnhancedComboText(coin.x, coin.y, this.combo, comboBonus);
    }
    
    // Chance to spawn powerup
    if (Math.random() < this.POWERUP_CHANCE) {
      this.spawnPowerup(coin.x, coin.y);
    }

    // Check if wave is complete
    if (this.remainingCoins === 0) {
      this.completeWave();
    }
  }

  /**
   * Handle wave completion and transition to next wave
   */
  completeWave() {
    // Stop the wave timer
    if (this.waveTimerEvent) {
      this.waveTimerEvent.remove();
    }

    // Calculate and award bonus points
    const bonusPoints =
      Math.floor(this.waveTimer / 1000) * this.BONUS_POINTS_PER_SECOND;
    this.score += bonusPoints;

    // Notify UI
    this.events.emit("waveCompleted", this.wave, bonusPoints);
    this.events.emit("updateScore", this.score);

    // Start the next wave after a delay
    this.time.delayedCall(
      this.WAVE_TRANSITION_DELAY,
      this.startNextWave,
      [],
      this
    );
  }

  /**
   * Start the next wave with increased difficulty
   */
  startNextWave() {
    // Increment wave counter
    this.wave++;
    this.events.emit("updateWave", this.wave);

    // Create new coins for this wave
    this.createCoins();

    // Reset the wave timer (could be adjusted for difficulty)
    this.resetWaveTimer();
    
    // Increase difficulty with each wave
    const enemyCount = this.INITIAL_ENEMY_COUNT + Math.floor(this.wave / 2);
    this.createEnemies(enemyCount);
    
    // Increase enemy speed with each wave
    this.ENEMY_SPEED_MIN += 5;
    this.ENEMY_SPEED_MAX += 5;
  }

  /**
   * Show time's up announcement with improved visibility
   */
  showWaveTimeUp() {
    try {
      // Create the wave announcement text if it doesn't exist yet
      if (!this.waveAnnouncement) {
        this.waveAnnouncement = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 3,
          "TIME'S UP!",
          {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ff5555',
            align: 'center',
            stroke: '#ffffff',
            strokeThickness: 2
          }
        ).setOrigin(0.5).setDepth(101).setVisible(false);
      }
      
      // Create a semi-transparent background for better text visibility
      if (!this.timeUpBackground) {
        this.timeUpBackground = this.add.rectangle(
          this.cameras.main.width / 2,
          this.cameras.main.height / 3,
          300,
          100,
          0x000000,
          0.7
        ).setOrigin(0.5).setDepth(100);
      } else {
        this.timeUpBackground.setVisible(true);
      }
      
      // Make sure all elements are visible
      this.waveAnnouncement.setVisible(true);
      
      // Flash the screen red briefly to indicate time's up
      this.cameras.main.flash(500, 255, 0, 0, 0.3);
      
      // Shake the camera slightly
      this.cameras.main.shake(300, 0.005);
      
      // Add a scale animation
      this.tweens.add({
        targets: [this.waveAnnouncement, this.timeUpSubtext],
        scale: { from: 0.8, to: 1 },
        duration: 300,
        ease: 'Back.easeOut'
      });
    } catch (e) {
      console.error("Error in showWaveTimeUp:", e);
    }
  }

  /**
   * Create an interesting floor with tiles, patterns and ambient effects
   */
  createFloor() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const tileSize = 64;
    
    // Create a container for all floor elements
    this.floorContainer = this.add.container(0, 0);
    
    // Create a MUCH darker base background for better contrast with enemies
    const background = this.add.rectangle(
      width/2, 
      height/2, 
      width, 
      height, 
      0x000011  // Almost black with slight blue tint
    );
    this.floorContainer.add(background);
    
    // Create the base tile pattern with very dark colors
    for (let x = 0; x < width; x += tileSize) {
      for (let y = 0; y < height; y += tileSize) {
        const tile = this.add.image(x + tileSize/2, y + tileSize/2, 'floorTile');
        
        // Add slight random rotation for more organic feel
        tile.setRotation(Math.random() * 0.1 - 0.05);
        
        // Use very dark tints for better enemy contrast
        const tintVariation = Phaser.Math.Between(-5, 5);
        const r = Phaser.Math.Clamp(0x11 + tintVariation, 0, 255);
        const g = Phaser.Math.Clamp(0x11 + tintVariation, 0, 255);
        const b = Phaser.Math.Clamp(0x22 + tintVariation, 0, 255);
        tile.setTint(Phaser.Display.Color.GetColor(r, g, b));
        
        // Reduce opacity to make the floor less prominent
        tile.setAlpha(0.5);
        
        this.floorContainer.add(tile);
      }
    }
  }

  /**
   * Setup border glow effect using Phaser's filter system with proper GameObjects
   */
  setupBorderGlow() {
    // Create a border container
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // First create a texture for our borders
    this.createBorderTexture('borderTexture', width, height);
    
    // Create the main border using a sprite
    const border = this.add.sprite(width/2, height/2, 'borderTexture');
    border.setDepth(1000);
    border.enableFilters(); // Enable filters for this GameObject
    
    // Add stronger glow effect to the border
    const glowFX = border.filters.internal.addGlow(0x00ffff, 15, 4, false); // Increased strength and quality
  }

  /**
   * Handle player movement based on cursor keys
   */
  handlePlayerMovement() {
    // Reset velocity at the start of each update
    if (!this.isDashing) {
      this.player.body.setVelocity(0);
    }

    // Handle dash ability
    if (this.cursors.space.isDown && this.canDash && !this.isDashing) {
      this.startDash();
    }

    // Regular movement (only if not dashing)
    if (!this.isDashing) {
      // Create a velocity vector
      let velocityX = 0;
      let velocityY = 0;

      // Apply velocity based on input
      if (this.cursors.left.isDown) {
        velocityX = -this.PLAYER_SPEED;
      } else if (this.cursors.right.isDown) {
        velocityX = this.PLAYER_SPEED;
      }

      if (this.cursors.up.isDown) {
        velocityY = -this.PLAYER_SPEED;
      } else if (this.cursors.down.isDown) {
        velocityY = this.PLAYER_SPEED;
      }

      // Normalize diagonal movement
      if (velocityX !== 0 && velocityY !== 0) {
        // Create a vector and normalize it
        const vector = new Phaser.Math.Vector2(velocityX, velocityY).normalize();
        
        // Apply the normalized vector multiplied by the speed
        velocityX = vector.x * this.PLAYER_SPEED;
        velocityY = vector.y * this.PLAYER_SPEED;
      }

      // Apply the calculated velocity
      this.player.body.setVelocity(velocityX, velocityY);
    }
  }

  startDash() {
    this.isDashing = true;
    this.canDash = false;
    
    // Set dash velocity based on current facing direction
    let dashVelocityX = 0;
    let dashVelocityY = 0;
    
    if (this.cursors.left.isDown) dashVelocityX = -this.PLAYER_DASH_SPEED;
    else if (this.cursors.right.isDown) dashVelocityX = this.PLAYER_DASH_SPEED;
    
    if (this.cursors.up.isDown) dashVelocityY = -this.PLAYER_DASH_SPEED;
    else if (this.cursors.down.isDown) dashVelocityY = this.PLAYER_DASH_SPEED;
    
    // If no direction pressed, dash forward (up)
    if (dashVelocityX === 0 && dashVelocityY === 0) {
      dashVelocityY = -this.PLAYER_DASH_SPEED;
    } else if (dashVelocityX !== 0 && dashVelocityY !== 0) {
      // Normalize diagonal dash
      const vector = new Phaser.Math.Vector2(dashVelocityX, dashVelocityY).normalize();
      dashVelocityX = vector.x * this.PLAYER_DASH_SPEED;
      dashVelocityY = vector.y * this.PLAYER_DASH_SPEED;
    }
    
    // Apply dash velocity
    this.player.body.setVelocity(dashVelocityX, dashVelocityY);
    
    // Visual effects
    this.player.setTint(0x00ffff);
    
    // Start particle emission
    this.playerTrail.setPosition(this.player.x, this.player.y);
    this.playerTrail.start();
    
    // End dash after duration
    this.time.delayedCall(this.DASH_DURATION, this.endDash, [], this);
    
    // Reset dash cooldown
    this.time.delayedCall(this.DASH_COOLDOWN, () => {
      this.canDash = true;
      this.events.emit("dashReady");
    }, [], this);
    
    // Update UI to show dash on cooldown
    this.events.emit("dashReady", false);
  }
}
