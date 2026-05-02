// Enemy types and management

class EnemyBullet {
    constructor(x, y, vx, vy, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = options.width || 6;
        this.height = options.height || 6;
        this.color = options.color || '#f44';
        this.size = options.size || 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Bloom glow ring
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isOffScreen(canvas) {
        return this.x < -20 || this.x > canvas.width + 20 ||
               this.y < -20 || this.y > canvas.height + 20;
    }
}

class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.alive = true;
        this.bullets = [];
        this.fireTimer = 0;
        this.animTimer = 0;
        this.flashTimer = 0;

        this.setupType(type);
    }

    setupType(type) {
        switch (type) {
            case 'basic':
                this.width = 30;
                this.height = 30;
                this.health = 1;
                this.maxHealth = 1;
                this.speed = 2;
                this.score = 100;
                this.color = '#f44';
                this.fireRate = 120;
                this.pattern = 'straight';
                break;
            case 'fast':
                this.width = 25;
                this.height = 25;
                this.health = 1;
                this.maxHealth = 1;
                this.speed = 4;
                this.score = 150;
                this.color = '#f80';
                this.fireRate = 90;
                this.pattern = 'zigzag';
                this.zigzagTimer = 0;
                this.zigzagDir = 1;
                break;
            case 'tank':
                this.width = 45;
                this.height = 40;
                this.health = 5;
                this.maxHealth = 5;
                this.speed = 1;
                this.score = 300;
                this.color = '#808';
                this.fireRate = 60;
                this.pattern = 'straight';
                break;
            case 'shooter':
                this.width = 35;
                this.height = 35;
                this.health = 3;
                this.maxHealth = 3;
                this.speed = 1.5;
                this.score = 250;
                this.color = '#0a0';
                this.fireRate = 40;
                this.pattern = 'hover';
                this.hoverY = Utils.random(80, 200);
                break;
            case 'elite':
                this.width = 55;
                this.height = 52;
                this.health = 25;
                this.maxHealth = 25;
                this.speed = 1.8;
                this.score = 1500;
                this.color = '#ff0';
                this.fireRate = 25;
                this.pattern = 'elite_pattern';
                this.patternPhase = 0;
                this.patternTimer = 0;
                this.targetY = Utils.random(80, 180);
                this.entered = false;
                this.circleAngle = 0;
                this.zigDir = 1;
                break;
        }
    }

    update(canvas, playerX, playerY) {
        this.animTimer += 0.1;
        this.fireTimer++;
        if (this.flashTimer > 0) this.flashTimer--;

        switch (this.pattern) {
            case 'straight':
                this.y += this.speed;
                break;
            case 'zigzag':
                this.y += this.speed;
                this.zigzagTimer++;
                if (this.zigzagTimer > 30) {
                    this.zigzagDir *= -1;
                    this.zigzagTimer = 0;
                }
                this.x += this.zigzagDir * 2;
                break;
            case 'hover':
                if (this.y < this.hoverY) {
                    this.y += this.speed;
                } else {
                    this.x += Math.sin(this.animTimer) * 1.5;
                }
                break;
            case 'elite_pattern':
                this.updateElitePattern(canvas, playerX);
                break;
        }

        // Shooting
        if (this.fireTimer >= this.fireRate && this.y > 0) {
            this.shoot(playerX, playerY);
            this.fireTimer = 0;
        }

        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.isOffScreen(canvas));

        if (this.y > canvas.height + 50) {
            this.alive = false;
        }

        this.x = Utils.clamp(this.x, 0, canvas.width - this.width);
    }

    updateElitePattern(canvas, playerX) {
        this.patternTimer++;

        if (!this.entered) {
            this.y += this.speed;
            if (this.y >= this.targetY) {
                this.entered = true;
                this.patternPhase = 0;
                this.patternTimer = 0;
            }
            return;
        }

        // Cycle through complex patterns
        const phaseDuration = 180;
        const currentPhase = Math.floor(this.patternTimer / phaseDuration) % 3;

        switch (currentPhase) {
            case 0: // Zig-zag across screen
                this.x += this.zigDir * 2.5;
                this.y += Math.sin(this.animTimer * 0.5) * 0.5;
                if (this.x <= 10 || this.x >= canvas.width - this.width - 10) {
                    this.zigDir *= -1;
                }
                break;
            case 1: // Circle pattern
                this.circleAngle += 0.03;
                this.x = canvas.width / 2 + Math.cos(this.circleAngle) * 150 - this.width / 2;
                this.y = this.targetY + Math.sin(this.circleAngle) * 60;
                break;
            case 2: // Track player
                const targetX = playerX - this.width / 2;
                this.x += (targetX - this.x) * 0.02;
                this.y = this.targetY + Math.sin(this.animTimer * 0.8) * 20;
                break;
        }
    }

    shoot(playerX, playerY) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height;

        if (this.type === 'shooter' || this.type === 'elite') {
            const angle = Utils.angle(cx, cy, playerX, playerY);
            const speed = this.type === 'elite' ? 4.5 : 4;
            this.bullets.push(new EnemyBullet(cx, cy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                { color: this.type === 'elite' ? '#ff0' : '#0f0', size: this.type === 'elite' ? 5 : 4 }
            ));

            if (this.type === 'elite') {
                // Triple spread
                this.bullets.push(new EnemyBullet(cx, cy,
                    Math.cos(angle + 0.25) * speed,
                    Math.sin(angle + 0.25) * speed,
                    { color: '#ffa500', size: 4 }
                ));
                this.bullets.push(new EnemyBullet(cx, cy,
                    Math.cos(angle - 0.25) * speed,
                    Math.sin(angle - 0.25) * speed,
                    { color: '#ffa500', size: 4 }
                ));
                // Occasional extra burst
                if (Math.random() > 0.6) {
                    this.bullets.push(new EnemyBullet(cx, cy,
                        Math.cos(angle + 0.5) * (speed * 0.8),
                        Math.sin(angle + 0.5) * (speed * 0.8),
                        { color: '#f44', size: 3 }
                    ));
                    this.bullets.push(new EnemyBullet(cx, cy,
                        Math.cos(angle - 0.5) * (speed * 0.8),
                        Math.sin(angle - 0.5) * (speed * 0.8),
                        { color: '#f44', size: 3 }
                    ));
                }
            }
        } else {
            this.bullets.push(new EnemyBullet(cx, cy, 0, 4));
        }
    }

    hit(damage = 1) {
        this.health -= damage;
        this.flashTimer = 8;
        if (this.health <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();

        // White flash when hit
        if (this.flashTimer > 0) {
            ctx.globalAlpha = 1;
            this.drawShape(ctx, true);
            ctx.restore();
            this.bullets.forEach(b => b.draw(ctx));
            return;
        }

        this.drawShape(ctx, false);

        // Health bar for multi-hit enemies (not elite - elite uses top bar)
        if (this.maxHealth > 1 && this.type !== 'elite') {
            const barWidth = this.width;
            const barHeight = 4;
            const barX = this.x;
            const barY = this.y - 8;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = this.health > this.maxHealth * 0.3 ? '#0f0' : '#f00';
            ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
        }

        ctx.restore();
        this.bullets.forEach(b => b.draw(ctx));
    }

    drawShape(ctx, flash) {
        switch (this.type) {
            case 'basic': this.drawBasicEnemy(ctx, flash); break;
            case 'fast': this.drawFastEnemy(ctx, flash); break;
            case 'tank': this.drawTankEnemy(ctx, flash); break;
            case 'shooter': this.drawShooterEnemy(ctx, flash); break;
            case 'elite': this.drawEliteEnemy(ctx, flash); break;
        }
    }

    drawBasicEnemy(ctx, flash) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 10;
        ctx.shadowColor = flash ? '#fff' : this.color;

        ctx.fillStyle = flash ? '#fff' : '#400';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w, y + 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = flash ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.4, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFastEnemy(ctx, flash) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 8;
        ctx.shadowColor = flash ? '#fff' : this.color;

        ctx.fillStyle = flash ? '#fff' : '#430';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x - 5, y);
        ctx.lineTo(x + w / 2, y + 5);
        ctx.lineTo(x + w + 5, y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = flash ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.5, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTankEnemy(ctx, flash) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 12;
        ctx.shadowColor = flash ? '#fff' : this.color;

        ctx.fillStyle = flash ? '#fff' : '#303';
        ctx.fillRect(x + 5, y, w - 10, h);
        ctx.fillRect(x, y + 10, w, h - 20);

        ctx.fillStyle = flash ? '#eee' : '#505';
        ctx.fillRect(x + 8, y + 5, w - 16, 8);
        ctx.fillRect(x + 8, y + h - 13, w - 16, 8);

        ctx.fillStyle = flash ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    drawShooterEnemy(ctx, flash) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 10;
        ctx.shadowColor = flash ? '#fff' : this.color;

        ctx.fillStyle = flash ? '#fff' : '#030';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h * 0.3);
        ctx.lineTo(x + w * 0.3, y);
        ctx.lineTo(x + w * 0.7, y);
        ctx.lineTo(x + w, y + h * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = flash ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.6, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = flash ? '#fff' : '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h * 0.6);
        ctx.lineTo(x + w / 2, y + h + 5);
        ctx.stroke();
    }

    drawEliteEnemy(ctx, flash) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        const pulse = Math.sin(this.animTimer * 3) * 0.3 + 0.7;

        ctx.shadowBlur = 20;
        ctx.shadowColor = flash ? '#fff' : '#ffa500';

        // Larger menacing body
        ctx.fillStyle = flash ? '#fff' : '#331100';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x - 8, y + h * 0.4);
        ctx.lineTo(x + w * 0.15, y);
        ctx.lineTo(x + w * 0.35, y - 5);
        ctx.lineTo(x + w * 0.5, y - 8);
        ctx.lineTo(x + w * 0.65, y - 5);
        ctx.lineTo(x + w * 0.85, y);
        ctx.lineTo(x + w + 8, y + h * 0.4);
        ctx.closePath();
        ctx.fill();

        // Wing accents
        ctx.fillStyle = flash ? '#eee' : '#552200';
        ctx.beginPath();
        ctx.moveTo(x + 5, y + h * 0.5);
        ctx.lineTo(x - 12, y + h * 0.3);
        ctx.lineTo(x + 10, y + h * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + w - 5, y + h * 0.5);
        ctx.lineTo(x + w + 12, y + h * 0.3);
        ctx.lineTo(x + w - 10, y + h * 0.35);
        ctx.closePath();
        ctx.fill();

        // Energy core
        if (!flash) {
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ffa500';
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.35, 12, 0, Math.PI * 2);
            ctx.fill();

            // Pulsing rings
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 2;
            ctx.globalAlpha = pulse * 0.4;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.35, 18 + Math.sin(this.animTimer * 2) * 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = pulse * 0.2;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.35, 24 + Math.sin(this.animTimer * 1.5) * 5, 0, Math.PI * 2);
            ctx.stroke();

            // Eye glow
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#f00';
            ctx.beginPath();
            ctx.arc(x + w * 0.35, y + h * 0.25, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + w * 0.65, y + h * 0.25, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.35, 12, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

class EnemyWave {
    constructor(level) {
        this.enemies = [];
        this.level = level;
        this.spawnTimer = 0;
        // Slower difficulty curve
        this.spawnInterval = Math.max(35, 80 - level * 5);
        this.enemiesSpawned = 0;
        this.maxEnemies = 6 + level * 3;
        this.waveComplete = false;
        this.eliteActive = null;
    }

    update(canvas, playerX, playerY) {
        this.spawnTimer++;

        if (this.spawnTimer >= this.spawnInterval && this.enemiesSpawned < this.maxEnemies) {
            this.spawnEnemy(canvas);
            this.spawnTimer = 0;
            this.enemiesSpawned++;
        }

        this.enemies.forEach(e => e.update(canvas, playerX, playerY));
        this.enemies = this.enemies.filter(e => e.alive);

        // Track elite enemy
        if (this.eliteActive && !this.eliteActive.alive) {
            this.eliteActive = null;
        }

        if (this.enemiesSpawned >= this.maxEnemies && this.enemies.length === 0) {
            this.waveComplete = true;
        }
    }

    spawnEnemy(canvas) {
        const x = Utils.random(50, canvas.width - 80);
        const y = -50;

        let type;
        const roll = Math.random();

        // Slower ramp-up for elites
        if (this.level >= 3 && roll < 0.08 && !this.eliteActive) {
            type = 'elite';
        } else if (this.level >= 3 && roll < 0.2) {
            type = 'shooter';
        } else if (this.level >= 2 && roll < 0.35) {
            type = 'tank';
        } else if (roll < 0.55) {
            type = 'fast';
        } else {
            type = 'basic';
        }

        const enemy = new Enemy(x, y, type);
        if (type === 'elite') {
            this.eliteActive = enemy;
        }
        this.enemies.push(enemy);
    }

    draw(ctx) {
        this.enemies.forEach(e => e.draw(ctx));
    }

    getAllBullets() {
        let bullets = [];
        this.enemies.forEach(e => {
            bullets = bullets.concat(e.bullets);
        });
        return bullets;
    }

    clearBullets() {
        this.enemies.forEach(e => { e.bullets = []; });
    }
}
