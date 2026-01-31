// ===================================
// Main Game Logic
// ===================================

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.isRunning = false;
        this.isPaused = false;

        this.setupThreeJS();
        this.setupLighting();
        this.setupSkybox();
        this.setupGameObjects();
        this.setupUI();

        this.lastTime = Date.now();

        // Start game loop
        this.animate();
    }

    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 15);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Handle resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(5, 20, 5);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        this.scene.add(sunLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x9090ff, 0.3);
        fillLight.position.set(-5, 10, -5);
        this.scene.add(fillLight);
    }

    setupSkybox() {
        // Create gradient sky
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0x87CEEB) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }

    setupGameObjects() {
        this.player = new Player(this.scene);
        this.mapGenerator = new MapGenerator(this.scene);
        this.itemManager = new ItemManager(this.scene, this.player);
        this.enemyManager = new EnemyManager(this.scene, this.player);
        this.bubbleManager = new BubbleManager(this.scene, this.player);
        this.rocketManager = new RocketManager(this.scene, this.player);
        this.hamsterManager = new HamsterManager(this.scene, this.player);
        this.scoring = new ScoringSystem();

        CameraController.init(this.camera);
        CameraController.setTarget(this.player.model);
    }

    setupUI() {
        const startBtn = document.getElementById('startBtn');
        const restartBtn = document.getElementById('restartBtn');
        const instructions = document.getElementById('instructions');
        const gameOverScreen = document.getElementById('gameOver');

        startBtn.addEventListener('click', () => {
            instructions.classList.add('hidden');
            this.startGame();
        });

        restartBtn.addEventListener('click', () => {
            gameOverScreen.classList.add('hidden');
            this.resetGame();
            this.startGame();
        });
    }

    startGame() {
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = Date.now();
    }

    resetGame() {
        this.player.reset();
        this.mapGenerator.reset();
        this.itemManager.reset();
        this.enemyManager.reset();
        this.bubbleManager.reset();
        this.rocketManager.reset();
        this.hamsterManager.reset();
        this.scoring.reset();
        Effects.clear(this.scene);
    }

    gameOver() {
        this.isRunning = false;

        const stats = this.scoring.getFinalStats();
        document.getElementById('finalScore').textContent = stats.score.toLocaleString();
        document.getElementById('finalAltitude').textContent = `${stats.altitude}m`;

        const gameOverScreen = document.getElementById('gameOver');
        gameOverScreen.classList.remove('hidden');
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        const currentTime = Date.now();
        const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        // Update game objects
        const alive = this.player.update(delta, this.mapGenerator.getPlatforms());
        if (!alive) {
            this.gameOver();
            return;
        }

        this.mapGenerator.update(this.player.position.y);
        this.itemManager.update(delta, this.player.position.y, this.mapGenerator.getPlatforms());
        this.enemyManager.update(delta, this.player.position.y);
        this.bubbleManager.update(delta, this.player.position.y, this.mapGenerator.getPlatforms());
        this.rocketManager.update(delta, this.player.position.y, this.mapGenerator.getPlatforms());
        this.hamsterManager.update(delta, this.player.position.y, this.mapGenerator.getPlatforms());
        this.scoring.update(this.player.getAltitude());

        Effects.update(delta, this.scene);
        CameraController.update();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.render();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});
