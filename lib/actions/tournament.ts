"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateNextRound } from "@/lib/actions/rounds";

export async function createTournament(formData: FormData) {
  const name = formData.get("name") as string;
  const numCourts = parseInt(formData.get("numCourts") as string, 10);
  const maxPoints = parseInt(formData.get("maxPoints") as string, 10) || 16;
  const playerNamesRaw = formData.get("playerNames") as string;

  if (!name?.trim()) throw new Error("Tournament name is required");
  if (isNaN(numCourts) || numCourts < 1) throw new Error("At least 1 court required");

  const playerNames = playerNamesRaw
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  const minPlayers = numCourts * 4;
  if (playerNames.length < minPlayers) {
    throw new Error(`Need at least ${minPlayers} players for ${numCourts} court(s)`);
  }

  const supabase = createClient();

  // Insert tournament
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .insert({ name: name.trim(), num_courts: numCourts, max_points: maxPoints })
    .select()
    .single();

  if (tErr || !tournament) throw new Error(tErr?.message ?? "Failed to create tournament");

  // Insert players
  const { error: pErr } = await supabase.from("players").insert(
    playerNames.map((pName) => ({
      tournament_id: tournament.id,
      name: pName,
    }))
  );

  if (pErr) throw new Error(pErr.message);

  await generateNextRound(tournament.id);

  redirect(`/tournament/${tournament.id}/rounds`);
}

async function updateCourtCount(supabase: ReturnType<typeof createClient>, tournamentId: string) {
  const { data: players } = await supabase
    .from("players")
    .select("id")
    .eq("tournament_id", tournamentId);
  const newCourts = Math.max(1, Math.floor((players?.length ?? 0) / 4));
  await supabase.from("tournaments").update({ num_courts: newCourts }).eq("id", tournamentId);
}

async function getCurrentRoundMatches(supabase: ReturnType<typeof createClient>, tournamentId: string) {
  const { data: rounds } = await supabase
    .from("rounds").select("*").eq("tournament_id", tournamentId)
    .order("round_number", { ascending: false }).limit(1);
  const currentRound = rounds?.[0] ?? null;
  if (!currentRound) return { currentRound: null, matches: [] };
  const { data: matches } = await supabase.from("matches").select("*").eq("round_id", currentRound.id);
  return { currentRound, matches: matches ?? [] };
}

export async function addPlayer(tournamentId: string, name: string) {
  const supabase = createClient();

  // Count players before adding to detect court change
  const { data: before } = await supabase.from("players").select("id").eq("tournament_id", tournamentId);
  const oldCourts = Math.floor((before?.length ?? 0) / 4);

  const { data: newPlayer, error } = await supabase
    .from("players").insert({ tournament_id: tournamentId, name: name.trim() }).select().single();
  if (error) throw new Error(error.message);

  const newCourts = Math.floor(((before?.length ?? 0) + 1) / 4);
  await supabase.from("tournaments").update({ num_courts: Math.max(1, newCourts) }).eq("id", tournamentId);

  // If a new court was unlocked, fill it with bench players from the current round
  if (newCourts > oldCourts) {
    const { currentRound, matches } = await getCurrentRoundMatches(supabase, tournamentId);
    if (currentRound) {
      const playingIds = new Set(matches.flatMap((m: { team_a: string[]; team_b: string[] }) => [...m.team_a, ...m.team_b]));
      const { data: allPlayers } = await supabase.from("players").select("id").eq("tournament_id", tournamentId);
      const bench = (allPlayers ?? []).filter((p: { id: string }) => !playingIds.has(p.id));
      // bench includes the new player; take exactly 4
      if (bench.length >= 4) {
        const group = bench.slice(0, 4);
        await supabase.from("matches").insert({
          round_id: currentRound.id,
          court: newCourts,
          team_a: [group[0].id, group[1].id],
          team_b: [group[2].id, group[3].id],
        });
      }
    }
  }

  revalidatePath(`/tournament/${tournamentId}/rounds`);
  revalidatePath(`/tournament/${tournamentId}/leaderboard`);
}

export async function removePlayer(playerId: string, tournamentId: string) {
  const supabase = createClient();

  // Find and delete the match containing this player in the current round
  const { currentRound, matches } = await getCurrentRoundMatches(supabase, tournamentId);
  if (currentRound) {
    const affected = matches.find((m: { team_a: string[]; team_b: string[] }) =>
      m.team_a.includes(playerId) || m.team_b.includes(playerId)
    );
    if (affected) {
      await supabase.from("matches").delete().eq("id", (affected as { id: string }).id);
    }
  }

  // Delete the player
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw new Error(error.message);

  await updateCourtCount(supabase, tournamentId);
  revalidatePath(`/tournament/${tournamentId}/rounds`);
  revalidatePath(`/tournament/${tournamentId}/leaderboard`);
}

export async function renamePlayer(playerId: string, name: string, tournamentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("players").update({ name: name.trim() }).eq("id", playerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/tournament/${tournamentId}/rounds`);
  revalidatePath(`/tournament/${tournamentId}/leaderboard`);
}

export async function resetTournament(tournamentId: string) {
  const supabase = createClient();

  // Delete all rounds — matches cascade automatically
  const { error, data } = await supabase
    .from("rounds")
    .delete()
    .eq("tournament_id", tournamentId)
    .select();

  if (error) throw new Error(error.message);

  await generateNextRound(tournamentId);

  revalidatePath(`/tournament/${tournamentId}/rounds`);
  revalidatePath(`/tournament/${tournamentId}/leaderboard`);
}
