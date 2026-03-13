"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generatePairings, type PartnerCounts } from "@/lib/algorithms/round-generator";
import { computeLeaderboard } from "@/lib/algorithms/leaderboard";
import type { Match, Player, Round } from "@/lib/types";

export async function generateNextRound(tournamentId: string) {
  const supabase = createClient();

  // Load tournament
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();
  if (tErr || !tournament) throw new Error("Tournament not found");

  // Load players
  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("*")
    .eq("tournament_id", tournamentId);
  if (pErr) throw new Error(pErr.message);

  // Load existing rounds
  const { data: rounds, error: rErr } = await supabase
    .from("rounds")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true });
  if (rErr) throw new Error(rErr.message);

  const isFirstRound = !rounds || rounds.length === 0;

  // If rounds exist, ensure all matches in the last round are scored
  if (!isFirstRound) {
    const lastRound = (rounds as Round[]).at(-1)!;
    const { data: lastMatches, error: mErr } = await supabase
      .from("matches")
      .select("*")
      .eq("round_id", lastRound.id);
    if (mErr) throw new Error(mErr.message);

    const unscored = (lastMatches as Match[]).some(
      (m) => m.score_a === null || m.score_b === null
    );
    if (unscored) throw new Error("All matches in the current round must be scored first");
  }

  // Compute leaderboard for scoring
  let allMatches: Match[] = [];
  if (!isFirstRound) {
    const roundIds = (rounds as Round[]).map((r) => r.id);
    const { data: mData, error: mErr } = await supabase
      .from("matches")
      .select("*")
      .in("round_id", roundIds);
    if (mErr) throw new Error(mErr.message);
    allMatches = mData as Match[];
  }

  const leaderboard = computeLeaderboard(players as Player[], allMatches);
  const playerScores = leaderboard.map((e) => ({ id: e.playerId, score: e.points }));

  // Compute how many times each player has sat out across all previous rounds
  const breakCounts: Record<string, number> = {};
  if (!isFirstRound) {
    for (const round of rounds as Round[]) {
      const roundMatches = allMatches.filter((m) => m.round_id === round.id);
      const playingIds = new Set(roundMatches.flatMap((m) => [...m.team_a, ...m.team_b]));
      for (const player of players as Player[]) {
        if (!playingIds.has(player.id)) {
          breakCounts[player.id] = (breakCounts[player.id] ?? 0) + 1;
        }
      }
    }
  }

  // Compute how many times each pair of players has been teammates
  const partnerCounts: PartnerCounts = {};
  for (const match of allMatches) {
    for (const team of [match.team_a, match.team_b]) {
      const [p1, p2] = team;
      if (!partnerCounts[p1]) partnerCounts[p1] = {};
      if (!partnerCounts[p2]) partnerCounts[p2] = {};
      partnerCounts[p1][p2] = (partnerCounts[p1][p2] ?? 0) + 1;
      partnerCounts[p2][p1] = (partnerCounts[p2][p1] ?? 0) + 1;
    }
  }

  // Generate pairings
  const nextRoundNumber = isFirstRound ? 1 : (rounds as Round[]).length + 1;
  const pairings = generatePairings(
    playerScores,
    tournament.num_courts,
    isFirstRound,
    breakCounts,
    partnerCounts
  );

  // Insert round
  const { data: newRound, error: nrErr } = await supabase
    .from("rounds")
    .insert({ tournament_id: tournamentId, round_number: nextRoundNumber })
    .select()
    .single();
  if (nrErr || !newRound) throw new Error(nrErr?.message ?? "Failed to create round");

  // Insert matches
  const { error: matchErr } = await supabase.from("matches").insert(
    pairings.map((p) => ({
      round_id: newRound.id,
      court: p.court,
      team_a: p.teamA,
      team_b: p.teamB,
    }))
  );
  if (matchErr) throw new Error(matchErr.message);

  revalidatePath(`/tournament/${tournamentId}/rounds`);
}

export async function editMatchPairing(
  matchId: string,
  teamA: [string, string],
  teamB: [string, string],
  tournamentId: string
) {
  const supabase = createClient();

  // Guard: match must not be scored
  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (mErr || !match) throw new Error("Match not found");
  if (match.score_a !== null || match.score_b !== null) {
    throw new Error("Cannot edit pairing of a scored match");
  }

  // Validate no duplicate players in this round
  const { data: siblings, error: sErr } = await supabase
    .from("matches")
    .select("*")
    .eq("round_id", match.round_id)
    .neq("id", matchId);
  if (sErr) throw new Error(sErr.message);

  const allOtherPlayerIds = new Set(
    (siblings as Match[]).flatMap((m) => [...m.team_a, ...m.team_b])
  );
  const newPlayerIds = [...teamA, ...teamB];
  for (const id of newPlayerIds) {
    if (allOtherPlayerIds.has(id)) {
      throw new Error("Duplicate player in round");
    }
  }

  // Update match
  const { error: upErr } = await supabase
    .from("matches")
    .update({ team_a: teamA, team_b: teamB })
    .eq("id", matchId);
  if (upErr) throw new Error(upErr.message);

  revalidatePath(`/tournament/${tournamentId}/rounds`);
}
