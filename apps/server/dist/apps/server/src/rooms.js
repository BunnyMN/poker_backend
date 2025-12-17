import { WebSocket } from 'ws';
const rooms = new Map();
export function getOrCreateRoom(roomId) {
    let room = rooms.get(roomId);
    if (!room) {
        room = {
            clients: new Set(),
            players: new Map(),
            phase: 'lobby',
            connectionsByPlayerId: new Map(),
            playerIdBySocket: new WeakMap(),
            scoreLimit: 60, // Default score limit
            totalScores: new Map(),
            eliminated: new Set(),
            queuePlayerIds: [],
        };
        rooms.set(roomId, room);
    }
    return room;
}
export function addClientToRoom(roomId, ws, playerId) {
    const room = getOrCreateRoom(roomId);
    // Check if player already has a connection (reconnection)
    const existingWs = room.connectionsByPlayerId.get(playerId);
    let isReconnect = false;
    if (existingWs && existingWs !== ws) {
        // Player is reconnecting - replace old connection
        isReconnect = true;
        // Remove old connection from clients set
        room.clients.delete(existingWs);
        // Close old connection with code 4000 "REPLACED"
        if (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING) {
            existingWs.close(4000, 'REPLACED');
        }
    }
    // Add new connection
    room.clients.add(ws);
    room.connectionsByPlayerId.set(playerId, ws);
    room.playerIdBySocket.set(ws, playerId);
    // Ensure player exists in players map
    if (!room.players.has(playerId)) {
        room.players.set(playerId, { isReady: false });
        // Initialize score if new player
        if (!room.totalScores.has(playerId)) {
            room.totalScores.set(playerId, 0);
        }
        // Set owner if this is the first player
        if (!room.ownerPlayerId) {
            room.ownerPlayerId = playerId;
        }
    }
    else {
        // Player exists - clear disconnectedAt if it was set
        const player = room.players.get(playerId);
        if (player && player.disconnectedAt) {
            delete player.disconnectedAt;
        }
    }
    return { isReconnect, oldWs: existingWs };
}
export function removeClientFromRoom(roomId, ws, playerId) {
    const room = rooms.get(roomId);
    if (!room) {
        return;
    }
    // Remove from clients set
    room.clients.delete(ws);
    // Remove from connection tracking
    const trackedPlayerId = room.playerIdBySocket.get(ws);
    if (trackedPlayerId === playerId) {
        room.connectionsByPlayerId.delete(playerId);
    }
    // Mark player as disconnected (don't remove from game state)
    const player = room.players.get(playerId);
    if (player) {
        player.disconnectedAt = Date.now();
    }
    // Note: We don't delete the room or player from game state
    // Players can reconnect and resume their game
}
export function setPlayerReady(roomId, playerId, isReady) {
    const room = rooms.get(roomId);
    if (!room) {
        return;
    }
    const player = room.players.get(playerId);
    if (player) {
        player.isReady = isReady;
    }
}
export function broadcastRoomState(roomId) {
    const room = rooms.get(roomId);
    if (!room) {
        return 0;
    }
    const roomStateMessage = {
        type: 'ROOM_STATE',
        roomId,
        players: Array.from(room.players.entries()).map(([playerId, data]) => ({
            playerId,
            isReady: data.isReady,
        })),
    };
    const message = JSON.stringify(roomStateMessage);
    let count = 0;
    for (const client of room.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            count++;
        }
    }
    return count;
}
export function checkAndBroadcastRoundStart(roomId) {
    const room = rooms.get(roomId);
    if (!room) {
        return false;
    }
    // Only check if phase is "lobby"
    if (room.phase !== 'lobby') {
        return false;
    }
    // Check conditions: >=2 players and all ready
    if (room.players.size < 2) {
        return false;
    }
    const allReady = Array.from(room.players.values()).every((player) => player.isReady === true);
    if (!allReady) {
        return false;
    }
    // Set phase to "starting" and broadcast ROUND_START
    room.phase = 'starting';
    const roundStartMessage = {
        type: 'ROUND_START',
        roomId,
        startedAt: Date.now(),
    };
    const message = JSON.stringify(roundStartMessage);
    for (const client of room.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
    return true;
}
export function getRoom(roomId) {
    return rooms.get(roomId);
}
export function getSeatedPlayerIds(roomId, maxPlayers = 4) {
    const room = rooms.get(roomId);
    if (!room) {
        return [];
    }
    // For MVP: all connected players are seated (up to max)
    return Array.from(room.players.keys()).slice(0, maxPlayers);
}
//# sourceMappingURL=rooms.js.map