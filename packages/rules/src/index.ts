export * from './card.js';
export * from './deck.js';
export * from './dealing.js';
export * from './starter.js';
export * from './plays.js';
export * from './fiveCard.js';

// Re-export specific functions for convenience
export { compareSingle } from './card.js';
export { getWeakestSingleOwner, determineStarter } from './starter.js';
export { isPair, isSet, comparePair, compareSet } from './plays.js';
export {
  classifyFiveCardHand,
  compareFiveCardHands,
  type FiveCardKind,
  type FiveCardClassification,
} from './fiveCard.js';

