import { WebSocket } from 'ws';
const rooms = new Map();
export function getOrCreateRoom(roomId) {
    let room = rooms.get(roomId);
    if (!room) {
        room = {
            clients: new Set(),
            players: new Map(),
            phase: 'lobby',
        };
        rooms.set(roomId, room);
    }
    return room;
}
export function addClientToRoom(roomId, ws, playerId) {
    const room = getOrCreateRoom(roomId);
    room.clients.add(ws);
    // Ensure player exists with isReady=false if new
    if (!room.players.has(playerId)) {
        room.players.set(playerId, { isReady: false });
        // Set first player as owner (for MVP: previous winner)
        if (!room.ownerPlayerId) {
            room.ownerPlayerId = playerId;
        }
    }
}
export function removeClientFromRoom(roomId, ws, playerId) {
    const room = rooms.get(roomId);
    if (!room) {
        return;
    }
    room.clients.delete(ws);
    room.players.delete(playerId);
    // Delete room if empty
    if (room.clients.size === 0) {
        rooms.delete(roomId);
    }
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