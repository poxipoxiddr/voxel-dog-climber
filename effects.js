// ===================================
// Visual Effects System
// ===================================

const Effects = {
    particleSystems: [],

    // Create particle burst effect
    createParticleBurst(scene, position, color, count = 15) {
        const particles = [];

        for (let i = 0; i < count; i++) {
            const particle = VoxelModels.createParticle(color);
            particle.position.copy(position);

            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.2
            );

            particle.userData.velocity = velocity;
            particle.userData.lifetime = 1.0;
            particle.userData.maxLifetime = 1.0;

            scene.add(particle);
            particles.push(particle);
        }

        this.particleSystems.push({
            particles: particles,
            color: color
        });
    },

    // Update all particle systems
    update(delta, scene) {
        this.particleSystems.forEach((system, index) => {
            system.particles = system.particles.filter(particle => {
                particle.userData.lifetime -= delta;

                if (particle.userData.lifetime <= 0) {
                    scene.remove(particle);
                    return false;
                }

                // Update position
                particle.position.add(particle.userData.velocity);

                // Apply gravity
                particle.userData.velocity.y -= 0.5 * delta;

                // Fade out
                const lifeRatio = particle.userData.lifetime / particle.userData.maxLifetime;
                particle.material.opacity = lifeRatio;
                particle.material.transparent = true;
                particle.scale.setScalar(lifeRatio);

                return true;
            });

            // Remove empty systems
            if (system.particles.length === 0) {
                this.particleSystems.splice(index, 1);
            }
        });
    },

    // Create trail effect
    createTrail(scene, position, color) {
        const trail = VoxelModels.createParticle(color);
        trail.position.copy(position);
        trail.scale.setScalar(0.3);
        trail.userData.lifetime = 0.5;
        trail.userData.maxLifetime = 0.5;
        trail.userData.velocity = new THREE.Vector3(0, -0.1, 0);

        scene.add(trail);
        this.particleSystems.push({
            particles: [trail],
            color: color
        });
    },

    // Animate item glow
    animateItemGlow(item, time) {
        if (item.userData.glow) {
            const pulse = Math.sin(time * 3) * 0.5 + 0.5;
            item.userData.glow.material.opacity = 0.2 + pulse * 0.3;
            item.userData.glow.scale.setScalar(1 + pulse * 0.2);
        }
    },

    // Create jump dust effect
    createJumpDust(scene, position) {
        this.createParticleBurst(scene, position, 0x8B7355, 8);
    },

    // Create landing effect
    createLandingEffect(scene, position) {
        this.createParticleBurst(scene, position, 0xCCCCCC, 12);
    },

    // Clear all effects
    clear(scene) {
        this.particleSystems.forEach(system => {
            system.particles.forEach(particle => {
                scene.remove(particle);
            });
        });
        this.particleSystems = [];
    }
};

// ===================================
// Camera Controller
// ===================================

const CameraController = {
    camera: null,
    target: null,
    currentPosition: new THREE.Vector3(),
    smoothness: 0.1,

    init(camera) {
        this.camera = camera;
        this.baseFOV = camera.fov;
        this.targetFOV = camera.fov;
        this.baseOffset = new THREE.Vector3(0, 8, 12);
        this.targetOffset = this.baseOffset.clone();
    },

    setTarget(target) {
        this.target = target;
    },

    setSpeedEffect(active) {
        if (active) {
            this.targetFOV = 85; // Wide angle
            this.targetOffset.set(0, 5, 18); // Further back, camera lower
        } else {
            this.targetFOV = this.baseFOV;
            this.targetOffset.copy(this.baseOffset);
        }
    },

    update() {
        if (!this.target || !this.camera) return;

        // Desired camera position (behind and above the player)
        const targetPosition = this.target.position.clone().add(this.targetOffset);

        // Lerp FOV
        if (this.camera.fov !== this.targetFOV) {
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFOV, 0.1);
            this.camera.updateProjectionMatrix();
        }

        // Smooth follow
        this.currentPosition.lerp(targetPosition, this.smoothness);
        this.camera.position.copy(this.currentPosition);

        // Look at player
        this.camera.lookAt(
            this.target.position.x,
            this.target.position.y + 2,
            this.target.position.z
        );
    }
};
