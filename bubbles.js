// ===================================
// Bubble System - Rideable bubbles that pop
// ===================================

class BubbleManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.bubbles = [];
        this.spawnChance = 0.008; // Spawn chance per frame
        this.lastSpawnTime = 0;
    }

    update(delta, player, platforms) {
        const playerY = player.position.y;
        // Spawn bubbles from platform sides
        if (Math.random() < this.spawnChance) {
            this.spawnBubble(playerY, platforms);
        }

        // Update all bubbles
        this.bubbles = this.bubbles.filter(bubble => {
            bubble.update(delta, this.player);

            // Culling: Remove if too far from player or popped
            const distanceFromPlayer = Math.abs(bubble.position.y - playerY);
            if (bubble.position.y < playerY - 35 || distanceFromPlayer > 60 || !bubble.isAlive) {
                this.scene.remove(bubble.mesh);
                return false;
            }

            return true;
        });
    }

    spawnBubble(playerY, platforms) {
        // Find a platform near player
        const nearbyPlatforms = platforms.filter(p =>
            Math.abs(p.position.y - playerY) < 20
        );

        if (nearbyPlatforms.length === 0) return;

        const platform = nearbyPlatforms[Math.floor(Math.random() * nearbyPlatforms.length)];
        const bubble = new Bubble(this.scene, platform);
        this.bubbles.push(bubble);
    }

    reset() {
        this.bubbles.forEach(bubble => {
            this.scene.remove(bubble.mesh);
        });
        this.bubbles = [];
    }
}

// ===================================
// Bubble - Rideable, pops with knockback
// ===================================

class Bubble {
    constructor(scene, platform) {
        this.scene = scene;
        this.isAlive = true;
        this.isRiding = false;

        // Create bubble model
        this.mesh = this.createModel();

        // Random side of platform
        const side = Math.random() > 0.5 ? 1 : -1;
        const platformWidth = platform.userData.width || 3;

        // Position at platform side
        this.position = new THREE.Vector3(
            platform.position.x + (side * platformWidth / 2) + (side * 1), // Just outside platform
            platform.position.y,
            0
        );
        this.mesh.position.copy(this.position);

        // Physics
        this.velocity = new THREE.Vector3(0, 3, 0); // Float upward
        this.floatSpeed = 3;
        this.bobTime = Math.random() * Math.PI * 2;

        // Random pop time (2-5 seconds)
        this.popTime = 2 + Math.random() * 3;
        this.lifetime = 0;

        // Knockback when popped
        this.popForce = 140; // 4x total!

        this.scene.add(this.mesh);
    }

    createModel() {
        const bubble = new THREE.Group();

        // Main bubble (transparent sphere-like)
        // Optimized: Reduced segments from 16 to 8
        const bubbleGeometry = new THREE.SphereGeometry(1.2, 8, 8);
        const bubbleMaterial = new THREE.MeshPhongMaterial({
            color: 0x88CCFF,
            transparent: true,
            opacity: 0.4,
            shininess: 100,
            specular: 0xFFFFFF
        });
        const bubbleMesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        bubble.add(bubbleMesh);

        // Inner glow
        // Optimized: Reduced segments from 16 to 8
        const glowGeometry = new THREE.SphereGeometry(1.0, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xAADDFF,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bubble.add(glow);

        // Shine highlight
        // Optimized: Replaced Sphere with Box for shine
        const shineGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const shineMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });
        const shine = new THREE.Mesh(shineGeometry, shineMaterial);
        shine.position.set(-0.4, 0.5, 0.8);
        bubble.add(shine);

        bubble.userData.glow = glow;

        return bubble;
    }

    update(delta, player) {
        this.lifetime += delta;

        // Check if should pop (time-based)
        if (this.lifetime >= this.popTime) {
            this.pop(player);
            return;
        }

        // Float upward with bobbing
        this.bobTime += delta * 2;
        const bobOffset = Math.sin(this.bobTime) * 0.3;

        this.position.y += this.floatSpeed * delta;
        this.position.x += Math.sin(this.bobTime * 0.5) * 0.05;

        this.mesh.position.set(
            this.position.x + bobOffset * 0.2,
            this.position.y,
            this.position.z
        );

        // Rotation animation
        this.mesh.rotation.y += delta * 0.5;

        // Pulse animation (gets faster as it's about to pop)
        const timeRatio = this.lifetime / this.popTime;
        const pulseSpeed = 3 + timeRatio * 5;
        const pulse = Math.sin(this.lifetime * pulseSpeed) * 0.5 + 0.5;
        this.mesh.scale.setScalar(1 + pulse * 0.1);

        // Glow pulsing
        if (this.mesh.userData.glow) {
            this.mesh.userData.glow.material.opacity = 0.2 + pulse * 0.15;
        }

        // Check collision with player for riding
        const distance = this.position.distanceTo(player.position);
        if (distance < 2) {
            // Player can ride the bubble
            if (player.velocity.y <= 0) {
                // Landing on bubble
                this.isRiding = true;
                player.position.y = this.position.y + 1.5;
                player.velocity.y = this.floatSpeed; // Move with bubble
                player.isGrounded = true;
                player.jumpCount = 0;
            }

            // Check if player jumped off or bubble is about to pop
            if (timeRatio > 0.8) {
                // Warning: bubble is about to pop!
                this.mesh.children[0].material.color.setHex(0xFF8888); // Turn reddish
            }
        } else {
            this.isRiding = false;
        }
    }

    pop(player) {
        // Check if player is near when popping
        const distance = this.position.distanceTo(player.position);
        if (distance < 3) {
            // STRONG HORIZONTAL KNOCKBACK ONLY!
            const pushDir = player.position.x > this.position.x ? 1 : -1;
            player.externalVelocity.x += pushDir * (this.popForce / 50);
            // No upward push - purely horizontal
        }

        // Pop effect
        AudioSystem.playPop();
        Effects.createParticleBurst(this.scene, this.position, 0x88CCFF, 25);

        // Add extra sparkle particles
        for (let i = 0; i < 10; i++) {
            const particle = VoxelModels.createParticle(0xFFFFFF);
            particle.position.copy(this.position);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.4,
                (Math.random() - 0.5) * 0.3
            );
            particle.userData.lifetime = 0.8;
            particle.userData.maxLifetime = 0.8;
            this.scene.add(particle);

            // Add to effects system
            if (!Effects.particleSystems) Effects.particleSystems = [];
            Effects.particleSystems.push({
                particles: [particle],
                color: 0xFFFFFF
            });
        }

        this.isAlive = false;
    }
}
