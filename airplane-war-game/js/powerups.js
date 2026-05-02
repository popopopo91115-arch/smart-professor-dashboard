// Power-up system

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 24;
        this.height = 24;
        this.speed = 2;
        this.animTimer = 0;
        this.alive = true;

        this.setupType(type);
    }

    setupType(type) {
        switch (type) {
            case 'weapon':
                this.color = '#0f0';
                this.symbol = 'W';
                this.description = 'تحسين السلاح';
                break;
            case 'health':
                this.color = '#f44';
                this.symbol = '+';
                this.description = 'حياة إضافية';
                break;
            case 'shield':
                this.color = '#0ff';
                this.symbol = 'S';
                this.description = 'درع حماية';
                break;
            case 'special':
                this.color = '#ff0';
                this.symbol = 'Z';
                this.description = 'شحن خاص';
                break;
            case 'speed':
                this.color = '#f80';
                this.symbol = '>';
                this.description = 'سرعة';
                break;
        }
    }

    update(canvas) {
        this.y += this.speed;
        this.animTimer += 0.1;

        if (this.y > canvas.height + 30) {
            this.alive = false;
        }
    }

    draw(ctx) {
        ctx.save();
        
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const pulse = Math.sin(this.animTimer * 3) * 3;
        const rotation = this.animTimer;

        // Glow
        ctx.shadowBlur = 15 + pulse;
        ctx.shadowColor = this.color;

        // Outer ring
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 14 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner fill
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();

        // Symbol
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, cx, cy);

        // Sparkle effect
        ctx.globalAlpha = Math.abs(Math.sin(this.animTimer * 2));
        ctx.fillStyle = this.color;
        for (let i = 0; i < 4; i++) {
            const angle = rotation + (i * Math.PI / 2);
            const sparkX = cx + Math.cos(angle) * 18;
            const sparkY = cy + Math.sin(angle) * 18;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    apply(player) {
        switch (this.type) {
            case 'weapon':
                player.weaponLevel = Math.min(player.weaponLevel + 1, 5);
                break;
            case 'health':
                player.lives = Math.min(player.lives + 1, 5);
                break;
            case 'shield':
                player.shield = true;
                player.shieldTimer = 300; // 5 seconds
                break;
            case 'special':
                player.specialCharge = player.maxSpecialCharge;
                break;
            case 'speed':
                player.speed = Math.min(player.speed + 1, 8);
                break;
        }
    }
}

class PowerUpManager {
    constructor() {
        this.powerups = [];
        this.types = ['weapon', 'health', 'shield', 'special', 'speed'];
    }

    spawn(x, y) {
        // Random drop chance
        if (Math.random() < 0.15) {
            const type = this.types[Utils.randomInt(0, this.types.length - 1)];
            this.powerups.push(new PowerUp(x, y, type));
        }
    }

    spawnGuaranteed(x, y, type) {
        if (!type) {
            type = this.types[Utils.randomInt(0, this.types.length - 1)];
        }
        this.powerups.push(new PowerUp(x, y, type));
    }

    update(canvas) {
        this.powerups.forEach(p => p.update(canvas));
        this.powerups = this.powerups.filter(p => p.alive);
    }

    draw(ctx) {
        this.powerups.forEach(p => p.draw(ctx));
    }

    checkCollision(player, particleSystem) {
        this.powerups = this.powerups.filter(p => {
            if (Utils.collides(p, player)) {
                p.apply(player);
                particleSystem.powerUpCollect(
                    p.x + p.width / 2,
                    p.y + p.height / 2,
                    p.color
                );
                return false;
            }
            return true;
        });
    }

    clear() {
        this.powerups = [];
    }
}
