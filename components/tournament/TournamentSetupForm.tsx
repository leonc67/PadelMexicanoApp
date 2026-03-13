"use client";

import { useState } from "react";
import { createTournament } from "@/lib/actions/tournament";

const PRESET_POINTS = [16, 21, 24];

export function TournamentSetupForm() {
  const [numCourts, setNumCourts] = useState(2);
  const [maxPoints, setMaxPoints] = useState<number | "custom">(16);
  const [customPoints, setCustomPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const resolved = maxPoints === "custom" ? parseInt(customPoints, 10) : maxPoints;
    if (!resolved || resolved < 2) {
      setError("Max points must be at least 2");
      setLoading(false);
      return;
    }
    formData.set("maxPoints", String(resolved));
    try {
      await createTournament(formData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-500/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">Tournament Name</label>
        <input name="name" type="text" required placeholder="Sunday Padel Cup" className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">Number of Courts</label>
        <input
          name="numCourts" type="number" min={1} max={10}
          value={numCourts} onChange={(e) => setNumCourts(parseInt(e.target.value, 10))}
          required className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">
          Need at least {numCourts * 4} players for {numCourts} court{numCourts !== 1 ? "s" : ""}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">Max Points per Match</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_POINTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setMaxPoints(p)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                maxPoints === p
                  ? "bg-green-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMaxPoints("custom")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              maxPoints === "custom"
                ? "bg-green-500 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            Custom
          </button>
        </div>
        {maxPoints === "custom" && (
          <input
            type="number"
            min={2}
            value={customPoints}
            onChange={(e) => setCustomPoints(e.target.value)}
            placeholder="Enter max points"
            className={`mt-2 ${inputClass}`}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          Player Names <span className="text-white/30">(one per line)</span>
        </label>
        <textarea
          name="playerNames" rows={8} required
          placeholder={"Alice\nBob\nCarlos\nDiana\nEduardo\nFiona\nGeorge\nHannah"}
          className={`${inputClass} font-mono resize-none`}
        />
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full rounded-lg bg-green-500 px-6 py-3 text-white font-bold hover:bg-green-400 disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating…" : "Create Tournament →"}
      </button>
    </form>
  );
}
