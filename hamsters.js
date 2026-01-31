// ===================================
// Hamster System - Rolling hamster swarms
// ===================================

class HamsterManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.hamsters = [];
        this.spawnChance = 0.008; // Spawn chance per frame
    }

    update(delta, playerY, platforms) {
        // Spawn hamster swarms from platform sides
        if (Math.random() < this.spawnChance) {
            this.spawnHamsterSwarm(playerY, platforms);
        }

        // Update all hamsters
        this.hamsters = this.hamsters.filter(hamster => {
            hamster.update(delta, this.player);

            // Remove if too far below player
            if (hamster.position.y < playerY - 50) {
                this.scene.remove(hamster.mesh);
                return false;
            }

            return true;
        });
    }

    spawnHamsterSwarm(playerY, platforms) {
        // Find a platform near player
        const nearbyPlatforms = platforms.filter(p =>
            Math.abs(p.position.y - playerY) < 25 && p.position.y > playerY
        );

        if (nearbyPlatforms.length === 0) return;

        const platform = nearbyPlatforms[Math.floor(Math.random() * nearbyPlatforms.length)];

        // Spawn 3-6 hamsters in a swarm
        const swarmSize = 3 + Math.floor(Math.random() * 4);
        const side = Math.random() > 0.5 ? 1 : -1;

        for (let i = 0; i < swarmSize; i++) {
            setTimeout(() => {
                const hamster = new Hamster(this.scene, platform, side, i);
                this.hamsters.push(hamster);
            }, i * 100); // Stagger spawn slightly
        }
    }

    reset() {
        this.hamsters.forEach(hamster => {
            this.scene.remove(hamster.mesh);
        });
        this.hamsters = [];
    }
}

// ===================================
// Hamster - Rolling hamster ball
// ===================================

class Hamster {
    constructor(scene, platform, side, index) {
        this.scene = scene;

        // Create hamster model
        this.mesh = this.createModel();

        const platformWidth = platform.userData.width || 3;

        // Position at platform side and slightly staggered
        this.position = new THREE.Vector3(
            platform.position.x + (side * platformWidth / 2) + (side * 1),
            platform.position.y + 5 + index * 0.5, // Slight vertical offset
            0
        );
        this.mesh.position.copy(this.position);

        // Physics - falling and rolling
        this.velocity = new THREE.Vector3(
            -side * 2, // Slight horizontal movement inward
            0, // Will fall with gravity
            0
        );
        this.gravity = -15;
        this.rollSpeed = 0;

        // Knockback
        this.pushForce = 400; // 2x increased (was 200)

        this.scene.add(this.mesh);
    }

    createModel() {
        const hamster = new THREE.Group();

        // Main ball (hamster in ball)
        const ballGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const ballMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFE4B5, // Beige/tan color
            transparent: true,
            opacity: 0.6,
            shininess: 100
        });
        const ball = new THREE.Mesh(ballGeometry, ballMaterial);
        hamster.add(ball);

        // Hamster body inside (brown)
        const bodyGeometry = new THREE.SphereGeometry(0.4, 12, 12);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513 // Brown
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 0.8, 1);
        hamster.add(body);

        // Head (lighter brown)
        const headGeometry = new THREE.SphereGeometry(0.25, 10, 10);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: 0xA0522D
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0, 0.35);
        hamster.add(head);

        // Ears (small)
        const earGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const earMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFA07A
        });

        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.15, 0.2, 0.35);
        hamster.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.15, 0.2, 0.35);
        hamster.add(rightEar);

        // Eyes (black dots)
        const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 0.05, 0.52);
        hamster.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 0.05, 0.52);
        hamster.add(rightEye);

        hamster.userData.body = body;

        return hamster;
    }

    update(delta, player) {
        // Apply gravity
        this.velocity.y += this.gravity * delta;

        // Update position
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.mesh.position.copy(this.position);

        // Roll animation (based on falling speed)
        this.rollSpeed += delta * Math.abs(this.velocity.y) * 0.5;
        this.mesh.rotation.z = this.rollSpeed;

        // Hamster wiggles inside the ball
        if (this.mesh.userData.body) {
            const wiggle = Math.sin(Date.now() / 100) * 0.1;
            this.mesh.userData.body.position.y = wiggle;
        }

        // Check collision with player
        const distance = this.position.distanceTo(player.position);
        if (distance < 1.5) {
            // STRONG HORIZONTAL KNOCKBACK!
            const pushDir = player.position.x > this.position.x ? 1 : -1;
            player.velocity.x += pushDir * this.pushForce;
            // No upward push - purely horizontal

            // Particle effect
            Effects.createParticleBurst(this.scene, this.position, 0x8B4513, 15);

            // Remove this hamster
            this.scene.remove(this.mesh);
            return false;
        }

        return true;
    }
}
