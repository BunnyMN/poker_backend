import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import { env } from './env.js';
import { verifyAccessToken } from './jwt.js';
import {
  ClientMessageSchema,
  type ClientMessage,
  type DealtMessage,
  type ErrorMessage,
  type WelcomeMessage,
  type GameStateMessage,
  type PersonalStateMessage,
  type RoundEndMessage,
  type RulesMessage,
  type ScoreUpdateMessage,
  type RoomOverviewMessage,
  type SyncStateMessage,
  type ActionErrorMessage,
  type Card,
} from './protocol.js';
import {
  addClientToRoom,
  broadcastRoomState,
  checkAndBroadcastRoundStart,
  getRoom,
  removeClientFromRoom,
  setPlayerReady,
} from './rooms.js';
import {
  createDeck,
  shuffle,
  dealHands,
  determineStarter,
  compareSingle,
  isPair,
  isSet,
  comparePair,
  compareSet,
  classifyFiveCardHand,
  compareFiveCardHands,
  type FiveCardKind,
} from '../../../packages/rules/src/index.js';

const app = Fastify({
  logger: true,
});

// HTTP: Health check endpoint
app.get('/health', async () => {
  return { ok: true };
});

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Track authenticated connections
const authenticated = new WeakMap<WebSocket, { roomId: string; playerId: string }>();

/**
 * Deal cards and send DEALT messages to each client after ROUND_START
 */
async function dealAndSendCards(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room) {
    app.log.warn(`Room not found for dealing: ${roomId}`);
    return;
  }

  // Get seated players (use room.seatedPlayerIds if set, otherwise get from getSeatedPlayerIds)
  let seatedPlayerIds = room.seatedPlayerIds;
  if (!seatedPlayerIds || seatedPlayerIds.length === 0) {
    // First round: get seated players (all connected players, max 4, excluding eliminated)
    const allPlayers = Array.from(room.players.keys()).filter(
      (id) => !room.eliminated.has(id)
    );
    seatedPlayerIds = allPlayers.slice(0, 4);
  }

  if (seatedPlayerIds.length < 2) {
    app.log.warn(`Not enough players to deal: ${roomId}, players=${seatedPlayerIds.length}`);
    return;
  }

  // Create and shuffle deck
  let deck = createDeck();
  deck = shuffle(deck);

  // Deal hands
  const { hands } = dealHands(seatedPlayerIds, deck);

  // Determine if table is unchanged (same seated players as previous round)
  const previousSeatedPlayerIds = room.previousRoundSeatedPlayerIds || [];
  const tableUnchanged =
    previousSeatedPlayerIds.length === seatedPlayerIds.length &&
    previousSeatedPlayerIds.every((id) => seatedPlayerIds.includes(id)) &&
    seatedPlayerIds.every((id) => previousSeatedPlayerIds.includes(id));

  // Determine starter
  const starter = determineStarter({
    hands,
    seatedPlayerIds,
    tableUnchanged,
    previousWinnerPlayerId: room.previousRoundWinnerPlayerId || null,
  });

  app.log.info(
    `Dealt cards: roomId=${roomId}, starter=${starter.starterPlayerId}, reason=${starter.reason}`
  );

  // Store game state in room
  room.phase = 'playing';
  room.seatedPlayerIds = seatedPlayerIds;
  room.hands = hands;
  room.starterPlayerId = starter.starterPlayerId;
  room.starterReason = starter.reason;
  room.currentTurnPlayerId = starter.starterPlayerId;
  room.lastPlay = null;
  room.passedSet = new Set();

  // Send DEALT message to each seated player using their active connection
  for (const playerId of seatedPlayerIds) {
    const playerHand = hands[playerId];
    if (!playerHand) {
      continue;
    }

    // Get active connection for this player (handles reconnection)
    const client = room.connectionsByPlayerId.get(playerId);
    if (!client || client.readyState !== WebSocket.OPEN) {
      // Player not connected, skip (they'll get SYNC_STATE when they reconnect)
      continue;
    }

    // Cards are already in the correct format (rank/suit as strings)
    // No conversion needed - rules Card type matches protocol Card type
    const yourHand = playerHand;

    // Debug log: show first 3 cards
    console.log(`[DEALT sample] playerId=${playerId}, cards=`, playerHand.slice(0, 3));

    const dealtMessage: DealtMessage = {
      type: 'DEALT',
      roomId,
      starterPlayerId: starter.starterPlayerId,
      reason: starter.reason,
      yourHand,
      seatedPlayerIds,
    };

    client.send(JSON.stringify(dealtMessage));
  }

  // Broadcast initial GAME_STATE after dealing (for seated players)
  broadcastGameState(roomId);
  
  // Broadcast ROOM_OVERVIEW to all clients (including queued players)
  broadcastRoomOverview(roomId);
}

/**
 * Get next active player in turn order (clockwise in seatedPlayerIds, skipping players with no cards)
 */
function getNextActivePlayer(
  currentPlayerId: string,
  seatedPlayerIds: string[],
  hands: Record<string, Card[]>
): string {
  const currentIndex = seatedPlayerIds.indexOf(currentPlayerId);
  if (currentIndex === -1) {
    throw new Error(`Player ${currentPlayerId} not found in seated players`);
  }

  // Try each player in order until we find one with cards
  for (let i = 1; i <= seatedPlayerIds.length; i++) {
    const nextIndex = (currentIndex + i) % seatedPlayerIds.length;
    const nextPlayerId = seatedPlayerIds[nextIndex];
    const hand = hands[nextPlayerId];
    
    // Skip if player has no cards
    if (hand && hand.length > 0) {
      return nextPlayerId;
    }
  }

  // Should never happen (at least one player should have cards)
  throw new Error('No active players found');
}

/**
 * Broadcast GAME_STATE to all clients in room
 */
function broadcastGameState(roomId: string): void {
  const room = getRoom(roomId);
  if (!room || room.phase !== 'playing') {
    return;
  }

  if (
    !room.seatedPlayerIds ||
    !room.hands ||
    !room.currentTurnPlayerId ||
    room.lastPlay === undefined
  ) {
    return;
  }

  // Calculate hands count (don't leak full hands)
  const handsCount: Record<string, number> = {};
  for (const playerId of room.seatedPlayerIds) {
    const hand = room.hands[playerId];
    handsCount[playerId] = hand ? hand.length : 0;
  }

  // Get passed player IDs as array
  const passedPlayerIds = Array.from(room.passedSet || []);

  const gameStateMessage: GameStateMessage = {
    type: 'GAME_STATE',
    roomId,
    seatedPlayerIds: room.seatedPlayerIds,
    currentTurnPlayerId: room.currentTurnPlayerId,
    lastPlay: room.lastPlay,
    handsCount,
    passedPlayerIds,
  };

  const message = JSON.stringify(gameStateMessage);
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Send PERSONAL_STATE (updated hand) to a specific client
 */
function sendPersonalState(roomId: string, playerId: string, ws: WebSocket): void {
  const room = getRoom(roomId);
  if (!room || room.phase !== 'playing') {
    return;
  }

  if (!room.hands) {
    return;
  }

  const hand = room.hands[playerId];
  if (!hand) {
    return;
  }

  const personalStateMessage: PersonalStateMessage = {
    type: 'PERSONAL_STATE',
    roomId,
    yourHand: hand,
  };

  ws.send(JSON.stringify(personalStateMessage));
}

/**
 * Send SYNC_STATE to a specific player (for reconnection/resume)
 */
function sendSyncState(roomId: string, playerId: string, ws: WebSocket): void {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  // Build totalScores object
  const totalScoresObj: Record<string, number> = {};
  for (const [pid, score] of room.totalScores.entries()) {
    totalScoresObj[pid] = score;
  }

  // Calculate hands count (don't leak full hands)
  const handsCount: Record<string, number> = {};
  if (room.hands && room.seatedPlayerIds) {
    for (const pid of room.seatedPlayerIds) {
      const hand = room.hands[pid];
      handsCount[pid] = hand ? hand.length : 0;
    }
  }

  // Get player's hand (only for this player)
  const yourHand = room.hands && room.hands[playerId] ? [...room.hands[playerId]] : null;

  // Build SYNC_STATE message
  const syncState: SyncStateMessage = {
    type: 'SYNC_STATE',
    roomId,
    phase: room.phase,
    seatedPlayerIds: room.seatedPlayerIds || [],
    queuePlayerIds: [...room.queuePlayerIds],
    currentTurnPlayerId: room.currentTurnPlayerId,
    lastPlay: room.lastPlay || null,
    handsCount,
    totalScores: totalScoresObj,
    eliminated: Array.from(room.eliminated),
    yourHand,
    starterPlayerId: room.starterPlayerId,
    starterReason: room.starterReason,
  };

  ws.send(JSON.stringify(syncState));
  app.log.info(`SYNC_STATE sent: roomId=${roomId}, playerId=${playerId}`);
}

/**
 * Broadcast ROOM_OVERVIEW to ALL connected clients (including queued players)
 * This provides table layout, scores, and game status without leaking hands
 */
function broadcastRoomOverview(roomId: string): void {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  // Build totalScores object
  const totalScoresObj: Record<string, number> = {};
  for (const [playerId, score] of room.totalScores.entries()) {
    totalScoresObj[playerId] = score;
  }

  // Get connected player IDs
  const connectedPlayerIds = Array.from(room.connectionsByPlayerId.keys());

  // Build base overview
  const overview: RoomOverviewMessage = {
    type: 'ROOM_OVERVIEW',
    roomId,
    phase: room.phase,
    seatedPlayerIds: room.seatedPlayerIds || [],
    queuePlayerIds: [...room.queuePlayerIds], // Copy array
    totalScores: totalScoresObj,
    eliminated: Array.from(room.eliminated),
    connectedPlayerIds,
  };

  // Add optional fields when in playing phase
  if (room.phase === 'playing') {
    overview.currentTurnPlayerId = room.currentTurnPlayerId;

    // Calculate hands count for seated players (don't leak full hands)
    if (room.hands && room.seatedPlayerIds) {
      const handsCount: Record<string, number> = {};
      for (const playerId of room.seatedPlayerIds) {
        const hand = room.hands[playerId];
        handsCount[playerId] = hand ? hand.length : 0;
      }
      overview.handsCount = handsCount;
    }

    // Add passed player IDs
    if (room.passedSet) {
      overview.passedPlayerIds = Array.from(room.passedSet);
    }

    // Calculate dealer seat index (optional: starter is at index 0, dealer would be last)
    // For now, we can set it to the starter's index or leave undefined
    if (room.starterPlayerId && room.seatedPlayerIds) {
      const starterIndex = room.seatedPlayerIds.indexOf(room.starterPlayerId);
      if (starterIndex !== -1) {
        // Dealer is typically the player before the starter (clockwise)
        // In our game, starter is the first to act, so dealer would be the last player
        overview.dealerSeatIndex = (starterIndex - 1 + room.seatedPlayerIds.length) % room.seatedPlayerIds.length;
      }
    }
  }

  const message = JSON.stringify(overview);
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Get count of active players (players with cards)
 */
function getActivePlayerCount(
  seatedPlayerIds: string[],
  hands: Record<string, Card[]>
): number {
  let count = 0;
  for (const playerId of seatedPlayerIds) {
    const hand = hands[playerId];
    if (hand && hand.length > 0) {
      count++;
    }
  }
  return count;
}

/**
 * Check if trick should end and handle it
 */
function checkAndHandleTrickEnd(roomId: string): void {
  const room = getRoom(roomId);
  if (!room || room.phase !== 'playing') {
    return;
  }

  if (
    !room.seatedPlayerIds ||
    !room.hands ||
    !room.currentTurnPlayerId ||
    !room.lastPlay ||
    !room.passedSet
  ) {
    return;
  }

  const lastPlayPlayerId = room.lastPlay.playerId;
  
  // Count active players (those with cards)
  const activePlayerCount = getActivePlayerCount(room.seatedPlayerIds, room.hands);
  
  // Count how many active players have passed (excluding the last player who played)
  let passedActiveCount = 0;
  for (const playerId of room.passedSet) {
    const hand = room.hands[playerId];
    // Only count if player still has cards (active)
    if (hand && hand.length > 0) {
      passedActiveCount++;
    }
  }

  // If all other active players have passed, the last player who played wins the trick
  if (passedActiveCount === activePlayerCount - 1) {
    app.log.info(
      `Trick ended: roomId=${roomId}, winner=${lastPlayPlayerId}, passedActiveCount=${passedActiveCount}, activePlayerCount=${activePlayerCount}`
    );

    // Clear lastPlay and reset pass flags
    room.lastPlay = null;
    room.passedSet.clear();

    // Set current turn to the trick winner (they start new trick)
    room.currentTurnPlayerId = lastPlayPlayerId;

    // Broadcast updated game state
    broadcastGameState(roomId);
    
    // Broadcast room overview to all (including queued players)
    broadcastRoomOverview(roomId);
  }
}

/**
 * Calculate scoring for a round
 * Winner gets 0, others get points based on remaining cards
 */
function calculateScores(
  room: ReturnType<typeof getRoom>,
  winnerPlayerId: string
): Map<string, number> {
  if (!room || !room.hands || !room.seatedPlayerIds) {
    return new Map();
  }

  const roundScores = new Map<string, number>();

  for (const playerId of room.seatedPlayerIds) {
    if (playerId === winnerPlayerId) {
      // Winner gets 0
      roundScores.set(playerId, 0);
    } else {
      const hand = room.hands[playerId];
      const remaining = hand ? hand.length : 13; // Default to 13 if hand not found
      let points = remaining;

      // Apply multipliers
      if (remaining >= 10) {
        points *= 2;
      }
      if (remaining === 13) {
        points *= 3;
      }

      roundScores.set(playerId, points);
    }
  }

  return roundScores;
}

/**
 * Apply elimination logic
 * Players with totalScores >= scoreLimit are eliminated
 * Winner is NEVER eliminated
 */
function applyElimination(
  room: ReturnType<typeof getRoom>,
  winnerPlayerId: string
): string[] {
  if (!room) {
    return [];
  }

  const newlyEliminated: string[] = [];

  for (const [playerId, totalScore] of room.totalScores.entries()) {
    // Winner is never eliminated
    if (playerId === winnerPlayerId) {
      continue;
    }

    // Check if should be eliminated
    if (totalScore >= room.scoreLimit && !room.eliminated.has(playerId)) {
      room.eliminated.add(playerId);
      newlyEliminated.push(playerId);
      app.log.info(`Player eliminated: roomId=${room.phase}, playerId=${playerId}, score=${totalScore}, limit=${room.scoreLimit}`);
    }
  }

  return newlyEliminated;
}

/**
 * Get remaining players (not eliminated)
 */
function getRemainingPlayers(room: ReturnType<typeof getRoom>): string[] {
  if (!room) {
    return [];
  }

  return Array.from(room.players.keys()).filter(
    (playerId) => !room.eliminated.has(playerId)
  );
}

/**
 * Find follow-out player in DOUBLE_OUT mode
 * Among other seated players, the one with fewest remaining cards
 * If tie: choose player with highest remaining single card (rank then suit)
 */
function findFollowOutPlayer(
  room: ReturnType<typeof getRoom>,
  winnerPlayerId: string
): string | null {
  if (!room || !room.hands || !room.seatedPlayerIds) {
    return null;
  }

  // Get other seated players (excluding winner)
  const otherSeated = room.seatedPlayerIds.filter((id) => id !== winnerPlayerId);
  if (otherSeated.length === 0) {
    return null;
  }

  // Find player with fewest cards
  let minCards = Infinity;
  const candidates: string[] = [];

  for (const playerId of otherSeated) {
    const hand = room.hands[playerId];
    const cardCount = hand ? hand.length : 13;
    if (cardCount < minCards) {
      minCards = cardCount;
      candidates.length = 0;
      candidates.push(playerId);
    } else if (cardCount === minCards) {
      candidates.push(playerId);
    }
  }

  // If only one candidate, return it
  if (candidates.length === 1) {
    return candidates[0];
  }

  // If tie, find player with highest remaining single card
  let highestCard: Card | null = null;
  let followOutPlayer: string | null = null;

  for (const playerId of candidates) {
    const hand = room.hands[playerId];
    if (!hand || hand.length === 0) {
      continue;
    }

    // Find highest card in hand
    let playerHighest = hand[0];
    for (let i = 1; i < hand.length; i++) {
      if (compareSingle(hand[i], playerHighest) > 0) {
        playerHighest = hand[i];
      }
    }

    // Compare with current highest
    if (!highestCard || compareSingle(playerHighest, highestCard) > 0) {
      highestCard = playerHighest;
      followOutPlayer = playerId;
    }
  }

  return followOutPlayer || candidates[0];
}

/**
 * Perform rotation and seat refilling
 * Returns new seatedPlayerIds array
 */
function performRotation(
  room: ReturnType<typeof getRoom>,
  winnerPlayerId: string
): string[] {
  if (!room || !room.seatedPlayerIds) {
    return [];
  }

  const remainingPlayers = getRemainingPlayers(room);
  const isDoubleOut = remainingPlayers.length >= 6;

  // Get current seated players (excluding eliminated)
  let currentSeated = room.seatedPlayerIds.filter(
    (id) => !room.eliminated.has(id)
  );

  if (isDoubleOut) {
    // DOUBLE_OUT mode
    const followOutPlayerId = findFollowOutPlayer(room, winnerPlayerId);

    // Remove winner and follow-out from seated
    currentSeated = currentSeated.filter(
      (id) => id !== winnerPlayerId && id !== followOutPlayerId
    );

    // Update queue: append follow-out first, then winner
    if (followOutPlayerId) {
      room.queuePlayerIds.push(followOutPlayerId);
    }
    room.queuePlayerIds.push(winnerPlayerId);

    // Seat filling: follow-out seat <- queue.front, winner seat <- queue.back
    const newSeated: string[] = [];
    if (room.queuePlayerIds.length > 0) {
      newSeated.push(room.queuePlayerIds.shift()!); // follow-out seat
    }
    newSeated.push(...currentSeated);
    if (room.queuePlayerIds.length > 0) {
      newSeated.push(room.queuePlayerIds.pop()!); // winner seat (from back)
    }

    return newSeated;
  } else {
    // SINGLE_OUT mode
    // Remove winner from seated
    currentSeated = currentSeated.filter((id) => id !== winnerPlayerId);

    // Winner goes to end of queue
    room.queuePlayerIds.push(winnerPlayerId);

    // Fill winner seat from queue front if available
    if (room.queuePlayerIds.length > 0) {
      currentSeated.push(room.queuePlayerIds.shift()!);
    } else {
      // If queue empty, winner stays seated (table unchanged)
      currentSeated.push(winnerPlayerId);
    }

    return currentSeated;
  }
}

/**
 * Check if round should end (player has no cards left)
 * Implements full round loop: scoring -> elimination -> rotation -> next round
 */
async function checkAndHandleRoundEnd(roomId: string, winnerPlayerId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room || room.phase !== 'playing') {
    return;
  }

  if (!room.hands || !room.seatedPlayerIds) {
    return;
  }

  const hand = room.hands[winnerPlayerId];
  if (!hand || hand.length !== 0) {
    return; // Not a round end
  }

  // Player has no cards left - they win!
  app.log.info(`Round ended: roomId=${roomId}, winner=${winnerPlayerId}`);

  room.phase = 'round_end';

  // Store previous round data for next round starter determination
  room.previousRoundSeatedPlayerIds = [...room.seatedPlayerIds];
  room.previousRoundWinnerPlayerId = winnerPlayerId;

  // Broadcast ROUND_END
  const roundEndMessage: RoundEndMessage = {
    type: 'ROUND_END',
    roomId,
    winnerPlayerId,
  };

  const roundEndMsg = JSON.stringify(roundEndMessage);
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(roundEndMsg);
    }
  }

  // 1. Calculate and apply scoring
  const roundScores = calculateScores(room, winnerPlayerId);
  for (const [playerId, points] of roundScores.entries()) {
    const currentScore = room.totalScores.get(playerId) || 0;
    room.totalScores.set(playerId, currentScore + points);
    app.log.info(`Scoring: roomId=${roomId}, playerId=${playerId}, roundPoints=${points}, totalScore=${currentScore + points}`);
  }

  // 2. Apply elimination
  applyElimination(room, winnerPlayerId);

  // 3. Broadcast SCORE_UPDATE
  const totalScoresObj: Record<string, number> = {};
  for (const [playerId, score] of room.totalScores.entries()) {
    totalScoresObj[playerId] = score;
  }

  const scoreUpdateMessage: ScoreUpdateMessage = {
    type: 'SCORE_UPDATE',
    roomId,
    totalScores: totalScoresObj,
    eliminated: Array.from(room.eliminated),
  };

  const scoreUpdateMsg = JSON.stringify(scoreUpdateMessage);
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(scoreUpdateMsg);
    }
  }

  // 4. Perform rotation and seat refilling
  const newSeatedPlayerIds = performRotation(room, winnerPlayerId);
  room.seatedPlayerIds = newSeatedPlayerIds;

  app.log.info(
    `Rotation: roomId=${roomId}, newSeated=${newSeatedPlayerIds.join(',')}, queue=${room.queuePlayerIds.join(',')}`
  );

  // Broadcast room overview after rotation (seating changed)
  broadcastRoomOverview(roomId);

  // 5. Start next round
  // Reset trick state
  room.lastPlay = null;
  if (room.passedSet) {
    room.passedSet.clear();
  }

  // Deal new cards and determine starter
  await dealAndSendCards(roomId);
}

/**
 * Handle PLAY message
 */
function handlePlay(
  roomId: string,
  playerId: string,
  cards: Card[],
  ws: WebSocket
): void {
  const room = getRoom(roomId);
  if (!room) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'ROOM_NOT_FOUND',
      message: 'Room not found',
    };
    ws.send(JSON.stringify(error));
    return;
  }

  // Validate phase
  if (room.phase !== 'playing') {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'INVALID_PHASE',
      message: `Cannot play in phase: ${room.phase}`,
    };
    ws.send(JSON.stringify(error));
    return;
  }

  if (
    !room.seatedPlayerIds ||
    !room.hands ||
    !room.currentTurnPlayerId ||
    room.lastPlay === undefined ||
    !room.passedSet
  ) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'GAME_STATE_INVALID',
      message: 'Game state not initialized',
    };
    ws.send(JSON.stringify(error));
    return;
  }

  // Validate: must be player's turn
  if (playerId !== room.currentTurnPlayerId) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'NOT_YOUR_TURN',
      message: `It is ${room.currentTurnPlayerId}'s turn, not yours`,
    };
    ws.send(JSON.stringify(error));
    app.log.warn(
      `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, currentTurn=${room.currentTurnPlayerId}`
    );
    return;
  }

  // Validate: cards.length must be 1, 2, 3, or 5
  if (cards.length !== 1 && cards.length !== 2 && cards.length !== 3 && cards.length !== 5) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'INVALID_PLAY_SIZE',
      message: `Play must be 1, 2, 3, or 5 cards, got ${cards.length}`,
    };
    ws.send(JSON.stringify(error));
    app.log.warn(
      `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, cardCount=${cards.length}`
    );
    return;
  }

  // Validate: all cards must exist in player's hand
  const hand = room.hands[playerId];
  if (!hand) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'HAND_NOT_FOUND',
      message: 'Your hand not found',
    };
    ws.send(JSON.stringify(error));
    return;
  }

  // Find all card indices and validate they exist
  const cardIndices: number[] = [];
  for (const card of cards) {
    const index = hand.findIndex(
      (c) => c.rank === card.rank && c.suit === card.suit
    );
    if (index === -1) {
      const error: ActionErrorMessage = {
        type: 'ACTION_ERROR',
        code: 'CARD_NOT_IN_HAND',
        message: `Card ${card.rank}${card.suit} not in your hand`,
      };
      ws.send(JSON.stringify(error));
      app.log.warn(
        `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, card=${card.rank}${card.suit} not in hand`
      );
      return;
    }
    cardIndices.push(index);
  }

  // Check for duplicate cards in the play
  const uniqueIndices = new Set(cardIndices);
  if (uniqueIndices.size !== cardIndices.length) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'DUPLICATE_CARDS',
      message: 'Cannot play the same card multiple times',
    };
    ws.send(JSON.stringify(error));
    app.log.warn(
      `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, duplicate cards`
    );
    return;
  }

  // Validate play type based on card count
  let playKind: 'SINGLE' | 'PAIR' | 'SET' | 'FIVE';
  let fiveKind: FiveCardKind | undefined;

  if (cards.length === 1) {
    playKind = 'SINGLE';
  } else if (cards.length === 2) {
    if (!isPair(cards)) {
      const error: ActionErrorMessage = {
        type: 'ACTION_ERROR',
        code: 'INVALID_PAIR',
        message: 'Two cards must have the same rank to form a PAIR',
      };
      ws.send(JSON.stringify(error));
      app.log.warn(
        `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, invalid PAIR`
      );
      return;
    }
    playKind = 'PAIR';
  } else if (cards.length === 3) {
    if (!isSet(cards)) {
      const error: ActionErrorMessage = {
        type: 'ACTION_ERROR',
        code: 'INVALID_SET',
        message: 'Three cards must have the same rank to form a SET',
      };
      ws.send(JSON.stringify(error));
      app.log.warn(
        `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, invalid SET`
      );
      return;
    }
    playKind = 'SET';
  } else {
    // cards.length === 5
    const classification = classifyFiveCardHand(cards);
    if (!classification) {
      const error: ActionErrorMessage = {
        type: 'ACTION_ERROR',
        code: 'INVALID_FIVE_CARD_HAND',
        message: 'Five cards must form a valid combo (Straight, Flush, Full House, Four of a Kind, or Straight Flush). High-card is not allowed.',
      };
      ws.send(JSON.stringify(error));
      app.log.warn(
        `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, invalid 5-card hand`
      );
      return;
    }
    playKind = 'FIVE';
    fiveKind = classification.kind;
  }

  // Validate: if there is a lastPlay, must match card count and beat it
  if (room.lastPlay) {
    // Must match card count
    if (cards.length !== room.lastPlay.cards.length) {
      const error: ActionErrorMessage = {
        type: 'ACTION_ERROR',
        code: 'MUST_MATCH_CARD_COUNT',
        message: `Must play ${room.lastPlay.cards.length} card(s) to match the current play, got ${cards.length}`,
      };
      ws.send(JSON.stringify(error));
      app.log.warn(
        `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, cardCount mismatch: ${cards.length} vs ${room.lastPlay.cards.length}`
      );
      return;
    }

    // Compare according to kind
    let comparison: number;
    if (playKind === 'SINGLE') {
      comparison = compareSingle(cards[0], room.lastPlay.cards[0]);
    } else if (playKind === 'PAIR') {
      comparison = comparePair(cards, room.lastPlay.cards);
    } else if (playKind === 'SET') {
      comparison = compareSet(cards, room.lastPlay.cards);
    } else {
      // FIVE - must compare 5-card hands
      if (room.lastPlay.kind !== 'FIVE' || !room.lastPlay.fiveKind) {
        // This shouldn't happen due to card count check, but handle gracefully
        const error: ActionErrorMessage = {
          type: 'ACTION_ERROR',
          code: 'GAME_STATE_INVALID',
          message: 'Cannot compare 5-card hand with non-5-card lastPlay',
        };
        ws.send(JSON.stringify(error));
        return;
      }

      const newClassification = classifyFiveCardHand(cards);
      if (!newClassification) {
        // This shouldn't happen due to validation above, but handle gracefully
        const error: ActionErrorMessage = {
          type: 'ACTION_ERROR',
          code: 'INVALID_FIVE_CARD_HAND',
          message: 'Invalid 5-card hand classification',
        };
        ws.send(JSON.stringify(error));
        return;
      }

      // Re-classify the lastPlay cards to get full classification for comparison
      const lastClassificationFull = classifyFiveCardHand(room.lastPlay.cards);
      if (!lastClassificationFull) {
        const error: ActionErrorMessage = {
          type: 'ACTION_ERROR',
          code: 'GAME_STATE_INVALID',
          message: 'Last play 5-card hand is invalid',
        };
        ws.send(JSON.stringify(error));
        return;
      }

      comparison = compareFiveCardHands(newClassification, lastClassificationFull);
    }

    if (comparison <= 0) {
      const error: ActionErrorMessage = {
        type: 'ACTION_ERROR',
        code: 'PLAY_TOO_WEAK',
        message: `Play does not beat the current ${room.lastPlay.kind}${room.lastPlay.fiveKind ? ` (${room.lastPlay.fiveKind})` : ''}`,
      };
      ws.send(JSON.stringify(error));
      app.log.warn(
        `PLAY validation failed: roomId=${roomId}, playerId=${playerId}, play too weak`
      );
      return;
    }
  }

  // All validations passed - execute the play
  const cardsStr = cards.map((c) => `${c.rank}${c.suit}`).join(',');
  const fiveKindStr = fiveKind ? `, fiveKind=${fiveKind}` : '';
  app.log.info(
    `PLAY: roomId=${roomId}, playerId=${playerId}, kind=${playKind}${fiveKindStr}, cards=[${cardsStr}]`
  );

  // Remove cards from hand (sort indices descending to avoid index shifting issues)
  const sortedIndices = [...cardIndices].sort((a, b) => b - a);
  for (const index of sortedIndices) {
    hand.splice(index, 1);
  }
  room.hands[playerId] = hand;

  // Set lastPlay with new format
  room.lastPlay = {
    playerId,
    kind: playKind,
    fiveKind: fiveKind,
    cards: [...cards], // Copy array
  };

  // Clear sender from passedSet (they played, so they're no longer passed)
  room.passedSet.delete(playerId);

  // Check for round end (before moving turn)
  const roundEnded = room.hands[playerId].length === 0;
  if (roundEnded) {
    // Handle round end asynchronously (scoring, elimination, rotation, next round)
    checkAndHandleRoundEnd(roomId, playerId).catch((err) => {
      app.log.error(`Error handling round end: ${err}`);
    });
    // Don't advance turn or broadcast if round ended
    return;
  }

  // Move to next active player (skip players with no cards)
  room.currentTurnPlayerId = getNextActivePlayer(
    playerId,
    room.seatedPlayerIds,
    room.hands
  );

  // Send personal state (updated hand) to the player who played
  sendPersonalState(roomId, playerId, ws);

  // Broadcast game state to all seated players
  broadcastGameState(roomId);
  
  // Broadcast room overview to all (including queued players)
  broadcastRoomOverview(roomId);
}

/**
 * Handle PASS message
 */
function handlePass(roomId: string, playerId: string, ws: WebSocket): void {
  const room = getRoom(roomId);
  if (!room) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'ROOM_NOT_FOUND',
      message: 'Room not found',
    };
    ws.send(JSON.stringify(error));
    return;
  }

  // Validate phase
  if (room.phase !== 'playing') {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'INVALID_PHASE',
      message: `Cannot pass in phase: ${room.phase}`,
    };
    ws.send(JSON.stringify(error));
    return;
  }

  if (
    !room.seatedPlayerIds ||
    !room.hands ||
    !room.currentTurnPlayerId ||
    room.lastPlay === undefined ||
    !room.passedSet
  ) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'GAME_STATE_INVALID',
      message: 'Game state not initialized',
    };
    ws.send(JSON.stringify(error));
    return;
  }

  // Validate: must be player's turn
  if (playerId !== room.currentTurnPlayerId) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'NOT_YOUR_TURN',
      message: `It is ${room.currentTurnPlayerId}'s turn, not yours`,
    };
    ws.send(JSON.stringify(error));
    app.log.warn(
      `PASS validation failed: roomId=${roomId}, playerId=${playerId}, currentTurn=${room.currentTurnPlayerId}`
    );
    return;
  }

  // Validate: Starter (or any player starting a new trick) cannot PASS
  // New trick = lastPlay === null
  // Starter = currentTurnPlayerId when lastPlay === null
  if (!room.lastPlay) {
    const error: ActionErrorMessage = {
      type: 'ACTION_ERROR',
      code: 'PASS_NOT_ALLOWED_STARTER',
      message: 'You must play to start the trick',
    };
    ws.send(JSON.stringify(error));
    app.log.warn(
      `PASS validation failed: roomId=${roomId}, playerId=${playerId}, starter cannot pass (lastPlay is null)`
    );
    return;
  }

  // All validations passed - execute the pass
  app.log.info(`PASS: roomId=${roomId}, playerId=${playerId}`);

  // Mark player as passed
  room.passedSet.add(playerId);

  // Check if trick should end (before moving turn)
  checkAndHandleTrickEnd(roomId);

  // If trick ended, checkAndHandleTrickEnd already updated currentTurnPlayerId
  // Otherwise, move to next active player
  if (room.phase === 'playing') {
    const roomAfterCheck = getRoom(roomId);
    if (roomAfterCheck && roomAfterCheck.lastPlay) {
      // Trick didn't end, move to next active player
      room.currentTurnPlayerId = getNextActivePlayer(
        playerId,
        room.seatedPlayerIds,
        room.hands
      );
    }
  }

  // Broadcast game state to all seated players
  broadcastGameState(roomId);
  
  // Broadcast room overview to all (including queued players)
  broadcastRoomOverview(roomId);
}

wss.on('connection', (ws: WebSocket) => {
  let authenticatedData: { roomId: string; playerId: string } | undefined;

  ws.on('message', async (data: Buffer) => {
    try {
      const rawMessage = JSON.parse(data.toString());
      const parseResult = ClientMessageSchema.safeParse(rawMessage);

      if (!parseResult.success) {
        // Log the invalid message for debugging
        app.log.warn({
          invalidMessage: rawMessage,
          error: parseResult.error.errors,
          receivedType: rawMessage?.type,
        }, 'Invalid WebSocket message received');
        
        const errorMessage: ErrorMessage = {
          type: 'ERROR',
          code: 'INVALID_MESSAGE',
          message: `Invalid message format: ${parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}. Received type: ${rawMessage?.type || 'undefined'}. Expected one of: HELLO, PING, READY, PLAY, PASS, SET_RULES, SYNC_REQUEST`,
        };
        ws.send(JSON.stringify(errorMessage));
        return;
      }

      const message: ClientMessage = parseResult.data;

      // Handle PING
      if (message.type === 'PING') {
        // PONG is implicit - just don't error
        return;
      }

      // Handle HELLO
      if (message.type === 'HELLO') {
        // If already authenticated, ignore
        if (authenticatedData) {
          return;
        }

        try {
          const { playerId } = await verifyAccessToken(message.accessToken);
          authenticatedData = {
            roomId: message.roomId,
            playerId,
          };
          authenticated.set(ws, authenticatedData);

          // Add to room (handles reconnection - replaces old ws if exists)
          const { isReconnect } = addClientToRoom(message.roomId, ws, playerId);
          
          if (isReconnect) {
            app.log.info(`Reconnection: roomId=${message.roomId}, playerId=${playerId}`);
          }

          // Send WELCOME
          const welcomeMessage: WelcomeMessage = {
            type: 'WELCOME',
            roomId: message.roomId,
            playerId,
          };
          ws.send(JSON.stringify(welcomeMessage));

          // Send SYNC_STATE immediately after WELCOME (includes private hand)
          sendSyncState(message.roomId, playerId, ws);

          // Broadcast ROOM_STATE immediately (replaces old STATE format)
          const count = broadcastRoomState(message.roomId);
          app.log.info(`ROOM_STATE broadcast: roomId=${message.roomId}, count=${count}`);
          
          // Broadcast ROOM_OVERVIEW to all clients (including queued players)
          broadcastRoomOverview(message.roomId);
        } catch (error) {
          const errorMessage: ErrorMessage = {
            type: 'ERROR',
            code: 'AUTH_INVALID',
            message: error instanceof Error ? error.message : 'Invalid access token',
          };
          ws.send(JSON.stringify(errorMessage));
          ws.close();
          return;
        }
        return;
      }

      // Handle READY
      if (message.type === 'READY') {
        // Must be authenticated first
        if (!authenticatedData) {
          const errorMessage: ErrorMessage = {
            type: 'ERROR',
            code: 'NOT_AUTHENTICATED',
            message: 'Must send HELLO first',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Verify roomId matches authenticated room
        if (message.roomId !== authenticatedData.roomId) {
          const errorMessage: ErrorMessage = {
            type: 'ERROR',
            code: 'INVALID_ROOM',
            message: 'Room ID does not match authenticated room',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Update player ready state
        setPlayerReady(message.roomId, authenticatedData.playerId, message.isReady);
        app.log.info(
          `READY received: roomId=${message.roomId}, playerId=${authenticatedData.playerId}, isReady=${message.isReady}`
        );

        // Broadcast ROOM_STATE
        const count = broadcastRoomState(message.roomId);
        app.log.info(`ROOM_STATE broadcast: roomId=${message.roomId}, count=${count}`);
        
        // Broadcast ROOM_OVERVIEW to all clients (including queued players)
        broadcastRoomOverview(message.roomId);

        // Check if all players are ready and >=2 players, then broadcast ROUND_START
        const started = checkAndBroadcastRoundStart(message.roomId);
        if (started) {
          app.log.info(`ROUND_START broadcast: roomId=${message.roomId}`);
          // Deal cards and send DEALT messages
          await dealAndSendCards(message.roomId);
        }

        return;
      }

      // Handle PLAY
      if (message.type === 'PLAY') {
        // Must be authenticated first
        if (!authenticatedData) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'NOT_AUTHENTICATED',
            message: 'Must send HELLO first',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Verify roomId matches authenticated room
        if (message.roomId !== authenticatedData.roomId) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'INVALID_ROOM',
            message: 'Room ID does not match authenticated room',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        handlePlay(
          message.roomId,
          authenticatedData.playerId,
          message.cards,
          ws
        );
        return;
      }

      // Handle PASS
      if (message.type === 'PASS') {
        // Must be authenticated first
        if (!authenticatedData) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'NOT_AUTHENTICATED',
            message: 'Must send HELLO first',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Verify roomId matches authenticated room
        if (message.roomId !== authenticatedData.roomId) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'INVALID_ROOM',
            message: 'Room ID does not match authenticated room',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

      handlePass(message.roomId, authenticatedData.playerId, ws);
      return;
    }

      // Handle SET_RULES
      if (message.type === 'SET_RULES') {
        // Must be authenticated first
        if (!authenticatedData) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'NOT_AUTHENTICATED',
            message: 'Must send HELLO first',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Verify roomId matches authenticated room
        if (message.roomId !== authenticatedData.roomId) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'INVALID_ROOM',
            message: 'Room ID does not match authenticated room',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        const room = getRoom(message.roomId);
        if (!room) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'ROOM_NOT_FOUND',
            message: 'Room not found',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Validate: only owner can set rules
        if (room.ownerPlayerId !== authenticatedData.playerId) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'NOT_OWNER',
            message: 'Only room owner can set rules',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Validate: only allowed before first round starts (phase == "lobby")
        if (room.phase !== 'lobby') {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'INVALID_PHASE',
            message: 'Rules can only be set in lobby phase',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Validate: 1 <= scoreLimit <= 60 (already validated by Zod, but double-check)
        if (message.scoreLimit < 1 || message.scoreLimit > 60) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'INVALID_SCORE_LIMIT',
            message: 'Score limit must be between 1 and 60',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Set score limit
        room.scoreLimit = message.scoreLimit;
        app.log.info(
          `SET_RULES: roomId=${message.roomId}, owner=${authenticatedData.playerId}, scoreLimit=${message.scoreLimit}`
        );

        // Broadcast RULES message
        const rulesMessage: RulesMessage = {
          type: 'RULES',
          roomId: message.roomId,
          scoreLimit: message.scoreLimit,
        };

        const rulesMsg = JSON.stringify(rulesMessage);
        for (const client of room.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(rulesMsg);
          }
        }

        return;
      }

      // Handle SYNC_REQUEST
      if (message.type === 'SYNC_REQUEST') {
        // Must be authenticated first
        if (!authenticatedData) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'NOT_AUTHENTICATED',
            message: 'Must send HELLO first',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Verify roomId matches authenticated room
        if (message.roomId !== authenticatedData.roomId) {
          const errorMessage: ActionErrorMessage = {
            type: 'ACTION_ERROR',
            code: 'INVALID_ROOM',
            message: 'Room ID does not match authenticated room',
          };
          ws.send(JSON.stringify(errorMessage));
          return;
        }

        // Send SYNC_STATE to requesting player
        sendSyncState(message.roomId, authenticatedData.playerId, ws);
        return;
      }

      // Unknown message type (shouldn't happen due to Zod, but handle gracefully)
      const errorMessage: ErrorMessage = {
        type: 'ERROR',
        code: 'UNKNOWN_MESSAGE',
        message: 'Unknown message type',
      };
      ws.send(JSON.stringify(errorMessage));
    } catch (error) {
      // JSON parse error or other unexpected error
      const errorMessage: ErrorMessage = {
        type: 'ERROR',
        code: 'INVALID_MESSAGE',
        message: error instanceof Error ? error.message : 'Invalid message format',
      };
      ws.send(JSON.stringify(errorMessage));
    }
  });

  ws.on('close', () => {
    authenticatedData = authenticated.get(ws);
    if (authenticatedData) {
      // Mark player as disconnected (don't remove from game state)
      removeClientFromRoom(authenticatedData.roomId, ws, authenticatedData.playerId);
      
      // Broadcast updates to show connection status change
      broadcastRoomState(authenticatedData.roomId);
      broadcastRoomOverview(authenticatedData.roomId);
      
      authenticated.delete(ws);
      
      app.log.info(`Player disconnected: roomId=${authenticatedData.roomId}, playerId=${authenticatedData.playerId}`);
    }
  });
});

// Upgrade HTTP to WebSocket
app.server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Server listening on http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

