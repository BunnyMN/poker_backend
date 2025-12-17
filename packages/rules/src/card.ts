export type Suit = 'S' | 'H' | 'C' | 'D';
export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface Card {
  rank: Rank;
  suit: Suit;
}

// Rank order: 3 4 5 6 7 8 9 10 J Q K A 2
export const RANK_ORDER: Record<Rank, number> = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
  '2': 15,
};

// Suit order: S > H > C > D (♠ > ♥ > ♣ > ♦)
export const SUIT_ORDER: Record<Suit, number> = {
  S: 4,
  H: 3,
  C: 2,
  D: 1,
};

/**
 * Compare two cards for ordering.
 * Rank order: 3 4 5 6 7 8 9 10 J Q K A 2
 * Suit order: S > H > C > D (♠ > ♥ > ♣ > ♦)
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
export function compareCards(a: Card, b: Card): number {
  // First compare by rank
  const rankDiff = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  if (rankDiff !== 0) {
    return rankDiff;
  }
  // If ranks are equal, compare by suit
  return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
}

/**
 * Compare two single cards to find the weaker one.
 * Weaker = lower rank, or if rank equal, lower suit (D is weakest).
 * Returns: -1 if a is weaker than b, +1 if a is stronger than b, 0 if equal
 */
export function compareSingle(a: Card, b: Card): number {
  // First compare by rank (lower rank is weaker)
  const rankDiff = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  if (rankDiff !== 0) {
    return rankDiff < 0 ? -1 : 1;
  }
  // If ranks are equal, compare by suit (lower suit is weaker, D is weakest)
  const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  if (suitDiff === 0) {
    return 0;
  }
  return suitDiff < 0 ? -1 : 1;
}

/**
 * Check if a card is the diamond 3 (D3)
 */
export function isDiamond3(card: Card): boolean {
  return card.rank === '3' && card.suit === 'D';
}

