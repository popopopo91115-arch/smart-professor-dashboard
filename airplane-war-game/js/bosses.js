// Boss system - unique bosses for each level

class Boss {
    constructor(canvas, level) {
        this.canvas = canvas;
        this.level = level;
        this.x = canvas.width / 2;
        this.y = -150;
        this.targetY = 80;
        this.entering = true;
        this.alive = true;
        this.bullets = [];
        this.phase = 1;
        this.phaseTimer = 0;
        this.animTimer = 0;
        this.flashTimer = 0;
        this.defeated = false;
        this.deathTimer = 0;

        this.setupBoss(level);
    }

    setupBoss(level) {
        switch (level) {
            case 1:
                this.name = "الصقر الأحمر";
                this.nameEn = "RED HAWK";
                this.width = 100;
                this.height = 80;
                this.maxHealth = 50;
                this.health = 50;
                this.score = 2000;
                this.color1 = '#f00';
                this.color2 = '#800';
                this.attackPatterns = ['spread', 'aimed', 'rain'];
                break;
            case 2:
                this.name = "العقرب الذهبي";
                this.nameEn = "GOLDEN SCORPION";
                this.width = 120;
                this.height = 90;
                this.maxHealth = 80;
                this.health = 80;
                this.score = 3500;
                this.color1 = '#ff0';
                this.color2 = '#880';
                this.attackPatterns = ['spiral', 'burst', 'laser', 'aimed'];
                break;
            case 3:
                this.name = "التنين الأخضر";
                this.nameEn = "GREEN DRAGON";
                this.width = 140;
                this.height = 100;
                this.maxHealth = 120;
                this.health = 120;
                this.score = 5000;
                this.color1 = '#0f0';
                this.color2 = '#080';
                this.attackPatterns = ['spiral', 'wave', 'spread', 'summon'];
                break;
            case 4:
                this.name = "فينيكس الظلام";
                this.nameEn = "DARK PHOENIX";
                this.width = 150;
                this.height = 110;
                this.maxHealth = 180;
                this.health = 180;
                this.score = 7500;
                this.color1 = '#f0f';
                this.color2 = '#808';
                this.attackPatterns = ['spiral', 'burst', 'wave', 'laser', 'rain'];
                break;
            default:
                this.name = "أوميغا المدمر";
                this.nameEn = "OMEGA DESTROYER";
                this.width = 160;
                this.height = 120;
                this.maxHealth = 200 + (level - 5) * 50;
                this.health = this.maxHealth;
                this.score = 10000 + (level - 5) * 2000;
                this.color1 = '#fff';
                this.color2 = '#aaa';
                this.attackPatterns = ['spiral', 'burst', 'wave', 'laser', 'rain', 'summon'];
                break;
        }

        this.attackTimer = 0;
        this.attackInterval = Math.max(40, 80 - level * 5);
        this.currentAttack = 0;
        this.moveDirection = 1;
        this.moveSpeed = 1 + level * 0.3;
    }

    update(playerX, playerY) {
        this.animTimer += 0.05;
        this.phaseTimer++;

        // Entry animation
        if (this.entering) {
            this.y += 2;
            if (this.y >= this.targetY) {
                this.entering = false;
                this.y = this.targetY;
            }
            return;
        }

        // Death animation
        if (this.defeated) {
            this.deathTimer++;
            return this.deathTimer > 120;
        }

        // Phase management
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent < 0.3) this.phase = 3;
        else if (healthPercent < 0.6) this.phase = 2;
        else this.phase = 1;

        // Movement
        this.x += this.moveDirection * this.moveSpeed * (this.phase === 3 ? 1.5 : 1);
        if (this.x <= this.width / 2 || this.x >= this.canvas.width - this.width / 2) {
            this.moveDirection *= -1;
        }

        // Vertical bobbing
        this.y = this.targetY + Math.sin(this.animTimer) * 15;

        // Attacks
        this.attackTimer++;
        const attackSpeed = this.attackInterval / this.phase;
        if (this.attackTimer >= attackSpeed) {
            this.performAttack(playerX, playerY);
            this.attackTimer = 0;
        }

        // Update bullets
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.isOffScreen(this.canvas));

        // Flash effect
        if (this.flashTimer > 0) this.flashTimer--;

        return false;
    }

    performAttack(playerX, playerY) {
        const pattern = this.attackPatterns[this.currentAttack % this.attackPatterns.length];
        this.currentAttack++;

        const cx = this.x;
        const cy = this.y + this.height / 2;

        switch (pattern) {
            case 'spread':
                this.attackSpread(cx, cy);
                break;
            case 'aimed':
                this.attackAimed(cx, cy, playerX, playerY);
                break;
            case 'rain':
                this.attackRain(cx, cy);
                break;
            case 'spiral':
                this.attackSpiral(cx, cy);
                break;
            case 'burst':
                this.attackBurst(cx, cy);
                break;
            case 'wave':
                this.attackWave(cx, cy);
                break;
            case 'laser':
                this.attackLaser(cx, cy, playerX, playerY);
                break;
        }
    }

    attackSpread(cx, cy) {
        const count = 5 + this.phase * 2;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI + Math.PI * 0.0;
            const speed = 3 + this.phase;
            this.bullets.push(new EnemyBullet(cx, cy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                { color: this.color1, size: 5 }
            ));
        }
    }

    attackAimed(cx, cy, playerX, playerY) {
        const angle = Utils.angle(cx, cy, playerX, playerY);
        const speed = 5;
        for (let i = -1; i <= 1; i++) {
            this.bullets.push(new EnemyBullet(cx, cy,
                Math.cos(angle + i * 0.15) * speed,
                Math.sin(angle + i * 0.15) * speed,
                { color: '#f80', size: 6 }
            ));
        }
    }

    attackRain(cx, cy) {
        for (let i = 0; i < 8; i++) {
            const x = cx + Utils.random(-60, 60);
            this.bullets.push(new EnemyBullet(x, cy,
                Utils.random(-0.5, 0.5),
                Utils.random(3, 6),
                { color: '#0ff', size: 4 }
            ));
        }
    }

    attackSpiral(cx, cy) {
        const baseAngle = this.phaseTimer * 0.1;
        for (let i = 0; i < 4; i++) {
            const angle = baseAngle + (i / 4) * Math.PI * 2;
            const speed = 3;
            this.bullets.push(new EnemyBullet(cx, cy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                { color: '#f0f', size: 5 }
            ));
        }
    }

    attackBurst(cx, cy) {
        const count = 12 + this.phase * 4;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            this.bullets.push(new EnemyBullet(cx, cy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                { color: '#ff0', size: 4 }
            ));
        }
    }

    attackWave(cx, cy) {
        for (let i = -3; i <= 3; i++) {
            this.bullets.push(new EnemyBullet(cx + i * 20, cy,
                Math.sin(i) * 1.5,
                4,
                { color: '#0f0', size: 5 }
            ));
        }
    }

    attackLaser(cx, cy, playerX, playerY) {
        const angle = Utils.angle(cx, cy, playerX, playerY);
        for (let i = 0; i < 10; i++) {
            const speed = 5 + i * 0.5;
            this.bullets.push(new EnemyBullet(cx, cy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                { color: '#f00', size: 3 }
            ));
        }
    }

    hit(damage = 1) {
        if (this.entering || this.defeated) return false;
        this.health -= damage;
        this.flashTimer = 8;
        
        if (this.health <= 0) {
            this.health = 0;
            this.defeated = true;
            this.bullets = [];
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();

        if (this.entering) {
            this.drawBossShip(ctx);
            ctx.restore();
            this.bullets.forEach(b => b.draw(ctx));
            return;
        }

        if (this.defeated) {
            this.drawDeathAnimation(ctx);
            ctx.restore();
            return;
        }

        // Flash effect
        if (this.flashTimer > 0) {
            ctx.globalAlpha = 0.6 + Math.sin(this.flashTimer) * 0.4;
        }

        this.drawBossShip(ctx);

        ctx.restore();

        // Draw bullets
        this.bullets.forEach(b => b.draw(ctx));
    }

    drawBossShip(ctx) {
        const x = this.x - this.width / 2;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        // Aura effect
        const pulse = Math.sin(this.animTimer * 2) * 0.3 + 0.5;
        ctx.shadowBlur = 20 + pulse * 10;
        ctx.shadowColor = this.color1;

        // Main body
        ctx.fillStyle = this.color2;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h); // Bottom center
        ctx.lineTo(x, y + h * 0.5); // Left
        ctx.lineTo(x + w * 0.1, y + h * 0.2); // Upper left
        ctx.lineTo(x + w * 0.3, y); // Top left
        ctx.lineTo(x + w * 0.7, y); // Top right
        ctx.lineTo(x + w * 0.9, y + h * 0.2); // Upper right
        ctx.lineTo(x + w, y + h * 0.5); // Right
        ctx.closePath();
        ctx.fill();

        // Wings
        ctx.fillStyle = this.color2;
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.4);
        ctx.lineTo(x - 20, y + h * 0.6);
        ctx.lineTo(x - 15, y + h * 0.8);
        ctx.lineTo(x + 10, y + h * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + w, y + h * 0.4);
        ctx.lineTo(x + w + 20, y + h * 0.6);
        ctx.lineTo(x + w + 15, y + h * 0.8);
        ctx.lineTo(x + w - 10, y + h * 0.6);
        ctx.closePath();
        ctx.fill();

        // Core
        const coreGrad = ctx.createRadialGradient(
            x + w / 2, y + h * 0.4, 5,
            x + w / 2, y + h * 0.4, 20
        );
        coreGrad.addColorStop(0, '#fff');
        coreGrad.addColorStop(0.5, this.color1);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.4, 20, 0, Math.PI * 2);
        ctx.fill();

        // Phase indicators
        if (this.phase >= 2) {
            ctx.strokeStyle = this.color1;
            ctx.lineWidth = 2;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.4, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.phase >= 3) {
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.4, 40, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Cannons
        ctx.fillStyle = '#333';
        ctx.fillRect(x + w * 0.2 - 4, y + h * 0.7, 8, 15);
        ctx.fillRect(x + w * 0.8 - 4, y + h * 0.7, 8, 15);
        ctx.fillStyle = this.color1;
        ctx.beginPath();
        ctx.arc(x + w * 0.2, y + h * 0.7, 5, 0, Math.PI * 2);
        ctx.arc(x + w * 0.8, y + h * 0.7, 5, 0, Math.PI * 2);
        ctx.fill();

        // Armor details
        ctx.strokeStyle = this.color1;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y + 5);
        ctx.lineTo(x + w * 0.3, y + h * 0.5);
        ctx.moveTo(x + w * 0.7, y + 5);
        ctx.lineTo(x + w * 0.7, y + h * 0.5);
        ctx.stroke();
    }

    drawDeathAnimation(ctx) {
        const x = this.x - this.width / 2;
        const y = this.y;
        const w = this.width;
        const h = this.height;
        
        const progress = this.deathTimer / 120;
        ctx.globalAlpha = 1 - progress;
        
        // Expanding explosion
        const explosionSize = progress * 100;
        const grad = ctx.createRadialGradient(
            this.x, y + h / 2, 0,
            this.x, y + h / 2, explosionSize
        );
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.3, this.color1);
        grad.addColorStop(0.7, this.color2);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, y + h / 2, explosionSize, 0, Math.PI * 2);
        ctx.fill();

        // Ship fragments
        if (this.deathTimer < 60) {
            ctx.globalAlpha = 1 - this.deathTimer / 60;
            this.drawBossShip(ctx);
        }
    }

    getHealthPercent() {
        return this.health / this.maxHealth;
    }
}
