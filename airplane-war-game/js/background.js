// New York City skyline background - scrolling cityscape

class Star {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
        this.y = Utils.random(0, canvas.height * 0.4);
    }

    reset() {
        this.x = Utils.random(0, this.canvas.width);
        this.y = Utils.random(0, this.canvas.height * 0.3);
        this.size = Utils.random(0.5, 2);
        this.brightness = Utils.random(0.3, 1);
        this.twinkle = Utils.random(0, Math.PI * 2);
    }

    update() {
        this.twinkle += 0.03;
    }

    draw(ctx) {
        const alpha = this.brightness * (0.5 + Math.sin(this.twinkle) * 0.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Building {
    constructor(canvas, x, width, height, layer) {
        this.canvas = canvas;
        this.x = x;
        this.baseWidth = width;
        this.baseHeight = height;
        this.layer = layer; // 0 = far, 1 = mid, 2 = near
        this.y = canvas.height - height;
        this.windows = [];
        this.color = this.getLayerColor();
        this.speed = (layer + 1) * 0.3;
        this.generateWindows();
        this.hasAntenna = Math.random() > 0.7;
        this.antennaHeight = Utils.random(15, 40);
        this.hasSpire = Math.random() > 0.8;
    }

    getLayerColor() {
        switch (this.layer) {
            case 0: return { base: '#0a0a1a', window: '#334' };
            case 1: return { base: '#0f0f25', window: '#445' };
            case 2: return { base: '#141430', window: '#556' };
            default: return { base: '#0a0a1a', window: '#334' };
        }
    }

    generateWindows() {
        const cols = Math.floor(this.baseWidth / 10);
        const rows = Math.floor(this.baseHeight / 15);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.3) {
                    this.windows.push({
                        rx: c * 10 + 4,
                        ry: r * 15 + 8,
                        lit: Math.random() > 0.4,
                        flicker: Utils.random(0, Math.PI * 2),
                        color: this.randomWindowColor()
                    });
                }
            }
        }
    }

    randomWindowColor() {
        const colors = ['#ffdd44', '#ffcc33', '#ffffaa', '#aaddff', '#ffffff', '#ff9944'];
        return colors[Utils.randomInt(0, colors.length - 1)];
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.baseWidth < -10) {
            this.x = this.canvas.width + Utils.random(0, 50);
            this.baseHeight = Utils.random(100, this.canvas.height * 0.6);
            this.y = this.canvas.height - this.baseHeight;
            this.windows = [];
            this.generateWindows();
            this.hasAntenna = Math.random() > 0.7;
            this.hasSpire = Math.random() > 0.8;
        }
    }

    draw(ctx) {
        // Building body
        ctx.fillStyle = this.color.base;
        ctx.fillRect(this.x, this.y, this.baseWidth, this.baseHeight);

        // Building top shape variations
        ctx.fillStyle = this.color.base;
        if (this.hasSpire) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.baseWidth * 0.3, this.y);
            ctx.lineTo(this.x + this.baseWidth * 0.5, this.y - 30);
            ctx.lineTo(this.x + this.baseWidth * 0.7, this.y);
            ctx.fill();
        }

        // Antenna
        if (this.hasAntenna) {
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + this.baseWidth / 2, this.y);
            ctx.lineTo(this.x + this.baseWidth / 2, this.y - this.antennaHeight);
            ctx.stroke();
            // Blinking light
            if (Math.sin(Date.now() * 0.003) > 0) {
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.arc(this.x + this.baseWidth / 2, this.y - this.antennaHeight, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Windows
        this.windows.forEach(w => {
            if (w.lit) {
                const flicker = Math.sin(w.flicker + Date.now() * 0.001) * 0.2 + 0.8;
                ctx.globalAlpha = flicker * (this.layer === 0 ? 0.4 : this.layer === 1 ? 0.6 : 0.8);
                ctx.fillStyle = w.color;
                ctx.fillRect(this.x + w.rx, this.y + w.ry, 5, 8);
                ctx.globalAlpha = 1;
            }
        });

        // Edge highlights
        ctx.strokeStyle = `rgba(100, 150, 255, ${0.05 + this.layer * 0.03})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.baseWidth, this.baseHeight);
    }
}

class Cloud {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
        this.x = Utils.random(0, canvas.width);
    }

    reset() {
        this.x = this.canvas.width + Utils.random(50, 200);
        this.y = Utils.random(20, this.canvas.height * 0.35);
        this.width = Utils.random(80, 200);
        this.height = Utils.random(20, 50);
        this.speed = Utils.random(0.2, 0.8);
        this.alpha = Utils.random(0.03, 0.12);
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) {
            this.reset();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#aaccff';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x - this.width * 0.2, this.y + 5, this.width * 0.3, this.height * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + this.width * 0.2, this.y - 3, this.width * 0.25, this.height * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ScrollingBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.stars = [];
        this.buildings = [];
        this.clouds = [];
        this.time = 0;

        // Create stars
        for (let i = 0; i < 60; i++) {
            this.stars.push(new Star(canvas));
        }

        // Create buildings in 3 layers (parallax)
        this.generateBuildings();

        // Create clouds
        for (let i = 0; i < 5; i++) {
            this.clouds.push(new Cloud(canvas));
        }
    }

    generateBuildings() {
        // Far layer (small, dark)
        let x = 0;
        while (x < this.canvas.width + 100) {
            const w = Utils.random(20, 50);
            const h = Utils.random(80, 200);
            this.buildings.push(new Building(this.canvas, x, w, h, 0));
            x += w + Utils.random(2, 8);
        }

        // Mid layer
        x = 0;
        while (x < this.canvas.width + 100) {
            const w = Utils.random(30, 70);
            const h = Utils.random(120, 300);
            this.buildings.push(new Building(this.canvas, x, w, h, 1));
            x += w + Utils.random(5, 20);
        }

        // Near layer (large, detailed)
        x = 0;
        while (x < this.canvas.width + 100) {
            const w = Utils.random(40, 90);
            const h = Utils.random(150, 380);
            this.buildings.push(new Building(this.canvas, x, w, h, 2));
            x += w + Utils.random(10, 30);
        }
    }

    update() {
        this.time += 0.01;
        this.stars.forEach(s => s.update());
        this.buildings.forEach(b => b.update());
        this.clouds.forEach(c => c.update());
    }

    draw(ctx) {
        // Night sky gradient (NYC at night)
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#020118');
        gradient.addColorStop(0.2, '#0a0530');
        gradient.addColorStop(0.4, '#150a40');
        gradient.addColorStop(0.7, '#1a1045');
        gradient.addColorStop(1, '#0d0825');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Moon
        this.drawMoon(ctx);

        // Stars
        this.stars.forEach(s => s.draw(ctx));

        // Clouds
        this.clouds.forEach(c => c.draw(ctx));

        // Buildings by layer (far to near)
        const sorted = [...this.buildings].sort((a, b) => a.layer - b.layer);
        sorted.forEach(b => b.draw(ctx));

        // City glow at horizon
        this.drawCityGlow(ctx);

        // NYC label (subtle)
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#aaccff';
        ctx.font = '10px Arial';
        ctx.fillText('NEW YORK CITY', 10, this.canvas.height - 10);
        ctx.restore();
    }

    drawMoon(ctx) {
        const moonX = 650;
        const moonY = 60;
        const moonRadius = 25;

        // Moon glow
        const glow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.5, moonX, moonY, moonRadius * 3);
        glow.addColorStop(0, 'rgba(200, 220, 255, 0.15)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Moon body
        ctx.fillStyle = '#ddeeff';
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        ctx.fill();

        // Moon craters
        ctx.fillStyle = 'rgba(150, 170, 200, 0.3)';
        ctx.beginPath();
        ctx.arc(moonX - 8, moonY - 5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX + 5, moonY + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX + 10, moonY - 8, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCityGlow(ctx) {
        const glowGradient = ctx.createLinearGradient(0, this.canvas.height - 100, 0, this.canvas.height);
        glowGradient.addColorStop(0, 'transparent');
        glowGradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.05)');
        glowGradient.addColorStop(1, 'rgba(255, 100, 30, 0.1)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);

        // Light pollution haze
        const haze = ctx.createLinearGradient(0, this.canvas.height * 0.5, 0, this.canvas.height);
        haze.addColorStop(0, 'transparent');
        haze.addColorStop(1, 'rgba(80, 60, 120, 0.08)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, this.canvas.height * 0.5, this.canvas.width, this.canvas.height * 0.5);
    }
}
