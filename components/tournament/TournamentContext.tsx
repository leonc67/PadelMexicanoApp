"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { Tournament, Player, Round, Match } from "@/lib/types";

interface TournamentContextValue {
  tournament: Tournament;
  players: Player[];
  rounds: Round[];
  matches: Match[];
  upsertMatch: (match: Match) => void;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({
  tournament,
  players,
  rounds,
  matches: initialMatches,
  children,
}: {
  tournament: Tournament;
  players: Player[];
  rounds: Round[];
  matches: Match[];
  children: React.ReactNode;
}) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  function upsertMatch(updated: Match) {
    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }

  return (
    <TournamentContext.Provider
      value={{ tournament, players, rounds, matches, upsertMatch }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used inside TournamentProvider");
  return ctx;
}
