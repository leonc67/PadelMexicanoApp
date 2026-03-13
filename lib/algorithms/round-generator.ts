export interface PlayerScore {
  id: string;
  score: number;
}

export interface MatchPairing {
  court: number;
  teamA: [string, string];
  teamB: [string, string];
}

// partnerCounts[a][b] = number of times a and b have been on the same team
export type PartnerCounts = Record<string, Record<string, number>>;

function getPartnerCount(counts: PartnerCounts, a: string, b: string): number {
  return counts[a]?.[b] ?? 0;
}

/** For a group of 4, pick the pairing where teammates have played together the least. */
function bestPairing(
  group: PlayerScore[],
  counts: PartnerCounts
): { teamA: [string, string]; teamB: [string, string] } {
  const [p0, p1, p2, p3] = group;
  const options: [number, [string, string], [string, string]][] = [
    [
      getPartnerCount(counts, p0.id, p1.id) + getPartnerCount(counts, p2.id, p3.id),
      [p0.id, p1.id], [p2.id, p3.id],
    ],
    [
      getPartnerCount(counts, p0.id, p2.id) + getPartnerCount(counts, p1.id, p3.id),
      [p0.id, p2.id], [p1.id, p3.id],
    ],
    [
      getPartnerCount(counts, p0.id, p3.id) + getPartnerCount(counts, p1.id, p2.id),
      [p0.id, p3.id], [p1.id, p2.id],
    ],
  ];
  options.sort((a, b) => a[0] - b[0]);
  return { teamA: options[0][1], teamB: options[0][2] };
}

/** Fisher-Yates in-place shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate match pairings for a round.
 *
 * First round: shuffle players randomly.
 * Subsequent rounds:
 *   Step 1 — decide who sits out: players with the fewest breaks sit out
 *             (fewest breaks = they've had the most playing time already).
 *             Tiebreak: lowest score sits out.
 *   Step 2 — sort active players by score DESC and assign courts top-down:
 *             top 4 → Court 1, next 4 → Court 2, etc.
 *             This ensures the best players always play on the top court.
 *
 * Groups of 4 → [0,1] = Team A, [2,3] = Team B.
 */
export function generatePairings(
  players: PlayerScore[],
  numCourts: number,
  isFirstRound: boolean,
  breakCounts: Record<string, number> = {},
  partnerCounts: PartnerCounts = {}
): MatchPairing[] {
  let activePlayers: PlayerScore[];

  if (isFirstRound) {
    activePlayers = shuffle(players).slice(0, numCourts * 4);
  } else {
    const numSitOut = players.length - numCourts * 4;

    if (numSitOut <= 0) {
      // Everyone plays — sort by score for court assignment
      activePlayers = [...players].sort((a, b) => b.score - a.score);
    } else {
      // Pick who sits out: fewest breaks first, tiebreak by lowest score
      const sitOutCandidates = [...players].sort((a, b) => {
        const breakDiff = (breakCounts[a.id] ?? 0) - (breakCounts[b.id] ?? 0);
        if (breakDiff !== 0) return breakDiff;
        return a.score - b.score;
      });
      const sittingOut = new Set(sitOutCandidates.slice(0, numSitOut).map((p) => p.id));

      // Active players sorted by score DESC for court assignment
      activePlayers = [...players]
        .filter((p) => !sittingOut.has(p.id))
        .sort((a, b) => b.score - a.score);
    }
  }

  const pairings: MatchPairing[] = [];
  for (let i = 0; i < numCourts; i++) {
    const group = activePlayers.slice(i * 4, i * 4 + 4);
    const { teamA, teamB } = bestPairing(group, partnerCounts);
    pairings.push({ court: i + 1, teamA, teamB });
  }

  return pairings;
}
