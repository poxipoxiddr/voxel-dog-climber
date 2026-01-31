// ===================================
// Player Character Controller
// ===================================

class Player {
    constructor(scene) {
        this.scene = scene;

        // Create dog model
        this.model = VoxelModels.createDog();
        this.scene.add(this.model);

        // Add blob shadow
        this.shadow = VoxelModels.createBlobShadow();
        this.scene.add(this.shadow);

        // Create wings (hidden by default)
        this.createWings();

        // Physics properties
        this.position = new THREE.Vector3(0, 2, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.externalVelocity = new THREE.Vector3(0, 0, 0); // For knockback
        this.gravity = -25;
        this.moveSpeed = 16; // Doubled from 8
        this.jumpForce = 13;
        this.highJumpForce = 27; // 1.5x boost (was 18)

        // Jump state
        this.isGrounded = false;
        this.jumpCount = 0;
        this.maxJumps = 3; // Triple jump!

        // Animation
        this.tailWagTime = 0;
        this.legAnimTime = 0;

        // Special effects
        this.hasLevitation = false;
        this.levitationTimer = 0;
        this.hasJumpBoost = false;
        this.jumpBoostTimer = 0;

        // Stun state
        this.isStunned = false;
        this.stunTimer = 0;

        // Super Jump state (1000pt bonus)
        this.hasSuperJump = false;
        this.superJumpTimer = 0;

        // Input
        this.keys = {
            left: false,
            right: false,
            jump: false,
            highJump: false
        };

        this.setupInput();
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'ArrowLeft':
                    this.keys.left = true;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.keys.right = true;
                    e.preventDefault();
                    break;
                case 'Space':
                    if (!this.keys.jump && this.canJump()) {
                        this.jump(false);
                    }
                    this.keys.jump = true;
                    e.preventDefault();
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    // High jump only available on 3rd jump
                    if (!this.keys.highJump && this.jumpCount === 2 && this.canJump()) {
                        this.jump(true);
                    }
                    this.keys.highJump = true;
                    e.preventDefault();
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowLeft':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                    this.keys.right = false;
                    break;
                case 'Space':
                    this.keys.jump = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.highJump = false;
                    break;
            }
        });

        // Touch controls for mobile
        this.setupTouchControls();
    }

    setupTouchControls() {
        // Left button
        const btnLeft = document.getElementById('btn-left');
        if (btnLeft) {
            btnLeft.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys.left = true;
            });
            btnLeft.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys.left = false;
            });
        }

        // Right button
        const btnRight = document.getElementById('btn-right');
        if (btnRight) {
            btnRight.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys.right = true;
            });
            btnRight.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys.right = false;
            });
        }

        // Jump button
        const btnJump = document.getElementById('btn-jump');
        if (btnJump) {
            btnJump.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!this.keys.jump && this.canJump()) {
                    this.jump(false);
                }
                this.keys.jump = true;
            });
            btnJump.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys.jump = false;
            });
        }

        // High jump button
        const btnHighJump = document.getElementById('btn-highjump');
        if (btnHighJump) {
            btnHighJump.addEventListener('touchstart', (e) => {
                e.preventDefault();
                // High jump only available on 3rd jump
                if (!this.keys.highJump && this.jumpCount === 2 && this.canJump()) {
                    this.jump(true);
                }
                this.keys.highJump = true;
            });
            btnHighJump.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys.highJump = false;
            });
        }
    }

    canJump() {
        return this.isGrounded || this.jumpCount < this.maxJumps;
    }

    jump(isHighJump) {
        let force = isHighJump ? this.highJumpForce : this.jumpForce;

        // Apply super jump (2x force)
        if (this.hasSuperJump) {
            force *= 2.0;
            // Create massive jump effect
            Effects.createParticleBurst(this.scene, this.position, 0xFFD700, 30);
        } else if (this.hasJumpBoost) {
            // Apply regular jump boost if active
            force *= 1.8;
        }

        this.velocity.y = force;
        this.jumpCount++;
        this.isGrounded = false;

        // Visual feedback
        Effects.createJumpDust(this.scene, this.position.clone());
        if (isHighJump) {
            AudioSystem.playHighJump();
        } else {
            AudioSystem.playJump();
        }

        // Add slight trail effect for triple jump
        if (this.jumpCount >= 2) {
            Effects.createTrail(this.scene, this.position.clone(), 0xa78bfa);
        }
    }

    update(delta, platforms) {
        // Movement processing
        let moveX = 0;
        if (this.keys.left) {
            moveX = -this.moveSpeed;
            this.model.rotation.y = Math.PI / 4; // Face left
        } else if (this.keys.right) {
            moveX = this.moveSpeed;
            this.model.rotation.y = -Math.PI / 4; // Face right
        }

        // 3x Move Speed during Levitation
        if (this.hasLevitation) {
            moveX *= 3;
        }

        // Combine internal move velocity with external knockback
        // Use lerp for smooth horizontal movement but keep vertical separate
        if (moveX !== 0) {
            this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, moveX, delta * 15);
        } else {
            this.velocity.x *= Math.pow(0.8, delta * 60); // Friction (scaled by delta)
        }

        // Apply external velocity (knockback)
        this.velocity.x += this.externalVelocity.x;
        this.externalVelocity.x *= Math.pow(0.9, delta * 60); // Deceleration for knockback
        if (Math.abs(this.externalVelocity.x) < 0.1) this.externalVelocity.x = 0;

        // Levitation effect (bone item - 3x speed with floor penetration)
        if (this.hasLevitation) {
            this.levitationTimer -= delta;
            this.velocity.y = 27; // Float upward 3x faster (was 9)

            if (this.levitationTimer <= 0) {
                this.hasLevitation = false;
            }
        } else {
            // Apply gravity
            this.velocity.y += this.gravity * delta;
        }

        // Jump boost timer
        if (this.hasJumpBoost) {
            this.jumpBoostTimer -= delta;
            if (this.jumpBoostTimer <= 0) {
                this.hasJumpBoost = false;
            }
        }

        // Stun timer
        if (this.isStunned) {
            this.stunTimer -= delta;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
            }
        }

        // Super Jump timer
        if (this.hasSuperJump) {
            this.superJumpTimer -= delta;
            if (this.superJumpTimer <= 0) {
                this.hasSuperJump = false;
                this.model.scale.set(1, 1, 1); // Reset scale
                CameraController.setSpeedEffect(false);
            }
        }

        // Update position
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;

        // Clamp horizontal movement
        const maxX = 10; // Increased to match wider platform distribution
        this.position.x = Math.max(-maxX, Math.min(maxX, this.position.x));

        // Squash & Stretch Animation (Dynamic scaling based on movement/jump)
        this.applySquashAndStretch(delta);

        // Platform collision (skip when levitating with bone)
        this.isGrounded = false;

        if (!this.hasLevitation) {
            platforms.forEach(platform => {
                if (this.checkCollision(platform)) {
                    const platformTop = platform.position.y + platform.userData.height / 2;
                    const platformBottom = platform.position.y - platform.userData.height / 2;

                    // When falling down - land on platform
                    if (this.velocity.y <= 0 && this.position.y >= platformTop - 0.5) {
                        this.position.y = platformTop + 1;
                        this.velocity.y = 0;
                        this.isGrounded = true;
                        this.jumpCount = 0;
                    }
                    // When jumping up - block ONLY if clearly hitting bottom from below
                    // (not when just starting jump from top of platform)
                    else if (this.velocity.y > 0 && this.position.y < platformBottom + 0.5) {
                        this.position.y = platformBottom - 1;
                        this.velocity.y = 0; // Stop upward movement
                    }
                }
            });
        }

        // Update model position
        this.model.position.copy(this.position);

        // Animations
        this.animate(delta, platforms);

        // Game over if fell below the lowest platform
        let lowestPlatformY = 0;
        platforms.forEach(p => {
            lowestPlatformY = Math.min(lowestPlatformY, p.position.y);
        });
        if (this.position.y < lowestPlatformY - 10) {
            return false; // Game over
        }

        return true;
    }

    checkCollision(platform) {
        const platformPos = platform.position;
        const platformWidth = platform.userData.width || 3;
        const platformDepth = platform.userData.depth || 3;
        const platformHeight = platform.userData.height || 0.5;

        // Horizontal overlap check
        const onPlatform =
            this.position.x > platformPos.x - platformWidth / 2 &&
            this.position.x < platformPos.x + platformWidth / 2 &&
            this.position.z > platformPos.z - platformDepth / 2 &&
            this.position.z < platformPos.z + platformDepth / 2 &&
            this.position.y > platformPos.y - platformHeight / 2 &&
            this.position.y < platformPos.y + platformHeight / 2 + 2;

        return onPlatform;
    }

    animate(delta, platforms) {
        // Tail wag
        this.tailWagTime += delta * 5;
        if (this.model.userData.tail) {
            this.model.userData.tail.rotation.z = Math.sin(this.tailWagTime) * 0.3;
        }

        // Leg animation when moving
        if (this.keys.left || this.keys.right) {
            this.legAnimTime += delta * 10;
        }

        // Slight bob when in air
        if (!this.isGrounded) {
            this.model.rotation.x = Math.sin(this.tailWagTime * 2) * 0.1;
        } else {
            this.model.rotation.x = 0;
        }

        // Update shadow position and scale (fade out when high in air)
        if (this.shadow) {
            this.shadow.position.x = this.position.x;
            this.shadow.position.z = this.position.z;

            // Find floor height below player for shadow placement
            let floorY = -100;
            platforms.forEach(p => {
                if (Math.abs(this.position.x - p.position.x) < (p.userData.width / 2 + 0.5) &&
                    p.position.y < this.position.y) {
                    floorY = Math.max(floorY, p.position.y + p.userData.height / 2);
                }
            });

            if (floorY > -99) {
                this.shadow.position.y = floorY + 0.05;
                const distance = this.position.y - floorY;
                const scale = Math.max(0.2, 1.2 - distance * 0.1);
                this.shadow.scale.set(scale, scale, 1);
                this.shadow.visible = true;
            } else {
                this.shadow.visible = false;
            }
        }

        // Update wings visibility and flapping
        this.updateWings(delta);
    }

    applySquashAndStretch(delta) {
        // Base scale
        let targetScaleX = 1;
        let targetScaleY = 1;
        let targetScaleZ = 1;

        if (!this.isGrounded) {
            // Stretching when jumping/falling
            const stretchAmount = Math.abs(this.velocity.y) * 0.02;
            targetScaleY = 1 + stretchAmount;
            targetScaleX = 1 - stretchAmount * 0.5;
            targetScaleZ = 1 - stretchAmount * 0.5;
        } else {
            // Squashing slightly when landed (or breathing)
            const breath = Math.sin(Date.now() * 0.01) * 0.02;
            targetScaleY = 1 + breath;
            targetScaleX = 1 - breath * 0.5;
            targetScaleZ = 1 - breath * 0.5;
        }

        // Lerp scale for smoothness
        this.model.scale.x = THREE.MathUtils.lerp(this.model.scale.x, targetScaleX, delta * 10);
        this.model.scale.y = THREE.MathUtils.lerp(this.model.scale.y, targetScaleY, delta * 10);
        this.model.scale.z = THREE.MathUtils.lerp(this.model.scale.z, targetScaleZ, delta * 10);

        // Pulsing effect during Super Jump
        if (this.hasSuperJump) {
            const pulse = 1.0 + Math.sin(Date.now() * 0.02) * 0.2;
            this.model.scale.multiplyScalar(pulse);
        }
    }

    createWings() {
        // Create simple white voxel wings
        const wingGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.5);
        const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

        this.leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.leftWing.position.set(-1.0, 0.2, -0.3);
        this.leftWing.visible = false;
        this.model.add(this.leftWing);

        this.rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.rightWing.position.set(1.0, 0.2, -0.3);
        this.rightWing.visible = false;
        this.model.add(this.rightWing);
    }

    updateWings(delta) {
        // Show/hide wings based on levitation
        const showWings = this.hasLevitation;
        this.leftWing.visible = showWings;
        this.rightWing.visible = showWings;

        if (showWings) {
            // Flapping animation
            const flap = Math.sin(Date.now() * 0.015) * 0.6;
            this.leftWing.rotation.z = flap;
            this.rightWing.rotation.z = -flap;
        }
    }

    activateSuperJump(duration = 5) {
        this.hasSuperJump = true;
        this.superJumpTimer = duration;
        // Super feedback for activation
        Effects.createParticleBurst(this.scene, this.position, 0xFFD700, 50);
        AudioSystem.playSuperJump();
        CameraController.setSpeedEffect(true);
    }

    getAltitude() {
        return Math.floor(this.position.y);
    }

    setColor(color) {
        // Recreate the model with the new color
        this.scene.remove(this.model);
        this.model = VoxelModels.createDog(color);
        this.scene.add(this.model);

        // Re-add wings to the new model
        this.createWings();

        // Ensure position and rotation are maintained
        this.model.position.copy(this.position);
    }

    activateLevitation(duration = 3) { // Reduced from 5 to 3 seconds
        this.hasLevitation = true;
        this.levitationTimer = duration;
    }

    activateJumpBoost(duration = 10) {
        this.hasJumpBoost = true;
        this.jumpBoostTimer = duration;
    }

    applyStun(duration = 0.3) {
        this.isStunned = true;
        this.stunTimer = duration;
        this.velocity.x *= 0.3; // Slow down horizontal movement
        this.externalVelocity.x *= 0.3;
    }

    getAltitude() {
        return Math.max(0, Math.floor(this.position.y));
    }

    reset() {
        this.position.set(0, 2, 0);
        this.velocity.set(0, 0, 0);
        this.isGrounded = false;
        this.jumpCount = 0;
        this.hasLevitation = false;
        this.hasJumpBoost = false;
        this.levitationTimer = 0;
        this.jumpBoostTimer = 0;
        this.hasSuperJump = false;
        this.superJumpTimer = 0;
        CameraController.setSpeedEffect(false);
        if (this.leftWing) this.leftWing.visible = false;
        if (this.rightWing) this.rightWing.visible = false;
    }
}

class RemotePlayer {
    constructor(scene, data) {
        this.scene = scene;
        this.id = data.id;
        this.name = data.name || '플레이어';
        this.color = data.color || 0x8B5E3C;

        // Create dog model with specific color
        this.model = VoxelModels.createDog(this.color);
        this.scene.add(this.model);

        // Add nickname label
        this.label = this.createNameLabel(this.name, this.color);
        this.scene.add(this.label);

        this.position = new THREE.Vector3(0, 0, 0);
        if (data.position) {
            this.position.set(data.position.x, data.position.y, data.position.z);
        }

        this.model.position.copy(this.position);
    }

    createNameLabel(name, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Background & Border
        const hexColor = '#' + color.toString(16).padStart(6, '0');
        context.beginPath();
        context.roundRect(3, 3, 250, 58, 12); // Slightly inset to avoid clipping
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fill();
        context.strokeStyle = hexColor;
        context.lineWidth = 6;
        context.stroke();

        // Text
        context.font = 'bold 32px "Outfit", sans-serif';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(4, 1, 1);
        return sprite;
    }

    updatePosition(pos) {
        this.position.set(pos.x, pos.y, pos.z);
        this.model.position.copy(this.position);

        // Update label position (above head)
        this.label.position.set(pos.x, pos.y + 3, pos.z);

        // Rotation based on movement direction (simplified)
        if (this.lastX !== undefined) {
            if (pos.x < this.lastX) this.model.rotation.y = Math.PI / 4;
            else if (pos.x > this.lastX) this.model.rotation.y = -Math.PI / 4;
        }
        this.lastX = pos.x;
    }

    destroy() {
        this.scene.remove(this.model);
        this.scene.remove(this.label);
    }
}
