// ===================================
// Multiplayer System using Supabase Realtime
// ===================================

class MultiplayerManager {
    constructor() {
        this.supabase = null;
        this.channel = null;
        this.isHost = false;
        this.roomCode = null;
        this.players = new Map(); // playerId -> {position, color, name, isHost}
        this.localPlayerId = 'player_' + Math.random().toString(36).substr(2, 9);
        this.localPlayerData = {
            name: '플레이어',
            color: 0x8B5E3C,
            position: { x: 0, y: 2, z: 0 },
            isHost: false
        };
        this.maxPlayers = 16;
        this.nextColorIndex = 0; // Track next color to assign

        // Callbacks
        this.onPlayerUpdate = null;
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onGameStart = null;
        this.onPlayerWin = null;

        // Rainbow colors for guests
        this.playerColors = [
            0xFF4D4D, // Red
            0xFF914D, // Orange
            0xFFD74D, // Yellow
            0xBEFF4D, // Lime
            0x4DFF4D, // Green
            0x4DFFBE, // Aquamarine
            0x4DFFFF, // Cyan
            0x4D91FF, // Sky Blue
            0x4D4DFF, // Blue
            0x914DFF, // Indigo
            0xBE4DFF, // Violet
            0xFF4DFF, // Pink
            0xFF4D91, // Rose
            0xFFFFFF, // White
            0xAAAAAA, // Grey
            0x555555  // Dark Grey
        ];
        this.hostColor = 0xFFD700; // Special Gold for Host
    }

    // Initialize Supabase (User needs to provide URL and Anon Key)
    // For now, we use placeholders that the user can replace.
    init(supabaseUrl, supabaseKey) {
        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase URL and Key are required for multiplayer.');
            return false;
        }
        this.supabase = supabase.createClient(supabaseUrl, supabaseKey);
        return true;
    }

    // Create a room (4-digit code)
    async createRoom(nickname = '호스트') {
        this.isHost = true;
        this.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        this.localPlayerData.name = nickname;
        this.localPlayerData.isHost = true;
        this.localPlayerData.color = this.hostColor;

        return this.connectToRoom();
    }

    // Join a room (4-digit code)
    async joinRoom(roomCode, nickname = '플레이어') {
        this.isHost = false;
        this.roomCode = roomCode;
        this.localPlayerData.name = nickname;
        this.localPlayerData.isHost = false;
        // Color will be assigned based on existing player count after connecting

        return this.connectToRoom();
    }

    async connectToRoom() {
        if (!this.supabase) return Promise.reject('Supabase not initialized');

        const channelName = `room_${this.roomCode}`;
        this.channel = this.supabase.channel(channelName, {
            config: {
                presence: {
                    key: this.localPlayerId,
                },
            },
        });

        return new Promise((resolve, reject) => {
            this.channel
                .on('presence', { event: 'sync' }, () => {
                    const state = this.channel.presenceState();
                    this.handlePresenceSync(state);
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('Join:', key, newPresences);
                    if (this.onPlayerJoin && key !== this.localPlayerId) {
                        const data = newPresences[0];
                        if (!this.players.has(key)) {
                            this.players.set(key, data);
                            this.onPlayerJoin(key, data);
                        }
                    }
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('Leave:', key, leftPresences);
                    if (this.onPlayerLeave) {
                        this.players.delete(key);
                        this.onPlayerLeave(key);
                    }
                })
                .on('broadcast', { event: 'position' }, ({ payload }) => {
                    if (payload.playerId !== this.localPlayerId) {
                        const player = this.players.get(payload.playerId);
                        if (player) {
                            player.position = payload.position;
                            if (this.onPlayerUpdate) {
                                this.onPlayerUpdate(payload.playerId, payload.position);
                            }
                        }
                    }
                })
                .on('broadcast', { event: 'gameStart' }, () => {
                    if (this.onGameStart) this.onGameStart();
                })
                .on('broadcast', { event: 'playerWin' }, ({ payload }) => {
                    if (payload.playerId !== this.localPlayerId) {
                        if (this.onPlayerWin) this.onPlayerWin(payload.playerId, payload.name);
                    }
                })
                .on('broadcast', { event: 'sabotage' }, ({ payload }) => {
                    if (payload.attackerId !== this.localPlayerId) {
                        if (this.onSabotage) this.onSabotage(payload.type);
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        // For non-hosts, get current presence state first to determine color
                        if (!this.isHost) {
                            const currentState = this.channel.presenceState();
                            const existingCount = Object.keys(currentState).length;
                            // Assign color based on position (host is 0, so guests start from 1)
                            this.localPlayerData.color = this.playerColors[(existingCount) % this.playerColors.length];
                        }

                        // Track presence with assigned color
                        await this.channel.track(this.localPlayerData);
                        resolve(this.roomCode);
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        reject('Connection failed');
                    }
                });
        });
    }

    handlePresenceSync(state) {
        // Update local players map from presence state
        const newPlayers = new Map();

        // Sort players by presence state order to assign colors consistently
        const sortedKeys = Object.keys(state).sort();

        sortedKeys.forEach((key, index) => {
            const presences = state[key];
            if (presences.length > 0) {
                const playerData = presences[0];
                
                // Assign/Enforce colors based on role and order
                if (playerData.isHost) {
                    playerData.color = this.hostColor;
                } else {
                    // Find guest index (host might be anywhere in sortedKeys)
                    // We use index for guests, but we could skip the host's index to be cleaner
                    playerData.color = this.playerColors[index % this.playerColors.length];
                }
                
                newPlayers.set(key, playerData);
            }
        });

        // Update local player color if not host (host color is already set)
        if (!this.isHost && newPlayers.size > 0) {
            const localIndex = sortedKeys.indexOf(this.localPlayerId);
            if (localIndex !== -1) {
                this.localPlayerData.color = this.playerColors[localIndex % this.playerColors.length];
            }
        }

        // Trigger joins for anyone new (check against current players map)
        newPlayers.forEach((data, id) => {
            if (id !== this.localPlayerId) {
                // Always trigger join if not in current players (fixes race condition)
                if (!this.players.has(id)) {
                    console.log('Sync: Adding missing player', id, data);
                    if (this.onPlayerJoin) this.onPlayerJoin(id, data);
                }
            }
        });

        // Trigger leaves for anyone gone
        this.players.forEach((data, id) => {
            if (!newPlayers.has(id)) {
                if (this.onPlayerLeave) this.onPlayerLeave(id);
            }
        });

        this.players = newPlayers;
    }

    // High frequency position broadcast
    sendPosition(position) {
        if (!this.channel) return;

        this.localPlayerData.position = { x: position.x, y: position.y, z: position.z };

        this.channel.send({
            type: 'broadcast',
            event: 'position',
            payload: {
                playerId: this.localPlayerId,
                position: this.localPlayerData.position
            }
        });
    }

    startGame() {
        if (!this.isHost || !this.channel) return;

        this.channel.send({
            type: 'broadcast',
            event: 'gameStart',
            payload: {}
        });

        if (this.onGameStart) this.onGameStart();
    }

    broadcastWin() {
        if (!this.channel) return;

        this.channel.send({
            type: 'broadcast',
            event: 'playerWin',
            payload: {
                playerId: this.localPlayerId,
                name: this.localPlayerData.name
            }
        });
    }

    broadcastSabotage(type) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'sabotage',
            payload: {
                attackerId: this.localPlayerId,
                type: type
            }
        });
    }

    getOtherPlayers() {
        const others = [];
        this.players.forEach((data, id) => {
            if (id !== this.localPlayerId) {
                others.push({ id, ...data });
            }
        });
        return others;
    }

    getPlayerCount() {
        return this.players.size;
    }

    destroy() {
        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        }
        this.players.clear();
        this.isHost = false;
        this.roomCode = null;
    }
}

const Multiplayer = new MultiplayerManager();
