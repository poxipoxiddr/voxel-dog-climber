// ===================================
// Main Game Logic
// ===================================

// Supabase Configuration - REPLACE WITH YOUR OWN
const SUPABASE_CONFIG = {
    url: 'https://mlivsawbmqebzzfcherd.supabase.co',
    key: 'sb_publishable_dDSA7OfaV54F-q-Q-gXKPA_PxxRhOON'
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.isRunning = false;
        this.isPaused = false;
        this.isMultiplayer = false; // Multiplayer mode flag
        this.multiplayerWinScore = 5000; // First to 5000 wins

        this.remotePlayers = new Map(); // id -> RemotePlayer instance

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
        const skyColor = 0x87CEEB;
        this.scene.background = new THREE.Color(skyColor); // Sky blue

        // Add Exponential Fog for depth (Optimized for performance)
        this.scene.fog = new THREE.FogExp2(skyColor, 0.015);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 15);

        // Mobile camera zoom out for wider view
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            this.camera.position.set(0, 12, 18); // Further back
            this.camera.fov = 70; // Wider FOV
            this.camera.updateProjectionMatrix();
        }

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
        this.renderer.shadowMap.enabled = false; // Disable real-time shadows for mobile performance

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

        // Multiplayer UI elements
        const multiplayerBtn = document.getElementById('multiplayerBtn');
        const multiplayerLobby = document.getElementById('multiplayerLobby');
        const createRoomBtn = document.getElementById('createRoomBtn');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const roomCreated = document.getElementById('roomCreated');
        const roomJoin = document.getElementById('roomJoin');
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        const roomCodeInput = document.getElementById('roomCodeInput');
        const confirmJoinBtn = document.getElementById('confirmJoinBtn');
        const startMultiBtn = document.getElementById('startMultiBtn');
        const backToMenuBtn = document.getElementById('backToMenuBtn');
        const joinStatus = document.getElementById('joinStatus');
        const lobbyOptions = document.querySelector('.lobby-options');

        // Solo play
        startBtn.addEventListener('click', () => {
            instructions.classList.add('hidden');
            this.startGame();
            AudioSystem.startBGM();
        });

        restartBtn.addEventListener('click', () => {
            gameOverScreen.classList.add('hidden');
            this.resetGame();
            this.startGame();
        });

        // Initialize Multiplayer with config
        Multiplayer.init(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

        // Multiplayer callbacks
        Multiplayer.onPlayerJoin = (id, data) => {
            const remotePlayer = new RemotePlayer(this.scene, { id, ...data });
            this.remotePlayers.set(id, remotePlayer);

            // Lobby UI update if visible
            const playerList = document.getElementById('playerList');
            if (playerList) {
                const item = document.createElement('div');
                item.className = 'player-item';
                item.id = 'player-' + id;
                item.textContent = `🐕 ${data.name}`;
                playerList.appendChild(item);
            }
        };

        Multiplayer.onPlayerLeave = (id) => {
            const remotePlayer = this.remotePlayers.get(id);
            if (remotePlayer) {
                remotePlayer.destroy();
                this.remotePlayers.delete(id);
            }
            const item = document.getElementById('player-' + id);
            if (item) item.remove();
        };

        Multiplayer.onPlayerUpdate = (id, pos) => {
            const remotePlayer = this.remotePlayers.get(id);
            if (remotePlayer) {
                remotePlayer.updatePosition(pos);
            }
        };

        // Handle other player winning
        Multiplayer.onPlayerWin = (playerId, winnerName) => {
            this.isRunning = false;
            this.showMultiplayerWin(false, winnerName);
        };

        // Multiplayer - Open lobby
        multiplayerBtn.addEventListener('click', () => {
            instructions.classList.add('hidden');
            multiplayerLobby.classList.remove('hidden');
        });

        // Back to menu
        backToMenuBtn.addEventListener('click', () => {
            multiplayerLobby.classList.add('hidden');
            instructions.classList.remove('hidden');
            roomCreated.classList.add('hidden');
            document.getElementById('roomJoinInput').classList.add('hidden');
            document.getElementById('roomCodeInfo').classList.add('hidden');
            document.getElementById('lobbyNickname').classList.remove('hidden');
            Multiplayer.destroy();
        });

        // Create room
        createRoomBtn.addEventListener('click', async () => {
            const nickname = document.getElementById('lobbyNameInput').value.trim() || '호스트';
            document.getElementById('lobbyNickname').classList.add('hidden');
            document.getElementById('roomCodeInfo').classList.remove('hidden');
            roomCreated.classList.remove('hidden');
            roomCodeDisplay.textContent = '생성 중...';

            try {
                const code = await Multiplayer.createRoom(nickname);
                roomCodeDisplay.textContent = code;
            } catch (err) {
                roomCodeDisplay.textContent = '오류 발생';
                console.error(err);
            }
        });

        // Join room
        joinRoomBtn.addEventListener('click', () => {
            document.getElementById('lobbyNickname').classList.add('hidden');
            document.getElementById('roomJoinInput').classList.remove('hidden');
            document.getElementById('roomCodeInfo').classList.remove('hidden');
            document.getElementById('joinStatus').textContent = '';
        });

        // Confirm join
        confirmJoinBtn.addEventListener('click', async () => {
            const code = roomCodeInput.value.trim().toUpperCase();
            const nickname = document.getElementById('lobbyNameInput').value.trim() || '플레이어';

            if (code.length !== 4) {
                joinStatus.textContent = '4자리 코드를 입력하세요';
                joinStatus.className = 'join-status error';
                return;
            }

            joinStatus.textContent = '연결 중...';
            joinStatus.className = 'join-status';

            try {
                await Multiplayer.joinRoom(code, nickname);
                joinStatus.textContent = '연결 성공! 호스트가 시작하면 게임이 시작됩니다.';
                joinStatus.className = 'join-status success';

                Multiplayer.onGameStart = () => {
                    this.isMultiplayer = true;
                    multiplayerLobby.classList.add('hidden');
                    this.startMultiplayerGame();
                    AudioSystem.startBGM();
                };
            } catch (err) {
                joinStatus.textContent = '연결 실패: ' + (err.message || '알 수 없는 오류');
                joinStatus.className = 'join-status error';
            }
        });

        // Start multiplayer game (host only)
        startMultiBtn.addEventListener('click', () => {
            if (Multiplayer.getPlayerCount() < 1) {
                alert('플레이어가 부족합니다.');
                return;
            }
            this.isMultiplayer = true;
            Multiplayer.startGame();
            multiplayerLobby.classList.add('hidden');
            this.startMultiplayerGame();
            AudioSystem.startBGM();
        });
    }

    startMultiplayerGame() {
        this.isMultiplayer = true;
        this.resetGame();
        // Add floor platform for multiplayer
        this.mapGenerator.addFloor();
        this.startGame();
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
        // Skip game over in multiplayer mode
        if (this.isMultiplayer) return;

        this.isRunning = false;

        const stats = this.scoring.getFinalStats();
        document.getElementById('finalScore').textContent = stats.score.toLocaleString();
        document.getElementById('finalAltitude').textContent = `${stats.altitude}m`;

        const gameOverScreen = document.getElementById('gameOver');
        gameOverScreen.classList.remove('hidden');
        AudioSystem.playGameOver();
    }

    checkMultiplayerWin() {
        if (!this.isMultiplayer) return false;
        const score = this.scoring.getScore();
        if (score >= this.multiplayerWinScore) {
            this.isRunning = false;
            Multiplayer.broadcastWin();
            this.showMultiplayerWin(true);
            return true;
        }
        return false;
    }

    showMultiplayerWin(isWinner, winnerName = '') {
        const gameOverScreen = document.getElementById('gameOver');
        document.getElementById('finalScore').textContent = this.scoring.getScore().toLocaleString();
        document.getElementById('finalAltitude').textContent = `${this.player.getAltitude()}m`;
        const h1 = gameOverScreen.querySelector('h1');
        h1.textContent = isWinner ? '🏆 승리!' : `${winnerName}님 승리!`;
        gameOverScreen.classList.remove('hidden');
        if (isWinner) {
            AudioSystem.playHighJump(); // Victory sound
        } else {
            AudioSystem.playGameOver();
        }
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
        const platforms = this.mapGenerator.getPlatforms();

        this.itemManager.update(delta, this.player, platforms);
        this.enemyManager.update(delta, this.player);
        this.bubbleManager.update(delta, this.player, platforms);
        this.rocketManager.update(delta, this.player, platforms);
        this.hamsterManager.update(delta, this.player, platforms);

        const milestoneReached = this.scoring.update(this.player.getAltitude());
        if (milestoneReached) {
            this.player.activateSuperJump(5);
        }

        // Check multiplayer win condition
        if (this.checkMultiplayerWin()) {
            return;
        }

        // Sync local position to multiplayer
        if (Multiplayer.channel) {
            Multiplayer.sendPosition(this.player.position);
        }

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
