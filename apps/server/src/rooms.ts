import { WebSocket } from 'ws';
import type { RoomStateMessage, RoundStartMessage, Card, LastPlay } from './protocol.js';
import { randomUUID } from 'crypto';

// Constants for timeouts
export const IDLE_TIMEOUT_MS = 60 * 1000; // 60 seconds to reconnect before removal
export const TURN_TIMEOUT_MS = 20 * 1000; // 20 seconds per turn

// Player status enum
export type PlayerStatus = 'ACTIVE' | 'OFFLINE' | 'REMOVED';

// Seat structure
export interface Seat {
  seatIndex: number; // 0-3
  playerId: string | null;
  status: PlayerStatus | 'EMPTY';
  offlineSince: number | null; // timestamp when went offline
}

// Player data for lobby
export interface PlayerData {
  isReady: boolean;
  status: PlayerStatus;
  offlineSince: number | null;
}

export interface Room {
  clients: Set<WebSocket>;
  players: Map<string, PlayerData>; // playerId -> PlayerData
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
  seats: Seat[]; // 4 seats for the table
  seatedPlayerIds?: string[]; // DEPRECATED: use seats instead - kept for compatibility
  hands?: Record<string, Card[]>;
  starterPlayerId?: string; // Original starter from DEALT
  starterReason?: 'WINNER' | 'WEAKEST_SINGLE'; // Reason for starter selection
  currentTurnPlayerId?: string;
  lastPlay?: LastPlay | null;
  passedSet?: Set<string>;
  // Turn timer state
  turnId?: string; // Unique ID for current turn (to prevent race conditions)
  turnDeadlineAt?: number; // Absolute timestamp when turn expires
  turnTimer?: NodeJS.Timeout; // Active turn timer
  // Idle timers per player
  idleTimers: Map<string, NodeJS.Timeout>;
}

const rooms = new Map<string, Room>();

// Initialize empty seats
function createEmptySeats(): Seat[] {
  return [
    { seatIndex: 0, playerId: null, status: 'EMPTY', offlineSince: null },
    { seatIndex: 1, playerId: null, status: 'EMPTY', offlineSince: null },
    { seatIndex: 2, playerId: null, status: 'EMPTY', offlineSince: null },
    { seatIndex: 3, playerId: null, status: 'EMPTY', offlineSince: null },
  ];
}

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
      seats: createEmptySeats(),
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

  // Check if player already exists in the room (for reconnection detection)
  const existingPlayer = room.players.get(playerId);

  // isReconnect is true if:
  // 1. Player has an existing WebSocket connection (replacing connection)
  // 2. OR player exists in players map (was disconnected but still in room)
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
  } else if (existingPlayer && existingPlayer.status !== 'REMOVED') {
    // Player was disconnected but still in room - this is a reconnection
    isReconnect = true;
  }

  // Add new connection
  room.clients.add(ws);
  room.connectionsByPlayerId.set(playerId, ws);
  room.playerIdBySocket.set(ws, playerId);

  // Ensure player exists in players map
  if (!room.players.has(playerId)) {
    room.players.set(playerId, {
      isReady: false,
      status: 'ACTIVE',
      offlineSince: null,
    });
    // Initialize score if new player
    if (!room.totalScores.has(playerId)) {
      room.totalScores.set(playerId, 0);
    }
    // Set owner if this is the first player
    if (!room.ownerPlayerId) {
      room.ownerPlayerId = playerId;
    }
  } else {
    // Player exists - set to ACTIVE and clear offlineSince
    const player = room.players.get(playerId);
    if (player) {
      player.status = 'ACTIVE';
      player.offlineSince = null;
    }
  }

  // Update seat status if player is seated
  const seat = room.seats.find(s => s.playerId === playerId);
  if (seat) {
    seat.status = 'ACTIVE';
    seat.offlineSince = null;
  }

  return { isReconnect, oldWs: existingWs };
}

export function setPlayerOffline(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const now = Date.now();

  // Update player data
  const player = room.players.get(playerId);
  if (player && player.status !== 'REMOVED') {
    player.status = 'OFFLINE';
    player.offlineSince = now;
  }

  // Update seat status
  const seat = room.seats.find(s => s.playerId === playerId);
  if (seat && seat.status !== 'REMOVED') {
    seat.status = 'OFFLINE';
    seat.offlineSince = now;
  }
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

  // Set player to OFFLINE (don't remove from game state)
  setPlayerOffline(roomId, playerId);
}

export function removePlayerPermanently(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // Update player status
  const player = room.players.get(playerId);
  if (player) {
    player.status = 'REMOVED';
    player.offlineSince = null;
  }

  // Clear seat
  const seat = room.seats.find(s => s.playerId === playerId);
  if (seat) {
    seat.playerId = null;
    seat.status = 'EMPTY';
    seat.offlineSince = null;
  }

  // Update seatedPlayerIds for backwards compatibility
  if (room.seatedPlayerIds) {
    room.seatedPlayerIds = room.seatedPlayerIds.filter(id => id !== playerId);
  }

  // Remove from passed set
  room.passedSet?.delete(playerId);

  // Remove hand
  if (room.hands && room.hands[playerId]) {
    delete room.hands[playerId];
  }
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

export function getActiveSeatedPlayerIds(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (!room) return [];

  return room.seats
    .filter(s => s.playerId && s.status === 'ACTIVE')
    .map(s => s.playerId!);
}

export function getAllSeatedPlayerIds(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (!room) return [];

  return room.seats
    .filter(s => s.playerId && s.status !== 'EMPTY' && s.status !== 'REMOVED')
    .map(s => s.playerId!);
}

export function isPlayerActive(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  const seat = room.seats.find(s => s.playerId === playerId);
  return seat?.status === 'ACTIVE';
}

export function seatPlayers(roomId: string, playerIds: string[]): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // Reset seats
  room.seats = createEmptySeats();

  // Seat players
  const seatedIds: string[] = [];
  playerIds.slice(0, 4).forEach((playerId, index) => {
    const player = room.players.get(playerId);
    room.seats[index] = {
      seatIndex: index,
      playerId,
      status: player?.status || 'ACTIVE',
      offlineSince: player?.offlineSince || null,
    };
    seatedIds.push(playerId);
  });

  // Update seatedPlayerIds for backwards compatibility
  room.seatedPlayerIds = seatedIds;
}

export function broadcastRoomState(roomId: string): number {
  const room = rooms.get(roomId);
  if (!room) {
    return 0;
  }

  const roomStateMessage: RoomStateMessage = {
    type: 'ROOM_STATE',
    roomId,
    players: Array.from(room.players.entries())
      .filter(([_, data]) => data.status !== 'REMOVED')
      .map(([playerId, data]) => ({
        playerId,
        isReady: data.isReady,
        status: data.status,
        offlineSince: data.offlineSince,
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

  // Check conditions: >=2 ACTIVE players and all ready
  const activePlayers = Array.from(room.players.entries())
    .filter(([_, data]) => data.status === 'ACTIVE');

  if (activePlayers.length < 2) {
    return false;
  }

  const allReady = activePlayers.every(([_, data]) => data.isReady === true);

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
  // Return all non-REMOVED seated players
  return room.seats
    .filter(s => s.playerId && s.status !== 'REMOVED')
    .map(s => s.playerId!)
    .slice(0, maxPlayers);
}

// ==================== TURN MANAGEMENT ====================

export function generateTurnId(): string {
  return randomUUID();
}

export function clearTurnTimer(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = undefined;
  }
  room.turnDeadlineAt = undefined;
  room.turnId = undefined;
}

export function setTurnTimer(
  roomId: string,
  onTimeout: (turnId: string) => void
): string {
  const room = rooms.get(roomId);
  if (!room) return '';

  // Clear existing timer first
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
  }

  // Generate new turnId
  const turnId = generateTurnId();
  room.turnId = turnId;
  room.turnDeadlineAt = Date.now() + TURN_TIMEOUT_MS;

  // Set new timer
  room.turnTimer = setTimeout(() => {
    room.turnTimer = undefined;
    // Pass the turnId to verify it's still the same turn
    onTimeout(turnId);
  }, TURN_TIMEOUT_MS);

  return turnId;
}

export function getTurnTimeRemaining(roomId: string): number | null {
  const room = rooms.get(roomId);
  if (!room || !room.turnDeadlineAt) return null;

  const remaining = room.turnDeadlineAt - Date.now();
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

// Get next active player for turn (skipping OFFLINE players)
export function getNextActivePlayerForTurn(
  currentPlayerId: string,
  roomId: string
): string | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const seatedIds = room.seats
    .filter(s => s.playerId && s.status !== 'REMOVED')
    .map(s => ({ playerId: s.playerId!, status: s.status }));

  if (seatedIds.length === 0) return null;

  const currentIndex = seatedIds.findIndex(s => s.playerId === currentPlayerId);
  if (currentIndex === -1) {
    // Current player not found, return first active player
    const firstActive = seatedIds.find(s => s.status === 'ACTIVE');
    return firstActive?.playerId || null;
  }

  // Find next ACTIVE player
  for (let i = 1; i <= seatedIds.length; i++) {
    const nextIndex = (currentIndex + i) % seatedIds.length;
    const nextPlayer = seatedIds[nextIndex];

    // Skip OFFLINE players - they auto-pass
    if (nextPlayer.status === 'ACTIVE') {
      // Check if player has cards
      if (room.hands && room.hands[nextPlayer.playerId]?.length > 0) {
        return nextPlayer.playerId;
      }
    }
  }

  // No active player with cards found
  return null;
}
