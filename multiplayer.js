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
        this.maxPlayers = 8;

        // Callbacks
        this.onPlayerUpdate = null;
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onGameStart = null;

        this.playerColors = [
            0x8B5E3C, // Brown
            0xFF6B6B, // Red
            0x4ECDC4, // Teal
            0xFFE66D, // Yellow
            0x95E1D3, // Mint
            0xF38181, // Coral
            0xAA96DA, // Purple
            0x67C8D0  // Cyan
        ];
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
        this.localPlayerData.color = this.playerColors[0];

        return this.connectToRoom();
    }

    // Join a room (4-digit code)
    async joinRoom(roomCode, nickname = '플레이어') {
        this.isHost = false;
        this.roomCode = roomCode;
        this.localPlayerData.name = nickname;
        this.localPlayerData.isHost = false;

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
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        // Track presence
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
        for (const key in state) {
            const presences = state[key];
            if (presences.length > 0) {
                newPlayers.set(key, presences[0]);
            }
        }

        // Trigger joins for anyone new
        newPlayers.forEach((data, id) => {
            if (id !== this.localPlayerId && !this.players.has(id)) {
                if (this.onPlayerJoin) this.onPlayerJoin(id, data);
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
