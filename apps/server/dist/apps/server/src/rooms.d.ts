import { WebSocket } from 'ws';
import type { Card, LastPlay } from './protocol.js';
export interface Room {
    clients: Set<WebSocket>;
    players: Map<string, {
        isReady: boolean;
        disconnectedAt?: number;
    }>;
    phase: 'lobby' | 'starting' | 'playing' | 'round_end';
    connectionsByPlayerId: Map<string, WebSocket>;
    playerIdBySocket: WeakMap<WebSocket, string>;
    ownerPlayerId?: string;
    scoreLimit: number;
    totalScores: Map<string, number>;
    eliminated: Set<string>;
    queuePlayerIds: string[];
    previousRoundSeatedPlayerIds?: string[];
    previousRoundWinnerPlayerId?: string;
    seatedPlayerIds?: string[];
    hands?: Record<string, Card[]>;
    starterPlayerId?: string;
    starterReason?: 'WINNER' | 'WEAKEST_SINGLE';
    currentTurnPlayerId?: string;
    lastPlay?: LastPlay | null;
    passedSet?: Set<string>;
    turnEndsAt?: number;
    turnTimer?: NodeJS.Timeout | null;
}
export declare function getOrCreateRoom(roomId: string): Room;
export declare function addClientToRoom(roomId: string, ws: WebSocket, playerId: string): {
    isReconnect: boolean;
    oldWs?: WebSocket;
};
export declare function removeClientFromRoom(roomId: string, ws: WebSocket, playerId: string): void;
export declare function setPlayerReady(roomId: string, playerId: string, isReady: boolean): void;
export declare function broadcastRoomState(roomId: string): number;
export declare function checkAndBroadcastRoundStart(roomId: string): boolean;
export declare function getRoom(roomId: string): Room | undefined;
export declare function getSeatedPlayerIds(roomId: string, maxPlayers?: number): string[];
//# sourceMappingURL=rooms.d.ts.map