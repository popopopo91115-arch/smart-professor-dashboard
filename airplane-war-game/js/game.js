// Main game controller

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.state = 'menu';
        this.level = 1;
        this.player = new Player(this.canvas);
        this.background = new ScrollingBackground(this.canvas);
        this.particles = new ParticleSystem();
        this.powerups = new PowerUpManager();
        this.wave = null;
        this.boss = null;
        this.bossActive = false;
        this.screenShake = { x: 0, y: 0 };
        this.shakeIntensity = 0;
        this.wavePhase = 'enemies';
        this.bossIntroTimer = 0;
        this.warningFlash = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.notifications = [];
        this.eliteEnemy = null;

        this.setupUI();
        this.gameLoop();
    }

    setupUI() {
        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('controls-btn').onclick = () => this.showScreen('controls-menu');
        document.getElementById('about-btn').onclick = () => this.showScreen('about-menu');
        document.getElementById('back-from-controls').onclick = () => this.showScreen('main-menu');
        document.getElementById('back-from-about').onclick = () => this.showScreen('main-menu');

        document.getElementById('restart-btn').onclick = () => this.startGame();
        document.getElementById('menu-btn').onclick = () => this.showScreen('main-menu');

        document.getElementById('next-level-btn').onclick = () => this.nextLevel();

        document.getElementById('resume-btn').onclick = () => this.resumeGame();
        document.getElementById('quit-btn').onclick = () => {
            this.state = 'menu';
            this.showScreen('main-menu');
        };

        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                if (this.state === 'playing') this.pauseGame();
                else if (this.state === 'paused') this.resumeGame();
            }
        });
    }

    showScreen(id) {
        const overlays = document.querySelectorAll('.overlay');
        overlays.forEach(o => o.classList.add('hidden'));
        const target = document.getElementById(id);
        if (target) target.classList.remove('hidden');

        const hud = document.getElementById('hud');
        if (id === 'main-menu' || id === 'controls-menu' || id === 'about-menu') {
            hud.classList.add('hidden');
        }
    }

    startGame() {
        this.state = 'playing';
        this.level = 1;
        this.player.reset(this.canvas);
        this.particles.clear();
        this.powerups.clear();
        this.notifications = [];
        this.eliteEnemy = null;
        this.startWave();

        this.showScreen(null);
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('boss-health-container').classList.add('hidden');
        document.getElementById('elite-health-container').classList.add('hidden');
    }

    startWave() {
        this.wave = new EnemyWave(this.level);
        this.boss = null;
        this.bossActive = false;
        this.wavePhase = 'enemies';
        this.eliteEnemy = null;
        document.getElementById('elite-health-container').classList.add('hidden');
    }

    nextLevel() {
        this.level++;
        this.startWave();
        this.state = 'playing';
        this.showScreen(null);
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('boss-health-container').classList.add('hidden');
        document.getElementById('elite-health-container').classList.add('hidden');
    }

    pauseGame() {
        this.state = 'paused';
        this.showScreen('pause-menu');
    }

    resumeGame() {
        this.state = 'playing';
        this.showScreen(null);
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        document.getElementById('hud').classList.remove('hidden');
    }

    gameOver() {
        this.state = 'gameover';
        document.getElementById('final-score').textContent = `النقاط: ${this.player.score}`;
        document.getElementById('final-level').textContent = `المرحلة: ${this.level}`;
        this.showScreen('game-over');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('elite-health-container').classList.add('hidden');
    }

    levelComplete() {
        this.state = 'levelcomplete';
        document.getElementById('level-score').textContent = `النقاط: ${this.player.score}`;
        this.showScreen('level-complete');
        document.getElementById('elite-health-container').classList.add('hidden');
    }

    addNotification(text, color = '#fff') {
        this.notifications.push({
            text,
            color,
            life: 120,
            y: this.canvas.height / 2 - 50
        });
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.background.update();

        if (this.state !== 'playing') return;

        this.player.update();
        this.particles.update();
        this.powerups.update(this.canvas);
        this.powerups.checkCollision(this.player, this.particles);

        // Combo system
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }

        // Screen shake decay
        if (this.shakeIntensity > 0) {
            this.screenShake = this.particles.shakeScreen(this.shakeIntensity);
            this.shakeIntensity *= 0.88;
            if (this.shakeIntensity < 0.3) this.shakeIntensity = 0;
        } else {
            this.screenShake = { x: 0, y: 0 };
        }

        // Notifications
        this.notifications = this.notifications.filter(n => {
            n.life--;
            n.y -= 0.5;
            return n.life > 0;
        });

        // Wave phase management
        if (this.wavePhase === 'enemies') {
            this.updateEnemyPhase();
        } else if (this.wavePhase === 'bossintro') {
            this.updateBossIntro();
        } else if (this.wavePhase === 'boss') {
            this.updateBossPhase();
        }

        // Track elite enemy health bar
        this.updateEliteHealthBar();

        this.updateHUD();
    }

    updateEliteHealthBar() {
        const container = document.getElementById('elite-health-container');
        if (this.wave && this.wave.eliteActive && this.wave.eliteActive.alive) {
            this.eliteEnemy = this.wave.eliteActive;
            container.classList.remove('hidden');
            const fill = document.getElementById('elite-health-fill');
            const percent = (this.eliteEnemy.health / this.eliteEnemy.maxHealth) * 100;
            fill.style.width = `${percent}%`;
        } else if (this.eliteEnemy) {
            this.eliteEnemy = null;
            container.classList.add('hidden');
        }
    }

    updateEnemyPhase() {
        const playerCX = this.player.x + this.player.width / 2;
        const playerCY = this.player.y + this.player.height / 2;

        this.wave.update(this.canvas, playerCX, playerCY);

        // Check player bullets vs enemies
        this.player.bullets = this.player.bullets.filter(bullet => {
            let hit = false;
            for (const enemy of this.wave.enemies) {
                if (Utils.collides(bullet, enemy)) {
                    const destroyed = enemy.hit(bullet.damage);
                    if (destroyed) {
                        this.onEnemyDestroyed(enemy);
                    } else {
                        this.particles.sparks(bullet.x, bullet.y, 5, '#0ff');
                    }
                    hit = true;
                    if (!bullet.piercing) break;
                }
            }
            return !hit;
        });

        // Check enemy bullets vs player
        const allBullets = this.wave.getAllBullets();
        for (const bullet of allBullets) {
            if (Utils.collides(bullet, this.player)) {
                if (this.player.hit()) {
                    this.particles.explode(this.player.x + this.player.width / 2,
                        this.player.y + this.player.height / 2, 20, { color: '#0af' });
                    this.shakeIntensity = 10;
                    if (this.player.lives <= 0) {
                        this.gameOver();
                        return;
                    }
                }
                bullet.x = -100;
            }
        }

        // Check enemy collision with player
        for (const enemy of this.wave.enemies) {
            if (Utils.collides(enemy, this.player)) {
                if (this.player.hit()) {
                    this.particles.explode(this.player.x + this.player.width / 2,
                        this.player.y + this.player.height / 2, 20, { color: '#0af' });
                    this.shakeIntensity = 10;
                    enemy.hit(99);
                    this.onEnemyDestroyed(enemy);
                    if (this.player.lives <= 0) {
                        this.gameOver();
                        return;
                    }
                }
            }
        }

        // Wave complete - start boss (silent transition, no level message)
        if (this.wave.waveComplete) {
            this.wavePhase = 'bossintro';
            this.bossIntroTimer = 0;
            this.warningFlash = 0;
            this.addNotification('⚠️ تحذير! بوس قادم! ⚠️', '#f00');
        }
    }

    updateBossIntro() {
        this.bossIntroTimer++;
        this.warningFlash += 0.1;

        if (this.bossIntroTimer >= 120) {
            this.wavePhase = 'boss';
            this.boss = new Boss(this.canvas, this.level);
            this.bossActive = true;
            document.getElementById('boss-health-container').classList.remove('hidden');
            document.getElementById('boss-name').textContent =
                `${this.boss.name} - ${this.boss.nameEn}`;
        }
    }

    updateBossPhase() {
        if (!this.boss) return;

        const playerCX = this.player.x + this.player.width / 2;
        const playerCY = this.player.y + this.player.height / 2;

        const bossFinished = this.boss.update(playerCX, playerCY);

        if (bossFinished) {
            this.player.score += this.boss.score;
            this.shakeIntensity = 18;
            this.particles.explode(this.boss.x, this.boss.y + this.boss.height / 2, 80, {
                speed: 8,
                color: this.boss.color1
            });

            this.powerups.spawnGuaranteed(this.boss.x - 20, this.boss.y, 'weapon');
            this.powerups.spawnGuaranteed(this.boss.x + 20, this.boss.y, 'health');
            this.powerups.spawnGuaranteed(this.boss.x, this.boss.y + 20, 'special');

            this.boss = null;
            this.bossActive = false;
            document.getElementById('boss-health-container').classList.add('hidden');

            setTimeout(() => this.levelComplete(), 1500);
            return;
        }

        // Check player bullets vs boss
        if (!this.boss.defeated && !this.boss.entering) {
            this.player.bullets = this.player.bullets.filter(bullet => {
                const bossHitbox = {
                    x: this.boss.x - this.boss.width / 2,
                    y: this.boss.y,
                    width: this.boss.width,
                    height: this.boss.height
                };
                if (Utils.collides(bullet, bossHitbox)) {
                    const destroyed = this.boss.hit(bullet.damage);
                    this.particles.bossDamage(bullet.x, bullet.y);
                    this.player.addSpecialCharge(2);
                    if (destroyed) {
                        this.shakeIntensity = 12;
                    }
                    return false;
                }
                return true;
            });
        }

        // Check boss bullets vs player
        if (this.boss && !this.boss.defeated) {
            for (const bullet of this.boss.bullets) {
                if (Utils.collides(bullet, this.player)) {
                    if (this.player.hit()) {
                        this.particles.explode(this.player.x + this.player.width / 2,
                            this.player.y + this.player.height / 2, 20, { color: '#0af' });
                        this.shakeIntensity = 10;
                        if (this.player.lives <= 0) {
                            this.gameOver();
                            return;
                        }
                    }
                    bullet.x = -100;
                }
            }
        }

        // Update boss health bar
        if (this.boss) {
            const fill = document.getElementById('boss-health-fill');
            fill.style.width = `${this.boss.getHealthPercent() * 100}%`;
        }
    }

    onEnemyDestroyed(enemy) {
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;

        this.particles.explode(cx, cy, 25);

        // Stronger screen shake for elite enemies
        if (enemy.type === 'elite') {
            this.shakeIntensity = 12;
            this.particles.explode(cx, cy, 40, { speed: 6, color: '#ffa500' });
            this.addNotification('ELITE DESTROYED! +1500', '#ffa500');
        } else {
            this.shakeIntensity = 3;
        }

        // Combo system
        this.comboCount++;
        this.comboTimer = 60;
        const comboMultiplier = Math.min(this.comboCount, 10);
        const score = enemy.score * comboMultiplier;
        this.player.score += score;
        this.player.addSpecialCharge(3);

        if (this.comboCount >= 3) {
            this.addNotification(`COMBO x${this.comboCount}! +${score}`, '#ff0');
        }

        this.powerups.spawn(cx, cy);
    }

    updateHUD() {
        document.getElementById('score').textContent = this.player.score.toLocaleString();
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.player.lives;

        const specialFill = document.getElementById('special-fill');
        specialFill.style.width = `${(this.player.specialCharge / this.player.maxSpecialCharge) * 100}%`;
    }

    render() {
        const ctx = this.ctx;
        ctx.save();

        ctx.translate(this.screenShake.x, this.screenShake.y);

        this.background.draw(ctx);

        if (this.state === 'playing' || this.state === 'paused') {
            this.powerups.draw(ctx);

            if (this.wave && this.wavePhase === 'enemies') {
                this.wave.draw(ctx);
            }

            if (this.boss) {
                this.boss.draw(ctx);
            }

            this.player.draw(ctx);
            this.particles.draw(ctx);

            // Boss intro warning
            if (this.wavePhase === 'bossintro') {
                this.drawBossWarning(ctx);
            }

            this.drawNotifications(ctx);

            // Thruster particles
            if (this.state === 'playing') {
                this.particles.fireTrail(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height + 5,
                    2
                );
            }
        }

        ctx.restore();
    }

    drawBossWarning(ctx) {
        const alpha = Math.abs(Math.sin(this.warningFlash * 2));
        ctx.save();
        ctx.globalAlpha = alpha;

        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 100,
            this.canvas.width / 2, this.canvas.height / 2, 400
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#f00';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f00';
        ctx.fillText('⚠️ WARNING ⚠️', this.canvas.width / 2, this.canvas.height / 2 - 20);
        ctx.font = 'bold 24px Arial';
        ctx.fillText('BOSS APPROACHING', this.canvas.width / 2, this.canvas.height / 2 + 20);

        ctx.restore();
    }

    drawNotifications(ctx) {
        ctx.save();
        this.notifications.forEach(n => {
            ctx.globalAlpha = Math.min(1, n.life / 30);
            ctx.fillStyle = n.color;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 10;
            ctx.shadowColor = n.color;
            ctx.fillText(n.text, this.canvas.width / 2, n.y);
        });
        ctx.restore();
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
