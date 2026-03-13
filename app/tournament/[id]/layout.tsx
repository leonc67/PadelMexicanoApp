import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TournamentProvider } from "@/components/tournament/TournamentContext";
import { RealtimeProvider } from "@/components/tournament/RealtimeProvider";
import { ResetButton } from "@/components/tournament/ResetButton";
import { ManagePlayersButton } from "@/components/tournament/ManagePlayersButton";
import type { Tournament, Player, Round, Match } from "@/lib/types";
import Link from "next/link";

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = createClient();
  const { id } = params;

  const [
    { data: tournament },
    { data: players },
    { data: rounds },
  ] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).single(),
    supabase.from("players").select("*").eq("tournament_id", id).order("name"),
    supabase.from("rounds").select("*").eq("tournament_id", id).order("round_number"),
  ]);

  if (!tournament) notFound();

  const roundIds = (rounds ?? []).map((r: Round) => r.id);
  let matches: Match[] = [];
  if (roundIds.length > 0) {
    const { data } = await supabase.from("matches").select("*").in("round_id", roundIds);
    matches = data ?? [];
  }

  return (
    <TournamentProvider
      tournament={tournament as Tournament}
      players={(players ?? []) as Player[]}
      rounds={(rounds ?? []) as Round[]}
      matches={matches}
    >
      <RealtimeProvider roundIds={roundIds} />
      <div className="min-h-screen bg-[#2c4a3e]">
        <header className="bg-[#1e3530] border-b border-white/10 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="font-black text-white text-lg">{tournament.name}</h1>
              <p className="text-xs text-white/50">
                {(players ?? []).length} players · {tournament.num_courts} court{tournament.num_courts !== 1 ? "s" : ""}
              </p>
            </div>
            <nav className="flex items-center gap-1">
              <Link href={`/tournament/${id}/rounds`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Rounds
              </Link>
              <Link href={`/tournament/${id}/leaderboard`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Leaderboard
              </Link>
              <ManagePlayersButton />
              <ResetButton tournamentId={id} />
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </div>
    </TournamentProvider>
  );
}
