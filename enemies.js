// ===================================
// Enemy System - Pigeons, Cats, Pandas
// ===================================

class EnemyManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.enemies = [];

        // Spawn settings
        this.pigeonSpawnChance = 0.02; // Per frame
        this.catSpawnChance = 0.015;
        this.pandaAltitude = 50; // Pandas appear after this altitude
        this.pandaSpawnChance = 0.03;

        this.lastSpawnTime = 0;
    }

    update(delta, player) {
        const playerY = player.position.y;
        const currentTime = Date.now() / 1000;

        // Spawn pigeons (horizontal movement)
        if (Math.random() < this.pigeonSpawnChance) {
            this.spawnPigeon(playerY);
        }

        // Spawn cats (jumping)
        if (Math.random() < this.catSpawnChance) {
            this.spawnCat(playerY);
        }

        // Spawn pandas (boss enemies at high altitude)
        if (playerY > this.pandaAltitude && Math.random() < this.pandaSpawnChance) {
            this.spawnPanda(playerY);
        }

        // Update all enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(delta, this.player);

            // Culling: Remove if off-screen (memory optimization)
            const distanceFromPlayer = Math.abs(enemy.position.y - playerY);
            if (enemy.position.y < playerY - 35 || distanceFromPlayer > 60 || !enemy.isAlive) {
                this.scene.remove(enemy.mesh);
                if (enemy.shadow) this.scene.remove(enemy.shadow);
                return false;
            }

            return true;
        });
    }

    spawnPigeon(playerY) {
        const pigeon = new Pigeon(this.scene, playerY);
        this.enemies.push(pigeon);
    }

    spawnCat(playerY) {
        const cat = new Cat(this.scene, playerY);
        this.enemies.push(cat);
    }

    spawnPanda(playerY) {
        const panda = new Panda(this.scene, playerY);
        this.enemies.push(panda);
    }

    reset() {
        this.enemies.forEach(enemy => {
            this.scene.remove(enemy.mesh);
        });
        this.enemies = [];
    }
}

// ===================================
// Pigeon Enemy - Flies horizontally
// ===================================

class Pigeon {
    constructor(scene, playerY) {
        this.scene = scene;
        this.isAlive = true;

        // Create pigeon model
        this.mesh = this.createModel();

        // Random side (left or right)
        const side = Math.random() > 0.5 ? 1 : -1;
        this.direction = side;

        // Position
        this.position = new THREE.Vector3(
            side * 15, // Start from far left/right
            playerY + Math.random() * 10 - 5, // Around player height
            0
        );
        this.mesh.position.copy(this.position);

        // Movement
        this.speed = 8;
        this.pushForce = 240; // 2x increased (was 120)

        // Shadow
        this.shadow = VoxelModels.createBlobShadow();
        this.shadow.scale.setScalar(0.8);
        this.scene.add(this.shadow);

        this.scene.add(this.mesh);
    }

    createModel() {
        const pigeon = new THREE.Group();

        // Body (gray)
        const body = VoxelModels.createVoxel(0x808080, 0.8);
        body.scale.set(1, 0.6, 1.2);
        pigeon.add(body);

        // Head
        const head = VoxelModels.createVoxel(0x606060, 0.5);
        head.position.set(0, 0.3, 0.6);
        pigeon.add(head);

        // Wings
        const leftWing = VoxelModels.createVoxel(0x707070, 0.4);
        leftWing.position.set(-0.6, 0, 0);
        leftWing.scale.set(1.5, 0.2, 0.8);
        pigeon.add(leftWing);

        const rightWing = VoxelModels.createVoxel(0x707070, 0.4);
        rightWing.position.set(0.6, 0, 0);
        rightWing.scale.set(1.5, 0.2, 0.8);
        pigeon.add(rightWing);

        pigeon.userData.wings = [leftWing, rightWing];

        return pigeon;
    }

    update(delta, player) {
        // Move horizontally
        this.position.x -= this.direction * this.speed * delta;
        this.mesh.position.copy(this.position);

        // Wing flap animation
        const time = Date.now() / 200;
        if (this.mesh.userData.wings) {
            this.mesh.userData.wings[0].rotation.z = Math.sin(time) * 0.5;
            this.mesh.userData.wings[1].rotation.z = -Math.sin(time) * 0.5;
        }

        // Face direction
        this.mesh.rotation.y = this.direction > 0 ? Math.PI : 0;

        // Check collision with player
        const distance = this.position.distanceTo(player.position);
        if (distance < 1.5) {
            // Push player horizontally only
            player.externalVelocity.x += this.direction * (this.pushForce / 50);
            // No upward push - purely horizontal knockback
            AudioSystem.playHit();
            Effects.createParticleBurst(this.scene, this.position, 0x808080, 10);
            this.isAlive = false;
        }

        // Update shadow
        if (this.shadow) {
            this.shadow.position.x = this.position.x;
            this.shadow.position.y = this.position.y - 0.5;
            this.shadow.position.z = this.position.z;
        }

        // Remove if too far
        if (Math.abs(this.position.x) > 20) {
            this.isAlive = false;
        }
    }
}

// ===================================
// Cat Enemy - Jumps onto platforms
// ===================================

class Cat {
    constructor(scene, playerY) {
        this.scene = scene;
        this.isAlive = true;

        // Create cat model
        this.mesh = this.createModel();

        // Position (random side)
        const side = Math.random() > 0.5 ? 1 : -1;
        this.position = new THREE.Vector3(
            side * (5 + Math.random() * 3),
            playerY + 10,
            0
        );
        this.mesh.position.copy(this.position);

        // Physics
        this.velocity = new THREE.Vector3(-side * 3, -5, 0);
        this.gravity = -20;
        this.pushForce = 200; // 2x increased (was 100)

        // Shadow
        this.shadow = VoxelModels.createBlobShadow();
        this.shadow.scale.setScalar(0.7);
        this.scene.add(this.shadow);

        this.scene.add(this.mesh);
    }

    createModel() {
        const cat = new THREE.Group();

        // Body (orange)
        const body = VoxelModels.createVoxel(0xFF8C00, 0.7);
        body.scale.set(1.2, 0.7, 0.9);
        cat.add(body);

        // Head
        const head = VoxelModels.createVoxel(0xFF8C00, 0.6);
        head.position.set(0, 0.4, 0.5);
        cat.add(head);

        // Ears
        const leftEar = VoxelModels.createVoxel(0xFF8C00, 0.3);
        leftEar.position.set(-0.2, 0.7, 0.5);
        cat.add(leftEar);

        const rightEar = VoxelModels.createVoxel(0xFF8C00, 0.3);
        rightEar.position.set(0.2, 0.7, 0.5);
        cat.add(rightEar);

        // Tail
        const tail = VoxelModels.createVoxel(0xFF8C00, 0.4);
        tail.position.set(0, 0.2, -0.7);
        tail.scale.y = 1.5;
        tail.rotation.x = 0.5;
        cat.add(tail);

        return cat;
    }

    update(delta, player) {
        // Apply gravity
        this.velocity.y += this.gravity * delta;

        // Update position
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.mesh.position.copy(this.position);

        // Rotate in air
        this.mesh.rotation.z += delta * 2;

        // Check collision with player
        const distance = this.position.distanceTo(player.position);
        if (distance < 1.5) {
            // Push player horizontally only
            const pushDir = player.position.x > this.position.x ? 1 : -1;
            player.externalVelocity.x += pushDir * (this.pushForce / 50);
            // No upward push - purely horizontal knockback

            // Apply 0.3s stun
            player.applyStun(0.3);
            AudioSystem.playHit();
            Effects.createParticleBurst(this.scene, this.position, 0xFF8C00, 12);
            this.isAlive = false;
        }

        // Update shadow
        if (this.shadow) {
            this.shadow.position.x = this.position.x;
            this.shadow.position.y = this.position.y - 0.5;
            this.shadow.position.z = this.position.z;
        }

        // Remove if fell too far
        if (this.position.y < player.position.y - 20) {
            this.isAlive = false;
        }
    }
}

// ===================================
// Panda Enemy - Boss, rolls across screen
// ===================================

class Panda {
    constructor(scene, playerY) {
        this.scene = scene;
        this.isAlive = true;

        // Create panda model (larger)
        this.mesh = this.createModel();

        // Position (random side)
        const side = Math.random() > 0.5 ? 1 : -1;
        this.direction = side;

        this.position = new THREE.Vector3(
            side * 15,
            playerY + Math.random() * 5,
            0
        );
        this.mesh.position.copy(this.position);

        // Movement
        this.speed = 12; // Faster than pigeon
        this.rollSpeed = 0;
        this.pushForce = 200; // 4x INSANELY STRONG (BOSS)

        // Shadow
        this.shadow = VoxelModels.createBlobShadow();
        this.shadow.scale.setScalar(1.5);
        this.scene.add(this.shadow);

        this.scene.add(this.mesh);
    }

    createModel() {
        const panda = new THREE.Group();
        panda.scale.setScalar(1.8); // Bigger!

        // Body (black and white)
        const body = VoxelModels.createVoxel(0xFFFFFF, 1);
        body.scale.set(1.3, 1, 1.2);
        panda.add(body);

        // Head
        const head = VoxelModels.createVoxel(0xFFFFFF, 0.9);
        head.position.set(0, 0.6, 0.8);
        panda.add(head);

        // Black eye patches
        const leftEye = VoxelModels.createVoxel(0x000000, 0.4);
        leftEye.position.set(-0.3, 0.7, 1.1);
        panda.add(leftEye);

        const rightEye = VoxelModels.createVoxel(0x000000, 0.4);
        rightEye.position.set(0.3, 0.7, 1.1);
        panda.add(rightEye);

        // Ears (black)
        const leftEar = VoxelModels.createVoxel(0x000000, 0.4);
        leftEar.position.set(-0.5, 1.1, 0.8);
        panda.add(leftEar);

        const rightEar = VoxelModels.createVoxel(0x000000, 0.4);
        rightEar.position.set(0.5, 1.1, 0.8);
        panda.add(rightEar);

        // Legs (black)
        const legPositions = [
            [-0.4, -0.6, 0.3],
            [0.4, -0.6, 0.3],
            [-0.4, -0.6, -0.3],
            [0.4, -0.6, -0.3]
        ];

        legPositions.forEach(pos => {
            const leg = VoxelModels.createVoxel(0x000000, 0.3);
            leg.position.set(pos[0], pos[1], pos[2]);
            panda.add(leg);
        });

        return panda;
    }

    update(delta, player) {
        // Move horizontally (faster)
        this.position.x -= this.direction * this.speed * delta;
        this.mesh.position.copy(this.position);

        // Roll animation
        this.rollSpeed += delta * 10;
        this.mesh.rotation.z = this.rollSpeed;

        // Check collision with player
        const distance = this.position.distanceTo(player.position);
        if (distance < 2) {
            // MASSIVE horizontal push only! (BOSS)
            player.externalVelocity.x += this.direction * (this.pushForce / 50);
            // No upward push - purely horizontal blast
            AudioSystem.playHit();
            Effects.createParticleBurst(this.scene, this.position, 0x000000, 20);
            this.isAlive = false;
        }

        // Update shadow
        if (this.shadow) {
            this.shadow.position.x = this.position.x;
            this.shadow.position.y = this.position.y - 1;
            this.shadow.position.z = this.position.z;
        }

        // Remove if too far
        if (Math.abs(this.position.x) > 20) {
            this.isAlive = false;
        }
    }
}
