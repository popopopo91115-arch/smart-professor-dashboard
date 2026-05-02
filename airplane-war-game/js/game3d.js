// SKY WARRIORS 3D - Complete Three.js Airplane War Game
// Endless Survival Mode with Boss System, Power-ups, and Progressive Difficulty

const GAME_BOUNDS = { x: 18, y: 12, z: 50 };
const BOSS_INTERVAL = 7200; // 2 minutes at 60fps

// ============= UTILITY =============
function lerp(a, b, t) { return a + (b - a) * t; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(randFloat(min, max + 1)); }

// ============= MAIN GAME CLASS =============
class Game3D {
    constructor() {
        this.state = 'menu';
        this.score = 0;
        this.lives = 5;
        this.gameTime = 0;
        this.lastBossTime = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldDuration = 600;

        this.keys = {};
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerups = [];
        this.boss = null;
        this.bossPhase = 'none';
        this.bossWarningTimer = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.fireTimer = 0;
        this.fireRate = 8;
        this.weaponLevel = 1;

        this.initThree();
        this.initLights();
        this.initEnvironment();
        this.initPlayer();
        this.setupInput();
        this.setupUI();
        this.animate();
    }

    // ============= THREE.JS SETUP =============
    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x001133, 0.008);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 18, 22);
        this.camera.lookAt(0, 0, -5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').prepend(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initLights() {
        const ambient = new THREE.AmbientLight(0x334466, 0.6);
        this.scene.add(ambient);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.position.set(5, 20, 10);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.sunLight.shadow.camera.near = 1;
        this.sunLight.shadow.camera.far = 60;
        this.sunLight.shadow.camera.left = -25;
        this.sunLight.shadow.camera.right = 25;
        this.sunLight.shadow.camera.top = 25;
        this.sunLight.shadow.camera.bottom = -25;
        this.scene.add(this.sunLight);

        const rim = new THREE.DirectionalLight(0x0088ff, 0.4);
        rim.position.set(-3, 5, -10);
        this.scene.add(rim);

        const point = new THREE.PointLight(0x00aaff, 0.5, 30);
        point.position.set(0, 5, 5);
        this.scene.add(point);
    }

    initEnvironment() {
        // Starfield
        const starGeom = new THREE.BufferGeometry();
        const starPositions = [];
        for (let i = 0; i < 2000; i++) {
            starPositions.push(randFloat(-100, 100), randFloat(10, 80), randFloat(-100, -20));
        }
        starGeom.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 });
        this.stars = new THREE.Points(starGeom, starMat);
        this.scene.add(this.stars);

        // Ground plane (scrolling terrain)
        this.groundTiles = [];
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x0a1628,
            roughness: 0.8,
            metalness: 0.2
        });
        for (let i = 0; i < 4; i++) {
            const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.set(0, -2, -i * 50 + 25);
            ground.receiveShadow = true;
            this.scene.add(ground);
            this.groundTiles.push(ground);
        }

        // Grid lines on ground
        const gridHelper = new THREE.GridHelper(200, 40, 0x003355, 0x001a33);
        gridHelper.position.y = -1.9;
        this.scene.add(gridHelper);
        this.gridHelper = gridHelper;

        // Clouds
        this.clouds = [];
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xaaccff, transparent: true, opacity: 0.3
        });
        for (let i = 0; i < 15; i++) {
            const cloud = new THREE.Mesh(
                new THREE.SphereGeometry(randFloat(2, 5), 8, 6),
                cloudMat
            );
            cloud.position.set(randFloat(-30, 30), randFloat(8, 20), randFloat(-60, -10));
            cloud.scale.set(randFloat(1, 3), 0.5, 1);
            this.scene.add(cloud);
            this.clouds.push(cloud);
        }

        // City buildings (scrolling)
        this.buildings = [];
        for (let i = 0; i < 20; i++) {
            this.spawnBuilding(randFloat(-60, 60));
        }
    }

    spawnBuilding(z) {
        const w = randFloat(1.5, 4);
        const h = randFloat(3, 15);
        const d = randFloat(1.5, 4);
        const geom = new THREE.BoxGeometry(w, h, d);
        const color = new THREE.Color().setHSL(0.6, randFloat(0.1, 0.3), randFloat(0.05, 0.15));
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3 });
        const building = new THREE.Mesh(geom, mat);

        const side = Math.random() > 0.5 ? 1 : -1;
        building.position.set(
            side * randFloat(12, 30),
            h / 2 - 2,
            z || randFloat(-80, -10)
        );
        building.castShadow = true;
        building.receiveShadow = true;

        // Windows
        const windowMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
        const wCols = Math.floor(w / 1.2);
        const wRows = Math.floor(h / 1.5);
        for (let r = 0; r < wRows; r++) {
            for (let c = 0; c < wCols; c++) {
                if (Math.random() > 0.4) {
                    const win = new THREE.Mesh(
                        new THREE.PlaneGeometry(0.3, 0.4),
                        windowMat.clone()
                    );
                    win.material.color.setHSL(0.14, 0.8, randFloat(0.3, 0.7));
                    win.position.set(
                        -w / 2 + 0.6 + c * 1.2,
                        -h / 2 + 1 + r * 1.5,
                        d / 2 + 0.01
                    );
                    building.add(win);
                }
            }
        }

        this.scene.add(building);
        this.buildings.push(building);
        return building;
    }

    // ============= PLAYER =============
    initPlayer() {
        this.playerGroup = new THREE.Group();

        // Fuselage
        const bodyGeom = new THREE.ConeGeometry(0.6, 3, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2266cc, roughness: 0.3, metalness: 0.7
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.x = Math.PI / 2;
        body.castShadow = true;
        this.playerGroup.add(body);

        // Cockpit
        const cockpitGeom = new THREE.SphereGeometry(0.4, 8, 6);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x88eeff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8
        });
        const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat);
        cockpit.position.set(0, 0.3, -0.3);
        cockpit.scale.set(1, 0.6, 1.2);
        this.playerGroup.add(cockpit);

        // Wings
        const wingGeom = new THREE.BoxGeometry(4, 0.08, 1.2);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x1a4488, roughness: 0.4, metalness: 0.6
        });
        const wings = new THREE.Mesh(wingGeom, wingMat);
        wings.position.set(0, -0.1, 0.2);
        wings.castShadow = true;
        this.playerGroup.add(wings);

        // Tail wing
        const tailGeom = new THREE.BoxGeometry(1.5, 0.06, 0.6);
        const tail = new THREE.Mesh(tailGeom, wingMat);
        tail.position.set(0, 0.1, 1.3);
        this.playerGroup.add(tail);

        // Tail fin
        const finGeom = new THREE.BoxGeometry(0.08, 0.8, 0.6);
        const fin = new THREE.Mesh(finGeom, wingMat);
        fin.position.set(0, 0.4, 1.3);
        this.playerGroup.add(fin);

        // Engine glow
        const engineGeom = new THREE.ConeGeometry(0.3, 1.5, 6);
        const engineMat = new THREE.MeshBasicMaterial({
            color: 0x00ccff, transparent: true, opacity: 0.6
        });
        this.engineFlame = new THREE.Mesh(engineGeom, engineMat);
        this.engineFlame.rotation.x = -Math.PI / 2;
        this.engineFlame.position.set(0, -0.1, 1.8);
        this.playerGroup.add(this.engineFlame);

        // Wing tip lights
        const tipMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.08), tipMat);
        tipL.position.set(-2, 0, 0.2);
        this.playerGroup.add(tipL);
        const tipR = new THREE.Mesh(new THREE.SphereGeometry(0.08), tipMat.clone());
        tipR.position.set(2, 0, 0.2);
        this.playerGroup.add(tipR);
        this.wingTips = [tipL, tipR];

        // Shield mesh (hidden by default)
        const shieldGeom = new THREE.SphereGeometry(2.5, 16, 12);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00aaff, transparent: true, opacity: 0, wireframe: true
        });
        this.shieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
        this.playerGroup.add(this.shieldMesh);

        this.playerGroup.position.set(0, 0, 8);
        this.scene.add(this.playerGroup);

        this.playerSpeed = 0.3;
        this.playerTilt = 0;
    }

    // ============= INPUT =============
    setupInput() {
        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === 'p' || e.key === 'P') {
                if (this.state === 'playing') this.pauseGame();
                else if (this.state === 'paused') this.resumeGame();
            }
        });
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
    }

    setupUI() {
        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('controls-btn').onclick = () => this.showOverlay('controls-menu');
        document.getElementById('back-from-controls').onclick = () => this.showOverlay('main-menu');
        document.getElementById('restart-btn').onclick = () => this.startGame();
        document.getElementById('menu-btn').onclick = () => {
            this.state = 'menu';
            this.showOverlay('main-menu');
        };
        document.getElementById('resume-btn').onclick = () => this.resumeGame();
        document.getElementById('quit-btn').onclick = () => {
            this.state = 'menu';
            this.showOverlay('main-menu');
        };
    }

    showOverlay(id) {
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        if (id) document.getElementById(id).classList.remove('hidden');
    }

    // ============= GAME STATES =============
    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.lives = 5;
        this.gameTime = 0;
        this.lastBossTime = 0;
        this.bossPhase = 'none';
        this.bossWarningTimer = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.invincible = false;
        this.weaponLevel = 1;
        this.fireTimer = 0;

        this.clearEntities();
        this.playerGroup.position.set(0, 0, 8);

        this.showOverlay(null);
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('boss-health-container').classList.add('hidden');
        document.getElementById('powerup-indicator').classList.add('hidden');
    }

    pauseGame() {
        this.state = 'paused';
        this.showOverlay('pause-menu');
    }

    resumeGame() {
        this.state = 'playing';
        this.showOverlay(null);
    }

    gameOver() {
        this.state = 'gameover';
        const minutes = Math.floor(this.gameTime / 3600);
        const seconds = Math.floor((this.gameTime % 3600) / 60);
        document.getElementById('final-score').textContent = `Score: ${this.score.toLocaleString()}`;
        document.getElementById('final-time').textContent = `Survived: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('hud').classList.add('hidden');
        this.showOverlay('game-over');
    }

    clearEntities() {
        this.enemies.forEach(e => this.scene.remove(e.mesh));
        this.bullets.forEach(b => this.scene.remove(b.mesh));
        this.enemyBullets.forEach(b => this.scene.remove(b.mesh));
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.powerups.forEach(p => this.scene.remove(p.mesh));
        if (this.boss) { this.scene.remove(this.boss.mesh); this.boss = null; }
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerups = [];
    }

    // ============= MAIN LOOP =============
    animate() {
        requestAnimationFrame(() => this.animate());

        this.updateEnvironment();

        if (this.state === 'playing') {
            this.gameTime++;
            this.updatePlayer();
            this.updateBullets();
            this.updateEnemies();
            this.updateBoss();
            this.updatePowerups();
            this.updateParticles();
            this.checkCollisions();
            this.spawnLogic();
            this.updateHUD();
        }

        this.renderer.render(this.scene, this.camera);
    }

    // ============= ENVIRONMENT =============
    updateEnvironment() {
        // Scroll ground
        const scrollSpeed = this.state === 'playing' ? 0.15 : 0.05;
        this.groundTiles.forEach(tile => {
            tile.position.z += scrollSpeed;
            if (tile.position.z > 50) tile.position.z -= 200;
        });

        this.gridHelper.position.z = (this.gridHelper.position.z + scrollSpeed) % 5;

        // Scroll buildings
        this.buildings.forEach(b => {
            b.position.z += scrollSpeed * 0.8;
            if (b.position.z > 30) {
                b.position.z = randFloat(-80, -60);
                b.position.x = (Math.random() > 0.5 ? 1 : -1) * randFloat(12, 30);
            }
        });

        // Scroll clouds
        this.clouds.forEach(c => {
            c.position.z += scrollSpeed * 0.3;
            if (c.position.z > 20) {
                c.position.z = randFloat(-60, -40);
                c.position.x = randFloat(-30, 30);
            }
        });

        // Day/night cycle
        const cycle = (this.gameTime * 0.0001) % 1;
        const sunAngle = cycle * Math.PI * 2;
        this.sunLight.position.set(
            Math.cos(sunAngle) * 20,
            Math.abs(Math.sin(sunAngle)) * 20 + 5,
            Math.sin(sunAngle) * 10
        );

        const isDark = Math.sin(sunAngle) < 0;
        const intensity = isDark ? 0.3 : 1.2;
        this.sunLight.intensity = lerp(this.sunLight.intensity, intensity, 0.01);

        const fogDensity = isDark ? 0.012 : 0.008;
        this.scene.fog.density = lerp(this.scene.fog.density, fogDensity, 0.01);
    }

    // ============= PLAYER UPDATE =============
    updatePlayer() {
        const p = this.playerGroup.position;
        let dx = 0, dz = 0;

        if (this.keys['a'] || this.keys['arrowleft']) dx = -this.playerSpeed;
        if (this.keys['d'] || this.keys['arrowright']) dx = this.playerSpeed;
        if (this.keys['w'] || this.keys['arrowup']) dz = -this.playerSpeed;
        if (this.keys['s'] || this.keys['arrowdown']) dz = this.playerSpeed;

        p.x = Math.max(-GAME_BOUNDS.x, Math.min(GAME_BOUNDS.x, p.x + dx));
        p.z = Math.max(-5, Math.min(12, p.z + dz));

        // Tilt
        const targetTilt = -dx * 8;
        this.playerTilt = lerp(this.playerTilt, targetTilt, 0.1);
        this.playerGroup.rotation.z = this.playerTilt * 0.05;
        this.playerGroup.rotation.x = dz * 0.3;

        // Engine flame animation
        const flameScale = 0.7 + Math.sin(this.gameTime * 0.3) * 0.3;
        this.engineFlame.scale.set(1, flameScale, 1);
        this.engineFlame.material.opacity = 0.4 + Math.sin(this.gameTime * 0.5) * 0.2;

        // Wing tip lights pulse
        this.wingTips.forEach(tip => {
            tip.material.opacity = 0.5 + Math.sin(this.gameTime * 0.1) * 0.5;
        });

        // Shield
        if (this.shieldActive) {
            this.shieldTimer--;
            this.shieldMesh.material.opacity = 0.15 + Math.sin(this.gameTime * 0.1) * 0.05;
            this.shieldMesh.rotation.y += 0.02;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.shieldMesh.material.opacity = 0;
                document.getElementById('powerup-indicator').classList.add('hidden');
            }
        }

        // Invincibility
        if (this.invincible) {
            this.invincibleTimer--;
            this.playerGroup.visible = Math.floor(this.invincibleTimer / 5) % 2 === 0;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.playerGroup.visible = true;
            }
        }

        // Auto-fire
        this.fireTimer++;
        if (this.fireTimer >= this.fireRate) {
            this.shoot();
            this.fireTimer = 0;
        }
    }

    // ============= SHOOTING =============
    shoot() {
        const p = this.playerGroup.position;
        const createBullet = (offsetX) => {
            const geom = new THREE.SphereGeometry(0.15, 6, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(p.x + offsetX, p.y, p.z - 1.5);

            // Glow
            const glowGeom = new THREE.SphereGeometry(0.3, 6, 4);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x00aaff, transparent: true, opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeom, glowMat);
            mesh.add(glow);

            this.scene.add(mesh);
            this.bullets.push({ mesh, speed: -0.8, damage: this.weaponLevel });
        };

        if (this.weaponLevel >= 3) {
            createBullet(-0.8);
            createBullet(0);
            createBullet(0.8);
        } else if (this.weaponLevel >= 2) {
            createBullet(-0.5);
            createBullet(0.5);
        } else {
            createBullet(0);
        }
    }

    // ============= ENEMIES =============
    spawnLogic() {
        // Progressive difficulty
        const minutesSurvived = this.gameTime / 3600;
        const spawnInterval = Math.max(20, 80 - minutesSurvived * 8);

        if (this.gameTime % Math.round(spawnInterval) === 0 && this.bossPhase === 'none') {
            this.spawnEnemy();
        }

        // Special enemy (drops powerups)
        if (this.gameTime % 600 === 0 && this.bossPhase === 'none') {
            this.spawnSpecialEnemy();
        }

        // Boss every 2 minutes
        if (this.bossPhase === 'none' && this.gameTime - this.lastBossTime >= BOSS_INTERVAL && this.gameTime > 120) {
            this.bossPhase = 'warning';
            this.bossWarningTimer = 0;
            document.getElementById('boss-warning').classList.remove('hidden');
        }

        if (this.bossPhase === 'warning') {
            this.bossWarningTimer++;
            if (this.bossWarningTimer >= 120) {
                document.getElementById('boss-warning').classList.add('hidden');
                this.spawnBoss();
                this.bossPhase = 'active';
            }
        }
    }

    spawnEnemy() {
        const minutesSurvived = this.gameTime / 3600;
        const x = randFloat(-GAME_BOUNDS.x + 2, GAME_BOUNDS.x - 2);
        const z = randFloat(-50, -30);
        const speed = 0.08 + minutesSurvived * 0.01;

        let type;
        const roll = Math.random();
        if (minutesSurvived >= 3 && roll < 0.08) type = 'elite';
        else if (minutesSurvived >= 2 && roll < 0.2) type = 'shooter';
        else if (minutesSurvived >= 1 && roll < 0.35) type = 'tank';
        else if (roll < 0.55) type = 'fast';
        else type = 'basic';

        const enemy = this.createEnemyMesh(type, x, z, speed);
        this.enemies.push(enemy);
    }

    createEnemyMesh(type, x, z, speed) {
        const group = new THREE.Group();
        let health, score, color, shootInterval;

        switch (type) {
            case 'basic':
                health = 2; score = 100; color = 0xcc3333; shootInterval = 0;
                const basicBody = new THREE.Mesh(
                    new THREE.ConeGeometry(0.5, 2, 6),
                    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 })
                );
                basicBody.rotation.x = -Math.PI / 2;
                group.add(basicBody);
                const basicWing = new THREE.Mesh(
                    new THREE.BoxGeometry(2.5, 0.06, 0.8),
                    new THREE.MeshStandardMaterial({ color: 0x991111 })
                );
                group.add(basicWing);
                break;

            case 'fast':
                health = 1; score = 150; color = 0xff8800; shootInterval = 0;
                speed *= 1.8;
                const fastBody = new THREE.Mesh(
                    new THREE.ConeGeometry(0.3, 2.5, 5),
                    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 })
                );
                fastBody.rotation.x = -Math.PI / 2;
                group.add(fastBody);
                const fastWing = new THREE.Mesh(
                    new THREE.BoxGeometry(1.8, 0.05, 0.5),
                    new THREE.MeshStandardMaterial({ color: 0xcc5500 })
                );
                fastWing.position.z = 0.3;
                group.add(fastWing);
                break;

            case 'tank':
                health = 10; score = 300; color = 0x556688; shootInterval = 90;
                speed *= 0.5;
                const tankBody = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 0.8, 2.5),
                    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4 })
                );
                group.add(tankBody);
                const tankWing = new THREE.Mesh(
                    new THREE.BoxGeometry(3.5, 0.1, 1.2),
                    new THREE.MeshStandardMaterial({ color: 0x334466 })
                );
                tankWing.position.z = 0.3;
                group.add(tankWing);
                // Guns
                const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
                const gunL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1), gunMat);
                gunL.rotation.x = Math.PI / 2;
                gunL.position.set(-0.5, -0.2, -1.3);
                group.add(gunL);
                const gunR = gunL.clone();
                gunR.position.set(0.5, -0.2, -1.3);
                group.add(gunR);
                break;

            case 'shooter':
                health = 5; score = 250; color = 0x9933cc; shootInterval = 60;
                const shooterBody = new THREE.Mesh(
                    new THREE.ConeGeometry(0.5, 2.2, 6),
                    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 })
                );
                shooterBody.rotation.x = -Math.PI / 2;
                group.add(shooterBody);
                const shooterWing = new THREE.Mesh(
                    new THREE.BoxGeometry(3, 0.06, 0.7),
                    new THREE.MeshStandardMaterial({ color: 0x661199 })
                );
                group.add(shooterWing);
                const cannon = new THREE.Mesh(
                    new THREE.SphereGeometry(0.25, 8, 6),
                    new THREE.MeshBasicMaterial({ color: 0xff00ff })
                );
                cannon.position.z = -1.2;
                group.add(cannon);
                break;

            case 'elite':
                health = 30; score = 1500; color = 0xffcc00; shootInterval = 30;
                speed *= 0.7;
                const eliteBody = new THREE.Mesh(
                    new THREE.ConeGeometry(0.8, 3.5, 8),
                    new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.8 })
                );
                eliteBody.rotation.x = -Math.PI / 2;
                group.add(eliteBody);
                const eliteWing = new THREE.Mesh(
                    new THREE.BoxGeometry(4.5, 0.08, 1.2),
                    new THREE.MeshStandardMaterial({ color: 0xcc8800 })
                );
                group.add(eliteWing);
                const eliteGlow = new THREE.PointLight(0xffaa00, 1, 5);
                group.add(eliteGlow);
                break;

            default:
                health = 2; score = 100; color = 0xcc3333; shootInterval = 0;
                const defBody = new THREE.Mesh(
                    new THREE.ConeGeometry(0.5, 2, 6),
                    new THREE.MeshStandardMaterial({ color })
                );
                defBody.rotation.x = -Math.PI / 2;
                group.add(defBody);
                break;
        }

        group.position.set(x, randFloat(-0.5, 1), z);
        this.scene.add(group);

        return {
            mesh: group,
            type,
            health,
            maxHealth: health,
            score,
            speed,
            shootInterval,
            shootTimer: 0,
            pattern: type === 'fast' ? 'zigzag' : type === 'elite' ? 'circle' : 'straight',
            patternTimer: 0,
            alive: true
        };
    }

    spawnSpecialEnemy() {
        const x = randFloat(-GAME_BOUNDS.x + 3, GAME_BOUNDS.x - 3);
        const z = -40;
        const group = new THREE.Group();

        // Diamond-shaped special enemy with green glow
        const bodyGeom = new THREE.OctahedronGeometry(1, 0);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x00ff88, roughness: 0.2, metalness: 0.8, emissive: 0x004422
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.z = Math.PI / 4;
        group.add(body);

        const glow = new THREE.PointLight(0x00ff88, 1.5, 6);
        group.add(glow);

        // Orbiting ring
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.5, 0.05, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.5 })
        );
        group.add(ring);

        group.position.set(x, 0, z);
        this.scene.add(group);

        this.enemies.push({
            mesh: group,
            type: 'special',
            health: 8,
            maxHealth: 8,
            score: 500,
            speed: 0.06,
            shootInterval: 0,
            shootTimer: 0,
            pattern: 'weave',
            patternTimer: 0,
            alive: true,
            ring
        });
    }

    updateEnemies() {
        const playerPos = this.playerGroup.position;

        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;

            enemy.patternTimer++;
            const m = enemy.mesh;

            // Movement
            switch (enemy.pattern) {
                case 'straight':
                    m.position.z += enemy.speed;
                    break;
                case 'zigzag':
                    m.position.z += enemy.speed;
                    m.position.x += Math.sin(enemy.patternTimer * 0.05) * 0.15;
                    break;
                case 'circle':
                    m.position.z += enemy.speed * 0.5;
                    m.position.x += Math.sin(enemy.patternTimer * 0.03) * 0.2;
                    break;
                case 'weave':
                    m.position.z += enemy.speed;
                    m.position.x += Math.sin(enemy.patternTimer * 0.03) * 0.2;
                    m.rotation.y += 0.02;
                    if (enemy.ring) enemy.ring.rotation.x += 0.05;
                    break;
            }

            // Shooting
            if (enemy.shootInterval > 0) {
                enemy.shootTimer++;
                if (enemy.shootTimer >= enemy.shootInterval) {
                    this.enemyShoot(enemy);
                    enemy.shootTimer = 0;
                }
            }

            // Remove if past camera
            if (m.position.z > 20) {
                enemy.alive = false;
                this.scene.remove(m);
            }
        });

        this.enemies = this.enemies.filter(e => e.alive);
    }

    enemyShoot(enemy) {
        const pos = enemy.mesh.position;
        const playerPos = this.playerGroup.position;
        const dir = new THREE.Vector3().subVectors(playerPos, pos).normalize();

        const createEBullet = (dx, dy, dz) => {
            const geom = new THREE.SphereGeometry(0.12, 6, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.copy(pos);
            this.scene.add(mesh);
            this.enemyBullets.push({
                mesh,
                vx: dx * 0.3,
                vy: dy * 0.3,
                vz: dz * 0.3
            });
        };

        if (enemy.type === 'elite') {
            for (let i = -2; i <= 2; i++) {
                createEBullet(dir.x + i * 0.15, dir.y, dir.z);
            }
        } else {
            createEBullet(dir.x, dir.y, dir.z);
        }
    }

    // ============= BOSS =============
    spawnBoss() {
        const encounter = Math.ceil(this.gameTime / BOSS_INTERVAL);
        const group = new THREE.Group();

        const size = 3 + encounter * 0.5;
        const bodyGeom = new THREE.ConeGeometry(size * 0.5, size * 2, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xff2222, roughness: 0.2, metalness: 0.8, emissive: 0x330000
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.x = -Math.PI / 2;
        group.add(body);

        // Wings
        const wingGeom = new THREE.BoxGeometry(size * 3, 0.2, size * 0.8);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0xaa0000, roughness: 0.3, metalness: 0.6
        });
        const wings = new THREE.Mesh(wingGeom, wingMat);
        wings.position.z = size * 0.3;
        group.add(wings);

        // Core engine
        const coreGeom = new THREE.SphereGeometry(size * 0.3, 12, 8);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xff6600, transparent: true, opacity: 0.8
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        group.add(core);

        // Glow
        const bossLight = new THREE.PointLight(0xff4400, 2, 15);
        group.add(bossLight);

        group.position.set(0, 1, -50);
        this.scene.add(group);

        const names = [
            { ar: 'الصقر الأحمر', en: 'RED HAWK' },
            { ar: 'التنين الأسود', en: 'BLACK DRAGON' },
            { ar: 'العقرب الذهبي', en: 'GOLDEN SCORPION' },
            { ar: 'الشبح المدمر', en: 'PHANTOM DESTROYER' },
            { ar: 'الملك الأخير', en: 'FINAL KING' }
        ];
        const nameData = names[(encounter - 1) % names.length];

        this.boss = {
            mesh: group,
            health: 100 + encounter * 50,
            maxHealth: 100 + encounter * 50,
            score: 3000 + encounter * 1000,
            phase: 1,
            entering: true,
            targetZ: -15,
            moveTimer: 0,
            attackTimer: 0,
            name: `${nameData.ar} - ${nameData.en}`,
            encounter
        };

        document.getElementById('boss-health-container').classList.remove('hidden');
        document.getElementById('boss-name').textContent = this.boss.name;
    }

    updateBoss() {
        if (!this.boss) return;

        const b = this.boss;
        const m = b.mesh;
        b.moveTimer++;

        if (b.entering) {
            m.position.z += 0.15;
            if (m.position.z >= b.targetZ) {
                b.entering = false;
                m.position.z = b.targetZ;
            }
            return;
        }

        // Movement based on phase
        const hp = b.health / b.maxHealth;
        if (hp < 0.33) b.phase = 3;
        else if (hp < 0.66) b.phase = 2;

        const speed = 0.08 * b.phase;
        m.position.x = Math.sin(b.moveTimer * 0.02 * b.phase) * (GAME_BOUNDS.x - 3);
        m.position.y = 1 + Math.sin(b.moveTimer * 0.03) * 2;

        m.rotation.z = Math.sin(b.moveTimer * 0.01) * 0.1;

        // Attack
        b.attackTimer++;
        const fireInterval = Math.max(10, 50 - b.phase * 15);
        if (b.attackTimer >= fireInterval) {
            this.bossAttack();
            b.attackTimer = 0;
        }

        // Health bar
        const fill = document.getElementById('boss-health-fill');
        fill.style.width = `${hp * 100}%`;
    }

    bossAttack() {
        const pos = this.boss.mesh.position;
        const playerPos = this.playerGroup.position;
        const dir = new THREE.Vector3().subVectors(playerPos, pos).normalize();
        const pattern = this.boss.attackTimer % 3;

        const createBBullet = (x, y, z, vx, vy, vz) => {
            const geom = new THREE.SphereGeometry(0.2, 6, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(x, y, z);
            this.scene.add(mesh);
            this.enemyBullets.push({ mesh, vx, vy, vz });
        };

        if (pattern === 0) {
            // Spread
            for (let i = -3; i <= 3; i++) {
                createBBullet(pos.x, pos.y, pos.z,
                    dir.x * 0.4 + i * 0.06, 0, dir.z * 0.4);
            }
        } else if (pattern === 1) {
            // Circle
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                createBBullet(pos.x, pos.y, pos.z,
                    Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
            }
        } else {
            // Aimed burst
            createBBullet(pos.x, pos.y, pos.z, dir.x * 0.5, dir.y * 0.5, dir.z * 0.5);
            createBBullet(pos.x + 1, pos.y, pos.z, dir.x * 0.5, dir.y * 0.5, dir.z * 0.5);
            createBBullet(pos.x - 1, pos.y, pos.z, dir.x * 0.5, dir.y * 0.5, dir.z * 0.5);
        }
    }

    // ============= BULLETS =============
    updateBullets() {
        // Player bullets
        this.bullets.forEach(b => {
            b.mesh.position.z += b.speed;
        });
        this.bullets = this.bullets.filter(b => {
            if (b.mesh.position.z < -60) {
                this.scene.remove(b.mesh);
                return false;
            }
            return true;
        });

        // Enemy bullets
        this.enemyBullets.forEach(b => {
            b.mesh.position.x += b.vx;
            b.mesh.position.y += b.vy;
            b.mesh.position.z += b.vz;
        });
        this.enemyBullets = this.enemyBullets.filter(b => {
            const p = b.mesh.position;
            if (p.z > 20 || p.z < -60 || Math.abs(p.x) > 30 || p.y < -5) {
                this.scene.remove(b.mesh);
                return false;
            }
            return true;
        });
    }

    // ============= POWERUPS =============
    spawnPowerup(x, y, z, type) {
        const group = new THREE.Group();

        const color = type === 'shield' ? 0x00aaff : type === 'health' ? 0x00ff44 : 0xffaa00;

        const geom = new THREE.OctahedronGeometry(0.5, 0);
        const mat = new THREE.MeshStandardMaterial({
            color, emissive: color, emissiveIntensity: 0.3,
            roughness: 0.2, metalness: 0.8
        });
        const mesh = new THREE.Mesh(geom, mat);
        group.add(mesh);

        const glow = new THREE.PointLight(color, 1, 5);
        group.add(glow);

        group.position.set(x, y, z);
        this.scene.add(group);
        this.powerups.push({ mesh: group, type, timer: 0 });
    }

    updatePowerups() {
        this.powerups.forEach(p => {
            p.timer++;
            p.mesh.rotation.y += 0.05;
            p.mesh.position.y = Math.sin(p.timer * 0.05) * 0.5;
            p.mesh.position.z += 0.05;
        });

        this.powerups = this.powerups.filter(p => {
            if (p.mesh.position.z > 20) {
                this.scene.remove(p.mesh);
                return false;
            }
            return true;
        });
    }

    // ============= PARTICLES =============
    explode(x, y, z, count, color) {
        for (let i = 0; i < count; i++) {
            const geom = new THREE.SphereGeometry(randFloat(0.05, 0.2), 4, 4);
            const mat = new THREE.MeshBasicMaterial({
                color: color || 0xffaa00,
                transparent: true, opacity: 1
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(x, y, z);
            this.scene.add(mesh);

            this.particles.push({
                mesh,
                vx: randFloat(-0.3, 0.3),
                vy: randFloat(-0.3, 0.3),
                vz: randFloat(-0.3, 0.3),
                life: randFloat(20, 50),
                maxLife: 50
            });
        }
    }

    updateParticles() {
        this.particles.forEach(p => {
            p.mesh.position.x += p.vx;
            p.mesh.position.y += p.vy;
            p.mesh.position.z += p.vz;
            p.vy -= 0.005;
            p.life--;
            p.mesh.material.opacity = p.life / p.maxLife;
        });

        this.particles = this.particles.filter(p => {
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                return false;
            }
            return true;
        });
    }

    // ============= COLLISIONS =============
    checkCollisions() {
        const playerPos = this.playerGroup.position;
        const playerRadius = 1.2;

        // Player bullets vs enemies
        this.bullets = this.bullets.filter(bullet => {
            let hit = false;
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                const dist = bullet.mesh.position.distanceTo(enemy.mesh.position);
                if (dist < 2) {
                    enemy.health -= bullet.damage;
                    // Flash effect
                    enemy.mesh.children.forEach(child => {
                        if (child.material && child.material.emissive) {
                            child.material.emissive.setHex(0xffffff);
                            setTimeout(() => child.material.emissive.setHex(0x000000), 80);
                        }
                    });

                    if (enemy.health <= 0) {
                        this.onEnemyDestroyed(enemy);
                    }
                    this.scene.remove(bullet.mesh);
                    hit = true;
                    break;
                }
            }
            return !hit;
        });

        // Player bullets vs boss
        if (this.boss && !this.boss.entering) {
            this.bullets = this.bullets.filter(bullet => {
                const dist = bullet.mesh.position.distanceTo(this.boss.mesh.position);
                if (dist < 4) {
                    this.boss.health -= bullet.damage;
                    this.explode(
                        bullet.mesh.position.x,
                        bullet.mesh.position.y,
                        bullet.mesh.position.z,
                        3, 0xffaa00
                    );

                    if (this.boss.health <= 0) {
                        this.onBossDefeated();
                    }
                    this.scene.remove(bullet.mesh);
                    return false;
                }
                return true;
            });
        }

        // Enemy bullets vs player
        if (!this.invincible) {
            this.enemyBullets = this.enemyBullets.filter(bullet => {
                const dist = bullet.mesh.position.distanceTo(playerPos);
                if (dist < playerRadius) {
                    this.playerHit();
                    this.scene.remove(bullet.mesh);
                    return false;
                }
                return true;
            });
        }

        // Enemies vs player
        if (!this.invincible) {
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                const dist = enemy.mesh.position.distanceTo(playerPos);
                if (dist < 2) {
                    this.playerHit();
                    enemy.health = 0;
                    this.onEnemyDestroyed(enemy);
                    break;
                }
            }
        }

        // Powerups vs player
        this.powerups = this.powerups.filter(p => {
            const dist = p.mesh.position.distanceTo(playerPos);
            if (dist < 2.5) {
                this.collectPowerup(p.type);
                this.scene.remove(p.mesh);
                return false;
            }
            return true;
        });
    }

    playerHit() {
        if (this.shieldActive) {
            this.shieldActive = false;
            this.shieldMesh.material.opacity = 0;
            document.getElementById('powerup-indicator').classList.add('hidden');
            this.explode(this.playerGroup.position.x, this.playerGroup.position.y,
                this.playerGroup.position.z, 15, 0x00aaff);
            return;
        }

        this.lives--;
        this.invincible = true;
        this.invincibleTimer = 90;
        this.explode(this.playerGroup.position.x, this.playerGroup.position.y,
            this.playerGroup.position.z, 20, 0x00ccff);

        // Camera shake
        this.camera.position.x += randFloat(-0.5, 0.5);
        this.camera.position.y += randFloat(-0.3, 0.3);
        setTimeout(() => {
            this.camera.position.set(0, 18, 22);
            this.camera.lookAt(0, 0, -5);
        }, 100);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    onEnemyDestroyed(enemy) {
        enemy.alive = false;
        const pos = enemy.mesh.position;
        this.explode(pos.x, pos.y, pos.z, 25, 0xffaa00);
        this.score += enemy.score;

        if (enemy.type === 'special') {
            const type = Math.random() > 0.5 ? 'shield' : 'health';
            this.spawnPowerup(pos.x, pos.y, pos.z, type);
        }

        this.scene.remove(enemy.mesh);
    }

    onBossDefeated() {
        const pos = this.boss.mesh.position;
        this.explode(pos.x, pos.y, pos.z, 60, 0xff4400);
        this.explode(pos.x + 2, pos.y, pos.z, 30, 0xffcc00);
        this.explode(pos.x - 2, pos.y, pos.z, 30, 0xffcc00);
        this.score += this.boss.score;

        // Drop powerups
        this.spawnPowerup(pos.x - 2, pos.y, pos.z, 'shield');
        this.spawnPowerup(pos.x + 2, pos.y, pos.z, 'health');
        this.spawnPowerup(pos.x, pos.y, pos.z + 2, 'weapon');

        this.scene.remove(this.boss.mesh);
        this.boss = null;
        this.bossPhase = 'none';
        this.lastBossTime = this.gameTime;
        document.getElementById('boss-health-container').classList.add('hidden');
    }

    collectPowerup(type) {
        this.explode(this.playerGroup.position.x, this.playerGroup.position.y,
            this.playerGroup.position.z, 10, 0x00ff88);

        switch (type) {
            case 'shield':
                this.shieldActive = true;
                this.shieldTimer = this.shieldDuration;
                this.shieldMesh.material.opacity = 0.15;
                document.getElementById('powerup-indicator').classList.remove('hidden');
                document.getElementById('powerup-text').textContent = '🛡️ SHIELD ACTIVE';
                break;
            case 'health':
                this.lives = Math.min(this.lives + 2, 8);
                break;
            case 'weapon':
                this.weaponLevel = Math.min(this.weaponLevel + 1, 3);
                this.fireRate = Math.max(4, this.fireRate - 1);
                break;
        }
    }

    // ============= HUD =============
    updateHUD() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        const minutes = Math.floor(this.gameTime / 3600);
        const seconds = Math.floor((this.gameTime % 3600) / 60);
        document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('lives').textContent = this.lives;
    }
}

// ============= START =============
window.addEventListener('load', () => new Game3D());
