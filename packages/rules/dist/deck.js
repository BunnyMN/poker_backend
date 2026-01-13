/**
 * Create a fresh 52-card deck (all suits * all ranks)
 */
export function createDeck() {
    const deck = [];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const suits = ['S', 'H', 'C', 'D'];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}
/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffle(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
//# sourceMappingURL=deck.js.map