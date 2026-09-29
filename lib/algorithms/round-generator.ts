// En spiller med poengsummen sin (brukes til å bestemme hvem som møter hvem).
export interface PlayerScore {
  id: string;
  score: number;
}

// Én kamp: bane nummer, og to lag med to spillere hver (spiller-id-er).
export interface MatchPairing {
  court: number;
  teamA: [string, string];
  teamB: [string, string];
}

// partnerCounts[a][b] = hvor mange ganger a og b har vært på samme lag.
export type PartnerCounts = Record<string, Record<string, number>>;

// Hvor mange ganger har a og b spilt på samme lag? 0 hvis aldri.
function getPartnerCount(counts: PartnerCounts, a: string, b: string): number {
  if (counts[a] === undefined) return 0;
  if (counts[a][b] === undefined) return 0;
  return counts[a][b];
}

// Stokker en liste tilfeldig (Fisher-Yates) og gir tilbake en ny liste.
function shuffle<T>(list: T[]): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // tilfeldig plass fra 0 til i
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// Fire spillere kan deles i to lag på tre måter:
//   (0 og 1) mot (2 og 3)
//   (0 og 2) mot (1 og 3)
//   (0 og 3) mot (1 og 2)
// Vi velger måten der lagkameratene har spilt sammen færrest ganger før.
function bestPairing(
  group: PlayerScore[],
  counts: PartnerCounts
): { teamA: [string, string]; teamB: [string, string] } {
  const p0 = group[0].id;
  const p1 = group[1].id;
  const p2 = group[2].id;
  const p3 = group[3].id;

  // Kostnad = hvor mange ganger disse lagkameratene har spilt sammen fra før.
  const cost1 = getPartnerCount(counts, p0, p1) + getPartnerCount(counts, p2, p3);
  const cost2 = getPartnerCount(counts, p0, p2) + getPartnerCount(counts, p1, p3);
  const cost3 = getPartnerCount(counts, p0, p3) + getPartnerCount(counts, p1, p2);

  // Velg den laveste kostnaden. Ved likt tar vi den første.
  if (cost1 <= cost2 && cost1 <= cost3) {
    return { teamA: [p0, p1], teamB: [p2, p3] };
  }
  if (cost2 <= cost3) {
    return { teamA: [p0, p2], teamB: [p1, p3] };
  }
  return { teamA: [p0, p3], teamB: [p1, p2] };
}

// Første runde: bland alle tilfeldig, og ta så mange som det er plass til.
function chooseFirstRoundPlayers(players: PlayerScore[], numCourts: number): PlayerScore[] {
  const shuffled = shuffle(players);
  return shuffled.slice(0, numCourts * 4);
}

// Senere runder: bestem hvem som har pause, og sorter resten etter poeng.
function chooseLaterRoundPlayers(
  players: PlayerScore[],
  numCourts: number,
  breakCounts: Record<string, number>
): PlayerScore[] {
  const numSitOut = players.length - numCourts * 4;

  // Ingen pause: alle spiller. Sorter etter poeng, best først.
  if (numSitOut <= 0) {
    const everyone = [...players];
    everyone.sort(function (a, b) {
      return b.score - a.score;
    });
    return everyone;
  }

  // Noen må ha pause. Sorter slik at de som skal ha pause kommer først:
  //   1. de som har hatt færrest pauser til nå
  //   2. ved likt: de med lavest poengsum
  const bySitOutOrder = [...players];
  bySitOutOrder.sort(function (a, b) {
    const breaksA = breakCounts[a.id] ?? 0; // "?? 0" betyr: bruk 0 hvis ingen verdi
    const breaksB = breakCounts[b.id] ?? 0;
    if (breaksA !== breaksB) return breaksA - breaksB;
    return a.score - b.score;
  });

  // De første numSitOut i lista har pause. Vi lagrer id-ene deres.
  const sittingOutIds: string[] = [];
  for (let i = 0; i < numSitOut; i++) {
    sittingOutIds.push(bySitOutOrder[i].id);
  }

  // Alle som ikke har pause, spiller.
  const active: PlayerScore[] = [];
  for (const player of players) {
    if (!sittingOutIds.includes(player.id)) {
      active.push(player);
    }
  }

  // Sorter de som spiller etter poeng, best først.
  // Da havner de fire beste på bane 1, de neste fire på bane 2, osv.
  active.sort(function (a, b) {
    return b.score - a.score;
  });
  return active;
}

/**
 * Lager kampene for en runde.
 *
 * - Første runde: tilfeldig.
 * - Senere runder: de beste spillerne på bane 1, de neste på bane 2, osv.
 *   Hvis noen må ha pause, får de som har hatt færrest pauser pause først.
 * - Innen hver bane velges lagene slik at folk får nye lagkamerater.
 */
export function generatePairings(
  players: PlayerScore[],
  numCourts: number,
  isFirstRound: boolean,
  breakCounts: Record<string, number> = {},
  partnerCounts: PartnerCounts = {}
): MatchPairing[] {
  if (players.length < numCourts * 4) {
    throw new Error("Ikke nok spillere til " + numCourts + " bane(r)");
  }

  // Steg 1: finn ut hvem som spiller, i riktig rekkefølge.
  let activePlayers: PlayerScore[];
  if (isFirstRound) {
    activePlayers = chooseFirstRoundPlayers(players, numCourts);
  } else {
    activePlayers = chooseLaterRoundPlayers(players, numCourts, breakCounts);
  }

  // Steg 2: del dem i grupper på fire, én gruppe per bane.
  const pairings: MatchPairing[] = [];
  for (let court = 1; court <= numCourts; court++) {
    const start = (court - 1) * 4;
    const group = activePlayers.slice(start, start + 4);
    const teams = bestPairing(group, partnerCounts);
    pairings.push({ court: court, teamA: teams.teamA, teamB: teams.teamB });
  }

  return pairings;
}
