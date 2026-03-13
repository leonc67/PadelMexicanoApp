import type { Match, Player } from "@/lib/types";

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  pointDiff: number;
  points: number;
  wins: number;
  played: number;
}

/**
 * Compute the leaderboard from all matches and the player list.
 * Only completed matches (score_a and score_b non-null) are counted.
 */
export function computeLeaderboard(
  players: Player[],
  matches: Match[]
): LeaderboardEntry[] {
  const stats: Record<string, { pointDiff: number; points: number; wins: number; played: number }> = {};

  for (const p of players) {
    stats[p.id] = { pointDiff: 0, points: 0, wins: 0, played: 0 };
  }

  for (const match of matches) {
    if (match.score_a === null || match.score_b === null) continue;

    const scoreA = match.score_a;
    const scoreB = match.score_b;
    const aWon = scoreA > scoreB;

    for (const playerId of match.team_a) {
      if (!stats[playerId]) stats[playerId] = { pointDiff: 0, points: 0, wins: 0, played: 0 };
      stats[playerId].pointDiff += scoreA - scoreB;
      stats[playerId].points += scoreA;
      stats[playerId].played += 1;
      if (aWon) stats[playerId].wins += 1;
    }

    for (const playerId of match.team_b) {
      if (!stats[playerId]) stats[playerId] = { pointDiff: 0, points: 0, wins: 0, played: 0 };
      stats[playerId].pointDiff += scoreB - scoreA;
      stats[playerId].points += scoreB;
      stats[playerId].played += 1;
      if (!aWon) stats[playerId].wins += 1;
    }
  }

  return players
    .map((p) => ({ playerId: p.id, name: p.name, ...stats[p.id] }))
    .sort((a, b) =>
      b.pointDiff - a.pointDiff ||
      b.points - a.points ||
      b.wins - a.wins
    );
}
