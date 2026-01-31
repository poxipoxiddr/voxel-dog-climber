// ===================================
// Special Items System
// ===================================

class ItemManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.items = [];
        this.spawnChance = 0.08; // 8% chance per platform (reduced from 15%)
        this.spawnHeight = 0;
    }

    update(delta, player, platforms) {
        const playerY = player.position.y;
        // Spawn new items on platforms above player
        platforms.forEach(platform => {
            const platformY = platform.position.y;

            // Only spawn on platforms above player and not too far
            if (platformY > this.spawnHeight &&
                platformY > playerY &&
                platformY < playerY + 30 &&
                !platform.userData.hasItem) {

                if (Math.random() < this.spawnChance) {
                    this.spawnItem(platform);
                }
                platform.userData.hasItem = true;
            }
        });

        this.spawnHeight = Math.max(this.spawnHeight, playerY);

        // Update existing items
        this.items = this.items.filter(item => {
            // Rotate item
            item.mesh.rotation.y += delta * 2;

            // Animate glow
            Effects.animateItemGlow(item.mesh, Date.now() / 1000);

            // Bob up and down
            item.mesh.position.y = item.baseY + Math.sin(Date.now() / 500) * 0.2;

            // Check collection
            const distance = this.player.position.distanceTo(item.mesh.position);
            if (distance < 1.5) {
                this.collectItem(item);
                return false;
            }

            // Culling: Remove if too far below player
            if (item.mesh.position.y < playerY - 35) {
                this.scene.remove(item.mesh);
                return false;
            }

            return true;
        });
    }

    spawnItem(platform) {
        const itemType = Math.random() < 0.3 ? 'bone' : 'food'; // 30% bone, 70% food (reduced from 50%)
        let mesh;

        if (itemType === 'bone') {
            mesh = VoxelModels.createBone();
        } else {
            mesh = VoxelModels.createFoodBowl();
        }

        // Position on platform
        const platformY = platform.position.y;
        mesh.position.set(
            platform.position.x,
            platformY + 2,
            platform.position.z
        );

        this.scene.add(mesh);

        this.items.push({
            type: itemType,
            mesh: mesh,
            baseY: platformY + 2
        });
    }

    collectItem(item) {
        // Visual feedback
        Effects.createParticleBurst(
            this.scene,
            item.mesh.position,
            item.type === 'bone' ? 0xFFD700 : 0x10b981,
            20
        );

        AudioSystem.playCollect();

        // Apply effect
        if (item.type === 'bone') {
            this.player.activateLevitation(3);
            this.showEffectBadge('levitation', '🦴 3배속 공중부양! (바닥 관통)', 3);
        } else {
            this.player.activateJumpBoost(10);
            this.showEffectBadge('jump-boost', '🍖 점프력 증가!', 10);
        }

        // Remove item
        this.scene.remove(item.mesh);
    }

    showEffectBadge(type, text, duration) {
        const display = document.getElementById('effects-display');

        // Remove existing badge of same type
        const existing = display.querySelector(`.effect-badge.${type}`);
        if (existing) {
            existing.remove();
        }

        // Create new badge
        const badge = document.createElement('div');
        badge.className = `effect-badge ${type}`;
        badge.innerHTML = `
            <span>${text}</span>
            <span class="timer">${duration}s</span>
        `;
        display.appendChild(badge);

        // Update timer
        const timerSpan = badge.querySelector('.timer');
        const interval = setInterval(() => {
            duration--;
            timerSpan.textContent = `${duration}s`;

            if (duration <= 0) {
                clearInterval(interval);
                badge.style.animation = 'popOut 0.3s ease-out';
                setTimeout(() => badge.remove(), 300);
            }
        }, 1000);
    }

    reset() {
        // Remove all items
        this.items.forEach(item => {
            this.scene.remove(item.mesh);
        });
        this.items = [];
        this.spawnHeight = 0;

        // Clear effect badges
        const display = document.getElementById('effects-display');
        display.innerHTML = '';
    }
}

// Add pop-out animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes popOut {
        to {
            opacity: 0;
            transform: scale(0.5);
        }
    }
`;
document.head.appendChild(style);
