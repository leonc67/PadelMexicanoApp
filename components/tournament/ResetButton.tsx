"use client";

import { useState } from "react";
import { resetTournament } from "@/lib/actions/tournament";

export function ResetButton({ tournamentId }: { tournamentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setLoading(true);
    setError(null);
    try {
      await resetTournament(tournamentId);
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-400">{error}</span>}
        <span className="text-xs text-white/50">Sure?</span>
        <button
          onClick={handleReset}
          disabled={loading}
          className="rounded-lg px-3 py-1.5 text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
        >
          {loading ? "Resetting…" : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
