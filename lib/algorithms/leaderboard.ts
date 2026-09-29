import type { Match, Player } from "@/lib/types";

// En rad i tabellen: statistikken til én spiller.
export interface LeaderboardEntry {
  playerId: string;
  name: string;
  pointDiff: number; // poeng for minus poeng mot, summert over alle kamper
  points: number; // poeng for
  wins: number;
  played: number;
}

// Legger ett kampresultat til en spillers rad.
// myScore = laget mitt sine poeng, theirScore = motstanderlaget sine poeng.
function addResult(row: LeaderboardEntry, myScore: number, theirScore: number) {
  row.pointDiff = row.pointDiff + (myScore - theirScore);
  row.points = row.points + myScore;
  row.played = row.played + 1;
  if (myScore > theirScore) {
    row.wins = row.wins + 1;
  }
}

/**
 * Lager tabellen ut fra spillerne og alle kampene.
 * Bare ferdigspilte kamper (begge poengsummer er satt) telles med.
 * Sortering: best poengdifferanse først, så flest poeng, så flest seiere.
 */
export function computeLeaderboard(
  players: Player[],
  matches: Match[]
): LeaderboardEntry[] {
  // Steg 1: lag en tom rad for hver spiller, og en oppslagsliste på id.
  const rows: LeaderboardEntry[] = [];
  const rowById: Record<string, LeaderboardEntry> = {};

  for (const player of players) {
    const row: LeaderboardEntry = {
      playerId: player.id,
      name: player.name,
      pointDiff: 0,
      points: 0,
      wins: 0,
      played: 0,
    };
    rows.push(row);
    rowById[player.id] = row;
  }

  // Steg 2: gå gjennom kampene og legg resultatet til alle fire spillerne.
  for (const match of matches) {
    // Hopp over kamper som ikke er spilt ennå.
    if (match.score_a === null || match.score_b === null) {
      continue;
    }

    for (const playerId of match.team_a) {
      const row = rowById[playerId];
      if (row) addResult(row, match.score_a, match.score_b);
    }

    for (const playerId of match.team_b) {
      const row = rowById[playerId];
      if (row) addResult(row, match.score_b, match.score_a);
    }
  }

  // Steg 3: sorter. Funksjonen under svarer "hvem skal stå først, a eller b?"
  // Negativt tall = a først, positivt tall = b først, 0 = lik.
  rows.sort(function (a, b) {
    if (a.pointDiff !== b.pointDiff) return b.pointDiff - a.pointDiff;
    if (a.points !== b.points) return b.points - a.points;
    return b.wins - a.wins;
  });

  return rows;
}
