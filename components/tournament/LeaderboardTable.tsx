"use client";

import { useMemo } from "react";
import { useTournament } from "./TournamentContext";
import { computeLeaderboard } from "@/lib/algorithms/leaderboard";

export function LeaderboardTable() {
  const { players, matches } = useTournament();
  const entries = useMemo(() => computeLeaderboard(players, matches), [players, matches]);

  const ranks: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) {
      ranks.push(1);
    } else {
      const prev = entries[i - 1];
      const curr = entries[i];
      const tied =
        curr.pointDiff === prev.pointDiff &&
        curr.points === prev.points &&
        curr.wins === prev.wins;
      ranks.push(tied ? ranks[i - 1] : i + 1);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/10 border-b border-white/10">
            <th className="px-4 py-3 text-left font-bold text-white/50 text-xs uppercase tracking-wider w-12">#</th>
            <th className="px-4 py-3 text-left font-bold text-white/50 text-xs uppercase tracking-wider">Player</th>
            <th className="px-4 py-3 text-right font-bold text-white/50 text-xs uppercase tracking-wider">PD</th>
            <th className="px-4 py-3 text-right font-bold text-white/50 text-xs uppercase tracking-wider">Pts</th>
            <th className="px-4 py-3 text-right font-bold text-white/50 text-xs uppercase tracking-wider">Wins</th>
            <th className="px-4 py-3 text-right font-bold text-white/50 text-xs uppercase tracking-wider">Played</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {entries.map((entry, i) => (
            <tr
              key={entry.playerId}
              className={`transition-colors ${i % 2 === 0 ? "bg-white/5" : "bg-transparent"}`}
            >
              <td className="px-4 py-3 text-white/40 font-bold">{ranks[i]}</td>
              <td className="px-4 py-3 font-bold text-white">{entry.name}</td>
              <td className={`px-4 py-3 text-right font-bold ${
                entry.pointDiff > 0 ? "text-green-400" :
                entry.pointDiff < 0 ? "text-red-400" : "text-white/40"
              }`}>
                {entry.pointDiff > 0 ? `+${entry.pointDiff}` : entry.pointDiff}
              </td>
              <td className="px-4 py-3 text-right text-white/70">{entry.points}</td>
              <td className="px-4 py-3 text-right text-white/70">{entry.wins}</td>
              <td className="px-4 py-3 text-right text-white/40">{entry.played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
