import { z } from 'zod';
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
export const ClientMessageSchema = z.discriminatedUnion('type', [
    HelloMessageSchema,
    PingMessageSchema,
    ReadyMessageSchema,
]);
// Card representation for protocol
export const CardSchema = z.object({
    rank: z.number(),
    suit: z.string(),
});
export const DealtMessageSchema = z.object({
    type: z.literal('DEALT'),
    roomId: z.string(),
    starterPlayerId: z.string(),
    reason: z.enum(['WINNER', 'DIAMOND_3']),
    yourHand: z.array(CardSchema),
    seatedPlayerIds: z.array(z.string()),
});
//# sourceMappingURL=protocol.js.map