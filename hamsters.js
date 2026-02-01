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

    update(delta, player, platforms) {
        const playerY = player.position.y;
        
        // Theme / Background Change (New!)
        this.updateTheme(playerY);

        // Spawn hamster swarms from platform sides
        if (Math.random() < this.spawnChance) {
            this.spawnHamsterSwarm(playerY, platforms);
        }

        // Spawn Boss (New!)
        if (playerY > 200 && !this.bossSpawned) {
            this.spawnBoss(playerY);
        }

        // Update all hamsters
        this.hamsters = this.hamsters.filter(hamster => {
            const alive = hamster.update(delta, this.player);
            if (!alive) {
                this.scene.remove(hamster.mesh);
                if (hamster.shadow) this.scene.remove(hamster.shadow);
                if (hamster.isBoss) this.bossSpawned = false;
                return false;
            }

            // Culling: Remove if too far below player
            const distanceFromPlayer = Math.abs(hamster.position.y - playerY);
            if (hamster.position.y < playerY - 40 || distanceFromPlayer > 100) {
                this.scene.remove(hamster.mesh);
                if (hamster.shadow) this.scene.remove(hamster.shadow);
                if (hamster.isBoss) this.bossSpawned = false;
                return false;
            }

            return true;
        });
    }

    updateTheme(playerY) {
        // Change fog and background based on height
        if (playerY > 500) {
            this.scene.fog.color.setHex(0x000033); // Space
            this.scene.background.setHex(0x000033);
            this.player.gravity = -10; // Low gravity in space!
        } else if (playerY > 200) {
            this.scene.fog.color.setHex(0xFF8C00); // Sunset
            this.scene.background.setHex(0xFF8C00);
            this.player.gravity = -25;
        } else {
            this.scene.fog.color.setHex(0x87CEEB); // Sky
            this.scene.background.setHex(0x87CEEB);
            this.player.gravity = -25;
        }
    }

    spawnBoss(playerY) {
        this.bossSpawned = true;
        const boss = new GiantHamster(this.scene, playerY + 30);
        this.hamsters.push(boss);
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

        // Shadow
        this.shadow = VoxelModels.createBlobShadow();
        this.scene.add(this.shadow);

        this.scene.add(this.mesh);
    }

    createModel() {
        const hamster = new THREE.Group();

        // Main ball (hamster in ball)
        // Optimized: Reduced segments from 16 to 8
        const ballGeometry = new THREE.SphereGeometry(0.6, 8, 8);
        const ballMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFE4B5, // Beige/tan color
            transparent: true,
            opacity: 0.6,
            shininess: 100
        });
        const ball = new THREE.Mesh(ballGeometry, ballMaterial);
        hamster.add(ball);

        // Hamster body inside (brown)
        // Optimized: Reduced segments from 12 to 6
        const bodyGeometry = new THREE.SphereGeometry(0.4, 6, 6);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513 // Brown
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 0.8, 1);
        hamster.add(body);

        // Head (lighter brown)
        // Optimized: Reduced segments from 10 to 6
        const headGeometry = new THREE.SphereGeometry(0.25, 6, 6);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: 0xA0522D
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0, 0.35);
        hamster.add(head);

        // Ears (small)
        // Optimized: Reduced segments from 8 to 4
        const earGeometry = new THREE.SphereGeometry(0.1, 4, 4);
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
        // Optimized: Replaced Sphere with Box for eyes (minimalistic)
        const eyeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
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

        // Update shadow
        if (this.shadow) {
            this.shadow.position.x = this.position.x;
            this.shadow.position.z = this.position.z;
            this.shadow.position.y = this.position.y - 0.5; // Follow closely for simple objects
        }

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
            player.externalVelocity.x += pushDir * (this.pushForce / 50); // Scale down force for direct addition
            // No upward push - purely horizontal

            // Sound effect
            AudioSystem.playHit();

            // Particle effect
            Effects.createParticleBurst(this.scene, this.position, 0x8B4513, 15);

            // Remove this hamster
            this.scene.remove(this.mesh);
            if (this.shadow) this.scene.remove(this.shadow);
            return false;
        }

        return true;
    }
}

// ===================================
// Giant Hamster - Boss Enemy (New!)
// ===================================

class GiantHamster {
    constructor(scene, y) {
        this.scene = scene;
        this.isBoss = true;
        this.mesh = VoxelModels.createGiantHamster();
        this.position = new THREE.Vector3(0, y, 0);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.targetX = 0;
        this.stateTimer = 0;
        this.pushForce = 1000; // Extreme knockback
        
        this.shadow = VoxelModels.createBlobShadow();
        this.shadow.scale.setScalar(4);
        this.scene.add(this.shadow);
    }

    update(delta, player) {
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
            // Pick a new target X
            this.targetX = (Math.random() - 0.5) * 20;
            this.stateTimer = 2;
        }

        // Move towards target X
        this.position.x = THREE.MathUtils.lerp(this.position.x, this.targetX, delta * 2);
        
        // Slowly sink
        this.position.y -= delta * 2;
        this.mesh.position.copy(this.position);

        if (this.shadow) {
            this.shadow.position.set(this.position.x, this.position.y - 3, this.position.z);
        }

        // Collision
        const distance = this.position.distanceTo(player.position);
        if (distance < 4) {
            const pushDir = player.position.x > this.position.x ? 1 : -1;
            player.externalVelocity.x += pushDir * 20;
            player.velocity.y = -10; // Bump down
            AudioSystem.playHit();
            return false; // Despawn boss on hit for now
        }

        return true;
    }
}
