import { WebSocket } from 'ws';
import type { RoomStateMessage, RoundStartMessage, Card, LastPlay } from './protocol.js';

// Constants for timeouts
export const IDLE_TIMEOUT_MS = 60 * 1000; // 1 minute to reconnect
export const TURN_TIMEOUT_MS = 30 * 1000; // 30 seconds per turn

export interface Room {
  clients: Set<WebSocket>;
  players: Map<string, { isReady: boolean; disconnectedAt?: number }>; // disconnectedAt timestamp if disconnected
  phase: 'lobby' | 'starting' | 'playing' | 'round_end';
  // Connection tracking for reconnection
  connectionsByPlayerId: Map<string, WebSocket>; // Active connection per player
  playerIdBySocket: WeakMap<WebSocket, string>; // Reverse lookup
  // Room owner and rules
  ownerPlayerId?: string; // First player to join becomes owner
  scoreLimit: number; // Default 60, max 60
  // Scoring and elimination
  totalScores: Map<string, number>; // Player ID -> total score
  eliminated: Set<string>; // Eliminated player IDs
  // Queue for rotation
  queuePlayerIds: string[]; // Players waiting to be seated
  // Round tracking
  previousRoundSeatedPlayerIds?: string[]; // Seated players from previous round
  previousRoundWinnerPlayerId?: string; // Winner from previous round
  // Game state (only set when phase is 'playing' or 'round_end')
  seatedPlayerIds?: string[];
  hands?: Record<string, Card[]>;
  starterPlayerId?: string; // Original starter from DEALT
  starterReason?: 'WINNER' | 'WEAKEST_SINGLE'; // Reason for starter selection
  currentTurnPlayerId?: string;
  lastPlay?: LastPlay | null;
  passedSet?: Set<string>;
  // Timer state
  turnTimer?: NodeJS.Timeout; // Active turn timer
  turnStartedAt?: number; // When the current turn started (for client display)
  idleTimers: Map<string, NodeJS.Timeout>; // Idle timeout per disconnected player
}

const rooms = new Map<string, Room>();

export function getOrCreateRoom(roomId: string): Room {
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
      idleTimers: new Map(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

export function addClientToRoom(
  roomId: string,
  ws: WebSocket,
  playerId: string
): { isReconnect: boolean; oldWs?: WebSocket } {
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
  } else {
    // Player exists - clear disconnectedAt if it was set
    const player = room.players.get(playerId);
    if (player && player.disconnectedAt) {
      delete player.disconnectedAt;
    }
  }
  
  return { isReconnect, oldWs: existingWs };
}

export function removeClientFromRoom(
  roomId: string,
  ws: WebSocket,
  playerId: string
): void {
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

export function setPlayerReady(
  roomId: string,
  playerId: string,
  isReady: boolean
): void {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  const player = room.players.get(playerId);
  if (player) {
    player.isReady = isReady;
  }
}

export function broadcastRoomState(roomId: string): number {
  const room = rooms.get(roomId);
  if (!room) {
    return 0;
  }

  const roomStateMessage: RoomStateMessage = {
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

export function checkAndBroadcastRoundStart(roomId: string): boolean {
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

  const allReady = Array.from(room.players.values()).every(
    (player) => player.isReady === true
  );

  if (!allReady) {
    return false;
  }

  // Set phase to "starting" and broadcast ROUND_START
  room.phase = 'starting';
  const roundStartMessage: RoundStartMessage = {
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

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getSeatedPlayerIds(roomId: string, maxPlayers: number = 4): string[] {
  const room = rooms.get(roomId);
  if (!room) {
    return [];
  }
  // For MVP: all connected players are seated (up to max)
  return Array.from(room.players.keys()).slice(0, maxPlayers);
}

// ==================== TURN TIMER FUNCTIONS ====================

export function clearTurnTimer(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = undefined;
  }
  room.turnStartedAt = undefined;
}

export function setTurnTimer(
  roomId: string,
  onTimeout: () => void
): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // Clear existing timer first
  clearTurnTimer(roomId);

  // Set new timer
  room.turnStartedAt = Date.now();
  room.turnTimer = setTimeout(() => {
    room.turnTimer = undefined;
    room.turnStartedAt = undefined;
    onTimeout();
  }, TURN_TIMEOUT_MS);
}

export function getTurnTimeRemaining(roomId: string): number | null {
  const room = rooms.get(roomId);
  if (!room || !room.turnStartedAt) return null;

  const elapsed = Date.now() - room.turnStartedAt;
  const remaining = TURN_TIMEOUT_MS - elapsed;
  return remaining > 0 ? remaining : 0;
}

// ==================== IDLE TIMEOUT FUNCTIONS ====================

export function setIdleTimer(
  roomId: string,
  playerId: string,
  onTimeout: () => void
): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // Clear existing idle timer for this player if any
  clearIdleTimer(roomId, playerId);

  // Set new idle timer
  const timer = setTimeout(() => {
    room.idleTimers.delete(playerId);
    onTimeout();
  }, IDLE_TIMEOUT_MS);

  room.idleTimers.set(playerId, timer);
}

export function clearIdleTimer(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const timer = room.idleTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    room.idleTimers.delete(playerId);
  }
}

export function clearAllIdleTimers(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const timer of room.idleTimers.values()) {
    clearTimeout(timer);
  }
  room.idleTimers.clear();
}

