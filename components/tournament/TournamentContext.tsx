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

// Context er en delt 'boks' som alle komponenter under TournamentProvider kan lese fra,
// slik at vi slipper å sende dataen nedover som props hele veien.
const TournamentContext = createContext<TournamentContextValue | null>(null);

// Provider = den som eier dataen. Alt som ligger inni <TournamentProvider> kan bruke useTournament().
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
  // useState lager en variabel React følger med på. Kaller vi setMatches(...), tegnes skjermen på nytt.
  // Kampene ligger i state fordi live-oppdateringer kan endre dem mens siden er åpen.
  const [matches, setMatches] = useState<Match[]>(initialMatches);

  // useEffect kjører koden når noe endrer seg. Her: når serveren sender ferske kamper (initialMatches),
  // bytter vi ut state med dem.
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  // Legger inn en kamp, eller bytter ut den gamle hvis id-en finnes fra før ('upsert' = update + insert).
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

// Kort vei til dataen fra en hvilken som helst komponent: const { players } = useTournament();
export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used inside TournamentProvider");
  return ctx;
}
