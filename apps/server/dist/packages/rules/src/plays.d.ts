import type { Card } from './card.js';
/**
 * Check if cards form a valid PAIR (2 cards same rank)
 */
export declare function isPair(cards: Card[]): boolean;
/**
 * Check if cards form a valid SET (3 cards same rank)
 */
export declare function isSet(cards: Card[]): boolean;
/**
 * Compare two PAIR plays.
 * - Compare pair rank
 * - If equal: sort suits desc (strong->weak) and compare lexicographically
 * Returns: -1 if a < b, +1 if a > b, 0 if equal
 */
export declare function comparePair(aCards: Card[], bCards: Card[]): number;
/**
 * Compare two SET plays.
 * - Compare set rank
 * - If equal: compare highest suit among the three cards
 * Returns: -1 if a < b, +1 if a > b, 0 if equal
 */
export declare function compareSet(aCards: Card[], bCards: Card[]): number;
//# sourceMappingURL=plays.d.ts.map