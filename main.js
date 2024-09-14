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
        this.events.emit('updateScore', this.score);
        this.gameOver = false;

        // Create game objects
        this.createPlayer();
        this.createCollectibles();
        this.createEnemies();

        // Set up input handling
        this.cursors = this.input.keyboard.createCursorKeys();

        // Display score
        //this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', fill: '#ffffff' });
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
        this.collectibles = this.physics.add.group({
            key: 'collectibleSprite',
            repeat: 9,
        });
    
        this.collectibles.children.iterate((child) => {
            child.setImmovable(true);
            child.body.allowGravity = false;
        
            let x, y;
            do {
                x = Phaser.Math.Between(50, 750);
                y = Phaser.Math.Between(50, 550);
            } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 50);
        
            child.setPosition(x, y);
        });        
    
        this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    }
    

    createEnemies() {
        this.enemies = this.physics.add.group({
            key: 'enemySprite',
            repeat: 4,
            setXY: { x: Phaser.Math.Between(50, 750), y: Phaser.Math.Between(50, 550) },
        });

        this.enemies.children.iterate((enemy) => {
            enemy.setCollideWorldBounds(true);
            enemy.setBounce(1);
            enemy.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
        });

        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.collider(this.enemies, this.enemies);
    }

    collectItem(player, collectible) {
        collectible.disableBody(true, true);

        this.score += 10;
        this.events.emit('updateScore', this.score);
        //this.scoreText.setText('Score: ' + this.score);

        if (this.collectibles.countActive(true) === 0) {
            this.collectibles.children.iterate(function (child) {
                child.enableBody(true, Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), true, true);
            });
        }
    }

    hitEnemy(player, enemy) {
        this.physics.pause();
        this.player.setTint(0xff0000);
        this.player.anims.stop();

        this.gameOver = true;
        this.events.emit('gameOver', this.score);
        //this.scoreText.setText('Game Over! Final Score: ' + this.score);

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
        // Display score
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            fill: '#ffffff',
        });

        // Get reference to the GameScene
        const gameScene = this.scene.get('GameScene');

        // Listen to events from the GameScene
        gameScene.events.on('updateScore', this.updateScore, this);
        gameScene.events.on('gameOver', this.displayGameOver, this);
    }

    updateScore(score) {
        this.scoreText.setText('Score: ' + score);
    }

    displayGameOver(finalScore) {
        this.scoreText.setText('Game Over! Final Score: ' + finalScore);
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
};

const game = new Phaser.Game(config);
