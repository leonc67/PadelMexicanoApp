"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitScore(
  matchId: string,
  scoreA: number,
  scoreB: number,
  tournamentId: string
) {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
    throw new Error("Scores must be integers");
  }
  if (scoreA < 0 || scoreB < 0) {
    throw new Error("Scores must be non-negative");
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("matches")
    .update({ score_a: scoreA, score_b: scoreB })
    .eq("id", matchId);

  if (error) throw new Error(error.message);

  revalidatePath(`/tournament/${tournamentId}/rounds`);
  revalidatePath(`/tournament/${tournamentId}/leaderboard`);
}
