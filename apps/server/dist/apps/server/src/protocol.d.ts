import { z } from 'zod';
export declare const CardSchema: z.ZodObject<{
    rank: z.ZodEnum<["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]>;
    suit: z.ZodEnum<["S", "H", "C", "D"]>;
}, "strip", z.ZodTypeAny, {
    rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
    suit: "S" | "H" | "C" | "D";
}, {
    rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
    suit: "S" | "H" | "C" | "D";
}>;
export type Card = z.infer<typeof CardSchema>;
export declare const HelloMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"HELLO">;
    roomId: z.ZodString;
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "HELLO";
    roomId: string;
    accessToken: string;
}, {
    type: "HELLO";
    roomId: string;
    accessToken: string;
}>;
export declare const PingMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"PING">;
}, "strip", z.ZodTypeAny, {
    type: "PING";
}, {
    type: "PING";
}>;
export declare const ReadyMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"READY">;
    roomId: z.ZodString;
    isReady: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "READY";
    roomId: string;
    isReady: boolean;
}, {
    type: "READY";
    roomId: string;
    isReady: boolean;
}>;
export declare const PlayMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"PLAY">;
    roomId: z.ZodString;
    cards: z.ZodArray<z.ZodObject<{
        rank: z.ZodEnum<["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]>;
        suit: z.ZodEnum<["S", "H", "C", "D"]>;
    }, "strip", z.ZodTypeAny, {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }, {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "PLAY";
    roomId: string;
    cards: {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }[];
}, {
    type: "PLAY";
    roomId: string;
    cards: {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }[];
}>;
export declare const PassMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"PASS">;
    roomId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PASS";
    roomId: string;
}, {
    type: "PASS";
    roomId: string;
}>;
export declare const SetRulesMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"SET_RULES">;
    roomId: z.ZodString;
    scoreLimit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "SET_RULES";
    roomId: string;
    scoreLimit: number;
}, {
    type: "SET_RULES";
    roomId: string;
    scoreLimit: number;
}>;
export declare const SyncRequestMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"SYNC_REQUEST">;
    roomId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "SYNC_REQUEST";
    roomId: string;
}, {
    type: "SYNC_REQUEST";
    roomId: string;
}>;
export declare const ClientMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"HELLO">;
    roomId: z.ZodString;
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "HELLO";
    roomId: string;
    accessToken: string;
}, {
    type: "HELLO";
    roomId: string;
    accessToken: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"PING">;
}, "strip", z.ZodTypeAny, {
    type: "PING";
}, {
    type: "PING";
}>, z.ZodObject<{
    type: z.ZodLiteral<"READY">;
    roomId: z.ZodString;
    isReady: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "READY";
    roomId: string;
    isReady: boolean;
}, {
    type: "READY";
    roomId: string;
    isReady: boolean;
}>, z.ZodObject<{
    type: z.ZodLiteral<"PLAY">;
    roomId: z.ZodString;
    cards: z.ZodArray<z.ZodObject<{
        rank: z.ZodEnum<["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]>;
        suit: z.ZodEnum<["S", "H", "C", "D"]>;
    }, "strip", z.ZodTypeAny, {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }, {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "PLAY";
    roomId: string;
    cards: {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }[];
}, {
    type: "PLAY";
    roomId: string;
    cards: {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"PASS">;
    roomId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PASS";
    roomId: string;
}, {
    type: "PASS";
    roomId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"SET_RULES">;
    roomId: z.ZodString;
    scoreLimit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "SET_RULES";
    roomId: string;
    scoreLimit: number;
}, {
    type: "SET_RULES";
    roomId: string;
    scoreLimit: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"SYNC_REQUEST">;
    roomId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "SYNC_REQUEST";
    roomId: string;
}, {
    type: "SYNC_REQUEST";
    roomId: string;
}>]>;
export type HelloMessage = z.infer<typeof HelloMessageSchema>;
export type PingMessage = z.infer<typeof PingMessageSchema>;
export type ReadyMessage = z.infer<typeof ReadyMessageSchema>;
export type PlayMessage = z.infer<typeof PlayMessageSchema>;
export type PassMessage = z.infer<typeof PassMessageSchema>;
export type SetRulesMessage = z.infer<typeof SetRulesMessageSchema>;
export type SyncRequestMessage = z.infer<typeof SyncRequestMessageSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
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
    players: Array<{
        playerId: string;
        isReady: boolean;
    }>;
};
export type RoundStartMessage = {
    type: 'ROUND_START';
    roomId: string;
    startedAt: number;
};
export declare const DealtMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"DEALT">;
    roomId: z.ZodString;
    starterPlayerId: z.ZodString;
    reason: z.ZodEnum<["WINNER", "WEAKEST_SINGLE"]>;
    yourHand: z.ZodArray<z.ZodObject<{
        rank: z.ZodEnum<["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]>;
        suit: z.ZodEnum<["S", "H", "C", "D"]>;
    }, "strip", z.ZodTypeAny, {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }, {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }>, "many">;
    seatedPlayerIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "DEALT";
    roomId: string;
    starterPlayerId: string;
    reason: "WINNER" | "WEAKEST_SINGLE";
    yourHand: {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }[];
    seatedPlayerIds: string[];
}, {
    type: "DEALT";
    roomId: string;
    starterPlayerId: string;
    reason: "WINNER" | "WEAKEST_SINGLE";
    yourHand: {
        rank: "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
        suit: "S" | "H" | "C" | "D";
    }[];
    seatedPlayerIds: string[];
}>;
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
    seatedPlayerIds: string[];
    queuePlayerIds: string[];
    dealerSeatIndex?: number;
    currentTurnPlayerId?: string;
    totalScores: Record<string, number>;
    eliminated: string[];
    handsCount?: Record<string, number>;
    passedPlayerIds?: string[];
    connectedPlayerIds?: string[];
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
    yourHand: Card[] | null;
    starterPlayerId?: string;
    starterReason?: 'WINNER' | 'WEAKEST_SINGLE';
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
export type ServerMessage = WelcomeMessage | StateMessage | RoomStateMessage | RoundStartMessage | DealtMessage | GameStateMessage | PersonalStateMessage | RoundEndMessage | RulesMessage | ScoreUpdateMessage | RoomOverviewMessage | SyncStateMessage | ActionErrorMessage | ErrorMessage;
//# sourceMappingURL=protocol.d.ts.map