import { z } from 'zod';

// Card representation for protocol (must be defined before use)
export const CardSchema = z.object({
  rank: z.enum(['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']),
  suit: z.enum(['S', 'H', 'C', 'D']),
});

export type Card = z.infer<typeof CardSchema>;

// Client -> Server messages
export const HelloMessageSchema = z.object({
  type: z.literal('HELLO'),
  roomId: z.string(),
  accessToken: z.string(),
});

export const PingMessageSchema = z.object({
  type: z.literal('PING'),
});

export const ReadyMessageSchema = z.object({
  type: z.literal('READY'),
  roomId: z.string(),
  isReady: z.boolean(),
});

export const PlayMessageSchema = z.object({
  type: z.literal('PLAY'),
  roomId: z.string(),
  cards: z.array(CardSchema),
});

export const PassMessageSchema = z.object({
  type: z.literal('PASS'),
  roomId: z.string(),
});

export const SetRulesMessageSchema = z.object({
  type: z.literal('SET_RULES'),
  roomId: z.string(),
  scoreLimit: z.number().int().min(1).max(60),
});

export const SyncRequestMessageSchema = z.object({
  type: z.literal('SYNC_REQUEST'),
  roomId: z.string(),
});

export const StartGameMessageSchema = z.object({
  type: z.literal('START_GAME'),
  roomId: z.string(),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  HelloMessageSchema,
  PingMessageSchema,
  ReadyMessageSchema,
  PlayMessageSchema,
  PassMessageSchema,
  SetRulesMessageSchema,
  SyncRequestMessageSchema,
  StartGameMessageSchema,
]);

export type HelloMessage = z.infer<typeof HelloMessageSchema>;
export type PingMessage = z.infer<typeof PingMessageSchema>;
export type ReadyMessage = z.infer<typeof ReadyMessageSchema>;
export type PlayMessage = z.infer<typeof PlayMessageSchema>;
export type PassMessage = z.infer<typeof PassMessageSchema>;
export type SetRulesMessage = z.infer<typeof SetRulesMessageSchema>;
export type SyncRequestMessage = z.infer<typeof SyncRequestMessageSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Server -> Client messages
export type WelcomeMessage = {
  type: 'WELCOME';
  roomId: string;
  playerId: string;
};

export type StateMessage = {
  type: 'STATE';
  roomId: string;
  players: string[];
};

export type RoomStateMessage = {
  type: 'ROOM_STATE';
  roomId: string;
  players: Array<{ playerId: string; isReady: boolean }>;
};

export type RoundStartMessage = {
  type: 'ROUND_START';
  roomId: string;
  startedAt: number;
};

export const DealtMessageSchema = z.object({
  type: z.literal('DEALT'),
  roomId: z.string(),
  starterPlayerId: z.string(),
  reason: z.enum(['WINNER', 'WEAKEST_SINGLE']),
  yourHand: z.array(CardSchema),
  seatedPlayerIds: z.array(z.string()),
});

export type DealtMessage = z.infer<typeof DealtMessageSchema>;

export type LastPlay = {
  playerId: string;
  kind: 'SINGLE' | 'PAIR' | 'SET' | 'FIVE';
  fiveKind?: 'STRAIGHT' | 'FLUSH' | 'FULL_HOUSE' | 'FOUR' | 'STRAIGHT_FLUSH';
  cards: Card[];
};

export type GameStateMessage = {
  type: 'GAME_STATE';
  roomId: string;
  seatedPlayerIds: string[];
  currentTurnPlayerId: string;
  lastPlay: LastPlay | null;
  handsCount: Record<string, number>;
  passedPlayerIds: string[];
  turnTimeRemaining?: number; // Milliseconds remaining for current turn
  disconnectedPlayerIds?: string[]; // Players who are temporarily disconnected
};

export type PersonalStateMessage = {
  type: 'PERSONAL_STATE';
  roomId: string;
  yourHand: Card[];
};

export type RoundEndMessage = {
  type: 'ROUND_END';
  roomId: string;
  winnerPlayerId: string;
};

export type GameEndMessage = {
  type: 'GAME_END';
  roomId: string;
  winnerPlayerId: string;
  totalScores: Record<string, number>;
};

export type PlayerLeftMessage = {
  type: 'PLAYER_LEFT';
  roomId: string;
  playerId: string;
};

export type PlayerJoinedMessage = {
  type: 'PLAYER_JOINED';
  roomId: string;
  playerId: string;
};

export type PlayerDisconnectedMessage = {
  type: 'PLAYER_DISCONNECTED';
  roomId: string;
  playerId: string;
};

export type PlayerReconnectedMessage = {
  type: 'PLAYER_RECONNECTED';
  roomId: string;
  playerId: string;
};

export type RulesMessage = {
  type: 'RULES';
  roomId: string;
  scoreLimit: number;
};

export type ScoreUpdateMessage = {
  type: 'SCORE_UPDATE';
  roomId: string;
  totalScores: Record<string, number>;
  eliminated: string[];
};

export type RoomOverviewMessage = {
  type: 'ROOM_OVERVIEW';
  roomId: string;
  phase: 'lobby' | 'starting' | 'playing' | 'round_end';
  seatedPlayerIds: string[]; // In seat order (clockwise)
  queuePlayerIds: string[]; // Front -> back order
  dealerSeatIndex?: number; // Optional: index in seatedPlayerIds array
  currentTurnPlayerId?: string; // Only set when phase is 'playing'
  totalScores: Record<string, number>;
  eliminated: string[];
  handsCount?: Record<string, number>; // Only for seated players, only when phase is 'playing'
  passedPlayerIds?: string[]; // Only when phase is 'playing'
  connectedPlayerIds?: string[]; // Players with active connections
  disconnectedPlayerIds?: string[]; // Players who are temporarily disconnected
};

export type SyncStateMessage = {
  type: 'SYNC_STATE';
  roomId: string;
  phase: 'lobby' | 'starting' | 'playing' | 'round_end';
  seatedPlayerIds: string[];
  queuePlayerIds: string[];
  currentTurnPlayerId?: string;
  lastPlay: LastPlay | null;
  handsCount: Record<string, number>;
  totalScores: Record<string, number>;
  eliminated: string[];
  yourHand: Card[] | null; // Only included for the requesting player
  starterPlayerId?: string;
  starterReason?: 'WINNER' | 'WEAKEST_SINGLE';
  turnTimeRemaining?: number; // Milliseconds remaining for current turn
  disconnectedPlayerIds?: string[]; // Players who are temporarily disconnected
  scoreLimit?: number; // Current score limit for the room
};

export type ActionErrorMessage = {
  type: 'ACTION_ERROR';
  code: string;
  message?: string;
};

export type ErrorMessage = {
  type: 'ERROR';
  code: string;
  message?: string;
};

export type ServerMessage =
  | WelcomeMessage
  | StateMessage
  | RoomStateMessage
  | RoundStartMessage
  | DealtMessage
  | GameStateMessage
  | PersonalStateMessage
  | RoundEndMessage
  | GameEndMessage
  | PlayerLeftMessage
  | PlayerJoinedMessage
  | PlayerDisconnectedMessage
  | PlayerReconnectedMessage
  | RulesMessage
  | ScoreUpdateMessage
  | RoomOverviewMessage
  | SyncStateMessage
  | ActionErrorMessage
  | ErrorMessage;

