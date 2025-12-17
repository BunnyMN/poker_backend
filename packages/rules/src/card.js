export var Rank;
(function (Rank) {
    Rank[Rank["THREE"] = 3] = "THREE";
    Rank[Rank["FOUR"] = 4] = "FOUR";
    Rank[Rank["FIVE"] = 5] = "FIVE";
    Rank[Rank["SIX"] = 6] = "SIX";
    Rank[Rank["SEVEN"] = 7] = "SEVEN";
    Rank[Rank["EIGHT"] = 8] = "EIGHT";
    Rank[Rank["NINE"] = 9] = "NINE";
    Rank[Rank["TEN"] = 10] = "TEN";
    Rank[Rank["JACK"] = 11] = "JACK";
    Rank[Rank["QUEEN"] = 12] = "QUEEN";
    Rank[Rank["KING"] = 13] = "KING";
    Rank[Rank["ACE"] = 14] = "ACE";
    Rank[Rank["TWO"] = 15] = "TWO";
})(Rank || (Rank = {}));
export var Suit;
(function (Suit) {
    Suit["SPADE"] = "\u2660";
    Suit["HEART"] = "\u2665";
    Suit["CLUB"] = "\u2663";
    Suit["DIAMOND"] = "\u2666";
})(Suit || (Suit = {}));
// Suit order: ♠ > ♥ > ♣ > ♦
const SUIT_ORDER = {
    [Suit.SPADE]: 4,
    [Suit.HEART]: 3,
    [Suit.CLUB]: 2,
    [Suit.DIAMOND]: 1,
};
/**
 * Compare two cards for ordering.
 * Rank order: 3 4 5 6 7 8 9 10 J Q K A 2
 * Suit order: ♠ > ♥ > ♣ > ♦
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
export function compareCards(a, b) {
    // First compare by rank
    if (a.rank !== b.rank) {
        return a.rank - b.rank;
    }
    // If ranks are equal, compare by suit
    return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
}
/**
 * Check if a card is the diamond 3 (♦3)
 */
export function isDiamond3(card) {
    return card.rank === Rank.THREE && card.suit === Suit.DIAMOND;
}
//# sourceMappingURL=card.js.map