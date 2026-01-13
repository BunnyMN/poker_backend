import { RANK_ORDER, SUIT_ORDER } from './card.js';
/**
 * Get rank order value for straight comparison
 * Special: 2-3-4-5-6 is lowest, 10-J-Q-K-A is highest
 * In straights, 2 is NOT treated as highest outside sequences
 */
function getStraightRankOrder(rank) {
    // Special case: 2 in straight context (only for 2-3-4-5-6)
    if (rank === '2') {
        return 2; // Treat as low for straight purposes
    }
    return RANK_ORDER[rank];
}
/**
 * Check if 5 cards form a straight
 * Special rules:
 * - Lowest: 2-3-4-5-6
 * - Highest: 10-J-Q-K-A
 * - 2 is NOT treated as highest outside these sequences
 */
function isStraight(cards) {
    if (cards.length !== 5) {
        return { isStraight: false };
    }
    // Sort by rank order (for straight detection)
    const sorted = [...cards].sort((a, b) => {
        const aOrder = getStraightRankOrder(a.rank);
        const bOrder = getStraightRankOrder(b.rank);
        return aOrder - bOrder;
    });
    // Check for special low straight: 2-3-4-5-6
    const ranks = sorted.map((c) => c.rank);
    if (ranks[0] === '2' &&
        ranks[1] === '3' &&
        ranks[2] === '4' &&
        ranks[3] === '5' &&
        ranks[4] === '6') {
        return { isStraight: true, highestRank: '6' };
    }
    // Check for special high straight: 10-J-Q-K-A
    if (ranks[0] === '10' &&
        ranks[1] === 'J' &&
        ranks[2] === 'Q' &&
        ranks[3] === 'K' &&
        ranks[4] === 'A') {
        return { isStraight: true, highestRank: 'A' };
    }
    // Check for regular straights (no 2s except in 2-3-4-5-6)
    const hasTwo = ranks.includes('2');
    if (hasTwo) {
        return { isStraight: false };
    }
    // Check consecutive ranks using normal RANK_ORDER
    // Sort by normal rank order (2 is highest in normal order, but we've already excluded it)
    const sortedNormal = [...cards].sort((a, b) => {
        return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    });
    // Check consecutive ranks
    for (let i = 0; i < 4; i++) {
        const currentOrder = RANK_ORDER[sortedNormal[i].rank];
        const nextOrder = RANK_ORDER[sortedNormal[i + 1].rank];
        if (nextOrder !== currentOrder + 1) {
            return { isStraight: false };
        }
    }
    return { isStraight: true, highestRank: sortedNormal[4].rank };
}
/**
 * Check if 5 cards form a flush (all same suit)
 */
function isFlush(cards) {
    if (cards.length !== 5) {
        return false;
    }
    const firstSuit = cards[0].suit;
    return cards.every((c) => c.suit === firstSuit);
}
/**
 * Check if 5 cards form a full house (3 of one rank + 2 of another)
 */
function isFullHouse(cards) {
    if (cards.length !== 5) {
        return { isFullHouse: false };
    }
    const rankCounts = {};
    for (const card of cards) {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    }
    const counts = Object.values(rankCounts);
    if (counts.length !== 2) {
        return { isFullHouse: false };
    }
    // Must be 3 and 2
    if (!counts.includes(3) || !counts.includes(2)) {
        return { isFullHouse: false };
    }
    // Find triplet and pair ranks
    let tripletRank;
    let pairRank;
    for (const [rank, count] of Object.entries(rankCounts)) {
        if (count === 3) {
            tripletRank = rank;
        }
        else if (count === 2) {
            pairRank = rank;
        }
    }
    return {
        isFullHouse: true,
        tripletRank: tripletRank,
        pairRank: pairRank,
    };
}
/**
 * Check if 5 cards form four of a kind
 */
function isFourOfAKind(cards) {
    if (cards.length !== 5) {
        return { isFour: false };
    }
    const rankCounts = {};
    for (const card of cards) {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    }
    const counts = Object.values(rankCounts);
    if (counts.length !== 2) {
        return { isFour: false };
    }
    // Must be 4 and 1
    if (!counts.includes(4) || !counts.includes(1)) {
        return { isFour: false };
    }
    // Find four and kicker ranks
    let fourRank;
    let kickerRank;
    for (const [rank, count] of Object.entries(rankCounts)) {
        if (count === 4) {
            fourRank = rank;
        }
        else if (count === 1) {
            kickerRank = rank;
        }
    }
    return {
        isFour: true,
        fourRank: fourRank,
        kickerRank: kickerRank,
    };
}
/**
 * Get highest suit among cards
 */
function getHighestSuit(cards) {
    let highest = cards[0].suit;
    let highestOrder = SUIT_ORDER[cards[0].suit];
    for (let i = 1; i < cards.length; i++) {
        const order = SUIT_ORDER[cards[i].suit];
        if (order > highestOrder) {
            highest = cards[i].suit;
            highestOrder = order;
        }
    }
    return highest;
}
/**
 * Classify a 5-card hand
 * Returns null if not a valid 5-card combo (no high-card allowed)
 */
export function classifyFiveCardHand(cards) {
    if (cards.length !== 5) {
        return null;
    }
    const straightResult = isStraight(cards);
    const isFlushResult = isFlush(cards);
    const fullHouseResult = isFullHouse(cards);
    const fourResult = isFourOfAKind(cards);
    // Straight Flush (straight + flush)
    if (straightResult.isStraight && isFlushResult) {
        return {
            kind: 'STRAIGHT_FLUSH',
            tiebreak: {
                highestRank: straightResult.highestRank,
                highestSuit: getHighestSuit(cards),
            },
        };
    }
    // Four of a Kind
    if (fourResult.isFour) {
        const fourCards = cards.filter((c) => c.rank === fourResult.fourRank);
        return {
            kind: 'FOUR',
            tiebreak: {
                fourRank: fourResult.fourRank,
                kickerRank: fourResult.kickerRank,
                fourHighestSuit: getHighestSuit(fourCards),
            },
        };
    }
    // Full House
    if (fullHouseResult.isFullHouse) {
        const tripletCards = cards.filter((c) => c.rank === fullHouseResult.tripletRank);
        return {
            kind: 'FULL_HOUSE',
            tiebreak: {
                tripletRank: fullHouseResult.tripletRank,
                pairRank: fullHouseResult.pairRank,
                tripletHighestSuit: getHighestSuit(tripletCards),
            },
        };
    }
    // Flush
    if (isFlushResult) {
        // Sort by rank then suit descending
        const sorted = [...cards].sort((a, b) => {
            const rankDiff = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
            if (rankDiff !== 0) {
                return rankDiff;
            }
            return SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit]; // Descending suit
        });
        return {
            kind: 'FLUSH',
            tiebreak: {
                sortedCards: sorted,
            },
        };
    }
    // Straight
    if (straightResult.isStraight) {
        return {
            kind: 'STRAIGHT',
            tiebreak: {
                highestRank: straightResult.highestRank,
                highestSuit: getHighestSuit(cards),
            },
        };
    }
    // Not a valid 5-card combo (high-card not allowed)
    return null;
}
/**
 * Compare two 5-card hands
 * Returns: -1 if a < b, +1 if a > b, 0 if equal
 */
export function compareFiveCardHands(a, b) {
    // Hand rank order: Straight < Flush < Full House < Four < Straight Flush
    const HAND_RANK_ORDER = {
        STRAIGHT: 1,
        FLUSH: 2,
        FULL_HOUSE: 3,
        FOUR: 4,
        STRAIGHT_FLUSH: 5,
    };
    // Compare by hand rank
    const aRank = HAND_RANK_ORDER[a.kind];
    const bRank = HAND_RANK_ORDER[b.kind];
    if (aRank !== bRank) {
        return aRank < bRank ? -1 : 1;
    }
    // Same hand type - use tie-break rules
    const tiebreakA = a.tiebreak;
    const tiebreakB = b.tiebreak;
    if (a.kind === 'STRAIGHT' || a.kind === 'STRAIGHT_FLUSH') {
        // Compare by straight highest card using special straight order
        const aHighest = tiebreakA.highestRank;
        const bHighest = tiebreakB.highestRank;
        const aOrder = getStraightRankOrder(aHighest);
        const bOrder = getStraightRankOrder(bHighest);
        if (aOrder !== bOrder) {
            return aOrder < bOrder ? -1 : 1;
        }
        // If still tied, compare highest suit
        const aSuit = SUIT_ORDER[tiebreakA.highestSuit];
        const bSuit = SUIT_ORDER[tiebreakB.highestSuit];
        if (aSuit !== bSuit) {
            return aSuit < bSuit ? -1 : 1;
        }
        return 0;
    }
    if (a.kind === 'FLUSH') {
        // Sort the 5 cards by rank then suit descending and compare lexicographically
        const aCards = tiebreakA.sortedCards;
        const bCards = tiebreakB.sortedCards;
        for (let i = 0; i < 5; i++) {
            const aCard = aCards[i];
            const bCard = bCards[i];
            // Compare rank
            const rankDiff = RANK_ORDER[aCard.rank] - RANK_ORDER[bCard.rank];
            if (rankDiff !== 0) {
                return rankDiff < 0 ? -1 : 1;
            }
            // Compare suit (descending order)
            const suitDiff = SUIT_ORDER[bCard.suit] - SUIT_ORDER[aCard.suit];
            if (suitDiff !== 0) {
                return suitDiff < 0 ? -1 : 1;
            }
        }
        return 0;
    }
    if (a.kind === 'FULL_HOUSE') {
        // Compare triplet rank
        const aTriplet = RANK_ORDER[tiebreakA.tripletRank];
        const bTriplet = RANK_ORDER[tiebreakB.tripletRank];
        if (aTriplet !== bTriplet) {
            return aTriplet < bTriplet ? -1 : 1;
        }
        // Compare pair rank
        const aPair = RANK_ORDER[tiebreakA.pairRank];
        const bPair = RANK_ORDER[tiebreakB.pairRank];
        if (aPair !== bPair) {
            return aPair < bPair ? -1 : 1;
        }
        // Compare highest suit in triplet
        const aSuit = SUIT_ORDER[tiebreakA.tripletHighestSuit];
        const bSuit = SUIT_ORDER[tiebreakB.tripletHighestSuit];
        if (aSuit !== bSuit) {
            return aSuit < bSuit ? -1 : 1;
        }
        return 0;
    }
    if (a.kind === 'FOUR') {
        // Compare rank of the four
        const aFour = RANK_ORDER[tiebreakA.fourRank];
        const bFour = RANK_ORDER[tiebreakB.fourRank];
        if (aFour !== bFour) {
            return aFour < bFour ? -1 : 1;
        }
        // Compare kicker rank
        const aKicker = RANK_ORDER[tiebreakA.kickerRank];
        const bKicker = RANK_ORDER[tiebreakB.kickerRank];
        if (aKicker !== bKicker) {
            return aKicker < bKicker ? -1 : 1;
        }
        // Compare highest suit among the four
        const aSuit = SUIT_ORDER[tiebreakA.fourHighestSuit];
        const bSuit = SUIT_ORDER[tiebreakB.fourHighestSuit];
        if (aSuit !== bSuit) {
            return aSuit < bSuit ? -1 : 1;
        }
        return 0;
    }
    return 0;
}
//# sourceMappingURL=fiveCard.js.map