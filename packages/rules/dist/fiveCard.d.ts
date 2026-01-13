import type { Card, Rank } from './card.js';
export type FiveCardKind = 'STRAIGHT' | 'FLUSH' | 'FULL_HOUSE' | 'FOUR' | 'STRAIGHT_FLUSH';
export interface FiveCardClassification {
    kind: FiveCardKind;
    tiebreak: {
        highestRank?: Rank;
        sortedCards?: Card[];
        tripletRank?: Rank;
        pairRank?: Rank;
        tripletHighestSuit?: string;
        fourRank?: Rank;
        kickerRank?: Rank;
        fourHighestSuit?: string;
        highestSuit?: string;
    };
}
/**
 * Classify a 5-card hand
 * Returns null if not a valid 5-card combo (no high-card allowed)
 */
export declare function classifyFiveCardHand(cards: Card[]): FiveCardClassification | null;
/**
 * Compare two 5-card hands
 * Returns: -1 if a < b, +1 if a > b, 0 if equal
 */
export declare function compareFiveCardHands(a: FiveCardClassification, b: FiveCardClassification): number;
//# sourceMappingURL=fiveCard.d.ts.map