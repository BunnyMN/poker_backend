import { WebSocket } from 'ws';
export interface Room {
    clients: Set<WebSocket>;
    players: Map<string, {
        isReady: boolean;
    }>;
    phase: 'lobby' | 'starting';
    ownerPlayerId?: string;
}
export declare function getOrCreateRoom(roomId: string): Room;
export declare function addClientToRoom(roomId: string, ws: WebSocket, playerId: string): void;
export declare function removeClientFromRoom(roomId: string, ws: WebSocket, playerId: string): void;
export declare function setPlayerReady(roomId: string, playerId: string, isReady: boolean): void;
export declare function broadcastRoomState(roomId: string): number;
export declare function checkAndBroadcastRoundStart(roomId: string): boolean;
export declare function getRoom(roomId: string): Room | undefined;
export declare function getSeatedPlayerIds(roomId: string, maxPlayers?: number): string[];
//# sourceMappingURL=rooms.d.ts.map