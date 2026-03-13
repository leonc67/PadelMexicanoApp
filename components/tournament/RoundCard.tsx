"use client";

import { useState, useEffect } from "react";
import { MatchCard } from "./MatchCard";
import type { Round, Match, Player } from "@/lib/types";

interface RoundCardProps {
  round: Round;
  matches: Match[];
  players: Player[];
  tournamentId: string;
  onEditPairing: (match: Match) => void;
  defaultOpen?: boolean;
  isLatest?: boolean;
}

export function RoundCard({
  round,
  matches,
  players,
  tournamentId,
  onEditPairing,
  defaultOpen = false,
  isLatest = false,
}: RoundCardProps) {
  const scored = matches.filter((m) => m.score_a !== null && m.score_b !== null).length;
  const total = matches.length;
  const allScored = scored === total && total > 0;

  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!isLatest && allScored) setOpen(false);
  }, [isLatest, allScored]);

  const activePlayerIds = new Set(matches.flatMap((m) => [...m.team_a, ...m.team_b]));
  const sittingOut = players.filter((p) => !activePlayerIds.has(p.id));

  return (
    <div className="space-y-4">
      {/* Round heading */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 w-full text-left group"
      >
        <span className="text-3xl font-black text-white">🎾 Round {round.round_number}</span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            allScored
              ? "bg-green-500/30 text-green-300"
              : scored > 0
              ? "bg-yellow-500/30 text-yellow-300"
              : "bg-white/10 text-white/50"
          }`}
        >
          {allScored ? "Complete" : `${scored}/${total}`}
        </span>
        <svg
          className={`w-5 h-5 text-white/40 transition-transform ml-auto ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {matches
              .sort((a, b) => a.court - b.court)
              .map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  players={players}
                  tournamentId={tournamentId}
                  onEditPairing={onEditPairing}
                />
              ))}
          </div>

          {sittingOut.length > 0 && (
            <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4">
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Break</p>
              <div className="flex flex-wrap gap-2">
                {sittingOut.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-sm text-white/80 font-medium"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
