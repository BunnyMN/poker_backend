import type { Card } from './card.js';
/**
 * Deal 13 cards to each player from the deck.
 * Returns hands for each player and the remaining deck.
 */
export declare function dealHands(playerIds: string[], deck: Card[]): {
    hands: Record<string, Card[]>;
    remainingDeck: Card[];
};
//# sourceMappingURL=dealing.d.ts.map