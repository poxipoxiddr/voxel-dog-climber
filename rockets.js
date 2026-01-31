// ===================================
// Rocket System - Fast rockets with extreme knockback
// ===================================

class RocketManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.rockets = [];
        this.spawnChance = 0.01; // Spawn chance per frame
    }

    update(delta, playerY, platforms) {
        // Spawn rockets from platform sides
        if (Math.random() < this.spawnChance) {
            this.spawnRocket(playerY, platforms);
        }

        // Update all rockets
        this.rockets = this.rockets.filter(rocket => {
            rocket.update(delta, this.player);

            // Remove if too far from player or exploded
            const distanceFromPlayer = Math.abs(rocket.position.y - playerY);
            if (distanceFromPlayer > 50 || !rocket.isAlive) {
                this.scene.remove(rocket.mesh);
                return false;
            }

            return true;
        });
    }

    spawnRocket(playerY, platforms) {
        // Find a platform near player
        const nearbyPlatforms = platforms.filter(p =>
            Math.abs(p.position.y - playerY) < 25
        );

        if (nearbyPlatforms.length === 0) return;

        const platform = nearbyPlatforms[Math.floor(Math.random() * nearbyPlatforms.length)];
        const rocket = new Rocket(this.scene, platform);
        this.rockets.push(rocket);
    }

    reset() {
        this.rockets.forEach(rocket => {
            this.scene.remove(rocket.mesh);
        });
        this.rockets = [];
    }
}

// ===================================
// Rocket - Fast rideable rocket with HUGE knockback
// ===================================

class Rocket {
    constructor(scene, platform) {
        this.scene = scene;
        this.isAlive = true;
        this.isRiding = false;

        // Create rocket model
        this.mesh = this.createModel();

        // Random side of platform
        const side = Math.random() > 0.5 ? 1 : -1;
        const platformWidth = platform.userData.width || 3;

        // Position at platform side
        this.position = new THREE.Vector3(
            platform.position.x + (side * platformWidth / 2) + (side * 1.5),
            platform.position.y,
            0
        );
        this.mesh.position.copy(this.position);

        // Physics - FAST!
        this.velocity = new THREE.Vector3(0, 10, 0); // Much faster than bubble
        this.floatSpeed = 10; // 3x faster than bubble
        this.wobbleTime = 0;

        // Random explode time (1-3 seconds) - faster than bubble
        this.explodeTime = 1 + Math.random() * 2;
        this.lifetime = 0;

        // EXTREME knockback when exploded
        this.explosionForce = 250; // Much stronger than bubble!

        this.scene.add(this.mesh);
    }

    createModel() {
        const rocket = new THREE.Group();

        // Rocket body (red)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF3333,
            shininess: 80
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        rocket.add(body);

        // Nose cone (white)
        const noseGeometry = new THREE.ConeGeometry(0.3, 0.6, 8);
        const noseMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            shininess: 100
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.y = 1.3;
        rocket.add(nose);

        // Fins (4 sides)
        const finGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.6);
        const finMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF6666
        });

        for (let i = 0; i < 4; i++) {
            const fin = new THREE.Mesh(finGeometry, finMaterial);
            const angle = (Math.PI / 2) * i;
            fin.position.x = Math.cos(angle) * 0.35;
            fin.position.z = Math.sin(angle) * 0.35;
            fin.position.y = -0.7;
            fin.rotation.y = angle;
            rocket.add(fin);
        }

        // Flame (orange/yellow glow at bottom)
        const flameGeometry = new THREE.ConeGeometry(0.4, 0.8, 8);
        const flameMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFAA00,
            transparent: true,
            opacity: 0.7
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.y = -1.4;
        flame.rotation.x = Math.PI;
        rocket.add(flame);

        rocket.userData.flame = flame;
        rocket.userData.body = body;

        return rocket;
    }

    update(delta, player) {
        this.lifetime += delta;

        // Check if should explode (time-based)
        if (this.lifetime >= this.explodeTime) {
            this.explode(player);
            return;
        }

        // Fast upward movement with slight wobble
        this.wobbleTime += delta * 5;
        const wobble = Math.sin(this.wobbleTime) * 0.15;

        this.position.y += this.floatSpeed * delta;
        this.position.x += wobble * 0.1;

        this.mesh.position.copy(this.position);

        // Rocket rotation (spinning)
        this.mesh.rotation.y += delta * 3;

        // Flame animation (pulsing)
        if (this.mesh.userData.flame) {
            const flamePulse = Math.sin(this.lifetime * 20) * 0.5 + 0.5;
            this.mesh.userData.flame.scale.y = 1 + flamePulse * 0.5;
            this.mesh.userData.flame.material.opacity = 0.5 + flamePulse * 0.3;
        }

        // Warning effect as it's about to explode
        const timeRatio = this.lifetime / this.explodeTime;
        if (timeRatio > 0.7) {
            // Flash red warning
            const flash = Math.sin(this.lifetime * 30) > 0;
            if (this.mesh.userData.body) {
                this.mesh.userData.body.material.color.setHex(flash ? 0xFF0000 : 0xFF3333);
            }
        }

        // Shake before explosion
        if (timeRatio > 0.85) {
            const shake = (Math.random() - 0.5) * 0.2;
            this.mesh.position.x += shake;
            this.mesh.position.z += shake * 0.5;
        }

        // Check collision with player for riding
        const distance = this.position.distanceTo(player.position);
        if (distance < 2) {
            // Player can ride the rocket
            if (player.velocity.y <= 0) {
                // Landing on rocket
                this.isRiding = true;
                player.position.y = this.position.y + 1.5;
                player.velocity.y = this.floatSpeed; // Move with rocket (FAST!)
                player.isGrounded = true;
                player.jumpCount = 0;
            }
        } else {
            this.isRiding = false;
        }
    }

    explode(player) {
        // Check if player is near when exploding
        const distance = this.position.distanceTo(player.position);
        if (distance < 4) {
            // EXTREME HORIZONTAL KNOCKBACK!
            const pushDir = player.position.x > this.position.x ? 1 : -1;
            player.externalVelocity.x += pushDir * (this.explosionForce / 50);
            // Purely horizontal - no upward push
        }

        // Massive explosion effect
        AudioSystem.playExplosion();
        Effects.createParticleBurst(this.scene, this.position, 0xFF3333, 40);

        // Add fire particles
        for (let i = 0; i < 20; i++) {
            const particle = VoxelModels.createParticle(0xFFAA00);
            particle.position.copy(this.position);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.6,
                (Math.random() - 0.5) * 0.5
            );
            particle.userData.lifetime = 1.0;
            particle.userData.maxLifetime = 1.0;
            this.scene.add(particle);

            if (!Effects.particleSystems) Effects.particleSystems = [];
            Effects.particleSystems.push({
                particles: [particle],
                color: 0xFFAA00
            });
        }

        // Smoke particles
        for (let i = 0; i < 15; i++) {
            const smoke = VoxelModels.createParticle(0x666666);
            smoke.position.copy(this.position);
            smoke.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3 + 0.2,
                (Math.random() - 0.5) * 0.3
            );
            smoke.userData.lifetime = 1.5;
            smoke.userData.maxLifetime = 1.5;
            this.scene.add(smoke);

            Effects.particleSystems.push({
                particles: [smoke],
                color: 0x666666
            });
        }

        this.isAlive = false;
    }
}
