import { isDiamond3 } from './card.js';
/**
 * Determine the starting player for the round.
 * Logic:
 * - If queue is empty (queueExists === false): previous winner starts
 * - If queue exists (queueExists === true): diamond 3 holder starts
 */
export function determineStarter(params) {
    const { hands, seatedPlayerIds, queueExists, previousWinnerPlayerId } = params;
    // If queue is empty, previous winner starts
    if (!queueExists) {
        return {
            starterPlayerId: previousWinnerPlayerId,
            reason: 'WINNER',
        };
    }
    // If queue exists, find who has diamond 3
    for (const playerId of seatedPlayerIds) {
        const hand = hands[playerId];
        if (!hand) {
            continue;
        }
        // Check if this player has the diamond 3
        const hasDiamond3 = hand.some((card) => isDiamond3(card));
        if (hasDiamond3) {
            return {
                starterPlayerId: playerId,
                reason: 'DIAMOND_3',
            };
        }
    }
    // Should never happen, but throw error if diamond 3 not found
    throw new Error('Diamond 3 not found in any player hand (queue exists but card missing)');
}
//# sourceMappingURL=starter.js.map