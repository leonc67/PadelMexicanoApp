"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTournament } from "./TournamentContext";
import type { Match } from "@/lib/types";

export function RealtimeProvider({ roundIds }: { roundIds: string[] }) {
  const { upsertMatch } = useTournament();
  const supabase = createClient();

  useEffect(() => {
    if (roundIds.length === 0) return;

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
          const match = payload.new as Match;
          if (roundIds.includes(match.round_id)) {
            upsertMatch(match);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
