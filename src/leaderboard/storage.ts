import type { LeaderboardEntry } from '../constants';

export function readHighScore(): number { return 0; }
export function writeHighScore(_score: number): void {}
export function readMuted(): boolean { return false; }
export function writeMuted(_muted: boolean): void {}
export function readLeaderboard(): LeaderboardEntry[] { return []; }
export function insertLeaderboardEntry(_score: number, _hasYao: boolean): LeaderboardEntry[] { return []; }
