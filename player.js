// ===================================
// Player Character Controller
// ===================================

class Player {
    constructor(scene) {
        this.scene = scene;

        // Create dog model
        this.model = VoxelModels.createDog();
        this.scene.add(this.model);

        // Physics properties
        this.position = new THREE.Vector3(0, 2, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravity = -25;
        this.moveSpeed = 8;
        this.jumpForce = 13; // Slightly increased from 12
        this.highJumpForce = 18; // Slightly increased from 16

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
                    if (!this.keys.highJump && this.canJump()) {
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
                if (!this.keys.highJump && this.canJump()) {
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

        // Apply jump boost if active
        if (this.hasJumpBoost) {
            force *= 1.8;
        }

        this.velocity.y = force;
        this.jumpCount++;
        this.isGrounded = false;

        // Visual feedback
        Effects.createJumpDust(this.scene, this.position.clone());

        // Add slight trail effect for triple jump
        if (this.jumpCount >= 2) {
            Effects.createTrail(this.scene, this.position.clone(), 0xa78bfa);
        }
    }

    update(delta, platforms) {
        // Movement
        if (this.keys.left) {
            this.velocity.x = -this.moveSpeed;
            this.model.rotation.y = Math.PI / 4; // Face left
        } else if (this.keys.right) {
            this.velocity.x = this.moveSpeed;
            this.model.rotation.y = -Math.PI / 4; // Face right
        } else {
            this.velocity.x *= 0.8; // Friction
        }

        // Levitation effect (bone item - 3x speed with floor penetration)
        if (this.hasLevitation) {
            this.levitationTimer -= delta;
            this.velocity.y = 9; // Float upward 3x faster

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

        // Update position
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;

        // Clamp horizontal movement
        const maxX = 10; // Increased to match wider platform distribution
        this.position.x = Math.max(-maxX, Math.min(maxX, this.position.x));

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
        this.animate(delta);

        // Game over if fell too far
        if (this.position.y < -20) {
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

    animate(delta) {
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
    }
}
