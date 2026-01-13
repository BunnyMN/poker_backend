export type Suit = 'S' | 'H' | 'C' | 'D';
export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';
export interface Card {
    rank: Rank;
    suit: Suit;
}
export declare const RANK_ORDER: Record<Rank, number>;
export declare const SUIT_ORDER: Record<Suit, number>;
/**
 * Compare two cards for ordering.
 * Rank order: 3 4 5 6 7 8 9 10 J Q K A 2
 * Suit order: S > H > C > D (♠ > ♥ > ♣ > ♦)
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
export declare function compareCards(a: Card, b: Card): number;
/**
 * Compare two single cards to find the weaker one.
 * Weaker = lower rank, or if rank equal, lower suit (D is weakest).
 * Returns: -1 if a is weaker than b, +1 if a is stronger than b, 0 if equal
 */
export declare function compareSingle(a: Card, b: Card): number;
/**
 * Check if a card is the diamond 3 (D3)
 */
export declare function isDiamond3(card: Card): boolean;
//# sourceMappingURL=card.d.ts.map