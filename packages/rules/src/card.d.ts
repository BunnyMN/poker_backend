export declare enum Rank {
    THREE = 3,
    FOUR = 4,
    FIVE = 5,
    SIX = 6,
    SEVEN = 7,
    EIGHT = 8,
    NINE = 9,
    TEN = 10,
    JACK = 11,
    QUEEN = 12,
    KING = 13,
    ACE = 14,
    TWO = 15
}
export declare enum Suit {
    SPADE = "\u2660",
    HEART = "\u2665",
    CLUB = "\u2663",
    DIAMOND = "\u2666"
}
export interface Card {
    rank: Rank;
    suit: Suit;
}
/**
 * Compare two cards for ordering.
 * Rank order: 3 4 5 6 7 8 9 10 J Q K A 2
 * Suit order: ♠ > ♥ > ♣ > ♦
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
export declare function compareCards(a: Card, b: Card): number;
/**
 * Check if a card is the diamond 3 (♦3)
 */
export declare function isDiamond3(card: Card): boolean;
//# sourceMappingURL=card.d.ts.map