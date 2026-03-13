"use client";

import { useTournament } from "@/components/tournament/TournamentContext";
import { LeaderboardTable } from "@/components/tournament/LeaderboardTable";

export default function LeaderboardPage() {
  const { matches } = useTournament();

  const completedMatches = matches.filter(
    (m) => m.score_a !== null && m.score_b !== null
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Leaderboard</h2>
        <span className="text-sm text-white/40">{completedMatches.length} matches played</span>
      </div>
      <LeaderboardTable />
    </div>
  );
}
