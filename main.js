class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Create a graphics object for the player
        const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        playerGraphics.fillStyle(0x00ff00, 1); // Green color
        playerGraphics.fillRect(0, 0, 40, 40); // Draw a rectangle
        playerGraphics.generateTexture('playerSprite', 40, 40);
        playerGraphics.destroy();
    
        // Create a graphics object for the collectible
        const collectibleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        collectibleGraphics.fillStyle(0xffff00, 1); // Yellow color
        collectibleGraphics.fillCircle(10, 10, 10); // Draw a circle
        collectibleGraphics.generateTexture('collectibleSprite', 20, 20);
        collectibleGraphics.destroy();
    
        // Create a graphics object for the enemy
        const enemyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        enemyGraphics.fillStyle(0xff0000, 1); // Red color
        enemyGraphics.fillTriangle(15, 0, 0, 30, 30, 30); // Draw a triangle
        enemyGraphics.generateTexture('enemySprite', 30, 30);
        enemyGraphics.destroy();
    }
    
    create() {
        // Initialize variables
        this.score = 0;
        this.wave = 1;
        this.gameOver = false;

        // Create game objects
        this.createPlayer();
        
        // Initialize physics groups
        this.collectibles = this.physics.add.group();
        this.enemies = this.physics.add.group();

        this.createCollectibles();
        this.createEnemies();

        // Set up input handling
        this.cursors = this.input.keyboard.createCursorKeys();

        // Set up collisions
        this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.collider(this.enemies, this.enemies);

        // Emit initial events
        this.events.emit('updateScore', this.score);
        this.events.emit('updateWave', this.wave);
    }

    update() {
        if (this.gameOver) {
            return;
        }

        const speed = 200;
        this.player.body.setVelocity(0);

        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-speed);
        }
        if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(speed);
        }
        if (this.cursors.up.isDown) {
            this.player.body.setVelocityY(-speed);
        }
        if (this.cursors.down.isDown) {
            this.player.body.setVelocityY(speed);
        }
    }

    createPlayer() {
        this.player = this.physics.add.sprite(400, 300, 'playerSprite');
        this.player.setCollideWorldBounds(true);
    }

    createCollectibles() {
        this.collectibles.clear(true, true);
    
        for (let i = 0; i < 10 + this.wave; i++) {
            let x, y;
            do {
                x = Phaser.Math.Between(50, 750);
                y = Phaser.Math.Between(50, 550);
            } while (this.player && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 50);
        
            const collectible = this.collectibles.create(x, y, 'collectibleSprite');
            collectible.setImmovable(true);
            collectible.body.allowGravity = false;
        }
    }
    
    createEnemies() {
        this.enemies.clear(true, true);

        for (let i = 0; i < 5 + Math.floor(this.wave / 2); i++) {
            const x = Phaser.Math.Between(50, 750);
            const y = Phaser.Math.Between(50, 550);
            const enemy = this.enemies.create(x, y, 'enemySprite');
            enemy.setCollideWorldBounds(true);
            enemy.setBounce(1);
            enemy.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
        }
    }

    collectItem(player, collectible) {
        collectible.disableBody(true, true);

        this.score += 10;
        this.events.emit('updateScore', this.score);

        if (this.collectibles && this.collectibles.countActive(true) === 0) {
            this.completeWave();
        }
    }

    completeWave() {
        // Emit event for wave completion
        this.events.emit('waveCompleted', this.wave);

        // Start the next wave after a short delay
        this.time.delayedCall(2500, () => {
            // Increment the wave counter here, just before starting the new wave
            this.wave++;
            this.events.emit('updateWave', this.wave);
            this.createCollectibles();
            this.createEnemies();
        });
    }

    hitEnemy(player, enemy) {
        this.physics.pause();
        this.player.setTint(0xff0000);
        this.player.anims.stop();

        this.gameOver = true;
        this.events.emit('gameOver', this.score, this.wave);

        // Restart the game after a delay
        this.time.delayedCall(3000, () => {
            this.scene.restart();
        });
    }
}

class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create() {
        // Initialize high score from localStorage
        this.highScore = localStorage.getItem('highScore') || 0;

        // Display score
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            fill: '#ffffff',
        });

        // Display wave
        this.waveText = this.add.text(16, 48, 'Wave: 1', {
            fontSize: '24px',
            fill: '#ffffff',
        });

        // Display high score on the right
        this.highScoreText = this.add.text(this.cameras.main.width - 16, 16, 'High Score: ' + this.highScore, {
            fontSize: '24px',
            fill: '#ffffff',
        });
        this.highScoreText.setOrigin(1, 0); // Align to the right edge

        // Create wave announcement text
        this.waveAnnouncement = this.add.text(400, 300, '', {
            fontSize: '36px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 },
        });
        this.waveAnnouncement.setOrigin(0.5);
        this.waveAnnouncement.setVisible(false);

        this.scoreText.setBackgroundColor('#000000').setPadding(5);
        this.waveText.setBackgroundColor('#000000').setPadding(5);
        this.highScoreText.setBackgroundColor('#000000').setPadding(5);
        
        // Get reference to the GameScene
        const gameScene = this.scene.get('GameScene');

        // Remove previous listeners if any
        gameScene.events.off('updateScore', this.updateScore, this);
        gameScene.events.off('updateWave', this.updateWave, this);
        gameScene.events.off('waveCompleted', this.showWaveAnnouncement, this);
        gameScene.events.off('gameOver', this.displayGameOver, this);

        // Listen to events from the GameScene
        gameScene.events.on('updateScore', this.updateScore, this);
        gameScene.events.on('updateWave', this.updateWave, this);
        gameScene.events.on('waveCompleted', this.showWaveAnnouncement, this);
        gameScene.events.on('gameOver', this.displayGameOver, this);
    }

    updateScore(score) {
        this.scoreText.setText('Score: ' + score);

        // Check if current score exceeds the high score
        if (score > this.highScore) {
            this.highScore = score;
            // Update the high score in localStorage
            localStorage.setItem('highScore', this.highScore);

            // Update the high score display
            this.highScoreText.setText('High Score: ' + this.highScore);
        }
    }

    updateWave(wave) {
        this.waveText.setText('Wave: ' + wave);
    }

    showWaveAnnouncement(wave) {
        this.waveAnnouncement.setText(`Wave ${wave} Completed!`);
        this.waveAnnouncement.setVisible(true);

        // Hide the announcement after 2 seconds
        this.time.delayedCall(2000, () => {
            this.waveAnnouncement.setVisible(false);
        });
    }

    displayGameOver(finalScore, finalWave) {
        this.scoreText.setText('Game Over! Final Score: ' + finalScore);
        this.waveText.setText('Final Wave: ' + finalWave);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#222222',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // No gravity for a top-down game
            debug: false,
        },
    },
    scene: [GameScene, UIScene], // Include both scenes
    parent: 'game-container',
};

const game = new Phaser.Game(config);
