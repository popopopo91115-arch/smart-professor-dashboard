// Player ship class

class Bullet {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.width = options.width || 4;
        this.height = options.height || 12;
        this.speed = options.speed || -10;
        this.damage = options.damage || 1;
        this.color = options.color || '#0ff';
        this.piercing = options.piercing || false;
    }

    update() {
        this.y += this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        
        // Bullet body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        
        // Bullet glow
        ctx.globalAlpha = 0.5;
        ctx.fillRect(this.x - this.width, this.y - 2, this.width * 2, this.height + 4);
        
        ctx.restore();
    }

    isOffScreen(canvasHeight) {
        return this.y < -20 || this.y > canvasHeight + 20;
    }
}

class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 40;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 80;
        this.speed = 6;
        this.lives = 5;
        this.score = 0;
        this.bullets = [];
        this.fireRate = 6;
        this.fireTimer = 0;
        this.weaponLevel = 1;
        this.specialCharge = 0;
        this.maxSpecialCharge = 100;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.thrusterFlicker = 0;
        this.tilt = 0;
        this.shield = false;
        this.shieldTimer = 0;
    }

    update() {
        // Movement
        let dx = 0, dy = 0;
        
        if (Input.isPressed('ArrowLeft') || Input.isPressed('a')) {
            dx = -this.speed;
            this.tilt = Utils.lerp(this.tilt, -0.2, 0.1);
        } else if (Input.isPressed('ArrowRight') || Input.isPressed('d')) {
            dx = this.speed;
            this.tilt = Utils.lerp(this.tilt, 0.2, 0.1);
        } else {
            this.tilt = Utils.lerp(this.tilt, 0, 0.1);
        }

        if (Input.isPressed('ArrowUp') || Input.isPressed('w')) dy = -this.speed;
        if (Input.isPressed('ArrowDown') || Input.isPressed('s')) dy = this.speed;

        this.x = Utils.clamp(this.x + dx, 0, this.canvas.width - this.width);
        this.y = Utils.clamp(this.y + dy, 0, this.canvas.height - this.height);

        // Auto-fire (always shooting)
        this.fireTimer++;
        if (this.fireTimer >= this.fireRate) {
            this.shoot();
            this.fireTimer = 0;
        }

        // Special weapon
        if ((Input.isPressed('z') || Input.isPressed('Z')) && this.specialCharge >= this.maxSpecialCharge) {
            this.fireSpecial();
        }

        // Update bullets
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.isOffScreen(this.canvas.height));

        // Invincibility timer
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // Shield timer
        if (this.shield) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
                this.shield = false;
            }
        }

        // Thruster animation
        this.thrusterFlicker += 0.3;
    }

    shoot() {
        const cx = this.x + this.width / 2;
        const cy = this.y;

        switch (this.weaponLevel) {
            case 1:
                this.bullets.push(new Bullet(cx, cy));
                break;
            case 2:
                this.bullets.push(new Bullet(cx - 8, cy));
                this.bullets.push(new Bullet(cx + 8, cy));
                break;
            case 3:
                this.bullets.push(new Bullet(cx, cy, { speed: -12, damage: 2, color: '#0f0' }));
                this.bullets.push(new Bullet(cx - 12, cy + 5));
                this.bullets.push(new Bullet(cx + 12, cy + 5));
                break;
            case 4:
                this.bullets.push(new Bullet(cx, cy, { speed: -12, damage: 2, color: '#f0f' }));
                this.bullets.push(new Bullet(cx - 10, cy + 5));
                this.bullets.push(new Bullet(cx + 10, cy + 5));
                this.bullets.push(new Bullet(cx - 18, cy + 10, { speed: -8 }));
                this.bullets.push(new Bullet(cx + 18, cy + 10, { speed: -8 }));
                break;
            default:
                this.bullets.push(new Bullet(cx, cy, { speed: -14, damage: 3, color: '#ff0', width: 6 }));
                this.bullets.push(new Bullet(cx - 10, cy + 5, { damage: 2, color: '#f0f' }));
                this.bullets.push(new Bullet(cx + 10, cy + 5, { damage: 2, color: '#f0f' }));
                this.bullets.push(new Bullet(cx - 20, cy + 10));
                this.bullets.push(new Bullet(cx + 20, cy + 10));
                break;
        }
    }

    fireSpecial() {
        this.specialCharge = 0;
        // Fire a spread of powerful bullets
        for (let i = -5; i <= 5; i++) {
            const angle = (i * 10) * Math.PI / 180 - Math.PI / 2;
            this.bullets.push(new Bullet(
                this.x + this.width / 2,
                this.y,
                {
                    speed: -12,
                    damage: 5,
                    color: '#ff0',
                    width: 6,
                    height: 16
                }
            ));
        }
    }

    hit() {
        if (this.invincible || this.shield) return false;
        this.lives--;
        this.invincible = true;
        this.invincibleTimer = 120; // 2 seconds at 60fps
        if (this.weaponLevel > 1) this.weaponLevel--;
        return true;
    }

    addSpecialCharge(amount = 5) {
        this.specialCharge = Math.min(this.specialCharge + amount, this.maxSpecialCharge);
    }

    draw(ctx) {
        ctx.save();

        // Blinking when invincible
        if (this.invincible && Math.floor(this.invincibleTimer / 4) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.translate(cx, cy);
        ctx.rotate(this.tilt);
        ctx.translate(-cx, -cy);

        // Thruster flames
        this.drawThrusters(ctx);

        // Ship body
        this.drawShip(ctx);

        // Shield effect
        if (this.shield) {
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#0ff';
            ctx.beginPath();
            ctx.arc(cx, cy, 35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = '#0ff';
            ctx.fill();
        }

        ctx.restore();

        // Draw bullets
        this.bullets.forEach(b => b.draw(ctx));
    }

    drawThrusters(ctx) {
        const cx = this.x + this.width / 2;
        const baseY = this.y + this.height;
        const flicker = Math.sin(this.thrusterFlicker) * 5 + 15;

        // Main thruster
        const gradient = ctx.createLinearGradient(cx, baseY, cx, baseY + flicker);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, '#0af');
        gradient.addColorStop(0.7, '#06f');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(cx - 6, baseY);
        ctx.lineTo(cx + 6, baseY);
        ctx.lineTo(cx + 2, baseY + flicker);
        ctx.lineTo(cx - 2, baseY + flicker);
        ctx.closePath();
        ctx.fill();

        // Side thrusters
        const sideFlicker = Math.sin(this.thrusterFlicker * 1.5) * 3 + 8;
        const sideGrad = ctx.createLinearGradient(0, baseY - 5, 0, baseY + sideFlicker);
        sideGrad.addColorStop(0, '#0ff');
        sideGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sideGrad;

        // Left thruster
        ctx.beginPath();
        ctx.moveTo(this.x + 5, baseY - 5);
        ctx.lineTo(this.x + 9, baseY - 5);
        ctx.lineTo(this.x + 8, baseY + sideFlicker);
        ctx.lineTo(this.x + 6, baseY + sideFlicker);
        ctx.closePath();
        ctx.fill();

        // Right thruster
        ctx.beginPath();
        ctx.moveTo(this.x + this.width - 9, baseY - 5);
        ctx.lineTo(this.x + this.width - 5, baseY - 5);
        ctx.lineTo(this.x + this.width - 6, baseY + sideFlicker);
        ctx.lineTo(this.x + this.width - 8, baseY + sideFlicker);
        ctx.closePath();
        ctx.fill();
    }

    drawShip(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        // Ship shadow/glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#0af';

        // Main body
        ctx.fillStyle = '#1a3a5a';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y); // Nose
        ctx.lineTo(x + w - 5, y + h * 0.6); // Right wing joint
        ctx.lineTo(x + w, y + h * 0.7); // Right wing tip
        ctx.lineTo(x + w - 3, y + h * 0.85); // Right wing back
        ctx.lineTo(x + w - 8, y + h); // Right tail
        ctx.lineTo(x + 8, y + h); // Left tail
        ctx.lineTo(x + 3, y + h * 0.85); // Left wing back
        ctx.lineTo(x, y + h * 0.7); // Left wing tip
        ctx.lineTo(x + 5, y + h * 0.6); // Left wing joint
        ctx.closePath();
        ctx.fill();

        // Cockpit
        const cockpitGrad = ctx.createLinearGradient(x + w / 2, y + 8, x + w / 2, y + h * 0.5);
        cockpitGrad.addColorStop(0, '#0ff');
        cockpitGrad.addColorStop(1, '#036');
        ctx.fillStyle = cockpitGrad;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.35, 6, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing details
        ctx.strokeStyle = '#0af';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + h * 0.5);
        ctx.lineTo(x + 2, y + h * 0.75);
        ctx.moveTo(x + w - 8, y + h * 0.5);
        ctx.lineTo(x + w - 2, y + h * 0.75);
        ctx.stroke();

        // Engine lights
        ctx.fillStyle = '#0ff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#0ff';
        ctx.beginPath();
        ctx.arc(x + 10, y + h * 0.7, 2, 0, Math.PI * 2);
        ctx.arc(x + w - 10, y + h * 0.7, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    reset(canvas) {
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 80;
        this.lives = 5;
        this.score = 0;
        this.bullets = [];
        this.weaponLevel = 1;
        this.specialCharge = 0;
        this.invincible = false;
        this.shield = false;
        this.tilt = 0;
    }
}
