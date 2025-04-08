console.log("script.js is loaded.....");

class SpaceShooter {
    constructor() {
        this.gameArea = $("#gameArea");
        this.startScreen = $("#startScreen");
        this.startBtn = $("#startBtn");
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.explosions = [];
        this.score = 0;
        this.level = 1;
        this.maxLevel = 1;
        this.gameActive = false;
        this.keys = {};
        this.playerSpeed = 15;
        this.bulletSpeed = 20;
        this.shootCooldown = 200;
        this.lastShot = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showStartScreen();
        this.createPlayer();
        this.setupControls();
    }

    showStartScreen() {
        this.startScreen.show();
        this.gameArea.hide();
        $(".mobile-controls").hide();
    }

    startGame() {
        this.gameActive = true;
        this.startScreen.hide();
        this.gameArea.show();
        $(".mobile-controls").show();
        this.resetGameState();
        this.startSpawningEnemies();
        this.gameLoop = requestAnimationFrame(() => this.update());
    }

    resetGameState() {
        this.score = 0;
        this.level = 1;
        this.maxLevel = 1;
        $("#score, #hudScore").text("0");
        $("#level, #hudLevel").text("1");
        this.gameArea.empty();
        this.createPlayer();
    }

    createPlayer() {
        this.player = $("<div>").addClass("player");
        this.gameArea.append(this.player);
        this.resetPlayerPosition();
    }

    resetPlayerPosition() {
        this.player.css({
            left: (this.gameArea.width()/2 - 25) + "px",
            bottom: "20px"
        });
    }

    setupControls() {
        $(document).on({
            keydown: (e) => {
                if(e.key === " ") e.preventDefault();
                this.keys[e.key] = true;
            },
            keyup: (e) => {
                this.keys[e.key] = false;
            }
        });

        let touchStartX = 0;
        this.gameArea.on("touchstart", (e) => {
            touchStartX = e.touches[0].clientX;
            e.preventDefault();
        });

        this.gameArea.on("touchmove", (e) => {
            const touchX = e.touches[0].clientX;
            const deltaX = (touchX - touchStartX) * 1.5;
            this.movePlayer(deltaX);
            touchStartX = touchX;
            e.preventDefault();
        });
    }

    setupEventListeners() {
        $("#startBtn").click(() => this.startGame());
        $("#restartBtn, #modalRestartBtn").click(() => this.restartGame());
        
        $(".move-left").on("mousedown touchstart", () => this.keys.ArrowLeft = true);
        $(".move-right").on("mousedown touchstart", () => this.keys.ArrowRight = true);
        $(".shoot").on("mousedown touchstart", () => this.keys[" "] = true);
        
        $(".move-left, .move-right, .shoot").on("mouseup touchend", () => {
            this.keys.ArrowLeft = false;
            this.keys.ArrowRight = false;
            this.keys[" "] = false;
        });
    }

    handleInput() {
        if(this.keys.ArrowLeft) this.movePlayer(-this.playerSpeed);
        if(this.keys.ArrowRight) this.movePlayer(this.playerSpeed);
        if(this.keys[" "]) this.handleShooting();
    }

    movePlayer(offset) {
        if(!this.gameActive) return;
        const currentLeft = parseInt(this.player.css("left")) || 0;
        const newLeft = Math.max(0, Math.min(
            this.gameArea.width() - 50, 
            currentLeft + offset
        ));
        this.player.css("left", newLeft + "px");
    }

    handleShooting() {
        const now = Date.now();
        if(now - this.lastShot > this.shootCooldown) {
            this.shoot();
            this.lastShot = now;
        }
    }

    shoot() {
        if(!this.gameActive) return;
        
        const playerPos = this.player.position();
        const bullet = $("<div>").addClass("bullet");
        
        this.bullets.push({
            element: bullet,
            x: playerPos.left + 23,
            y: playerPos.top - 20,
            update: () => {
                bullet.css("top", `${bullet.position().top - this.bulletSpeed}px`);
            }
        });

        this.gameArea.append(bullet);
        bullet.css({
            left: playerPos.left + 23 + "px",
            top: playerPos.top - 20 + "px"
        });
    }

    startSpawningEnemies() {
        const baseSpeed = 1;
        const speedIncrement = 0.3;
        const baseSpawnRate = 2000;
        const spawnRateDecrement = 200;

        this.enemySpawner = setInterval(() => {
            if(!this.gameActive) return;

            const enemy = $("<div>").addClass("enemy");
            const xPos = Math.random() * (this.gameArea.width() - 40);
            
            enemy.css({
                left: xPos + "px",
                top: "-40px"
            });

            this.enemies.push({
                element: enemy,
                speed: baseSpeed + this.level * speedIncrement,
                update: function() {
                    enemy.css("top", `${parseInt(enemy.css("top")) + this.speed}px`);
                }
            });

            this.gameArea.append(enemy);
        }, Math.max(500, baseSpawnRate - this.level * spawnRateDecrement));
    }

    update() {
        if(!this.gameActive) return;

        this.handleInput();
        this.updateBullets();
        this.updateEnemies();
        this.gameLoop = requestAnimationFrame(() => this.update());
    }

    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            if(parseInt(bullet.element.css("top")) < -20) {
                bullet.element.remove();
                return false;
            }
            return true;
        });
    }

    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            enemy.update();
            
            if(this.checkCollision(enemy)) {
                enemy.element.remove();
                this.score += 100;
                $("#score, #hudScore").text(this.score);
                this.checkLevelUp();
                return false;
            }

            if(parseInt(enemy.element.css("top")) > this.gameArea.height() - 60) {
                this.gameOver();
                return false;
            }
            return true;
        });
    }

    checkCollision(enemy) {
        const enemyRect = enemy.element[0].getBoundingClientRect();
        return this.bullets.some((bullet, index) => {
            const bulletRect = bullet.element[0].getBoundingClientRect();
            
            if(this.rectCollision(bulletRect, enemyRect)) {
                this.createExplosion(enemyRect.left, enemyRect.top);
                bullet.element.remove();
                this.bullets.splice(index, 1);
                return true;
            }
            return false;
        });
    }

    rectCollision(rect1, rect2) {
        return !(
            rect1.right < rect2.left || 
            rect1.left > rect2.right || 
            rect1.bottom < rect2.top || 
            rect1.top > rect2.bottom
        );
    }

    createExplosion(x, y) {
        const explosion = $("<div>").addClass("explosion");
        explosion.css({ left: x - 25, top: y - 25 });
        this.gameArea.append(explosion);
        setTimeout(() => explosion.remove(), 500);
    }

    checkLevelUp() {
        if(this.score >= this.level * 1000) {
            this.level++;
            this.maxLevel = Math.max(this.maxLevel, this.level);
            $("#level, #hudLevel").text(this.level);
            clearInterval(this.enemySpawner);
            this.startSpawningEnemies();
            this.showLevelUp();
        }
    }

    showLevelUp() {
        const levelUp = $(`<div>LEVEL ${this.level}!</div>`)
            .css({
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#0ff",
                fontSize: "48px",
                fontWeight: "bold",
                textShadow: "0 0 10px #0ff"
            })
            .appendTo(this.gameArea)
            .fadeOut(2000, () => levelUp.remove());
    }

    gameOver() {
        this.gameActive = false;
        cancelAnimationFrame(this.gameLoop);
        clearInterval(this.enemySpawner);
        $("#finalScore").text(this.score);
        $("#maxLevel").text(this.maxLevel);
        new bootstrap.Modal("#gameOverModal").show();
    }

    restartGame() {
        this.gameActive = false;
        this.gameArea.empty();
        this.bullets = [];
        this.enemies = [];
        this.showStartScreen();
    }
}

$(document).ready(() => {
    new SpaceShooter();
});