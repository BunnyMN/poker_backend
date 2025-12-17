import { Rank, Suit } from './card.js';
/**
 * Create a fresh 52-card deck (all suits * all ranks)
 */
export function createDeck() {
    const deck = [];
    const ranks = [
        Rank.THREE,
        Rank.FOUR,
        Rank.FIVE,
        Rank.SIX,
        Rank.SEVEN,
        Rank.EIGHT,
        Rank.NINE,
        Rank.TEN,
        Rank.JACK,
        Rank.QUEEN,
        Rank.KING,
        Rank.ACE,
        Rank.TWO,
    ];
    const suits = [Suit.SPADE, Suit.HEART, Suit.CLUB, Suit.DIAMOND];
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