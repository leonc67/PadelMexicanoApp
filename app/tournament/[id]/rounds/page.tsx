"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTournament } from "@/components/tournament/TournamentContext";
import { RoundCard } from "@/components/tournament/RoundCard";
import { EditPairingModal } from "@/components/tournament/EditPairingModal";
import { generateNextRound } from "@/lib/actions/rounds";
import type { Match } from "@/lib/types";

export default function RoundsPage() {
  const { tournament, players, rounds, matches } = useTournament();
  const router = useRouter();
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Check if we can generate next round
  const lastRound = rounds.at(-1);
  const lastRoundMatches = lastRound
    ? matches.filter((m) => m.round_id === lastRound.id)
    : [];
  const canGenerate =
    rounds.length === 0 ||
    (lastRoundMatches.length > 0 &&
      lastRoundMatches.every((m) => m.score_a !== null && m.score_b !== null));

  async function handleGenerateRound() {
    setGenError(null);
    setGenerating(true);
    try {
      await generateNextRound(tournament.id);
      router.refresh();
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Failed to generate round");
    } finally {
      setGenerating(false);
    }
  }

  const editingMatchRound = editingMatch
    ? matches.filter((m) => {
        const match = matches.find((mm) => mm.id === editingMatch.id);
        return match && m.round_id === match.round_id;
      })
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Rounds</h2>
        <button
          onClick={handleGenerateRound}
          disabled={!canGenerate || generating}
          className="rounded-xl bg-green-500 px-5 py-2 text-sm text-white font-bold hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {generating ? "Generating…" : `Generate Round ${rounds.length + 1}`}
        </button>
      </div>

      {genError && (
        <div className="rounded-xl bg-red-900/40 border border-red-500/40 p-3 text-sm text-red-300">
          {genError}
        </div>
      )}

      {!canGenerate && rounds.length > 0 && (
        <p className="text-sm text-yellow-400/80">
          Score all matches in Round {lastRound?.round_number} before generating the next round.
        </p>
      )}

      {rounds.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/20 p-10 text-center">
          <p className="text-lg font-bold text-white/50 mb-1">No rounds yet</p>
          <p className="text-sm text-white/30">Click &quot;Generate Round 1&quot; to start</p>
        </div>
      )}

      <div className="space-y-3">
        {[...rounds]
          .sort((a, b) => b.round_number - a.round_number)
          .map((round, idx) => (
            <RoundCard
              key={round.id}
              round={round}
              matches={matches.filter((m) => m.round_id === round.id)}
              players={players}
              tournamentId={tournament.id}
              onEditPairing={setEditingMatch}
              defaultOpen={idx === 0}
              isLatest={idx === 0}
            />
          ))}
      </div>

      {editingMatch && (
        <EditPairingModal
          match={editingMatch}
          allMatchesInRound={editingMatchRound}
          players={players}
          tournamentId={tournament.id}
          onClose={() => setEditingMatch(null)}
        />
      )}
    </div>
  );
}
