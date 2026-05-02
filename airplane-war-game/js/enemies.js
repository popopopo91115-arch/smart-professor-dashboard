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
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner glow
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.6;
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
                this.width = 40;
                this.height = 38;
                this.health = 8;
                this.maxHealth = 8;
                this.speed = 2;
                this.score = 500;
                this.color = '#ff0';
                this.fireRate = 30;
                this.pattern = 'circle';
                this.circleAngle = 0;
                this.circleCenter = { x: x, y: Utils.random(100, 200) };
                break;
        }
    }

    update(canvas, playerX, playerY) {
        this.animTimer += 0.1;
        this.fireTimer++;

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
            case 'circle':
                this.circleAngle += 0.02;
                this.x = this.circleCenter.x + Math.cos(this.circleAngle) * 80;
                this.y = this.circleCenter.y + Math.sin(this.circleAngle) * 40;
                break;
        }

        // Shooting
        if (this.fireTimer >= this.fireRate && this.y > 0) {
            this.shoot(playerX, playerY);
            this.fireTimer = 0;
        }

        // Update bullets
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.isOffScreen(canvas));

        // Off screen check
        if (this.y > canvas.height + 50) {
            this.alive = false;
        }

        // Clamp x position
        this.x = Utils.clamp(this.x, 0, canvas.width - this.width);
    }

    shoot(playerX, playerY) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height;

        if (this.type === 'shooter' || this.type === 'elite') {
            // Aimed shots
            const angle = Utils.angle(cx, cy, playerX, playerY);
            const speed = 4;
            this.bullets.push(new EnemyBullet(cx, cy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                { color: this.type === 'elite' ? '#ff0' : '#0f0' }
            ));
            
            if (this.type === 'elite') {
                // Spread shot
                this.bullets.push(new EnemyBullet(cx, cy,
                    Math.cos(angle + 0.3) * speed,
                    Math.sin(angle + 0.3) * speed,
                    { color: '#ff0' }
                ));
                this.bullets.push(new EnemyBullet(cx, cy,
                    Math.cos(angle - 0.3) * speed,
                    Math.sin(angle - 0.3) * speed,
                    { color: '#ff0' }
                ));
            }
        } else {
            // Straight down
            this.bullets.push(new EnemyBullet(cx, cy, 0, 4));
        }
    }

    hit(damage = 1) {
        this.health -= damage;
        if (this.health <= 0) {
            this.alive = false;
            return true; // Destroyed
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        
        // Flash when hit
        const flashIntensity = (this.maxHealth - this.health) / this.maxHealth;
        
        switch (this.type) {
            case 'basic':
                this.drawBasicEnemy(ctx);
                break;
            case 'fast':
                this.drawFastEnemy(ctx);
                break;
            case 'tank':
                this.drawTankEnemy(ctx);
                break;
            case 'shooter':
                this.drawShooterEnemy(ctx);
                break;
            case 'elite':
                this.drawEliteEnemy(ctx);
                break;
        }

        // Health bar for multi-hit enemies
        if (this.maxHealth > 1) {
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

        // Draw bullets
        this.bullets.forEach(b => b.draw(ctx));
    }

    drawBasicEnemy(ctx) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        ctx.fillStyle = '#400';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w, y + 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.4, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFastEnemy(ctx) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        
        ctx.fillStyle = '#430';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x - 5, y);
        ctx.lineTo(x + w / 2, y + 5);
        ctx.lineTo(x + w + 5, y);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.5, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTankEnemy(ctx) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        
        // Big bulky ship
        ctx.fillStyle = '#303';
        ctx.fillRect(x + 5, y, w - 10, h);
        ctx.fillRect(x, y + 10, w, h - 20);
        
        // Armor plates
        ctx.fillStyle = '#505';
        ctx.fillRect(x + 8, y + 5, w - 16, 8);
        ctx.fillRect(x + 8, y + h - 13, w - 16, 8);
        
        // Core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    drawShooterEnemy(ctx) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        // Angular ship
        ctx.fillStyle = '#030';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h * 0.3);
        ctx.lineTo(x + w * 0.3, y);
        ctx.lineTo(x + w * 0.7, y);
        ctx.lineTo(x + w, y + h * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Turret
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.6, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun barrel
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h * 0.6);
        ctx.lineTo(x + w / 2, y + h + 5);
        ctx.stroke();
    }

    drawEliteEnemy(ctx) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Rotating energy effect
        const pulse = Math.sin(this.animTimer * 3) * 0.3 + 0.7;
        
        // Ship body
        ctx.fillStyle = '#440';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x - 5, y + h * 0.4);
        ctx.lineTo(x + w * 0.2, y);
        ctx.lineTo(x + w * 0.8, y);
        ctx.lineTo(x + w + 5, y + h * 0.4);
        ctx.closePath();
        ctx.fill();
        
        // Energy core
        ctx.globalAlpha = pulse;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.4, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Energy rings
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse * 0.5;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.4, 15 + Math.sin(this.animTimer * 2) * 3, 0, Math.PI * 2);
        ctx.stroke();
    }
}

class EnemyWave {
    constructor(level) {
        this.enemies = [];
        this.level = level;
        this.spawnTimer = 0;
        this.spawnInterval = Math.max(30, 90 - level * 10);
        this.enemiesSpawned = 0;
        this.maxEnemies = 10 + level * 5;
        this.waveComplete = false;
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

        if (this.enemiesSpawned >= this.maxEnemies && this.enemies.length === 0) {
            this.waveComplete = true;
        }
    }

    spawnEnemy(canvas) {
        const x = Utils.random(50, canvas.width - 80);
        const y = -50;
        
        // Choose enemy type based on level
        let type;
        const roll = Math.random();
        
        if (this.level >= 4 && roll < 0.1) {
            type = 'elite';
        } else if (this.level >= 3 && roll < 0.25) {
            type = 'shooter';
        } else if (this.level >= 2 && roll < 0.4) {
            type = 'tank';
        } else if (roll < 0.6) {
            type = 'fast';
        } else {
            type = 'basic';
        }

        this.enemies.push(new Enemy(x, y, type));
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
