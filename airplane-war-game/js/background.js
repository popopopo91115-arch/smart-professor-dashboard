// Scrolling space background with stars and nebulas

class Star {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
        this.y = Utils.random(0, canvas.height);
    }

    reset() {
        this.x = Utils.random(0, this.canvas.width);
        this.y = -5;
        this.size = Utils.random(0.5, 2.5);
        this.speed = this.size * 1.5;
        this.brightness = Utils.random(0.3, 1);
        this.twinkle = Utils.random(0, Math.PI * 2);
    }

    update() {
        this.y += this.speed;
        this.twinkle += 0.05;
        if (this.y > this.canvas.height) {
            this.reset();
        }
    }

    draw(ctx) {
        const alpha = this.brightness * (0.7 + Math.sin(this.twinkle) * 0.3);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Nebula {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
        this.y = Utils.random(0, canvas.height);
    }

    reset() {
        this.x = Utils.random(0, this.canvas.width);
        this.y = -200;
        this.width = Utils.random(150, 400);
        this.height = Utils.random(100, 300);
        this.color = Utils.randomInt(0, 360);
        this.alpha = Utils.random(0.02, 0.08);
        this.speed = 0.3;
    }

    update() {
        this.y += this.speed;
        if (this.y > this.canvas.height + 200) {
            this.reset();
        }
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.width / 2
        );
        const rgb = Utils.hslToRgb(this.color / 360, 0.8, 0.5);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.alpha})`);
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.alpha * 0.5})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

class ScrollingBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.stars = [];
        this.nebulas = [];

        // Create stars
        for (let i = 0; i < 100; i++) {
            this.stars.push(new Star(canvas));
        }

        // Create nebulas
        for (let i = 0; i < 3; i++) {
            this.nebulas.push(new Nebula(canvas));
        }
    }

    update() {
        this.stars.forEach(s => s.update());
        this.nebulas.forEach(n => n.update());
    }

    draw(ctx) {
        // Deep space background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000010');
        gradient.addColorStop(0.5, '#000820');
        gradient.addColorStop(1, '#100020');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw nebulas (behind stars)
        this.nebulas.forEach(n => n.draw(ctx));

        // Draw stars
        this.stars.forEach(s => s.draw(ctx));
    }
}
