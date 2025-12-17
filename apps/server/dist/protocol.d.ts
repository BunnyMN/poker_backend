import { z } from 'zod';
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
}>]>;
export type HelloMessage = z.infer<typeof HelloMessageSchema>;
export type PingMessage = z.infer<typeof PingMessageSchema>;
export type ReadyMessage = z.infer<typeof ReadyMessageSchema>;
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
export declare const CardSchema: z.ZodObject<{
    rank: z.ZodNumber;
    suit: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rank: number;
    suit: string;
}, {
    rank: number;
    suit: string;
}>;
export type Card = z.infer<typeof CardSchema>;
export declare const DealtMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"DEALT">;
    roomId: z.ZodString;
    starterPlayerId: z.ZodString;
    reason: z.ZodEnum<["WINNER", "DIAMOND_3"]>;
    yourHand: z.ZodArray<z.ZodObject<{
        rank: z.ZodNumber;
        suit: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        rank: number;
        suit: string;
    }, {
        rank: number;
        suit: string;
    }>, "many">;
    seatedPlayerIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "DEALT";
    roomId: string;
    starterPlayerId: string;
    reason: "WINNER" | "DIAMOND_3";
    yourHand: {
        rank: number;
        suit: string;
    }[];
    seatedPlayerIds: string[];
}, {
    type: "DEALT";
    roomId: string;
    starterPlayerId: string;
    reason: "WINNER" | "DIAMOND_3";
    yourHand: {
        rank: number;
        suit: string;
    }[];
    seatedPlayerIds: string[];
}>;
export type DealtMessage = z.infer<typeof DealtMessageSchema>;
export type ErrorMessage = {
    type: 'ERROR';
    code: string;
    message?: string;
};
export type ServerMessage = WelcomeMessage | StateMessage | RoomStateMessage | RoundStartMessage | DealtMessage | ErrorMessage;
//# sourceMappingURL=protocol.d.ts.map