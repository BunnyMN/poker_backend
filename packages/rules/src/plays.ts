import type { Card, Rank, Suit } from './card.js';
import { RANK_ORDER, SUIT_ORDER } from './card.js';

// Re-export constants for comparison functions
const getRankOrder = (rank: Rank): number => RANK_ORDER[rank];
const getSuitOrder = (suit: Suit): number => SUIT_ORDER[suit];

/**
 * Check if cards form a valid PAIR (2 cards same rank)
 */
export function isPair(cards: Card[]): boolean {
  if (cards.length !== 2) {
    return false;
  }
  return cards[0].rank === cards[1].rank;
}

/**
 * Check if cards form a valid SET (3 cards same rank)
 */
export function isSet(cards: Card[]): boolean {
  if (cards.length !== 3) {
    return false;
  }
  return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
}

/**
 * Compare two PAIR plays.
 * - Compare pair rank
 * - If equal: sort suits desc (strong->weak) and compare lexicographically
 * Returns: -1 if a < b, +1 if a > b, 0 if equal
 */
export function comparePair(aCards: Card[], bCards: Card[]): number {
  if (aCards.length !== 2 || bCards.length !== 2) {
    throw new Error('comparePair requires exactly 2 cards each');
  }

  // Compare pair rank
  const aRank = getRankOrder(aCards[0].rank);
  const bRank = getRankOrder(bCards[0].rank);
  if (aRank !== bRank) {
    return aRank < bRank ? -1 : 1;
  }

  // If ranks equal, sort suits desc (strong->weak) and compare lexicographically
  const aSuits = [aCards[0].suit, aCards[1].suit]
    .map((s) => getSuitOrder(s))
    .sort((a, b) => b - a); // Descending (strong->weak)
  const bSuits = [bCards[0].suit, bCards[1].suit]
    .map((s) => getSuitOrder(s))
    .sort((a, b) => b - a); // Descending (strong->weak)

  // Compare lexicographically
  for (let i = 0; i < 2; i++) {
    if (aSuits[i] !== bSuits[i]) {
      return aSuits[i] < bSuits[i] ? -1 : 1;
    }
  }

  return 0;
}

/**
 * Compare two SET plays.
 * - Compare set rank
 * - If equal: compare highest suit among the three cards
 * Returns: -1 if a < b, +1 if a > b, 0 if equal
 */
export function compareSet(aCards: Card[], bCards: Card[]): number {
  if (aCards.length !== 3 || bCards.length !== 3) {
    throw new Error('compareSet requires exactly 3 cards each');
  }

  // Compare set rank
  const aRank = getRankOrder(aCards[0].rank);
  const bRank = getRankOrder(bCards[0].rank);
  if (aRank !== bRank) {
    return aRank < bRank ? -1 : 1;
  }

  // If ranks equal, compare highest suit among the three cards
  const aMaxSuit = Math.max(
    ...aCards.map((c) => getSuitOrder(c.suit))
  );
  const bMaxSuit = Math.max(
    ...bCards.map((c) => getSuitOrder(c.suit))
  );

  if (aMaxSuit !== bMaxSuit) {
    return aMaxSuit < bMaxSuit ? -1 : 1;
  }

  return 0;
}

