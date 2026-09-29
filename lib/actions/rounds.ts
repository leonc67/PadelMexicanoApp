"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generatePairings, type PartnerCounts } from "@/lib/algorithms/round-generator";
import { computeLeaderboard } from "@/lib/algorithms/leaderboard";
import type { Match, Player, Round, Tournament } from "@/lib/types";

// "Supabase-klienten" er det vi bruker for å snakke med databasen.
type Supabase = ReturnType<typeof createClient>;

// ------------------------------------------------------------
// Hjelpefunksjoner som henter data fra databasen
// ------------------------------------------------------------

async function loadTournament(supabase: Supabase, tournamentId: string): Promise<Tournament> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (error || !data) {
    throw new Error("Tournament not found");
  }
  return data as Tournament;
}

async function loadPlayers(supabase: Supabase, tournamentId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (error) {
    throw new Error(error.message);
  }
  return data as Player[];
}

// Runder sortert fra første til siste.
async function loadRounds(supabase: Supabase, tournamentId: string): Promise<Round[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data as Round[];
}

// Alle kamper i alle disse rundene.
async function loadMatches(supabase: Supabase, rounds: Round[]): Promise<Match[]> {
  if (rounds.length === 0) {
    return [];
  }

  const roundIds = rounds.map((round) => round.id);
  const { data, error } = await supabase.from("matches").select("*").in("round_id", roundIds);

  if (error) {
    throw new Error(error.message);
  }
  return data as Match[];
}

// ------------------------------------------------------------
// Hjelpefunksjoner som regner ut ting fra dataen
// ------------------------------------------------------------

// Sant hvis alle kampene i runden har poeng.
function isRoundFullyScored(round: Round, allMatches: Match[]): boolean {
  for (const match of allMatches) {
    if (match.round_id !== round.id) continue;
    if (match.score_a === null || match.score_b === null) {
      return false;
    }
  }
  return true;
}

// Hvor mange runder har hver spiller hatt pause?
// Resultat: { spillerId: antallPauser }
function countBreaks(players: Player[], rounds: Round[], allMatches: Match[]): Record<string, number> {
  const breakCounts: Record<string, number> = {};

  for (const round of rounds) {
    // Finn alle som spilte i denne runden.
    const playingIds: string[] = [];
    for (const match of allMatches) {
      if (match.round_id !== round.id) continue;
      playingIds.push(...match.team_a, ...match.team_b);
    }

    // Alle andre hadde pause.
    for (const player of players) {
      if (!playingIds.includes(player.id)) {
        breakCounts[player.id] = (breakCounts[player.id] ?? 0) + 1;
      }
    }
  }

  return breakCounts;
}

// Hvor mange ganger har hvert par vært lagkamerater?
// Resultat: partnerCounts[a][b] = antall ganger a og b har spilt på samme lag.
function countPartners(allMatches: Match[]): PartnerCounts {
  const partnerCounts: PartnerCounts = {};

  for (const match of allMatches) {
    for (const team of [match.team_a, match.team_b]) {
      const first = team[0];
      const second = team[1];

      if (!partnerCounts[first]) partnerCounts[first] = {};
      if (!partnerCounts[second]) partnerCounts[second] = {};

      partnerCounts[first][second] = (partnerCounts[first][second] ?? 0) + 1;
      partnerCounts[second][first] = (partnerCounts[second][first] ?? 0) + 1;
    }
  }

  return partnerCounts;
}

// ------------------------------------------------------------
// Funksjonene som brukes fra knappene i appen
// ------------------------------------------------------------

export async function generateNextRound(tournamentId: string) {
  const supabase = createClient();

  // Steg 1: hent alt vi trenger.
  // Turnering, spillere og runder hører ikke sammen, så vi henter dem samtidig.
  // Det er raskere enn å vente på ett kall om gangen.
  const [tournament, players, rounds] = await Promise.all([
    loadTournament(supabase, tournamentId),
    loadPlayers(supabase, tournamentId),
    loadRounds(supabase, tournamentId),
  ]);

  // Kampene må hentes etterpå, fordi vi trenger å vite hvilke runder som finnes.
  const allMatches = await loadMatches(supabase, rounds);

  const isFirstRound = rounds.length === 0;

  // Steg 2: hvis det finnes runder fra før, må den siste være ferdig scoret.
  if (!isFirstRound) {
    const lastRound = rounds[rounds.length - 1];
    if (!isRoundFullyScored(lastRound, allMatches)) {
      throw new Error("All matches in the current round must be scored first");
    }
  }

  // Steg 3: regn ut det generatoren trenger å vite.
  const leaderboard = computeLeaderboard(players, allMatches);
  const playerScores = leaderboard.map((entry) => ({ id: entry.playerId, score: entry.points }));
  const breakCounts = countBreaks(players, rounds, allMatches);
  const partnerCounts = countPartners(allMatches);

  // Steg 4: lag kampene til neste runde.
  const pairings = generatePairings(
    playerScores,
    tournament.num_courts,
    isFirstRound,
    breakCounts,
    partnerCounts
  );

  // Steg 5: lagre runden i databasen.
  const nextRoundNumber = rounds.length + 1;
  const { data: newRound, error: roundError } = await supabase
    .from("rounds")
    .insert({ tournament_id: tournamentId, round_number: nextRoundNumber })
    .select()
    .single();

  if (roundError || !newRound) {
    throw new Error(roundError?.message ?? "Failed to create round");
  }

  // Steg 6: lagre kampene i runden.
  const matchRows = pairings.map((pairing) => ({
    round_id: newRound.id,
    court: pairing.court,
    team_a: pairing.teamA,
    team_b: pairing.teamB,
  }));
  const { error: matchError } = await supabase.from("matches").insert(matchRows);

  if (matchError) {
    throw new Error(matchError.message);
  }

  revalidatePath(`/tournament/${tournamentId}/rounds`);
}

// Bytter spillerne i en kamp. Går bare hvis kampen ikke er spilt ennå.
export async function editMatchPairing(
  matchId: string,
  teamA: [string, string],
  teamB: [string, string],
  tournamentId: string
) {
  const supabase = createClient();

  // Hent kampen.
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new Error("Match not found");
  }
  if (match.score_a !== null || match.score_b !== null) {
    throw new Error("Cannot edit pairing of a scored match");
  }

  // Hent de andre kampene i samme runde.
  const { data: otherMatches, error: otherError } = await supabase
    .from("matches")
    .select("*")
    .eq("round_id", match.round_id)
    .neq("id", matchId);

  if (otherError) {
    throw new Error(otherError.message);
  }

  // Ingen av de nye spillerne kan allerede spille i en annen kamp i runden.
  const busyPlayerIds: string[] = [];
  for (const other of otherMatches as Match[]) {
    busyPlayerIds.push(...other.team_a, ...other.team_b);
  }

  for (const playerId of [...teamA, ...teamB]) {
    if (busyPlayerIds.includes(playerId)) {
      throw new Error("Duplicate player in round");
    }
  }

  // Lagre de nye lagene.
  const { error: updateError } = await supabase
    .from("matches")
    .update({ team_a: teamA, team_b: teamB })
    .eq("id", matchId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/tournament/${tournamentId}/rounds`);
}
