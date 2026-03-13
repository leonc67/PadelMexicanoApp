"use client";

import { useState } from "react";
import { submitScore } from "@/lib/actions/scores";
import { useTournament } from "./TournamentContext";
import type { Match, Player } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  players: Player[];
  tournamentId: string;
  onEditPairing: (match: Match) => void;
}

function getPlayerName(id: string, players: Player[]) {
  return players.find((p) => p.id === id)?.name ?? "Unknown";
}

export function MatchCard({ match, players, tournamentId, onEditPairing }: MatchCardProps) {
  const { tournament } = useTournament();
  const TOTAL = tournament.max_points;
  const SCORES = Array.from({ length: TOTAL + 1 }, (_, i) => i);

  const [scoreA, setScoreA] = useState<number | null>(match.score_a ?? null);
  const [scoreB, setScoreB] = useState<number | null>(match.score_b ?? null);
  const [picker, setPicker] = useState<"a" | "b" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamANames = match.team_a.map((id) => getPlayerName(id, players));
  const teamBNames = match.team_b.map((id) => getPlayerName(id, players));

  async function selectScore(n: number) {
    const a = picker === "a" ? n : TOTAL - n;
    const b = picker === "b" ? n : TOTAL - n;
    setScoreA(a);
    setScoreB(b);
    setPicker(null);
    setError(null);
    setLoading(true);
    try {
      await submitScore(match.id, a, b, tournamentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: "linear-gradient(145deg, #1a2a4e, #0d1830)", padding: "8px" }}
    >
      {/* Court surface */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #2e5fd4 0%, #3b6be0 50%, #2e5fd4 100%)",
          height: "200px",
        }}
      >
        {/* Court lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Outer boundary */}
          <div className="absolute inset-3 border border-white/50 rounded-sm" />
          {/* Horizontal service lines */}
          <div className="absolute left-3 right-3 h-px bg-white/40" style={{ top: "33%" }} />
          <div className="absolute left-3 right-3 h-px bg-white/40" style={{ bottom: "33%" }} />
          {/* Vertical quarter lines */}
          <div className="absolute top-3 bottom-3 w-px bg-white/30" style={{ left: "22%" }} />
          <div className="absolute top-3 bottom-3 w-px bg-white/30" style={{ right: "22%" }} />
          {/* Net / center line */}
          <div className="absolute top-0 bottom-0 w-[3px] bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ left: "50%" }} />
        </div>

        {/* Court badge */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <span className="bg-gray-900 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
            Court {match.court}
          </span>
        </div>

        {/*
          Corner quadrants (each ~22% wide × 33% tall):
          Top-left:     x 3%–22%,  y 3%–33%   → center ~12.5%, ~18%
          Bottom-left:  x 3%–22%,  y 67%–97%  → center ~12.5%, ~82%
          Top-right:    x 78%–97%, y 3%–33%   → center ~87.5%, ~18%
          Bottom-right: x 78%–97%, y 67%–97%  → center ~87.5%, ~82%

          Score boxes (service area):
          Left:  x 22%–50%, y 33%–67% → center ~36%, ~50%
          Right: x 50%–78%, y 33%–67% → center ~64%, ~50%
        */}

        {/* Player name: top-left */}
        <div
          className="absolute flex items-center justify-center text-center"
          style={{ left: "3%", top: "3%", width: "19%", height: "30%" }}
        >
          <span className="text-white font-bold text-base leading-tight drop-shadow-md">{teamANames[0]}</span>
        </div>

        {/* Player name: bottom-left */}
        <div
          className="absolute flex items-center justify-center text-center"
          style={{ left: "3%", bottom: "3%", width: "19%", height: "30%" }}
        >
          <span className="text-white font-bold text-base leading-tight drop-shadow-md">{teamANames[1]}</span>
        </div>

        {/* Player name: top-right */}
        <div
          className="absolute flex items-center justify-center text-center"
          style={{ right: "3%", top: "3%", width: "19%", height: "30%" }}
        >
          <span className="text-white font-bold text-base leading-tight drop-shadow-md">{teamBNames[0]}</span>
        </div>

        {/* Player name: bottom-right */}
        <div
          className="absolute flex items-center justify-center text-center"
          style={{ right: "3%", bottom: "3%", width: "19%", height: "30%" }}
        >
          <span className="text-white font-bold text-base leading-tight drop-shadow-md">{teamBNames[1]}</span>
        </div>

        {/* Score button: left (Team A) — centered in left service box */}
        <div
          className="absolute flex items-center justify-center"
          style={{ left: "22%", top: "33%", width: "28%", height: "34%" }}
        >
          <button
            onClick={() => setPicker(picker === "a" ? null : "a")}
            disabled={loading}
            className={`w-14 h-12 rounded-xl font-bold text-2xl text-white shadow-xl transition-colors
              ${picker === "a" ? "bg-white/30 ring-2 ring-white/60" : "bg-gray-900/90 hover:bg-gray-800"}`}
          >
            {loading ? "…" : (scoreA ?? 0)}
          </button>
        </div>

        {/* Score button: right (Team B) — centered in right service box */}
        <div
          className="absolute flex items-center justify-center"
          style={{ left: "50%", top: "33%", width: "28%", height: "34%" }}
        >
          <button
            onClick={() => setPicker(picker === "b" ? null : "b")}
            disabled={loading}
            className={`w-14 h-12 rounded-xl font-bold text-2xl text-white shadow-xl transition-colors
              ${picker === "b" ? "bg-white/30 ring-2 ring-white/60" : "bg-gray-900/90 hover:bg-gray-800"}`}
          >
            {loading ? "…" : (scoreB ?? 0)}
          </button>
        </div>
      </div>

      {/* Number picker */}
      {picker && (
        <div className="mt-2 grid grid-cols-5 gap-1.5 px-1 pb-1">
          {SCORES.map((n) => (
            <button
              key={n}
              onClick={() => selectScore(n)}
              className="rounded-xl border border-white/20 py-2 text-sm font-bold text-white hover:bg-white/20 active:bg-white/30 transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-2 pb-1 text-xs text-red-400">{error}</p>}

      <div className="flex justify-end px-2 pb-1 pt-0.5">
        <button
          onClick={() => onEditPairing(match)}
          className="text-xs text-white/30 hover:text-white/70 transition-colors"
        >
          Edit Pairing
        </button>
      </div>
    </div>
  );
}
