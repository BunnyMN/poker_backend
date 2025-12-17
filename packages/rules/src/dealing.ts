import type { Card } from './card.js';

/**
 * Deal 13 cards to each player from the deck.
 * Returns hands for each player and the remaining deck.
 */
export function dealHands(
  playerIds: string[],
  deck: Card[]
): { hands: Record<string, Card[]>; remainingDeck: Card[] } {
  const hands: Record<string, Card[]> = {};
  const cardsPerPlayer = 13;

  // Initialize empty hands
  for (const playerId of playerIds) {
    hands[playerId] = [];
  }

  // Deal cards round-robin style
  let deckIndex = 0;
  for (let cardIndex = 0; cardIndex < cardsPerPlayer; cardIndex++) {
    for (const playerId of playerIds) {
      if (deckIndex < deck.length) {
        hands[playerId].push(deck[deckIndex]);
        deckIndex++;
      }
    }
  }

  // Remaining deck is what's left
  const remainingDeck = deck.slice(deckIndex);

  return { hands, remainingDeck };
}

