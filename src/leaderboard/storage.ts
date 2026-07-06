import { LS_LEADERBOARD, LS_MUTED, LS_HIGH_SCORE, type LeaderboardEntry } from '../constants';

const MAX_LEADERBOARD_ENTRIES = 5;

export function readHighScore(): number {
  try {
    const raw = localStorage.getItem(LS_HIGH_SCORE);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

export function writeHighScore(score: number): void {
  try { localStorage.setItem(LS_HIGH_SCORE, String(score)); } catch {}
}

export function readMuted(): boolean {
  try { return localStorage.getItem(LS_MUTED) === 'true'; } catch { return false; }
}

export function writeMuted(muted: boolean): void {
  try { localStorage.setItem(LS_MUTED, String(muted)); } catch {}
}

export function readLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LS_LEADERBOARD);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_LEADERBOARD_ENTRIES);
  } catch { return []; }
}

export function insertLeaderboardEntry(score: number, hasYao: boolean): LeaderboardEntry[] {
  const entries = readLeaderboard();
  const entry: LeaderboardEntry = {
    score,
    date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    hasYao,
  };
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, MAX_LEADERBOARD_ENTRIES);
  try { localStorage.setItem(LS_LEADERBOARD, JSON.stringify(trimmed)); } catch {}
  return trimmed;
}
