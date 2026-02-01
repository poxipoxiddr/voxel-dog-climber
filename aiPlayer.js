// =/root/.openclaw/workspace/voxel-dog-climber/aiPlayer.js
// ===================================
// AI Player Controller
// ===================================

class AIPlayer {
    constructor(scene, roomCode) {
        this.scene = scene;
        this.roomCode = roomCode;
        this.name = 'OpenClaw_Bot';
        this.color = 0x4DFFFF; // Vibrant Cyan
        
        this.player = new Player(this.scene);
        this.player.setColor(this.color);
        
        // Disable default input
        this.player.setupInput = () => {};
        this.player.setupTouchControls = () => {};
        
        // AI State
        this.aiTimer = 0;
        this.chatTimer = Math.random() * 5 + 5;
        this.targetPlayer = null;
        
        // Initialize as a multiplayer participant
        this.initMultiplayer();
    }

    async initMultiplayer() {
        try {
            // We use the existing Multiplayer manager but with a special ID
            this.id = 'ai_bot_' + Math.random().toString(36).substr(2, 5);
            
            // Create a custom join logic for AI
            const channelName = `room_${this.roomCode}`;
            this.channel = Multiplayer.supabase.channel(channelName, {
                config: {
                    presence: { key: this.id },
                },
            });

            await new Promise((resolve, reject) => {
                this.channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await this.channel.track({
                            name: this.name,
                            color: this.color,
                            position: this.player.position,
                            isHost: false,
                            isAI: true
                        });
                        resolve();
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        reject();
                    }
                });
            });

            // Listen for position updates to find target player
            this.channel.on('broadcast', { event: 'position' }, ({ payload }) => {
                if (payload.playerId !== this.id && !payload.playerId.startsWith('ai_bot')) {
                    // Simple target selection: follow the first human player found
                    if (!this.targetPlayer) {
                        this.targetPlayerId = payload.playerId;
                    }
                }
            });
            
            console.log('AI Bot connected to room:', this.roomCode);
        } catch (e) {
            console.error('AI Bot failed to join room:', e);
        }
    }

    update(delta, platforms, remotePlayers) {
        if (!this.player) return;

        // Reset inputs
        this.player.keys.left = false;
        this.player.keys.right = false;

        // Ensure we have platforms to climb
        if (!platforms || platforms.length === 0) {
            this.player.update(delta, []);
            return;
        }

        // 1. Perception: Find nearby platforms and players
        const currentY = this.player.position.y;
        const currentX = this.player.position.x;
        
        let bestPlatform = null;
        let minDist = Infinity;

        platforms.forEach(p => {
            const py = p.position.y;
            const px = p.position.x;
            
            // Look for platforms above
            if (py > currentY - 1 && py < currentY + 15) {
                const dist = Math.abs(px - currentX) + Math.abs(py - currentY);
                if (dist < minDist) {
                    minDist = dist;
                    bestPlatform = p;
                }
            }
        });

        // 2. Logic: Move and Jump
        if (bestPlatform) {
            const targetX = bestPlatform.position.x;
            const diffX = targetX - currentX;

            if (Math.abs(diffX) > 0.5) {
                if (diffX > 0) this.player.keys.right = true;
                else this.player.keys.left = true;
            }

            // Jump logic
            if (this.player.isGrounded) {
                this.player.jump(false);
            } else if (this.player.velocity.y < 0 && this.player.jumpCount < this.player.maxJumps) {
                // Double/Triple jump if falling and not reaching target
                if (bestPlatform.position.y > currentY + 2) {
                    this.player.jump(this.player.jumpCount === 2);
                }
            }
        }

        // 3. Social Logic: Follow player
        if (remotePlayers && remotePlayers.size > 0) {
            let nearestPlayer = null;
            let pMinDist = 20;

            remotePlayers.forEach((rp) => {
                const d = this.player.position.distanceTo(rp.position);
                if (d < pMinDist) {
                    pMinDist = d;
                    nearestPlayer = rp;
                }
            });

            if (nearestPlayer && !bestPlatform) {
                const diffX = nearestPlayer.position.x - currentX;
                if (Math.abs(diffX) > 1) {
                    if (diffX > 0) this.player.keys.right = true;
                    else this.player.keys.left = true;
                }
            }
        }

        // 4. Chatting Logic
        this.chatTimer -= delta;
        if (this.chatTimer <= 0) {
            this.showChat();
            this.chatTimer = Math.random() * 10 + 10;
        }

        // Apply physics and update
        this.player.update(delta, platforms);

        // Sync position
        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'position',
                payload: {
                    playerId: this.id,
                    position: this.player.position
                }
            });
        }
    }

    showChat() {
        const messages = ['멍멍!', '왈왈!', '🐕💨', '🦴?', 'OpenClaw!', '함께 가요!', '🐾', '멍!'];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        
        // Create a temporary floating text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        context.font = 'bold 30px Arial';
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.lineWidth = 4;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.strokeText(msg, 64, 32);
        context.fillText(msg, 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(this.player.position);
        sprite.position.y += 4;
        sprite.scale.set(3, 1.5, 1);
        this.scene.add(sprite);

        // Animate and remove
        const startTime = Date.now();
        const duration = 2000;
        const animateChat = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                sprite.position.y += 0.02;
                sprite.material.opacity = 1 - (elapsed / duration);
                requestAnimationFrame(animateChat);
            } else {
                this.scene.remove(sprite);
                texture.dispose();
                spriteMaterial.dispose();
            }
        };
        animateChat();
    }
    
    reset() {
        if (this.player) this.player.reset();
    }
}
