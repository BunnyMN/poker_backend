import type { Card } from './card.js';
export interface DetermineStarterParams {
    hands: Record<string, Card[]>;
    seatedPlayerIds: string[];
    queueExists: boolean;
    previousWinnerPlayerId: string;
}
export interface DetermineStarterResult {
    starterPlayerId: string;
    reason: 'WINNER' | 'DIAMOND_3';
}
/**
 * Determine the starting player for the round.
 * Logic:
 * - If queue is empty (queueExists === false): previous winner starts
 * - If queue exists (queueExists === true): diamond 3 holder starts
 */
export declare function determineStarter(params: DetermineStarterParams): DetermineStarterResult;
//# sourceMappingURL=starter.d.ts.map