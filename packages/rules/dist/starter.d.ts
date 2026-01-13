import type { Card } from './card.js';
export interface DetermineStarterParams {
    hands: Record<string, Card[]>;
    seatedPlayerIds: string[];
    tableUnchanged: boolean;
    previousWinnerPlayerId?: string | null;
}
export interface DetermineStarterResult {
    starterPlayerId: string;
    reason: 'WINNER' | 'WEAKEST_SINGLE';
}
/**
 * Find the player who holds the weakest single card in their hand.
 * Returns the playerId and the weakest card.
 */
export declare function getWeakestSingleOwner(hands: Record<string, Card[]>, seatedPlayerIds: string[]): {
    playerId: string;
    card: Card;
};
/**
 * Determine the starting player for the round.
 * Logic:
 * - If tableUnchanged is true => previousRoundWinnerPlayerId starts (WINNER)
 * - If tableUnchanged is false => player with weakest single card starts (WEAKEST_SINGLE)
 */
export declare function determineStarter(params: DetermineStarterParams): DetermineStarterResult;
//# sourceMappingURL=starter.d.ts.map