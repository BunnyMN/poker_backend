import { compareSingle } from './card.js';
/**
 * Find the player who holds the weakest single card in their hand.
 * Returns the playerId and the weakest card.
 */
export function getWeakestSingleOwner(hands, seatedPlayerIds) {
    let weakestOwner = null;
    for (const playerId of seatedPlayerIds) {
        const hand = hands[playerId];
        if (!hand || hand.length === 0) {
            continue;
        }
        // Find the weakest card in this player's hand
        let weakestCard = hand[0];
        for (let i = 1; i < hand.length; i++) {
            if (compareSingle(hand[i], weakestCard) < 0) {
                weakestCard = hand[i];
            }
        }
        // Compare this player's weakest card with the overall weakest
        if (weakestOwner === null || compareSingle(weakestCard, weakestOwner.card) < 0) {
            weakestOwner = { playerId, card: weakestCard };
        }
    }
    if (weakestOwner === null) {
        throw new Error('No players with cards found');
    }
    return weakestOwner;
}
/**
 * Determine the starting player for the round.
 * Logic:
 * - If tableUnchanged is true => previousRoundWinnerPlayerId starts (WINNER)
 * - If tableUnchanged is false => player with weakest single card starts (WEAKEST_SINGLE)
 */
export function determineStarter(params) {
    const { hands, seatedPlayerIds, tableUnchanged, previousWinnerPlayerId } = params;
    // If table unchanged, previous winner starts
    if (tableUnchanged) {
        if (!previousWinnerPlayerId) {
            throw new Error('tableUnchanged is true but previousWinnerPlayerId is not provided');
        }
        return {
            starterPlayerId: previousWinnerPlayerId,
            reason: 'WINNER',
        };
    }
    // Table changed or first round: use weakest single card rule
    const weakest = getWeakestSingleOwner(hands, seatedPlayerIds);
    return {
        starterPlayerId: weakest.playerId,
        reason: 'WEAKEST_SINGLE',
    };
}
//# sourceMappingURL=starter.js.map