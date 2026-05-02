// Particle system for visual effects

class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || Utils.random(-3, 3);
        this.vy = options.vy || Utils.random(-3, 3);
        this.life = options.life || 1;
        this.decay = options.decay || Utils.random(0.01, 0.03);
        this.size = options.size || Utils.random(2, 6);
        this.color = options.color || '#ff0';
        this.gravity = options.gravity || 0;
        this.shrink = options.shrink !== undefined ? options.shrink : true;
        this.glow = options.glow || false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        if (this.shrink) {
            this.size *= 0.97;
        }
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        
        if (this.glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0 || this.size < 0.5;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // Explosion effect
    explode(x, y, count = 30, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(1, options.speed || 5);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: options.color || this.randomFireColor(),
                size: options.size || Utils.random(2, 8),
                decay: options.decay || Utils.random(0.015, 0.04),
                glow: true,
                gravity: options.gravity || 0.05
            }));
        }
    }

    // Fire trail effect
    fireTrail(x, y, count = 3) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, {
                vx: Utils.random(-0.5, 0.5),
                vy: Utils.random(1, 3),
                color: this.randomFireColor(),
                size: Utils.random(2, 5),
                decay: Utils.random(0.03, 0.06),
                glow: true
            }));
        }
    }

    // Spark effect
    sparks(x, y, count = 10, color = '#0ff') {
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(2, 6);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Utils.random(1, 3),
                decay: Utils.random(0.02, 0.05),
                glow: true
            }));
        }
    }

    // Boss damage effect
    bossDamage(x, y) {
        this.explode(x, y, 15, {
            color: '#f00',
            speed: 3,
            size: Utils.random(3, 6)
        });
        this.sparks(x, y, 8, '#ff0');
    }

    // Power-up collect effect
    powerUpCollect(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const speed = Utils.random(2, 4);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Utils.random(3, 6),
                decay: 0.02,
                glow: true,
                shrink: false
            }));
        }
    }

    // Screen shake data
    shakeScreen(intensity = 5) {
        return {
            x: Utils.random(-intensity, intensity),
            y: Utils.random(-intensity, intensity)
        };
    }

    randomFireColor() {
        const colors = ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00', '#ff0000'];
        return colors[Utils.randomInt(0, colors.length - 1)];
    }

    update() {
        this.particles = this.particles.filter(p => {
            p.update();
            return !p.isDead();
        });
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
    }
}
