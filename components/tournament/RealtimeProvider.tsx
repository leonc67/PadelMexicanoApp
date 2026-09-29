"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTournament } from "./TournamentContext";
import type { Match } from "@/lib/types";

// Lytter på databasen. Når en kamp endres (for eksempel noen fyller inn poeng på en annen telefon),
// oppdaterer vi kampen her også. Komponenten tegner ingenting (return null), den har bare en jobb i bakgrunnen.
export function RealtimeProvider({ roundIds }: { roundIds: string[] }) {
  const { upsertMatch } = useTournament();
  const supabase = createClient();

  // Kjører når komponenten vises, og på nytt hvis listen med runder endres.
  useEffect(() => {
    if (roundIds.length === 0) return;

    // Åpne en 'kanal' mot databasen og si hva vi vil høre om: alle endringer i tabellen matches.
    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        (payload) => {
          // payload.new er den nye versjonen av raden. Vi bryr oss bare om kamper i denne turneringen.
          const match = payload.new as Match;
          if (roundIds.includes(match.round_id)) {
            upsertMatch(match);
          }
        }
      )
      .subscribe();

    // Rydd opp: lukk kanalen når komponenten forsvinner, ellers hoper lytterne seg opp.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
