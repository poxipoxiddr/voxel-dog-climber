// ===================================
// Multi-item / Multiplayer interaction
// ===================================

class ItemManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.items = [];
        this.spawnChance = 0.08; 
        this.spawnHeight = 0;
    }

    update(delta, player, platforms) {
        const playerY = player.position.y;
        platforms.forEach(platform => {
            const platformY = platform.position.y;

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

        this.items = this.items.filter(item => {
            item.mesh.rotation.y += delta * 2;
            Effects.animateItemGlow(item.mesh, Date.now() / 1000);
            item.mesh.position.y = item.baseY + Math.sin(Date.now() / 500) * 0.2;

            const distance = this.player.position.distanceTo(item.mesh.position);
            if (distance < 1.5) {
                this.collectItem(item);
                return false;
            }

            if (item.mesh.position.y < playerY - 35) {
                this.scene.remove(item.mesh);
                return false;
            }

            return true;
        });
    }

    spawnItem(platform) {
        const rand = Math.random();
        let itemType;
        if (rand < 0.2) itemType = 'bone';       // 20% bone
        else if (rand < 0.4) itemType = 'treat';  // 20% treat (New!)
        else if (rand < 0.5) itemType = 'ink';    // 10% ink (New!)
        else itemType = 'food';                   // 50% food

        let mesh;
        if (itemType === 'bone') mesh = VoxelModels.createBone();
        else if (itemType === 'food') mesh = VoxelModels.createFoodBowl();
        else if (itemType === 'treat') mesh = VoxelModels.createTreat();
        else if (itemType === 'ink') mesh = VoxelModels.createInkPot();

        const platformY = platform.position.y;
        mesh.position.set(platform.position.x, platformY + 2, platform.position.z);
        this.scene.add(mesh);

        this.items.push({ type: itemType, mesh: mesh, baseY: platformY + 2 });
    }

    collectItem(item) {
        let color = 0x10b981;
        if (item.type === 'bone') color = 0xFFD700;
        else if (item.type === 'treat') color = 0xFFA500;
        else if (item.type === 'ink') color = 0x333333;

        Effects.createParticleBurst(this.scene, item.mesh.position, color, 20);
        AudioSystem.playCollect();

        if (item.type === 'bone') {
            this.player.activateLevitation(3);
            this.showEffectBadge('levitation', '🦴 3배속 공중부양!', 3);
        } else if (item.type === 'food') {
            this.player.activateJumpBoost(10);
            this.showEffectBadge('jump-boost', '🍖 점프력 증가!', 10);
        } else if (item.type === 'treat') {
            // Collectible bone/treat for costumes
            this.player.collectTreat();
            this.showEffectBadge('treat-collect', '🦴 간식 수집!', 2);
        } else if (item.type === 'ink') {
            // Multiplayer sabotage: ink screen for others
            if (Multiplayer.channel) {
                Multiplayer.broadcastSabotage('ink');
            }
            this.showEffectBadge('sabotage', '🐙 먹물 방해 발사!', 3);
        }

        this.scene.remove(item.mesh);
    }

    showEffectBadge(type, text, duration) {
        const display = document.getElementById('effects-display');
        const existing = display.querySelector(`.effect-badge.${type}`);
        if (existing) existing.remove();

        const badge = document.createElement('div');
        badge.className = `effect-badge ${type}`;
        badge.innerHTML = `<span>${text}</span><span class="timer">${duration}s</span>`;
        display.appendChild(badge);

        const timerSpan = badge.querySelector('.timer');
        const interval = setInterval(() => {
            duration--;
            if (timerSpan) timerSpan.textContent = `${duration}s`;
            if (duration <= 0) {
                clearInterval(interval);
                badge.style.animation = 'popOut 0.3s ease-out';
                setTimeout(() => badge.remove(), 300);
            }
        }, 1000);
    }

    reset() {
        this.items.forEach(item => this.scene.remove(item.mesh));
        this.items = [];
        this.spawnHeight = 0;
        const display = document.getElementById('effects-display');
        display.innerHTML = '';
    }
}
