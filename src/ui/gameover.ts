import type { LeaderboardEntry } from '../constants';

export function drawGameOver(_ctx: CanvasRenderingContext2D, _score: number, _isNewRecord: boolean, _leaderboard: LeaderboardEntry[]): void {}
export function isReplayClicked(_x: number, _y: number): boolean { return true; }
export function isHomeClicked(_x: number, _y: number): boolean { return false; }
