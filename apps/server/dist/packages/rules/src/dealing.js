/**
 * Deal 13 cards to each player from the deck.
 * Returns hands for each player and the remaining deck.
 */
export function dealHands(playerIds, deck) {
    const hands = {};
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
//# sourceMappingURL=dealing.js.map