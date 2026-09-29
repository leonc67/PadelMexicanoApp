"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateNextRound } from "@/lib/actions/rounds";
import type { Match, Round } from "@/lib/types";

// "Supabase-klienten" er det vi bruker for å snakke med databasen.
type Supabase = ReturnType<typeof createClient>;

// ------------------------------------------------------------
// Hjelpefunksjoner
// ------------------------------------------------------------

// Hvor mange baner er det plass til? Fire spillere per bane, minst én bane.
function courtsForPlayerCount(numPlayers: number): number {
  const courts = Math.floor(numPlayers / 4);
  if (courts < 1) {
    return 1;
  }
  return courts;
}

// Henter id-ene til alle spillere i turneringen.
async function loadPlayerIds(supabase: Supabase, tournamentId: string): Promise<string[]> {
  const { data } = await supabase.from("players").select("id").eq("tournament_id", tournamentId);

  const ids: string[] = [];
  for (const player of data ?? []) {
    ids.push(player.id);
  }
  return ids;
}

// Setter antall baner i turneringen ut fra hvor mange spillere det er.
async function updateCourtCount(supabase: Supabase, tournamentId: string) {
  const playerIds = await loadPlayerIds(supabase, tournamentId);
  const numCourts = courtsForPlayerCount(playerIds.length);

  await supabase.from("tournaments").update({ num_courts: numCourts }).eq("id", tournamentId);
}

// Henter den siste runden og kampene i den.
async function getCurrentRoundMatches(
  supabase: Supabase,
  tournamentId: string
): Promise<{ currentRound: Round | null; matches: Match[] }> {
  // Nyeste runde først, og vi tar bare den første.
  const { data: rounds } = await supabase
    .from("rounds")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: false })
    .limit(1);

  const currentRound = (rounds?.[0] ?? null) as Round | null;
  if (currentRound === null) {
    return { currentRound: null, matches: [] };
  }

  const { data: matches } = await supabase.from("matches").select("*").eq("round_id", currentRound.id);
  return { currentRound: currentRound, matches: (matches ?? []) as Match[] };
}

// Ber Next.js laste inn rundesiden og tabellen på nytt.
function refreshPages(tournamentId: string) {
  revalidatePath(`/tournament/${tournamentId}/rounds`);
  revalidatePath(`/tournament/${tournamentId}/leaderboard`);
}

// ------------------------------------------------------------
// Funksjonene som brukes fra knappene i appen
// ------------------------------------------------------------

export async function createTournament(formData: FormData) {
  // Les det brukeren skrev inn i skjemaet.
  const name = formData.get("name") as string;
  const numCourts = parseInt(formData.get("numCourts") as string, 10);
  const maxPoints = parseInt(formData.get("maxPoints") as string, 10) || 16;
  const playerNamesRaw = formData.get("playerNames") as string;

  if (!name?.trim()) {
    throw new Error("Tournament name is required");
  }
  if (isNaN(numCourts) || numCourts < 1) {
    throw new Error("At least 1 court required");
  }

  // Spillernavnene står ett per linje. Fjern mellomrom og tomme linjer.
  const playerNames: string[] = [];
  for (const line of playerNamesRaw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed !== "") {
      playerNames.push(trimmed);
    }
  }

  const minPlayers = numCourts * 4;
  if (playerNames.length < minPlayers) {
    throw new Error(`Need at least ${minPlayers} players for ${numCourts} court(s)`);
  }

  const supabase = createClient();

  // Lagre turneringen.
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .insert({ name: name.trim(), num_courts: numCourts, max_points: maxPoints })
    .select()
    .single();

  if (tournamentError || !tournament) {
    throw new Error(tournamentError?.message ?? "Failed to create tournament");
  }

  // Lagre spillerne.
  const playerRows = playerNames.map((playerName) => ({
    tournament_id: tournament.id,
    name: playerName,
  }));
  const { error: playerError } = await supabase.from("players").insert(playerRows);

  if (playerError) {
    throw new Error(playerError.message);
  }

  // Lag første runde og gå til rundesiden.
  await generateNextRound(tournament.id);
  redirect(`/tournament/${tournament.id}/rounds`);
}

export async function addPlayer(tournamentId: string, name: string) {
  const supabase = createClient();

  // Antall baner før og etter at spilleren legges til.
  const idsBefore = await loadPlayerIds(supabase, tournamentId);
  const oldCourts = Math.floor(idsBefore.length / 4);
  const newCourts = Math.floor((idsBefore.length + 1) / 4);

  // Lagre spilleren.
  const { error } = await supabase
    .from("players")
    .insert({ tournament_id: tournamentId, name: name.trim() });

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("tournaments")
    .update({ num_courts: courtsForPlayerCount(idsBefore.length + 1) })
    .eq("id", tournamentId);

  // Hvis vi nå har plass til en ny bane, fyller vi den med spillere som har pause.
  if (newCourts > oldCourts) {
    const { currentRound, matches } = await getCurrentRoundMatches(supabase, tournamentId);

    if (currentRound !== null) {
      // Finn alle som spiller i runden nå.
      const playingIds: string[] = [];
      for (const match of matches) {
        playingIds.push(...match.team_a, ...match.team_b);
      }

      // Alle andre har pause (den nye spilleren er med her).
      const allIds = await loadPlayerIds(supabase, tournamentId);
      const benchIds: string[] = [];
      for (const id of allIds) {
        if (!playingIds.includes(id)) {
          benchIds.push(id);
        }
      }

      // Hvis det er minst fire på benken, lager vi en kamp av de fire første.
      if (benchIds.length >= 4) {
        await supabase.from("matches").insert({
          round_id: currentRound.id,
          court: newCourts,
          team_a: [benchIds[0], benchIds[1]],
          team_b: [benchIds[2], benchIds[3]],
        });
      }
    }
  }

  refreshPages(tournamentId);
}

export async function removePlayer(playerId: string, tournamentId: string) {
  const supabase = createClient();

  // Hvis spilleren er med i en kamp i siste runde, slettes den kampen.
  const { currentRound, matches } = await getCurrentRoundMatches(supabase, tournamentId);

  if (currentRound !== null) {
    for (const match of matches) {
      const isInMatch = match.team_a.includes(playerId) || match.team_b.includes(playerId);
      if (isInMatch) {
        await supabase.from("matches").delete().eq("id", match.id);
        break; // en spiller er bare i én kamp per runde
      }
    }
  }

  // Slett spilleren og juster antall baner.
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) {
    throw new Error(error.message);
  }

  await updateCourtCount(supabase, tournamentId);
  refreshPages(tournamentId);
}

export async function renamePlayer(playerId: string, name: string, tournamentId: string) {
  const supabase = createClient();

  const { error } = await supabase.from("players").update({ name: name.trim() }).eq("id", playerId);
  if (error) {
    throw new Error(error.message);
  }

  refreshPages(tournamentId);
}

export async function resetTournament(tournamentId: string) {
  const supabase = createClient();

  // Slett alle runder. Kampene slettes automatisk sammen med rundene.
  const { error } = await supabase.from("rounds").delete().eq("tournament_id", tournamentId);
  if (error) {
    throw new Error(error.message);
  }

  // Start på nytt med en ny runde 1.
  await generateNextRound(tournamentId);
  refreshPages(tournamentId);
}
