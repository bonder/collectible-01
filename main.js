class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" })

    // Enhanced game configuration constants
    this.PLAYER_SPEED = 200
    this.PLAYER_DASH_SPEED = 400
    this.DASH_DURATION = 200
    this.DASH_COOLDOWN = 1000
    this.INITIAL_WAVE_TIME = 20000
    this.COLLECTIBLES_PER_WAVE = 10
    this.INITIAL_ENEMY_COUNT = 10
    this.ENEMY_SPEED_MIN = 80
    this.ENEMY_SPEED_MAX = 120
    this.BONUS_POINTS_PER_SECOND = 10
    this.SAFE_SPAWN_DISTANCE = 200
    this.GAME_RESTART_DELAY = 3000
    this.WAVE_TRANSITION_DELAY = 2500
    this.POWERUP_CHANCE = 0.2
  }

  preload() {
    // Generate all game textures using a helper method
    this.generateTexture("playerSprite", 40, 40, (graphics) => {
      graphics.fillStyle(0x00ff00, 1) // Green color
      graphics.fillRect(0, 0, 40, 40) // Draw a rectangle
    })

    this.generateTexture("collectibleSprite", 20, 20, (graphics) => {
      graphics.fillStyle(0xffff00, 1) // Yellow color
      graphics.fillCircle(10, 10, 10) // Draw a circle
    })

    this.generateTexture("enemySprite", 30, 30, (graphics) => {
      graphics.fillStyle(0xff0000, 1) // Red color
      graphics.fillTriangle(15, 0, 0, 30, 30, 30) // Draw a triangle
    })

    // Generate waypoint texture - small blue rectangle
    this.generateTexture("waypointSprite", 10, 10, (graphics) => {
      graphics.fillStyle(0x0088ff, 1) // Blue color
      graphics.fillRect(0, 0, 10, 10) // Draw a small rectangle
    })
  }

  /**
   * Helper method to generate textures and clean up graphics objects
   * @param {string} key - Texture key
   * @param {number} width - Texture width
   * @param {number} height - Texture height
   * @param {Function} drawFunction - Function to draw the graphics
   */
  generateTexture(key, width, height, drawFunction) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false })
    drawFunction(graphics)
    graphics.generateTexture(key, width, height)
    graphics.destroy()
  }

  create() {
    // Initialize game state
    this.initGameState()

    // Create game objects and set up physics
    this.createGameObjects()

    // Set up input handling
    this.cursors = this.input.keyboard.createCursorKeys()

    // Update UI with initial values
    this.updateUI()
  }

  /**
   * Initialize game state variables
   */
  initGameState() {
    this.score = 0
    this.wave = 1
    this.gameOver = false
    this.waveTime = this.INITIAL_WAVE_TIME
    this.remainingCollectibles = 0
    this.waveTimer = this.waveTime
    
    // New game state variables
    this.canDash = true
    this.isDashing = false
    this.combo = 0
    this.comboTimer = 0
    this.playerShield = false
    
    this.resetWaveTimer()
  }

  /**
   * Create all game objects and set up physics
   */
  createGameObjects() {
    // Create player
    this.createPlayer()

    // Initialize physics groups
    this.collectibles = this.physics.add.group({ allowGravity: false })
    this.enemies = this.physics.add.group()
    this.powerups = this.physics.add.group({ allowGravity: false })

    // Create initial game entities
    this.createCollectibles()
    this.createEnemies()
    this.createParticleEffects()

    // Set up collisions
    this.setupCollisions()
  }

  createParticleEffects() {
    // Collection effect
    this.collectParticles = this.add.particles(0, 0, 'particleSprite', {
      lifespan: 800,
      speed: { min: 50, max: 100 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false
    })
    
    // Explosion effect
    this.explosionParticles = this.add.particles(0, 0, 'explosionSprite', {
      lifespan: 1000,
      speed: { min: 50, max: 200 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'SCREEN',
      emitting: false
    })
  }

  /**
   * Set up all collision handlers
   */
  setupCollisions() {
    this.physics.add.overlap(
      this.player,
      this.collectibles,
      this.collectItem,
      null,
      this
    )

    // Use overlap instead of collider for player-enemy interactions
    // This allows us to use a custom process callback to check for significant overlap
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.hitEnemy,
      this.checkSignificantOverlap,
      this
    )

    this.physics.add.collider(this.enemies, this.enemies)
    
    // Add powerup collision
    this.physics.add.overlap(
      this.player,
      this.powerups,
      this.collectPowerup,
      null,
      this
    )
  }
  
  /**
   * Check if there is significant overlap between player and enemy
   * This ensures collisions only trigger when there's substantial overlap
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   * @param {Phaser.GameObjects.Sprite} enemy - The enemy sprite
   * @returns {boolean} - Whether the overlap is significant enough to trigger a collision
   */
  checkSignificantOverlap(player, enemy) {
    // Get the bounds of both objects
    const playerBounds = player.getBounds()
    const enemyBounds = enemy.getBounds()
    
    // Calculate the overlap area
    const overlapX = Math.max(0, Math.min(playerBounds.right, enemyBounds.right) - 
                             Math.max(playerBounds.left, enemyBounds.left))
    const overlapY = Math.max(0, Math.min(playerBounds.bottom, enemyBounds.bottom) - 
                             Math.max(playerBounds.top, enemyBounds.top))
    const overlapArea = overlapX * overlapY
    
    // Calculate the minimum area of both objects
    const playerArea = playerBounds.width * playerBounds.height
    const enemyArea = enemyBounds.width * enemyBounds.height
    const minArea = Math.min(playerArea, enemyArea)
    
    // Calculate the overlap percentage relative to the smaller object
    const overlapPercentage = overlapArea / minArea
    
    // Require at least 25% overlap to trigger a collision
    // Adjust this threshold as needed for the desired gameplay feel
    return overlapPercentage > 0.25
  }

  /**
   * Update UI with current game state
   */
  updateUI() {
    this.events.emit("updateScore", this.score)
    this.events.emit("updateWave", this.wave)
    this.events.emit("updateTimer", this.waveTimer)
    this.events.emit("updateCollectibles", this.remainingCollectibles)
  }

  /**
   * Reset the wave timer and create a new timer event
   */
  resetWaveTimer() {
    this.waveTimer = this.waveTime

    if (this.waveTimerEvent) {
      this.waveTimerEvent.remove()
    }

    this.waveTimerEvent = this.time.addEvent({
      delay: this.waveTime,
      callback: this.waveTimeUp,
      callbackScope: this,
    })
  }

  update(time, delta) {
    if (this.gameOver) {
      return
    }

    this.updateWaveTimer(delta)
    this.handlePlayerMovement()
    this.updateComboSystem(delta)
    
    // Update dash trail if dashing
    if (this.isDashing) {
      this.playerTrail.setPosition(this.player.x, this.player.y)
    }

    // Update waypoints position to follow the player
    if (this.waypointsContainer) {
      this.waypointsContainer.setPosition(this.player.x, this.player.y)
      
      // Update waypoint yo-yo movement
      this.updateWaypointsMovement(delta)
    }

    // Update enemy movement to target waypoints
    this.updateEnemyMovement()
    
    // Update collectibles rotation (spinning animation)
    this.updateCollectiblesRotation()
  }
  
  /**
   * Update collectibles to create tabletop-style spinning animation
   */
  updateCollectiblesRotation() {
    // Get all collectibles
    const collectibles = this.collectibles.getChildren()
    
    // Update each collectible's spinning animation
    collectibles.forEach(collectible => {
      if (collectible.active && collectible.spinSpeed) {
        // Update the spin phase
        collectible.spinPhase += collectible.spinSpeed
        
        // Use sine wave to create the narrowing effect (like a coin spinning on its edge)
        // scaleX will oscillate between 0.2 (narrow/edge view) and 1.0 (full view)
        collectible.scaleX = 0.2 + 0.8 * Math.abs(Math.sin(collectible.spinPhase))
      }
    })
  }
  
  /**
   * Update waypoints yo-yo movement
   * @param {number} delta - Time elapsed since last update
   */
  updateWaypointsMovement(delta) {
    // Get all waypoints
    const waypoints = [
      this.waypointTop,
      this.waypointBottom,
      this.waypointLeft,
      this.waypointRight
    ]
    
    // Update each waypoint's position
    waypoints.forEach(waypoint => {
      // Skip if waypoint doesn't have movement properties
      if (!waypoint.hasOwnProperty('baseOffset')) return
      
      // Update the current offset based on direction and speed
      waypoint.currentOffset += waypoint.direction * waypoint.speed * (delta / 16) // Normalize by expected frame time
      
      // Check if we need to reverse direction
      if (waypoint.currentOffset >= waypoint.maxOffset) {
        waypoint.currentOffset = waypoint.maxOffset
        waypoint.direction = -1 // Start moving toward player
      } else if (waypoint.currentOffset <= waypoint.baseOffset) {
        waypoint.currentOffset = waypoint.baseOffset
        waypoint.direction = 1 // Start moving away from player
      }
      
      // Calculate new position based on original position and current offset
      if (waypoint === this.waypointTop) {
        waypoint.y = -waypoint.currentOffset
      } else if (waypoint === this.waypointBottom) {
        waypoint.y = waypoint.currentOffset
      } else if (waypoint === this.waypointLeft) {
        waypoint.x = -waypoint.currentOffset
      } else if (waypoint === this.waypointRight) {
        waypoint.x = waypoint.currentOffset
      }
    })
  }

  /**
   * Update enemy movement to target their assigned waypoints
   */
  updateEnemyMovement() {
    const enemies = this.enemies.getChildren()
    const enemySpeed = 100

    enemies.forEach((enemy) => {
      if (!enemy.targetWaypoint) return

      // Get the actual waypoint object based on the target name
      let targetWaypoint
      switch (enemy.targetWaypoint) {
        case "top":
          targetWaypoint = this.waypointTop
          break
        case "bottom":
          targetWaypoint = this.waypointBottom
          break
        case "left":
          targetWaypoint = this.waypointLeft
          break
        case "right":
          targetWaypoint = this.waypointRight
          break
      }
      
      if (!targetWaypoint) return
      
      // Calculate the global position of the waypoint
      // (waypoint position is relative to the container, which follows the player)
      const targetX = this.player.x + targetWaypoint.x
      const targetY = this.player.y + targetWaypoint.y

      // Calculate direction to the waypoint
      const angle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        targetX,
        targetY
      )

      // Set velocity based on the angle
      enemy.body.setVelocity(
        Math.cos(angle) * enemySpeed,
        Math.sin(angle) * enemySpeed
      )

      // Rotate enemy to face the direction of movement
      enemy.rotation = angle + Math.PI / 2 // Add 90 degrees since the sprite points up
      
      // Check if enemy has reached the waypoint
      const distance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        targetX,
        targetY
      )
      
      // If enemy is close enough to the waypoint, change target to one of the other waypoints
      if (distance < 15) { // Adjust this threshold as needed
        this.changeEnemyWaypoint(enemy)
      }
    })
  }
  
  /**
   * Change enemy's target waypoint to one of the other three waypoints
   * @param {Phaser.GameObjects.Sprite} enemy - The enemy sprite
   */
  changeEnemyWaypoint(enemy) {
    // Get all possible waypoints
    const allWaypoints = ["top", "bottom", "left", "right"]
    
    // Filter out the current waypoint
    const otherWaypoints = allWaypoints.filter(wp => wp !== enemy.targetWaypoint)
    
    // Randomly select one of the other waypoints
    enemy.targetWaypoint = Phaser.Utils.Array.GetRandom(otherWaypoints)
  }

  /**
   * Update the wave timer and check for time-up condition
   * @param {number} delta - Time elapsed since last update
   */
  updateWaveTimer(delta) {
    if (this.waveTimer <= 0) {
      return
    }

    this.waveTimer -= delta

    if (this.waveTimer < 0) {
      this.waveTimer = 0
      this.waveTimeUp()
    }

    this.events.emit("updateTimer", this.waveTimer)
  }

  /**
   * Handle player movement based on cursor keys
   */
  handlePlayerMovement() {
    // Reset velocity at the start of each update
    if (!this.isDashing) {
      this.player.body.setVelocity(0)
    }

    // Handle dash ability
    if (this.cursors.space.isDown && this.canDash && !this.isDashing) {
      this.startDash()
    }

    // Regular movement (only if not dashing)
    if (!this.isDashing) {
      // Apply velocity based on input
      if (this.cursors.left.isDown) {
        this.player.body.setVelocityX(-this.PLAYER_SPEED)
      } else if (this.cursors.right.isDown) {
        this.player.body.setVelocityX(this.PLAYER_SPEED)
      }

      if (this.cursors.up.isDown) {
        this.player.body.setVelocityY(-this.PLAYER_SPEED)
      } else if (this.cursors.down.isDown) {
        this.player.body.setVelocityY(this.PLAYER_SPEED)
      }
    }
  }

  startDash() {
    this.isDashing = true
    this.canDash = false
    
    // Set dash velocity based on current facing direction
    let dashVelocity = new Phaser.Math.Vector2(0, 0)
    
    if (this.cursors.left.isDown) dashVelocity.x = -this.PLAYER_DASH_SPEED
    else if (this.cursors.right.isDown) dashVelocity.x = this.PLAYER_DASH_SPEED
    
    if (this.cursors.up.isDown) dashVelocity.y = -this.PLAYER_DASH_SPEED
    else if (this.cursors.down.isDown) dashVelocity.y = this.PLAYER_DASH_SPEED
    
    // If no direction pressed, dash forward
    if (dashVelocity.x === 0 && dashVelocity.y === 0) {
      dashVelocity.y = -this.PLAYER_DASH_SPEED
    }
    
    // Apply dash velocity
    this.player.body.setVelocity(dashVelocity.x, dashVelocity.y)
    
    // Visual effects
    this.player.setTint(0x00ffff)
    
    // Start particle emission
    this.playerTrail.setPosition(this.player.x, this.player.y)
    this.playerTrail.start()
    
    // End dash after duration
    this.time.delayedCall(this.DASH_DURATION, this.endDash, [], this)
    
    // Reset dash cooldown
    this.time.delayedCall(this.DASH_COOLDOWN, () => {
      this.canDash = true
      this.events.emit("dashReady")
    }, [], this)
    
    // Update UI to show dash on cooldown
    this.events.emit("dashReady", false)
  }

  endDash() {
    this.isDashing = false
    this.player.clearTint()
    this.playerTrail.stop()
  }

  /**
   * Create the player sprite and set up physics properties
   */
  createPlayer() {
    const centerX = this.cameras.main.width / 2
    const centerY = this.cameras.main.height / 2

    this.player = this.physics.add.sprite(centerX, centerY, "playerSprite")
    this.player.setCollideWorldBounds(true)
    
    // Adjust the player's physics body to be slightly smaller than the visual sprite
    const bodyWidth = 30
    const bodyHeight = 30
    
    // Center the body within the sprite
    const offsetX = (40 - bodyWidth) / 2
    const offsetY = (40 - bodyHeight) / 2
    
    this.player.body.setSize(bodyWidth, bodyHeight, true)
    this.player.body.setOffset(offsetX, offsetY)

    // Create waypoints container
    this.createWaypoints()
    
    // Create dash effect particle
    this.generateTexture("dashParticle", 20, 20, (graphics) => {
      graphics.fillStyle(0x00ffff, 1) // Cyan color
      graphics.fillCircle(10, 10, 10) // Draw a circle
    })
    
    // Add dash trail effect
    this.playerTrail = this.add.particles(0, 0, 'dashParticle', {
      lifespan: 300,
      speed: { min: 10, max: 30 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitting: false
    })
  }

  /**
   * Create waypoints around the player
   */
  createWaypoints() {
    // Create a container for the waypoints
    this.waypointsContainer = this.add.container(this.player.x, this.player.y)

    // Define waypoint positions relative to the player
    const baseOffset = 50 // Base distance from player center
    
    // Create waypoints with yo-yo movement properties
    this.waypointTop = this.add.sprite(0, -baseOffset, "waypointSprite")
    this.waypointBottom = this.add.sprite(0, baseOffset, "waypointSprite")
    this.waypointLeft = this.add.sprite(-baseOffset, 0, "waypointSprite")
    this.waypointRight = this.add.sprite(baseOffset, 0, "waypointSprite")
    
    // Add yo-yo movement properties to each waypoint
    this.setupWaypointMovement(this.waypointTop, baseOffset, 0.5) // Slower speed
    this.setupWaypointMovement(this.waypointBottom, baseOffset, 0.8) // Medium speed
    this.setupWaypointMovement(this.waypointLeft, baseOffset, 1.2) // Faster speed
    this.setupWaypointMovement(this.waypointRight, baseOffset, 1.0) // Default speed

    // Add all waypoints to the container
    this.waypointsContainer.add([
      this.waypointTop,
      this.waypointBottom,
      this.waypointLeft,
      this.waypointRight,
    ])
    
    // Make waypoints invisible (but still functional for enemy targeting)
    this.waypointTop.setVisible(false)
    this.waypointBottom.setVisible(false)
    this.waypointLeft.setVisible(false)
    this.waypointRight.setVisible(false)
  }
  
  /**
   * Setup yo-yo movement properties for a waypoint
   * @param {Phaser.GameObjects.Sprite} waypoint - The waypoint sprite
   * @param {number} baseOffset - The base distance from player
   * @param {number} speed - The movement speed multiplier
   */
  setupWaypointMovement(waypoint, baseOffset, speed) {
    // Add custom properties to the waypoint
    waypoint.baseOffset = baseOffset // Minimum distance from player
    waypoint.currentOffset = baseOffset // Current distance from player
    waypoint.maxOffset = baseOffset * 2.5 // Maximum distance (2.5x the base)
    waypoint.direction = 1 // 1 = moving away, -1 = moving toward
    waypoint.speed = speed // Movement speed (pixels per frame)
    waypoint.originalX = waypoint.x // Store original x position
    waypoint.originalY = waypoint.y // Store original y position
  }

  /**
   * Create collectible items at random positions
   */
  createCollectibles() {
    // Clear any existing collectibles
    this.collectibles.clear(true, true)

    // Set the number of collectibles for this wave
    this.remainingCollectibles = this.COLLECTIBLES_PER_WAVE

    const gameWidth = this.cameras.main.width
    const gameHeight = this.cameras.main.height
    const margin = 50 // Margin from edges

    for (let i = 0; i < this.remainingCollectibles; i++) {
      // Get a safe random position away from the player
      const position = this.getRandomPosition(
        margin,
        gameWidth - margin,
        margin,
        gameHeight - margin
      )

      // Create the collectible at the random position
      const collectible = this.collectibles.create(
        position.x,
        position.y,
        "collectibleSprite"
      )

      // Set physics properties
      collectible.setImmovable(true)
      
      // Add properties for tabletop-style spinning animation
      collectible.spinPhase = Math.random() * Math.PI * 2 // Random starting phase
      collectible.spinSpeed = 0.05 + Math.random() * 0.03 // Slightly randomized spin speed
    }

    // Update UI
    this.events.emit("updateCollectibles", this.remainingCollectibles)
  }

  /**
   * Get a random position that's a safe distance from the player
   * @param {number} minX - Minimum X coordinate
   * @param {number} maxX - Maximum X coordinate
   * @param {number} minY - Minimum Y coordinate
   * @param {number} maxY - Maximum Y coordinate
   * @returns {Object} - Object with x and y coordinates
   */
  getRandomPosition(minX, maxX, minY, maxY) {
    let x, y
    let attempts = 0
    const maxAttempts = 10 // Prevent infinite loops

    do {
      x = Phaser.Math.Between(minX, maxX)
      y = Phaser.Math.Between(minY, maxY)
      attempts++

      // If we've tried too many times, just use the last position
      if (attempts >= maxAttempts) {
        break
      }
    } while (
      this.player &&
      Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <
        this.SAFE_SPAWN_DISTANCE
    )

    return { x, y }
  }

  /**
   * Create enemy sprites that target random waypoints
   */
  createEnemies() {
    // Only create enemies if none exist
    if (this.enemies.getChildren().length === 0) {
      const gameWidth = this.cameras.main.width
      const gameHeight = this.cameras.main.height
      const margin = 50 // Margin from edges

      // Define available waypoints for targeting
      const waypoints = ["top", "bottom", "left", "right"]

      for (let i = 0; i < this.INITIAL_ENEMY_COUNT; i++) {
        // Get random position
        const position = this.getRandomPosition(
          margin,
          gameWidth - margin,
          margin,
          gameHeight - margin
        )

        // Create enemy at random position
        const enemy = this.enemies.create(position.x, position.y, "enemySprite")

        // Set physics properties
        enemy.setCollideWorldBounds(true)
        enemy.setBounce(1)
        
        // Adjust the physics body to better match the triangular shape
        // Reduce the body size to create a smaller collision area
        const bodyWidth = 20  // Smaller than the sprite width (30)
        const bodyHeight = 20 // Smaller than the sprite height (30)
        
        // Center the body within the sprite
        const offsetX = (30 - bodyWidth) / 2
        const offsetY = (30 - bodyHeight) / 2 + 5 // Move it down a bit to match the triangle's center mass
        
        enemy.body.setSize(bodyWidth, bodyHeight, true)
        enemy.body.setOffset(offsetX, offsetY)

        // Assign a random waypoint target to this enemy
        enemy.targetWaypoint = Phaser.Utils.Array.GetRandom(waypoints)

        // Set initial velocity (will be updated in updateEnemyMovement)
        enemy.body.setVelocity(0, 0)
      }
    }
  }

  /**
   * Handle collectible item collection
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   * @param {Phaser.GameObjects.Sprite} collectible - The collected item
   */
  collectItem(player, collectible) {
    // Disable the collected item
    collectible.disableBody(true, true)

    // Update game state
    this.score += 10
    this.remainingCollectibles--

    // Update UI
    this.events.emit("updateScore", this.score)
    this.events.emit("updateCollectibles", this.remainingCollectibles)

    // Add particle effect
    this.collectParticles.setPosition(collectible.x, collectible.y)
    this.collectParticles.explode(10)
    
    // Combo system
    this.combo++
    this.comboTimer = 2000 // Reset combo timer
    
    // Bonus points for combo
    let comboBonus = Math.min(this.combo - 1, 5) * 5
    this.score += 10 + comboBonus
    
    // Show combo text
    if (this.combo > 1) {
      this.showComboText(collectible.x, collectible.y, this.combo)
    }
    
    // Chance to spawn powerup
    if (Math.random() < this.POWERUP_CHANCE) {
      this.spawnPowerup(collectible.x, collectible.y)
    }

    // Check if wave is complete
    if (this.remainingCollectibles === 0) {
      this.completeWave()
    }
  }

  updateComboSystem(delta) {
    if (this.combo > 1) {
      this.comboTimer -= delta
      if (this.comboTimer <= 0) {
        this.combo = 0
      }
    }
  }

  showComboText(x, y, combo) {
    const comboText = this.add.text(x, y - 20, `${combo}x COMBO!`, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffff00'
    }).setOrigin(0.5)
    
    this.tweens.add({
      targets: comboText,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => comboText.destroy()
    })
  }

  spawnPowerup(x, y) {
    // Choose random powerup type
    const powerupTypes = ['shield', 'speed', 'points']
    const type = Phaser.Utils.Array.GetRandom(powerupTypes)
    
    const powerup = this.powerups.create(x, y, `powerup${type}`)
    powerup.type = type
    
    // Add pulsing effect
    this.tweens.add({
      targets: powerup,
      scale: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    })
    
    // Auto-destroy after 5 seconds
    this.time.delayedCall(5000, () => {
      if (powerup.active) {
        powerup.destroy()
      }
    })
  }

  collectPowerup(player, powerup) {
    // Apply powerup effect based on type
    switch(powerup.type) {
      case 'shield':
        this.activateShield()
        break
      case 'speed':
        this.activateSpeedBoost()
        break
      case 'points':
        this.score += 50
        this.events.emit("updateScore", this.score)
        break
    }
    
    // Visual effect
    this.collectParticles.setPosition(powerup.x, powerup.y)
    this.collectParticles.explode(15)
    
    // Remove powerup
    powerup.destroy()
  }

  activateShield() {
    this.playerShield = true
    
    // Visual effect
    const shield = this.add.circle(0, 0, 30, 0x00ffff, 0.3)
    shield.setStrokeStyle(2, 0x00ffff)
    
    this.shieldContainer = this.add.container(this.player.x, this.player.y, [shield])
    
    // Shield lasts for 10 seconds
    this.time.delayedCall(10000, () => {
      this.playerShield = false
      this.shieldContainer.destroy()
    })
  }

  activateSpeedBoost() {
    const originalSpeed = this.PLAYER_SPEED
    this.PLAYER_SPEED = this.PLAYER_SPEED * 1.5
    
    // Visual effect
    this.player.setTint(0xffff00)
    
    // Speed boost lasts for 5 seconds
    this.time.delayedCall(5000, () => {
      this.PLAYER_SPEED = originalSpeed
      this.player.clearTint()
    })
  }

  /**
   * Handle wave completion and transition to next wave
   */
  completeWave() {
    // Stop the wave timer
    if (this.waveTimerEvent) {
      this.waveTimerEvent.remove()
    }

    // Calculate and award bonus points
    const bonusPoints =
      Math.floor(this.waveTimer / 1000) * this.BONUS_POINTS_PER_SECOND
    this.score += bonusPoints

    // Notify UI
    this.events.emit("waveCompleted", this.wave, bonusPoints)
    this.events.emit("updateScore", this.score)

    // Start the next wave after a delay
    this.time.delayedCall(
      this.WAVE_TRANSITION_DELAY,
      this.startNextWave,
      [],
      this
    )
  }

  /**
   * Start the next wave with increased difficulty
   */
  startNextWave() {
    // Increment wave counter
    this.wave++
    this.events.emit("updateWave", this.wave)

    // Create new collectibles for this wave
    this.createCollectibles()

    // Reset the wave timer (could be adjusted for difficulty)
    this.resetWaveTimer()
    
    // Increase difficulty with each wave
    const enemyCount = this.INITIAL_ENEMY_COUNT + Math.floor(this.wave / 2)
    this.createEnemies(enemyCount)
    
    // Increase enemy speed with each wave
    this.ENEMY_SPEED_MIN += 5
    this.ENEMY_SPEED_MAX += 5
  }

  /**
   * Handle wave timer expiration
   */
  waveTimeUp() {
    if (this.gameOver) {
      return
    }

    // Notify UI that time is up
    this.events.emit("waveTimeUp")

    // Player can still collect remaining items
    // Game continues until all items are collected or player hits enemy
  }

  /**
   * Handle player collision with enemy
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   * @param {Phaser.GameObjects.Sprite} enemy - The enemy sprite
   */
  hitEnemy(player, enemy) {
    // Check if player has shield
    if (this.playerShield) {
      // Destroy enemy instead
      enemy.destroy()
      
      // Visual effect
      this.explosionParticles.setPosition(enemy.x, enemy.y)
      this.explosionParticles.explode(20)
      
      // Remove shield
      this.playerShield = false
      this.shieldContainer.destroy()
      return
    }
    
    // Pause game physics
    this.physics.pause()

    // Visual indication of game over
    this.player.setTint(0xff0000)
    if (this.player.anims.isPlaying) {
      this.player.anims.stop()
    }

    // Update game state
    this.gameOver = true

    // Clean up timer
    if (this.waveTimerEvent) {
      this.waveTimerEvent.remove()
    }

    // Notify UI of game over
    this.events.emit("gameOver", this.score, this.wave)

    // Restart the game after a delay
    this.time.delayedCall(this.GAME_RESTART_DELAY, () => {
      this.scene.restart()
    })
  }
}

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene", active: true })

    // UI configuration constants
    this.TEXT_STYLE = {
      fontSize: "24px",
      fill: "#ffffff",
    }

    this.ANNOUNCEMENT_STYLE = {
      fontSize: "36px",
      fill: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 20, y: 10 },
    }

    this.ANNOUNCEMENT_DURATION = 2000 // 2 seconds
  }

  create() {
    // Initialize UI elements
    this.initHighScore()
    this.createUIElements()
    this.setupEventListeners()
  }

  /**
   * Initialize high score from localStorage
   */
  initHighScore() {
    this.highScore = parseInt(localStorage.getItem("highScore")) || 0
  }

  /**
   * Create all UI text elements
   */
  createUIElements() {
    // Get game dimensions
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const padding = 10;
    
    // Create a semi-transparent panel for the top UI bar
    this.topPanel = this.add.rectangle(width/2, padding, width, 50, 0x000000, 0.7)
      .setOrigin(0.5, 0)
      .setDepth(10);
    
    // Create a semi-transparent panel for the bottom UI bar
    this.bottomPanel = this.add.rectangle(width/2, height - 50 - padding, width, 50, 0x000000, 0.7)
      .setOrigin(0.5, 0)
      .setDepth(10);
    
    // Updated text style with shadow and better font
    const textStyle = {
      fontSize: "18px",
      fontFamily: "Arial, sans-serif",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
    };
    
    // Top bar elements
    this.scoreText = this.add.text(padding, padding + 15, "Score: 0", textStyle)
      .setDepth(11);
    
    this.highScoreText = this.add.text(width - padding, padding + 15, "High Score: " + this.highScore, textStyle)
      .setOrigin(1, 0)
      .setDepth(11);
    
    // Bottom bar elements
    this.waveText = this.add.text(padding, height - 35 - padding, "Wave: 1", textStyle)
      .setDepth(11);
    
    this.timerText = this.add.text(width/2, height - 35 - padding, "Time: 20", textStyle)
      .setOrigin(0.5, 0)
      .setDepth(11);
    
    this.collectiblesText = this.add.text(width - padding, height - 35 - padding, "Collectibles: 0", textStyle)
      .setOrigin(1, 0)
      .setDepth(11);
    
    // Add dash cooldown indicator in bottom-left corner
    this.dashIndicator = this.add.circle(padding + 15, height - 15 - padding, 8, 0x00ffff)
      .setDepth(11);
    this.dashLabel = this.add.text(padding + 30, height - 20 - padding, "Dash", textStyle)
      .setDepth(11)
      .setFontSize("14px");
    
    // Wave announcement in the center with improved styling
    this.waveAnnouncement = this.add.text(
      width / 2,
      height / 2,
      "",
      {
        fontSize: "32px",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, fill: true },
        backgroundColor: "#00000088",
        padding: { x: 20, y: 10 },
      }
    )
    .setOrigin(0.5)
    .setDepth(20)
    .setVisible(false);
  }

  /**
   * Helper method to create text with consistent styling
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} text - Initial text
   * @returns {Phaser.GameObjects.Text} - The created text object
   */
  createText(x, y, text) {
    return this.add
      .text(x, y, text, this.TEXT_STYLE)
      .setBackgroundColor("#000000")
      .setPadding(5)
  }

  /**
   * Set up event listeners for game events
   */
  setupEventListeners() {
    // Get reference to the GameScene
    const gameScene = this.scene.get("GameScene")

    // Remove any existing listeners to prevent duplicates
    this.removeEventListeners(gameScene)

    // Add new event listeners
    this.addEventListeners(gameScene)
    
    // Add dash ready event listener
    gameScene.events.on("dashReady", this.updateDashIndicator, this)
    
    // Initialize dash indicator
    this.updateDashIndicator(true)
  }

  /**
   * Remove all existing event listeners
   * @param {Phaser.Scene} gameScene - Reference to the game scene
   */
  removeEventListeners(gameScene) {
    gameScene.events.off("updateScore", this.updateScore, this)
    gameScene.events.off("updateWave", this.updateWave, this)
    gameScene.events.off("updateTimer", this.updateTimer, this)
    gameScene.events.off("updateCollectibles", this.updateCollectibles, this)
    gameScene.events.off("waveCompleted", this.showWaveAnnouncement, this)
    gameScene.events.off("gameOver", this.displayGameOver, this)
    gameScene.events.off("waveTimeUp", this.showWaveTimeUp, this)
  }

  /**
   * Add all event listeners
   * @param {Phaser.Scene} gameScene - Reference to the game scene
   */
  addEventListeners(gameScene) {
    gameScene.events.on("updateScore", this.updateScore, this)
    gameScene.events.on("updateWave", this.updateWave, this)
    gameScene.events.on("updateTimer", this.updateTimer, this)
    gameScene.events.on("updateCollectibles", this.updateCollectibles, this)
    gameScene.events.on("waveCompleted", this.showWaveAnnouncement, this)
    gameScene.events.on("gameOver", this.displayGameOver, this)
    gameScene.events.on("waveTimeUp", this.showWaveTimeUp, this)
  }

  /**
   * Update score display and check for high score
   * @param {number} score - Current score
   */
  updateScore(score) {
    this.scoreText.setText("Score: " + score)

    // Check if current score exceeds the high score
    if (score > this.highScore) {
      this.highScore = score
      // Update the high score in localStorage
      localStorage.setItem("highScore", this.highScore)

      // Update the high score display
      this.highScoreText.setText("High Score: " + this.highScore)
    }
  }

  /**
   * Update wave display
   * @param {number} wave - Current wave number
   */
  updateWave(wave) {
    this.waveText.setText("Wave: " + wave)
  }

  /**
   * Update timer display
   * @param {number} time - Current time in milliseconds
   */
  updateTimer(time) {
    this.timerText.setText("Time: " + Math.ceil(time / 1000))
  }

  /**
   * Update collectibles counter display
   * @param {number} count - Number of remaining collectibles
   */
  updateCollectibles(count) {
    this.collectiblesText.setText("Collectibles: " + count)
  }

  /**
   * Show wave completion announcement
   * @param {number} wave - Completed wave number
   * @param {number} bonusPoints - Bonus points awarded
   */
  showWaveAnnouncement(wave, bonusPoints) {
    this.waveAnnouncement.setText(
      `Wave ${wave} Completed!\nBonus Points: ${bonusPoints}`
    )
    this.waveAnnouncement.setVisible(true)
    
    // Add a subtle scale animation
    this.tweens.add({
      targets: this.waveAnnouncement,
      scale: { from: 0.8, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    })

    // Hide the announcement after the specified duration
    this.time.delayedCall(this.ANNOUNCEMENT_DURATION, () => {
      this.tweens.add({
        targets: this.waveAnnouncement,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.waveAnnouncement.setVisible(false)
          this.waveAnnouncement.setAlpha(1)
        }
      })
    })
  }

  /**
   * Show time's up announcement
   */
  showWaveTimeUp() {
    this.waveAnnouncement.setText("Time's up!\nCollect remaining items!")
    this.waveAnnouncement.setVisible(true)

    // Hide the announcement after the specified duration
    this.time.delayedCall(this.ANNOUNCEMENT_DURATION, () => {
      this.waveAnnouncement.setVisible(false)
    })
  }

  /**
   * Display game over information
   * @param {number} finalScore - Final score
   * @param {number} finalWave - Final wave reached
   */
  displayGameOver(finalScore, finalWave) {
    this.scoreText.setText("Game Over! Final Score: " + finalScore)
    this.waveText.setText("Final Wave: " + finalWave)
    this.timerText.setText("")
    this.collectiblesText.setText("")
  }

  /**
   * Update dash indicator to show availability
   * @param {boolean} isReady - Whether dash is ready
   */
  updateDashIndicator(isReady) {
    if (isReady) {
      this.dashIndicator.setFillStyle(0x00ffff)
      this.dashLabel.setColor("#ffffff")
    } else {
      this.dashIndicator.setFillStyle(0x555555)
      this.dashLabel.setColor("#888888")
    }
  }
}

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
  scene: [GameScene, UIScene], // Include both scenes
  parent: "game-container",
}

// Create the game instance
const game = new Phaser.Game(config)
