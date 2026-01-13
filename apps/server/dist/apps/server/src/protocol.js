import { z } from 'zod';
// Card representation for protocol (must be defined before use)
export const CardSchema = z.object({
    rank: z.enum(['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']),
    suit: z.enum(['S', 'H', 'C', 'D']),
});
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
export const ClientMessageSchema = z.discriminatedUnion('type', [
    HelloMessageSchema,
    PingMessageSchema,
    ReadyMessageSchema,
    PlayMessageSchema,
    PassMessageSchema,
    SetRulesMessageSchema,
    SyncRequestMessageSchema,
]);
export const DealtMessageSchema = z.object({
    type: z.literal('DEALT'),
    roomId: z.string(),
    starterPlayerId: z.string(),
    reason: z.enum(['WINNER', 'WEAKEST_SINGLE']),
    yourHand: z.array(CardSchema),
    seatedPlayerIds: z.array(z.string()),
});
//# sourceMappingURL=protocol.js.map